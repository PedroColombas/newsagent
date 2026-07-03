import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { perplexitySearch } from "../lib/perplexity";
import { withDiagnostics } from "../lib/diagnostics";
import { generateReport } from "./generate-report";
import { planReportSections, type PlannedTopic } from "../../../shared/plan-topics";
import type { Preferences, Recency, ReportSource } from "@shared/types";

// A topic resolved to a single editorial-brief Perplexity query (one query per topic).
export interface TopicQuery {
  topic: string; // clean label shown in the report
  level: 1 | 2 | 3; // genre / subtopic / custom interest
  genre: string | null; // originating genre (L1 = itself, L2 = parent, L3 = none)
  recency: Recency; // resolved news window for this topic
  query: string; // the editorial-brief user prompt
  topicKey: string; // stable key for new-topic detection (user_topic_history)
  isPrimer: boolean; // first-time catch-up primer for this user
}

export interface FetchedTopic extends TopicQuery {
  content: string; // Perplexity's synthesised answer
  sources: ReportSource[]; // dated citations
}

export const fetchNews = task({
  id: "fetch-news",
  maxDuration: 300,
  run: async (payload: { userId: string; date: string; force?: boolean }) => {
    const { userId, date, force } = payload;

    try {
      // If today's brief is already complete (a duplicate click, a Trigger retry, or the daily
      // cron after an on-demand run), don't redo the work or downgrade the finished report.
      // EXCEPT when force is set (the user changed their topics and asked to regenerate today) —
      // then we deliberately rebuild over the finished report.
      const { data: current } = await supabase()
        .from("reports")
        .select("status")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (!force && current?.status === "complete") {
        logger.info("report already complete — skipping fetch", { userId, date });
        return { userId, date, skipped: true };
      }

      // Claim the reports row and mark it generating up front, so the app shows the compiling
      // state immediately and it SURVIVES A RELOAD. (Previously the row appeared only once
      // generate-report ran — i.e. after the whole Perplexity stage — leaving a multi-minute gap
      // where a reload saw no row and fell back to the "Generate" button, letting the user
      // re-trigger a duplicate run.)
      await supabase()
        .from("reports")
        .upsert(
          {
            user_id: userId,
            date,
            status: "generating",
            error_message: null,
            // Stamp when THIS generation started. created_at is otherwise only set on insert, so a
            // reclaimed row (e.g. retrying a hours-old failed brief) would keep a stale time and the
            // app's reload timeout + failed-vs-stale checks would misfire.
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id,date" },
        );

      const { data, error } = await supabase()
        .from("preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      const prefs = data as Preferences;

      // Topics this user has already been briefed on — a topic only gets a catch-up primer
      // the first time it appears.
      const { data: history } = await supabase()
        .from("user_topic_history")
        .select("topic_key")
        .eq("user_id", userId);
      const briefed = new Set((history ?? []).map((h) => h.topic_key as string));

      const topics = await buildTopicQueries(prefs, briefed);
      logger.info("resolved topic queries", {
        userId,
        count: topics.length,
        windows: topics.map((t) => `${t.topic}:${t.recency}${t.isPrimer ? ":primer" : ""}`),
      });

      // One Perplexity query per topic. Sequential keeps us under rate limits; revisit with
      // a small concurrency pool if it's too slow for users with many topics.
      const fetched: FetchedTopic[] = [];
      for (const t of topics) {
        const result = await withDiagnostics(`perplexity:${t.topic}`, () =>
          perplexitySearch(t.query, {
            recency: t.recency,
            system: SYSTEM_PROMPT,
            contextSize: t.isPrimer ? "high" : "medium",
          }),
        );
        fetched.push({ ...t, content: result.content, sources: result.sources });
      }
      logger.info("fetched all topics", { userId, count: fetched.length });

      // Hand off to synthesis (fire-and-forget; generate-report owns the reports row).
      // Pass force through so a regenerate also rebuilds the report + podcast, not just re-fetches.
      await generateReport.trigger({ userId, date, topics: fetched, force });

      return { userId, date, topicCount: fetched.length };
    } catch (err) {
      // fetch-news fails BEFORE generate-report creates the reports row, so without this the app
      // would just spin until it times out. Record a failed report (unless a good one already
      // exists) so the UI surfaces an error — with a clearer message for quota/billing — in
      // seconds rather than minutes.
      const { data: existing } = await supabase()
        .from("reports")
        .select("status")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();
      if (existing?.status !== "complete") {
        await supabase()
          .from("reports")
          .upsert(
            { user_id: userId, date, status: "failed", error_message: friendlyFetchError(err) },
            { onConflict: "user_id,date" },
          );
      }
      throw err; // rethrow so Trigger records + retries
    }
  },
});

// Turn a raw pipeline error into a short, user-facing reason for reports.error_message.
function friendlyFetchError(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err);
  if (/insufficient_quota|exceeded your current quota|\b429\b|rate.?limit|too many requests|quota/i.test(msg)) {
    return "The news service is temporarily unavailable (usage limit reached). Please try again shortly.";
  }
  return "Couldn't gather today's news — something went wrong. Please try again.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Query generation — DESIGNED WITH THE OWNER.
//   • Editorial-brief shape: ask Perplexity to do the editorial work (key facts +
//     why it matters), one shared template across all three topic levels.
//   • Topic resolution: genres/subtopics are deterministic; free-text custom
//     interests get a cheap Claude call to extract a clean topic label.
//   • Window: latest (24h) per topic; a topic NEW to the user gets a one-time catch-up
//     primer (wider "month" window + background query) unless context_depth is "latest".
//   • Every topic the user keeps becomes a section — no cap. planReportSections decides the
//     set and order; here we resolve each into a query.
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

const DAILY_WINDOW: Recency = "day"; // latest news for an already-followed topic
const PRIMER_WINDOW: Recency = "month"; // wider window for a first-time catch-up primer

// A first-time catch-up: background + state of the field, not just today's headlines.
function primerQuery(topic: string): string {
  return (
    `Provide background to bring a reader up to speed on ${topic}: the current state of the ` +
    `field, the key players and context, and the most important recent developments and ongoing ` +
    `storylines. Focus on what someone newly following ${topic} needs to understand — not just ` +
    `the last day's headlines.`
  );
}

// Stable identifier per topic for new-topic detection (independent of the resolved L3 label).
function topicKey(p: PlannedTopic): string {
  if (p.level === 3) return `interest:${p.topic}`;
  if (p.level === 2) return `sub:${p.genre}:${p.topic}`;
  return `genre:${p.topic}`;
}

async function buildTopicQueries(prefs: Preferences, briefed: Set<string>): Promise<TopicQuery[]> {
  // Which sections (and their order) is shared with the app's edition preview via
  // planReportSections, so the two never drift. Here we resolve each into a query.
  const out: TopicQuery[] = [];
  for (const planned of planReportSections(prefs)) {
    const key = topicKey(planned);
    // A topic new to this user gets a one-time catch-up primer (unless they chose "latest").
    const isPrimer = prefs.context_depth !== "latest" && !briefed.has(key);

    // L3 custom interests: sharpen the raw free-text into a clean search label.
    const topic =
      planned.level === 3 ? await resolveInterestTopic(planned.topic) : planned.topic;
    const recency = isPrimer ? PRIMER_WINDOW : DAILY_WINDOW;

    out.push({
      topic,
      level: planned.level,
      genre: planned.genre,
      recency,
      query: isPrimer ? primerQuery(topic) : editorialQuery(topic, recency),
      topicKey: key,
      isPrimer,
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
