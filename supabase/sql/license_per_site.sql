-- A website license (199 ₪) now removes the DeskKit badge from ONE site —
-- the site it was redeemed for — instead of every site the account builds
-- on that template. Matches what the buyer is told ("לאתר שבניתם כרגע")
-- and makes the template column irrelevant to payment.
--
-- Existing purchases keep what they paid for: each one is bound to that
-- account's site on that template (the published one first). A purchase
-- with no matching site stays template-wide, exactly as before.
-- Schedule-builder licenses are not affected. Safe to run more than once.

alter table public.license_redemptions
  add column if not exists site_project_id uuid references public.site_projects(id) on delete set null;

create unique index if not exists license_redemptions_site_project_uniq
  on public.license_redemptions (site_project_id) where site_project_id is not null;

do $$
declare
  r record;
  target uuid;
begin
  for r in
    select license_key, user_id, template from public.license_redemptions
    where site_project_id is null and template <> 'schedule-builder'
    order by redeemed_at
  loop
    select sp.id into target
    from public.site_projects sp
    where sp.user_id = r.user_id and sp.template = r.template
      and not exists (select 1 from public.license_redemptions o where o.site_project_id = sp.id)
    order by (sp.published_at is null), sp.published_at desc, sp.created_at
    limit 1;
    if target is not null then
      update public.license_redemptions set site_project_id = target where license_key = r.license_key;
    end if;
  end loop;
end $$;

-- The signed-in user's paid sites (ids only), for the builder's "badge
-- removed" state. license_redemptions itself stays closed to the browser.
create or replace function public.my_licensed_sites()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(site_project_id), '{}')
  from public.license_redemptions
  where user_id = auth.uid() and site_project_id is not null;
$$;

revoke all on function public.my_licensed_sites() from public, anon;
grant execute on function public.my_licensed_sites() to authenticated;

select 'site licenses bound to a site' as check, count(*)::int as n
  from public.license_redemptions where site_project_id is not null
union all
select 'site licenses still template-wide (no matching site)', count(*)::int
  from public.license_redemptions where site_project_id is null and template <> 'schedule-builder';
