#!/usr/bin/env python3
"""DeskKit Automate — careful steps on the LIVE project, for
.github/workflows/automate-live.yml. Every step checks before it acts and
stops at the first surprise.

  automate_live.py names                    engine object names (from the SQL file)
  automate_live.py counts <db-url|live> <out.json>
                                            exact row counts of every existing table
  automate_live.py compare <before.json> <after.json>
                                            existing tables must be unchanged
  automate_live.py check <db-url|live> [installed]
                                            security / state checks (read-only)
  automate_live.py preflight                live, read-only: name clashes, secrets
                                            present, extensions available, admin list
  automate_live.py install                  live: 10_engine.sql + 20_live_disabled.sql
                                            in ONE transaction, then `check`
  automate_live.py upgrade                  live: re-apply the engine to an existing
                                            install (settings kept), then `check`
  automate_live.py pilot-settings           live: pilot list = the owner's admin
                                            account only (read from the database)
  automate_live.py pilot-secrets            live: Automate's own function secrets
                                            (simulated mail, owner-only allowlist)
  automate_live.py pilot-cron               live: schedule the worker (pg_cron)
  automate_live.py pilot-check              live, read-only: everything is limited
                                            to the owner's account

<db-url> runs through psql (the restored-backup rehearsal); "live" runs
through the Supabase Management API. The repository is public: this prints
counts, names of database objects and yes/no answers only — never emails,
keys or row contents.
"""
import json
import os
import re
import secrets
import subprocess
import sys
import urllib.error
import urllib.request

LIVE_REF = "vafkjsetlrpaczsmqvqs"
ROOT = "https://api.supabase.com/v1"
ENGINE = "automate/sql/10_engine.sql"
LIVE_MODE = "automate/sql/20_live_disabled.sql"
LIVE_URL = f"https://{LIVE_REF}.supabase.co"
APP_URL = "https://deskkit.co.il/automate-app.html"
PUBLIC_URL = "https://deskkit.co.il"


def die(msg):
    sys.exit("STOP: " + msg)


# ------------------------------------------------------------------ access
def api(method, path, body=None):
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        die("SUPABASE_ACCESS_TOKEN is not set")
    req = urllib.request.Request(ROOT + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                                          "User-Agent": "deskkit-automate-live"})
    try:
        with urllib.request.urlopen(req, timeout=300) as res:
            txt = res.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        detail = e.read().decode()[:800]
        # never echo a request body (it may hold SQL with values) — only the error
        die(f"{method} {path.split('?')[0]} → HTTP {e.code}: {detail}")


def q(target, sql):
    """Run SQL and return rows as a list of dicts."""
    if target == "live":
        return api("POST", f"/projects/{LIVE_REF}/database/query", {"query": sql}) or []
    out = subprocess.run(["psql", target, "-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-c",
                          f"select coalesce(json_agg(x), '[]'::json) from ({sql}) x"],
                         capture_output=True, text=True)
    if out.returncode != 0:
        die("psql: " + out.stderr.strip()[:600])
    return json.loads(out.stdout.strip() or "[]")


def lit(s):
    return "'" + str(s).replace("'", "''") + "'"


# ------------------------------------------------------------------ names
def names():
    sql = open(ENGINE, encoding="utf-8").read()
    return {
        "tables": sorted(set(re.findall(r"create table if not exists public\.(\w+)", sql))),
        "functions": sorted(set(re.findall(r"create or replace function public\.(\w+)", sql))),
        "indexes": sorted(set(re.findall(r"create (?:unique )?index if not exists (\w+)", sql))),
    }


def cmd_names():
    n = names()
    for k, v in n.items():
        print(f"{k} ({len(v)}): {', '.join(v)}")


# ------------------------------------------------------------------ counts
def counts(target):
    engine_tables = set(names()["tables"])
    tables = [r["t"] for r in q(target, """
        select c.relname as t from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p') order by 1""")]
    existing = [t for t in tables if t not in engine_tables]
    parts = [f"select {lit(t)} as t, count(*)::bigint as n from public.{t}" for t in existing]
    parts.append("select 'auth.users' as t, count(*)::bigint as n from auth.users")
    rows = q(target, " union all ".join(parts))
    return {r["t"]: int(r["n"]) for r in rows}


def cmd_counts(target, out):
    c = counts(target)
    json.dump(c, open(out, "w"), indent=1, sort_keys=True)
    print(f"{len(c)} existing tables counted, {sum(c.values())} rows in total")


def cmd_compare(before, after):
    b, a = json.load(open(before)), json.load(open(after))
    changed = [t for t in b if t not in a or a[t] != b[t]]
    # The live site keeps working during an install: on live, a table can
    # legitimately grow by a few rows (a visit, a sign-up). Only the
    # rehearsal (a frozen copy) must match exactly.
    print(f"existing tables compared: {len(b)}; changed: {len(changed)}")
    for t in changed:
        print(f"  {t}: {b[t]} → {a.get(t)}")
    if changed and os.environ.get("COMPARE_STRICT") == "1":
        die("existing tables changed during the install rehearsal")
    if any(t not in a for t in b):
        die("an existing table disappeared")


# ------------------------------------------------------------------ checks
def check(target, installed=True):
    n = names()
    problems = []
    tl = ",".join(lit(t) for t in n["tables"])
    rows = q(target, f"""
        select c.relname as t, c.relrowsecurity as rls,
               has_table_privilege('anon', c.oid, 'select') or has_table_privilege('anon', c.oid, 'insert')
               or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete') as anon
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname in ({tl})""")
    found = {r["t"]: r for r in rows}
    if not installed:
        return found
    for t in n["tables"]:
        r = found.get(t)
        if not r:
            problems.append(f"table missing: {t}")
        elif not r["rls"]:
            problems.append(f"RLS off: {t}")
        elif r["anon"]:
            problems.append(f"anonymous visitors have rights on: {t}")
    fl = ",".join(lit(f) for f in n["functions"])
    fns = q(target, f"""
        select p.proname as f, pg_get_function_result(p.oid) as res,
               has_function_privilege('anon', p.oid, 'execute') as anon,
               has_function_privilege('authenticated', p.oid, 'execute') as auth
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ({fl})""")
    callable_by_users = sorted(f["f"] for f in fns if f["auth"] and f["res"] != "trigger")
    for f in fns:
        if f["anon"] and f["res"] != "trigger":
            problems.append(f"anonymous visitors can call: {f['f']}")
    expected_user_callable = {"automate_my_access"}
    extra = set(callable_by_users) - expected_user_callable
    if extra:
        problems.append("signed-in users can call more than expected: " + ", ".join(sorted(extra)))
    st = q(target, """
        select (select value from public.automate_settings where key = 'kill_switch') as kill,
               (select value ->> 'mode' from public.automate_settings where key = 'access') as mode,
               (select jsonb_array_length(coalesce(value -> 'emails', '[]')) from public.automate_settings where key = 'access') as pilot,
               (select count(*) from public.automations) as automations,
               (select count(*) from public.automation_messages where status = 'sent') as really_sent""")[0]
    # cron.job exists only once pg_cron is on — ask separately so the query parses.
    has_cron = q(target, "select to_regclass('cron.job') is not null as yes")[0]["yes"]
    st["cron_jobs"] = q(target, "select count(*) as n from cron.job where command ilike '%automate%'")[0]["n"] if has_cron else -1
    kill = st["kill"] if isinstance(st["kill"], dict) else json.loads(st["kill"] or "{}")
    print(f"tables: {len(found)}/{len(n['tables'])} present, RLS on all: {all(r['rls'] for r in found.values())}, "
          f"anonymous rights: {sum(1 for r in found.values() if r['anon'])}")
    print(f"functions: {len(fns)}; callable by signed-in users: {', '.join(callable_by_users) or 'none'}")
    print(f"emergency stop: {'ON' if kill.get('on') else 'off'}; access: {st['mode']} ({st['pilot']} account(s)); "
          f"automations: {st['automations']}; emails really sent: {st['really_sent']}; "
          f"scheduled worker jobs: {'no pg_cron' if st['cron_jobs'] == -1 else st['cron_jobs']}")
    return {"problems": problems, "kill": bool(kill.get("on")), "state": st}


def cmd_check(target, mode="installed"):
    r = check(target, installed=True)
    if mode == "fresh-install":
        if not r["kill"]:
            r["problems"].append("emergency stop is not on after install")
        if r["state"]["mode"] != "allowlist" or int(r["state"]["pilot"]) != 0:
            r["problems"].append("access is not closed after install")
        if int(r["state"]["cron_jobs"]) > 0:
            r["problems"].append("a worker schedule exists right after install")
    if r["problems"]:
        for p in r["problems"]:
            print("  PROBLEM: " + p)
        die(f"{len(r['problems'])} problem(s)")
    print("checks passed")


# ------------------------------------------------------------------ preflight
def cmd_preflight():
    n = names()
    tl = ",".join(lit(t) for t in n["tables"])
    il = ",".join(lit(i) for i in n["indexes"])
    fl = ",".join(lit(f) for f in n["functions"])
    clash = q("live", f"""
        select 'table' as kind, c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r','p','v','m') and c.relname in ({tl})
        union all
        select 'index', c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'i' and c.relname in ({il})
        union all
        select 'function', p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ({fl})""")
    already = q("live", "select to_regclass('public.automate_settings') is not null as yes")[0]["yes"]
    print(f"engine objects: {len(n['tables'])} tables, {len(n['functions'])} functions, {len(n['indexes'])} indexes")
    if already:
        print("Automate is already installed on live — objects below are its own:")
    print(f"name clashes with existing live objects: {len(clash)}")
    for c in clash:
        print(f"  {c['kind']}: {c['name']}")
    ext = q("live", """select name, installed_version is not null as on from pg_available_extensions
                        where name in ('pgcrypto','pg_cron','pg_net') order by 1""")
    print("extensions: " + ", ".join(f"{e['name']}={'installed' if e['on'] else 'available'}" for e in ext))
    have = {s.get("name") for s in (api("GET", f"/projects/{LIVE_REF}/secrets") or [])}
    for k in ("RESEND_API_KEY", "TURNSTILE_SECRET_KEY", "ADMIN_EMAILS", "AUTOMATE_MAIL_MODE", "AUTOMATE_CRON_SECRET", "ADMIN_TEST_CODES"):
        print(f"secret {k}: {'set' if k in have else 'not set'}")
    if "ADMIN_TEST_CODES" in have:
        die("ADMIN_TEST_CODES must never be set on the live project")
    admins = q("live", "select count(*) as n from public.admin_secrets")[0]["n"]
    print(f"accounts with an admin password: {admins}")
    size = q("live", "select pg_database_size(current_database()) as b")[0]["b"]
    print(f"database size: {int(size) / 1e6:.1f} MB of the free plan's 500 MB")
    if clash and not already:
        die("name clashes — the install would touch existing objects")
    print("preflight passed")
    return already


# ------------------------------------------------------------------ install
def cmd_install():
    if cmd_preflight():
        die("already installed — nothing to do (re-applying is a separate, reviewed step)")
    body = open(ENGINE, encoding="utf-8").read() + "\n" + open(LIVE_MODE, encoding="utf-8").read()
    if re.search(r"^\s*(begin|commit|rollback)\s*;", body, re.I | re.M):
        die("the SQL files must not manage transactions themselves")
    api("POST", f"/projects/{LIVE_REF}/database/query", {"query": "begin;\n" + body + "\ncommit;"})
    print("installed (one transaction)")
    cmd_check("live", "fresh-install")


def cmd_upgrade():
    """Re-apply the engine to an existing install (one transaction). The SQL is
    idempotent (create-if-missing / create-or-replace), and 20_live_disabled.sql
    does nothing once installed — so the owner's settings (emergency stop,
    pilot list) stay exactly as they are."""
    if not cmd_preflight():
        die("not installed yet — use install")
    before = q("live", "select key, value from public.automate_settings where key in ('kill_switch', 'access') order by key")
    body = open(ENGINE, encoding="utf-8").read() + "\n" + open(LIVE_MODE, encoding="utf-8").read()
    if re.search(r"^\s*(begin|commit|rollback)\s*;", body, re.I | re.M):
        die("the SQL files must not manage transactions themselves")
    api("POST", f"/projects/{LIVE_REF}/database/query", {"query": "begin;\n" + body + "\ncommit;"})
    after = q("live", "select key, value from public.automate_settings where key in ('kill_switch', 'access') order by key")
    if json.dumps(before, sort_keys=True) != json.dumps(after, sort_keys=True):
        die("the owner's settings changed during the upgrade")
    print("upgraded (one transaction); emergency stop and pilot list unchanged")
    cmd_check("live")


# ------------------------------------------------------------------ pilot
def owner_email():
    rows = q("live", "select lower(email) as e from public.admin_secrets")
    if len(rows) != 1:
        die(f"expected exactly one account with an admin password, found {len(rows)}")
    e = rows[0]["e"]
    print(f"::add-mask::{e}")
    return e


def cmd_pilot_settings():
    owner_email()  # exactly one, or stop
    q("live", """
        update public.automate_settings
           set value = jsonb_build_object('mode', 'allowlist', 'emails', (select jsonb_agg(lower(email)) from public.admin_secrets)),
               updated_at = now()
         where key = 'access'""")
    print("pilot list = the owner's admin account only")


def cmd_pilot_secrets():
    e = owner_email()
    cron = secrets.token_urlsafe(32)
    print(f"::add-mask::{cron}")
    api("POST", f"/projects/{LIVE_REF}/secrets", [
        {"name": "AUTOMATE_ENV", "value": "production"},
        # anything but "live" = every email is only simulated
        {"name": "AUTOMATE_MAIL_MODE", "value": "sink"},
        {"name": "AUTOMATE_MAIL_ALLOWLIST", "value": e},
        {"name": "AUTOMATE_CRON_SECRET", "value": cron},
        {"name": "AUTOMATE_APP_URL", "value": APP_URL},
        {"name": "AUTOMATE_PUBLIC_URL", "value": PUBLIC_URL},
    ])
    q("live", f"""
        do $$ begin
          if exists (select 1 from vault.secrets where name = 'automate_cron_secret') then
            perform vault.update_secret((select id from vault.secrets where name = 'automate_cron_secret'), {lit(cron)});
          else
            perform vault.create_secret({lit(cron)}, 'automate_cron_secret');
          end if;
        end $$""")
    print("Automate secrets set: mail simulated only, allowlist = owner, new worker secret")


def cmd_pilot_cron():
    url = f"{LIVE_URL}/functions/v1/automate-worker"
    q("live", "create extension if not exists pg_cron; create extension if not exists pg_net")
    q("live", f"""
        select cron.unschedule(jobname) from cron.job where jobname in ('automate-worker', 'automate-daily');
        select cron.schedule('automate-worker', '*/2 * * * *', $job$
          select net.http_post(url := {lit(url)},
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
              (select decrypted_secret from vault.decrypted_secrets where name = 'automate_cron_secret')),
            body := '{{}}'::jsonb, timeout_milliseconds := 55000)$job$);
        select cron.schedule('automate-daily', '5 5 * * *', $job$
          select net.http_post(url := {lit(url)},
            headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
              (select decrypted_secret from vault.decrypted_secrets where name = 'automate_cron_secret')),
            body := '{{"task": "daily"}}'::jsonb, timeout_milliseconds := 55000)$job$)""")
    print("worker scheduled every 2 minutes + daily at 08:05 Israel time (it does nothing while the emergency stop is on)")


def cmd_pilot_check():
    r = check("live", installed=True)
    st = r["state"]
    iso = q("live", """
        with pilot as (select lower(e) as e from public.automate_settings s,
                         jsonb_array_elements_text(s.value -> 'emails') e where s.key = 'access'),
             owner as (select lower(email) as e from public.admin_secrets),
             pilot_users as (select u.id from auth.users u where lower(u.email) in (select e from pilot))
        select (select count(*) from pilot) as pilot_n,
               (select count(*) from pilot where e not in (select e from owner)) as pilot_not_owner,
               (select count(*) from public.automations where user_id not in (select id from pilot_users)) as other_automations,
               (select count(*) from public.contacts where user_id not in (select id from pilot_users)) as other_contacts,
               (select count(*) from public.automation_messages where user_id not in (select id from pilot_users)) as other_messages,
               (select count(*) from public.automation_messages where status = 'sent') as really_sent""")[0]
    have = {s.get("name") for s in (api("GET", f"/projects/{LIVE_REF}/secrets") or [])}
    print(f"pilot accounts: {iso['pilot_n']} (not the owner: {iso['pilot_not_owner']})")
    print(f"data of other accounts — automations: {iso['other_automations']}, contacts: {iso['other_contacts']}, emails: {iso['other_messages']}")
    print(f"emails really sent: {iso['really_sent']}; mail allowlist secret: {'set' if 'AUTOMATE_MAIL_ALLOWLIST' in have else 'MISSING'}")
    bad = []
    if st["mode"] != "allowlist":
        bad.append("access is open to everyone")
    if int(iso["pilot_n"]) != 1 or int(iso["pilot_not_owner"]) != 0:
        bad.append("the pilot list is not exactly the owner")
    if int(iso["other_automations"]) or int(iso["other_contacts"]) or int(iso["other_messages"]):
        bad.append("Automate holds data of accounts outside the pilot")
    if int(iso["really_sent"]):
        bad.append("an email was really sent")
    if "AUTOMATE_MAIL_ALLOWLIST" not in have:
        bad.append("no mail allowlist")
    if "ADMIN_TEST_CODES" in have:
        bad.append("ADMIN_TEST_CODES is set on live (test-only switch)")
    bad += r["problems"]
    for b in bad:
        print("  PROBLEM: " + b)
    if bad:
        die(f"{len(bad)} problem(s)")
    print("pilot isolation checks passed")


if __name__ == "__main__":
    a = sys.argv[1:]
    cmd = a[0] if a else ""
    if cmd == "names":
        cmd_names()
    elif cmd == "counts" and len(a) == 3:
        cmd_counts(a[1], a[2])
    elif cmd == "compare" and len(a) == 3:
        cmd_compare(a[1], a[2])
    elif cmd == "check" and len(a) in (2, 3):
        cmd_check(a[1], a[2] if len(a) == 3 else "installed")
    elif cmd == "preflight":
        cmd_preflight()
    elif cmd == "install":
        cmd_install()
    elif cmd == "upgrade":
        cmd_upgrade()
    elif cmd == "pilot-settings":
        cmd_pilot_settings()
    elif cmd == "pilot-secrets":
        cmd_pilot_secrets()
    elif cmd == "pilot-cron":
        cmd_pilot_cron()
    elif cmd == "pilot-check":
        cmd_pilot_check()
    else:
        sys.exit(__doc__)
