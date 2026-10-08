-- Security hardening, part 2 — from the live-project check after part 1.
-- Safe to run more than once.
--
-- 1. logos bucket: the "public read" policy let anyone LIST every logo
--    file (paths start with user ids). Logos are shown through their
--    public URL, which a public bucket serves without any policy, so the
--    listing policy is replaced by an owner-only one (owners still need
--    SELECT on their own files for upload-with-replace).
-- 2. User-content tables: anonymous visitors lose all table privileges
--    (RLS already returned nothing — this is defense in depth), and
--    signed-in users lose TRUNCATE/REFERENCES/TRIGGER, which the app
--    never uses (TRUNCATE in particular ignores row-level security).
-- 3. Trigger functions: not callable directly by anon/authenticated, and
--    a fixed search_path on the two that had none.

-- 1. logos
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'SELECT'
      and qual = '(bucket_id = ''logos''::text)'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists "Owner can list own logos" on storage.objects;
create policy "Owner can list own logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. user-content tables
do $$
declare
  t text;
begin
  foreach t in array array['cv_saves', 'quote_saves', 'invoice_saves', 'schedule_projects', 'site_projects', 'profiles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon', t);
      execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
    end if;
  end loop;
end $$;

-- 3. trigger functions
do $$
declare
  f text;
begin
  foreach f in array array['handle_new_customer_profile()', 'admin_audit_log_append_only()',
                           'customer_profiles_keep_user_number()', 'site_projects_protect_columns()'] loop
    if to_regprocedure('public.' || f) is not null then
      execute format('revoke all on function public.%s from public, anon, authenticated', f);
    end if;
  end loop;
  if to_regprocedure('public.admin_audit_log_append_only()') is not null then
    alter function public.admin_audit_log_append_only() set search_path = '';
  end if;
  if to_regprocedure('public.customer_profiles_keep_user_number()') is not null then
    alter function public.customer_profiles_keep_user_number() set search_path = '';
  end if;
end $$;
