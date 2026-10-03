-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Until now, every hero photo / gallery photo a customer uploaded in the
-- site builder was read via FileReader.readAsDataURL and stored as a
-- base64 string directly inside site_projects.data (and, once published,
-- baked straight into the HTML saved in hosted_site_pages — see
-- js/site-builder.js's s-photo/s-gallery change handlers and
-- api/site-preview.js). That works, but doesn't scale: a single 6MB photo
-- becomes ~8MB of base64 text sitting in a database row, re-sent on every
-- single page view (no separate caching for the image at all, since it's
-- not a real asset — it's part of the HTML text itself).
--
-- This bucket is where new uploads go instead — same "logos" bucket
-- pattern already used by invoice-app.js/quote-app.js
-- (storage.from("logos").upload/getPublicUrl), just for site photos.
-- siteState.data.heroImage/heroImages then hold a short public URL
-- string instead of a multi-megabyte data: URI — site-templates.js and
-- site-builder.js's preview code never cared which kind of string it
-- was (both just go into src="..."), so nothing else needs to change,
-- and every already-published site keeps working exactly as before:
-- this is additive only, nothing here touches or migrates old data.
--
-- Path convention (enforced by the policies below): "<user id>/<...>",
-- e.g. "3fa2.../local-service/hero.jpg" — the policies key off the
-- first path segment being the uploader's own auth.uid(), so one
-- customer can never overwrite or delete another's files.

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

-- Public bucket (above) already serves plain GETs to anyone, with no
-- login needed — required, since these images appear on public,
-- unauthenticated customer websites. This policy is what additionally
-- lets the dashboard/storage API list/select them the same way.
create policy "Public read access for site-images"
on storage.objects for select
using (bucket_id = 'site-images');

create policy "Users can upload their own site images"
on storage.objects for insert
with check (bucket_id = 'site-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can replace their own site images"
on storage.objects for update
using (bucket_id = 'site-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own site images"
on storage.objects for delete
using (bucket_id = 'site-images' and (storage.foldername(name))[1] = auth.uid()::text);
