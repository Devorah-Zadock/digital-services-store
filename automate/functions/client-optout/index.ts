// DeskKit Automate — a business's client stops automated emails from that
// business (the link in every client email). Public by design: the signed
// token in the link is the only key, and it names one business + one
// address, so it can't be used for anyone else.
//
//   POST {t, action: "get"}      → {business, email (masked), optedOut}
//   POST {t, action: "optout"}   → records it (idempotent)
//   POST ?t=… (form body)        → mail apps' one-click unsubscribe (RFC 8058)
//
// Opening the link does nothing by itself (email scanners open links) —
// the client presses a button on optout.html, or the mail app's own button.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { readOptoutToken } from "../_shared/automate/optout.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function mask(email: string): string {
  const [u, d] = email.split("@");
  return (u.length <= 2 ? u[0] + "*" : u.slice(0, 2) + "***") + "@" + (d || "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const qT = new URL(req.url).searchParams.get("t");
  const isJson = (req.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await req.json().catch(() => ({})) : {};
  const oneClick = !isJson && !!qT;
  const tok = await readOptoutToken(String(oneClick ? qT : body.t || ""));
  if (!tok) return json({ error: "bad-link" }, 400);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const action = oneClick ? "optout" : String(body.action || "get");
  if (action === "optout") {
    const { error } = await db.from("automate_optouts")
      .upsert({ user_id: tok.userId, email: tok.email }, { onConflict: "user_id,email", ignoreDuplicates: true });
    if (error) return json({ error: "server" }, 500);
    // Anything already waiting for this address is not sent.
    await db.from("automation_messages").update({ status: "cancelled", error: "opted-out" })
      .eq("user_id", tok.userId).eq("recipient_role", "client").ilike("to_email", tok.email.replace(/[\\%_]/g, (m) => "\\" + m))
      .in("status", ["pending_approval", "queued", "deferred"]);
    if (oneClick) return json({ ok: true });
  } else if (action !== "get") {
    return json({ error: "bad-action" }, 400);
  }

  const [{ data: prof }, { count }] = await Promise.all([
    db.from("business_profiles").select("business_name").eq("user_id", tok.userId).maybeSingle(),
    db.from("automate_optouts").select("email", { count: "exact", head: true }).eq("user_id", tok.userId).eq("email", tok.email),
  ]);
  return json({ business: prof?.business_name || "", email: mask(tok.email), optedOut: (count || 0) > 0 });
});
