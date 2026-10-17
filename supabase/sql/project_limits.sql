-- How many projects one account can keep per tool (sites, CVs, quotes,
-- invoices, school schedules), so a single account can't fill the database.
-- Safe to run more than once.
--   * Only CREATING a new project is checked. Saving changes to an existing
--     one always works, and nothing that already exists is ever deleted —
--     an account already above a limit keeps everything, it just can't add
--     more until it deletes some.
--   * Accounts that bought anything get the higher limit.
--   * The numbers live in public.project_limits, so they can be changed
--     with one UPDATE, no code change.
--   * Server-side code (service role) isn't limited.
-- The error text "project_limit:<table>:<limit>" is what the browser looks
-- for (js/supabase-config.js) to show a friendly explanation.

create table if not exists public.project_limits (
  tbl text primary key,
  max_per_user integer not null check (max_per_user > 0),
  paid_max_per_user integer not null check (paid_max_per_user > 0)
);
alter table public.project_limits enable row level security;
revoke all on public.project_limits from anon, authenticated;

insert into public.project_limits (tbl, max_per_user, paid_max_per_user) values
  ('site_projects', 15, 40),
  ('cv_saves', 20, 60),
  ('quote_saves', 300, 1000),
  ('invoice_saves', 1000, 5000),
  ('schedule_projects', 20, 60)
on conflict (tbl) do nothing;

create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exists boolean;
  v_count integer;
  v_limit integer;
begin
  if coalesce(auth.role(), '') = 'service_role' or new.user_id is null then
    return new;
  end if;
  -- An upsert of a project that already exists is a save, not a new project.
  execute format('select exists (select 1 from public.%I where id = $1)', tg_table_name) into v_exists using new.id;
  if v_exists then
    return new;
  end if;
  select case when exists (select 1 from public.license_redemptions where user_id = new.user_id)
              then l.paid_max_per_user else l.max_per_user end
    into v_limit
    from public.project_limits l where l.tbl = tg_table_name;
  if v_limit is null then
    return new;
  end if;
  -- Two new projects created at the same moment can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('project_limit:' || tg_table_name || ':' || new.user_id::text));
  execute format('select count(*) from public.%I where user_id = $1', tg_table_name) into v_count using new.user_id;
  if v_count >= v_limit then
    raise exception 'project_limit:%:%', tg_table_name, v_limit using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_project_limit() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['site_projects', 'cv_saves', 'quote_saves', 'invoice_saves', 'schedule_projects'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists enforce_project_limit on public.%I', t);
      execute format('create trigger enforce_project_limit before insert on public.%I for each row execute function public.enforce_project_limit()', t);
    end if;
  end loop;
end $$;
