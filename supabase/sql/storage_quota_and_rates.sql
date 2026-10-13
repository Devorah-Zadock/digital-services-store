-- Cost protection for hosting (safe to run more than once):
--   1. site-images: every user gets a storage allowance (40 MB free,
--      100 MB once they've bought anything). Nothing already uploaded is
--      touched or deleted — someone above the allowance keeps all their
--      images and just can't add new ones until they remove some.
--   2. site-images: 5 MB per file (was 10 MB). The builder now shrinks
--      photos to max 1920 px wide WebP/JPEG before uploading, so real
--      uploads are far below this.
--   3. A small per-user daily counter for actions that cost us something
--      (used for publishing: 40 publishes per user per day).
-- Note: security_hardening.sql also sets the site-images file size (10 MB);
-- if that file is ever re-run, re-run this one after it.

-- 1 + 2 ----------------------------------------------------------------
update storage.buckets
set file_size_limit = 5 * 1024 * 1024
where id = 'site-images';

create or replace function public.site_images_quota_bytes(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.license_redemptions where user_id = p_user) then 100::bigint * 1024 * 1024
    else 40::bigint * 1024 * 1024
  end;
$$;

create or replace function public.site_images_used_bytes(p_user uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(coalesce((metadata->>'size')::bigint, 0)), 0)::bigint
  from storage.objects
  where bucket_id = 'site-images' and name like p_user::text || '/%';
$$;

-- What the upload policy asks: is the caller still under their allowance?
create or replace function public.site_images_quota_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
     and public.site_images_used_bytes(auth.uid()) < public.site_images_quota_bytes(auth.uid());
$$;

revoke all on function public.site_images_quota_bytes(uuid) from public, anon, authenticated;
revoke all on function public.site_images_used_bytes(uuid) from public, anon, authenticated;
revoke all on function public.site_images_quota_ok() from public, anon;
grant execute on function public.site_images_quota_ok() to authenticated;

-- For the builder to show "X of Y MB used" (the caller's own numbers only).
create or replace function public.my_site_images_usage()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'used', public.site_images_used_bytes(auth.uid()),
    'quota', public.site_images_quota_bytes(auth.uid())
  )
  where auth.uid() is not null;
$$;
revoke all on function public.my_site_images_usage() from public, anon;
grant execute on function public.my_site_images_usage() to authenticated;

drop policy if exists "Users can upload their own site images" on storage.objects;
create policy "Users can upload their own site images"
on storage.objects for insert
with check (
  bucket_id = 'site-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.site_images_quota_ok()
);

-- 3 --------------------------------------------------------------------
create table if not exists public.user_action_daily (
  user_id uuid not null,
  action text not null,
  day date not null default current_date,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, action, day)
);
alter table public.user_action_daily enable row level security;
revoke all on public.user_action_daily from anon, authenticated;

-- Takes one slot for today; false once the user reached p_limit today.
create or replace function public.user_action_reserve(p_user_id uuid, p_action text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit is null or p_limit <= 0 then return false; end if;
  insert into public.user_action_daily as u (user_id, action, day, count, updated_at)
  values (p_user_id, p_action, current_date, 1, now())
  on conflict (user_id, action, day) do update
    set count = u.count + 1, updated_at = now()
    where u.count < p_limit
  returning u.count into v_count;
  return v_count is not null;
end;
$$;
revoke all on function public.user_action_reserve(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.user_action_reserve(uuid, text, integer) to service_role;
