import { requireEnv } from "./env";

// Perplexity is OpenAI-compatible over plain HTTP — no SDK needed. We surface non-2xx
// and empty responses as real errors (COMPOSIO_TRIGGER_LEARNINGS Patterns §3) so an
// undefined result never flows silently downstream.
//
// ⚠️ The exact request shaping (search recency, domain filters, system prompt) is part
// of the COLLABORATIVE query-design step with the owner — this is a reasonable default.

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions";
export const PERPLEXITY_MODEL = "sonar-pro"; // per CLAUDE.md

export interface PerplexityResult {
  content: string;
  sources: string[];
}

export async function perplexitySearch(query: string): Promise<PerplexityResult> {
  const res = await fetch(PERPLEXITY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("PERPLEXITY_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [{ role: "user", content: query }],
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

  // Perplexity has shipped citations under a few shapes across versions — probe defensively.
  const sources: string[] =
    data?.citations ??
    data?.search_results?.map((s: any) => s?.url).filter(Boolean) ??
    [];

  return { content, sources };
}
