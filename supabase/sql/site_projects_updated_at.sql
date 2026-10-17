-- site_projects had no updated_at column, but since 12.10.2026 the site
-- builder sends updated_at on every save (so an edited site moves to the
-- top of "My projects") — the database rejected the whole save, so site
-- saves failed with "לא נשמר — ננסה שוב". Additive and safe to run more
-- than once: on the first run existing rows get their creation time as
-- "last updated"; later runs change nothing.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'site_projects' and column_name = 'updated_at') then
    alter table public.site_projects add column updated_at timestamptz not null default now();
    update public.site_projects set updated_at = coalesce(created_at, updated_at);
  end if;
end $$;
