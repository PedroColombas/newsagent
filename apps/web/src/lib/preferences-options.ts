import type { ReportMode, Voice, ContextDepth } from "@shared/types";

// App-enforced limits (the DB is permissive; these shape the UI).
export const MAX_GENRES = 5;
export const MAX_INTERESTS = 5;

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

export const REPORT_MODES: { value: ReportMode; label: string; hint: string }[] = [
  { value: "briefing", label: "Briefing", hint: "Headlines + one-line context" },
  { value: "standard", label: "Standard", hint: "2–3 paragraphs per topic" },
  { value: "deep_dive", label: "Deep dive", hint: "Long-form, 1–2 topics" },
];

export const VOICES: { value: Voice; label: string; hint: string }[] = [
  { value: "neutral", label: "Neutral", hint: "Straight and factual" },
  { value: "analytical", label: "Analytical", hint: "Connects the dots" },
  { value: "conversational", label: "Conversational", hint: "Warm and accessible" },
  { value: "critical", label: "Critical", hint: "Questions the claims" },
];

// Catch-up depth for a newly-followed topic's first appearance.
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
