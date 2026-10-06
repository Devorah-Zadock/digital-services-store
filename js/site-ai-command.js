/* Site-level AI commands + Undo/History (architecture plan, Phase 7).
   A free-text instruction ("הזז את השירותים לפני האודות") is sent, with
   the CURRENT real structural context of this exact project (which
   section types exist, which are active, which variants are real), to
   the site-ai-command Edge Function — which returns ONE validated
   operation, never HTML, never a DOM mutation. This file's only job is
   to apply that one operation using the exact same functions the
   hierarchy panel's own buttons already call (ensureBlockOrder,
   d.blockVariants), so an AI-driven change and a manual click produce
   identical, equally-trusted results — there is no separate "AI
   mutation path".

   Only ever shown for a migrated template (isTemplateMigrated) — there
   is no Section/block system to operate on otherwise, and pretending
   otherwise would mean inventing a second, parallel editing mechanism
   for the other 14 templates, which the architecture plan explicitly
   rules out.

   Undo: a small, in-memory stack of full siteState.data snapshots
   (capped — this is NOT a version-control system, just "AI change ->
   preview -> apply -> undo" for the one most recent AI-driven change).
   Manual edits made after an AI change still push their own snapshot on
   the next AI command, but are not individually undoable by this
   mechanism — exactly the fast, reliable, un-fancy model the plan asks
   for, not a general-purpose history. */

const SITE_AI_COMMAND_UNDO_MAX = 10;
let siteAiCommandUndoStack = [];
let siteAiCommandPending = null;

function siteAiCommandNote(html) {
  const note = document.getElementById("site-ai-command-note");
  if (note) note.innerHTML = html;
}

function siteAiCommandContext() {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  const defs = SITE_BLOCK_DEFS[template] || {};
  const availableTypes = Object.keys(defs);
  const activeTypes = activeBlocksForPage(d, template, "index");
  const variantOptions = {};
  availableTypes.forEach((type) => {
    const opts = typeof variantOptionsFor === "function" ? variantOptionsFor(template, type) : null;
    if (opts) variantOptions[type] = Object.keys(opts);
  });
  return { availableTypes, activeTypes, variantOptions };
}

function siteAiCommandPushUndo() {
  siteAiCommandUndoStack.push(JSON.stringify(siteState.data));
  if (siteAiCommandUndoStack.length > SITE_AI_COMMAND_UNDO_MAX) siteAiCommandUndoStack.shift();
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (undoBtn) undoBtn.style.display = "";
}

function siteAiCommandUndo() {
  const snapshot = siteAiCommandUndoStack.pop();
  if (!snapshot) return;
  siteState.data = JSON.parse(snapshot);
  renderSitePreview();
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (undoBtn && !siteAiCommandUndoStack.length) undoBtn.style.display = "none";
  siteAiCommandNote("השינוי בוטל.");
}

/* Pure mutation, no rendering/undo-bookkeeping of its own — shared by
   BOTH the old sidebar builder (below) and the new Builder-Shell
   (js/builder-shell.js's bshellApplyAiOp), so an AI-driven change
   produces the exact same data mutation regardless of which editing
   surface issued it, using the same functions the hierarchy panel's
   own ▲▼✕ buttons and variant picker already call — never a bespoke
   mutation path. Returns false (nothing applied) for an op the server
   validated as real but this function doesn't recognize. */
function applySiteAiOp(d, template, result) {
  if (result.op === "reorder") {
    const order = ensureBlockOrder(d, template, "index");
    const inactiveTail = order.filter((t) => result.order.indexOf(t) === -1);
    d.blockOrder.index = result.order.concat(inactiveTail);
  } else if (result.op === "addSection") {
    ensureBlockOrder(d, template, "index").push(result.type);
  } else if (result.op === "removeSection") {
    const order = ensureBlockOrder(d, template, "index");
    const idx = order.indexOf(result.type);
    if (idx !== -1) order.splice(idx, 1);
  } else if (result.op === "setVariant") {
    if (!d.blockVariants || typeof d.blockVariants !== "object") d.blockVariants = {};
    d.blockVariants[result.type] = result.variant;
  } else {
    return false;
  }
  return true;
}

function siteAiCommandApply(result) {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  siteAiCommandPushUndo();
  if (!applySiteAiOp(d, template, result)) {
    siteAiCommandUndoStack.pop(); // nothing was actually applied
    return;
  }
  renderSitePreview();
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
  siteAiCommandNote(`בוצע: ${escapeHtmlS(result.explanation || "")}`);
}

async function siteAiCommandSubmit() {
  const input = document.getElementById("site-ai-command-input");
  const btn = document.getElementById("site-ai-command-btn");
  const command = (input.value || "").trim();
  if (!command) return;

  siteAiCommandPending = null;
  siteAiCommandNote("ה-AI מעבד את הפקודה…");
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
      siteAiCommandNote(data.isPro
        ? "הגעת למכסת השימוש ההוגן היומית לפקודות AI. אפשר להמשיך מחר."
        : "הגעת למכסת הניסיונות החינמיים לפקודות AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!");
      return;
    }

    const result = data.result;
    if (!result || result.op === "unsupported") {
      siteAiCommandNote(escapeHtmlS((result && result.explanation) || "לא הצלחתי לבצע את הפעולה הזו."));
      return;
    }

    // Change-summary-before-apply: a short confirm step, not a silent
    // mutation — the explanation text IS the change summary here, kept
    // deliberately lightweight rather than a full visual diff.
    siteAiCommandPending = result;
    siteAiCommandNote(`
      <div>${escapeHtmlS(result.explanation || "לבצע את השינוי?")}</div>
      <button type="button" class="btn-mini" id="site-ai-command-confirm">אישור</button>
      <button type="button" class="btn-mini" id="site-ai-command-cancel">ביטול</button>
    `);
    document.getElementById("site-ai-command-confirm").addEventListener("click", () => {
      if (siteAiCommandPending) siteAiCommandApply(siteAiCommandPending);
      siteAiCommandPending = null;
      input.value = "";
    });
    document.getElementById("site-ai-command-cancel").addEventListener("click", () => {
      siteAiCommandPending = null;
      siteAiCommandNote("בוטל.");
    });
  } catch (err) {
    console.error("site AI command failed:", err);
    siteAiCommandNote("משהו השתבש. אפשר לנסות שוב בעוד רגע.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("site-ai-command-btn");
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (btn) btn.addEventListener("click", siteAiCommandSubmit);
  if (undoBtn) undoBtn.addEventListener("click", siteAiCommandUndo);
});
