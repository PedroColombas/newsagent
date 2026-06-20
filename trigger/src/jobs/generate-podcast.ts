import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { synthesizeSpeech } from "../lib/openai-tts";
import { withDiagnostics } from "../lib/diagnostics";

const AUDIO_BUCKET = "podcast-audio";

// OpenAI TTS timbre + delivery steering. Not user-configurable yet — the schema's `voice`
// is the WRITING style, not a TTS voice. A user-selectable timbre could be a future pref.
// The `instructions` do most of the tone work, so the base voice matters less.
const TTS_VOICE = "nova";
const TTS_INSTRUCTIONS =
  "Read this as a warm, engaging podcast host speaking to a single listener. Relaxed " +
  "conversational pace, natural intonation, a touch of energy. Not a formal news reader.";

export const generatePodcast = task({
  id: "generate-podcast",
  maxDuration: 300,
  run: async (payload: { reportId: string }) => {
    const { reportId } = payload;
    const db = supabase();

    const { data: report, error: reportError } = await db
      .from("reports")
      .select("id, user_id, markdown")
      .eq("id", reportId)
      .single();
    if (reportError) throw reportError;
    const userId = report!.user_id as string;
    const markdown = report!.markdown as string | null;

    // Idempotency anchor: podcast_episodes.unique(report_id).
    const { data: existing } = await db
      .from("podcast_episodes")
      .select("id, status")
      .eq("report_id", reportId)
      .maybeSingle();
    if (existing?.status === "complete") {
      logger.info("podcast already complete — skipping", { reportId });
      return { episodeId: existing.id as string, skipped: true };
    }

    const { data: row, error: upsertError } = await db
      .from("podcast_episodes")
      .upsert(
        { report_id: reportId, user_id: userId, status: "generating" },
        { onConflict: "report_id" },
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;
    const episodeId = row!.id as string;

    try {
      if (!markdown) throw new Error("report has no markdown to narrate");

      // 1. Rewrite to a conversational spoken script — ALWAYS conversational regardless of
      //    the report's writing voice (CLAUDE.md).
      const script = await withDiagnostics("podcast-script", () => writeScript(markdown));

      // 2. Text -> speech (mp3), chunked under the TTS input cap and concatenated.
      const audio = await withDiagnostics("tts", () =>
        synthesizeSpeech(script, { voice: TTS_VOICE, instructions: TTS_INSTRUCTIONS }),
      );

      // 3. Upload to the private bucket, namespaced by user (service_role bypasses storage
      //    RLS). `audio_url` stores the PATH, not a URL — see schema + 0003_storage.sql.
      const path = `${userId}/${reportId}.mp3`;
      const { error: uploadError } = await db.storage
        .from(AUDIO_BUCKET)
        .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw uploadError;

      await db
        .from("podcast_episodes")
        .update({
          script,
          audio_url: path,
          duration_seconds: estimateDurationSeconds(script),
          status: "complete",
        })
        .eq("id", episodeId);
      logger.info("podcast complete", { reportId, episodeId, path });

      return { episodeId, skipped: false };
    } catch (error: any) {
      await db.from("podcast_episodes").update({ status: "failed" }).eq("id", episodeId);
      throw error;
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Podcast script — DESIGNED WITH THE OWNER. Always conversational regardless of the
// report's writing voice (CLAUDE.md). Output is plain spoken words only — the TTS step
// reads it verbatim, so no markdown, headings, bullets, or URLs. Model: Sonnet 4.6
// (a style rewrite, not the heavy synthesis) — tunable via MODELS.podcastScript.
// ─────────────────────────────────────────────────────────────────────────────

const PODCAST_SYSTEM = `You turn a written news report into a script for a short audio podcast episode, read aloud by a single host. The delivery is ALWAYS warm and conversational, regardless of how the written report was worded.

Rules:
- Output ONLY the words to be spoken. No markdown, no headings, no bullet points, no stage directions, no "[music]" cues.
- Open with a brief, friendly intro (e.g. "Here's your briefing for today...") and end with a short sign-off.
- Use natural spoken transitions between topics ("First up...", "In other news...", "Finally...").
- Write for the ear: say dates and numbers naturally ("March third", "around twelve thousand"), expand symbols, and NEVER read out URLs or citations — name the outlet if it helps, but drop the links.
- Keep it warm, clear, and engaging; contractions are good. Don't editorialise beyond what the report supports.
- Match the report's depth: a short report makes a short episode, a long one a longer episode. Don't pad.`;

async function writeScript(markdown: string): Promise<string> {
  const message = await anthropic().messages.create({
    model: MODELS.podcastScript,
    max_tokens: 8000,
    system: PODCAST_SYSTEM,
    messages: [
      { role: "user", content: `Here is today's report. Write the podcast script.\n\n${markdown}` },
    ],
  });
  return firstText(message.content);
}

// Rough runtime estimate for the player UI (~150 words per minute). The schema's
// duration_seconds is nullable; this is a cheap estimate, not a probe of the audio.
function estimateDurationSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round((words / 150) * 60));
}
