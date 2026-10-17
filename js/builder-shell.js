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

// UI language helpers — js/i18n.js's dkL() and js/i18n-sites.js's
// dkSitesLabel() when loaded, plain Hebrew otherwise (this file must keep
// working on any page that loads it without the i18n scripts).
function bsL(he, en) { return typeof dkL === "function" ? dkL(he, en) : he; }
function bsLabel(he) { return typeof dkSitesLabel === "function" ? dkSitesLabel(he) : he; }

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
    const sel = c.charAt(0) === "#" ? c : `[data-textkey="${c}"]`;
    // The anchor can be the section element itself (chaos's services
    // rail IS #oc-hscroll) — querySelector alone never matches root.
    if (root.matches && root.matches(sel)) return root;
    const el = root.querySelector(sel);
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
  businessName: { label: bsL("שם העסק", "Business name"), get: (d) => d.businessName || "", set: (d, v) => { d.businessName = v; } },
  "heading-heroTitle": { label: bsL("כותרת ראשית", "Main heading"), placeholder: bsL("ברירת מחדל: שם העסק", "Default: your business name"), get: (d) => (d.headings && d.headings.heroTitle) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.heroTitle = v; } },
  tagline: { label: bsL("שורת תיאור", "Tagline"), get: (d) => d.tagline || "", set: (d, v) => { d.tagline = v; } },
  aboutText: { label: bsL("טקסט אודות", "About text"), multiline: true, get: (d) => d.about || "", set: (d, v) => { d.about = v; } },
  "heading-services": { label: bsL("כותרת השירותים", "Services heading"), placeholder: bsL("ברירת מחדל: השירותים שלנו", "Leave empty for the default heading"), get: (d) => (d.headings && d.headings.services) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.services = v; } },
  "heading-about": { label: bsL("כותרת האודות", "About heading"), placeholder: bsL("ברירת מחדל: קצת עלינו", "Leave empty for the default heading"), get: (d) => (d.headings && d.headings.about) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.about = v; } },
  "heading-contact": { label: bsL("כותרת יצירת הקשר", "Contact heading"), placeholder: bsL("ברירת מחדל: יצירת קשר", "Leave empty for the default heading"), get: (d) => (d.headings && d.headings.contact) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.contact = v; } },
};

let bshellActiveFlag = false;
let bshellSelection = null; // { kind: "section", type, rootEl, focus? } | { kind: "settings" } — see bshellResolveClickTarget
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
  document.getElementById("bshell-top-name").textContent = (siteState.data.businessName || "").trim() || (t ? bsLabel(t.label) : bsL("הפרויקט שלי", "My project"));

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
   free text + real site context -> site-ai-command Edge Function ->
   a short list of validated ops -> confirm -> apply. applySiteAiOp()
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
    bshellAiNote(bsL("השינוי כבר לא מתאים למצב הנוכחי של האתר, ולכן לא בוצע.", "That change no longer fits the site's current state, so it wasn't made."));
    return;
  }
  // A selected service/section may no longer exist (or sit at another
  // index) after the change; the Settings panel just needs repainting so
  // it shows the new colour/font/contact values.
  if (bshellSelection && bshellSelection.kind !== "settings") bshellDeselect();
  else bshellRenderProperties();
  const t = SITE_TEMPLATES[siteState.template];
  document.getElementById("bshell-top-name").textContent = (d.businessName || "").trim() || (t ? bsLabel(t.label) : bsL("הפרויקט שלי", "My project"));
  bshellRenderCanvas();
  bshellRenderHierarchy();
  bshellScheduleSave();
  // Same Undo as every manual edit in the Shell (bshellSnapshot above) —
  // offered right here too, so the way back is one click away.
  bshellAiNote(`${bsL("בוצע ✓", "Done ✓")} ${escapeHtmlS(result.explanation || "")}
    <div class="bshell-ai-confirm-row"><button type="button" id="bshell-ai-undo">${bsL("↶ ביטול השינוי", "↶ Undo this change")}</button></div>`);
  const undoBtn = document.getElementById("bshell-ai-undo");
  if (undoBtn) undoBtn.addEventListener("click", () => {
    bshellUndo();
    bshellAiNote(bsL("השינוי בוטל.", "Change undone."));
  });
}

function bshellAiNote(html) {
  const note = document.getElementById("bshell-ai-note");
  if (note) note.innerHTML = html;
}

/* What the AI can actually do is exactly site-ai-command's op menu
   (supabase/functions/_shared/site-ai-ops.ts): reorder / add / remove a
   section, switch a section's display variant, change the main colour or
   the font, rewrite a text (title, tagline, about, headings, contact
   details), add / edit / remove a service, or remove an image. The chips
   are built from THIS site's real context, so every suggestion is one
   the server can carry out, and the hint line says plainly what kind of
   request works. */
const BSHELL_AI_TYPE_NAMES = { services: bsL("השירותים", "the services"), about: bsL("האודות", "the about section"), contact: bsL("חלק צור קשר", "the contact section"), aboutTags: bsL("התגיות", "the tags"), grid: bsL("הרשת", "the grid") };
const BSHELL_AI_HINT = bsL("אפשר לבקש: לשנות צבע או גופן, לכתוב מחדש טקסט (כותרת, אודות, פרטי קשר), להוסיף/לערוך/להסיר שירות, לשנות סדר חלקים או סגנון תצוגה. אפשר כמה דברים בבקשה אחת.", "You can ask to: change the color or font, rewrite a text (heading, about, contact details), add/edit/remove a service, reorder sections or switch a display style. Several things in one request is fine.");

function bshellAiExamples() {
  const ctx = siteAiCommandContext();
  const name = (t) => BSHELL_AI_TYPE_NAMES[t] || t;
  const variants = (siteState.data && siteState.data.blockVariants) || {};
  const out = [];
  // Content/design first — that's what people ask for most.
  out.push(bsL("שנה את הצבע לכחול והפוך את הגופן לאלגנטי", "Make the color blue and the font more elegant"));
  if (ctx.textFields.about) out.push(bsL("קצר את טקסט האודות", "Make the about text shorter"));
  else out.push(bsL("כתוב שורת תיאור מקצועית יותר", "Write a more professional tagline"));
  const movable = ctx.activeTypes.filter((t) => t !== "hero" && BSHELL_AI_TYPE_NAMES[t]);
  if (movable.length >= 2) out.push(bsL(`הזז את ${name(movable[1])} לפני ${name(movable[0])}`, `Move ${name(movable[1])} before ${name(movable[0])}`));
  if (ctx.variantOptions.hero) {
    out.push(variants.hero === "centered" ? bsL("החזר את ה-Hero לעיצוב הקלאסי", "Switch the Hero back to the classic layout") : bsL("הפוך את ה-Hero לממורכז", "Make the Hero centered"));
  }
  if (ctx.variantOptions.services && ctx.activeTypes.indexOf("services") !== -1) {
    out.push(variants.services === "grid" ? bsL("החזר את השירותים לעיצוב ברירת המחדל", "Switch the services back to the default layout") : bsL("הצג את השירותים כרשת כרטיסים", "Show the services as a card grid"));
  }
  const addable = ctx.availableTypes.filter((t) => ctx.activeTypes.indexOf(t) === -1 && BSHELL_AI_TYPE_NAMES[t]);
  if (out.length < 3 && addable.length) out.push(bsL(`הוסף את ${name(addable[0])}`, `Add ${name(addable[0])}`));
  const removable = movable.filter((t) => t !== "grid");
  if (out.length < 3 && removable.length) out.push(bsL(`הסר את ${name(removable[removable.length - 1])}`, `Remove ${name(removable[removable.length - 1])}`));
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
    // !isConnected: a click on the note's own Confirm/Undo buttons, which
    // their handler has already replaced by the time this runs — still a
    // click inside the panel, so the "Done" note stays visible.
    if (e.target === btn || panel.contains(e.target) || !e.target.isConnected) return;
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
  bshellAiNote(bsL("ה-AI מעבד את הפקודה…", "The AI is working on your request…"));
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = bsL("מעבד...", "Working...");

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const res = await fetch(SUPABASE_URL + "/functions/v1/site-ai-command", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(siteAiCommandRequestBody(command)),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "unexpected error");

    if (data.limitReached) {
      bshellAiNote(data.isPro
        ? bsL("הגעת למכסת השימוש ההוגן היומית לפקודות AI. אפשר להמשיך מחר.", "You've reached today's fair-use limit for AI commands. You can continue tomorrow.")
        : bsL("הגעת למכסת הניסיונות החינמיים לפקודות AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!", "You've used up your free AI command tries. Want to keep going? Upgrade to Pro with a one-time payment!"));
      return;
    }

    // Re-checked against the live data (siteAiCleanOps, site-ai-
    // command.js) before anything is even offered for confirmation.
    const result = data.result;
    const ops = (result && result.op !== "unsupported") ? siteAiCleanOps(result, ensurePagesShape(siteState.data), siteState.template) : [];
    if (!ops.length) {
      // The server's explanation already says what CAN be done.
      bshellAiNote(escapeHtmlS((result && result.op === "unsupported" && result.explanation) || `${bsL("לא הצלחתי לבצע את הפעולה הזו.", "I couldn't do that.")} ${BSHELL_AI_HINT}`));
      return;
    }

    bshellAiPending = result;
    bshellAiNote(siteAiConfirmHtml(result, ops, "bshell-ai", "bshell-ai-confirm-yes"));
    document.getElementById("bshell-ai-confirm").addEventListener("click", () => {
      if (bshellAiPending) bshellApplyAiOp(bshellAiPending);
      bshellAiPending = null;
      input.value = "";
    });
    document.getElementById("bshell-ai-cancel").addEventListener("click", () => {
      bshellAiPending = null;
      bshellAiNote(bsL("בוטל.", "Canceled."));
    });
  } catch (err) {
    console.error("bshell AI command failed:", err && err.message ? err.message : "error"); // never the command or site text
    bshellAiNote(bsL("משהו השתבש. אפשר לנסות שוב בעוד רגע.", "Something went wrong. Please try again in a moment."));
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function bshellSaveNow() {
  clearTimeout(bshellSaveTimer);
  const status = document.getElementById("bshell-top-status");
  status.textContent = bsL("שומרים...", "Saving...");
  status.className = "bshell-top-status saving";
  // saveSiteNow() now returns the Supabase error (or null) instead of
  // being fire-and-forget — confirmed-live bug this fixes: this always
  // showed "נשמר ✓" even when the save itself failed, so a user who hit
  // a real save error had no way to know their edits weren't actually
  // safe to walk away from.
  const error = typeof saveSiteNow === "function" ? await saveSiteNow() : null;
  if (!error) {
    const savedLabel = bsL("נשמר ✓", "Saved ✓");
    status.textContent = savedLabel;
    status.className = "bshell-top-status saved";
    setTimeout(() => { if (status.textContent === savedLabel) status.textContent = ""; }, 2500);
  } else {
    status.textContent = bsL("לא נשמר — ננסה שוב", "Not saved — retrying");
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
        const isSelectedItem = bshellSelection && bshellSelection.kind === "section" && bshellSelection.focus && bshellSelection.focus.svc === i;
        return `<button type="button" class="bshell-item${isSelectedItem ? " is-selected" : ""}" data-bshell-select-service="${i}">${escapeHtmlS(s.name && s.name.trim() ? s.name : `${bsL("שירות", "Service")} ${i + 1}`)}</button>`;
      }).join("") + `<button type="button" class="bshell-add-item" data-bshell-add-service>${bsL("+ הוספת שירות", "+ Add service")}</button>`;
    }
    return `
      <details class="bshell-sec"${bshellCollapsedSections.has(type) ? "" : " open"}>
        <summary class="bshell-sec-head${isSelectedSection ? " is-selected" : ""}${hidden ? " is-hidden" : ""}" data-bshell-select-section="${type}">
          <span class="bshell-sec-chevron"></span>
          <span>${escapeHtmlS(bsLabel(def.label) || type)}</span>
          ${hidden ? `<span class="bshell-sec-hidden-dot" title="${bsL("מוסתר", "Hidden")}"></span>` : ""}
        </summary>
        ${itemsHtml ? `<div class="bshell-sec-body">${itemsHtml}</div>` : ""}
      </details>`;
  }).join("") + (types.length ? `
      <div class="bshell-sec">
        <button type="button" class="bshell-sec-head${bshellSelection && bshellSelection.kind === "section" && bshellSelection.type === BSHELL_SITE_TYPE ? " is-selected" : ""}" data-bshell-select-site>
          <span>${bsL("ראש ותחתית האתר", "Header & footer")}</span>
        </button>
      </div>` : "");
  list.querySelectorAll("[data-bshell-select-site]").forEach((el) => {
    el.addEventListener("click", () => bshellSelectSection(BSHELL_SITE_TYPE));
  });

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
    el.addEventListener("click", bshellAddService);
  });
}

/* ---------- Canvas: render + click-to-select ---------- */

/* The canvas used to reload its whole iframe (srcdoc = ...) on every
   change that wasn't a single data-textkey span — every keystroke in a
   service name, a phone number or the contact details, every mood/colour
   whose colour sits in an inline style (the "centered" hero / "grid"
   services layouts in site-blocks.js), every toggle. A reload is a
   visible flash: the page blanks, scrolls back to the top and replays
   its fade-in animations. Now every change goes through one path:

   1. bshellPatchCanvas() renders the page in memory (the same
      currentSiteHtml() string the published site is made from), diffs it
      against the page the canvas is showing, and changes only what
      differs in the live document — a text node, an attribute, the
      template's <style>, or (when the shape of something changed, e.g. a
      service was added) that one element's contents. No navigation.
   2. Only when the page's top-level structure itself changed (a section
      shown/hidden, the language switched) does it fall back to
      bshellSwapInCanvas(): the new page loads in a hidden second iframe
      on top, jumps to the same scroll position with everything already
      revealed, and only then replaces the old one — double-buffered, so
      there's nothing to see in between.

   Every top-level element of the page is tagged data-bshell-top="N" in
   the canvas copy only (never in what's published), so the diff can find
   "the Nth section" in the live document even after the template's own
   scripts have added things around it. */
let bshellCanvasHtml = "";     // the currentSiteHtml() string the visible canvas shows
let bshellCanvasBuffer = null; // a hidden iframe still loading the next full render

function bshellTaggedDoc(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  Array.from(doc.body.children).forEach((el, i) => el.setAttribute("data-bshell-top", String(i)));
  return doc;
}

/* afterLoad runs once the canvas shows the new page — right away when it
   could be patched in place, after the swap otherwise. Every call site
   that needs to touch the FRESH document (reselect whatever was
   selected) passes it rather than assuming either. */
function bshellRenderCanvas(afterLoad) {
  const html = currentSiteHtml("index");
  if (bshellPatchCanvas(html)) {
    bshellReanchorSelection();
    if (afterLoad) afterLoad();
    return;
  }
  bshellSwapInCanvas(html, afterLoad);
}

function bshellPatchCanvas(html) {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe && iframe.contentDocument;
  if (!doc || !doc.body || !bshellCanvasHtml || bshellCanvasBuffer) return false;
  if (!doc.querySelector("body > [data-bshell-top]")) return false;
  if (html === bshellCanvasHtml) return true;
  const oldDoc = bshellTaggedDoc(bshellCanvasHtml);
  const newDoc = bshellTaggedDoc(html);
  const attr = (d, name) => d.documentElement.getAttribute(name);
  if (attr(oldDoc, "lang") !== attr(newDoc, "lang") || attr(oldDoc, "dir") !== attr(newDoc, "dir")) return false;
  if (oldDoc.body.getAttribute("class") !== newDoc.body.getAttribute("class")) return false;
  const oldTop = Array.from(oldDoc.body.children);
  const newTop = Array.from(newDoc.body.children);
  if (oldTop.length !== newTop.length || oldTop.some((el, i) => el.tagName !== newTop[i].tagName)) return false;
  // A template script with the data baked in (cinematic's glow, neon's
  // particles and luxury3d's tint are coloured from the primary colour
  // when they start) can't be patched: its old copy keeps running. Those
  // changes — colour/mood on those templates only — take the swap.
  const scriptsOf = (d) => Array.from(d.querySelectorAll("script")).map((s) => s.textContent).join("\u0000");
  if (scriptsOf(oldDoc) !== scriptsOf(newDoc)) return false;
  // Find every live counterpart BEFORE changing anything, so a page that
  // can't be patched is left exactly as it was for the full swap.
  const jobs = [];
  for (let i = 0; i < oldTop.length; i++) {
    if (oldTop[i].isEqualNode(newTop[i])) continue;
    const live = doc.querySelector(`body > [data-bshell-top="${i}"]`);
    if (!live) return false;
    jobs.push([live, oldTop[i], newTop[i]]);
  }
  const oldStyle = oldDoc.head.querySelector("style");
  const newStyle = newDoc.head.querySelector("style");
  const liveStyle = doc.head.querySelector('style:not([id^="bshell"])');
  if ((oldStyle ? oldStyle.textContent : "") !== (newStyle ? newStyle.textContent : "")) {
    if (!liveStyle || !newStyle) return false;
    liveStyle.textContent = newStyle.textContent;
  }
  // The Google Fonts <link>s (a font or mood change loads another family).
  const links = (d) => Array.from(d.head.querySelectorAll("link")).map((l) => l.outerHTML).join("");
  if (links(oldDoc) !== links(newDoc)) {
    doc.head.querySelectorAll("link").forEach((l) => l.remove());
    doc.head.insertAdjacentHTML("afterbegin", Array.from(newDoc.head.querySelectorAll("link")).map((l) => l.outerHTML).join(""));
  }
  // <title>/<meta> differences (SEO fields) are invisible in the canvas.
  const touchedTops = new Set();
  jobs.forEach(([live, o, n]) => bshellPatchNode(doc, live, o, n, touchedTops));
  touchedTops.forEach((top) => bshellRerunTrailingScript(doc, top));
  bshellCanvasHtml = html;
  return true;
}

/* Brings one live element in line with its new rendering, as narrowly as
   possible: same tag + same child shape -> recurse (so typing a service
   name only rewrites that name's text node); anything else -> this one
   element's contents are rebuilt from the new rendering. touchedTops
   collects the top-level sections whose markup was rebuilt, so their
   own trailing <script> can be re-run once afterwards. */
function bshellPatchNode(doc, live, o, n, touchedTops) {
  if (o.isEqualNode(n)) return;
  if (o.tagName !== n.tagName || o.tagName === "SCRIPT") {
    const fresh = doc.importNode(n, true);
    live.replaceWith(fresh);
    bshellAfterRebuild(doc, fresh, touchedTops);
    return;
  }
  Array.from(n.attributes).forEach((a) => { if (o.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value); });
  Array.from(o.attributes).forEach((a) => { if (!n.hasAttribute(a.name)) live.removeAttribute(a.name); });
  if (live.classList && live.classList.contains("site-reveal")) live.classList.add("site-in");
  const oc = o.childNodes, nc = n.childNodes, lc = live.childNodes;
  const sameShape = oc.length === nc.length && lc.length === oc.length
    && Array.prototype.every.call(oc, (c, i) => c.nodeName === nc[i].nodeName && lc[i].nodeName === c.nodeName);
  if (sameShape) {
    for (let i = 0; i < oc.length; i++) {
      if (oc[i].nodeType === 1) bshellPatchNode(doc, lc[i], oc[i], nc[i], touchedTops);
      else if (oc[i].nodeValue !== nc[i].nodeValue) lc[i].nodeValue = nc[i].nodeValue;
    }
    return;
  }
  live.innerHTML = n.innerHTML;
  bshellAfterRebuild(doc, live, touchedTops);
}

/* Markup rebuilt from a string needs what the original page load gave
   it: no fade-in (the reveal-on-scroll observer only ran once, at load —
   and the owner is looking right at this part anyway), and working
   <script>s (innerHTML/importNode never run them, so each is swapped
   for a fresh copy that does — e.g. a services search box). */
function bshellAfterRebuild(doc, el, touchedTops) {
  if (el.classList && el.classList.contains("site-reveal")) el.classList.add("site-in");
  if (el.querySelectorAll) el.querySelectorAll(".site-reveal").forEach((r) => r.classList.add("site-in"));
  const scripts = el.tagName === "SCRIPT" ? [el] : Array.from(el.querySelectorAll ? el.querySelectorAll("script") : []);
  scripts.forEach((old) => {
    const s = doc.createElement("script");
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
  const top = el.closest ? el.closest("body > *") : null;
  if (top && el.tagName !== "SCRIPT") touchedTops.add(top);
}

/* Some sections set themselves up once from a <script> placed right
   after their markup (local-service's sideways services rail,
   playground's physics bubbles) — the same convention renderBlocksHtml()
   relies on. When that section's markup was rebuilt, the script runs
   again against the new elements. The hero photo slideshow's timer is
   one global script at the end of <body>, so it's re-run the same way
   whenever a rebuilt section holds a slideshow. */
function bshellRerunTrailingScript(doc, top) {
  if (!top.isConnected) return;
  const next = top.nextElementSibling;
  if (next && next.tagName === "SCRIPT") {
    const s = doc.createElement("script");
    s.textContent = next.textContent;
    top.after(s);
  }
  if (top.querySelector(".site-hero-slideshow") && typeof heroSlideshowScript === "function") {
    const s = doc.createElement("script");
    s.textContent = heroSlideshowScript().replace(/^<script>|<\/script>$/g, "");
    doc.body.appendChild(s);
  }
}

/* The full re-render, double-buffered (see the comment above
   bshellCanvasHtml). The very first load has nothing to keep on screen,
   so it just loads. */
function bshellSwapInCanvas(html, afterLoad) {
  const cur = document.getElementById("bshell-canvas-iframe");
  const tagged = "<!doctype html>\n" + bshellTaggedDoc(html).documentElement.outerHTML;
  const curDoc = cur.contentDocument;
  if (!bshellCanvasHtml || !curDoc || !curDoc.body || !curDoc.body.children.length) {
    if (bshellCanvasBuffer) { bshellCanvasBuffer.remove(); bshellCanvasBuffer = null; }
    cur.onload = () => {
      bshellCanvasHtml = html;
      bshellOnCanvasLoad();
      if (afterLoad) afterLoad();
    };
    cur.srcdoc = tagged;
    return;
  }
  if (bshellCanvasBuffer) bshellCanvasBuffer.remove(); // a newer render replaces one still loading
  const scrollY = cur.contentWindow ? cur.contentWindow.scrollY : 0;
  const buf = document.createElement("iframe");
  buf.className = cur.className + " bshell-canvas-buffer";
  buf.title = cur.title;
  buf.setAttribute("aria-hidden", "true");
  bshellCanvasBuffer = buf;
  buf.onload = () => {
    if (bshellCanvasBuffer !== buf) return;
    const bdoc = buf.contentDocument;
    // A new iframe first "loads" an empty about:blank — wait for the page.
    if (!bdoc || !bdoc.head || !bdoc.querySelector("body > [data-bshell-top]")) return;
    const still = bdoc.createElement("style");
    still.id = "bshell-swap-still";
    still.textContent = "*,*::before,*::after{transition:none !important;} html{scroll-behavior:auto !important;}";
    bdoc.head.appendChild(still);
    bdoc.querySelectorAll(".site-reveal").forEach((el) => el.classList.add("site-in"));
    buf.contentWindow.scrollTo(0, scrollY);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (bshellCanvasBuffer !== buf) return;
      bshellCanvasBuffer = null;
      cur.remove();
      buf.id = "bshell-canvas-iframe";
      buf.classList.remove("bshell-canvas-buffer");
      buf.removeAttribute("aria-hidden");
      buf.onload = null;
      still.remove();
      bshellCanvasHtml = html;
      bshellOnCanvasLoad();
      if (afterLoad) afterLoad();
    }));
  };
  cur.parentNode.appendChild(buf);
  buf.srcdoc = tagged;
}

function bshellOnCanvasLoad() {
  bshellWireCanvasClicks();
  bshellReanchorSelection();
}

/* Click-to-edit + hover hints, wired once per loaded document. */
function bshellWireCanvasClicks() {
  const iframe = document.getElementById("bshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc || doc.__bshellWired) return;
  doc.__bshellWired = true;
  bshellCanvasClickWired = true;
  const ui = doc.createElement("style");
  ui.id = "bshell-canvas-ui";
  // A subtle dashed outline on whatever a click would open, and a hand
  // cursor everywhere, so it's obvious the page itself is clickable.
  ui.textContent = `
    body, body * { cursor:pointer !important; }
    .bshell-hover-target { outline:1.5px dashed rgba(20,184,166,.9) !important; outline-offset:2px !important; }
    .bshell-hover-target.bshell-hover-section { outline-offset:-3px !important; }
    .bshell-outline-target.bshell-hover-target { outline-style:solid !important; }`;
  doc.head.appendChild(ui);
  doc.addEventListener("click", (e) => {
    if (e.target.closest("#bshell-mini-toolbar")) return;
    const a = e.target.closest("a");
    if (a) e.preventDefault(); // selecting, not navigating, inside the canvas
    if (e.target.closest("#deskkit-badge")) return;
    const resolved = bshellResolveClickTarget(e.target, doc);
    if (!resolved) { bshellDeselect(); return; }
    bshellSelection = resolved;
    bshellApplySelectionVisual();
    bshellRenderProperties();
    bshellRenderHierarchy();
  }, true);
  let hovered = null;
  const setHover = (el) => {
    if (el === hovered) return;
    if (hovered) hovered.classList.remove("bshell-hover-target", "bshell-hover-section");
    hovered = el;
    if (el) {
      el.classList.add("bshell-hover-target");
      if (el.parentElement === doc.body) el.classList.add("bshell-hover-section");
    }
  };
  doc.addEventListener("mouseover", (e) => setHover(bshellHoverTargetOf(e.target)));
  doc.addEventListener("mouseleave", () => setHover(null));
}

/* What a click on el would open, as the element to outline on hover:
   one service card, one text, one contact link — or the whole section. */
function bshellHoverTargetOf(el) {
  if (!el || !el.closest || el.closest("#bshell-mini-toolbar, #deskkit-badge")) return null;
  return el.closest("[data-svc-idx]") || bshellGridCardOf(el) || el.closest("[data-textkey]")
    || el.closest('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me/"]') || el.closest("body > *");
}

/* The generic "grid" services layout (site-blocks.js) has no data-svc-idx
   on its cards — in the canvas they're found by position instead. */
function bshellGridCardOf(el) {
  const card = el.closest && el.closest(`${SITE_GROUP_GRID}`);
  if (!card || card.closest("[data-svc-idx]")) return null;
  card.dataset.bshellGridIdx = String(Array.prototype.indexOf.call(card.parentElement.children, card));
  return card;
}

/* ---------- Selection model ----------
   Every click in the canvas opens the editor of the SECTION it belongs
   to (bshellSelection = { kind: "section", type, rootEl, focus }) —
   hero/services/about/contact/... as defined in SITE_BLOCK_DEFS, plus
   "site": the header/side rail/footer around them, which aren't blocks.
   focus says what inside the section was clicked, so its field is
   scrolled to, highlighted and focused: { svc: index } for one service
   card, { key: textkey } for a text, { contact: "phone"|"email"|... }
   for a contact detail. */
const BSHELL_SITE_TYPE = "site";

function bshellSectionTypeOfTop(top) {
  const template = siteState.template;
  const types = Object.keys(SITE_BLOCK_DEFS[template] || {});
  for (const type of types) {
    if (bshellQueryAnchor(top, bshellAnchorCandidates(template, type))) return type;
  }
  return null;
}

/* Whether a section's editor shows the contact details: the contact
   section itself, or a fused block that holds them (bento's grid). */
function bshellSectionHasContact(type, rootEl) {
  if (type === "contact" || type === BSHELL_SITE_TYPE) return true;
  return !!(rootEl && rootEl.querySelector('[data-textkey="heading-contact"]'));
}

function bshellResolveClickTarget(target, doc) {
  const top = target.closest("body > *");
  if (!top) return null;
  const d = siteState.data;
  let type = bshellSectionTypeOfTop(top) || BSHELL_SITE_TYPE;
  let focus = null;
  const svcEl = target.closest("[data-svc-idx]");
  const gridCard = !svcEl && bshellGridCardOf(target);
  const textEl = target.closest("[data-textkey]");
  const link = target.closest('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me/"]');
  if (svcEl) focus = { svc: parseInt(svcEl.dataset.svcIdx, 10) };
  else if (gridCard) focus = { svc: parseInt(gridCard.dataset.bshellGridIdx, 10) };
  else if (textEl && BSHELL_TEXT_CONTENT_MAP[textEl.dataset.textkey]) focus = { key: textEl.dataset.textkey };
  else if (link) {
    const href = link.getAttribute("href") || "";
    focus = { contact: href.startsWith("mailto:") ? "email" : href.indexOf("wa.me/") !== -1 ? "whatsapp" : "phone" };
  } else {
    // A plain "טלפון: 050-..." line: match the clicked text to the details.
    const text = (target.textContent || "").trim();
    for (const k of ["email", "phone", "address"]) {
      const v = String(d[k] || "").trim();
      if (v && text && text.length < 200 && text.indexOf(v) !== -1) { focus = { contact: k }; break; }
    }
  }
  // Contact details are edited where the contact section is: a phone in
  // the header or the hero opens the contact section (or, on a template
  // with no inline contact section, the header & footer panel).
  if (focus && focus.contact && !bshellSectionHasContact(type, top)) {
    const def = SITE_BLOCK_DEFS[siteState.template].contact;
    type = (def && (!def.active || def.active(d))) ? "contact" : BSHELL_SITE_TYPE;
  }
  // The business name in the header/footer belongs to the header & footer
  // panel; inside the hero it stays with the hero.
  const rootEl = type === BSHELL_SITE_TYPE ? (bshellSectionTypeOfTop(top) ? null : top) : bshellFindSectionRoot(doc, type);
  const sel = { kind: "section", type, rootEl, focus, topIdx: rootEl === top ? top.getAttribute("data-bshell-top") : null };
  sel.focusEl = (focus && (focus.svc != null || focus.key)) ? (svcEl || gridCard || textEl) : null;
  return sel;
}

function bshellFindSectionRoot(doc, type) {
  if (!doc) return null;
  if (type === BSHELL_SITE_TYPE) {
    // The first top-level element that isn't one of the blocks — the
    // header/side rail on every template.
    return Array.from(doc.body.children).find((el) => el.hasAttribute("data-bshell-top") && el.tagName !== "SCRIPT"
      && el.id !== "deskkit-badge" && !bshellSectionTypeOfTop(el) && el.textContent.trim()) || null;
  }
  const anchorEl = bshellFindAnchorEl(doc, siteState.template, type);
  return anchorEl ? anchorEl.closest("body > *") : null;
}

/* The element inside the section that the focus points at (outlined
   instead of the whole section). */
function bshellFindFocusEl(doc, sel) {
  if (!doc || !sel || !sel.focus) return null;
  const scope = sel.rootEl || doc;
  if (sel.focus.svc != null) {
    const card = scope.querySelector(`[data-svc-idx="${sel.focus.svc}"]`);
    if (card) return card;
    const grid = scope.querySelector(SITE_GROUP_GRID);
    return grid ? grid.parentElement.children[sel.focus.svc] || null : null;
  }
  if (sel.focus.key) return scope.querySelector(`[data-textkey="${sel.focus.key}"]`);
  return null;
}

function bshellDeselect() {
  bshellSelection = null;
  bshellApplySelectionVisual();
  bshellRenderProperties();
  bshellRenderHierarchy();
}

function bshellSelectSection(type, focus) {
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  // A HIDDEN section renders nothing in the canvas at all, so there's
  // no element to anchor on — select it anyway (rootEl: null), purely
  // so the Properties panel's own visibility switch can still show and
  // bring it back. bshellApplySelectionVisual() already no-ops safely
  // without a rootEl; only the scroll+outline step is skipped.
  bshellSelection = { kind: "section", type, rootEl: bshellFindSectionRoot(doc, type), focus: focus || null };
  bshellSelection.focusEl = bshellFindFocusEl(doc, bshellSelection);
  const target = bshellSelection.focusEl || bshellSelection.rootEl;
  if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  bshellApplySelectionVisual();
  bshellRenderProperties();
  bshellRenderHierarchy();
}

/* One service card (from the hierarchy list, or after adding/duplicating
   one): its section's editor, scrolled to and focused on that card. */
function bshellSelectService(idx) {
  const type = bshellItemsType();
  if (type) bshellSelectSection(type, { svc: idx });
}
function bshellItemsType() {
  const defs = SITE_BLOCK_DEFS[siteState.template] || {};
  return Object.keys(defs).find((t) => defs[t].hasItems) || null;
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
  if (!bshellSelection) return;
  // The clicked service/text when there is one, else the whole section.
  const focusEl = bshellSelection.focusEl && doc.contains(bshellSelection.focusEl) ? bshellSelection.focusEl : null;
  const el = focusEl || bshellSelection.rootEl;
  if (!el || !doc.contains(el)) return;
  const isSvc = !!(focusEl && bshellSelection.focus && bshellSelection.focus.svc != null);
  const isBlock = !focusEl && bshellSelection.type !== BSHELL_SITE_TYPE;

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
  const toolbarButtons = [`<button type="button" data-tool="edit" title="${bsL("עריכה", "Edit")}">✎</button>`];
  if (isSvc) {
    toolbarButtons.push(`<button type="button" data-tool="duplicate" title="${bsL("שכפול", "Duplicate")}">⧉</button>`);
  }
  if (isBlock) {
    toolbarButtons.push(`<button type="button" data-tool="hide" title="${bsL("הסתרה/הצגה", "Hide/show")}">◐</button>`);
  }
  if (isSvc) {
    toolbarButtons.push(`<button type="button" data-tool="delete" title="${bsL("מחיקה", "Delete")}">🗑</button>`);
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
  const svcIdx = bshellSelection.focus && bshellSelection.focus.svc;
  if (tool === "edit") {
    document.getElementById("bshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("bshell-props").classList.add("bshell-drawer-open");
    const focused = document.querySelector("#bshell-props-body .is-focused input, #bshell-props-body .is-focused textarea");
    const first = focused || document.querySelector("#bshell-props-body input, #bshell-props-body textarea");
    if (first) first.focus();
    return;
  }
  if (tool === "duplicate" && svcIdx != null) return bshellDuplicateService(svcIdx);
  if (tool === "hide" && bshellSelection.type !== BSHELL_SITE_TYPE) {
    bshellSnapshot();
    bshellToggleSectionVisibility(bshellSelection.type);
    bshellDeselect();
    bshellRenderCanvas();
    bshellRenderHierarchy();
    bshellScheduleSave();
    return;
  }
  if (tool === "delete" && svcIdx != null) bshellDeleteService(svcIdx);
}

/* Shared by the canvas mini-toolbar and the section editor's own
   per-service buttons. */
function bshellDuplicateService(idx) {
  const d = siteState.data;
  if (!d.services || !d.services[idx]) return;
  bshellSnapshot();
  d.services.splice(idx + 1, 0, Object.assign({}, d.services[idx]));
  bshellRenderCanvas(() => bshellSelectService(idx + 1));
  bshellRenderHierarchy();
  bshellScheduleSave();
}
function bshellDeleteService(idx) {
  const d = siteState.data;
  if (!d.services || d.services.length <= 1) return; // a services section needs at least one row to mean anything
  bshellSnapshot();
  d.services.splice(idx, 1);
  const type = bshellSelection && bshellSelection.type;
  bshellRenderCanvas(() => { if (type) bshellSelectSection(type); });
  bshellRenderHierarchy();
  bshellScheduleSave();
}
function bshellAddService() {
  const d = siteState.data;
  bshellSnapshot();
  d.services = d.services || [];
  d.services.push({ name: "", desc: "", price: "" });
  const newIdx = d.services.length - 1;
  bshellRenderCanvas(() => bshellSelectService(newIdx));
  bshellRenderHierarchy();
  bshellScheduleSave();
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
  if (bshellSelection.kind === "section") body.innerHTML = bshellPropsHtmlForSection(bshellSelection.type);
  else if (bshellSelection.kind === "settings") body.innerHTML = bshellPropsHtmlForSettings();
  bshellWirePropertiesPanel();
  if (bshellSelection.kind === "section" && bshellSelection.focus) bshellFocusInProps(bshellSelection.focus);
}

/* ---------- Section editor ----------
   One panel per section: ALL of its texts (and, for the services
   section, every service card, each one a small group of fields), then
   its style controls, then layout/visibility. Which texts a section has
   is read from the section itself in the canvas (the data-textkey
   elements inside it), so every template — and fused blocks like
   freelancer's about+tags or bento's grid — gets exactly the fields it
   really shows; a hidden section falls back to its usual set.

   Style controls are per GROUP, never per item: one font/colour/size
   for the section's title, one for the hero's tagline, one for ALL
   service names and one for ALL service descriptions. Fonts only from
   SITE_FONTS, sizes from a short list that fits each group. The title
   and texts keep using d.textStyles[textkey] (the same per-text styles
   saved projects already have, so they render exactly as before); the
   service groups are d.textStyles["svc-name"] / ["svc-desc"]
   (siteGroupStyleCss in site-templates.js). */
const BSHELL_SECTION_DEFAULT_KEYS = {
  hero: ["businessName", "heading-heroTitle", "tagline"],
  services: ["heading-services"],
  about: ["heading-about", "aboutText"],
  aboutTags: ["aboutText"],
  contact: ["heading-contact"],
  grid: [],
  [BSHELL_SITE_TYPE]: ["businessName"],
};
const BSHELL_ITEM_WORD = {
  services: [bsL("שירות", "Service"), bsL("השירותים", "services")],
  products: [bsL("מוצר", "Product"), bsL("המוצרים", "products")],
  work: [bsL("עבודה", "Project"), bsL("העבודות", "projects")],
};
// Size choices (px) per kind of text — big enough to matter, never wild.
const BSHELL_STYLE_SIZES = {
  hero: [28, 32, 36, 42, 48, 56, 64, 72],
  heading: [20, 24, 28, 32, 36, 42, 48],
  name: [14, 16, 18, 20, 22, 24, 28, 32],
  body: [12, 13, 14, 15, 16, 17, 18, 20, 22],
};
const BSHELL_CONTACT_FIELDS = [
  { key: "phone", label: bsL("טלפון", "Phone"), dir: "ltr" },
  { key: "email", label: bsL("מייל", "Email"), dir: "ltr" },
  { key: "address", label: bsL("כתובת", "Address") },
  { key: "whatsapp", label: bsL("מספר וואטסאפ אחר (אם שונה מהטלפון)", "Other WhatsApp number (if different from phone)"), dir: "ltr" },
];

function bshellSectionLabel(type) {
  if (type === BSHELL_SITE_TYPE) return bsL("ראש ותחתית האתר", "Header & footer");
  const def = SITE_BLOCK_DEFS[siteState.template][type];
  return def ? bsLabel(def.label) || type : type;
}

function bshellSectionTextKeys(type, rootEl) {
  const keys = (BSHELL_SECTION_DEFAULT_KEYS[type] || []).slice();
  if (rootEl) {
    rootEl.querySelectorAll("[data-textkey]").forEach((el) => {
      const k = el.dataset.textkey;
      if (BSHELL_TEXT_CONTENT_MAP[k] && keys.indexOf(k) === -1) keys.push(k);
    });
  }
  // The about section's own title only exists on some templates.
  return keys.filter((k) => k !== "heading-about" || type !== "about" || !rootEl || rootEl.querySelector('[data-textkey="heading-about"]'));
}

function bshellPropsHtmlForSection(type) {
  const d = siteState.data;
  const sel = bshellSelection;
  const rootEl = sel && sel.rootEl;
  const def = SITE_BLOCK_DEFS[siteState.template][type];
  const keys = bshellSectionTextKeys(type, rootEl);
  const hasItems = !!(def && def.hasItems);
  const hasContact = bshellSectionHasContact(type, rootEl);
  const word = BSHELL_ITEM_WORD[TEMPLATE_SECTION_ROLE[siteState.template]] || BSHELL_ITEM_WORD.services;

  const textField = (key) => {
    const f = BSHELL_TEXT_CONTENT_MAP[key];
    const v = f.get(d);
    const input = f.multiline
      ? `<textarea data-text-key="${key}" maxlength="500" rows="5">${escapeHtmlS(v)}</textarea>`
      : `<input type="text" data-text-key="${key}" maxlength="90" value="${escapeHtmlS(v)}" placeholder="${f.placeholder ? escapeHtmlS(f.placeholder) : ""}">`;
    return `<div class="bshell-props-field" data-field-key="${key}"><label class="bshell-props-label">${escapeHtmlS(f.label)}</label>${input}</div>`;
  };
  const services = d.services || [];
  const itemsHtml = hasItems ? `
      <div class="bshell-props-label bshell-svc-list-label">${bsL(`רשימת ${word[1]}`, `Your ${word[1]}`)}</div>
      <div class="bshell-svc-list">${services.map((s, i) => `
        <div class="bshell-svc-item" data-svc-item="${i}">
          <div class="bshell-svc-item-head">
            <span class="bshell-svc-item-num">${i + 1}</span>
            <span class="bshell-svc-item-title">${escapeHtmlS((s.name || "").trim() || `${word[0]} ${i + 1}`)}</span>
            <button type="button" class="bshell-icon-btn" data-svc-action="duplicate" data-svc-idx="${i}" title="${bsL("שכפול", "Duplicate")}" aria-label="${bsL("שכפול", "Duplicate")}">⧉</button>
            ${services.length > 1 ? `<button type="button" class="bshell-icon-btn" data-svc-action="delete" data-svc-idx="${i}" title="${bsL("מחיקה", "Delete")}" aria-label="${bsL("מחיקה", "Delete")}">🗑</button>` : ""}
          </div>
          <label class="bshell-props-label">${bsL("שם", "Name")}</label>
          <input type="text" data-svc-idx="${i}" data-svc-field="name" maxlength="40" value="${escapeHtmlS(s.name || "")}">
          <label class="bshell-props-label">${bsL("תיאור קצר", "Short description")}</label>
          <textarea data-svc-idx="${i}" data-svc-field="desc" maxlength="90" rows="2">${escapeHtmlS(s.desc || "")}</textarea>
          <label class="bshell-props-label">${bsL("מחיר (לא חובה)", "Price (optional)")}</label>
          <input type="text" data-svc-idx="${i}" data-svc-field="price" maxlength="20" value="${escapeHtmlS(s.price || "")}">
        </div>`).join("")}
      </div>
      <button type="button" class="bshell-add-item" data-svc-action="add">${bsL(`+ הוספת ${word[0]}`, `+ Add ${word[0].toLowerCase()}`)}</button>` : "";
  const contactHtml = hasContact ? `
      <div class="bshell-props-label bshell-svc-list-label">${bsL("פרטי קשר", "Contact details")}</div>
      ${BSHELL_CONTACT_FIELDS.map((f) => `<div class="bshell-props-field" data-contact-field="${f.key}">
        <label class="bshell-props-label">${f.label}</label>
        <input type="text" data-contact-key="${f.key}"${f.dir ? ` dir="${f.dir}"` : ""} value="${escapeHtmlS(d[f.key] || "")}">
      </div>`).join("")}
      <p class="bshell-settings-field-hint">${bsL("אותם פרטים מופיעים בכל מקום באתר (כותרת, כפתורים, תחתית).", "The same details appear everywhere on the site (header, buttons, footer).")}</p>` : "";

  // Style groups: the title first, then the section's other texts, then
  // the items as two groups.
  const groups = keys.map((key) => {
    const label = key.indexOf("heading-") === 0 ? (key === "heading-heroTitle" ? bsL("כותרת ראשית", "Main heading") : bsL("כותרת החלק", "Section title")) : BSHELL_TEXT_CONTENT_MAP[key].label;
    const sizes = key === "heading-heroTitle" ? BSHELL_STYLE_SIZES.hero : key.indexOf("heading-") === 0 ? BSHELL_STYLE_SIZES.heading : key === "businessName" ? BSHELL_STYLE_SIZES.name : BSHELL_STYLE_SIZES.body;
    return { key, label, sizes, align: true };
  });
  if (hasItems) {
    const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
    const has = (k) => !doc || !rootEl || rootEl.querySelector(`:is(${SITE_GROUP_STYLE_SELECTORS[k]})`);
    if (has("svc-name")) groups.push({ key: "svc-name", label: bsL(`שמות ${word[1]}`, `Names of the ${word[1]}`), sizes: BSHELL_STYLE_SIZES.name, hint: true });
    if (has("svc-desc")) groups.push({ key: "svc-desc", label: bsL(`תיאורי ${word[1]}`, `Descriptions of the ${word[1]}`), sizes: BSHELL_STYLE_SIZES.body, hint: true });
  }

  const options = def && (typeof variantOptionsFor === "function") ? variantOptionsFor(siteState.template, type) : null;
  const current = (d.blockVariants && d.blockVariants[type]) || "default";
  // def.active() IS the ground truth for "visible inline right now,"
  // whichever flag it actually reads (d.pages[type] for a real
  // separate-page toggle, d.hiddenBlocks[type] for the Shell's own
  // additive one — see bshellToggleSectionVisibility for which).
  const reallyVisible = def && def.active ? !!def.active(d) : true;
  const displayHtml = def ? `
    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("תצוגה", "Display")}</div>
      ${options ? `
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("עיצוב (Layout)", "Layout")}</label>
        <select id="bshell-prop-variant">
          ${Object.entries(options).map(([key, o]) => `<option value="${key}"${key === current ? " selected" : ""}>${escapeHtmlS(bsLabel(o.label))}</option>`).join("")}
        </select>
      </div>` : ""}
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הצגת החלק הזה", "Show this section")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-prop-visible"${reallyVisible ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      ${type === "hero" ? bshellBsdHeroRow(d) : ""}
    </div>` : `
    <div class="bshell-settings-group">
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הסתרת שורת זכויות יוצרים בתחתית", "Hide the copyright line at the bottom")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-prop-hide-copyright"${d.hideCopyright ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>`;

  return `
    <span class="bshell-props-kind">${escapeHtmlS(bshellSectionLabel(type))}</span>
    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("תוכן", "Content")}</div>
      ${keys.map(textField).join("")}
      ${itemsHtml}
      ${contactHtml}
    </div>
    ${groups.length ? `
    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("עיצוב הטקסטים", "Text style")}</div>
      ${groups.map(bshellStyleGroupHtml).join("")}
      ${groups.some((g) => g.hint) ? `<p class="bshell-settings-field-hint bshell-style-hint">${bsL(`העיצוב חל על כל ${word[1]} יחד, כדי שהאתר יישאר אחיד.`, `The style applies to all ${word[1]} together, so the site stays consistent.`)}</p>` : ""}
    </div>` : ""}
    ${displayHtml}`;
}

/* One style group: font / colour / size (and alignment for a single
   text). The colour box shows the colour the text has right now in the
   canvas until a colour is actually picked — only a touched colour is
   saved. */
function bshellStyleGroupHtml(g) {
  const d = siteState.data;
  const s = (d.textStyles && d.textStyles[g.key]) || {};
  const fontKeys = Object.keys(SITE_FONTS);
  const sizes = g.sizes.slice();
  if (s.size && sizes.indexOf(Number(s.size)) === -1) sizes.push(Number(s.size)); // a size saved earlier stays selectable
  sizes.sort((a, b) => a - b);
  const shown = s.color ? "#" + String(s.color).replace("#", "") : bshellCurrentTextColor(g.key);
  const custom = !!(s.font || s.color || s.size || s.align);
  return `
    <div class="bshell-style-group" data-style-key="${g.key}">
      <div class="bshell-style-group-head">
        <span class="bshell-style-group-name">${escapeHtmlS(g.label)}</span>
        ${custom ? `<button type="button" class="bshell-style-reset" data-style-reset>${bsL("↺ ברירת מחדל", "↺ Default")}</button>` : ""}
      </div>
      <div class="bshell-style-row">
        <select data-style-prop="font" aria-label="${bsL("גופן", "Font")}">
          <option value="">${bsL("גופן התבנית", "Template font")}</option>
          ${fontKeys.map((k) => `<option value="${k}"${s.font === k ? " selected" : ""}>${escapeHtmlS(bsLabel(SITE_FONTS[k].name))}</option>`).join("")}
        </select>
        <input type="color" data-style-prop="color" value="${escapeHtmlS(shown)}" aria-label="${bsL("צבע", "Color")}"${s.color ? ' data-touched="1"' : ""}>
        <select data-style-prop="size" aria-label="${bsL("גודל", "Size")}">
          <option value="">${bsL("גודל רגיל", "Normal size")}</option>
          ${sizes.map((n) => `<option value="${n}"${String(s.size) === String(n) ? " selected" : ""}>${n}px</option>`).join("")}
        </select>
      </div>
      ${g.align ? `<div class="bshell-align-row">
        <button type="button" class="bshell-align-btn${s.align === "right" ? " active" : ""}" data-align="right">${bsL("ימין", "Right")}</button>
        <button type="button" class="bshell-align-btn${s.align === "center" ? " active" : ""}" data-align="center">${bsL("מרכז", "Center")}</button>
        <button type="button" class="bshell-align-btn${s.align === "left" ? " active" : ""}" data-align="left">${bsL("שמאל", "Left")}</button>
      </div>` : ""}
    </div>`;
}

function bshellCurrentTextColor(key) {
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  const el = doc && (SITE_GROUP_STYLE_SELECTORS[key] ? doc.querySelector(`:is(${SITE_GROUP_STYLE_SELECTORS[key]})`) : doc.querySelector(`[data-textkey="${key}"]`));
  const m = el ? String(doc.defaultView.getComputedStyle(el).color).match(/\d+/g) : null;
  return m ? "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("") : "#000000";
}

/* Scrolls the clicked thing's field into view in the panel, highlights
   it and puts the cursor in it (a service card: its name). On a phone
   the panel is a closed drawer, so only the highlight is set there. */
function bshellFocusInProps(focus) {
  const body = document.getElementById("bshell-props-body");
  let el = null;
  if (focus.svc != null) el = body.querySelector(`[data-svc-item="${focus.svc}"]`);
  else if (focus.key) el = body.querySelector(`[data-field-key="${focus.key}"]`);
  else if (focus.contact) el = body.querySelector(`[data-contact-field="${focus.contact}"]`);
  if (!el) return;
  el.classList.add("is-focused");
  const props = document.getElementById("bshell-props");
  const drawerClosed = window.matchMedia && window.matchMedia("(max-width: 860px)").matches && !props.classList.contains("bshell-drawer-open");
  el.scrollIntoView({ block: "center" });
  const input = el.querySelector("input, textarea");
  if (input && !drawerClosed) {
    input.focus({ preventScroll: true });
    try { input.setSelectionRange(input.value.length, input.value.length); } catch (err) { /* not a text field */ }
  }
}

/* בס"ד sits at the very top of the site, so the Hero panel is where
   people look for it — same d.showBsd as the switch in site settings. */
function bshellBsdHeroRow(d) {
  return `
    <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הצגת בס\"ד בראש האתר", "Show \"BS\"D\" (בס\"ד) at the top of the site")}</label>
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
    <span class="bshell-props-kind">${bsL("הגדרות האתר", "Site settings")}</span>

    <div class="bshell-settings-group">
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הצגת בס\"ד בראש האתר", "Show \"BS\"D\" (בס\"ד) at the top of the site")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-bsd"${d.showBsd ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      <p class="bshell-settings-field-hint">${bsL("כבוי כברירת מחדל. מופיע קטן בפינה הימנית העליונה של כל עמודי האתר.", "Off by default. Appears small in the top corner of every page of the site.")}</p>
    </div>
${(typeof DK_AUTOMATE_ENABLED !== "undefined" && DK_AUTOMATE_ENABLED === true) ? `
    <div class="bshell-settings-group">
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;" for="bshell-set-leadform">${bsL("טופס \"השאירו פרטים\"", "\"Leave your details\" form")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-leadform"${d.leadForm === true ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      <p class="bshell-settings-field-hint">${bsL("כבוי כברירת מחדל. מוסיף לאתר כפתור \"השאירו פרטים\". כל פנייה נכנסת ל-DeskKit Automate כליד חדש, ואם הפעלת את \"טיפול בליד חדש\" — הלקוח מקבל מענה אוטומטי ואת/ה התראה. אחרי ההפעלה צריך לפרסם את האתר מחדש.", "Off by default. Adds a \"Leave your details\" button to the site. Every inquiry goes into DeskKit Automate as a new lead, and if you turned on \"New lead handling\", the customer gets an automatic reply and you get a notification. After turning it on, republish the site.")}</p>
    </div>` : ""}

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("פרטי קשר", "Contact details")}</div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("טלפון", "Phone")}</label>
        <input type="text" id="bshell-set-phone" dir="ltr" value="${escapeHtmlS(d.phone || "")}">
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("המספר הזה הוא גם הוואטסאפ שלי", "This number is also my WhatsApp")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-has-whatsapp"${hasWhatsapp ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("מספר וואטסאפ אחר (אם שונה מהטלפון)", "Other WhatsApp number (if different from phone)")}</label>
        <input type="text" id="bshell-set-whatsapp" dir="ltr" value="${escapeHtmlS(d.whatsapp || "")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("מייל", "Email")}</label>
        <input type="text" id="bshell-set-email" dir="ltr" value="${escapeHtmlS(d.email || "")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("כתובת", "Address")}</label>
        <input type="text" id="bshell-set-address" value="${escapeHtmlS(d.address || "")}">
      </div>
    </div>

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("עיצוב ומותג", "Design & brand")}</div>
      ${bshellMoodPickerHtml(d)}
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("צבע ראשי", "Primary color")}</label>
        <input type="color" id="bshell-set-color" value="${escapeHtmlS(d.primaryColor || "#1F5C4E")}">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("גופן", "Font")}</label>
        <select id="bshell-set-font">
          ${fontKeys.map((k) => `<option value="${k}"${(d.fontFamily || "heebo") === k ? " selected" : ""}>${escapeHtmlS(bsLabel(SITE_FONTS[k].name))}</option>`).join("")}
        </select>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label" for="bshell-set-site-lang">${bsL("שפת האתר", "Site language")}</label>
        <select id="bshell-set-site-lang">
          <option value="he"${d.siteLang === "en" ? "" : " selected"}>${bsL("עברית", "Hebrew")}</option>
          <option value="en"${d.siteLang === "en" ? " selected" : ""}>English</option>
        </select>
        <p class="bshell-settings-field-hint">${bsL("השפה של האתר עצמו: כיוון הטקסט והכותרות והתוויות שמופיעות כברירת מחדל. הטקסטים שכתבתם לא משתנים.", "The language of the site itself: text direction and the default headings and labels. Text you wrote stays as it is.")}</p>
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הסתרת שורת זכויות יוצרים בתחתית", "Hide the copyright line at the bottom")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-hide-copyright"${d.hideCopyright ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="bshell-settings-group">
      <div class="bshell-settings-group-title">${bsL("תמונות ומדיה", "Images & media")}</div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("תמונה ראשית", "Main image")}</label>
        <div class="photo-row">
          <div class="photo-preview" id="bshell-set-photo-preview">${d.heroImage ? `<img src="${escapeHtmlS(d.heroImage)}" alt="${bsL("תמונת הכותרת", "Header image")}">` : `<span class="site-photo-placeholder">🖼️</span>`}</div>
          <div class="photo-actions">
            <label class="btn-mini photo-upload-btn" for="bshell-set-photo">${bsL("העלאת תמונה", "Upload image")}</label>
            <input type="file" id="bshell-set-photo" accept="image/*" style="display:none;">
            <button type="button" class="photo-remove" id="bshell-set-photo-remove">${bsL("הסרת תמונה", "Remove image")}</button>
          </div>
        </div>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label" for="bshell-set-hero-alt">${bsL("תיאור התמונה הראשית (לא חובה)", "Main image description (optional)")}</label>
        <input type="text" id="bshell-set-hero-alt" maxlength="125" value="${escapeHtmlS(d.heroAlt || "")}" placeholder="${bsL("לדוגמה: הצוות שלנו בסטודיו", "e.g. Our team at the studio")}">
        <p class="bshell-settings-field-hint">${bsL("נקרא בקול לגולשים עיוורים ועוזר לגוגל להבין את התמונה. ריק — ישמש שם העסק.", "Read aloud to blind visitors and helps Google understand the photo. Empty — your business name is used.")}</p>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL(`גלריית תמונות (עד ${SITE_GALLERY_MAX})`, `Image gallery (up to ${SITE_GALLERY_MAX})`)}</label>
        <p class="bshell-settings-field-hint">${bsL("אם יש תמונות בגלריה, הן מתחלפות אוטומטית במקום התמונה הראשית.", "If the gallery has images, they rotate automatically in place of the main image.")}</p>
        <div id="bshell-set-gallery-preview" class="site-gallery-preview">${bshellGalleryPreviewHtml(d)}</div>
        <label class="btn-mini photo-upload-btn" for="bshell-set-gallery">${bsL("הוספת תמונה לגלריה", "Add image to gallery")}</label>
        <input type="file" id="bshell-set-gallery" accept="image/*" multiple style="display:none;">
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${bsL("קישור לסרטון (יוטיוב)", "Video link (YouTube)")}</label>
        <input type="text" id="bshell-set-video" dir="ltr" placeholder="https://youtube.com/watch?v=..." value="${escapeHtmlS(d.videoUrl || "")}">
      </div>
      <div class="bshell-props-field">
        <div class="bshell-toggle-row">
          <label class="bshell-props-label" style="margin:0;">${bsL("הצגת הסרטון כרקע לכותרת הראשית", "Play the video behind the main heading")}</label>
          <label class="bshell-switch">
            <input type="checkbox" id="bshell-set-video-bg"${d.heroVideoBg ? " checked" : ""}>
            <span class="bshell-switch-track"></span>
            <span class="bshell-switch-thumb"></span>
          </label>
        </div>
      </div>
    </div>

    ${bshellSeoGroupHtml(d)}`;
}

/* ---------- Mood ("סגנון") — one of SITE_MOODS (site-templates.js) or
   none. A mood is a starting look, not a lock: it fills in the ordinary
   primary colour + font fields below (which the owner can still change),
   and siteMoodCss() adds its heading font / corners / spacing on top. */
function bshellMoodPickerHtml(d) {
  if (typeof SITE_MOODS !== "object") return "";
  const current = (d.mood && SITE_MOODS[d.mood]) ? d.mood : "";
  const btn = (key, label, mood) => {
    const swatch = mood
      ? `<span class="bshell-mood-swatch" style="background:${mood.primaryColor};"></span><span class="bshell-mood-swatch" style="background:${mood.accent};"></span>`
      : `<span class="bshell-mood-swatch bshell-mood-swatch-none"></span>`;
    const sample = mood ? ` style="border-radius:${mood.radius};"` : "";
    return `<button type="button" class="bshell-mood-btn${key === current ? " active" : ""}" role="radio" aria-checked="${key === current}" data-mood="${key}"${sample}>
        <span class="bshell-mood-swatches">${swatch}</span>
        <span class="bshell-mood-name">${escapeHtmlS(label)}</span>
      </button>`;
  };
  return `
      <div class="bshell-props-field">
        <label class="bshell-props-label" id="bshell-mood-label">${bsL("סגנון", "Mood")}</label>
        <div class="bshell-mood-grid" role="radiogroup" aria-labelledby="bshell-mood-label">
          ${btn("", bsL("ללא", "None"), null)}
          ${Object.keys(SITE_MOODS).map((k) => btn(k, bsL(SITE_MOODS[k].label, SITE_MOODS[k].labelEn), SITE_MOODS[k])).join("")}
        </div>
        ${d.moodPrev && typeof d.moodPrev === "object" ? `<button type="button" class="bshell-mood-restore" id="bshell-mood-restore">${bsL("↩ חזרה לעיצוב הקודם", "↩ Back to the previous design")}</button>` : ""}
        <p class="bshell-settings-field-hint bshell-mood-hint">${bsL("בוחר צבע, גופנים, פינות ומרווחים שמתאימים זה לזה. אפשר לשנות צבע וגופן גם אחרי הבחירה.", "Picks a colour, fonts, corners and spacing that go together. You can still change the colour and font afterwards.")}</p>
      </div>`;
}

/* Choosing a mood writes its colour + body font into d.primaryColor /
   d.fontFamily, and clears the colour/font of every per-text and group
   style (d.textStyles) — a heading the owner once coloured red by hand
   would otherwise keep that red under every mood, and the mood would
   seem to change nothing but the font. Sizes and alignment stay. The
   owner can still recolour anything afterwards.

   Two ways back, each kept in the project data:
   - d.moodBefore: the look before the FIRST mood, for "ללא" — which puts
     back only what still shows the mood's own choice (a colour/font the
     owner picked by hand after the mood stays), then deletes d.mood/
     d.moodBefore/d.moodPrev: exactly the "no mood" shape every older
     project already has.
   - d.moodPrev: the exact design settings from just before the LAST
     mood click (mood, colour, font, every text style), for the
     "↩ חזרה לעיצוב הקודם" button under the picker
     (bshellRestorePrevDesign). */
const BSHELL_DESIGN_KEYS = ["mood", "moodBefore", "primaryColor", "fontFamily", "textStyles"];

function bshellApplyMood(d, key) {
  const next = (key && SITE_MOODS[key]) ? SITE_MOODS[key] : null;
  const cur = (d.mood && SITE_MOODS[d.mood]) ? SITE_MOODS[d.mood] : null;
  if (next) {
    const prev = {};
    BSHELL_DESIGN_KEYS.forEach((k) => { if (d[k] !== undefined) prev[k] = JSON.parse(JSON.stringify(d[k])); });
    if (!cur) {
      const styles = {};
      Object.keys(d.textStyles || {}).forEach((k) => {
        const s = d.textStyles[k] || {};
        if (s.color || s.font) styles[k] = Object.assign({}, s.color ? { color: s.color } : {}, s.font ? { font: s.font } : {});
      });
      d.moodBefore = { primaryColor: d.primaryColor, fontFamily: d.fontFamily };
      if (Object.keys(styles).length) d.moodBefore.textStyles = styles;
    }
    d.mood = key;
    d.primaryColor = next.primaryColor;
    d.fontFamily = next.bodyFont;
    // Emptied entries stay as {} (renders nothing, keeps the key order).
    Object.keys(d.textStyles || {}).forEach((k) => {
      if (d.textStyles[k]) { delete d.textStyles[k].color; delete d.textStyles[k].font; }
    });
    d.moodPrev = prev;
    return;
  }
  const before = d.moodBefore;
  if (cur && before && typeof before === "object") {
    if (String(d.primaryColor || "").toLowerCase() === cur.primaryColor.toLowerCase()) {
      if (before.primaryColor === undefined) delete d.primaryColor; else d.primaryColor = before.primaryColor;
    }
    if (d.fontFamily === cur.bodyFont) {
      if (before.fontFamily === undefined) delete d.fontFamily; else d.fontFamily = before.fontFamily;
    }
    Object.keys(before.textStyles || {}).forEach((k) => {
      d.textStyles = d.textStyles || {};
      const s = d.textStyles[k] || (d.textStyles[k] = {});
      ["color", "font"].forEach((p) => { if (before.textStyles[k][p] && !s[p]) s[p] = before.textStyles[k][p]; });
    });
  }
  delete d.mood;
  delete d.moodBefore;
  delete d.moodPrev;
}

/* "↩ חזרה לעיצוב הקודם": exactly the design settings from before the
   last mood choice (which may itself have been another mood). Used once
   — the button disappears until the next mood choice. */
function bshellRestorePrevDesign(d) {
  const prev = d.moodPrev;
  if (!prev || typeof prev !== "object") return false;
  BSHELL_DESIGN_KEYS.forEach((k) => {
    if (prev[k] === undefined) delete d[k]; else d[k] = JSON.parse(JSON.stringify(prev[k]));
  });
  delete d.moodPrev;
  return true;
}

/* ---------- SEO / "איך האתר נראה בגוגל" ----------
   d.seo = { title, description, ogImage } — every field optional. Empty
   fields keep today's automatic <title>/<meta description> (business name
   + tagline); see siteSeoFields() in site-templates.js for exactly what
   the published page gets. The lengths below are guidance only — nothing
   here ever blocks typing or saving. */
const BSHELL_SEO_RANGES = { title: [50, 60], description: [150, 160] };
// Roughly where Google cuts a result off (characters, not pixels).
const BSHELL_SERP_CUT = { desktop: { title: 60, description: 160 }, mobile: { title: 78, description: 120 } };
let bshellSerpDevice = "desktop";

function bshellSeoGroupHtml(d) {
  const seo = (d.seo && typeof d.seo === "object") ? d.seo : {};
  return `
    <div class="bshell-settings-group" id="bshell-seo-group">
      <div class="bshell-settings-group-title">${bsL("SEO / איך האתר נראה בגוגל", "SEO / How your site looks on Google")}</div>
      <p class="bshell-settings-field-hint bshell-seo-intro">${bsL("לא חובה. מה שתשאירו ריק ימולא אוטומטית משם העסק ומשורת התיאור. השינויים יופיעו באתר החי אחרי הפרסום הבא.", "Optional. Anything left empty is filled in automatically from your business name and tagline. Changes reach the live site the next time you publish.")}</p>
      <div class="bshell-props-field">
        <label class="bshell-props-label" for="bshell-seo-title">${bsL("כותרת בגוגל", "Title on Google")}</label>
        <input type="text" id="bshell-seo-title" maxlength="200" value="${escapeHtmlS(seo.title || "")}" placeholder="${bsL("לדוגמה: סטודיו לעיצוב פנים בתל אביב | שם העסק", "e.g. Interior design studio in Tel Aviv | Business name")}">
        <div class="bshell-seo-count" id="bshell-seo-title-count" aria-live="polite"></div>
      </div>
      <div class="bshell-props-field">
        <label class="bshell-props-label" for="bshell-seo-desc">${bsL("תיאור בגוגל", "Description on Google")}</label>
        <textarea id="bshell-seo-desc" class="bshell-seo-desc" maxlength="500" rows="4" placeholder="${bsL("משפט או שניים: מה אתם עושים, לאיזה אזור, ולמה לבחור בכם.", "A sentence or two: what you do, where, and why choose you.")}">${escapeHtmlS(seo.description || "")}</textarea>
        <div class="bshell-seo-count" id="bshell-seo-desc-count" aria-live="polite"></div>
      </div>
      <div class="bshell-props-field">
        <div class="bshell-serp-head">
          <span class="bshell-props-label" style="margin:0;">${bsL("תצוגה מקדימה בגוגל", "Google preview")}</span>
          <div class="bshell-serp-toggle" role="group" aria-label="${bsL("גודל מסך", "Screen size")}">
            <button type="button" data-serp-device="desktop" class="${bshellSerpDevice === "desktop" ? "active" : ""}" aria-pressed="${bshellSerpDevice === "desktop"}">${bsL("מחשב", "Desktop")}</button>
            <button type="button" data-serp-device="mobile" class="${bshellSerpDevice === "mobile" ? "active" : ""}" aria-pressed="${bshellSerpDevice === "mobile"}">${bsL("נייד", "Mobile")}</button>
          </div>
        </div>
        <div class="bshell-serp-scroll"><div class="bshell-serp" id="bshell-serp"></div></div>
      </div>
      <div class="bshell-props-field">
        <span class="bshell-props-label">${bsL("תמונה לשיתוף (וואטסאפ, פייסבוק)", "Share image (WhatsApp, Facebook)")}</span>
        <div class="bshell-og-grid" id="bshell-og-grid" role="radiogroup">${bshellOgOptionsHtml(d)}</div>
      </div>
    </div>`;
}

function bshellOgOptionsHtml(d) {
  const gallery = (d.heroImages || []).filter(Boolean);
  // Picking the hero photo itself is the same as the default ("").
  const chosen = (d.seo && d.seo.ogImage && d.seo.ogImage !== d.heroImage && gallery.includes(d.seo.ogImage)) ? d.seo.ogImage : "";
  const heroSrc = d.heroImage || gallery[0] || "";
  const opt = (value, src, label) => `<button type="button" class="bshell-og-opt${value === chosen ? " active" : ""}" role="radio" aria-checked="${value === chosen}" data-og="${escapeHtmlS(value)}" title="${escapeHtmlS(label)}">
      ${src ? `<img src="${escapeHtmlS(src)}" alt="">` : `<span class="site-photo-placeholder">🖼️</span>`}<span>${escapeHtmlS(label)}</span></button>`;
  if (!heroSrc) return `<p class="bshell-settings-field-hint" style="margin:0;">${bsL("עדיין אין תמונות באתר. אחרי שתעלו תמונה ראשית (למעלה, ב\"תמונות ומדיה\") היא תשמש גם לשיתוף.", "No images on the site yet. Once you upload a main image (above, under \"Images & media\") it's used for sharing too.")}</p>`;
  return opt("", heroSrc, bsL("התמונה הראשית", "Main image"))
    + gallery.filter((src) => src !== d.heroImage).map((src, i) => opt(src, src, bsL(`גלריה ${i + 1}`, `Gallery ${i + 1}`))).join("");
}

/* Live counter under each SEO field: green inside the recommended range,
   orange outside it, grey while empty (the automatic text is used). */
function bshellSeoCount(el, value, kind) {
  if (!el) return;
  const [lo, hi] = BSHELL_SEO_RANGES[kind];
  const len = Array.from(value.trim()).length;
  let state, msg;
  if (!len) { state = "empty"; msg = kind === "title" ? bsL("ריק — תוצג הכותרת האוטומטית (שם העסק)", "Empty — the automatic title (business name) is used") : bsL("ריק — יוצג התיאור האוטומטי (שורת התיאור)", "Empty — the automatic description (tagline) is used"); }
  else if (len < lo) { state = "warn"; msg = bsL(`קצר מהמומלץ (${lo}–${hi} תווים)`, `Shorter than recommended (${lo}–${hi} characters)`); }
  else if (len > hi) { state = "warn"; msg = bsL(`ארוך מהמומלץ (${lo}–${hi}) — גוגל עלול לקצר`, `Longer than recommended (${lo}–${hi}) — Google may cut it`); }
  else { state = "good"; msg = bsL("אורך מצוין", "Great length"); }
  el.className = "bshell-seo-count is-" + state;
  el.dataset.state = state;
  el.innerHTML = `<b>${len}</b>/${hi} · ${escapeHtmlS(msg)}`;
}

function bshellSerpCut(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  let cut = chars.slice(0, max).join("");
  const space = cut.lastIndexOf(" ");
  if (space > max * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,.;:–—-]+$/, "") + "…";
}

/* Reads the title/description straight out of the home page this builder
   would publish right now (currentSiteHtml), so the preview can never
   disagree with the real tags. */
function bshellSerpSource() {
  const html = currentSiteHtml("index");
  const headEnd = html.indexOf("</head>");
  const doc = new DOMParser().parseFromString(html.slice(0, headEnd > 0 ? headEnd : html.length) + "</head><body></body>", "text/html");
  const meta = doc.querySelector('meta[name="description"]');
  return { title: (doc.title || "").trim(), description: meta ? (meta.getAttribute("content") || "").trim() : "" };
}

function bshellRenderSerp() {
  const box = document.getElementById("bshell-serp");
  if (!box) return;
  const d = siteState.data;
  const src = bshellSerpSource();
  const cut = BSHELL_SERP_CUT[bshellSerpDevice];
  const liveUrl = typeof currentSiteUrl === "function" ? currentSiteUrl() : "";
  const host = (liveUrl.match(/^https?:\/\/([^/]+)/i) || [])[1] || "your-site.deskkit.co.il";
  const name = (d.businessName || "").trim() || host;
  box.className = "bshell-serp is-" + bshellSerpDevice;
  box.setAttribute("dir", d.siteLang === "en" ? "ltr" : "rtl");
  box.innerHTML = `
    <div class="bshell-serp-site">
      <span class="bshell-serp-fav" aria-hidden="true">${escapeHtmlS(Array.from(name)[0] || "D")}</span>
      <span class="bshell-serp-site-text"><span class="bshell-serp-name">${escapeHtmlS(name)}</span><bdi dir="ltr" class="bshell-serp-url">https://${escapeHtmlS(host)}</bdi></span>
    </div>
    <div class="bshell-serp-title">${escapeHtmlS(bshellSerpCut(src.title, cut.title))}</div>
    <div class="bshell-serp-desc">${src.description ? escapeHtmlS(bshellSerpCut(src.description, cut.description)) : `<span class="bshell-serp-missing">${bsL("(אין תיאור — גוגל יבחר טקסט מהעמוד בעצמו)", "(No description — Google will pick text from the page itself)")}</span>`}</div>
    ${liveUrl ? "" : `<div class="bshell-serp-note">${bsL("הכתובת הסופית תיקבע בפרסום הראשון.", "The final address is set when you first publish.")}</div>`}`;
}

function bshellSetSeoField(d, key, value) {
  d.seo = (d.seo && typeof d.seo === "object") ? d.seo : {};
  if (value.trim()) d.seo[key] = value; else delete d.seo[key];
  if (!Object.keys(d.seo).length) delete d.seo; // nothing set -> today's automatic tags, no leftover shape
}

function bshellWireSeoPanel(d) {
  const titleEl = document.getElementById("bshell-seo-title");
  const descEl = document.getElementById("bshell-seo-desc");
  const titleCount = document.getElementById("bshell-seo-title-count");
  const descCount = document.getElementById("bshell-seo-desc-count");
  const bind = (el, key, countEl, kind) => {
    if (!el) return;
    bshellSeoCount(countEl, el.value, kind);
    el.addEventListener("focus", () => bshellBeginEdit(el));
    el.addEventListener("blur", () => bshellEndEdit(el));
    el.addEventListener("input", () => {
      bshellSetSeoField(d, key, el.value);
      bshellSeoCount(countEl, el.value, kind);
      bshellRenderSerp();
      bshellScheduleSave(); // head-only tags: nothing on the canvas changes
    });
  };
  bind(titleEl, "title", titleCount, "title");
  bind(descEl, "description", descCount, "description");

  document.querySelectorAll("[data-serp-device]").forEach((btn) => {
    btn.addEventListener("click", () => {
      bshellSerpDevice = btn.dataset.serpDevice;
      document.querySelectorAll("[data-serp-device]").forEach((b) => {
        b.classList.toggle("active", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      bshellRenderSerp();
    });
  });

  const ogGrid = document.getElementById("bshell-og-grid");
  if (ogGrid) {
    ogGrid.addEventListener("click", (e) => {
      const opt = e.target.closest(".bshell-og-opt");
      if (!opt) return;
      bshellSnapshot();
      bshellSetSeoField(d, "ogImage", opt.dataset.og || "");
      ogGrid.innerHTML = bshellOgOptionsHtml(d);
      bshellScheduleSave();
    });
  }
  bshellRenderSerp();
}
function bshellGalleryPreviewHtml(d) {
  const images = d.heroImages || [];
  return images.map((src, i) =>
    `<div class="site-gallery-thumb" data-idx="${i}"><img src="${escapeHtmlS(src)}" alt="${bsL(`תמונה ${i + 1} בגלריה`, `Gallery image ${i + 1}`)}"><button type="button" data-action="bshell-remove-gallery-photo" aria-label="${bsL("הסרה", "Remove")}">✕</button></div>`
  ).join("");
}

function bshellWirePropertiesPanel() {
  if (bshellSelection.kind === "section") return bshellWireSectionProps(bshellSelection.type);
  if (bshellSelection.kind === "settings") return bshellWireSettingsProps();
}

/* Lighter than a full re-select: keeps the current selection's type and
   focus, just re-points rootEl/focusEl at the matching elements in
   whatever document the canvas now shows (after a patch or a swap), and
   refreshes the outline/toolbar — without touching the Properties panel,
   so it never steals focus out of a field the user is typing in. A
   section that is now hidden simply has no element to outline. */
function bshellReanchorSelection() {
  const sel = bshellSelection;
  if (!sel || sel.kind !== "section") { bshellApplySelectionVisual(); return; }
  const doc = document.getElementById("bshell-canvas-iframe").contentDocument;
  if (!doc) return;
  if (sel.type === BSHELL_SITE_TYPE) {
    sel.rootEl = (sel.topIdx != null && doc.querySelector(`body > [data-bshell-top="${sel.topIdx}"]`)) || (sel.topIdx == null ? null : bshellFindSectionRoot(doc, sel.type));
  } else {
    sel.rootEl = bshellFindSectionRoot(doc, sel.type);
  }
  sel.focusEl = bshellFindFocusEl(doc, sel);
  bshellApplySelectionVisual();
}

/* Writes one style group (d.textStyles[key]) — an empty group is
   removed, so "back to default" leaves no trace in the saved data. */
function bshellSetTextStyle(key, prop, value) {
  const d = siteState.data;
  d.textStyles = d.textStyles || {};
  const next = Object.assign({}, d.textStyles[key]);
  if (value) next[prop] = value; else delete next[prop];
  if (next.font || next.color || next.size || next.align) d.textStyles[key] = next;
  else delete d.textStyles[key];
}

/* Everything in the section editor is wired by delegation on the panel
   body — fields are re-rendered often (a service added, a group reset),
   and every edit ends the same way: change siteState.data, patch the
   canvas in place (bshellRenderCanvas), autosave. */
function bshellWireSectionProps(type) {
  const d = siteState.data;
  const body = document.getElementById("bshell-props-body");
  const isField = (el) => el.matches && el.matches("[data-text-key], [data-svc-field], [data-contact-key], input[type=color][data-style-prop]");
  body.addEventListener("focusin", (e) => { if (isField(e.target)) bshellBeginEdit(e.target); });
  body.addEventListener("focusout", (e) => { if (isField(e.target)) bshellEndEdit(e.target); });
  body.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.textKey) {
      BSHELL_TEXT_CONTENT_MAP[el.dataset.textKey].set(d, el.value);
      if (el.dataset.textKey === "businessName") {
        const t = SITE_TEMPLATES[siteState.template];
        document.getElementById("bshell-top-name").textContent = el.value.trim() || (t ? bsLabel(t.label) : bsL("הפרויקט שלי", "My project"));
      }
    } else if (el.dataset.svcField) {
      const i = parseInt(el.dataset.svcIdx, 10);
      if (!d.services || !d.services[i]) return;
      d.services[i][el.dataset.svcField] = el.value;
      if (el.dataset.svcField === "name") {
        const title = el.closest(".bshell-svc-item").querySelector(".bshell-svc-item-title");
        if (title) title.textContent = el.value.trim() || title.textContent;
        bshellRenderHierarchy();
      }
    } else if (el.dataset.contactKey) {
      d[el.dataset.contactKey] = el.value;
    } else if (el.dataset.styleProp === "color") {
      el.dataset.touched = "1";
      bshellSetTextStyle(el.closest("[data-style-key]").dataset.styleKey, "color", el.value.replace("#", ""));
    } else {
      return;
    }
    bshellRenderCanvas();
    bshellScheduleSave();
  });
  body.addEventListener("change", (e) => {
    const el = e.target;
    if (el.tagName !== "SELECT" || !el.dataset.styleProp) return;
    bshellSnapshot();
    bshellSetTextStyle(el.closest("[data-style-key]").dataset.styleKey, el.dataset.styleProp, el.value);
    bshellRenderCanvas();
    bshellRefreshStyleGroup(el.closest("[data-style-key]"));
    bshellScheduleSave();
  });
  body.addEventListener("click", (e) => {
    const svcBtn = e.target.closest("[data-svc-action]");
    if (svcBtn) {
      const i = parseInt(svcBtn.dataset.svcIdx, 10);
      if (svcBtn.dataset.svcAction === "add") bshellAddService();
      else if (svcBtn.dataset.svcAction === "duplicate") bshellDuplicateService(i);
      else if (svcBtn.dataset.svcAction === "delete") bshellDeleteService(i);
      return;
    }
    const group = e.target.closest("[data-style-key]");
    if (!group) return;
    const key = group.dataset.styleKey;
    const alignBtn = e.target.closest(".bshell-align-btn");
    if (alignBtn) {
      bshellSnapshot();
      const s = (d.textStyles && d.textStyles[key]) || {};
      bshellSetTextStyle(key, "align", s.align === alignBtn.dataset.align ? "" : alignBtn.dataset.align);
    } else if (e.target.closest("[data-style-reset]")) {
      bshellSnapshot();
      delete (d.textStyles || {})[key];
    } else {
      return;
    }
    bshellRenderCanvas();
    bshellRefreshStyleGroup(group);
    bshellScheduleSave();
  });
  bshellWireSectionDisplayProps(type);
}

/* Re-renders one style group in place (its reset link / active buttons)
   without rebuilding the whole panel. */
function bshellRefreshStyleGroup(groupEl) {
  if (!groupEl) return;
  const key = groupEl.dataset.styleKey;
  const label = groupEl.querySelector(".bshell-style-group-name").textContent;
  const sizes = Array.from(groupEl.querySelectorAll('[data-style-prop="size"] option')).map((o) => Number(o.value)).filter(Boolean);
  const tmp = document.createElement("div");
  tmp.innerHTML = bshellStyleGroupHtml({ key, label, sizes, align: !!groupEl.querySelector(".bshell-align-row") });
  groupEl.replaceWith(tmp.firstElementChild);
}

function bshellWireSectionDisplayProps(type) {
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
  const hideCopyrightEl = document.getElementById("bshell-prop-hide-copyright");
  if (hideCopyrightEl) {
    hideCopyrightEl.addEventListener("change", () => {
      bshellSnapshot();
      siteState.data.hideCopyright = hideCopyrightEl.checked;
      bshellRenderCanvas(() => bshellSelectSection(type));
      bshellScheduleSave();
    });
  }
}

/* ---------- Settings (site-wide, no canvas anchor) ----------
   Every field here ends in bshellRenderCanvas(), which patches the
   canvas in place (see the comment above bshellCanvasHtml) — a phone
   number typed here updates the header, the hero and the contact
   section without reloading the page. */
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

  document.querySelectorAll(".bshell-mood-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.mood || "";
      if ((d.mood || "") === key) return;
      bshellSnapshot();
      bshellApplyMood(d, key);
      bshellRenderProperties(); // the colour/font fields show the mood's values
      bshellApplyGlobalStylesLive();
      bshellScheduleSave();
    });
  });
  const moodRestoreEl = document.getElementById("bshell-mood-restore");
  if (moodRestoreEl) {
    moodRestoreEl.addEventListener("click", () => {
      bshellSnapshot();
      if (!bshellRestorePrevDesign(d)) return;
      bshellRenderProperties();
      bshellApplyGlobalStylesLive();
      bshellScheduleSave();
    });
  }

  // Alt text only — nothing visible on the canvas changes.
  const heroAltEl = document.getElementById("bshell-set-hero-alt");
  if (heroAltEl) {
    heroAltEl.addEventListener("focus", () => bshellBeginEdit(heroAltEl));
    heroAltEl.addEventListener("blur", () => bshellEndEdit(heroAltEl));
    heroAltEl.addEventListener("input", () => {
      if (heroAltEl.value.trim()) d.heroAlt = heroAltEl.value; else delete d.heroAlt;
      bshellScheduleSave();
    });
  }

  bshellWireSeoPanel(d);

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

  // Site language (d.siteLang — see site-templates.js): "en" for an
  // English site, no key at all for Hebrew (the default), so an existing
  // Hebrew site's saved data never changes just by opening settings.
  const siteLangEl = document.getElementById("bshell-set-site-lang");
  if (siteLangEl) {
    siteLangEl.addEventListener("change", () => {
      bshellSnapshot();
      if (siteLangEl.value === "en") d.siteLang = "en"; else delete d.siteLang;
      bshellRenderCanvas();
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

  const leadFormEl = document.getElementById("bshell-set-leadform");
  if (leadFormEl) {
    leadFormEl.addEventListener("change", () => {
      bshellSnapshot();
      if (leadFormEl.checked) d.leadForm = true; else delete d.leadForm;
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
      if (file.size > SITE_IMAGE_MAX_INPUT) {
        alert(bsL("התמונה גדולה מדי — בחרו קובץ עד 25MB.", "The image is too large — choose a file up to 25MB."));
        e.target.value = "";
        return;
      }
      bshellSnapshot();
      const url = await uploadSiteImage(file, "hero");
      if (!url) {
        alert(siteUploadErrorText());
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
        alert(bsL(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — הסירו אחת כדי להוסיף חדשה.`, `The gallery holds up to ${SITE_GALLERY_MAX} images — remove one to add a new one.`));
        bshellUndoStack.pop();
        bshellSyncUndoButtons();
        e.target.value = "";
        return;
      }
      const toAdd = files.slice(0, roomLeft);
      if (files.length > toAdd.length) {
        alert(bsL(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — נוספו רק ${toAdd.length} מתוך ${files.length} שבחרתם.`, `The gallery holds up to ${SITE_GALLERY_MAX} images — only ${toAdd.length} of the ${files.length} you chose were added.`));
      }
      let remaining = toAdd.length;
      toAdd.forEach(async (file) => {
        if (file.size > SITE_IMAGE_MAX_INPUT) {
          alert(bsL(`"${file.name}" גדולה מדי — בחרו קובץ עד 25MB.`, `"${file.name}" is too large — choose a file up to 25MB.`));
          remaining -= 1;
          if (remaining === 0) { bshellRenderProperties(); bshellRenderCanvas(); bshellScheduleSave(); }
          return;
        }
        // Each gallery photo gets its own unique name (unlike the single,
        // stable "hero" slot) — same convention site-builder.js's own
        // gallery upload already uses.
        const name = "gallery-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
        const url = await uploadSiteImage(file, name);
        if (!url) alert(siteUploadErrorText(file.name));
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

/* Colour/font/mood changes. This used to swap only the page's first
   <style> tag — which missed every colour that isn't in it: the
   "centered" hero / "grid" services layouts (site-blocks.js) paint the
   primary colour in inline style attributes, and per-text colours sit
   on the text itself, so on those projects a new colour or mood seemed
   to change only the font. bshellRenderCanvas()'s in-place patch covers
   the <style>, the font <link>s and every inline style alike, still
   without reloading the iframe (so dragging the colour wheel stays
   smooth). */
function bshellApplyGlobalStylesLive() {
  bshellRenderCanvas();
}
