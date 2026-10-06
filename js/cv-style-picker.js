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

const CV_STYLE_FIELDS = [
  { key: "dev", label: "פיתוח / תכנות", match: (slug) => slug.startsWith("cv-dev-") },
  { key: "design", label: "עיצוב / UX", match: (slug) => slug.startsWith("cv-design-") },
  { key: "accounting", label: "הנהלת חשבונות", match: (slug) => slug.startsWith("cv-accounting-") },
  { key: "finance", label: "כספים / אנליטיקה", match: (slug) => slug.startsWith("cv-finance-") },
  { key: "sales", label: "מכירות / פיתוח עסקי", match: (slug) => slug === "cv-sales" },
  { key: "customer-service", label: "שירות לקוחות", match: (slug) => slug === "cv-customer-service" },
  { key: "general", label: "כללי / שיווק / אחר", match: (slug) => slug.startsWith("cv-general-") || slug.startsWith("cv-business-") },
];

const CV_STYLE_LAYOUTS = [
  { key: "sidebar", label: "עם סרגל צד מסודר", desc: "פרטי קשר וכישורים בצד, תוכן ראשי לידם" },
  { key: "bold", label: "נועז ובולט", desc: "כותרת גדולה ובטוחה, בולט על המסך" },
  { key: "classic-mono", label: "מינימליסטי ושקט", desc: "נקי, עניני, בלי קישוטים מיותרים" },
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
  const title = isField ? "באיזה תחום קורות החיים?" : "איזה סגנון מתאים לכם?";
  const optsHtml = items.map((it) => `
    <button type="button" class="cv-style-pick-opt" data-pick="${it.key}">
      <span class="cv-style-pick-opt-label">${it.label}</span>
      ${it.desc ? `<span class="cv-style-pick-opt-desc">${it.desc}</span>` : ""}
    </button>`).join("");
  return `
    <div class="cv-style-pick-dots">${[0, 1].map((i) => `<span class="cv-style-pick-dot${i === stepIdx ? " active" : ""}"></span>`).join("")}</div>
    <h2>${title}</h2>
    <p class="lead">נבחר לכם עיצוב מתאים — אפשר תמיד לשנות אחר כך מתוך ההגדרות.</p>
    <div class="cv-style-pick-opts">${optsHtml}</div>
    <button type="button" class="cv-style-pick-skip" data-skip>דלג, התחילו עם עיצוב ברירת מחדל</button>`;
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
  }

  function finish(field, layout) {
    const slug = cvPickTemplateSlug(field, layout);
    loadTemplate(slug);
    const select = document.getElementById("tpl-select");
    if (select) select.value = state.slug;
    if (typeof cvbshellRefreshIfActive === "function") cvbshellRefreshIfActive();
    overlay.remove();
  }

  renderStep(0);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.dkCvNeedsStylePick) return;
  if (typeof CV_TEMPLATES === "undefined" || typeof loadTemplate !== "function") return;
  showCvStylePicker();
});
