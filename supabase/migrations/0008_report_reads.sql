-- ============================================================
-- Daily — Read tracking
-- Migration 0008
--
-- Per-report read state. `reports` stays read-only from the frontend
-- (CLAUDE.md security model); read marks go in this separate table that
-- users CAN write to (their own rows). Powers the History "Read" badge
-- and the "while you were away" recap (detecting missed briefs).
-- ============================================================

create table public.report_reads (
  user_id uuid not null references auth.users on delete cascade,
  report_id uuid not null references public.reports on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, report_id)
);

alter table public.report_reads enable row level security;

-- Users manage their own read marks. The pipeline reads this via service_role.
create policy "Users manage own report reads"
  on public.report_reads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
