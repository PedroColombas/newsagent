import { useLayoutEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";

// First-run coach marks. A dimmed overlay with a spotlight "hole" over a real element (via a big
// box-shadow) + a card that describes it. Only the nav tabs and the Generate button exist on a
// brand-new user's Today, so those are the spotlight targets; the copy covers the deeper features.
interface Step {
  target: string | null; // querySelector for the element to spotlight, or null for a centered card
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: "Welcome to Daily Brief",
    body: "A fresh, personalised news brief every morning — written for you. Here's the quick tour.",
  },
  {
    target: '[data-tour="prefs"]',
    title: "Shape what you read",
    body: "Genres, subtopics, your own interests, the writing style, and when it lands — all in Preferences. This is the heart of it.",
  },
  {
    target: '[data-tour="history"]',
    title: "Never fall behind",
    body: "Every past brief lives in History. Away a few days? Your next brief opens with a “While you were away” catch-up.",
  },
  {
    target: '[data-tour="generate"]',
    title: "Get your first brief",
    body: "It arrives tomorrow at your delivery time — or tap here to generate one now. Each brief comes as a conversational podcast too.",
  },
];

const PAD = 8; // spotlight padding around the target

export function Walkthrough({ onFinish }: { onFinish: () => void }) {
  const location = useLocation();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const onToday = location.pathname === "/";
  const step = STEPS[i];

  // Measure the current target after layout, and on resize.
  useLayoutEffect(() => {
    if (!onToday || !step.target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(step.target as string);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [onToday, step.target]);

  if (!onToday) return null;

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
    if (rect.top > window.innerHeight * 0.55) vStyle.bottom = window.innerHeight - rect.top + 14;
    else vStyle.top = rect.bottom + 14;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-[var(--accent)] transition-all duration-300"
          style={{
            left: spot.left,
            top: spot.top,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(18,14,9,0.74)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(18,14,9,0.74)]" />
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
    </div>
  );
}
