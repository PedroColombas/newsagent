# CLAUDE.md — News Report Generator

Context for Claude Code. Read this first before working on the project.

## What this is

A mobile-first (iPhone) web app where a user configures news topic preferences
and report style, a backend pipeline runs daily to compile a summarised report,
and results are served back in the app. Includes a **podcast mode** that converts
each report into an AI-generated audio summary.

The customisation layer is the core product value — how precisely a user can
shape what appears in their report is the whole point. Treat it as the priority,
not an afterthought.

## Owner context

- Comfortable with Claude.ai and Claude Code; **prefers minimal coding** where
  possible — favour clear, maintainable solutions over clever ones, and explain
  tradeoffs rather than silently picking.
- Has already built an email cleaner agent with Trigger.dev + Composio +
  Anthropic, so the orchestration pattern is familiar ground. Lean on that.
- UI is **primarily for iPhone use**. Design every screen mobile-first.

## Tech stack (decided — do not relitigate)

| Layer | Choice |
|-------|--------|
| Frontend | React + Vercel (PWA — manifest + service worker from day one) |
| Database + storage | Supabase (Postgres + Storage + Auth) |
| Scheduling / orchestration | Trigger.dev |
| News fetching | **Perplexity API** (`sonar-pro`) — chosen over NewsAPI for richer synthesised inputs and no scraping layer |
| Report generation + podcast script | Anthropic API (Claude) |
| Text-to-speech | OpenAI TTS for MVP; ElevenLabs as v2 upgrade path |
| Email delivery | Composio + Gmail — DEPRIORITISED, not in MVP |
| Auth | Supabase Auth, multi-user. Magic link + optional Google OAuth |

## Key product decisions (already made)

- **Multi-user** from day one, Supabase Auth, RLS on every table.
- **Cron only** for MVP — no on-demand "generate now" button yet.
- Audio stored in **Supabase Storage**, private bucket, namespaced
  `podcast-audio/{user_id}/{report_id}.mp3`.
- **One Perplexity query per topic** (not one composite). This determines report
  quality — the owner explicitly wants to design these prompts together in
  detail. Do NOT rush the query-generation logic; flag it for collaborative work.
- App Store path: build PWA-first; wrap with Capacitor later if needed. No code
  changes required for that, so don't pre-optimise for it.

### Topic model (3 levels)
1. **Genre** — predefined list, user picks 1–5 (Technology, Politics, Finance, Sport, Science, Culture, Health…)
2. **Subtopics** — dynamically suggested per genre, multi-select
3. **Custom interests** — free-text natural language, up to 5
   (e.g. "what China is doing in chip development"). At pipeline time a cheap
   Claude call translates each into a Perplexity search query — interpreted
   fresh each run so it stays topical.

Plus: **exclusions** (free text, injected into the Claude summarisation prompt),
**max_topics** (3–10), **report_mode**, **voice**, **delivery_hour** (UTC).

### Report mode (what the report is)
- `briefing` — bulleted headlines, one-sentence context
- `standard` — 2–3 paragraphs per topic
- `deep_dive` — long-form analysis, 1–2 topics recommended

### Voice (how it's written)
- `neutral` | `analytical` | `conversational` | `critical`
- Podcast script is ALWAYS rewritten to conversational regardless of voice.

## Repo structure

```
news-report-generator/
├── CLAUDE.md                      # this file
├── apps/web/                      # React PWA → Vercel
│   ├── src/{components,pages,lib,hooks}/
│   └── api/                       # Vercel serverless functions
├── trigger/                       # Trigger.dev pipeline (separate deploy)
│   ├── jobs/{daily-report,fetch-news,generate-report,generate-podcast}.ts
│   └── lib/{perplexity,anthropic,openai-tts}.ts
├── supabase/
│   ├── migrations/                # 0001 schema, 0002 RLS, 0003 storage
│   └── README.md
└── shared/types.ts                # shared TS types — mirror the schema
```

## Current state — DONE

**Phase 1 — Supabase foundation (complete).**
- `supabase/migrations/0001_initial_schema.sql` — tables (`preferences`,
  `reports`, `podcast_episodes`), `updated_at` trigger, and an
  `on_auth_user_created` trigger that auto-inserts a default preferences row.
- `supabase/migrations/0002_rls_policies.sql` — RLS: users see only their own
  rows. Reports + podcasts are read-only from the frontend; pipeline writes via
  service_role (bypasses RLS).
- `supabase/migrations/0003_storage.sql` — private `podcast-audio` bucket +
  per-user read policy.
- `shared/types.ts` — TS types matching the schema.

Schema is the source of truth. If you change a table, update BOTH the migration
AND `shared/types.ts` in the same change.

## Next — TO DO

**Phase 2 — Trigger.dev pipeline** (do this next; strongest ground for owner)
- `fetch-news.ts` — translate each user's topics into Perplexity queries
  (Level 3 via a Claude call), run one query per topic, collect results.
  ⚠️ The query-generation prompt design is a COLLABORATIVE task — pause and work
  through it with the owner rather than finalising alone.
- `generate-report.ts` — Claude synthesises results into a sectioned report,
  honouring report_mode, voice, exclusions, max_topics. Writes to `reports`.
- `generate-podcast.ts` — Claude rewrites report into a conversational script,
  OpenAI TTS → MP3, upload to Storage, write `podcast_episodes`.
- `daily-report.ts` — cron orchestrator: for each user whose `delivery_hour`
  matches, run the chain.

**Phase 3** — React PWA shell: Supabase Auth, bottom nav (Today / History /
Preferences / Profile), routing.
**Phase 4** — Report view (native-reader feel) + history list.
**Phase 5** — Preferences UI: genre chips → subtopic chips → custom interests →
mode/voice segmented controls. The most important screen — it IS the product.
**Phase 6** — Podcast mode: docked mini-player (Spotify-style), full-screen expand.

## Conventions

- TypeScript everywhere. Import shared types from `shared/types.ts`; never
  redefine schema shapes locally.
- Pipeline code uses the Supabase **service_role** key (server-side only, never
  shipped to client). Frontend uses the **anon** key.
- Secrets via env vars — never hardcode. Expected:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`.
- Mobile-first CSS always — single column, bottom nav, thumb-zone actions.
- `delivery_hour` is UTC in the DB; convert to/from local time in the UI.
- When adding a pipeline step, make it idempotent and safe to retry (Trigger.dev
  may re-run). Check report `status` before regenerating.
- Keep each build phase's work coherent; don't jump ahead across phases.

## Anthropic API notes

- Use Claude for: Level 3 interest → query translation (cheap, fast call),
  report synthesis, and podcast script rewriting.
- Keep the query-translation call small and cheap; keep synthesis on a stronger
  model. Make the model choice a config constant so it's easy to tune.

## When in doubt

Surface tradeoffs to the owner rather than guessing — especially on anything
touching report quality (Perplexity prompts, synthesis prompts). The owner
wants to be hands-on with those.
