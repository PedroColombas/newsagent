import { useCallback, useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

export interface Tip {
  key: string; // stable id, stored in tips_seen so it shows only once
  target: string; // querySelector for the element the bubble points at
  title: string;
  body: string;
  enabled?: boolean; // default true; false = not applicable right now → deferred to a later visit
  placement?: "above" | "below"; // preferred side; falls back if that side has no room
}

const BUBBLE_MAX = 340;
const MARGIN = 12; // min gap from the viewport edges
const GAP = 12; // gap between the target and the bubble
const MIN_ROOM = 130; // space (px) needed to honour a placement preference before falling back

// Contextual coach-marks: a speech bubble that points at a real on-screen element, shown one tip at
// a time. It's an ADDITION to the live page, not a modal — the layer is click-through so the user can
// keep scrolling and tapping; the bubble simply travels with its target (and hides when the target
// scrolls out of view). Tips are page-local and can be conditional — a tip whose target isn't present
// (or whose `enabled` is false) is skipped for now and gets its turn on a later visit. Each dismissal
// is reported via onSeen so it never shows again. Portaled to <body> to escape page-transition transforms.
export function Coachmarks({
  tips,
  seen,
  onSeen,
}: {
  tips: Tip[];
  seen: string[];
  onSeen: (keys: string[]) => void;
}) {
  // Freeze the batch at mount: the tips eligible right now (applicable + not yet seen). Pages remount
  // on each tab visit, so a tip that only becomes eligible later still gets shown then.
  const [batch] = useState<Tip[]>(() =>
    tips.filter((t) => t.enabled !== false && !seen.includes(t.key)),
  );
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);

  const tip = idx < batch.length ? batch[idx] : null;

  // Measure the target, then keep the bubble pinned to it as the user scrolls or resizes. Retry
  // briefly if the target renders a beat after mount; if it never appears, skip it (stays unseen).
  useLayoutEffect(() => {
    if (!tip) return;
    let raf = 0;
    let tries = 0;
    let found = false;
    const remeasure = () => {
      const el = document.querySelector(tip.target);
      if (!el) return;
      setRect(el.getBoundingClientRect());
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    const locate = () => {
      const el = document.querySelector(tip.target);
      if (el) {
        found = true;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        remeasure();
        return;
      }
      if (tries++ < 12) raf = requestAnimationFrame(locate);
      else setIdx((n) => n + 1); // give up on a missing target
    };
    const onMove = () => {
      if (found) remeasure();
    };
    locate();
    window.addEventListener("scroll", onMove, true); // capture → catches inner scroll containers too
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [tip]);

  const advance = useCallback(() => {
    if (tip) onSeen([tip.key]);
    setRect(null);
    setIdx((n) => n + 1);
  }, [tip, onSeen]);

  const skip = useCallback(() => {
    const remaining = batch.slice(idx).map((t) => t.key);
    if (remaining.length) onSeen(remaining);
    setIdx(batch.length);
  }, [batch, idx, onSeen]);

  if (!tip || !rect) return null;
  // The bubble travels with its target — hide it while the target is scrolled out of view.
  if (rect.bottom < 8 || rect.top > vh - 8) return null;

  // Anchor to the visible slice of the target and put the bubble on the preferred side if it has
  // room, else on whichever side has more — so it never lands off-screen or covers the feature.
  const anchorTop = Math.max(rect.top, MARGIN);
  const anchorBottom = Math.min(rect.bottom, vh - MARGIN);
  const roomBelow = vh - anchorBottom;
  const roomAbove = anchorTop;
  const auto = roomBelow >= roomAbove; // default: whichever side has more room
  let below = auto;
  if (tip.placement === "below") below = roomBelow >= MIN_ROOM || auto;
  else if (tip.placement === "above") below = roomAbove >= MIN_ROOM ? false : auto;

  const bubbleW = Math.min(vw - MARGIN * 2, BUBBLE_MAX);
  const targetCx = rect.left + rect.width / 2;
  const centerX = Math.min(Math.max(targetCx, MARGIN + bubbleW / 2), vw - MARGIN - bubbleW / 2);
  // Tail sits under the target's centre, clamped to stay within the bubble's rounded corners.
  const tailLeft = Math.min(Math.max(targetCx - (centerX - bubbleW / 2), 18), bubbleW - 18);

  const bubbleStyle: CSSProperties = { width: bubbleW, left: centerX, transform: "translateX(-50%)" };
  if (below) bubbleStyle.top = anchorBottom + GAP;
  else bubbleStyle.bottom = vh - anchorTop + GAP;

  const last = idx === batch.length - 1;

  return createPortal(
    // Click-through layer — the page underneath stays scrollable/tappable; only the bubble catches taps.
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div
        className="pointer-events-auto absolute rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_16px_40px_-12px_rgba(20,14,8,0.5)]"
        style={bubbleStyle}
      >
        {/* tail — a rotated square straddling the bubble edge, pointing at the target */}
        <div
          className={`absolute h-3 w-3 rotate-45 border-[var(--line)] bg-[var(--surface)] ${
            below ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-b border-r"
          }`}
          style={{ left: tailLeft, marginLeft: -6 }}
        />
        <h3 className="text-[16px] font-bold tracking-tight">{tip.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--muted)]">{tip.body}</p>

        <div className="mt-3.5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {batch.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 w-1.5 rounded-full ${n === idx ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {!last && (
              <button onClick={skip} className="text-[13px] font-medium text-[var(--faint)]">
                Skip
              </button>
            )}
            <button
              onClick={advance}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-[13px] font-semibold text-[var(--on-accent)] active:opacity-80"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
