// Unit tests for the pure engine logic. Run: deno test automate/tests/unit
import { afterCheck, backoffMs, classifyHttp, clientSendAllowed, escapeHtml, fill, israelMorning, israelParts,
  lintTemplate, MAX_ATTEMPTS, nextClientSendTime, textToHtml, waitUntil, whatsappLink } from "../../functions/_shared/automate/engine.ts";
import { catalog, defaultsFor, PACKS, TEMPLATES, validateConfig } from "../../functions/_shared/automate/templates.ts";

function eq(a: unknown, b: unknown, msg = "") {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg} expected ${B} got ${A}`);
}
function ok(v: unknown, msg = "") { if (!v) throw new Error("assertion failed " + msg); }

const Q = { start: 21, end: 8, shabbat: true };

Deno.test("every template is internally consistent", () => {
  for (const t of Object.values(TEMPLATES)) eq(lintTemplate(t), [], t.key);
});

Deno.test("packs only reference existing templates and settings", () => {
  for (const p of PACKS) {
    for (const k of p.templates) ok(TEMPLATES[k], `${p.key} -> ${k}`);
    for (const [tk, o] of Object.entries(p.overrides)) {
      ok(TEMPLATES[tk], `${p.key} override ${tk}`);
      for (const ck of Object.keys(o)) ok(TEMPLATES[tk].config.some((f) => f.key === ck), `${p.key}.${tk}.${ck}`);
    }
  }
});

Deno.test("catalog exposes no step internals", () => {
  const c = catalog();
  ok(c.templates.length >= 6);
  for (const t of c.templates) ok(!("steps" in t));
});

Deno.test("config validation clamps, drops unknowns, requires https urls", () => {
  const t = TEMPLATES.lead_autopilot;
  const { config, errors } = validateConfig(t, { response_hours: 999, auto_reply: "yes", evil: "<script>", auto_reply_text: "  " });
  eq(errors, []);
  eq(config.response_hours, 48);
  eq(config.auto_reply, true);          // not a boolean → default
  ok(!("evil" in config));
  ok(String(config.auto_reply_text).includes("{שם}"));   // empty → default text
  const r = validateConfig(TEMPLATES.review_request, { review_url: "javascript:alert(1)" });
  eq(r.errors, ["review_url"]);
  const r2 = validateConfig(TEMPLATES.review_request, { review_url: "https://g.page/r/abc/review" });
  eq(r2.errors, []);
});

Deno.test("pack defaults override template defaults", () => {
  eq(defaultsFor(TEMPLATES.lead_autopilot, "home_services").response_hours, 1);
  eq(defaultsFor(TEMPLATES.lead_autopilot, "general").response_hours, 2);
});

Deno.test("checks: pass, stop, skip", () => {
  const stop = { key: "a", kind: "check" as const, check: "quote_pending" as const, otherwise: "stop" as const };
  const skip = { key: "b", kind: "check" as const, check: "quote_pending" as const, otherwise: { skip: 2 } };
  eq(afterCheck(stop, 3, true), { next: 4 });
  eq(afterCheck(stop, 3, false), { stop: true });
  eq(afterCheck(skip, 3, false), { next: 6 });
});

Deno.test("backoff grows and is capped; max attempts is bounded", () => {
  eq(backoffMs(1), 60e3);
  ok(backoffMs(2) > backoffMs(1));
  eq(backoffMs(99), backoffMs(5));
  ok(MAX_ATTEMPTS >= 3 && MAX_ATTEMPTS <= 8);
});

Deno.test("waits read the business's settings", () => {
  const now = new Date("2026-10-11T10:00:00Z");
  eq(waitUntil({ key: "w", kind: "wait", hoursFrom: "response_hours" }, { response_hours: 3 }, now).toISOString(), "2026-10-11T13:00:00.000Z");
  eq(waitUntil({ key: "w", kind: "wait", daysFrom: "d" }, { d: 2 }, now).toISOString(), "2026-10-13T10:00:00.000Z");
  eq(waitUntil({ key: "w", kind: "wait", hours: 24 }, {}, now).toISOString(), "2026-10-12T10:00:00.000Z");
  // invoice: 09:00 Israel on the due date + N days
  const d = waitUntil({ key: "w", kind: "wait", untilDueDatePlusDaysFrom: "f" }, { f: 1 }, now, "2026-10-20");
  const p = israelParts(d);
  eq([p.y, p.mo, p.d, p.h, p.mi], [2026, 10, 21, 9, 0]);
});

Deno.test("israelMorning is DST-safe", () => {
  for (const ymd of ["2026-01-15", "2026-07-15", "2026-03-27", "2026-10-25"]) {
    const p = israelParts(israelMorning(ymd));
    eq([p.h, p.mi], [9, 0], ymd);
  }
});

Deno.test("quiet hours: nights and Shabbat", () => {
  // Wednesday 2026-10-14 12:00 Israel (UTC+3) = 09:00Z → allowed
  ok(clientSendAllowed(new Date("2026-10-14T09:00:00Z"), Q));
  // 23:30 Israel → not allowed; next allowed is 08:00
  const night = new Date("2026-10-14T20:30:00Z");
  ok(!clientSendAllowed(night, Q));
  const n = israelParts(nextClientSendTime(night, Q));
  eq([n.d, n.h, n.mi], [15, 8, 0]);
  // Friday 15:00 Israel → wait until Saturday 20:00
  const fri = new Date("2026-10-16T12:00:00Z");
  ok(!clientSendAllowed(fri, Q));
  const s = israelParts(nextClientSendTime(fri, Q));
  eq([s.dow, s.h, s.mi], [6, 20, 0]);
});

Deno.test("placeholders fill and stay safe", () => {
  eq(fill("היי {שם} מ{עסק} {לא_ידוע}", { "שם": "דנה", "עסק": "אלפא" }), "היי דנה מאלפא {לא_ידוע}");
  const html = textToHtml(fill("שלום {שם}\nhttps://x.co/a", { "שם": "<img src=x onerror=1>" }));
  ok(!html.includes("<img"), "escaped");
  ok(html.includes('href="https://x.co/a"'));
  eq(escapeHtml(`"'<>&`), "&quot;&#39;&lt;&gt;&amp;");
});

Deno.test("whatsapp links for Israeli numbers", () => {
  eq(whatsappLink("050-123-4567"), "https://wa.me/972501234567");
  eq(whatsappLink("+972 50 123 4567"), "https://wa.me/972501234567");
  eq(whatsappLink("12"), null);
});

Deno.test("provider results are classified", () => {
  eq(classifyHttp(200), "ok");
  eq(classifyHttp(429, { name: "daily_quota_exceeded" }), "quota");
  eq(classifyHttp(429, { name: "rate_limit_exceeded" }), "transient");
  eq(classifyHttp(503), "transient");
  eq(classifyHttp(0), "transient");
  eq(classifyHttp(422), "permanent");
});
