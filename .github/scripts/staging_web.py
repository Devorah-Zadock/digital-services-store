#!/usr/bin/env python3
"""Turns a copy of the built site (cloudflare/web/dist) into the STAGING web
app: points it at the staging Supabase project, switches off the live
CAPTCHA key (it only works on deskkit.co.il), marks every page "not for
search engines", and adds a visible "test environment" ribbon.

  staging_web.py <dist-dir>        (needs STG_URL, STG_ANON in the environment)
"""
import os
import pathlib
import re
import sys

dist = pathlib.Path(sys.argv[1])
url, anon = os.environ["STG_URL"], os.environ["STG_ANON"]

cfg = dist / "js" / "supabase-config.js"
s = cfg.read_text(encoding="utf-8")
s = re.sub(r'const SUPABASE_URL = "[^"]+";', f'const SUPABASE_URL = "{url}";', s, count=1)
s = re.sub(r'const SUPABASE_ANON_KEY = "[^"]+";', f'const SUPABASE_ANON_KEY = "{anon}";', s, count=1)
assert url in s and anon in s, "could not point the site at staging"
# The live site's welcome email doesn't exist on staging — don't call it.
s = s.replace("(function dkWelcomeOnce() {", "(function dkWelcomeOnce() { return;", 1)
s += """
/* STAGING ribbon */
(function () {
  try {
    var b = document.createElement("div");
    b.textContent = "סביבת ניסוי — נתוני דמה בלבד, שום מייל לא נשלח באמת";
    b.setAttribute("style", "position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#B54708;color:#fff;font:600 13px/1.4 Arial,sans-serif;text-align:center;padding:5px 8px;");
    (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener("DOMContentLoaded", r); }))
      .then(function () { document.body.appendChild(b); });
  } catch (e) {}
})();
"""
cfg.write_text(s, encoding="utf-8")

cap = dist / "js" / "captcha.js"
if cap.exists():
    c = cap.read_text(encoding="utf-8")
    c = re.sub(r'const DK_TURNSTILE_SITE_KEY = "[^"]*";', 'const DK_TURNSTILE_SITE_KEY = "";', c, count=1)
    cap.write_text(c, encoding="utf-8")

(dist / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
headers = dist / "_headers"
headers.write_text(headers.read_text(encoding="utf-8").replace("/*\n", "/*\n  X-Robots-Tag: noindex, nofollow\n", 1), encoding="utf-8")
print("staging web prepared")
