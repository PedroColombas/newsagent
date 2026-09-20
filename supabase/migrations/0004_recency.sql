-- ============================================================
-- Daily — Recency controls
-- Migration 0004
--
-- User-selectable news recency on preferences:
--   default_recency  — the window for the whole report
--   recency_by_genre — optional per-genre overrides (falls back to default;
--                      custom interests always use default_recency)
-- Maps to Perplexity's search_recency_filter (day = 24h, week = 7d, month = 30d).
-- ============================================================

alter table public.preferences
  add column default_recency text not null default 'day'
    check (default_recency in ('day', 'week', 'month')),
  add column recency_by_genre jsonb not null default '{}'::jsonb;
