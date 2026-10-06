-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Replaces Formspree as where contact-form and feedback-widget
-- submissions actually live. Formspree's free tier only keeps 30 days
-- of history before a message becomes unreadable behind a paid plan —
-- real messages from real visitors were disappearing. This table is
-- permanent, lives in the same Supabase project as everything else,
-- and costs nothing extra.
--
-- No RLS policy here grants ANY direct client access, on purpose —
-- same pattern as invoice_counters: the only things that ever touch
-- this table are supabase/functions/submit-contact-message (the public
-- insert path, anonymous visitors included — it runs with the
-- service-role key, which bypasses RLS entirely) and
-- supabase/functions/admin-stats (the admin-only read/delete path,
-- gated by its own ADMIN_EMAILS allowlist). A visitor's own anon-key
-- session should never be able to read, list, or delete anyone's
-- messages, including their own.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('contact', 'feedback')),
  name text,
  email text,
  rating integer check (rating is null or (rating between 1 and 5)),
  message text not null,
  page text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx on contact_messages (created_at desc);

alter table contact_messages enable row level security;
-- Deliberately zero policies: RLS enabled with no policies means even
-- an authenticated user's own anon-key session is refused by default
-- for every operation. Only the service-role key (used exclusively by
-- the two Edge Functions above) can read or write this table at all.
