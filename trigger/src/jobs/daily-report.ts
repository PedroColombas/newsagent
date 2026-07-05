import { schedules, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { fetchNews } from "./fetch-news";

// Cron orchestrator. Trigger.dev cron is UTC (Trigger §8) and preferences.delivery_hour
// is stored in UTC — so we match directly, no timezone conversion. Runs at the top of
// every hour; each tick fans out to the users whose delivery_hour == this hour.
export const dailyReport = schedules.task({
  id: "daily-report",
  cron: "0 * * * *", // every hour on the hour, UTC
  maxDuration: 120,
  run: async (payload) => {
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
    const weekendCatchup = dow === 1; // Monday covers Fri-close → Mon-morning

    const { data, error } = await supabase()
      .from("preferences")
      .select("user_id")
      .eq("delivery_hour", hour);
    if (error) throw error;

    const users = data ?? [];
    logger.info("daily-report tick", { hour, date, matchedUsers: users.length, weekendCatchup });
    if (users.length === 0) return { hour, date, triggered: 0 };

    // Fan out, fire-and-forget. Each user's chain runs and retries independently, so one
    // user's failure never blocks another. batchTrigger handles up to 1,000 items.
    await fetchNews.batchTrigger(
      users.map((u) => ({ payload: { userId: u.user_id as string, date, weekendCatchup } })),
    );

    return { hour, date, triggered: users.length, weekendCatchup };
  },
});
