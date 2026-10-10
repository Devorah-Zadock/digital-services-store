-- The admin area's "מדדים" tab: totals and trends across the whole
-- service in one call (supabase/functions/admin-stats, action "metrics").
-- Counts only — no emails, names or content. Executable by the service
-- role only. Tables that don't exist (yet) simply count as 0.

create or replace function public.admin__count(p_table text, p_where text default 'true')
returns bigint
language plpgsql stable security definer set search_path = '' as $$
declare n bigint;
begin
  if to_regclass(p_table) is null then return 0; end if;
  execute format('select count(*) from %s where %s', p_table, p_where) into n;
  return n;
exception when others then
  return 0;
end;
$$;

create or replace function public.admin_metrics()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  signups jsonb;
  ai jsonb := '{}'::jsonb;
  ai_tools jsonb := '[]'::jsonb;
  ai_daily jsonb := '[]'::jsonb;
  licenses jsonb := '[]'::jsonb;
  downloads jsonb := '[]'::jsonb;
  storage_info jsonb := '[]'::jsonb;
begin
  -- New accounts per day, last 30 days (days with none included as 0).
  select coalesce(jsonb_agg(jsonb_build_object('d', d::date, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
    into signups
  from generate_series(current_date - 29, current_date, interval '1 day') d
  left join (
    select (created_at at time zone 'Asia/Jerusalem')::date as day, count(*) as n
    from public.customer_profiles
    where created_at >= current_date - 30
    group by 1
  ) c on c.day = d::date;

  if to_regclass('public.ai_usage_daily') is not null then
    select jsonb_build_object(
      'calls_today', coalesce(sum(count) filter (where day = current_date), 0),
      'calls_7d', coalesce(sum(count) filter (where day > current_date - 7), 0),
      'calls_30d', coalesce(sum(count) filter (where day > current_date - 30), 0),
      'users_30d', count(distinct user_id) filter (where day > current_date - 30))
      into ai from public.ai_usage_daily;
    select coalesce(jsonb_agg(jsonb_build_object('tool', tool, 'n', n) order by n desc), '[]'::jsonb) into ai_tools
    from (select tool, sum(count)::bigint n from public.ai_usage_daily where day > current_date - 30 group by tool) t;
    select coalesce(jsonb_agg(jsonb_build_object('d', d::date, 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb) into ai_daily
    from generate_series(current_date - 29, current_date, interval '1 day') d
    left join (select day, sum(count)::bigint n from public.ai_usage_daily where day > current_date - 30 group by day) c on c.day = d::date;
  end if;

  if to_regclass('public.license_redemptions') is not null then
    select coalesce(jsonb_agg(jsonb_build_object('product', product_id, 'total', total, 'last_30d', recent) order by total desc), '[]'::jsonb)
      into licenses
    from (select product_id, count(*) total, count(*) filter (where redeemed_at >= now() - interval '30 days') recent
          from public.license_redemptions group by product_id) l;
  end if;

  if to_regclass('public.usage_events') is not null then
    select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'n', n) order by n desc), '[]'::jsonb) into downloads
    from (select kind, count(*) n from public.usage_events
          where action = 'download' and created_at >= now() - interval '30 days' group by kind) e;
  end if;

  begin
    select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket_id, 'files', files, 'bytes', bytes) order by bytes desc), '[]'::jsonb)
      into storage_info
    from (select bucket_id, count(*) files, coalesce(sum((metadata->>'size')::bigint), 0) bytes
          from storage.objects group by bucket_id) s;
  exception when others then
    storage_info := '[]'::jsonb;
  end;

  result := jsonb_build_object(
    'generated_at', now(),
    'users', public.admin_dashboard_summary(),
    'signups_daily', signups,
    'new_today', public.admin__count('public.customer_profiles', $w$created_at >= date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'$w$),
    'sites', jsonb_build_object(
      'saved', public.admin__count('public.site_projects'),
      'saved_30d', public.admin__count('public.site_projects', $w$created_at >= now() - interval '30 days'$w$),
      'published', public.admin__count('public.hosted_site_pages'),
      'published_30d', public.admin__count('public.hosted_site_pages', $w$updated_at >= now() - interval '30 days'$w$)),
    'docs', jsonb_build_object(
      'cvs', public.admin__count('public.cv_saves'),
      'quotes', public.admin__count('public.quote_saves'),
      'invoices', public.admin__count('public.invoice_saves'),
      'invoices_issued', public.admin__count('public.invoice_saves', $w$status = 'issued'$w$),
      'schedules', public.admin__count('public.schedule_projects')),
    'licenses', licenses,
    'ai', ai || jsonb_build_object('by_tool', ai_tools, 'daily', ai_daily),
    'downloads_30d', downloads,
    'storage', storage_info,
    'db_bytes', pg_database_size(current_database()),
    'mail', jsonb_build_object(
      'subscribed', public.email_campaign_audience(),
      'unsubscribed', public.admin__count('public.customer_profiles', 'email_unsubscribed_at is not null'),
      'welcomes_30d', public.admin__count('public.customer_profiles', $w$welcome_sent_at >= now() - interval '30 days' and welcome_sent_at > created_at$w$),
      'sent_today', public.admin__count('public.email_sends', $w$sent_at >= date_trunc('day', now())$w$),
      'sent_30d', public.admin__count('public.email_sends', $w$sent_at >= now() - interval '30 days'$w$)),
    'messages_30d', public.admin__count('public.contact_messages', $w$created_at >= now() - interval '30 days'$w$)
  );
  return result;
end;
$$;

revoke all on function public.admin__count(text, text) from public, anon, authenticated;
revoke all on function public.admin_metrics() from public, anon, authenticated;
grant execute on function public.admin_metrics() to service_role;
