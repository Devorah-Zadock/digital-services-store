/* The smart onboarding Wizard (architecture plan) — DeskKit's default
   way to start a site: "בניית אתר" (not "בניית אתר עם AI" — per explicit
   product direction, this is not presented as a separate/premium
   product, just how DeskKit works). One question per screen, driven
   entirely by js/site-wizard-questions.js's declarative config — this
   file is a generic step ENGINE that reads that config, never a
   hardcoded sequence of screens. Adding/removing/branching a question
   is a data change over there, not a code change here.

   Deliberately structured/deterministic throughout the Wizard itself —
   every step is a plain choice, search/autocomplete filter, or a text
   field; there is exactly ONE AI call in the whole flow, fired once at
   the very end against the fully collected structured answers (see
   siteAiGenerateSubmit). This is what keeps AI usage (and cost) to one
   call per site generated, not one per click, per explicit instruction.

   Once the Edge Function responds, the result is merged into the exact
   same shape freshSiteData() already produces, assigned to the same
   module-scope `siteState` every other entry point uses, saved through
   the same saveSiteNow()/saveSiteState() functions, and shown through
   the same showWizard() — an AI-generated site is a normal project from
   that point on, through the unchanged Builder/renderer/publish
   pipeline. Avoids a real page reload to get there, same reasoning as
   before: site-cloud-save.js's own anti-leakage reset would otherwise
   discard this in-memory state before the new project exists in
   site_projects, so the real row is created (saveSiteNow()) before the
   Builder is shown, and the URL is updated in place with
   history.replaceState. */

let siteWizardAnswers = {};
let siteWizardStepIndex = 0;
let siteWizardOtherDrafts = {}; // remembers typed "אחר" text per question id across back/forward

function siteWizardCurrentQuestions() {
  return siteWizardVisibleQuestions(siteWizardAnswers);
}

function siteWizardChipHtml(question, opt) {
  const selected = siteWizardAnswers[question.id] === opt.value;
  return `<button type="button" class="wizard-chip${selected ? " selected" : ""}" data-chip-value="${escapeHtmlS(opt.value)}">${escapeHtmlS(opt.label)}</button>`;
}

/* Visual swatch grid for the one question this applies to (id==="style")
   — same button[data-chip-value] contract as a normal choice question
   (see siteWizardWireStep), just different markup/classes, so none of
   the click/advance wiring below needs to know this question is
   special. */
const DK_STYLE_SWATCH_CLASS = { auto: "dk-style-chip-auto", minimal: "dk-style-swatch-minimal", luxury: "dk-style-swatch-luxury", bold: "dk-style-swatch-bold", warm: "dk-style-swatch-warm", modern: "dk-style-swatch-modern" };
function siteWizardStyleGridHtml(question) {
  return `<div class="wizard-chip-grid dk-style-grid" id="wizard-chip-grid">
    ${(question.options || []).map((o) => {
      const selected = siteWizardAnswers[question.id] === o.value;
      const extraClass = o.value === "auto" ? " dk-style-chip-auto" : "";
      return `<button type="button" class="dk-style-chip${selected ? " selected" : ""}${extraClass}" data-chip-value="${escapeHtmlS(o.value)}">
        ${o.value !== "auto" ? `<span class="dk-style-swatch ${DK_STYLE_SWATCH_CLASS[o.value] || ""}"></span>` : ""}
        <span>${escapeHtmlS(o.label)}</span>
      </button>`;
    }).join("")}
  </div>`;
}

/* Multi-select chips (id==="sections") — stored as an array in
   siteWizardAnswers[question.id], toggled independently (no
   auto-advance on click, unlike a single-choice question), the
   existing wizard-next/back/skip row (siteWizardStepHtml) still
   drives moving on. */
function siteWizardMultiselectHtml(question) {
  const selected = siteWizardAnswers[question.id] || [];
  return `<div class="dk-multiselect-grid" id="wizard-ms-grid">
    ${(question.options || []).map((o) => `
      <button type="button" class="dk-ms-chip${selected.includes(o.value) ? " selected" : ""}" data-ms-value="${escapeHtmlS(o.value)}">${escapeHtmlS(o.label)}</button>
    `).join("")}
  </div>`;
}

function siteWizardStepBodyHtml(question) {
  if (question.id === "style") return siteWizardStyleGridHtml(question);
  if (question.type === "multiselect") return siteWizardMultiselectHtml(question);
  if (question.type === "choice") {
    const otherSelected = question.allowOther && siteWizardAnswers[question.id] && !(question.options || []).some((o) => o.value === siteWizardAnswers[question.id]);
    return `
      ${question.searchable ? `<input type="text" id="wizard-search" class="wizard-search" placeholder="הקלידו לחיפוש..." autocomplete="off">` : ""}
      <div class="wizard-chip-grid" id="wizard-chip-grid">
        ${(question.options || []).map((o) => siteWizardChipHtml(question, o)).join("")}
        ${question.allowOther ? `<button type="button" class="wizard-chip wizard-chip-other${otherSelected ? " selected" : ""}" data-chip-other="1">✏️ אחר</button>` : ""}
      </div>
      ${question.allowOther ? `<input type="text" id="wizard-other-input" class="wizard-other-input" placeholder="כתבו כאן..." maxlength="60" ${otherSelected ? "" : "hidden"} value="${escapeHtmlS(otherSelected ? siteWizardAnswers[question.id] : (siteWizardOtherDrafts[question.id] || ""))}">` : ""}
    `;
  }
  const value = escapeHtmlS(siteWizardAnswers[question.id] || "");
  if (question.type === "textarea") {
    return `<textarea id="wizard-text-input" rows="3" maxlength="${question.maxlength || 300}" placeholder="${escapeHtmlS(question.placeholder || "")}">${value}</textarea>`;
  }
  return `<input type="text" id="wizard-text-input" maxlength="${question.maxlength || 100}" placeholder="${escapeHtmlS(question.placeholder || "")}" value="${value}">`;
}

function siteWizardStepHtml() {
  const questions = siteWizardCurrentQuestions();
  const question = questions[siteWizardStepIndex];
  if (!question) return "";
  const isLast = siteWizardStepIndex === questions.length - 1;
  return `
    <div class="wizard-progress">שאלה ${siteWizardStepIndex + 1} מתוך ${questions.length}</div>
    <div class="wizard-progress-bar"><div class="wizard-progress-fill" style="width:${Math.round(((siteWizardStepIndex + 1) / questions.length) * 100)}%"></div></div>
    <h3 class="wizard-question">${escapeHtmlS(question.label)}</h3>
    <div id="wizard-step-body">${siteWizardStepBodyHtml(question)}</div>
    <div class="wizard-nav-row">
      <button type="button" class="btn-mini" id="wizard-back" ${siteWizardStepIndex === 0 ? "disabled" : ""}>→ הקודם</button>
      ${question.optional ? `<button type="button" class="btn-mini" id="wizard-skip">דלג</button>` : ""}
      <button type="button" class="btn btn-teal" id="wizard-next">${isLast ? "✨ יצירת האתר שלי" : "הבא ←"}</button>
    </div>
    <div class="wizard-note" id="wizard-note"></div>
  `;
}

function siteWizardCurrentAnswerValue(question) {
  if (question.type === "multiselect") return siteWizardAnswers[question.id] || [];
  if (question.type !== "choice") {
    const el = document.getElementById("wizard-text-input");
    return el ? el.value.trim() : "";
  }
  const otherInput = document.getElementById("wizard-other-input");
  if (otherInput && !otherInput.hidden) return otherInput.value.trim();
  return siteWizardAnswers[question.id] || "";
}

function siteWizardRenderStep() {
  const body = document.querySelector("#site-ai-generate-overlay .ats-modal-body");
  if (!body) return;
  const questions = siteWizardCurrentQuestions();
  if (siteWizardStepIndex >= questions.length) siteWizardStepIndex = Math.max(0, questions.length - 1);
  body.innerHTML = siteWizardStepHtml();
  siteWizardWireStep();
}

function siteWizardWireStep() {
  const questions = siteWizardCurrentQuestions();
  const question = questions[siteWizardStepIndex];
  if (!question) return;

  if (question.type === "choice") {
    const grid = document.getElementById("wizard-chip-grid");
    const searchInput = document.getElementById("wizard-search");
    const otherInput = document.getElementById("wizard-other-input");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const term = searchInput.value.trim().toLowerCase();
        grid.querySelectorAll(".wizard-chip:not(.wizard-chip-other)").forEach((chip) => {
          chip.style.display = chip.textContent.toLowerCase().indexOf(term) !== -1 ? "" : "none";
        });
      });
    }
    grid.querySelectorAll("[data-chip-value]").forEach((chip) => {
      chip.addEventListener("click", () => {
        siteWizardAnswers[question.id] = chip.dataset.chipValue;
        siteWizardAdvance();
      });
    });
    const otherChip = grid.querySelector("[data-chip-other]");
    if (otherChip && otherInput) {
      otherChip.addEventListener("click", () => {
        grid.querySelectorAll(".wizard-chip").forEach((c) => c.classList.remove("selected"));
        otherChip.classList.add("selected");
        otherInput.hidden = false;
        otherInput.focus();
      });
      otherInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); siteWizardAdvance(); } });
    }
  } else if (question.type === "multiselect") {
    const grid = document.getElementById("wizard-ms-grid");
    if (!siteWizardAnswers[question.id]) siteWizardAnswers[question.id] = [];
    grid.querySelectorAll("[data-ms-value]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const val = chip.dataset.msValue;
        const arr = siteWizardAnswers[question.id];
        const i = arr.indexOf(val);
        if (i === -1) arr.push(val); else arr.splice(i, 1);
        chip.classList.toggle("selected");
      });
    });
  } else {
    const input = document.getElementById("wizard-text-input");
    if (input && question.type === "text") {
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); siteWizardAdvance(); } });
    }
  }

  document.getElementById("wizard-back").addEventListener("click", () => {
    if (siteWizardStepIndex === 0) return;
    siteWizardStepIndex -= 1;
    siteWizardRenderStep();
  });
  const skipBtn = document.getElementById("wizard-skip");
  if (skipBtn) skipBtn.addEventListener("click", () => { delete siteWizardAnswers[question.id]; siteWizardGoNext(); });
  document.getElementById("wizard-next").addEventListener("click", () => siteWizardAdvance());
}

function siteWizardAdvance() {
  const questions = siteWizardCurrentQuestions();
  const question = questions[siteWizardStepIndex];
  const value = siteWizardCurrentAnswerValue(question);
  if (!value && !question.optional) {
    const note = document.getElementById("wizard-note");
    if (note) note.textContent = "צריך לבחור או לכתוב תשובה כדי להמשיך.";
    return;
  }
  if (question.type === "choice" && question.allowOther) siteWizardOtherDrafts[question.id] = value;
  siteWizardAnswers[question.id] = value;
  siteWizardGoNext();
}

function siteWizardGoNext() {
  const questions = siteWizardCurrentQuestions();
  const isLast = siteWizardStepIndex === questions.length - 1;
  if (isLast) { siteWizardSubmit(); return; }
  siteWizardStepIndex += 1;
  siteWizardRenderStep();
}

/* The DeskKit Build Transition screen — purely visual (no real
   per-step progress signal exists, the one AI call below is a single
   request/response), but sequencing it like real progress is what
   keeps this from feeling like the request silently hung for a few
   seconds. Returns a small controller the caller advances once the
   real fetch settles. */
const DK_TRANSITION_STEPS = ["מבינים את העסק...", "בונים מבנה...", "מתאימים עיצוב...", "מכינים את האתר..."];
function dkTransitionHtml() {
  return `
    <div class="dk-transition-wrap">
      <h2>מעולה. יש לנו כיוון.</h2>
      <div class="dk-transition-steps" id="dk-transition-steps">
        ${DK_TRANSITION_STEPS.map((s, i) => `<div class="dk-transition-step${i === 0 ? " active" : ""}" data-step="${i}"><span class="dk-transition-dot"></span>${escapeHtmlS(s)}</div>`).join("")}
      </div>
    </div>`;
}
function dkRunTransitionSteps() {
  let i = 0;
  const steps = document.querySelectorAll("#dk-transition-steps .dk-transition-step");
  const timer = setInterval(() => {
    if (steps[i]) { steps[i].classList.remove("active"); steps[i].classList.add("done"); }
    i += 1;
    if (steps[i]) steps[i].classList.add("active");
    if (i >= steps.length) clearInterval(timer);
  }, 700);
  return { stop: () => { clearInterval(timer); steps.forEach((s) => { s.classList.remove("active"); s.classList.add("done"); }); } };
}

const DK_STYLE_LABELS = { auto: "", minimal: "מינימליסטי", luxury: "יוקרתי", bold: "נועז", warm: "חם", modern: "מודרני" };
const DK_SECTION_LABELS = { services: "שירותים", about: "אודות", testimonials: "המלצות", gallery: "גלריה", faq: "שאלות נפוצות", contact: "יצירת קשר", map: "מפה", whatsapp: "WhatsApp", hours: "שעות פעילות" };

/* The ONE AI call in the whole flow (plus, optionally, one more if the
   person explicitly asks to "שנה סגנון" on the preview screen below —
   still a deliberate user action each time, never a per-click/per-
   keystroke call). Conditional category answers
   (foodService/appointmentMethod/productsOffered/specialty), and now
   the style/sections answers too, aren't part of generate-site's own
   request shape — rather than widening that Edge Function's contract,
   they're folded into the existing free-text `extra` context it
   already reads, keeping that function's shape stable. */
function siteWizardBuildValues(styleOverrideHint) {
  const a = siteWizardAnswers;
  const typeQuestion = SITE_WIZARD_QUESTIONS.find((q) => q.id === "businessType");
  const businessType = siteWizardAnswerLabel(typeQuestion, a.businessType);

  const extraParts = [];
  if (a.foodService) extraParts.push(`אופן קבלת ההזמנה: ${siteWizardAnswerLabel(SITE_WIZARD_QUESTIONS.find((q) => q.id === "foodService"), a.foodService)}`);
  if (a.appointmentMethod) extraParts.push(`קביעת תורים: ${siteWizardAnswerLabel(SITE_WIZARD_QUESTIONS.find((q) => q.id === "appointmentMethod"), a.appointmentMethod)}`);
  if (a.productsOffered) extraParts.push(`מוצרים: ${a.productsOffered}`);
  if (a.specialty) extraParts.push(`תחום התמחות: ${a.specialty}`);
  if (a.style && a.style !== "auto" && DK_STYLE_LABELS[a.style]) extraParts.push(`סגנון עיצוב מועדף: ${DK_STYLE_LABELS[a.style]}`);
  if (Array.isArray(a.sections) && a.sections.length) extraParts.push(`חלקים שחשוב שיופיעו באתר: ${a.sections.map((s) => DK_SECTION_LABELS[s] || s).join(", ")}`);
  if (a.extra) extraParts.push(a.extra);
  if (styleOverrideHint) extraParts.push(styleOverrideHint);

  const goalQuestion = SITE_WIZARD_QUESTIONS.find((q) => q.id === "goal");
  return {
    businessName: a.businessName || "",
    businessType,
    description: a.description || "",
    targetAudience: a.targetAudience || "",
    goal: a.goal ? siteWizardAnswerLabel(goalQuestion, a.goal) : "",
    extra: extraParts.join("; "),
  };
}

async function dkCallGenerateSite(values) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("sites.html"); return null; }
  const res = await fetch(SUPABASE_URL + "/functions/v1/generate-site", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(values),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");
  return data;
}

async function siteWizardSubmit() {
  const body = document.querySelector("#site-ai-generate-overlay .ats-modal-body");
  const overlay = document.getElementById("site-ai-generate-overlay");
  if (!body || !overlay) return;
  body.innerHTML = dkTransitionHtml();
  const transition = dkRunTransitionSteps();

  const values = siteWizardBuildValues();
  try {
    // A minimum visible duration, not a real per-step progress signal
    // (there is only one request/response here) — on a fast network the
    // transition would otherwise flash past in under one animation
    // frame, undercutting the entire point of showing "DeskKit is
    // working" before the result appears.
    const [data] = await Promise.all([dkCallGenerateSite(values), new Promise((r) => setTimeout(r, 1800))]);
    if (!data) return; // redirected to login
    transition.stop();

    if (data.limitReached) {
      body.innerHTML = data.isPro
        ? `<div class="ats-error">הגעת למכסת השימוש ההוגן היומית ליצירת אתרים. אפשר להמשיך מחר.</div>`
        : `<div class="ats-upgrade-card"><p>הגעת למכסת הניסיונות החינמיים ליצירת אתר. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!</p><a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a></div>`;
      return;
    }

    if (!data.site || !data.site.template || typeof SITE_TEMPLATES === "undefined" || !SITE_TEMPLATES[data.site.template]) {
      throw new Error("לא התקבל עיצוב תקין מהשרת");
    }

    await dkApplyGeneratedSite(data.site, values);
    dkShowGeneratedPreview(overlay, body, values);
  } catch (err) {
    // The raw err.message used to be shown straight to the user in
    // parentheses — for a network failure that's the browser's own
    // English text ("Failed to fetch"), meaningless and alarming to a
    // non-technical Hebrew-speaking visitor. Logged for debugging
    // instead; the visible message stays a plain, actionable Hebrew
    // sentence regardless of what actually failed underneath.
    console.error("site generate failed:", err);
    body.innerHTML = `<div class="ats-error">משהו השתבש ביצירת האתר. אפשר לנסות שוב בעוד רגע.</div>`;
  }
}

/* Merges the generated result into the exact same shape freshSiteData()
   already produces and assigns the shared siteState every other entry
   point uses — unchanged from before this pass, just factored out so
   both the initial submit and a "שנה סגנון" regeneration (triggered
   from the new Generated Website Preview screen) share one path. Saves
   immediately (as before) so a real site_projects row exists the
   moment a person can act on it. */
async function dkApplyGeneratedSite(site, values) {
  const newData = freshSiteData(site.template);
  newData.businessName = values.businessName;
  if (site.tagline) newData.tagline = site.tagline;
  if (site.about) newData.about = site.about;
  if (Array.isArray(site.services) && site.services.length) newData.services = site.services;
  if (site.headings) Object.assign(newData.headings, site.headings);

  siteState = { template: site.template, data: newData };
  if (typeof saveSiteNow === "function") await saveSiteNow();
  saveSiteState();
}

/* Generated Website Preview — a real rendered preview (the same
   currentSiteHtml() every other screen uses) plus a short detected
   summary, before handing off into the Builder-Shell. "שנה סגנון" and
   "✨ שפר" both reuse existing infra rather than duplicating it: the
   former re-runs the one AI call with an extra style hint folded into
   `extra` (same contract as every other context fragment above), the
   latter opens the Shell's own existing "✨ עזרה מ-DeskKit" AI panel
   instead of inventing a second one. */
const DK_RESTYLE_HINTS = [
  { label: "יותר יוקרתי", hint: "יותר יוקרתי" },
  { label: "יותר מינימלי", hint: "יותר מינימליסטי" },
  { label: "יותר צבעוני", hint: "יותר צבעוני ותוסס" },
  { label: "יותר צעיר", hint: "יותר צעיר וקליל" },
  { label: "יותר מקצועי", hint: "יותר מקצועי ורשמי" },
  { label: "יותר נועז", hint: "יותר נועז ובולט" },
];

function dkShowGeneratedPreview(overlay, body, values) {
  const modal = overlay.querySelector(".domain-guide-modal");
  if (modal) { modal.style.maxWidth = "900px"; }
  const tplLabel = (typeof SITE_TEMPLATES !== "undefined" && SITE_TEMPLATES[siteState.template] && SITE_TEMPLATES[siteState.template].label) || siteState.template;
  const styleLabel = DK_STYLE_LABELS[siteWizardAnswers.style] || "מתאים לעסק שלכם";

  body.innerHTML = `
    <div class="dk-genpreview-wrap" style="padding:0;">
      <div class="dk-genpreview-head">
        <h1>הכנו לכם נקודת התחלה</h1>
        <div class="dk-genpreview-tags">
          <span class="dk-pill">${escapeHtmlS(values.businessName || "העסק שלכם")}</span>
          <span class="dk-pill">${escapeHtmlS(tplLabel)}</span>
          <span class="dk-pill">${escapeHtmlS(styleLabel)}</span>
        </div>
      </div>
      <div class="dk-genpreview-frame-wrap">
        <iframe id="dk-genpreview-frame" title="תצוגה מקדימה של האתר שנוצר"></iframe>
      </div>
      <div class="dk-genpreview-actions">
        <button type="button" class="dk-btn dk-btn-primary dk-btn-lg" id="dk-genpreview-open">נראה טוב — פתחו ב-Builder →</button>
        <button type="button" class="dk-btn dk-btn-ghost" id="dk-genpreview-restyle">שנה סגנון</button>
        <button type="button" class="dk-btn dk-btn-ghost" id="dk-genpreview-improve">✨ תנו ל-DeskKit לשפר</button>
      </div>
      <div id="dk-genpreview-restyle-opts" class="dk-genpreview-style-opts" hidden></div>
    </div>`;

  const frame = document.getElementById("dk-genpreview-frame");
  if (frame && typeof currentSiteHtml === "function") frame.srcdoc = currentSiteHtml("index");

  document.getElementById("dk-genpreview-open").addEventListener("click", () => dkEnterBuilderFromPreview(overlay));
  document.getElementById("dk-genpreview-improve").addEventListener("click", () => dkEnterBuilderFromPreview(overlay, { openAi: true }));
  document.getElementById("dk-genpreview-restyle").addEventListener("click", () => {
    const opts = document.getElementById("dk-genpreview-restyle-opts");
    opts.hidden = !opts.hidden;
    if (opts.hidden) return;
    opts.innerHTML = DK_RESTYLE_HINTS.map((o, i) => `<button type="button" class="dk-btn dk-btn-ghost" data-restyle-idx="${i}">${escapeHtmlS(o.label)}</button>`).join("");
    opts.querySelectorAll("[data-restyle-idx]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const hint = DK_RESTYLE_HINTS[Number(btn.dataset.restyleIdx)].hint;
        body.innerHTML = dkTransitionHtml();
        const transition = dkRunTransitionSteps();
        try {
          const revalues = siteWizardBuildValues(`בקשת שינוי סגנון: ${hint}`);
          const [data] = await Promise.all([dkCallGenerateSite(revalues), new Promise((r) => setTimeout(r, 1800))]);
          transition.stop();
          if (!data) return; // redirected to login

          // "שנה סגנון" fires a real second AI call (a deliberate user
          // action, same cost discipline as every other call here) — it
          // can hit the exact same daily/session fair-use limit the
          // FIRST generation can. Missing this check is what let
          // data.site end up undefined below and crash deep inside
          // currentSiteHtml() with no explanation (confirmed live: "Cannot
          // read properties of undefined (reading 'render')") instead of
          // showing this same limit message siteWizardSubmit already has.
          if (data.limitReached) {
            body.innerHTML = data.isPro
              ? `<div class="ats-error">הגעת למכסת השימוש ההוגן היומית ליצירת אתרים. אפשר להמשיך מחר.</div>`
              : `<div class="ats-upgrade-card"><p>הגעת למכסת הניסיונות החינמיים ליצירת אתר. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!</p><a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a></div>`;
            return;
          }
          if (!data.site || !data.site.template || typeof SITE_TEMPLATES === "undefined" || !SITE_TEMPLATES[data.site.template]) {
            throw new Error("לא התקבל עיצוב תקין מהשרת");
          }

          await dkApplyGeneratedSite(data.site, revalues);
          dkShowGeneratedPreview(overlay, body, revalues);
        } catch (err) {
          console.error("site restyle failed:", err);
          body.innerHTML = `<div class="ats-error">משהו השתבש. אפשר לנסות שוב.</div>`;
        }
      });
    });
  });
}

function dkEnterBuilderFromPreview(overlay, opts) {
  overlay.remove();
  // A Design Starting Point the Builder-Shell already supports opens
  // straight into it — the user never sees "Template X", only the
  // result and an editor. Every other template still falls back to the
  // existing sidebar wizard unchanged. The project's own id (?site=),
  // not its template slug, is what the URL now carries — see
  // js/site-cloud-save.js's dkResolveSiteParam — so a second site that
  // happens to share this same template is never confused with this one
  // on a later reload.
  const opensInShell = typeof bshellActivate === "function" && typeof BSHELL_SUPPORTED_TEMPLATES !== "undefined" && BSHELL_SUPPORTED_TEMPLATES.includes(siteState.template);
  const idParam = typeof siteProjectId !== "undefined" && siteProjectId ? "site=" + encodeURIComponent(siteProjectId) : "template=" + encodeURIComponent(siteState.template);
  history.replaceState(null, "", "sites.html?" + idParam + (opensInShell ? "&shell=1" : ""));
  if (opensInShell) {
    bshellActivate();
    if (opts && opts.openAi) {
      setTimeout(() => { const btn = document.getElementById("bshell-ai-btn"); if (btn) btn.click(); }, 300);
    }
  } else {
    showWizard();
  }
  if (typeof refreshUnlockUI === "function") refreshUnlockUI();
  if (window.refreshMyPanel) window.refreshMyPanel();
}

/* Mirrors supabase/functions/generate-site/index.ts's own free-attempt
   check (FREE_ATTEMPT_LIMIT = 3, tool "generate-site"), reading the same
   ai_usage row directly client-side (its RLS policy already lets a
   signed-in user read their own usage row — same pattern as
   siteAiFetchIsPro()/js/site-ai-review.js's upfront check for the AI
   Director). Lets the limit message show BEFORE the multi-step wizard
   opens instead of only after a person fills in every question and
   submits — confirmed live as a real complaint: filling the whole form
   just to be told afterward it was already maxed out. Best-effort: any
   failure here just falls through to opening the wizard as before, same
   as the AI Director's own check — the server still enforces the real
   cap either way. */
async function siteAiGenerateLimitReached() {
  try {
    const isPro = await siteAiFetchIsPro();
    if (isPro) return false; // server still enforces the Pro daily cap
    const { data } = await supabaseClient.from("ai_usage").select("count").eq("tool", "generate-site").maybeSingle();
    return (data ? data.count : 0) >= 3;
  } catch (e) {
    return false;
  }
}

async function openSiteAiGenerate() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session || !sessionData.session.user) {
    location.href = "account.html?redirect=" + encodeURIComponent("sites.html");
    return;
  }

  if (document.getElementById("site-ai-generate-overlay")) return;

  if (await siteAiGenerateLimitReached()) {
    const overlay = document.createElement("div");
    overlay.id = "site-ai-generate-overlay";
    overlay.className = "domain-guide-overlay";
    overlay.innerHTML = `
      <div class="domain-guide-modal ats-modal" role="dialog" aria-modal="true" aria-labelledby="site-ai-generate-title">
        <button type="button" class="domain-guide-close" id="site-ai-generate-close" aria-label="סגירה">✕</button>
        <h2 id="site-ai-generate-title" style="margin-bottom:4px;">בניית אתר</h2>
        <div class="ats-modal-body"><div class="ats-upgrade-card"><p>הגעת למכסת הניסיונות החינמיים ליצירת אתר. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!</p><a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a></div></div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    document.getElementById("site-ai-generate-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
    return;
  }

  siteWizardAnswers = {};
  siteWizardStepIndex = 0;
  siteWizardOtherDrafts = {};

  const overlay = document.createElement("div");
  overlay.id = "site-ai-generate-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal ats-modal wizard-modal" role="dialog" aria-modal="true" aria-labelledby="site-ai-generate-title">
      <button type="button" class="domain-guide-close" id="site-ai-generate-close" aria-label="סגירה">✕</button>
      <h2 id="site-ai-generate-title" style="margin-bottom:4px;">בניית אתר</h2>
      <p class="lead" style="margin-top:0;">כמה שאלות קצרות, ואז האתר שלכם מוכן לעריכה.</p>
      <div class="ats-modal-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("site-ai-generate-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  siteWizardRenderStep();
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("site-ai-generate-btn");
  if (btn) btn.addEventListener("click", openSiteAiGenerate);
});
