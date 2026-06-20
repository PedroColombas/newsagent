// Runtime-only env access. Per COMPOSIO_TRIGGER_LEARNINGS Trigger §2, never read or
// assert env vars at module top level — Trigger.dev's deploy-time indexer imports task
// files WITHOUT runtime env vars, so any top-level assertion breaks the deploy. Always
// call these from inside a task/function.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}
