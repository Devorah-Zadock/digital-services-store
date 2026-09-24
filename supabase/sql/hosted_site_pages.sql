-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Phase 1 of moving site-hosting off Netlify: this table is where a
-- published customer site's rendered HTML will live once "פרסום" writes
-- here instead of deploying to Netlify (that wiring is a later phase —
-- right now nothing writes to this table except a manual test row, and
-- nothing in the live product reads it yet). A new Vercel serverless
-- function (api/site-preview.js) reads it with the service-role key to
-- serve the page directly from DeskKit's own infrastructure — no
-- external host, no "deploy credits" of any kind.
--
-- Deliberately its own table, not a new column on site_projects: keeps
-- this whole experiment fully isolated from every real customer site/
-- account/purchase table while it's being built and tested.
--
-- RLS is enabled with NO policies at all — on purpose. This content is
-- meant to end up publicly readable once live, but only ever through the
-- serverless function's service-role key (server-side, key never reaches
-- a browser), never directly from a client with the anon key. No policy
-- needed for that, and none should ever be added for anon/authenticated
-- access to this table.

create table if not exists hosted_site_pages (
  slug text primary key,
  site_project_id uuid references site_projects(id) on delete cascade,
  html text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hosted_site_pages enable row level security;

-- After running this, insert one manual test row to try the pipeline
-- end to end, e.g.:
--   insert into hosted_site_pages (slug, html) values (
--     'test123',
--     '<!doctype html><html lang="he" dir="rtl"><body><h1>זה עובד!</h1></body></html>'
--   );
