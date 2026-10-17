-- Read-only: for every public table with a user_id column, total rows,
-- number of users, and the largest / 95th-percentile rows per user.
-- Counts only.
do $$
declare r record; v record;
begin
  create temp table if not exists _ppu(tbl text, total int, users int, max_per_user int, p95 int) on commit drop;
  for r in select c.table_name from information_schema.columns c
           join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
           where c.table_schema = 'public' and c.column_name = 'user_id' loop
    execute format($q$insert into _ppu select %L, coalesce(sum(n),0)::int, count(*)::int, coalesce(max(n),0)::int,
      coalesce(percentile_disc(0.95) within group (order by n),0)::int from (select user_id, count(*) n from public.%I group by user_id) s$q$, r.table_name, r.table_name);
  end loop;
end $$;
select * from _ppu order by total desc;
