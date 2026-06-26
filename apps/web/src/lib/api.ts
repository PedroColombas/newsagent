import { SUBTOPIC_FALLBACK } from "./preferences-options";

const CACHE_PREFIX = "subtopics:";

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function readCache(genre: string): string[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + genre);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { date: string; subtopics: string[] };
    if (cached.date === today() && Array.isArray(cached.subtopics) && cached.subtopics.length > 0) {
      return cached.subtopics;
    }
  } catch {
    /* ignore malformed cache */
  }
  return null;
}

function writeCache(genre: string, subtopics: string[]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + genre, JSON.stringify({ date: today(), subtopics }));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

/**
 * Fetch subtopic suggestions for a genre from the server-side endpoint, cached
 * per genre for the day (the suggestions are trend-grounded, so once a day is plenty).
 * Falls back to the static map on any failure so the UI always has chips to show.
 */
export async function fetchSubtopicSuggestions(genre: string): Promise<string[]> {
  const cached = readCache(genre);
  if (cached) return cached;

  try {
    const res = await fetch("/api/suggest-subtopics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ genre }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { subtopics?: string[] };
    if (Array.isArray(data.subtopics) && data.subtopics.length > 0) {
      writeCache(genre, data.subtopics);
      return data.subtopics;
    }
    throw new Error("empty suggestions");
  } catch {
    return SUBTOPIC_FALLBACK[genre] ?? [];
  }
}
