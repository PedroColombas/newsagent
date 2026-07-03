import { useState } from "react";

// First-run trailer — sets the scene before the onboarding wizard: what the app is + the headline
// features. Deliberately visual and light (distinct from the config wizard).
const SLIDES = [
  {
    icon: "📰",
    title: "Your news, made yours",
    body: "Daily Brief reads the day's news and writes you a short, personal briefing — only the topics you care about.",
  },
  {
    icon: "🎛️",
    title: "You're in control",
    body: "Choose your genres, add your own interests, and set the depth and tone. It's your brief, your way.",
  },
  {
    icon: "⏳",
    title: "Never miss a beat",
    body: "Away for a few days? Your next brief opens with a quick catch-up on what you missed.",
  },
  {
    icon: "🎧",
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

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--accent)]/12 text-[44px]">
          {s.icon}
        </div>
        <h1 className="mt-7 text-[27px] font-bold leading-tight tracking-tight">{s.title}</h1>
        <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-[var(--muted)]">{s.body}</p>
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
