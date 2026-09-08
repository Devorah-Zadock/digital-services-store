-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Adds a place to save school schedule
-- projects (one row per saved project, not per user — a school may
-- keep separate projects per year/semester) so they show up in the
-- "my content" rail and can be reopened later, the same way a quote
-- or a site project already can.

create table if not exists schedule_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedule_projects_user_id_idx on schedule_projects (user_id);

alter table schedule_projects enable row level security;

drop policy if exists "schedule_projects_select_own" on schedule_projects;
create policy "schedule_projects_select_own" on schedule_projects
  for select using (auth.uid() = user_id);

drop policy if exists "schedule_projects_insert_own" on schedule_projects;
create policy "schedule_projects_insert_own" on schedule_projects
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedule_projects_update_own" on schedule_projects;
create policy "schedule_projects_update_own" on schedule_projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedule_projects_delete_own" on schedule_projects;
create policy "schedule_projects_delete_own" on schedule_projects
  for delete using (auth.uid() = user_id);
