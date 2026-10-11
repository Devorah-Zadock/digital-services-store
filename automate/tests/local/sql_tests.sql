-- Local SQL tests (plain Postgres + stubs.sql). Each block raises on failure.
\set ON_ERROR_STOP 1
-- Like staging: Automate open to every test account (the pilot gate has its own tests below).
update public.automate_settings set value = '{"mode": "open", "emails": []}' where key = 'access';
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com') on conflict do nothing;
insert into public.automations (user_id, template_key, trigger_type) values
  ('00000000-0000-0000-0000-00000000000a', 'lead_autopilot', 'lead.created'),
  ('00000000-0000-0000-0000-00000000000a', 'quote_followup', 'quote.sent'),
  ('00000000-0000-0000-0000-00000000000a', 'client_onboarding', 'client.won') on conflict do nothing;

-- as business A (browser role)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set request.jwt.claim.role = 'authenticated';
insert into public.contacts (name, phone) values ('ליד א', '0501234567');
do $$ begin
  if (select count(*) from public.contacts) <> 1 then raise exception 'A should see 1 contact'; end if;
  if (select count(*) from public.automation_runs) <> 1 then raise exception 'manual lead should start 1 run'; end if;
end $$;
-- A cannot fake a site-form lead
do $$ begin
  begin insert into public.contacts (name, source) values ('fake', 'site_form'); raise exception 'site_form insert must fail';
  exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like '%must fail%' then raise; end if; end;
end $$;
-- A cannot write engine tables or read settings
do $$ begin
  begin insert into public.automations (user_id, template_key, trigger_type) values (auth.uid(), 'x', 'x'); raise exception 'automations insert must fail';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.automate_settings; raise exception 'settings read must fail';
  exception when insufficient_privilege then null; end;
  begin perform public.automate_emit(auth.uid(), 'x', null, null, 'k', '{}'); raise exception 'emit must fail';
  exception when insufficient_privilege then null; end;
end $$;
-- the owner can't move a contact to another account or change its source
update public.contacts set user_id = '00000000-0000-0000-0000-00000000000b', source = 'site_form' where name = 'ליד א';
do $$ begin
  if (select user_id from public.contacts where name = 'ליד א') <> auth.uid() then raise exception 'user_id changed'; end if;
  if (select source from public.contacts where name = 'ליד א') <> 'manual' then raise exception 'source changed'; end if;
end $$;
-- moving out of "new" marks handled
update public.contacts set stage = 'inprogress' where name = 'ליד א';
do $$ begin if (select handled_at from public.contacts where name = 'ליד א') is null then raise exception 'handled_at not set'; end if; end $$;

-- as business B
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
set request.jwt.claim.role = 'authenticated';
do $$ begin
  if (select count(*) from public.contacts) <> 0 then raise exception 'B sees A contacts'; end if;
  if (select count(*) from public.automation_runs) <> 0 then raise exception 'B sees A runs'; end if;
end $$;
update public.contacts set name = 'hacked';
delete from public.contacts;
reset role;
set request.jwt.claim.role = '';
do $$ begin if (select count(*) from public.contacts where name = 'ליד א') <> 1 then raise exception 'B changed A data'; end if; end $$;

-- anonymous visitors
set role anon;
do $$ begin
  begin perform 1 from public.contacts; raise exception 'anon read must fail';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set request.jwt.claim.role = '';

-- events are idempotent
do $$ declare n int; c uuid; begin
  select id into c from public.contacts where name = 'ליד א';
  n := public.automate_emit('00000000-0000-0000-0000-00000000000a', 'lead.created', 'contact', c, 'lead.created:' || c, '{}');
  if n <> 0 then raise exception 'duplicate event started % runs', n; end if;
end $$;

-- quotes: approval cancels waiting follow-ups and their unsent client emails
insert into public.quote_shares (user_id, client_name, client_email, snapshot) values ('00000000-0000-0000-0000-00000000000a', 'לקוח', 'c@example.com', '{}');
do $$ declare q uuid; r uuid; begin
  select id into q from public.quote_shares limit 1;
  select id into r from public.automation_runs where subject_id = q;
  if r is null then raise exception 'quote.sent started no run'; end if;
  update public.automation_runs set status = 'waiting' where id = r;
  insert into public.automation_messages (user_id, run_id, recipient_role, purpose, to_email, subject, html, idempotency_key, status)
    values ('00000000-0000-0000-0000-00000000000a', r, 'client', 'quote_reminder', 'c@example.com', 's', 'h', 'k1', 'pending_approval');
  update public.quote_shares set status = 'approved' where id = q;
  if (select status from public.automation_runs where id = r) <> 'cancelled' then raise exception 'follow-up not cancelled'; end if;
  if (select status from public.automation_messages where idempotency_key = 'k1') <> 'cancelled' then raise exception 'pending reminder not cancelled'; end if;
end $$;

-- import creates no runs; won insert starts onboarding
do $$ declare before int; after int; begin
  select count(*) into before from public.automation_runs;
  insert into public.contacts (user_id, name, source, client_ref) values ('00000000-0000-0000-0000-00000000000a', 'imported', 'import', 'x1');
  select count(*) into after from public.automation_runs;
  if after <> before then raise exception 'import started a run'; end if;
  insert into public.contacts (user_id, name, stage) values ('00000000-0000-0000-0000-00000000000a', 'won direct', 'won');
  if (select count(*) from public.automation_runs where template_key = 'client_onboarding') <> 1 then raise exception 'won insert did not start onboarding'; end if;
end $$;

-- invoice tracking: only own, issued invoices
insert into public.invoice_saves (id, user_id, status, number) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000b', 'issued', 7),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000a', 'draft', null);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set request.jwt.claim.role = 'authenticated';
do $$ begin
  begin insert into public.invoice_tracking (invoice_id, due_date) values ('00000000-0000-0000-0000-0000000000f1', current_date); raise exception 'tracked B invoice';
  exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like '%tracked%' then raise; end if; end;
  begin insert into public.invoice_tracking (invoice_id, due_date) values ('00000000-0000-0000-0000-0000000000f2', current_date); raise exception 'tracked a draft';
  exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like '%tracked%' then raise; end if; end;
end $$;
reset role;
set request.jwt.claim.role = '';

-- quota: runs blocked when the monthly limit is reached
do $$ declare n int; c uuid; begin
  insert into public.automate_usage (user_id, period, runs) values ('00000000-0000-0000-0000-00000000000a', public.automate_month(), 300)
    on conflict (user_id, period) do update set runs = 300;
  insert into public.contacts (user_id, name) values ('00000000-0000-0000-0000-00000000000a', 'over quota') returning id into c;
  if exists (select 1 from public.automation_runs where subject_id = c) then raise exception 'run created over quota'; end if;
  if (select status from public.automations where template_key = 'lead_autopilot' and user_id = '00000000-0000-0000-0000-00000000000a') <> 'blocked_quota' then raise exception 'not blocked'; end if;
  if not exists (select 1 from public.automate_alerts where kind = 'quota_runs') then raise exception 'no alert'; end if;
  -- email allowance
  update public.automate_usage set emails = 199 where user_id = '00000000-0000-0000-0000-00000000000a';
  if not public.automate_take_email('00000000-0000-0000-0000-00000000000a') then raise exception 'email 200 refused'; end if;
  if public.automate_take_email('00000000-0000-0000-0000-00000000000a') then raise exception 'email 201 allowed'; end if;
end $$;

-- claim: due runs only, and a claimed run is not claimed again
do $$ declare n int; m int; begin
  update public.automation_runs set status = 'queued', next_run_at = now() - interval '1 minute' where status in ('queued', 'waiting');
  select count(*) into n from public.automate_claim_runs(100);
  select count(*) into m from public.automate_claim_runs(100);
  if n = 0 or m <> 0 then raise exception 'claim n=% m=%', n, m; end if;
end $$;

-- attention list works
do $$ begin
  update public.contacts set created_at = now() - interval '5 hours', stage = 'new', handled_at = null where name = 'over quota';
  if not exists (select 1 from public.automate_attention('00000000-0000-0000-0000-00000000000a') where kind = 'lead_unhandled') then raise exception 'attention missing lead'; end if;
end $$;

-- retention: old finished work is removed, waiting work is kept
do $$ declare res jsonb; keep int; begin
  update public.automation_runs set status = 'succeeded', finished_at = now() - interval '100 days' where template_key = 'quote_followup';
  update public.automation_runs set status = 'waiting', created_at = now() - interval '100 days' where template_key = 'client_onboarding';
  res := public.automate_cleanup();
  if (res ->> 'runs')::int < 1 then raise exception 'old runs not cleaned: %', res; end if;
  select count(*) into keep from public.automation_runs where template_key = 'client_onboarding';
  if keep < 1 then raise exception 'waiting run was deleted'; end if;
end $$;

-- cascading delete of a business removes everything it owns
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if exists (select 1 from public.contacts where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.automation_runs where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.automation_messages where user_id = '00000000-0000-0000-0000-00000000000a') then raise exception 'data left after delete'; end if;
end $$;
select 'ALL LOCAL SQL TESTS PASSED' as result;

-- Admin card: counts only, kill switch round-trip, browser roles locked out.
insert into public.automations (user_id, template_key, trigger_type) values
  ('00000000-0000-0000-0000-00000000000b', 'lead_autopilot', 'lead.created') on conflict do nothing;
do $$ declare o jsonb; k jsonb; begin
  o := public.automate_admin_overview();
  if (o ->> 'businesses')::int < 1 then raise exception 'overview should count businesses: %', o; end if;
  if o ? 'to_email' or o::text like '%@example.com%' then raise exception 'overview must not expose emails'; end if;
  k := public.automate_set_kill_switch(true, 'בדיקה');
  if not (public.automate_setting('kill_switch') ->> 'on')::boolean then raise exception 'kill switch should be on'; end if;
  perform public.automate_set_kill_switch(false, null);
  if (public.automate_setting('kill_switch') ->> 'on')::boolean then raise exception 'kill switch should be off'; end if;
end $$;
set role authenticated;
do $$ begin
  begin perform public.automate_set_kill_switch(true, 'x'); raise exception 'browser could flip the kill switch';
  exception when insufficient_privilege then null; end;
  begin perform public.automate_admin_overview(); raise exception 'browser could read the admin overview';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set request.jwt.claim.role = '';
select 'admin card tests passed';

-- Pilot access check used by the site builder.
update public.automate_settings set value = '{"mode": "allowlist", "emails": ["b@example.com"]}' where key = 'access';
set role authenticated;
set request.jwt.claims = '{"email": "B@example.com"}';
do $$ begin if not public.automate_my_access() then raise exception 'pilot account should have access'; end if; end $$;
set request.jwt.claims = '{"email": "a@example.com"}';
do $$ begin if public.automate_my_access() then raise exception 'non-pilot account must not have access'; end if; end $$;
set request.jwt.claims = '{}';
do $$ begin if public.automate_my_access() then raise exception 'no email → no access'; end if; end $$;
reset role;
set request.jwt.claim.role = '';
set role anon;
do $$ begin
  begin perform public.automate_my_access(); raise exception 'anon could call automate_my_access';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set request.jwt.claim.role = '';

-- LIVE install mode: first run disables, later runs never override the owner.
delete from public.automate_settings where key = 'installed';
\i automate/sql/20_live_disabled.sql
do $$ begin
  if not (public.automate_setting('kill_switch') ->> 'on')::boolean then raise exception 'install must start disabled'; end if;
  if public.automate_setting('access') ->> 'mode' <> 'allowlist' or jsonb_array_length(public.automate_setting('access') -> 'emails') <> 0 then raise exception 'install must start closed'; end if;
end $$;
select public.automate_set_kill_switch(false, null);
\i automate/sql/20_live_disabled.sql
do $$ begin
  if (public.automate_setting('kill_switch') ->> 'on')::boolean then raise exception 'a second install run must not re-disable'; end if;
end $$;
select 'pilot access + install mode tests passed';

-- Browser writes are for pilot accounts only (deleting own rows always works).
update public.automate_settings set value = '{"mode": "allowlist", "emails": ["b@example.com"]}' where key = 'access';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set request.jwt.claim.role = 'authenticated';
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "email": "a@example.com"}';
do $$ begin
  begin insert into public.contacts (name, phone) values ('לא בפיילוט', '0500000000'); raise exception 'non-pilot account could add a contact';
  exception when insufficient_privilege then null; end;
  begin insert into public.tasks (title) values ('x'); raise exception 'non-pilot account could add a task';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
set request.jwt.claim.role = 'authenticated';
set request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "email": "b@example.com"}';
insert into public.contacts (name, phone) values ('בפיילוט', '0500000001');
do $$ begin if (select count(*) from public.contacts where name = 'בפיילוט') <> 1 then raise exception 'pilot account should add a contact'; end if; end $$;
delete from public.contacts where name = 'בפיילוט';
reset role;
set request.jwt.claim.role = '';
update public.automate_settings set value = '{"mode": "open", "emails": []}' where key = 'access';
select 'pilot write gate tests passed';

-- New events: every finished job counts; a lead that's won stops being chased.
insert into public.automations (user_id, template_key, trigger_type) values
  ('00000000-0000-0000-0000-00000000000b', 'lead_nurture', 'lead.created'),
  ('00000000-0000-0000-0000-00000000000b', 'service_reminder', 'job.done') on conflict do nothing;
do $$ declare c uuid; n int; begin
  insert into public.contacts (user_id, name, email) values ('00000000-0000-0000-0000-00000000000b', 'ליד למעקב', 'n@example.com') returning id into c;
  if (select count(*) from public.automation_runs where subject_id = c and template_key = 'lead_nurture' and status = 'queued') <> 1 then raise exception 'lead_nurture should start'; end if;
  update public.contacts set stage = 'won' where id = c;
  if (select status from public.automation_runs where subject_id = c and template_key = 'lead_nurture') <> 'cancelled' then raise exception 'won should cancel lead_nurture'; end if;
  update public.contacts set job_done_at = now() - interval '200 days' where id = c;
  update public.contacts set job_done_at = now() where id = c;
  update public.contacts set notes = 'x' where id = c;   -- not a new job
  select count(*) into n from public.automation_runs where subject_id = c and template_key = 'service_reminder';
  if n <> 2 then raise exception 'each finished job should start its own reminder, got %', n; end if;
  if (select count(*) from public.automation_events where subject_id = c and type = 'job.done' and payload ? 'job_done_at') <> 2 then raise exception 'job.done should carry the job time'; end if;
end $$;
select 'new automation events tests passed';
