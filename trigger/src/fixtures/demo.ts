// Canonical state of the public demo account. Shared by the seeder that BUILDS the demo's content
// and the nightly job that PUTS IT BACK, so the two can never drift apart — drift here would
// silently restore the demo to a different topic set than the briefs were written from.

export interface DemoBriefSpec {
  label: string;
  markRead?: boolean; // anchors the "while you were away" gap
  podcast?: boolean; // the episode a visitor can play immediately
  prefs: {
    genres: string[];
    subtopics: Record<string, string[]>;
    custom_interests: string[];
  };
}

// Shared across every seeded brief. One mode and voice keeps the demo coherent.
export const COMMON_PREFS = {
  report_mode: "standard",
  voice: "analytical",
  context_depth: "quick",
  exclusions: "",
  podcast_enabled: true,
  topic_order: [] as string[],
};

// Topics treated as "already followed" so their sections read as today's news rather than a
// first-time catch-up. `sub:Health:Biotech` is deliberately ABSENT — it is the single catch-up
// section in the last brief, and the only reason that feature is visible in the demo at all.
export const PRIMED_KEYS = [
  "sub:Technology:AI",
  "sub:Technology:Semiconductors",
  "sub:Technology:Cybersecurity",
  "interest:what China is doing in chip development",
  "sub:Politics:Geopolitics",
  "sub:Politics:Defense",
  "sub:World:Conflicts",
  "sub:World:Diplomacy",
  "sub:Finance:Central Banks",
  "sub:Science:Space",
  "interest:the economics of the energy transition",
  "interest:breakthroughs in fusion research",
];

// Four briefs, oldest first. Each is capped at 4 sections (MAX_SECTIONS), so each set has exactly 4.
export const BRIEFS: DemoBriefSpec[] = [
  {
    label: "Tech heavy",
    markRead: true, // the last brief read before the missed days, which is what creates the recap
    prefs: {
      genres: ["Technology"],
      subtopics: { Technology: ["AI", "Semiconductors", "Cybersecurity"] },
      custom_interests: ["what China is doing in chip development"],
    },
  },
  {
    label: "Geopolitics",
    prefs: {
      genres: ["Politics", "World"],
      subtopics: { Politics: ["Geopolitics", "Defense"], World: ["Conflicts", "Diplomacy"] },
      custom_interests: [],
    },
  },
  {
    label: "Mixed, custom interests to the fore",
    prefs: {
      genres: ["Finance", "Science"],
      subtopics: { Finance: ["Central Banks"], Science: ["Space"] },
      custom_interests: [
        "the economics of the energy transition",
        "breakthroughs in fusion research",
      ],
    },
  },
  {
    label: "Landing brief: news + one catch-up + recap",
    podcast: true,
    prefs: {
      genres: ["Technology", "World", "Health"],
      subtopics: { Technology: ["AI"], World: ["Conflicts"], Health: ["Biotech"] },
      custom_interests: ["what China is doing in chip development"],
    },
  },
];

// What a visitor should find on the Preferences screen: the last brief's topic set, which happens
// to exercise all three levels — genres, subtopics and a custom interest.
export const DEMO_FINAL_PREFS = {
  ...COMMON_PREFS,
  ...BRIEFS[BRIEFS.length - 1].prefs,
};
