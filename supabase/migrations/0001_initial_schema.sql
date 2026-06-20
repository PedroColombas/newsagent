-- ============================================================
-- News Report Generator — Initial Schema
-- Migration 0001
-- ============================================================

-- ------------------------------------------------------------
-- preferences
-- One row per user. Stores the full customisation config that
-- drives the daily pipeline.
-- ------------------------------------------------------------
create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade unique,

  -- Topic model (3 levels)
  genres text[] default '{}',            -- Level 1: ['Technology', 'Politics']
  subtopics jsonb default '{}'::jsonb,   -- Level 2: { "Technology": ["AI", "Semiconductors"] }
  custom_interests text[] default '{}',  -- Level 3: free-text natural language, max 5 (enforced in app)

  -- Filtering
  exclusions text default '',            -- "nothing about crypto or NFTs"

  -- Report shape
  report_mode text not null default 'standard'
    check (report_mode in ('briefing', 'standard', 'deep_dive')),
  voice text not null default 'neutral'
    check (voice in ('neutral', 'analytical', 'conversational', 'critical')),
  max_topics int not null default 5 check (max_topics between 1 and 10),

  -- Podcast + delivery
  podcast_enabled boolean not null default true,
  delivery_hour int not null default 6 check (delivery_hour between 0 and 23), -- UTC

  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- reports
-- One report per user per day.
-- ------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  date date not null,
  content jsonb,             -- { sections: [{ topic, summary, sources[], level }] }
  markdown text,             -- full rendered report (for display + podcast source)

  status text not null default 'pending'
    check (status in ('pending', 'generating', 'complete', 'failed')),
  error_message text,        -- populated when status = 'failed'

  created_at timestamptz not null default now(),

  unique (user_id, date)
);

create index reports_user_date_idx on public.reports (user_id, date desc);

-- ------------------------------------------------------------
-- podcast_episodes
-- One episode per report (when podcast_enabled).
-- ------------------------------------------------------------
create table public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports on delete cascade unique,
  user_id uuid not null references auth.users on delete cascade,  -- denormalised for RLS + storage path

  script text,               -- Claude-generated conversational audio script
  audio_url text,            -- storage path: podcast-audio/{user_id}/{report_id}.mp3
  duration_seconds int,

  status text not null default 'pending'
    check (status in ('pending', 'generating', 'complete', 'failed')),

  created_at timestamptz not null default now()
);

create index podcast_user_idx on public.podcast_episodes (user_id);

-- ------------------------------------------------------------
-- updated_at trigger for preferences
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger preferences_updated_at
  before update on public.preferences
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-create a default preferences row when a user signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
