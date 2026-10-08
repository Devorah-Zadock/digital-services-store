// AI Website Director (architecture plan, Phase 8) — analyzes a whole
// site and returns actionable suggestions, each one a validated
// structured operation the user can preview and individually approve.
// Deliberately NOT a separate system: it reuses the exact same content
// summary shape as site-ai-review (score/strengths/tips — unchanged,
// just embedded here too) and the exact same {op, type, variant, order,
// explanation} operation shape AND validation rules as site-ai-command,
// so a Director suggestion and a typed AI command are, once validated,
// indistinguishable to the client — both get applied through
// js/site-ai-command.js's one existing siteAiCommandApply(), never a
// second apply path.
//
// validateOp() below is intentionally a near-duplicate of
// site-ai-command/index.ts's validateCommandResult(): Supabase Edge
// Functions here are deployed by pasting each index.ts independently
// into the Dashboard (see every other function's own deploy note) —
// there is no shared module between them in that workflow, so a small,
// deliberate duplication of this one validator is the actual minimal-
// risk choice, not a DRY violation to "fix" later. If the accepted
// operation shapes ever change, update both files.
//
// Same auth/rate-limit/secret pattern as every other AI Edge Function
// here. Flow stays user-gated at every step: Analyze -> Suggestions
// (this function, read-only) -> Preview -> User approval -> Apply (the
// EXISTING site-ai-command apply path) — this function never applies
// anything itself.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// → name it "site-ai-director".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "site-ai-director";
const FREE_ATTEMPT_LIMIT = 3;
const PRO_DAILY_LIMIT = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const KNOWN_OPS = new Set(["reorder", "addSection", "removeSection", "setVariant"]);

type SiteContext = {
  availableTypes: string[];
  activeTypes: string[];
  variantOptions: Record<string, string[]>;
};

// See file header: kept in sync BY HAND with site-ai-command's own
// validateCommandResult(). Returns null for anything invalid rather
// than a fallback object — a Director suggestion that doesn't validate
// is simply dropped from the list, never shown to the user as a maybe-
// broken action.
function validateOp(raw: unknown, ctx: SiteContext): Record<string, unknown> | null {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const op = obj.op;
  if (typeof op !== "string" || !KNOWN_OPS.has(op)) return null;
  const explanation = (typeof obj.explanation === "string") ? obj.explanation.trim().slice(0, 200) : "";

  if (op === "setVariant") {
    const type = obj.type, variant = obj.variant;
    if (typeof type !== "string" || !ctx.variantOptions[type]) return null;
    if (typeof variant !== "string" || ctx.variantOptions[type].indexOf(variant) === -1) return null;
    return { op, type, variant, explanation };
  }
  if (op === "addSection") {
    const type = obj.type;
    if (typeof type !== "string" || ctx.availableTypes.indexOf(type) === -1) return null;
    if (ctx.activeTypes.indexOf(type) !== -1) return null;
    return { op, type, explanation };
  }
  if (op === "removeSection") {
    const type = obj.type;
    if (typeof type !== "string" || ctx.activeTypes.indexOf(type) === -1 || type === "hero") return null;
    return { op, type, explanation };
  }
  if (op === "reorder") {
    const order = obj.order;
    if (!Array.isArray(order) || order.length !== ctx.activeTypes.length) return null;
    const sortedOrder = [...order].sort();
    const sortedActive = [...ctx.activeTypes].sort();
    if (!(sortedOrder.length === sortedActive.length && sortedOrder.every((v, i) => v === sortedActive[i]))) return null;
    return { op, order, explanation };
  }
  return null;
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI website director isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const body = await readJsonCapped(req) as any;
    if (!body) return jsonResponse({ error: "request too large" }, 413);
    const summary = (body.summary && typeof body.summary === "object") ? body.summary : null;
    if (!summary) return jsonResponse({ error: "missing summary" }, 400);

    const availableTypes = Array.isArray(body.availableTypes) ? body.availableTypes.filter((t: unknown) => typeof t === "string") : [];
    const activeTypes = Array.isArray(body.activeTypes) ? body.activeTypes.filter((t: unknown) => typeof t === "string") : [];
    const variantOptions: Record<string, string[]> = {};
    if (body.variantOptions && typeof body.variantOptions === "object") {
      for (const [k, v] of Object.entries(body.variantOptions as Record<string, unknown>)) {
        if (Array.isArray(v)) variantOptions[k] = v.filter((x) => typeof x === "string");
      }
    }
    const ctx: SiteContext = { availableTypes, activeTypes, variantOptions };
    const hasStructuralContext = activeTypes.length > 0;

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

    const structuralContextText = hasStructuralContext
      ? `This site also has a reorderable Section system you may suggest structural actions for. availableTypes: ${JSON.stringify(availableTypes)}\nactiveTypes (current order): ${JSON.stringify(activeTypes)}\nvariantOptions: ${JSON.stringify(variantOptions)}\nYou may suggest 0-3 structural actions using ONLY these exact shapes: {"op":"reorder","order":[...every active type, new order...]}, {"op":"addSection","type":"<available, not already active>"}, {"op":"removeSection","type":"<active, never \\"hero\\">"}, {"op":"setVariant","type":"<a variantOptions key>","variant":"<one of its listed options>"}. Each needs its own short Hebrew "explanation". NEVER suggest a type/variant not listed above — if nothing structural is worth changing, or this site has no Section system, return an empty actions array.`
      : `This site has no reorderable Section system — always return an empty actions array, never invent one.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a website-content AND structure reviewer for a small-business owner building their own site from a template. You'll receive a JSON summary of their content plus (optionally) their site's structural context. Respond with ONLY a JSON object shaped exactly like: " +
              '{"score": <integer 1-100>, "strengths": [<up to 3 short Hebrew strings>], "tips": [<2-4 short, concrete, actionable Hebrew strings>], "actions": [<0-3 structural action objects, see below>]}. ' +
              '"score"/"strengths"/"tips" follow the same rules as before: honest, specific, tied to what is actually present or missing in the summary — never generic. ' +
              structuralContextText,
          },
          {
            role: "user",
            content: `Site content summary (JSON):\n${JSON.stringify(summary)}`,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI request failed", openaiRes.status, errText.slice(0, 500));
      return jsonResponse({ error: "AI request failed — please try again" }, 502);
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: { score?: number; strengths?: string[]; tips?: string[]; actions?: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    const validActions = Array.isArray(parsed.actions)
      ? parsed.actions.map((a) => validateOp(a, ctx)).filter((a): a is Record<string, unknown> => a !== null).slice(0, 3)
      : [];

    return jsonResponse({
      score: parsed.score ?? null,
      strengths: parsed.strengths || [],
      tips: parsed.tips || [],
      actions: validActions,
      isPro,
      count: newCount,
      limit,
    });
    })().catch((err) => jsonResponse({ error: String(err) }, 500));
    if (reservedResponse.status !== 200) {
      await admin.rpc("ai_usage_release", { p_user_id: userId, p_tool: TOOL, p_daily: isPro });
    }
    return reservedResponse;
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
