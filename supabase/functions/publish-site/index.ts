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

// Netlify credits are shared across every customer on the account's plan
// — see supabase/sql/site_projects_publish_limit.sql for the column this
// checks and why.
const PUBLISH_LIMIT = 5;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/* siteProjectId doubles as Netlify's `session_id` — the same value goes
   into the site at creation time and into the claim link's signed
   token, which is how Netlify matches "this claim link" to "that site"
   (see the guide: session_id is the double-verification signal). */
// Thrown by createNetlifySite/deployZipToNetlify specifically when
// Netlify's response looks like an account-level block (out of
// production-deploy credits, plan paused) rather than a one-off/transient
// failure — so the caller can tell a customer the truth ("we can't
// deliver a live URL right now, but your files are safe") instead of the
// generic "try again in a moment", which is actively misleading when
// retrying can't possibly help.
class NetlifyAccountBlockedError extends Error {}

function isAccountBlockedResponse(status: number, bodyText: string): boolean {
  if (status === 402) return true; // payment required — plan/credits exhausted
  if (status === 403 && /credit|paused|plan|quota/i.test(bodyText)) return true;
  return false;
}

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
  if (!res.ok) {
    const bodyText = await res.text();
    if (isAccountBlockedResponse(res.status, bodyText)) {
      throw new NetlifyAccountBlockedError(`Netlify site creation blocked: ${res.status} ${bodyText}`);
    }
    throw new Error(`Netlify site creation failed: ${res.status} ${bodyText}`);
  }
  return res.json();
}

async function deployZipToNetlify(netlifySiteId: string, zipBytes: Uint8Array) {
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/deploys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${NETLIFY_AUTH_TOKEN}`, "Content-Type": "application/zip" },
    body: zipBytes,
  });
  if (!res.ok) {
    const bodyText = await res.text();
    if (isAccountBlockedResponse(res.status, bodyText)) {
      throw new NetlifyAccountBlockedError(`Netlify deploy blocked: ${res.status} ${bodyText}`);
    }
    throw new Error(`Netlify deploy failed: ${res.status} ${bodyText}`);
  }
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

  // Gated by real auth, same as ats-check/delete-account: the caller's own
  // Supabase session token goes in Authorization, verified server-side via
  // admin.auth.getUser(token). The ownership check just below used to
  // compare the site row's real owner against a plain userId field the
  // CLIENT supplied in the request body — which only ever caught a
  // mismatched/wrong id, not a forged one: a caller who somehow learned
  // both a real siteProjectId and its real owner's userId (two UUIDs)
  // could have passed that check without actually being that user, and
  // published arbitrary attacker-supplied HTML to someone else's live
  // site. Deriving userId ONLY from the verified token closes that.
  // Confirmed the legitimate client (site-builder.js's publishSite) only
  // ever calls this while signed in, and supabase-js's functions.invoke()
  // attaches the current session's token automatically — pure hardening.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: authUserData, error: authUserErr } = await admin.auth.getUser(token);
  if (authUserErr || !authUserData.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = authUserData.user.id;

  try {
    const { siteProjectId, pages } = await req.json();
    if (!siteProjectId || !pages || typeof pages !== "object") {
      return jsonResponse({ error: "missing siteProjectId or pages" }, 400);
    }
    const pageNames = Object.keys(pages);
    if (!pageNames.length || !pages.index) {
      return jsonResponse({ error: "pages must include at least an index page" }, 400);
    }
    // The real client (enabledSitePages() in js/site-builder.js) only ever
    // sends a subset of these three — never client-supplied, never
    // arbitrary. Enforced here too so a caller skipping the UI entirely
    // can't hand this function attacker-chosen keys, which become literal
    // file names/paths in the deployed zip below.
    const ALLOWED_PAGE_NAMES = new Set(["index", "about", "contact"]);
    if (pageNames.some((name) => !ALLOWED_PAGE_NAMES.has(name))) {
      return jsonResponse({ error: "unexpected page name" }, 400);
    }

    // Ownership check: userId here is the verified token's own subject
    // (see above), so this confirms the row actually belongs to the real,
    // authenticated caller before touching Netlify on their behalf.
    const { data: project, error: fetchErr } = await admin
      .from("site_projects")
      .select("id, user_id, template, netlify_site_id, publish_count, slug")
      .eq("id", siteProjectId)
      .maybeSingle();
    if (fetchErr) return jsonResponse({ error: fetchErr.message }, 500);
    if (!project || project.user_id !== userId) {
      return jsonResponse({ error: "site not found for this account" }, 404);
    }

    // Real purchase check: the wizard UI only ever shows "פרסום" after a
    // real Gumroad license was redeemed for this (account, template) pair
    // (see redeem-license, which is the only thing that ever writes a
    // license_redemptions row) — but that was previously only a CLIENT-
    // SIDE gate (a localStorage flag). Nothing stopped a signed-in caller
    // from skipping the UI entirely and POSTing straight to this function
    // with a site they'd never paid for, getting a real live Netlify
    // deploy for free. This is the actual, server-side enforcement of
    // "you must have paid for this template" — the one place that
    // matters, since it's the one place that actually spends a Netlify
    // deploy credit.
    const { data: license, error: licenseErr } = await admin
      .from("license_redemptions")
      .select("license_key")
      .eq("user_id", userId)
      .eq("template", project.template)
      .limit(1)
      .maybeSingle();
    if (licenseErr) return jsonResponse({ error: licenseErr.message }, 500);
    if (!license) {
      return jsonResponse({ success: false, reason: "not_purchased" }, 402);
    }

    // Self-hosting pilot (see supabase/sql/hosted_site_pages*.sql and
    // api/site-preview.js): gated to a specific allowlist of test user
    // ids, never a global switch — turning this on must never change what
    // a REAL customer's publish click does. Only accounts listed in
    // SELF_HOSTING_TEST_USER_IDS take this path; every other caller falls
    // straight through to the unchanged Netlify flow below, exactly as
    // it's always worked. Checked BEFORE the Netlify publish-count limit
    // below on purpose — that limit exists only because a Netlify deploy
    // spends real, shared credits, which doesn't apply to this path at
    // all, so a self-hosting test account should never be blocked by it.
    const selfHostingTestUserIds = (Deno.env.get("SELF_HOSTING_TEST_USER_IDS") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (selfHostingTestUserIds.includes(userId)) {
      let slug = project.slug as string | null;
      if (!slug) {
        // No chosen name yet — the real Gmail-style picker (see
        // check-site-slug) isn't wired into the site builder during this
        // pilot. A short id-derived fallback is enough to test the actual
        // publish→store→serve pipeline itself; `.is("slug", null)` keeps
        // the claim atomic the same way a real picker's claim will.
        slug = "site-" + siteProjectId.replace(/-/g, "").slice(0, 8);
        const { error: claimErr } = await admin
          .from("site_projects")
          .update({ slug })
          .eq("id", siteProjectId)
          .is("slug", null);
        if (claimErr) return jsonResponse({ error: claimErr.message }, 500);
      }

      const { error: upsertErr } = await admin
        .from("hosted_site_pages")
        .upsert({ slug, site_project_id: siteProjectId, pages, updated_at: new Date().toISOString() });
      if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500);

      // Stand-in URL until real <slug>.deskkit.co.il subdomain routing is
      // wired up (needs wildcard DNS + adding the domain in Vercel — both
      // still pending, separate pieces of this migration).
      const selfHostedUrl = "https://deskkit.co.il/api/site-preview?slug=" + encodeURIComponent(slug);
      const { error: publishUpdateErr } = await admin
        .from("site_projects")
        .update({ published_url: selfHostedUrl, published_at: new Date().toISOString() })
        .eq("id", siteProjectId);
      if (publishUpdateErr) return jsonResponse({ error: publishUpdateErr.message }, 500);

      // No publish_count/limit here on purpose: that cap exists only
      // because a Netlify deploy spends real, shared credits. A database
      // upsert doesn't — no limit needed is the whole point of this
      // migration, not an oversight.
      return jsonResponse({ success: true, url: selfHostedUrl, selfHosted: true });
    }

    // Each publish is a real Netlify deploy — real Netlify credits, shared
    // across every customer on the account's plan. Capped per-site so one
    // customer re-clicking "פרסום" repeatedly (by accident or otherwise)
    // can't burn through the whole month's credits for everyone else. The
    // ZIP download (client-side, never hits this function) stays free and
    // unlimited either way.
    const publishCount = (project.publish_count as number) || 0;
    if (publishCount >= PUBLISH_LIMIT) {
      return jsonResponse({ success: false, reason: "limit_reached", publishCount, limit: PUBLISH_LIMIT });
    }

    const zip = new JSZip();
    for (const name of pageNames) {
      zip.file(`${name}.html`, String(pages[name]));
    }
    // Confirmed live: without this, Netlify's zip-upload deploy served
    // every page as "Content-Type: text/plain" instead of "text/html" —
    // the browser showed the raw source code instead of the rendered
    // site. Netlify's own "_headers" file forces the right content type
    // explicitly rather than relying on its extension-based inference.
    zip.file("_headers", "/*\n  Content-Type: text/html; charset=UTF-8\n");
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

    const newPublishCount = publishCount + 1;
    const { error: updateErr } = await admin
      .from("site_projects")
      .update({
        published_url: siteUrl,
        netlify_site_id: netlifySiteId,
        published_at: new Date().toISOString(),
        publish_count: newPublishCount,
      })
      .eq("id", siteProjectId);
    if (updateErr) return jsonResponse({ error: updateErr.message }, 500);

    return jsonResponse({
      success: true,
      url: siteUrl,
      claimUrl: buildClaimLink(siteProjectId),
      publishCount: newPublishCount,
      limit: PUBLISH_LIMIT,
    });
  } catch (err) {
    if (err instanceof NetlifyAccountBlockedError) {
      // 200, not 500: this is a known, handled condition (Netlify's
      // account-level credit limit), not an unexpected server error — the
      // client checks data.reason the same way it already does for
      // "limit_reached", and shows the customer their files are safe
      // rather than a scary generic failure.
      return jsonResponse({ success: false, reason: "host_unavailable" });
    }
    return jsonResponse({ error: String(err) }, 500);
  }
});
