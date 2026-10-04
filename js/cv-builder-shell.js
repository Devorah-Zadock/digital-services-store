/* ===========================================================
   CV Builder-Shell — the same central editing pattern proved on
   websites (js/builder-shell.js), applied to the CV builder. Now the
   DEFAULT entry point for every visit to builder.html, same as
   site-builder.js's own Shell — ?shell=0 is an explicit, internal
   escape hatch back to the old sidebar (debugging/rollback only),
   never something any real link in the product constructs.

   ONE Shell (reuses css/builder-shell.css's chrome as-is — the exact
   same .bshell/.bshell-top/.bshell-hier/.bshell-canvas-wrap/.bshell-props
   classes, no new CSS needed), driven by a CV-specific Schema instead
   of a copy of the file. Operates on the SAME `state` object and the
   SAME renderCVHtml()/saveCvNow()/renderForm()/renderPreview()/
   loadTemplate()/setLang() functions js/builder.js and
   js/builder-cloud-save.js already define — this file adds a new way
   to look at and edit that data, not a second data model, a second
   save path, or a second render path. The CV's own design/layout
   (sidebar/bold/classic-mono, all in cv-render.js) never changes to
   fit this file; only additive data-cvkey/data-cv-job-idx/
   data-cv-project-idx/data-cvsection hooks were added to cv-render.js
   so a canvas click can resolve to something — zero visual difference
   (verified: those attributes carry no styling).

   Schema (Section -> Block -> Element, kept exactly as simple as the
   content itself — no artificial "Header" wrapper section, no card
   component invented for a plain string):
     name / title / contact / summary / education / skills  -> plain
       text elements, directly selectable (no enclosing Section).
     experience -> the one container Section with real repeatable
       items (content.jobs[]).
     projects   -> the other container Section, optional by nature
       (content.projects[] can be empty) -> doubles as the
       show/hide-able Section via cvbshellToggleProjectsVisibility().

   Template/font/color/photo live under Settings (a 4th selection kind,
   same as the website Shell's own "settings" — no live canvas anchor),
   NOT as a guided "choose your style" switcher: per product direction,
   DeskKit never shows the user a template catalog to pick from inside
   a product's Builder. The existing #tpl-select/#font-select/
   #color-picker/#text-color-picker/#f-photo/#photo-remove DOM nodes
   are physically moved into the Settings panel (not recreated) so
   every listener js/builder.js's wireStaticInputs() already attached
   to them keeps firing unchanged.
   =========================================================== */

let cvbshellActiveFlag = false;
let cvbshellSelection = null; // { kind: "text"|"job"|"project"|"section"|"settings", key?|idx?|type?, rootEl? }
let cvbshellUndoStack = [];
let cvbshellRedoStack = [];
const CVBSHELL_UNDO_CAP = 30;
let cvbshellCanvasClickWired = false;

// Only "summary" needs a <textarea> instead of a single-line <input> —
// mirrors the exact same choice js/builder.js's own #f-summary/#f-name/
// etc. already make. Labels come from FORM_LABELS (already he/en), so
// nothing else needs duplicating here.
const CVBSHELL_MULTILINE_TEXT_KEYS = ["summary"];

/* ---------- Entry ---------- */

function cvbshellActivate() {
  cvbshellActiveFlag = true;
  // The Shell's position:fixed takeover only visually COVERS the old
  // sidebar/preview — without this, #tpl-select (and everything else
  // in the old form) stays live underneath: still in the tab order,
  // still reachable by a screen reader, same class of bug the website
  // Shell's own bshellActivate() already avoids by hiding its old
  // sections explicitly rather than relying on stacking alone.
  const oldTop = document.getElementById("builder-top-section");
  const oldWrap = document.getElementById("builder-wrap-section");
  if (oldTop) oldTop.style.display = "none";
  if (oldWrap) oldWrap.style.display = "none";
  cvbshellMoveSettingsFields();
  cvbshellWireStyleSwitcher();
  document.getElementById("cvbshell-root").classList.add("active");
  cvbshellWireTopBar();
  cvbshellRenderHierarchy();
  cvbshellRenderCanvas();
  cvbshellSyncUndoButtons();
}

/* Reparents the EXISTING font/color/photo controls (and their labels,
   still wired by js/builder.js's own wireStaticInputs()) into the
   Shell's Settings panel instead of recreating them — guarantees this
   file can never drift from what those listeners actually do.
   #tpl-select is deliberately NOT moved here: it's a raw catalog of
   CV_TEMPLATES slugs (by industry/profession, e.g. "תכנות — סיידבר
   כהה") — showing that picker inside the Builder would be exactly the
   "choose a template" screen the product explicitly never shows.
   Design/style control inside the Shell goes through
   cvbshellWireStyleSwitcher() instead, which changes only the layout,
   never the content or the underlying slug. */
function cvbshellMoveSettingsFields() {
  const group1 = document.getElementById("cvbshell-settings-group-design");
  const group2 = document.getElementById("cvbshell-settings-group-photo");
  if (!group1 || group1.dataset.moved) return;
  group1.dataset.moved = "1";
  ["font-select", "color-picker", "text-color-picker"].forEach((id) => {
    const input = document.getElementById(id);
    const field = input && input.closest(".field");
    if (field) group1.appendChild(field);
  });
  const photoField = document.getElementById("f-photo").closest(".field");
  if (photoField) group2.appendChild(photoField);
}

/* The Shell's own "סגנון עיצוב" control — 3 generic, layout-descriptive
   buttons (never a template name or an industry/profession label).
   Changes content.layoutOverride only: the SAME content renders
   through whichever of cv-render.js's 3 layouts is picked, nothing
   else touched. It rides inside `content` (not a separate top-level
   `state` field) so it survives save/local-save/undo for free via the
   exact same snapshot/restore paths that already move `content`
   wholesale, and is naturally cleared whenever loadTemplate() resets
   content (switching template or language is a fresh start). */
function cvbshellWireStyleSwitcher() {
  const row = document.getElementById("cvbshell-style-row");
  if (!row || row.dataset.wired) return;
  row.dataset.wired = "1";
  row.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cv-style]");
    if (!btn) return;
    const tpl = CV_TEMPLATES[state.slug];
    const current = (state.content && state.content.layoutOverride) || tpl.layout;
    if (btn.dataset.cvStyle === current) return;
    cvbshellSnapshot();
    state.content.layoutOverride = btn.dataset.cvStyle;
    renderForm();
    renderPreview();
    cvbshellRenderCanvas(cvbshellReanchorSelection);
    cvbshellSyncStyleButtons();
  });
}
function cvbshellSyncStyleButtons() {
  const row = document.getElementById("cvbshell-style-row");
  if (!row) return;
  const tpl = CV_TEMPLATES[state.slug];
  const current = (state.content && state.content.layoutOverride) || tpl.layout;
  row.querySelectorAll("[data-cv-style]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cvStyle === current);
  });
}

/* ---------- Undo / Redo — snapshots `state` PLUS the color/text-color
   inputs (those two live purely as DOM input values, read directly by
   renderPreview(), never copied into `state` — see js/builder.js). */

function cvbshellSnapshot() {
  const colorEl = document.getElementById("color-picker");
  const textColorEl = document.getElementById("text-color-picker");
  cvbshellUndoStack.push(JSON.stringify({ state, color: colorEl.value, textColor: textColorEl.value }));
  if (cvbshellUndoStack.length > CVBSHELL_UNDO_CAP) cvbshellUndoStack.shift();
  cvbshellRedoStack = [];
  cvbshellSyncUndoButtons();
}

function cvbshellSyncUndoButtons() {
  const undoBtn = document.getElementById("cvbshell-undo-btn");
  const redoBtn = document.getElementById("cvbshell-redo-btn");
  if (undoBtn) undoBtn.disabled = cvbshellUndoStack.length === 0;
  if (redoBtn) redoBtn.disabled = cvbshellRedoStack.length === 0;
}

function cvbshellApplySnapshot(raw) {
  const snap = JSON.parse(raw);
  state = snap.state;
  document.getElementById("color-picker").value = snap.color;
  document.getElementById("text-color-picker").value = snap.textColor;
  document.getElementById("tpl-select").value = state.slug;
  renderForm();
  renderPreview();
  cvbshellSelection = null;
  cvbshellSyncUndoButtons();
  cvbshellRenderCanvas();
  cvbshellRenderHierarchy();
  cvbshellRenderProperties();
}

function cvbshellUndo() {
  if (!cvbshellUndoStack.length) return;
  const colorEl = document.getElementById("color-picker");
  const textColorEl = document.getElementById("text-color-picker");
  cvbshellRedoStack.push(JSON.stringify({ state, color: colorEl.value, textColor: textColorEl.value }));
  cvbshellApplySnapshot(cvbshellUndoStack.pop());
}

function cvbshellRedo() {
  if (!cvbshellRedoStack.length) return;
  const colorEl = document.getElementById("color-picker");
  const textColorEl = document.getElementById("text-color-picker");
  cvbshellUndoStack.push(JSON.stringify({ state, color: colorEl.value, textColor: textColorEl.value }));
  cvbshellApplySnapshot(cvbshellRedoStack.pop());
}

/* A text/color input snapshots once per focus (before the first
   keystroke), not on every "input" event — same reasoning as the
   website Shell's bshellBeginEdit(). */
function cvbshellBeginEdit(inputEl) {
  if (inputEl.dataset.cvbshellEditing === "1") return;
  inputEl.dataset.cvbshellEditing = "1";
  cvbshellSnapshot();
}
function cvbshellEndEdit(inputEl) {
  delete inputEl.dataset.cvbshellEditing;
}

/* ---------- Top bar ---------- */

function cvbshellWireTopBar() {
  const root = document.getElementById("cvbshell-root");
  if (root.dataset.topWired) return;
  root.dataset.topWired = "1";

  document.getElementById("cvbshell-undo-btn").addEventListener("click", cvbshellUndo);
  document.getElementById("cvbshell-redo-btn").addEventListener("click", cvbshellRedo);
  document.addEventListener("keydown", (e) => {
    if (!cvbshellActiveFlag) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.key.toLowerCase() !== "z") return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
    e.preventDefault();
    if (e.shiftKey) cvbshellRedo(); else cvbshellUndo();
  });

  document.getElementById("cvbshell-settings-btn").addEventListener("click", cvbshellSelectSettings);

  // Reuses setLang() wholesale (js/builder.js) — same destructive-by-
  // design behavior as the original language buttons (switching
  // language loads that language's own authored content preset, it
  // isn't a translation of the current text). ".lang-big" buttons are
  // matched by class everywhere, including these new ones, so setLang's
  // own active-state sync keeps working without changes there.
  document.querySelectorAll("#cvbshell-lang-switch .lang-big").forEach((btn) => {
    btn.addEventListener("click", () => {
      setLang(btn.dataset.lang);
      cvbshellSelection = null;
      cvbshellRenderCanvas();
      cvbshellRenderHierarchy();
      cvbshellRenderProperties();
    });
  });

  document.getElementById("cvbshell-download-btn").addEventListener("click", () => {
    document.getElementById("download-btn").click();
  });

  // openAtsChecker() (js/ats-checker.js) is already a self-contained
  // global modal, appended straight to document.body and reading only
  // state.content/state.lang — not tied to the old sidebar's layout at
  // all, so calling it directly here needs no Shell-specific version.
  document.getElementById("cvbshell-ats-btn").addEventListener("click", () => {
    if (typeof openAtsChecker === "function") openAtsChecker();
  });

  document.getElementById("cvbshell-save-btn").addEventListener("click", async () => {
    if (typeof cvCurrentUserId !== "undefined" && !cvCurrentUserId) {
      if (typeof openAuthPrompt === "function") openAuthPrompt();
      return;
    }
    const btn = document.getElementById("cvbshell-save-btn");
    btn.disabled = true;
    await cvbshellSaveNow();
    btn.disabled = false;
    if (window.refreshMyPanel) window.refreshMyPanel();
  });

  document.getElementById("cvbshell-mobile-hier-btn").addEventListener("click", () => {
    document.getElementById("cvbshell-props").classList.remove("bshell-drawer-open");
    document.getElementById("cvbshell-hier").classList.toggle("bshell-drawer-open");
  });
  document.getElementById("cvbshell-mobile-props-btn").addEventListener("click", () => {
    document.getElementById("cvbshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("cvbshell-props").classList.toggle("bshell-drawer-open");
  });

  window.addEventListener("resize", () => {
    clearTimeout(window._cvbshellFitTimer);
    window._cvbshellFitTimer = setTimeout(cvbshellFitCanvas, 150);
  });
}

/* Explicit-save-only to the cloud, exactly like the original
   #cv-save-btn (js/builder-cloud-save.js) — never auto-triggered on
   every edit. Local autosave (saveCvLocalState) already happens for
   free on every edit via renderPreview(), untouched by this file. */
async function cvbshellSaveNow() {
  const status = document.getElementById("cvbshell-top-status");
  status.textContent = "שומרים...";
  status.className = "bshell-top-status saving";
  if (typeof saveCvNow === "function") await saveCvNow();
  status.textContent = "נשמר ✓";
  status.className = "bshell-top-status saved";
  if (window.refreshMyPanel) window.refreshMyPanel();
  setTimeout(() => { if (status.textContent === "נשמר ✓") status.textContent = ""; }, 2500);
}

/* ---------- Hierarchy sidebar ---------- */

function cvbshellRenderHierarchy() {
  const list = document.getElementById("cvbshell-hier-list");
  const t = FORM_LABELS[state.lang];
  const c = state.content;
  document.getElementById("cvbshell-settings-btn").classList.toggle("is-selected", !!(cvbshellSelection && cvbshellSelection.kind === "settings"));

  const textRow = (key, label) => {
    const isSel = cvbshellSelection && cvbshellSelection.kind === "text" && cvbshellSelection.key === key;
    return `
      <details class="bshell-sec" open>
        <summary class="bshell-sec-head${isSel ? " is-selected" : ""}" data-cvbshell-select-text="${key}">
          <span class="bshell-sec-chevron" style="visibility:hidden;"></span>
          <span>${escapeHtml(label)}</span>
        </summary>
      </details>`;
  };

  const containerRow = (type, label, items, itemLabelFn, hidden) => {
    const isSelSection = cvbshellSelection && cvbshellSelection.kind === "section" && cvbshellSelection.type === type;
    const kind = type === "experience" ? "job" : "project";
    const rows = items.map((item, i) => {
      const isSelItem = cvbshellSelection && cvbshellSelection.kind === kind && cvbshellSelection.idx === i;
      return `<button type="button" class="bshell-item${isSelItem ? " is-selected" : ""}" data-cvbshell-select-${kind}="${i}">${escapeHtml(itemLabelFn(item, i))}</button>`;
    }).join("") + `<button type="button" class="bshell-add-item" data-cvbshell-add-${kind}>+ ${kind === "job" ? t.addJob : t.addProject}</button>`;
    return `
      <details class="bshell-sec" open>
        <summary class="bshell-sec-head${isSelSection ? " is-selected" : ""}${hidden ? " is-hidden" : ""}" data-cvbshell-select-section="${type}">
          <span class="bshell-sec-chevron"></span>
          <span>${escapeHtml(label)}</span>
          ${hidden ? '<span class="bshell-sec-hidden-dot" title="מוסתר"></span>' : ""}
        </summary>
        <div class="bshell-sec-body">${rows}</div>
      </details>`;
  };

  const projectsHidden = !(c.projects && c.projects.length);

  list.innerHTML = [
    textRow("name", t.name),
    textRow("title", t.title),
    textRow("contact", t.contact),
    textRow("summary", t.summary),
    containerRow("experience", t.jobsHead, c.jobs || [], (j, i) => (j.title && j.title.trim()) ? j.title : `${t.role} ${i + 1}`, false),
    containerRow("projects", t.projectsHead, c.projects || [], (p, i) => (p.title && p.title.trim()) ? p.title : `${t.projTitle} ${i + 1}`, projectsHidden),
    textRow("education", t.education),
    textRow("skills", t.skills),
  ].join("");

  list.querySelectorAll("[data-cvbshell-select-text]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); cvbshellSelectText(el.dataset.cvbshellSelectText); });
  });
  list.querySelectorAll("[data-cvbshell-select-section]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); cvbshellSelectSection(el.dataset.cvbshellSelectSection); });
  });
  list.querySelectorAll("[data-cvbshell-select-job]").forEach((el) => {
    el.addEventListener("click", () => cvbshellSelectJob(parseInt(el.dataset.cvbshellSelectJob, 10)));
  });
  list.querySelectorAll("[data-cvbshell-select-project]").forEach((el) => {
    el.addEventListener("click", () => cvbshellSelectProject(parseInt(el.dataset.cvbshellSelectProject, 10)));
  });
  list.querySelectorAll("[data-cvbshell-add-job]").forEach((el) => {
    el.addEventListener("click", () => {
      cvbshellSnapshot();
      state.content.jobs.push({ title: "", place: "", dates: "", bullets: "" });
      const newIdx = state.content.jobs.length - 1;
      renderForm();
      cvbshellRenderCanvas(() => cvbshellSelectJob(newIdx));
      cvbshellRenderHierarchy();
    });
  });
  list.querySelectorAll("[data-cvbshell-add-project]").forEach((el) => {
    el.addEventListener("click", () => {
      cvbshellSnapshot();
      state.content.projects = state.content.projects || [];
      state.content.projects.push({ title: "", link: "", bullets: "" });
      const newIdx = state.content.projects.length - 1;
      renderForm();
      cvbshellRenderCanvas(() => cvbshellSelectProject(newIdx));
      cvbshellRenderHierarchy();
    });
  });
}

/* ---------- Canvas: render + click-to-select ---------- */

function cvbshellBuildCanvasHtml() {
  const tpl = CV_TEMPLATES[state.slug];
  const palette = derivePalette(document.getElementById("color-picker").value);
  const font = (FONT_OPTIONS.find((f) => f.id === state.fontId) || FONT_OPTIONS[0]).css;
  const textColor = document.getElementById("text-color-picker").value.replace("#", "");
  const layout = (state.content && state.content.layoutOverride) || tpl.layout;
  const body = renderCVHtml({ layout, font, palette, content: state.content, lang: state.lang, textColor, isPro: state.isPro });
  const fontsLink = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  const dir = state.lang === "en" ? "ltr" : "rtl";
  return `<!doctype html><html lang="${state.lang}" dir="${dir}"><head><meta charset="UTF-8">
    ${fontsLink ? fontsLink.outerHTML : ""}
    <style>
      html,body{margin:0; background:#F3F4F6;}
      body{display:flex; justify-content:center; padding:36px 20px; box-sizing:border-box;}
      .cv-pdf-credit{display:none;}
    </style>
    </head><body>${body}</body></html>`;
}

function cvbshellRenderCanvas(afterLoad) {
  const iframe = document.getElementById("cvbshell-canvas-iframe");
  iframe.srcdoc = cvbshellBuildCanvasHtml();
  cvbshellCanvasClickWired = false;
  iframe.onload = () => {
    cvbshellWireCanvasClicks();
    cvbshellFitCanvas();
    cvbshellApplySelectionVisual();
    if (afterLoad) afterLoad();
  };
}

/* The CV doc is a fixed-width (794px) A4 page — same reasoning as
   fitPreviewToContainer() in js/builder.js, reapplied here against the
   canvas iframe's own document instead of #preview-doc. */
function cvbshellFitCanvas() {
  const iframe = document.getElementById("cvbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  const el = doc && doc.querySelector(".cv-doc");
  if (!el) return;
  el.style.transform = "none";
  el.style.margin = "0";
  const containerWidth = iframe.clientWidth - 40; // the body's own 20px*2 padding
  const natural = el.offsetWidth;
  const scale = containerWidth < natural ? containerWidth / natural : 1;
  el.style.transformOrigin = "top center";
  el.style.transform = `scale(${scale})`;
  doc.body.style.height = (el.offsetHeight * scale + 72) + "px";
}

function cvbshellWireCanvasClicks() {
  const iframe = document.getElementById("cvbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc || cvbshellCanvasClickWired) return;
  cvbshellCanvasClickWired = true;
  doc.addEventListener("click", (e) => {
    if (e.target.closest("#cvbshell-mini-toolbar")) return;
    const a = e.target.closest("a");
    if (a) e.preventDefault();
    const resolved = cvbshellResolveClickTarget(e);
    if (!resolved) { cvbshellDeselect(); return; }
    cvbshellSelection = resolved;
    cvbshellApplySelectionVisual();
    cvbshellRenderProperties();
    cvbshellRenderHierarchy();
  }, true);
}

function cvbshellResolveClickTarget(e) {
  const jobEl = e.target.closest("[data-cv-job-idx]");
  if (jobEl) return { kind: "job", idx: parseInt(jobEl.dataset.cvJobIdx, 10), rootEl: jobEl };
  const projEl = e.target.closest("[data-cv-project-idx]");
  if (projEl) return { kind: "project", idx: parseInt(projEl.dataset.cvProjectIdx, 10), rootEl: projEl };
  const textEl = e.target.closest("[data-cvkey]");
  if (textEl) return { kind: "text", key: textEl.dataset.cvkey, rootEl: textEl };
  const secEl = e.target.closest("[data-cvsection]");
  if (secEl) return { kind: "section", type: secEl.dataset.cvsection, rootEl: secEl };
  return null;
}

function cvbshellDeselect() {
  cvbshellSelection = null;
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

function cvbshellSelectText(key) {
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-cvkey="${key}"]`);
  cvbshellSelection = { kind: "text", key, rootEl: el };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

function cvbshellSelectSection(type) {
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-cvsection="${type}"]`);
  cvbshellSelection = { kind: "section", type, rootEl: el };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

function cvbshellSelectJob(idx) {
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-cv-job-idx="${idx}"]`);
  if (!el) return;
  cvbshellSelection = { kind: "job", idx, rootEl: el };
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

function cvbshellSelectProject(idx) {
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-cv-project-idx="${idx}"]`);
  if (!el) return;
  cvbshellSelection = { kind: "project", idx, rootEl: el };
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

function cvbshellSelectSettings() {
  cvbshellSelection = { kind: "settings" };
  cvbshellApplySelectionVisual();
  cvbshellRenderProperties();
  cvbshellRenderHierarchy();
}

/* Same outline + mini-toolbar injection as the website Shell
   (js/builder-shell.js's bshellApplySelectionVisual) — straight into
   the iframe's own document. */
function cvbshellApplySelectionVisual() {
  const iframe = document.getElementById("cvbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.querySelectorAll(".bshell-outline-target").forEach((el) => el.classList.remove("bshell-outline-target"));
  const oldToolbar = doc.getElementById("cvbshell-mini-toolbar");
  if (oldToolbar) oldToolbar.remove();
  if (!cvbshellSelection || !cvbshellSelection.rootEl || !doc.contains(cvbshellSelection.rootEl)) return;

  if (!doc.getElementById("cvbshell-outline-style")) {
    const style = doc.createElement("style");
    style.id = "cvbshell-outline-style";
    style.textContent = `
      .bshell-outline-target{outline:2px solid #14B8A6 !important; outline-offset:2px !important;}
      #cvbshell-mini-toolbar{position:absolute; z-index:999999; display:flex; gap:2px; background:#111827; border-radius:8px; padding:3px; box-shadow:0 4px 14px rgba(0,0,0,.28);}
      #cvbshell-mini-toolbar button{all:unset; box-sizing:border-box; cursor:pointer; color:#fff; width:27px; height:27px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:13px; text-align:center;}
      #cvbshell-mini-toolbar button:hover:not(:disabled){background:#14B8A6;}
      #cvbshell-mini-toolbar button:disabled{opacity:.35; cursor:default;}`;
    doc.head.appendChild(style);
  }

  const el = cvbshellSelection.rootEl;
  el.classList.add("bshell-outline-target");
  const rect = el.getBoundingClientRect();
  const scrollY = doc.defaultView.scrollY || doc.documentElement.scrollTop;
  const toolbar = doc.createElement("div");
  toolbar.id = "cvbshell-mini-toolbar";
  toolbar.style.top = Math.max(4, rect.top + scrollY - 34) + "px";
  toolbar.style.insetInlineStart = Math.max(4, rect.left) + "px";
  const canDuplicate = cvbshellSelection.kind === "job" || cvbshellSelection.kind === "project";
  const canDelete = canDuplicate;
  toolbar.innerHTML = `
    <button type="button" data-tool="edit" title="עריכה">✎</button>
    <button type="button" data-tool="duplicate" title="שכפול"${canDuplicate ? "" : " disabled"}>⧉</button>
    <button type="button" data-tool="delete" title="מחיקה"${canDelete ? "" : " disabled"}>🗑</button>`;
  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  toolbar.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("button[data-tool]");
    if (!btn || btn.disabled) return;
    cvbshellToolbarAction(btn.dataset.tool);
  });
  doc.body.appendChild(toolbar);
}

function cvbshellToolbarAction(tool) {
  if (!cvbshellSelection) return;
  if (tool === "edit") {
    document.getElementById("cvbshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("cvbshell-props").classList.add("bshell-drawer-open");
    const first = document.querySelector("#cvbshell-props-dynamic input, #cvbshell-props-dynamic textarea");
    if (first) first.focus();
    return;
  }
  const list = cvbshellSelection.kind === "job" ? state.content.jobs : cvbshellSelection.kind === "project" ? state.content.projects : null;
  if (!list) return;
  if (tool === "duplicate") {
    cvbshellSnapshot();
    const copyIdx = cvbshellSelection.idx + 1;
    list.splice(copyIdx, 0, Object.assign({}, list[cvbshellSelection.idx]));
    renderForm();
    const select = cvbshellSelection.kind === "job" ? cvbshellSelectJob : cvbshellSelectProject;
    cvbshellRenderCanvas(() => select(copyIdx));
    cvbshellRenderHierarchy();
    return;
  }
  if (tool === "delete") {
    cvbshellSnapshot();
    list.splice(cvbshellSelection.idx, 1);
    renderForm();
    cvbshellDeselect();
    cvbshellRenderCanvas();
    cvbshellRenderHierarchy();
  }
}

/* The projects Section doubles as show/hide: there's no separate flag,
   emptying content.projects IS "hidden" — so the exported PDF, the old
   hidden sidebar preview, and this canvas all agree automatically,
   with zero changes to cv-render.js/renderPreview(). The backed-up
   array round-trips harmlessly through save/localStorage as inert
   extra data cv-render.js never reads. */
function cvbshellToggleProjectsVisibility() {
  const c = state.content;
  if (c.projects && c.projects.length) {
    c._projectsBackup = c.projects;
    c.projects = [];
  } else if (c._projectsBackup && c._projectsBackup.length) {
    c.projects = c._projectsBackup;
    delete c._projectsBackup;
  } else {
    c.projects = [{ title: "", link: "", bullets: "" }];
  }
}

/* ---------- Properties panel ----------
   The Settings view (#cvbshell-props-settings, in builder.html) is
   STATIC markup, never innerHTML-replaced — it permanently holds the
   real, moved #tpl-select/#font-select/#color-picker/#text-color-
   picker/#f-photo nodes (see cvbshellMoveSettingsFields). Every other
   selection kind renders into the separate #cvbshell-props-dynamic
   sibling instead, specifically so overwriting ITS innerHTML on every
   selection change can never destroy those live, listener-bound
   nodes living in the settings view next to it. */
function cvbshellRenderProperties() {
  const empty = document.getElementById("cvbshell-props-empty");
  const dyn = document.getElementById("cvbshell-props-dynamic");
  const settingsView = document.getElementById("cvbshell-props-settings");
  if (!cvbshellSelection) {
    empty.style.display = "";
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "none";
    return;
  }
  empty.style.display = "none";
  if (cvbshellSelection.kind === "settings") {
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "";
    cvbshellSyncStyleButtons();
    return;
  }
  settingsView.style.display = "none";
  dyn.style.display = "";
  if (cvbshellSelection.kind === "text") dyn.innerHTML = cvbshellPropsHtmlForText(cvbshellSelection.key);
  else if (cvbshellSelection.kind === "job") dyn.innerHTML = cvbshellPropsHtmlForJob(cvbshellSelection.idx);
  else if (cvbshellSelection.kind === "project") dyn.innerHTML = cvbshellPropsHtmlForProject(cvbshellSelection.idx);
  else if (cvbshellSelection.kind === "section") dyn.innerHTML = cvbshellPropsHtmlForSection(cvbshellSelection.type);
  cvbshellWirePropertiesPanel();
}

function cvbshellPropsHtmlForText(key) {
  const label = FORM_LABELS[state.lang][key];
  const value = state.content[key] || "";
  const inputTag = CVBSHELL_MULTILINE_TEXT_KEYS.includes(key)
    ? `<textarea id="cvbshell-prop-content" rows="4">${escapeHtml(value)}</textarea>`
    : `<input type="text" id="cvbshell-prop-content" value="${escapeHtml(value).replace(/"/g, "&quot;")}">`;
  // "✨ שפר עם AI" only makes sense next to the summary — same single
  // field the old sidebar's own button sat beside (js/ai-writer.js).
  const aiTools = key === "summary"
    ? `<button type="button" class="btn-mini ai-improve-btn" id="cvbshell-ai-improve-btn" style="margin-top:8px;">✨ שפר עם AI</button><div id="cvbshell-ai-note" class="ai-limit-note"></div>`
    : "";
  return `
    <span class="bshell-props-kind">טקסט</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">${escapeHtml(label)}</label>
      ${inputTag}
      ${aiTools}
    </div>`;
}

function cvbshellPropsHtmlForJob(idx) {
  const j = state.content.jobs[idx] || { title: "", place: "", dates: "", bullets: "" };
  const t = FORM_LABELS[state.lang];
  return `
    <span class="bshell-props-kind">תפקיד</span>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.role}</label><input type="text" id="cvbshell-prop-job-title" value="${escapeHtml(j.title).replace(/"/g, "&quot;")}"></div>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.place}</label><input type="text" id="cvbshell-prop-job-place" value="${escapeHtml(j.place).replace(/"/g, "&quot;")}"></div>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.dates}</label><input type="text" id="cvbshell-prop-job-dates" value="${escapeHtml(j.dates).replace(/"/g, "&quot;")}"></div>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.bullets}</label><textarea id="cvbshell-prop-job-bullets" rows="4">${escapeHtml(j.bullets)}</textarea></div>`;
}

function cvbshellPropsHtmlForProject(idx) {
  const p = state.content.projects[idx] || { title: "", link: "", bullets: "" };
  const t = FORM_LABELS[state.lang];
  return `
    <span class="bshell-props-kind">פרויקט</span>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.projTitle}</label><input type="text" id="cvbshell-prop-proj-title" value="${escapeHtml(p.title || "").replace(/"/g, "&quot;")}"></div>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.projLink}</label><input type="text" dir="ltr" id="cvbshell-prop-proj-link" value="${escapeHtml(p.link || "").replace(/"/g, "&quot;")}"></div>
    <div class="bshell-props-field"><label class="bshell-props-label">${t.bullets}</label><textarea id="cvbshell-prop-proj-bullets" rows="4">${escapeHtml(p.bullets || "")}</textarea></div>`;
}

function cvbshellPropsHtmlForSection(type) {
  if (type === "experience") {
    return `<span class="bshell-props-kind">Section</span><p style="font-size:12.5px; color:var(--text-muted); margin:0;">ניסיון תעסוקתי מופיע בקורות החיים. ניהול התפקידים מתבצע מההיררכיה או מהקנבס.</p>`;
  }
  const visible = !!(state.content.projects && state.content.projects.length);
  return `
    <span class="bshell-props-kind">Section</span>
    <div class="bshell-props-field">
      <div class="bshell-toggle-row">
        <label class="bshell-props-label" style="margin:0;">הצגת חלק הפרויקטים</label>
        <label class="bshell-switch">
          <input type="checkbox" id="cvbshell-prop-projects-visible"${visible ? " checked" : ""}>
          <span class="bshell-switch-track"></span>
          <span class="bshell-switch-thumb"></span>
        </label>
      </div>
      <p class="bshell-settings-field-hint">הפרויקטים הם חלק אופציונלי — אפשר להסתיר אותו בלי למחוק את התוכן.</p>
    </div>`;
}

function cvbshellWirePropertiesPanel() {
  if (cvbshellSelection.kind === "text") return cvbshellWireTextProps(cvbshellSelection.key);
  if (cvbshellSelection.kind === "job") return cvbshellWireJobProps(cvbshellSelection.idx);
  if (cvbshellSelection.kind === "project") return cvbshellWireProjectProps(cvbshellSelection.idx);
  if (cvbshellSelection.kind === "section") return cvbshellWireSectionProps(cvbshellSelection.type);
}

function cvbshellWireTextProps(key) {
  const el = document.getElementById("cvbshell-prop-content");
  if (!el) return;
  el.addEventListener("focus", () => cvbshellBeginEdit(el));
  el.addEventListener("blur", () => cvbshellEndEdit(el));
  el.addEventListener("input", () => {
    state.content[key] = el.value;
    renderForm();
    renderPreview();
    cvbshellPatchTextContent(key, el.value);
  });

  if (key === "summary") {
    const aiBtn = document.getElementById("cvbshell-ai-improve-btn");
    if (aiBtn) aiBtn.addEventListener("click", cvbshellImproveSummary);
  }
}

/* Shell-native "✨ שפר עם AI" — calls the SAME aiRewriteSummaryCore()
   network call the old sidebar's own button uses (js/ai-writer.js),
   just reading/writing this Properties-panel field instead of
   #f-summary/#ai-improve-summary. Not a proxy click on the old button:
   that one is hidden behind the Shell and reads a field this view
   never shows, so the Shell needs its own trigger around the shared
   core, same split already used for Save/Undo elsewhere in this file. */
function cvbshellAiNote(html) {
  const note = document.getElementById("cvbshell-ai-note");
  if (note) note.innerHTML = html;
}

async function cvbshellImproveSummary() {
  const btn = document.getElementById("cvbshell-ai-improve-btn");
  const input = document.getElementById("cvbshell-prop-content");
  if (!btn || !input) return;
  const text = input.value.trim();
  if (!text) {
    cvbshellAiNote("צריך לכתוב קודם טיוטה של תקציר — אז AI יעזור לשפר אותה.");
    return;
  }
  cvbshellAiNote("");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "משפר...";
  try {
    const data = await aiRewriteSummaryCore(text, state.content.title, state.lang);
    if (data.limitReached) {
      cvbshellAiNote(data.isPro
        ? "הגעת למכסת השימוש ההוגן היומית (50 שיפורים). אפשר להמשיך מחר."
        : `${AI_UPGRADE_MESSAGE} <a href="#">שדרוג ל-Pro</a>`);
      return;
    }
    cvbshellSnapshot();
    input.value = data.improved;
    state.content.summary = data.improved;
    renderForm();
    renderPreview();
    cvbshellPatchTextContent("summary", data.improved);
  } catch (err) {
    cvbshellAiNote("משהו השתבש בשיפור התקציר. אפשר לנסות שוב בעוד רגע. (" + escapeHtml(err.message || String(err)) + ")");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function cvbshellPatchTextContent(key, value) {
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  if (!doc) return;
  doc.querySelectorAll(`[data-cvkey="${key}"]`).forEach((targetEl) => {
    // "contact" in the sidebar layout wraps several per-line divs
    // instead of one text node — a real re-render is the simplest
    // correct patch for that one case; every other field (and every
    // other layout's contact element) is a single node, safe to patch
    // in place without losing the cursor focus a full re-render would.
    if (key === "contact" && targetEl.children.length) {
      cvbshellRenderCanvas(cvbshellReanchorSelection);
    } else {
      targetEl.textContent = value;
    }
  });
  cvbshellApplySelectionVisual();
}

function cvbshellReanchorSelection() {
  if (!cvbshellSelection) return;
  if (cvbshellSelection.kind === "settings") return; // no canvas anchor to re-point at
  const doc = document.getElementById("cvbshell-canvas-iframe").contentDocument;
  if (!doc) return;
  let el = null;
  if (cvbshellSelection.kind === "text") el = doc.querySelector(`[data-cvkey="${cvbshellSelection.key}"]`);
  else if (cvbshellSelection.kind === "job") el = doc.querySelector(`[data-cv-job-idx="${cvbshellSelection.idx}"]`);
  else if (cvbshellSelection.kind === "project") el = doc.querySelector(`[data-cv-project-idx="${cvbshellSelection.idx}"]`);
  else if (cvbshellSelection.kind === "section") el = doc.querySelector(`[data-cvsection="${cvbshellSelection.type}"]`);
  if (el) { cvbshellSelection.rootEl = el; cvbshellApplySelectionVisual(); }
  else { cvbshellSelection = null; cvbshellRenderProperties(); }
}

function cvbshellWireJobProps(idx) {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("focus", () => cvbshellBeginEdit(el));
    el.addEventListener("blur", () => cvbshellEndEdit(el));
    el.addEventListener("input", () => {
      state.content.jobs[idx][key] = el.value;
      renderForm();
      cvbshellRenderCanvas(cvbshellReanchorSelection);
      cvbshellRenderHierarchy();
    });
  };
  bind("cvbshell-prop-job-title", "title");
  bind("cvbshell-prop-job-place", "place");
  bind("cvbshell-prop-job-dates", "dates");
  bind("cvbshell-prop-job-bullets", "bullets");
}

function cvbshellWireProjectProps(idx) {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("focus", () => cvbshellBeginEdit(el));
    el.addEventListener("blur", () => cvbshellEndEdit(el));
    el.addEventListener("input", () => {
      state.content.projects[idx][key] = el.value;
      renderForm();
      cvbshellRenderCanvas(cvbshellReanchorSelection);
      cvbshellRenderHierarchy();
    });
  };
  bind("cvbshell-prop-proj-title", "title");
  bind("cvbshell-prop-proj-link", "link");
  bind("cvbshell-prop-proj-bullets", "bullets");
}

function cvbshellWireSectionProps(type) {
  if (type !== "projects") return;
  const el = document.getElementById("cvbshell-prop-projects-visible");
  if (!el) return;
  el.addEventListener("change", () => {
    cvbshellSnapshot();
    cvbshellToggleProjectsVisibility();
    renderForm();
    cvbshellRenderCanvas(() => cvbshellSelectSection("projects"));
    cvbshellRenderHierarchy();
  });
}

/* ---------- DOMContentLoaded: activate only behind ?shell=1, same
   opt-in convention the website Shell used before it became the
   default (js/site-builder.js). Registered last (after js/builder.js
   and js/builder-cloud-save.js in builder.html) so `state` is already
   resolved — from a local draft, a cloud save, or a fresh template —
   by the time this runs; builder-cloud-save.js also calls
   cvbshellRefreshIfActive() itself, right after applyCvSnapshot(), for
   the rarer case where a signed-in account's cloud save resolves
   slightly later, asynchronously, after this handler already ran. */
function cvbshellRefreshIfActive() {
  if (!cvbshellActiveFlag) return;
  cvbshellSelection = null;
  cvbshellRenderCanvas();
  cvbshellRenderHierarchy();
  cvbshellRenderProperties();
}

// The Shell is now the default entry point for every visit to
// builder.html — ?shell=0 stays as an explicit, internal escape hatch
// back to the old sidebar (debugging/rollback only), never something
// any real link in the product constructs or shows.
document.addEventListener("DOMContentLoaded", () => {
  if (new URLSearchParams(location.search).get("shell") === "0") return;
  cvbshellActivate();
});
