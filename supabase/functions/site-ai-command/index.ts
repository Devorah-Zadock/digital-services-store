// Site-level AI commands (architecture plan, Phase 7) — "✨ פקודה ל-AI"
// in the Builder: a free-text instruction like "הזז את השירותים לפני
// האודות" or "שנה את הצבע לכחול וקצר את האודות" gets translated into a
// short list of structured, validated operations on the Site Schema
// (structure, colour, font, texts, services, removing an image — the
// full menu is in ../_shared/site-ai-ops.ts). The model never writes
// HTML and never touches the DOM directly — it only ever chooses among
// a small, fixed set of operation kinds, and only targets section
// types/variants/text fields/fonts/service rows the CLIENT itself
// already told it exist for this exact project. Anything it can't map
// onto that menu comes back as {op:"unsupported", explanation} — with a
// short "here's what I CAN do" line — instead of being guessed at.
//
// Privacy: the command and the site's own text go to OpenAI only; this
// function never logs them (errors log status codes only).
//
// Same auth/rate-limit/secret pattern as every other AI Edge Function
// in this project (site-ai-review, generate-site, ai-rewrite): the
// caller's own session token verified via admin.auth.getUser, the
// shared ai_usage/ai_usage_daily tables under its own `tool` slug, the
// existing OPENAI_API_KEY secret.
//
// Deploy: `supabase functions deploy site-ai-command` — it imports
// ../_shared/site-ai-ops.ts, so the CLI (which bundles _shared) is the
// way to deploy it, same as the functions that import _shared/mail.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_MAX_OUTPUT_TOKENS, aiBusyMessage, aiGlobalReserve } from "../_shared/ai-budget.ts";
import { MAX_OPS, parseSiteContext, TEXT_FIELD_LIMITS, validateCommandResult, type SiteContext } from "../_shared/site-ai-ops.ts";

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

// Validation (op/field/value whitelists, caps, conflict rules) lives in
// ../_shared/site-ai-ops.ts as a pure module, so it can be unit-tested on
// its own (site-ai-ops_test.ts) — this file only wires it to auth, usage
// limits and the OpenAI call.

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
    // Language of the explanation the AI writes back ("en" from the English
    // UI; Hebrew otherwise) — separate from the language of any SITE text
    // it writes, which follows the site itself (ctx.siteLang).
    const outLang = (body as any)?.lang === "en" ? "English" : "Hebrew";
    const uiLang: "he" | "en" = (body as any)?.lang === "en" ? "en" : "he";
    const command = typeof body.command === "string" ? body.command.trim().slice(0, 300) : "";
    const ctx: SiteContext = parseSiteContext(body as Record<string, unknown>);
    const { availableTypes, activeTypes, variantOptions } = ctx;
    const siteTextLang = ctx.siteLang === "en" ? "English" : "Hebrew";

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
    // Site-wide daily fuse (all users together) — hands the user's try back.
    if (!(await aiGlobalReserve(admin))) {
      await admin.rpc("ai_usage_release", { p_user_id: userId, p_tool: TOOL, p_daily: isPro });
      return jsonResponse({ error: aiBusyMessage((body as any)?.lang) }, 503);
    }
    let keepSlot = false;
    const reservedResponse = await (async (): Promise<Response> => {

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: AI_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You translate a website-builder command into a list of structured operations. Respond with ONLY a JSON object of this exact form:\n" +
              '{"ops": [<1 to ' + MAX_OPS + ' operations>], "explanation": "<one short ' + outLang + ' sentence summarizing what will change>"}\n' +
              "Each operation MUST be one of these exact shapes:\n" +
              '{"op": "reorder", "order": [<every type in activeTypes, in the new order>]}\n' +
              '{"op": "addSection", "type": "<a type from availableTypes that is NOT already in activeTypes>"}\n' +
              '{"op": "removeSection", "type": "<a type currently in activeTypes, never \\"hero\\">"}\n' +
              '{"op": "setVariant", "type": "<a key from variantOptions>", "variant": "<one of that key\'s listed options>"}\n' +
              '{"op": "setColor", "color": "<#RRGGBB hex: the site\'s main/accent color; pick a tasteful shade for a named color, e.g. blue -> #2563EB>"}\n' +
              '{"op": "setFont", "font": "<a key from fonts>"}\n' +
              '{"op": "setText", "field": "<a key from textFields>", "value": "<the complete new text>"}\n' +
              '{"op": "addService", "name": "<service name>", "desc": "<short description, optional>", "price": "<price, optional>"}\n' +
              '{"op": "editService", "index": <index from services>, "name": "<optional>", "desc": "<optional>", "price": "<optional>"}\n' +
              '{"op": "removeService", "index": <index from services>}\n' +
              '{"op": "removeImage", "target": "hero" | "gallery"}\n' +
              "Rules:\n" +
              "- Use several operations when the command asks for several things (\"make it blue and shorten the about\" = setColor + setText). At most ONE of reorder/addSection/removeSection per answer.\n" +
              "- setText/addService/editService: write the text yourself when asked (shorter, more professional, a new title...). Write site text in " + siteTextLang + " (the site's language) and stay truthful to the current text: never invent facts, prices, phone numbers, emails or addresses the user didn't give. Max lengths: " + JSON.stringify(TEXT_FIELD_LIMITS) + "; service name 40, desc 90, price 20.\n" +
              "- Text fields: businessName = business name; heroTitle = main heading (empty = use the business name); tagline = short line under the heading; about = about paragraph; servicesHeading/aboutHeading/contactHeading = section headings (empty = default); phone/whatsapp/email/address = contact details. Only use keys listed in textFields.\n" +
              "- setFont: \"elegant\"/\"classic\"/\"luxurious\" usually means a serif font, \"modern\"/\"clean\" a sans-serif one, \"friendly\"/\"soft\" a rounded one. Choose ONLY from the listed keys.\n" +
              "- Uploading, replacing or choosing a new picture is NOT possible: for that use {\"op\": \"unsupported\", \"reason\": \"image\"} (alongside any other operations that WERE asked for). Removing the current picture is possible via removeImage.\n" +
              '- If nothing in the command maps onto these operations, answer {"ops": [{"op": "unsupported", "reason": "other", "explanation": "<short ' + outLang + ' sentence saying what is not possible>"}]}. Never invent a type, variant, font, field or index that is not listed, and never use any other operation shape.\n\n' +
              `availableTypes: ${JSON.stringify(availableTypes)}\nactiveTypes (current order): ${JSON.stringify(activeTypes)}\nvariantOptions: ${JSON.stringify(variantOptions)}\n` +
              `fonts: ${JSON.stringify(ctx.fonts)}\ntextFields (current values): ${JSON.stringify(ctx.textFields)}\n` +
              `services (index: item): ${JSON.stringify(ctx.services.map((sv, i) => ({ index: i, ...sv })))}\n` +
              `images: ${JSON.stringify({ heroImage: ctx.images.hero, galleryImages: ctx.images.gallery })}`,
          },
          {
            role: "user",
            content: command,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      // Status only: the error body can echo parts of the prompt, which
      // carries the user's command and site text.
      await openaiRes.body?.cancel();
      console.error("OpenAI request failed", openaiRes.status);
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

    const result = validateCommandResult(parsed, ctx, uiLang);

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
