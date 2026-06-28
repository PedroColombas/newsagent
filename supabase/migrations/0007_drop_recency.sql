-- ============================================================
-- News Report Generator — Drop retired recency columns
-- Migration 0007
--
-- 0006 replaced the recency preference with context_depth but left the old
-- columns in place so the then-deployed pipeline kept working. The updated
-- pipeline (which doesn't read them) is now deployed everywhere, so drop them.
-- ============================================================

alter table public.preferences
  drop column if exists default_recency,
  drop column if exists recency_by_genre;
