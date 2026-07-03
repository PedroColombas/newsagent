import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// POST /api/generate   (header: Authorization: Bearer <supabase access token>)
// Triggers today's brief on demand for the AUTHENTICATED user. The user is taken from the
// verified token — never from the request body — so no one can generate for another account.
// No Trigger idempotency key on purpose: the UI hides the button the instant it's clicked (so no
// accidental double-fire), retries must always create a fresh run, and generate-report is itself
// idempotent on (user, date).
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

  // Verify the caller's Supabase session and derive the user id from the token.
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  const supabase = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });
  const userId = userData.user.id;

  // force = regenerate over an already-complete brief (the user changed their topics). Absent /
  // false for the first-run "Generate now", which just fills an empty day.
  const force = (req.body as { force?: boolean } | undefined)?.force === true;

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC) — matches the cron

  try {
    // Trigger the prod pipeline via the Tasks REST API (the secret key selects the environment).
    const resp = await fetch("https://api.trigger.dev/api/v1/tasks/fetch-news/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${triggerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: { userId, date, force },
        options: { ttl: "15m" },
      }),
    });

    if (!resp.ok) {
      console.error("trigger failed:", resp.status, await resp.text());
      return res.status(502).json({ error: "Could not start generation" });
    }
    const data = (await resp.json()) as { id?: string };
    return res.status(200).json({ ok: true, runId: data.id ?? null });
  } catch (err) {
    console.error("generate failed:", err);
    return res.status(502).json({ error: "Could not start generation" });
  }
}
