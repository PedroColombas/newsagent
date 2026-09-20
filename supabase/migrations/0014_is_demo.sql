-- ============================================================
-- Public demo account flag — Migration 0014
-- The demo's sign-in details ship inside the browser bundle on purpose, so anyone can sign in as
-- it. That means the account must be incapable of spending money on the paid APIs, and the check
-- has to live on the server: hiding a button in the UI protects nothing.
-- Every paid endpoint reads this flag before doing anything that costs money.
-- ============================================================

alter table public.preferences
  add column if not exists is_demo boolean not null default false;

-- Mark the demo account. The id is hardcoded on purpose: there is exactly one demo account, it is
-- created by hand rather than by the app, and this migration is the record of which one it is.
-- Publishing the id costs nothing — RLS means it grants no access, and the demo's credentials
-- are public by design. Anyone else running this repo replaces it with their own.
-- `returning` makes a zero-row update impossible to miss: if this prints nothing the id is
-- wrong (e.g. the demo user was recreated) and the demo is NOT protected.
update public.preferences
  set is_demo = true
  where user_id = 'af32724e-2214-4967-bfdb-11821b42d50a'
  returning user_id, is_demo;
