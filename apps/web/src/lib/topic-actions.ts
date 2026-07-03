import type { Preferences } from "@shared/types";
import { planReportSections } from "@shared/plan-topics";

// A single managed topic (one report section). Genre = broad; subtopic = a focus within a genre;
// custom = the user's own words.
export type TopicEntry =
  | { kind: "genre"; genre: string }
  | { kind: "subtopic"; genre: string; sub: string }
  | { kind: "custom"; text: string };

export function entryKey(e: TopicEntry): string {
  if (e.kind === "custom") return `interest:${e.text}`;
  if (e.kind === "subtopic") return `sub:${e.genre}:${e.sub}`;
  return `genre:${e.genre}`;
}

export function entryLabel(e: TopicEntry): string {
  if (e.kind === "custom") return e.text;
  if (e.kind === "subtopic") return e.sub;
  return e.genre;
}

export function entryTypeLabel(e: TopicEntry): string {
  if (e.kind === "custom") return "Your own words";
  if (e.kind === "subtopic") return `${e.genre} · focus`;
  return "Whole genre";
}

// The user's topics, in report order (same source of truth as the pipeline).
export function topicEntries(prefs: Preferences): TopicEntry[] {
  return planReportSections(prefs).map((t): TopicEntry => {
    if (t.level === 3) return { kind: "custom", text: t.topic };
    if (t.level === 2) return { kind: "subtopic", genre: t.genre ?? "", sub: t.topic };
    return { kind: "genre", genre: t.topic };
  });
}

// ── mutations — each returns a Partial<Preferences> patch to hand to update() ──

export function removeEntry(prefs: Preferences, e: TopicEntry): Partial<Preferences> {
  const key = entryKey(e);
  const topic_order = (prefs.topic_order ?? []).filter((k) => k !== key);
  if (e.kind === "genre") {
    return { genres: prefs.genres.filter((g) => g !== e.genre), topic_order };
  }
  if (e.kind === "subtopic") {
    const subs = (prefs.subtopics[e.genre] ?? []).filter((s) => s !== e.sub);
    return { subtopics: { ...prefs.subtopics, [e.genre]: subs }, topic_order };
  }
  return { custom_interests: (prefs.custom_interests ?? []).filter((t) => t !== e.text), topic_order };
}

export function addEntry(prefs: Preferences, e: TopicEntry): Partial<Preferences> {
  const key = entryKey(e);
  const order = prefs.topic_order ?? [];
  const topic_order = order.includes(key) ? order : [...order, key];
  if (e.kind === "genre") {
    if (prefs.genres.includes(e.genre)) return {};
    return { genres: [...prefs.genres, e.genre], topic_order };
  }
  if (e.kind === "subtopic") {
    const subs = prefs.subtopics[e.genre] ?? [];
    if (subs.includes(e.sub)) return {};
    return { subtopics: { ...prefs.subtopics, [e.genre]: [...subs, e.sub] }, topic_order };
  }
  const text = e.text.trim();
  const current = prefs.custom_interests ?? [];
  if (!text || current.includes(text)) return {};
  return { custom_interests: [...current, text], topic_order };
}

// Replace one entry with another, keeping its position in the order.
export function editEntry(prefs: Preferences, oldE: TopicEntry, newE: TopicEntry): Partial<Preferences> {
  if (entryKey(oldE) === entryKey(newE)) return {};
  const afterRemove = { ...prefs, ...removeEntry(prefs, oldE) } as Preferences;
  const after = { ...afterRemove, ...addEntry(afterRemove, newE) } as Preferences;
  const oldKey = entryKey(oldE);
  const newKey = entryKey(newE);
  const order = (prefs.topic_order ?? []).map((k) => (k === oldKey ? newKey : k));
  const topic_order = order.includes(newKey) ? order : [...order, newKey];
  return {
    genres: after.genres,
    subtopics: after.subtopics,
    custom_interests: after.custom_interests,
    topic_order,
  };
}
