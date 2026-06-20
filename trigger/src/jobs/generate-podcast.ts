import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { synthesizeSpeech } from "../lib/openai-tts";
import { withDiagnostics } from "../lib/diagnostics";

const AUDIO_BUCKET = "podcast-audio";
// OpenAI TTS timbre. Not user-configurable yet — the schema's `voice` is the WRITING
// style, not a TTS voice. A user-selectable timbre could become a future preference.
const TTS_VOICE = "alloy";

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

      // 1. Rewrite to a conversational script — ALWAYS conversational regardless of the
      //    report's writing voice (CLAUDE.md). STUB prompt — collaborative.
      const script = await withDiagnostics("podcast-script", () => writeScript(markdown));

      // 2. Text -> speech (mp3).
      const audio = await withDiagnostics("tts", () => synthesizeSpeech(script, TTS_VOICE));

      // 3. Upload to the private bucket, namespaced by user (service_role bypasses storage
      //    RLS). `audio_url` stores the PATH, not a URL — see schema + 0003_storage.sql.
      const path = `${userId}/${reportId}.mp3`;
      const { error: uploadError } = await db.storage
        .from(AUDIO_BUCKET)
        .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw uploadError;

      await db
        .from("podcast_episodes")
        .update({ script, audio_url: path, status: "complete" })
        .eq("id", episodeId);
      logger.info("podcast complete", { reportId, episodeId, path });

      // NOTE: duration_seconds left null for MVP — would need to probe the mp3 (or estimate
      // from script length). Flagged for later.
      return { episodeId, skipped: false };
    } catch (error: any) {
      await db.from("podcast_episodes").update({ status: "failed" }).eq("id", episodeId);
      throw error;
    }
  },
});

// ⚠️ STUB — podcast script prompt is COLLABORATIVE.
async function writeScript(markdown: string): Promise<string> {
  const message = await anthropic().messages.create({
    model: MODELS.podcastScript,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Rewrite this news report as a warm, conversational spoken-word podcast monologue (about 4-6 minutes). No headings or bullet points — natural speech only.\n\n${markdown}`,
      },
    ],
  });
  return firstText(message.content);
}
