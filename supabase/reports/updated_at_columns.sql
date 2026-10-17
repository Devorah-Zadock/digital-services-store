-- Read-only: which project tables have an updated_at column.
select t.table_name,
       exists (select 1 from information_schema.columns c
               where c.table_schema = 'public' and c.table_name = t.table_name and c.column_name = 'updated_at') as has_updated_at
from (values ('site_projects'), ('cv_saves'), ('quote_saves'), ('invoice_saves'), ('schedule_projects')) as t(table_name);
