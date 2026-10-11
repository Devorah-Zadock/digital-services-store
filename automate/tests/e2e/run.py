#!/usr/bin/env python3
"""DeskKit Automate — end-to-end tests against the STAGING project only.

Creates two throw-away test businesses (fake @example.com addresses, no
real person), runs every automation through the real database, functions
and worker, checks the outcomes, and deletes the test accounts at the end
(everything they own is deleted with them).

Nothing here can reach a real customer:
  * it talks only to the staging project (STG_URL, from staging.py env),
  * staging's mail mode is "simulated" — and test T00 proves no email was
    ever really sent,
  * failures of the email provider are injected (automate_test_controls),
    never caused for real.

Output is public (GitHub logs): pass/fail lines and counts only.
"""
import concurrent.futures
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

URL = os.environ["STG_URL"].rstrip("/")
ANON = os.environ["STG_ANON"]
SERVICE = os.environ["STG_SERVICE"]
CRON = os.environ["STG_CRON_SECRET"]
RUN = secrets.token_hex(3)
RESULTS = []


# ---------------------------------------------------------------- http
def http(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            txt = res.read().decode()
            return res.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, {"raw": txt[:300]}


def rest(method, path, body=None, token=None, prefer="return=representation"):
    key = ANON if token else SERVICE
    h = {"apikey": key, "Authorization": "Bearer " + (token or SERVICE), "Prefer": prefer}
    return http(method, f"{URL}/rest/v1/{path}", body, h)


def rows(path, token=None):
    st, data = rest("GET", path, token=token)
    return data if st == 200 and isinstance(data, list) else []


def rpc(name, args=None):
    return rest("POST", f"rpc/{name}", args or {})


def fn(name, body, token=None):
    h = {"apikey": ANON, "Authorization": "Bearer " + (token or ANON)}
    return http("POST", f"{URL}/functions/v1/{name}", body, h)


def worker(task=None):
    st, data = http("POST", f"{URL}/functions/v1/automate-worker", {"task": task} if task else {}, {"x-cron-secret": CRON})
    if st != 200:
        raise AssertionError(f"worker HTTP {st}: {data}")
    return data


def drain(n=3, task=None):
    out = []
    for _ in range(n):
        out.append(worker(task))
    return out


# ---------------------------------------------------------------- helpers
def check(name, cond, detail=""):
    RESULTS.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  [{detail}]"))
    return bool(cond)


def make_user(tag):
    email = f"automate-test-{tag}-{RUN}@example.com"
    pw = secrets.token_urlsafe(18)
    st, u = http("POST", f"{URL}/auth/v1/admin/users", {"email": email, "password": pw, "email_confirm": True},
                 {"apikey": SERVICE, "Authorization": "Bearer " + SERVICE})
    assert st in (200, 201), f"create user {st} {u}"
    st, t = http("POST", f"{URL}/auth/v1/token?grant_type=password", {"email": email, "password": pw}, {"apikey": ANON})
    assert st == 200, f"sign in {st}"
    return {"id": u["id"], "email": email, "token": t["access_token"]}


def delete_user(uid):
    http("DELETE", f"{URL}/auth/v1/admin/users/{uid}", None, {"apikey": SERVICE, "Authorization": "Bearer " + SERVICE})


def api(user, action, **kw):
    return fn("automate-api", {"action": action, **kw}, token=user["token"])


def set_setting(key, value):
    rest("PATCH", f"automate_settings?key=eq.{key}", {"value": value}, prefer="return=minimal")


def get_setting(key):
    r = rows(f"automate_settings?key=eq.{key}&select=value")
    return r[0]["value"] if r else None


def fault(mode, n):
    rest("POST", "automate_test_controls", {"key": "mail", "value": {"mode": mode, "remaining": n}}, prefer="resolution=merge-duplicates,return=minimal")


def runs_of(uid, template=None):
    q = f"automation_runs?user_id=eq.{uid}&order=created_at.asc&select=*"
    if template:
        q += f"&template_key=eq.{template}"
    return rows(q)


def messages_of(uid, extra=""):
    return rows(f"automation_messages?user_id=eq.{uid}&order=created_at.asc&select=id,purpose,status,recipient_role,attempts,error,run_id,next_attempt_at{extra}")


def fast_forward_runs(uid):
    """Make every waiting run of this business due now (time travel for tests)."""
    for r in runs_of(uid):
        if r["status"] in ("waiting", "retrying", "queued"):
            ctx = r.get("context") or {}
            waits = ctx.get("waits") or {}
            for k in waits:
                waits[k] = "2000-01-01T00:00:00Z"
            ctx["waits"] = waits
            rest("PATCH", f"automation_runs?id=eq.{r['id']}", {"next_run_at": "2000-01-01T00:00:00Z", "context": ctx}, prefer="return=minimal")


def fast_forward_messages(uid):
    rest("PATCH", f"automation_messages?user_id=eq.{uid}&status=eq.deferred", {"next_attempt_at": "2000-01-01T00:00:00Z"}, prefer="return=minimal")


def wait_until(fn_, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        v = fn_()
        if v:
            return v
        worker()
    return fn_()


# ---------------------------------------------------------------- tests
def main():
    saved = {k: get_setting(k) for k in ("kill_switch", "plan_limits", "email_caps", "quiet_hours")}
    set_setting("kill_switch", {"on": False})
    set_setting("quiet_hours", {"start": 0, "end": 0, "shabbat": False})   # tests run at any hour
    set_setting("email_caps", {"automation_daily": 1000})
    fault("none", 0)
    a = make_user("a")
    b = make_user("b")
    try:
        run_tests(a, b)
    except Exception as e:  # a crash is a failure, with the reason
        check("suite ran to completion", False, str(e)[:300])
    finally:
        for k, v in saved.items():
            if v is not None:
                set_setting(k, v)
        fault("none", 0)
        delete_user(a["id"])
        delete_user(b["id"])
        left = rows(f"contacts?user_id=in.({a['id']},{b['id']})&select=id")
        check("cleanup: test accounts and all their data deleted", not left)

    failed = [r for r in RESULTS if not r[1]]
    print(f"\n{len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(f"### Automate end-to-end tests: {len(RESULTS) - len(failed)} passed, {len(failed)} failed\n\n")
            for n, ok, d in RESULTS:
                f.write(f"- {'✅' if ok else '❌'} {n}{'' if ok else f' — {d}'}\n")
    sys.exit(1 if failed else 0)


def run_tests(a, b):
    slug = f"t{RUN}-a"
    # A test site for A (customer sites' contact forms post to lead-intake).
    st, err = rest("POST", "site_projects", {"user_id": a["id"], "template": "test", "data": {}, "slug": slug}, prefer="return=minimal")
    check("setup: test site created", st < 300, f"HTTP {st} {str(err)[:200]}")

    # ---- profile + activation
    st, _ = api(a, "save-profile", business_name="עסק בדיקה", business_type="home_services", reply_email="owner-a@example.com")
    check("profile saved", st == 200)
    st, ov = api(a, "overview")
    check("overview returns the catalog (7 automations, 6 packs)", st == 200 and len(ov["catalog"]["templates"]) >= 7 and len(ov["catalog"]["packs"]) >= 6)
    st, r = api(a, "activate", template="review_request", config={})
    check("an automation that needs a setting refuses to start without it", st == 400 and "review_url" in str(r))
    st, r = api(a, "activate-pack", pack="home_services")
    check("business pack activates its automations", st == 200 and "lead_autopilot" in r.get("activated", []), str(r)[:200])

    # ---- T1 isolation
    st, c = rest("POST", "contacts", {"name": "ליד ידני", "phone": "0501111111"}, token=a["token"])
    a_contact = c[0]["id"] if st == 201 else None
    check("T1 owner can add a contact", st == 201, f"HTTP {st} {c}")
    check("T1 another business cannot see it", rows(f"contacts?id=eq.{a_contact}", token=b["token"]) == [])
    st, upd = rest("PATCH", f"contacts?id=eq.{a_contact}", {"name": "hacked"}, token=b["token"])
    check("T1 another business cannot change it", st in (200, 204) and not upd)
    st, _ = rest("DELETE", f"contacts?id=eq.{a_contact}", token=b["token"])
    check("T1 another business cannot delete it", len(rows(f"contacts?id=eq.{a_contact}&select=id")) == 1)
    st, anon_rows = http("GET", f"{URL}/rest/v1/contacts?select=*", None, {"apikey": ANON})
    check("T1 anonymous visitors see no contacts", st in (401, 403) or anon_rows == [], f"HTTP {st}")
    st, _ = rest("POST", "contacts", {"name": "fake form", "source": "site_form"}, token=a["token"])
    check("T1 owner cannot fake a website enquiry", st >= 400)
    st, _ = rest("POST", "automations", {"user_id": a["id"], "template_key": "x", "trigger_type": "x"}, token=a["token"])
    check("T1 automations can't be written directly (only through the API)", st >= 400)
    for t in ("automate_settings", "automate_test_controls"):
        st, d = rest("GET", f"{t}?select=*", token=a["token"])
        check(f"T1 users cannot read {t}", st >= 400 or d == [])
    check("T1 B sees none of A's runs or messages",
          rows(f"automation_runs?user_id=eq.{a['id']}", token=b["token"]) == [] and rows(f"automation_messages?user_id=eq.{a['id']}", token=b["token"]) == [])
    st, _ = rest("POST", "tasks", {"title": "x", "contact_id": a_contact}, token=b["token"])
    check("T1 B cannot attach a task to A's contact", st >= 400)

    # ---- T2 lead autopilot, happy path
    st, r = fn("lead-intake", {"site": slug, "name": "דנה בדיקה", "email": "lead-1@example.com", "phone": "050-123-4567", "message": "שלום", "consent": True})
    check("T2 website form accepted", st == 200 and r.get("ok"), str(r))
    lead = (rows(f"contacts?user_id=eq.{a['id']}&source=eq.site_form&select=*") or [None])[0]
    check("T2 enquiry saved for the site's owner", bool(lead))
    run = wait_until(lambda: next((x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead["id"] and x["status"] == "waiting"), None))
    check("T2 run reached its first wait", bool(run))
    drain(1)
    msgs = [m for m in messages_of(a["id"]) if m["run_id"] == (run or {}).get("id")]
    purposes = sorted(m["purpose"] for m in msgs)
    check("T2 owner alerted and client acknowledged", purposes == ["lead_ack", "new_lead"], str(purposes))
    check("T2 emails were only simulated", all(m["status"] == "simulated" for m in msgs), str([m["status"] for m in msgs]))
    tasks = rows(f"tasks?user_id=eq.{a['id']}&contact_id=eq.{lead['id']}&select=*")
    check("T2 follow-up task created", len(tasks) == 1 and tasks[0]["origin"] == "automation")
    fast_forward_runs(a["id"]); drain(2)
    msgs = [m for m in messages_of(a["id"]) if m["run_id"] == run["id"]]
    check("T2 reminder when not handled in time", "lead_reminder" in [m["purpose"] for m in msgs])
    rest("PATCH", f"contacts?id=eq.{lead['id']}", {"stage": "inprogress"}, token=a["token"])
    fast_forward_runs(a["id"]); drain(2)
    r2 = runs_of(a["id"], "lead_autopilot")
    this = next(x for x in r2 if x["id"] == run["id"])
    msgs = [m for m in messages_of(a["id"]) if m["run_id"] == run["id"]]
    check("T2 handled lead → run stops, no further reminder", this["status"] == "stopped" and "lead_cooling" not in [m["purpose"] for m in msgs], this["status"])

    # ---- T3 duplicates
    before = len(rows(f"contacts?user_id=eq.{a['id']}&select=id"))
    st, r = fn("lead-intake", {"site": slug, "name": "דנה בדיקה", "email": "lead-1@example.com", "phone": "050-123-4567", "consent": True})
    check("T3 same person twice in 10 minutes = one enquiry", r.get("duplicate") is True and len(rows(f"contacts?user_id=eq.{a['id']}&select=id")) == before)
    st, n1 = rpc("automate_emit", {"p_user": a["id"], "p_type": "lead.created", "p_subject_type": "contact", "p_subject_id": lead["id"], "p_key": "lead.created:" + lead["id"], "p_payload": {}})
    check("T3 the same event twice starts nothing new", st == 200 and n1 == 0, f"{st} {n1}")
    st, r = fn("lead-intake", {"site": slug, "name": "יוסי מקביל", "email": "lead-2@example.com", "consent": True})
    lead2 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-2@example.com&select=id")[0]
    with concurrent.futures.ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda _: worker(), range(4)))
    drain(1)
    run2 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead2["id"])
    m2 = [m for m in messages_of(a["id"]) if m["run_id"] == run2["id"]]
    check("T3 four workers at once → each email exactly once", sorted(m["purpose"] for m in m2) == ["lead_ack", "new_lead"], str([m["purpose"] for m in m2]))

    # ---- T4 temporary provider failure → retry → delivered once
    fault("transient", 2)
    fn("lead-intake", {"site": slug, "name": "רונית ניסיון", "email": "lead-3@example.com", "consent": True})
    lead3 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-3@example.com&select=id")[0]
    for _ in range(4):
        drain(1); fast_forward_messages(a["id"])
    run3 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead3["id"])
    m3 = [m for m in messages_of(a["id"]) if m["run_id"] == run3["id"]]
    statuses = sorted(m["status"] for m in m3)
    check("T4 provider outage: retried and delivered, nothing doubled", statuses == ["simulated", "simulated"] and max(m["attempts"] for m in m3) >= 2, str([(m["purpose"], m["status"], m["attempts"]) for m in m3]))

    # ---- T5 permanent failure → failed + alert, not retried forever
    fault("permanent", 1)
    fn("lead-intake", {"site": slug, "name": "כתובת שגויה", "email": "lead-4@example.com", "consent": True})
    drain(3)
    fault("none", 0)
    lead4 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-4@example.com&select=id")[0]
    run4 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead4["id"])
    m4 = [m for m in messages_of(a["id"]) if m["run_id"] == run4["id"]]
    check("T5 rejected email marked failed (one), others still delivered", sorted(m["status"] for m in m4) == ["failed", "simulated"], str([m["status"] for m in m4]))
    check("T5 owner gets an alert about it", len(rows(f"automate_alerts?user_id=eq.{a['id']}&kind=eq.message_failed&select=id")) == 1)

    # ---- T6 provider quota → waits for tomorrow, not lost
    fault("quota", 1)
    fn("lead-intake", {"site": slug, "name": "מכסה נגמרה", "email": "lead-5@example.com", "consent": True})
    drain(2)
    fault("none", 0)
    lead5 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-5@example.com&select=id")[0]
    run5 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead5["id"])
    m5 = [m for m in messages_of(a["id"]) if m["run_id"] == run5["id"]]
    check("T6 out of provider quota → email waits (deferred), not lost", "deferred" in [m["status"] for m in m5], str([m["status"] for m in m5]))
    check("T6 system alert raised once", len(rows("automate_alerts?user_id=is.null&kind=eq.provider_quota&select=id")) >= 1)
    fast_forward_messages(a["id"]); drain(1)
    m5 = [m for m in messages_of(a["id"]) if m["run_id"] == run5["id"]]
    check("T6 after the quota resets it goes out", all(m["status"] == "simulated" for m in m5), str([m["status"] for m in m5]))

    # ---- T7 system daily cap
    st, today = rpc("automate_emails_today")
    set_setting("email_caps", {"automation_daily": int(today)})
    fn("lead-intake", {"site": slug, "name": "תקרה יומית", "email": "lead-6@example.com", "consent": True})
    drain(2)
    lead6 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-6@example.com&select=id")[0]
    run6 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead6["id"])
    m6 = [m for m in messages_of(a["id"]) if m["run_id"] == run6["id"]]
    check("T7 daily cap reached → emails wait for tomorrow", m6 and all(m["status"] == "deferred" for m in m6), str([m["status"] for m in m6]))
    set_setting("email_caps", {"automation_daily": 1000})
    fast_forward_messages(a["id"]); drain(1)
    m6 = [m for m in messages_of(a["id"]) if m["run_id"] == run6["id"]]
    check("T7 next day they go out", all(m["status"] == "simulated" for m in m6))

    # ---- T8 business monthly email quota
    month = time.strftime("%Y-%m-01")
    used = (rows(f"automate_usage?user_id=eq.{a['id']}&period=eq.{month}&select=emails") or [{"emails": 0}])[0]["emails"]
    set_setting("plan_limits", {"free": {"active_automations": 6, "runs_per_month": 300, "emails_per_month": used}})
    fn("lead-intake", {"site": slug, "name": "מכסה חודשית", "email": "lead-7@example.com", "consent": True})
    drain(2)
    auto = rows(f"automations?user_id=eq.{a['id']}&template_key=eq.lead_autopilot&select=status")[0]
    lead7 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-7@example.com&select=id")[0]
    run7 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead7["id"])
    check("T8 monthly email quota → automation on hold, run waiting (nothing lost)", auto["status"] == "blocked_quota" and run7["status"] == "waiting", f"{auto['status']} {run7['status']}")
    set_setting("plan_limits", {"free": {"active_automations": 6, "runs_per_month": 300, "emails_per_month": 1000}})
    fast_forward_runs(a["id"]); drain(2)
    auto = rows(f"automations?user_id=eq.{a['id']}&template_key=eq.lead_autopilot&select=status")[0]
    m7 = [m for m in messages_of(a["id"]) if m["run_id"] == run7["id"]]
    check("T8 quota renewed → continues by itself", auto["status"] == "active" and "new_lead" in [m["purpose"] for m in m7], f"{auto['status']} {[m['purpose'] for m in m7]}")

    # ---- T9 kill switch
    set_setting("kill_switch", {"on": True, "reason": "test"})
    fn("lead-intake", {"site": slug, "name": "מתג חירום", "email": "lead-8@example.com", "consent": True})
    w = worker()
    lead8 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-8@example.com&select=id")[0]
    run8 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead8["id"])
    check("T9 kill switch on → worker does nothing", w.get("killed") is True and run8["status"] == "queued", f"{w} {run8['status']}")
    set_setting("kill_switch", {"on": False})
    drain(2)
    run8 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["id"] == run8["id"])
    check("T9 switched off → work continues where it stopped", run8["status"] == "waiting")

    # ---- T10 pause / resume
    api(a, "pause", template="lead_autopilot")
    fast_forward_runs(a["id"]); drain(1)
    run8 = next(x for x in runs_of(a["id"], "lead_autopilot") if x["id"] == run8["id"])
    msgs8 = [m["purpose"] for m in messages_of(a["id"]) if m["run_id"] == run8["id"]]
    check("T10 paused → waiting runs hold, no reminder sent", run8["status"] == "waiting" and "lead_reminder" not in msgs8, f"{run8['status']} {msgs8}")
    fn("lead-intake", {"site": slug, "name": "בזמן השהיה", "email": "lead-9@example.com", "consent": True})
    lead9 = rows(f"contacts?user_id=eq.{a['id']}&email=eq.lead-9@example.com&select=id")[0]
    check("T10 paused → new enquiries are saved but start no run", not [x for x in runs_of(a["id"], "lead_autopilot") if x["subject_id"] == lead9["id"]])
    api(a, "resume", template="lead_autopilot")
    fast_forward_runs(a["id"]); drain(2)
    msgs8 = [m["purpose"] for m in messages_of(a["id"]) if m["run_id"] == run8["id"]]
    check("T10 resumed → continues (reminder sent)", "lead_reminder" in msgs8, str(msgs8))

    # ---- T11 quotes
    st, q = rest("POST", "quote_saves", {"user_id": a["id"], "data": {"businessName": "עסק בדיקה", "recipient": "לקוח", "eventName": "שיפוץ מטבח", "price": "12,000", "template": "classic"}}, token=a["token"])
    quote_id = q[0]["id"] if st == 201 else None
    check("T11 quote saved", bool(quote_id), f"HTTP {st} {q}")
    st, r = api(b, "send-quote", quote_id=quote_id, client_name="x", client_email="x@example.com")
    check("T11 another business cannot send A's quote", st == 404)
    st, sent = api(a, "send-quote", quote_id=quote_id, client_name="משה לקוח", client_email="client-q1@example.com")
    check("T11 quote sent by link", st == 200 and sent.get("emailed") and len(sent["share"]["token"]) == 48, str(sent)[:200])
    token = sent["share"]["token"]
    drain(2)
    first = rows(f"automation_messages?user_id=eq.{a['id']}&purpose=eq.quote_sent&select=status")
    check("T11 client got the quote email (simulated)", first and first[0]["status"] == "simulated")
    st, pub = fn("quote-public", {"token": token})
    check("T11 public link shows the quote, nothing more", st == 200 and pub["status"] == "sent" and "user_id" not in pub and pub["quote"]["eventName"] == "שיפוץ מטבח")
    st, _ = fn("quote-public", {"token": "0" * 48})
    check("T11 wrong link → not found", st == 404)
    fast_forward_runs(a["id"]); drain(2)
    st, att = api(a, "attention")
    pend = [m for m in att.get("approvals", []) if m["purpose"] == "quote_reminder"]
    check("T11 reminder prepared and waiting for owner approval", len(pend) == 1, str(att)[:200])
    st, _ = api(b, "approve-message", id=pend[0]["id"])
    check("T11 another business cannot approve it", st == 404)
    st, _ = api(a, "approve-message", id=pend[0]["id"])
    drain(1)
    rem = rows(f"automation_messages?id=eq.{pend[0]['id']}&select=status")[0]
    check("T11 approved → sent", rem["status"] == "simulated")
    st, r = fn("quote-public", {"token": token, "action": "approve", "name": "משה לקוח"})
    check("T11 client approves in the link", st == 200 and r["status"] == "approved")
    st, r = fn("quote-public", {"token": token, "action": "decline"})
    check("T11 a decided quote can't be changed again", st == 409)
    fast_forward_runs(a["id"]); drain(3)
    fr = [x for x in runs_of(a["id"], "quote_followup") if x["subject_id"] == sent["share"]["id"]][0]
    check("T11 approval stops the reminders", fr["status"] in ("cancelled", "stopped"), fr["status"])
    won = rows(f"contacts?user_id=eq.{a['id']}&email=eq.client-q1@example.com&select=stage")
    check("T11 approval → client added as won", won and won[0]["stage"] == "won")
    check("T11 approval → owner told + kickoff task", "quote_approved" in [m["purpose"] for m in messages_of(a["id"])] and
          any("לתאם" in t["title"] for t in rows(f"tasks?user_id=eq.{a['id']}&select=title")))
    welcome = [m for m in messages_of(a["id"]) if m["purpose"] == "welcome"]
    check("T11 → onboarding started for the new client (welcome email)", len(welcome) == 1)
    st, s2 = api(a, "send-quote", quote_id=quote_id, client_name="דוחה", client_email="client-q2@example.com")
    fn("quote-public", {"token": s2["share"]["token"], "action": "decline"})
    fast_forward_runs(a["id"]); drain(2)
    f2 = [x for x in runs_of(a["id"], "quote_followup") if x["subject_id"] == s2["share"]["id"]][0]
    rem2 = [m for m in messages_of(a["id"]) if m["run_id"] == f2["id"] and m["purpose"] == "quote_reminder"]
    check("T11 declined quote → no reminder ever", f2["status"] == "cancelled" and not rem2, f"{f2['status']} {len(rem2)}")

    # ---- T12 invoices
    st, inv = rest("POST", "invoice_saves", {"user_id": a["id"], "doc_type": "invoice_receipt", "status": "issued", "number": 101,
                                            "data": {"recipientName": "חברה בע\"מ"}, "issued_at": "2026-10-01T10:00:00Z"})
    inv_id = inv[0]["id"] if st == 201 else None
    check("T12 issued invoice exists", bool(inv_id), f"HTTP {st} {inv}")
    st, _ = api(b, "track-invoice", invoice_id=inv_id, due_date="2026-10-01", client_email="pay@example.com")
    check("T12 another business cannot track A's invoice", st == 404)
    api(a, "activate", template="invoice_collect", config={"client_messages": "auto", "max_reminders": 2})
    st, _ = api(a, "track-invoice", invoice_id=inv_id, due_date="2026-01-01", client_email="pay@example.com", amount=1170)
    check("T12 invoice tracked", st == 200)
    drain(3)
    ir = [x for x in runs_of(a["id"], "invoice_collect") if x["subject_id"] == inv_id][0]
    im = [m["purpose"] for m in messages_of(a["id"]) if m["run_id"] == ir["id"]]
    check("T12 overdue → polite reminder + owner told", "invoice_reminder" in im and "invoice_overdue" in im, str(im))
    original = rows(f"invoice_saves?id=eq.{inv_id}&select=status,number,data")[0]
    api(a, "invoice-status", invoice_id=inv_id, status="paid")
    fast_forward_runs(a["id"]); drain(2)
    ir = [x for x in runs_of(a["id"], "invoice_collect") if x["subject_id"] == inv_id][0]
    im2 = [m["purpose"] for m in messages_of(a["id"]) if m["run_id"] == ir["id"]]
    check("T12 marked paid → reminders stop", ir["status"] == "cancelled" and im2.count("invoice_reminder") == 1, f"{ir['status']} {im2}")
    after = rows(f"invoice_saves?id=eq.{inv_id}&select=status,number,data")[0]
    check("T12 the invoice document itself never changed", after == original)

    # ---- T13 review request
    api(a, "activate", template="review_request", config={"review_url": "https://g.page/r/test/review", "client_messages": "auto"})
    st, cc = rest("POST", "contacts", {"name": "לקוח מרוצה", "email": "happy@example.com", "stage": "won"}, token=a["token"])
    cid = cc[0]["id"]
    rest("PATCH", f"contacts?id=eq.{cid}", {"job_done_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, token=a["token"])
    drain(1); fast_forward_runs(a["id"]); drain(2)
    rr = [x for x in runs_of(a["id"], "review_request") if x["subject_id"] == cid]
    check("T13 job done → review request sent", rr and "review_request" in [m["purpose"] for m in messages_of(a["id"]) if m["run_id"] == rr[0]["id"]])

    # ---- T14 morning brief (give A one overdue task so there is something to report)
    rest("POST", "tasks", {"title": "משימה באיחור", "due_at": "2026-01-01T08:00:00Z"}, token=a["token"])
    worker("daily"); drain(1)
    dig = [m for m in messages_of(a["id"]) if m["purpose"] == "digest"]
    check("T14 morning brief sent (once)", len(dig) == 1)
    worker("daily"); drain(1)
    check("T14 a second daily tick the same day sends nothing more", len([m for m in messages_of(a["id"]) if m["purpose"] == "digest"]) == 1)

    # ---- T15 moving browser leads into the account
    api(b, "save-profile", business_name="עסק ב")
    api(b, "activate", template="lead_autopilot", config={})
    api(b, "activate", template="client_onboarding", config={})
    leads = [{"id": f"lead-{i}", "name": f"ליד {i}", "phone": "0500000000", "amount": 100 * i, "stage": ("won" if i == 0 else "new"), "createdAt": 1760000000000} for i in range(3)]
    st, r = api(b, "import-contacts", leads=leads)
    check("T15 import verified (server count matches)", st == 200 and r["verified"] and r["onServer"] == 3, str(r))
    st, r = api(b, "import-contacts", leads=leads)
    check("T15 importing again creates no duplicates", r["onServer"] == 3 and len(rows(f"contacts?user_id=eq.{b['id']}&select=id")) == 3)
    check("T15 imported leads start no automations", not runs_of(b["id"]))

    # ---- T16 history + T00 safety
    st, h = api(a, "history", limit=100)
    check("T16 history lists only the owner's runs with steps", st == 200 and h["runs"] and all(r_["id"] for r_ in h["runs"]) and h["steps"])
    st, h = api(b, "history", limit=100)
    check("T16 B's history has none of A's", st == 200 and not any(r_["template_key"] == "lead_autopilot" for r_ in h["runs"]))
    real = rows("automation_messages?status=eq.sent&select=id")
    check("T00 not a single email was really sent from staging", real == [])


if __name__ == "__main__":
    main()
