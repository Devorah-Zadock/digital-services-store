-- Local SQL tests (plain Postgres + stubs.sql). Each block raises on failure.
\set ON_ERROR_STOP 1
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
do $$ begin
  if (select count(*) from public.contacts) <> 0 then raise exception 'B sees A contacts'; end if;
  if (select count(*) from public.automation_runs) <> 0 then raise exception 'B sees A runs'; end if;
end $$;
update public.contacts set name = 'hacked';
delete from public.contacts;
reset role;
do $$ begin if (select count(*) from public.contacts where name = 'ליד א') <> 1 then raise exception 'B changed A data'; end if; end $$;

-- anonymous visitors
set role anon;
do $$ begin
  begin perform 1 from public.contacts; raise exception 'anon read must fail';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

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
do $$ begin
  begin insert into public.invoice_tracking (invoice_id, due_date) values ('00000000-0000-0000-0000-0000000000f1', current_date); raise exception 'tracked B invoice';
  exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like '%tracked%' then raise; end if; end;
  begin insert into public.invoice_tracking (invoice_id, due_date) values ('00000000-0000-0000-0000-0000000000f2', current_date); raise exception 'tracked a draft';
  exception when insufficient_privilege or check_violation then null; when others then if sqlerrm like '%tracked%' then raise; end if; end;
end $$;
reset role;

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

-- cascading delete of a business removes everything it owns
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if exists (select 1 from public.contacts where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.automation_runs where user_id = '00000000-0000-0000-0000-00000000000a')
     or exists (select 1 from public.automation_messages where user_id = '00000000-0000-0000-0000-00000000000a') then raise exception 'data left after delete'; end if;
end $$;
select 'ALL LOCAL SQL TESTS PASSED' as result;
