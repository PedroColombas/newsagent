import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useLatestReport } from "../hooks/useLatestReport";
import { usePreferences } from "../hooks/usePreferences";
import { requestTodayBrief } from "../lib/api";
import { formatDeliveryHour } from "../lib/delivery-time";
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
import { RecapCard } from "../components/RecapCard";

// If an on-demand generation hasn't landed in this long, stop waiting and show an error + retry
// (covers a misrouted or stalled run — never a silent, endless spinner).
const GEN_TIMEOUT_MS = 5 * 60 * 1000;

export function Today() {
  const { user } = useAuth();
  const { report, episode, loading, refetch } = useLatestReport();
  const { prefs } = usePreferences();
  const { play } = usePlayer();
  const navigate = useNavigate();

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const waiting =
    generating || report?.status === "pending" || report?.status === "generating";

  // Drop the optimistic flag once the brief actually completes.
  useEffect(() => {
    if (report?.status === "complete") setGenerating(false);
  }, [report?.status]);

  // Poll while a brief is compiling (the gap before the row exists, then until it's done).
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(() => void refetch(), 4000);
    return () => clearInterval(t);
  }, [waiting, refetch]);

  // Safety net: if a generation never lands, stop waiting and surface an error.
  useEffect(() => {
    if (!waiting || startedAt == null) return;
    const remaining = GEN_TIMEOUT_MS - (Date.now() - startedAt);
    if (remaining <= 0) {
      setTimedOut(true);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), remaining);
    return () => clearTimeout(t);
  }, [waiting, startedAt]);

  async function generateNow() {
    setGenError(false);
    setTimedOut(false);
    setStartedAt(Date.now());
    setGenerating(true);
    try {
      await requestTodayBrief();
    } catch {
      setGenerating(false);
      setGenError(true);
    }
  }

  if (loading) {
    return <Centered>Loading your brief…</Centered>;
  }

  // A trigger error, a failed run, or a stalled generation → error with retry (never a silent hang).
  if (genError || (timedOut && waiting) || (report?.status === "failed" && !generating)) {
    const message = report?.status === "failed" ? report.error_message : undefined;
    return <GenerateError onRetry={generateNow} message={message} />;
  }

  if (waiting) {
    return <CompilingBrief />;
  }

  if (!report) {
    return <EmptyState deliveryHour={prefs?.delivery_hour} onGenerate={generateNow} />;
  }

  if (report.status !== "complete" || !report.content) {
    return <CompilingBrief />;
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

      {report.content.recap && (
        <div className="mt-5">
          <RecapCard recap={report.content.recap} />
        </div>
      )}

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
              {s.isPrimer && (
                <span className="rounded-full bg-[var(--accent)]/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                  Catch-up
                </span>
              )}
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

function EmptyState({
  deliveryHour,
  onGenerate,
}: {
  deliveryHour: number | undefined;
  onGenerate: () => void;
}) {
  return (
    <Centered>
      <h1 className="text-[22px] font-bold tracking-tight">You're all set</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--muted)]">
        Your first brief will land{" "}
        {deliveryHour != null ? (
          <>
            tomorrow at{" "}
            <span className="font-semibold text-[var(--ink)]">{formatDeliveryHour(deliveryHour)}</span>
          </>
        ) : (
          "tomorrow morning"
        )}
        . Want to see it now?
      </p>
      <button
        onClick={onGenerate}
        className="mt-5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14.5px] font-semibold text-[var(--on-accent)] shadow-[0_4px_12px_rgba(192,81,43,0.32)] active:opacity-80"
      >
        Generate today's brief
      </button>
      <p className="mt-3 text-[12px] text-[var(--faint)]">Takes a couple of minutes.</p>
    </Centered>
  );
}

function LoadingBars() {
  return (
    <div className="flex h-8 items-end gap-[3.5px]" role="status" aria-label="Compiling">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="h-full w-[3.5px] origin-bottom rounded-full bg-[var(--accent)]"
          animate={{ scaleY: [0.35, 1, 0.35] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
        />
      ))}
    </div>
  );
}

function CompilingBrief() {
  return (
    <Centered>
      <LoadingBars />
      <h1 className="mt-5 text-[22px] font-bold tracking-tight">Compiling your brief…</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--muted)]">
        Gathering today's news and writing it up — usually ready in a minute or two, and it'll
        appear here on its own.
      </p>
    </Centered>
  );
}

function GenerateError({ onRetry, message }: { onRetry: () => void; message?: string | null }) {
  return (
    <Centered>
      <h1 className="text-[22px] font-bold tracking-tight">That didn't come through</h1>
      <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-[var(--muted)]">
        {message || "Your brief didn't finish generating — it may have stalled. Give it another go."}
      </p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14.5px] font-semibold text-[var(--on-accent)] shadow-[0_4px_12px_rgba(192,81,43,0.32)] active:opacity-80"
      >
        Try again
      </button>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">{children}</div>
  );
}
