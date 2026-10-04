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

function siteWizardStepBodyHtml(question) {
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

/* The ONE AI call in the whole flow. Conditional category answers
   (foodService/appointmentMethod/productsOffered/specialty) aren't part
   of generate-site's own request shape — rather than widening that
   Edge Function's contract for a handful of extra fields, they're
   folded into the existing free-text `extra` context it already reads,
   keeping that function's shape stable. */
async function siteWizardSubmit() {
  const body = document.querySelector("#site-ai-generate-overlay .ats-modal-body");
  const overlay = document.getElementById("site-ai-generate-overlay");
  if (!body || !overlay) return;
  body.innerHTML = `<div class="ats-error" style="background:var(--ice); color:var(--ink-dark);">בונים לכם הצעה ראשונית לאתר… זה יכול לקחת כמה שניות.</div>`;

  const a = siteWizardAnswers;
  const typeQuestion = SITE_WIZARD_QUESTIONS.find((q) => q.id === "businessType");
  const businessType = siteWizardAnswerLabel(typeQuestion, a.businessType);

  const extraParts = [];
  if (a.foodService) extraParts.push(`אופן קבלת ההזמנה: ${siteWizardAnswerLabel(SITE_WIZARD_QUESTIONS.find((q) => q.id === "foodService"), a.foodService)}`);
  if (a.appointmentMethod) extraParts.push(`קביעת תורים: ${siteWizardAnswerLabel(SITE_WIZARD_QUESTIONS.find((q) => q.id === "appointmentMethod"), a.appointmentMethod)}`);
  if (a.productsOffered) extraParts.push(`מוצרים: ${a.productsOffered}`);
  if (a.specialty) extraParts.push(`תחום התמחות: ${a.specialty}`);
  if (a.extra) extraParts.push(a.extra);

  const goalQuestion = SITE_WIZARD_QUESTIONS.find((q) => q.id === "goal");
  const values = {
    businessName: a.businessName || "",
    businessType,
    description: a.description || "",
    targetAudience: a.targetAudience || "",
    goal: a.goal ? siteWizardAnswerLabel(goalQuestion, a.goal) : "",
    extra: extraParts.join("; "),
  };

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
        ? `<div class="ats-error">הגעת למכסת השימוש ההוגן היומית ליצירת אתרים. אפשר להמשיך מחר.</div>`
        : `<div class="ats-upgrade-card"><p>הגעת למכסת הניסיונות החינמיים ליצירת אתר. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!</p><a href="#" class="btn btn-gold ats-upgrade-btn">שדרוג ל-Pro</a></div>`;
      return;
    }

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
    // A Design Starting Point the new Builder-Shell already supports
    // opens straight into it — the user never sees "Template X", only
    // the result and an editor. Every other template still falls back
    // to the existing sidebar wizard unchanged. `shell=1` is carried
    // into the URL (not just called in-memory) so a page reload while
    // resuming this same project lands back in the Shell too, same
    // check js/site-builder.js's own load path already makes.
    const opensInShell = typeof bshellActivate === "function" && typeof BSHELL_SUPPORTED_TEMPLATES !== "undefined" && BSHELL_SUPPORTED_TEMPLATES.includes(site.template);
    history.replaceState(null, "", "sites.html?template=" + encodeURIComponent(site.template) + (opensInShell ? "&shell=1" : ""));
    if (opensInShell) {
      bshellActivate();
    } else {
      showWizard();
    }
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
