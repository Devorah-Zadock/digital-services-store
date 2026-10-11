-- DeskKit Automate — LIVE install mode. Runs in the same transaction right
-- after 10_engine.sql, and only does something the very first time:
--   * the emergency stop is ON  → the worker does nothing (no runs, no emails)
--   * access = allowlist, empty → nobody can use the app yet
-- Later runs of the install (re-applying 10_engine.sql) never undo what the
-- owner changed since, because the "installed" marker already exists.
do $$
begin
  if not exists (select 1 from public.automate_settings where key = 'installed') then
    insert into public.automate_settings (key, value)
    values ('installed', jsonb_build_object('at', now(), 'mode', 'disabled'));
    update public.automate_settings
       set value = jsonb_build_object('on', true, 'reason', 'הותקן במצב מושבת — עד שמפעילים מאזור הניהול', 'at', now()),
           updated_at = now()
     where key = 'kill_switch';
    update public.automate_settings
       set value = '{"mode": "allowlist", "emails": []}'::jsonb, updated_at = now()
     where key = 'access';
  end if;
end $$;
