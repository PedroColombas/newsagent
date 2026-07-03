import { useState } from "react";
import type { ReactNode } from "react";

// First-run trailer — sets the scene before the onboarding wizard. Each card is a near-full-screen
// stylised mock of the relevant screen (built from the app's own tokens + fixed example brief text,
// so it stays on-brand without shipping/​maintaining screenshots), with the writing below it.

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--paper)] shadow-[0_24px_60px_-24px_rgba(20,14,8,0.55)]">
      {children}
    </div>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1 w-1 flex-none rounded-full bg-[var(--accent)]" />
      <span className="text-[8.5px] font-semibold uppercase tracking-[1.2px] text-[var(--muted)]">
        {children}
      </span>
    </div>
  );
}

function ReportMock() {
  return (
    <Frame>
      <div className="flex-1 overflow-hidden px-5 pt-5">
        <span className="text-[9px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
          Thursday · 4 July
        </span>
        <div className="mt-1 text-[19px] font-bold tracking-tight">Your brief</div>
        <div className="mt-5">
          <SectionEyebrow>Technology</SectionEyebrow>
          <div className="mt-1 text-[14px] font-bold leading-snug">A quieter breakthrough in battery density</div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-[var(--ink)]/70">
            A solid-state cell holding about 40% more charge by weight — and a thousand-cycle lifespan —
            moved from the lab to a pilot line this week. If it scales it reshapes EVs and grid storage
            alike; cost is the last hurdle.
          </p>
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <SectionEyebrow>Finance</SectionEyebrow>
          <div className="mt-1 text-[14px] font-bold leading-snug">Markets hold steady as a rate cut nears</div>
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-[var(--ink)]/70">
            Futures drifted flat into the decision, with traders now pricing a quarter-point move and
            watching the language on inflation more than the cut itself.
          </p>
        </div>
      </div>
    </Frame>
  );
}

function CustomiseMock() {
  return (
    <Frame>
      <div className="flex-1 px-5 pt-5">
        <span className="text-[9px] font-bold uppercase tracking-[1px] text-[var(--accent)]">Step 1 of 4</span>
        <div className="mt-1.5 text-[17px] font-bold tracking-tight">Pick your genres</div>
        <p className="mt-1 text-[10px] text-[var(--muted)]">The broad areas you want covered.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Technology", "Politics", "Finance", "Science", "Sport", "Culture", "Health", "World"].map(
            (g, i) => (
              <span
                key={g}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  [0, 2, 3].includes(i)
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "border border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {g}
              </span>
            ),
          )}
        </div>
        <div className="mt-5 text-[9px] font-semibold uppercase tracking-[1.2px] text-[var(--faint)]">Voice</div>
        <div className="mt-2 flex gap-1 rounded-full bg-[var(--line)]/60 p-0.5">
          {["Neutral", "Analytical", "Casual", "Critical"].map((v, i) => (
            <span
              key={v}
              className={`flex-1 rounded-full py-1.5 text-center text-[9px] font-medium ${
                i === 1 ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--muted)]"
              }`}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function RecapMock() {
  return (
    <Frame>
      <div className="flex-1 px-5 pt-5">
        <span className="text-[9px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
          Monday · 7 July
        </span>
        <div className="mt-1 text-[18px] font-bold tracking-tight">Good morning</div>
        <div className="mt-4 rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-3.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-[1px] text-[var(--accent)]">
              While you were away
            </span>
            <span className="text-[9px] text-[var(--faint)]">· 3 days</span>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--ink)]/75">
            Two rate cuts landed, a major merger cleared antitrust review, and the election field
            narrowed to three. Here's the through-line on each before today's news.
          </p>
        </div>
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          <SectionEyebrow>Politics</SectionEyebrow>
          <div className="mt-1 text-[13px] font-bold leading-snug">The field narrows ahead of the debate</div>
        </div>
      </div>
    </Frame>
  );
}

function PodcastMock() {
  return (
    <Frame>
      <div className="flex-1 px-5 pt-5">
        <div className="opacity-40">
          <span className="text-[9px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
            Thursday · 4 July
          </span>
          <div className="mt-1 text-[18px] font-bold tracking-tight">Good morning</div>
          <div className="mt-6 space-y-2.5">
            <div className="h-2 w-3/4 rounded bg-[var(--line)]" />
            <div className="h-2 w-2/3 rounded bg-[var(--line)]" />
          </div>
        </div>
        {/* Spotlighted audio card */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-3 shadow-[0_0_0_6px_rgba(192,81,43,0.12)]">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[12px] text-[var(--on-accent)]">
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
      </div>
    </Frame>
  );
}

const SLIDES: { mock: ReactNode; title: string; body: string }[] = [
  {
    mock: <ReportMock />,
    title: "Your news, made yours",
    body: "A short, personal briefing on only the topics you care about — written fresh each day.",
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
    title: "Listen, don't just read",
    body: "Every brief also comes as a conversational AI podcast — for the commute, the gym, anywhere.",
  },
];

export function WelcomeCarousel({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const s = SLIDES[i];

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-5 pb-8 pt-4">
      <div className="flex flex-none justify-end pb-1">
        <button onClick={onDone} className="text-[13.5px] font-medium text-[var(--faint)]">
          Skip
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="h-full max-h-[440px] w-full max-w-[300px]">{s.mock}</div>
      </div>

      <div className="flex flex-none flex-col gap-4 pt-5">
        <div className="text-center">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight">{s.title}</h1>
          <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-[var(--muted)]">
            {s.body}
          </p>
        </div>
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
