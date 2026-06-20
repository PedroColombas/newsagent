-- ============================================================
-- News Report Generator — Row Level Security
-- Migration 0002
--
-- Every table is scoped so a user can only ever touch their
-- own rows. The Trigger.dev pipeline uses the service_role key,
-- which bypasses RLS entirely — so these policies only govern
-- access from the frontend (anon/authenticated keys).
-- ============================================================

-- ------------------------------------------------------------
-- preferences
-- ------------------------------------------------------------
alter table public.preferences enable row level security;

create policy "Users can view own preferences"
  on public.preferences for select
  using (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.preferences for insert
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- reports
-- Frontend is read-only on reports. Writes come exclusively
-- from the pipeline (service_role), so no insert/update policy
-- is granted to users.
-- ------------------------------------------------------------
alter table public.reports enable row level security;

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- podcast_episodes
-- Same pattern: read-only for users.
-- ------------------------------------------------------------
alter table public.podcast_episodes enable row level security;

create policy "Users can view own podcast episodes"
  on public.podcast_episodes for select
  using (auth.uid() = user_id);
