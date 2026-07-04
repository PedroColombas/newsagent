import { logger } from "@trigger.dev/sdk";
import { optionalEnv } from "./env";
import {
  synthesizeDialogue as openaiSynthesizeDialogue,
  type DialogueTurn,
  type SpeechOptions,
} from "./openai-tts";
import { elevenSynthesizeDialogue, ELEVEN_MODEL, type ElevenVoice } from "./elevenlabs-tts";
import { introMp3 } from "./intro-audio";

// Podcast narration engine. ElevenLabs (multilingual_v2) is the quality path; OpenAI is the
// fallback, used automatically when the ElevenLabs key is absent or a call fails — so the daily
// podcast never breaks on a TTS outage or an empty balance. Flip TTS_PROVIDER to "openai" to
// force the old engine.
export type { DialogueTurn };

type TtsProvider = "elevenlabs" | "openai";
// Reverted to OpenAI — gpt-4o-mini-tts felt more natural here than ElevenLabs (v3 included), and
// it's far cheaper. The ElevenLabs path is kept intact; flip back to "elevenlabs" to re-enable.
const TTS_PROVIDER: TtsProvider = "openai";

// ── Casts: role → voice, per provider. The single place to tune the podcast's voices. ──

const OPENAI_CAST: Record<string, SpeechOptions> = {
  host: {
    voice: "nova",
    instructions:
      "A warm, curious podcast host chatting with an expert. Relaxed and genuinely engaged, " +
      "with natural intonation and an easy, unhurried pace — like a real person talking, not " +
      "reading aloud. Let reactions and questions sound spontaneous.",
  },
  expert: {
    // "ash" is brighter and less deep than "onyx", which read heavy/monotone. Easy to swap —
    // other lively male options: "verse", "ballad", "echo".
    voice: "ash",
    instructions:
      "A sharp, personable analyst being interviewed. Bright, upbeat and animated — real energy " +
      "and varied intonation, never flat, heavy, or monotone. Explains things conversationally, " +
      "like an enthusiastic friend who genuinely finds this interesting; keep it light on its feet.",
  },
};

// Female host + male expert (owner-chosen voices). To change, swap either voiceId with any voice
// from your ElevenLabs dashboard (Voices → ⋯ → "Copy voice ID"). If an id is invalid the call
// throws and we fall back to OpenAI, so podcasts keep working meanwhile.
// stability is 0.5 because eleven_v3 only accepts 0 / 0.5 / 1 (0=Creative, 0.5=Natural, 1=Robust);
// 0.5 is also valid for multilingual/flash, so it's safe across models.
const ELEVEN_CAST: Record<string, ElevenVoice> = {
  host: {
    voiceId: "AZLM4CsYOQDuqgTHYzxW", // female host
    settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true },
  },
  expert: {
    voiceId: "fvVBPXuE7f1iX3dZLKFy", // male expert
    settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true },
  },
};

// Narrate a set of turns to a single voice track. Tries ElevenLabs first (when enabled and keyed),
// falls back to OpenAI on any failure.
async function narrate(turns: DialogueTurn[]): Promise<Buffer> {
  const useEleven = TTS_PROVIDER === "elevenlabs" && !!optionalEnv("ELEVENLABS_API_KEY");
  if (useEleven) {
    try {
      const audio = await elevenSynthesizeDialogue(turns, ELEVEN_CAST);
      // So the run log clearly states which engine + model actually narrated (verifiable, no guessing).
      logger.info(`TTS narrated via ElevenLabs (${ELEVEN_MODEL})`);
      return audio;
    } catch (err) {
      logger.warn("ElevenLabs TTS failed — falling back to OpenAI", {
        error: String((err as { message?: string })?.message ?? err),
      });
    }
  }
  logger.info("TTS narrated via OpenAI");
  return openaiSynthesizeDialogue(turns, OPENAI_CAST);
}

// Narrate the full episode with the branded intro sting: the host's opening (welcome + preview +
// any recap), then the sting, then the rest of the conversation.
// NOTE: this joins the sting's mp3 bytes directly onto the voice track. If it plays at the wrong
// speed/pitch on any device (the sting's format differs from the TTS output), the fix is to
// re-encode everything to a uniform stream via ffmpeg — heavier, so we try the direct join first.
export async function synthesizeDialogue(turns: DialogueTurn[]): Promise<Buffer> {
  if (turns.length === 0) return Buffer.alloc(0);

  // The sting lands after the host's lead-in, right before the expert first speaks.
  let split = turns.findIndex((t) => t.speaker === "expert");
  if (split <= 0) split = 1; // no/immediate expert → after the first turn

  const opening = await narrate(turns.slice(0, split));
  const rest = split < turns.length ? await narrate(turns.slice(split)) : Buffer.alloc(0);
  return Buffer.concat([opening, introMp3(), rest]);
}
