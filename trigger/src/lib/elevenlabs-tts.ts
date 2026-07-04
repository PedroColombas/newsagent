import { requireEnv } from "./env";
import { chunkText, type DialogueTurn } from "./openai-tts";

// ElevenLabs TTS — the v2 quality path (CLAUDE.md). Same shape as openai-tts: one voice per
// speaker, one request per turn, segments concatenated in order. Uses the REST endpoint directly
// (returns mp3 bytes) — no SDK dependency, and Trigger.dev owns the retries.

const API_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

// Highest-quality, most lifelike model — ElevenLabs' own pick for narration. Tunable.
export const ELEVEN_MODEL = "eleven_multilingual_v2";

// 128 kbps mp3 at 44.1 kHz — available on every plan tier; matches the OpenAI output.
const OUTPUT_FORMAT = "mp3_44100_128";

// multilingual_v2 allows up to ~10k chars/request; we chunk conservatively so concatenated
// mp3 segments join cleanly (turns are usually short, so most never split).
const MAX_CHARS = 4000;

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

// Synthesise a dialogue: each turn spoken in its speaker's voice, segments concatenated in order.
// `cast` maps a speaker key ("host" / "expert") → voice. Throws on any failure so the caller can
// fall back to another provider rather than shipping a half-empty episode.
export async function elevenSynthesizeDialogue(
  turns: DialogueTurn[],
  cast: Record<string, ElevenVoice>,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const turn of turns) {
    const voice = cast[turn.speaker];
    if (!voice || !turn.text.trim()) continue; // skip unknown speakers / empty turns
    for (const chunk of chunkText(turn.text, MAX_CHARS)) {
      parts.push(await synthesizeOne(chunk, voice));
    }
  }
  if (parts.length === 0) throw new Error("ElevenLabs produced no audio for this script");
  return Buffer.concat(parts);
}
