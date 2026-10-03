// AI Website Generator (architecture plan, Phase 5). Takes basic business
// info (name, type, short description, services, target audience, site
// goal) and returns a structured Site Schema object — the exact same
// shape the Builder already reads/writes (template + a subset of
// SITE_DEFAULT's own fields: businessName/tagline/about/services/
// headings) — NEVER HTML. The client takes this response, runs it
// through the SAME ensurePagesShape()/freshSiteData() merge every other
// site already goes through, and opens it in the one Central Builder.
// There is no separate AI renderer and no separate AI editor: this
// function's only job is to produce a valid starting point for the
// existing pipeline.
//
// Cloned from ../site-ai-review/index.ts: same auth model (the caller's
// own Supabase session token, verified server-side via
// admin.auth.getUser — never a client-supplied user id), same
// ai_usage/ai_usage_daily rate-limiting pattern (no new tables), same
// OPENAI_API_KEY secret, same "model output is never trusted as-is"
// posture — every field is validated and clamped below before it's
// returned, and any unrecognized field (an "html" key, a CSS string,
// anything outside the fixed allowlist) is simply dropped.
//
// Deliberately does NOT accept or return contact details (phone/email/
// whatsapp/address) at all — those stay exactly where they already are,
// filled in by the user themselves in the Builder's own "פרטי יצירת
// קשר" section after the site is generated. This rules out the AI ever
// inventing a fake phone number or address for a business it knows
// nothing about.
//
// Deploy: paste into Supabase Dashboard → Edge Functions → New Function
// → name it "generate-site" (or `supabase functions deploy
// generate-site`). Reuses the existing OPENAI_API_KEY secret — nothing
// new to configure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const TOOL = "generate-site";
const FREE_ATTEMPT_LIMIT = 3;
const PRO_DAILY_LIMIT = 20;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Kept in sync BY HAND with js/site-templates.js's SITE_TEMPLATES — this
// Edge Function runs in Deno, a separate runtime with no access to that
// browser file, so there is no way to import it directly; duplicating
// just the 4 fields the model needs to pick a sensible starting point
// (never the render functions themselves) is the smallest real
// duplication that still lets this function validate the model's choice
// against the actual, current list of templates rather than trusting it
// blindly. If a template is ever added/removed/renamed in
// site-templates.js, update this list too.
const KNOWN_TEMPLATES = [
  { key: "studio", label: "סטודיו מעוצב", category: "יוצרים וסטודיו", desc: "הירו א-סימטרי כהה, ניווט צדי אנכי, וטקסטים שנכנסים באנימציה בגלילה" },
  { key: "noir", label: "יוקרתי כהה", category: "אירועים ובוטיק", desc: "רקע כהה, טיפוגרפיה איטלקית עדינה, ורשימת שירותים בסגנון תפריט" },
  { key: "bold", label: "נועז ומודרני", category: "יוצרים וסטודיו", desc: "מסגרות עבות, צללים חדים, טיפוגרפיה גדולה" },
  { key: "elegant", label: "אלגנטי ומעוצב", category: "אירועים ובוטיק", desc: "טיפוגרפיה עדינה, תמונה מפוצלת, מתאים לאירועים ועסקי בוטיק" },
  { key: "gallery", label: "גלריה מודרנית", category: "יוצרים וסטודיו", desc: "תמונה מלאה ברקע, עיצוב עיתונאי ואלגנטי" },
  { key: "portfolio", label: "תיק עבודות יצירתי", category: "תדמית אישית", desc: "כותרת אישית גדולה ורשימת עבודות ממוספרת, בסגנון פורטפוליו" },
  { key: "boutique", label: "חנות בוטיק", category: "קטלוג ומכירות", desc: "מוצר מומלץ בכרטיס גדול, ואחריו רשת המוצרים הנוספים" },
  { key: "process", label: "תהליך עבודה", category: "עסקי שירות", desc: "ציר זמן ממוספר שמראה איך אתם עובדים, שלב אחר שלב" },
  { key: "local-service", label: "עסק שירות מקומי", category: "עסקי שירות", desc: "Hero גדול, כרטיסי שירותים, וואטסאפ צף" },
  { key: "freelancer", label: "פרילנסר / יועץ", category: "תדמית אישית", desc: "מינימלי וממורכז, מתאים למותג אישי" },
  { key: "catalog", label: "קטלוג קטן", category: "קטלוג ומכירות", desc: "רשת מוצרים עם תגי מחיר וניווט עליון" },
  { key: "bento", label: "רשת משבצות דינמית", category: "עסקי שירות", desc: "לוח משבצות א-סימטרי בסגנון בנטו, עם שעון חי ותוכן מודולרי לכל עסק" },
  { key: "cinematic", label: "קולנועי כהה", category: "תדמית אישית", desc: "מוד כהה יוקרתי עם זכוכית מטושטשת, הילה שעוקבת אחרי העכבר וטיפוגרפיה ענקית" },
  { key: "brutal", label: "נאו-ברוטליזם נועז", category: "קטלוג ומכירות", desc: "רקעי צבע עזים, מסגרות שחורות עבות, וכפתורי לחיצה בסגנון ארקייד" },
  { key: "neon", label: "העתיד הניאוני", category: "יוצרים וסטודיו", desc: "רקע מש-גרדיאנט ניאוני זז, זכוכית מטושטשת, וכותרות שנפתחות דרמטית בגלילה" },
  { key: "chaos", label: "הכאוס המאורגן", category: "קטלוג ומכירות", desc: "טיפוגרפיה ענקית, גרדיאנטים חומציים, גלילה אופקית וכפתורים מגנטיים" },
  { key: "luxury3d", label: "יוקרה מינימליסטית תלת-ממדית", category: "אירועים ובוטיק", desc: "פרלקס תלת-ממדי עמוק, גווני פנינה וזהב חיוור, ומעבר כניסה בסגנון עדשת מצלמה" },
  { key: "playground", label: "מגרש המשחקים הפיזיקלי", category: "יוצרים וסטודיו", desc: "בועות שירותים עם פיזיקה אמיתית שאפשר לגרור ולזרוק, כותרת מסך-גרדיאנט וכפתור נוזלי" },
];
const KNOWN_TEMPLATE_KEYS = new Set(KNOWN_TEMPLATES.map((t) => t.key));
const DEFAULT_TEMPLATE = "local-service";

function clampStr(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, maxLen);
}

// Never trusts the model's output shape directly — every field is
// pulled out individually, type-checked and length-clamped; anything
// not explicitly handled here (an "html"/"css"/"script" key, or any
// other field the model might invent) is silently dropped rather than
// passed through. A business name the USER typed always wins over
// whatever the model echoed back, by design (see the file header).
function normalizeGeneratedSite(raw: unknown, userBusinessName: string): Record<string, unknown> {
  const obj = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};

  const template = (typeof obj.template === "string" && KNOWN_TEMPLATE_KEYS.has(obj.template)) ? obj.template : DEFAULT_TEMPLATE;

  const servicesRaw = Array.isArray(obj.services) ? obj.services : [];
  const services = servicesRaw.slice(0, 6).map((s) => {
    const item = (s && typeof s === "object") ? s as Record<string, unknown> : {};
    return { name: clampStr(item.name, 40), desc: clampStr(item.desc, 90), price: "" };
  }).filter((s) => s.name);

  const headingsRaw = (obj.headings && typeof obj.headings === "object") ? obj.headings as Record<string, unknown> : {};
  const headings: Record<string, string> = {};
  for (const key of ["services", "about", "contact"]) {
    const v = clampStr(headingsRaw[key], 40);
    if (v) headings[key] = v;
  }

  return {
    template,
    businessName: clampStr(userBusinessName, 40),
    tagline: clampStr(obj.tagline, 90),
    about: clampStr(obj.about, 500),
    services,
    headings,
  };
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

  if (!OPENAI_API_KEY) return jsonResponse({ error: "AI website generation isn't set up yet (OPENAI_API_KEY missing)" }, 500);

  try {
    const body = await req.json();
    const businessName = clampStr(body.businessName, 40);
    const businessType = clampStr(body.businessType, 60);
    const description = clampStr(body.description, 600);
    const targetAudience = clampStr(body.targetAudience, 200);
    const goal = clampStr(body.goal, 200);
    const extra = clampStr(body.extra, 400);

    if (!businessName || !businessType) {
      return jsonResponse({ error: "missing businessName or businessType" }, 400);
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

    const templateListForPrompt = KNOWN_TEMPLATES.map((t) => `${t.key}: ${t.label} (${t.category}) — ${t.desc}`).join("\n");

    let openaiRes: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
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
                "You help a small-business owner start a business website. You will receive basic info about their business and must respond with ONLY a JSON object shaped exactly like: " +
                '{"template": "<one key from the provided list>", "tagline": "<short string>", "about": "<2-4 sentences>", "services": [{"name": "<string>", "desc": "<short string>"} , ...3 to 6 items], "headings": {"services": "<optional short string>", "about": "<optional short string>", "contact": "<optional short string>"}}. ' +
                "Pick the single template key that best fits the business's type and vibe from this exact list (never invent a key not listed):\n" + templateListForPrompt + "\n\n" +
                "Write every string value in Hebrew, even if the input is in another language. Write a warm, specific, realistic tagline and about text based on what the business actually does — never generic filler, never invented facts (no fake awards, years in business, team size, or locations the input didn't mention). Services must be concrete and specific to this business, not generic placeholders. " +
                "Do NOT include any contact details (no phone, email, address, or WhatsApp) anywhere in your response — those are filled in separately by the business owner. Do NOT include HTML, CSS, or any markup — plain text only.",
            },
            {
              role: "user",
              content: `Business name: ${businessName}\nBusiness type: ${businessType}\nDescription: ${description || "(not provided)"}\nTarget audience: ${targetAudience || "(not provided)"}\nSite goal: ${goal || "(not provided)"}\nExtra info: ${extra || "(not provided)"}`,
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

    const site = normalizeGeneratedSite(parsed, businessName);

    const newCount = currentCount + 1;
    const upsertRow: Record<string, unknown> = { user_id: userId, tool: TOOL, count: newCount, updated_at: new Date().toISOString() };
    const onConflict = isPro ? "user_id,tool,day" : "user_id,tool";
    if (isPro) upsertRow.day = today;
    const { error: upsertErr } = await admin.from(usageTable).upsert(upsertRow, { onConflict });
    if (upsertErr) return jsonResponse({ error: upsertErr.message }, 500);

    return jsonResponse({ site, isPro, count: newCount, limit });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
