-- Security hardening (security audit, October 2026). Safe to run more than
-- once. Run the whole file in Supabase Dashboard → SQL Editor (or it runs
-- automatically on merge — see .github/workflows/supabase-deploy.yml).
--
-- 1. site_projects: the columns only the server may set (slug, custom
--    domain, publish info) can no longer be written from the browser.
--    The row-level policy let an owner update ANY column of their own
--    row, so a user could claim a reserved slug ("login"), take over a
--    custom domain someone else had connected, or plant a value that
--    later shows up in the admin panel.
-- 2. finalize_invoice: refused without a signed-in user (auth.uid() was
--    NULL for an anonymous call, so the ownership check silently passed),
--    and EXECUTE is no longer granted to anonymous visitors.
-- 3. invoice_saves credit-note policies: the subquery compared the
--    credit note's reference to itself, so a valid credit note was
--    rejected and an update could point it at another user's invoice.
-- 4. Storage: size/type limits on the site-images and logos buckets, and
--    anonymous visitors can no longer list every uploaded file name
--    (public image URLs keep working — they don't need a select policy).
-- 5. Server-only tables lose the default anon/authenticated grants, so
--    they stay closed even if a policy is ever added by mistake.
-- 6. ai_usage_reserve / ai_usage_release: an atomic per-user AI quota,
--    replacing a read-then-write that parallel requests could bypass.
-- 7. license_redemptions: keeps the Gumroad-verified purchase details and
--    when its receipt was sent, so send-receipt can only email the real
--    buyer, once.

-- ---------------------------------------------------------------------
-- 1. site_projects protected columns
-- ---------------------------------------------------------------------
create or replace function public.site_projects_protect_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  n jsonb := to_jsonb(new);
  o jsonb;
  col text;
  server_only text[] := array['slug', 'custom_domain', 'published_url', 'published_at', 'netlify_site_id', 'publish_count'];
begin
  -- Edge Functions (service_role) and the SQL editor (postgres) are the
  -- server; only browser requests (anon/authenticated) are restricted.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    foreach col in array server_only loop
      if n ? col and n->>col is not null and not (col = 'publish_count' and n->>col = '0') then
        raise exception 'site_projects.% can only be set by the server', col using errcode = '42501';
      end if;
    end loop;
    return new;
  end if;

  o := to_jsonb(old);
  foreach col in array server_only || array['id', 'user_id'] loop
    if (n->col) is distinct from (o->col) then
      raise exception 'site_projects.% can only be changed by the server', col using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists site_projects_protect_columns on public.site_projects;
create trigger site_projects_protect_columns
  before insert or update on public.site_projects
  for each row execute function public.site_projects_protect_columns();

-- ---------------------------------------------------------------------
-- 2 + 3. invoices (plain top-level statements — the Supabase SQL editor
-- choked on these when they were nested inside a DO block)
-- ---------------------------------------------------------------------
create or replace function public.finalize_invoice(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_doc_type text;
  v_status text;
  v_number integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select user_id, doc_type, status into v_user_id, v_doc_type, v_status
  from public.invoice_saves where id = p_id for update;

  if v_user_id is null or v_user_id is distinct from v_uid then
    raise exception 'invoice not found';
  end if;
  if v_status <> 'draft' then
    raise exception 'already issued';
  end if;

  insert into public.invoice_counters (user_id, doc_type, next_number)
  values (v_user_id, v_doc_type, 1)
  on conflict (user_id, doc_type) do nothing;

  update public.invoice_counters
  set next_number = next_number + 1
  where user_id = v_user_id and doc_type = v_doc_type
  returning next_number - 1 into v_number;

  update public.invoice_saves
  set status = 'issued', number = v_number, issued_at = now(), updated_at = now()
  where id = p_id;

  return v_number;
end;
$$;

revoke all on function public.finalize_invoice(uuid) from public, anon;
grant execute on function public.finalize_invoice(uuid) to authenticated;

drop policy if exists "invoice_saves_insert_own" on public.invoice_saves;
create policy "invoice_saves_insert_own" on public.invoice_saves
  for insert to authenticated
  with check (
    auth.uid() = user_id and status = 'draft' and number is null and issued_at is null
    and (
      invoice_saves.original_invoice_id is null
      or exists (
        select 1 from public.invoice_saves oi
        where oi.id = invoice_saves.original_invoice_id and oi.user_id = auth.uid() and oi.status = 'issued'
      )
    )
  );

drop policy if exists "invoice_saves_update_own_draft" on public.invoice_saves;
create policy "invoice_saves_update_own_draft" on public.invoice_saves
  for update to authenticated
  using (auth.uid() = user_id and status = 'draft')
  with check (
    auth.uid() = user_id and status = 'draft' and number is null and issued_at is null
    and (
      invoice_saves.original_invoice_id is null
      or exists (
        select 1 from public.invoice_saves oi
        where oi.id = invoice_saves.original_invoice_id and oi.user_id = auth.uid() and oi.status = 'issued'
      )
    )
  );

-- ---------------------------------------------------------------------
-- 4. storage
-- ---------------------------------------------------------------------
-- Phone photos can be several MB, so site images get 10MB. Logos keep
-- the 4MB the upload form already enforces (5MB here), and may be SVG —
-- they're only ever shown through <img>, where SVG can't run scripts.
update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
where id = 'site-images';
update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']
where id = 'logos';

drop policy if exists "Public read access for site-images" on storage.objects;
drop policy if exists "Owner can list own site-images" on storage.objects;
create policy "Owner can list own site-images" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 5. server-only tables: no direct access from the browser at all
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['contact_messages', 'hosted_site_pages', 'license_redemptions', 'invoice_counters',
                           'admin_users', 'admin_audit_log'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
  -- Read-only for the signed-in user (their own rows, via existing policies).
  foreach t in array array['customer_profiles', 'ai_usage', 'ai_usage_daily'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('grant select on public.%I to authenticated', t);
    end if;
  end loop;
  if to_regclass('public.usage_events') is not null then
    revoke all on public.usage_events from anon, authenticated;
    grant insert on public.usage_events to authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. atomic AI quota
-- ---------------------------------------------------------------------
-- Takes one slot and returns the new count, or NULL when the limit is
-- already reached. p_daily = true → per-day quota (Pro), else lifetime.
create or replace function public.ai_usage_reserve(p_user_id uuid, p_tool text, p_limit integer, p_daily boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit is null or p_limit <= 0 then
    return null;
  end if;
  if p_daily then
    insert into public.ai_usage_daily as u (user_id, tool, day, count, updated_at)
    values (p_user_id, p_tool, current_date, 1, now())
    on conflict (user_id, tool, day) do update
      set count = u.count + 1, updated_at = now()
      where u.count < p_limit
    returning u.count into v_count;
  else
    insert into public.ai_usage as u (user_id, tool, count, updated_at)
    values (p_user_id, p_tool, 1, now())
    on conflict (user_id, tool) do update
      set count = u.count + 1, updated_at = now()
      where u.count < p_limit
    returning u.count into v_count;
  end if;
  return v_count;
end;
$$;

-- Hands a slot back (the AI call failed, or a refusal turned out free).
create or replace function public.ai_usage_release(p_user_id uuid, p_tool text, p_daily boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_daily then
    update public.ai_usage_daily set count = greatest(count - 1, 0), updated_at = now()
    where user_id = p_user_id and tool = p_tool and day = current_date;
  else
    update public.ai_usage set count = greatest(count - 1, 0), updated_at = now()
    where user_id = p_user_id and tool = p_tool;
  end if;
end;
$$;

revoke all on function public.ai_usage_reserve(uuid, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.ai_usage_release(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.ai_usage_reserve(uuid, text, integer, boolean) to service_role;
grant execute on function public.ai_usage_release(uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------
-- 7. license_redemptions: verified purchase + receipt sent once
-- ---------------------------------------------------------------------
alter table public.license_redemptions add column if not exists purchase jsonb;
alter table public.license_redemptions add column if not exists receipt_sent_at timestamptz;
