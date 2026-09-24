-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Evolves hosted_site_pages.sql's original one-page-per-row shape into a
-- real multi-page one: a published site actually has up to 3 pages
-- (index/about/contact — same set publish-site already enforces via
-- ALLOWED_PAGE_NAMES), and api/site-preview.js needs to serve all three
-- under one slug, not just one. `pages` holds exactly the same
-- {index: "...", about: "...", contact: "..."} shape the client already
-- sends to publish-site today — no reshaping needed on the way in.
--
-- Safe to run even though this drops the old `html` column: the only
-- row that ever existed in this table was the manual 'test123' demo row
-- from proving Phase 1 worked, not real data.

alter table hosted_site_pages
  add column if not exists pages jsonb not null default '{}'::jsonb;

alter table hosted_site_pages
  drop column if exists html;

-- Re-run the demo row in the new shape if you want to keep trying
-- api/site-preview.js manually:
--   insert into hosted_site_pages (slug, pages) values (
--     'test123',
--     '{"index": "<!doctype html><html lang=\"he\" dir=\"rtl\"><body><h1>זה עובד!</h1></body></html>"}'::jsonb
--   ) on conflict (slug) do update set pages = excluded.pages;
