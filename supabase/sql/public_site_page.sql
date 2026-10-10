-- Public read of ONE published page, for the Cloudflare Worker that serves
-- customer sites on <slug>.deskkit.co.il (cloudflare/sites/index.js).
--
-- Published pages are public by definition (anyone can open the site), so
-- the Worker only needs the public anon key — no service-role key ever
-- leaves Supabase. hosted_site_pages itself stays closed to the browser;
-- this function returns nothing but the HTML of one existing page.
create or replace function public.public_site_page(p_slug text, p_page text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select h.pages ->> p_page
  from public.hosted_site_pages h
  where h.slug = lower(p_slug)
    and p_page in ('index', 'about', 'contact')
  limit 1;
$$;

revoke all on function public.public_site_page(text, text) from public;
grant execute on function public.public_site_page(text, text) to anon, authenticated, service_role;
