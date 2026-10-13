-- One-time (safe to re-run): give already-published FREE sites the new,
-- clearer badge — the same markup publish-site now adds on every publish.
-- Paid sites carry no badge and are not touched; a site already showing the
-- new badge doesn't match the old pattern, so nothing happens twice.
-- A copy of every page before the change is kept in
-- hosted_site_pages_badge_backup (service role only).

create table if not exists public.hosted_site_pages_badge_backup (
  slug text not null,
  html text not null,
  saved_at timestamptz not null default now()
);
alter table public.hosted_site_pages_badge_backup enable row level security;
revoke all on public.hosted_site_pages_badge_backup from anon, authenticated;

insert into public.hosted_site_pages_badge_backup (slug, html)
select slug, html from public.hosted_site_pages
where html ~ '<a id="(dk[0-9a-f]{12})" href="https://deskkit\.co\.il/\?ref=badge"[^>]*>[^<]*</a>';

update public.hosted_site_pages
set html = regexp_replace(html, '<a id="(dk[0-9a-f]{12})" href="https://deskkit\.co\.il/\?ref=badge"[^>]*>[^<]*</a>', '<a id="\1" href="https://deskkit.co.il/?ref=badge" target="_blank" rel="noopener" dir="ltr" style="all:initial !important;position:fixed !important;bottom:16px !important;inset-inline-start:16px !important;z-index:2147483647 !important;display:inline-flex !important;align-items:center !important;gap:9px !important;visibility:visible !important;opacity:1 !important;transform:none !important;clip-path:none !important;filter:none !important;width:auto !important;height:auto !important;max-width:calc(100vw - 32px) !important;margin:0 !important;background:#0F172A !important;color:#fff !important;font:600 14px/1.3 Heebo,Arial,sans-serif !important;padding:9px 16px 9px 10px !important;border-radius:999px !important;border:1px solid rgba(255,255,255,.18) !important;box-shadow:0 8px 24px rgba(0,0,0,.28) !important;text-decoration:none !important;cursor:pointer !important;pointer-events:auto !important;box-sizing:border-box !important;direction:ltr !important"><span style="all:initial !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;width:24px !important;height:24px !important;border-radius:7px !important;background:#14B8A6 !important;color:#fff !important;font:800 14px/1 Heebo,Arial,sans-serif !important;flex:none !important">D</span><span style="all:initial !important;color:#fff !important;font:600 14px/1.3 Heebo,Arial,sans-serif !important;white-space:nowrap !important">Get a site like this, free —</span><span style="all:initial !important;color:#5EEAD4 !important;font:800 14px/1.3 Heebo,Arial,sans-serif !important;white-space:nowrap !important">DeskKit</span></a>'),
    updated_at = now()
where html ~ '<a id="(dk[0-9a-f]{12})" href="https://deskkit\.co\.il/\?ref=badge"[^>]*>[^<]*</a>' and html ~* '<html[^>]*\mlang="en"';

update public.hosted_site_pages
set html = regexp_replace(html, '<a id="(dk[0-9a-f]{12})" href="https://deskkit\.co\.il/\?ref=badge"[^>]*>[^<]*</a>', '<a id="\1" href="https://deskkit.co.il/?ref=badge" target="_blank" rel="noopener" dir="rtl" style="all:initial !important;position:fixed !important;bottom:16px !important;inset-inline-start:16px !important;z-index:2147483647 !important;display:inline-flex !important;align-items:center !important;gap:9px !important;visibility:visible !important;opacity:1 !important;transform:none !important;clip-path:none !important;filter:none !important;width:auto !important;height:auto !important;max-width:calc(100vw - 32px) !important;margin:0 !important;background:#0F172A !important;color:#fff !important;font:600 14px/1.3 Heebo,Arial,sans-serif !important;padding:9px 16px 9px 10px !important;border-radius:999px !important;border:1px solid rgba(255,255,255,.18) !important;box-shadow:0 8px 24px rgba(0,0,0,.28) !important;text-decoration:none !important;cursor:pointer !important;pointer-events:auto !important;box-sizing:border-box !important;direction:rtl !important"><span style="all:initial !important;display:inline-flex !important;align-items:center !important;justify-content:center !important;width:24px !important;height:24px !important;border-radius:7px !important;background:#14B8A6 !important;color:#fff !important;font:800 14px/1 Heebo,Arial,sans-serif !important;flex:none !important">D</span><span style="all:initial !important;color:#fff !important;font:600 14px/1.3 Heebo,Arial,sans-serif !important;white-space:nowrap !important">רוצים אתר כזה בחינם?</span><span style="all:initial !important;color:#5EEAD4 !important;font:800 14px/1.3 Heebo,Arial,sans-serif !important;white-space:nowrap !important">DeskKit</span></a>'),
    updated_at = now()
where html ~ '<a id="(dk[0-9a-f]{12})" href="https://deskkit\.co\.il/\?ref=badge"[^>]*>[^<]*</a>';
