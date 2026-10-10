# Hosting on Cloudflare

Replaces Vercel (whose free Hobby plan doesn't allow commercial use).

| Worker | What it serves | Code |
|---|---|---|
| `deskkit-web` | deskkit.co.il — the static site (free, unlimited static requests) | `web/` (files copied by `web/build.sh`) |
| `deskkit-sites` | `<slug>.deskkit.co.il` customer sites; `www` → apex redirect | `sites/index.js` |

Customer pages are read with the public anon key through
`public.public_site_page()` (`supabase/sql/public_site_page.sql`) and cached
at the edge for 60 s. No secrets live in either Worker.

`.github/workflows/cloudflare.yml` deploys both on every push to `main`.
DNS/routing only changes through its manual tasks:

- `status` — zone status, nameservers, DNS records, routes
- `prepare` — keep webmail/ftp/mail "DNS only"
- `switch` — proxy deskkit.co.il + www, add `*.deskkit.co.il`, attach routes
- `rollback` — undo `switch` (only meaningful while Vercel still existed)
- `drop-vercel` — remove every DNS record that still pointed to Vercel

Vercel is no longer used. The old `<slug>.sites.deskkit.co.il` addresses
were retired with it; every site lives at `<slug>.deskkit.co.il`.
