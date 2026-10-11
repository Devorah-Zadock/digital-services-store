-- Local test database only: the minimum of Supabase (roles, auth schema,
-- extensions) and of DeskKit's existing tables that Automate depends on,
-- so automate/sql/*.sql can be loaded and exercised on a plain Postgres.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz default now(), banned_until timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user) $$;
grant usage on schema auth, extensions, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

create table if not exists public.site_projects (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, slug text unique, template text, name text);
create table if not exists public.quote_saves (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, data jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists public.invoice_saves (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, doc_type text, status text default 'draft', number int, data jsonb default '{}', issued_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
