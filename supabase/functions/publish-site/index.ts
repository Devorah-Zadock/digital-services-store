// Deploys a customer's built site to a live URL, so "publish" means
// exactly that instead of "download a ZIP and go figure out hosting
// yourself" (see README's competitive-landscape section for why that
// gap mattered). Mirrors redeem-license's shape: caller sends the site's
// user id + template + rendered page HTML, this function checks
// ownership, builds a zip, and hands it to Netlify's API.
//
// Sites are created under DeskKit's own Netlify team (via
// NETLIFY_AUTH_TOKEN, a personal access token), never under the
// customer's — that's on purpose. A signed "claim" link is returned
// alongside the live URL so the customer can transfer the site into
// their OWN free Netlify account with one click; until they do, it's
// still live and DeskKit can keep pushing updates to it. This is what
// keeps DeskKit from taking on permanent hosting liability for every
// site anyone ever builds (see README's "מול מה מתחרים" section — the
// whole point is not becoming another subscription-locked host). See
// https://developers.netlify.com/guides/deploying-sites-from-ai-tools
// for the flow this follows.
//
// Deploy: `supabase functions deploy publish-site` (or paste into
// Supabase Dashboard → Edge Functions → New Function). Needs these
// secrets set first (Dashboard → Edge Functions → Secrets, or
// `supabase secrets set NAME=value`):
//   NETLIFY_AUTH_TOKEN         — personal access token (Netlify → User
//                                settings → Applications → Personal
//                                access tokens → No expiration)
//   NETLIFY_TEAM_SLUG          — your Netlify team's slug (Netlify →
//                                Team settings → General → Team slug)
//   NETLIFY_OAUTH_CLIENT_ID    — from Netlify → User settings →
//   NETLIFY_OAUTH_CLIENT_SECRET  Applications → OAuth applications →
//                                Create new (no redirect URI needed for
//                                this flow)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3";
import jwt from "https://esm.sh/jsonwebtoken@9";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NETLIFY_AUTH_TOKEN = Deno.env.get("NETLIFY_AUTH_TOKEN");
const NETLIFY_TEAM_SLUG = Deno.env.get("NETLIFY_TEAM_SLUG");
const NETLIFY_OAUTH_CLIENT_ID = Deno.env.get("NETLIFY_OAUTH_CLIENT_ID");
const NETLIFY_OAUTH_CLIENT_SECRET = Deno.env.get("NETLIFY_OAUTH_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/* siteProjectId doubles as Netlify's `session_id` — the same value goes
   into the site at creation time and into the claim link's signed
   token, which is how Netlify matches "this claim link" to "that site"
   (see the guide: session_id is the double-verification signal). */
async function createNetlifySite(siteProjectId: string) {
  const res = await fetch("https://api.netlify.com/api/v1/sites", {
    method: "POST",
    headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      created_via: "deskkit",
      account_slug: NETLIFY_TEAM_SLUG,
      name: `deskkit-${siteProjectId}`.slice(0, 63),
      session_id: siteProjectId,
    }),
  });
  if (!res.ok) throw new Error(`Netlify site creation failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function deployZipToNetlify(netlifySiteId: string, zipBytes: Uint8Array) {
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`, "Content-Type": "application/zip" },
    body: zipBytes,
  });
  if (!res.ok) throw new Error(`Netlify deploy failed: ${res.status} ${await res.text()}`);
  return res.json();
}

function buildClaimLink(siteProjectId: string) {
  const token = jwt.sign(
    { client_id: NETLIFY_OAUTH_CLIENT_ID, session_id: siteProjectId },
    NETLIFY_OAUTH_CLIENT_SECRET
  );
  return `https://app.netlify.com/claim?utm_source=deskkit#${token}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  if (!NETLIFY_AUTH_TOKEN || !NETLIFY_TEAM_SLUG || !NETLIFY_OAUTH_CLIENT_ID || !NETLIFY_OAUTH_CLIENT_SECRET) {
    return jsonResponse({ error: "Netlify secrets are not fully configured" }, 500);
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

    let netlifySiteId = project.netlify_site_id as string | null;
    let siteUrl: string;
    if (netlifySiteId) {
      // Already published before — redeploy the same site so the URL
      // (and any custom domain the customer attached after claiming it)
      // stays the same instead of a new site being created every time.
      const deploy = await deployZipToNetlify(netlifySiteId, zipBytes);
      siteUrl = deploy.ssl_url || deploy.url || `https://${netlifySiteId}.netlify.app`;
    } else {
      const site = await createNetlifySite(siteProjectId);
      netlifySiteId = site.id;
      siteUrl = site.ssl_url || site.url;
      await deployZipToNetlify(netlifySiteId!, zipBytes);
    }

    const { error: updateErr } = await admin
      .from("site_projects")
      .update({ published_url: siteUrl, netlify_site_id: netlifySiteId, published_at: new Date().toISOString() })
      .eq("id", siteProjectId);
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

    return jsonResponse({ success: true, url: siteUrl, claimUrl: buildClaimLink(siteProjectId) });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
