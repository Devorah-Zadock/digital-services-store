// Feeds the "לקוחות ושימוש" (customers & usage) card on admin.html: every
// signed-up user plus, per user, which tools they've actually used (site
// projects by template/status, whether they've touched the CV builder) —
// so it's visible at a glance what's getting used most, not just who
// signed up. Also handles the admin-side delete actions on that same
// card (removing a customer's site or CV) — kept in this one function
// rather than a separate one so there's only ever one Edge Function to
// redeploy when this file changes.
//
// Runs entirely with the service-role key Supabase injects into every Edge
// Function automatically (no secret to configure for that part) — RLS on
// customer_profiles has no public policies at all, and site_projects/
// cv_saves only allow each user to read their own row, so this is the only
// place that can read or write across every user's rows at once.
//
// Admin roles, the audit log and the paginated customer endpoints are
// documented at the "Admin dashboard" section below.
//
// Gated by real auth: the caller sends their own Supabase session token
// (their normal signed-in access_token, not the public anon key) in
// Authorization, this function verifies it's a genuine signed-in user via
// admin.auth.getUser(token), and then checks that user's email against
// ADMIN_EMAILS below — a real server-side allowlist nothing client-side
// can bypass, unlike the shared-secret string this used to compare
// against. Set ADMIN_EMAILS in Supabase Dashboard → Edge Functions →
// admin-stats → Secrets to the site owner's email (comma-separate for
// more than one admin, no spaces).
//
// Deploy: `supabase functions deploy admin-stats` (or paste into Supabase
// Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { layout, sendBatch, sendMail, textToHtml, unsubHeaders, unsubLinks, type Mail } from "../_shared/mail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// One shared shape for every row this function hands the per-user
// activity log, regardless of which real table it came from — the admin
// UI filters/badges purely off `kind`/`action`, never caring which query
// produced a given row. `action` is always one of the 4 real things that
// can happen to a document: "create" | "edit" | "download" | "delete".
// Nothing here is synthetic/sample data — every entry is a real
// timestamp drawn from an existing column (several tables don't have a
// dedicated event log of their own, so their own created_at/updated_at/
// issued_at IS the event, not a simulation of one). There is currently
// no real delete-tracking anywhere in the data model (a self-service
// delete isn't logged, and admin-initiated deletes aren't logged
// either) — the admin UI's "מחיקה" filter exists and simply has nothing
// in it yet, rather than this function inventing rows to fill it.
type ActivityEntry = { kind: string; slug: string | null; action: string; createdAt: string };

async function loadStats(admin: ReturnType<typeof createClient>) {
  const [
    { data: profiles, error: profilesErr },
    { data: projects, error: projectsErr },
    { data: cvSaves, error: cvErr },
    { data: events, error: eventsErr },
    { data: quoteSaves, error: quoteSavesErr },
    { data: invoiceSaves, error: invoiceSavesErr },
    { data: scheduleProjects, error: scheduleErr },
  ] = await Promise.all([
      admin.from("customer_profiles").select("id, email, created_at").order("created_at", { ascending: false }),
      // No updated_at here — confirmed live against the real DB that
      // site_projects doesn't actually have that column (PostgREST:
      // "column site_projects.updated_at does not exist"), despite it
      // being referenced in a few client-side selects elsewhere in this
      // repo (js/projects.js, js/site-wizard-router.js) — those are a
      // separate, pre-existing issue, not something this function
      // should paper over by requesting a column that isn't there.
      admin.from("site_projects").select("id, user_id, template, status, created_at"),
      // id added for cvSaveCountByUser below — cv_saves is one row per
      // SAVED CV now (see supabase/sql/cv_saves_multi.sql), not one per
      // user, so a real per-user count needs each row counted, not just
      // which users have at least one (that's still what cvUsers, right
      // below, is for).
      admin.from("cv_saves").select("id, user_id, updated_at"),
      // Capped — usage_events grows without bound as the site gets used,
      // and this function returns every row straight to the browser in
      // one response. A few thousand most-recent rows is plenty to drive
      // the per-user log and the template-usage counts below without the
      // payload growing forever as the customer base does.
      admin.from("usage_events").select("user_id, kind, slug, action, created_at").order("created_at", { ascending: false }).limit(5000),
      // Per-user breakdown by tool (quote/invoice/schedule) — these three
      // tables may not exist yet on a site that hasn't run their own
      // one-time SQL setup, same reasoning as usage_events below: treated
      // as "no data yet" rather than failing the whole stats card.
      admin.from("quote_saves").select("id, user_id, template, created_at, updated_at"),
      admin.from("invoice_saves").select("id, user_id, doc_type, status, created_at, issued_at"),
      admin.from("schedule_projects").select("user_id, updated_at"),
  ]);
  if (profilesErr) throw profilesErr;
  if (projectsErr) throw projectsErr;
  if (cvErr) throw cvErr;
  // usage_events may not exist yet on a site that hasn't run the one-time
  // SQL setup (supabase/sql/usage_events.sql) — treated as "no usage data
  // yet" rather than failing the whole stats card, same as every other
  // optional table this function reads. usageEventsAvailable lets the
  // admin UI show "not set up" instead of a bare 0, which otherwise looks
  // identical to "genuinely zero downloads so far" — a real, confusing
  // distinction once someone actually starts using the site.
  const usageEventsAvailable = !eventsErr;
  const usageEvents = eventsErr ? [] : (events || []);
  // Same defensive treatment as usage_events above — these three are
  // core per-tool tables (quote-app.html/invoice-app.html/schedule-
  // builder.html already depend on them to function), but this stats
  // card would rather show "0" for a table it couldn't read than take
  // the whole admin page down over one of them.
  const quoteSavesRows = quoteSavesErr ? [] : (quoteSaves || []);
  const invoiceSavesRows = invoiceSavesErr ? [] : (invoiceSaves || []);
  const scheduleProjectsRows = scheduleErr ? [] : (scheduleProjects || []);

  const cvUsers = new Set((cvSaves || []).map((r) => r.user_id));
  const quoteUsers = new Set(usageEvents.filter((e) => e.kind === "quote" && e.action === "edit").map((e) => e.user_id));

  const deckDownloadCounts: Record<string, number> = {};
  const xlsxDownloadCounts: Record<string, number> = {};
  const cvTemplateCounts: Record<string, number> = {};
  const quoteTemplateCounts: Record<string, number> = {};
  for (const e of usageEvents) {
    if (e.action === "download") {
      if (e.kind === "deck") deckDownloadCounts[e.slug] = (deckDownloadCounts[e.slug] || 0) + 1;
      if (e.kind === "xlsx") xlsxDownloadCounts[e.slug] = (xlsxDownloadCounts[e.slug] || 0) + 1;
    } else if (e.action === "edit") {
      if (e.kind === "cv") cvTemplateCounts[e.slug] = (cvTemplateCounts[e.slug] || 0) + 1;
      if (e.kind === "quote") quoteTemplateCounts[e.slug] = (quoteTemplateCounts[e.slug] || 0) + 1;
    }
  }
  const deckDownloadCount = Object.values(deckDownloadCounts).reduce((a, b) => a + b, 0);
  const xlsxDownloadCount = Object.values(xlsxDownloadCounts).reduce((a, b) => a + b, 0);

  // Per-user activity log: usage_events rows as-is, PLUS real create/
  // issue events derived from tables that don't log their own creation
  // into usage_events (site_projects/quote_saves/invoice_saves) — see
  // this file's own ActivityEntry comment for why nothing here is
  // fabricated. Grouped by user up front so building each user's final
  // array below is a straight lookup, not a per-user re-scan of every
  // table every time.
  const activityByUser: Record<string, ActivityEntry[]> = {};
  const pushActivity = (userId: string, entry: ActivityEntry) => {
    (activityByUser[userId] || (activityByUser[userId] = [])).push(entry);
  };
  for (const e of usageEvents) {
    pushActivity(e.user_id, { kind: e.kind, slug: e.slug, action: e.action, createdAt: e.created_at });
  }
  for (const proj of projects || []) {
    pushActivity(proj.user_id, { kind: "site", slug: proj.template, action: "create", createdAt: proj.created_at });
    // No real finalize/publish timestamp exists on this row (no
    // updated_at column — see this function's own select comment above),
    // so a "finalized" site's download event reuses created_at rather
    // than inventing a timestamp that isn't there.
    if (proj.status === "finalized") {
      pushActivity(proj.user_id, { kind: "site", slug: proj.template, action: "download", createdAt: proj.created_at });
    }
  }
  for (const q of quoteSavesRows) {
    pushActivity(q.user_id, { kind: "quote", slug: q.template || null, action: "create", createdAt: q.created_at });
  }
  for (const inv of invoiceSavesRows) {
    pushActivity(inv.user_id, { kind: "invoice", slug: inv.doc_type, action: "create", createdAt: inv.created_at });
    if (inv.status === "issued" && inv.issued_at) {
      pushActivity(inv.user_id, { kind: "invoice", slug: inv.doc_type, action: "download", createdAt: inv.issued_at });
    }
  }
  // Newest-first per user, once, here — every consumer (the admin UI's
  // "All" view and each per-product filtered view) just reads this
  // order straight, instead of each one re-sorting its own slice.
  for (const userId of Object.keys(activityByUser)) {
    activityByUser[userId].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const cvSaveCountByUser: Record<string, number> = {};
  for (const r of (cvSaves || [])) cvSaveCountByUser[r.user_id] = (cvSaveCountByUser[r.user_id] || 0) + 1;
  const quoteSaveCountByUser: Record<string, number> = {};
  for (const r of quoteSavesRows) quoteSaveCountByUser[r.user_id] = (quoteSaveCountByUser[r.user_id] || 0) + 1;
  const invoiceCountByUser: Record<string, { total: number; issued: number }> = {};
  for (const r of invoiceSavesRows) {
    if (!invoiceCountByUser[r.user_id]) invoiceCountByUser[r.user_id] = { total: 0, issued: 0 };
    invoiceCountByUser[r.user_id].total += 1;
    if (r.status === "issued") invoiceCountByUser[r.user_id].issued += 1;
  }
  const scheduleCountByUser: Record<string, number> = {};
  for (const r of scheduleProjectsRows) scheduleCountByUser[r.user_id] = (scheduleCountByUser[r.user_id] || 0) + 1;

  // Per-user deck/xlsx DOWNLOAD counts — the existing deckDownloadCounts/
  // xlsxDownloadCounts above are keyed by template slug (global, for the
  // "most-downloaded template" table), not by user; the Usage Dashboard
  // needs "how many has THIS user downloaded", a different cut of the
  // same usage_events rows.
  const deckCountByUser: Record<string, number> = {};
  const xlsxCountByUser: Record<string, number> = {};
  for (const e of usageEvents) {
    if (e.action !== "download") continue;
    if (e.kind === "deck") deckCountByUser[e.user_id] = (deckCountByUser[e.user_id] || 0) + 1;
    if (e.kind === "xlsx") xlsxCountByUser[e.user_id] = (xlsxCountByUser[e.user_id] || 0) + 1;
  }

  type UsageLogEntry = { kind: string; slug: string | null; action: string; createdAt: string };
  const byUser: Record<string, { sites: { id: string; template: string; status: string }[]; usedCvBuilder: boolean; usedQuoteBuilder: boolean; downloads: number; usageLog: UsageLogEntry[] }> = {};
  for (const p of profiles || []) {
    byUser[p.id] = { sites: [], usedCvBuilder: cvUsers.has(p.id), usedQuoteBuilder: quoteUsers.has(p.id), downloads: 0, usageLog: [] };
  }
  for (const proj of projects || []) {
    if (!byUser[proj.user_id]) byUser[proj.user_id] = { sites: [], usedCvBuilder: cvUsers.has(proj.user_id), usedQuoteBuilder: quoteUsers.has(proj.user_id), downloads: 0, usageLog: [] };
    byUser[proj.user_id].sites.push({ id: proj.id, template: proj.template, status: proj.status || "draft" });
  }
  // usage_events was already fetched newest-first, so each user's log ends
  // up newest-first too without a separate sort per user.
  for (const e of usageEvents) {
    if (!byUser[e.user_id]) byUser[e.user_id] = { sites: [], usedCvBuilder: cvUsers.has(e.user_id), usedQuoteBuilder: quoteUsers.has(e.user_id), downloads: 0, usageLog: [] };
    if (e.action === "download") byUser[e.user_id].downloads += 1;
    byUser[e.user_id].usageLog.push({ kind: e.kind, slug: e.slug, action: e.action, createdAt: e.created_at });
  }

  const templateCounts: Record<string, number> = {};
  const finalizedTemplateCounts: Record<string, number> = {};
  for (const proj of projects || []) {
    templateCounts[proj.template] = (templateCounts[proj.template] || 0) + 1;
    if (proj.status === "finalized") {
      finalizedTemplateCounts[proj.template] = (finalizedTemplateCounts[proj.template] || 0) + 1;
    }
  }

  const users = (profiles || []).map((p) => {
    const sites = byUser[p.id] ? byUser[p.id].sites : [];
    const invoiceCounts = invoiceCountByUser[p.id];
    return {
      id: p.id,
      email: p.email,
      createdAt: p.created_at,
      usedCvBuilder: byUser[p.id] ? byUser[p.id].usedCvBuilder : false,
      usedQuoteBuilder: byUser[p.id] ? byUser[p.id].usedQuoteBuilder : false,
      downloads: byUser[p.id] ? byUser[p.id].downloads : 0,
      sites,
      usageLog: byUser[p.id] ? byUser[p.id].usageLog : [],
      // Direct per-tool table counts (not derived from usage_events), so
      // these are accurate even on an account that never ran
      // usage_events.sql — same reasoning as sites/usedCvBuilder above.
      quoteSaveCount: quoteSaveCountByUser[p.id] || 0,
      invoiceCount: (invoiceCounts && invoiceCounts.total) || 0,
      invoiceIssuedCount: (invoiceCounts && invoiceCounts.issued) || 0,
      scheduleCount: scheduleCountByUser[p.id] || 0,
      // The 6-product Usage Dashboard's own numbers, all real counts
      // (never a fraction of some allowed maximum — there is no such
      // cap anywhere in this product today).
      usage: {
        sites: sites.length,
        cv: cvSaveCountByUser[p.id] || 0,
        decks: deckCountByUser[p.id] || 0,
        sheets: xlsxCountByUser[p.id] || 0,
        quotes: quoteSaveCountByUser[p.id] || 0,
        invoices: (invoiceCounts && invoiceCounts.total) || 0,
      },
      activity: activityByUser[p.id] || [],
    };
  });

  return {
    userCount: users.length, cvBuilderUserCount: cvUsers.size, quoteBuilderUserCount: quoteUsers.size,
    deckDownloadCount, xlsxDownloadCount, deckDownloadCounts, xlsxDownloadCounts, usageEventsAvailable,
    cvTemplateCounts, quoteTemplateCounts,
    templateCounts, finalizedTemplateCounts, users,
  };
}

/* ===================================================================
   Admin dashboard (admin.html → לקוחות / יומן ניהול / הרשאות)
   ===================================================================
   Roles — enforced HERE, server-side, on every request; admin.js only
   hides buttons a role can't use, it never decides access:
     owner   — the ADMIN_EMAILS secret (always), or role "owner" in
               admin_users. Everything, incl. export, plan changes,
               deleting an account, managing other admins.
     admin   — day-to-day support: suspend/unsuspend, password-reset
               email, deleting a single site/CV, deleting messages,
               reading the audit log.
     support — read-only: customers, details, messages.
   Every action that reads one customer's details or changes anything is
   written to admin_audit_log BEFORE it runs; if the log can't be
   written, the action is refused — nothing happens unrecorded.
   Everything new here depends on supabase/sql/admin_dashboard.sql. */

type Role = "owner" | "admin" | "support";
const ROLE_RANK: Record<Role, number> = { support: 1, admin: 2, owner: 3 };

// Minimum role per action. Anything not listed is rejected.
const ACTION_MIN_ROLE: Record<string, Role> = {
  "whoami": "support",
  "unlock": "support",
  "set-admin-password": "support",
  "summary": "support",
  "list-users": "support",
  "user-detail": "support",
  "stats": "support",
  "template-stats": "support",
  "list-messages": "support",
  "mark-message-read": "support",
  "delete-message": "admin",
  "audit-log": "admin",
  "suspend-user": "admin",
  "unsuspend-user": "admin",
  "send-password-reset": "admin",
  "delete-site": "admin",
  "delete-cv": "admin",
  "bulk": "admin",
  "export-users": "owner",
  "set-pro": "owner",
  "delete-account": "owner",
  "list-admins": "owner",
  "set-admin-role": "owner",
  "remove-admin": "owner",
  "metrics": "support",
  "mail-overview": "owner",
  "mail-test": "owner",
  "mail-create": "owner",
  "mail-send-batch": "owner",
};

const EXPORT_BATCH = 5000;
const AUDIT_RETENTION_DAYS = 731; // 24 months, see the privacy policy
const SITE_URL = (Deno.env.get("SITE_URL") || "https://deskkit.co.il").replace(/\/$/, "");
// Same tables the customer's own self-service deletion clears
// (supabase/functions/delete-account) — an admin-initiated deletion must
// remove exactly what the customer's own request would.
const ACCOUNT_TABLES = ["site_projects", "schedule_projects", "cv_saves", "quote_saves", "license_redemptions", "usage_events", "profiles"];

type Actor = { id: string; email: string; role: Role };

// ---- Owner's update emails ("דיוור") ----
const MAIL_BATCH = 25;

// Israeli law (חוק התקשורת, סעיף 30א) requires an advertising email's
// subject to start with "פרסומת"; the owner ticks whether it's one.
function mailDraft(body: Record<string, unknown>): { subject: string; body: string; isAd: boolean } | { error: string } {
  const rawSubject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!rawSubject || rawSubject.length > 150) return { error: "subject" };
  if (!text || text.length > 20000) return { error: "body" };
  const isAd = body.isAd !== false;
  const subject = isAd && !/^פרסומת/.test(rawSubject) ? "פרסומת: " + rawSubject : rawSubject;
  return { subject, body: text, isAd };
}

async function campaignHtml(text: string, userId: string): Promise<string> {
  const { page } = await unsubLinks(userId);
  return layout(textToHtml(text), { unsubscribeUrl: page, why: "קיבלת את המייל הזה כי יש לך חשבון ב-DeskKit ונרשמת לעדכונים." });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function resolveRole(admin: ReturnType<typeof createClient>, email: string): Promise<Role | null> {
  if (ADMIN_EMAILS.includes(email)) return "owner";
  const { data, error } = await admin.from("admin_users").select("role").eq("email", email).maybeSingle();
  if (error || !data) return null;
  return (["owner", "admin", "support"] as Role[]).includes(data.role) ? data.role as Role : null;
}

async function userNumberOf(admin: ReturnType<typeof createClient>, userId: string | null): Promise<number | null> {
  if (!userId) return null;
  const { data } = await admin.from("customer_profiles").select("user_number").eq("id", userId).maybeSingle();
  const n = data && data.user_number != null ? Number(data.user_number) : NaN;
  return Number.isFinite(n) ? n : null;
}

// Throws (→ the action is refused) if the entry can't be written.
async function audit(admin: ReturnType<typeof createClient>, actor: Actor, action: string, targetUserId: string | null, details: Record<string, unknown> = {}) {
  const row = {
    admin_user_id: actor.id, admin_email: actor.email, admin_role: actor.role, action,
    target_user_id: targetUserId, target_user_number: await userNumberOf(admin, targetUserId), details,
  };
  const { error } = await admin.from("admin_audit_log").insert(row);
  if (error) throw new Error("audit log unavailable (run supabase/sql/admin_dashboard.sql): " + error.message);
}

async function isProtectedAccount(admin: ReturnType<typeof createClient>, userId: string, actor: Actor): Promise<string | null> {
  if (userId === actor.id) return "אי אפשר לבצע את הפעולה הזו על החשבון שלך.";
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = (data && data.user && data.user.email || "").toLowerCase();
  if (email && (ADMIN_EMAILS.includes(email) || await resolveRole(admin, email))) {
    return "זה חשבון של מנהל/ת — יש להסיר קודם את ההרשאה בלשונית \"הרשאות\".";
  }
  return null;
}

function clampInt(v: unknown, min: number, max: number, dflt: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), min), max) : dflt;
}

function listUsersArgs(body: Record<string, unknown>, limit: number, offset: number) {
  const str = (k: string) => (typeof body[k] === "string" && (body[k] as string).trim() ? (body[k] as string).trim().slice(0, 200) : null);
  const ts = (k: string) => { const v = str(k); return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null; };
  const ids = Array.isArray(body.userIds) ? (body.userIds as unknown[]).filter((x) => typeof x === "string").slice(0, 10000) : null;
  return {
    p_search: str("search"),
    p_status: ["active", "suspended", "unconfirmed"].includes(String(body.status)) ? body.status : null,
    p_plan: ["pro", "free"].includes(String(body.plan)) ? body.plan : null,
    p_activity: ["active7", "active30", "inactive30"].includes(String(body.activity)) ? body.activity : null,
    p_from: ts("from"), p_to: ts("to"),
    p_user_ids: ids && ids.length ? ids : null,
    p_sort: ["created_at", "user_number", "email", "full_name", "last_active_at", "docs"].includes(String(body.sort)) ? body.sort : "created_at",
    p_dir: body.dir === "asc" ? "asc" : "desc",
    p_limit: limit, p_offset: offset,
  };
}

// snake_case RPC row → the camelCase shape admin.js renders. Only what the
// admin page actually shows — nothing else about the account leaves here.
function mapUser(r: Record<string, unknown>) {
  return {
    id: r.user_id, number: r.user_number, email: r.email, name: r.full_name,
    createdAt: r.created_at, lastSignInAt: r.last_sign_in_at, lastActiveAt: r.last_active_at,
    emailConfirmed: r.email_confirmed, suspended: r.is_suspended, pro: r.is_pro,
    counts: { sites: r.sites_count, cv: r.cv_count, quotes: r.quotes_count, invoices: r.invoices_count },
  };
}

async function selectOr(admin: ReturnType<typeof createClient>, table: string, cols: string[], userId: string, order: string) {
  // Optional columns differ between projects (each tool has its own SQL
  // file) — try the full column list, fall back to the basic one.
  for (const c of cols) {
    const { data, error } = await admin.from(table).select(c).eq("user_id", userId).order(order, { ascending: false }).limit(200);
    if (!error) return data || [];
  }
  return [];
}

async function userDetail(admin: ReturnType<typeof createClient>, userId: string, actor: Actor) {
  const { data: rows, error } = await admin.rpc("admin_list_users", { ...listUsersArgs({}, 1, 0), p_user_ids: [userId] });
  if (error) throw error;
  if (!rows || !rows.length) return null;
  const user = mapUser(rows[0]);

  // Document lists: identifying metadata only (type, status, dates) —
  // never the documents' contents, which the admin view doesn't need.
  const [sites, cvs, quotes, invoices, events] = await Promise.all([
    selectOr(admin, "site_projects", ["id, template, status, slug, published_url, published_at, created_at", "id, template, status, created_at"], userId, "created_at"),
    selectOr(admin, "cv_saves", ["id, created_at, updated_at", "id, updated_at"], userId, "updated_at"),
    selectOr(admin, "quote_saves", ["id, created_at, updated_at, template:data->>template", "id, created_at, updated_at"], userId, "updated_at"),
    selectOr(admin, "invoice_saves", ["id, doc_type, status, number, created_at, issued_at"], userId, "created_at"),
    selectOr(admin, "usage_events", ["kind, slug, action, created_at"], userId, "created_at"),
  ]);

  const activity: ActivityEntry[] = (events as Record<string, string>[]).map((e) => ({ kind: e.kind, slug: e.slug, action: e.action, createdAt: e.created_at }));
  for (const sp of sites as Record<string, string>[]) activity.push({ kind: "site", slug: sp.template, action: "create", createdAt: sp.created_at });
  for (const q of quotes as Record<string, string>[]) activity.push({ kind: "quote", slug: q.template || null, action: "create", createdAt: q.created_at });
  for (const inv of invoices as Record<string, string>[]) {
    activity.push({ kind: "invoice", slug: inv.doc_type, action: "create", createdAt: inv.created_at });
    if (inv.status === "issued" && inv.issued_at) activity.push({ kind: "invoice", slug: inv.doc_type, action: "download", createdAt: inv.issued_at });
  }
  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let auditEntries: unknown[] = [];
  if (ROLE_RANK[actor.role] >= ROLE_RANK.admin) {
    const { data } = await admin.from("admin_audit_log").select("id, created_at, admin_email, admin_role, action, details").eq("target_user_id", userId).order("created_at", { ascending: false }).limit(50);
    auditEntries = data || [];
  }
  return { user, sites, cvs, quotes, invoices, activity: activity.slice(0, 150), auditEntries };
}

async function setSuspended(admin: ReturnType<typeof createClient>, userId: string, suspended: boolean) {
  // Supabase's own ban: a banned account can't sign in or refresh its
  // session until unbanned. ~100 years = "until lifted".
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: suspended ? "876000h" : "none" } as Record<string, unknown>);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Admin password ("second lock"). Signing in proves who you are; every
// admin action additionally needs a short-lived unlock token, which is
// only issued for the separate admin password (supabase/sql/
// admin_unlock.sql). The token is an HMAC over {user id, expiry}, keyed
// from the service-role secret, so it can't be forged or moved to another
// account, and it expires by itself.
const UNLOCK_TTL_MS = 2 * 60 * 60 * 1000;
// Actions that change customers' accounts or data, grant paid features,
// export personal data or change who's an admin: each needs the admin
// password typed again (confirmPassword), so a computer left unlocked
// with the admin area open isn't enough to do any of them.
const STEP_UP_ACTIONS = new Set([
  "set-pro", "delete-account", "export-users", "set-admin-role", "remove-admin",
  "suspend-user", "unsuspend-user", "bulk", "delete-site", "delete-cv",
  "mail-create",
]);
const UNLOCK_FREE_ACTIONS = new Set(["whoami", "unlock", "set-admin-password"]);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function b64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let unlockKeyPromise: Promise<CryptoKey> | null = null;
function unlockKey(): Promise<CryptoKey> {
  if (!unlockKeyPromise) {
    unlockKeyPromise = (async () => {
      const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SERVICE_ROLE_KEY + ":admin-unlock-v1"));
      return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    })();
  }
  return unlockKeyPromise;
}

async function signUnlock(payload: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await unlockKey(), new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}

// v = the admin password's version: changing the password makes every
// token issued before it invalid at once (signs other sessions out).
async function makeUnlockToken(userId: string, version: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + UNLOCK_TTL_MS;
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ u: userId, exp: expiresAt, v: version })));
  return { token: payload + "." + (await signUnlock(payload)), expiresAt };
}

async function unlockTokenValid(token: unknown, userId: string, version: string): Promise<boolean> {
  if (typeof token !== "string" || token.length > 400) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await signUnlock(payload);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { u, exp, v } = JSON.parse(json);
    return u === userId && v === version && typeof exp === "number" && exp > Date.now();
  } catch (_e) {
    return false;
  }
}

// Best-effort heads-up to the admin's own inbox on every unlock, so an
// unexpected one is noticed. Never blocks the unlock itself.
async function notifyAdmin(email: string, subject: string, htmlBody: string) {
  if (!RESEND_API_KEY || !email) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "DeskKit <security@deskkit.co.il>",
        to: [email],
        subject,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif">${htmlBody}</div>`,
      }),
    });
  } catch (_e) { /* best effort */ }
}

// The full "what to do" guide, in every security email, so it's there
// in the inbox exactly when it's needed.
const ACTIONS_URL = "https://github.com/Devorah-Zadock/digital-services-store/actions/workflows/supabase-deploy.yml";
const EMERGENCY_STEPS_HTML =
  `<div style="margin-top:16px;padding:12px 14px;border:1px solid #f0c36d;background:#fff8e6;border-radius:8px;">` +
  `<b>אם זו לא את/ה — מה עושים, לפי הסדר:</b><ol style="margin:8px 0 0;padding-inline-start:20px;line-height:1.7;">` +
  `<li><b>מחליפים את סיסמת חשבון ה-Google</b> (או את סיסמת החשבון באתר, אם נכנסים עם מייל וסיסמה): ` +
  `<a href="https://myaccount.google.com/security">myaccount.google.com/security</a>.</li>` +
  `<li><b>מנתקים את כל הגישה לניהול:</b> נכנסים ל-<a href="${ACTIONS_URL}">GitHub ← Actions ← Supabase deploy</a> ← ` +
  `לוחצים <b>Run workflow</b> ← בשדה "What to do" בוחרים <b>admin-reset</b> ← <b>Run workflow</b> (הירוק). ` +
  `זה מוחק את סיסמת הניהול ומנתק את כל המנהלים מכל המכשירים. הלקוחות לא מושפעים.</li>` +
  `<li><b>נכנסים מחדש לאזור הניהול</b> וקובעים סיסמת ניהול חדשה.</li>` +
  `<li>בודקים בלשונית <b>"יומן ניהול"</b> מה בוצע, ופונים לתמיכה אם משהו נראה חשוד.</li></ol>` +
  `<div style="margin-top:8px;font-size:13px;color:#555;">אין זמן עכשיו לכל השלבים? בשלב 2 בחרו <b>admin-lockdown</b> — ` +
  `זה נועל את הניהול לגמרי ל-30 יום ומנתק את כולם. מאוחר יותר <b>admin-reset</b> פותח אותו שוב.</div></div>`;

function securityEmail(email: string, subject: string, whatHappened: string) {
  const when = new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
  return notifyAdmin(email, subject,
    `${whatHappened} (${when}).<br><br><b>אם זו את/ה — אין צורך לעשות דבר.</b>` + EMERGENCY_STEPS_HTML);
}

function notifyAdminUnlock(email: string) {
  return securityEmail(email, "כניסה לאזור הניהול של DeskKit", "נכנסו לאזור הניהול עם החשבון שלך");
}

// One email per lock-out (not one for every request made while locked).
async function notifyAdminLockedOnce(admin: ReturnType<typeof createClient>, email: string) {
  const since = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const { count } = await admin.from("admin_audit_log").select("id", { count: "exact", head: true })
    .eq("admin_email", email).eq("action", "admin_unlock_locked").gte("created_at", since);
  if (count) return;
  await securityEmail(email, "⚠️ ניסיונות כושלים לסיסמת הניהול — DeskKit",
    "הוקלדה סיסמת ניהול שגויה 5 פעמים בחשבון שלך, ולכן אזור הניהול ננעל ל-15 דקות");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // admin.auth.getUser(token) hits Supabase's own auth server to verify
  // the token is a real, currently-valid session — this is what actually
  // stops a forged/expired/tampered token, not just a string comparison.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
  const callerEmail = (userData.user.email || "").toLowerCase();
  // Roles are keyed by email, so the email must be proven to belong to
  // this account — otherwise (with email confirmation ever turned off)
  // someone could simply sign up AS an admin's address.
  const emailConfirmed = !!(userData.user.email_confirmed_at || (userData.user as { confirmed_at?: string }).confirmed_at);
  const role = emailConfirmed ? await resolveRole(admin, callerEmail) : null;
  if (!role) {
    if (!ADMIN_EMAILS.length) return json({ error: "ADMIN_EMAILS not configured" }, 500);
    return json({ error: "forbidden" }, 403);
  }
  const actor: Actor = { id: userData.user.id, email: callerEmail, role };

  try {
    const body = await req.json();
    const action = String(body.action || "stats");
    const minRole = ACTION_MIN_ROLE[action];
    if (!minRole) return json({ error: "unknown action" }, 400);
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) return json({ error: "forbidden", requiredRole: minRole }, 403);

    const { data: secretVersion } = await admin.rpc("admin_secret_version", { p_email: callerEmail });
    const adminPassword = secretVersion ? "set" : "unset";
    const unlocked = adminPassword === "set" && await unlockTokenValid(body.adminToken, actor.id, String(secretVersion));
    if (!UNLOCK_FREE_ACTIONS.has(action) && !unlocked) {
      return json({ error: "admin-locked", adminPassword }, 401);
    }

    if (STEP_UP_ACTIONS.has(action)) {
      const confirm = await admin.rpc("admin_secret_check", { p_email: callerEmail, p_password: String(body.confirmPassword || "") });
      if (confirm.error) throw confirm.error;
      if (confirm.data === "locked") {
        await notifyAdminLockedOnce(admin, callerEmail);
        await audit(admin, actor, "admin_unlock_locked", null, { action });
        return json({ error: "locked" }, 423);
      }
      if (confirm.data !== "ok") {
        await audit(admin, actor, "admin_confirm_failed", null, { action });
        return json({ error: "confirm-password" }, 401);
      }
    }

    if (action === "whoami") return json({ email: callerEmail, role, adminPassword, unlocked });

    // Exchange the admin password for an unlock token (2 hours).
    if (action === "unlock") {
      const result = await admin.rpc("admin_secret_check", { p_email: callerEmail, p_password: String(body.password || "") });
      if (result.error) throw result.error;
      if (result.data === "unset") return json({ error: "not-set" }, 409);
      if (result.data === "locked") {
        await notifyAdminLockedOnce(admin, callerEmail);
        await audit(admin, actor, "admin_unlock_locked", null);
        return json({ error: "locked" }, 423);
      }
      if (result.data !== "ok") {
        await audit(admin, actor, "admin_unlock_failed", null);
        return json({ error: "bad-password" }, 401);
      }
      await audit(admin, actor, "admin_unlock", null);
      await notifyAdminUnlock(callerEmail);
      return json(await makeUnlockToken(actor.id, String(secretVersion)));
    }

    // Set (first time) or change the admin password. First time needs a
    // fresh sign-in (within 15 minutes); changing needs the current one.
    if (action === "set-admin-password") {
      const newPassword = String(body.newPassword || "");
      if (newPassword.length < 10) return json({ error: "too-short" }, 400);
      if (adminPassword === "set") {
        const check = await admin.rpc("admin_secret_check", { p_email: callerEmail, p_password: String(body.currentPassword || "") });
        if (check.error) throw check.error;
        if (check.data === "locked") {
          await notifyAdminLockedOnce(admin, callerEmail);
          await audit(admin, actor, "admin_unlock_locked", null, { action });
          return json({ error: "locked" }, 423);
        }
        if (check.data !== "ok") {
          await audit(admin, actor, "admin_unlock_failed", null, { action });
          return json({ error: "bad-password" }, 401);
        }
      }
      // First-time setup needs no extra step (a forced fresh sign-in was
      // too much friction with Google log-in); instead the admin is told
      // by email every time an admin password is set or changed, so one
      // set by anyone else is noticed right away.
      await audit(admin, actor, "set_admin_password", null);
      const setRes = await admin.rpc("admin_secret_set", { p_email: callerEmail, p_password: newPassword });
      if (setRes.error) throw setRes.error;
      await securityEmail(callerEmail, "נקבעה סיסמת ניהול — DeskKit", "נקבעה (או הוחלפה) סיסמת ניהול לחשבון שלך ב-DeskKit");
      const { data: newVersion } = await admin.rpc("admin_secret_version", { p_email: callerEmail });
      return json(await makeUnlockToken(actor.id, String(newVersion)));
    }

    if (action === "summary") {
      // Retention housekeeping on each dashboard load: the privacy policy
      // promises the audit log is kept up to 24 months, and the table's
      // append-only trigger allows deleting only rows past that age.
      const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 864e5).toISOString();
      await admin.from("admin_audit_log").delete().lt("created_at", cutoff);
      const { data, error } = await admin.rpc("admin_dashboard_summary");
      if (error) throw error;
      return json({ summary: data });
    }

    if (action === "list-users") {
      const pageSize = clampInt(body.pageSize, 10, 100, 25);
      const page = clampInt(body.page, 1, 100000, 1);
      const { data, error } = await admin.rpc("admin_list_users", listUsersArgs(body, pageSize, (page - 1) * pageSize));
      if (error) throw error;
      const rows = (data || []) as Record<string, unknown>[];
      return json({ users: rows.map(mapUser), total: rows.length ? Number(rows[0].total_count) : 0, page, pageSize });
    }

    if (action === "user-detail") {
      if (typeof body.userId !== "string") return json({ error: "missing userId" }, 400);
      await audit(admin, actor, "view_user", body.userId);
      const detail = await userDetail(admin, body.userId, actor);
      if (!detail) return json({ error: "not found" }, 404);
      return json(detail);
    }

    // Exported in batches (offset) so even tens of thousands of rows stay
    // well inside one function call's time limit. Every batch is audited.
    if (action === "export-users") {
      const offset = clampInt(body.offset, 0, 10_000_000, 0);
      const { data, error } = await admin.rpc("admin_list_users", listUsersArgs(body, EXPORT_BATCH, offset));
      if (error) throw error;
      const raw = (data || []) as Record<string, unknown>[];
      const rows = raw.map(mapUser);
      const total = raw.length ? Number(raw[0].total_count) : 0;
      await audit(admin, actor, "export_users", null, {
        rows: rows.length, offset, total,
        filters: { search: body.search || null, status: body.status || null, plan: body.plan || null, activity: body.activity || null, from: body.from || null, to: body.to || null, selected: Array.isArray(body.userIds) ? body.userIds.length : null },
      });
      return json({ users: rows, total, offset, batch: EXPORT_BATCH });
    }

    if (action === "suspend-user" || action === "unsuspend-user") {
      const userId = String(body.userId || "");
      const suspend = action === "suspend-user";
      const reason = String(body.reason || "").trim().slice(0, 500);
      if (!userId) return json({ error: "missing userId" }, 400);
      if (suspend && !reason) return json({ error: "חובה לציין סיבה להשעיה." }, 400);
      const blocked = await isProtectedAccount(admin, userId, actor);
      if (blocked) return json({ error: blocked }, 400);
      await audit(admin, actor, suspend ? "suspend_user" : "unsuspend_user", userId, { reason: reason || null });
      await setSuspended(admin, userId, suspend);
      return json({ success: true });
    }

    if (action === "bulk") {
      const op = body.op === "unsuspend" ? "unsuspend" : body.op === "suspend" ? "suspend" : null;
      const ids = Array.isArray(body.userIds) ? (body.userIds as unknown[]).filter((x) => typeof x === "string").slice(0, 100) as string[] : [];
      const reason = String(body.reason || "").trim().slice(0, 500);
      if (!op || !ids.length) return json({ error: "missing op/userIds" }, 400);
      if (op === "suspend" && !reason) return json({ error: "חובה לציין סיבה להשעיה." }, 400);
      const results = { done: 0, skipped: [] as { id: string; why: string }[] };
      for (const id of ids) {
        const blocked = await isProtectedAccount(admin, id, actor);
        if (blocked) { results.skipped.push({ id, why: blocked }); continue; }
        await audit(admin, actor, op === "suspend" ? "suspend_user" : "unsuspend_user", id, { reason: reason || null, bulk: true });
        await setSuspended(admin, id, op === "suspend");
        results.done += 1;
      }
      return json(results);
    }

    if (action === "send-password-reset") {
      const userId = String(body.userId || "");
      const { data } = await admin.auth.admin.getUserById(userId);
      const email = data && data.user && data.user.email;
      if (!email) return json({ error: "not found" }, 404);
      await audit(admin, actor, "send_password_reset", userId);
      const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + "/account.html" });
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "set-pro") {
      const userId = String(body.userId || "");
      const isPro = body.isPro === true;
      if (!userId) return json({ error: "missing userId" }, 400);
      await audit(admin, actor, isPro ? "grant_pro" : "revoke_pro", userId, { reason: String(body.reason || "").slice(0, 500) || null });
      const { error } = await admin.from("customer_profiles").update({ is_pro: isPro }).eq("id", userId);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "delete-account") {
      const userId = String(body.userId || "");
      const reason = String(body.reason || "").trim().slice(0, 500);
      if (!userId) return json({ error: "missing userId" }, 400);
      if (!reason) return json({ error: "חובה לציין סיבה למחיקה." }, 400);
      const blocked = await isProtectedAccount(admin, userId, actor);
      if (blocked) return json({ error: blocked }, 400);
      const { data } = await admin.auth.admin.getUserById(userId);
      const email = (data && data.user && data.user.email || "").toLowerCase();
      // The typed confirmation is checked here, not just in the browser.
      if (!email || String(body.confirmEmail || "").trim().toLowerCase() !== email) {
        return json({ error: "כתובת המייל לאישור לא תואמת." }, 400);
      }
      await audit(admin, actor, "delete_account", userId, { reason });
      for (const table of ACCOUNT_TABLES) {
        const column = table === "profiles" ? "id" : "user_id";
        const { error } = await admin.from(table).delete().eq(column, userId);
        if (error) console.error(`admin delete-account: failed to clear ${table}`, error.message);
      }
      const { data: files } = await admin.storage.from("logos").list(userId);
      if (files && files.length) await admin.storage.from("logos").remove(files.map((f) => `${userId}/${f.name}`));
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) throw delErr;
      return json({ success: true });
    }

    if (action === "audit-log") {
      const pageSize = clampInt(body.pageSize, 10, 100, 50);
      const page = clampInt(body.page, 1, 100000, 1);
      let q = admin.from("admin_audit_log").select("id, created_at, admin_email, admin_role, action, target_user_id, target_user_number, details", { count: "exact" });
      if (typeof body.filterAction === "string" && body.filterAction) q = q.eq("action", body.filterAction);
      if (typeof body.filterAdmin === "string" && body.filterAdmin) q = q.eq("admin_email", body.filterAdmin.toLowerCase());
      if (body.filterUserNumber) q = q.eq("target_user_number", Number(body.filterUserNumber));
      const { data, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return json({ entries: data || [], total: count || 0, page, pageSize });
    }

    if (action === "list-admins") {
      const { data, error } = await admin.from("admin_users").select("email, role, created_at, created_by").order("created_at");
      if (error) throw error;
      return json({ owners: ADMIN_EMAILS, admins: data || [] });
    }

    if (action === "set-admin-role" || action === "remove-admin") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "כתובת מייל לא תקינה." }, 400);
      if (ADMIN_EMAILS.includes(email)) return json({ error: "זו בעלת האתר (מוגדרת ב-ADMIN_EMAILS) — אי אפשר לשנות אותה מכאן." }, 400);
      if (email === callerEmail) return json({ error: "אי אפשר לשנות את ההרשאה של עצמך." }, 400);
      if (action === "remove-admin") {
        await audit(admin, actor, "remove_admin", null, { email });
        const { error } = await admin.from("admin_users").delete().eq("email", email);
        if (error) throw error;
      } else {
        const newRole = String(body.role || "");
        if (!["owner", "admin", "support"].includes(newRole)) return json({ error: "תפקיד לא תקין." }, 400);
        await audit(admin, actor, "set_admin_role", null, { email, role: newRole });
        const { error } = await admin.from("admin_users").upsert({ email, role: newRole, created_by: callerEmail }, { onConflict: "email" });
        if (error) throw error;
      }
      return json({ success: true });
    }

    // ---- Messages (contact form + feedback widget) ----
    if (action === "list-messages") {
      const { data, error } = await admin.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return json({ messages: data || [] });
    }
    if (action === "mark-message-read") {
      if (!body.messageId) return json({ error: "missing messageId" }, 400);
      const { error } = await admin.from("contact_messages").update({ read_at: new Date().toISOString() }).eq("id", body.messageId);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === "delete-message") {
      if (!body.messageId) return json({ error: "missing messageId" }, 400);
      await audit(admin, actor, "delete_message", null, { messageId: body.messageId });
      const { error } = await admin.from("contact_messages").delete().eq("id", body.messageId);
      if (error) throw error;
      return json({ success: true });
    }

    // ---- "מדדים" tab: totals and trends, counts only ----
    if (action === "metrics") {
      const { data, error } = await admin.rpc("admin_metrics");
      if (error) throw error;
      return json({ metrics: data });
    }

    // ---- "דיוור" tab: updates to everyone on the list ----
    if (action === "mail-overview") {
      const [{ data: audience, error: aErr }, { data: campaigns, error: cErr }] = await Promise.all([
        admin.rpc("email_campaign_audience"),
        admin.from("email_campaigns").select("id, kind, subject, is_ad, created_by, created_at, finished_at").order("created_at", { ascending: false }).limit(20),
      ]);
      if (aErr) throw aErr;
      if (cErr) throw cErr;
      const withCounts = await Promise.all((campaigns || []).map(async (c) => {
        const { count } = await admin.from("email_sends").select("user_id", { count: "exact", head: true }).eq("campaign_id", c.id);
        return { ...c, sent: count || 0 };
      }));
      return json({ audience: audience || 0, campaigns: withCounts });
    }

    if (action === "mail-test" || action === "mail-create") {
      const draft = mailDraft(body);
      if ("error" in draft) return json({ error: draft.error }, 400);
      if (action === "mail-test") {
        const html = await campaignHtml(draft.body, actor.id);
        const ok = await sendMail({ to: callerEmail, subject: "[ניסיון] " + draft.subject, html });
        if (!ok) return json({ error: "send-failed" }, 502);
        return json({ success: true, to: callerEmail });
      }
      const { data: created, error } = await admin.from("email_campaigns")
        .insert({ kind: "update", subject: draft.subject, body: draft.body, is_ad: draft.isAd, created_by: callerEmail })
        .select("id").single();
      if (error) throw error;
      await audit(admin, actor, "mail_campaign_create", null, { campaignId: created.id, subject: draft.subject });
      return json({ campaignId: created.id });
    }

    // Sends the next few emails of a campaign. The admin page calls this
    // again and again until nothing is left; if the email provider's
    // daily quota runs out it stops, and the same button continues later
    // — every address gets each campaign at most once (email_sends).
    if (action === "mail-send-batch") {
      if (typeof body.campaignId !== "string") return json({ error: "missing campaignId" }, 400);
      const { data: camp, error: cErr } = await admin.from("email_campaigns").select("id, kind, subject, body, finished_at").eq("id", body.campaignId).maybeSingle();
      if (cErr) throw cErr;
      if (!camp || camp.kind !== "update") return json({ error: "not found" }, 404);
      const { data: recipients, error: rErr } = await admin.rpc("email_campaign_recipients", { p_campaign: camp.id, p_limit: MAIL_BATCH });
      if (rErr) throw rErr;
      const list = (recipients || []) as { user_id: string; email: string }[];
      if (!list.length) {
        if (!camp.finished_at) await admin.from("email_campaigns").update({ finished_at: new Date().toISOString() }).eq("id", camp.id);
        return json({ status: "done", sent: 0, remaining: 0 });
      }
      const mails: Mail[] = await Promise.all(list.map(async (r) => ({
        to: r.email, subject: camp.subject, html: await campaignHtml(camp.body, r.user_id), headers: await unsubHeaders(r.user_id),
      })));
      const result = await sendBatch(mails);
      if (result !== "ok") return json({ status: result, sent: 0 });
      const { error: sErr } = await admin.from("email_sends").upsert(list.map((r) => ({ campaign_id: camp.id, user_id: r.user_id })), { onConflict: "campaign_id,user_id", ignoreDuplicates: true });
      if (sErr) throw sErr;
      const { data: left } = await admin.rpc("email_campaign_recipients", { p_campaign: camp.id, p_limit: 1 });
      const remaining = (left || []).length;
      if (!remaining) await admin.from("email_campaigns").update({ finished_at: new Date().toISOString() }).eq("id", camp.id);
      return json({ status: remaining ? "more" : "done", sent: list.length });
    }

    // ---- Single-document deletes ----
    if (action === "delete-site") {
      if (!body.siteId) return json({ error: "missing siteId" }, 400);
      const { data: site } = await admin.from("site_projects").select("user_id, template").eq("id", body.siteId).maybeSingle();
      await audit(admin, actor, "delete_site", site ? site.user_id : null, { siteId: body.siteId, template: site ? site.template : null });
      const { error } = await admin.from("site_projects").delete().eq("id", body.siteId);
      if (error) throw error;
      return json({ success: true });
    }
    if (action === "delete-cv") {
      if (body.cvId) {
        const { data: cv } = await admin.from("cv_saves").select("user_id").eq("id", body.cvId).maybeSingle();
        await audit(admin, actor, "delete_cv", cv ? cv.user_id : null, { cvId: body.cvId });
        const { error } = await admin.from("cv_saves").delete().eq("id", body.cvId);
        if (error) throw error;
      } else if (body.userId) {
        await audit(admin, actor, "delete_cv", body.userId, { all: true });
        const { error } = await admin.from("cv_saves").delete().eq("user_id", body.userId);
        if (error) throw error;
      } else {
        return json({ error: "missing cvId" }, 400);
      }
      return json({ success: true });
    }

    // ---- Template usage charts ("תבניות" tab) ----
    // Aggregates only — the per-user list that used to ride along here
    // (every customer with their whole history) is now served page by
    // page through list-users / user-detail instead.
    const stats = await loadStats(admin);
    const { users: _users, ...aggregates } = stats;
    return json(aggregates);
  } catch (err) {
    return json({ error: errorText(err) }, 500);
  }
});

// A real Error (JS-thrown) stringifies fine via String()/.message — but
// every table read above throws Postgrest's own error shape directly
// (plain {message, details, hint, code}, not an Error instance), which
// has no custom toString and so used to serialize as the literal string
// "[object Object]" here, making every real failure on this endpoint
// undiagnosable from the admin UI. This pulls the real message out of
// either shape instead.
function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
