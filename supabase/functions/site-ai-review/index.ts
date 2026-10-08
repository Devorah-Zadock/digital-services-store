// Reviews the site currently open in the builder and returns an AI score
// (1-100), a couple of things it's doing well, and 2-4 concrete, specific
// things to improve before publishing — the "עזרה עם AI" feature on the
// site builder. Cloned from ../ats-check/index.ts, same shape and same
// reasoning throughout: every call is a real OpenAI request (real money),
// so a free-tier signed-in user gets FREE_ATTEMPT_LIMIT reviews total
// (tracked in ai_usage — see supabase/sql/ai_usage.sql, already generic
// per `tool`), a Pro user (customer_profiles.is_pro) gets that lifetime
// cap lifted but still a fair-use PRO_DAILY_LIMIT per day (ai_usage_daily).
// No new tables needed — both are already tool-keyed.
//
// Takes a compact STRUCTURED summary of the site's content (business
// name, tagline, about text, services, which contact channels/photos/
// video are filled in, whether about/contact are separate pages), not
// the rendered HTML — cheaper, and the model reasons about completeness
// and clarity far more reliably from "here's what's filled in and what
// isn't" than from parsing markup. See js/site-ai-review.js's
// siteAiReviewSummary() for exactly what's sent.
//
// Gated by real auth, same as ats-check: the caller's own Supabase
// session token goes in Authorization, verified server-side via
// admin.auth.getUser(token) — never a client-supplied user id.
//
// Deploy: `supabase functions deploy site-ai-review` (or paste into
// Supabase Dashboard → Edge Functions → New Function). Reuses the same
// OPENAI_API_KEY secret ats-check already needs — nothing new to set.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "site-ai-review";
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI review isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const cappedBody = await readJsonCapped(req);
    if (!cappedBody) return jsonResponse({ error: "request too large" }, 413);
    const { summary } = cappedBody as any;
    if (!summary || typeof summary !== "object") {
      return jsonResponse({ error: "missing summary" }, 400);
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
              "You are a website-content reviewer for small-business owners building their own site from a template (they cannot change layout or code, only text/photos/contact details). You'll receive a JSON summary of what they've filled in so far — not the rendered page. Respond with ONLY a JSON object shaped exactly like: " +
              '{"score": <integer 1-100>, "strengths": [<up to 3 short strings>], "tips": [<2-4 short, concrete, actionable strings>]}. ' +
              'Write every string value in Hebrew. "score" reflects how complete, clear and trustworthy the site content is for a real visitor deciding whether to contact this business — be honest and specific, not generous by default (an empty about section, no contact details, or vague one-word services should cost real points). "strengths" are specific things this particular business actually did well (not generic praise). "tips" are concrete next actions tied to what is actually missing or weak in THIS summary (e.g. name a specific service with no price/description, or say the about text is missing), never generic advice like "add more content".',
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
    let parsed: { score?: number; strengths?: string[]; tips?: string[] };
    try {
      parsed = JSON.parse(raw);
    } catch (_e) {
      return jsonResponse({ error: "the AI returned an unreadable response — please try again" }, 502);
    }

    return jsonResponse({
      score: parsed.score ?? null,
      strengths: parsed.strengths || [],
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
