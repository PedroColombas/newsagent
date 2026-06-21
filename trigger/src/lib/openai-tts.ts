import OpenAI from "openai";
import { requireEnv } from "./env";

// Lazy client (Trigger §2).
let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return client;
}

// TTS config — tunable. gpt-4o-mini-tts supports an `instructions` param to steer
// delivery (tone/pace), which the podcast step uses. ElevenLabs is the v2 path (CLAUDE.md).
export const TTS_MODEL = "gpt-4o-mini-tts";

// gpt-4o-mini-tts caps at ~2000 input tokens per request, so longer text must be
// segmented. We chunk conservatively by characters (~1000 tokens of headroom).
const MAX_TTS_CHARS = 4000;

export interface SpeechOptions {
  voice: string; // OpenAI voice timbre, e.g. "nova"
  instructions?: string; // delivery steering (gpt-4o-mini-tts only)
}

export async function synthesizeSpeech(text: string, opts: SpeechOptions): Promise<Buffer> {
  const chunks = chunkText(text, MAX_TTS_CHARS);
  const parts: Buffer[] = [];

  for (const chunk of chunks) {
    const response = await openai().audio.speech.create({
      model: TTS_MODEL,
      // `voice` is an SDK string-literal union; cast at the boundary so config can drive it.
      voice: opts.voice as never,
      input: chunk,
      instructions: opts.instructions,
      response_format: "mp3",
    });
    parts.push(Buffer.from(await response.arrayBuffer()));
  }

  // Concatenating MP3 frame buffers plays back fine in standard players — good enough for
  // MVP. (A perfectly clean join would re-encode via ffmpeg; not worth it yet.)
  return Buffer.concat(parts);
}

// A single spoken turn in a multi-voice dialogue.
export interface DialogueTurn {
  speaker: string;
  text: string;
}

// Synthesise a dialogue: each turn is spoken in its speaker's voice, then the audio
// segments are concatenated in order. `speakers` maps a speaker key → voice + delivery.
// OpenAI TTS is one-voice-per-request, so a two-person episode is one request per turn.
export async function synthesizeDialogue(
  turns: DialogueTurn[],
  speakers: Record<string, SpeechOptions>,
): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const turn of turns) {
    const voice = speakers[turn.speaker];
    if (!voice || !turn.text.trim()) continue; // skip unknown speakers / empty turns
    parts.push(await synthesizeSpeech(turn.text, voice));
  }
  return Buffer.concat(parts);
}

// Split into <=maxChars chunks on sentence boundaries; hard-split any oversized sentence.
function chunkText(text: string, maxChars: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let i = 0; i < sentence.length; i += maxChars) {
        chunks.push(sentence.slice(i, i + maxChars));
      }
      continue;
    }
    if ((current + sentence).length > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks.length > 0 ? chunks : [text];
}
