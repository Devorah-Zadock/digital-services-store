-- Least privilege for the four tables added in October 2026
-- (email_list.sql, site_visits.sql). Supabase gives every new public table
-- full rights for the browser roles (anon, authenticated) by default; RLS
-- with no policies already blocked every row, so nothing was exposed —
-- this removes the rights themselves, as defence in depth. Only the
-- service role (Edge Functions) and the Management API use these tables,
-- and neither is affected.
--
-- Rollback (restores the previous state exactly):
--   grant all on public.email_campaigns, public.email_sends,
--     public.site_visits_daily, public.site_visits_top to anon, authenticated;

revoke all on table public.email_campaigns from anon, authenticated;
revoke all on table public.email_sends from anon, authenticated;
revoke all on table public.site_visits_daily from anon, authenticated;
revoke all on table public.site_visits_top from anon, authenticated;

-- Printed by the deploy log: must be 0 rows.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('email_campaigns', 'email_sends', 'site_visits_daily', 'site_visits_top')
  and grantee in ('anon', 'authenticated');
