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
// Gated by a static shared token rather than real auth, matching every
// other admin-only surface in this codebase (see admin.js's own comment):
// admin.html itself is only a client-side password gate, so a stronger
// check here wouldn't actually raise the bar — same honest caveat, not
// real DRM. Set ADMIN_STATS_KEY in Supabase Dashboard → Edge Functions →
// admin-stats → Secrets to any string, then paste the same string into
// ADMIN_STATS_KEY in js/admin.js.
//
// Deploy: `supabase functions deploy admin-stats` (or paste into Supabase
// Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_STATS_KEY = Deno.env.get("ADMIN_STATS_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function loadStats(admin: ReturnType<typeof createClient>) {
  const [{ data: profiles, error: profilesErr }, { data: projects, error: projectsErr }, { data: cvSaves, error: cvErr }, { data: events, error: eventsErr }] =
    await Promise.all([
      admin.from("customer_profiles").select("id, email, created_at").order("created_at", { ascending: false }),
      admin.from("site_projects").select("id, user_id, template, status, created_at"),
      admin.from("cv_saves").select("user_id"),
      admin.from("usage_events").select("user_id, kind, slug, action"),
    ]);
  if (profilesErr) throw profilesErr;
  if (projectsErr) throw projectsErr;
  if (cvErr) throw cvErr;
  // usage_events may not exist yet on a site that hasn't run the one-time
  // SQL setup (supabase/sql/usage_events.sql) — treated as "no usage data
  // yet" rather than failing the whole stats card, same as every other
  // optional table this function reads.
  const usageEvents = eventsErr ? [] : (events || []);

  const cvUsers = new Set((cvSaves || []).map((r) => r.user_id));
  const quoteUsers = new Set(usageEvents.filter((e) => e.kind === "quote" && e.action === "edit").map((e) => e.user_id));
  const deckDownloadCounts: Record<string, number> = {};
  const xlsxDownloadCounts: Record<string, number> = {};
  for (const e of usageEvents) {
    if (e.action !== "download") continue;
    if (e.kind === "deck") deckDownloadCounts[e.slug] = (deckDownloadCounts[e.slug] || 0) + 1;
    if (e.kind === "xlsx") xlsxDownloadCounts[e.slug] = (xlsxDownloadCounts[e.slug] || 0) + 1;
  }
  const deckDownloadCount = Object.values(deckDownloadCounts).reduce((a, b) => a + b, 0);
  const xlsxDownloadCount = Object.values(xlsxDownloadCounts).reduce((a, b) => a + b, 0);

  const byUser: Record<string, { sites: { id: string; template: string; status: string }[]; usedCvBuilder: boolean; usedQuoteBuilder: boolean; downloads: number }> = {};
  for (const p of profiles || []) {
    byUser[p.id] = { sites: [], usedCvBuilder: cvUsers.has(p.id), usedQuoteBuilder: quoteUsers.has(p.id), downloads: 0 };
  }
  for (const proj of projects || []) {
    if (!byUser[proj.user_id]) byUser[proj.user_id] = { sites: [], usedCvBuilder: cvUsers.has(proj.user_id), usedQuoteBuilder: quoteUsers.has(proj.user_id), downloads: 0 };
    byUser[proj.user_id].sites.push({ id: proj.id, template: proj.template, status: proj.status || "draft" });
  }
  for (const e of usageEvents) {
    if (e.action !== "download") continue;
    if (!byUser[e.user_id]) byUser[e.user_id] = { sites: [], usedCvBuilder: cvUsers.has(e.user_id), usedQuoteBuilder: quoteUsers.has(e.user_id), downloads: 0 };
    byUser[e.user_id].downloads += 1;
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
  }));

  return {
    userCount: users.length, cvBuilderUserCount: cvUsers.size, quoteBuilderUserCount: quoteUsers.size,
    deckDownloadCount, xlsxDownloadCount, deckDownloadCounts, xlsxDownloadCounts,
    templateCounts, finalizedTemplateCounts, users,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!ADMIN_STATS_KEY) {
    return new Response(JSON.stringify({ error: "ADMIN_STATS_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    if (body.adminKey !== ADMIN_STATS_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const action = body.action || "stats";

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
