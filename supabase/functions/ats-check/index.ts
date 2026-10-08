// Compares a pasted job description against the CV currently open in the
// builder and returns an AI match score (1-100), the keywords from the
// posting that are missing from the CV, and 2-3 concrete phrasing tips —
// the "ATS Checker" feature. Every call is a real OpenAI request, which
// costs real money, so a free-tier signed-in user gets FREE_ATTEMPT_LIMIT
// checks total (tracked in ai_usage — see supabase/sql/ai_usage.sql). A
// Pro user (customer_profiles.is_pro — see
// supabase/sql/customer_profiles_pro.sql) has that lifetime cap lifted
// entirely, but still gets a much larger PRO_DAILY_LIMIT per day (tracked
// separately in ai_usage_daily — see supabase/sql/ai_usage_daily.sql) as
// a fair-use ceiling, since "unlimited" is still a real cost risk from a
// compromised account or a script.
//
// Gated by real auth, same as admin-stats: the caller's own Supabase
// session token goes in Authorization, verified server-side via
// admin.auth.getUser(token) — never a client-supplied user id, since the
// entire point of either cap is that nothing client-side can be trusted
// to enforce or reset it.
//
// Deploy: `supabase functions deploy ats-check` (or paste into Supabase
// Dashboard → Edge Functions → New Function). Needs these secrets set
// first (Dashboard → Edge Functions → Secrets, or
// `supabase secrets set NAME=value`):
//   OPENAI_API_KEY — from platform.openai.com/api-keys

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "ats-check";
const FREE_ATTEMPT_LIMIT = 3;
const PRO_DAILY_LIMIT = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "ATS checker isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const cappedBody = await readJsonCapped(req);
    if (!cappedBody) return jsonResponse({ error: "request too large" }, 413);
    const { jobDescription, cvText, lang } = cappedBody as any;
    if (!jobDescription || !cvText) {
      return jsonResponse({ error: "missing jobDescription or cvText" }, 400);
    }

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
              "You are an ATS (Applicant Tracking System) resume-matching assistant. Compare a resume against a job description and respond with ONLY a JSON object shaped exactly like: " +
              '{"score": <integer 1-100>, "missingKeywords": [<up to 8 short strings>], "tips": [<2-3 short, concrete, actionable strings>]}. ' +
              `Write every string value in ${responseLang}. "score" reflects how well the resume's actual content (skills, tools, experience) matches the job description's requirements — be honest and specific, not generous by default. "missingKeywords" are terms/skills that appear in the job description but not in the resume. "tips" are concrete phrasing or content suggestions to improve the match, not generic advice.`,
          },
          {
            role: "user",
            content: `Job description:\n${jobDescription}\n\n---\n\nResume:\n${cvText}`,
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
    let parsed: { score?: number; missingKeywords?: string[]; tips?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    return jsonResponse({
      score: parsed.score ?? null,
      missingKeywords: parsed.missingKeywords || [],
      tips: parsed.tips || [],
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
