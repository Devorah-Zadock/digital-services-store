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
// object per slug rather than one row per page. ?page= picks which one;
// defaults to index, same as a real site's homepage. Still reached by
// ?slug= only for now — the real <slug>.deskkit.co.il subdomain routing
// is a separate, later piece of this migration (needs wildcard DNS +
// adding the domain in Vercel, both still pending).

const SLUG_PATTERN = /^[a-z0-9-]{1,63}$/;
const ALLOWED_PAGE_NAMES = new Set(["index", "about", "contact"]);

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "").trim();
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).send("invalid slug");
    return;
  }
  const page = String(req.query.page || "index").trim();
  if (!ALLOWED_PAGE_NAMES.has(page)) {
    res.status(400).send("invalid page");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).send("server not configured");
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
