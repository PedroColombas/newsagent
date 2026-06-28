import { anthropic, MODELS, firstText } from "./anthropic";
import type { DialogueTurn } from "./openai-tts";

// ─────────────────────────────────────────────────────────────────────────────
// Podcast script — DESIGNED WITH THE OWNER. Pure LLM logic (no Trigger/DB/TTS deps) so it
// can be previewed in isolation (scripts/preview-podcast.ts); generate-podcast wraps it.
// A two-person INTERVIEW: a curious host asks the questions, an expert answers with the
// report's substance. Always conversational (CLAUDE.md). Returns structured turns that
// drive the multi-voice TTS. Model: Sonnet 4.6 (a rewrite, not the heavy synthesis) —
// tunable via MODELS.podcastScript.
// ─────────────────────────────────────────────────────────────────────────────

const PODCAST_SYSTEM = `You turn a written news report into a script for a two-person audio podcast — a short interview episode with exactly two speakers:
- "host": a curious, warm interviewer. Frames each topic, asks the questions a smart listener would, reacts naturally, and keeps things moving. The host does NOT lecture.
- "expert": a knowledgeable analyst who answers the host's questions with the substance from the report — clear, conversational, and grounded.

Style: a natural interview conversation, like a quality news podcast — not a rigid Q&A, and not one long monologue stuffed into a single turn. The delivery is ALWAYS warm and conversational, regardless of how the written report was worded.

Rules:
- Output ONLY spoken dialogue, as a list of turns. No markdown, no narration, no stage directions, no "[music]" cues.
- Open with the host welcoming the listener and previewing the episode; close with the host signing off.
- Alternate naturally — the host asks and steers, the expert answers. Keep turns short to medium so it feels like a real back-and-forth.
- Ground every claim in the report. Don't invent facts. Attribute to outlets by name, and when a source first comes up, briefly work in what it is and how trustworthy it is, spoken naturally — e.g. "...and that's from Nature, the peer-reviewed journal, so it's well-grounded", or "the Financial Times reported...". Only vouch for outlets you genuinely recognise; if a source is unfamiliar or looks low-quality, say so plainly rather than implying authority.
- Write for the ear: say dates and numbers naturally, expand symbols, and NEVER read out URLs.
- Cover the report's topics in order, and match its depth — a short report makes a short episode. Don't pad.
- If the prompt lists the report's sections with indices, set each turn's "section" to the 0-based index of the section that turn covers. The opening welcome takes the first section's index; the closing sign-off takes the last.
- Sections marked [catch-up] are NEW to the listener. Open those by briefly framing it as a get-up-to-speed — the host flags that it's a new area ("this one's new for you, so let's set the scene") and the expert lays out the essential background before moving to the latest. Keep it natural and short; don't belabour it.
- If a "while you were away" recap is provided, the host opens the episode (right after welcoming the listener) with a brief "here's what you've missed since last time" segment built from it, then moves into today's topics. Keep it short.`;

const PODCAST_SCHEMA = {
  type: "object",
  properties: {
    turns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["host", "expert"] },
          text: { type: "string", description: "The spoken words for this turn" },
          section: {
            type: "integer",
            description: "0-based index of the report section this turn covers",
          },
        },
        required: ["speaker", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["turns"],
  additionalProperties: false,
};

interface PodcastScript {
  turns: DialogueTurn[];
}

export async function writeScript(
  markdown: string,
  sections: { heading: string; isPrimer: boolean }[] = [],
  recap?: string,
): Promise<DialogueTurn[]> {
  const sectionList =
    sections.length > 0
      ? `\n\nReport sections (set each turn's "section" to the matching 0-based index; [catch-up] = the listener is new to this topic):\n${sections
          .map((s, i) => `${i}: ${s.heading}${s.isPrimer ? " [catch-up]" : ""}`)
          .join("\n")}`
      : "";

  const recapBlock = recap
    ? `\n\n"While you were away" recap (the listener missed recent briefs — open with a short "here's what you've missed since last time" segment from this, then today's topics):\n${recap}`
    : "";

  const message = await anthropic().messages.create({
    model: MODELS.podcastScript,
    max_tokens: 8000,
    output_config: {
      format: { type: "json_schema", schema: PODCAST_SCHEMA },
      effort: "medium",
    },
    system: PODCAST_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Here is today's report. Write the two-person interview script.\n\n${markdown}${sectionList}${recapBlock}`,
      },
    ],
  });

  const parsed = JSON.parse(firstText(message.content)) as PodcastScript;
  return (parsed.turns ?? []).filter((t) => t.text && t.text.trim());
}
