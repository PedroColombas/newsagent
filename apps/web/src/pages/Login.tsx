import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";

export function Login() {
  const { signInWithEmail } = useAuth();
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

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">NewsAgent</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your personalised daily briefing.
        </p>
      </div>

      {status === "sent" ? (
        <p className="rounded-lg bg-emerald-50 p-4 text-center text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Check your inbox — a magic sign-in link is on its way to <strong>{email}</strong>.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-lg bg-sky-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
