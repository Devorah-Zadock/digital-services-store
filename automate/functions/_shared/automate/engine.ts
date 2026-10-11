// DeskKit Automate — pure engine logic (no network, no database), so it
// can be unit-tested exactly as it runs: automate/tests/unit/engine.test.ts

import type { Step, Template } from "./templates.ts";

export const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [60e3, 5 * 60e3, 30 * 60e3, 2 * 3600e3, 12 * 3600e3];

// Wait before retry number `attempt` (1-based).
export function backoffMs(attempt: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempt, 1), BACKOFF_MS.length) - 1];
}

export type ExecResult =
  | { type: "ok"; summary?: string }
  | { type: "skip"; summary?: string }
  | { type: "retry"; error: string }          // temporary problem: try again later
  | { type: "fail"; error: string }           // permanent problem: stop this run
  | { type: "blocked"; reason: string };      // quota: hold, nothing lost

// After a check: where to go next.
export function afterCheck(step: Extract<Step, { kind: "check" }>, index: number, passed: boolean): { next: number } | { stop: true } {
  if (passed) return { next: index + 1 };
  if (step.otherwise === "stop") return { stop: true };
  return { next: index + 1 + Math.max(0, step.otherwise.skip) };
}

function num(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

// When a wait step is over. dueDate is "YYYY-MM-DD" (Israel date) for invoice waits.
export function waitUntil(step: Extract<Step, { kind: "wait" }>, config: Record<string, unknown>, now: Date, dueDate?: string | null): Date {
  if (step.untilDueDatePlusDaysFrom) {
    const plus = num(config[step.untilDueDatePlusDaysFrom], 0);
    const base = dueDate ? israelMorning(dueDate) : now;
    return new Date(base.getTime() + plus * 864e5);
  }
  const hours = step.hoursFrom ? num(config[step.hoursFrom], 1) : (step.hours ?? 0);
  const days = step.daysFrom ? num(config[step.daysFrom], 1) : (step.days ?? 0);
  return new Date(now.getTime() + hours * 3600e3 + days * 864e5);
}

// ---------------------------------------------------------------------
// Israel time without libraries.
type Parts = { y: number; mo: number; d: number; h: number; mi: number; dow: number };
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function israelParts(date: Date): Parts {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, dow: DOW[p.weekday] };
}

// 09:00 Israel time on a given Israel date (DST-safe: corrects the offset).
export function israelMorning(ymd: string, hour = 9): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hour - 2, 0));
  for (let i = 0; i < 3; i++) {
    const p = israelParts(guess);
    const diffMin = (hour - p.h) * 60 - p.mi;
    const dayDiff = Date.UTC(y, m - 1, d) - Date.UTC(p.y, p.mo - 1, p.d);
    guess = new Date(guess.getTime() + diffMin * 60e3 + dayDiff);
  }
  return guess;
}

export type QuietHours = { start: number; end: number; shabbat: boolean };

// May a client-facing email go out at this moment?
export function clientSendAllowed(date: Date, q: QuietHours): boolean {
  const p = israelParts(date);
  const minutes = p.h * 60 + p.mi;
  const night = q.start > q.end
    ? (minutes >= q.start * 60 || minutes < q.end * 60)
    : (minutes >= q.start * 60 && minutes < q.end * 60);
  if (night) return false;
  if (q.shabbat) {
    if (p.dow === 5 && minutes >= 14 * 60) return false;     // Friday afternoon
    if (p.dow === 6 && minutes < 20 * 60) return false;      // Saturday until evening
  }
  return true;
}

// The next moment a client-facing email may go out (15-minute steps).
export function nextClientSendTime(date: Date, q: QuietHours): Date {
  let t = new Date(date.getTime());
  for (let i = 0; i < 4 * 24 * 4; i++) {
    if (clientSendAllowed(t, q)) return t;
    t = new Date(Math.ceil((t.getTime() + 1) / 900e3) * 900e3);
  }
  return t;
}

// ---------------------------------------------------------------------
// Texts: "{שם}" style placeholders, filled from plain values. HTML
// escaping happens after filling, so nothing a client typed can inject
// markup into an email.
export function fill(text: string, vars: Record<string, string | number | null | undefined>): string {
  return String(text || "").replace(/\{([^{}\s]{1,20})\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

export function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Plain text → safe HTML paragraphs with clickable https links.
export function textToHtml(text: string): string {
  return String(text || "").trim().split(/\n{2,}/).map((para) => {
    const withLinks = escapeHtml(para).replace(/https:\/\/[^\s<>"']+/g, (u) => `<a href="${u}" style="color:#0F766E;font-weight:600;">${u}</a>`);
    return `<p style="margin:0 0 14px;">${withLinks.replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

export function shekels(n: unknown): string {
  const v = Number(n);
  return Number.isFinite(v) ? "₪" + v.toLocaleString("he-IL", { maximumFractionDigits: 2 }) : "";
}

// Israeli phone → WhatsApp link (wa.me needs the international number).
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  const intl = digits.startsWith("972") ? digits : digits.startsWith("0") ? "972" + digits.slice(1) : digits;
  return `https://wa.me/${intl}` + (text ? `?text=${encodeURIComponent(text)}` : "");
}

// Provider result → what the engine should do.
export function classifyHttp(status: number, body?: { name?: string; type?: string } | null): "ok" | "quota" | "transient" | "permanent" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 429) {
    const kind = String(body?.name || body?.type || "");
    return /quota/i.test(kind) ? "quota" : "transient";
  }
  if (status === 408 || status >= 500 || status === 0) return "transient";
  return "permanent";
}

// Does every step key appear once, and do skips stay inside the template?
export function lintTemplate(t: Template): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  t.steps.forEach((s, i) => {
    if (seen.has(s.key)) problems.push(`${t.key}: duplicate step ${s.key}`);
    seen.add(s.key);
    if (s.kind === "check" && s.otherwise !== "stop" && i + 1 + s.otherwise.skip > t.steps.length) problems.push(`${t.key}: skip past end at ${s.key}`);
    const fromKey = s.kind === "wait" ? (s.hoursFrom || s.daysFrom || s.untilDueDatePlusDaysFrom)
      : s.kind === "action" && s.action === "create_task" ? s.dueHoursFrom : undefined;
    if (fromKey && !t.config.some((f) => f.key === fromKey)) problems.push(`${t.key}: ${s.key} reads unknown setting ${fromKey}`);
  });
  return problems;
}
