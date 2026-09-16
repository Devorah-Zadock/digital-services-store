-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Adds a counter the publish-site Edge
-- Function uses to cap how many times a single site can be published/
-- republished for free — each publish is a real Netlify deploy, which
-- costs real Netlify credits, and a free account only gets 300/month.
-- Without a cap, one customer re-clicking "פרסום" repeatedly (by
-- accident or otherwise) could burn through the whole month's credits
-- for every other customer. The ZIP download stays completely
-- unlimited — it never touches Netlify at all.

alter table site_projects
  add column if not exists publish_count integer not null default 0;
