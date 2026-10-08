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

const RECENT_SIGN_IN_MS = 15 * 60 * 1000;
const VERCEL_API_TOKEN = Deno.env.get("VERCEL_API_TOKEN");
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID");
const VERCEL_TEAM_ID = Deno.env.get("VERCEL_TEAM_ID");

// Every file path under prefix/, following sub-folders (storage list()
// returns a folder as an entry with no id) and paging past 1000.
async function listAllFiles(admin: ReturnType<typeof createClient>, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  const out: string[] = [];
  if (depth > 4) return out;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error || !data || !data.length) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id) out.push(path);
      else out.push(...await listAllFiles(admin, bucket, path, depth + 1));
    }
    if (data.length < 1000) break;
  }
  return out;
}

async function removeVercelDomain(domain: string) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID || !domain) return;
  try {
    const url =
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${encodeURIComponent(domain)}` +
      (VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(VERCEL_TEAM_ID)}` : "");
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` } });
    if (!res.ok && res.status !== 404) console.error("delete-account: Vercel remove-domain failed", domain, res.status);
  } catch (e) {
    console.error("delete-account: Vercel remove-domain failed", domain, String(e));
  }
}

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

  // Deleting everything is irreversible, so it needs a FRESH sign-in, not
  // just any still-valid session (a session left open on a shared
  // computer, or a stolen token, must not be enough). The account page
  // re-asks for the password right before calling this.
  const lastSignIn = Date.parse(userData.user.last_sign_in_at || "");
  if (!lastSignIn || Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
    return jsonResponse({ error: "please sign in again", reason: "reauth" }, 403);
  }

  try {
    // Custom domains are attached to DeskKit's Vercel project — detach
    // them first, so a deleted customer's domain can't be left pointing
    // at us for someone else to claim.
    const { data: domainRows } = await admin.from("site_projects").select("custom_domain").eq("user_id", userId).not("custom_domain", "is", null);
    for (const row of domainRows || []) await removeVercelDomain(String(row.custom_domain));

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

    // Uploads live at <bucket>/<user id>/... (site images one folder
    // deeper, per template) — not tables, so not covered by the loop above.
    for (const bucket of ["logos", "site-images"]) {
      const paths = await listAllFiles(admin, bucket, userId);
      for (let i = 0; i < paths.length; i += 100) {
        await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return jsonResponse({ error: delErr.message }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
