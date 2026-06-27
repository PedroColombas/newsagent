import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Report } from "@shared/types";
import { useAuth } from "../auth/AuthProvider";
import { useLatestReport } from "../hooks/useLatestReport";
import {
  formatReportDate,
  greeting,
  displayName,
  estimateReadMinutes,
  snippet,
} from "../lib/report-format";
import { usePlayer } from "../player/PlayerProvider";
import type { PlayerEpisode } from "../player/PlayerProvider";
import { PlayIcon } from "../components/ui/icons";

export function Today() {
  const { user } = useAuth();
  const { report, episode, loading } = useLatestReport();
  const { play } = usePlayer();
  const navigate = useNavigate();

  if (loading) {
    return <Centered>Loading your brief…</Centered>;
  }

  if (!report) {
    return (
      <Centered>
        <h1 className="text-[22px] font-bold tracking-tight">No briefs yet</h1>
        <p className="mt-2 max-w-[260px] text-[14px] leading-relaxed text-[var(--muted)]">
          Your first daily brief will appear here once it's been compiled. Set your topics in
          Preferences to shape it.
        </p>
      </Centered>
    );
  }

  if (report.status !== "complete" || !report.content) {
    return <StatusState report={report} />;
  }

  const sections = report.content.sections;
  const name = displayName(user);
  const minutes = estimateReadMinutes(sections.map((s) => s.summary));
  const playable: PlayerEpisode | null =
    episode?.status === "complete" && episode.audio_url
      ? {
          episodeId: episode.id,
          reportId: report.id,
          date: report.date,
          audioPath: episode.audio_url,
          durationSeconds: episode.duration_seconds,
          chapters: episode.chapters ?? [],
        }
      : null;

  return (
    <section className="px-6 pb-12 pt-6">
      <span className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        {formatReportDate(report.date)}
      </span>
      <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">
        {greeting()}
        {name ? `, ${name}` : ""}
      </h1>
      <span className="mt-2 block text-[13.5px] text-[var(--muted)]">
        Your brief · {sections.length} {sections.length === 1 ? "topic" : "topics"} · {minutes} min read
      </span>

      {playable && (
        <button
          onClick={() => void play(playable)}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_3px_9px_rgba(192,81,43,0.34)]">
            <PlayIcon />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Listen to today's brief</span>
            <span className="text-[12.5px] text-[var(--muted)]">
              {playable.durationSeconds
                ? `${Math.max(1, Math.round(playable.durationSeconds / 60))} min`
                : "Audio"}{" "}
              · AI narration
            </span>
          </span>
          <span className="flex h-[22px] items-end gap-[2.5px]">
            {[8, 15, 21, 12, 7].map((h, i) => (
              <span key={i} className="w-[2.5px] rounded bg-[var(--accent)]/50" style={{ height: h }} />
            ))}
          </span>
        </button>
      )}

      <div className="mt-5 flex flex-col">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => navigate(`/report/${report.date}#s${i}`)}
            className="flex flex-col gap-2 border-t border-[var(--line)] py-5 text-left transition-opacity active:opacity-60"
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
              <span className="text-[11.5px] font-semibold uppercase tracking-[1.4px] text-[var(--muted)]">
                {s.category ?? "For you"}
              </span>
            </div>
            <h2 className="text-[20px] font-semibold leading-snug tracking-tight">{s.topic}</h2>
            <p className="text-[15px] leading-relaxed text-[var(--ink)]/85">{snippet(s.summary)}</p>
            {s.sources.length > 0 && (
              <span className="text-[12.5px] text-[var(--faint)]">
                {s.sources.length} {s.sources.length === 1 ? "source" : "sources"}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusState({ report }: { report: Report }) {
  const compiling = report.status === "pending" || report.status === "generating";
  return (
    <Centered>
      <span className="text-[12px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        {formatReportDate(report.date)}
      </span>
      <h1 className="mt-2 text-[22px] font-bold tracking-tight">
        {compiling ? "Compiling your brief…" : "Today's brief didn't generate"}
      </h1>
      <p className="mt-2 max-w-[270px] text-[14px] leading-relaxed text-[var(--muted)]">
        {compiling
          ? "Your report is being put together — check back in a few minutes."
          : "Something went wrong generating this report. It'll retry on the next run."}
      </p>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">{children}</div>
  );
}
