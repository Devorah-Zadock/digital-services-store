-- Visit statistics of the main site (deskkit.co.il), copied every few
-- hours from Cloudflare Web Analytics by .github/workflows/cloudflare.yml
-- ("visits"), so the admin area's "מדדים" tab can show them. Anonymous
-- aggregates only: page views and visits per day, plus the top pages,
-- referrers, countries and device types — no IPs, no people.
-- RLS on, no policies: only the service role (admin-stats) reads it.

create table if not exists public.site_visits_daily (
  day date primary key,
  pageviews int not null default 0,
  visits int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.site_visits_daily enable row level security;

create table if not exists public.site_visits_top (
  id int primary key check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_visits_top enable row level security;
