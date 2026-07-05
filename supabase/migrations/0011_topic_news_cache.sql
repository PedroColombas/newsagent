-- Shared Perplexity result cache.
-- Canonical topics (genre + subtopic) resolve to the SAME query for every user, so we fetch each
-- once per (topic, day) and reuse it across all users and all delivery hours. Custom free-text
-- interests and first-time catch-up primers are per-user and are never cached.
-- Personalisation is unaffected: only the raw fetched news is shared — the Claude synthesis stays
-- fully per-user (their topic set, exclusions, voice, mode).
--
-- This is pipeline-only, un-scoped shared data: RLS is ON with NO policies, so the service_role
-- pipeline bypasses it while anon/authenticated clients get nothing.
create table if not exists topic_news_cache (
  topic_key   text        not null,   -- sectionKey, e.g. "genre:Technology" or "sub:Technology:AI"
  date        date        not null,   -- UTC brief date; one snapshot per topic per day
  content     text        not null,   -- Perplexity's synthesised answer
  sources     jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  primary key (topic_key, date)
);

alter table topic_news_cache enable row level security;
-- No policies on purpose — written and read only by the pipeline (service_role bypasses RLS).
