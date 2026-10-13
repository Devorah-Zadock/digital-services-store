-- Site-wide daily cap on AI calls (all users together).
--
-- Each AI function already caps every user (3–5 lifetime tries free,
-- 20–50 a day Pro, ai_usage_reserve). This is the second fuse: however
-- many accounts exist or get created, the whole site makes at most
-- ai_budget.daily_limit OpenAI calls a day. Past it, the functions answer
-- "busy, try again tomorrow" and the user's own try is handed back.
--
-- Change the limit (no deploy needed):
--   update public.ai_budget set daily_limit = 3000 where id = 1;
-- Safe to run more than once.

create table if not exists public.ai_budget (
  id smallint primary key default 1 check (id = 1),
  daily_limit integer not null default 2000 check (daily_limit >= 0),
  updated_at timestamptz not null default now()
);
insert into public.ai_budget (id) values (1) on conflict (id) do nothing;

create table if not exists public.ai_usage_global_daily (
  day date primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_budget enable row level security;
alter table public.ai_usage_global_daily enable row level security;
revoke all on public.ai_budget from anon, authenticated;
revoke all on public.ai_usage_global_daily from anon, authenticated;

-- Takes one site-wide slot for today; false when today's cap is reached.
create or replace function public.ai_global_reserve()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_count integer;
begin
  select daily_limit into v_limit from public.ai_budget where id = 1;
  if v_limit is null then v_limit := 2000; end if;
  if v_limit <= 0 then return false; end if;
  insert into public.ai_usage_global_daily as g (day, count, updated_at)
  values (current_date, 1, now())
  on conflict (day) do update
    set count = g.count + 1, updated_at = now()
    where g.count < v_limit
  returning g.count into v_count;
  return v_count is not null;
end;
$$;

revoke all on function public.ai_global_reserve() from public, anon, authenticated;
grant execute on function public.ai_global_reserve() to service_role;
