// Anonymous count of browsers that hold CRM leads (the CRM still keeps
// leads only in the browser — js/crm.js). Receives ONE number per browser,
// once: how many leads it holds. No names, phones, emails, content, IP
// address or any identifier is received or stored. Used only to know how
// many people a move of the CRM to the server would affect.
//
// Public on purpose (the CRM works without signing in). Abuse can at most
// inflate a counter; a global hourly cap keeps even that bounded.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HOURLY_CAP = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const leads = Math.floor(Number(body.leads));
  if (!Number.isFinite(leads) || leads < 1 || leads > 100000) return json({ error: "bad request" }, 400);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await admin.from("crm_local_reports").select("id", { count: "exact", head: true }).gte("reported_at", hourAgo);
  if ((count || 0) >= HOURLY_CAP) return json({ ok: true }); // silently capped
  const { error } = await admin.from("crm_local_reports").insert({ lead_count: leads });
  if (error) return json({ error: "server error" }, 500);
  return json({ ok: true });
});
