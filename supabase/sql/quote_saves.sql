-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Adds a place to save individual quotes (one
-- row per saved quote, not per user — a business creates many quotes
-- over time) so they show up in the "my content" rail and can be
-- reopened later, the same way a CV or a site project already can.
--
-- This is separate from the existing `profiles` table: profiles holds
-- the one-time reusable business letterhead (name/logo/contact info)
-- filled in once; quote_saves holds each individual quote's event
-- details (recipient, dates, price, description...).

create table if not exists quote_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quote_saves_user_id_idx on quote_saves (user_id);

alter table quote_saves enable row level security;

drop policy if exists "quote_saves_select_own" on quote_saves;
create policy "quote_saves_select_own" on quote_saves
  for select using (auth.uid() = user_id);

drop policy if exists "quote_saves_insert_own" on quote_saves;
create policy "quote_saves_insert_own" on quote_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "quote_saves_update_own" on quote_saves;
create policy "quote_saves_update_own" on quote_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "quote_saves_delete_own" on quote_saves;
create policy "quote_saves_delete_own" on quote_saves
  for delete using (auth.uid() = user_id);
