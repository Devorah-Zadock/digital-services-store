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

const SLUG_PATTERN = /^[a-z0-9-]{1,63}$/;

module.exports = async function handler(req, res) {
  const slug = String(req.query.slug || "").trim();
  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).send("invalid slug");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).send("server not configured");
    return;
  }

  const restUrl =
    supabaseUrl + "/rest/v1/hosted_site_pages?slug=eq." + encodeURIComponent(slug) + "&select=html";
  const supabaseRes = await fetch(restUrl, {
    headers: { apikey: serviceRoleKey, Authorization: "Bearer " + serviceRoleKey },
  });
  if (!supabaseRes.ok) {
    res.status(502).send("lookup failed");
    return;
  }
  const rows = await supabaseRes.json();
  if (!rows.length) {
    res.status(404).send("not found");
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=UTF-8");
  res.status(200).send(rows[0].html);
};
