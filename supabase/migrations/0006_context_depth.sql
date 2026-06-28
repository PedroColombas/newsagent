-- ============================================================
-- News Report Generator — Topic context depth (replaces recency)
-- Migration 0006
--
-- Replaces the per-report recency controls with a single "catch-up depth":
-- how much background a topic gets the FIRST time it appears in a user's
-- brief. After that, topics get just the latest. New-topic detection is
-- tracked in user_topic_history.
-- ============================================================

-- Catch-up depth for newly-followed topics.
alter table public.preferences
  add column context_depth text not null default 'quick'
    check (context_depth in ('latest', 'quick', 'full'));

-- The old recency columns (default_recency, recency_by_genre, added in 0004) are now
-- vestigial — the app no longer reads/writes them. They're intentionally LEFT in place so
-- the currently-deployed pipeline keeps working during the transition; a later migration
-- drops them once the updated pipeline is deployed everywhere.

-- Tracks which topics a user has already been briefed on, so a topic only
-- gets a catch-up primer the first time it appears. Written by the pipeline
-- (service_role); the frontend never reads it.
create table public.user_topic_history (
  user_id uuid not null references auth.users on delete cascade,
  topic_key text not null,
  first_briefed_at timestamptz not null default now(),
  primary key (user_id, topic_key)
);

alter table public.user_topic_history enable row level security;
-- No user policies: the pipeline reads/writes via service_role (bypasses RLS).
