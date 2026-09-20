import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./env";

// Lazy client (Trigger §2).
let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  }
  return client;
}

// Model choices are config constants so they're easy to tune (per CLAUDE.md):
//  - cheap/fast model for Level-3 interest -> query translation
//  - synthesis on Opus for now. NOTE: routing briefing/standard to Sonnet was a cost optimization
//    but it STUBBED sections on heavy primer-heavy first briefs (degraded quality), so it's reverted
//    to Opus until validated with a proper before/after (backlog N1). Keep the routing hook below.
//  - mid-tier for the conversational podcast rewrite
// IDs are current for this session; swap freely.
export const MODELS = {
  queryTranslation: "claude-haiku-4-5-20251001",
  synthesis: "claude-opus-4-8", // known-good (was Sonnet — reverted, see note above)
  podcastScript: "claude-sonnet-4-6",
} as const;

// Pull the first text block out of a Messages response (kept SDK-type-agnostic on purpose).
export function firstText(content: Array<{ type: string; text?: string }>): string {
  const block = content.find((b) => b.type === "text" && typeof b.text === "string");
  return block?.text ?? "";
}
