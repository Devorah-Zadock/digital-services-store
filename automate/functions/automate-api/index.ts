// DeskKit Automate — the app's API (signed-in business owners only).
// Every action works only on the caller's own data: the user id comes from
// their verified session, never from the request body.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { catalog, defaultsFor, PACKS, TEMPLATES, validateConfig } from "../_shared/automate/templates.ts";
import { buildMessage } from "../_shared/automate/messages.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("AUTOMATE_APP_URL") || "https://deskkit.co.il/automate.html";
const PUBLIC_URL = Deno.env.get("AUTOMATE_PUBLIC_URL") || "https://deskkit.co.il";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
class Bad extends Error { constructor(public code: string, public status = 400) { super(code); } }

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as NonNullable<T>;
}

async function monthUsage(db: SupabaseClient, uid: string) {
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const { data } = await db.from("automate_usage").select("runs, emails").eq("user_id", uid).eq("period", month).maybeSingle();
  const { data: limits } = await db.rpc("automate_limits", { p_user: uid });
  return { runs: data?.runs || 0, emails: data?.emails || 0, limits };
}

async function activate(db: SupabaseClient, uid: string, key: string, input: Record<string, unknown>, pack: string | null) {
  const t = TEMPLATES[key];
  if (!t) throw new Bad("unknown-template");
  const { config, errors } = validateConfig(t, { ...defaultsFor(t, pack || undefined), ...(input || {}) });
  if (errors.length) throw new Bad("missing:" + errors.join(","));
  const { data: existing } = await db.from("automations").select("id, status").eq("user_id", uid).eq("template_key", key).maybeSingle();
  if (!existing) {
    const { count } = await db.from("automations").select("id", { count: "exact", head: true }).eq("user_id", uid).neq("status", "paused");
    const { data: limits } = await db.rpc("automate_limits", { p_user: uid });
    if ((count || 0) >= Number(limits?.active_automations || 6)) throw new Bad("limit-active");
    await must(db.from("automations").insert({ user_id: uid, template_key: key, trigger_type: t.trigger, config, pack, status: "active" }));
  } else {
    await must(db.from("automations").update({ config, pack: pack ?? undefined, status: "active", consecutive_failures: 0, updated_at: new Date().toISOString() }).eq("id", existing.id));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized" }, 401);
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: userData } = await db.auth.getUser(token);
  const user = userData?.user;
  if (!user) return json({ error: "unauthorized" }, 401);
  const uid = user.id;

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "overview") {
      const [autos, profile, usage, alerts] = await Promise.all([
        must(db.from("automations").select("id, template_key, status, config, pack, last_run_at, consecutive_failures, created_at").eq("user_id", uid)),
        db.from("business_profiles").select("*").eq("user_id", uid).maybeSingle().then((r) => r.data),
        monthUsage(db, uid),
        must(db.from("automate_alerts").select("id, level, kind, message, created_at").eq("user_id", uid).is("resolved_at", null).order("created_at", { ascending: false }).limit(10)),
      ]);
      return json({ catalog: catalog(), automations: autos, profile, usage, alerts });
    }

    if (action === "save-profile") {
      const name = str(body.business_name, 120);
      if (!name) throw new Bad("business_name");
      const reply = str(body.reply_email, 254);
      const notify = str(body.notify_email, 254);
      if (reply && !EMAIL_RE.test(reply)) throw new Bad("reply_email");
      if (notify && !EMAIL_RE.test(notify)) throw new Bad("notify_email");
      const type = PACKS.some((p) => p.key === body.business_type) ? body.business_type : null;
      await must(db.from("business_profiles").upsert({ user_id: uid, business_name: name, business_type: type,
        reply_email: reply || null, notify_email: notify || null, phone: str(body.phone, 40) || null, updated_at: new Date().toISOString() }));
      return json({ ok: true });
    }

    if (action === "activate") {
      await activate(db, uid, String(body.template), body.config || {}, typeof body.pack === "string" ? body.pack : null);
      return json({ ok: true });
    }

    if (action === "activate-pack") {
      const pack = PACKS.find((p) => p.key === body.pack);
      if (!pack) throw new Bad("unknown-pack");
      const done: string[] = []; const skipped: string[] = [];
      for (const key of pack.templates) {
        try { await activate(db, uid, key, {}, pack.key); done.push(key); }
        catch (e) { if (e instanceof Bad) skipped.push(`${key}:${e.code}`); else throw e; }
      }
      return json({ ok: true, activated: done, skipped });
    }

    if (action === "pause" || action === "resume") {
      const key = String(body.template);
      const status = action === "pause" ? "paused" : "active";
      await must(db.from("automations").update({ status, consecutive_failures: 0, updated_at: new Date().toISOString() }).eq("user_id", uid).eq("template_key", key));
      return json({ ok: true });
    }

    if (action === "remove") {
      const key = String(body.template);
      const { data: a } = await db.from("automations").select("id").eq("user_id", uid).eq("template_key", key).maybeSingle();
      if (a) {
        await db.from("automation_messages").update({ status: "cancelled", error: "automation_removed" })
          .eq("user_id", uid).in("status", ["pending_approval", "queued", "deferred"])
          .in("run_id", (await must(db.from("automation_runs").select("id").eq("automation_id", a.id))).map((r: { id: string }) => r.id));
        await must(db.from("automations").delete().eq("id", a.id));
      }
      return json({ ok: true });
    }

    if (action === "history") {
      const limit = Math.min(Math.max(Number(body.limit) || 30, 1), 100);
      let q = db.from("automation_runs").select("id, template_key, status, outcome, subject_type, subject_id, created_at, updated_at, finished_at, next_run_at, last_error")
        .eq("user_id", uid).order("created_at", { ascending: false }).limit(limit);
      if (typeof body.template === "string") q = q.eq("template_key", body.template);
      const runs = await must(q);
      const ids = runs.map((r: { id: string }) => r.id);
      const steps = ids.length ? await must(db.from("automation_run_steps").select("run_id, step_key, status, summary, created_at").in("run_id", ids).order("id")) : [];
      const msgs = ids.length ? await must(db.from("automation_messages").select("id, run_id, recipient_role, to_email, subject, status, created_at, sent_at, error").in("run_id", ids)) : [];
      return json({ runs, steps, messages: msgs });
    }

    if (action === "attention") {
      const [items, alerts, approvals] = await Promise.all([
        must(db.rpc("automate_attention", { p_user: uid })),
        must(db.from("automate_alerts").select("id, level, kind, message, created_at").eq("user_id", uid).is("resolved_at", null).order("created_at", { ascending: false }).limit(10)),
        must(db.from("automation_messages").select("id, to_email, to_name, subject, html, purpose, created_at").eq("user_id", uid).eq("status", "pending_approval").order("created_at")),
      ]);
      return json({ items, alerts, approvals });
    }

    if (action === "approve-message" || action === "cancel-message") {
      if (!UUID_RE.test(String(body.id))) throw new Bad("id");
      const status = action === "approve-message" ? "queued" : "cancelled";
      const rows = await must(db.from("automation_messages").update({ status, next_attempt_at: new Date().toISOString() })
        .eq("id", body.id).eq("user_id", uid).eq("status", "pending_approval").select("id"));
      if (!rows.length) throw new Bad("not-found", 404);
      return json({ ok: true });
    }

    if (action === "resolve-alert") {
      await must(db.from("automate_alerts").update({ resolved_at: new Date().toISOString() }).eq("id", Number(body.id)).eq("user_id", uid));
      return json({ ok: true });
    }

    if (action === "send-quote") {
      if (!UUID_RE.test(String(body.quote_id))) throw new Bad("quote_id");
      const clientName = str(body.client_name, 200);
      const clientEmail = str(body.client_email, 254);
      if (!clientName) throw new Bad("client_name");
      if (!EMAIL_RE.test(clientEmail)) throw new Bad("client_email");
      const { data: quote } = await db.from("quote_saves").select("id, data").eq("id", body.quote_id).eq("user_id", uid).maybeSingle();
      if (!quote) throw new Bad("not-found", 404);
      let contactId: string | null = null;
      if (UUID_RE.test(String(body.contact_id || ""))) {
        const { data: c } = await db.from("contacts").select("id").eq("id", body.contact_id).eq("user_id", uid).maybeSingle();
        contactId = c?.id || null;
      }
      const days = Math.min(Math.max(Number(body.expires_days) || 30, 1), 90);
      const priceNum = Number(String(quote.data?.price || "").replace(/,/g, ""));
      const share = await must(db.from("quote_shares").insert({
        user_id: uid, quote_id: quote.id, contact_id: contactId, client_name: clientName, client_email: clientEmail,
        title: str(body.title, 300) || str(quote.data?.eventName, 300) || null,
        total: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
        snapshot: quote.data, expires_at: new Date(Date.now() + days * 864e5).toISOString(),
      }).select("*").single());
      // The owner pressed "send" — that IS the approval for this first email.
      const { data: allowed } = await db.rpc("automate_take_email", { p_user: uid });
      if (!allowed) return json({ ok: true, share, emailed: false, reason: "quota_emails" });
      const { data: prof } = await db.from("business_profiles").select("*").eq("user_id", uid).maybeSingle();
      const business = { name: prof?.business_name || str(quote.data?.businessName, 120) || "העסק", replyEmail: prof?.reply_email || user.email || null, phone: prof?.phone || null, type: prof?.business_type || null };
      const built = buildMessage("quote_sent", { business, appUrl: APP_URL, publicBaseUrl: PUBLIC_URL, config: {}, quote: share });
      await must(db.from("automation_messages").insert({
        user_id: uid, contact_id: contactId, recipient_role: "client", purpose: "quote_sent", to_email: clientEmail, to_name: clientName,
        from_name: business.name, reply_to: business.replyEmail, subject: built.subject, html: built.html,
        idempotency_key: `quote_sent:${share.id}`, status: "queued",
      }));
      return json({ ok: true, share, emailed: true, link: `${PUBLIC_URL}/q.html?t=${share.token}` });
    }

    if (action === "cancel-quote") {
      if (!UUID_RE.test(String(body.id))) throw new Bad("id");
      const rows = await must(db.from("quote_shares").update({ status: "cancelled", decided_at: new Date().toISOString() })
        .eq("id", body.id).eq("user_id", uid).eq("status", "sent").select("id"));
      if (!rows.length) throw new Bad("not-found", 404);
      return json({ ok: true });
    }

    if (action === "track-invoice") {
      if (!UUID_RE.test(String(body.invoice_id))) throw new Bad("invoice_id");
      const due = str(body.due_date, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || isNaN(Date.parse(due))) throw new Bad("due_date");
      const email = str(body.client_email, 254);
      if (email && !EMAIL_RE.test(email)) throw new Bad("client_email");
      const { data: inv } = await db.from("invoice_saves").select("id, number, status, data").eq("id", body.invoice_id).eq("user_id", uid).maybeSingle();
      if (!inv || inv.status !== "issued") throw new Bad("not-issued", 404);
      const amount = Number(body.amount);
      await must(db.from("invoice_tracking").upsert({
        invoice_id: inv.id, user_id: uid, invoice_number: inv.number,
        client_name: str(body.client_name, 200) || str(inv.data?.recipientName, 200) || null,
        client_email: email || null, amount: Number.isFinite(amount) && amount >= 0 ? amount : null, due_date: due,
      }, { onConflict: "invoice_id", ignoreDuplicates: true }));
      return json({ ok: true });
    }

    if (action === "invoice-status") {
      if (!UUID_RE.test(String(body.invoice_id))) throw new Bad("invoice_id");
      const status = ["paid", "unpaid", "cancelled"].includes(body.status) ? body.status : null;
      if (!status) throw new Bad("status");
      const rows = await must(db.from("invoice_tracking").update({ status, paid_note: str(body.note, 500) || null })
        .eq("invoice_id", body.invoice_id).eq("user_id", uid).select("invoice_id"));
      if (!rows.length) throw new Bad("not-found", 404);
      return json({ ok: true });
    }

    // Move leads kept in this browser into the account — only when the
    // owner asked. Re-sending the same leads changes nothing (client_ref).
    if (action === "import-contacts") {
      const leads = Array.isArray(body.leads) ? body.leads.slice(0, 2000) : [];
      const stages = ["new", "inprogress", "followup", "won"];
      const rows = leads.map((l: Record<string, unknown>) => ({
        user_id: uid, client_ref: str(l.id, 100) || null, name: str(l.name, 200) || "ללא שם",
        phone: str(l.phone, 40) || null, email: str(l.email, 254) || null,
        amount: Math.max(0, Math.min(Number(l.amount) || 0, 9999999999)), notes: str(l.notes, 5000) || null,
        stage: stages.includes(String(l.stage)) ? l.stage : "new", source: "import",
        // imported leads are not new enquiries — no "new lead" reminders for them
        handled_at: new Date().toISOString(),
        created_at: Number.isFinite(Number(l.createdAt)) && Number(l.createdAt) > 0 ? new Date(Number(l.createdAt)).toISOString() : new Date().toISOString(),
      })).filter((r: { client_ref: string | null }) => r.client_ref);
      if (rows.length) await must(db.from("contacts").upsert(rows, { onConflict: "user_id,client_ref", ignoreDuplicates: true }));
      const refs = rows.map((r: { client_ref: string }) => r.client_ref);
      const { count } = refs.length
        ? await db.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", uid).in("client_ref", refs)
        : { count: 0 };
      return json({ ok: true, received: leads.length, withId: rows.length, onServer: count || 0, verified: (count || 0) === rows.length });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    if (e instanceof Bad) return json({ error: e.code }, e.status);
    return json({ error: "server", detail: String((e as Error).message).slice(0, 200) }, 500);
  }
});
