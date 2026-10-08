-- DeskKit — read-only snapshot of the live database's security settings.
-- Changes nothing. Run in the SQL Editor and export the result (Export → CSV).
with
rls as (select '01_rls'::text section,(n.nspname||'.'||c.relname)::text object,
  format('rls_enabled=%s force_rls=%s',c.relrowsecurity,c.relforcerowsecurity) detail
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','storage') and c.relkind in ('r','p')),
pol as (select '02_policy',(schemaname||'.'||tablename)::text,
  format('%s | %s | %s | roles=%s | USING: %s | WITH CHECK: %s',policyname,permissive,cmd,roles::text,coalesce(qual,'-'),coalesce(with_check,'-'))
  from pg_policies where schemaname in ('public','storage')),
tgrants as (select '03_table_grant',(table_schema||'.'||table_name)::text,
  grantee::text||': '||string_agg(privilege_type::text,',' order by privilege_type::text)
  from information_schema.role_table_grants
  where grantee::text in ('anon','authenticated','PUBLIC') and table_schema::text in ('public','storage')
  group by table_schema,table_name,grantee),
cgrants as (select '04_column_grant',(n.nspname||'.'||c.relname||'.'||a.attname)::text,
  coalesce(nullif(g.grantee,0)::regrole::text,'PUBLIC')||': '||g.privilege_type
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  cross join lateral aclexplode(a.attacl) g
  where n.nspname='public' and a.attacl is not null and a.attnum>0 and not a.attisdropped),
sensitive_cols as (select '05_sensitive_column_writable',(c.table_name||'.'||c.column_name)::text,
  format('authenticated: UPDATE=%s INSERT=%s | anon: UPDATE=%s INSERT=%s',
    has_column_privilege('authenticated',format('%I.%I',c.table_schema,c.table_name),c.column_name::text,'UPDATE'),
    has_column_privilege('authenticated',format('%I.%I',c.table_schema,c.table_name),c.column_name::text,'INSERT'),
    has_column_privilege('anon',format('%I.%I',c.table_schema,c.table_name),c.column_name::text,'UPDATE'),
    has_column_privilege('anon',format('%I.%I',c.table_schema,c.table_name),c.column_name::text,'INSERT'))
  from information_schema.columns c
  where c.table_schema='public' and (c.table_name::text,c.column_name::text) in (
    ('customer_profiles','is_pro'),('customer_profiles','user_number'),('customer_profiles','email'),
    ('site_projects','user_id'),('site_projects','slug'),('site_projects','custom_domain'),('site_projects','template'),
    ('site_projects','published_url'),('site_projects','published_at'),('site_projects','publish_count'),
    ('site_projects','status'),('site_projects','netlify_site_id'),('invoice_saves','status'),('invoice_saves','number'),
    ('invoice_saves','original_invoice_id'),('ai_usage','count'),('ai_usage_daily','count'),('license_redemptions','user_id'))),
funcs as (select '06_function',p.oid::regprocedure::text,
  format('security_definer=%s config=%s owner=%s exec_PUBLIC=%s exec_anon=%s exec_authenticated=%s',
    p.prosecdef,coalesce(array_to_string(p.proconfig,';'),'NONE(no search_path!)'),p.proowner::regrole,
    exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x where x.grantee=0 and x.privilege_type='EXECUTE'),
    has_function_privilege('anon',p.oid,'EXECUTE'),has_function_privilege('authenticated',p.oid,'EXECUTE'))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')),
views as (select '07_view',(n.nspname||'.'||c.relname)::text,
  format('kind=%s owner=%s options=%s',c.relkind,c.relowner::regrole,
    coalesce(array_to_string(c.reloptions,','),'NONE -> runs as owner, BYPASSES RLS unless security_invoker=true'))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')),
buckets as (select '08_bucket',b.id::text,
  format('public=%s file_size_limit=%s allowed_mime_types=%s',b.public,coalesce(b.file_size_limit::text,'NONE'),coalesce(b.allowed_mime_types::text,'ANY'))
  from storage.buckets b),
trg as (select '09_trigger',(event_object_schema||'.'||event_object_table)::text,
  string_agg(distinct trigger_name::text||' '||action_timing::text||' '||event_manipulation::text||' -> '||action_statement::text,' ; ')
  from information_schema.triggers where event_object_schema::text in ('public','auth')
  group by event_object_schema,event_object_table),
defacl as (select '10_default_privilege',(coalesce(n.nspname::text,'*all schemas*')||' objtype='||d.defaclobjtype::text),
  d.defaclrole::regrole::text||' grants '||d.defaclacl::text
  from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace)
select * from rls union all select * from pol union all select * from tgrants union all select * from cgrants
union all select * from sensitive_cols union all select * from funcs union all select * from views
union all select * from buckets union all select * from trg union all select * from defacl
order by 1,2,3;
