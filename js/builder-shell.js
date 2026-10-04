/* ===========================================================
   Builder-Shell — Phase 2 prototype of DeskKit's new central editing
   surface (Hierarchy -> Canvas -> Selection -> Properties -> Editing ->
   Undo -> Responsive -> Preview -> Save). Reachable via
   sites.html?shell=1&template=local-service (see the branch added in
   site-builder.js's own DOMContentLoaded handler, right where it would
   otherwise call showWizard()).

   Deliberately scoped to ONE Design Starting Point (local-service) —
   proving the interaction model first, before generalizing it to the
   other 17 templates (that's its own later phase: migrating each one
   onto the Section/Block system, same as local-service already is, is
   the prerequisite). Every other template keeps using the existing
   sidebar-form builder untouched.

   Operates on the SAME siteState object, the SAME site_projects row,
   and the SAME save/publish/watermark machinery as the existing
   builder (js/site-builder.js, js/site-cloud-save.js) — this file adds
   a new way to look at and edit that data, not a second data model.
   Nothing here renders anything site-templates.js/site-blocks.js
   don't already know how to render; this file is the editing chrome
   around them.
   =========================================================== */

const BSHELL_SUPPORTED_TEMPLATES = ["local-service"];

// Which data-textkey marks each block's own root element in the
// rendered HTML — lets a click anywhere inside a block that ISN'T on a
// more specific target (a text field, a service card) resolve to
// "this whole Section is selected." Same idea as site-builder.js's own
// SECTION_PATCH_ANCHOR_OVERRIDES, just inverted (type -> anchor here,
// not anchor -> override) and scoped to the one template this runs on.
const BSHELL_SECTION_ANCHORS = {
  "local-service": { hero: "heading-heroTitle", services: "heading-services", about: "heading-about", contact: "heading-contact" },
};

const BSHELL_SECTION_LABELS = {
  hero: "Hero", services: "שירותים / מוצרים", about: "אודות", contact: "צור קשר",
};

// Content getter/setter per editable text field — the Properties
// panel's "Text" type reads/writes through this, same underlying
// d.businessName/d.headings/d.tagline/d.about fields the old sidebar
// builder already uses, so nothing about the data model changes.
const BSHELL_TEXT_CONTENT_MAP = {
  businessName: { label: "שם העסק", get: (d) => d.businessName || "", set: (d, v) => { d.businessName = v; } },
  "heading-heroTitle": { label: "כותרת ראשית", placeholder: "ברירת מחדל: שם העסק", get: (d) => (d.headings && d.headings.heroTitle) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.heroTitle = v; } },
  tagline: { label: "שורת תיאור", get: (d) => d.tagline || "", set: (d, v) => { d.tagline = v; } },
  aboutText: { label: "טקסט אודות", multiline: true, get: (d) => d.about || "", set: (d, v) => { d.about = v; } },
  "heading-services": { label: "כותרת השירותים", placeholder: "ברירת מחדל: השירותים שלנו", get: (d) => (d.headings && d.headings.services) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.services = v; } },
  "heading-about": { label: "כותרת האודות", placeholder: "ברירת מחדל: קצת עלינו", get: (d) => (d.headings && d.headings.about) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.about = v; } },
  "heading-contact": { label: "כותרת יצירת הקשר", placeholder: "ברירת מחדל: יצירת קשר", get: (d) => (d.headings && d.headings.contact) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.contact = v; } },
};

let bshellActiveFlag = false;
let bshellSelection = null; // { kind: "text"|"service"|"section", key?|idx?|type? }
let bshellUndoStack = [];
let bshellRedoStack = [];
const BSHELL_UNDO_CAP = 30;
let bshellSaveTimer = null;
let bshellCanvasClickWired = false;

/* ---------- Entry / exit ---------- */

function bshellActivate() {
  bshellActiveFlag = true;
  document.getElementById("tpl-catalog-section").style.display = "none";
  document.getElementById("wizard-section").style.display = "none";
  document.getElementById("builder-top-banner").style.display = "none";
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = "none";
  document.getElementById("bshell-root").classList.add("active");

  const t = SITE_TEMPLATES[siteState.template];
  document.getElementById("bshell-top-name").textContent = (siteState.data.businessName || "").trim() || (t ? t.label : "הפרויקט שלי");

  bshellWireTopBar();
  bshellRenderHierarchy();
  bshellRenderCanvas();
  bshellSyncUndoButtons();
}

/* ---------- Undo / Redo — one full siteState.data snapshot per
   logical edit (not per keystroke; see bshellBeginEdit()), capped so a
   long session doesn't grow this unboundedly. Independent of the
   AI-command undo stack in site-ai-command.js — same pattern, separate
   subsystem, since the two are never active in the same edit at once. */

function bshellSnapshot() {
  bshellUndoStack.push(JSON.stringify(siteState.data));
  if (bshellUndoStack.length > BSHELL_UNDO_CAP) bshellUndoStack.shift();
  bshellRedoStack = [];
  bshellSyncUndoButtons();
}

function bshellSyncUndoButtons() {
  const undoBtn = document.getElementById("bshell-undo-btn");
  const redoBtn = document.getElementById("bshell-redo-btn");
  if (undoBtn) undoBtn.disabled = bshellUndoStack.length === 0;
  if (redoBtn) redoBtn.disabled = bshellRedoStack.length === 0;
}

function bshellRestoreAfterHistoryMove() {
  ensurePagesShape(siteState.data);
  bshellSyncUndoButtons();
  bshellSelection = null;
  bshellRenderCanvas();
  bshellRenderHierarchy();
  bshellRenderProperties();
  bshellScheduleSave();
}

function bshellUndo() {
  if (!bshellUndoStack.length) return;
  bshellRedoStack.push(JSON.stringify(siteState.data));
  siteState.data = JSON.parse(bshellUndoStack.pop());
  bshellRestoreAfterHistoryMove();
}

function bshellRedo() {
  if (!bshellRedoStack.length) return;
  bshellUndoStack.push(JSON.stringify(siteState.data));
  siteState.data = JSON.parse(bshellRedoStack.pop());
  bshellRestoreAfterHistoryMove();
}

/* A text/number/color input snapshots once, on focus (before the
   user's very first keystroke in this round of edits) — not on every
   "input" event, which would make Undo revert one character at a
   time. Idempotent per focus via a dataset flag so re-focusing the
   same still-unblurred field doesn't stack extra snapshots. */
function bshellBeginEdit(inputEl) {
  if (inputEl.dataset.bshellEditing === "1") return;
  inputEl.dataset.bshellEditing = "1";
  bshellSnapshot();
}
function bshellEndEdit(inputEl) {
  delete inputEl.dataset.bshellEditing;
}

/* ---------- Top bar ---------- */

function bshellWireTopBar() {
  const root = document.getElementById("bshell-root");
  if (root.dataset.topWired) return;
  root.dataset.topWired = "1";

  document.getElementById("bshell-undo-btn").addEventListener("click", bshellUndo);
  document.getElementById("bshell-redo-btn").addEventListener("click", bshellRedo);
  document.addEventListener("keydown", (e) => {
    if (!bshellActiveFlag) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.key.toLowerCase() !== "z") return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return; // don't fight native text-field undo
    e.preventDefault();
    if (e.shiftKey) bshellRedo(); else bshellUndo();
  });

  document.getElementById("bshell-device-row").addEventListener("click", (e) => {
    const btn = e.target.closest(".bshell-device-btn");
    if (!btn) return;
    document.querySelectorAll(".bshell-device-btn").forEach((b) => b.classList.toggle("active", b === btn));
    const holder = document.getElementById("bshell-canvas-holder");
    holder.classList.remove("device-tablet", "device-mobile");
    if (btn.dataset.device === "tablet") holder.classList.add("device-tablet");
    else if (btn.dataset.device === "mobile") holder.classList.add("device-mobile");
  });

  document.getElementById("bshell-save-btn").addEventListener("click", async () => {
    const btn = document.getElementById("bshell-save-btn");
    btn.disabled = true;
    await bshellSaveNow();
    btn.disabled = false;
  });

  document.getElementById("bshell-preview-btn").addEventListener("click", () => {
    const url = new URL(location.href);
    url.searchParams.set("fullpreview", "1");
    url.searchParams.set("template", siteState.template);
    window.open(url.toString(), "_blank", "noopener");
  });

  // Publish reuses the existing finish/payment/watermark flow wholesale
  // — that screen already knows how to do this correctly (Gumroad,
  // license redemption, server-enforced watermark); rebuilding it
  // inside the prototype is explicitly out of scope for "prove the
  // editing model works."
  document.getElementById("bshell-publish-btn").addEventListener("click", () => {
    bshellSaveNow().then(() => {
      bshellActiveFlag = false;
      document.getElementById("bshell-root").classList.remove("active");
      showWizard();
      const gate = document.getElementById("finish-btn");
      if (gate) gate.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  document.getElementById("bshell-mobile-hier-btn").addEventListener("click", () => {
    document.getElementById("bshell-props").classList.remove("bshell-drawer-open");
    document.getElementById("bshell-hier").classList.toggle("bshell-drawer-open");
  });
  document.getElementById("bshell-mobile-props-btn").addEventListener("click", () => {
    document.getElementById("bshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("bshell-props").classList.toggle("bshell-drawer-open");
  });
}

async function bshellSaveNow() {
  clearTimeout(bshellSaveTimer);
  const status = document.getElementById("bshell-top-status");
  status.textContent = "שומרים...";
  status.className = "bshell-top-status saving";
  if (typeof saveSiteNow === "function") await saveSiteNow();
  status.textContent = "נשמר ✓";
  status.className = "bshell-top-status saved";
  setTimeout(() => { if (status.textContent === "נשמר ✓") status.textContent = ""; }, 2500);
}
function bshellScheduleSave() {
  clearTimeout(bshellSaveTimer);
  bshellSaveTimer = setTimeout(bshellSaveNow, 1200);
}

/* ---------- Hierarchy sidebar ---------- */

function bshellRenderHierarchy() {
  const list = document.getElementById("bshell-hier-list");
  const d = siteState.data;
  const template = siteState.template;
  const types = (typeof activeBlocksForPage === "function") ? activeBlocksForPage(d, template, "index") : [];
  const dd = (typeof withFallback === "function") ? withFallback(d) : d;

  list.innerHTML = types.map((type) => {
    const def = SITE_BLOCK_DEFS[template][type];
    const isSelectedSection = bshellSelection && bshellSelection.kind === "section" && bshellSelection.type === type;
    const hidden = !!(d.hiddenBlocks && d.hiddenBlocks[type]);
    let itemsHtml = "";
    if (def.hasItems) {
      const services = dd._services || d.services || [];
      itemsHtml = services.map((s, i) => {
        const isSelectedItem = bshellSelection && bshellSelection.kind === "service" && bshellSelection.idx === i;
        return `<button type="button" class="bshell-item${isSelectedItem ? " is-selected" : ""}" data-bshell-select-service="${i}">${escapeHtmlS(s.name && s.name.trim() ? s.name : `שירות ${i + 1}`)}</button>`;
      }).join("") + `<button type="button" class="bshell-add-item" data-bshell-add-service>+ הוספת שירות</button>`;
    }
    return `
      <details class="bshell-sec"${true ? " open" : ""}>
        <summary class="bshell-sec-head${isSelectedSection ? " is-selected" : ""}" data-bshell-select-section="${type}">
          <span class="bshell-sec-chevron"></span>
          <span>${escapeHtmlS(BSHELL_SECTION_LABELS[type] || type)}</span>
          ${hidden ? '<span class="bshell-sec-hidden-dot" title="מוסתר"></span>' : ""}
        </summary>
        ${itemsHtml ? `<div class="bshell-sec-body">${itemsHtml}</div>` : ""}
      </details>`;
  }).join("");

  list.querySelectorAll("[data-bshell-select-section]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      bshellSelectSection(el.dataset.bshellSelectSection);
    });
  });
  list.querySelectorAll("[data-bshell-select-service]").forEach((el) => {
    el.addEventListener("click", () => bshellSelectService(parseInt(el.dataset.bshellSelectService, 10)));
  });
  list.querySelectorAll("[data-bshell-add-service]").forEach((el) => {
    el.addEventListener("click", () => {
      bshellSnapshot();
      d.services = d.services || [];
      d.services.push({ name: "", desc: "", price: "" });
      const newIdx = d.services.length - 1;
      bshellRenderCanvas(() => bshellSelectService(newIdx));
      bshellRenderHierarchy();
      bshellScheduleSave();
    });
  });
}

/* ---------- Canvas: render + click-to-select ---------- */

/* Setting .srcdoc is asynchronous — the new document isn't ready the
   instant this returns, it's ready once the iframe fires "load". Every
   call site that needs to touch the FRESH document afterward (reselect
   whatever was selected, since the old selection's rootEl belongs to
   the document that just got replaced) passes afterLoad rather than
   assuming contentDocument is already the new one. */
function bshellRenderCanvas(afterLoad) {
  const iframe = document.getElementById("bshell-canvas-iframe");
  iframe.srcdoc = currentSiteHtml("index");
  bshellCanvasClickWired = false;
  iframe.onload = () => {
    bshellWireCanvasClicks();
    bshellApplySelectionVisual();
    if (afterLoad) afterLoad();
  };
}

function bshellWireCanvasClicks() {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc || bshellCanvasClickWired) return;
  bshellCanvasClickWired = true;
  doc.addEventListener("click", (e) => {
    if (e.target.closest("#bshell-mini-toolbar")) return;
    const a = e.target.closest("a");
    if (a) e.preventDefault(); // selecting, not navigating, inside the canvas
    const resolved = bshellResolveClickTarget(e, doc);
    if (!resolved) { bshellDeselect(); return; }
    bshellSelection = resolved;
    bshellApplySelectionVisual();
    bshellRenderProperties();
    bshellRenderHierarchy();
  }, true);
}

function bshellResolveClickTarget(e, doc) {
  const svcEl = e.target.closest("[data-svc-idx]");
  if (svcEl) return { kind: "service", idx: parseInt(svcEl.dataset.svcIdx, 10), rootEl: svcEl };

  const textEl = e.target.closest("[data-textkey]");
  if (textEl && BSHELL_TEXT_CONTENT_MAP[textEl.dataset.textkey]) {
    return { kind: "text", key: textEl.dataset.textkey, rootEl: textEl };
  }

  const sectionRoot = e.target.closest("body > *");
  if (!sectionRoot) return null;
  const anchors = BSHELL_SECTION_ANCHORS[siteState.template] || {};
  for (const type of Object.keys(anchors)) {
    if (sectionRoot.querySelector(`[data-textkey="${anchors[type]}"]`)) {
      return { kind: "section", type, rootEl: sectionRoot };
    }
  }
  return null;
}

function bshellDeselect() {
  bshellSelection = null;
  bshellApplySelectionVisual();
  bshellRenderProperties();
  bshellRenderHierarchy();
}

function bshellSelectSection(type) {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe.contentDocument;
  const anchorKey = (BSHELL_SECTION_ANCHORS[siteState.template] || {})[type];
  const anchorEl = anchorKey && doc && doc.querySelector(`[data-textkey="${anchorKey}"]`);
  const rootEl = anchorEl ? anchorEl.closest("body > *") : null;
  if (!rootEl) return;
  bshellSelection = { kind: "section", type, rootEl };
  rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
  bshellApplySelectionVisual();
  bshellRenderProperties();
  bshellRenderHierarchy();
}

function bshellSelectService(idx) {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe.contentDocument;
  const el = doc && doc.querySelector(`[data-svc-idx="${idx}"]`);
  if (!el) return;
  bshellSelection = { kind: "service", idx, rootEl: el };
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  bshellApplySelectionVisual();
  bshellRenderProperties();
  bshellRenderHierarchy();
}

/* Outline + mini-toolbar are injected straight into the iframe's own
   document (not positioned from the parent page) — far simpler than
   tracking cross-frame coordinates on every scroll/resize, and it
   naturally scrolls/stays put with the content since it IS content of
   that document. */
function bshellApplySelectionVisual() {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.querySelectorAll(".bshell-outline-target").forEach((el) => el.classList.remove("bshell-outline-target"));
  const oldToolbar = doc.getElementById("bshell-mini-toolbar");
  if (oldToolbar) oldToolbar.remove();
  if (!bshellSelection || !bshellSelection.rootEl || !doc.contains(bshellSelection.rootEl)) return;

  if (!doc.getElementById("bshell-outline-style")) {
    const style = doc.createElement("style");
    style.id = "bshell-outline-style";
    style.textContent = `
      .bshell-outline-target{outline:2px solid #14B8A6 !important; outline-offset:2px !important;}
      #bshell-mini-toolbar{position:absolute; z-index:999999; display:flex; gap:2px; background:#111827; border-radius:8px; padding:3px; box-shadow:0 4px 14px rgba(0,0,0,.28);}
      #bshell-mini-toolbar button{all:unset; box-sizing:border-box; cursor:pointer; color:#fff; width:27px; height:27px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:13px; text-align:center;}
      #bshell-mini-toolbar button:hover:not(:disabled){background:#14B8A6;}
      #bshell-mini-toolbar button:disabled{opacity:.35; cursor:default;}`;
    doc.head.appendChild(style);
  }

  const el = bshellSelection.rootEl;
  el.classList.add("bshell-outline-target");
  const rect = el.getBoundingClientRect();
  const scrollY = doc.defaultView.scrollY || doc.documentElement.scrollTop;
  const toolbar = doc.createElement("div");
  toolbar.id = "bshell-mini-toolbar";
  toolbar.style.top = Math.max(4, rect.top + scrollY - 34) + "px";
  toolbar.style.insetInlineStart = Math.max(4, rect.left) + "px";
  const canDuplicate = bshellSelection.kind === "service";
  const canHide = bshellSelection.kind === "section";
  const canDelete = bshellSelection.kind === "service";
  toolbar.innerHTML = `
    <button type="button" data-tool="edit" title="עריכה">✎</button>
    <button type="button" data-tool="duplicate" title="שכפול"${canDuplicate ? "" : " disabled"}>⧉</button>
    <button type="button" data-tool="hide" title="הסתרה/הצגה"${canHide ? "" : " disabled"}>◐</button>
    <button type="button" data-tool="delete" title="מחיקה"${canDelete ? "" : " disabled"}>🗑</button>`;
  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  toolbar.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("button[data-tool]");
    if (!btn || btn.disabled) return;
    bshellToolbarAction(btn.dataset.tool);
  });
  doc.body.appendChild(toolbar);
}

function bshellToolbarAction(tool) {
  if (!bshellSelection) return;
  if (tool === "edit") {
    document.getElementById("bshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("bshell-props").classList.add("bshell-drawer-open");
    const first = document.querySelector("#bshell-props-body input, #bshell-props-body textarea");
    if (first) first.focus();
    return;
  }
  if (tool === "duplicate" && bshellSelection.kind === "service") {
    bshellSnapshot();
    const d = siteState.data;
    const copyIdx = bshellSelection.idx + 1;
    const copy = Object.assign({}, d.services[bshellSelection.idx]);
    d.services.splice(copyIdx, 0, copy);
    bshellRenderCanvas(() => bshellSelectService(copyIdx));
    bshellRenderHierarchy();
    bshellScheduleSave();
    return;
  }
  if (tool === "hide" && bshellSelection.kind === "section") {
    bshellSnapshot();
    const d = siteState.data;
    const type = bshellSelection.type;
    if (type === "about" || type === "contact") {
      // Same real mechanism the old sidebar's "דף נפרד" checkboxes
      // use — hiding the inline section here is the mirror of turning
      // that page OFF, not a second, parallel visibility flag.
      ensurePagesShape(d).pages[type] = !(d.pages && d.pages[type]);
    } else {
      d.hiddenBlocks = d.hiddenBlocks || {};
      d.hiddenBlocks[type] = !d.hiddenBlocks[type];
    }
    bshellDeselect();
    bshellRenderCanvas();
    bshellRenderHierarchy();
    bshellScheduleSave();
    return;
  }
  if (tool === "delete" && bshellSelection.kind === "service") {
    if (siteState.data.services.length <= 1) return; // a services section needs at least one row to mean anything
    bshellSnapshot();
    siteState.data.services.splice(bshellSelection.idx, 1);
    bshellDeselect();
    bshellRenderCanvas();
    bshellRenderHierarchy();
    bshellScheduleSave();
  }
}

/* hiddenBlocks (new, additive) gates hero/services the same way
   def.active() already gates about/contact via d.pages — read here so
   activeBlocksForPage() (js/site-blocks.js) respects it without that
   shared file needing to know this prototype exists. Called once,
   patched onto SITE_BLOCK_DEFS at load time below. */
(function bshellPatchBlockVisibility() {
  const defs = SITE_BLOCK_DEFS && SITE_BLOCK_DEFS["local-service"];
  if (!defs) return;
  ["hero", "services"].forEach((type) => {
    if (defs[type] && !defs[type].active) {
      defs[type].active = (d) => !(d.hiddenBlocks && d.hiddenBlocks[type]);
    }
  });
})();

/* ---------- Properties panel ---------- */

function bshellRenderProperties() {
  const empty = document.getElementById("bshell-props-empty");
  const body = document.getElementById("bshell-props-body");
  if (!bshellSelection) {
    empty.style.display = "";
    body.style.display = "none";
    body.innerHTML = "";
    return;
  }
  empty.style.display = "none";
  body.style.display = "";
  if (bshellSelection.kind === "text") body.innerHTML = bshellPropsHtmlForText(bshellSelection.key);
  else if (bshellSelection.kind === "service") body.innerHTML = bshellPropsHtmlForService(bshellSelection.idx);
  else if (bshellSelection.kind === "section") body.innerHTML = bshellPropsHtmlForSection(bshellSelection.type);
  bshellWirePropertiesPanel();
}

function bshellPropsHtmlForText(key) {
  const field = BSHELL_TEXT_CONTENT_MAP[key];
  const d = siteState.data;
  const content = field ? field.get(d) : "";
  const style = (d.textStyles && d.textStyles[key]) || {};
  const inputTag = field && field.multiline
    ? `<textarea id="bshell-prop-content" maxlength="500">${escapeHtmlS(content)}</textarea>`
    : `<input type="text" id="bshell-prop-content" maxlength="90" value="${escapeHtmlS(content)}" placeholder="${field && field.placeholder ? escapeHtmlS(field.placeholder) : ""}">`;
  return `
    <span class="bshell-props-kind">טקסט</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">${field ? escapeHtmlS(field.label) : "טקסט"}</label>
      ${inputTag}
    </div>
    <div class="bshell-props-row">
      <div class="bshell-props-field">
        <label class="bshell-props-label">גודל (px)</label>
        <input type="number" id="bshell-prop-size" min="8" max="140" value="${style.size || ""}" placeholder="ברירת מחדל">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">צבע</label>
        <input type="color" id="bshell-prop-color" value="${style.color ? "#" + String(style.color).replace("#", "") : "#000000"}">
      </div>
    </div>
    <div class="bshell-props-field">
      <label class="bshell-props-label">יישור</label>
      <div class="bshell-align-row">
        <button type="button" class="bshell-align-btn${style.align === "right" ? " active" : ""}" data-align="right">ימין</button>
        <button type="button" class="bshell-align-btn${style.align === "center" ? " active" : ""}" data-align="center">מרכז</button>
        <button type="button" class="bshell-align-btn${style.align === "left" ? " active" : ""}" data-align="left">שמאל</button>
      </div>
    </div>
    <button type="button" class="bshell-props-reset" id="bshell-prop-reset">איפוס עיצוב מותאם</button>`;
}

function bshellPropsHtmlForService(idx) {
  const s = siteState.data.services[idx] || { name: "", desc: "", price: "" };
  return `
    <span class="bshell-props-kind">כרטיס שירות</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">שם השירות</label>
      <input type="text" id="bshell-prop-svc-name" maxlength="40" value="${escapeHtmlS(s.name)}">
    </div>
    <div class="bshell-props-field">
      <label class="bshell-props-label">תיאור קצר</label>
      <textarea id="bshell-prop-svc-desc" maxlength="90">${escapeHtmlS(s.desc)}</textarea>
    </div>
    <div class="bshell-props-field">
      <label class="bshell-props-label">מחיר (לא חובה)</label>
      <input type="text" id="bshell-prop-svc-price" maxlength="20" value="${escapeHtmlS(s.price)}">
    </div>`;
}

function bshellPropsHtmlForSection(type) {
  const d = siteState.data;
  const options = (typeof variantOptionsFor === "function") ? variantOptionsFor(siteState.template, type) : null;
  const current = (d.blockVariants && d.blockVariants[type]) || "default";
  // about/contact are "visible inline" exactly when that page's own
  // separate-page toggle is OFF (an ON separate page is what makes the
  // inline section disappear, same as the rest of the builder already
  // works) — hero/services use the new additive hiddenBlocks flag.
  const reallyVisible = (type === "about" || type === "contact") ? !(d.pages && d.pages[type]) : !(d.hiddenBlocks && d.hiddenBlocks[type]);
  return `
    <span class="bshell-props-kind">Section</span>
    ${options ? `
    <div class="bshell-props-field">
      <label class="bshell-props-label">עיצוב (Layout)</label>
      <select id="bshell-prop-variant">
        ${Object.entries(options).map(([key, o]) => `<option value="${key}"${key === current ? " selected" : ""}>${escapeHtmlS(o.label)}</option>`).join("")}
      </select>
    </div>` : `<p style="font-size:12.5px; color:var(--text-muted); margin:0 0 16px;">לחלק הזה אין כרגע עיצובים חלופיים.</p>`}
    <div class="bshell-props-field">
      <div class="bshell-toggle-row">
        <label class="bshell-props-label" style="margin:0;">הצגת החלק הזה</label>
        <label class="bshell-switch">
          <input type="checkbox" id="bshell-prop-visible"${reallyVisible ? " checked" : ""}>
          <span class="bshell-switch-track"></span>
          <span class="bshell-switch-thumb"></span>
        </label>
      </div>
    </div>`;
}

function bshellWirePropertiesPanel() {
  if (bshellSelection.kind === "text") return bshellWireTextProps(bshellSelection.key);
  if (bshellSelection.kind === "service") return bshellWireServiceProps(bshellSelection.idx);
  if (bshellSelection.kind === "section") return bshellWireSectionProps(bshellSelection.type);
}

function bshellWireTextProps(key) {
  const field = BSHELL_TEXT_CONTENT_MAP[key];
  const contentEl = document.getElementById("bshell-prop-content");
  const sizeEl = document.getElementById("bshell-prop-size");
  const colorEl = document.getElementById("bshell-prop-color");
  const resetBtn = document.getElementById("bshell-prop-reset");

  if (contentEl) {
    contentEl.addEventListener("focus", () => bshellBeginEdit(contentEl));
    contentEl.addEventListener("blur", () => bshellEndEdit(contentEl));
    contentEl.addEventListener("input", () => {
      if (field) field.set(siteState.data, contentEl.value);
      bshellPatchTextContent(key, contentEl.value, !!(field && field.multiline));
      bshellScheduleSave();
    });
  }

  function commitStyle() {
    const s = (siteState.data.textStyles && siteState.data.textStyles[key]) || {};
    const next = Object.assign({}, s);
    if (sizeEl) { if (sizeEl.value) next.size = sizeEl.value; else delete next.size; }
    if (colorEl && colorEl.dataset.touched) next.color = colorEl.value.replace("#", "");
    siteState.data.textStyles = siteState.data.textStyles || {};
    if (next.size || next.color || next.align || next.font) siteState.data.textStyles[key] = next;
    else delete siteState.data.textStyles[key];
    bshellPatchTextStyle(key);
    bshellScheduleSave();
  }
  if (sizeEl) {
    sizeEl.addEventListener("focus", () => bshellBeginEdit(sizeEl));
    sizeEl.addEventListener("blur", () => bshellEndEdit(sizeEl));
    sizeEl.addEventListener("input", commitStyle);
  }
  if (colorEl) {
    colorEl.addEventListener("focus", () => bshellBeginEdit(colorEl));
    colorEl.addEventListener("change", () => bshellEndEdit(colorEl));
    colorEl.addEventListener("input", () => { colorEl.dataset.touched = "1"; commitStyle(); });
  }
  document.querySelectorAll(".bshell-align-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      bshellSnapshot();
      const wasActive = btn.classList.contains("active");
      document.querySelectorAll(".bshell-align-btn").forEach((b) => b.classList.remove("active"));
      const s = (siteState.data.textStyles && siteState.data.textStyles[key]) || {};
      const next = Object.assign({}, s);
      if (wasActive) delete next.align; else { btn.classList.add("active"); next.align = btn.dataset.align; }
      siteState.data.textStyles = siteState.data.textStyles || {};
      if (next.size || next.color || next.align || next.font) siteState.data.textStyles[key] = next;
      else delete siteState.data.textStyles[key];
      bshellPatchTextStyle(key);
      bshellScheduleSave();
    });
  });
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      bshellSnapshot();
      delete (siteState.data.textStyles || {})[key];
      bshellPatchTextStyle(key);
      bshellRenderProperties();
      bshellScheduleSave();
    });
  }
}

function bshellPatchTextContent(key, value, multiline) {
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  if (!doc) return;
  if (!value.trim()) { bshellRenderCanvas(bshellReanchorSelection); return; } // empty -> fall back to template default, needs a real re-render
  const html = multiline ? nl2brS(value) : escapeHtmlS(value);
  doc.querySelectorAll(`[data-textkey="${key}"]`).forEach((el) => { el.innerHTML = html; });
  bshellApplySelectionVisual();
}
function bshellPatchTextStyle(key) {
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  if (!doc) return;
  const css = textStyleCss((siteState.data.textStyles || {})[key]);
  doc.querySelectorAll(`[data-textkey="${key}"]`).forEach((el) => {
    if (css) el.setAttribute("style", css); else el.removeAttribute("style");
  });
  bshellApplySelectionVisual();
}

function bshellWireServiceProps(idx) {
  const nameEl = document.getElementById("bshell-prop-svc-name");
  const descEl = document.getElementById("bshell-prop-svc-desc");
  const priceEl = document.getElementById("bshell-prop-svc-price");
  const bind = (el, key) => {
    if (!el) return;
    el.addEventListener("focus", () => bshellBeginEdit(el));
    el.addEventListener("blur", () => bshellEndEdit(el));
    el.addEventListener("input", () => {
      siteState.data.services[idx][key] = el.value;
      // service-card markup (num/name/desc/price together) isn't a
      // single data-textkey span, so a real re-render is the simplest
      // correct patch — bshellReanchorSelection() re-points the
      // selection at the matching card in the FRESH document (instead
      // of the full bshellSelectService(), which also rebuilds the
      // properties panel and would steal focus/cursor out of the field
      // the user is still typing in).
      bshellRenderCanvas(bshellReanchorSelection);
      bshellRenderHierarchy();
      bshellScheduleSave();
    });
  };
  bind(nameEl, "name"); bind(descEl, "desc"); bind(priceEl, "price");
}

/* Lighter than a full re-select: keeps the current selection's TYPE/
   KEY/IDX, just re-points rootEl at the matching element in whatever
   document is now loaded in the canvas, and refreshes the outline/
   toolbar — without touching the Properties panel, so it never steals
   focus out of a field the user is actively typing in. Falls back to
   clearing the selection if the element genuinely isn't there anymore
   (e.g. it just got hidden). */
function bshellReanchorSelection() {
  if (!bshellSelection) return;
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  if (!doc) return;
  let el = null;
  if (bshellSelection.kind === "service") el = doc.querySelector(`[data-svc-idx="${bshellSelection.idx}"]`);
  else if (bshellSelection.kind === "text") el = doc.querySelector(`[data-textkey="${bshellSelection.key}"]`);
  else if (bshellSelection.kind === "section") {
    const anchorKey = (BSHELL_SECTION_ANCHORS[siteState.template] || {})[bshellSelection.type];
    const anchorEl = anchorKey && doc.querySelector(`[data-textkey="${anchorKey}"]`);
    el = anchorEl ? anchorEl.closest("body > *") : null;
  }
  if (el) { bshellSelection.rootEl = el; bshellApplySelectionVisual(); }
  else { bshellSelection = null; bshellRenderProperties(); }
}

function bshellWireSectionProps(type) {
  const variantEl = document.getElementById("bshell-prop-variant");
  const visibleEl = document.getElementById("bshell-prop-visible");
  if (variantEl) {
    variantEl.addEventListener("change", () => {
      bshellSnapshot();
      siteState.data.blockVariants = siteState.data.blockVariants || {};
      if (variantEl.value === "default") delete siteState.data.blockVariants[type];
      else siteState.data.blockVariants[type] = variantEl.value;
      bshellRenderCanvas(() => bshellSelectSection(type));
      bshellScheduleSave();
    });
  }
  if (visibleEl) {
    visibleEl.addEventListener("change", () => {
      bshellSnapshot();
      const d = siteState.data;
      if (type === "about" || type === "contact") ensurePagesShape(d).pages[type] = !visibleEl.checked;
      else { d.hiddenBlocks = d.hiddenBlocks || {}; d.hiddenBlocks[type] = !visibleEl.checked; }
      bshellRenderCanvas(() => bshellSelectSection(type));
      bshellRenderHierarchy();
      bshellScheduleSave();
    });
  }
}
