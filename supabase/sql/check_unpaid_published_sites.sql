-- READ-ONLY CHECK — run this once in the SQL Editor after deploying the
-- updated publish-site Edge Function (the one that now requires a
-- matching license_redemptions row before it will publish/republish a
-- site — see its own comment for why).
--
-- Finds any site that is ALREADY live (published_url is set) but has no
-- matching license_redemptions row for its (user, template) pair. Every
-- such row is either: (a) a real customer who legitimately paid before
-- this check existed, through some path that didn't leave a
-- license_redemptions row, or (b) a site published for free through the
-- gap this fix closes. Either way, its owner's NEXT click on "פרסום"
-- (a routine content update, not a new purchase) would now be refused —
-- worth knowing about before that happens to a real paying customer.
--
-- This query only reads data; it changes nothing.

select
  sp.id as site_project_id,
  sp.user_id,
  sp.template,
  sp.published_url,
  sp.published_at
from site_projects sp
where sp.published_url is not null
  and not exists (
    select 1 from license_redemptions lr
    where lr.user_id = sp.user_id and lr.template = sp.template
  )
order by sp.published_at desc;

-- If this returns rows for real, known customers: the simplest fix is a
-- manual backfill insert into license_redemptions for each one (you'd
-- need the original Gumroad license_key from their purchase email/
-- Gumroad dashboard, or a placeholder key if that's not available —
-- license_key only needs to be unique, it's not re-verified against
-- Gumroad once inserted this way):
--   insert into license_redemptions (license_key, product_id, user_id, template)
--   values ('<real-or-placeholder-key>', '<SITE_GUMROAD_CONFIG.productId from js/site-builder.js>', '<user_id>', '<template>')
--   on conflict (license_key) do nothing;
