-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Adds the columns the publish-site Edge
-- Function needs to remember where a site actually lives once it's
-- live, so republishing updates the same Netlify site instead of
-- creating a new one (and a new URL) every time.

alter table site_projects
  add column if not exists published_url text,
  add column if not exists netlify_site_id text,
  add column if not exists published_at timestamptz;
