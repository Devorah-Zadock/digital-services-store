-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Lets a self-hosted site_projects row carry the customer's OWN domain
-- (e.g. www.theirbusiness.co.il) in addition to its free
-- <slug>.sites.deskkit.co.il address — see connect-custom-domain and
-- custom-domain-status Edge Functions, and middleware.js's second
-- routing branch (anything that isn't deskkit.co.il/www/*.vercel.app/
-- *.sites.deskkit.co.il is treated as a possible customer custom domain
-- and looked up here).
--
-- Partial unique index (only enforced where custom_domain is not null)
-- for the same reason as site_projects_slug.sql: every existing row has
-- none yet.

alter table site_projects
  add column if not exists custom_domain text;

create unique index if not exists site_projects_custom_domain_idx
  on site_projects(custom_domain)
  where custom_domain is not null;
