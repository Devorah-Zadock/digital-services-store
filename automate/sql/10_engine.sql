-- DeskKit Automate — data model and engine (Postgres side).
--
-- Applied ONLY to the staging project by .github/workflows/staging.yml
-- (never auto-applied to production; see automate/README.md).
-- Re-runnable: every statement is idempotent.
--
-- Design in one paragraph: an automation is one shared template (code,
-- automate/functions/_shared/automate/templates.ts) plus a row in
-- `automations` holding one business's settings. Business events (a lead
-- arrived, a quote was sent, an invoice is due…) are written by triggers
-- in the SAME transaction as the change that caused them, into
-- `automation_events` (unique key = never twice). Each event starts one
-- `automation_runs` row per matching active automation. A run is a cursor
-- over the template's steps; a wait is just `next_run_at` in the future —
-- no process stays open. The worker (Edge Function, every minute) claims
-- due runs with SKIP LOCKED, executes one step at a time, and writes every
-- outgoing email into `automation_messages` (an outbox with its own unique
-- key), which a separate dispatcher sends within daily caps, quiet hours
-- and the kill switch. Nothing is lost when a quota runs out: work waits.
--
-- Security: RLS on every table. Business data (contacts, tasks, invoice
-- tracking) is readable/writable by its owner only. Engine tables are
-- read-only for the owner and written only by the service role. Browser
-- roles get no rights at all on engine internals.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Settings: kill switch, plan limits, caps (service role only)
create table if not exists public.automate_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.automate_settings enable row level security;
revoke all on table public.automate_settings from anon, authenticated;

insert into public.automate_settings (key, value) values
  ('kill_switch', '{"on": false, "reason": null}'),
  -- Per-business monthly limits (free plan). Plans can be added later.
  ('plan_limits', '{"free": {"active_automations": 10, "runs_per_month": 300, "emails_per_month": 200}}'),
  -- Whole-system caps per day. The email provider's free plan allows 100
  -- a day in total; sign-up confirmations, password resets and welcome
  -- emails must always fit, so automations get at most this many.
  ('email_caps', '{"automation_daily": 30}'),
  -- Client-facing emails wait outside these hours (Israel time); owner
  -- alerts are sent any time.
  ('quiet_hours', '{"start": 21, "end": 8, "shabbat": true}')
on conflict (key) do nothing;

-- v1 → v2: a whole business pack plus review requests must fit.
update public.automate_settings
   set value = jsonb_set(value, '{free,active_automations}', '10'), updated_at = now()
 where key = 'plan_limits' and coalesce((value -> 'free' ->> 'active_automations')::int, 0) < 10;

create or replace function public.automate_setting(p_key text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select value from public.automate_settings where key = p_key;
$$;
revoke all on function public.automate_setting(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Business profile used in every message (asked once, in the setup wizard).
create table if not exists public.business_profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 1 and 120),
  business_type text check (char_length(business_type) <= 40),
  reply_email text check (char_length(reply_email) <= 254),     -- where clients' replies go
  notify_email text check (char_length(notify_email) <= 254),   -- where owner alerts go (default: account email)
  phone text check (char_length(phone) <= 40),
  updated_at timestamptz not null default now()
);
alter table public.business_profiles enable row level security;
revoke all on table public.business_profiles from anon, authenticated;
grant select, insert, update on table public.business_profiles to authenticated;
drop policy if exists business_profiles_owner_all on public.business_profiles;
create policy business_profiles_owner_all on public.business_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Contacts (the CRM, now server-side). Owner-only via RLS.
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_ref text check (char_length(client_ref) <= 100),   -- id from the browser CRM (import dedupe)
  name text not null check (char_length(name) between 1 and 200),
  phone text check (char_length(phone) <= 40),
  email text check (char_length(email) <= 254),
  amount numeric(12,2) not null default 0 check (amount >= 0 and amount < 10000000000),
  notes text check (char_length(notes) <= 5000),
  message text check (char_length(message) <= 5000),       -- what they wrote in a site form
  stage text not null default 'new' check (stage in ('new', 'inprogress', 'followup', 'won', 'lost')),
  source text not null default 'manual' check (source in ('manual', 'site_form', 'import')),
  site_project_id uuid,
  consent_contact boolean not null default false,          -- asked to be contacted (site form)
  handled_at timestamptz,                                  -- owner replied / took care of it
  job_done_at timestamptz,                                 -- work for this client finished
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_ref)
);
create index if not exists contacts_user_stage_idx on public.contacts (user_id, stage, created_at desc);
alter table public.contacts enable row level security;
revoke all on table public.contacts from anon, authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;
drop policy if exists contacts_owner_select on public.contacts;
drop policy if exists contacts_owner_insert on public.contacts;
drop policy if exists contacts_owner_update on public.contacts;
drop policy if exists contacts_owner_delete on public.contacts;
create policy contacts_owner_select on public.contacts for select to authenticated using (user_id = auth.uid());
-- A business adds contacts by hand or by import; "site_form" contacts are
-- created only by the lead-intake function (service role).
create policy contacts_owner_insert on public.contacts for insert to authenticated
  with check (user_id = auth.uid() and source in ('manual', 'import'));
create policy contacts_owner_update on public.contacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy contacts_owner_delete on public.contacts for delete to authenticated using (user_id = auth.uid());

-- The owner can't rewrite where a contact came from or move it to another account.
create or replace function public.contacts_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    if auth.role() = 'authenticated' then
      new.user_id := old.user_id;
      new.source := old.source;
      new.consent_contact := old.consent_contact;
      new.message := old.message;
      new.created_at := old.created_at;
    end if;
    -- Any move out of "new" counts as handled.
    if old.stage = 'new' and new.stage <> 'new' and new.handled_at is null then
      new.handled_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists contacts_guard on public.contacts;
create trigger contacts_guard before insert or update on public.contacts
  for each row execute function public.contacts_guard();

-- ---------------------------------------------------------------------
-- Tasks (follow-ups). Owner-only.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  origin text not null default 'manual' check (origin in ('manual', 'automation')),
  run_id uuid,
  step_key text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  unique (run_id, step_key)
);
create index if not exists tasks_user_open_idx on public.tasks (user_id, status, due_at);
alter table public.tasks enable row level security;
revoke all on table public.tasks from anon, authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
drop policy if exists tasks_owner_all on public.tasks;
create policy tasks_owner_all on public.tasks for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (contact_id is null or exists (
    select 1 from public.contacts c where c.id = contact_id and c.user_id = auth.uid())));

-- ---------------------------------------------------------------------
-- Quotes sent through DeskKit (a link the client opens). Service-written.
create table if not exists public.quote_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid,                                  -- quote_saves row it was made from
  contact_id uuid references public.contacts(id) on delete set null,
  client_name text not null check (char_length(client_name) between 1 and 200),
  client_email text not null check (char_length(client_email) between 3 and 254),
  title text check (char_length(title) <= 300),
  total numeric(12,2),
  snapshot jsonb not null,                        -- exactly what the client sees
  status text not null default 'sent' check (status in ('sent', 'approved', 'declined', 'cancelled', 'expired')),
  sent_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_name text check (char_length(decided_name) <= 200),
  decision_note text check (char_length(decision_note) <= 2000),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists quote_shares_user_idx on public.quote_shares (user_id, status, sent_at desc);
alter table public.quote_shares enable row level security;
revoke all on table public.quote_shares from anon, authenticated;
grant select on table public.quote_shares to authenticated;
drop policy if exists quote_shares_owner_select on public.quote_shares;
create policy quote_shares_owner_select on public.quote_shares for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Payment status of an issued invoice — kept apart from the invoice
-- itself, which must never change once issued. "Paid" is what the owner
-- marked; DeskKit has no bank connection and never claims to verify it.
create table if not exists public.invoice_tracking (
  invoice_id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_number int,
  client_name text check (char_length(client_name) <= 200),
  client_email text check (char_length(client_email) <= 254),
  amount numeric(12,2) check (amount >= 0),
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled')),
  paid_at timestamptz,
  paid_note text check (char_length(paid_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoice_tracking_user_idx on public.invoice_tracking (user_id, status, due_date);
alter table public.invoice_tracking enable row level security;
revoke all on table public.invoice_tracking from anon, authenticated;
grant select, insert, update, delete on table public.invoice_tracking to authenticated;
drop policy if exists invoice_tracking_owner_all on public.invoice_tracking;
create policy invoice_tracking_owner_all on public.invoice_tracking for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.invoice_saves i where i.id = invoice_id and i.user_id = auth.uid() and i.status = 'issued'));

create or replace function public.invoice_tracking_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.invoice_id := old.invoice_id;
    if new.status = 'paid' and old.status <> 'paid' then new.paid_at := coalesce(new.paid_at, now()); end if;
    if new.status <> 'paid' then new.paid_at := null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists invoice_tracking_guard on public.invoice_tracking;
create trigger invoice_tracking_guard before insert or update on public.invoice_tracking
  for each row execute function public.invoice_tracking_guard();

-- ---------------------------------------------------------------------
-- Engine tables (owner may read their own; only the service role writes)
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_key text not null,
  trigger_type text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'needs_attention', 'blocked_quota')),
  config jsonb not null default '{}',
  pack text,
  consecutive_failures int not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, template_key)
);
create index if not exists automations_trigger_idx on public.automations (user_id, trigger_type, status);

create table if not exists public.automation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  subject_type text,
  subject_id uuid,
  idempotency_key text not null,
  payload jsonb not null default '{}',
  runs_created int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id bigint references public.automation_events(id) on delete set null,
  template_key text not null,
  subject_type text,
  subject_id uuid,
  status text not null default 'queued' check (status in
    ('queued', 'running', 'waiting', 'retrying', 'succeeded', 'stopped', 'failed', 'cancelled')),
  step_index int not null default 0,
  next_run_at timestamptz not null default now(),
  attempt int not null default 0,
  locked_until timestamptz,
  context jsonb not null default '{}',
  outcome text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (automation_id, event_id)
);
create index if not exists automation_runs_due_idx on public.automation_runs (status, next_run_at);
create index if not exists automation_runs_subject_idx on public.automation_runs (user_id, subject_type, subject_id);

create table if not exists public.automation_run_steps (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_key text not null,
  status text not null check (status in ('ok', 'skipped', 'waiting', 'retry', 'failed', 'blocked')),
  summary text,
  error text,
  created_at timestamptz not null default now()
);
-- A step that completed is never completed again (no double action on retry/re-claim).
create unique index if not exists automation_run_steps_once on public.automation_run_steps (run_id, step_key) where status = 'ok';
create index if not exists automation_run_steps_user_idx on public.automation_run_steps (user_id, created_at desc);

create table if not exists public.automation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.automation_runs(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  recipient_role text not null check (recipient_role in ('owner', 'client')),
  purpose text not null,
  to_email text not null check (char_length(to_email) between 3 and 254),
  to_name text,
  from_name text,
  reply_to text,
  subject text not null check (char_length(subject) <= 300),
  html text not null,
  status text not null default 'queued' check (status in
    ('pending_approval', 'queued', 'sending', 'sent', 'simulated', 'deferred', 'failed', 'cancelled')),
  idempotency_key text not null unique,
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  provider_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists automation_messages_due_idx on public.automation_messages (status, next_attempt_at);
create index if not exists automation_messages_user_idx on public.automation_messages (user_id, created_at desc);

create table if not exists public.automate_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,               -- first day of the month
  runs int not null default 0,
  emails int not null default 0,
  primary key (user_id, period)
);

create table if not exists public.automate_alerts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,   -- null = for the DeskKit owner (system)
  level text not null check (level in ('info', 'warning', 'error')),
  kind text not null,
  message text not null,
  day date not null default ((now() at time zone 'Asia/Jerusalem')::date),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  notified_at timestamptz
);
-- One alert of a kind per business per day.
create unique index if not exists automate_alerts_once_a_day on public.automate_alerts
  (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), kind, day);

do $$
declare t text;
begin
  foreach t in array array['automations', 'automation_events', 'automation_runs', 'automation_run_steps',
                           'automation_messages', 'automate_usage', 'automate_alerts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_owner_select', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Alerts and usage helpers
create or replace function public.automate_alert(p_user uuid, p_level text, p_kind text, p_message text)
returns void language sql security definer set search_path = '' as $$
  insert into public.automate_alerts (user_id, level, kind, message)
  values (p_user, p_level, p_kind, p_message)
  on conflict do nothing;
$$;

create or replace function public.automate_limits(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(public.automate_setting('plan_limits') -> 'free',
                  '{"active_automations": 10, "runs_per_month": 300, "emails_per_month": 200}'::jsonb);
$$;

create or replace function public.automate_month() returns date
language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'Asia/Jerusalem')::date;
$$;

-- ---------------------------------------------------------------------
-- The one entry point for events. Unique per (business, key): a repeated
-- event (double click, retry, duplicate webhook) starts nothing new.
create or replace function public.automate_emit(
  p_user uuid, p_type text, p_subject_type text, p_subject_id uuid, p_key text, p_payload jsonb default '{}'
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_event bigint;
  v_auto record;
  v_limits jsonb := public.automate_limits(p_user);
  v_used int;
  v_created int := 0;
  v_run uuid;
begin
  insert into public.automation_events (user_id, type, subject_type, subject_id, idempotency_key, payload)
  values (p_user, p_type, p_subject_type, p_subject_id, p_key, coalesce(p_payload, '{}'))
  on conflict (user_id, idempotency_key) do nothing
  returning id into v_event;
  if v_event is null then return 0; end if;

  for v_auto in
    select id, template_key from public.automations
    where user_id = p_user and trigger_type = p_type and status = 'active'
  loop
    select runs into v_used from public.automate_usage where user_id = p_user and period = public.automate_month();
    if coalesce(v_used, 0) >= (v_limits ->> 'runs_per_month')::int then
      update public.automations set status = 'blocked_quota', updated_at = now() where id = v_auto.id;
      perform public.automate_alert(p_user, 'warning', 'quota_runs',
        'הגעתם למכסת ההפעלות החודשית. האוטומציות ימשיכו בתחילת החודש הבא.');
      continue;
    end if;
    insert into public.automation_runs (automation_id, user_id, event_id, template_key, subject_type, subject_id, context)
    values (v_auto.id, p_user, v_event, v_auto.template_key, p_subject_type, p_subject_id, jsonb_build_object('event', coalesce(p_payload, '{}')))
    on conflict (automation_id, event_id) do nothing
    returning id into v_run;
    if v_run is not null then
      v_created := v_created + 1;
      insert into public.automate_usage (user_id, period, runs) values (p_user, public.automate_month(), 1)
      on conflict (user_id, period) do update set runs = public.automate_usage.runs + 1;
    end if;
  end loop;
  update public.automation_events set runs_created = v_created where id = v_event;
  return v_created;
end;
$$;

-- Stop waiting runs about something that is settled (quote answered,
-- invoice paid…): reminders must never go out after that.
create or replace function public.automate_cancel_runs(p_user uuid, p_subject_type text, p_subject_id uuid, p_templates text[], p_reason text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.automation_runs set status = 'cancelled', outcome = p_reason, finished_at = now(), updated_at = now()
  where user_id = p_user and subject_type = p_subject_type and subject_id = p_subject_id
    and template_key = any (p_templates) and status in ('queued', 'waiting', 'retrying');
  get diagnostics n = row_count;
  -- and any of their emails still waiting to go out
  update public.automation_messages m set status = 'cancelled', error = p_reason
  where m.status in ('pending_approval', 'queued', 'deferred') and m.recipient_role = 'client'
    and m.run_id in (select id from public.automation_runs r where r.user_id = p_user and r.subject_type = p_subject_type
                       and r.subject_id = p_subject_id and r.template_key = any (p_templates));
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- Business events, written in the same transaction as the change.
create or replace function public.contacts_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- Contacts brought over from the browser CRM are history, not new
    -- events: they start nothing (no reminders, no welcome emails).
    if new.source = 'import' then return null; end if;
    -- A new enquiry starts lead handling; a client added straight as
    -- "won" (e.g. from an approved quote) starts onboarding instead.
    if new.stage = 'new' then
      perform public.automate_emit(new.user_id, 'lead.created', 'contact', new.id, 'lead.created:' || new.id,
        jsonb_build_object('source', new.source));
    elsif new.stage = 'won' then
      perform public.automate_emit(new.user_id, 'client.won', 'contact', new.id, 'client.won:' || new.id, '{}');
    end if;
  else
    if new.stage = 'won' and old.stage is distinct from 'won' then
      perform public.automate_emit(new.user_id, 'client.won', 'contact', new.id, 'client.won:' || new.id, '{}');
    end if;
    if new.job_done_at is not null and old.job_done_at is null then
      perform public.automate_emit(new.user_id, 'job.done', 'contact', new.id, 'job.done:' || new.id, '{}');
    end if;
    if new.stage = 'lost' and old.stage is distinct from 'lost' then
      perform public.automate_cancel_runs(new.user_id, 'contact', new.id,
        array['lead_autopilot', 'client_onboarding', 'review_request'], 'contact_lost');
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists contacts_events on public.contacts;
create trigger contacts_events after insert or update on public.contacts
  for each row execute function public.contacts_events();

create or replace function public.quote_shares_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.automate_emit(new.user_id, 'quote.sent', 'quote', new.id, 'quote.sent:' || new.id, '{}');
  elsif new.status <> old.status then
    if new.status in ('approved', 'declined', 'cancelled', 'expired') then
      perform public.automate_cancel_runs(new.user_id, 'quote', new.id, array['quote_followup'], 'quote_' || new.status);
    end if;
    if new.status = 'approved' then
      perform public.automate_emit(new.user_id, 'quote.approved', 'quote', new.id, 'quote.approved:' || new.id, '{}');
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists quote_shares_events on public.quote_shares;
create trigger quote_shares_events after insert or update on public.quote_shares
  for each row execute function public.quote_shares_events();

create or replace function public.invoice_tracking_events()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'unpaid' then
    perform public.automate_emit(new.user_id, 'invoice.tracked', 'invoice', new.invoice_id, 'invoice.tracked:' || new.invoice_id, '{}');
  elsif tg_op = 'UPDATE' and new.status <> old.status and new.status in ('paid', 'cancelled') then
    perform public.automate_cancel_runs(new.user_id, 'invoice', new.invoice_id, array['invoice_collect'], 'invoice_' || new.status);
  end if;
  return null;
end;
$$;
drop trigger if exists invoice_tracking_events on public.invoice_tracking;
create trigger invoice_tracking_events after insert or update on public.invoice_tracking
  for each row execute function public.invoice_tracking_events();

-- Daily: one "schedule.daily" event per business that has a daily automation.
create or replace function public.automate_emit_daily()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0; d text := to_char(now() at time zone 'Asia/Jerusalem', 'YYYY-MM-DD');
begin
  for r in select distinct user_id from public.automations where trigger_type = 'schedule.daily' and status = 'active' loop
    n := n + public.automate_emit(r.user_id, 'schedule.daily', null, null, 'daily:' || d, jsonb_build_object('day', d));
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------
-- Worker claims (SKIP LOCKED: two workers never take the same run; a run
-- whose worker died is taken again after its lock expires).
create or replace function public.automate_claim_runs(p_limit int)
returns setof public.automation_runs
language sql security definer set search_path = '' as $$
  update public.automation_runs r
     set status = 'running', locked_until = now() + interval '3 minutes', updated_at = now()
   where r.id in (
     select id from public.automation_runs
      where (status in ('queued', 'waiting', 'retrying') and next_run_at <= now())
         or (status = 'running' and locked_until < now())
      order by next_run_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked)
  returning r.*;
$$;

create or replace function public.automate_claim_messages(p_limit int)
returns setof public.automation_messages
language sql security definer set search_path = '' as $$
  update public.automation_messages m
     set status = 'sending', locked_until = now() + interval '5 minutes', attempts = m.attempts + 1
   where m.id in (
     select id from public.automation_messages
      where (status in ('queued', 'deferred') and next_attempt_at <= now())
         or (status = 'sending' and locked_until < now())
      order by next_attempt_at
      limit greatest(1, least(p_limit, 100))
      for update skip locked)
  returning m.*;
$$;

-- Emails handed to the provider today (whole system, Israel day).
create or replace function public.automate_emails_today()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.automation_messages
  where status in ('sent', 'simulated')
    and sent_at >= ((now() at time zone 'Asia/Jerusalem')::date)::timestamp at time zone 'Asia/Jerusalem';
$$;

-- Count one email against the business's monthly allowance; false = over.
create or replace function public.automate_take_email(p_user uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_limit int := (public.automate_limits(p_user) ->> 'emails_per_month')::int; v_used int;
begin
  insert into public.automate_usage (user_id, period, emails) values (p_user, public.automate_month(), 0)
  on conflict (user_id, period) do nothing;
  update public.automate_usage set emails = emails + 1
   where user_id = p_user and period = public.automate_month() and emails < v_limit
  returning emails into v_used;
  return v_used is not null;
end;
$$;

-- ---------------------------------------------------------------------
-- "What needs attention today" for the follow-up assistant.
create or replace function public.automate_attention(p_user uuid)
returns table (kind text, ref_id uuid, title text, reason text, amount numeric, since timestamptz, priority int)
language sql stable security definer set search_path = '' as $$
  select * from (
  select 'lead_unhandled'::text as kind, c.id as ref_id, c.name as title,
         'פנייה חדשה שעוד לא טופלה'::text as reason, c.amount as amount, c.created_at as since,
         (100 + least(extract(epoch from now() - c.created_at)::int / 3600, 99))::int as priority
    from public.contacts c
   where c.user_id = p_user and c.stage = 'new' and c.handled_at is null
     and c.created_at < now() - interval '2 hours'
  union all
  select 'quote_waiting', q.id, q.client_name,
         'הצעת מחיר בלי תשובה כבר ' || greatest(1, extract(day from now() - q.sent_at)::int) || ' ימים', q.total, q.sent_at,
         (80 + least(extract(day from now() - q.sent_at)::int, 19))::int
    from public.quote_shares q
   where q.user_id = p_user and q.status = 'sent' and q.sent_at < now() - interval '3 days'
  union all
  select 'invoice_overdue', i.invoice_id, coalesce(i.client_name, 'חשבונית ' || i.invoice_number),
         'חשבונית שמועד התשלום שלה עבר לפני ' || ((now() at time zone 'Asia/Jerusalem')::date - i.due_date) || ' ימים', i.amount,
         i.due_date::timestamptz, (90 + least(((now() at time zone 'Asia/Jerusalem')::date - i.due_date), 9))::int
    from public.invoice_tracking i
   where i.user_id = p_user and i.status = 'unpaid' and i.due_date < (now() at time zone 'Asia/Jerusalem')::date
  union all
  select 'task_overdue', t.id, t.title, 'משימה שהמועד שלה עבר', null::numeric, t.due_at, 70
    from public.tasks t
   where t.user_id = p_user and t.status = 'open' and t.due_at < now()
  union all
  select 'message_approval', m.id, coalesce(m.to_name, m.to_email), 'הודעה ללקוח מחכה לאישור שלך', null::numeric, m.created_at, 95
    from public.automation_messages m
   where m.user_id = p_user and m.status = 'pending_approval'
  union all
  select 'followup_stuck', c.id, c.name, 'בשלב פולו-אפ בלי שינוי כבר שבוע', c.amount, c.updated_at, 60
    from public.contacts c
   where c.user_id = p_user and c.stage = 'followup' and c.updated_at < now() - interval '7 days'
  ) items
  order by priority desc, since
  limit 50;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'automate_alert(uuid,text,text,text)', 'automate_limits(uuid)', 'automate_emit(uuid,text,text,uuid,text,jsonb)',
    'automate_cancel_runs(uuid,text,uuid,text[],text)', 'automate_emit_daily()', 'automate_claim_runs(integer)',
    'automate_claim_messages(integer)', 'automate_emails_today()', 'automate_take_email(uuid)', 'automate_attention(uuid)',
    'contacts_events()', 'quote_shares_events()', 'invoice_tracking_events()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
