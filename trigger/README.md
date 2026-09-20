# Pipeline

The stages that turn a reader's topics into a brief, and a brief into a podcast. Deployed
to Trigger.dev, separately from the web app.

## The chain

```
daily-report  →  fetch-news  →  generate-report        (a brief)
                                generate-podcast       (on request, from the app)
```

Each stage is its own task. They hand off with `.trigger()` rather than awaiting each
other, so every stage retries on its own and none of them holds a worker open waiting.
Every stage is idempotent, anchored on a real constraint — `reports.unique(user_id, date)`
and `podcast_episodes.unique(report_id)` — and checks row `status` before redoing work, so
a Trigger retry cannot produce a duplicate or overwrite a finished report.

**`generate-report` does not chain into `generate-podcast`.** Audio is the most expensive
step in the pipeline, so it only ever runs when a reader asks for it, via `POST /api/podcast`.

**`daily-report` is currently switched off**, for cost rather than because it is broken. The
task stays deployed and can still be triggered by hand. Turning it back on takes two
changes, both required: restore the `cron` in `daily-report.ts`, and set
`ENABLE_DAILY_CRON=true` in the Trigger environment. It also skips demo accounts by design.

## Layout

- `src/jobs/` — one file per stage, plus the cron and the demo fixtures
  (`seed-demo-briefs`, `reset-demo`, `seed-test-episode`).
- `src/lib/` — SDK clients and helpers: `anthropic`, `perplexity`, `tts` / `openai-tts`,
  `audio-encode`, `intro-audio`, `supabase`, `env`, `concurrency`, `diagnostics`, and the
  prompt modules `synthesis`, `podcast-script`, `recap`. Every client is built lazily
  inside a function, never at module scope. `elevenlabs-tts` is dormant: it was trialled,
  dropped on cost, and left behind a flag rather than deleted.
- `src/fixtures/` — the seeded demo briefs and a TTS-only test episode.
- Shared DB types come from `../shared/types.ts` through the `@shared/*` alias. Type-only,
  so it erases at build and the bundler never reaches outside this package.

## What each stage does

**`fetch-news`** turns topics into one Perplexity query each — never a composite — and runs
them **strictly one at a time**. The account's limit is on simultaneous requests, so
spacing retries out does not help and neither does concurrency. Canonical topics are cached
per `(topic, day)` in `topic_news_cache` and shared across readers; free-text interests and
first-time primers are personal and never cached.

**`generate-report`** synthesises everything in one Opus pass, so the model can see the
topics side by side and not tell the same story twice. It writes primers for topics a
reader has never had, folds missed days into a catch-up, and applies exclusions in the
prompt. A guard rejects a degraded response rather than shipping a stubbed section.

**`generate-podcast`** rewrites the brief as a two-voice interview — a rewrite, not a
read-aloud — then synthesises each speaker in parallel and assembles the episode with
ffmpeg, adding the intro sting and per-topic chapters.

Both prompts can be run locally against a single Anthropic key, no database and no Trigger:

```bash
npm run preview:synthesis
npm run preview:podcast
```

## Setup

1. Create a Trigger.dev project and put its ref in `trigger.config.ts`.
2. `npm install`
3. Set the variables from `.env.example` in **both** the Dev and Prod environments, in the
   Trigger dashboard. The pipeline holds the Supabase `service_role` key, so it bypasses
   RLS — it must never be given to anything that runs in a browser.
4. `npm run dev` to run against Dev; `npm run deploy` to ship to Prod.

Pinned to Trigger.dev v4.4.6, with the SDK and build packages exact-matched.
