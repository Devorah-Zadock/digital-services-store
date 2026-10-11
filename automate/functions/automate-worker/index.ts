// DeskKit Automate — background worker. Called every minute by pg_cron
// (automate/sql/30_cron.sql) with a shared secret; never by browsers.
//
// Each call: (1) respects the kill switch, (2) takes due runs with SKIP
// LOCKED and moves each through its template's steps until it has to wait,
// (3) sends queued emails within the daily cap, quiet hours and the
// provider's quota. Every step is recorded; a step that completed is never
// repeated (unique index), so a crash or a second worker can't double-act.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { afterCheck, backoffMs, clientSendAllowed, type ExecResult, israelMorning, israelParts, MAX_ATTEMPTS,
  nextClientSendTime, type QuietHours, waitUntil } from "../_shared/automate/engine.ts";
import { type Step, type Template, TEMPLATES } from "../_shared/automate/templates.ts";
import { buildMessage, type Ctx } from "../_shared/automate/messages.ts";
import { deliver } from "../_shared/automate/mailer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("AUTOMATE_CRON_SECRET") || "";
const IS_STAGING = Deno.env.get("AUTOMATE_ENV") === "staging";
const APP_URL = Deno.env.get("AUTOMATE_APP_URL") || "https://deskkit.co.il/automate.html";
const PUBLIC_URL = Deno.env.get("AUTOMATE_PUBLIC_URL") || "https://deskkit.co.il";
const RUNS_PER_TICK = 20;
const MESSAGES_PER_TICK = 20;
const STEPS_PER_CLAIM = 12;

type Db = SupabaseClient;
type Run = {
  id: string; automation_id: string; user_id: string; template_key: string; subject_type: string | null; subject_id: string | null;
  status: string; step_index: number; attempt: number; context: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function safeEqual(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function setting<T>(db: Db, key: string, dflt: T): Promise<T> {
  const { data } = await db.rpc("automate_setting", { p_key: key });
  return (data ?? dflt) as T;
}

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error((error as { message?: string }).message || String(error));
  return data;
}

// ---------------------------------------------------------------------
// Context for one run (loaded lazily, refreshed for every check).
class RunCtx {
  private ownerEmail: string | null = null;
  private business: Ctx["business"] | null = null;
  constructor(public db: Db, public run: Run, public config: Record<string, unknown>) {}

  async contact() {
    if (this.run.subject_type === "contact" && this.run.subject_id) {
      const { data } = await this.db.from("contacts").select("*").eq("id", this.run.subject_id).maybeSingle();
      return data;
    }
    if (this.run.subject_type === "quote") {
      const q = await this.quote();
      if (q?.contact_id) {
        const { data } = await this.db.from("contacts").select("*").eq("id", q.contact_id).maybeSingle();
        return data;
      }
    }
    return null;
  }
  async quote() {
    if (this.run.subject_type !== "quote" || !this.run.subject_id) return null;
    const { data } = await this.db.from("quote_shares").select("*").eq("id", this.run.subject_id).maybeSingle();
    return data;
  }
  async invoice() {
    if (this.run.subject_type !== "invoice" || !this.run.subject_id) return null;
    const { data } = await this.db.from("invoice_tracking").select("*").eq("invoice_id", this.run.subject_id).maybeSingle();
    return data;
  }
  async owner(): Promise<string | null> {
    if (this.ownerEmail === null) {
      const { data } = await this.db.auth.admin.getUserById(this.run.user_id);
      this.ownerEmail = data?.user?.email || "";
    }
    return this.ownerEmail || null;
  }
  async biz(): Promise<Ctx["business"]> {
    if (!this.business) {
      const { data } = await this.db.from("business_profiles").select("*").eq("user_id", this.run.user_id).maybeSingle();
      this.business = {
        name: data?.business_name || "העסק",
        replyEmail: data?.reply_email || (await this.owner()),
        phone: data?.phone || null,
        type: data?.business_type || null,
        // @ts-ignore extra field kept for owner alerts
        notifyEmail: data?.notify_email || null,
      };
    }
    return this.business!;
  }
  async messageCtx(): Promise<Ctx> {
    const c = await this.contact();
    return {
      business: await this.biz(), appUrl: APP_URL, publicBaseUrl: PUBLIC_URL, config: this.config,
      contact: c ? { id: c.id, name: c.name, email: c.email, phone: c.phone, message: c.message, amount: Number(c.amount || 0), source: c.source } : null,
      quote: await this.quote(), invoice: await this.invoice(),
    };
  }
}

// ---------------------------------------------------------------------
// Checks — always on fresh data, so nothing is sent about something that
// was already settled.
async function evaluate(check: string, rc: RunCtx): Promise<boolean> {
  const cfg = rc.config;
  switch (check) {
    case "lead_from_form": return (await rc.contact())?.source === "site_form";
    case "lead_still_new": { const c = await rc.contact(); return !!c && c.stage === "new" && !c.handled_at; }
    case "second_nudge_on": { const c = await rc.contact(); return cfg.second_nudge !== false && !!c && c.stage === "new" && !c.handled_at; }
    case "client_ack_allowed": { const c = await rc.contact(); return cfg.auto_reply !== false && !!c?.email && !!c?.consent_contact; }
    case "quote_pending": return (await rc.quote())?.status === "sent";
    case "invoice_unpaid": return (await rc.invoice())?.status === "unpaid";
    case "invoice_second_allowed": return (await rc.invoice())?.status === "unpaid" && Number(cfg.max_reminders || 1) >= 2;
    case "invoice_third_allowed": return (await rc.invoice())?.status === "unpaid" && Number(cfg.max_reminders || 1) >= 3;
    case "has_client_email": { const c = await rc.contact(); const q = await rc.quote(); const i = await rc.invoice(); return !!(c?.email || q?.client_email || i?.client_email); }
    case "review_ready": { const c = await rc.contact(); return !!c?.email && !!cfg.review_url && c.stage !== "lost"; }
    case "welcome_allowed": { const c = await rc.contact(); return cfg.welcome !== false && !!c?.email; }
    case "onboarding_open": {
      const { count } = await rc.db.from("tasks").select("id", { count: "exact", head: true }).eq("run_id", rc.run.id).eq("status", "open");
      return (count || 0) > 0;
    }
  }
  throw new Error("unknown check " + check);
}

// ---------------------------------------------------------------------
// Actions
async function enqueueEmail(rc: RunCtx, step: Step, messageId: string, role: "owner" | "client", approvalNeeded: boolean): Promise<ExecResult> {
  const key = `${rc.run.id}:${step.key}`;
  const { data: existing } = await rc.db.from("automation_messages").select("id").eq("idempotency_key", key).maybeSingle();
  if (existing) return { type: "ok", summary: "ההודעה כבר הוכנה" };

  const ctx = await rc.messageCtx();
  const built = buildMessage(messageId, ctx);
  const biz = await rc.biz();
  let to: string | null;
  let toName: string | null = null;
  if (role === "owner") {
    // @ts-ignore notifyEmail
    to = biz.notifyEmail || (await rc.owner());
  } else {
    to = ctx.contact?.email || ctx.quote?.client_email || ctx.invoice?.client_email || null;
    toName = ctx.contact?.name || ctx.quote?.client_name || ctx.invoice?.client_name || null;
  }
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { type: "skip", summary: "אין כתובת מייל — ההודעה לא נשלחה" };

  const { data: allowed } = await rc.db.rpc("automate_take_email", { p_user: rc.run.user_id });
  if (!allowed) return { type: "blocked", reason: "quota_emails" };

  const { error } = await rc.db.from("automation_messages").insert({
    user_id: rc.run.user_id, run_id: rc.run.id, contact_id: ctx.contact?.id || null,
    recipient_role: role, purpose: built.purpose, to_email: to, to_name: toName,
    from_name: role === "client" ? biz.name : "DeskKit Automate",
    reply_to: role === "client" ? biz.replyEmail : null,
    subject: built.subject, html: built.html, idempotency_key: key,
    status: approvalNeeded ? "pending_approval" : "queued",
  });
  if (error && !/duplicate key/.test(error.message)) throw new Error(error.message);
  const who = role === "owner" ? "אלייך" : `ל${toName || "לקוח"}`;
  return { type: "ok", summary: approvalNeeded ? `הוכנה הודעה ${who} — מחכה לאישורך` : `נשלח מייל ${who}: ${built.subject}` };
}

async function execAction(step: Extract<Step, { kind: "action" }>, rc: RunCtx): Promise<ExecResult> {
  switch (step.action) {
    case "email_owner":
      return enqueueEmail(rc, step, step.message, "owner", false);
    case "email_client": {
      const approval = step.approval === "config" && rc.config.client_messages !== "auto";
      return enqueueEmail(rc, step, step.message, "client", approval);
    }
    case "create_task": {
      const ctx = await rc.messageCtx();
      const name = ctx.contact?.name || ctx.quote?.client_name || ctx.invoice?.client_name || "";
      const hours = step.dueHoursFrom ? Number(rc.config[step.dueHoursFrom] || 24) : (step.dueHours ?? 24);
      const title = step.title.replace("{שם}", name).replace("{חשבונית}", String(ctx.invoice?.invoice_number ?? ""));
      const { error } = await rc.db.from("tasks").upsert({
        user_id: rc.run.user_id, contact_id: ctx.contact?.id || null, title: title.slice(0, 300),
        due_at: new Date(Date.now() + hours * 3600e3).toISOString(), origin: "automation", run_id: rc.run.id, step_key: step.key,
      }, { onConflict: "run_id,step_key", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
      return { type: "ok", summary: `נפתחה משימה: ${title}` };
    }
    case "create_checklist": {
      const c = await rc.contact();
      const lines = String(rc.config.checklist || "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12);
      const rows = lines.map((t, i) => ({
        user_id: rc.run.user_id, contact_id: c?.id || null, title: t.slice(0, 300),
        due_at: new Date(Date.now() + (i + 1) * 864e5).toISOString(), origin: "automation", run_id: rc.run.id, step_key: `${step.key}:${i}`,
      }));
      if (rows.length) {
        const { error } = await rc.db.from("tasks").upsert(rows, { onConflict: "run_id,step_key", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      return { type: "ok", summary: `נפתחו ${rows.length} משימות קליטה` };
    }
    case "mark_contact_won": {
      const q = await rc.quote();
      if (!q) return { type: "skip", summary: "ההצעה לא נמצאה" };
      if (q.contact_id) {
        const { data: c } = await rc.db.from("contacts").select("stage").eq("id", q.contact_id).maybeSingle();
        if (c && c.stage !== "won") await must(rc.db.from("contacts").update({ stage: "won" }).eq("id", q.contact_id));
      } else {
        const { data: created, error } = await rc.db.from("contacts").insert({
          user_id: rc.run.user_id, name: q.client_name, email: q.client_email, amount: q.total || 0,
          stage: "won", source: "manual", handled_at: new Date().toISOString(), notes: "נוסף אוטומטית כשאישר/ה הצעת מחיר",
        }).select("id").single();
        if (error) throw new Error(error.message);
        await must(rc.db.from("quote_shares").update({ contact_id: created.id }).eq("id", q.id));
      }
      return { type: "ok", summary: `${q.client_name} סומן/ה כלקוח/ה שנסגר/ה` };
    }
    case "digest_owner": {
      const { data: items } = await rc.db.rpc("automate_attention", { p_user: rc.run.user_id });
      if (!items || !items.length) return { type: "skip", summary: "אין דברים פתוחים — לא נשלח סיכום" };
      const key = `${rc.run.id}:${step.key}`;
      const { data: existing } = await rc.db.from("automation_messages").select("id").eq("idempotency_key", key).maybeSingle();
      if (existing) return { type: "ok" };
      const { data: allowed } = await rc.db.rpc("automate_take_email", { p_user: rc.run.user_id });
      if (!allowed) return { type: "blocked", reason: "quota_emails" };
      const ctx = { ...(await rc.messageCtx()), attention: items };
      const built = buildMessage("digest", ctx);
      const biz = await rc.biz();
      // @ts-ignore notifyEmail
      const to = biz.notifyEmail || (await rc.owner());
      if (!to) return { type: "skip", summary: "אין כתובת מייל" };
      const { error } = await rc.db.from("automation_messages").insert({
        user_id: rc.run.user_id, run_id: rc.run.id, recipient_role: "owner", purpose: "digest", to_email: to,
        from_name: "DeskKit Automate", subject: built.subject, html: built.html, idempotency_key: key, status: "queued",
      });
      if (error && !/duplicate key/.test(error.message)) throw new Error(error.message);
      return { type: "ok", summary: `נשלח סיכום בוקר (${items.length} פריטים)` };
    }
  }
}

// ---------------------------------------------------------------------
async function logStep(db: Db, run: Run, stepKey: string, status: string, summary?: string, error?: string) {
  const { error: e } = await db.from("automation_run_steps").insert({ run_id: run.id, user_id: run.user_id, step_key: stepKey, status, summary, error });
  // "ok" twice for the same step = it already happened; that's the guard working.
  if (e && !/duplicate key/.test(e.message)) throw new Error(e.message);
}

async function finish(db: Db, run: Run, status: "succeeded" | "stopped" | "failed" | "cancelled", outcome: string, error?: string) {
  await must(db.from("automation_runs").update({
    status, outcome, last_error: error || null, finished_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    step_index: run.step_index, context: run.context, locked_until: null,
  }).eq("id", run.id));
}

async function hold(db: Db, run: Run, untilMs: number, status = "waiting") {
  await must(db.from("automation_runs").update({
    status, next_run_at: new Date(untilMs).toISOString(), step_index: run.step_index, context: run.context,
    attempt: run.attempt, locked_until: null, updated_at: new Date().toISOString(),
  }).eq("id", run.id));
}

async function noteFailure(db: Db, run: Run, tpl: Template | undefined, error: string) {
  const { data: auto } = await db.from("automations").select("consecutive_failures").eq("id", run.automation_id).maybeSingle();
  const n = (auto?.consecutive_failures || 0) + 1;
  await db.from("automations").update({ consecutive_failures: n, ...(n >= 3 ? { status: "needs_attention" } : {}), updated_at: new Date().toISOString() }).eq("id", run.automation_id);
  await db.rpc("automate_alert", { p_user: run.user_id, p_level: "error", p_kind: `run_failed:${run.template_key}`,
    p_message: `האוטומציה "${tpl?.name || run.template_key}" לא הצליחה להשלים פעולה${n >= 3 ? " כמה פעמים ברצף ולכן סומנה \"דורש טיפול\"" : ""}. פרטים בהיסטוריה.` });
}

async function processRun(db: Db, run: Run): Promise<string> {
  const tpl = TEMPLATES[run.template_key];
  const { data: auto } = await db.from("automations").select("status, config").eq("id", run.automation_id).maybeSingle();
  if (!auto || !tpl) { await finish(db, run, "cancelled", "automation_removed"); return "cancelled"; }

  if (auto.status === "paused") { await hold(db, run, Date.now() + 30 * 60e3); return "held_paused"; }
  if (auto.status === "blocked_quota") {
    const { data: limits } = await db.rpc("automate_limits", { p_user: run.user_id });
    const month = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usage } = await db.from("automate_usage").select("runs, emails").eq("user_id", run.user_id).eq("period", month).maybeSingle();
    if ((usage?.emails || 0) < Number(limits?.emails_per_month || 0) && (usage?.runs || 0) <= Number(limits?.runs_per_month || 0)) {
      await db.from("automations").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", run.automation_id);
    } else { await hold(db, run, Date.now() + 6 * 3600e3); return "held_quota"; }
  }

  const rc = new RunCtx(db, run, auto.config || {});
  const { data: doneRows } = await db.from("automation_run_steps").select("step_key").eq("run_id", run.id).eq("status", "ok");
  const done = new Set((doneRows || []).map((r: { step_key: string }) => r.step_key));
  const waits = (run.context.waits || {}) as Record<string, string>;
  run.context.waits = waits;

  for (let n = 0; n < STEPS_PER_CLAIM; n++) {
    const step = tpl.steps[run.step_index];
    if (!step) {
      await finish(db, run, "succeeded", "completed");
      await db.from("automations").update({ consecutive_failures: 0, last_run_at: new Date().toISOString() }).eq("id", run.automation_id);
      return "succeeded";
    }
    if (done.has(step.key)) { run.step_index++; continue; }

    try {
      if (step.kind === "wait") {
        let until = waits[step.key];
        if (!until) {
          const inv = step.untilDueDatePlusDaysFrom ? await rc.invoice() : null;
          until = waitUntil(step, rc.config, new Date(), inv?.due_date).toISOString();
          waits[step.key] = until;
        }
        if (Date.parse(until) > Date.now()) {
          await logStep(db, run, step.key, "waiting", `ממתין עד ${new Date(until).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`);
          run.attempt = 0;
          await hold(db, run, Date.parse(until));
          return "waiting";
        }
        await logStep(db, run, step.key, "ok", "ההמתנה הסתיימה");
        done.add(step.key); run.step_index++;
        continue;
      }

      if (step.kind === "check") {
        const passed = await evaluate(step.check, rc);
        const next = afterCheck(step, run.step_index, passed);
        await logStep(db, run, step.key, passed ? "ok" : "skipped", passed ? "התנאי מתקיים — ממשיכים" : "התנאי לא מתקיים");
        if (passed) done.add(step.key);
        if ("stop" in next) { await finish(db, run, "stopped", `stopped_at:${step.key}`); return "stopped"; }
        run.step_index = next.next;
        continue;
      }

      const res = await execAction(step, rc);
      if (res.type === "ok" || res.type === "skip") {
        await logStep(db, run, step.key, res.type === "ok" ? "ok" : "skipped", res.summary);
        if (res.type === "ok") done.add(step.key);
        run.step_index++; run.attempt = 0;
        continue;
      }
      if (res.type === "blocked") {
        await logStep(db, run, step.key, "blocked", "המכסה החודשית נגמרה — הפעולה תתבצע כשתתחדש");
        await db.from("automations").update({ status: "blocked_quota", updated_at: new Date().toISOString() }).eq("id", run.automation_id);
        await db.rpc("automate_alert", { p_user: run.user_id, p_level: "warning", p_kind: res.reason,
          p_message: "הגעתם למכסת המיילים החודשית. הפעולות ממתינות ויתבצעו כשהמכסה תתחדש." });
        await hold(db, run, Date.now() + 6 * 3600e3);
        return "blocked";
      }
      if (res.type === "fail") throw Object.assign(new Error(res.error), { permanent: true });
      throw new Error(res.error);
    } catch (e) {
      const err = e as Error & { permanent?: boolean };
      run.attempt = (run.attempt || 0) + 1;
      if (err.permanent || run.attempt >= MAX_ATTEMPTS) {
        await logStep(db, run, step.key, "failed", "הפעולה נכשלה", String(err.message).slice(0, 500));
        await finish(db, run, "failed", `failed_at:${step.key}`, String(err.message).slice(0, 500));
        await noteFailure(db, run, tpl, err.message);
        return "failed";
      }
      await logStep(db, run, step.key, "retry", `ניסיון ${run.attempt} נכשל — ננסה שוב`, String(err.message).slice(0, 500));
      await hold(db, run, Date.now() + backoffMs(run.attempt), "retrying");
      return "retrying";
    }
  }
  await hold(db, run, Date.now()); // more steps next tick
  return "continued";
}

// ---------------------------------------------------------------------
// Outbox dispatcher
function tomorrowMorning(): number {
  const p = israelParts(new Date(Date.now() + 864e5));
  return israelMorning(`${p.y}-${String(p.mo).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`, 8).getTime();
}

async function dispatch(db: Db): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  const bump = (k: string) => { stats[k] = (stats[k] || 0) + 1; };
  const caps = await setting(db, "email_caps", { automation_daily: 30 } as { automation_daily: number });
  const quiet = await setting(db, "quiet_hours", { start: 21, end: 8, shabbat: true } as QuietHours);
  const { data: claimed } = await db.rpc("automate_claim_messages", { p_limit: MESSAGES_PER_TICK });
  if (!claimed || !claimed.length) return stats;
  let { data: sentToday } = await db.rpc("automate_emails_today");
  sentToday = Number(sentToday || 0);

  for (const m of claimed) {
    const now = new Date();
    if (m.recipient_role === "client" && !clientSendAllowed(now, quiet)) {
      await db.from("automation_messages").update({ status: "deferred", locked_until: null, next_attempt_at: nextClientSendTime(now, quiet).toISOString() }).eq("id", m.id);
      bump("quiet_hours"); continue;
    }
    if (sentToday >= Number(caps.automation_daily || 0)) {
      await db.from("automation_messages").update({ status: "deferred", locked_until: null, next_attempt_at: new Date(tomorrowMorning()).toISOString() }).eq("id", m.id);
      await db.rpc("automate_alert", { p_user: null, p_level: "warning", p_kind: "daily_cap",
        p_message: "הגענו לתקרת המיילים היומית של האוטומציות. ההודעות ממתינות ויישלחו מחר בבוקר." });
      bump("daily_cap"); continue;
    }
    let fault: string | null = null;
    if (IS_STAGING) {
      const { data } = await db.rpc("automate_test_take_fault", { p_key: "mail" });
      fault = data || null;
    }
    const res = await deliver({ id: m.id, to: m.to_email, toName: m.to_name, fromName: m.from_name || "DeskKit", replyTo: m.reply_to, subject: m.subject, html: m.html }, fault);
    if (res.kind === "sent" || res.kind === "simulated") {
      await db.from("automation_messages").update({ status: res.kind, sent_at: now.toISOString(), locked_until: null, error: null,
        provider_id: res.kind === "sent" ? res.providerId : null }).eq("id", m.id);
      sentToday++; bump(res.kind);
    } else if (res.kind === "quota") {
      await db.from("automation_messages").update({ status: "deferred", locked_until: null, error: res.error, next_attempt_at: new Date(tomorrowMorning()).toISOString() }).eq("id", m.id);
      await db.rpc("automate_alert", { p_user: null, p_level: "warning", p_kind: "provider_quota",
        p_message: "ספק המיילים דיווח שהמכסה היומית נגמרה. ההודעות ממתינות ויישלחו מחר." });
      bump("quota");
    } else if (res.kind === "transient" && m.attempts < 6) {
      await db.from("automation_messages").update({ status: "deferred", locked_until: null, error: res.error, next_attempt_at: new Date(Date.now() + backoffMs(m.attempts)).toISOString() }).eq("id", m.id);
      bump("retry");
    } else {
      await db.from("automation_messages").update({ status: "failed", locked_until: null, error: res.error }).eq("id", m.id);
      await db.rpc("automate_alert", { p_user: m.user_id, p_level: "error", p_kind: "message_failed",
        p_message: `מייל אל ${m.to_email} לא נשלח (${m.subject}). כדאי לבדוק שהכתובת נכונה.` });
      bump("failed");
    }
  }
  return stats;
}

// ---------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!safeEqual(req.headers.get("x-cron-secret") || "", CRON_SECRET)) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const kill = await setting(db, "kill_switch", { on: false } as { on: boolean });
  if (kill.on) return json({ killed: true });

  const out: Record<string, unknown> = {};
  if (body.task === "daily") out.daily = (await db.rpc("automate_emit_daily")).data;

  const runStats: Record<string, number> = {};
  if (body.task !== "dispatch") {
    const { data: runs, error } = await db.rpc("automate_claim_runs", { p_limit: RUNS_PER_TICK });
    if (error) return json({ error: error.message }, 500);
    for (const r of (runs || []) as Run[]) {
      r.context = r.context || {};
      let res: string;
      try { res = await processRun(db, r); } catch (e) {
        // Couldn't even record the outcome: put it back for the next tick.
        res = "error";
        await db.from("automation_runs").update({ status: "retrying", locked_until: null, next_run_at: new Date(Date.now() + 60e3).toISOString(), last_error: String((e as Error).message).slice(0, 300) }).eq("id", r.id);
      }
      runStats[res] = (runStats[res] || 0) + 1;
    }
  }
  out.runs = runStats;
  if (body.task !== "runs") out.messages = await dispatch(db);
  return json(out);
});
