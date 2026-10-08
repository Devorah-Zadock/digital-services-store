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
  supabase_api.py smtp-resend        send auth emails from noreply@deskkit.co.il
                                     via Resend (needs RESEND_SMTP_KEY secret)
  supabase_api.py auth-templates     install the Hebrew auth email templates
  supabase_api.py admin-lockdown     emergency: lock the admin area for 30 days,
                                     void every admin unlock and sign all admins
                                     out everywhere
  supabase_api.py admin-reset        recovery: delete the admin passwords and sign
                                     all admins out everywhere, so the owner can
                                     log in again and set a new one
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
    "smtp_host", "smtp_port", "smtp_user", "smtp_admin_email", "smtp_sender_name", "smtp_max_frequency",
    "mailer_subjects_confirmation", "mailer_subjects_recovery", "mailer_subjects_email_change",
]

# Signs every admin out on every device (their refresh tokens stop working;
# an already-issued access token lapses within the hour, and the admin area
# itself is closed at once by the steps above it).
KILL_ADMIN_SESSIONS = """
delete from auth.sessions where user_id in (
  select u.id from auth.users u join public.admin_users a on a.email = lower(u.email));
"""

ADMIN_LOCKDOWN_SQL = """
update public.admin_secrets set locked_until = now() + interval '30 days', failed_count = 0, updated_at = now();
""" + KILL_ADMIN_SESSIONS + """
select count(*) as admin_passwords_locked from public.admin_secrets;
"""

ADMIN_RESET_SQL = """
delete from public.admin_secrets;
""" + KILL_ADMIN_SESSIONS + """
select count(*) as admin_passwords_left from public.admin_secrets;
"""

# Hebrew auth emails (supabase/templates/*.html) and their subjects.
AUTH_TEMPLATES = {
    "confirmation": "אישור כתובת המייל — DeskKit",
    "recovery": "איפוס סיסמה — DeskKit",
    "email_change": "אישור שינוי כתובת המייל — DeskKit",
}


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
    elif cmd == "smtp-resend":
        key = os.environ.get("RESEND_SMTP_KEY", "").strip()
        if not key:
            sys.exit("RESEND_SMTP_KEY secret is not set in GitHub → Settings → Secrets → Actions.")
        call("PATCH", "/config/auth", {
            "smtp_host": "smtp.resend.com", "smtp_port": "465", "smtp_user": "resend", "smtp_pass": key,
            "smtp_admin_email": "noreply@deskkit.co.il", "smtp_sender_name": "DeskKit",
        })
        print("Auth emails now go out from noreply@deskkit.co.il. Current values:")
        auth_show()
    elif cmd == "auth-templates":
        base = os.path.join(os.path.dirname(__file__), "..", "..", "supabase", "templates")
        patch = {}
        for name, subject in AUTH_TEMPLATES.items():
            patch[f"mailer_subjects_{name}"] = subject
            patch[f"mailer_templates_{name}_content"] = open(os.path.join(base, name + ".html"), encoding="utf-8").read()
        call("PATCH", "/config/auth", patch)
        print("Templates installed. Current values:")
        auth_show()
    elif cmd == "auth-errors":
        minutes = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        start = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=minutes)).strftime("%Y-%m-%dT%H:%M:%SZ")
        # The logs API was reworked (logs.all → logs); try the likely names
        # for the Auth source and use the first one it accepts.
        end = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        rows = []
        for table in ["auth_logs", "auth", "gotrue_logs", "auth_audit_logs"]:
            sql = f"select timestamp, event_message from {table} order by timestamp desc limit 300"
            res = call("GET", "/analytics/endpoints/logs?" + urllib.parse.urlencode({"sql": sql, "iso_timestamp_start": start, "iso_timestamp_end": end})) or {}
            if res.get("error"):
                print(f"[{table}] logs API error:", str(res.get("error"))[:300])
                continue
            rows = res.get("result") or res.get("data") or []
            print(f"[{table}] ok")
            break
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
    elif cmd in ("admin-lockdown", "admin-reset"):
        # Prints only counts — no emails reach the (public) workflow log.
        rows = call("POST", "/database/query", {"query": ADMIN_LOCKDOWN_SQL if cmd == "admin-lockdown" else ADMIN_RESET_SQL})
        for r in rows or []:
            print(" | ".join(f"{k} = {v}" for k, v in r.items()))
        print("Admin area locked for 30 days; all admins signed out." if cmd == "admin-lockdown"
              else "Admin passwords cleared; all admins signed out. Sign in and set a new admin password.")
    else:
        sys.exit(__doc__)
