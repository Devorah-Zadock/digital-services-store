/* ===========================================================
   Builder-Shell — DeskKit's central editing surface (Hierarchy ->
   Canvas -> Selection -> Properties -> Editing -> Undo -> Responsive
   -> Preview -> Save). Reachable via sites.html?shell=1&template=X
   (see the branch added in site-builder.js's own DOMContentLoaded
   handler, right where it would otherwise call showWizard()).

   ONE Shell, driven by each template's own Schema — never a per-
   template copy of this file. Proved first on local-service alone
   (Phase 2), then generalized here to every migrated template once
   all 18 were on the Section/Block system (Phase 7): BSHELL_
   SUPPORTED_TEMPLATES is literally SITE_MIGRATED_TEMPLATES (site-
   blocks.js's own registry, not a separate list this file keeps in
   sync by hand), section labels come from SITE_BLOCK_DEFS[template]
   [type].label, and the anchor a click resolves a whole Section from
   is computed generically (see bshellAnchorCandidates) rather than
   hardcoded per template. The ~5 templates whose services-equivalent
   block renders no heading element at all (catalog/boutique/chaos/
   bento/freelancer) are the only explicit exceptions, in
   BSHELL_ANCHOR_RAW_OVERRIDES below — everything else Just Works
   because every migrated template's sections already go through the
   same universal heading()/aboutText() helpers with the same textkey
   scheme. The design never changes to fit the Builder; the Builder
   reads the design's own Schema.

   Operates on the SAME siteState object, the SAME site_projects row,
   and the SAME save/publish/watermark machinery as the existing
   builder (js/site-builder.js, js/site-cloud-save.js) — this file adds
   a new way to look at and edit that data, not a second data model.
   Nothing here renders anything site-templates.js/site-blocks.js
   don't already know how to render; this file is the editing chrome
   around them.
   =========================================================== */

const BSHELL_SUPPORTED_TEMPLATES = SITE_MIGRATED_TEMPLATES;

/* Raw CSS-selector anchor overrides for the handful of (template,type)
   pairs whose block has no heading(d, type, ...) element to anchor on
   at all — mirrors site-builder.js's own SECTION_PATCH_ANCHOR_OVERRIDES
   (same underlying fact about these templates, independently needed
   here since this file resolves a CLICK to a section, that one
   resolves a TEXT KEY to a section). Every other (template,type) pair
   needs no entry here: its default candidate chain already finds it. */
const BSHELL_ANCHOR_RAW_OVERRIDES = {
  catalog: { services: "#cat-grid" },
  boutique: { services: "#bq-grid" },
  chaos: { services: "#oc-hscroll" },
  bento: { grid: "#bt-grid" },
  freelancer: { aboutTags: "#fr-services-wrap" },
};

/* The ordered list of candidate anchors to try for one (template,type)
   pair — first match in the live DOM wins. "hero" is special-cased
   because every hero calls heading(d,"heroTitle",...), never
   heading(d,"hero",...). "about" (and any raw-overridden type, which
   may also legitimately contain the about text, e.g. freelancer's
   fused aboutTags) falls back to the universal "aboutText" textkey,
   since several templates' about section never calls heading(d,
   "about",...) at all, just aboutText(d,dd) with a plain Hebrew
   caption instead (confirmed per-template, not guessed) — "contact"
   deliberately has no such fallback: every single contact block
   verified to always call heading(d,"contact",...), so adding one
   would only risk silently resolving to the ABOUT section instead on
   a future bug, never a real template fact to design around. */
function bshellAnchorCandidates(template, type) {
  if (type === "hero") return ["heading-heroTitle"];
  const raw = (BSHELL_ANCHOR_RAW_OVERRIDES[template] || {})[type];
  const candidates = [];
  if (raw) candidates.push(raw);
  candidates.push("heading-" + type);
  if (type === "about" || raw) candidates.push("aboutText");
  return candidates;
}

/* Resolves a candidate chain against any root (a whole document, or a
   single section element to search WITHIN) — a candidate starting
   with "#" is a raw CSS selector (an id added to that template's own
   services wrapper purely as a stable hook), anything else is a
   data-textkey lookup. Returns the element itself (the anchor), not
   yet the enclosing Section root — callers that need the whole
   Section still do their own .closest("body > *") on it. */
function bshellQueryAnchor(root, candidates) {
  for (const c of candidates) {
    const el = c.charAt(0) === "#" ? root.querySelector(c) : root.querySelector(`[data-textkey="${c}"]`);
    if (el) return el;
  }
  return null;
}
function bshellFindAnchorEl(doc, template, type) {
  return bshellQueryAnchor(doc, bshellAnchorCandidates(template, type));
}

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
// Which hierarchy sections (by type) are collapsed — starts empty, i.e.
// every section begins expanded, same as the old hardcoded-open
// behavior. Tracked separately from bshellSelection because collapsing
// a section must survive bshellRenderHierarchy() re-renders (every
// selection change repaints the whole list from scratch), and because
// <details open> alone can't be the source of truth here: the summary's
// own click handler calls e.preventDefault() (selecting a section must
// never ALSO fire the browser's native toggle at the same time as the
// custom one below), which also suppresses the native open/close toggle
// entirely — leaving nothing to ever flip it, confirmed-live as the
// chevron always pointing "open" and never collapsing on click.
let bshellCollapsedSections = new Set();
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

  document.getElementById("bshell-settings-btn").addEventListener("click", bshellSelectSettings);

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

  bshellWireAiPanel();
}

/* ---------- AI help popover — reuses the exact same validated-op
   pipeline as the old sidebar's AI command bar (site-ai-command.js):
   free text + real structural context -> site-ai-command Edge
   Function -> ONE validated op -> confirm -> apply. applySiteAiOp()
   is the shared pure-mutation function; this file only adds the
   Shell-specific bookkeeping (its own unified Undo/Redo + canvas +
   hierarchy + autosave) around it, so an AI-driven change in the
   Shell is captured by the same Undo button as a manual edit. */

let bshellAiPending = null;

function bshellApplyAiOp(result) {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  bshellSnapshot();
  if (!applySiteAiOp(d, template, result)) {
    bshellUndoStack.pop(); // nothing was actually applied
    bshellSyncUndoButtons();
    return;
  }
  bshellRenderCanvas();
  bshellRenderHierarchy();
  bshellScheduleSave();
  bshellAiNote(`בוצע: ${escapeHtmlS(result.explanation || "")}`);
}

function bshellAiNote(html) {
  const note = document.getElementById("bshell-ai-note");
  if (note) note.innerHTML = html;
}

/* What the AI can actually do is exactly site-ai-command's op menu:
   reorder / add / remove a section, or switch a section's display
   variant — nothing about colors, fonts or overall "style". The panel
   used to offer fixed example chips like "make the design more luxurious"
   / "minimalist", which the server can only ever answer with
   "unsupported" (each refusal still spending one of the free attempts).
   The chips are now built from THIS site's real context, so every
   suggestion is one the server can carry out, and the hint line says
   plainly what kind of request works. */
const BSHELL_AI_TYPE_NAMES = { services: "השירותים", about: "האודות", contact: "חלק צור קשר", aboutTags: "התגיות", grid: "הרשת" };
const BSHELL_AI_HINT = "אפשר לבקש: לשנות את סדר החלקים, להוסיף או להסיר חלק, או סגנון תצוגה אחר ל-Hero ולשירותים. שינויי צבע וגופן נעשים ב\"פרטי העסק ועיצוב\".";

function bshellAiExamples() {
  const ctx = siteAiCommandContext();
  const name = (t) => BSHELL_AI_TYPE_NAMES[t] || t;
  const variants = (siteState.data && siteState.data.blockVariants) || {};
  const out = [];
  const movable = ctx.activeTypes.filter((t) => t !== "hero" && BSHELL_AI_TYPE_NAMES[t]);
  if (movable.length >= 2) out.push(`הזז את ${name(movable[1])} לפני ${name(movable[0])}`);
  if (ctx.variantOptions.hero) {
    out.push(variants.hero === "centered" ? "החזר את ה-Hero לעיצוב הקלאסי" : "הפוך את ה-Hero לממורכז");
  }
  if (ctx.variantOptions.services && ctx.activeTypes.indexOf("services") !== -1) {
    out.push(variants.services === "grid" ? "החזר את השירותים לעיצוב ברירת המחדל" : "הצג את השירותים כרשת כרטיסים");
  }
  const addable = ctx.availableTypes.filter((t) => ctx.activeTypes.indexOf(t) === -1 && BSHELL_AI_TYPE_NAMES[t]);
  if (out.length < 3 && addable.length) out.push(`הוסף את ${name(addable[0])}`);
  const removable = movable.filter((t) => t !== "grid");
  if (out.length < 3 && removable.length) out.push(`הסר את ${name(removable[removable.length - 1])}`);
  return out.slice(0, 3);
}

function bshellRenderAiExamples() {
  const hint = document.getElementById("bshell-ai-hint");
  if (hint) hint.textContent = BSHELL_AI_HINT;
  const box = document.getElementById("bshell-ai-examples");
  if (!box) return;
  box.innerHTML = bshellAiExamples().map((ex) => {
    const safe = escapeHtmlS(ex);
    return `<button type="button" data-ai-example="${safe.replace(/"/g, "&quot;")}">${safe}</button>`;
  }).join("");
}

function bshellWireAiPanel() {
  const btn = document.getElementById("bshell-ai-btn");
  const panel = document.getElementById("bshell-ai-panel");
  const input = document.getElementById("bshell-ai-input");
  const submitBtn = document.getElementById("bshell-ai-submit");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = panel.hasAttribute("hidden");
    panel.toggleAttribute("hidden", !willOpen);
    btn.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) { bshellRenderAiExamples(); input.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (panel.hasAttribute("hidden")) return;
    if (e.target === btn || panel.contains(e.target)) return;
    panel.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  });

  // Delegated — the chips are rebuilt on every open (bshellRenderAiExamples).
  document.getElementById("bshell-ai-examples").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-ai-example]");
    if (!chip) return;
    input.value = chip.dataset.aiExample;
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); bshellAiSubmit(); }
  });
  submitBtn.addEventListener("click", bshellAiSubmit);
}

async function bshellAiSubmit() {
  const input = document.getElementById("bshell-ai-input");
  const btn = document.getElementById("bshell-ai-submit");
  const command = (input.value || "").trim();
  if (!command) return;

  bshellAiPending = null;
  bshellAiNote("ה-AI מעבד את הפקודה…");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "מעבד...";

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const ctx = siteAiCommandContext();
    const res = await fetch(SUPABASE_URL + "/functions/v1/site-ai-command", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ command, availableTypes: ctx.availableTypes, activeTypes: ctx.activeTypes, variantOptions: ctx.variantOptions }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      bshellAiNote(data.isPro
        ? "הגעת למכסת השימוש ההוגן היומית לפקודות AI. אפשר להמשיך מחר."
        : "הגעת למכסת הניסיונות החינמיים לפקודות AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!");
      return;
    }

    const result = data.result;
    if (!result || result.op === "unsupported") {
      bshellAiNote(`${escapeHtmlS((result && result.explanation) || "לא הצלחתי לבצע את הפעולה הזו.")}<br>${escapeHtmlS(BSHELL_AI_HINT)}`);
      return;
    }

    bshellAiPending = result;
    bshellAiNote(`
      <div>${escapeHtmlS(result.explanation || "לבצע את השינוי?")}</div>
      <div class="bshell-ai-confirm-row">
        <button type="button" class="bshell-ai-confirm-yes" id="bshell-ai-confirm">אישור</button>
        <button type="button" id="bshell-ai-cancel">ביטול</button>
      </div>
    `);
    document.getElementById("bshell-ai-confirm").addEventListener("click", () => {
      if (bshellAiPending) bshellApplyAiOp(bshellAiPending);
      bshellAiPending = null;
      input.value = "";
    });
    document.getElementById("bshell-ai-cancel").addEventListener("click", () => {
      bshellAiPending = null;
      bshellAiNote("בוטל.");
    });
  } catch (err) {
    console.error("bshell AI command failed:", err);
    bshellAiNote("משהו השתבש. אפשר לנסות שוב בעוד רגע.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function bshellSaveNow() {
  clearTimeout(bshellSaveTimer);
  const status = document.getElementById("bshell-top-status");
  status.textContent = "שומרים...";
  status.className = "bshell-top-status saving";
  // saveSiteNow() now returns the Supabase error (or null) instead of
  // being fire-and-forget — confirmed-live bug this fixes: this always
  // showed "נשמר ✓" even when the save itself failed, so a user who hit
  // a real save error had no way to know their edits weren't actually
  // safe to walk away from.
  const error = typeof saveSiteNow === "function" ? await saveSiteNow() : null;
  if (!error) {
    status.textContent = "נשמר ✓";
    status.className = "bshell-top-status saved";
    setTimeout(() => { if (status.textContent === "נשמר ✓") status.textContent = ""; }, 2500);
  } else {
    status.textContent = "לא נשמר — ננסה שוב";
    status.className = "bshell-top-status failed";
    // Retry shortly rather than leaving a failed save sitting there
    // until the next real edit happens to trigger bshellScheduleSave().
    bshellSaveTimer = setTimeout(bshellSaveNow, 4000);
  }
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
  document.getElementById("bshell-settings-btn").classList.toggle("is-selected", !!(bshellSelection && bshellSelection.kind === "settings"));
  // The FULL saved order, not activeBlocksForPage()'s filtered list —
  // a hidden block still needs its own row (dimmed, with a dot) so the
  // Properties panel's visibility switch can bring it back. Filtering
  // to only-active here would mean hiding hero/services from the Shell
  // itself permanently removes the one way to un-hide them again.
  const types = (typeof ensureBlockOrder === "function") ? (ensureBlockOrder(d, template, "index") || []) : [];
  const dd = (typeof withFallback === "function") ? withFallback(d) : d;

  list.innerHTML = types.map((type) => {
    const def = SITE_BLOCK_DEFS[template][type];
    if (!def) return "";
    const isSelectedSection = bshellSelection && bshellSelection.kind === "section" && bshellSelection.type === type;
    const hidden = !!(def.active && !def.active(d));
    let itemsHtml = "";
    if (def.hasItems) {
      const services = dd._services || d.services || [];
      itemsHtml = services.map((s, i) => {
        const isSelectedItem = bshellSelection && bshellSelection.kind === "service" && bshellSelection.idx === i;
        return `<button type="button" class="bshell-item${isSelectedItem ? " is-selected" : ""}" data-bshell-select-service="${i}">${escapeHtmlS(s.name && s.name.trim() ? s.name : `שירות ${i + 1}`)}</button>`;
      }).join("") + `<button type="button" class="bshell-add-item" data-bshell-add-service>+ הוספת שירות</button>`;
    }
    return `
      <details class="bshell-sec"${bshellCollapsedSections.has(type) ? "" : " open"}>
        <summary class="bshell-sec-head${isSelectedSection ? " is-selected" : ""}${hidden ? " is-hidden" : ""}" data-bshell-select-section="${type}">
          <span class="bshell-sec-chevron"></span>
          <span>${escapeHtmlS(def.label || type)}</span>
          ${hidden ? '<span class="bshell-sec-hidden-dot" title="מוסתר"></span>' : ""}
        </summary>
        ${itemsHtml ? `<div class="bshell-sec-body">${itemsHtml}</div>` : ""}
      </details>`;
  }).join("");

  list.querySelectorAll("[data-bshell-select-section]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const type = el.dataset.bshellSelectSection;
      if (bshellCollapsedSections.has(type)) bshellCollapsedSections.delete(type);
      else bshellCollapsedSections.add(type);
      bshellSelectSection(type);
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
  const template = siteState.template;
  const types = Object.keys(SITE_BLOCK_DEFS[template] || {});
  for (const type of types) {
    if (bshellQueryAnchor(sectionRoot, bshellAnchorCandidates(template, type))) {
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
  const anchorEl = doc && bshellFindAnchorEl(doc, siteState.template, type);
  const rootEl = anchorEl ? anchorEl.closest("body > *") : null;
  // A HIDDEN section renders nothing in the canvas at all, so there's
  // no element to anchor on — select it anyway (rootEl: null), purely
  // so the Properties panel's own visibility switch can still show and
  // bring it back. bshellApplySelectionVisual() already no-ops safely
  // without a rootEl; only the scroll+outline step is skipped.
  bshellSelection = { kind: "section", type, rootEl };
  if (rootEl) rootEl.scrollIntoView({ behavior: "smooth", block: "center" });
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

/* Site-wide settings (contact info, WhatsApp, copyright, brand color/
   font, images, video) — not tied to any one Section/Element, so this
   is a FOURTH selection kind alongside text/service/section rather
   than forcing it through the Section model. Reached via its own
   always-visible row above the Sections list (not nested inside the
   hierarchy tree, since it isn't part of the page structure), same
   "click something -> see it in Properties" pattern as everything
   else in the Shell. No live canvas anchor (these fields render as
   plain text/attributes in several places, not one selectable
   element), so this never touches bshellApplySelectionVisual's outline
   — clears whatever WAS outlined in the canvas instead. */
function bshellSelectSettings() {
  bshellSelection = { kind: "settings" };
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
  // Built from only the actions that actually apply to this selection's
  // kind, instead of always showing all 4 buttons with most of them
  // disabled — confirmed live as reading broken rather than just
  // "nothing else to do here" for a plain text selection (every kind
  // except service/section had 3 of 4 icons permanently greyed out).
  const toolbarButtons = [`<button type="button" data-tool="edit" title="עריכה">✎</button>`];
  if (bshellSelection.kind === "service") {
    toolbarButtons.push(`<button type="button" data-tool="duplicate" title="שכפול">⧉</button>`);
  }
  if (bshellSelection.kind === "section") {
    toolbarButtons.push(`<button type="button" data-tool="hide" title="הסתרה/הצגה">◐</button>`);
  }
  if (bshellSelection.kind === "service") {
    toolbarButtons.push(`<button type="button" data-tool="delete" title="מחיקה">🗑</button>`);
  }
  toolbar.innerHTML = toolbarButtons.join("");
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
    bshellToggleSectionVisibility(bshellSelection.type);
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
   shared file needing to know the Shell exists. Patched onto EVERY
   migrated template's block that doesn't already define its own
   active() — not just hero/services by name, since some templates'
   real type keys differ (freelancer's "aboutTags", bento's "grid"),
   and two templates' "contact" (freelancer, portfolio) genuinely have
   no d.pages-based gate of their own either (their CTA footer always
   showed, by original design). _bshellHiddenGate marks exactly which
   types this patch touched, so the Properties panel below knows
   whether to write d.hiddenBlocks or d.pages when toggling visibility
   — never by guessing from the type's name. */
(function bshellPatchBlockVisibility() {
  (SITE_MIGRATED_TEMPLATES || []).forEach((template) => {
    const defs = SITE_BLOCK_DEFS[template];
    if (!defs) return;
    Object.keys(defs).forEach((type) => {
      if (!defs[type].active) {
        defs[type]._bshellHiddenGate = true;
        defs[type].active = (d) => !(d.hiddenBlocks && d.hiddenBlocks[type]);
      }
    });
  });
})();

/* The one place that decides HOW a (template,type) pair's visibility
   is actually stored — toggled from the mini-toolbar's "hide" button
   and from the Properties panel's switch alike, so the two can never
   drift out of sync on which flag they write. */
function bshellToggleSectionVisibility(type) {
  const d = siteState.data;
  const def = SITE_BLOCK_DEFS[siteState.template][type];
  if (def._bshellHiddenGate) {
    d.hiddenBlocks = d.hiddenBlocks || {};
    d.hiddenBlocks[type] = !d.hiddenBlocks[type];
  } else {
    // Same real mechanism the old sidebar's "דף נפרד" checkboxes use
    // — hiding the inline section here is the mirror of turning that
    // page OFF, not a second, parallel visibility flag.
    ensurePagesShape(d).pages[type] = !(d.pages && d.pages[type]);
  }
}

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
  else if (bshellSelection.kind === "settings") body.innerHTML = bshellPropsHtmlForSettings();
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
  const def = SITE_BLOCK_DEFS[siteState.template][type];
  const options = (typeof variantOptionsFor === "function") ? variantOptionsFor(siteState.template, type) : null;
  const current = (d.blockVariants && d.blockVariants[type]) || "default";
  // def.active() IS the ground truth for "visible inline right now,"
  // whichever flag it actually reads (d.pages[type] for a real
  // separate-page toggle, d.hiddenBlocks[type] for the Shell's own
  // additive one — see bshellToggleSectionVisibility for which).
  const reallyVisible = def.active ? !!def.active(d) : true;
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
    </div>
    ${type === "hero" ? bshellBsdHeroRow(d) : ""}`;
}

/* בס"ד sits at the very top of the site, so the Hero panel is where
   people look for it — same d.showBsd as the switch in site settings. */
function bshellBsdHeroRow(d) {
  return `
    <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">הצגת בס"ד בראש האתר</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-prop-bsd"${d.showBsd ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>`;
}

/* Site-wide settings that have no live canvas anchor at all — unlike
   every other Properties view, this one isn't contextual to a
   selection in the page structure, it's the Shell's own equivalent of
   the old sidebar's "עיצוב האתר" / "תמונות ומדיה" / "פרטי יצירת קשר"
   groups. Same underlying d.* fields, same uploadSiteImage()/
   SITE_FONTS/SITE_GALLERY_MAX the old sidebar already uses — this is
   a new way to reach them, not a new place they're stored. */
function bshellPropsHtmlForSettings() {
  const d = siteState.data;
  const fontKeys = (typeof SITE_FONTS === "object") ? Object.keys(SITE_FONTS) : [];
  const hasWhatsapp = !d.noWhatsapp;
  return `
    <span class="bshell-props-kind">הגדרות האתר</span>

    <div class="bshell-settings-group">
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">הצגת בס"ד בראש האתר</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-bsd"${d.showBsd ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      <p class="bshell-settings-field-hint">כבוי כברירת מחדל. מופיע קטן בפינה הימנית העליונה של כל עמודי האתר.</p>
    </div>

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">פרטי קשר</div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">טלפון</label>
        <input type="text" id="bshell-set-phone" dir="ltr" value="${escapeHtmlS(d.phone || "")}">
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">המספר הזה הוא גם הוואטסאפ שלי</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-has-whatsapp"${hasWhatsapp ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">מספר וואטסאפ אחר (אם שונה מהטלפון)</label>
        <input type="text" id="bshell-set-whatsapp" dir="ltr" value="${escapeHtmlS(d.whatsapp || "")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">מייל</label>
        <input type="text" id="bshell-set-email" dir="ltr" value="${escapeHtmlS(d.email || "")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">כתובת</label>
        <input type="text" id="bshell-set-address" value="${escapeHtmlS(d.address || "")}">
      </div>
    </div>

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">עיצוב ומותג</div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">צבע ראשי</label>
        <input type="color" id="bshell-set-color" value="${escapeHtmlS(d.primaryColor || "#1F5C4E")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">גופן</label>
        <select id="bshell-set-font">
          ${fontKeys.map((k) => `<option value="${k}"${(d.fontFamily || "heebo") === k ? " selected" : ""}>${escapeHtmlS(SITE_FONTS[k].name)}</option>`).join("")}
        </select>
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">הסתרת שורת זכויות יוצרים בתחתית</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-hide-copyright"${d.hideCopyright ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">תמונות ומדיה</div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">תמונה ראשית</label>
        <div class="photo-row">
          <div class="photo-preview" id="bshell-set-photo-preview">${d.heroImage ? `<img src="${escapeHtmlS(d.heroImage)}" alt="תמונת הכותרת">` : `<span class="site-photo-placeholder">🖼️</span>`}</div>
          <div class="photo-actions">
            <label class="btn-mini photo-upload-btn" for="bshell-set-photo">העלאת תמונה</label>
            <input type="file" id="bshell-set-photo" accept="image/*" style="display:none;">
            <button type="button" class="photo-remove" id="bshell-set-photo-remove">הסרת תמונה</button>
          </div>
        </div>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">גלריית תמונות (עד ${SITE_GALLERY_MAX})</label>
        <p class="bshell-settings-field-hint">אם יש תמונות בגלריה, הן מתחלפות אוטומטית במקום התמונה הראשית.</p>
        <div id="bshell-set-gallery-preview" class="site-gallery-preview">${bshellGalleryPreviewHtml(d)}</div>
        <label class="btn-mini photo-upload-btn" for="bshell-set-gallery">הוספת תמונה לגלריה</label>
        <input type="file" id="bshell-set-gallery" accept="image/*" multiple style="display:none;">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">קישור לסרטון (יוטיוב)</label>
        <input type="text" id="bshell-set-video" dir="ltr" placeholder="https://youtube.com/watch?v=..." value="${escapeHtmlS(d.videoUrl || "")}">
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">הצגת הסרטון כרקע לכותרת הראשית</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-video-bg"${d.heroVideoBg ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>`;
}
function bshellGalleryPreviewHtml(d) {
  const images = d.heroImages || [];
  return images.map((src, i) =>
    `<div class="site-gallery-thumb" data-idx="${i}"><img src="${escapeHtmlS(src)}" alt="תמונה ${i + 1} בגלריה"><button type="button" data-action="bshell-remove-gallery-photo" aria-label="הסרה">✕</button></div>`
  ).join("");
}

function bshellWirePropertiesPanel() {
  if (bshellSelection.kind === "text") return bshellWireTextProps(bshellSelection.key);
  if (bshellSelection.kind === "service") return bshellWireServiceProps(bshellSelection.idx);
  if (bshellSelection.kind === "section") return bshellWireSectionProps(bshellSelection.type);
  if (bshellSelection.kind === "settings") return bshellWireSettingsProps();
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
    const anchorEl = bshellFindAnchorEl(doc, siteState.template, bshellSelection.type);
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
  const bsdEl = document.getElementById("bshell-prop-bsd");
  if (bsdEl) {
    bsdEl.addEventListener("change", () => {
      bshellSnapshot();
      siteState.data.showBsd = bsdEl.checked;
      bshellRenderCanvas(() => bshellSelectSection(type));
      bshellScheduleSave();
    });
  }
  if (visibleEl) {
    visibleEl.addEventListener("change", () => {
      bshellSnapshot();
      bshellToggleSectionVisibility(type);
      bshellRenderCanvas(() => bshellSelectSection(type));
      bshellRenderHierarchy();
      bshellScheduleSave();
    });
  }
}

/* ---------- Settings (site-wide, no canvas anchor) ----------
   Plain text fields re-render the whole canvas on every keystroke —
   same already-shipped pattern bshellWireServiceProps uses for name/
   desc/price, since none of these fields (phone/email/address/
   videoUrl) are a single data-textkey span that could be live-patched
   in place. Color/font go through bshellApplyGlobalStylesLive()
   instead, same reasoning as the old sidebar's own applyGlobalStylesLive()
   — reloading the entire iframe on every drag of the color wheel would
   be visibly laggy where patching just the <style> tag's text isn't. */
function bshellWireSettingsProps() {
  const d = siteState.data;

  const bindPlainText = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("focus", () => bshellBeginEdit(el));
    el.addEventListener("blur", () => bshellEndEdit(el));
    el.addEventListener("input", () => {
      d[key] = el.value;
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  };
  bindPlainText("bshell-set-phone", "phone");
  bindPlainText("bshell-set-whatsapp", "whatsapp");
  bindPlainText("bshell-set-email", "email");
  bindPlainText("bshell-set-address", "address");
  bindPlainText("bshell-set-video", "videoUrl");

  const hasWhatsappEl = document.getElementById("bshell-set-has-whatsapp");
  if (hasWhatsappEl) {
    hasWhatsappEl.addEventListener("change", () => {
      bshellSnapshot();
      d.noWhatsapp = !hasWhatsappEl.checked;
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }

  const colorEl = document.getElementById("bshell-set-color");
  if (colorEl) {
    colorEl.addEventListener("focus", () => bshellBeginEdit(colorEl));
    colorEl.addEventListener("change", () => bshellEndEdit(colorEl));
    colorEl.addEventListener("input", () => {
      d.primaryColor = colorEl.value;
      bshellApplyGlobalStylesLive();
      bshellScheduleSave();
    });
  }

  const fontEl = document.getElementById("bshell-set-font");
  if (fontEl) {
    fontEl.addEventListener("change", () => {
      bshellSnapshot();
      d.fontFamily = fontEl.value;
      bshellApplyGlobalStylesLive();
      bshellScheduleSave();
    });
  }

  const bsdEl = document.getElementById("bshell-set-bsd");
  if (bsdEl) {
    bsdEl.addEventListener("change", () => {
      bshellSnapshot();
      d.showBsd = bsdEl.checked;
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }

  const hideCopyrightEl = document.getElementById("bshell-set-hide-copyright");
  if (hideCopyrightEl) {
    hideCopyrightEl.addEventListener("change", () => {
      bshellSnapshot();
      d.hideCopyright = hideCopyrightEl.checked;
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }

  const videoBgEl = document.getElementById("bshell-set-video-bg");
  if (videoBgEl) {
    videoBgEl.addEventListener("change", () => {
      bshellSnapshot();
      d.heroVideoBg = videoBgEl.checked;
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }

  const photoEl = document.getElementById("bshell-set-photo");
  if (photoEl) {
    photoEl.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 6 * 1024 * 1024) {
        alert("התמונה גדולה מדי — בחרו קובץ עד 6MB.");
        e.target.value = "";
        return;
      }
      bshellSnapshot();
      const url = await uploadSiteImage(file, "hero");
      if (!url) {
        alert("העלאת התמונה נכשלה, נסו שוב.");
        bshellUndoStack.pop();
        bshellSyncUndoButtons();
        e.target.value = "";
        return;
      }
      d.heroImage = url;
      bshellRenderProperties();
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }
  const photoRemoveEl = document.getElementById("bshell-set-photo-remove");
  if (photoRemoveEl) {
    photoRemoveEl.addEventListener("click", () => {
      if (!d.heroImage) return;
      bshellSnapshot();
      d.heroImage = "";
      const fileInput = document.getElementById("bshell-set-photo");
      if (fileInput) fileInput.value = "";
      bshellRenderProperties();
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }

  const galleryEl = document.getElementById("bshell-set-gallery");
  if (galleryEl) {
    galleryEl.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      bshellSnapshot();
      d.heroImages = d.heroImages || [];
      const roomLeft = SITE_GALLERY_MAX - d.heroImages.length;
      if (roomLeft <= 0) {
        alert(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — הסירו אחת כדי להוסיף חדשה.`);
        bshellUndoStack.pop();
        bshellSyncUndoButtons();
        e.target.value = "";
        return;
      }
      const toAdd = files.slice(0, roomLeft);
      if (files.length > toAdd.length) {
        alert(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — נוספו רק ${toAdd.length} מתוך ${files.length} שבחרתם.`);
      }
      let remaining = toAdd.length;
      toAdd.forEach(async (file) => {
        if (file.size > 6 * 1024 * 1024) {
          alert(`"${file.name}" גדולה מדי — בחרו קובץ עד 6MB.`);
          remaining -= 1;
          if (remaining === 0) { bshellRenderProperties(); bshellRenderCanvas(); bshellScheduleSave(); }
          return;
        }
        // Each gallery photo gets its own unique name (unlike the single,
        // stable "hero" slot) — same convention site-builder.js's own
        // gallery upload already uses.
        const name = "gallery-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const url = await uploadSiteImage(file, name);
        if (!url) alert(`העלאת "${file.name}" נכשלה, נסו שוב.`);
        else d.heroImages.push(url);
        remaining -= 1;
        if (remaining === 0) { bshellRenderProperties(); bshellRenderCanvas(); bshellScheduleSave(); }
      });
      e.target.value = "";
    });
  }
  const galleryPreviewEl = document.getElementById("bshell-set-gallery-preview");
  if (galleryPreviewEl) {
    galleryPreviewEl.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="bshell-remove-gallery-photo"]');
      if (!btn) return;
      bshellSnapshot();
      const idx = parseInt(btn.closest("[data-idx]").dataset.idx, 10);
      d.heroImages.splice(idx, 1);
      bshellRenderProperties();
      bshellRenderCanvas();
      bshellScheduleSave();
    });
  }
}

/* Same trick applyGlobalStylesLive() (site-builder.js) already uses for
   the old sidebar's own color/font fields, aimed at the Shell's iframe
   instead of the old #site-preview-frame — patches the live <style>
   tag's text (and the Google Fonts <link>s) from a freshly rendered
   copy of the page, rather than reloading the whole iframe. Falls back
   to a full canvas re-render if the current document has no <style>
   tag to patch yet (shouldn't normally happen). */
function bshellApplyGlobalStylesLive() {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe && iframe.contentDocument;
  const styleEl = doc && doc.querySelector("style");
  if (!styleEl) { bshellRenderCanvas(); return; }
  const html = currentSiteHtml("index");
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) { bshellRenderCanvas(); return; }
  styleEl.textContent = styleMatch[1];
  const linkMatches = html.match(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g);
  if (linkMatches) {
    doc.querySelectorAll('head link[rel="preconnect"], head link[href*="fonts.googleapis.com"]').forEach((el) => el.remove());
    doc.head.insertAdjacentHTML("afterbegin", linkMatches.join(""));
  }
}
