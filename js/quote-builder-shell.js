/* ===========================================================
   Quote Builder-Shell — the same central editing pattern proved on
   CV (js/cv-builder-shell.js) and websites (js/builder-shell.js),
   applied to the quote builder. Reachable via quote-app.html?shell=1
   (same opt-in convention). Operates on the SAME quoteEventState/
   currentProfile objects and the SAME renderQuoteHtml()/
   saveQuoteNow()/renderQuoteFormQA()/renderQuotePreviewQA() functions
   js/quote-app.js, js/quote-render.js and js/quote-cloud-save.js
   already define — this file adds a new way to look at and edit that
   data, not a second data model or a second save path. The letter's
   own design (QUOTE_CSS/QUOTE_SKIN_CSS in quote-render.js) never
   changes to fit this file; only additive data-qkey/data-q-date-idx
   hooks were added there so a canvas click resolves to something —
   zero visual difference.

   Schema (kept exactly as simple as the content itself):
     today / recipient / eventName / description / price / vatNote /
       policeNote -> plain text elements, directly selectable.
     eventDates -> the one container Section with real repeatable
       items (quoteEventState.eventDates[]) — not optional (always at
       least one), so no hide/show toggle, just add/duplicate/delete.

   Style/profile live under Settings (a 4th selection kind, no canvas
   anchor):
     - "סגנון עיצוב": 4 buttons over the SAME QUOTE_TEMPLATES skins
       quote-render.js already draws from (quote-render.js's whole
       point is one shared render() + a per-skin CSS block — switching
       skin was ALREADY non-destructive to begin with, this just
       exposes it live instead of through qa-catalog's card grid).
     - "פרטי העסק": the EXISTING #qa-profile-form moved in wholesale
       (not recreated) so its submit handler, upload-to-Storage logic
       and validation keep working unchanged — same "move, don't
       duplicate" trick cv-builder-shell.js uses for #font-select et
       al. Business profile is a separate, shared-across-documents
       entity (never per-quote), so it is deliberately NOT part of
       this file's Undo/Redo stack — only quoteEventState is.
   =========================================================== */

let quoteBshellActiveFlag = false;
let quoteBshellSelection = null; // { kind: "text"|"date"|"section"|"settings", key?|idx?|type?, rootEl? }
let quoteBshellUndoStack = [];
let quoteBshellRedoStack = [];
const QUOTEBSHELL_UNDO_CAP = 30;
let quoteBshellCanvasClickWired = false;

const QUOTEBSHELL_TEXT_LABELS = {
  today: "תאריך היום", recipient: "לכבוד (שם הנמען)", eventName: "שם האירוע / השירות",
  description: "תיאור", price: "מחיר (₪)", vatNote: 'הערת מע"מ', policeNote: "הערה נוספת",
};
const QUOTEBSHELL_TEXT_HINTS = {
  vatNote: 'אם משאירים ריק, יוצג מחיר כולל מע"מ אוטומטית לפי האחוז שהוגדר בפרטי העסק.',
};
// price/vatNote both feed the auto-calculated VAT line below them,
// which restructures its own markup depending on whether vatNote is
// empty (see renderQuoteHtml) — a full re-render is the simplest
// correct patch for those two; every other field is one static leaf
// node, safe to patch in place.
const QUOTEBSHELL_FULL_RERENDER_KEYS = ["price", "vatNote"];

/* ---------- Entry ---------- */

function quoteBshellActivate() {
  quoteBshellActiveFlag = true;
  ["qa-catalog", "qa-profile", "qa-app"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  quoteBshellMoveProfileForm();
  quoteBshellWireStyleSwitcher();
  quoteBshellWireProfileLiveUpdate();
  quoteBshellWireLogoLiveUpdate();
  document.getElementById("qbshell-root").classList.add("active");
  quoteBshellWireTopBar();
  quoteBshellRenderHierarchy();
  quoteBshellRenderCanvas();
  quoteBshellSyncUndoButtons();
}

/* Reparents the EXISTING #qa-profile-form wholesale (not recreating
   its fields) into the Shell's Settings panel — its submit handler,
   logo-upload-to-Storage logic and validation (js/quote-app.js's
   wireProfileForm) all keep working completely unchanged. */
function quoteBshellMoveProfileForm() {
  const group = document.getElementById("qbshell-settings-group-profile");
  if (!group || group.dataset.moved) return;
  group.dataset.moved = "1";
  const form = document.getElementById("qa-profile-form");
  if (form) group.appendChild(form);
}

/* The moved form's fields only ever had a submit-time read (fill in,
   then explicitly save) — never a live one, since in the old UI
   #qa-profile and #qa-app were never visible at the same time anyway.
   Inside the Shell, Settings and the canvas ARE visible together, so
   typing a business name should reflect immediately, same as every
   other live field in this Shell — persisting to Supabase still only
   happens on the form's own explicit submit, untouched. */
function quoteBshellWireProfileLiveUpdate() {
  const map = {
    "pf-businessName": "business_name", "pf-tagline1": "tagline1", "pf-tagline2": "tagline2",
    "pf-email": "email", "pf-idNumber": "id_number", "pf-phone": "phone", "pf-fax": "fax",
    "pf-signerName": "signer_name", "pf-vatRate": "vat_rate",
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.liveWired) return;
    el.dataset.liveWired = "1";
    el.addEventListener("focus", () => quoteBshellBeginEdit(el));
    el.addEventListener("blur", () => quoteBshellEndEdit(el));
    el.addEventListener("input", () => {
      if (!currentProfile) currentProfile = {};
      currentProfile[key] = el.value;
      renderQuotePreviewQA();
      quoteBshellRenderCanvas(quoteBshellReanchorSelection);
    });
  });
}

/* The logo upload is async (Supabase Storage) and already fully
   handled by quote-app.js's own #pf-logo-file listener, which ends by
   calling renderLogoPreview() — observing THAT element's own DOM
   update (success or removal) is what actually tells us the upload
   settled, rather than guessing a timeout that could race a slow
   connection. */
function quoteBshellWireLogoLiveUpdate() {
  const preview = document.getElementById("pf-logo-preview");
  if (!preview || preview.dataset.liveWired) return;
  preview.dataset.liveWired = "1";
  new MutationObserver(() => {
    if (!currentProfile) currentProfile = {};
    currentProfile.logo_url = pendingLogoUrl;
    quoteBshellRenderCanvas(quoteBshellReanchorSelection);
  }).observe(preview, { childList: true });
}

/* The Shell's own "סגנון עיצוב" control — reuses QUOTE_TEMPLATES'
   existing 4 skins (quote-render.js) directly: switching skin was
   ALREADY non-destructive (one shared render() + per-skin CSS, see
   that file's own header comment), this just exposes it live instead
   of through qa-catalog's card grid. */
function quoteBshellWireStyleSwitcher() {
  const row = document.getElementById("qbshell-style-row");
  if (!row || row.dataset.wired) return;
  row.dataset.wired = "1";
  row.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-q-style]");
    if (!btn) return;
    if (btn.dataset.qStyle === quoteEventState.template) return;
    quoteBshellSnapshot();
    quoteEventState.template = btn.dataset.qStyle;
    renderQuotePreviewQA();
    quoteBshellRenderCanvas(quoteBshellReanchorSelection);
    quoteBshellSyncStyleButtons();
  });
}
function quoteBshellSyncStyleButtons() {
  const row = document.getElementById("qbshell-style-row");
  if (!row) return;
  row.querySelectorAll("[data-q-style]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.qStyle === quoteEventState.template);
  });
}

/* ---------- Undo / Redo — scoped to quoteEventState only. The shared
   business profile is a separate, cross-document entity with its own
   explicit save (the moved form's submit button), deliberately not
   part of this per-quote history. */

function quoteBshellSnapshot() {
  quoteBshellUndoStack.push(JSON.stringify(quoteEventState));
  if (quoteBshellUndoStack.length > QUOTEBSHELL_UNDO_CAP) quoteBshellUndoStack.shift();
  quoteBshellRedoStack = [];
  quoteBshellSyncUndoButtons();
}
function quoteBshellSyncUndoButtons() {
  const undoBtn = document.getElementById("qbshell-undo-btn");
  const redoBtn = document.getElementById("qbshell-redo-btn");
  if (undoBtn) undoBtn.disabled = quoteBshellUndoStack.length === 0;
  if (redoBtn) redoBtn.disabled = quoteBshellRedoStack.length === 0;
}
function quoteBshellApplySnapshot(raw) {
  quoteEventState = JSON.parse(raw);
  renderQuoteFormQA();
  renderQuotePreviewQA();
  quoteBshellSelection = null;
  quoteBshellSyncUndoButtons();
  quoteBshellRenderCanvas();
  quoteBshellRenderHierarchy();
  quoteBshellRenderProperties();
}
function quoteBshellUndo() {
  if (!quoteBshellUndoStack.length) return;
  quoteBshellRedoStack.push(JSON.stringify(quoteEventState));
  quoteBshellApplySnapshot(quoteBshellUndoStack.pop());
}
function quoteBshellRedo() {
  if (!quoteBshellRedoStack.length) return;
  quoteBshellUndoStack.push(JSON.stringify(quoteEventState));
  quoteBshellApplySnapshot(quoteBshellRedoStack.pop());
}
function quoteBshellBeginEdit(inputEl) {
  if (inputEl.dataset.qbshellEditing === "1") return;
  inputEl.dataset.qbshellEditing = "1";
  quoteBshellSnapshot();
}
function quoteBshellEndEdit(inputEl) {
  delete inputEl.dataset.qbshellEditing;
}

/* ---------- Top bar ---------- */

function quoteBshellWireTopBar() {
  const root = document.getElementById("qbshell-root");
  if (root.dataset.topWired) return;
  root.dataset.topWired = "1";

  document.getElementById("qbshell-undo-btn").addEventListener("click", quoteBshellUndo);
  document.getElementById("qbshell-redo-btn").addEventListener("click", quoteBshellRedo);
  document.addEventListener("keydown", (e) => {
    if (!quoteBshellActiveFlag) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.key.toLowerCase() !== "z") return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
    e.preventDefault();
    if (e.shiftKey) quoteBshellRedo(); else quoteBshellUndo();
  });

  document.getElementById("qbshell-settings-btn").addEventListener("click", quoteBshellSelectSettings);

  document.getElementById("qbshell-download-btn").addEventListener("click", () => {
    document.getElementById("quote-download-btn").click();
  });

  document.getElementById("qbshell-save-btn").addEventListener("click", async () => {
    const btn = document.getElementById("qbshell-save-btn");
    btn.disabled = true;
    await quoteBshellSaveNow();
    btn.disabled = false;
  });

  document.getElementById("qbshell-mobile-hier-btn").addEventListener("click", () => {
    document.getElementById("qbshell-props").classList.remove("bshell-drawer-open");
    document.getElementById("qbshell-hier").classList.toggle("bshell-drawer-open");
  });
  document.getElementById("qbshell-mobile-props-btn").addEventListener("click", () => {
    document.getElementById("qbshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("qbshell-props").classList.toggle("bshell-drawer-open");
  });

  window.addEventListener("resize", () => {
    clearTimeout(window._quoteBshellFitTimer);
    window._quoteBshellFitTimer = setTimeout(quoteBshellFitCanvas, 150);
  });
}

/* Explicit-save-only (js/quote-cloud-save.js's own documented design)
   — never auto-triggered on every edit. */
async function quoteBshellSaveNow() {
  const status = document.getElementById("qbshell-top-status");
  status.textContent = "שומרים...";
  status.className = "bshell-top-status saving";
  const err = await saveQuoteNow();
  status.textContent = err ? "השמירה נכשלה, נסו שוב" : "נשמר ✓";
  status.className = "bshell-top-status " + (err ? "" : "saved");
  if (window.refreshMyPanel) window.refreshMyPanel();
  setTimeout(() => { if (status.textContent === "נשמר ✓") status.textContent = ""; }, 2500);
}

/* ---------- Hierarchy sidebar ---------- */

function quoteBshellRenderHierarchy() {
  const list = document.getElementById("qbshell-hier-list");
  const q = quoteEventState;
  document.getElementById("qbshell-settings-btn").classList.toggle("is-selected", !!(quoteBshellSelection && quoteBshellSelection.kind === "settings"));

  const textRow = (key) => {
    const isSel = quoteBshellSelection && quoteBshellSelection.kind === "text" && quoteBshellSelection.key === key;
    return `
      <details class="bshell-sec" open>
        <summary class="bshell-sec-head${isSel ? " is-selected" : ""}" data-qbshell-select-text="${key}">
          <span class="bshell-sec-chevron" style="visibility:hidden;"></span>
          <span>${escapeHtmlQ(QUOTEBSHELL_TEXT_LABELS[key])}</span>
        </summary>
      </details>`;
  };

  const isSelSection = quoteBshellSelection && quoteBshellSelection.kind === "section" && quoteBshellSelection.type === "eventDates";
  const dateRows = (q.eventDates || []).map((d, i) => {
    const isSelItem = quoteBshellSelection && quoteBshellSelection.kind === "date" && quoteBshellSelection.idx === i;
    return `<button type="button" class="bshell-item${isSelItem ? " is-selected" : ""}" data-qbshell-select-date="${i}">${escapeHtmlQ(d && d.trim() ? d : `תאריך ${i + 1}`)}</button>`;
  }).join("") + `<button type="button" class="bshell-add-item" data-qbshell-add-date>+ הוספת תאריך</button>`;

  list.innerHTML = [
    textRow("today"), textRow("recipient"), textRow("eventName"),
    `<details class="bshell-sec" open>
      <summary class="bshell-sec-head${isSelSection ? " is-selected" : ""}" data-qbshell-select-section="eventDates">
        <span class="bshell-sec-chevron"></span>
        <span>תאריכים</span>
      </summary>
      <div class="bshell-sec-body">${dateRows}</div>
    </details>`,
    textRow("description"), textRow("price"), textRow("vatNote"), textRow("policeNote"),
  ].join("");

  list.querySelectorAll("[data-qbshell-select-text]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); quoteBshellSelectText(el.dataset.qbshellSelectText); });
  });
  list.querySelectorAll("[data-qbshell-select-section]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); quoteBshellSelectSection(el.dataset.qbshellSelectSection); });
  });
  list.querySelectorAll("[data-qbshell-select-date]").forEach((el) => {
    el.addEventListener("click", () => quoteBshellSelectDate(parseInt(el.dataset.qbshellSelectDate, 10)));
  });
  list.querySelectorAll("[data-qbshell-add-date]").forEach((el) => {
    el.addEventListener("click", () => {
      quoteBshellSnapshot();
      q.eventDates.push("");
      const newIdx = q.eventDates.length - 1;
      renderQuoteFormQA();
      quoteBshellRenderCanvas(() => quoteBshellSelectDate(newIdx));
      quoteBshellRenderHierarchy();
    });
  });
}

/* ---------- Canvas: render + click-to-select ---------- */

function quoteBshellBuildCanvasHtml() {
  const body = renderQuoteHtml(mergedQuoteState());
  const fontsLink = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
    ${fontsLink ? fontsLink.outerHTML : ""}
    <style>html,body{margin:0; background:#F3F4F6;} body{display:flex; justify-content:center; padding:36px 20px; box-sizing:border-box;}</style>
    </head><body>${body}</body></html>`;
}

function quoteBshellRenderCanvas(afterLoad) {
  const iframe = document.getElementById("qbshell-canvas-iframe");
  iframe.srcdoc = quoteBshellBuildCanvasHtml();
  quoteBshellCanvasClickWired = false;
  iframe.onload = () => {
    quoteBshellWireCanvasClicks();
    quoteBshellFitCanvas();
    quoteBshellApplySelectionVisual();
    if (afterLoad) afterLoad();
  };
}

/* The letter is a fixed-width (794px) A4-ish page — same reasoning as
   fitQuotePreviewToContainer() in js/quote-render.js, reapplied here
   against the canvas iframe's own document. */
function quoteBshellFitCanvas() {
  const iframe = document.getElementById("qbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  const el = doc && doc.querySelector(".quote-doc");
  if (!el) return;
  el.style.transform = "none";
  el.style.margin = "0";
  const containerWidth = iframe.clientWidth - 40;
  const natural = el.offsetWidth;
  const scale = containerWidth < natural ? containerWidth / natural : 1;
  el.style.transformOrigin = "top center";
  el.style.transform = `scale(${scale})`;
  doc.body.style.height = (el.offsetHeight * scale + 72) + "px";
}

function quoteBshellWireCanvasClicks() {
  const iframe = document.getElementById("qbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc || quoteBshellCanvasClickWired) return;
  quoteBshellCanvasClickWired = true;
  doc.addEventListener("click", (e) => {
    if (e.target.closest("#qbshell-mini-toolbar")) return;
    const a = e.target.closest("a");
    if (a) e.preventDefault();
    const resolved = quoteBshellResolveClickTarget(e);
    if (!resolved) { quoteBshellDeselect(); return; }
    quoteBshellSelection = resolved;
    quoteBshellApplySelectionVisual();
    quoteBshellRenderProperties();
    quoteBshellRenderHierarchy();
  }, true);
  quoteBshellWireCanvasHover(doc);
}

/* Hover affordance for the canvas — see js/cv-builder-shell.js's
   cvbshellWireCanvasHover for why: without any on-screen cue, editing
   read as possible only from the hierarchy list, never by clicking the
   canvas directly, even though the click handler above always
   supported it. Reuses quoteBshellResolveClickTarget's exact priority
   resolution via delegation so the hover highlight always lands on the
   identical element a click there would select. */
function quoteBshellWireCanvasHover(doc) {
  if (!doc.getElementById("qbshell-hover-style")) {
    const style = doc.createElement("style");
    style.id = "qbshell-hover-style";
    style.textContent = `.bshell-hover-target{outline:1.5px dashed rgba(20,184,166,.65) !important; outline-offset:2px !important; cursor:pointer;}`;
    doc.head.appendChild(style);
  }
  let hovered = null;
  doc.addEventListener("mouseover", (e) => {
    if (e.target.closest("#qbshell-mini-toolbar")) return;
    const resolved = quoteBshellResolveClickTarget(e);
    const el = resolved ? resolved.rootEl : null;
    if (el === hovered) return;
    if (hovered) hovered.classList.remove("bshell-hover-target");
    hovered = el;
    if (hovered && hovered !== (quoteBshellSelection && quoteBshellSelection.rootEl)) hovered.classList.add("bshell-hover-target");
  });
  doc.addEventListener("mouseout", (e) => {
    if (hovered && !e.relatedTarget) { hovered.classList.remove("bshell-hover-target"); hovered = null; }
  });
}

function quoteBshellResolveClickTarget(e) {
  const dateEl = e.target.closest("[data-q-date-idx]");
  if (dateEl) return { kind: "date", idx: parseInt(dateEl.dataset.qDateIdx, 10), rootEl: dateEl };
  const textEl = e.target.closest("[data-qkey]");
  if (textEl) return { kind: "text", key: textEl.dataset.qkey, rootEl: textEl };
  return null;
}

function quoteBshellDeselect() {
  quoteBshellSelection = null;
  quoteBshellApplySelectionVisual();
  quoteBshellRenderProperties();
  quoteBshellRenderHierarchy();
}

function quoteBshellSelectText(key) {
  const doc = document.getElementById("qbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-qkey="${key}"]`);
  quoteBshellSelection = { kind: "text", key, rootEl: el };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  quoteBshellApplySelectionVisual();
  quoteBshellRenderProperties();
  quoteBshellRenderHierarchy();
}

function quoteBshellSelectSection(type) {
  quoteBshellSelection = { kind: "section", type, rootEl: null }; // no single DOM anchor spans every rendering branch (see header comment)
  quoteBshellApplySelectionVisual();
  quoteBshellRenderProperties();
  quoteBshellRenderHierarchy();
}

function quoteBshellSelectDate(idx) {
  const doc = document.getElementById("qbshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-q-date-idx="${idx}"]`);
  quoteBshellSelection = { kind: "date", idx, rootEl: el || null };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  quoteBshellApplySelectionVisual();
  quoteBshellRenderProperties();
  quoteBshellRenderHierarchy();
}

function quoteBshellSelectSettings() {
  quoteBshellSelection = { kind: "settings" };
  quoteBshellApplySelectionVisual();
  quoteBshellRenderProperties();
  quoteBshellRenderHierarchy();
}

function quoteBshellApplySelectionVisual() {
  const iframe = document.getElementById("qbshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.querySelectorAll(".bshell-outline-target").forEach((el) => el.classList.remove("bshell-outline-target"));
  const oldToolbar = doc.getElementById("qbshell-mini-toolbar");
  if (oldToolbar) oldToolbar.remove();
  if (!quoteBshellSelection || !quoteBshellSelection.rootEl || !doc.contains(quoteBshellSelection.rootEl)) return;

  if (!doc.getElementById("qbshell-outline-style")) {
    const style = doc.createElement("style");
    style.id = "qbshell-outline-style";
    style.textContent = `
      .bshell-outline-target{outline:2px solid #14B8A6 !important; outline-offset:2px !important;}
      #qbshell-mini-toolbar{position:absolute; z-index:999999; display:flex; gap:2px; background:#111827; border-radius:8px; padding:3px; box-shadow:0 4px 14px rgba(0,0,0,.28);}
      #qbshell-mini-toolbar button{all:unset; box-sizing:border-box; cursor:pointer; color:#fff; width:27px; height:27px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:13px; text-align:center;}
      #qbshell-mini-toolbar button:hover:not(:disabled){background:#14B8A6;}
      #qbshell-mini-toolbar button:disabled{opacity:.35; cursor:default;}`;
    doc.head.appendChild(style);
  }

  const el = quoteBshellSelection.rootEl;
  el.classList.add("bshell-outline-target");
  const rect = el.getBoundingClientRect();
  const scrollY = doc.defaultView.scrollY || doc.documentElement.scrollTop;
  const toolbar = doc.createElement("div");
  toolbar.id = "qbshell-mini-toolbar";
  toolbar.style.top = Math.max(4, rect.top + scrollY - 34) + "px";
  toolbar.style.insetInlineStart = Math.max(4, rect.left) + "px";
  const canDuplicate = quoteBshellSelection.kind === "date";
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
    quoteBshellToolbarAction(btn.dataset.tool);
  });
  doc.body.appendChild(toolbar);
}

function quoteBshellToolbarAction(tool) {
  if (!quoteBshellSelection) return;
  if (tool === "edit") {
    document.getElementById("qbshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("qbshell-props").classList.add("bshell-drawer-open");
    const first = document.querySelector("#qbshell-props-dynamic input, #qbshell-props-dynamic textarea");
    if (first) first.focus();
    return;
  }
  if (quoteBshellSelection.kind !== "date") return;
  const list = quoteEventState.eventDates;
  if (tool === "duplicate") {
    quoteBshellSnapshot();
    const copyIdx = quoteBshellSelection.idx + 1;
    list.splice(copyIdx, 0, list[quoteBshellSelection.idx]);
    renderQuoteFormQA();
    quoteBshellRenderCanvas(() => quoteBshellSelectDate(copyIdx));
    quoteBshellRenderHierarchy();
    return;
  }
  if (tool === "delete") {
    if (list.length <= 1) return; // mirrors the original "can't remove the last date" guard (quote-app.js's dates-list click handler)
    quoteBshellSnapshot();
    list.splice(quoteBshellSelection.idx, 1);
    renderQuoteFormQA();
    quoteBshellDeselect();
    quoteBshellRenderCanvas();
    quoteBshellRenderHierarchy();
  }
}

/* ---------- Properties panel ----------
   The Settings view (#qbshell-props-settings, in quote-app.html) is
   STATIC markup, never innerHTML-replaced — it permanently holds the
   moved #qa-profile-form (see quoteBshellMoveProfileForm). Every
   other selection kind renders into the separate
   #qbshell-props-dynamic sibling instead, so overwriting ITS
   innerHTML on every selection change can never destroy that live,
   listener-bound form sitting next to it. */
function quoteBshellRenderProperties() {
  const empty = document.getElementById("qbshell-props-empty");
  const dyn = document.getElementById("qbshell-props-dynamic");
  const settingsView = document.getElementById("qbshell-props-settings");
  if (!quoteBshellSelection) {
    empty.style.display = "";
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "none";
    return;
  }
  empty.style.display = "none";
  if (quoteBshellSelection.kind === "settings") {
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "";
    quoteBshellSyncStyleButtons();
    return;
  }
  settingsView.style.display = "none";
  dyn.style.display = "";
  if (quoteBshellSelection.kind === "text") dyn.innerHTML = quoteBshellPropsHtmlForText(quoteBshellSelection.key);
  else if (quoteBshellSelection.kind === "date") dyn.innerHTML = quoteBshellPropsHtmlForDate(quoteBshellSelection.idx);
  else if (quoteBshellSelection.kind === "section") dyn.innerHTML = quoteBshellPropsHtmlForSection(quoteBshellSelection.type);
  quoteBshellWirePropertiesPanel();
}

function quoteBshellPropsHtmlForText(key) {
  const value = quoteEventState[key] || "";
  const inputTag = key === "description"
    ? `<textarea id="qbshell-prop-content" rows="4">${escapeHtmlQ(value)}</textarea>`
    : `<input type="text" id="qbshell-prop-content" value="${escapeHtmlQ(value).replace(/"/g, "&quot;")}">`;
  const hint = QUOTEBSHELL_TEXT_HINTS[key];
  return `
    <span class="bshell-props-kind">טקסט</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">${escapeHtmlQ(QUOTEBSHELL_TEXT_LABELS[key])}</label>
      ${inputTag}
      ${hint ? `<p class="bshell-settings-field-hint">${escapeHtmlQ(hint)}</p>` : ""}
    </div>`;
}

function quoteBshellPropsHtmlForDate(idx) {
  const d = quoteEventState.eventDates[idx] || "";
  return `
    <span class="bshell-props-kind">תאריך</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">תאריך ${idx + 1}</label>
      <input type="text" id="qbshell-prop-date" value="${escapeHtmlQ(d).replace(/"/g, "&quot;")}">
    </div>`;
}

function quoteBshellPropsHtmlForSection() {
  return `<span class="bshell-props-kind">Section</span><p style="font-size:12.5px; color:var(--text-muted); margin:0;">התאריכים מופיעים בהצעת המחיר. ניהול התאריכים מתבצע מההיררכיה או מהקנבס.</p>`;
}

function quoteBshellWirePropertiesPanel() {
  if (quoteBshellSelection.kind === "text") return quoteBshellWireTextProps(quoteBshellSelection.key);
  if (quoteBshellSelection.kind === "date") return quoteBshellWireDateProps(quoteBshellSelection.idx);
}

function quoteBshellWireTextProps(key) {
  const el = document.getElementById("qbshell-prop-content");
  if (!el) return;
  el.addEventListener("focus", () => quoteBshellBeginEdit(el));
  el.addEventListener("blur", () => quoteBshellEndEdit(el));
  el.addEventListener("input", () => {
    quoteEventState[key] = el.value;
    renderQuoteFormQA();
    renderQuotePreviewQA();
    quoteBshellPatchTextContent(key, el.value);
  });
}

function quoteBshellPatchTextContent(key, value) {
  if (QUOTEBSHELL_FULL_RERENDER_KEYS.includes(key)) {
    quoteBshellRenderCanvas(quoteBshellReanchorSelection);
    return;
  }
  const doc = document.getElementById("qbshell-canvas-iframe").contentDocument;
  if (!doc) return;
  doc.querySelectorAll(`[data-qkey="${key}"]`).forEach((el) => { el.textContent = value; });
  quoteBshellApplySelectionVisual();
}

function quoteBshellWireDateProps(idx) {
  const el = document.getElementById("qbshell-prop-date");
  if (!el) return;
  el.addEventListener("focus", () => quoteBshellBeginEdit(el));
  el.addEventListener("blur", () => quoteBshellEndEdit(el));
  el.addEventListener("input", () => {
    quoteEventState.eventDates[idx] = el.value;
    renderQuoteFormQA();
    quoteBshellRenderCanvas(quoteBshellReanchorSelection);
    quoteBshellRenderHierarchy();
  });
}

/* Lighter than a full re-select: keeps the current selection's kind/
   key/idx, just re-points rootEl at the matching element in whatever
   document is now loaded in the canvas, without touching the
   Properties panel (so it never steals focus out of a field the user
   is actively typing in). */
function quoteBshellReanchorSelection() {
  if (!quoteBshellSelection) return;
  if (quoteBshellSelection.kind === "settings" || quoteBshellSelection.kind === "section") return; // no canvas anchor to re-point at
  const doc = document.getElementById("qbshell-canvas-iframe").contentDocument;
  if (!doc) return;
  let el = null;
  if (quoteBshellSelection.kind === "text") el = doc.querySelector(`[data-qkey="${quoteBshellSelection.key}"]`);
  else if (quoteBshellSelection.kind === "date") el = doc.querySelector(`[data-q-date-idx="${quoteBshellSelection.idx}"]`);
  if (el) { quoteBshellSelection.rootEl = el; quoteBshellApplySelectionVisual(); }
  else { quoteBshellSelection = null; quoteBshellRenderProperties(); }
}

/* ---------- DOMContentLoaded: activate only behind ?shell=1 — see
   js/quote-app.js's routeAfterAuth/routeAsGuest/wireProfileForm,
   which call quoteBshellActivate() once quoteEventState (and, if
   needed, a brand-new profile) actually exists. Nothing to do here at
   load time; this file is purely called INTO by quote-app.js, same
   relationship cv-builder-shell.js has with builder.js. */
