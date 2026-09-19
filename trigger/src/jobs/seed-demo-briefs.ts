import { task, logger, wait } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { fetchNews } from "./fetch-news";
import { generatePodcast } from "./generate-podcast";

// ─────────────────────────────────────────────────────────────────────────────
// ONE-OFF SEEDER for the public demo account (BACKLOG Phase 2). Runs the REAL pipeline, so it
// costs real money (~$1–1.50 all in) — deliberately, once, to produce authentic content that is
// then frozen. Never scheduled; run it by hand from the Trigger dashboard:
//   { "userId": "<demo uuid>", "reset": true }     ← or { "email": "demo@...", "reset": true }
//
// It arranges the data so the demo shows off three things that otherwise would not appear:
//   • Normal daily news — by pre-marking topics as already briefed (PRIMED_KEYS), so they do not
//     all render as first-time catch-ups.
//   • One catch-up section — by leaving exactly one topic out of PRIMED_KEYS.
//   • A "while you were away" recap — by marking the first brief read and leaving the middle two
//     unread, so the last brief opens with a recap of the gap.
// Order therefore matters; the briefs are generated oldest first.
//
// DATES: a brief's date is only a label — Perplexity always searches relative to NOW, so every
// brief seeded in one sitting contains current news whatever date it carries. Dates are therefore
// computed as the most recent weekdays ending today, which puts zero skew on the newest brief (the
// one a visitor actually lands on and reads) and a few days on the older ones sitting in History.
// Pass { dates: [...] } to override. The zero-skew alternative is to run this once a day for four
// days, which is authentic but costs four days of calendar time.
// ─────────────────────────────────────────────────────────────────────────────

// Shared across every seeded brief. One mode/voice keeps the demo coherent.
const COMMON_PREFS = {
  report_mode: "standard",
  voice: "analytical",
  context_depth: "quick",
  exclusions: "",
  podcast_enabled: true,
  topic_order: [] as string[],
};

// Topics treated as "already followed" so their sections read as today's news rather than a primer.
// `sub:Health:Biotech` is deliberately ABSENT — it is the single catch-up section in the last brief.
const PRIMED_KEYS = [
  "sub:Technology:AI",
  "sub:Technology:Semiconductors",
  "sub:Technology:Cybersecurity",
  "interest:what China is doing in chip development",
  "sub:Politics:Geopolitics",
  "sub:Politics:Defense",
  "sub:World:Conflicts",
  "sub:World:Diplomacy",
  "sub:Finance:Central Banks",
  "sub:Science:Space",
  "interest:the economics of the energy transition",
  "interest:breakthroughs in fusion research",
];

// Four briefs, oldest first. Each is capped at 4 sections (MAX_SECTIONS), so each set has exactly 4.
const BRIEFS = [
  {
    label: "Tech heavy",
    markRead: true, // anchors the recap gap: the last brief read before the missed days
    prefs: {
      genres: ["Technology"],
      subtopics: { Technology: ["AI", "Semiconductors", "Cybersecurity"] },
      custom_interests: ["what China is doing in chip development"],
    },
  },
  {
    label: "Geopolitics",
    prefs: {
      genres: ["Politics", "World"],
      subtopics: { Politics: ["Geopolitics", "Defense"], World: ["Conflicts", "Diplomacy"] },
      custom_interests: [] as string[],
    },
  },
  {
    label: "Mixed, custom interests to the fore",
    prefs: {
      genres: ["Finance", "Science"],
      subtopics: { Finance: ["Central Banks"], Science: ["Space"] },
      custom_interests: [
        "the economics of the energy transition",
        "breakthroughs in fusion research",
      ],
    },
  },
  {
    label: "Landing brief: news + one catch-up + recap",
    podcast: true, // the episode a visitor can play immediately
    prefs: {
      genres: ["Technology", "World", "Health"],
      subtopics: { Technology: ["AI"], World: ["Conflicts"], Health: ["Biotech"] },
      custom_interests: ["what China is doing in chip development"],
    },
  },
] as const;

export const seedDemoBriefs = task({
  id: "seed-demo-briefs",
  // Four full pipeline runs back to back. Waits over 5s are checkpointed, so this is mostly idle.
  maxDuration: 3600,
  run: async (payload: { userId?: string; email?: string; reset?: boolean; dates?: string[] }) => {
    const db = supabase();
    const userId = await resolveUserId(payload);
    const dates = payload.dates ?? lastWeekdays(BRIEFS.length);
    if (dates.length !== BRIEFS.length) {
      throw new Error(`Need ${BRIEFS.length} dates, got ${dates.length}.`);
    }
    logger.info("seeding demo briefs", { userId, dates });

    // Re-runnable: wipe this user's generated content so primers and the recap land the same way
    // every time. Scoped strictly to the demo user. Deleting reports cascades to podcast_episodes
    // and report_reads. Opt-in, because it throws away content that cost money to make.
    if (payload.reset) {
      await db.from("reports").delete().eq("user_id", userId);
      await db.from("user_topic_history").delete().eq("user_id", userId);
      logger.info("reset demo state", { userId });
    }

    await db
      .from("user_topic_history")
      .upsert(
        PRIMED_KEYS.map((topic_key) => ({ user_id: userId, topic_key })),
        { onConflict: "user_id,topic_key", ignoreDuplicates: true },
      );

    const made: { date: string; label: string; reportId: string }[] = [];

    for (const [i, brief] of BRIEFS.entries()) {
      const date = dates[i];
      const { error: prefsErr } = await db
        .from("preferences")
        .update({ ...COMMON_PREFS, ...brief.prefs })
        .eq("user_id", userId);
      if (prefsErr) throw prefsErr;

      logger.info("seeding brief", { date, label: brief.label });
      await fetchNews.trigger({ userId, date, force: true });

      // fetch-news hands off to generate-report fire-and-forget, so waiting on the task itself
      // would only wait for the Perplexity stage. Poll the row instead.
      const reportId = await waitForReport(userId, date);
      made.push({ date, label: brief.label, reportId });

      if ("markRead" in brief && brief.markRead) {
        const { error } = await db
          .from("report_reads")
          .upsert({ user_id: userId, report_id: reportId }, { onConflict: "user_id,report_id" });
        if (error) throw error;
        logger.info("marked read", { date, reportId });
      }

      if ("podcast" in brief && brief.podcast) {
        await generatePodcast.trigger({ reportId, force: true });
        logger.info("podcast requested", { date, reportId });
      }
    }

    // Preferences are left in the LAST brief's state — that is what a visitor sees on the
    // Preferences screen, and it exercises all three levels (genres, subtopics, a custom interest).
    return { userId, briefs: made };
  },
});

// Accepts either the uuid or the account's email. The error echoes what actually arrived, because
// an empty payload here looks identical to a missing field.
async function resolveUserId(payload: { userId?: string; email?: string }): Promise<string> {
  if (payload.userId) return payload.userId;
  if (payload.email) {
    const { data, error } = await supabase().auth.admin.listUsers();
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === payload.email!.toLowerCase());
    if (!match) throw new Error(`No user found with email ${payload.email}`);
    return match.id;
  }
  throw new Error(
    "Provide { userId } (the demo account's uuid) or { email }. " +
      `Received payload: ${JSON.stringify(payload ?? null)}`,
  );
}

// The most recent `count` weekdays, oldest first, including today when today is a weekday — so the
// newest brief carries today's date and matches the news actually inside it.
function lastWeekdays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  const cursor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  while (out.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse();
}

// Poll until the brief is written, so the next one starts from a settled state (the recap depends
// on earlier briefs already existing and being complete).
async function waitForReport(userId: string, date: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { data } = await supabase()
      .from("reports")
      .select("id, status, error_message")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle();

    if (data?.status === "complete") return data.id as string;
    if (data?.status === "failed") {
      throw new Error(`brief ${date} failed: ${data.error_message ?? "unknown error"}`);
    }
    await wait.for({ seconds: 10 });
  }
  throw new Error(`brief ${date} did not complete within the polling window`);
}
