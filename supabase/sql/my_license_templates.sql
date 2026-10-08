-- Which templates the signed-in user has a redeemed license for.
--
-- publish-site already decides "paid → no watermark" from
-- license_redemptions; the builders used to decide what to SHOW (the
-- "pay to remove the badge" offer, the schedule solver lock) from a flag
-- in the browser instead. A purchase made in another browser/device, or a
-- cleared browser, then looked unpaid on screen while the published site
-- was in fact badge-free — and the reverse, a hand-set flag, looked paid.
-- Both builders now ask this function. license_redemptions itself stays
-- closed to the browser; only the caller's own template names come back.
-- Safe to run more than once.
create or replace function public.my_license_templates()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct template), '{}')
  from public.license_redemptions
  where user_id = auth.uid();
$$;

revoke all on function public.my_license_templates() from public, anon;
grant execute on function public.my_license_templates() to authenticated;
