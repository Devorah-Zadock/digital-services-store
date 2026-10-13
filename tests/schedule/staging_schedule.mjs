// Schedule builder against the REAL staging Supabase project + staging web
// app, in a real browser. Covers what the mocked tests can't: real row-level
// security, a re-save updating the same row, real updated_at for the local
// recovery copy, a network drop, a failed load, and two tabs on one project.
// Two fake @example.com accounts, deleted at the end (with their rows).
import { chromium } from "playwright";

const URL = process.env.STG_URL, ANON = process.env.STG_ANON, SERVICE = process.env.STG_SERVICE, WEB = process.env.STG_WEB_URL;
const results = [];
const check = (name, ok, detail = "") => { results.push([name, !!ok]); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  [${String(detail).slice(0, 300)}]`)); };
const info = (msg) => console.log("INFO " + msg);
const admin = (path, init = {}) => fetch(`${URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) } });
const rowsOf = async (uid) => (await admin(`/rest/v1/schedule_projects?user_id=eq.${uid}&select=id,data,updated_at&order=created_at`)).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = Math.random().toString(16).slice(2, 8);
async function makeUser(tag) {
  const email = `schedule-${tag}-${run}@example.com`, password = "Sch-" + run + "-Pass!9";
  const u = await (await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) })).json();
  return { id: u.id, email, password };
}
const A = await makeUser("a"), B = await makeUser("b");
// A owns the solver (as after a real purchase): one license row, staging only.
await admin("/rest/v1/license_redemptions", { method: "POST", body: JSON.stringify({ license_key: "STAGING-TEST-" + run, product_id: "K122yL6VSdTui67Be5ZiYw==", user_id: A.id, template: "schedule-builder" }) });

const school = {
  name: "בדיקת staging", settings: { days: 5, periodsPerDay: 6 }, rooms: [], timetable: null,
  subjects: [{ id: "s0", name: "מתמטיקה", color: "#2563EB", roomId: null, maxConsecutive: 2 }, { id: "s1", name: "אנגלית", color: "#16A34A", roomId: null, maxConsecutive: null }],
  classes: [{ id: "c0", name: "ז1", maxDailyPeriod: null }, { id: "c1", name: "ז2", maxDailyPeriod: null }],
  teachers: [{ id: "t0", name: "רונית", subjectIds: ["s0"], unavailable: ["0-0"] }, { id: "t1", name: "דוד", subjectIds: ["s1"], unavailable: [] }],
  assignments: [
    { id: "a0", classId: "c0", subjectId: "s0", teacherId: "t0", weeklyHours: 5 }, { id: "a1", classId: "c0", subjectId: "s1", teacherId: "t1", weeklyHours: 4 },
    { id: "a2", classId: "c1", subjectId: "s0", teacherId: "t0", weeklyHours: 5 }, { id: "a3", classId: "c1", subjectId: "s1", teacherId: "t1", weeklyHours: 4 },
  ],
};

const browser = await chromium.launch();
const errors = [];
async function signedInPage(user, ctxOpts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts });
  const page = await ctx.newPage();
  page.dialogs = [];
  page.answer = true;
  page.on("dialog", (d) => { page.dialogs.push([d.type(), d.message()]); page.answer ? d.accept() : d.dismiss(); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${WEB}/account.html?redirect=schedule-builder.html`);
  await page.fill("#qa-email", user.email);
  await page.fill("#qa-password", user.password);
  await page.click("#qa-auth-submit");
  await page.waitForURL(/schedule-builder\.html/, { timeout: 25000 }).catch(() => {});
  if (!/schedule-builder\.html/.test(page.url())) await page.goto(`${WEB}/schedule-builder.html`);
  await page.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 });
  await page.waitForTimeout(800);
  return { ctx, page };
}
const statusText = (page) => page.locator("#schedule-save-status").innerText();
const drafts = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("deskkit_schedule_draft_")).length);

try {
  // ---- A: create, autosave, generate, re-save into the SAME row
  const { ctx: ctxA, page } = await signedInPage(A);
  check("A signs in through the real form and reaches the builder", /schedule-builder\.html/.test(page.url()), page.url());
  const diag = await page.evaluate(async () => {
    const out = { render: typeof window.scheduleOnStateLoaded, content: typeof scheduleTimetableHealth, scripts: [] };
    for (const s of document.querySelectorAll("script[src*=schedule]")) {
      const r = await fetch(s.src).catch(() => null);
      out.scripts.push(s.getAttribute("src") + "=" + (r ? r.status : "err"));
    }
    try { const { data, error } = await supabaseClient.rpc("my_license_templates"); out.rpc = error ? "error:" + (error.code || error.message) : JSON.stringify(data); } catch (e) { out.rpc = "throw"; }
    return out;
  });
  info("page diagnostics: " + JSON.stringify(diag) + " errors=" + JSON.stringify(errors.slice(0, 3)));
  check("license from the real database unlocks the solver", await page.evaluate(() => document.getElementById("sched-unlock-gate").hidden));
  await page.evaluate((s) => { scheduleState = s; window.scheduleOnStateLoaded(); window.scheduleMarkDirty(); }, school);
  await page.waitForTimeout(4500);
  let rows = await rowsOf(A.id);
  check("autosave created exactly one row (real insert, real RLS)", rows.length === 1, rows.length);
  check("status says it's in the cloud", /נשמר בענן|Saved to the cloud/.test(await statusText(page)), await statusText(page));
  const projectId = rows[0] && rows[0].id;
  check("URL now points at the saved project", page.url().includes("schedule=" + projectId), page.url());

  await page.click('.sched-tab-btn[data-tab="result"]');
  await page.click("#sched-generate-btn");
  await page.waitForFunction(() => !scheduleSolving && scheduleState.timetable, null, { timeout: 60000 });
  const st = await page.locator("#sched-solver-status").innerText();
  check("real solver: complete timetable, success shown", /כל השיעורים שובצו|every lesson is placed/.test(st), st);
  await page.waitForTimeout(4500);
  rows = await rowsOf(A.id);
  check("generated timetable saved automatically into the SAME row", rows.length === 1 && rows[0].id === projectId && rows[0].data.timetable, rows.length);

  const before = rows[0].updated_at;
  await page.fill("#sched-name-input", "שם שהשתנה ב-staging");
  await page.waitForTimeout(4500);
  rows = await rowsOf(A.id);
  check("renaming only → same row updated (no new project)", rows.length === 1 && rows[0].data.name === "שם שהשתנה ב-staging" && rows[0].updated_at !== before, JSON.stringify(rows.map((r) => r.data.name)));

  // ---- reload loads from the real database
  await page.reload(); await page.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await page.waitForTimeout(800);
  check("reload loads name, data and timetable from the real database",
    await page.evaluate(() => scheduleState.name === "שם שהשתנה ב-staging" && !!scheduleState.timetable && scheduleState.assignments.length === 4));
  check("no recovery prompt when the cloud already has everything", !page.dialogs.some(([t, m]) => t === "confirm" && /לשחזר|Restore/.test(m)), JSON.stringify(page.dialogs));

  // ---- network drop while editing
  await page.route(`${URL}/rest/v1/schedule_projects*`, (r) => r.abort());
  await page.click('.sched-tab-btn[data-tab="classes"]');
  await page.click("#sched-add-class");
  await page.fill("#sched-classes-list .sched-row >> nth=2 >> input[data-field=name]", "כיתה בזמן ניתוק");
  await page.waitForTimeout(4500);
  check("network down: status says the change is only on this computer", /רק במחשב הזה|this computer only/.test(await statusText(page)), await statusText(page));
  check("network down: a local recovery copy exists", (await drafts(page)) === 1);
  await page.unroute(`${URL}/rest/v1/schedule_projects*`);
  await page.click("#schedule-save-btn"); await page.waitForTimeout(2500);
  rows = await rowsOf(A.id);
  check("network back: the change reaches the same row, warning cleared, copy deleted",
    rows.length === 1 && rows[0].data.classes.some((c) => c.name === "כיתה בזמן ניתוק") && /נשמר בענן|Saved/.test(await statusText(page)) && (await drafts(page)) === 0,
    await statusText(page));

  // ---- closing the tab before autosave → recovery copy offered with the real updated_at
  await page.click('.sched-tab-btn[data-tab="classes"]');
  await page.click("#sched-add-class");
  await page.fill("#sched-classes-list .sched-row >> nth=3 >> input[data-field=name]", "כיתה לפני סגירה");
  await page.waitForTimeout(500);
  const storage = await ctxA.storageState();
  await page.close({ runBeforeUnload: false });
  const page2 = await ctxA.newPage();
  page2.dialogs = []; page2.on("dialog", (d) => { page2.dialogs.push([d.type(), d.message()]); d.accept(); });
  page2.on("pageerror", (e) => errors.push(e.message));
  await page2.goto(`${WEB}/schedule-builder.html?schedule=${projectId}`);
  await page2.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await page2.waitForTimeout(1200);
  check("closed before saving → reopening offers the unsaved change", page2.dialogs.some(([t, m]) => t === "confirm" && /לשחזר|Restore/.test(m)), JSON.stringify(page2.dialogs));
  await page2.waitForTimeout(4500);
  rows = await rowsOf(A.id);
  check("restored change saved into the same row", rows.length === 1 && rows[0].data.classes.some((c) => c.name === "כיתה לפני סגירה"));
  void storage;

  // ---- project that fails to load is never saved over
  const writes = [];
  await page2.route(`${URL}/rest/v1/schedule_projects*`, (r) => { if (r.request().method() === "GET") return r.fulfill({ status: 500, body: "{}" }); writes.push(r.request().method()); return r.continue(); });
  page2.dialogs = [];
  await page2.reload(); await page2.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await page2.waitForTimeout(800);
  await page2.click('.sched-tab-btn[data-tab="classes"]'); await page2.click("#sched-add-class"); await page2.click("#schedule-save-btn"); await page2.waitForTimeout(4500);
  rows = await rowsOf(A.id);
  check("failed load → user told, no write at all, the real row unchanged",
    page2.dialogs.some(([, m]) => /לא הצלחנו לטעון|couldn't load/.test(m)) && writes.length === 0 && rows.length === 1 && rows[0].data.classes.length === 4, `writes=${writes} classes=${rows[0] && rows[0].data.classes.length}`);
  await page2.unroute(`${URL}/rest/v1/schedule_projects*`);

  // ---- isolation: B can't read or change A's project (real RLS)
  const { ctx: ctxB, page: pb } = await signedInPage(B);
  await pb.goto(`${WEB}/schedule-builder.html?schedule=${projectId}`);
  await pb.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await pb.waitForTimeout(800);
  check("B opening A's link gets an empty project, not A's data", await pb.evaluate(() => scheduleState.assignments.length === 0 && scheduleState.classes.length === 0));
  const bToken = await pb.evaluate(() => supabaseClient.auth.getSession().then(({ data }) => data.session.access_token));
  const bRead = await (await fetch(`${URL}/rest/v1/schedule_projects?id=eq.${projectId}&select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${bToken}` } })).json();
  check("RLS: B's token reads 0 of A's rows", Array.isArray(bRead) && bRead.length === 0, JSON.stringify(bRead));
  const bWrite = await fetch(`${URL}/rest/v1/schedule_projects?id=eq.${projectId}`, { method: "PATCH", headers: { apikey: ANON, Authorization: `Bearer ${bToken}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ data: { hacked: true } }) });
  const bWriteRows = await bWrite.json().catch(() => []);
  const bUpsert = await fetch(`${URL}/rest/v1/schedule_projects`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${bToken}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: projectId, user_id: B.id, data: { hacked: true } }) });
  rows = await rowsOf(A.id);
  check("RLS: B can't change A's row (update or upsert by id)", Array.isArray(bWriteRows) && bWriteRows.length === 0 && !bUpsert.ok && rows[0].data.name === "שם שהשתנה ב-staging",
    `patch=${JSON.stringify(bWriteRows)} upsert=${bUpsert.status}`);
  await pb.evaluate(() => { window.scheduleMarkDirty(); });
  await pb.waitForTimeout(4500);
  const bRows = await rowsOf(B.id);
  check("B's own save makes B's own row; A's row untouched", bRows.length === 1 && bRows[0].id !== projectId && (await rowsOf(A.id)).length === 1);
  await ctxB.close();

  // ---- two tabs on the same project (known limitation: last save wins)
  const t1 = page2;
  const t2 = await ctxA.newPage(); t2.on("dialog", (d) => d.accept());
  await t2.goto(`${WEB}/schedule-builder.html?schedule=${projectId}`);
  await t2.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await t2.waitForTimeout(800);
  await t1.reload(); await t1.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 }); await t1.waitForTimeout(800);
  await t1.fill("#sched-name-input", "שם מטאב 1"); await t1.waitForTimeout(4500);
  await t2.click('.sched-tab-btn[data-tab="classes"]'); await t2.click("#sched-add-class"); await t2.waitForTimeout(4500);
  rows = await rowsOf(A.id);
  info(`two tabs: final name="${rows[0].data.name}", classes=${rows[0].data.classes.length} — tab 2 saved over tab 1's rename (last save wins; not handled yet)`);
  check("two tabs: still a single row (no duplicate project)", rows.length === 1);

  check("no JavaScript errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctxA.close();
} catch (e) {
  check("staging schedule test ran to the end", false, e.stack || e.message);
} finally {
  await browser.close();
  for (const u of [A, B]) await admin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  const left = await (await admin(`/rest/v1/schedule_projects?user_id=in.(${A.id},${B.id})&select=id`)).json();
  check("cleanup: test accounts and their rows deleted", Array.isArray(left) && left.length === 0, JSON.stringify(left));
}
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
