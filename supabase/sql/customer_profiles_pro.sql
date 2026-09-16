-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Adds the Pro flag: is_pro starts false for
-- everyone and is flipped to true manually (or later, by a real payment
-- webhook) once someone pays the one-time Pro unlock. Two things read it
-- — the ats-check Edge Function (to skip the free 3-attempt cap and use
-- the more generous daily fair-use cap instead) and the CV builder
-- itself client-side (to skip printing the "Created with DeskKit.co.il"
-- credit line on a Pro user's exported PDF).
--
-- customer_profiles had no select policy at all before this — every read
-- went through admin-stats' service-role key. The builder needs to read
-- its OWN is_pro (and nothing else's) directly, so this adds a narrow
-- policy: a signed-in user can read only their own row.

alter table customer_profiles add column if not exists is_pro boolean not null default false;

alter table customer_profiles enable row level security;

drop policy if exists "read own profile" on customer_profiles;
create policy "read own profile" on customer_profiles
  for select to authenticated
  using (auth.uid() = id);
