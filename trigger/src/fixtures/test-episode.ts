import type { ReportContent } from "@shared/types";
import type { DialogueTurn } from "../lib/tts";

// Canned report + interview script for cheap, token-free TESTING of report rendering and podcast
// assembly (intro sting, voices, TTS). Used only by the seed-test-episode dev task — NEVER by the
// real pipeline. Content is illustrative, not real news. Deliberately exercises the UI: multiple
// paragraphs, sources, a catch-up primer section, and a "while you were away" recap.

export const FIXTURE_REPORT: { content: ReportContent; markdown: string } = {
  content: {
    recap: {
      summary:
        "Since you last read a brief you've missed two editions. The threads worth knowing: a run of AI-chip export headlines that rattled semiconductor names, a central bank that softened its language on rates, and continued fallout from last week's cloud outage. Today picks those up where they left off.",
      days: 2,
    },
    sections: [
      {
        topic: "A quieter breakthrough in battery density",
        category: "Technology",
        level: 1,
        timeframe: "day",
        isPrimer: false,
        summary:
          "A research group reported a solid-state cell holding roughly 40 percent more energy by volume than today's lithium-ion packs, while surviving several hundred fast-charge cycles without meaningful degradation. The result was independently reviewed and, unusually for the field, came with full cycle data rather than a single headline number.\n\nThe team was careful about timelines. Scaling a lab cell to a production line is where most of these advances stall, and they put commercial availability several years out. Still, two carmakers have reportedly taken licensing meetings, which is the part investors noticed.",
        sources: [
          {
            title: "Nature — Solid-state energy density milestone",
            url: "https://www.nature.com/articles/example-battery",
            date: "2026-07-04",
          },
          {
            title: "Reuters — Battery startup in licensing talks",
            url: "https://www.reuters.com/technology/example-battery",
            date: "2026-07-03",
          },
        ],
      },
      {
        topic: "Markets hold steady as a rate cut nears",
        category: "Finance",
        level: 1,
        timeframe: "day",
        isPrimer: false,
        summary:
          "Equity indices drifted sideways as traders waited on next week's central bank decision, with the major benchmarks closing within a fraction of a percent of where they opened. Bond yields eased slightly, a sign the market is leaning toward a cut.\n\nAnalysts cautioned against reading too much into a quiet session. The move everyone is positioned for is already priced in, they argued, so the risk is in the guidance that comes with the decision rather than the number itself.",
        sources: [
          {
            title: "Financial Times — Rate expectations firm up",
            url: "https://www.ft.com/content/example-rates",
            date: "2026-07-04",
          },
        ],
      },
      {
        topic: "China's chip-tooling push",
        category: null,
        level: 3,
        timeframe: "month",
        isPrimer: true,
        summary:
          "This one is new to your brief, so here is the background. For two years China has been pouring state money into building a domestic semiconductor toolchain — the machines that make chips — to blunt the impact of export controls. The hardest piece is lithography, the light-based printing step dominated by a single Dutch supplier.\n\nMost recently, a state-backed firm demonstrated a domestic tool at an older node. It is well behind the cutting edge, but the direction of travel is what matters: a slow, expensive climb toward self-sufficiency that reshapes who depends on whom.",
        sources: [
          {
            title: "Bloomberg — Domestic lithography demo",
            url: "https://www.bloomberg.com/news/example-litho",
            date: "2026-07-01",
          },
        ],
      },
    ],
  },
  markdown: `## A quieter breakthrough in battery density

A research group reported a solid-state cell holding roughly 40 percent more energy by volume than today's lithium-ion packs, while surviving several hundred fast-charge cycles. The team put commercial availability several years out, but two carmakers have reportedly taken licensing meetings.

## Markets hold steady as a rate cut nears

Equity indices drifted sideways as traders waited on next week's central bank decision. Bond yields eased slightly, a sign the market is leaning toward a cut. Analysts warned the risk is in the guidance, not the number.

## China's chip-tooling push

For two years China has been funding a domestic semiconductor toolchain to blunt export controls. The hardest piece is lithography. A state-backed firm recently demonstrated a domestic tool at an older node — behind the cutting edge, but a marker of the direction of travel.`,
};

export const FIXTURE_SCRIPT: DialogueTurn[] = [
  {
    speaker: "host",
    text: "Welcome back to your Daily Brief. Today we've got three things on the table — a battery result that's quietly a big deal, a market that's holding its breath before a rate decision, and a catch-up on what China's doing with chip-making tools. Let's get into it.",
    section: 0,
  },
  {
    speaker: "host",
    text: "Quick note first — you missed a couple of editions, so I'll fold in what moved while you were away as we go.",
    section: 0,
  },
  {
    speaker: "expert",
    text: "Yeah, so start with the battery news, because it's the one that made people sit up. A group's got a solid-state cell holding about forty percent more energy for the same size — and crucially they showed the full cycle data, not just a hero number.",
    section: 0,
  },
  { speaker: "host", text: "Okay, so — forty percent more. What's the catch?", section: 0 },
  {
    speaker: "expert",
    text: "Manufacturing, basically. Lab cell to production line is where almost all of these die. They're saying years out. But two carmakers took licensing meetings, and that's the tell that it's more than a press release.",
    section: 0,
  },
  { speaker: "host", text: "Right. Let's talk markets — anything actually happen?", section: 1 },
  {
    speaker: "expert",
    text: "Honestly? A very quiet day. Everyone's parked, waiting on the rate call next week. Yields ticked down a touch, so the lean is toward a cut — but the real action's in the guidance, not the number.",
    section: 1,
  },
  {
    speaker: "host",
    text: "And this last one's new for you, so let's set the scene — China and chip tools.",
    section: 2,
  },
  {
    speaker: "expert",
    text: "So the short version: for a couple of years now, China's been spending heavily to build its own chip-making machines, to get around export controls. The hardest bit is lithography. They just showed a home-grown tool — it's behind the leading edge, but the direction is the whole story.",
    section: 2,
  },
  {
    speaker: "host",
    text: "Great stuff. That's your brief — I'll catch you next time.",
    section: 2,
  },
];
