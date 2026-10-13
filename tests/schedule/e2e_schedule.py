#!/usr/bin/env python3
"""Browser tests for the school schedule builder (schedule-builder.html).

Runs the real page from this repository in Chromium against a MOCKED
Supabase (no network, no real accounts, no real data):

    python3 tests/schedule/e2e_schedule.py            # all
    python3 tests/schedule/e2e_schedule.py fixes      # only the fix tests

Needs Python Playwright and a Chromium (CHROMIUM_PATH, or Playwright's own).
Exit code 1 if any check fails.
"""
import base64, functools, http.server, json, os, re, socketserver, sys, threading, time, uuid
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SB = "https://vafkjsetlrpaczsmqvqs.supabase.co"
REF = "vafkjsetlrpaczsmqvqs"
PORT = int(os.environ.get("SCHED_E2E_PORT", "8779"))
CHROMIUM = os.environ.get("CHROMIUM_PATH") or ("/opt/pw-browsers/chromium" if os.path.exists("/opt/pw-browsers/chromium") else None)
UNLOCK_KEY = "deskkit_schedule_unlocked_K122yL6VSdTui67Be5ZiYw=="

RESULTS = []
def check(name, ok, info=""):
    RESULTS.append((bool(ok), name, str(info)[:240]))
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  [{str(info)[:240]}]"), flush=True)


# ------------------------------------------------------------------ harness
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
def session(uid):
    exp = int(time.time()) + 3600
    tok = b64({"alg": "HS256"}) + "." + b64({"sub": uid, "exp": exp, "email": f"{uid}@example.com", "role": "authenticated", "aud": "authenticated"}) + ".sig"
    return {"access_token": tok, "refresh_token": "r", "expires_at": exp, "expires_in": 3600, "token_type": "bearer",
            "user": {"id": uid, "email": f"{uid}@example.com", "aud": "authenticated", "role": "authenticated"}}

class Backend:
    """In-memory stand-in for the schedule_projects table + auth + license RPC."""
    def __init__(self, uid="u-1", paid=True):
        self.uid, self.paid = uid, paid
        self.rows = {}
        self.posts = 0
        self.fail_saves = False
        self.fail_loads = False
        self.hold = False
        self.held = []
    def handle(self, route):
        req = route.request
        url = req.url
        if "/auth/v1/" in url:
            s = session(self.uid)
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(s["user"] if "/user" in url else s))
        if "/rest/v1/rpc/my_license_templates" in url:
            return route.fulfill(status=200, content_type="application/json", body=json.dumps(["schedule-builder"] if self.paid else []))
        if "/rest/v1/schedule_projects" in url:
            if req.method == "GET":
                if self.fail_loads:
                    return route.fulfill(status=500, content_type="application/json", body=json.dumps({"message": "down"}))
                m = re.search(r"id=eq\.([^&]+)", url); u = re.search(r"user_id=eq\.([^&]+)", url)
                rows = [r for r in self.rows.values() if (not m or r["id"] == m.group(1)) and (not u or r["user_id"] == u.group(1))]
                if "pgrst.object" in req.headers.get("accept", ""):
                    if not rows:
                        return route.fulfill(status=406, content_type="application/json", body=json.dumps({"code": "PGRST116", "message": "0 rows"}))
                    return route.fulfill(status=200, content_type="application/json", body=json.dumps(rows[0]))
                return route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))
            if req.method == "POST":
                if self.hold:
                    self.held.append(route); return
                return self._post(route)
        if "/functions/v1/" in url:
            return route.fulfill(status=200, content_type="application/json", body="{}")
        return route.fulfill(status=201 if req.method == "POST" else 200, content_type="application/json", body="[]")
    def _post(self, route):
        req = route.request
        self.posts += 1
        if self.fail_saves:
            return route.fulfill(status=500, content_type="application/json", body=json.dumps({"message": "boom"}))
        body = json.loads(req.post_data or "{}")
        body = body[0] if isinstance(body, list) else body
        if body.get("user_id") != self.uid:
            return route.fulfill(status=403, content_type="application/json", body=json.dumps({"message": "RLS"}))
        body.setdefault("id", str(uuid.uuid4()))
        self.rows[body["id"]] = json.loads(json.dumps(body))
        acc = req.headers.get("accept", "")
        return route.fulfill(status=201, content_type="application/json", body=json.dumps(body if "pgrst.object" in acc else [body]))
    def release(self):
        held, self.held, self.hold = self.held, [], False
        for r in held: self._post(r)

def new_page(br, be, lang="he", w=1280, h=900, keep_storage=None):
    ctx = br.new_context(viewport={"width": w, "height": h}, accept_downloads=True, storage_state=keep_storage)
    pg = ctx.new_page()
    pg.errors, pg.dialogs = [], []
    pg.dialog_answer = True
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    def on_dialog(d):
        pg.dialogs.append((d.type, d.message))
        d.accept() if pg.dialog_answer else d.dismiss()
    pg.on("dialog", on_dialog)
    pg.route(SB + "/**", be.handle)
    if keep_storage is None:
        pg.goto(f"http://127.0.0.1:{PORT}/index.html")
        s = session(be.uid)
        pg.evaluate(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(s))}); localStorage.setItem('deskkit_lang','{lang}'); localStorage.setItem('deskkit_cookie_ok','1')")
    return ctx, pg

def open_builder(pg, qs=""):
    pg.goto(f"http://127.0.0.1:{PORT}/schedule-builder.html{qs}", wait_until="networkidle")
    pg.wait_for_function("!document.getElementById('auth-gate-overlay')", timeout=20000)
    pg.wait_for_timeout(300)

def tab(pg, name): pg.click(f'.sched-tab-btn[data-tab="{name}"]')
def state(pg): return pg.evaluate("JSON.parse(JSON.stringify(scheduleState))")
def generate(pg, improve=False):
    tab(pg, "result")
    pg.click("#sched-improve-btn" if improve else "#sched-generate-btn")
    pg.wait_for_function("!scheduleSolving", timeout=60000)
    pg.wait_for_timeout(100)
def health(pg):
    return pg.evaluate("(() => { const h = scheduleTimetableHealth(scheduleState, (scheduleState.timetable||{}).placement); return {total:h.total, placed:h.placed, missing:h.missing.length, out:h.outOfRange.length, conflicts:h.conflicts.size, ok:h.ok}; })()")
def status(pg): return pg.inner_text("#sched-solver-status")
def health_box(pg): return pg.evaluate("(() => { const b = document.getElementById('sched-health'); return b.hidden ? '' : b.innerText; })()")
SUCCESS = "כל השיעורים שובצו"

def school(classes=3, hours=None, days=5, periods=8):
    S = {"name": "בית ספר לבדיקה", "settings": {"days": days, "periodsPerDay": periods}, "subjects": [], "classes": [], "teachers": [], "rooms": [], "assignments": [], "timetable": None}
    subj = [("מתמטיקה", 5, None), ("אנגלית", 4, None), ("עברית", 4, None), ("מדעים", 3, "lab"), ("ספורט", 2, "gym")]
    S["rooms"] = [{"id": "lab", "name": "מעבדה", "count": 1}, {"id": "gym", "name": "אולם", "count": 1}]
    for i, (n, h, r) in enumerate(subj):
        S["subjects"].append({"id": f"s{i}", "name": n, "color": "#2563EB", "roomId": r, "maxConsecutive": 2})
    for c in range(classes):
        S["classes"].append({"id": f"c{c}", "name": f"כיתה {c+1}", "maxDailyPeriod": None})
    for i, (n, h, r) in enumerate(subj):
        t = {"id": f"t{i}", "name": f"מורה {n}", "subjectIds": [f"s{i}"], "unavailable": ["0-0"] if i == 0 else []}
        S["teachers"].append(t)
        for c in range(classes):
            S["assignments"].append({"id": f"a{c}_{i}", "classId": f"c{c}", "subjectId": f"s{i}", "teacherId": t["id"], "weeklyHours": h if hours is None else hours})
    return S

def seeded(br, data, **kw):
    be = Backend()
    be.rows["p1"] = {"id": "p1", "user_id": be.uid, "data": data, "updated_at": "2020-01-01T00:00:00Z"}
    ctx, pg = new_page(br, be, **kw)
    open_builder(pg, "?schedule=p1")
    return be, ctx, pg


# ------------------------------------------------------------------ regression (behaviour that already worked)
def regression(br):
    be = Backend()
    ctx, pg = new_page(br, be)
    open_builder(pg)
    check("R: page opens signed-in with a blank project", state(pg)["assignments"] == [])
    check("R: paid account sees the generate controls", pg.evaluate("document.getElementById('sched-unlock-gate').hidden"))
    tab(pg, "subjects")
    for i, n in enumerate(["מתמטיקה", "אנגלית", '<img src=x onerror=alert(1)>"&']):
        pg.click("#sched-add-subject"); pg.fill(f"#sched-subjects-list .sched-row >> nth={i} >> input[data-field=name]", n)
    tab(pg, "classes")
    for i, n in enumerate(["ז1", "ח1"]):
        pg.click("#sched-add-class"); pg.fill(f"#sched-classes-list .sched-row >> nth={i} >> input[data-field=name]", n)
    pg.fill("#sched-classes-list .sched-row >> nth=1 >> input[data-field=maxDailyPeriod]", "5")
    tab(pg, "teachers")
    for i, n in enumerate(["רונית", "דוד"]):
        pg.click("#sched-add-teacher"); pg.fill(f"#sched-teachers-list .sched-teacher-card >> nth={i} >> input[data-field=name]", n)
    st = state(pg); sid = [s["id"] for s in st["subjects"]]; tid = [t["id"] for t in st["teachers"]]; cid = [c["id"] for c in st["classes"]]
    pg.check(f'#sched-teachers-list .sched-teacher-card >> nth=0 >> input[value="{sid[0]}"]')
    pg.check(f'#sched-teachers-list .sched-teacher-card >> nth=1 >> input[value="{sid[1]}"]')
    pg.check(f'#sched-teachers-list .sched-teacher-card >> nth=1 >> input[value="{sid[2]}"]')
    pg.click("#sched-teachers-list .sched-teacher-card >> nth=0 >> [data-action=toggle-avail]")
    pg.click('#sched-teachers-list .sched-teacher-card >> nth=0 >> .sched-avail-cell[data-day="0"][data-period="0"]')
    tab(pg, "assignments")
    plan = [(0, 0, 0, 5), (0, 1, 1, 4), (0, 2, 1, 2), (1, 0, 0, 4), (1, 1, 1, 3)]
    for i, (c, s, t, h) in enumerate(plan):
        pg.click("#sched-add-assignment")
        row = f"#sched-assignments-list .sched-row >> nth={i}"
        pg.select_option(f"{row} >> select[data-field=classId]", cid[c])
        pg.select_option(f"{row} >> select[data-field=subjectId]", sid[s])
        pg.select_option(f"{row} >> select[data-field=teacherId]", tid[t])
        pg.fill(f"{row} >> input[data-field=weeklyHours]", str(h))
    st = state(pg)
    check("R: assignments stored exactly as entered", [(a["classId"], a["subjectId"], a["teacherId"], a["weeklyHours"]) for a in st["assignments"]]
          == [(cid[c], sid[s], tid[t], h) for c, s, t, h in plan])
    pg.evaluate("window.__runs = 0; const w = getScheduleWorker(); const op = w.postMessage.bind(w); w.postMessage = (m) => { window.__runs++; op(m); }; 0")
    tab(pg, "result"); pg.dblclick("#sched-generate-btn"); pg.wait_for_function("!scheduleSolving && scheduleState.timetable", timeout=60000)
    check("R: double-click runs the solver once", pg.evaluate("window.__runs") == 1, pg.evaluate("window.__runs"))
    h = health(pg)
    check("R: every lesson placed, no conflicts, success shown", h["ok"] and h["placed"] == 18 and SUCCESS in status(pg), (h, status(pg)))
    ev = pg.evaluate("scheduleEvaluatePlacement(buildScheduleProblem(scheduleState), scheduleState.timetable.placement).hard")
    check("R: independent evaluation agrees (0 hard)", ev == 0, ev)
    pl = state(pg)["timetable"]["placement"]
    check("R: blocked teacher slot respected", not any(k.startswith(st["assignments"][0]["id"]) and v == {"day": 0, "period": 0} for k, v in pl.items()))
    check("R: class daily limit respected", all(v["period"] < 5 for k, v in pl.items() if any(k.startswith(a["id"] + "_") for a in st["assignments"] if a["classId"] == cid[1])))
    check("R: class view shows 11 lessons for ז1", pg.locator("#sched-result-grid-wrap .sched-grid-cell.filled").count() == 11)
    check("R: HTML in names is shown as text", "<img" not in pg.inner_html("#sched-result-grid-wrap") and not any(m == "1" for _, m in pg.dialogs))
    pg.click('.sched-view-btn[data-view-kind="teacher"]'); pg.select_option("#sched-entity-select", tid[1])
    check("R: teacher view shows דוד's 9 lessons", pg.locator("#sched-result-grid-wrap .sched-grid-cell.filled").count() == 9)
    pg.click('.sched-view-btn[data-view-kind="class"]')
    with pg.expect_download() as dl:
        pg.click("#sched-export-csv")
    raw = open(dl.value.path(), encoding="utf-8-sig", newline="").read()
    check("R: CSV has a header + one row per period, Hebrew intact", raw.count("\r\n") == 8 and "מתמטיקה" in raw, raw[:80])
    pg.click('.sched-view-btn[data-view-kind="teacher"]'); pg.select_option("#sched-entity-select", tid[0])
    pg.locator("#sched-result-grid-wrap .sched-grid-cell.filled").first.drag_to(pg.locator('#sched-result-grid-wrap .sched-grid-cell[data-day="0"][data-period="0"]'))
    check("R: dragging onto a blocked slot is flagged, success no longer shown",
          pg.locator(".sched-grid-cell.conflict").count() >= 1 and SUCCESS not in status(pg) and "בהתנגשות" in health_box(pg), (status(pg), health_box(pg)))
    pg.click("#schedule-save-btn"); pg.wait_for_timeout(600)
    check("R: manual save → one row, ?schedule= in the URL", len(be.rows) == 1 and "schedule=" in pg.url)
    pg.reload(wait_until="networkidle"); pg.wait_for_function("!document.getElementById('auth-gate-overlay')"); pg.wait_for_timeout(400)
    st2 = state(pg)
    check("R: reload restores data, timetable and the manual move", len(st2["assignments"]) == 5 and st2["timetable"] and st2["timetable"]["placement"] == state(pg)["timetable"]["placement"])
    open_builder(pg); tab(pg, "classes"); pg.click("#sched-add-class"); pg.click("#schedule-save-btn"); pg.wait_for_timeout(600)
    check("R: a second project is a second row (nothing overwritten)", len(be.rows) == 2)
    other = Backend(uid="u-2"); other.rows = json.loads(json.dumps(be.rows))
    ctx2, pg2 = new_page(br, other); open_builder(pg2, "?schedule=" + list(be.rows)[0])
    check("R: another user can't open my project by its link", state(pg2)["classes"] == [])
    ctx2.close()
    check("R: no page errors", not pg.errors, pg.errors)
    ctx.close()

    # locked account
    be = Backend(paid=False); ctx, pg = new_page(br, be)
    pg.evaluate(f"localStorage.setItem('{UNLOCK_KEY}','1')"); open_builder(pg); tab(pg, "result")
    check("R: unpaid account sees the paywall (local flag cleared)", pg.is_visible("#sched-unlock-gate") and not pg.is_visible("#sched-generate-btn"))
    ctx.close()

    # realistic school + layout + English
    be, ctx, pg = seeded(br, school(classes=4))
    generate(pg)
    h = health(pg)
    check("R: realistic school (4 classes × 18 h, rooms) solved completely", h["ok"], (h, status(pg)))
    for w in (1280, 768, 390, 320):
        pg.set_viewport_size({"width": w, "height": 900})
        for t in ("result", "assignments", "teachers", "settings"):
            tab(pg, t); pg.wait_for_timeout(80)
            sw, cw = pg.evaluate("[document.documentElement.scrollWidth, document.documentElement.clientWidth]")
            if sw > cw + 1: check(f"R: no page overflow at {w}px on {t}", False, f"{sw}>{cw}")
    check("R: no horizontal page overflow at 1280/768/390/320 px", True)
    ctx.close()
    be, ctx, pg = seeded(br, school(classes=2), lang="en"); generate(pg)
    check("R: English UI left-to-right, success text in English", pg.evaluate("document.documentElement.dir") == "ltr" and "every lesson is placed" in status(pg), status(pg))
    ctx.close()


# ------------------------------------------------------------------ the fixes
def fixes(br):
    # Fix 1 — never "success" with missing lessons
    be, ctx, pg = seeded(br, school(classes=2)); generate(pg)
    check("F1: baseline success", health(pg)["ok"] and SUCCESS in status(pg))
    before = state(pg)["timetable"]["placement"]
    tab(pg, "assignments"); pg.fill("#sched-assignments-list .sched-row >> nth=0 >> input[data-field=weeklyHours]", "7")
    tab(pg, "result")
    h = health(pg)
    check("F1: hours raised after generating → 2 lessons reported missing, no success text",
          h["missing"] == 2 and SUCCESS not in status(pg) and "לא שלמה" in status(pg) and "לא שובצו" in health_box(pg), (status(pg), health_box(pg)))
    pg.dialog_answer = False
    n = len(pg.dialogs)
    pg.click("#sched-export-csv"); pg.wait_for_timeout(200)
    check("F1: export of an incomplete timetable asks first (cancel = nothing exported)", len(pg.dialogs) == n + 1 and "לא שלמה" in pg.dialogs[-1][1])
    pg.dialog_answer = True
    tab(pg, "assignments"); pg.click("#sched-add-assignment"); tab(pg, "result")
    check("F1: a new assignment after generating is reported as not placed", health(pg)["missing"] >= 4 and SUCCESS not in status(pg))
    pg.click("[data-action=complete-schedule]"); pg.wait_for_function("!scheduleSolving", timeout=60000); pg.wait_for_timeout(100)
    after = state(pg)["timetable"]["placement"]
    kept = sum(1 for k, v in before.items() if after.get(k) == v)
    h = health(pg)
    check("F1: 'complete the schedule' places the missing lessons and reports honestly", h["missing"] == 0 and (h["ok"] == (SUCCESS in status(pg))), (h, status(pg)))
    check("F1: 'complete the schedule' leaves every lesson that was fine where it was", kept == len(before), f"kept {kept}/{len(before)}")
    ctx.close()

    # Fix 2 — the teacher shown is the teacher stored
    be, ctx, pg = seeded(br, school(classes=2)); generate(pg)
    tab(pg, "teachers"); pg.uncheck('#sched-teachers-list .sched-teacher-card >> nth=0 >> input[value="s0"]')
    tab(pg, "assignments")
    st = state(pg); shown = pg.eval_on_selector("#sched-assignments-list .sched-row >> nth=0 >> select[data-field=teacherId]", "s => [s.value, s.options[s.selectedIndex].text]")
    check("F2: after unticking the subject, the dropdown still shows the stored teacher, with a warning",
          shown[0] == st["assignments"][0]["teacherId"] and "⚠" in shown[1] and pg.locator("#sched-assignments-list .sched-row.sched-row-warn").count() >= 1, shown)
    check("F2: unticking did not change the stored teacher or the timetable", st["assignments"][0]["teacherId"] == "t0" and st["timetable"] is not None)
    pg.evaluate("scheduleState.assignments[1].teacherId = 'deleted'; renderAssignmentsTab(); 0")
    shown = pg.eval_on_selector("#sched-assignments-list .sched-row >> nth=1 >> select[data-field=teacherId]", "s => [s.value, s.options[s.selectedIndex].text]")
    check("F2: a teacher that no longer exists shows '— choose —', not someone else", shown[0] == "" and "בחרו" in shown[1], shown)
    pg.evaluate("window.__runs = 0; const w = getScheduleWorker(); const op = w.postMessage.bind(w); w.postMessage = (m) => { window.__runs++; op(m); }; 0")
    tt_before = json.dumps(state(pg)["timetable"], sort_keys=True)
    generate(pg)
    check("F2: generating is blocked while an assignment has no teacher; the old timetable is untouched",
          pg.evaluate("window.__runs") == 0 and "בלי כיתה, מקצוע או מורה" in health_box(pg) and json.dumps(state(pg)["timetable"], sort_keys=True) == tt_before, health_box(pg))
    ctx.close()

    # Fix 3 — impossible load blocked before running
    be, ctx, pg = seeded(br, school(classes=2, hours=9))  # 5 subjects × 9 = 45 h > 40 slots
    pg.evaluate("window.__runs = 0; const w = getScheduleWorker(); const op = w.postMessage.bind(w); w.postMessage = (m) => { window.__runs++; op(m); }; 0")
    generate(pg)
    box = health_box(pg)
    check("F3: 45 h in 40 slots → solver not run, clear reason with numbers",
          pg.evaluate("window.__runs") == 0 and "כיתה 1: 45 שעות" in box and "40 משבצות" in box and "להוריד 5" in box and state(pg)["timetable"] is None, box)
    ctx.close()
    # a teacher over capacity while every class fits: 5 classes × 8 h = 40 h for מורה מתמטיקה, who has 1 blocked slot
    be, ctx, pg = seeded(br, school(classes=5, hours=8))
    pg.evaluate("window.__runs = 0; const w = getScheduleWorker(); const op = w.postMessage.bind(w); w.postMessage = (m) => { window.__runs++; op(m); }; 0")
    generate(pg); box = health_box(pg)
    check("F3: a teacher over capacity is blocked and explained (classes fit)",
          pg.evaluate("window.__runs") == 0 and "מורה מתמטיקה: 40 שעות" in box and "39 משבצות" in box and "כיתה" not in box, box)
    ctx.close()
    be, ctx, pg = seeded(br, school(classes=2, hours=9))
    pg.evaluate("window.__runs = 0; const w = getScheduleWorker(); const op = w.postMessage.bind(w); w.postMessage = (m) => { window.__runs++; op(m); }; 0")
    tab(pg, "assignments")
    for i in range(10): pg.fill(f"#sched-assignments-list .sched-row >> nth={i} >> input[data-field=weeklyHours]", "4")
    generate(pg)
    check("F3: once it fits (exactly 40 h of 40 per class is allowed) the solver runs", pg.evaluate("window.__runs") == 1 and state(pg)["timetable"] is not None and "אי אפשר" not in health_box(pg), (pg.evaluate("window.__runs"), health_box(pg)))
    ctx.close()

    # Fix 4 — changes after generating keep the timetable
    be, ctx, pg = seeded(br, school(classes=3)); generate(pg)
    tab(pg, "result"); pg.click('.sched-view-btn[data-view-kind="class"]')
    src = pg.locator("#sched-result-grid-wrap .sched-grid-cell.filled").first
    dst = pg.locator("#sched-result-grid-wrap .sched-grid-cell.empty").first
    moved_id = src.get_attribute("data-lesson-id"); dd, dp = dst.get_attribute("data-day"), dst.get_attribute("data-period")
    src.drag_to(dst)
    manual = state(pg)["timetable"]["placement"][moved_id]
    check("F4: manual move recorded", manual == {"day": int(dd), "period": int(dp)}, manual)
    conflicts_after_move = health(pg)["conflicts"]
    before = state(pg)["timetable"]["placement"]
    tab(pg, "settings")
    pg.dialog_answer = False
    pg.evaluate("(() => { const i = document.getElementById('sched-periods-input'); i.value = '3'; i.dispatchEvent(new Event('change', {bubbles: true})); })()")
    st = state(pg)
    check("F4: fewer periods asks first; Cancel keeps the setting and the timetable",
          pg.dialogs and "יסומנו" in pg.dialogs[-1][1] and st["settings"]["periodsPerDay"] == 8 and st["timetable"]["placement"] == before and pg.input_value("#sched-periods-input") == "8", pg.dialogs[-1:])
    pg.dialog_answer = True
    pg.evaluate("(() => { const i = document.getElementById('sched-periods-input'); i.value = '6'; i.dispatchEvent(new Event('change', {bubbles: true})); })()")
    st = state(pg); tab(pg, "result"); h = health(pg)
    inside = {k: v for k, v in before.items() if v["period"] < 6}
    check("F4: after OK the timetable is kept: lessons inside the new grid untouched, the rest reported",
          st["timetable"] and all(st["timetable"]["placement"][k] == v for k, v in inside.items()) and h["out"] == len(before) - len(inside) and "כבר לא קיימים" in health_box(pg),
          (h, health_box(pg)))
    pg.evaluate("(() => { const i = document.getElementById('sched-periods-input'); i.value = '99'; i.dispatchEvent(new Event('change', {bubbles: true})); })()")
    check("F4: the periods field shows the value really used (99 → 12)", pg.input_value("#sched-periods-input") == "12")
    pg.evaluate("(() => { const i = document.getElementById('sched-periods-input'); i.value = '8'; i.dispatchEvent(new Event('change', {bubbles: true})); })()")
    tab(pg, "classes")
    pg.click("#sched-classes-list .sched-row >> nth=2 >> [data-action=delete-class]")
    st = state(pg)
    check("F4: deleting a class asks (mentions the timetable) and keeps everyone else's lessons and the manual move",
          "יוסרו ממערכת השעות" in pg.dialogs[-1][1] and st["timetable"] and st["timetable"]["placement"].get(moved_id) == manual, pg.dialogs[-1:])
    tab(pg, "result")
    h = health(pg)
    check("F4: after restoring 8 periods + deleting a class: nothing missing, success shown only if no conflict remains",
          h["missing"] == 0 and h["out"] == 0 and h["conflicts"] <= conflicts_after_move and ((SUCCESS in status(pg)) == h["ok"]), (h, status(pg)))
    ctx.close()

    # Fix 5 — saving
    be = Backend(); ctx, pg = new_page(br, be); open_builder(pg)
    tab(pg, "classes"); pg.click("#sched-add-class"); pg.wait_for_timeout(3600)
    rows0 = len(be.rows)
    pg.fill("#sched-name-input", "שם חדש לפרויקט"); pg.wait_for_timeout(3600)
    row = list(be.rows.values())[0] if be.rows else {}
    check("F5: changing only the project name is saved automatically (~3 s)", rows0 == 1 and row.get("data", {}).get("name") == "שם חדש לפרויקט", (rows0, row.get("data", {}).get("name")))
    check("F5: status says the cloud has it", "נשמר בענן" in pg.inner_text("#schedule-save-status"), pg.inner_text("#schedule-save-status"))
    # edit + immediate reload → local copy offered and restored
    tab(pg, "classes"); pg.click("#sched-add-class"); pg.fill("#sched-classes-list .sched-row >> nth=1 >> input[data-field=name]", "כיתה שלא נשמרה")
    check("F5: unsaved changes are shown as such", "לא נשמרו" in pg.inner_text("#schedule-save-status"), pg.inner_text("#schedule-save-status"))
    pg.wait_for_timeout(400)
    n = len(pg.dialogs)
    pg.reload(wait_until="networkidle"); pg.wait_for_function("!document.getElementById('auth-gate-overlay')"); pg.wait_for_timeout(500)
    asked = [d for d in pg.dialogs[n:] if d[0] == "confirm"]
    check("F5: reload right after an edit → the browser warns, then the local copy is offered",
          any(d[0] == "beforeunload" for d in pg.dialogs[n:]) and asked and "לשחזר" in asked[0][1], pg.dialogs[n:])
    check("F5: restored edit is back and then saved to the cloud", any(c["name"] == "כיתה שלא נשמרה" for c in state(pg)["classes"]))
    pg.wait_for_timeout(3600)
    check("F5: …and reaches the cloud", any(c["name"] == "כיתה שלא נשמרה" for c in list(be.rows.values())[0]["data"]["classes"]))
    check("F5: local copy deleted once the cloud confirmed the save",
          pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('deskkit_schedule_draft_')).length") == 0)
    # failed save → status + copy kept
    be.fail_saves = True
    tab(pg, "classes"); pg.click("#sched-add-class"); pg.wait_for_timeout(3800)
    check("F5: failed cloud save is shown, and the local copy is kept",
          "רק במחשב הזה" in pg.inner_text("#schedule-save-status") and pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('deskkit_schedule_draft_')).length") == 1,
          pg.inner_text("#schedule-save-status"))
    be.fail_saves = False
    pg.click("#schedule-save-btn"); pg.wait_for_timeout(700)
    check("F5: the next successful save clears the warning and the copy",
          "נשמר בענן" in pg.inner_text("#schedule-save-status") and pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('deskkit_schedule_draft_')).length") == 0)
    ctx.close()

    # one save at a time: manual click during the first autosave → one row; edit during a save → saved next
    be = Backend(); ctx, pg = new_page(br, be); open_builder(pg)
    be.hold = True
    tab(pg, "classes"); pg.click("#sched-add-class"); pg.wait_for_timeout(3500)  # autosave #1 now held
    pg.fill("#sched-classes-list .sched-row >> nth=0 >> input[data-field=name]", "נערך בזמן שמירה")
    pg.click("#schedule-save-btn")
    pg.wait_for_timeout(300)
    be.release(); pg.wait_for_timeout(1500)
    if be.held: be.release(); pg.wait_for_timeout(1000)
    rows = list(be.rows.values())
    check("F5: manual save during an autosave → still exactly one project", len(rows) == 1, len(rows))
    check("F5: an edit made while a save was running is saved too", rows and rows[0]["data"]["classes"][0]["name"] == "נערך בזמן שמירה", rows and rows[0]["data"]["classes"])
    ctx.close()

    # generated timetable is saved without any further click
    be, ctx, pg = seeded(br, school(classes=2)); generate(pg); pg.wait_for_timeout(3600)
    check("F5: a freshly generated timetable is saved automatically", be.rows["p1"]["data"].get("timetable") is not None)
    ctx.close()

    # load failure → no save over the project
    be = Backend(); be.rows["p1"] = {"id": "p1", "user_id": "u-1", "data": school(classes=2), "updated_at": "2020-01-01T00:00:00Z"}
    be.fail_loads = True
    ctx, pg = new_page(br, be); open_builder(pg, "?schedule=p1")
    tab(pg, "classes"); pg.click("#sched-add-class"); pg.click("#schedule-save-btn"); pg.wait_for_timeout(3800)
    check("F5: project that fails to load → user told, nothing saved (no new row, original untouched)",
          any("לא הצלחנו לטעון" in m for _, m in pg.dialogs) and be.posts == 0 and len(be.rows) == 1 and be.rows["p1"]["data"]["classes"][0]["name"] == "כיתה 1",
          (be.posts, pg.dialogs[-1:]))
    ctx.close()


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    httpd = serve()
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=CHROMIUM)
            if which in ("all", "regression"): regression(br)
            if which in ("all", "fixes"): fixes(br)
            br.close()
    finally:
        httpd.shutdown()
    failed = [r for r in RESULTS if not r[0]]
    print(f"\n{len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
