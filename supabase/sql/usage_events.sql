-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Backs the admin dashboard's usage tracking
-- for the tools that don't otherwise leave a trace until something is
-- explicitly saved: opening the CV builder or the quote builder (someone
-- who edits/looks but never clicks "שמירה" left no record before this),
-- and downloading a free deck/xlsx template (previously not gated or
-- tracked at all — anyone could download without an account).
--
-- One row per real action: a signed-in user opening the CV builder,
-- opening the quote builder, or downloading a deck/xlsx file. RLS only
-- allows a user to insert their OWN rows (and never read/update/delete
-- any) — reading across all users, for the admin dashboard, is done by
-- the admin-stats Edge Function with its service-role key, same as every
-- other admin-only table in this project.

create table if not exists usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,       -- 'cv' | 'deck' | 'xlsx' | 'quote'
  slug text,                -- product/template slug, when relevant
  action text not null,     -- 'edit' | 'download'
  created_at timestamptz not null default now()
);

alter table usage_events enable row level security;

drop policy if exists "insert own usage events" on usage_events;
create policy "insert own usage events" on usage_events
  for insert to authenticated
  with check (auth.uid() = user_id);

create index if not exists usage_events_user_id_idx on usage_events(user_id);
create index if not exists usage_events_kind_slug_idx on usage_events(kind, slug);
