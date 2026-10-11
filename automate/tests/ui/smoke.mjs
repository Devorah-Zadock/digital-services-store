// UI smoke test against the STAGING web app + staging project, in a real
// browser: sign in → setup wizard → demo website enquiry → automation runs
// → send a quote → the client approves it in the public link.
// Fake @example.com accounts only; deleted at the end. Output: pass/fail.
import { chromium } from "playwright";

const URL = process.env.STG_URL, ANON = process.env.STG_ANON, SERVICE = process.env.STG_SERVICE;
const WEB = process.env.STG_WEB_URL, CRON = process.env.STG_CRON_SECRET;
const results = [];
const check = (name, ok, detail = "") => { results.push([name, !!ok]); console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  [${detail}]`)); };
const admin = (path, init = {}) => fetch(`${URL}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", ...(init.headers || {}) } });
const worker = () => fetch(`${URL}/functions/v1/automate-worker`, { method: "POST", headers: { "x-cron-secret": CRON, "Content-Type": "application/json" }, body: "{}" });

const run = Math.random().toString(16).slice(2, 8);
const email = `automate-ui-${run}@example.com`, password = "Ui-" + run + "-Pass!9";
const created = await (await admin("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) })).json();
const uid = created.id;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|404|Failed to load resource/.test(m.text())) errors.push(m.text()); });

try {
  // sign in through the real form
  await page.goto(`${WEB}/account.html?redirect=automate.html`);
  await page.fill("#qa-email", email);
  await page.fill("#qa-password", password);
  await page.click("#qa-auth-submit");
  await page.waitForURL(/automate\.html/, { timeout: 20000 }).catch(() => {});
  if (!/automate\.html/.test(page.url())) await page.goto(`${WEB}/automate.html`);
  await page.waitForSelector(".au-pack", { timeout: 20000 });
  check("signed in; first visit opens the setup wizard", true);

  await page.click('[data-pack="home_services"]');
  await page.click("#wz-next");
  await page.fill("#wz-name", "שיפוצי בדיקה");
  await page.click("#wz-save");
  await page.waitForSelector("#wz-go", { timeout: 15000 });
  await page.click("#wz-go");
  await page.waitForFunction(() => location.hash === "#today", null, { timeout: 30000 });
  await page.goto(`${WEB}/automate.html#automations`);
  await page.waitForSelector(".au-tpl", { timeout: 15000 });
  const active = await page.locator(".au-pill.on").count();
  check("one click activates the business pack (≥5 automations active)", active >= 5, `active=${active}`);

  await page.goto(`${WEB}/automate.html#contacts`);
  await page.waitForSelector("#au-demo-lead:not([hidden])", { timeout: 15000 });
  await page.click("#au-demo-lead");
  await page.waitForTimeout(2500);
  await worker(); await worker();
  await page.reload(); await page.waitForSelector("#au-contacts tbody tr", { timeout: 15000 });
  const rows = await page.locator("#au-contacts tbody tr").count();
  check("demo website enquiry appears in the client list", rows >= 1, `rows=${rows}`);
  await page.goto(`${WEB}/automate.html#history`);
  await page.waitForSelector("#au-history .au-card", { timeout: 15000 });
  const hist = await page.locator("#au-history").innerText();
  check("history shows the automation acting on it", /אף פנייה לא נופלת/.test(hist) && /נשלח/.test(hist), hist.slice(0, 120));

  // a saved quote → send it from the app
  await admin("/rest/v1/quote_saves", { method: "POST", body: JSON.stringify({ user_id: uid, data: { eventName: "שיפוץ מטבח", recipient: "דנה", price: "9,500", businessName: "שיפוצי בדיקה", template: "classic" } }) });
  await page.goto(`${WEB}/automate.html#quotes`);
  await page.reload();   // same page, new hash: reload to load the new quote
  await page.waitForSelector("[data-sendquote]", { timeout: 15000 });
  await page.click("[data-sendquote]");
  await page.fill("#sq-email", "client-ui@example.com");
  await page.click("#sq-go");
  await page.waitForSelector("[data-copy]", { timeout: 15000 });
  check("quote sent from the app as a link", true);
  const share = await (await admin(`/rest/v1/quote_shares?user_id=eq.${uid}&select=token`)).json();
  await page.goto(`${WEB}/q.html?t=${share[0].token}`);
  await page.waitForSelector("#qv-yes", { timeout: 15000 });
  const doc = await page.locator("#qv-doc").innerText();
  check("client sees the quote as the business built it", /שיפוץ מטבח/.test(doc));
  await page.click("#qv-yes");
  await page.waitForSelector(".qv-status.ok", { timeout: 15000 });
  check("client approves with one click", true);
  check("no JavaScript errors on any page", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("UI smoke ran to completion", false, String(e.message || e).slice(0, 300));
} finally {
  await browser.close();
  await admin(`/auth/v1/admin/users/${uid}`, { method: "DELETE" });
}
const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
