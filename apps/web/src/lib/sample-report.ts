// A canned sample brief shown to a brand-new user while their real first brief generates, so they
// immediately get a feel for the format. Illustrative content — not real news, same for everyone.
export interface SampleSection {
  category: string;
  topic: string;
  summary: string;
}

export const SAMPLE_SECTIONS: SampleSection[] = [
  {
    category: "Technology",
    topic: "A quieter breakthrough in battery density",
    summary:
      "Researchers reported a solid-state cell holding roughly 40% more energy by volume — and, unusually for the field, shared the full cycle data rather than a single headline number. Commercial availability is still years out, but two carmakers have reportedly taken licensing meetings.",
  },
  {
    category: "Finance",
    topic: "Markets hold steady as a rate cut nears",
    summary:
      "Equity indices drifted sideways ahead of next week's central-bank decision, with bond yields easing slightly — a sign the market is leaning toward a cut. Analysts cautioned the real risk sits in the guidance, not the number itself.",
  },
  {
    category: "Science",
    topic: "New deep-field data nudges galaxy timelines earlier",
    summary:
      "A fresh batch of telescope images sharpened estimates of how quickly early galaxies formed, pulling the timeline slightly earlier. It's incremental, but it tightens a debate that's run for a decade.",
  },
];
