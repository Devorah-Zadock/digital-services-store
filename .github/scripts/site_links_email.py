#!/usr/bin/env python3
"""One-time service email: every owner of a published DeskKit site gets
its new address (<slug>.deskkit.co.il — sites moved off
<slug>.sites.deskkit.co.il when hosting moved to Cloudflare).

  site_links_email.py dry-run   count who would get it, send nothing
  site_links_email.py send      send it (each owner at most once, ever)

Run from .github/workflows/supabase-deploy.yml. Needs SUPABASE_ACCESS_TOKEN,
PROJECT_REF and RESEND_SMTP_KEY (a Resend API key). This repository is
public: the log shows counts only — no addresses, names or site names.
Every email sent is recorded in public.email_sends under one "service"
campaign (supabase/sql/email_list.sql), so running it again only reaches
owners who didn't get it yet.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from supabase_api import call  # noqa: E402

SUBJECT = "הכתובת החדשה של האתר שלך ב-DeskKit 🌐"
SITE = "https://deskkit.co.il"
UUID = re.compile(r"^[0-9a-f-]{36}$")
SLUG = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


def q(sql):
    return call("POST", "/database/query", {"query": sql}) or []


def campaign_id():
    rows = q(f"""
      with found as (select id from public.email_campaigns where kind = 'service' and subject = '{SUBJECT}' limit 1),
      made as (
        insert into public.email_campaigns (kind, subject, body, is_ad, created_by)
        select 'service', '{SUBJECT}', 'site-links', false, 'system' where not exists (select 1 from found)
        returning id)
      select id from found union all select id from made;""")
    return rows[0]["id"]


def owners(cid):
    return q(f"""
      select u.id::text as id, u.email::text as email, to_jsonb(array_agg(h.slug order by h.slug)) as slugs
      from public.hosted_site_pages h
      join public.site_projects sp on sp.id = h.site_project_id
      join auth.users u on u.id = sp.user_id
      where u.email is not null
        and not exists (select 1 from public.email_sends s where s.campaign_id = '{cid}' and s.user_id = u.id)
      group by u.id, u.email;""")


def email_html(slugs):
    links = "".join(
        f'<li style="margin:6px 0;"><a href="https://{s}.deskkit.co.il/" style="color:#0F766E;font-weight:700;font-size:17px;direction:ltr;unicode-bidi:embed;">{s}.deskkit.co.il</a></li>'
        for s in slugs)
    one = len(slugs) == 1
    return f"""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F4;">
<div dir="rtl" style="background:#F1F5F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0F766E;padding:18px 24px;"><a href="{SITE}/" style="color:#fff;text-decoration:none;font-size:22px;font-weight:800;">DeskKit</a></div>
    <div style="padding:26px 24px 10px;color:#111827;font-size:16px;line-height:1.7;text-align:right;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#0F766E;">{"לאתר שלך יש כתובת חדשה" if one else "לאתרים שלך יש כתובות חדשות"}</h1>
      <p style="margin:0 0 12px;">שלום! העברנו את האחסון של האתרים ב-DeskKit לתשתית חדשה, מהירה ויציבה יותר. במסגרת המעבר הכתובת השתנתה: המילה sites ירדה ממנה, והיא קצרה ונוחה יותר.</p>
      <p style="margin:0 0 6px;font-weight:700;">{"הכתובת החדשה של האתר שלך:" if one else "הכתובות החדשות של האתרים שלך:"}</p>
      <ul style="margin:0 0 16px;padding-inline-start:20px;">{links}</ul>
      <p style="margin:0 0 12px;"><b>חשוב:</b> הכתובת הישנה כבר לא פעילה. אם שיתפת את הקישור — בכרטיס ביקור, בוואטסאפ, באינסטגרם או בגוגל — כדאי לעדכן אותו לכתובת החדשה.</p>
      <p style="margin:0 0 12px;">האתר עצמו, התוכן והעיצוב נשארו בדיוק כמו שהיו. לא צריך לעשות שום דבר נוסף.</p>
      <p style="margin:22px 0;"><a href="{SITE}/projects.html" style="display:inline-block;background:#14B8A6;color:#fff;text-decoration:none;font-weight:700;padding:12px 26px;border-radius:10px;">לפרויקטים שלי ←</a></p>
      <p style="margin:0 0 4px;">תודה שבחרת ב-DeskKit,<br>צוות DeskKit</p>
    </div>
    <div style="padding:14px 24px 22px;color:#667085;font-size:12.5px;line-height:1.6;border-top:1px solid #EEF2F1;text-align:right;">
      זו הודעת שירות על אתר שפרסמת ב-DeskKit. יש שאלה? פשוט עונים למייל הזה.
    </div>
  </div>
</div></body></html>"""


def send(key, to, slugs):
    body = json.dumps({
        "from": "DeskKit <hello@deskkit.co.il>",
        "reply_to": os.environ.get("CONTACT_NOTIFY_EMAIL") or "digital.dz.studio@gmail.com",
        "to": [to], "subject": SUBJECT, "html": email_html(slugs),
    }).encode()
    req = urllib.request.Request("https://api.resend.com/emails", data=body, method="POST", headers={
        "Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "deskkit-deploy"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return 200 <= res.status < 300, res.status
    except urllib.error.HTTPError as e:
        return False, e.code


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "dry-run"
    # The Edge Functions (welcome email, updates) send with their own copy
    # of the key — check it's there (names only, never values).
    names = {x.get("name") for x in (call("GET", "/secrets") or [])}
    print("Edge Function secret RESEND_API_KEY:", "set" if "RESEND_API_KEY" in names else "MISSING")
    cid = campaign_id()
    rows = [r for r in owners(cid) if UUID.match(r["id"] or "")]
    sites = sum(len(r["slugs"]) for r in rows)
    print(f"owners still to notify: {len(rows)} (sites: {sites})")
    if mode != "send":
        print("dry run — nothing sent")
        return
    key = os.environ.get("RESEND_SMTP_KEY", "").strip()
    if not key:
        sys.exit("RESEND_SMTP_KEY secret is not set.")
    sent = failed = 0
    for r in rows:
        slugs = [s for s in r["slugs"] if SLUG.match(s or "")]
        if not slugs:
            continue
        ok, status = send(key, r["email"], slugs)
        if ok:
            q(f"insert into public.email_sends (campaign_id, user_id) values ('{cid}', '{r['id']}') on conflict do nothing;")
            sent += 1
        else:
            failed += 1
            print(f"  one email failed (HTTP {status})")
        time.sleep(0.6)  # Resend allows 2 requests a second
    print(f"sent: {sent}, failed: {failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
