-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Mirrors every signup into a small
-- `customer_profiles` table (RLS on, no public policies — only the
-- admin-stats Edge Function's service-role key can read it) so the admin
-- dashboard has a simple table to query instead of paging through
-- Supabase's own auth.users admin API.
--
-- Named customer_profiles, not profiles: this project already has a
-- `profiles` table (quote-app's saved business info, one row per user who
-- has used the quote generator, not every signup) — reusing that name
-- here would have silently broken every future signup the moment the
-- trigger below tried to insert columns that table doesn't have.

create table if not exists customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table customer_profiles enable row level security;

-- Keeps customer_profiles in sync going forward: fires once per signup.
create or replace function public.handle_new_customer_profile()
returns trigger as $$
begin
  insert into public.customer_profiles (id, email, created_at)
  values (new.id, new.email, new.created_at)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_customer_profile();

-- Backfills everyone who signed up before this table existed. Safe to
-- re-run — on conflict (id) skips rows already backfilled.
insert into public.customer_profiles (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do nothing;
