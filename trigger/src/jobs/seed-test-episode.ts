import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { generatePodcast } from "./generate-podcast";
import { FIXTURE_REPORT, FIXTURE_SCRIPT } from "../fixtures/test-episode";

// ─────────────────────────────────────────────────────────────────────────────
// DEV / TEST ONLY. Seeds a complete fixture report and builds its podcast WITHOUT any Perplexity
// or Anthropic report-synthesis calls — so you can iterate on report rendering and podcast audio
// (intro sting, voices, TTS) without burning tokens. Only OpenAI TTS runs (that's what you're
// testing). Trigger it from the Trigger.dev dashboard → seed-test-episode → Test, with:
//   { "email": "you@example.com" }            ← seeds today, canned script (TTS only)
//   { "email": "...", "freshScript": true }   ← regenerates the script for real (tests the script
//                                                prompt) but STILL skips Perplexity + synthesis
//   { "email": "...", "date": "2026-07-05" }  ← seed a specific date instead of today
// NOTE: seeding a date overwrites that day's real report for the user. It never runs on its own.
// ─────────────────────────────────────────────────────────────────────────────
export const seedTestEpisode = task({
  id: "seed-test-episode",
  run: async (payload: { userId?: string; email?: string; date?: string; freshScript?: boolean }) => {
    const db = supabase();
    const userId = await resolveUserId(payload);
    const date = payload.date ?? new Date().toISOString().slice(0, 10);

    const { data: row, error } = await db
      .from("reports")
      .upsert(
        {
          user_id: userId,
          date,
          status: "complete",
          content: FIXTURE_REPORT.content,
          markdown: FIXTURE_REPORT.markdown,
          error_message: null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      )
      .select("id")
      .single();
    if (error) throw error;
    const reportId = row!.id as string;
    logger.info("seeded fixture report", { userId, date, reportId, freshScript: !!payload.freshScript });

    // Build the podcast. Supplying `turns` skips the Anthropic script call (canned script → TTS
    // only); freshScript omits them so writeScript runs for real (still no Perplexity/synthesis).
    await generatePodcast.trigger({
      reportId,
      force: true,
      turns: payload.freshScript ? undefined : FIXTURE_SCRIPT,
    });

    return { userId, date, reportId, freshScript: !!payload.freshScript };
  },
});

async function resolveUserId(payload: { userId?: string; email?: string }): Promise<string> {
  if (payload.userId) return payload.userId;
  if (!payload.email) throw new Error("Provide { userId } or { email }.");
  const { data, error } = await supabase().auth.admin.listUsers();
  if (error) throw error;
  const match = data.users.find((u) => u.email?.toLowerCase() === payload.email!.toLowerCase());
  if (!match) throw new Error(`No user found with email ${payload.email}`);
  return match.id;
}
