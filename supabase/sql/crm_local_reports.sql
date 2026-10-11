-- Anonymous count of browsers holding CRM leads (supabase/functions/
-- crm-local-stats). One row per browser, holding only the NUMBER of leads
-- it had when first counted — no content, no identifier, no IP.
-- Service role only: RLS on, no policies, and no rights for browser roles.

create table if not exists public.crm_local_reports (
  id bigint generated always as identity primary key,
  lead_count int not null check (lead_count between 1 and 100000),
  reported_at timestamptz not null default now()
);
alter table public.crm_local_reports enable row level security;
revoke all on table public.crm_local_reports from anon, authenticated;
