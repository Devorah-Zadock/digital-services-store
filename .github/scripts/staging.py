#!/usr/bin/env python3
"""DeskKit Automate — staging environment helper for .github/workflows/staging.yml.

Works ONLY on the free test project "deskkit-staging". Every command first
finds that project by name and refuses to continue if it can't, or if it
would be the live project. The live project is only ever READ here (its
schema, never its data, by `schema-dump` in the workflow).

  staging.py env            write STG_REF / STG_URL / STG_ANON / STG_SERVICE /
                            STG_WEB_URL to $GITHUB_ENV (service key masked)
  staging.py reset-schema <dump.sql>   wipe staging's public schema and load the
                            live schema dump (structure only — no rows)
  staging.py sql <file>...  run SQL files on staging
  staging.py secrets        set the Edge Function secrets (safe mail mode, cron secret)
  staging.py cron           schedule the worker (pg_cron + pg_net) with the secret
  staging.py auth           auth settings for testing (auto-confirm, staging URL)
  staging.py status         row counts of the Automate tables (no content)

Logs are public: nothing here prints keys, emails or row contents.
"""
import json
import os
import re
import secrets
import sys
import urllib.error
import urllib.request

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
LIVE_REF = "vafkjsetlrpaczsmqvqs"
STAGING_NAME = "deskkit-staging"
ROOT = "https://api.supabase.com/v1"
WEB_URL = os.environ.get("STG_WEB_URL_OVERRIDE") or "https://deskkit-staging-web.deskkit.workers.dev"


def call(method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(ROOT + path, data=data, method=method, headers={
        "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json", "User-Agent": "deskkit-staging"})
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            txt = res.read().decode()
            return txt if raw else (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:1500]
        # never echo secrets that might be inside a failing request body
        sys.exit(f"{method} {path.split('?')[0]} failed: HTTP {e.code} {detail}")


def staging_ref():
    projects = call("GET", "/projects") or []
    match = [p for p in projects if p.get("name") == STAGING_NAME]
    if len(match) != 1:
        sys.exit(f"expected exactly one project named {STAGING_NAME}, found {len(match)} — stopping")
    ref = match[0].get("id") or match[0].get("ref")
    if not ref or ref == LIVE_REF:
        sys.exit("refusing: target is not the staging project")
    status = str(match[0].get("status", ""))
    if not status.upper().startswith("ACTIVE"):
        sys.exit(f"staging project is {status} (paused?) — restore it in the Supabase dashboard first")
    return ref


def sql(ref, query):
    return call("POST", f"/projects/{ref}/database/query", {"query": query})


def cmd_env():
    ref = staging_ref()
    keys = call("GET", f"/projects/{ref}/api-keys?reveal=true") or []
    anon = next((k.get("api_key") for k in keys if k.get("name") == "anon"), None)
    service = next((k.get("api_key") for k in keys if k.get("name") == "service_role"), None)
    if not anon or not service:
        sys.exit("could not read the staging API keys")
    print(f"::add-mask::{service}")
    with open(os.environ["GITHUB_ENV"], "a") as f:
        f.write(f"STG_REF={ref}\nSTG_URL=https://{ref}.supabase.co\nSTG_ANON={anon}\nSTG_SERVICE={service}\nSTG_WEB_URL={WEB_URL}\n")
    print(f"staging project: {ref} (active)")


def cmd_reset_schema(path):
    ref = staging_ref()
    dump = open(path, encoding="utf-8").read()
    # The dump is the live STRUCTURE only. Drop the few top-level lines the
    # platform owns (session settings, the schema itself); function bodies
    # are left untouched because filtering is line-based on single-line
    # statements only.
    skip = re.compile(r'^(SET |SELECT pg_catalog\.set_config|CREATE SCHEMA IF NOT EXISTS "public"|ALTER SCHEMA "public" OWNER|COMMENT ON SCHEMA "public")', re.I)
    body = "\n".join(line for line in dump.splitlines() if not skip.match(line))
    reset = """
      drop schema if exists public cascade;
      create schema public;
      grant usage on schema public to postgres, anon, authenticated, service_role;
      grant all on schema public to postgres, service_role;
      alter default privileges in schema public grant all on tables to postgres, service_role;
      alter default privileges in schema public grant all on functions to postgres, service_role;
      alter default privileges in schema public grant all on sequences to postgres, service_role;
    """
    sql(ref, reset)
    sql(ref, body)
    rows = sql(ref, "select count(*)::int as n from information_schema.tables where table_schema = 'public'") or []
    print(f"staging schema loaded from the live structure: {rows[0]['n'] if rows else '?'} tables (no rows copied)")


def cmd_sql(files):
    ref = staging_ref()
    for f in files:
        rows = sql(ref, open(f, encoding="utf-8").read())
        n = len(rows) if isinstance(rows, list) else 0
        print(f"OK: {f} ({n} result rows)")


def cmd_secrets():
    ref = staging_ref()
    cron = secrets.token_urlsafe(32)
    print(f"::add-mask::{cron}")
    call("POST", f"/projects/{ref}/secrets", [
        {"name": "AUTOMATE_ENV", "value": "staging"},
        {"name": "AUTOMATE_CRON_SECRET", "value": cron},
        {"name": "AUTOMATE_APP_URL", "value": WEB_URL + "/automate.html"},
        {"name": "AUTOMATE_PUBLIC_URL", "value": WEB_URL},
        # Staging never sends real email: anything but "live" = simulated.
        {"name": "MAIL_MODE", "value": "sink"},
    ])
    with open(os.environ["GITHUB_ENV"], "a") as f:
        f.write(f"STG_CRON_SECRET={cron}\n")
    # the same secret, for pg_cron's calls to the worker
    sql(ref, f"""
      do $$ begin
        if exists (select 1 from vault.secrets where name = 'automate_cron_secret') then
          perform vault.update_secret((select id from vault.secrets where name = 'automate_cron_secret'), '{cron}');
        else
          perform vault.create_secret('{cron}', 'automate_cron_secret');
        end if;
      end $$;""")
    print("function secrets set (mail mode: simulated only)")


def cmd_cron():
    ref = staging_ref()
    url = f"https://{ref}.supabase.co/functions/v1/automate-worker"
    sql(ref, f"""
      create extension if not exists pg_cron;
      create extension if not exists pg_net;
      select cron.unschedule(jobid) from cron.job where jobname in ('automate-tick', 'automate-daily');
      select cron.schedule('automate-tick', '* * * * *', $job$
        select net.http_post(
          url := '{url}',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
                       (select decrypted_secret from vault.decrypted_secrets where name = 'automate_cron_secret')),
          body := '{{}}'::jsonb, timeout_milliseconds := 55000);
      $job$);
      -- 05:00 UTC = 07:00/08:00 Israel: the morning brief
      select cron.schedule('automate-daily', '0 5 * * *', $job$
        select net.http_post(
          url := '{url}',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
                       (select decrypted_secret from vault.decrypted_secrets where name = 'automate_cron_secret')),
          body := '{{"task": "daily"}}'::jsonb, timeout_milliseconds := 55000);
      $job$);
    """)
    rows = sql(ref, "select jobname, schedule from cron.job where jobname like 'automate-%' order by 1") or []
    for r in rows:
        print(f"  cron: {r['jobname']} = {r['schedule']}")


def cmd_auth():
    ref = staging_ref()
    call("PATCH", f"/projects/{ref}/config/auth", {
        "site_url": WEB_URL, "uri_allow_list": WEB_URL + "/**",
        # Test accounts only: no confirmation email is ever sent from staging.
        "mailer_autoconfirm": True, "disable_signup": False,
    })
    print("staging auth: auto-confirm on, site url = staging web")


def cmd_status():
    ref = staging_ref()
    rows = sql(ref, """
      select 'contacts' t, count(*)::int n from public.contacts union all
      select 'automations', count(*) from public.automations union all
      select 'runs', count(*) from public.automation_runs union all
      select 'runs_failed', count(*) from public.automation_runs where status = 'failed' union all
      select 'messages', count(*) from public.automation_messages union all
      select 'messages_sent_for_real', count(*) from public.automation_messages where status = 'sent' union all
      select 'messages_simulated', count(*) from public.automation_messages where status = 'simulated'
    """) or []
    for r in rows:
        print(f"  {r['t']}: {r['n']}")


if __name__ == "__main__":
    if not TOKEN:
        sys.exit("SUPABASE_ACCESS_TOKEN is not set")
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "env":
        cmd_env()
    elif cmd == "reset-schema":
        cmd_reset_schema(sys.argv[2])
    elif cmd == "sql":
        cmd_sql(sys.argv[2:])
    elif cmd == "secrets":
        cmd_secrets()
    elif cmd == "cron":
        cmd_cron()
    elif cmd == "auth":
        cmd_auth()
    elif cmd == "status":
        cmd_status()
    else:
        sys.exit(__doc__)
