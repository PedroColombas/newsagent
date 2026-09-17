import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// POST /api/podcast   (header: Authorization: Bearer <supabase access token>, body: { reportId })
// Generates the podcast for ONE report, on explicit user request. Audio is the most expensive step
// in the pipeline, so it is never produced automatically — the user has to ask for it.
//
// The caller's session is verified and the report is then looked up THROUGH that session, so RLS
// proves ownership: you can only ever make a podcast for your own report, whatever id you post.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  if (!supabaseUrl || !anonKey || !triggerKey) {
    return res.status(500).json({ error: "Server is missing required env vars" });
  }

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const reportId = (req.body as { reportId?: string } | undefined)?.reportId;
  if (!reportId) return res.status(400).json({ error: "Missing reportId" });

  // Client bound to the caller's session, so every query below runs under their RLS policies.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });

  // RLS scopes this to the caller's own reports — someone else's id simply returns nothing.
  const { data: report, error: reportErr } = await supabase
    .from("reports")
    .select("id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (reportErr) {
    console.error("report lookup failed:", reportErr.message);
    return res.status(502).json({ error: "Could not start the podcast" });
  }
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status !== "complete") {
    return res.status(409).json({ error: "That brief isn't ready yet" });
  }

  try {
    const resp = await fetch("https://api.trigger.dev/api/v1/tasks/generate-podcast/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${triggerKey}`,
        "Content-Type": "application/json",
      },
      // force: the user asked deliberately (e.g. retrying a failed episode), so rebuild rather
      // than keep a stale row. The button is only offered when there's no complete episode.
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
