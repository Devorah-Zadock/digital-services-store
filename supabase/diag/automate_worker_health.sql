-- Read-only: is the scheduled Automate worker being reached, and what does it answer?
-- (counts and status codes only)
select 'cron run' as what, j.jobname as name, d.status as result, count(*)::text as n,
       to_char(max(d.start_time) at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI') as last
  from cron.job_run_details d join cron.job j on j.jobid = d.jobid
 where j.jobname like 'automate-%' and d.start_time > now() - interval '30 minutes'
 group by 1, 2, 3
union all
select 'worker http', coalesce(r.status_code::text, 'no answer'), left(coalesce(r.content::text, r.error_msg, ''), 60), count(*)::text,
       to_char(max(r.created) at time zone 'Asia/Jerusalem', 'MM-DD HH24:MI')
  from net._http_response r
 where r.created > now() - interval '30 minutes'
 group by 1, 2, 3;
