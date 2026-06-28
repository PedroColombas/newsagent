import { task, logger } from "@trigger.dev/sdk";
import { supabase } from "../lib/supabase";
import { withDiagnostics } from "../lib/diagnostics";
import { writeScript } from "../lib/podcast-script";
import { synthesizeDialogue, type DialogueTurn, type SpeechOptions } from "../lib/openai-tts";
import type { ReportContent } from "@shared/types";

const AUDIO_BUCKET = "podcast-audio";

// Two-voice interview cast. Voices + delivery are tunable constants (not user-facing yet).
// gpt-4o-mini-tts steers tone via `instructions`, so the personas do most of the work.
const SPEAKERS: Record<string, SpeechOptions> = {
  host: {
    voice: "nova",
    instructions:
      "A warm, curious podcast host interviewing an expert. Friendly and engaged, " +
      "natural pace, guiding the conversation for the listener.",
  },
  expert: {
    voice: "onyx",
    instructions:
      "A knowledgeable analyst being interviewed. Explains clearly and conversationally " +
      "at a measured pace, like a sharp guest on a quality news podcast.",
  },
};

export const generatePodcast = task({
  id: "generate-podcast",
  maxDuration: 300,
  run: async (payload: { reportId: string }) => {
    const { reportId } = payload;
    const db = supabase();

    const { data: report, error: reportError } = await db
      .from("reports")
      .select("id, user_id, markdown, content")
      .eq("id", reportId)
      .single();
    if (reportError) throw reportError;
    const userId = report!.user_id as string;
    const markdown = report!.markdown as string | null;
    const content = report!.content as ReportContent | null;
    const sections = content?.sections ?? [];
    const recap = content?.recap?.summary;

    // Idempotency anchor: podcast_episodes.unique(report_id).
    const { data: existing } = await db
      .from("podcast_episodes")
      .select("id, status")
      .eq("report_id", reportId)
      .maybeSingle();
    if (existing?.status === "complete") {
      logger.info("podcast already complete — skipping", { reportId });
      return { episodeId: existing.id as string, skipped: true };
    }

    const { data: row, error: upsertError } = await db
      .from("podcast_episodes")
      .upsert(
        { report_id: reportId, user_id: userId, status: "generating" },
        { onConflict: "report_id" },
      )
      .select("id")
      .single();
    if (upsertError) throw upsertError;
    const episodeId = row!.id as string;

    try {
      if (!markdown) throw new Error("report has no markdown to narrate");

      // 1. Write a two-person interview script (host asks, expert answers) as structured turns,
      //    each tagged with the report section it covers (for chapters).
      const turns = await withDiagnostics("podcast-script", () =>
        writeScript(
          markdown,
          sections.map((s) => ({ heading: s.topic, isPrimer: Boolean(s.isPrimer) })),
          recap,
        ),
      );
      if (turns.length === 0) throw new Error("podcast script came back empty");
      const script = renderTranscript(turns);
      const chapters = computeChapters(turns, sections);

      // 2. Synthesise each turn in its speaker's voice; concatenate the segments in order.
      const audio = await withDiagnostics("tts", () => synthesizeDialogue(turns, SPEAKERS));

      // 3. Upload to the private bucket, namespaced by user (service_role bypasses storage
      //    RLS). `audio_url` stores the PATH, not a URL — see schema + 0003_storage.sql.
      const path = `${userId}/${reportId}.mp3`;
      const { error: uploadError } = await db.storage
        .from(AUDIO_BUCKET)
        .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
      if (uploadError) throw uploadError;

      await db
        .from("podcast_episodes")
        .update({
          script,
          audio_url: path,
          duration_seconds: estimateDurationSeconds(turns),
          chapters,
          status: "complete",
        })
        .eq("id", episodeId);
      logger.info("podcast complete", { reportId, episodeId, path, turns: turns.length });

      return { episodeId, skipped: false };
    } catch (error: any) {
      await db.from("podcast_episodes").update({ status: "failed" }).eq("id", episodeId);
      throw error;
    }
  },
});

// Render the dialogue as a readable transcript for the `script` column / any transcript UI.
function renderTranscript(turns: DialogueTurn[]): string {
  return turns
    .map((t) => `${t.speaker === "host" ? "Host" : "Expert"}: ${t.text.trim()}`)
    .join("\n\n");
}

// Rough runtime estimate for the player UI (~150 words per minute across all turns).
function estimateDurationSeconds(turns: DialogueTurn[]): number {
  const words = turns
    .map((t) => t.text.trim().split(/\s+/).filter(Boolean).length)
    .reduce((sum, n) => sum + n, 0);
  return Math.max(1, Math.round((words / 150) * 60));
}

// One chapter per topic, positioned by cumulative word count as a fraction (0..1) of the
// whole script — the player scales these to the real audio duration. First appearance of
// each section wins; sorted by position.
function computeChapters(
  turns: DialogueTurn[],
  sections: { topic: string }[],
): { title: string; fraction: number }[] {
  if (sections.length === 0) return [];
  const counts = turns.map((t) => t.text.trim().split(/\s+/).filter(Boolean).length);
  const total = counts.reduce((sum, n) => sum + n, 0) || 1;

  const seen = new Set<number>();
  const chapters: { title: string; fraction: number }[] = [];
  let cumulative = 0;
  turns.forEach((turn, i) => {
    const idx = Math.max(0, Math.min(sections.length - 1, turn.section ?? 0));
    if (!seen.has(idx)) {
      seen.add(idx);
      chapters.push({ title: sections[idx].topic, fraction: cumulative / total });
    }
    cumulative += counts[i];
  });

  return chapters.sort((a, b) => a.fraction - b.fraction);
}
