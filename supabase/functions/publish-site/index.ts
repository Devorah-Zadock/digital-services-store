// Deploys a customer's built site to a live URL, so "publish" means
// exactly that instead of "download a ZIP and go figure out hosting
// yourself" (see README's competitive-landscape section for why that
// gap mattered). Mirrors redeem-license's shape: caller sends the site's
// user id + template + rendered page HTML, this function checks
// ownership, builds a zip, and hands it to Netlify's deploy API.
//
// STATUS: the ownership check, DB bookkeeping and zip-building below are
// real and tested. The actual Netlify call (deployToNetlify) is a
// placeholder that throws — Netlify's exact current API shape (the
// zip-upload endpoint's field names, and how the one-click "claim this
// site into your own account" link is obtained) needs to be verified
// against Netlify's live docs before this can go further, which isn't
// reachable from the environment that wrote this function. Fill in
// deployToNetlify() once that's confirmed; nothing else here should need
// to change.
//
// Deploy: `supabase functions deploy publish-site` (or paste into
// Supabase Dashboard → Edge Functions → New Function). Needs a
// NETLIFY_AUTH_TOKEN secret set first: `supabase secrets set
// NETLIFY_AUTH_TOKEN=...` (or Dashboard → Edge Functions → Secrets).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NETLIFY_AUTH_TOKEN = Deno.env.get("NETLIFY_AUTH_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/* Placeholder — see the STATUS note above. Takes the finished zip and
   the previous Netlify site id (if this project was published before,
   so the same site gets updated instead of a new one being created),
   and must return the live URL plus the Netlify site id to remember
   for next time. */
async function deployToNetlify(_zipBytes: Uint8Array, _existingSiteId: string | null): Promise<{ url: string; siteId: string }> {
  throw new Error(
    "deployToNetlify is not implemented yet — Netlify's exact API shape needs to be confirmed against their live docs first."
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  if (!NETLIFY_AUTH_TOKEN) {
    return jsonResponse({ error: "NETLIFY_AUTH_TOKEN secret is not configured" }, 500);
  }

  try {
    const { siteProjectId, userId, pages } = await req.json();
    if (!siteProjectId || !userId || !pages || typeof pages !== "object") {
      return jsonResponse({ error: "missing siteProjectId, userId or pages" }, 400);
    }
    const pageNames = Object.keys(pages);
    if (!pageNames.length || !pages.index) {
      return jsonResponse({ error: "pages must include at least an index page" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Ownership check happens here, server-side, with the service-role
    // client — never trust a client-supplied userId on its own; confirm
    // the row is actually theirs before touching Netlify on their behalf.
    const { data: project, error: fetchErr } = await admin
      .from("site_projects")
      .select("id, user_id, netlify_site_id")
      .eq("id", siteProjectId)
      .maybeSingle();
    if (fetchErr) return jsonResponse({ error: fetchErr.message }, 500);
    if (!project || project.user_id !== userId) {
      return jsonResponse({ error: "site not found for this account" }, 404);
    }

    const zip = new JSZip();
    for (const name of pageNames) {
      zip.file(`${name}.html`, String(pages[name]));
    }
    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    const { url, siteId } = await deployToNetlify(zipBytes, project.netlify_site_id || null);

    const { error: updateErr } = await admin
      .from("site_projects")
      .update({ published_url: url, netlify_site_id: siteId, published_at: new Date().toISOString() })
      .eq("id", siteProjectId);
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

    return jsonResponse({ success: true, url });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
