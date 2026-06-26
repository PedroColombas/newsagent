import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Dev-only: mirror the Vercel /api/suggest-subtopics function locally, so dynamic
// subtopic suggestions work under `npm run dev` without running `vercel dev`.
// Reads ANTHROPIC_API_KEY from apps/web/.env.local (server-side, not VITE_-prefixed).
function devSuggestApi(anthropicKey: string | undefined, perplexityKey: string | undefined): Plugin {
  return {
    name: "dev-suggest-subtopics",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/suggest-subtopics", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.setHeader("content-type", "application/json");
        try {
          if (!anthropicKey) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: "Add ANTHROPIC_API_KEY to apps/web/.env.local for local suggestions",
              }),
            );
            return;
          }
          const raw = await readBody(req);
          const genre = String(JSON.parse(raw || "{}").genre ?? "");
          // Transpile + load the shared module on the fly (it imports the Anthropic SDK).
          const mod = await server.ssrLoadModule("/api/_lib/suggest.ts");
          const subtopics = await mod.suggestSubtopics(genre, anthropicKey, perplexityKey);
          res.end(JSON.stringify({ subtopics }));
        } catch (err) {
          console.error("dev suggest-subtopics failed:", err);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: "Suggestion failed" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load all env vars (no VITE_ filter) so the dev middleware can read the Anthropic key.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      devSuggestApi(env.ANTHROPIC_API_KEY, env.PERPLEXITY_API_KEY),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "Daily Brief",
          short_name: "Daily Brief",
          description: "Your day, briefed — a personalised daily news report and podcast.",
          theme_color: "#faf8f4",
          background_color: "#faf8f4",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        // Shared DB types (type-only — erased at build); mirrors the pipeline's @shared alias.
        "@shared": fileURLToPath(new URL("../../shared", import.meta.url)),
      },
    },
  };
});
