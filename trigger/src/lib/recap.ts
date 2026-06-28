import { anthropic, MODELS, firstText } from "./anthropic";
import type { Voice } from "@shared/types";

// "While you were away" — condense the briefs a returning reader missed into a short recap.
// Built from already-generated reports (no new fetch). Mid-tier model (a condensation).
export async function writeRecap(
  missed: { date: string; markdown: string }[],
  voice: Voice,
): Promise<string> {
  const usable = missed.filter((m) => m.markdown && m.markdown.trim());
  if (usable.length === 0) return "";
  const days = usable.length;

  const system =
    `You're writing a short "While you were away" recap for a reader returning to their daily ` +
    `brief after missing ${days} day${days === 1 ? "" : "s"}. Below are the briefs they missed ` +
    `(newest first), with their dates. Condense them into a brief catch-up of what mattered most ` +
    `across that gap — lead with the biggest developments, group by theme rather than replaying it ` +
    `day by day, and note where a story moved over several days. Keep it tight: a short paragraph ` +
    `or two. Write in a ${voice} tone. Don't cover today's news — that follows right below this recap.`;

  const userMessage = usable.map((m) => `Brief — ${m.date}\n\n${m.markdown}`).join("\n\n———\n\n");

  const message = await anthropic().messages.create({
    model: MODELS.podcastScript, // Sonnet — a condensation/rewrite, not the heavy synthesis
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  return firstText(message.content).trim();
}
