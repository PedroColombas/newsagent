import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authorisePaidRequest } from "./_lib/paid-request";

// POST /api/generate   (header: Authorization: Bearer <supabase access token>)
// Triggers today's brief on demand for the AUTHENTICATED user. The user is taken from the verified
// token - never from the request body - so no one can generate for another account, and the shared
// guard refuses the public demo account outright.
// No Trigger idempotency key on purpose: the UI hides the button the instant it's clicked (so no
// accidental double-fire), retries must always create a fresh run, and generate-report is itself
// idempotent on (user, date).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  if (!triggerKey) return res.status(500).json({ error: "Server is missing required env vars" });

  const auth = await authorisePaidRequest(req.headers.authorization);
  if (!auth.userId) return res.status(auth.status ?? 401).json({ error: auth.error });
  const userId = auth.userId;

  // force = regenerate over an already-complete brief (the user changed their topics). Absent /
  // false for the first-run "Generate now", which just fills an empty day.
  const force = (req.body as { force?: boolean } | undefined)?.force === true;

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC) - matches the cron

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
