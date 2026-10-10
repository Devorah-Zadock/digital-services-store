#!/usr/bin/env python3
"""Cloudflare helper for .github/workflows/cloudflare.yml.

Needs CLOUDFLARE_API_TOKEN (Workers + Zone DNS edit) and
CLOUDFLARE_ACCOUNT_ID as GitHub secrets. Prints only DNS/zone facts that
are public anyway (anyone can look up a domain's DNS) — never tokens.

  cloudflare_api.py subdomain   make sure the account has a workers.dev
                                test address (needed before the first deploy)
  cloudflare_api.py status      zone status, nameservers, DNS records, routes
  cloudflare_api.py prepare     webmail/ftp back to "DNS only", as they were
  cloudflare_api.py smoke       compare every page Vercel serves today with
                                what Cloudflare serves (counts/mismatches only)
  cloudflare_api.py live        after the switch: the real addresses answer
                                from Cloudflare with the expected pages
  cloudflare_api.py switch      serve deskkit.co.il + customer sites from
                                Cloudflare (routes + proxied records)
  cloudflare_api.py rollback    undo "switch": everything back to Vercel
  cloudflare_api.py drop-vercel remove the last DNS records pointing to Vercel
                                (the old *.sites.deskkit.co.il delegation)
"""
import json
import os
import sys
import urllib.error
import urllib.request

ZONE_NAME = "deskkit.co.il"
API = "https://api.cloudflare.com/client/v4"
WEB_WORKER = "deskkit-web"
SITES_WORKER = "deskkit-sites"
# Which Worker answers which hostnames once switched.
ROUTES = [
    (f"{ZONE_NAME}/*", WEB_WORKER),
    (f"www.{ZONE_NAME}/*", SITES_WORKER),      # 301 → deskkit.co.il
    (f"*.{ZONE_NAME}/*", SITES_WORKER),        # <slug>.deskkit.co.il
]
WILDCARD = f"*.{ZONE_NAME}"
# Records that must stay "DNS only": mail and file transfer don't work
# through Cloudflare's web proxy.
NEVER_PROXIED = {f"webmail.{ZONE_NAME}", f"ftp.{ZONE_NAME}", f"mail.{ZONE_NAME}"}


def call(method, path, body=None, ok404=False):
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not token:
        sys.exit("CLOUDFLARE_API_TOKEN secret is not set.")
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read().decode() or "{}").get("result")
    except urllib.error.HTTPError as e:
        if ok404 and e.code == 404:
            return None
        detail = e.read().decode()[:600]
        sys.exit(f"{method} {path.split('?')[0]} failed: HTTP {e.code} {detail}")


def zone():
    zones = call("GET", f"/zones?name={ZONE_NAME}") or []
    if not zones:
        sys.exit(f"zone {ZONE_NAME} not found in this Cloudflare account")
    return zones[0]


def records(zone_id):
    return call("GET", f"/zones/{zone_id}/dns_records?per_page=200") or []


def routes(zone_id):
    return call("GET", f"/zones/{zone_id}/workers/routes") or []


def cmd_status():
    z = zone()
    print(f"zone: {z['name']}  status: {z['status']}  plan: {z.get('plan', {}).get('name')}")
    print("Cloudflare nameservers to set at the registrar: " + ", ".join(z.get("name_servers", [])))
    print("nameservers the registrar currently reports:   " + ", ".join(z.get("original_name_servers") or []))
    print("\nDNS records:")
    for r in sorted(records(z["id"]), key=lambda r: (r["name"], r["type"])):
        content = r["content"] if len(r["content"]) < 60 else r["content"][:57] + "..."
        print(f"  {r['type']:6} {r['name']:32} {'PROXIED ' if r.get('proxied') else 'dns-only'}  {content}")
    print("\nWorker routes:")
    for r in routes(z["id"]):
        print(f"  {r['pattern']:28} -> {r.get('script')}")
    acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    sub = call("GET", f"/accounts/{acct}/workers/subdomain", ok404=True) if acct else None
    if sub and sub.get("subdomain"):
        print(f"\nworkers.dev test addresses: https://{WEB_WORKER}.{sub['subdomain']}.workers.dev  "
              f"https://{SITES_WORKER}.{sub['subdomain']}.workers.dev")


def cmd_subdomain():
    acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    if not acct:
        sys.exit("CLOUDFLARE_ACCOUNT_ID secret is not set.")
    cur = call("GET", f"/accounts/{acct}/workers/subdomain", ok404=True)
    if cur and cur.get("subdomain"):
        print(f"workers.dev address: {cur['subdomain']}.workers.dev")
        return
    for name in ("deskkit", "deskkit-co-il", "deskkit-il", "deskkit-sites-il"):
        token = os.environ["CLOUDFLARE_API_TOKEN"].strip()
        req = urllib.request.Request(f"{API}/accounts/{acct}/workers/subdomain", method="PUT",
                                     data=json.dumps({"subdomain": name}).encode(),
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=60).read()
            print(f"registered workers.dev address: {name}.workers.dev")
            return
        except urllib.error.HTTPError as e:
            print(f"  {name}.workers.dev not available (HTTP {e.code})")
    sys.exit("could not register a workers.dev address")


def set_proxied(zone_id, rec, proxied):
    if bool(rec.get("proxied")) == proxied:
        return False
    call("PATCH", f"/zones/{zone_id}/dns_records/{rec['id']}", {"proxied": proxied})
    print(f"  {rec['name']} ({rec['type']}): {'proxied' if proxied else 'DNS only'}")
    return True


def cmd_prepare():
    z = zone()
    changed = False
    for r in records(z["id"]):
        if r["name"] in NEVER_PROXIED and r["type"] in ("A", "AAAA", "CNAME"):
            changed |= set_proxied(z["id"], r, False)
    print("done" if changed else "nothing to change")


def http_get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "deskkit-smoke-test"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception:  # noqa: BLE001
        return 0, b""


def published_slugs():
    # Slugs only, via the Supabase Management API; never printed.
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    req = urllib.request.Request(
        "https://api.supabase.com/v1/projects/vafkjsetlrpaczsmqvqs/database/query", method="POST",
        data=json.dumps({"query": "select slug, (pages ? 'about') as about, (pages ? 'contact') as contact, (site_project_id is not null) as has_project from public.hosted_site_pages"}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "deskkit-smoke-test"})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode())


def cmd_smoke():
    acct = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    sub = (call("GET", f"/accounts/{acct}/workers/subdomain", ok404=True) or {}).get("subdomain")
    if not sub:
        sys.exit("no workers.dev address yet — run a deploy first")
    web = f"https://{WEB_WORKER}.{sub}.workers.dev"
    sites = f"https://{SITES_WORKER}.{sub}.workers.dev"
    problems = 0

    # 1. Main site: every top-level page and a sample of assets.
    root = os.path.join(os.path.dirname(__file__), "..", "..")
    files = sorted(f for f in os.listdir(root) if f.endswith(".html")) + ["", "robots.txt", "sitemap.xml",
                                                                         "css/deskkit-ui.css", "js/main.js", "favicon.svg"]
    same = 0
    for f in files:
        s1, b1 = http_get(f"https://{ZONE_NAME}/{f}")
        s2, b2 = http_get(f"{web}/{f}")
        if s1 == s2 == 200 and b1 == b2:
            same += 1
        else:
            problems += 1
            print(f"  MAIN MISMATCH /{f}: vercel {s1} ({len(b1)} B) vs cloudflare {s2} ({len(b2)} B)")
    print(f"main site: {same}/{len(files)} pages identical")

    # 2. Security headers on the Cloudflare copy.
    req = urllib.request.Request(f"{web}/account.html", headers={"User-Agent": "deskkit-smoke-test"})
    with urllib.request.urlopen(req, timeout=60) as res:
        h = {k.lower(): v for k, v in res.headers.items()}
    for name in ("x-content-type-options", "x-frame-options", "content-security-policy", "strict-transport-security"):
        if name not in h:
            problems += 1
            print(f"  missing header on Cloudflare: {name}")
    if "no-store" not in h.get("cache-control", ""):
        problems += 1
        print("  account.html is not no-store on Cloudflare")
    print("security headers: checked")

    # 3. Customer sites: each published page, old address on Vercel vs the
    #    new Worker. Totals only — no slugs in the (public) log.
    rows = published_slugs()
    pages_ok = pages_total = vercel_broken = 0
    for row in rows:
        for page, enabled in (("index", True), ("about", row.get("about")), ("contact", row.get("contact"))):
            if not enabled:
                continue
            pages_total += 1
            old_path = "" if page == "index" else page
            s1, b1 = http_get(f"https://{row['slug']}.sites.{ZONE_NAME}/{old_path}")
            s2, b2 = http_get(f"{sites}/?site={row['slug']}&page={page}")
            if s2 != 200 and s1 != 200:
                print(f"  note: a {page} page is unavailable on both Vercel and Cloudflare (as before) — "
                      f"has project {row.get('has_project')}")
                continue
            if s2 != 200:
                problems += 1
                slug = row["slug"] or ""
                shape_ok = bool(__import__("re").fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", slug))
                print(f"  SITE FAIL: {page} page — cloudflare {s2}, vercel {s1}; "
                      f"slug length {len(slug)}, valid shape {shape_ok}, has project {row.get('has_project')}")
                continue
            if s1 != 200:
                vercel_broken += 1  # Cloudflare serves it, Vercel didn't
                pages_ok += 1
                continue
            if b1 == b2:
                pages_ok += 1
            else:
                problems += 1
                print(f"  SITE MISMATCH: a {page} page differs ({len(b1)} B vs {len(b2)} B)")
                if problems == 1:
                    # Show what differs, once, with emails/phones/URLs masked.
                    import difflib
                    import re as _re
                    a = b2.decode(errors="replace").splitlines()
                    b = b1.decode(errors="replace").splitlines()
                    for line in list(difflib.unified_diff(a, b, lineterm="", n=0))[2:12]:
                        line = _re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "<email>", line)
                        line = _re.sub(r"https?://[^\s\"'<>]+", lambda m: m.group(0) if "cloudflare" in m.group(0) or "cdn-cgi" in m.group(0) else "<url>", line)
                        line = _re.sub(r"\d{6,}", "<num>", line)
                        print("    " + line[:300])
    print(f"customer sites: {len(rows)} sites, {pages_ok}/{pages_total} pages served correctly by Cloudflare"
          f" ({vercel_broken} of them were not reachable on Vercel)")
    if problems:
        sys.exit(f"{problems} problem(s) — do not switch yet")
    print("smoke test passed")


def cmd_live():
    problems = 0
    for path in ("", "sites.html", "account.html", "robots.txt"):
        req = urllib.request.Request(f"https://{ZONE_NAME}/{path}", headers={"User-Agent": "deskkit-smoke-test"})
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                server = res.headers.get("server", "")
                ok = res.status == 200 and "cloudflare" in server.lower()
        except Exception as e:  # noqa: BLE001
            ok, server = False, type(e).__name__
        print(f"  {'OK  ' if ok else 'FAIL'} https://{ZONE_NAME}/{path} (server: {server})")
        problems += 0 if ok else 1
    # What Cloudflare adds to pages on its own (zone features).
    _, body = http_get(f"https://{ZONE_NAME}/")
    text = body.decode(errors="replace")
    for name, marker in (("Cloudflare Web Analytics beacon", "cloudflareinsights.com"),
                         ("email address obfuscation", "email-decode"),
                         ("Rocket Loader", "rocket-loader"), ("Zaraz", "zaraz")):
        print(f"  injected by Cloudflare — {name}: {'yes' if marker in text else 'no'}")
    s, _ = http_get(f"https://www.{ZONE_NAME}/")
    print(f"  {'OK  ' if s == 200 else 'FAIL'} www → deskkit.co.il")
    problems += 0 if s == 200 else 1
    rows = [r for r in published_slugs() if r.get("has_project")]
    good = injected = 0
    for row in rows:
        st, body = http_get(f"https://{row['slug']}.{ZONE_NAME}/")
        good += 1 if st == 200 and body else 0
        injected += 1 if b"cloudflareinsights.com" in body else 0
    print(f"  customer sites with Cloudflare's analytics beacon: {injected} (should be 0)")
    problems += injected
    print(f"  customer sites on the new address: {good}/{len(rows)} answer")
    problems += len(rows) - good
    if problems:
        sys.exit(f"{problems} problem(s) on the live addresses — consider 'rollback'")
    print("live check passed")


def cmd_switch():
    z = zone()
    if z["status"] != "active":
        sys.exit(f"zone is '{z['status']}' — change the nameservers at the registrar first, then wait for 'active'.")
    recs = records(z["id"])
    # 1. Proxy the main site and www so Cloudflare (not Vercel) answers them.
    for r in recs:
        if r["name"] in (ZONE_NAME, f"www.{ZONE_NAME}") and r["type"] in ("A", "AAAA", "CNAME"):
            set_proxied(z["id"], r, True)
    # 2. A catch-all record for <slug>.deskkit.co.il. Specific records
    #    (mail, webmail, send…) and the "sites" delegation still win.
    if not any(r["name"] == WILDCARD for r in recs):
        call("POST", f"/zones/{z['id']}/dns_records",
             {"type": "AAAA", "name": WILDCARD, "content": "100::", "proxied": True, "ttl": 1,
              "comment": "DeskKit customer sites (Cloudflare Worker deskkit-sites)"})
        print(f"  {WILDCARD} (AAAA 100::): added, proxied")
    # 3. Worker routes.
    existing = {r["pattern"]: r for r in routes(z["id"])}
    for pattern, script in ROUTES:
        cur = existing.get(pattern)
        if cur and cur.get("script") == script:
            continue
        if cur:
            call("PUT", f"/zones/{z['id']}/workers/routes/{cur['id']}", {"pattern": pattern, "script": script})
        else:
            call("POST", f"/zones/{z['id']}/workers/routes", {"pattern": pattern, "script": script})
        print(f"  route {pattern} -> {script}")
    print("switched: deskkit.co.il and customer sites are now served by Cloudflare")


def cmd_rollback():
    z = zone()
    for r in routes(z["id"]):
        if r["pattern"] in {p for p, _ in ROUTES}:
            call("DELETE", f"/zones/{z['id']}/workers/routes/{r['id']}")
            print(f"  route {r['pattern']}: removed")
    for r in records(z["id"]):
        if r["name"] == WILDCARD and r["type"] == "AAAA" and r["content"] in ("100::", "100:0:0:0:0:0:0:0"):
            call("DELETE", f"/zones/{z['id']}/dns_records/{r['id']}")
            print(f"  {WILDCARD}: removed")
        elif r["name"] in (ZONE_NAME, f"www.{ZONE_NAME}") and r["type"] in ("A", "AAAA", "CNAME"):
            set_proxied(z["id"], r, False)
    print("rolled back: DNS points to Vercel again (as before the switch)")


VERCEL_APEX_IP = "216.198.79.1"


def cmd_drop_vercel():
    """After the switch the Workers answer deskkit.co.il and www, so the
    Vercel addresses behind those records are never used — replace them
    with Cloudflare's placeholder (100::, proxied), add the new record
    before removing the old one, and drop the *.sites delegation."""
    z = zone()
    recs = records(z["id"])
    for host in (ZONE_NAME, f"www.{ZONE_NAME}"):
        old = [r for r in recs if r["name"] == host and r["type"] in ("A", "CNAME")
               and ("vercel" in r["content"].lower() or r["content"] == VERCEL_APEX_IP)]
        if not old:
            continue
        has_placeholder = any(r["name"] == host and r["type"] == "AAAA" for r in recs)
        if old[0]["type"] == "CNAME":
            # A CNAME can't sit beside other records: swap it.
            call("DELETE", f"/zones/{z['id']}/dns_records/{old[0]['id']}")
            if not has_placeholder:
                call("POST", f"/zones/{z['id']}/dns_records",
                     {"type": "AAAA", "name": host, "content": "100::", "proxied": True, "ttl": 1, "comment": "served by Cloudflare Workers"})
        else:
            if not has_placeholder:
                call("POST", f"/zones/{z['id']}/dns_records",
                     {"type": "AAAA", "name": host, "content": "100::", "proxied": True, "ttl": 1, "comment": "served by Cloudflare Workers"})
            for r in old:
                call("DELETE", f"/zones/{z['id']}/dns_records/{r['id']}")
        print(f"  {host}: now Cloudflare only (Vercel address removed)")
    removed = 0
    for r in records(z["id"]):
        if "vercel" in r["content"].lower():
            call("DELETE", f"/zones/{z['id']}/dns_records/{r['id']}")
            print(f"  removed {r['type']} {r['name']} -> {r['content']}")
            removed += 1
    print(f"done: no DNS record points to Vercel any more ({removed} more removed)")


if __name__ == "__main__":
    cmds = {"subdomain": cmd_subdomain, "status": cmd_status, "smoke": cmd_smoke, "live": cmd_live, "prepare": cmd_prepare, "switch": cmd_switch, "drop-vercel": cmd_drop_vercel, "rollback": cmd_rollback}
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in cmds:
        sys.exit(__doc__)
    cmds[cmd]()
