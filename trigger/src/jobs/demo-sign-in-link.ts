import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// DEV ONLY. Mints a one-time sign-in link for an account WITHOUT sending any email, which is the
// only way into an account whose address is deliberately fake — like the demo user. Run it, copy
// `link` out of the logs, paste it into a browser.
//
//   { "userId": "<uuid>" }   or   { "email": "demo@..." }
//
// Needs service_role, which only the pipeline has. Never point this at a real person's account:
// the link is a full sign-in, and it ends up in the run logs.
// ─────────────────────────────────────────────────────────────────────────────
export const demoSignInLink = task({
  id: "demo-sign-in-link",
  run: async (payload: { email?: string; userId?: string }) => {
    const db = supabase();

    let email = payload.email;
    if (!email && payload.userId) {
      const { data, error } = await db.auth.admin.getUserById(payload.userId);
      if (error) throw error;
      email = data.user?.email ?? undefined;
    }
    if (!email) {
      throw new Error(`Provide { userId } or { email }. Received: ${JSON.stringify(payload ?? null)}`);
    }

    const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (error) throw error;

    const link = data.properties?.action_link;
    if (!link) throw new Error("Supabase returned no action_link");

    logger.info("paste this into a browser to sign in", { email, link });
    return { email, link };
  },
});
