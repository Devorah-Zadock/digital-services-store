-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Backs the per-user attempt cap on every
-- AI-powered tool (starting with the ATS checker) — each call costs real
-- OpenAI credits, so a signed-in user gets a small number of free tries
-- per tool rather than unlimited calls. `tool` is a slug ('ats-check' for
-- now) so the same table covers future AI features without a new
-- migration each time.
--
-- The count itself is only ever written by the ats-check Edge Function
-- (via its service-role key) — there's no insert/update policy for
-- regular users, so nothing client-side can reset or fake its own
-- counter. The select policy exists only so the builder UI can show
-- "X out of 3 free checks left" without a round trip through the
-- Edge Function.

create table if not exists ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, tool)
);

alter table ai_usage enable row level security;

drop policy if exists "read own ai usage" on ai_usage;
create policy "read own ai usage" on ai_usage
  for select to authenticated
  using (auth.uid() = user_id);
