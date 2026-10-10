-- Customer sites moved from <slug>.sites.deskkit.co.il to
-- <slug>.deskkit.co.il (served by Cloudflare — see cloudflare/README.md).
-- Updates the stored "published at" link so "My sites" shows the new
-- address. Safe to run more than once. Old links keep working: Vercel
-- redirects them (middleware.js) during the transition.
update public.site_projects
set published_url = replace(published_url, '.sites.deskkit.co.il', '.deskkit.co.il')
where published_url like '%.sites.deskkit.co.il%';

select 'site links still on the old address' as check, count(*)::int as n
from public.site_projects where published_url like '%.sites.deskkit.co.il%';
