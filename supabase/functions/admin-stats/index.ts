// Feeds the "לקוחות ושימוש" (customers & usage) card on admin.html: every
// signed-up user plus, per user, which tools they've actually used (site
// projects by template/status, whether they've touched the CV builder) —
// so it's visible at a glance what's getting used most, not just who
// signed up.
//
// Runs entirely with the service-role key Supabase injects into every Edge
// Function automatically (no secret to configure for that part) — RLS on
// profiles/site_projects/cv_saves has no public policies, so this is the
// only place that can read across every user's rows at once.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!ADMIN_STATS_KEY) {
    return new Response(JSON.stringify({ error: "ADMIN_STATS_KEY not configured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const { adminKey } = await req.json();
    if (adminKey !== ADMIN_STATS_KEY) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const [{ data: profiles, error: profilesErr }, { data: projects, error: projectsErr }, { data: cvSaves, error: cvErr }] =
      await Promise.all([
        admin.from("profiles").select("id, email, created_at").order("created_at", { ascending: false }),
        admin.from("site_projects").select("user_id, template, status, created_at"),
        admin.from("cv_saves").select("user_id"),
      ]);
    if (profilesErr) throw profilesErr;
    if (projectsErr) throw projectsErr;
    if (cvErr) throw cvErr;

    const cvUsers = new Set((cvSaves || []).map((r) => r.user_id));
    const byUser: Record<string, { sites: { template: string; status: string }[]; usedCvBuilder: boolean }> = {};
    for (const p of profiles || []) {
      byUser[p.id] = { sites: [], usedCvBuilder: cvUsers.has(p.id) };
    }
    for (const proj of projects || []) {
      if (!byUser[proj.user_id]) byUser[proj.user_id] = { sites: [], usedCvBuilder: cvUsers.has(proj.user_id) };
      byUser[proj.user_id].sites.push({ template: proj.template, status: proj.status || "draft" });
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
      sites: byUser[p.id] ? byUser[p.id].sites : [],
    }));

    return new Response(
      JSON.stringify({
        userCount: users.length,
        cvBuilderUserCount: cvUsers.size,
        templateCounts,
        finalizedTemplateCounts,
        users,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
