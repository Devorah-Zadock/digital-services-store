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
// Deploy: `supabase functions deploy redeem-license` (or paste into
// Supabase Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: corsHeaders });
  }

  try {
    const { licenseKey, productId, userId, template } = await req.json();
    if (!licenseKey || !productId || !userId || !template) {
      return new Response(JSON.stringify({ error: "missing licenseKey, productId, userId or template" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const gumroadRes = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_id: productId, license_key: licenseKey }),
    });
    const gumroadData = await gumroadRes.json();
    if (!gumroadData.success) {
      return new Response(JSON.stringify({ success: false, reason: "invalid" }), { status: 200, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: existing, error: selectErr } = await admin
      .from("license_redemptions")
      .select("user_id, template")
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
      if (existing.template !== template) {
        return new Response(JSON.stringify({ success: false, reason: "different-template" }), {
          status: 200,
          headers: corsHeaders,
        });
      }
      // Same account, same template — a harmless re-verify.
      return new Response(JSON.stringify({ success: true, purchase: gumroadData.purchase || null }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Insert is the atomic claim: license_key is the table's primary key, so
    // a second request racing in for the same key (e.g. a double-click, or
    // a genuine second account) fails here with a unique-violation instead
    // of both requests reading "no existing row" and both succeeding.
    const { error: insertErr } = await admin
      .from("license_redemptions")
      .insert({ license_key: licenseKey, product_id: productId, user_id: userId, template });
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
