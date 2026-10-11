-- Read-only (public log): who entered the admin area recently, and from which
-- signed-in session / device. Emails and IP addresses are replaced by short
-- one-way fingerprints (same address → same fingerprint), and the browser
-- string is reduced to "device / browser". Times are Israel time.
with admins as (
  select u.id, left(md5(lower(u.email)), 6) as who
    from auth.users u
   where lower(u.email) in (select lower(email) from public.admin_secrets)
      or lower(u.email) in (select lower(email) from public.admin_users)
),
ua as (
  select s.id, s.user_id, s.created_at, coalesce(s.refreshed_at, s.updated_at) as last_seen, s.not_after,
         left(md5(coalesce(host(s.ip), '')), 6) as net,
         (case when s.user_agent ilike '%iphone%' then 'iPhone' when s.user_agent ilike '%ipad%' then 'iPad'
               when s.user_agent ilike '%android%' then 'Android' when s.user_agent ilike '%windows%' then 'Windows'
               when s.user_agent ilike '%mac os%' then 'Mac' when s.user_agent ilike '%linux%' then 'Linux' else 'other' end)
         || ' / ' ||
         (case when s.user_agent ilike '%edg/%' then 'Edge' when s.user_agent ilike '%samsungbrowser%' then 'Samsung'
               when s.user_agent ilike '%chrome/%' or s.user_agent ilike '%crios/%' then 'Chrome'
               when s.user_agent ilike '%firefox/%' or s.user_agent ilike '%fxios/%' then 'Firefox'
               when s.user_agent ilike '%safari/%' then 'Safari' else 'other' end) as device
    from auth.sessions s
   where s.user_id in (select id from admins)
)
select '1-admin-event' as kind, to_char(l.created_at at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI:SS') as at,
       left(md5(lower(l.admin_email)), 6) as who, l.action as what, '' as device, '' as net
  from public.admin_audit_log l
 where l.created_at > now() - interval '3 days'
   and l.action in ('admin_unlock', 'admin_unlock_failed', 'admin_unlock_locked', 'set_admin_password', 'admin_confirm_failed')
union all
select '2-session', to_char(ua.created_at at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI:SS'),
       a.who, 'session started; last active ' || coalesce(to_char(ua.last_seen at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI'), '?'),
       ua.device, ua.net
  from ua join admins a on a.id = ua.user_id
union all
select '3-auth-log', to_char(e.created_at at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI:SS'),
       a.who, coalesce(e.payload ->> 'action', '?'), '', left(md5(coalesce(e.ip_address, '')), 6)
  from auth.audit_log_entries e join admins a on a.id::text = e.payload ->> 'actor_id'
 where e.created_at > now() - interval '3 days'
   and coalesce(e.payload ->> 'action', '') not in ('token_refreshed', 'token_revoked')
order by 1, 2;
