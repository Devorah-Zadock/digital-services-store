-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run. Converts cv_saves from one row PER USER
-- (upserted by user_id — editing a CV WAS creating/overwriting the only
-- one a user could ever have) to one row per SAVED CV, same shape as
-- quote_saves/invoice_saves/site_projects already use — so a user can
-- finally have more than one CV, with a real "My CVs" list instead of
-- always resuming whichever one they last touched.
--
-- cv_saves has no CREATE TABLE anywhere in this repo (created directly
-- in Supabase Studio early in the project, see core_tables_rls_verify
-- .sql's own comment on this) — this is an ALTER migration against the
-- real, already-populated table, not a fresh create. It does not touch
-- any existing row's data, only adds columns and changes which
-- column(s) identify a row as unique.
--
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / IF
-- EXISTS / DROP-then-CREATE), so running this twice does nothing extra
-- the second time.

-- id: every existing row gets its own fresh random id here (the
-- DEFAULT runs per row during this ALTER, since gen_random_uuid() is
-- volatile — Postgres can't just backfill one shared value). From this
-- point on, a row's real identity is its id, not its user_id.
alter table cv_saves add column if not exists id uuid not null default gen_random_uuid();

-- created_at: existing rows get "now" as a best-effort stand-in — the
-- real creation date was never recorded, so this is the closest honest
-- answer, not a fabricated backfill of fake history.
alter table cv_saves add column if not exists created_at timestamptz not null default now();

-- The original table almost certainly has user_id as its primary key
-- (that's what made saveCvNow()'s plain `.upsert({user_id,...})`
-- overwrite the same row every time, with no onConflict needed) —
-- Postgres' default name for an unnamed primary key is
-- "<table>_pkey", so that's what this drops. If this table's PK was
-- ever renamed by hand, this statement is a safe no-op (IF EXISTS) and
-- the next statement (making id the PK) will fail with a clear
-- "multiple primary keys" error telling you the real constraint name
-- to drop instead — check Table Editor → cv_saves → the key icon next
-- to user_id if that happens.
alter table cv_saves drop constraint if exists cv_saves_pkey;

alter table cv_saves add primary key (id);

-- Dropping user_id's own primary key above also dropped the index that
-- came with it — every query here still filters by user_id (my CVs,
-- RLS), so this replaces it explicitly rather than leaving those scans
-- unindexed.
create index if not exists cv_saves_user_id_idx on cv_saves (user_id);

-- RLS policies already exist and are already correct for multiple rows
-- per user (every one of the 4 already scopes on auth.uid() = user_id,
-- none ever assumed exactly one row) — see core_tables_rls_verify.sql's
-- own cv_saves block. Nothing to change here.
