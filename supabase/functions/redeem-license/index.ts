// Closes a real gap in the old client-only license check: verifying a key
// against Gumroad's API only proves the key is *valid* — Gumroad's own
// verify endpoint is meant to be called repeatedly and never consumes the
// key, so nothing stopped the same purchased key from being typed into a
// second, unrelated account and unlocking a second site for free.
//
// This function is the single source of truth for "has this key already
// been spent." It re-verifies with Gumroad itself (never trusts the
// caller's claim that a key is valid), then atomically claims the key in
// license_redemptions — a table with no public RLS policies, reachable
// only from here via the service-role key Supabase injects into every
// Edge Function automatically (no secret to configure). A key already
// claimed by this same account for this same template is a harmless
// re-verify (e.g. re-opening the page); claimed by anyone/anything else
// is refused.
//
// Gated by real auth, same as ats-check/ai-rewrite: the caller's own
// Supabase session token goes in Authorization, verified server-side via
// admin.auth.getUser(token) — the redeeming account is taken ONLY from
// that verified token, never from a client-supplied userId in the
// request body. Before this, a caller with no session at all could POST
// straight to this public endpoint with someone else's real (already-
// purchased) license key plus an arbitrary userId and "claim" it first —
// not an account takeover, but it would make the real purchaser's own
// later redemption fail as "already redeemed elsewhere". Confirmed the
// legitimate client (site-builder.js's verifySiteLicense) already only
// ever calls this while signed in, and supabase-js's functions.invoke()
// attaches the current session's token automatically — so this is a
// pure hardening, nothing for a real customer to notice.
//
// Deploy: `supabase functions deploy redeem-license` (or paste into
// Supabase Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Confirmed live: every Response below was built with only these headers,
// with no Content-Type — Deno defaults a string body to "text/plain",
// and supabase-js's functions.invoke() decides how to parse the response
// purely from Content-Type. Without "application/json" here, invoke()
// returned the body as a raw STRING instead of a parsed object, so
// `data.success` was always undefined (falsy) on the client — every
// verification, success or failure alike, was read as a failure.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Our two Gumroad products. The site product is one price for any site
// template (the key gets bound to the template it's first redeemed for);
// the schedule product only ever unlocks the schedule builder.
const SITE_PRODUCT_ID = "NUyzNlvxdpU_49TE5nk9fg==";
const SCHEDULE_PRODUCT_ID = "K122yL6VSdTui67Be5ZiYw==";
const SCHEDULE_TEMPLATE = "schedule-builder";
function productAllowsTemplate(productId: string, template: string): boolean {
  if (!/^[a-z0-9-]{1,60}$/.test(template)) return false;
  if (productId === SCHEDULE_PRODUCT_ID) return template === SCHEDULE_TEMPLATE;
  if (productId === SITE_PRODUCT_ID) return template !== SCHEDULE_TEMPLATE;
  return false;
}

// The few Gumroad-verified purchase fields send-receipt needs, kept
// server-side so the receipt never relies on what the browser claims.
function receiptFields(p: Record<string, unknown>) {
  return {
    email: typeof p.email === "string" ? p.email : null,
    full_name: typeof p.full_name === "string" ? p.full_name : null,
    price: typeof p.price === "number" ? p.price : null,
    currency: typeof p.currency === "string" ? p.currency : null,
    test: !!p.test,
  };
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
    const body = await req.json();
    const licenseKey = typeof body.licenseKey === "string" ? body.licenseKey.trim().slice(0, 200) : "";
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const template = typeof body.template === "string" ? body.template.trim() : "";
    // Website licenses belong to ONE site (see supabase/sql/
    // license_per_site.sql); the schedule builder has no site.
    const siteProjectId = typeof body.siteProjectId === "string" ? body.siteProjectId.trim() : "";
    if (!licenseKey || !productId || !template) {
      return new Response(JSON.stringify({ error: "missing licenseKey, productId or template" }), {
        status: 400,
        headers: corsHeaders,
      });
    }
    // Which templates each of OUR Gumroad products may unlock. Without
    // this, any valid key — for the cheaper product, or even for some
    // other seller's product — could be redeemed as any site template.
    if (!productAllowsTemplate(productId, template)) {
      return new Response(JSON.stringify({ success: false, reason: "invalid" }), { status: 200, headers: corsHeaders });
    }

    const isSiteProduct = productId === SITE_PRODUCT_ID;
    if (isSiteProduct) {
      if (!/^[0-9a-f-]{36}$/i.test(siteProjectId)) {
        return new Response(JSON.stringify({ success: false, reason: "save-first" }), { status: 200, headers: corsHeaders });
      }
      const { data: site } = await admin.from("site_projects").select("id, user_id").eq("id", siteProjectId).maybeSingle();
      if (!site || site.user_id !== userId) {
        return new Response(JSON.stringify({ error: "site not found for this account" }), { status: 404, headers: corsHeaders });
      }
    }

    // Confirmed twice in real testing: a license verified within the
    // first moment or two after a genuine purchase can come back invalid,
    // then succeed on an immediate retry with the exact same key —
    // Gumroad's own systems evidently need a beat to catch up right after
    // a charge completes. Rather than making every customer manually
    // retry, try up to 3 times with a short pause before giving up.
    let gumroadData: Record<string, unknown> = {};
    for (let attempt = 1; attempt <= 3; attempt++) {
      const gumroadRes = await fetch("https://api.gumroad.com/v2/licenses/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ product_id: productId, license_key: licenseKey }),
      });
      // Read as text first, not .json() directly: an unexpected non-JSON
      // reply (an HTML error page, an empty body) would otherwise throw
      // and get swallowed by the outer catch as a generic 500.
      const gumroadText = await gumroadRes.text();
      try {
        gumroadData = JSON.parse(gumroadText);
      } catch (_e) {
        gumroadData = {};
      }
      if (gumroadData.success) break;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
    }
    // A refunded / charged-back / disputed purchase no longer unlocks
    // anything, even though Gumroad still reports the key as existing.
    const purchaseInfo = (gumroadData.purchase || {}) as Record<string, unknown>;
    if (gumroadData.success && (purchaseInfo.refunded || purchaseInfo.chargebacked || purchaseInfo.disputed)) {
      return new Response(JSON.stringify({ success: false, reason: "refunded" }), { status: 200, headers: corsHeaders });
    }
    if (!gumroadData.success) {
      // Gumroad's own message ("That license does not exist for the
      // provided product." / "Invalid product." / etc.) is exactly what
      // tells apart a wrong product_id from a wrong/reused key — worth
      // surfacing instead of collapsing everything into one bare "invalid".
      return new Response(
        JSON.stringify({
          success: false,
          reason: "invalid",
          gumroadMessage: (gumroadData.message as string) || null,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    const { data: existing, error: selectErr } = await admin
      .from("license_redemptions")
      .select("user_id, template, site_project_id")
      .eq("license_key", licenseKey)
      .maybeSingle();
    if (selectErr) {
      return new Response(JSON.stringify({ error: selectErr.message }), { status: 500, headers: corsHeaders });
    }

    if (existing) {
      if (existing.user_id !== userId) {
        return new Response(JSON.stringify({ success: false, reason: "redeemed-elsewhere" }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      if (isSiteProduct) {
        if (existing.site_project_id && existing.site_project_id !== siteProjectId) {
          // This key already removed the badge from another site of theirs.
          return new Response(JSON.stringify({ success: false, reason: "different-site" }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        if (!existing.site_project_id) {
          // A purchase from before per-site licenses that never got bound
          // to a site: bind it to this one now (unless this site already
          // has its own license).
          const { error: bindErr } = await admin
            .from("license_redemptions")
            .update({ site_project_id: siteProjectId, template })
            .eq("license_key", licenseKey)
            .is("site_project_id", null);
          if (bindErr && bindErr.code !== "23505") {
            return new Response(JSON.stringify({ error: bindErr.message }), { status: 500, headers: corsHeaders });
          }
        }
      } else if (existing.template !== template) {
        return new Response(JSON.stringify({ success: false, reason: "different-template" }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      // Same account, same site/template — a harmless re-verify.
      return new Response(JSON.stringify({ success: true, purchase: gumroadData.purchase || null }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (isSiteProduct) {
      // This site is already paid for (another key) — don't use up a second
      // purchase on it; tell the buyer instead.
      const { data: sitePaid } = await admin
        .from("license_redemptions")
        .select("license_key")
        .eq("site_project_id", siteProjectId)
        .maybeSingle();
      if (sitePaid) {
        return new Response(JSON.stringify({ success: true, alreadyPaid: true }), { status: 200, headers: corsHeaders });
      }
    }

    // Insert is the atomic claim: license_key is the table's primary key, so
    // a second request racing in for the same key (e.g. a double-click, or
    // a genuine second account) fails here with a unique-violation instead
    // of both requests reading "no existing row" and both succeeding.
    const { error: insertErr } = await admin
      .from("license_redemptions")
      .insert({
        license_key: licenseKey, product_id: productId, user_id: userId, template,
        site_project_id: isSiteProduct ? siteProjectId : null,
        purchase: receiptFields(purchaseInfo),
      });
    if (insertErr) {
      if (insertErr.code === "23505") {
        return new Response(JSON.stringify({ success: false, reason: "redeemed-elsewhere" }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, purchase: gumroadData.purchase || null }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
