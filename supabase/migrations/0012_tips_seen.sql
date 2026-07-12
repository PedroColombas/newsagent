-- Contextual coach-marks: track which one-time helper tips a user has dismissed.
-- Replaces the single `walkthrough_seen` boolean with a per-tip list of dismissed keys, so tips
-- can be page-specific and conditional (e.g. the podcast tip only appears after podcast is enabled).
-- `walkthrough_seen` is kept (deprecated) so older rows / the pipeline preview stay valid.
alter table public.preferences
  add column if not exists tips_seen text[] not null default '{}';

-- Users who already finished the old first-run tour shouldn't be re-taught the Today basics —
-- seed those keys as seen. (New/reset users have walkthrough_seen = false and start empty, so they
-- get the full set including the new Preferences/History tips.)
update public.preferences
  set tips_seen = array['today-brief', 'today-recap', 'today-podcast']
  where walkthrough_seen = true;
