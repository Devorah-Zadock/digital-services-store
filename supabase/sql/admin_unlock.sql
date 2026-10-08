-- Admin password: a second, separate secret for the admin area.
--
-- Signing in (with Google or email) proves who you are; the admin area
-- additionally asks for this password, which lives nowhere else — not in
-- the Google account, not in the mailbox. Someone who gets at the owner's
-- open Gmail/Google session on another device still can't open the admin
-- area or call any admin action (admin-stats enforces it server-side).
-- No phone or app needed.
--
-- Stored only as a bcrypt hash (pgcrypto). 5 wrong tries lock it for 15
-- minutes. Only the admin-stats Edge Function (service role) can touch it.
-- Safe to run more than once.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_secrets (
  email text primary key check (email = lower(email)),
  pass_hash text not null,
  failed_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.admin_secrets enable row level security;
revoke all on public.admin_secrets from anon, authenticated;
grant select, insert, update, delete on public.admin_secrets to service_role;

create or replace function public.admin_secret_status(p_email text)
returns text
language sql
stable
set search_path = ''
as $$
  select case when exists (select 1 from public.admin_secrets where email = lower(p_email)) then 'set' else 'unset' end;
$$;

create or replace function public.admin_secret_set(p_email text, p_password text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if length(coalesce(p_password, '')) < 10 then
    raise exception 'admin password must be at least 10 characters';
  end if;
  insert into public.admin_secrets (email, pass_hash, failed_count, locked_until, updated_at)
  values (lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf', 10)), 0, null, now())
  on conflict (email) do update
    set pass_hash = excluded.pass_hash, failed_count = 0, locked_until = null, updated_at = now();
end;
$$;

-- 'ok' | 'bad' | 'locked' | 'unset'
create or replace function public.admin_secret_check(p_email text, p_password text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  r public.admin_secrets%rowtype;
begin
  select * into r from public.admin_secrets where email = lower(p_email) for update;
  if not found then
    return 'unset';
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return 'locked';
  end if;
  if r.pass_hash = extensions.crypt(coalesce(p_password, ''), r.pass_hash) then
    update public.admin_secrets set failed_count = 0, locked_until = null where email = r.email;
    return 'ok';
  end if;
  if r.failed_count + 1 >= 5 then
    update public.admin_secrets set failed_count = 0, locked_until = now() + interval '15 minutes' where email = r.email;
    return 'locked';
  end if;
  update public.admin_secrets set failed_count = r.failed_count + 1 where email = r.email;
  return 'bad';
end;
$$;

revoke all on function public.admin_secret_status(text) from public, anon, authenticated;
revoke all on function public.admin_secret_set(text, text) from public, anon, authenticated;
revoke all on function public.admin_secret_check(text, text) from public, anon, authenticated;
grant execute on function public.admin_secret_status(text) to service_role;
grant execute on function public.admin_secret_set(text, text) to service_role;
grant execute on function public.admin_secret_check(text, text) to service_role;

-- Version of the admin password (changes whenever it's set/changed).
-- Unlock tokens carry it, so changing the password instantly signs every
-- other admin session out — the "it wasn't me" response. NULL = not set.
create or replace function public.admin_secret_version(p_email text)
returns text
language sql
stable
set search_path = ''
as $$
  select (extract(epoch from updated_at) * 1000)::bigint::text
  from public.admin_secrets where email = lower(p_email);
$$;

revoke all on function public.admin_secret_version(text) from public, anon, authenticated;
grant execute on function public.admin_secret_version(text) to service_role;
