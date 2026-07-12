// First-run welcome — a simple, warm hello before the setup wizard. Visual-first, minimal copy.
// (Replaces the old multi-slide trailer, which belonged in the app's marketing, not the app.)
export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative mx-auto flex h-full max-w-md flex-col overflow-hidden px-7 pb-10 pt-14">
      {/* Warm ambient wash */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, var(--accent), transparent)" }}
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col justify-center">
        {/* Brief mark — three condensing lines, echoing "news, distilled" */}
        <div className="mb-9 flex flex-col gap-1.5" aria-hidden>
          <span className="h-2 w-14 rounded-full bg-[var(--accent)]" />
          <span className="h-2 w-10 rounded-full bg-[var(--accent)]/60" />
          <span className="h-2 w-6 rounded-full bg-[var(--accent)]/30" />
        </div>

        <h1 className="text-[38px] font-bold leading-[1.06] tracking-tight text-[var(--ink)]">
          Welcome to
          <br />
          your Daily Brief.
        </h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-[var(--muted)]">
          All the news you care about, every day — gathered, summarised, and shaped exactly the way
          that works for you.
        </p>
      </div>

      <button
        onClick={onStart}
        className="relative flex-none rounded-2xl bg-[var(--accent)] py-4 text-[16px] font-semibold text-[var(--on-accent)] shadow-[0_6px_18px_rgba(192,81,43,0.3)] active:opacity-80"
      >
        Get started
      </button>
      <p className="relative mt-3 text-center text-[12px] text-[var(--faint)]">
        Takes about a minute to set up.
      </p>
    </div>
  );
}
