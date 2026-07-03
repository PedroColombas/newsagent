import { useState } from "react";
import type { ReactNode } from "react";

// First-run trailer — sets the scene before the onboarding wizard: what the app is + the headline
// features, each with a stylised mini-preview of the relevant screen (built from the app's own
// tokens, so it stays on-brand without shipping/​maintaining screenshots).

function ReportMock() {
  return (
    <div className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-[0_10px_30px_-16px_rgba(20,14,8,0.5)]">
      <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--muted)]">
        Tuesday · 8 July
      </span>
      <div className="mt-2 text-[14.5px] font-bold leading-tight">
        SpaceX prices the largest IPO in history
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="h-1.5 w-full rounded bg-[var(--line)]" />
        <div className="h-1.5 w-[92%] rounded bg-[var(--line)]" />
        <div className="h-1.5 w-[76%] rounded bg-[var(--line)]" />
      </div>
      <span className="mt-3 inline-block rounded-full border border-[var(--line)] px-2 py-0.5 text-[9px] text-[var(--faint)]">
        reuters.com
      </span>
    </div>
  );
}

function CustomiseMock() {
  return (
    <div className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-left shadow-[0_10px_30px_-16px_rgba(20,14,8,0.5)]">
      <span className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--faint)]">Genres</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["Technology", "Finance", "Science", "Sport"].map((g, i) => (
          <span
            key={g}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
              i < 2
                ? "bg-[var(--accent)] text-[var(--on-accent)]"
                : "border border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {g}
          </span>
        ))}
      </div>
      <span className="mt-3 block text-[9px] font-semibold uppercase tracking-[1.5px] text-[var(--faint)]">
        Voice
      </span>
      <div className="mt-2 flex gap-1 rounded-full bg-[var(--line)]/60 p-0.5">
        {["Neutral", "Analytical", "Casual"].map((v, i) => (
          <span
            key={v}
            className={`flex-1 rounded-full py-1 text-center text-[9px] font-medium ${
              i === 1 ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
            }`}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecapMock() {
  return (
    <div className="w-full rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-4 text-left shadow-[0_10px_30px_-16px_rgba(20,14,8,0.5)]">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[1px] text-[var(--accent)]">
          While you were away
        </span>
        <span className="text-[9px] text-[var(--faint)]">· 3 days</span>
      </div>
      <div className="mt-2.5 space-y-1.5">
        <div className="h-1.5 w-full rounded bg-[var(--line)]" />
        <div className="h-1.5 w-[88%] rounded bg-[var(--line)]" />
        <div className="h-1.5 w-[62%] rounded bg-[var(--line)]" />
      </div>
    </div>
  );
}

function PodcastMock() {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left shadow-[0_10px_30px_-16px_rgba(20,14,8,0.5)]">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[13px] text-[var(--on-accent)]">
        ▶
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-semibold">Listen to today's brief</span>
        <span className="text-[9px] text-[var(--muted)]">6 min · AI narration</span>
      </div>
      <span className="flex h-4 items-end gap-[2px]">
        {[7, 12, 16, 9, 5].map((h, i) => (
          <span key={i} className="w-[2px] rounded bg-[var(--accent)]/50" style={{ height: h }} />
        ))}
      </span>
    </div>
  );
}

const SLIDES: { mock: ReactNode; title: string; body: string }[] = [
  {
    mock: <ReportMock />,
    title: "Your news, made yours",
    body: "Daily Brief reads the day's news and writes you a short, personal briefing — only the topics you care about.",
  },
  {
    mock: <CustomiseMock />,
    title: "You're in control",
    body: "Choose your genres, add your own interests, and set the depth and tone. It's your brief, your way.",
  },
  {
    mock: <RecapMock />,
    title: "Never miss a beat",
    body: "Away for a few days? Your next brief opens with a quick catch-up on what you missed.",
  },
  {
    mock: <PodcastMock />,
    title: "Every morning, automatically",
    body: "A fresh brief lands each day at a time you pick — read it, or listen to the AI podcast version.",
  },
];

export function WelcomeCarousel({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-6 pb-8 pt-6">
      <div className="flex flex-none justify-end">
        <button onClick={onDone} className="text-[13.5px] font-medium text-[var(--faint)]">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-[280px]">{s.mock}</div>
        <h1 className="mt-8 text-center text-[26px] font-bold leading-tight tracking-tight">{s.title}</h1>
        <p className="mt-3 max-w-[300px] text-center text-[15px] leading-relaxed text-[var(--muted)]">
          {s.body}
        </p>
      </div>

      <div className="flex flex-none flex-col gap-5">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, n) => (
            <span
              key={n}
              className={`h-1.5 rounded-full transition-all ${
                n === i ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="rounded-2xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--on-accent)] active:opacity-80"
        >
          {last ? "Get started" : "Next"}
        </button>
      </div>
    </div>
  );
}
