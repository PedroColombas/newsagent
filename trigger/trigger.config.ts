import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  // NewsAgent project in the KUDA org. The project ref is not a secret.
  project: "proj_zbfstdzftopvqmzelfrq",

  runtime: "node",
  // COMPOSIO_TRIGGER_LEARNINGS Trigger §4 — "debug" is filtered out by default; use "info".
  logLevel: "info",
  dirs: ["./src/jobs"],

  // Default ceiling per run; individual tasks override with their own maxDuration.
  maxDuration: 300,

  // Bakes ffmpeg into the deployed image (sets FFMPEG_PATH) for podcast audio assembly — the
  // intro sting + voice segments are re-encoded to one uniform mp3. No effect in local `dev`.
  build: {
    extensions: [ffmpeg()],
  },

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
