// AI Quote Draft Generator. Takes a short free-text description of the
// job/service (and nothing else) and returns a small set of structured
// quote-event fields — the exact same shape quoteEventState already
// uses (eventName/description/price/vatNote) — NEVER HTML, NEVER a
// recipient name or any other identifying detail about the client.
// The client merges this response straight into the existing
// quoteEventState and runs it through the SAME renderQuoteFormQA()/
// renderQuoteHtml() pipeline every manually-typed quote already uses.
//
// Cloned from ../generate-site/index.ts: same auth model (the caller's
// own Supabase session token, verified server-side via
// admin.auth.getUser — never a client-supplied user id), same
// ai_usage/ai_usage_daily rate-limiting pattern (new TOOL name, same
// tables — no new schema), same OPENAI_API_KEY secret, same "model
// output is never trusted as-is" posture — every field is validated
// and clamped below, and any unrecognized field is silently dropped.
//
// Deliberately does NOT accept or return "recipient" (לכבוד) or any
// other client-identifying field — a quote names a real third party,
// and the AI has no way to know who that is; it only ever drafts the
// seller's OWN description of the job and a suggested price, both of
// which the user reviews/edits before ever sending anything.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// → name it "generate-quote" (or `supabase functions deploy
// generate-quote`). Reuses the existing OPENAI_API_KEY secret.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "generate-quote";
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

// price comes back as a string (quoteEventState.price is always a
// string, typed freely in the existing field) but must still be a
// plain non-negative number with no currency symbol or extra text —
// anything else is dropped to "" so the user's own judgment fills it
// in, rather than risk a garbled or wildly wrong figure reaching the
// document.
function clampPrice(v: unknown): string {
  if (typeof v !== "string" && typeof v !== "number") return "";
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return "";
  return String(Math.round(n));
}

function normalizeGeneratedQuote(raw: unknown): Record<string, unknown> {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    eventName: clampStr(obj.eventName, 60),
    description: clampStr(obj.description, 500),
    price: clampPrice(obj.price),
    vatNote: clampStr(obj.vatNote, 120),
  };
}

// Hard cap on the request body: the text here goes straight into an
// OpenAI prompt that DeskKit pays for, so an unbounded body is an
// unbounded bill. 60k characters is far above any real CV + job ad or
// site summary.
const MAX_BODY_CHARS = 60_000;
async function readJsonCapped(req: Request): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return null;
  return JSON.parse(raw);
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI quote generation isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const body = await readJsonCapped(req) as any;
    if (!body) return jsonResponse({ error: "request too large" }, 413);
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

    const limit = isPro ? PRO_DAILY_LIMIT : FREE_ATTEMPT_LIMIT;

    // Atomically take one slot BEFORE calling OpenAI (ai_usage_reserve in
    // supabase/sql/security_hardening.sql): a read-then-write here let a
    // burst of parallel requests all see the same count and all get
    // through. The slot is handed back below if the call doesn't succeed,
    // so — as before — only successful attempts count.
    const { data: reserved, error: reserveErr } = await admin.rpc("ai_usage_reserve", { p_user_id: userId, p_tool: TOOL, p_limit: limit, p_daily: isPro });
    if (reserveErr) return jsonResponse({ error: "usage check failed — please try again" }, 500);
    if (reserved === null || reserved === undefined) {
      return jsonResponse({ limitReached: true, isPro, count: limit, limit });
    }
    const newCount = Number(reserved);
    const reservedResponse = await (async (): Promise<Response> => {

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
                "You help a small-business owner draft a price quote (הצעת מחיר) for a job they described in one or two sentences. Respond with ONLY a JSON object shaped exactly like: " +
                '{"eventName": "<short string, 2-6 words>", "description": "<1-3 sentences describing the job/service being offered>", "price": "<a single plain number in ILS, no currency symbol, as a string — your best reasonable estimate for this kind of job in Israel, or an empty string if you genuinely cannot estimate>", "vatNote": "<optional short string, usually just an empty string>"}. ' +
                "Write every string value in Hebrew, even if the input is in another language. Base eventName and description ONLY on what the business described — never invent extra services, quantities, dates, or any client-identifying detail (no client name, company, address, or contact info — those are filled in separately by the business owner). Do NOT include HTML or markup — plain text only.",
            },
            {
              role: "user",
              content: `Business: ${businessName || "(not provided)"}\nJob description: ${description}`,
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
      console.error("OpenAI request failed", openaiRes.status, errText.slice(0, 500));
      return jsonResponse({ error: "AI request failed — please try again" }, 502);
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    const quote = normalizeGeneratedQuote(parsed);

    return jsonResponse({ quote, isPro, count: newCount, limit });
    })().catch((err) => jsonResponse({ error: String(err) }, 500));
    if (reservedResponse.status !== 200) {
      await admin.rpc("ai_usage_release", { p_user_id: userId, p_tool: TOOL, p_daily: isPro });
    }
    return reservedResponse;
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
