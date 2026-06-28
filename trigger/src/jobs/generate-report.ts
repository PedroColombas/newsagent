import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { withDiagnostics } from "../lib/diagnostics";
import { synthesize } from "../lib/synthesis";
import { generatePodcast } from "./generate-podcast";
import type { Preferences } from "@shared/types";
import type { FetchedTopic } from "./fetch-news";

export const generateReport = task({
  id: "generate-report",
  maxDuration: 300,
  run: async (payload: { userId: string; date: string; topics: FetchedTopic[] }) => {
    const { userId, date, topics } = payload;
    const db = supabase();

    // Idempotency anchor: reports.unique(user_id, date). If a complete report already
    // exists for today, this is a retry/duplicate — stop (Trigger.dev may re-run).
    const { data: existing } = await db
      .from("reports")
      .select("id, status")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();
    if (existing?.status === "complete") {
      logger.info("report already complete — skipping", { userId, date });
      return { reportId: existing.id as string, skipped: true };
    }

    // Create or claim the row, mark it generating.
    const { data: row, error: upsertError } = await db
      .from("reports")
      .upsert(
        { user_id: userId, date, status: "generating", error_message: null },
        { onConflict: "user_id,date" },
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;
    const reportId = row!.id as string;

    try {
      const { data: prefsData, error: prefsError } = await db
        .from("preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (prefsError) throw prefsError;
      const prefs = prefsData as Preferences;

      const { content, markdown } = await withDiagnostics("synthesis", () =>
        synthesize(prefs, topics),
      );

      await db
        .from("reports")
        .update({ content, markdown, status: "complete" })
        .eq("id", reportId);

      // Record these topics as briefed, so future reports skip the catch-up primer.
      if (topics.length > 0) {
        await db
          .from("user_topic_history")
          .upsert(
            topics.map((t) => ({ user_id: userId, topic_key: t.topicKey })),
            { onConflict: "user_id,topic_key", ignoreDuplicates: true },
          );
      }

      logger.info("report complete", {
        userId,
        date,
        reportId,
        sections: content.sections.length,
      });

      // Hand off to podcast generation if the user wants audio.
      if (prefs.podcast_enabled) {
        await generatePodcast.trigger({ reportId });
      }

      return { reportId, skipped: false };
    } catch (error: any) {
      await db
        .from("reports")
        .update({ status: "failed", error_message: String(error?.message ?? error) })
        .eq("id", reportId);
      throw error; // rethrow so Trigger.dev records + retries
    }
  },
});
