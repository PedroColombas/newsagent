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

// TTS config constant — tunable. ElevenLabs is the v2 upgrade path (CLAUDE.md).
export const TTS_MODEL = "gpt-4o-mini-tts";

export async function synthesizeSpeech(text: string, voice: string): Promise<Buffer> {
  const response = await openai().audio.speech.create({
    model: TTS_MODEL,
    // `voice` is an SDK string-literal union; we accept a plain string and cast at the
    // boundary so the caller can drive it from config without fighting the union type.
    voice: voice as never,
    input: text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}
