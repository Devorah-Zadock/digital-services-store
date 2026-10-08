// Site-level AI commands (architecture plan, Phase 7) — "✨ פקודה ל-AI"
// in the Builder: a free-text instruction like "הזז את השירותים לפני
// האודות" or "שנה את ה-Hero לסגנון ממורכז" gets translated into ONE
// structured, validated operation on the Site Schema. The model never
// writes HTML and never touches the DOM directly — it only ever
// chooses among a small, fixed set of operation kinds, and only
// targets section types/variants the CLIENT itself already told it
// exist for this exact project. Anything it can't map onto that exact
// menu comes back as {op:"unsupported", explanation} instead of being
// guessed at.
//
// Same auth/rate-limit/secret pattern as every other AI Edge Function
// in this project (site-ai-review, generate-site, ai-rewrite): the
// caller's own session token verified via admin.auth.getUser, the
// shared ai_usage/ai_usage_daily tables under its own `tool` slug, the
// existing OPENAI_API_KEY secret.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// → name it "site-ai-command" (or `supabase functions deploy
// site-ai-command`).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "site-ai-command";
const FREE_ATTEMPT_LIMIT = 3;
const PRO_DAILY_LIMIT = 30;

// An "unsupported" answer (the request maps onto none of the ops below)
// doesn't spend one of the user's attempts — with only 3 free ones, a
// misunderstood request used to cost a third of them for nothing. Those
// refusals still cost an OpenAI call, though, so they get their own,
// separate allowance (same tables, own `tool` slug, so no schema change);
// once it's used up, a refusal is charged as a normal attempt again,
// exactly as before.
const REFUSAL_TOOL = "site-ai-command-refused";
const FREE_REFUSAL_LIMIT = 10;
const PRO_DAILY_REFUSAL_LIMIT = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const KNOWN_OPS = new Set(["reorder", "addSection", "removeSection", "setVariant", "unsupported"]);

type SiteContext = {
  availableTypes: string[]; // every block type this template defines, active or not
  activeTypes: string[]; // currently showing, in current order
  variantOptions: Record<string, string[]>; // type -> known variant keys, only for types that have real alternates
};

// Never trusts the model's op/type/variant/order directly — every field
// is checked against the EXACT context the client sent for THIS
// project (not some global list), so the model can never point at a
// section type or variant that doesn't actually exist here. An
// operation that fails validation becomes "unsupported" with a generic
// explanation rather than ever reaching the client as a bad mutation.
function validateCommandResult(raw: unknown, ctx: SiteContext): Record<string, unknown> {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const op = (typeof obj.op === "string" && KNOWN_OPS.has(obj.op)) ? obj.op : "unsupported";
  const explanation = (typeof obj.explanation === "string") ? obj.explanation.trim().slice(0, 200) : "";

  const fallbackUnsupported = (why: string) => ({ op: "unsupported", explanation: explanation || why });

  if (op === "unsupported") return fallbackUnsupported("הפעולה הזו עדיין לא נתמכת.");

  if (op === "setVariant") {
    const type = obj.type;
    const variant = obj.variant;
    if (typeof type !== "string" || !ctx.variantOptions[type]) return fallbackUnsupported("אין סגנונות תצוגה חלופיים לחלק הזה.");
    if (typeof variant !== "string" || ctx.variantOptions[type].indexOf(variant) === -1) return fallbackUnsupported("הסגנון המבוקש לא קיים לחלק הזה.");
    return { op, type, variant, explanation };
  }

  if (op === "addSection") {
    const type = obj.type;
    if (typeof type !== "string" || ctx.availableTypes.indexOf(type) === -1) return fallbackUnsupported("סוג המקטע המבוקש לא קיים בתבנית הזו.");
    if (ctx.activeTypes.indexOf(type) !== -1) return fallbackUnsupported("המקטע הזה כבר מופיע באתר.");
    return { op, type, explanation };
  }

  if (op === "removeSection") {
    const type = obj.type;
    if (typeof type !== "string" || ctx.activeTypes.indexOf(type) === -1) return fallbackUnsupported("המקטע המבוקש לא מופיע כרגע באתר.");
    if (type === "hero") return fallbackUnsupported("אי אפשר להסיר את ה-Hero.");
    return { op, type, explanation };
  }

  if (op === "reorder") {
    const order = obj.order;
    if (!Array.isArray(order) || order.length !== ctx.activeTypes.length) return fallbackUnsupported("הסדר המבוקש לא תקין.");
    const sortedOrder = [...order].sort();
    const sortedActive = [...ctx.activeTypes].sort();
    const sameSet = sortedOrder.length === sortedActive.length && sortedOrder.every((v, i) => v === sortedActive[i]);
    if (!sameSet) return fallbackUnsupported("הסדר המבוקש חייב לכלול בדיוק את החלקים הקיימים.");
    return { op, order, explanation };
  }

  return fallbackUnsupported("הפעולה הזו עדיין לא נתמכת.");
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI commands aren't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const body = await readJsonCapped(req) as any;
    if (!body) return jsonResponse({ error: "request too large" }, 413);
    const command = typeof body.command === "string" ? body.command.trim().slice(0, 300) : "";
    const availableTypes = Array.isArray(body.availableTypes) ? body.availableTypes.filter((t: unknown) => typeof t === "string") : [];
    const activeTypes = Array.isArray(body.activeTypes) ? body.activeTypes.filter((t: unknown) => typeof t === "string") : [];
    const variantOptions: Record<string, string[]> = {};
    if (body.variantOptions && typeof body.variantOptions === "object") {
      for (const [k, v] of Object.entries(body.variantOptions as Record<string, unknown>)) {
        if (Array.isArray(v)) variantOptions[k] = v.filter((x) => typeof x === "string");
      }
    }
    const ctx: SiteContext = { availableTypes, activeTypes, variantOptions };

    if (!command) return jsonResponse({ error: "missing command" }, 400);
    if (!activeTypes.length) return jsonResponse({ error: "missing site context" }, 400);

    const { data: profile, error: profileErr } = await admin
      .from("customer_profiles")
      .select("is_pro")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr) return jsonResponse({ error: profileErr.message }, 500);
    const isPro = !!(profile && profile.is_pro);

    const limit = isPro ? PRO_DAILY_LIMIT : FREE_ATTEMPT_LIMIT;

    // Atomically take one slot BEFORE calling OpenAI (ai_usage_reserve in
    // supabase/sql/security_hardening.sql) — a read-then-write let parallel
    // requests all slip past the limit. Handed back below if the call
    // fails, or if this turns out to be a refusal that's still free.
    const { data: reserved, error: reserveErr } = await admin.rpc("ai_usage_reserve", { p_user_id: userId, p_tool: TOOL, p_limit: limit, p_daily: isPro });
    if (reserveErr) return jsonResponse({ error: "usage check failed — please try again" }, 500);
    if (reserved === null || reserved === undefined) {
      return jsonResponse({ limitReached: true, isPro, count: limit, limit });
    }
    const newCount = Number(reserved);
    let keepSlot = false;
    const reservedResponse = await (async (): Promise<Response> => {

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
              "You translate a site-builder command into ONE structured operation. Respond with ONLY a JSON object. You may ONLY use one of these exact shapes:\n" +
              '{"op": "reorder", "order": [<every type in activeTypes, in the new order>], "explanation": "<short Hebrew sentence describing the change>"}\n' +
              '{"op": "addSection", "type": "<a type from availableTypes that is NOT already in activeTypes>", "explanation": "<short Hebrew sentence>"}\n' +
              '{"op": "removeSection", "type": "<a type currently in activeTypes, never \\"hero\\">", "explanation": "<short Hebrew sentence>"}\n' +
              '{"op": "setVariant", "type": "<a key from variantOptions>", "variant": "<one of that key\'s listed options>", "explanation": "<short Hebrew sentence>"}\n' +
              '{"op": "unsupported", "explanation": "<short Hebrew sentence explaining this site does not support that request>"}\n' +
              "If the command asks for a section type, variant, or action not present in availableTypes/variantOptions below (for example a section type this site simply does not have), you MUST respond with \"unsupported\" — never invent a type or variant that isn't listed, and never guess at an operation shape not listed above.\n\n" +
              `availableTypes: ${JSON.stringify(availableTypes)}\nactiveTypes (current order): ${JSON.stringify(activeTypes)}\nvariantOptions: ${JSON.stringify(variantOptions)}`,
          },
          {
            role: "user",
            content: command,
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    const result = validateCommandResult(parsed, ctx);

    if (result.op === "unsupported") {
      // A refusal is free up to its own (separate) cap: take a refusal
      // slot atomically, and if that worked hand the normal one back.
      const { data: refusalSlot, error: refusalErr } = await admin.rpc("ai_usage_reserve", {
        p_user_id: userId, p_tool: REFUSAL_TOOL, p_limit: isPro ? PRO_DAILY_REFUSAL_LIMIT : FREE_REFUSAL_LIMIT, p_daily: isPro,
      });
      if (refusalErr) return jsonResponse({ error: "usage check failed — please try again" }, 500);
      if (refusalSlot !== null && refusalSlot !== undefined) {
        return jsonResponse({ result, isPro, count: newCount - 1, limit });
      }
    }

    keepSlot = true;
    return jsonResponse({ result, isPro, count: newCount, limit });
    })().catch((err) => jsonResponse({ error: String(err) }, 500));
    if (!keepSlot) {
      await admin.rpc("ai_usage_release", { p_user_id: userId, p_tool: TOOL, p_daily: isPro });
    }
    return reservedResponse;
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
