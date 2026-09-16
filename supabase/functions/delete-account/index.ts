// Lets a signed-in customer delete their own account and everything tied
// to it, without needing a manual request to us — deleting a Supabase Auth
// user (and clearing their rows across every table) requires the
// service-role key, which can never be exposed client-side, so this has to
// go through an Edge Function no matter how simple the operation feels.
//
// Unlike publish-site/redeem-license (which take a client-supplied userId
// and check it against a row's own user_id), account deletion is
// destructive and irreversible enough that a client-supplied id is not
// good enough here — the caller's identity is derived ONLY from their own
// verified access token, via admin.auth.getUser(token). There is no
// "userId" field this function will ever read from the request body.
//
// Deploy: `supabase functions deploy delete-account` (or paste into
// Supabase Dashboard → Edge Functions → New Function).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

// Every table that ever gets a row keyed by a signed-in user's id. Kept as
// one list so adding a new per-user table later means adding one entry
// here, not hunting through the function for every delete call.
const USER_TABLES = ["site_projects", "schedule_projects", "cv_saves", "quote_saves", "license_redemptions", "usage_events", "profiles"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "missing auth token" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // The ONLY source of truth for "who is asking" — a signature-verified
  // token, never anything the request body could claim.
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return jsonResponse({ error: "invalid or expired session" }, 401);
  const userId = userData.user.id;

  try {
    for (const table of USER_TABLES) {
      const column = table === "profiles" ? "id" : "user_id";
      const { error } = await admin.from(table).delete().eq(column, userId);
      // A single table's delete failing shouldn't abandon the rest — the
      // account deletion itself (below) is what actually matters, and a
      // stray leftover row in one table is a far smaller problem than a
      // customer who asked to be deleted and got neither this nor an
      // account deletion.
      if (error) console.error(`delete-account: failed to clear ${table}`, error.message);
    }

    // Logo uploads live at logos/<user id>/... — not a table, so not
    // covered by the loop above.
    const { data: files } = await admin.storage.from("logos").list(userId);
    if (files && files.length) {
      await admin.storage.from("logos").remove(files.map((f) => `${userId}/${f.name}`));
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
