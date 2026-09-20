import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorisePaidRequest, fetchOwnReport } from "./_lib/paid-request";

// POST /api/podcast   (header: Authorization: Bearer <supabase access token>, body: { reportId })
// Generates the podcast for ONE report, on explicit user request. Audio is the most expensive step
// in the pipeline, so it is never produced automatically - the user has to ask for it.
//
// The shared guard verifies the session and refuses the demo account; the report is then looked up
// THROUGH that session, so RLS proves ownership: you can only ever make a podcast for your own
// report, whatever id you post.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  if (!triggerKey) return res.status(500).json({ error: "Server is missing required env vars" });

  const reportId = (req.body as { reportId?: string } | undefined)?.reportId;
  if (!reportId) return res.status(400).json({ error: "Missing reportId" });

  const auth = await authorisePaidRequest(req.headers.authorization);
  if (!auth.userId) return res.status(auth.status ?? 401).json({ error: auth.error });

  const report = await fetchOwnReport(auth, reportId);
  if (report === "error") return res.status(502).json({ error: "Could not start the podcast" });
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status !== "complete") {
    return res.status(409).json({ error: "That brief is not ready yet" });
  }

  try {
    const resp = await fetch("https://api.trigger.dev/api/v1/tasks/generate-podcast/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${triggerKey}`,
        "Content-Type": "application/json",
      },
      // force: the user asked deliberately (e.g. retrying a failed episode), so rebuild rather
      // than keep a stale row. The button is only offered when there is no complete episode.
      body: JSON.stringify({
        payload: { reportId, force: true },
        options: { ttl: "15m" },
      }),
    });

    if (!resp.ok) {
      console.error("trigger failed:", resp.status, await resp.text());
      return res.status(502).json({ error: "Could not start the podcast" });
    }
    const data = (await resp.json()) as { id?: string };
    return res.status(200).json({ ok: true, runId: data.id ?? null });
  } catch (err) {
    console.error("podcast request failed:", err);
    return res.status(502).json({ error: "Could not start the podcast" });
  }
}
