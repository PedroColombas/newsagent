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
//  - stronger model for report synthesis (report quality is the core product value)
//  - mid-tier for the conversational podcast rewrite
// IDs are current for this session; swap freely.
export const MODELS = {
  queryTranslation: "claude-haiku-4-5-20251001",
  synthesis: "claude-opus-4-8", // premium; "claude-sonnet-4-6" is the cheaper alternative
  podcastScript: "claude-sonnet-4-6",
} as const;

// Pull the first text block out of a Messages response (kept SDK-type-agnostic on purpose).
export function firstText(content: Array<{ type: string; text?: string }>): string {
  const block = content.find((b) => b.type === "text" && typeof b.text === "string");
  return block?.text ?? "";
}
