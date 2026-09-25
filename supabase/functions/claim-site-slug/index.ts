// Renames a site_projects row's public slug — the customer's actually-
// chosen name (Gmail-style, see check-site-slug), replacing the
// id-derived fallback (e.g. "site-4c8e7826") publish-site auto-assigns
// the first time a self-hosted site is published, before this picker is
// wired in. check-site-slug is read-only (preview only, never writes);
// this is the one place a slug actually gets claimed.
//
// Re-validates everything server-side rather than trusting the client's
// earlier check-site-slug result — the two calls aren't atomic with each
// other, so someone else could have taken the name in between. The
// site_projects.slug unique index (site_projects_slug.sql) is the real,
// final word: a race that slips past this function's own SELECT still
// can't produce two rows with the same slug, it just surfaces as a
// 23505 (unique-violation) here, handled below as "taken" rather than a
// generic 500.
//
// Also migrates the site's already-published content (if any) from the
// old slug to the new one in hosted_site_pages, and removes the old
// row — otherwise the previous address would keep silently serving the
// same site forever, an abandoned but still-live URL nobody meant to
// keep around.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// ("claim-site-slug") → Deploy.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Kept identical to check-site-slug's own list/pattern on purpose — same
// reasoning applies here, and a mismatch between the two would mean a
// name that passed the live preview check could still fail (or worse,
// succeed when it shouldn't) at the moment it's actually claimed.
const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "mail", "email", "ftp", "blog", "shop",
  "store", "help", "support", "docs", "status", "cdn", "static", "assets",
  "dev", "staging", "test", "demo", "beta", "deskkit", "supabase",
  "netlify", "vercel", "billing", "account", "login", "signup", "root",
]);
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

function isValidSlugShape(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.includes("--");
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
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  try {
    const { siteProjectId, desired } = await req.json();
    if (!siteProjectId || typeof desired !== "string" || !desired.trim()) {
      return new Response(JSON.stringify({ error: "missing siteProjectId or desired" }), { status: 400, headers: corsHeaders });
    }
    const candidate = desired.trim().toLowerCase();
    if (!isValidSlugShape(candidate)) {
      return new Response(JSON.stringify({ success: false, reason: "invalid" }), { status: 200, headers: corsHeaders });
    }
    if (RESERVED_SLUGS.has(candidate)) {
      return new Response(JSON.stringify({ success: false, reason: "reserved" }), { status: 200, headers: corsHeaders });
    }

    // Ownership check — same pattern as publish-site: userId comes only
    // from the verified token, never trusted from the request body.
    const { data: project, error: fetchErr } = await admin
      .from("site_projects")
      .select("id, user_id, slug")
      .eq("id", siteProjectId)
      .maybeSingle();
    if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders });
    if (!project || project.user_id !== userId) {
      return new Response(JSON.stringify({ error: "site not found for this account" }), { status: 404, headers: corsHeaders });
    }

    const oldSlug = project.slug as string | null;
    if (oldSlug === candidate) {
      return new Response(JSON.stringify({ success: true, slug: candidate }), { status: 200, headers: corsHeaders });
    }

    const { error: updateErr } = await admin
      .from("site_projects")
      .update({ slug: candidate })
      .eq("id", siteProjectId);
    if (updateErr) {
      if (updateErr.code === "23505") {
        return new Response(JSON.stringify({ success: false, reason: "taken" }), { status: 200, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: corsHeaders });
    }

    if (oldSlug) {
      const { data: oldPage } = await admin
        .from("hosted_site_pages")
        .select("pages")
        .eq("slug", oldSlug)
        .maybeSingle();
      if (oldPage) {
        await admin
          .from("hosted_site_pages")
          .upsert({ slug: candidate, site_project_id: siteProjectId, pages: oldPage.pages, updated_at: new Date().toISOString() });
        await admin.from("hosted_site_pages").delete().eq("slug", oldSlug);
      }
    }

    return new Response(JSON.stringify({ success: true, slug: candidate }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
