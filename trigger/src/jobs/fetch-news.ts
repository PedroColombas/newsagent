import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { perplexitySearch } from "../lib/perplexity";
import { withDiagnostics } from "../lib/diagnostics";
import { generateReport } from "./generate-report";
import { planReportSections } from "../../../shared/plan-topics";
import type { Preferences, Recency, ReportSource } from "@shared/types";

// A topic resolved to a single editorial-brief Perplexity query (one query per topic).
export interface TopicQuery {
  topic: string; // clean label shown in the report
  level: 1 | 2 | 3; // genre / subtopic / custom interest
  genre: string | null; // originating genre (L1 = itself, L2 = parent, L3 = none)
  recency: Recency; // resolved news window for this topic
  query: string; // the editorial-brief user prompt
}

export interface FetchedTopic extends TopicQuery {
  content: string; // Perplexity's synthesised answer
  sources: ReportSource[]; // dated citations
}

export const fetchNews = task({
  id: "fetch-news",
  maxDuration: 300,
  run: async (payload: { userId: string; date: string }) => {
    const { userId, date } = payload;

    const { data, error } = await supabase()
      .from("preferences")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    const prefs = data as Preferences;

    const topics = await buildTopicQueries(prefs);
    logger.info("resolved topic queries", {
      userId,
      count: topics.length,
      windows: topics.map((t) => `${t.topic}:${t.recency}`),
    });

    // One Perplexity query per topic. Sequential keeps us under rate limits; revisit with
    // a small concurrency pool if it's too slow for users with many topics.
    const fetched: FetchedTopic[] = [];
    for (const t of topics) {
      const result = await withDiagnostics(`perplexity:${t.topic}`, () =>
        perplexitySearch(t.query, { recency: t.recency, system: SYSTEM_PROMPT }),
      );
      fetched.push({ ...t, content: result.content, sources: result.sources });
    }
    logger.info("fetched all topics", { userId, count: fetched.length });

    // Hand off to synthesis (fire-and-forget; generate-report owns the reports row).
    await generateReport.trigger({ userId, date, topics: fetched });

    return { userId, date, topicCount: fetched.length };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Query generation — DESIGNED WITH THE OWNER.
//   • Editorial-brief shape: ask Perplexity to do the editorial work (key facts +
//     why it matters), one shared template across all three topic levels.
//   • Topic resolution: genres/subtopics are deterministic; free-text custom
//     interests get a cheap Claude call to extract a clean topic label.
//   • Recency: a per-genre override falls back to the user's default window.
//   • Overflow past max_topics is prioritised by specificity (custom > subtopic >
//     genre). That last rule is the easiest knob to retune.
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a news research assistant compiling source material for a personalised daily " +
  "briefing. Report only concrete, verifiable developments — with names, numbers, and " +
  "dates. Be specific and factual; do not speculate unless you clearly label it as " +
  "analysis. If little of substance happened in the window, say so briefly rather than " +
  "padding the answer.";

const WINDOW_TEXT: Record<Recency, string> = {
  day: "the last 24 hours",
  week: "the last 7 days",
  month: "the last 30 days",
};

function editorialQuery(topic: string, recency: Recency): string {
  return (
    `Summarise the most significant ${topic} developments from ${WINDOW_TEXT[recency]}. ` +
    "For each story, give what happened, the key facts, and why it matters. " +
    "Prioritise the most important and most recent developments."
  );
}

function recencyForGenre(prefs: Preferences, genre: string | null): Recency {
  if (genre && prefs.recency_by_genre?.[genre]) return prefs.recency_by_genre[genre];
  return prefs.default_recency;
}

async function buildTopicQueries(prefs: Preferences): Promise<TopicQuery[]> {
  // Which sections (and their order + cap) is shared with the app's edition preview via
  // planReportSections, so the two never drift. Here we resolve each into a query.
  const out: TopicQuery[] = [];
  for (const planned of planReportSections(prefs)) {
    // L3 custom interests: sharpen the raw text into a clean search label (only for topics
    // that survived the cap, so we don't waste calls on overflow).
    const topic =
      planned.level === 3 ? await resolveInterestTopic(planned.topic) : planned.topic;
    const recency = recencyForGenre(prefs, planned.genre);
    out.push({
      topic,
      level: planned.level,
      genre: planned.genre,
      recency,
      query: editorialQuery(topic, recency),
    });
  }
  return out;
}

async function resolveInterestTopic(interest: string): Promise<string> {
  const message = await withDiagnostics("resolve-interest", () =>
    anthropic().messages.create({
      model: MODELS.queryTranslation,
      max_tokens: 64,
      system:
        "Turn the user's free-text interest into a short, search-ready news topic label. " +
        "Return ONLY a concise noun phrase (max ~8 words) capturing the core subject — no " +
        "quotes, no trailing punctuation.",
      messages: [{ role: "user", content: interest }],
    }),
  );
  return firstText(message.content).trim() || interest;
}
