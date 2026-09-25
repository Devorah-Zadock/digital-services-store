// Read-only companion to connect-custom-domain: checks whether a
// customer's already-submitted domain has actually finished verifying
// with Vercel (i.e. their DNS change has propagated and Vercel can see
// it) — lets the "connect your own domain" UI show "still waiting" vs
// "✓ connected" without the customer needing to guess.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// ("custom-domain-status") → Deploy. Same VERCEL_* secrets as
// connect-custom-domain.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERCEL_API_TOKEN = Deno.env.get("VERCEL_API_TOKEN");
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID");
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return new Response(JSON.stringify({ error: "Vercel secrets are not configured" }), { status: 500, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  try {
    const { siteProjectId } = await req.json();
    if (!siteProjectId) {
      return new Response(JSON.stringify({ error: "missing siteProjectId" }), { status: 400, headers: corsHeaders });
    }

    const { data: project, error: fetchErr } = await admin
      .from("site_projects")
      .select("id, user_id, custom_domain")
      .eq("id", siteProjectId)
      .maybeSingle();
    if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "site not found for this account" }), { status: 404, headers: corsHeaders });
    }
    if (!project.custom_domain) {
      return new Response(JSON.stringify({ connected: false, reason: "not_connected" }), { status: 200, headers: corsHeaders });
    }

    const vercelUrl =
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(project.custom_domain)}` +
      (VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "");
    const vercelRes = await fetch(vercelUrl, { headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
    if (!vercelRes.ok) {
      return new Response(JSON.stringify({ connected: false, domain: project.custom_domain, reason: "lookup_failed" }), { status: 200, headers: corsHeaders });
    }
    const body = await vercelRes.json();
    return new Response(
      JSON.stringify({ connected: !!body?.verified, domain: project.custom_domain }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
