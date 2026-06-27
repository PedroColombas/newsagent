-- ============================================================
-- News Report Generator — Podcast chapters
-- Migration 0005
--
-- Per-topic chapter markers for the podcast player. Stored as
-- fractions (0..1) of the episode, so they scale to the real
-- audio duration at play time:
--   [{ "title": "AI", "fraction": 0 }, { "title": "Markets", "fraction": 0.42 }]
-- ============================================================

alter table public.podcast_episodes
  add column chapters jsonb not null default '[]'::jsonb;
