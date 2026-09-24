// Part of moving site-hosting off Netlify: once a site is served at
// <slug>.deskkit.co.il, that slug has to be globally unique across every
// customer's site — RLS on site_projects only ever lets a signed-in
// caller see their OWN rows (auth.uid() = user_id), so there is no way
// for the browser to check "is this name taken by anyone" by querying
// the table directly. This function is that check: it runs with the
// service-role key, so it can see across every account, and it's the
// single place the reserved-word list and the naming rules live — the
// same rules apply here and (later) at the moment a slug is actually
// claimed, so nothing can slip through a gap between "checked available"
// and "actually saved".
//
// Read-only: never writes to site_projects. Claiming a checked-available
// slug happens elsewhere, at actual publish time — this only ever
// answers "as of right now, could you use this name".
//
// Deploy: `supabase functions deploy check-site-slug` (or paste into
// Supabase Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Names that would otherwise look like a real part of DeskKit's own
// infrastructure (or someone else's obvious trademark) if claimed as
// <name>.deskkit.co.il by a customer.
const RESERVED_SLUGS = new Set([
  "www", "admin", "api", "app", "mail", "email", "ftp", "blog", "shop",
  "store", "help", "support", "docs", "status", "cdn", "static", "assets",
  "dev", "staging", "test", "demo", "beta", "deskkit", "supabase",
  "netlify", "vercel", "billing", "account", "login", "signup", "root",
]);

// Same shape as every real slug this function will ever create: lowercase
// letters, digits and hyphens, 3–40 characters, matching how a DNS label
// actually works (no leading/trailing hyphen, no consecutive hyphens —
// enforced by the two extra checks below rather than a hairier regex).
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

function isValidSlugShape(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.includes("--");
}

// Turns a business name (Hebrew, English, punctuation, whatever) into a
// starting-point slug candidate. Hebrew and other non-Latin text has no
// meaningful transliteration here, so it collapses to nothing — the
// caller falls back to a generic candidate in that case rather than
// showing the customer an empty suggestion.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function suggestionsFor(base: string): string[] {
  const root = base.length >= 3 ? base : "my-site";
  const out: string[] = [];
  for (let i = 2; i <= 4 && out.length < 3; i++) {
    out.push(`${root}-${i}`.slice(0, 40));
  }
  out.push(`${root}-${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 40));
  return out;
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

  try {
    const { desired } = await req.json();
    if (typeof desired !== "string" || !desired.trim()) {
      return new Response(JSON.stringify({ error: "missing desired" }), { status: 400, headers: corsHeaders });
    }

    const candidate = slugify(desired);
    const base = candidate || "my-site";

    if (!candidate || !isValidSlugShape(candidate)) {
      return new Response(
        JSON.stringify({ available: false, reason: "invalid", suggestions: suggestionsFor(base) }),
        { status: 200, headers: corsHeaders }
      );
    }
    if (RESERVED_SLUGS.has(candidate)) {
      return new Response(
        JSON.stringify({ available: false, reason: "reserved", suggestions: suggestionsFor(base) }),
        { status: 200, headers: corsHeaders }
      );
    }

    const { data: existing, error: selectErr } = await admin
      .from("site_projects")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (selectErr) {
      return new Response(JSON.stringify({ error: selectErr.message }), { status: 500, headers: corsHeaders });
    }

    if (existing) {
      return new Response(
        JSON.stringify({ available: false, slug: candidate, reason: "taken", suggestions: suggestionsFor(base) }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ available: true, slug: candidate }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
