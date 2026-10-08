// Rewrites a single text field with AI. Started as CV-only (builder.html's
// "✨ שפר עם AI" button next to "תקציר מקצועי") and is now generalized
// (architecture plan, Phase 6) to also cover a handful of site-builder
// fields (tagline/about/heading/a service description) — but the
// contract stays exactly the same shape either way: send the field's
// OWN current text (plus light context), get back ONE rewritten string
// for that SAME field, nothing else. This is what guarantees "AI Editing
// changes only what the user asked for" by construction — there is no
// field in the request or response for services/colors/layout/sections,
// so there is no way for a summary rewrite to also touch anything else.
//
// Every call is a real OpenAI request, so it shares the exact same cap
// machinery as ats-check — same tables (ai_usage / ai_usage_daily),
// same customer_profiles.is_pro check, just its own `tool` slug
// ("ai-rewrite") so it gets its own independent 3 free lifetime attempts
// (or 50/day once Pro) rather than sharing any other tool's count — one
// shared cap across the CV summary AND every site field, all under the
// same "tool" slug, same as before this generalization.
//
// Gated by real auth, same as admin-stats/ats-check: the caller's own
// Supabase session token goes in Authorization, verified server-side via
// admin.auth.getUser(token) — never a client-supplied user id.
//
// Deploy: `supabase functions deploy ai-rewrite` (or paste into Supabase
// Dashboard → Edge Functions → New Function). Needs the same
// OPENAI_API_KEY secret as ats-check (Dashboard → Edge Functions →
// Secrets) — already set if ats-check is deployed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "ai-rewrite";
const FREE_ATTEMPT_LIMIT = 3;
const PRO_DAILY_LIMIT = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// What kind of text each supported `field` value actually is — this is
// the whole generalization. Adding a future field (e.g. a testimonial
// quote) is one line here, never a new endpoint or a new client-side
// usage cap.
const FIELD_PROMPTS: Record<string, string> = {
  summary: "a professional CV summary, 2-4 sentences",
  tagline: "a short, punchy one-line business tagline for a website hero section (roughly 4-12 words)",
  about: "a business website's \"about us\" text, 2-4 sentences",
  heading: "a short section heading for a business website (2-6 words, no ending punctuation)",
  serviceDesc: "a short one-line description of a single service or product (well under 90 characters)",
};
// `mode` is independent of `field` on purpose — a small, fixed set that
// composes with any field above rather than a separate hardcoded prompt
// per (field, mode) pair. Defaults to "improve" so the existing CV
// caller (which never sends `mode`) keeps working unchanged.
const MODE_INSTRUCTIONS: Record<string, string> = {
  improve: "Make it more professional, clear and specific than the original.",
  shorten: "Make it noticeably SHORTER than the original while keeping its core meaning — this is the main goal, more important than adding polish.",
  persuasive: "Make it more persuasive and compelling for a potential customer, while staying completely honest.",
};

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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI writing assistant isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const cappedBody = await readJsonCapped(req);
    if (!cappedBody) return jsonResponse({ error: "request too large" }, 413);
    const { field, text, title, lang, mode } = cappedBody as any;
    if (!text || !String(text).trim()) {
      return jsonResponse({ error: "missing text" }, 400);
    }
    if (typeof field !== "string" || !FIELD_PROMPTS[field]) {
      return jsonResponse({ error: "unsupported field" }, 400);
    }
    const modeKey = (typeof mode === "string" && MODE_INSTRUCTIONS[mode]) ? mode : "improve";

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

    const responseLang = lang === "en" ? "English" : "Hebrew";
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
              `You rewrite ${FIELD_PROMPTS[field]}. Respond with ONLY a JSON object shaped exactly like: ` +
              '{"improved": "<the rewritten text>"}. ' +
              `Write it in ${responseLang}. ${MODE_INSTRUCTIONS[modeKey]} NEVER invent facts, numbers, employers, years of experience, credentials, awards or claims that aren't implied by the original text or the context given — if the original is very thin, improve its phrasing/flow without padding it with invented claims. Return ONLY the rewritten text for this one field — never add new sections, labels or unrelated content.`,
          },
          {
            role: "user",
            content: `Context: ${title || "(not specified)"}\n\nCurrent text:\n${text}`,
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
    let parsed: { improved?: string };
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }
    if (!parsed.improved) return jsonResponse({ error: "the AI returned an empty result — please try again" }, 502);

    return jsonResponse({ improved: parsed.improved, isPro, count: newCount, limit });
    })().catch((err) => jsonResponse({ error: String(err) }, 500));
    if (reservedResponse.status !== 200) {
      await admin.rpc("ai_usage_release", { p_user_id: userId, p_tool: TOOL, p_daily: isPro });
    }
    return reservedResponse;
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
