import { requireEnv } from "./env";
import type { Recency, ReportSource } from "@shared/types";

// Perplexity is OpenAI-compatible over plain HTTP — no SDK needed. We surface non-2xx and
// empty responses as real errors (COMPOSIO_TRIGGER_LEARNINGS Patterns §3) so an undefined
// result never flows silently downstream.

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
export const PERPLEXITY_MODEL = "sonar-pro"; // per CLAUDE.md

export interface PerplexityResult {
  content: string;
  sources: ReportSource[];
}

export interface PerplexityOptions {
  recency: Recency; // -> search_recency_filter (day / week / month)
  system?: string; // optional system prompt
  contextSize?: "low" | "medium" | "high"; // search depth; defaults to medium
}

export async function perplexitySearch(
  userPrompt: string,
  opts: PerplexityOptions,
): Promise<PerplexityResult> {
  const messages = opts.system
    ? [
        { role: "system", content: opts.system },
        { role: "user", content: userPrompt },
      ]
    : [{ role: "user", content: userPrompt }];

  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("PERPLEXITY_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages,
      search_recency_filter: opts.recency,
      web_search_options: { search_context_size: opts.contextSize ?? "medium" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Perplexity ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }

  const data: any = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Perplexity returned no content: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return { content, sources: extractSources(data) };
}

// Prefer the rich search_results (title + url + date); fall back to the citations URL list.
function extractSources(data: any): ReportSource[] {
  const results = data?.search_results;
  if (Array.isArray(results)) {
    const mapped = results
      .filter((r: any) => typeof r?.url === "string")
      .map((r: any): ReportSource => ({ title: r.title, url: r.url, date: r.date }));
    if (mapped.length > 0) return mapped;
  }

  const citations = data?.citations;
  if (Array.isArray(citations)) {
    return citations
      .filter((u: any): u is string => typeof u === "string")
      .map((url: string): ReportSource => ({ url }));
  }

  return [];
}
