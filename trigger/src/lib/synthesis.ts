import { anthropic, MODELS, firstText } from "./anthropic";
import type { Preferences, ReportContent, ReportSection } from "@shared/types";
import type { FetchedTopic } from "../jobs/fetch-news";

// ─────────────────────────────────────────────────────────────────────────────
// Report synthesis — DESIGNED WITH THE OWNER. Pure LLM logic (no Trigger/DB deps) so it
// can be previewed in isolation (scripts/preview-synthesis.ts); generate-report wraps it.
//   • Structured outputs (output_config.format): one call returns sections + markdown.
//   • report_mode controls length/structure, voice controls tone, exclusions are a hard
//     filter. Those specs live in the static system prompt below (cache-friendly).
//   • Claude tags each section with the index of the fetched topic it's based on; we
//     re-attach the real sources/level/timeframe in code, so URLs are never invented.
//   • Model routes by mode: Sonnet for briefing/standard, Opus for deep_dive. Tunable via
//     MODELS.synthesis / MODELS.synthesisDeepDive in lib/anthropic.
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
- Attribute claims in the prose to their source by name, and on the source's first mention add a brief, neutral note on what the outlet is and how reliable it is — e.g. "According to Nature, a peer-reviewed scientific journal, researchers...", or "Reuters, an international news agency, reports...". Add this note ONLY for outlets you genuinely recognise; if you do not recognise a source, say so honestly rather than implying authority (e.g. "according to [name], a personal blog whose claims aren't independently verified, ..."). Never overstate reliability. Draw the outlet name from the source's title or URL.
- Keep one section per topic. Mode controls length, not grouping. In deep_dive you may drop low-priority topics, but never merge two topics into one section.
- State each topic's time window in the prose using its recency value (day = the last 24 hours, week = the last 7 days, month = the last 30 days).
- After each section in the markdown, list that topic's sources as "[title](url) — date", using only the sources provided for that topic. Never fabricate or alter URLs. (The credibility note belongs in the prose, not here.)
- If a topic's research is thin or empty, say so in one sentence rather than padding.
- Apply exclusions as a hard filter: omit anything matching, even if present in the research.

CATCH-UP PRIMERS: Topics marked "primer": true are ones the reader is following for the FIRST time. For those sections, orient a newcomer — set up the current state of the field and why it matters, give the essential background, then the key recent developments, rather than just today's headline. Keep the selected mode and voice, though a primer section may run a little longer than a normal one. Use the given catch-up depth: "quick" = the essentials in a tight paragraph or two; "full" = a thorough but readable get-up-to-speed briefing. Sections not marked primer stay focused on the latest developments.

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

export async function synthesize(
  prefs: Preferences,
  topics: FetchedTopic[],
): Promise<{ content: ReportContent; markdown: string }> {
  // Per-user, volatile content goes in the user turn — after the cached system prefix.
  const topicsForModel = topics.map((t, index) => ({
    index,
    topic: t.topic,
    recency: t.recency,
    primer: t.isPrimer,
    content: t.content,
    sources: t.sources,
  }));

  const userMessage =
    `Report mode: ${prefs.report_mode}\n` +
    `Voice: ${prefs.voice}\n` +
    `Catch-up depth (for primer topics): ${prefs.context_depth}\n` +
    `Exclusions: ${prefs.exclusions || "none"}\n\n` +
    `Topics (JSON array; use each item's "index" as topic_index). Items with "primer": true are new to the reader — write those as a catch-up:\n` +
    `${JSON.stringify(topicsForModel)}\n\n` +
    "Write the report now.";

  // Route by mode: Opus's depth only where it earns its cost (deep_dive), else Sonnet.
  const model = prefs.report_mode === "deep_dive" ? MODELS.synthesisDeepDive : MODELS.synthesis;

  const message = await anthropic().messages.create({
    model,
    // Generous ceiling: a new user's first brief is ALL primers (longer), and the schema returns
    // the content twice (per-section summaries + the full markdown), so the output is large. Plus
    // adaptive thinking shares this budget. 12000 truncated primer-heavy briefs → invalid JSON.
    max_tokens: 32000,
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

  // A truncated (max_tokens) or text-less response would fail JSON.parse with a cryptic
  // "Unexpected end of JSON input" — surface a clear, diagnosable error instead (Trigger retries).
  const raw = firstText(message.content);
  if (message.stop_reason === "max_tokens" || !raw.trim()) {
    throw new Error(
      `Synthesis returned no usable JSON (stop_reason=${message.stop_reason}, text length=${raw.length}). ` +
        "Likely truncated — the brief may have too many/too-long sections for the token budget.",
    );
  }
  const parsed = JSON.parse(raw) as SynthesisOutput;

  // Re-attach the real sources / level / timeframe from the fetched topics by index, so
  // URLs and metadata are never model-invented. Out-of-range indices are dropped.
  const sections: ReportSection[] = parsed.sections
    .filter((s) => topics[s.topic_index] !== undefined)
    .map((s): ReportSection => {
      const t = topics[s.topic_index];
      return {
        topic: s.heading || t.topic,
        category: t.genre,
        summary: s.summary,
        sources: t.sources,
        level: t.level,
        timeframe: t.recency,
        isPrimer: t.isPrimer,
      };
    });

  return { content: { sections }, markdown: parsed.markdown };
}
