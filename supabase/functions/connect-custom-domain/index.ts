// Lets a customer point their OWN domain (e.g. www.theirbusiness.co.il)
// at their self-hosted site, replacing the old Netlify-specific guide
// (js/domain-guide.js — its "Add custom domain" / Name Servers steps no
// longer apply now that hosting is self-hosted, see publish-site's own
// 2026-09-25 cutover comment).
//
// Registers the domain on DeskKit's Vercel project via Vercel's REST
// API (https://vercel.com/docs/rest-api/reference/endpoints/projects/
// add-a-domain-to-a-project), then hands back the DNS records the
// customer needs to add at THEIR domain's own DNS panel — the same
// "here's exactly what to add" shape every other DNS step in this
// project already uses (Resend, the *.sites.deskkit.co.il wildcard).
// Vercel's own standard values (A record to 76.76.21.21 for an apex
// domain, CNAME to cname.vercel-dns.com for a subdomain like www) are
// shown unconditionally — confirmed correct firsthand while setting up
// deskkit.co.il's own domains in Vercel earlier — plus any additional
// ownership-verification challenge Vercel's response itself includes
// (rare — only when a domain was previously used elsewhere), surfaced
// generically rather than assumed away.
//
// Storing custom_domain on site_projects does NOT mean it's live yet —
// it just makes the row findable once real DNS traffic starts arriving
// (see api/site-preview.js's customDomain lookup). Nothing is publicly
// reachable at that domain until the customer's own DNS actually points
// there, so there's no premature exposure in storing it early.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// ("connect-custom-domain") → Deploy. Needs these secrets set first
// (Dashboard → Edge Functions → Secrets):
//   VERCEL_API_TOKEN    — Vercel → Settings → Tokens → Create (scope: the
//                          digital-services-store project)
//   VERCEL_PROJECT_ID   — Vercel → digital-services-store → Settings →
//                          General → Project ID
//   VERCEL_TEAM_ID      — optional; only needed if the Vercel project
//                          lives under a team, not a personal account
//                          (Vercel → Settings → General → Team ID)

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

// Loose but real: requires at least one dot, only valid domain-label
// characters, no spaces/protocol/path — enough to reject obvious
// garbage before ever calling Vercel's API with it.
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

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
    const { siteProjectId, domain } = await req.json();
    if (!siteProjectId || typeof domain !== "string" || !domain.trim()) {
      return new Response(JSON.stringify({ error: "missing siteProjectId or domain" }), { status: 400, headers: corsHeaders });
    }
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!DOMAIN_PATTERN.test(cleanDomain)) {
      return new Response(JSON.stringify({ success: false, reason: "invalid" }), { status: 200, headers: corsHeaders });
    }

    const { data: project, error: fetchErr } = await admin
      .from("site_projects")
      .select("id, user_id")
      .eq("id", siteProjectId)
      .maybeSingle();
    if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "site not found for this account" }), { status: 404, headers: corsHeaders });
    }

    const vercelUrl =
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains` +
      (VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "");
    const vercelRes = await fetch(vercelUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanDomain }),
    });
    const vercelBody = await vercelRes.json().catch(() => ({}));

    // Vercel's own error shape for "someone already added this exact
    // domain to a (possibly different) project" — surfaced honestly
    // rather than as a generic failure, since it needs a different fix
    // (the customer removing it from wherever it's already registered).
    if (!vercelRes.ok) {
      const code = vercelBody?.error?.code as string | undefined;
      if (code === "domain_already_in_use" || code === "forbidden") {
        return new Response(JSON.stringify({ success: false, reason: "taken" }), { status: 200, headers: corsHeaders });
      }
      return new Response(
        JSON.stringify({ error: vercelBody?.error?.message || `Vercel error: ${vercelRes.status}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    const { error: updateErr } = await admin
      .from("site_projects")
      .update({ custom_domain: cleanDomain })
      .eq("id", siteProjectId);
    if (updateErr) {
      if (updateErr.code === "23505") {
        return new Response(JSON.stringify({ success: false, reason: "taken" }), { status: 200, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
    }

    // Both options are always returned, each labeled with the condition
    // it applies to, rather than guessing apex-vs-subdomain from the
    // domain string itself — tried that (label count, e.g. 3 for
    // "mybiz.co.il" vs "shop.example.com", which is ALSO 3 labels but a
    // real subdomain) and it's genuinely unreliable across different TLD
    // shapes (co.il's 2-part TLD vs com's 1-part one). A CNAME literally
    // can't be used at a DNS zone's apex regardless — that's a protocol
    // fact, not a guess — so showing both, clearly labeled by condition,
    // lets the customer (who does know whether what they typed has a
    // prefix like "www" or not) pick the right one themselves.
    const firstLabel = cleanDomain.split(".")[0];
    const instructions = [
      { type: "A", name: "@", value: "76.76.21.21", when: "apex" },
      { type: "CNAME", name: firstLabel, value: "cname.vercel-dns.com", when: "subdomain" },
    ];
    // Extra ownership-verification steps, only when Vercel's response
    // actually included them (see file header) — never fabricated.
    const verification = Array.isArray(vercelBody?.verification)
      ? vercelBody.verification.map((v: Record<string, unknown>) => ({ type: v.type, name: v.domain, value: v.value }))
      : [];

    return new Response(
      JSON.stringify({ success: true, domain: cleanDomain, verified: !!vercelBody?.verified, instructions, verification }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
