import type { Preferences } from "./types";

export interface PlannedTopic {
  topic: string; // section label (raw interest text for L3 — the pipeline sharpens it later)
  level: 1 | 2 | 3; // 1 genre · 2 subtopic · 3 custom interest
  genre: string | null; // originating genre (L1 = itself, L2 = parent, L3 = none)
}

/**
 * Single source of truth for which sections a report will contain. Every genre, subtopic
 * and custom interest becomes its own section; ordered most-specific-first (L3 > L2 > L1,
 * stable within a level); capped at max_topics.
 *
 * Used by BOTH the pipeline (fetch-news → one Perplexity query per section) and the app's
 * edition preview, so the preview always matches the real report. The pipeline additionally
 * sharpens each L3 interest into a clean search label at run time; here we keep the user's
 * own words.
 */
export function planReportSections(prefs: Preferences): PlannedTopic[] {
  const topics: PlannedTopic[] = [];

  for (const genre of prefs.genres) {
    topics.push({ topic: genre, level: 1, genre });
  }
  for (const [genre, subs] of Object.entries(prefs.subtopics ?? {})) {
    for (const sub of subs) {
      topics.push({ topic: sub, level: 2, genre });
    }
  }
  for (const interest of prefs.custom_interests ?? []) {
    const trimmed = interest.trim();
    if (trimmed) topics.push({ topic: trimmed, level: 3, genre: null });
  }

  // Stable sort by specificity (descending level), then cap at max_topics.
  topics.sort((a, b) => b.level - a.level);
  return topics.slice(0, prefs.max_topics);
}

/** Total candidate sections before the max_topics cap — for "showing N of M" messaging. */
export function countCandidateSections(prefs: Preferences): number {
  const subtopicCount = Object.values(prefs.subtopics ?? {}).reduce((n, subs) => n + subs.length, 0);
  const interestCount = (prefs.custom_interests ?? []).filter((s) => s.trim()).length;
  return prefs.genres.length + subtopicCount + interestCount;
}
