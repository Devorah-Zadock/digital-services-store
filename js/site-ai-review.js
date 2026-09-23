/* "עזרה עם AI" on the site builder — the AI looks over the site currently
   open (business name, tagline, about text, services, which contact
   channels/photos/video are filled in) and comes back with a 1-100
   score, what's already working, and concrete next steps. Talks to the
   site-ai-review Edge Function, which is the only place that calls
   OpenAI and enforces the attempt cap — same reasoning and same shared
   ai_usage/ai_usage_daily tables as js/ats-checker.js, just a different
   `tool` key, so nothing new had to be added to Supabase for this.

   Self-contained and built on demand, same as ats-checker.js — reuses
   its exact modal/score/tips CSS classes (.ats-*, .domain-guide-*)
   rather than inventing near-identical ones, since the widget shape is
   the same: a score badge plus two short lists.

   Reads siteState (the live template key + content) straight from
   site-builder.js — both are loaded as plain scripts on sites.html and
   share one global scope. */

const SITE_AI_UPGRADE_MESSAGE = "הגעת למכסת הניסיונות החינמיים של עזרה עם AI. רוצה להמשיך להשתמש בה ללא הגבלה? שדרג לגרסת Pro בתשלום חד-פעמי!";

let siteAiIsProCache = null;

async function siteAiFetchIsPro() {
  if (siteAiIsProCache !== null) return siteAiIsProCache;
  try {
    const { data } = await supabaseClient.from("customer_profiles").select("is_pro").maybeSingle();
    siteAiIsProCache = !!(data && data.is_pro);
  } catch (e) {
    siteAiIsProCache = false;
  }
  return siteAiIsProCache;
}

/* Structured content only, never the rendered HTML — see the Edge
   Function's own comment for why. Booleans instead of raw phone/email/
   address values on purpose: the model only needs to know a contact
   channel exists, not what it actually is. */
function siteAiReviewSummary() {
  const d = siteState.data || {};
  const tpl = (typeof SITE_TEMPLATES !== "undefined" && SITE_TEMPLATES[siteState.template]) || null;
  const services = typeof servicesData === "function" ? servicesData(d) : (d.services || []).filter((s) => s.name && s.name.trim());
  return {
    template: tpl ? tpl.label : siteState.template,
    businessName: (d.businessName || "").trim(),
    tagline: (d.tagline || "").trim(),
    about: (d.about || "").trim(),
    hasPhoto: !!(d.heroImage || (d.heroImages && d.heroImages.length)),
    hasVideo: !!d.videoUrl,
    hasPhone: !!d.phone,
    hasEmail: !!d.email,
    hasWhatsapp: !!d.whatsapp,
    hasAddress: !!d.address,
    services: services.map((s) => ({
      name: s.name,
      hasDescription: !!(s.desc && s.desc.trim()),
      hasPrice: !!(s.price && s.price.trim()),
    })),
    separateAboutPage: !!(d.pages && d.pages.about),
    separateContactPage: !!(d.pages && d.pages.contact),
  };
}

function siteAiScoreColor(score) {
  if (score >= 80) return "#1F5C4E";
  if (score >= 50) return "#C99A3B";
  return "#B0392B";
}

function escapeHtmlSiteAi(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function siteAiShowUpgradeCard(isDailyProLimit) {
  const modal = document.querySelector("#site-ai-review-overlay .ats-modal");
  if (!modal) return;
  const body = modal.querySelector(".ats-modal-body");
  if (isDailyProLimit) {
    body.innerHTML = `<div class="ats-error">הגעת למכסת השימוש ההוגן היומית (50 בדיקות). אפשר להמשיך מחר.</div>`;
  } else {
    body.innerHTML = `
      <div class="ats-upgrade-card">
        <p>${SITE_AI_UPGRADE_MESSAGE}</p>
        <a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a>
      </div>
    `;
  }
}

function siteAiResultHtml() {
  return `
    <div class="ats-result" id="site-ai-result">
      <div class="ats-score-row">
        <div class="ats-score-badge" id="site-ai-score-badge">--</div>
        <div class="ats-score-label">ציון האתר שלך</div>
      </div>
      <h3>מה עובד טוב</h3>
      <div class="ats-keywords" id="site-ai-strengths"></div>
      <h3>מה כדאי לשפר</h3>
      <ul class="ats-tips" id="site-ai-tips"></ul>
    </div>
    <div class="ats-attempts" id="site-ai-attempts-note"></div>
  `;
}

async function siteAiRunReview() {
  const body = document.querySelector("#site-ai-review-overlay .ats-modal-body");
  if (!body) return;
  body.innerHTML = `<div class="ats-error" id="site-ai-loading" style="background:var(--ice); color:var(--teal-dark);">ה-AI עובר על האתר שלכם…</div>`;

  // Best-effort: if the user is signed in, save first so the review
  // reflects whatever's actually on screen right now, not the last
  // manual save. A visitor who isn't signed in simply can't save to
  // begin with — the review still runs off the in-memory siteState.
  try { if (typeof saveSiteNow === "function") await saveSiteNow(); } catch (e) { /* best-effort */ }

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const res = await fetch(SUPABASE_URL + "/functions/v1/site-ai-review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ summary: siteAiReviewSummary() }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      siteAiShowUpgradeCard(data.isPro);
      return;
    }

    body.innerHTML = siteAiResultHtml();

    const scoreEl = document.getElementById("site-ai-score-badge");
    scoreEl.textContent = data.score != null ? `${data.score}/100` : "—";
    scoreEl.style.background = data.score != null ? siteAiScoreColor(data.score) : "#DADFDD";

    const strengthsEl = document.getElementById("site-ai-strengths");
    strengthsEl.innerHTML = (data.strengths || []).length
      ? data.strengths.map((s) => `<span class="ats-keyword-chip" style="color:#1F5C4E; background:#E7F3EE;">${escapeHtmlSiteAi(s)}</span>`).join("")
      : `<span class="ats-keywords-empty">עדיין אין הרבה לעבוד איתו — התחילו למלא פרטים.</span>`;

    const tipsEl = document.getElementById("site-ai-tips");
    tipsEl.innerHTML = (data.tips || []).map((t) => `<li>${escapeHtmlSiteAi(t)}</li>`).join("");

    const attemptsNote = document.getElementById("site-ai-attempts-note");
    attemptsNote.textContent = data.isPro
      ? `Pro — נותרו לך ${Math.max(0, data.limit - data.count)} מתוך ${data.limit} בדיקות להיום.`
      : `נותרו לך ${Math.max(0, data.limit - data.count)} מתוך ${data.limit} בדיקות חינם.`;
  } catch (err) {
    body.innerHTML = `<div class="ats-error">משהו השתבש בבדיקה. אפשר לנסות שוב בעוד רגע. (${escapeHtmlSiteAi(err.message || err)})</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("site-ai-review-btn");
  if (btn) btn.addEventListener("click", openSiteAiReview);
});

async function openSiteAiReview() {
  if (document.getElementById("site-ai-review-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "site-ai-review-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal ats-modal" role="dialog" aria-modal="true" aria-labelledby="site-ai-review-title">
      <button type="button" class="domain-guide-close" id="site-ai-review-close" aria-label="סגירה">✕</button>
      <h2 id="site-ai-review-title">עזרה עם AI</h2>
      <p class="lead">ה-AI עובר על מה שבניתם עד כה באתר ונותן ציון, מה כבר עובד טוב, ומה כדאי לשפר — לפני שמורידים.</p>
      <div class="ats-modal-body">בודקים את היתרה שלך...</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("site-ai-review-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  const isPro = await siteAiFetchIsPro();
  if (!document.getElementById("site-ai-review-overlay")) return; // closed while awaiting

  const body = document.querySelector("#site-ai-review-overlay .ats-modal-body");

  if (isPro) {
    await siteAiRunReview();
    return;
  }

  try {
    const { data } = await supabaseClient.from("ai_usage").select("count").eq("tool", "site-ai-review").maybeSingle();
    const used = data ? data.count : 0;
    if (used >= 3) {
      siteAiShowUpgradeCard(false);
      return;
    }
  } catch (e) {
    /* falls through to running the review — the server enforces the real cap either way */
  }
  await siteAiRunReview();
}
