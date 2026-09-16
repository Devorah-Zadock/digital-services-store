-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Backs the Pro fair-use cap: once someone is
-- Pro (see customer_profiles_pro.sql), the free 3-attempt lifetime cap
-- in ai_usage no longer applies to them, but an unlimited AI tool is
-- still a real cost risk (a compromised account, a script) — so Pro
-- accounts instead get a much larger cap that resets every day.
--
-- Separate table from ai_usage on purpose: ai_usage's cap is a single
-- lifetime count per (user, tool); this one is a count per (user, tool,
-- day). Folding both into one table would mean either the free cap
-- summing across days (defeating "3 total, ever") or the Pro cap only
-- ever counting one day (defeating "resets daily") — cleanest to keep
-- them as two small tables with two different meanings.

create table if not exists ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  day date not null default current_date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, tool, day)
);

alter table ai_usage_daily enable row level security;

drop policy if exists "read own ai usage daily" on ai_usage_daily;
create policy "read own ai usage daily" on ai_usage_daily
  for select to authenticated
  using (auth.uid() = user_id);
