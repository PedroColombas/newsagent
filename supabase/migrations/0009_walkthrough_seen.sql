-- ============================================================
-- News Report Generator — First-run walkthrough flag
-- Migration 0009
--
-- Per-user flag gating the one-time coach-mark walkthrough. Cross-device (unlike a
-- localStorage flag). New signups get it (default false, via the on_auth_user_created
-- default-prefs trigger); existing users are backfilled to true so only new users see it.
-- ============================================================

alter table public.preferences
  add column walkthrough_seen boolean not null default false;

-- Existing users already know the app — don't show them the intro.
update public.preferences set walkthrough_seen = true;
