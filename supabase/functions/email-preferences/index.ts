// Subscribe / unsubscribe from DeskKit's update emails.
//
// Three callers:
//   * a mail app's one-click unsubscribe (RFC 8058): POST to
//     ?u=<account id>&t=<token> — the List-Unsubscribe header in every
//     update email;
//   * unsubscribe.html (the link in the email's footer): JSON {u, t, action}
//     with action "status" | "unsubscribe" | "subscribe";
//   * "החשבון שלי" (signed in): JSON {action: "status" | "set", subscribed}.
// The token is an HMAC of the account id (supabase/functions/_shared/
// mail.ts), so a link can only ever change its own account's setting.
// Service notices about the account itself are not affected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unsubTokenValid } from "../_shared/mail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

type Admin = ReturnType<typeof createClient>;

async function setSubscribed(admin: Admin, userId: string, subscribed: boolean) {
  const { error } = await admin.from("customer_profiles")
    .update({ email_unsubscribed_at: subscribed ? null : new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

async function isSubscribed(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin.from("customer_profiles").select("email_unsubscribed_at").eq("id", userId).maybeSingle();
  return !data || !data.email_unsubscribed_at;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // One-click unsubscribe from the mail app itself.
    const url = new URL(req.url);
    const qu = url.searchParams.get("u");
    const qt = url.searchParams.get("t");
    if (qu && qt) {
      if (!(await unsubTokenValid(qu, qt))) return json({ error: "bad-link" }, 400);
      await setSubscribed(admin, qu, false);
      return json({ subscribed: false });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    if (body.u !== undefined) {
      if (!(await unsubTokenValid(body.u, body.t))) return json({ error: "bad-link" }, 400);
      if (action === "unsubscribe") await setSubscribed(admin, body.u, false);
      else if (action === "subscribe") await setSubscribed(admin, body.u, true);
      else if (action !== "status") return json({ error: "unknown action" }, 400);
      return json({ subscribed: await isSubscribed(admin, body.u) });
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: null };
    const user = userData && userData.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    if (action === "set") await setSubscribed(admin, user.id, body.subscribed === true);
    else if (action !== "status") return json({ error: "unknown action" }, 400);
    return json({ subscribed: await isSubscribed(admin, user.id) });
  } catch (_e) {
    return json({ error: "server error" }, 500);
  }
});
