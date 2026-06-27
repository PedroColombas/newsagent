import type { MouseEvent } from "react";
import { usePlayer } from "../player/PlayerProvider";
import { formatTime } from "../lib/format-time";
import { PlayIcon, PauseIcon } from "./ui/icons";

const RATES = [1, 1.25, 1.5, 2, 0.75];

// Full-screen player; renders only when expanded, overlaying everything.
export function FullPlayer() {
  const {
    episode,
    expanded,
    isPlaying,
    currentTime,
    duration,
    rate,
    toggle,
    seek,
    skip,
    setRate,
    collapse,
  } = usePlayer();

  if (!expanded || !episode) return null;

  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const remaining = Math.max(0, duration - currentTime);
  const d = new Date(`${episode.date}T00:00:00`);
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const dayMonth = d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  const minutes = Math.max(1, Math.round((duration || episode.durationSeconds || 0) / 60));

  function onScrub(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    seek(Math.max(0, Math.min(1, frac)) * duration);
  }

  function cycleRate() {
    setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length]);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--paper)] text-[var(--ink)]">
      <div className="mx-auto flex h-full max-w-md flex-col px-6 pb-10 pt-5">
        {/* Top bar */}
        <div className="flex flex-none items-center justify-between">
          <button onClick={collapse} aria-label="Collapse player" className="flex h-9 w-9 items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9.5 L12 15.5 L18 9.5" />
            </svg>
          </button>
          <span className="text-[11.5px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
            Now Playing
          </span>
          <span className="h-9 w-9" />
        </div>

        {/* Typographic cover */}
        <div className="mt-3 flex aspect-square w-full flex-col justify-between rounded-3xl bg-[var(--ink)] p-6 text-[var(--paper)] shadow-[0_16px_34px_-12px_rgba(45,32,20,0.5)]">
          <span className="text-[11.5px] font-semibold uppercase tracking-[2px] text-[var(--accent)]">
            Daily Report
          </span>
          <div className="text-[33px] font-bold leading-[1.03] tracking-tight">
            {weekday}
            <br />
            {dayMonth}
          </div>
          <div className="flex h-7 items-end gap-[3px]">
            {[40, 70, 100, 55, 85, 35, 60, 45, 75, 50].map((h, i) => (
              <span
                key={i}
                className="w-[3px] rounded-sm"
                style={{ height: `${h}%`, background: i === 2 ? "var(--accent)" : "rgba(250,248,244,0.45)" }}
              />
            ))}
          </div>
        </div>

        {/* Title + meta */}
        <div className="mt-5 flex-none">
          <div className="text-[19px] font-bold tracking-tight">Your Daily Report</div>
          <div className="text-[13px] text-[var(--muted)]">AI narration · {minutes} min</div>
        </div>

        {/* Scrubber */}
        <div className="mt-5 flex-none">
          <div onClick={onScrub} className="relative h-1.5 cursor-pointer rounded-full bg-[var(--line)]">
            <div className="absolute left-0 top-0 h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
            <div
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[var(--accent)] shadow"
              style={{ left: `calc(${pct}% - 7px)` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[12px] text-[var(--faint)]">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remaining)}</span>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-6 flex flex-none items-center justify-center gap-9">
          <SkipButton dir="back" onClick={() => skip(-15)} />
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_6px_16px_rgba(192,81,43,0.4)]"
          >
            {isPlaying ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </button>
          <SkipButton dir="fwd" onClick={() => skip(15)} />
        </div>

        {/* Speed */}
        <div className="mt-6 flex flex-none items-center justify-center">
          <button
            onClick={cycleRate}
            className="rounded-full border border-[var(--line)] px-4 py-1.5 text-[13px] font-semibold"
          >
            {rate === 1 ? "1.0×" : `${rate}×`}
          </button>
        </div>

        <div className="flex-1" />
      </div>
    </div>
  );
}

function SkipButton({ dir, onClick }: { dir: "back" | "fwd"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "back" ? "Back 15 seconds" : "Forward 15 seconds"}
      className="relative flex h-12 w-12 items-center justify-center text-[var(--ink)]"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {dir === "back" ? (
          <>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </>
        ) : (
          <>
            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </>
        )}
      </svg>
      <span className="absolute text-[9px] font-bold">15</span>
    </button>
  );
}
