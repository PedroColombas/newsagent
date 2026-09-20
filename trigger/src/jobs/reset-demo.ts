import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { DEMO_FINAL_PREFS } from "../fixtures/demo";

// ─────────────────────────────────────────────────────────────────────────────
// Nightly tidy-up for the public demo. Visitors can edit preferences and replay the setup wizard —
// that is deliberate, since customisation is the product — so without this the demo drifts into
// whatever the last person happened to leave behind.
//
// This cron is SAFE TO LEAVE ON: it only writes to the database and never calls a paid API, unlike
// the daily brief cron that was switched off for cost. It does not touch the reports or podcast
// episodes; that content was generated once, costs money to rebuild, and is meant to stay frozen.
// ─────────────────────────────────────────────────────────────────────────────
export const resetDemo = schedules.task({
  id: "reset-demo",
  cron: "0 3 * * *", // 03:00 UTC, when nobody is likely to be mid-visit
  maxDuration: 120,
  run: async () => {
    const db = supabase();

    // Found by the flag rather than a hardcoded id, so recreating the demo account never silently
    // leaves this job resetting a user that no longer exists.
    const { data: demo, error } = await db
      .from("preferences")
      .select("user_id")
      .eq("is_demo", true)
      .maybeSingle();
    if (error) throw error;
    if (!demo) {
      logger.warn("no account is flagged is_demo — nothing to reset");
      return { reset: false };
    }
    const userId = demo.user_id as string;

    // tips_seen is cleared too: coach marks are currently hidden for the demo, but if that ever
    // changes the demo should still start clean rather than pre-dismissed by an earlier visitor.
    const { error: prefsErr } = await db
      .from("preferences")
      .update({ ...DEMO_FINAL_PREFS, tips_seen: [] })
      .eq("user_id", userId);
    if (prefsErr) throw prefsErr;

    // Read marks: the seeded arrangement has the OLDEST brief read and the rest unread. That shape
    // is what makes the unread styling in History legible, so restore it rather than wiping it —
    // a visitor opening briefs marks them read and flattens the distinction.
    const { data: reports, error: reportsErr } = await db
      .from("reports")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "complete")
      .order("date", { ascending: true });
    if (reportsErr) throw reportsErr;

    const { error: clearErr } = await db.from("report_reads").delete().eq("user_id", userId);
    if (clearErr) throw clearErr;

    const oldest = reports?.[0];
    if (oldest) {
      const { error: readErr } = await db
        .from("report_reads")
        .insert({ user_id: userId, report_id: oldest.id as string });
      if (readErr) throw readErr;
    }

    logger.info("demo reset", { userId, briefs: reports?.length ?? 0 });
    return { reset: true, userId, briefs: reports?.length ?? 0 };
  },
});
