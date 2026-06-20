# NewsAgent — Trigger.dev pipeline

The daily report + podcast pipeline. A separate deploy from the web app.

## Chain

`daily-report` (hourly UTC cron) → fans out to the users whose `delivery_hour` matches
this hour → `fetch-news` → `generate-report` → `generate-podcast`.

Each step is its own task, fire-and-forwarded to the next with `.trigger()`, so every
step retries independently and is **idempotent** — it checks row `status` before redoing
work (anchored on `reports.unique(user_id, date)` and `podcast_episodes.unique(report_id)`).

## Layout

- `src/lib/` — lazy SDK clients + helpers (`env`, `supabase`, `anthropic`, `perplexity`,
  `openai-tts`, `diagnostics`). All clients build lazily inside functions (Trigger §2).
- `src/jobs/` — the four tasks above.
- Shared DB types come from `../shared/types.ts` via the `@shared/*` path alias
  (type-only import, so it erases at build — no bundler reach-outside issues).

## Status of the AI prompts

All three are designed with the owner and implemented (no stubs left):

- ✅ `fetch-news.ts` — editorial-brief query template, AI topic resolution for free-text
  interests, per-genre recency, specificity prioritisation.
- ✅ `generate-report.ts` → `synthesize` — Opus 4.8 structured-outputs synthesis; mode /
  voice / exclusions specs in a cache-friendly system prompt; sources re-attached in code.
- ✅ `generate-podcast.ts` → `writeScript` — Sonnet 4.6 conversational rewrite; chunked
  gpt-4o-mini-tts with delivery `instructions`; duration estimate.

## Setup

1. Create the Trigger.dev project in the KUDA org; put its ref in `trigger.config.ts`.
2. `npm install`
3. Set the env vars from `.env.example` in **both** Dev and Prod (Trigger dashboard).
4. `npm run dev` to test locally; `npm run deploy` to ship.

Pinned to Trigger.dev v4.4.6 (sdk + build exact-matched — Trigger §7).
