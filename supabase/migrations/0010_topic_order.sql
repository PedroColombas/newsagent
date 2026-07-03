-- ============================================================
-- News Report Generator — Manual topic ordering
-- Migration 0010
--
-- User-chosen order for the report's sections (set by drag-to-reorder in the wizard review).
-- Stores the ordered section keys (genre:X / sub:G:S / interest:I). Empty = the default
-- specific-first ordering. planReportSections (shared) applies it, so the pipeline honors it too.
-- ============================================================

alter table public.preferences
  add column if not exists topic_order text[] not null default '{}';
