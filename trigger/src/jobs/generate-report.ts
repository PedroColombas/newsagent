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

// ─────────────────────────────────────────────────────────────────────────────
// Report synthesis — DESIGNED WITH THE OWNER.
//   • Structured outputs (output_config.format): one call returns sections + markdown.
//   • report_mode controls length/structure, voice controls tone, exclusions are a hard
//     filter. Those specs live in the static system prompt below (cache-friendly).
//   • Claude tags each section with the index of the fetched topic it's based on; we
//     re-attach the real sources/level/timeframe in code, so URLs are never invented.
//   • Model: Opus 4.8 (quality-first). Tunable via MODELS.synthesis in lib/anthropic.
// ─────────────────────────────────────────────────────────────────────────────

// Static — identical for every user + run, so it sits in `system` with cache_control.
// (Opus only caches a prefix once it's >=4096 tokens; below that this silently no-ops.)
const SYNTHESIS_SYSTEM = `You are the synthesis engine for a personalised daily news briefing. You receive pre-fetched, per-topic research and turn it into a single report. You will be told which report mode and voice to use, plus any exclusions — apply them precisely.

REPORT MODES (length + structure):
- briefing: A fast scan. For each topic, a short bold headline then one sentence of context. Use bullet points. The whole report should be readable in under two minutes.
- standard: For each topic, a short heading then 2-3 tight paragraphs covering what happened, the key facts, and why it matters.
- deep_dive: Long-form analysis. Focus on the one or two most significant topics and omit minor ones. Give thorough context, implications, and connections — several paragraphs each.

VOICES (tone):
- neutral: Plain, factual, even-handed. No opinion or rhetorical flourish — wire-service style.
- analytical: Explanatory. Connect cause and effect, add context and implications. Measured, expert tone.
- conversational: Warm and direct, like a sharp friend explaining over coffee. Use contractions and plain language.
- critical: Skeptical and evaluative. Question claims, note what is missing or spun, weigh significance. Pointed but fair.

RULES:
- Ground every claim in the provided research. Do not invent facts, events, numbers, or quotes.
- Keep one section per topic. Mode controls length, not grouping. In deep_dive you may drop low-priority topics, but never merge two topics into one section.
- State each topic's time window in the prose using its recency value (day = the last 24 hours, week = the last 7 days, month = the last 30 days).
- After each section in the markdown, list that topic's sources as "[title](url) — date", using only the sources provided for that topic. Never fabricate or alter URLs.
- If a topic's research is thin or empty, say so in one sentence rather than padding.
- Apply exclusions as a hard filter: omit anything matching, even if present in the research.

OUTPUT: Return JSON matching the schema. "sections" has one entry per topic you include — each with "topic_index" (the index of the topic in the input array it is based on), a "heading", and a "summary" written in the selected mode and voice. "markdown" is the full rendered report: headings, prose, and the per-section source lists.`;

const SYNTHESIS_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic_index: {
            type: "integer",
            description: "Index of the input topic this section is based on",
          },
          heading: { type: "string", description: "Display heading for the section" },
          summary: {
            type: "string",
            description: "The write-up for this topic, in the selected mode and voice",
          },
        },
        required: ["topic_index", "heading", "summary"],
        additionalProperties: false,
      },
    },
    markdown: {
      type: "string",
      description: "The full report as markdown, including the per-section source lists",
    },
  },
  required: ["sections", "markdown"],
  additionalProperties: false,
};

interface SynthesisOutput {
  sections: { topic_index: number; heading: string; summary: string }[];
  markdown: string;
}

async function synthesize(
  prefs: Preferences,
  topics: FetchedTopic[],
): Promise<{ content: ReportContent; markdown: string }> {
  // Per-user, volatile content goes in the user turn — after the cached system prefix.
  const topicsForModel = topics.map((t, index) => ({
    index,
    topic: t.topic,
    recency: t.recency,
    content: t.content,
    sources: t.sources,
  }));

  const userMessage =
    `Report mode: ${prefs.report_mode}\n` +
    `Voice: ${prefs.voice}\n` +
    `Exclusions: ${prefs.exclusions || "none"}\n\n` +
    `Topics (JSON array; use each item's "index" as topic_index):\n` +
    `${JSON.stringify(topicsForModel)}\n\n` +
    "Write the report now.";

  const message = await anthropic().messages.create({
    model: MODELS.synthesis,
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: SYNTHESIS_SCHEMA },
      effort: "medium",
    },
    system: [
      { type: "text", text: SYNTHESIS_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const parsed = JSON.parse(firstText(message.content)) as SynthesisOutput;

  // Re-attach the real sources / level / timeframe from the fetched topics by index, so
  // URLs and metadata are never model-invented. Out-of-range indices are dropped.
  const sections: ReportSection[] = parsed.sections
    .filter((s) => topics[s.topic_index] !== undefined)
    .map((s): ReportSection => {
      const t = topics[s.topic_index];
      return {
        topic: s.heading || t.topic,
        summary: s.summary,
        sources: t.sources,
        level: t.level,
        timeframe: t.recency,
      };
    });

  return { content: { sections }, markdown: parsed.markdown };
}
