import type { Preferences } from "./types";

export interface PlannedTopic {
  topic: string; // section label (raw interest text for L3 — the pipeline sharpens it later)
  level: 1 | 2 | 3; // 1 genre · 2 subtopic · 3 custom interest
  genre: string | null; // originating genre (L1 = itself, L2 = parent, L3 = none)
}

/**
 * Single source of truth for which sections a report will contain. Genres are containers;
 * only subtopics (L2) and custom interests (L3) become sections, ordered most-specific-first
 * (L3 > L2, stable within a level).
 *
 * Used by BOTH the pipeline (fetch-news → one Perplexity query per section) and the app's
 * edition preview, so the preview always matches the real report. The pipeline additionally
 * sharpens each L3 interest into a clean search label at run time; here we keep the user's
 * own words.
 */
/** Stable key for a section — same format as fetch-news's topicKey; used for the manual order. */
export function sectionKey(t: PlannedTopic): string {
  if (t.level === 3) return `interest:${t.topic}`;
  if (t.level === 2) return `sub:${t.genre}:${t.topic}`;
  return `genre:${t.topic}`;
}

export function planReportSections(prefs: Preferences): PlannedTopic[] {
  const topics: PlannedTopic[] = [];

  // Genres are CONTAINERS for choosing subtopics — they don't become sections themselves. A brief
  // is the user's subtopics (L2) + custom interests (L3), which keeps the topic count focused.
  for (const [genre, subs] of Object.entries(prefs.subtopics ?? {})) {
    for (const sub of subs) {
      topics.push({ topic: sub, level: 2, genre });
    }
  }
  for (const interest of prefs.custom_interests ?? []) {
    const trimmed = interest.trim();
    if (trimmed) topics.push({ topic: trimmed, level: 3, genre: null });
  }

  // Default order: most-specific-first (stable within a level) — custom interests, then subtopics.
  topics.sort((a, b) => b.level - a.level);

  // Apply the user's manual order (drag-to-reorder): ordered sections first in that order; anything
  // not in the order stays in its default position after (stable sort).
  const order = prefs.topic_order ?? [];
  if (order.length > 0) {
    const rank = new Map(order.map((k, i) => [k, i] as const));
    topics.sort((a, b) => (rank.get(sectionKey(a)) ?? Infinity) - (rank.get(sectionKey(b)) ?? Infinity));
  }
  return topics;
}

/** Total sections a brief will contain — subtopics + custom interests (genres are containers). */
export function countCandidateSections(prefs: Preferences): number {
  const subtopicCount = Object.values(prefs.subtopics ?? {}).reduce((n, subs) => n + subs.length, 0);
  const interestCount = (prefs.custom_interests ?? []).filter((s) => s.trim()).length;
  return subtopicCount + interestCount;
}
