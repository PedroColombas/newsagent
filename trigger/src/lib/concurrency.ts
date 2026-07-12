// Small async concurrency helpers, shared across the pipeline (TTS synthesis, Perplexity fetch).

// Run an async fn over items with a bounded number in flight, preserving input order in the results.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

// Retry an async op on failure with exponential backoff — for transient API errors (e.g. 429s),
// which bounded-parallel fetches make more likely. Rethrows the last error if all attempts fail.
export async function withRetry<R>(fn: () => Promise<R>, attempts = 3, baseDelayMs = 800): Promise<R> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastErr;
}
