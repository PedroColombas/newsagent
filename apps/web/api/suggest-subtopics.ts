import type { VercelRequest, VercelResponse } from "@vercel/node";
import { suggestSubtopics } from "./_lib/suggest";

// POST /api/suggest-subtopics  { genre: string }  ->  { subtopics: string[] }
// Runs server-side so ANTHROPIC_API_KEY (set in Vercel env vars) never reaches the client.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  const genre = typeof req.body?.genre === "string" ? req.body.genre : "";
  if (!genre.trim()) {
    return res.status(400).json({ error: "Missing genre" });
  }

  try {
    const subtopics = await suggestSubtopics(genre, apiKey, process.env.PERPLEXITY_API_KEY);
    return res.status(200).json({ subtopics });
  } catch (err) {
    console.error("suggest-subtopics failed:", err);
    return res.status(502).json({ error: "Suggestion failed" });
  }
}
