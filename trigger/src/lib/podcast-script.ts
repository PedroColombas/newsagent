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
- Cover the report's topics in order, and match its depth — a short report makes a short episode. Don't pad.`;

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

export async function writeScript(markdown: string): Promise<DialogueTurn[]> {
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
        content: `Here is today's report. Write the two-person interview script.\n\n${markdown}`,
      },
    ],
  });

  const parsed = JSON.parse(firstText(message.content)) as PodcastScript;
  return (parsed.turns ?? []).filter((t) => t.text && t.text.trim());
}
