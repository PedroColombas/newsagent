# News Report Generator — Phase 1: Supabase Foundation

This is the data layer. Apply these migrations to a fresh Supabase project,
then everything (pipeline + frontend) builds on top.

## What's here

```
supabase/migrations/
  0001_initial_schema.sql   Tables, triggers, auto-create preferences on signup
  0002_rls_policies.sql     Row Level Security — users only see their own data
  0003_storage.sql          Private podcast-audio bucket + read policy
shared/
  types.ts                  TypeScript types mirroring the schema
```

## Setup steps

### 1. Create the Supabase project
- Go to https://supabase.com/dashboard → New Project
- Note your **Project URL** and these keys (Settings → API):
  - `anon` key → used by the React frontend
  - `service_role` key → used by the Trigger.dev pipeline (keep secret, never ship to client)

### 2. Apply the migrations

**Option A — Supabase CLI (recommended):**
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — SQL Editor (no CLI):**
Paste each file's contents in order (0001 → 0002 → 0003) into the
Supabase Dashboard → SQL Editor and run them one at a time.

### 3. Configure Auth
Dashboard → Authentication → Providers:
- Enable **Email** (magic link is simplest for an iPhone PWA — no password to type)
- Optionally enable **Google** OAuth for one-tap sign-in

Dashboard → Authentication → URL Configuration:
- Set **Site URL** to your Vercel domain (e.g. https://yourapp.vercel.app)
- Add `http://localhost:5173` to redirect URLs for local dev

### 4. Verify
- Create a test user (Authentication → Users → Add user)
- Confirm a row auto-appeared in `preferences` with that user_id
  (the `on_auth_user_created` trigger does this)
- Confirm the `podcast-audio` bucket exists (Storage)

## Key design decisions baked in

- **Auto-preferences on signup** — every new user gets a default preferences
  row via trigger, so the app never has to handle "no preferences yet".
- **Reports/podcasts are read-only from the frontend** — only the pipeline
  (service_role) writes them. This is enforced by RLS having no insert/update
  policy for users on those tables.
- **Storage is private** — audio served via signed URLs or the per-user read
  policy. Files namespaced `{user_id}/{report_id}.mp3`.
- **One report per user per day** — enforced by `unique(user_id, date)`.

## Next: Phase 2 — Trigger.dev pipeline
fetch-news (Perplexity) → generate-report (Claude) → generate-podcast (Claude + OpenAI TTS)
