import { useState } from "react";
import type { ReactNode } from "react";

// First-run trailer — sets the scene before the onboarding wizard. Each card's top ~⅔ is an
// edge-to-edge stylised mock of the relevant screen (built from the app's own tokens + fixed
// example text, so it stays on-brand without shipping/​maintaining screenshots), fading into the
// writing below.

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-[var(--accent)]" />
      <span className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[var(--muted)]">
        {children}
      </span>
    </div>
  );
}

function ReportMock() {
  return (
    <div className="absolute inset-0 overflow-hidden px-6 pt-10">
      <span className="text-[11.5px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        Thursday · 4 July
      </span>
      <div className="mt-1.5 text-[24px] font-bold tracking-tight">Your brief</div>

      <div className="mt-6">
        <Eyebrow>Technology</Eyebrow>
        <div className="mt-1.5 text-[18px] font-semibold leading-snug">
          A quieter breakthrough in battery density
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]/80">
          A solid-state cell holding about 40% more charge by weight — and a thousand-cycle lifespan —
          moved from the lab to a pilot line this week. If it scales it reshapes EVs and grid storage
          alike; manufacturing cost is the last real hurdle.
        </p>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-6">
        <Eyebrow>Finance</Eyebrow>
        <div className="mt-1.5 text-[18px] font-semibold leading-snug">
          Markets hold steady as a rate cut nears
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]/80">
          Futures drifted flat into the decision, with traders now pricing a quarter-point move and
          watching the language on inflation more than the cut itself.
        </p>
      </div>
    </div>
  );
}

function CustomiseMock() {
  return (
    <div className="absolute inset-0 overflow-hidden px-6 pt-10">
      <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--accent)]">
        Step 1 of 4
      </span>
      <div className="mt-2 text-[22px] font-bold tracking-tight">Pick your genres</div>
      <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">The broad areas you want covered.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Technology", "Politics", "Finance", "Science", "Sport", "Culture", "Health", "World"].map(
          (g, i) => (
            <span
              key={g}
              className={`rounded-full px-3.5 py-2 text-[12.5px] font-medium ${
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

      <div className="mt-6 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--faint)]">
        Voice &amp; tone
      </div>
      <div className="mt-2 flex gap-1 rounded-full bg-[var(--line)]/60 p-1">
        {["Neutral", "Analytical", "Casual", "Critical"].map((v, i) => (
          <span
            key={v}
            className={`flex-1 rounded-full py-1.5 text-center text-[11px] font-medium ${
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
    <div className="absolute inset-0 overflow-hidden px-6 pt-10">
      <span className="text-[11.5px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
        Monday · 7 July
      </span>
      <div className="mt-1.5 text-[24px] font-bold tracking-tight">Good morning</div>

      <div className="mt-5 rounded-2xl border border-[var(--line)] border-l-[3px] border-l-[var(--accent)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[1.2px] text-[var(--accent)]">
            While you were away
          </span>
          <span className="text-[11px] text-[var(--faint)]">· 3 days</span>
        </div>
        <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ink)]/80">
          Two rate cuts landed, a major merger cleared antitrust review, and the election field
          narrowed to three. Here's the through-line on each before today's news.
        </p>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-6">
        <Eyebrow>Politics</Eyebrow>
        <div className="mt-1.5 text-[18px] font-semibold leading-snug">
          The field narrows ahead of the first debate
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]/80">
          Two campaigns suspended overnight, reshaping the map before Thursday's stage…
        </p>
      </div>
    </div>
  );
}

function PodcastMock() {
  return (
    <div className="absolute inset-0 overflow-hidden px-6 pt-10">
      <div className="opacity-35">
        <span className="text-[11.5px] font-semibold uppercase tracking-[1.8px] text-[var(--muted)]">
          Thursday · 4 July
        </span>
        <div className="mt-1.5 text-[24px] font-bold tracking-tight">Good morning</div>
      </div>

      {/* Spotlighted audio card */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-3.5 shadow-[0_0_0_7px_rgba(192,81,43,0.12)]">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[15px] text-[var(--on-accent)]">
          ▶
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-semibold">Listen to today's brief</span>
          <span className="text-[11.5px] text-[var(--muted)]">6 min · AI narration</span>
        </div>
        <span className="flex h-5 items-end gap-[2.5px]">
          {[8, 15, 21, 12, 7].map((h, i) => (
            <span key={i} className="w-[2.5px] rounded bg-[var(--accent)]/50" style={{ height: h }} />
          ))}
        </span>
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-6 opacity-35">
        <Eyebrow>Science</Eyebrow>
        <div className="mt-1.5 text-[18px] font-semibold leading-snug">
          A telescope's first deep-field image
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink)]/80">
          The observatory released its opening survey, catching galaxies from the early universe…
        </p>
      </div>
    </div>
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
    <div className="mx-auto flex h-full max-w-md flex-col">
      {/* Mockup — edge-to-edge, fading into the copy below */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {s.mock}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--paper)] to-transparent" />
        <button
          onClick={onDone}
          className="absolute right-5 top-4 z-10 text-[13.5px] font-medium text-[var(--faint)]"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-none flex-col gap-4 px-6 pb-8">
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
