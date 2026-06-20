import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { anthropic, MODELS, firstText } from "../lib/anthropic";
import { perplexitySearch } from "../lib/perplexity";
import { withDiagnostics } from "../lib/diagnostics";
import { generateReport } from "./generate-report";
import type { Preferences } from "@shared/types";

// A topic resolved to a single Perplexity query (one query per topic — CLAUDE.md).
export interface TopicQuery {
  topic: string; // human-readable label shown in the report
  level: 1 | 2 | 3; // which topic level produced it (genre / subtopic / custom interest)
  query: string; // the actual Perplexity search query
}

export interface FetchedTopic extends TopicQuery {
  content: string; // Perplexity's synthesised answer
  sources: string[]; // citations / source URLs
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

    // Resolve topics -> queries, capped at max_topics.
    const topics = await buildTopicQueries(prefs);
    logger.info("resolved topic queries", { userId, count: topics.length });

    // One Perplexity query per topic. Sequential keeps us well under rate limits; switch
    // to a small concurrency pool later if it's too slow.
    const fetched: FetchedTopic[] = [];
    for (const t of topics) {
      const result = await withDiagnostics(`perplexity:${t.topic}`, () =>
        perplexitySearch(t.query),
      );
      fetched.push({ ...t, content: result.content, sources: result.sources });
    }
    logger.info("fetched all topics", { userId, count: fetched.length });

    // Hand off to synthesis (fire-and-forget; generate-report owns the reports row).
    await generateReport.trigger({ userId, date, topics: fetched });

    return { userId, date, topicCount: fetched.length };
  },
});

// ───────────────────────────────────────────────────────────────────────────
// ⚠️ STUBS — the query-generation logic is the COLLABORATIVE step CLAUDE.md asks
// us to design together. The wording below is a placeholder so the plumbing runs
// end-to-end; we replace it in the prompt-design session.
// ───────────────────────────────────────────────────────────────────────────

async function buildTopicQueries(prefs: Preferences): Promise<TopicQuery[]> {
  const queries: TopicQuery[] = [];

  // Level 1 — genres
  for (const genre of prefs.genres) {
    queries.push({
      topic: genre,
      level: 1,
      query: `Latest significant ${genre} news in the last 24 hours`,
    });
  }

  // Level 2 — subtopics, keyed by genre
  for (const [genre, subs] of Object.entries(prefs.subtopics ?? {})) {
    for (const sub of subs) {
      queries.push({
        topic: sub,
        level: 2,
        query: `Latest news about ${sub} (${genre}) in the last 24 hours`,
      });
    }
  }

  // Level 3 — free-text custom interests, each translated by a cheap Claude call
  for (const interest of prefs.custom_interests ?? []) {
    queries.push({ topic: interest, level: 3, query: await translateInterest(interest) });
  }

  // Honour max_topics. NOTE: naive truncation for now — smart prioritisation across the
  // three levels is part of the collaborative design.
  return queries.slice(0, prefs.max_topics);
}

async function translateInterest(interest: string): Promise<string> {
  const message = await withDiagnostics("translate-interest", () =>
    anthropic().messages.create({
      model: MODELS.queryTranslation,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Rewrite this user interest as a concise, current news search query. Return ONLY the query.\n\nInterest: "${interest}"`,
        },
      ],
    }),
  );
  return firstText(message.content).trim() || interest;
}
