import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

// First-run coach marks, shown once the user's FIRST brief has landed (so the real elements —
// the podcast card, the nav — are on screen to point at). A dimmed overlay with a spotlight
// "hole" over a real element (a big box-shadow) + a card. Portaled to <body> so the fixed overlay
// isn't trapped by the page-transition transforms on the routed content.
interface Step {
  target: string | null; // querySelector for the element to spotlight, or null for a centered card
  title: string;
  body: string;
}

// Order: a topic section on Today, then the podcast, then left-to-right along the nav (Preferences,
// then History).
const STEPS: Step[] = [
  {
    target: '[data-tour="topic"]',
    title: "This is your brief",
    body: "Each section is a topic you chose — written fresh from today's news, shaped by your preferences.",
  },
  {
    target: '[data-tour="podcast"]',
    title: "Listen, don't just read",
    body: "Every brief comes as a conversational podcast. Tap here to play — expand it for chapters and speed.",
  },
  {
    target: '[data-tour="prefs"]',
    title: "Shape what you read",
    body: "Genres, your own interests, the writing style, the section order, and when it lands — all in Preferences.",
  },
  {
    target: '[data-tour="history"]',
    title: "Never fall behind",
    body: "Past briefs live in History. Away a few days? Your next one opens with a “While you were away” catch-up.",
  },
];

const PAD = 8; // spotlight padding around the target

export function Walkthrough({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = STEPS[i];

  // Measure the current target after layout, and on resize.
  useLayoutEffect(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(step.target as string);
      if (el) el.scrollIntoView({ block: "nearest" });
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step.target]);

  const last = i === STEPS.length - 1;
  const next = () => (last ? onFinish() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  const spot = rect
    ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }
    : null;

  // Card: centered when there's no target; otherwise horizontally centred, above a bottom-half
  // target or below a top-half one.
  const vStyle: CSSProperties = {};
  if (rect) {
    if (rect.top > window.innerHeight * 0.55) vStyle.bottom = window.innerHeight - rect.top + 16;
    else vStyle.top = rect.bottom + 16;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-2xl transition-all duration-300"
          style={{
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
            // A bold accent ring on the lit element, then the dim beyond it.
            boxShadow: "0 0 0 3px var(--accent), 0 0 0 9999px rgba(18,14,9,0.76)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(18,14,9,0.76)]" />
      )}

      <div
        className={`absolute left-1/2 w-[min(88vw,360px)] -translate-x-1/2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[0_16px_40px_-12px_rgba(20,14,8,0.55)] ${
          rect ? "" : "top-1/2 -translate-y-1/2"
        }`}
        style={vStyle}
      >
        <h3 className="text-[18px] font-bold tracking-tight">{step.title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--muted)]">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, n) => (
              <span
                key={n}
                className={`h-1.5 w-1.5 rounded-full ${n === i ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {!last && (
              <button onClick={onFinish} className="text-[13.5px] font-medium text-[var(--faint)]">
                Skip
              </button>
            )}
            {i > 0 && (
              <button onClick={back} className="text-[13.5px] font-medium text-[var(--muted)]">
                Back
              </button>
            )}
            <button
              onClick={next}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-[13.5px] font-semibold text-[var(--on-accent)] active:opacity-80"
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
