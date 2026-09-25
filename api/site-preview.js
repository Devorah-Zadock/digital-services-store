// Phase 1 of moving site-hosting off Netlify (see supabase/sql/
// hosted_site_pages.sql for the full picture): this is the very first
// piece of server-side code that has ever run on DeskKit's own Vercel
// deployment — until now the whole site was static files with all
// dynamic logic living in Supabase Edge Functions. This one function
// proves the core idea end to end (Vercel can read a saved page out of
// Supabase and serve it directly) on an internal, not-yet-public route
// before any of the real "פרסום" flow, subdomain DNS, or slug-picking UI
// gets built on top of it.
//
// Needs two env vars set in Vercel (Project Settings → Environment
// Variables) — the SAME Supabase project as everything else, but this is
// a separate secret store from Supabase's own, so it has to be added
// here too:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Service-role key is safe here specifically because this code only
// ever runs server-side inside the Vercel function — it never reaches a
// browser. Read-only on purpose: this function never writes to Supabase.
//
// Updated for hosted_site_pages_multipage.sql: a site has up to 3 real
// pages (index/about/contact — same set publish-site enforces via
// ALLOWED_PAGE_NAMES), stored as one {index, about, contact} jsonb
// object per slug rather than one row per page.
//
// Now reachable three ways (see middleware.js):
//   - a real visit to <slug>.sites.deskkit.co.il/(about|contact)? —
//     rewritten here with ?slug=<slug>&path=/<whatever came after the
//     subdomain>.
//   - a real visit to a customer's own connected domain (see
//     connect-custom-domain) — rewritten here with
//     ?customDomain=<their-domain>&path=..., resolved to a slug via
//     site_projects.custom_domain below.
//   - the old ?slug=&page= form, kept for manual testing without needing
//     a real subdomain request (what Phase 1/2 testing used).
// `path` wins over `page` when both are present — a real subdomain/
// custom-domain visit is always the real thing, `?page=` is a testing
// convenience only.

const SLUG_PATTERN = /^[a-z0-9-]{1,63}$/;
const DOMAIN_PATTERN = /^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/i;
const ALLOWED_PAGE_NAMES = new Set(["index", "about", "contact"]);

function resolvePageName(req) {
  if (typeof req.query.path === "string") {
    const clean = req.query.path.replace(/^\/+|\/+$/g, "");
    if (clean === "") return "index";
    return ALLOWED_PAGE_NAMES.has(clean) ? clean : null;
  }
  const page = String(req.query.page || "index").trim();
  return ALLOWED_PAGE_NAMES.has(page) ? page : null;
}

// Resolves whichever identifier the request arrived with to a real
// hosted_site_pages slug. A customer domain never IS the slug — it's
// looked up on site_projects, which is the only table connect-custom-
// domain ever writes custom_domain to.
async function resolveSlug(req, supabaseUrl, serviceRoleKey) {
  const slug = String(req.query.slug || "").trim();
  if (slug) {
    return SLUG_PATTERN.test(slug) ? slug : null;
  }
  const customDomain = String(req.query.customDomain || "").trim().toLowerCase();
  if (!customDomain || !DOMAIN_PATTERN.test(customDomain)) return null;

  const lookupUrl =
    supabaseUrl + "/rest/v1/site_projects?custom_domain=eq." + encodeURIComponent(customDomain) + "&select=slug";
  const lookupRes = await fetch(lookupUrl, {
    headers: { apikey: serviceRoleKey, Authorization: "Bearer " + serviceRoleKey },
  });
  if (!lookupRes.ok) return null;
  const rows = await lookupRes.json();
  const resolved = rows[0] && rows[0].slug;
  return resolved && SLUG_PATTERN.test(resolved) ? resolved : null;
}

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).send("server not configured");
    return;
  }

  const slug = await resolveSlug(req, supabaseUrl, serviceRoleKey);
  if (!slug) {
    res.status(404).send("not found");
    return;
  }
  const page = resolvePageName(req);
  if (!page) {
    res.status(404).send("not found");
    return;
  }

  const restUrl =
    supabaseUrl + "/rest/v1/hosted_site_pages?slug=eq." + encodeURIComponent(slug) + "&select=pages";
  const supabaseRes = await fetch(restUrl, {
    headers: { apikey: serviceRoleKey, Authorization: "Bearer " + serviceRoleKey },
  });
  if (!supabaseRes.ok) {
    res.status(502).send("lookup failed");
    return;
  }
  const rows = await supabaseRes.json();
  const html = rows[0] && rows[0].pages && rows[0].pages[page];
  if (!html) {
    res.status(404).send("not found");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.status(200).send(html);
};
