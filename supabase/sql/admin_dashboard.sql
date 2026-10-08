-- Admin dashboard (admin.html → "לקוחות" / "יומן ניהול" / "הרשאות").
-- One-time setup: Supabase Dashboard → SQL Editor → paste this whole file
-- → Run. Safe to run again (every step is idempotent).
--
-- What it adds, and why:
--   1. customer_profiles.user_number — a permanent, unique, human-friendly
--      customer number (#1, #2, …) assigned in signup order. Existing
--      customers are numbered by their original signup time; every new
--      signup gets the next number automatically. A trigger refuses any
--      later change, so a number never moves or gets reused.
--   2. admin_users — admin roles beyond the owner(s) listed in the
--      admin-stats ADMIN_EMAILS secret (those are always "owner"):
--        owner   — everything, incl. export, plan changes, deleting an
--                  account, and managing other admins
--        admin   — day-to-day support: suspend/unsuspend, password-reset
--                  email, deleting a single site/CV, messages
--        support — read-only: customers, details, messages
--   3. admin_audit_log — an append-only record of every admin action
--      (who, what, on which customer, when). Rows can't be edited, and
--      can only be removed once they're older than 24 months (the
--      retention period stated in the privacy policy).
--   4. admin_list_users() / admin_dashboard_summary() — server-side
--      search, filters, sorting and pagination, so the admin page only
--      ever loads one page of customers (it used to download every
--      customer with their whole history in one response, which doesn't
--      scale past a few hundred).
--
-- Every table here has RLS on with NO policies, and both functions can
-- only be executed by the service role — i.e. only the admin-stats Edge
-- Function (which verifies the caller's session and role first) can
-- read or write any of it. Nothing is reachable from the browser.

-- ---------------------------------------------------------------------
-- 0. Make sure every auth user has a profile row (same backfill as
--    customer_profiles.sql, repeated so numbering below covers everyone).
insert into public.customer_profiles (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do nothing;
-- (and the Pro flag the plan filter reads — from customer_profiles_pro.sql)
alter table public.customer_profiles add column if not exists is_pro boolean not null default false;

-- ---------------------------------------------------------------------
-- 1. Permanent customer numbers
create sequence if not exists public.customer_user_number_seq;
alter table public.customer_profiles add column if not exists user_number bigint;

-- Number existing customers in signup order (only rows still missing one,
-- so re-running never renumbers anybody).
with base as (
  select coalesce(max(user_number), 0) as m from public.customer_profiles
), ordered as (
  select id, row_number() over (order by created_at, id) as rn
  from public.customer_profiles
  where user_number is null
)
update public.customer_profiles cp
set user_number = base.m + ordered.rn
from ordered, base
where cp.id = ordered.id;

select setval(
  'public.customer_user_number_seq',
  (select coalesce(max(user_number), 0) + 1 from public.customer_profiles),
  false
);

alter table public.customer_profiles alter column user_number set default nextval('public.customer_user_number_seq');
alter table public.customer_profiles alter column user_number set not null;
alter sequence public.customer_user_number_seq owned by public.customer_profiles.user_number;
create unique index if not exists customer_profiles_user_number_key on public.customer_profiles (user_number);
create index if not exists customer_profiles_created_at_idx on public.customer_profiles (created_at desc);

create or replace function public.customer_profiles_keep_user_number()
returns trigger language plpgsql as $$
begin
  if new.user_number is distinct from old.user_number then
    raise exception 'user_number is permanent and cannot be changed';
  end if;
  return new;
end;
$$;
drop trigger if exists customer_profiles_keep_user_number on public.customer_profiles;
create trigger customer_profiles_keep_user_number
  before update on public.customer_profiles
  for each row execute function public.customer_profiles_keep_user_number();

-- ---------------------------------------------------------------------
-- 2. Admin roles
create table if not exists public.admin_users (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('owner', 'admin', 'support')),
  created_at timestamptz not null default now(),
  created_by text
);
alter table public.admin_users enable row level security;

-- ---------------------------------------------------------------------
-- 3. Audit log (append-only)
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  admin_user_id uuid,
  admin_email text not null,
  admin_role text,
  action text not null,
  -- The customer acted on, by id + permanent number only — deliberately
  -- no email or name here, so the log itself holds as little personal
  -- data as possible and stays meaningful after an account is deleted.
  target_user_id uuid,
  target_user_number bigint,
  details jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id, created_at desc);
alter table public.admin_audit_log enable row level security;

create or replace function public.admin_audit_log_append_only()
returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'admin_audit_log is append-only';
  end if;
  if tg_op = 'DELETE' and old.created_at > now() - interval '24 months' then
    raise exception 'admin_audit_log entries are kept for 24 months';
  end if;
  return old;
end;
$$;
drop trigger if exists admin_audit_log_append_only on public.admin_audit_log;
create trigger admin_audit_log_append_only
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_append_only();

-- ---------------------------------------------------------------------
-- 4. Per-user aggregates + listing
--
-- Built as dynamic SQL so a document table that doesn't exist on this
-- project yet (each tool has its own one-time SQL file) simply counts as
-- 0 instead of breaking the whole admin page — same tolerance admin-stats
-- already had for optional tables.
create or replace function public.admin__users_base_sql()
returns text language plpgsql stable set search_path = '' as $$
declare
  joins text := '';
  last_parts text[] := array['au.last_sign_in_at'];
  sel_sites text := '0'; sel_cv text := '0'; sel_quotes text := '0'; sel_invoices text := '0';
begin
  if to_regclass('public.site_projects') is not null then
    joins := joins || ' left join (select user_id, count(*)::int c, max(created_at) t from public.site_projects group by user_id) sp on sp.user_id = cp.id';
    sel_sites := 'coalesce(sp.c, 0)'; last_parts := array_append(last_parts, 'sp.t');
  end if;
  if to_regclass('public.cv_saves') is not null then
    joins := joins || ' left join (select user_id, count(*)::int c, max(updated_at) t from public.cv_saves group by user_id) cvs on cvs.user_id = cp.id';
    sel_cv := 'coalesce(cvs.c, 0)'; last_parts := array_append(last_parts, 'cvs.t');
  end if;
  if to_regclass('public.quote_saves') is not null then
    joins := joins || ' left join (select user_id, count(*)::int c, max(updated_at) t from public.quote_saves group by user_id) qs on qs.user_id = cp.id';
    sel_quotes := 'coalesce(qs.c, 0)'; last_parts := array_append(last_parts, 'qs.t');
  end if;
  if to_regclass('public.invoice_saves') is not null then
    joins := joins || ' left join (select user_id, count(*)::int c, max(updated_at) t from public.invoice_saves group by user_id) inv on inv.user_id = cp.id';
    sel_invoices := 'coalesce(inv.c, 0)'; last_parts := array_append(last_parts, 'inv.t');
  end if;
  if to_regclass('public.usage_events') is not null then
    joins := joins || ' left join (select user_id, max(created_at) t from public.usage_events group by user_id) ue on ue.user_id = cp.id';
    last_parts := array_append(last_parts, 'ue.t');
  end if;

  -- Every column is cast to exactly the type admin_list_users declares:
  -- on a real Supabase project auth.users.email is varchar(255), and
  -- "return query" refuses any mismatch ("structure of query does not
  -- match function result type").
  return format($q$
    select
      cp.id::uuid as user_id,
      cp.user_number::bigint as user_number,
      coalesce(au.email::text, cp.email::text) as email,
      nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), '')::text as full_name,
      cp.created_at::timestamptz as created_at,
      au.last_sign_in_at::timestamptz as last_sign_in_at,
      greatest(%s)::timestamptz as last_active_at,
      (au.email_confirmed_at is not null)::boolean as email_confirmed,
      (au.banned_until is not null and au.banned_until > now())::boolean as is_suspended,
      coalesce(cp.is_pro, false)::boolean as is_pro,
      (%s)::int as sites_count, (%s)::int as cv_count, (%s)::int as quotes_count, (%s)::int as invoices_count
    from public.customer_profiles cp
    left join auth.users au on au.id = cp.id
    %s
  $q$, array_to_string(last_parts, ', '), sel_sites, sel_cv, sel_quotes, sel_invoices, joins);
end;
$$;

create or replace function public.admin_list_users(
  p_search text default null,
  p_status text default null,      -- 'active' | 'suspended' | 'unconfirmed'
  p_plan text default null,        -- 'pro' | 'free'
  p_activity text default null,    -- 'active7' | 'active30' | 'inactive30'
  p_from timestamptz default null, -- signed up at or after
  p_to timestamptz default null,   -- signed up at or before
  p_user_ids uuid[] default null,
  p_sort text default 'created_at',
  p_dir text default 'desc',
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  user_id uuid, user_number bigint, email text, full_name text, created_at timestamptz,
  last_sign_in_at timestamptz, last_active_at timestamptz, email_confirmed boolean,
  is_suspended boolean, is_pro boolean, sites_count int, cv_count int, quotes_count int,
  invoices_count int, total_count bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  sort_col text;
  sort_dir text := case when lower(coalesce(p_dir, 'desc')) = 'asc' then 'asc' else 'desc' end;
  q text := nullif(trim(coalesce(p_search, '')), '');
  q_like text;
  q_num bigint;
  q_id_prefix text;
begin
  sort_col := case coalesce(p_sort, 'created_at')
    when 'user_number' then 'user_number'
    when 'email' then 'lower(email)'
    when 'full_name' then 'lower(full_name)'
    when 'last_active_at' then 'last_active_at'
    when 'docs' then '(sites_count + cv_count + quotes_count + invoices_count)'
    else 'created_at'
  end;
  if q is not null then
    q_like := '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    if ltrim(q, '#') ~ '^[0-9]{1,15}$' then q_num := ltrim(q, '#')::bigint; end if;
    -- A user-id (uuid) prefix search only for text that can actually be
    -- one — anything else would let "%"/"_" act as wildcards here.
    if q ~* '^[0-9a-f-]{6,36}$' then q_id_prefix := lower(q) || '%'; end if;
  end if;

  return query execute format($q$
    with base as (%s)
    select b.*, (count(*) over ())::bigint as total_count
    from base b
    where ($1::text is null
           or b.email ilike $2 or b.full_name ilike $2
           or ($12::text is not null and b.user_id::text like $12)
           or ($3::bigint is not null and b.user_number = $3))
      and ($4::text is null
           or ($4 = 'active' and not b.is_suspended)
           or ($4 = 'suspended' and b.is_suspended)
           or ($4 = 'unconfirmed' and not b.email_confirmed))
      and ($5::text is null or ($5 = 'pro' and b.is_pro) or ($5 = 'free' and not b.is_pro))
      and ($6::text is null
           or ($6 = 'active7' and b.last_active_at >= now() - interval '7 days')
           or ($6 = 'active30' and b.last_active_at >= now() - interval '30 days')
           or ($6 = 'inactive30' and (b.last_active_at is null or b.last_active_at < now() - interval '30 days')))
      and ($7::timestamptz is null or b.created_at >= $7)
      and ($8::timestamptz is null or b.created_at <= $8)
      and ($9::uuid[] is null or b.user_id = any($9))
    order by %s %s nulls last, b.user_number desc
    limit $10 offset $11
  $q$, public.admin__users_base_sql(), sort_col, sort_dir)
  using q, q_like, q_num, nullif(p_status, ''), nullif(p_plan, ''), nullif(p_activity, ''),
        p_from, p_to, p_user_ids,
        least(greatest(coalesce(p_limit, 25), 1), 10000), greatest(coalesce(p_offset, 0), 0), q_id_prefix;
end;
$$;

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  execute format($q$
    with base as (%s)
    select jsonb_build_object(
      'total', count(*),
      'new_7d', count(*) filter (where created_at >= now() - interval '7 days'),
      'new_30d', count(*) filter (where created_at >= now() - interval '30 days'),
      'active_7d', count(*) filter (where last_active_at >= now() - interval '7 days'),
      'active_30d', count(*) filter (where last_active_at >= now() - interval '30 days'),
      'pro', count(*) filter (where is_pro),
      'suspended', count(*) filter (where is_suspended),
      'unconfirmed', count(*) filter (where not email_confirmed)
    ) from base
  $q$, public.admin__users_base_sql()) into result;
  return result;
end;
$$;

revoke all on function public.admin__users_base_sql() from public, anon, authenticated;
revoke all on function public.admin_list_users(text, text, text, text, timestamptz, timestamptz, uuid[], text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_dashboard_summary() from public, anon, authenticated;
grant execute on function public.admin__users_base_sql() to service_role;
grant execute on function public.admin_list_users(text, text, text, text, timestamptz, timestamptz, uuid[], text, text, int, int) to service_role;
grant execute on function public.admin_dashboard_summary() to service_role;

-- Lookups by user_id on the per-tool tables (used by the aggregates above
-- and by the per-customer details view). Only created where the table
-- exists.
do $$
begin
  if to_regclass('public.site_projects') is not null then
    create index if not exists site_projects_user_id_idx on public.site_projects (user_id);
  end if;
  if to_regclass('public.cv_saves') is not null then
    create index if not exists cv_saves_user_id_idx on public.cv_saves (user_id);
  end if;
  if to_regclass('public.quote_saves') is not null then
    create index if not exists quote_saves_user_id_idx on public.quote_saves (user_id);
  end if;
  if to_regclass('public.invoice_saves') is not null then
    create index if not exists invoice_saves_user_id_idx on public.invoice_saves (user_id);
  end if;
  if to_regclass('public.usage_events') is not null then
    create index if not exists usage_events_user_id_created_idx on public.usage_events (user_id, created_at desc);
  end if;
end $$;
