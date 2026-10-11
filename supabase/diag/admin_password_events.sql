-- Read-only diagnosis (public log): admin password events, with emails
-- replaced by a short one-way fingerprint so different accounts can be
-- told apart without revealing them.
select 'secrets' as what, left(md5(email), 6) as who, to_char(updated_at, 'YYYY-MM-DD HH24:MI') as at, failed_count::text as extra
  from public.admin_secrets
union all
select 'event', left(md5(admin_email), 6), to_char(created_at, 'YYYY-MM-DD HH24:MI'), action
  from public.admin_audit_log
 where action in ('set_admin_password', 'admin_unlock', 'admin_unlock_failed', 'admin_unlock_locked')
   and created_at > now() - interval '30 days'
order by 3;
