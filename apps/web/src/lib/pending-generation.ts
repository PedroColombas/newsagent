// A tiny reload-surviving record so the empty Today shows the compiling state (not the "Generate"
// button) in the few seconds after an on-demand click — before the pipeline's reports row exists.
// It also carries the created_at of the report we superseded, so a failure can be told apart from a
// stale one after a reload via a server-vs-server comparison (immune to clock skew and to the
// visibility handler bumping the click time). Once the reports row reflects the run it drives the
// state and this is cleared; a max age bounds it so a stale record can never leave a stuck screen.
const KEY = "pending-generation";
const MAX_AGE_MS = 3 * 60 * 1000;

export interface PendingGeneration {
  at: number; // click timestamp (browser clock) — used to exclude background time from the timeout
  baseline: string | null; // created_at of the report at click time, or null if there was none
}

export function markPending(baselineCreatedAt: string | null): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), baseline: baselineCreatedAt }));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Returns the pending record if FRESH, else null (clearing a stale one).
export function readPending(): PendingGeneration | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingGeneration;
    if (!p || typeof p.at !== "number" || Date.now() - p.at > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
