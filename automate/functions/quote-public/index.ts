// DeskKit Automate — the client's side of a quote sent through DeskKit
// (q.html?t=<token>). Public by design: the 48-character random token in
// the link is the only key. The client can view the quote and approve or
// decline it once; nothing else about the business is exposed.
// We never claim the client "viewed" a quote — email scanners open links too.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN_RE = /^[0-9a-f]{48}$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const token = str(body.token, 64);
  if (!TOKEN_RE.test(token)) return json({ error: "not-found" }, 404);
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: q } = await db.from("quote_shares").select("id, user_id, client_name, title, total, snapshot, status, sent_at, decided_at, expires_at").eq("token", token).maybeSingle();
  if (!q) return json({ error: "not-found" }, 404);

  let status = q.status;
  if (status === "sent" && q.expires_at && Date.parse(q.expires_at) < Date.now()) {
    await db.from("quote_shares").update({ status: "expired" }).eq("id", q.id).eq("status", "sent");
    status = "expired";
  }

  const action = String(body.action || "get");
  if (action === "approve" || action === "decline") {
    if (status !== "sent") return json({ error: "closed", status }, 409);
    const name = str(body.name, 200);
    if (action === "approve" && !name) return json({ error: "name" }, 400);
    const rows = await db.from("quote_shares").update({
      status: action === "approve" ? "approved" : "declined", decided_at: new Date().toISOString(),
      decided_name: name || null, decision_note: str(body.note, 2000) || null,
    }).eq("id", q.id).eq("status", "sent").select("status");
    if (rows.error || !rows.data?.length) return json({ error: "closed" }, 409);
    status = rows.data[0].status;
  }

  const { data: prof } = await db.from("business_profiles").select("business_name, phone").eq("user_id", q.user_id).maybeSingle();
  return json({
    status, client_name: q.client_name, title: q.title, total: q.total, quote: q.snapshot,
    business: prof?.business_name || q.snapshot?.businessName || "", sent_at: q.sent_at, expires_at: q.expires_at,
  });
});
