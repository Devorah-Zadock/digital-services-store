-- STAGING ONLY — never applied anywhere else (the staging workflow refuses
-- to run against any project but deskkit-staging).
--
-- Fault injection for the end-to-end tests: the worker reads this only
-- when AUTOMATE_ENV=staging, to simulate a failing or exhausted email
-- provider without touching any real service.
create table if not exists public.automate_test_controls (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.automate_test_controls enable row level security;
revoke all on table public.automate_test_controls from anon, authenticated;

-- Consume one injected failure (returns the mode, or null when none left).
create or replace function public.automate_test_take_fault(p_key text)
returns text language plpgsql security definer set search_path = '' as $$
declare v jsonb; m text;
begin
  select value into v from public.automate_test_controls where key = p_key for update;
  if v is null or coalesce((v ->> 'remaining')::int, 0) <= 0 then return null; end if;
  m := v ->> 'mode';
  update public.automate_test_controls
     set value = jsonb_set(v, '{remaining}', to_jsonb((v ->> 'remaining')::int - 1)), updated_at = now()
   where key = p_key;
  return m;
end;
$$;
revoke all on function public.automate_test_take_fault(text) from public, anon, authenticated;
grant execute on function public.automate_test_take_fault(text) to service_role;
