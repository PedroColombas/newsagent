import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { fetchNews } from "./fetch-news";

// Cron orchestrator. Trigger.dev cron is UTC (Trigger §8) and preferences.delivery_hour
// is stored in UTC — so we match directly, no timezone conversion. Runs at the top of
// every hour; each tick fans out to the users whose delivery_hour == this hour.
export const dailyReport = schedules.task({
  id: "daily-report",
  // CRON DISABLED (cost control, 2026-09). Automatic briefs are off — generation is on-demand only
  // from the app. The task stays deployed and manually triggerable; re-enable by uncommenting.
  // cron: "0 * * * *", // every hour on the hour, UTC
  maxDuration: 120,
  run: async (payload) => {
    // Belt-and-braces with the commented-out cron above: even if a schedule survives in the Trigger
    // dashboard from an earlier deploy, this does nothing and spends nothing. Set
    // ENABLE_DAILY_CRON=true in the Trigger env (and restore the cron) to turn automatic briefs on.
    if (process.env.ENABLE_DAILY_CRON !== "true") {
      logger.info("automatic briefs are disabled — skipping tick");
      return { skipped: "cron-disabled" };
    }

    const scheduledAt = new Date(payload.timestamp);
    const hour = scheduledAt.getUTCHours();
    const date = scheduledAt.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const dow = scheduledAt.getUTCDay(); // 0 = Sun … 6 = Sat

    // Weekday-only cadence: no automatic briefs on Sat/Sun — Monday's brief sweeps up the weekend.
    // (On-demand generation from the app still works any day.)
    if (dow === 0 || dow === 6) {
      logger.info("weekend — skipping automatic briefs", { hour, date, dow });
      return { hour, date, triggered: 0, weekend: true };
    }
    // Trim the shared topic cache once a day — only the current date's rows are ever read, so older
    // days are dead weight. Runs at the 00:00 UTC weekday tick; keeps ~2 days for late retries.
    if (hour === 0) {
      const cutoff = new Date(`${date}T00:00:00Z`);
      cutoff.setUTCDate(cutoff.getUTCDate() - 2);
      const { error: cleanupErr } = await supabase()
        .from("topic_news_cache")
        .delete()
        .lt("date", cutoff.toISOString().slice(0, 10));
      if (cleanupErr) logger.warn("topic cache cleanup failed", { error: cleanupErr.message });
    }

    const { data, error } = await supabase()
      .from("preferences")
      .select("user_id")
      .eq("delivery_hour", hour)
      .eq("is_demo", false); // the public demo account is never included in automatic generation
    if (error) throw error;

    const users = data ?? [];
    logger.info("daily-report tick", { hour, date, matchedUsers: users.length });
    if (users.length === 0) return { hour, date, triggered: 0 };

    // Fan out, fire-and-forget. Each user's chain runs and retries independently, so one
    // user's failure never blocks another. batchTrigger handles up to 1,000 items. Monday's
    // weekend sweep is derived from the date inside fetch-news, so no per-run flag is needed.
    await fetchNews.batchTrigger(
      users.map((u) => ({ payload: { userId: u.user_id as string, date } })),
    );

    return { hour, date, triggered: users.length };
  },
});
