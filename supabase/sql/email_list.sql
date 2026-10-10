-- Emails DeskKit sends its own customers:
--   * a one-time welcome email to every new account
--     (supabase/functions/account-welcome),
--   * service notices (e.g. "your site has a new address"),
--   * occasional updates the owner writes in the admin area ("דיוור").
--
-- Every account is on the updates list unless it unsubscribed — one click
-- in any update email, or the switch in "החשבון שלי" (supabase/functions/
-- email-preferences). Service notices go to everyone they concern.
--
-- Like every admin table here: RLS on with no policies, so only the
-- service role (the Edge Functions) can read or write any of it.

alter table public.customer_profiles
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists email_unsubscribed_at timestamptz;

-- Accounts that existed before welcome emails did never get one now.
update public.customer_profiles set welcome_sent_at = created_at where welcome_sent_at is null;

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'update' check (kind in ('update', 'service')),
  subject text not null,
  body text not null,
  is_ad boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.email_campaigns enable row level security;

-- One row per email actually handed to the sender — so a send that stops
-- half-way (daily quota) continues exactly where it stopped, and nobody
-- ever gets the same campaign twice.
create table if not exists public.email_sends (
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
alter table public.email_sends enable row level security;
create index if not exists email_sends_sent_at_idx on public.email_sends (sent_at);

-- Who still has to get a campaign: confirmed, not suspended, still
-- subscribed (for updates), and not sent to yet.
create or replace function public.email_campaign_recipients(p_campaign uuid, p_limit int)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select cp.id, u.email::text
  from public.customer_profiles cp
  join auth.users u on u.id = cp.id
  where u.email is not null
    and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and cp.email_unsubscribed_at is null
    and not exists (select 1 from public.email_sends s where s.campaign_id = p_campaign and s.user_id = cp.id)
  order by cp.created_at
  limit greatest(1, least(p_limit, 100));
$$;

create or replace function public.email_campaign_audience()
returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.customer_profiles cp
  join auth.users u on u.id = cp.id
  where u.email is not null and u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until <= now())
    and cp.email_unsubscribed_at is null;
$$;

revoke all on function public.email_campaign_recipients(uuid, int) from public, anon, authenticated;
revoke all on function public.email_campaign_audience() from public, anon, authenticated;
grant execute on function public.email_campaign_recipients(uuid, int) to service_role;
grant execute on function public.email_campaign_audience() to service_role;
