/* AI Website Generator (architecture plan, Phase 5) — "✨ בניית אתר עם
   AI" on sites.html. Collects a few basic facts about the business,
   sends them to the generate-site Edge Function (the only place that
   calls OpenAI and enforces the attempt cap — same ai_usage/
   ai_usage_daily tables and modal shape as site-ai-review.js, just a
   different `tool` key), and gets back a validated Site Schema object.

   Critically, this file NEVER introduces a second Builder or a second
   renderer: once the Edge Function responds, the result is merged into
   the exact same shape freshSiteData() already produces, assigned to
   the same module-scope `siteState` every other entry point uses, saved
   through the same saveSiteNow()/saveSiteState() functions, and shown
   through the same showWizard(). An AI-generated site is just a
   different way of arriving at a normal siteState — from here on it IS
   a normal project, editable, savable and publishable through the
   unchanged pipeline.

   Deliberately does NOT reload the page to get there: a signed-in user
   with no existing cloud project for the chosen template would hit
   site-cloud-save.js's own anti-leakage reset (same mechanism that
   discards a stale OTHER account's local draft) on a fresh page load
   before that project exists in site_projects — so the real project row
   is created (via saveSiteNow()) BEFORE the Builder is shown, and the
   URL is updated in place with history.replaceState rather than a real
   navigation. By the time anyone reloads, the row already exists and
   loads back correctly like any other saved project. */

const SITE_AI_GENERATE_FIELDS = [
  { id: "ai-gen-name", key: "businessName", label: "שם העסק", required: true, maxlength: 40 },
  { id: "ai-gen-type", key: "businessType", label: "סוג העסק", required: true, maxlength: 60, placeholder: "לדוגמה: מאפייה, מעצבת גרפית, מאמן כושר" },
  { id: "ai-gen-desc", key: "description", label: "קצת על העסק", textarea: true, maxlength: 600, placeholder: "מה אתם עושים, למי, מה מייחד אתכם..." },
  { id: "ai-gen-audience", key: "targetAudience", label: "קהל היעד (אופציונלי)", maxlength: 200 },
  { id: "ai-gen-goal", key: "goal", label: "מה המטרה המרכזית של האתר? (אופציונלי)", maxlength: 200, placeholder: "לדוגמה: הזמנות דרך וואטסאפ, להיראות מקצועי, להציג תיק עבודות" },
  { id: "ai-gen-extra", key: "extra", label: "משהו נוסף שחשוב שנדע? (אופציונלי)", textarea: true, maxlength: 400 },
];

function siteAiGenerateFormHtml() {
  return `
    <form id="ai-gen-form">
      ${SITE_AI_GENERATE_FIELDS.map((f) => `
        <div class="field">
          <label for="${f.id}">${escapeHtmlS(f.label)}</label>
          ${f.textarea
            ? `<textarea id="${f.id}" rows="3" maxlength="${f.maxlength}" placeholder="${escapeHtmlS(f.placeholder || "")}"></textarea>`
            : `<input id="${f.id}" type="text" maxlength="${f.maxlength}" placeholder="${escapeHtmlS(f.placeholder || "")}">`}
        </div>`).join("")}
      <button type="submit" class="btn btn-teal" style="width:100%;">✨ יצירת האתר שלי</button>
    </form>
  `;
}

async function siteAiGenerateSubmit(overlay) {
  const body = overlay.querySelector(".ats-modal-body");
  const values = {};
  for (const f of SITE_AI_GENERATE_FIELDS) {
    values[f.key] = (document.getElementById(f.id).value || "").trim();
  }
  if (!values.businessName || !values.businessType) return;

  body.innerHTML = `<div class="ats-error" style="background:var(--ice); color:var(--teal-dark);">ה-AI בונה עבורכם הצעה ראשונית לאתר… זה יכול לקחת כמה שניות.</div>`;

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("sites.html"); return; }

    const res = await fetch(SUPABASE_URL + "/functions/v1/generate-site", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      body.innerHTML = data.isPro
        ? `<div class="ats-error">הגעת למכסת השימוש ההוגן היומית ליצירת אתרים עם AI. אפשר להמשיך מחר.</div>`
        : `<div class="ats-upgrade-card"><p>הגעת למכסת הניסיונות החינמיים ליצירת אתר עם AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!</p><a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a></div>`;
      return;
    }

    // The one merge point: AI output -> the SAME shape freshSiteData()
    // already produces, never a parallel schema. Services/headings only
    // override the template defaults when the AI actually returned
    // something real for them — an empty AI services list keeps
    // freshSiteData's own single placeholder row, exactly like a brand
    // new manually-started project would show.
    const site = data.site || {};
    const newData = freshSiteData(site.template);
    newData.businessName = values.businessName;
    if (site.tagline) newData.tagline = site.tagline;
    if (site.about) newData.about = site.about;
    if (Array.isArray(site.services) && site.services.length) newData.services = site.services;
    if (site.headings) Object.assign(newData.headings, site.headings);

    siteState = { template: site.template, data: newData };
    if (typeof saveSiteNow === "function") await saveSiteNow();
    saveSiteState();

    overlay.remove();
    history.replaceState(null, "", "sites.html?template=" + encodeURIComponent(site.template));
    showWizard();
    if (typeof refreshUnlockUI === "function") refreshUnlockUI();
  } catch (err) {
    body.innerHTML = `<div class="ats-error">משהו השתבש ביצירת האתר. אפשר לנסות שוב בעוד רגע. (${escapeHtmlS(err.message || String(err))})</div>`;
  }
}

async function openSiteAiGenerate() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session || !sessionData.session.user) {
    location.href = "account.html?redirect=" + encodeURIComponent("sites.html");
    return;
  }

  if (document.getElementById("site-ai-generate-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "site-ai-generate-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal ats-modal" role="dialog" aria-modal="true" aria-labelledby="site-ai-generate-title">
      <button type="button" class="domain-guide-close" id="site-ai-generate-close" aria-label="סגירה">✕</button>
      <h2 id="site-ai-generate-title">בניית אתר עם AI</h2>
      <p class="lead">מספרים בכמה מילים על העסק, וה-AI מכין הצעה ראשונית לאתר — שם התבנית, תיאור, ורשימת שירותים. אפשר (וכדאי) לערוך הכל אחר כך בבילדר.</p>
      <div class="ats-modal-body">${siteAiGenerateFormHtml()}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("site-ai-generate-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  document.getElementById("ai-gen-form").addEventListener("submit", (e) => {
    e.preventDefault();
    siteAiGenerateSubmit(overlay);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("site-ai-generate-btn");
  if (btn) btn.addEventListener("click", openSiteAiGenerate);
});
