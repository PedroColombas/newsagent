import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { withDiagnostics } from "../lib/diagnostics";
import { generatePodcast } from "./generate-podcast";
import type { Preferences, ReportContent, ReportSection } from "@shared/types";
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

// ───────────────────────────────────────────────────────────────────────────
// ⚠️ STUB — report synthesis is COLLABORATIVE (it drives report quality, which
// CLAUDE.md flags as owner-led). Placeholder so the chain runs end-to-end.
// ───────────────────────────────────────────────────────────────────────────

async function synthesize(
  prefs: Preferences,
  topics: FetchedTopic[],
): Promise<{ content: ReportContent; markdown: string }> {
  const system = [
    "You compile a personalised daily news report from pre-fetched topic research.",
    `Report mode: ${prefs.report_mode}.`,
    `Writing voice: ${prefs.voice}.`,
    prefs.exclusions ? `Exclude anything matching: ${prefs.exclusions}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const message = await anthropic().messages.create({
    model: MODELS.synthesis,
    max_tokens: 8000,
    system,
    messages: [
      {
        role: "user",
        content: `Here is today's topic research as JSON. Write the report in markdown.\n\n${JSON.stringify(topics)}`,
      },
    ],
  });

  const markdown = firstText(message.content);

  // STUB: for now we mirror each fetched topic into a section 1:1. The real synthesis will
  // have Claude return structured sections (likely via tool use) honouring report_mode /
  // max_topics / exclusions, plus a polished markdown rendering.
  const content: ReportContent = {
    sections: topics.map(
      (t): ReportSection => ({
        topic: t.topic,
        summary: t.content,
        sources: t.sources,
        level: t.level,
        timeframe: t.recency,
      }),
    ),
  };

  return { content, markdown };
}
