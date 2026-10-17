// Site builder (on-canvas editor) against the REAL staging Supabase project +
// staging web app, in a real browser. Covers what the mocked tests can't:
// real row-level security on site_projects, real autosave into the same row,
// reload from the database, and a network drop while editing.
// One fake @example.com account, deleted at the end (with its rows).
// Never publishes and never sends email.
import { chromium } from "playwright";

const URL = process.env.STG_URL, SERVICE = process.env.STG_SERVICE, WEB = process.env.STG_WEB_URL;
const results = [];
const check = (name, ok, detail = "") => { results.push([name, !!ok]); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  [${String(detail).slice(0, 300)}]`)); };
const admin = (path, init = {}) => fetch(`${URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) } });
const rowsOf = async (uid) => (await admin(`/rest/v1/site_projects?user_id=eq.${uid}&select=id,data,updated_at&order=created_at`)).json();
const CDOC = "document.getElementById('bshell-canvas-iframe').contentDocument";

const run = Math.random().toString(16).slice(2, 8);
const email = `sites-${run}@example.com`, password = "Site-" + run + "-Pass!9";
const user = await (await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) })).json();

const browser = await chromium.launch();
const errors = [];
try {
  const created = await admin("/rest/v1/site_projects", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: user.id, template: "blank", data: { businessName: "בדיקת staging", tagline: "שורת תיאור", about: "קצת עלינו", phone: "050-0000000", services: [{ name: "שירות א", desc: "תיאור", price: "" }], blockVariants: { hero: "centered", services: "grid" } } }),
  });
  const createdRows = await created.json();
  const projectId = Array.isArray(createdRows) && createdRows[0] && createdRows[0].id;
  check("test project created in the real database", !!projectId, JSON.stringify(createdRows).slice(0, 200));

  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${WEB}/account.html?redirect=sites.html`);
  await page.fill("#qa-email", email);
  await page.fill("#qa-password", password);
  await page.click("#qa-auth-submit");
  await page.waitForTimeout(3000);
  const ready = async () => {
    await page.waitForFunction(() => !document.getElementById("auth-gate-overlay"), null, { timeout: 25000 });
    await page.waitForFunction(() => document.getElementById("bshell-root") && document.getElementById("bshell-root").classList.contains("active"), null, { timeout: 25000 });
    await page.waitForFunction(`${CDOC} && ${CDOC}.querySelector('[data-textkey="heading-heroTitle"]') && !document.querySelector('.bshell-canvas-buffer')`, null, { timeout: 25000 });
    await page.waitForTimeout(800);
  };
  await page.goto(`${WEB}/sites.html?site=${projectId}`);
  await ready();
  check("the new editor opens the saved project from the real database", await page.evaluate(() => siteState.data.businessName === "בדיקת staging"));
  check("clean workspace: no side panel open on entry", await page.evaluate(() => { const p = document.getElementById("bsx-panel"); return !p || p.hidden || !p.classList.contains("open"); }));

  // inline edit on the canvas
  const fr = page.frameLocator("#bshell-canvas-iframe");
  await fr.locator('[data-textkey="heading-heroTitle"]').first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("כותרת מ-staging");
  await page.keyboard.press("Enter");
  // add a section through the "+" gallery
  await fr.locator("#ls-about").first().scrollIntoViewIfNeeded();
  await fr.locator("#ls-about").first().hover();
  await page.waitForTimeout(400);
  const ins = page.locator(".bsx-insert:not([hidden])").last();
  await ins.click();
  await page.waitForSelector(".bsx-modal .bsx-card");
  await page.click('.bsx-card[data-type="faq"][data-variant="accordion"]');
  await page.waitForTimeout(6000);
  let rows = await rowsOf(user.id);
  const saved = rows[0] && rows[0].data;
  const faqId = saved && Object.keys(saved.sections || {}).find((k) => saved.sections[k].type === "faq");
  check("autosave: one row, heading + new FAQ section saved (real RLS, real updated_at column)",
    rows.length === 1 && saved.headings && saved.headings.heroTitle === "כותרת מ-staging" && !!faqId && (saved.blockOrder.index || []).includes("x:" + faqId),
    JSON.stringify({ n: rows.length, h: saved && saved.headings, order: saved && saved.blockOrder }));
  check("existing fields untouched by the editor", saved && saved.phone === "050-0000000" && saved.services.length === 1 && saved.about === "קצת עלינו");

  // reload from the database
  await page.reload();
  await ready();
  check("reload shows the edits from the database",
    await page.evaluate(`${CDOC}.querySelector('[data-textkey="heading-heroTitle"]').textContent.includes("כותרת מ-staging") && !!${CDOC}.querySelector('[data-dk-type="faq"]')`));

  // network drop while editing → status says not saved; back → saved into the same row
  await page.route(`${URL}/rest/v1/site_projects*`, (r) => r.abort());
  await fr.locator('[data-textkey="tagline"]').first().click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("שינוי בזמן ניתוק");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(5000);
  const st = await page.evaluate(() => (document.getElementById("bsx-status") || document.body).innerText);
  check("network down: the editor says the change isn't saved", /לא נשמר|Not saved/.test(st), st.slice(0, 120));
  await page.unroute(`${URL}/rest/v1/site_projects*`);
  await page.waitForTimeout(12000);
  rows = await rowsOf(user.id);
  check("network back: the change reaches the same row (retry)", rows.length === 1 && rows[0].data.tagline === "שינוי בזמן ניתוק", rows.length + " " + (rows[0] && rows[0].data.tagline));

  check("no JavaScript errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
} catch (e) {
  check("staging site builder test ran to the end", false, e.stack || e.message);
} finally {
  await browser.close();
  await admin(`/rest/v1/site_projects?user_id=eq.${user.id}`, { method: "DELETE" });
  await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  const left = await (await admin(`/rest/v1/site_projects?user_id=eq.${user.id}&select=id`)).json();
  check("cleanup: test account and its rows deleted", Array.isArray(left) && left.length === 0, JSON.stringify(left));
}
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
