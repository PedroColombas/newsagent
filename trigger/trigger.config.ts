import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // TODO: replace once the Trigger.dev project is created in the KUDA org.
  //  - We can create it via the Trigger MCP, then copy the ref (starts with "proj_").
  //  - The project ref is NOT a secret, so hardcoding it here is fine.
  project: "proj_PLACEHOLDER_CREATE_PROJECT_FIRST",

  runtime: "node",
  // COMPOSIO_TRIGGER_LEARNINGS Trigger §4 — "debug" is filtered out by default; use "info".
  logLevel: "info",
  dirs: ["./src/jobs"],

  // Default ceiling per run; individual tasks override with their own maxDuration.
  maxDuration: 300,

  retries: {
    // Fail fast while building locally; retry in the cloud.
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30000,
      randomize: true,
    },
  },
});
