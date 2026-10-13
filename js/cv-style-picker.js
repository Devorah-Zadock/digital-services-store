/* Non-AI template auto-picker for a brand-new CV: 2 quick questions
   (field + visual style) deterministically resolved to one of the 15
   real CV_TEMPLATES slugs (js/cv-content.js) — no AI call, nothing
   generated, just a lookup. Modeled on the Site Wizard's declarative
   question-list idea (js/site-wizard-questions.js), scaled down to what
   CV actually needs: a flat field→slug-family mapping instead of a full
   branching schema, since there's no AI generation step at the end to
   justify one.

   Runs AFTER js/cv-builder-shell.js's own DOMContentLoaded listener
   (registered later in builder.html, so it fires later) — by then the
   Shell has already activated with a default template (first
   CV_TEMPLATES key, same as always) so nothing downstream ever sees an
   unresolved state. Picking a different slug here just swaps it in and
   calls cvbshellRefreshIfActive() — the exact same post-activation
   refresh hook builder-cloud-save.js already uses for its own async
   cloud-draft race (see that file + cv-builder-shell.js's own comment
   on it). window.dkCvNeedsStylePick (set in js/builder.js) is the only
   signal this ever reacts to: a draft already exists, or an explicit
   ?template= link was followed, and this stays out of the way
   entirely. */

/* Local lookup-with-Hebrew-fallback, same pattern as js/widgets.js's
   dkWidgetsT — this file renders its own modal fresh via JS each time
   (not static data-i18n markup i18n.js's sweep can reach), and needs to
   work even on a page where i18n.js hasn't loaded yet. */
function cvStyleT(key, fallback) {
  if (typeof I18N === "undefined" || typeof currentLang !== "function") return fallback;
  const dict = I18N[currentLang()];
  return (dict && dict[key] !== undefined) ? dict[key] : fallback;
}

const CV_STYLE_FIELDS = [
  { key: "dev", label: cvStyleT("cvsp_field_dev", "פיתוח / תכנות"), match: (slug) => slug.startsWith("cv-dev-") },
  { key: "design", label: cvStyleT("cvsp_field_design", "עיצוב / UX"), match: (slug) => slug.startsWith("cv-design-") },
  { key: "accounting", label: cvStyleT("cvsp_field_accounting", "הנהלת חשבונות"), match: (slug) => slug.startsWith("cv-accounting-") },
  { key: "finance", label: cvStyleT("cvsp_field_finance", "כספים / אנליטיקה"), match: (slug) => slug.startsWith("cv-finance-") },
  { key: "sales", label: cvStyleT("cvsp_field_sales", "מכירות / פיתוח עסקי"), match: (slug) => slug === "cv-sales" },
  { key: "customer-service", label: cvStyleT("cvsp_field_customerservice", "שירות לקוחות"), match: (slug) => slug === "cv-customer-service" },
  { key: "general", label: cvStyleT("cvsp_field_general", "כללי / שיווק / אחר"), match: (slug) => slug.startsWith("cv-general-") || slug.startsWith("cv-business-") },
];

const CV_STYLE_LAYOUTS = [
  { key: "sidebar", label: cvStyleT("cvsp_layout_sidebar", "עם סרגל צד מסודר"), desc: cvStyleT("cvsp_layout_sidebar_desc", "פרטי קשר וכישורים בצד, תוכן ראשי לידם") },
  { key: "bold", label: cvStyleT("cvsp_layout_bold", "נועז ובולט"), desc: cvStyleT("cvsp_layout_bold_desc", "כותרת גדולה ובטוחה, בולט על המסך") },
  { key: "classic-mono", label: cvStyleT("cvsp_layout_classicmono", "מינימליסטי ושקט"), desc: cvStyleT("cvsp_layout_classicmono_desc", "נקי, עניני, בלי קישוטים מיותרים") },
];

/* First match for the chosen field, preferring the chosen layout within
   it — deterministic, not random: same two answers always return the
   same slug. If that field has no template in the chosen layout (e.g.
   "כספים" only exists as classic-mono), falls back to that field's
   first template rather than ignoring the field choice, since the field
   match matters more than the layout preference. */
function cvPickTemplateSlug(fieldKey, layoutKey) {
  const field = CV_STYLE_FIELDS.find((f) => f.key === fieldKey) || CV_STYLE_FIELDS[CV_STYLE_FIELDS.length - 1];
  const candidates = Object.keys(CV_TEMPLATES).filter((slug) => field.match(slug));
  if (!candidates.length) return Object.keys(CV_TEMPLATES)[0];
  const exact = candidates.find((slug) => CV_TEMPLATES[slug].layout === layoutKey);
  return exact || candidates[0];
}

function cvStylePickerStepHtml(stepIdx) {
  const isField = stepIdx === 0;
  const items = isField ? CV_STYLE_FIELDS : CV_STYLE_LAYOUTS;
  const title = isField
    ? cvStyleT("cvsp_title_field", "באיזה תחום קורות החיים?")
    : cvStyleT("cvsp_title_layout", "איזה סגנון מתאים לכם?");
  const optsHtml = items.map((it) => `
    <button type="button" class="cv-style-pick-opt" data-pick="${it.key}">
      <span class="cv-style-pick-opt-label">${it.label}</span>
      ${it.desc ? `<span class="cv-style-pick-opt-desc">${it.desc}</span>` : ""}
    </button>`).join("");
  // Step 1: a shortcut for people who already have a CV (js/cv-import.js).
  // Step 2: the chosen design can start without the example text.
  const importHtml = isField && typeof openCvImport === "function"
    ? `<button type="button" class="cv-style-pick-opt cvb-pick-import" data-import>
        <span class="cv-style-pick-opt-label">📋 ${dkL("יש לי כבר קורות חיים — הדביקו ונמלא בשבילכם", "Already have a CV? Paste it and we'll fill it in")}</span>
        <span class="cv-style-pick-opt-desc">${dkL("מדביקים את הטקסט, וה-AI ממלא את כל השדות. אפשר לערוך הכול אחר כך.", "Paste the text and AI fills in every field. You can edit everything afterwards.")}</span>
      </button>`
    : "";
  const blankHtml = !isField
    ? `<label class="cvb-pick-blank"><input type="checkbox" data-blank> ${dkL("התחלה מדף ריק (בלי התוכן לדוגמה)", "Start blank (without the example text)")}</label>`
    : "";
  return `
    <div class="cv-style-pick-dots">${[0, 1].map((i) => `<span class="cv-style-pick-dot${i === stepIdx ? " active" : ""}"></span>`).join("")}</div>
    <h2>${title}</h2>
    <p class="lead">${cvStyleT("cvsp_lead", "נבחר לכם עיצוב מתאים — אפשר תמיד לשנות אחר כך מתוך ההגדרות.")}</p>
    ${importHtml}
    <div class="cv-style-pick-opts">${optsHtml}</div>
    ${blankHtml}
    <button type="button" class="cv-style-pick-skip" data-skip>${cvStyleT("cvsp_skip", "דלג, התחילו עם עיצוב ברירת מחדל")}</button>`;
}

function showCvStylePicker() {
  const overlay = document.createElement("div");
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `<div class="domain-guide-modal cv-style-pick-modal" role="dialog" aria-modal="true" aria-labelledby="cv-style-pick-title">${cvStylePickerStepHtml(0)}</div>`;
  document.body.appendChild(overlay);

  let fieldKey = null;

  function renderStep(stepIdx) {
    overlay.querySelector(".domain-guide-modal").innerHTML = cvStylePickerStepHtml(stepIdx);
    overlay.querySelectorAll("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (stepIdx === 0) {
          fieldKey = btn.dataset.pick;
          renderStep(1);
        } else {
          finish(fieldKey, btn.dataset.pick);
        }
      });
    });
    const skipBtn = overlay.querySelector("[data-skip]");
    if (skipBtn) skipBtn.addEventListener("click", () => overlay.remove());
    const importBtn = overlay.querySelector("[data-import]");
    if (importBtn) importBtn.addEventListener("click", () => { overlay.remove(); openCvImport(); });
  }

  function finish(field, layout) {
    const slug = cvPickTemplateSlug(field, layout);
    const blank = overlay.querySelector("[data-blank]");
    loadTemplate(slug);
    const select = document.getElementById("tpl-select");
    if (select) select.value = state.slug;
    if (blank && blank.checked && typeof cvReplaceContent === "function") {
      cvReplaceContent(cvBlankContent(), false);
      // Still a fresh start, not an edit — nothing to autosave yet.
      if (typeof cvAutosaveResetBaseline === "function") cvAutosaveResetBaseline();
    }
    if (typeof cvbshellRefreshIfActive === "function") cvbshellRefreshIfActive();
    overlay.remove();
  }

  renderStep(0);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.dkCvNeedsStylePick) return;
  if (typeof CV_TEMPLATES === "undefined" || typeof loadTemplate !== "function") return;
  // js/cv-saves-router.js (registered just before this file in
  // builder.html, so it already ran and set this) resolves the exact
  // same "bare visit, no explicit param" case asynchronously — wait for
  // it so a signed-in returning user with existing CVs gets the My-CVs
  // grid alone, never this picker flashing on top of it first.
  if (window.dkCvRouterGridPromise && typeof window.dkCvRouterGridPromise.then === "function") {
    window.dkCvRouterGridPromise.then((showedGrid) => { if (!showedGrid) showCvStylePicker(); });
  } else {
    showCvStylePicker();
  }
});
