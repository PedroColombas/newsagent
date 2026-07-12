import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useLatestReport } from "../hooks/useLatestReport";
import { usePreferences } from "../hooks/usePreferences";
import { requestTodayBrief } from "../lib/api";
import { markPending, readPending, clearPending } from "../lib/pending-generation";
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
import { Walkthrough } from "../components/Walkthrough";

// If an on-demand generation hasn't landed in this long of FOREGROUND time (background time is
// excluded — see the visibility handler), stop waiting and show an error + retry. Generous, since
// the first all-primer run is the slowest; real failures surface faster via a failed report.
const GEN_TIMEOUT_MS = 8 * 60 * 1000;

export function Today() {
  const { user } = useAuth();
  const { report, episode, loading, refetch } = useLatestReport();
  const { prefs, update } = usePreferences();
  const { play } = usePlayer();
  const navigate = useNavigate();

  // Initialise from the reload bridge: if an on-demand generation was just kicked off (record still
  // fresh), resume the compiling state even though React state was lost on reload. Read once.
  const bridge = useMemo(() => readPending(), []);
  const [generating, setGenerating] = useState<boolean>(bridge != null);
  const [genError, setGenError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(bridge?.at ?? null);
  // created_at of the report we superseded when we kicked off — lets us tell this run's failure
  // apart from a stale one (server-vs-server, immune to clock skew and the visibility bump).
  const [baseline, setBaseline] = useState<string | null>(bridge?.baseline ?? null);

  const waiting =
    generating || report?.status === "pending" || report?.status === "generating";

  // Timeout is measured from the local click; after a reload where only the reports row survives,
  // fall back to when that row started generating so the timeout still applies.
  const reportStart =
    (report?.status === "generating" || report?.status === "pending") && report?.created_at
      ? Date.parse(report.created_at)
      : null;
  const effectiveStart = startedAt ?? reportStart;

  // A failed report is THIS run's failure only once fetch-news (re)claimed its row — i.e. once its
  // created_at differs from the row we superseded. When we're not mid-generation (startedAt null)
  // any failed row is the failure to show; while a retry is in flight a stale failed row (created_at
  // still == baseline) is ignored until the run claims it.
  const failedIsCurrent =
    report?.status === "failed" &&
    (startedAt == null || report.created_at !== baseline);

  // The podcast is generated after the report completes, so the audio lags the brief. Show a
  // loading state (and keep polling) while it's on its way.
  const podcastPending =
    !!prefs?.podcast_enabled &&
    report?.status === "complete" &&
    (!episode || episode.status === "pending" || episode.status === "generating");

  // Drop the optimistic flag once the brief actually completes.
  useEffect(() => {
    if (report?.status === "complete") setGenerating(false);
  }, [report?.status]);

  // Once the reports row reflects THIS run it drives the compiling state, so retire the bridge flag
  // — but not on a stale 'failed' row, so the bridge survives a retry until the run claims it.
  useEffect(() => {
    if (report && report.status !== "failed") clearPending();
  }, [report]);

  // Stop treating a run as in-progress once its own failure surfaces (also stops polling).
  useEffect(() => {
    if (failedIsCurrent) setGenerating(false);
  }, [failedIsCurrent]);

  // Poll while a brief is compiling, or while its podcast is still being generated.
  useEffect(() => {
    if (!waiting && !podcastPending) return;
    const t = setInterval(() => void refetch(), 4000);
    return () => clearInterval(t);
  }, [waiting, podcastPending, refetch]);

  // Safety net: if a generation never lands, stop waiting and surface an error.
  useEffect(() => {
    if (!waiting || effectiveStart == null) return;
    const remaining = GEN_TIMEOUT_MS - (Date.now() - effectiveStart);
    if (remaining <= 0) {
      setTimedOut(true);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), remaining);
    return () => clearTimeout(t);
  }, [waiting, effectiveStart]);

  // Returning from background (tab hidden / phone locked) leaves timers frozen and state stale.
  // Re-poll and restart the timeout window so background time isn't counted as "stalled".
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && waiting) {
        setTimedOut(false);
        setStartedAt(Date.now());
        void refetch();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [waiting, refetch]);

  async function generateNow() {
    const baselineCreatedAt = report?.created_at ?? null;
    setGenError(false);
    setTimedOut(false);
    setStartedAt(Date.now());
    setBaseline(baselineCreatedAt);
    setGenerating(true);
    markPending(baselineCreatedAt);
    try {
      await requestTodayBrief();
    } catch {
      setGenerating(false);
      setGenError(true);
      clearPending();
    }
  }

  if (loading) {
    return <Centered>Loading your brief…</Centered>;
  }

  // A trigger error, this run's own failure, or a stalled generation → error with retry (no hang).
  if (genError || (timedOut && waiting) || failedIsCurrent) {
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

      {playable ? (
        <button
          onClick={() => void play(playable)}
          data-tour="podcast"
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
      ) : podcastPending ? (
        <div
          data-tour="podcast"
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--accent)]/12">
            <span className="flex h-4 items-end gap-[2px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-full w-[2px] origin-bottom rounded-full bg-[var(--accent)]"
                  style={{ animation: `equalize 0.9s ease-in-out ${i * 0.15}s infinite` }}
                />
              ))}
            </span>
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[15px] font-semibold">Preparing your podcast…</span>
            <span className="text-[12.5px] text-[var(--muted)]">The audio version is on its way</span>
          </span>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col">
        {sections.map((s, i) => (
          <button
            key={i}
            onClick={() => navigate(`/report/${report.date}#s${i}`)}
            data-tour={i === 0 ? "topic" : undefined}
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
            <p className="hyphens-auto text-justify text-[15px] leading-relaxed text-[var(--ink)]/85">
              {snippet(s.summary)}
            </p>
            {s.sources.length > 0 && (
              <span className="text-[12.5px] text-[var(--faint)]">
                {s.sources.length} {s.sources.length === 1 ? "source" : "sources"}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* First-run coach marks — fire once the first brief is on screen (real elements to point at). */}
      {prefs && !prefs.walkthrough_seen && (
        <Walkthrough onFinish={() => update({ walkthrough_seen: true })} />
      )}
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
        data-tour="generate"
        className="mt-5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-[14.5px] font-semibold text-[var(--on-accent)] shadow-[0_4px_12px_rgba(192,81,43,0.32)] active:opacity-80"
      >
        Generate today's brief
      </button>
      <p className="mt-3 text-[12px] text-[var(--faint)]">Takes about 3–4 minutes.</p>
    </Centered>
  );
}

function LoadingBars() {
  return (
    <div className="flex h-8 items-end gap-[3.5px]" role="status" aria-label="Compiling">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-full w-[3.5px] origin-bottom rounded-full bg-[var(--accent)]"
          style={{ animation: `equalize 0.9s ease-in-out ${i * 0.12}s infinite` }}
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
        Gathering today's news and writing it up — this usually takes about 3–4 minutes, and it'll
        appear here on its own. You can leave this screen; it'll be here when you're back.
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
