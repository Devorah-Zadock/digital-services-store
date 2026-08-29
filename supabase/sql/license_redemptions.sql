-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Backs the redeem-license Edge Function, which
-- is the only thing that ever reads or writes this table (RLS is enabled
-- with zero policies below, so anon/authenticated clients get no access at
-- all — only the service-role key the Edge Function runs with can bypass
-- RLS and reach it).

create table if not exists license_redemptions (
  license_key text primary key,
  product_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null,
  redeemed_at timestamptz not null default now()
);

alter table license_redemptions enable row level security;
