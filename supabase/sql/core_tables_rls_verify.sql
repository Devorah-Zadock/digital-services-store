-- SAFETY-NET SCRIPT — read the comment below before running this.
--
-- site_projects, cv_saves and profiles are the three tables this project
-- actually relies on most (site content, CV content, business profile —
-- exactly the kind of data a security review has to check) but, unlike
-- every other table in supabase/sql/, none of them has a CREATE TABLE or
-- RLS-policy file anywhere in this repo. That almost certainly means
-- they were created directly in Supabase Studio's table editor early in
-- the project, before this repo's "commit every schema change as SQL"
-- habit started — not that anything is actually wrong with them; the
-- existing app code (delete-account.ts, admin-stats.ts) already assumes
-- they have a user_id/id column and behaves as if RLS is on. But since
-- nothing in the repo proves that, it can't be verified from code alone.
--
-- BEFORE running anything below:
--   1. Open Supabase Dashboard → Table Editor → for site_projects,
--      cv_saves and profiles, check the "RLS" toggle at the top of each
--      table is ON (green).
--   2. Open Authentication → Policies (or Database → Policies) and
--      confirm each of those three tables has policies restricting
--      select/insert/update/delete to auth.uid() = user_id (or, for
--      profiles, auth.uid() = id).
--   3. Only if either check comes back missing or wrong, run the
--      matching block below. Every statement is idempotent (drop-then-
--      create, never a blind create) — safe to run even if some of this
--      is already in place, it just re-installs the same policy.
--
-- This script does NOT alter any table's columns, does NOT touch
-- existing data, and does NOT create these tables (they already exist).

-- ============ site_projects ============
alter table site_projects enable row level security;

drop policy if exists "site_projects_select_own" on site_projects;
create policy "site_projects_select_own" on site_projects
  for select using (auth.uid() = user_id);

drop policy if exists "site_projects_insert_own" on site_projects;
create policy "site_projects_insert_own" on site_projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "site_projects_update_own" on site_projects;
create policy "site_projects_update_own" on site_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "site_projects_delete_own" on site_projects;
create policy "site_projects_delete_own" on site_projects
  for delete using (auth.uid() = user_id);

-- ============ cv_saves ============
alter table cv_saves enable row level security;

drop policy if exists "cv_saves_select_own" on cv_saves;
create policy "cv_saves_select_own" on cv_saves
  for select using (auth.uid() = user_id);

drop policy if exists "cv_saves_insert_own" on cv_saves;
create policy "cv_saves_insert_own" on cv_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "cv_saves_update_own" on cv_saves;
create policy "cv_saves_update_own" on cv_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cv_saves_delete_own" on cv_saves;
create policy "cv_saves_delete_own" on cv_saves
  for delete using (auth.uid() = user_id);

-- ============ profiles ============
-- Identifying column here is "id" (= the auth user's own id), not
-- "user_id" — confirmed by delete-account.ts's own USER_TABLES loop,
-- which special-cases profiles to filter on "id".
alter table profiles enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on profiles;
create policy "profiles_delete_own" on profiles
  for delete using (auth.uid() = id);
