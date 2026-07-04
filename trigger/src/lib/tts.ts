import { logger } from "@trigger.dev/sdk";
import { optionalEnv } from "./env";
import {
  synthesizeDialogue as openaiSynthesizeDialogue,
  type DialogueTurn,
  type SpeechOptions,
} from "./openai-tts";
import { elevenSynthesizeDialogue, type ElevenVoice } from "./elevenlabs-tts";

// Podcast narration engine. ElevenLabs (multilingual_v2) is the quality path; OpenAI is the
// fallback, used automatically when the ElevenLabs key is absent or a call fails — so the daily
// podcast never breaks on a TTS outage or an empty balance. Flip TTS_PROVIDER to "openai" to
// force the old engine.
export type { DialogueTurn };

type TtsProvider = "elevenlabs" | "openai";
const TTS_PROVIDER: TtsProvider = "elevenlabs";

// ── Casts: role → voice, per provider. The single place to tune the podcast's voices. ──

const OPENAI_CAST: Record<string, SpeechOptions> = {
  host: {
    voice: "nova",
    instructions:
      "A warm, curious podcast host interviewing an expert. Friendly and engaged, " +
      "natural pace, guiding the conversation for the listener.",
  },
  expert: {
    voice: "onyx",
    instructions:
      "A knowledgeable analyst being interviewed. Explains clearly and conversationally " +
      "at a measured pace, like a sharp guest on a quality news podcast.",
  },
};

// Female host + male expert (owner-chosen voices). To change, swap either voiceId with any voice
// from your ElevenLabs dashboard (Voices → ⋯ → "Copy voice ID"). If an id is invalid the call
// throws and we fall back to OpenAI, so podcasts keep working meanwhile.
const ELEVEN_CAST: Record<string, ElevenVoice> = {
  host: {
    voiceId: "AZLM4CsYOQDuqgTHYzxW", // female host
    settings: { stability: 0.4, similarity_boost: 0.75, use_speaker_boost: true },
  },
  expert: {
    voiceId: "fvVBPXuE7f1iX3dZLKFy", // male expert
    settings: { stability: 0.55, similarity_boost: 0.75, use_speaker_boost: true },
  },
};

// Narrate a two-person interview script to a single mp3. Tries ElevenLabs first (when enabled and
// keyed), falls back to OpenAI on any failure.
export async function synthesizeDialogue(turns: DialogueTurn[]): Promise<Buffer> {
  const useEleven = TTS_PROVIDER === "elevenlabs" && !!optionalEnv("ELEVENLABS_API_KEY");
  if (useEleven) {
    try {
      return await elevenSynthesizeDialogue(turns, ELEVEN_CAST);
    } catch (err) {
      logger.warn("ElevenLabs TTS failed — falling back to OpenAI", {
        error: String((err as { message?: string })?.message ?? err),
      });
    }
  }
  return openaiSynthesizeDialogue(turns, OPENAI_CAST);
}
