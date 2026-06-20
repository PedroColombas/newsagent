import { logger } from "@trigger.dev/sdk";

// Surface third-party SDK/API failures loudly (COMPOSIO_TRIGGER_LEARNINGS Patterns §3).
// Generic outer messages hide the real cause; log the fields that actually carry signal,
// then rethrow so Trigger.dev still records the failure and applies its retry policy.
export async function withDiagnostics<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    logger.error(`${label} failed`, {
      message: error?.message,
      name: error?.name,
      status: error?.status ?? error?.statusCode,
      // Anthropic/OpenAI SDK errors expose `.error`; fetch-layer errors use `.cause`.
      detail: error?.error ?? error?.response?.data ?? error?.cause?.message ?? null,
    });
    throw error;
  }
}
