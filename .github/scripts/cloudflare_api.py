#!/usr/bin/env python3
"""Cloudflare helper for .github/workflows/cloudflare.yml.

Needs CLOUDFLARE_API_TOKEN (Workers + Zone DNS edit) and
CLOUDFLARE_ACCOUNT_ID as GitHub secrets. Prints only DNS/zone facts that
are public anyway (anyone can look up a domain's DNS) — never tokens.

  cloudflare_api.py subdomain   make sure the account has a workers.dev
                                test address (needed before the first deploy)
  cloudflare_api.py status      zone status, nameservers, DNS records, routes
  cloudflare_api.py prepare     webmail/ftp back to "DNS only", as they were
  cloudflare_api.py switch      serve deskkit.co.il + customer sites from
                                Cloudflare (routes + proxied records)
  cloudflare_api.py rollback    undo "switch": everything back to Vercel
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


if __name__ == "__main__":
    cmds = {"subdomain": cmd_subdomain, "status": cmd_status, "prepare": cmd_prepare, "switch": cmd_switch, "rollback": cmd_rollback}
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd not in cmds:
        sys.exit(__doc__)
    cmds[cmd]()
