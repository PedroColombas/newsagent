import { requireEnv } from "./env";
import { chunkText, type DialogueTurn } from "./openai-tts";

// ElevenLabs TTS — the v2 quality path (CLAUDE.md). Same shape as openai-tts: one voice per
// speaker, one request per turn, segments concatenated in order. Uses the REST endpoint directly
// (returns mp3 bytes) — no SDK dependency, and Trigger.dev owns the retries.

const API_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

// ElevenLabs' most expressive, lifelike model — best for interview dialogue. Tunable; swap to
// "eleven_multilingual_v2" (quality) or "eleven_flash_v2_5" (fast/half-cost) to compare. Note:
// v3's `stability` only takes 0 / 0.5 / 1 — the cast uses 0.5 (see tts.ts).
export const ELEVEN_MODEL = "eleven_v3";

// 128 kbps mp3 at 44.1 kHz — available on every plan tier; matches the OpenAI output.
const OUTPUT_FORMAT = "mp3_44100_128";

// Chunk conservatively so concatenated mp3 segments join cleanly and we stay within the smallest
// model's per-request limit (eleven_v3 is lower than multilingual_v2). Turns are usually short, so
// most never split.
const MAX_CHARS = 3000;

// Synthesise turns in parallel, capped below ElevenLabs' per-plan concurrency limit (Creator = 5).
// Sequential is too slow for the expressive models — a many-turn eleven_v3 episode blows the job's
// maxDuration. If the cap is exceeded ElevenLabs 429s, which surfaces as a fallback to OpenAI.
const TTS_CONCURRENCY = 4;

export interface ElevenVoiceSettings {
  stability?: number; // lower = more expressive/variable, higher = steadier
  similarity_boost?: number; // adherence to the original voice
  style?: number; // style exaggeration (v2) — keep low for reliability
  use_speaker_boost?: boolean;
}

export interface ElevenVoice {
  voiceId: string;
  settings?: ElevenVoiceSettings;
}

async function synthesizeOne(text: string, voice: ElevenVoice): Promise<Buffer> {
  const res = await fetch(`${API_BASE}/${voice.voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: {
      "xi-api-key": requireEnv("ELEVENLABS_API_KEY"),
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVEN_MODEL,
      voice_settings: voice.settings,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Thrown so the facade can fall back to OpenAI (bad key, out of credits, 429, bad voiceId…).
    throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// Run an async fn over items with a bounded number in flight, preserving input order in the results.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

// Synthesise a dialogue: each turn spoken in its speaker's voice, segments concatenated in order.
// `cast` maps a speaker key ("host" / "expert") → voice. Segments run in parallel (bounded) for
// speed, then join in the original order. Throws on any failure so the caller can fall back to
// another provider rather than shipping a half-empty episode.
export async function elevenSynthesizeDialogue(
  turns: DialogueTurn[],
  cast: Record<string, ElevenVoice>,
): Promise<Buffer> {
  // Flatten to ordered segments (a long turn splits into chunks; short turns stay whole).
  const segments: { text: string; voice: ElevenVoice }[] = [];
  for (const turn of turns) {
    const voice = cast[turn.speaker];
    if (!voice || !turn.text.trim()) continue; // skip unknown speakers / empty turns
    for (const chunk of chunkText(turn.text, MAX_CHARS)) {
      segments.push({ text: chunk, voice });
    }
  }
  if (segments.length === 0) throw new Error("ElevenLabs produced no audio for this script");

  const parts = await mapWithConcurrency(segments, TTS_CONCURRENCY, (s) =>
    synthesizeOne(s.text, s.voice),
  );
  return Buffer.concat(parts);
}
