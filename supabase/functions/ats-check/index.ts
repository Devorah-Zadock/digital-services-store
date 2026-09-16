// Compares a pasted job description against the CV currently open in the
// builder and returns an AI match score (1-100), the keywords from the
// posting that are missing from the CV, and 2-3 concrete phrasing tips —
// the "ATS Checker" feature. Every call is a real OpenAI request, which
// costs real money, so this is capped at ATTEMPT_LIMIT free checks per
// signed-in user (tracked in ai_usage — see supabase/sql/ai_usage.sql)
// rather than left unlimited.
//
// Gated by real auth, same as admin-stats: the caller's own Supabase
// session token goes in Authorization, verified server-side via
// admin.auth.getUser(token) — never a client-supplied user id, since the
// entire point of the cap is that nothing client-side can be trusted to
// enforce or reset it.
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
const ATTEMPT_LIMIT = 3;

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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "ATS checker isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const { jobDescription, cvText, lang } = await req.json();
    if (!jobDescription || !cvText) {
      return jsonResponse({ error: "missing jobDescription or cvText" }, 400);
    }

    const { data: usageRow, error: usageErr } = await admin
      .from("ai_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("tool", TOOL)
      .maybeSingle();
    if (usageErr) return jsonResponse({ error: usageErr.message }, 500);

    const currentCount = usageRow ? usageRow.count : 0;
    if (currentCount >= ATTEMPT_LIMIT) {
      return jsonResponse({ limitReached: true, count: currentCount, limit: ATTEMPT_LIMIT });
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
      return jsonResponse({ error: `OpenAI request failed: ${errText.slice(0, 300)}` }, 502);
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: { score?: number; missingKeywords?: string[]; tips?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    const newCount = currentCount + 1;
    const { error: upsertErr } = await admin
      .from("ai_usage")
      .upsert({ user_id: userId, tool: TOOL, count: newCount, updated_at: new Date().toISOString() }, { onConflict: "user_id,tool" });
    if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500);

    return jsonResponse({
      score: parsed.score ?? null,
      missingKeywords: parsed.missingKeywords || [],
      tips: parsed.tips || [],
      count: newCount,
      limit: ATTEMPT_LIMIT,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
