-- Read-only: how many sites are live on <slug>.sites.deskkit.co.il, split
-- into the owner's own (accounts that have used the admin area) and
-- everyone else's. Prints totals only — this repository's workflow logs
-- are public, so no slugs, emails or names.
select metric, n from (
  select 1 as o, 'published_sites_total' as metric, count(*)::int as n
    from public.hosted_site_pages
  union all
  select 2, 'published_sites_by_admins', count(*)::int
    from public.hosted_site_pages h join public.site_projects sp on sp.id = h.site_project_id
   where sp.user_id in (select distinct admin_user_id from public.admin_audit_log where admin_user_id is not null)
  union all
  select 3, 'published_sites_by_others', count(*)::int
    from public.hosted_site_pages h join public.site_projects sp on sp.id = h.site_project_id
   where sp.user_id not in (select distinct admin_user_id from public.admin_audit_log where admin_user_id is not null)
  union all
  select 4, 'other_owners', count(distinct sp.user_id)::int
    from public.hosted_site_pages h join public.site_projects sp on sp.id = h.site_project_id
   where sp.user_id not in (select distinct admin_user_id from public.admin_audit_log where admin_user_id is not null)
  union all
  select 5, 'published_last_30_days', count(*)::int
    from public.hosted_site_pages where updated_at > now() - interval '30 days'
  union all
  select 6, 'saved_sites_total', count(*)::int from public.site_projects
  union all
  select 7, 'hosted_pages_without_project', count(*)::int
    from public.hosted_site_pages where site_project_id is null
) s order by o;
