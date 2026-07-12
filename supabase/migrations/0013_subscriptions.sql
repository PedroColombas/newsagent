-- ============================================================
-- Subscriptions / billing tiers — Migration 0013
-- One row per user. Tier + Stripe linkage drive access gating (cadence, podcast, on-demand).
-- Billing state is OWNED BY STRIPE: only the webhook (service_role, bypasses RLS) writes here;
-- clients may read their own row. Tier capabilities live in shared/tiers.ts.
-- ============================================================

create type public.subscription_tier as enum ('free', 'text', 'studio');

create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,

  tier public.subscription_tier not null default 'free',
  -- Mirrors the Stripe subscription status; 'active' / 'trialing' grant access.
  status text not null default 'active'
    check (status in (
      'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
    )),

  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,           -- access valid until here; null = no Stripe expiry (e.g. free)
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,

  updated_at timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

-- updated_at trigger (reuses the shared function from 0001)
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS: a user may READ their own subscription. There are NO write policies — billing state
-- is written only by the Stripe webhook using the service_role key (which bypasses RLS), so a
-- client can never grant itself a tier.
-- ------------------------------------------------------------
alter table public.subscriptions enable row level security;

create policy "read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Auto-create a default (free) subscription on signup. Redefines handle_new_user (from 0001)
-- to seed BOTH preferences and subscriptions from the single signup hook.
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

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- Backfill existing users. Grandfather everyone who has already signed up to full access
-- ('studio', active) so current testers aren't downgraded when gating lands; new signups start
-- 'free'. Change 'studio' -> 'free' below if you'd rather existing users also start free.
-- ------------------------------------------------------------
insert into public.subscriptions (user_id, tier, status)
select id, 'studio', 'active' from auth.users
on conflict (user_id) do nothing;
