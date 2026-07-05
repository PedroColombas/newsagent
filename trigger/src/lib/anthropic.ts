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
//  - synthesis ROUTES BY REPORT MODE: Sonnet for briefing/standard (fast, cheap, plenty capable),
//    Opus only for deep_dive where the extra analytical depth earns its cost
//  - mid-tier for the conversational podcast rewrite
// IDs are current for this session; swap freely.
export const MODELS = {
  queryTranslation: "claude-haiku-4-5-20251001",
  synthesis: "claude-sonnet-4-6", // default (briefing / standard)
  synthesisDeepDive: "claude-opus-4-8", // deep_dive only — depth-first
  podcastScript: "claude-sonnet-4-6",
} as const;

// Pull the first text block out of a Messages response (kept SDK-type-agnostic on purpose).
export function firstText(content: Array<{ type: string; text?: string }>): string {
  const block = content.find((b) => b.type === "text" && typeof b.text === "string");
  return block?.text ?? "";
}
