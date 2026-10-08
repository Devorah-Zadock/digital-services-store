#!/usr/bin/env python3
"""Small helper for the Supabase Management API, used by
.github/workflows/supabase-deploy.yml. Needs SUPABASE_ACCESS_TOKEN (a
personal access token, stored as a GitHub Actions secret) and PROJECT_REF.

  supabase_api.py sql <file>...      run SQL files, in order, stop on error
  supabase_api.py auth-show          print the security-relevant auth settings
  supabase_api.py auth-patch <json>  change auth settings, then print them
  supabase_api.py turnstile-enable   turn on the invisible CAPTCHA (needs the
                                     TURNSTILE_SECRET_KEY env/GitHub secret)
  supabase_api.py turnstile-disable  turn it off again (emergency switch)
  supabase_api.py auth-errors [min]  recent Auth errors (no emails/IPs printed)
"""
import datetime
import json
import os
import re
import sys
import urllib.parse
import urllib.error
import urllib.request

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
REF = os.environ["PROJECT_REF"]
API = f"https://api.supabase.com/v1/projects/{REF}"

# Only these auth settings are ever printed — the full config also holds
# secrets (SMTP password, OAuth client secrets) that must not reach logs.
AUTH_FIELDS = [
    "site_url", "uri_allow_list", "disable_signup", "mailer_autoconfirm",
    "mailer_secure_email_change_enabled", "password_min_length",
    "password_required_characters", "password_hibp_enabled",
    "security_update_password_require_reauthentication",
    "security_captcha_enabled", "security_captcha_provider",
    "rate_limit_email_sent", "rate_limit_verify", "rate_limit_token_refresh",
    "rate_limit_otp", "rate_limit_anonymous_users", "jwt_exp",
    "sessions_timebox", "sessions_inactivity_timeout", "external_google_enabled",
    "mfa_totp_enroll_enabled", "mfa_totp_verify_enabled",
]


def call(method, path, body=None):
    if not TOKEN:
        sys.exit("SUPABASE_ACCESS_TOKEN secret is not set in GitHub → Settings → Secrets → Actions.")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        "Authorization": "Bearer " + TOKEN,
        "Content-Type": "application/json",
        "User-Agent": "deskkit-deploy",
    })
    try:
        with urllib.request.urlopen(req, timeout=120) as res:
            raw = res.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"{method} {path} failed: HTTP {e.code} {e.read().decode()[:2000]}")


def run_sql(files):
    for f in files:
        print(f"::group::SQL {f}")
        rows = call("POST", "/database/query", {"query": open(f, encoding="utf-8").read()})
        if isinstance(rows, list):
            for r in rows[:500]:
                print(" | ".join(str(v) for v in r.values()))
            if len(rows) > 500:
                print(f"... {len(rows) - 500} more rows")
        print("::endgroup::")
        print(f"OK: {f}")


def auth_show():
    cfg = call("GET", "/config/auth") or {}
    for k in AUTH_FIELDS:
        if k in cfg:
            print(f"{k} = {cfg[k]}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "sql":
        run_sql(sys.argv[2:])
    elif cmd == "auth-show":
        auth_show()
    elif cmd == "auth-patch":
        patch = json.loads(sys.argv[2])
        bad = [k for k in patch if k not in AUTH_FIELDS]
        if bad:
            sys.exit(f"refusing to change unlisted auth settings: {bad}")
        call("PATCH", "/config/auth", patch)
        print("Updated. Current values:")
        auth_show()
    elif cmd == "turnstile-enable":
        secret = os.environ.get("TURNSTILE_SECRET_KEY", "").strip()
        if not secret:
            sys.exit("TURNSTILE_SECRET_KEY secret is not set in GitHub → Settings → Secrets → Actions.")
        # The contact/feedback function checks tokens with it…
        call("POST", "/secrets", [{"name": "TURNSTILE_SECRET_KEY", "value": secret}])
        # …and Supabase Auth checks sign-up / log-in / password-reset.
        call("PATCH", "/config/auth", {"security_captcha_enabled": True, "security_captcha_provider": "turnstile", "security_captcha_secret": secret})
        print("Turnstile enabled. Current values:")
        auth_show()
    elif cmd == "turnstile-disable":
        call("PATCH", "/config/auth", {"security_captcha_enabled": False})
        call("DELETE", "/secrets", ["TURNSTILE_SECRET_KEY"])
        print("Turnstile disabled. Current values:")
        auth_show()
    elif cmd == "auth-errors":
        minutes = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        start = (datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
        sql = "select timestamp, event_message from auth_logs order by timestamp desc limit 300"
        res = call("GET", "/analytics/endpoints/logs.all?" + urllib.parse.urlencode({"sql": sql, "iso_timestamp_start": start})) or {}
        rows = res.get("result") or []
        print(f"{len(rows)} auth log lines in the last {minutes} minutes (errors/warnings, redacted):")
        scrub = lambda t: re.sub(r"[\w.+-]+@[\w-]+\.[\w.-]+", "<email>", re.sub(r"\b\d{1,3}(\.\d{1,3}){3}\b", "<ip>", str(t)))
        for r in rows:
            try:
                m = json.loads(r.get("event_message") or "{}")
            except Exception:
                m = {"msg": r.get("event_message")}
            level = m.get("level", "")
            status = m.get("status") or m.get("code") or ""
            if level in ("error", "warning") or (isinstance(status, int) and status >= 400) or m.get("error"):
                print(" | ".join(scrub(x) for x in [m.get("time", r.get("timestamp")), level, m.get("method", ""), m.get("path", ""), status, m.get("error_code", ""), m.get("error", ""), m.get("msg", "")]))
    else:
        sys.exit(__doc__)
