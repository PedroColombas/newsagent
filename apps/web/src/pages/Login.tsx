import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";

export function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const { error: signInError } = await signInWithEmail(email.trim());
    if (signInError) {
      setError(signInError);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function onGoogle() {
    setError(null);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) setError(googleError);
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col px-7 pb-8 pt-6">
      {/* Brand + promise — vertically centred */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          className="flex h-[58px] w-[58px] items-center justify-center rounded-[17px] bg-[var(--accent)]"
          style={{ boxShadow: "0 8px 20px -8px rgba(192,81,43,.55)" }}
        >
          <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <line x1="8" y1="9" x2="16" y2="9" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="12.5" y2="17" />
          </svg>
        </div>
        <span className="mt-4 text-xl font-bold tracking-tight">Daily Brief</span>
        <h1 className="mt-5 text-[27px] font-bold leading-tight tracking-tight">Your day, briefed.</h1>
        <p className="mt-3 max-w-[260px] text-[14.5px] leading-relaxed text-[var(--muted)]">
          One personalised report each morning — your topics, summarised and ready to read or hear.
        </p>
      </div>

      {/* Sign-in actions */}
      {status === "sent" ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-center">
          <p className="text-[15px] leading-relaxed text-[var(--ink)]">
            Check your inbox — a sign-in link is on its way to <strong>{email}</strong>.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-3 text-[13.5px] font-semibold text-[var(--faint)]"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => void onGoogle()}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3.5 text-[15px] font-semibold"
          >
            <span className="text-base font-bold text-[var(--accent)]">G</span>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-[var(--line)]" />
            <span className="text-xs font-medium text-[var(--faint)]">or</span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-base outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-2xl bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-[var(--on-accent)] disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Continue with email"}
            </button>
          </form>

          {error && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}

          <p className="mx-4 mt-2 text-center text-[11px] leading-relaxed text-[var(--faint)]">
            By continuing you agree to our <span className="font-semibold text-[var(--ink)]">Terms</span> and{" "}
            <span className="font-semibold text-[var(--ink)]">Privacy Policy</span>.
          </p>
        </div>
      )}
    </div>
  );
}
