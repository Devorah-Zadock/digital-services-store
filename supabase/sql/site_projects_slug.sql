-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Part of moving site-hosting off Netlify (see hosted_site_pages.sql):
-- once a site is served from DeskKit's own infrastructure at
-- <slug>.deskkit.co.il, each site needs a real, customer-chosen, GLOBALLY
-- unique public name — separate from the internal id (a UUID, never
-- meant to be a public-facing address). Nothing writes this column yet;
-- it's only read/written by the new check-site-slug Edge Function while
-- that piece is being built and tested.
--
-- Partial unique index (only enforced where slug is not null) so every
-- existing site_projects row — which has no slug today — doesn't
-- collide with itself or block this from running.

alter table site_projects
  add column if not exists slug text;

create unique index if not exists site_projects_slug_idx
  on site_projects(slug)
  where slug is not null;
