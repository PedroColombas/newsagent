import type { ContextDepth } from "@shared/types";
import { MAX_SECTIONS } from "@shared/plan-topics";

// App-enforced limits (the DB is permissive; these shape the UI).
export const MAX_GENRES = 5;
export const MAX_INTERESTS = 5;
// Hard cap on total report topics (subtopics + custom interests). More than this slows generation
// and runs up cost, so it's a firm limit with a visible count. Genres are containers, not topics.
// Mirrors the pipeline's cap, so the UI and the generated brief can never disagree.
export const MAX_TOPICS = MAX_SECTIONS;

// Level-1 genres. The core set from CLAUDE.md first, then a wider tail.
export const GENRES = [
  "Technology",
  "Politics",
  "Finance",
  "Business",
  "Science",
  "Health",
  "Sport",
  "Culture",
  "World",
  "Climate",
  "Entertainment",
  "Media",
] as const;

export const CONTEXT_DEPTH_OPTIONS: { value: ContextDepth; label: string; hint: string }[] = [
  { value: "full", label: "Full", hint: "A thorough catch-up the first time a topic appears" },
  { value: "quick", label: "Quick", hint: "A short primer the first time a topic appears" },
  { value: "latest", label: "Latest", hint: "No catch-up — just what's new" },
];

// Static fallback used when the dynamic suggestion endpoint is unavailable
// (e.g. local `vite` dev without an Anthropic key, or a transient API failure).
export const SUBTOPIC_FALLBACK: Record<string, string[]> = {
  Technology: ["AI", "Semiconductors", "Startups", "Cybersecurity", "Consumer Tech", "Big Tech"],
  Politics: ["Elections", "Geopolitics", "Policy", "Defense", "Democracy"],
  Finance: ["Markets", "Central Banks", "Crypto", "Deals", "Earnings"],
  Business: ["Strategy", "Leadership", "Retail", "Energy", "Supply Chains"],
  Science: ["Space", "Physics", "Biology", "Climate Science", "Research"],
  Health: ["Medicine", "Mental Health", "Nutrition", "Public Health", "Biotech"],
  Sport: ["Football", "Basketball", "Tennis", "Motorsport", "Transfers"],
  Culture: ["Film", "Music", "Books", "Art", "Television"],
  World: ["Conflicts", "Diplomacy", "Migration", "Global Economy", "Elections"],
  Climate: ["Policy", "Renewables", "Extreme Weather", "Emissions", "Biodiversity"],
  Entertainment: ["Movies", "Streaming", "Celebrity", "Awards", "Gaming"],
  Media: ["Journalism", "Social Media", "Streaming Wars", "Advertising", "Creators"],
};
