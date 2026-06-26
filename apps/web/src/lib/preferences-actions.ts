import type { Preferences } from "@shared/types";
import { MAX_GENRES } from "./preferences-options";

type Update = (patch: Partial<Preferences>) => void;

// Add/remove a genre. Removing also drops that genre's subtopics + recency override
// so we never leave orphaned entries behind. Capped at MAX_GENRES.
export function toggleGenre(prefs: Preferences, update: Update, genre: string) {
  if (prefs.genres.includes(genre)) {
    const subtopics = { ...prefs.subtopics };
    delete subtopics[genre];
    const recency_by_genre = { ...prefs.recency_by_genre };
    delete recency_by_genre[genre];
    update({ genres: prefs.genres.filter((g) => g !== genre), subtopics, recency_by_genre });
  } else if (prefs.genres.length < MAX_GENRES) {
    update({ genres: [...prefs.genres, genre] });
  }
}

export function toggleSubtopic(prefs: Preferences, update: Update, genre: string, sub: string) {
  const current = prefs.subtopics[genre] ?? [];
  const next = current.includes(sub) ? current.filter((s) => s !== sub) : [...current, sub];
  update({ subtopics: { ...prefs.subtopics, [genre]: next } });
}
