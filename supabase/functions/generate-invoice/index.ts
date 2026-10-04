// AI Invoice Draft Generator. Takes a short free-text description of
// what's being billed and returns a small set of structured line items
// — the exact same shape invoiceEventState.items already uses
// ({desc, qty, unitPrice}) — NEVER HTML, NEVER a recipient name/ID/
// address or any other client-identifying detail. The client merges
// this response straight into the existing invoiceEventState and runs
// it through the SAME renderInvoiceFormIA()/renderInvoiceHtml()
// pipeline every manually-typed draft already uses.
//
// Cloned from ../generate-quote/index.ts (itself cloned from
// ../generate-site/index.ts): same auth model (the caller's own
// Supabase session token, verified server-side via admin.auth.getUser
// — never a client-supplied user id), same ai_usage/ai_usage_daily
// rate-limiting pattern (new TOOL name, same tables), same
// OPENAI_API_KEY secret, same "model output is never trusted as-is"
// posture.
//
// Only ever drafts a DRAFT document — this function has no knowledge
// of and no access to invoice numbering/finalize/lock at all; the
// client already refuses to call it once isInvoiceLocked() is true
// (invoice-builder-shell.js), and nothing this function returns can
// touch an already-issued row — that still goes exclusively through
// the existing finalizeInvoice() RPC and its RLS-enforced lock.
//
// Deliberately does NOT accept or return recipientName/recipientId/
// recipientAddress — those identify a real third party the AI has no
// way to know; only the seller's own description of what's being
// billed is ever drafted, reviewed/edited by the user before anything
// is finalized.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// → name it "generate-invoice" (or `supabase functions deploy
// generate-invoice`). Reuses the existing OPENAI_API_KEY secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "generate-invoice";
const FREE_ATTEMPT_LIMIT = 5;
const PRO_DAILY_LIMIT = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clampStr(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}

function clampQty(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100_000) return "1";
  return String(Math.round(n * 100) / 100);
}

function clampUnitPrice(v: unknown): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return "";
  return String(Math.round(n));
}

function normalizeGeneratedInvoice(raw: unknown): Record<string, unknown> {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  const items = itemsRaw.slice(0, 5).map((it) => {
    const item = (it && typeof it === "object") ? it as Record<string, unknown> : {};
    return { desc: clampStr(item.desc, 90), qty: clampQty(item.qty), unitPrice: clampUnitPrice(item.unitPrice) };
  }).filter((it) => it.desc);
  return { items };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return jsonResponse({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI invoice generation isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const body = await req.json();
    const description = clampStr(body.description, 600);
    const businessName = clampStr(body.businessName, 60);

    if (!description) return jsonResponse({ error: "missing description" }, 400);

    const { data: profile, error: profileErr } = await admin
      .from("customer_profiles")
      .select("is_pro")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) return jsonResponse({ error: profileErr.message }, 500);
    const isPro = !!(profile && profile.is_pro);

    const today = new Date().toISOString().slice(0, 10);
    const usageTable = isPro ? "ai_usage_daily" : "ai_usage";
    const limit = isPro ? PRO_DAILY_LIMIT : FREE_ATTEMPT_LIMIT;

    let usageQuery = admin.from(usageTable).select("count").eq("user_id", userId).eq("tool", TOOL);
    if (isPro) usageQuery = usageQuery.eq("day", today);
    const { data: usageRow, error: usageErr } = await usageQuery.maybeSingle();
    if (usageErr) return jsonResponse({ error: usageErr.message }, 500);

    const currentCount = usageRow ? usageRow.count : 0;
    if (currentCount >= limit) {
      return jsonResponse({ limitReached: true, isPro, count: currentCount, limit });
    }

    let openaiRes: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You help a small-business owner draft invoice line items for work they described in one or two sentences. Respond with ONLY a JSON object shaped exactly like: " +
                '{"items": [{"desc": "<short string>", "qty": "<plain number as a string, usually \\"1\\">", "unitPrice": "<a single plain number in ILS, no currency symbol, as a string — your best reasonable estimate, or an empty string if you genuinely cannot estimate>"}, ...1 to 4 items]}. ' +
                "Write every string value in Hebrew, even if the input is in another language. Base the items ONLY on what the business described — never invent extra services or quantities not implied by the description, and never include any client-identifying detail (no client name, company, address, ID number, or contact info — those are filled in separately by the business owner). Do NOT include HTML or markup — plain text only.",
            },
            {
              role: "user",
              content: `Business: ${businessName || "(not provided)"}\nWhat's being billed: ${description}`,
            },
          ],
        }),
      });
      clearTimeout(timeout);
    } catch (fetchErr) {
      const isAbort = fetchErr instanceof Error && fetchErr.name === "AbortError";
      return jsonResponse({ error: isAbort ? "AI request timed out — please try again" : "AI request failed — please try again" }, 502);
    }

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return jsonResponse({ error: `OpenAI request failed: ${errText.slice(0, 300)}` }, 502);
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    const invoice = normalizeGeneratedInvoice(parsed);

    const newCount = currentCount + 1;
    const upsertRow: Record<string, unknown> = { user_id: userId, tool: TOOL, count: newCount, updated_at: new Date().toISOString() };
    const onConflict = isPro ? "user_id,tool,day" : "user_id,tool";
    if (isPro) upsertRow.day = today;
    const { error: upsertErr } = await admin.from(usageTable).upsert(upsertRow, { onConflict });
    if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500);

    return jsonResponse({ invoice, isPro, count: newCount, limit });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
