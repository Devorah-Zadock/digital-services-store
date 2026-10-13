-- Read-only usage snapshot for cost planning. Totals only — no emails,
-- names, ids or content (the deploy log is public). Changes nothing.
-- Run: Actions → Supabase deploy → run-sql → supabase/reports/usage_snapshot.sql
select 'users_total' k, count(*)::text v from public.customer_profiles
union all select 'signups_30d', count(*)::text from public.customer_profiles where created_at >= now() - interval '30 days'
union all select 'sites_saved', count(*)::text from public.site_projects
union all select 'sites_published', count(*)::text from public.hosted_site_pages
union all select 'published_html_mb', round(coalesce(sum(pg_column_size(pages)), 0) / 1048576.0, 1)::text from public.hosted_site_pages
union all select 'licenses_total', count(*)::text from public.license_redemptions
union all select 'licenses_30d', count(*)::text from public.license_redemptions where redeemed_at >= now() - interval '30 days'
union all select 'db_mb', round(pg_database_size(current_database()) / 1048576.0, 1)::text
union all select 'storage_' || bucket_id || '_mb', round(coalesce(sum((metadata->>'size')::bigint), 0) / 1048576.0, 1)::text || ' (' || count(*) || ' files)' from storage.objects group by bucket_id
union all select 'ai_free_lifetime_calls', coalesce(sum(count), 0)::text from public.ai_usage
union all select 'ai_pro_calls_30d', coalesce(sum(count), 0)::text from public.ai_usage_daily where day > current_date - 30
union all select 'ai_all_calls_today', coalesce(sum(count), 0)::text from public.ai_usage_global_daily where day = current_date
union all select 'campaign_emails_30d', count(*)::text from public.email_sends where sent_at >= now() - interval '30 days'
union all select 'contact_messages_30d', count(*)::text from public.contact_messages where created_at >= now() - interval '30 days';
