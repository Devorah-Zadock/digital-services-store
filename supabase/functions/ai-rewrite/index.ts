// Rewrites a CV field with AI — v1 covers the professional summary
// (builder.html's "✨ שפר עם AI" button next to "תקציר מקצועי"): sends the
// text currently in that field plus the job title for context, gets back
// a tighter, more results-oriented version in the same language. Every
// call is a real OpenAI request, so it shares the exact same cap
// machinery as ats-check — same tables (ai_usage / ai_usage_daily),
// same customer_profiles.is_pro check, just its own `tool` slug
// ("ai-rewrite") so it gets its own independent 3 free lifetime attempts
// (or 50/day once Pro) rather than sharing the ATS checker's count.
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
    const { field, text, title, lang } = await req.json();
    if (!text || !String(text).trim()) {
      return jsonResponse({ error: "missing text" }, 400);
    }
    if (field !== "summary") {
      return jsonResponse({ error: "unsupported field" }, 400);
    }

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
              "You improve the phrasing of a professional summary in a CV/resume. Respond with ONLY a JSON object shaped exactly like: " +
              '{"improved": "<the rewritten summary>"}. ' +
              `Write it in ${responseLang}, as 2-4 concise sentences. Make it more results-oriented, specific and professional — but NEVER invent facts, employers, numbers, years of experience or credentials that aren't implied by the original text. If the original is very thin, improve its phrasing/flow without padding it with invented claims.`,
          },
          {
            role: "user",
            content: `Job title: ${title || "(not specified)"}\n\nCurrent summary:\n${text}`,
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return jsonResponse({ error: `OpenAI request failed: ${errText.slice(0, 300)}` }, 502);
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

    const newCount = currentCount + 1;
    const upsertRow: Record<string, unknown> = { user_id: userId, tool: TOOL, count: newCount, updated_at: new Date().toISOString() };
    const onConflict = isPro ? "user_id,tool,day" : "user_id,tool";
    if (isPro) upsertRow.day = today;
    const { error: upsertErr } = await admin.from(usageTable).upsert(upsertRow, { onConflict });
    if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500);

    return jsonResponse({ improved: parsed.improved, isPro, count: newCount, limit });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
