-- STAGING ONLY: every test account may use Automate.
update public.automate_settings set value = '{"mode": "open", "emails": []}', updated_at = now() where key = 'access';
