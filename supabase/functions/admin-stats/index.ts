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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      admin.from("site_projects").select("id, user_id, template, status, created_at"),
      admin.from("cv_saves").select("user_id, updated_at"),
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
      admin.from("quote_saves").select("user_id, updated_at"),
      admin.from("invoice_saves").select("user_id, doc_type, status, updated_at"),
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

  const users = (profiles || []).map((p) => ({
    id: p.id,
    email: p.email,
    createdAt: p.created_at,
    usedCvBuilder: byUser[p.id] ? byUser[p.id].usedCvBuilder : false,
    usedQuoteBuilder: byUser[p.id] ? byUser[p.id].usedQuoteBuilder : false,
    downloads: byUser[p.id] ? byUser[p.id].downloads : 0,
    sites: byUser[p.id] ? byUser[p.id].sites : [],
    usageLog: byUser[p.id] ? byUser[p.id].usageLog : [],
    // Direct per-tool table counts (not derived from usage_events), so
    // these are accurate even on an account that never ran
    // usage_events.sql — same reasoning as sites/usedCvBuilder above.
    quoteSaveCount: quoteSaveCountByUser[p.id] || 0,
    invoiceCount: (invoiceCountByUser[p.id] && invoiceCountByUser[p.id].total) || 0,
    invoiceIssuedCount: (invoiceCountByUser[p.id] && invoiceCountByUser[p.id].issued) || 0,
    scheduleCount: scheduleCountByUser[p.id] || 0,
  }));

  return {
    userCount: users.length, cvBuilderUserCount: cvUsers.size, quoteBuilderUserCount: quoteUsers.size,
    deckDownloadCount, xlsxDownloadCount, deckDownloadCounts, xlsxDownloadCounts, usageEventsAvailable,
    cvTemplateCounts, quoteTemplateCounts,
    templateCounts, finalizedTemplateCounts, users,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // admin.auth.getUser(token) hits Supabase's own auth server to verify
  // the token is a real, currently-valid session — this is what actually
  // stops a forged/expired/tampered token, not just a string comparison.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }
  if (!ADMIN_EMAILS.length) {
    return new Response(JSON.stringify({ error: "ADMIN_EMAILS not configured" }), { status: 500, headers: corsHeaders });
  }
  const callerEmail = (userData.user.email || "").toLowerCase();
  if (!ADMIN_EMAILS.includes(callerEmail)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "stats";

    // Message actions are a separate concern from the customer/usage
    // stats below (different table, nothing in common) — handled and
    // returned here directly rather than falling through to
    // loadStats(), which would mean re-querying every site/cv/quote/
    // invoice table just to list messages.
    if (action === "list-messages") {
      const { data, error } = await admin.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return new Response(JSON.stringify({ messages: data || [] }), { status: 200, headers: corsHeaders });
    }
    if (action === "mark-message-read") {
      if (!body.messageId) return new Response(JSON.stringify({ error: "missing messageId" }), { status: 400, headers: corsHeaders });
      const { error } = await admin.from("contact_messages").update({ read_at: new Date().toISOString() }).eq("id", body.messageId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }
    if (action === "delete-message") {
      if (!body.messageId) return new Response(JSON.stringify({ error: "missing messageId" }), { status: 400, headers: corsHeaders });
      const { error } = await admin.from("contact_messages").delete().eq("id", body.messageId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    }

    if (action === "delete-site") {
      if (!body.siteId) {
        return new Response(JSON.stringify({ error: "missing siteId" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await admin.from("site_projects").delete().eq("id", body.siteId);
      if (error) throw error;
    } else if (action === "delete-cv") {
      if (!body.userId) {
        return new Response(JSON.stringify({ error: "missing userId" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await admin.from("cv_saves").delete().eq("user_id", body.userId);
      if (error) throw error;
    } else if (action !== "stats") {
      return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: corsHeaders });
    }

    // A delete falls through to here too — the fresh stats are exactly
    // what admin.js needs to re-render the table with the row gone,
    // sparing it a second round trip.
    const stats = await loadStats(admin);
    return new Response(JSON.stringify(stats), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
