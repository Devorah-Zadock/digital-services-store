/* ===========================================================
   Invoice Builder-Shell — the same central editing pattern proved on
   CV/Quote, applied to the invoice/receipt/credit-note builder.
   Reachable via invoice-app.html?shell=1. Operates on the SAME
   invoiceEventState/currentInvoiceProfile objects and the SAME
   renderInvoiceHtml()/saveInvoiceDraft()/finalizeInvoice()/
   creditNoteDraftFrom()/renderInvoiceFormIA()/renderInvoicePreviewIA()
   functions js/invoice-app.js, js/invoice-render.js and
   js/invoice-cloud-save.js already define — this file adds a new way
   to look at and edit that data, not a second data model, a second
   save path, or (critically) a second finalize/lock path. The
   document's own design (INVOICE_CSS in invoice-render.js) NEVER
   changes to fit this file, and unlike CV/Quote there is no style
   switcher at all: a legal/accounting document earns nothing from
   decorative variety (see invoice-app.js's own header comment) — one
   fixed layout, chosen only by docType/businessType, never by the
   user. Only additive data-ikey/data-i-item-idx hooks were added to
   invoice-render.js so a canvas click resolves to something — zero
   visual difference.

   Schema: date/recipientName/recipientId/recipientAddress/
   paymentMethod/notes as plain selectable text elements; items as
   the one container Section with real repeatable items (never
   optional — always at least one, mirrors the original "can't remove
   the last item" guard).

   LOCK — the single most important property of this file: once
   isInvoiceLocked() (invoiceEventState.status === "issued"), nothing
   in this Shell may mutate invoiceEventState, through ANY path:
     - Properties panel inputs render `disabled` and never get an
       input/focus listener attached at all (not just a disabled
       attribute that something could theoretically strip) — this
       mirrors js/invoice-app.js's own renderInvoiceFormIA(), which
       disables the old sidebar's inputs the exact same way.
     - The mini-toolbar's duplicate/delete and the hierarchy's
       "+ add item" are all gated off.
     - Undo/Redo are force-disabled regardless of stack contents, and
       invoiceBshellUndo/Redo early-return as a second, independent
       guard even if a button were somehow still clickable.
     - Finalize/credit-note are never reimplemented here — this file
       only proxy-clicks the EXISTING #invoice-finalize-btn/
       #invoice-credit-btn (their validation, the irreversibility
       confirm() dialog, and the atomic server-side numbering RPC all
       stay exactly as they are, in the one place they're already
       correct).
     - A reload re-derives lock state from invoiceEventState.status as
       loaded fresh from the server (loadInvoiceById) — there is no
       separate, client-only "locked" flag this file could get out of
       sync with, and the server's own RLS policy on invoice_saves
       refuses any UPDATE to an issued row regardless of what the
       client sends, as a second, independent backstop.
   The shared business profile (#ia-profile-form) is moved into
   Settings wholesale, exactly like Quote's — explicitly NOT part of
   this per-document Undo/Redo, since it's a separate, shared-across-
   documents entity, and editing it never touches a locked document
   (renderInvoiceHtml always prefers inv.snapshot, frozen at finalize
   time, over the live profile — see invoice-render.js's
   invoiceLetterhead()).
   =========================================================== */

let invoiceBshellActiveFlag = false;
let invoiceBshellSelection = null; // { kind: "text"|"item"|"section"|"settings", key?|idx?|type?, rootEl? }
let invoiceBshellUndoStack = [];
let invoiceBshellRedoStack = [];
const INVOICEBSHELL_UNDO_CAP = 30;
let invoiceBshellCanvasClickWired = false;

/* Same dirty-tracking + beforeunload warning as js/quote-builder-
   shell.js's quoteBshellDirty (see its own comment) — this file is
   explicit-save-only too, and a locked/issued document can't be
   edited at all (invoiceBshellSnapshot already no-ops then via
   invoiceBshellLocked()), so there's never a false "unsaved work"
   warning on an already-finalized document. */
let invoiceBshellDirty = false;
window.dkInvoiceHasUnsavedWork = () => invoiceBshellActiveFlag && invoiceBshellDirty;
window.addEventListener("beforeunload", (e) => {
  if (!invoiceBshellActiveFlag || !invoiceBshellDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

const INVOICEBSHELL_TEXT_LABELS = {
  date: "תאריך", recipientName: "לכבוד (שם הלקוח)", recipientId: "ת.ז / ח.פ הלקוח (אופציונלי)",
  recipientAddress: "כתובת הלקוח (אופציונלי)", paymentMethod: "אופן תשלום", notes: "הערה נוספת (אופציונלי)",
};
// recipientId/recipientAddress/notes/paymentMethod only render an
// element at all when truthy (see renderInvoiceHtml) — toggling
// between empty and non-empty changes the DOM's very presence, so a
// direct textContent patch can't work for them; a full re-render is
// the simplest correct patch, same reasoning as CV's "contact" case.
const INVOICEBSHELL_FULL_RERENDER_KEYS = ["recipientId", "recipientAddress", "notes", "paymentMethod"];

function invoiceBshellLocked() {
  return typeof isInvoiceLocked === "function" && isInvoiceLocked();
}

/* ---------- Entry ---------- */

function invoiceBshellActivate() {
  invoiceBshellActiveFlag = true;
  ["ia-profile", "ia-app"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  invoiceBshellMoveProfileForm();
  invoiceBshellWireProfileLiveUpdate();
  invoiceBshellWireLogoLiveUpdate();
  invoiceBshellWireFinalizeWatcher();
  invoiceBshellWireAiDraft();
  invoiceBshellWireBsdToggle();
  document.getElementById("ibshell-root").classList.add("active");
  invoiceBshellWireTopBar();
  invoiceBshellSyncLockUI();
  invoiceBshellRenderHierarchy();
  invoiceBshellRenderCanvas();
  invoiceBshellSyncUndoButtons();
}

/* בס"ד on/off — showBsd is opt-in (unset = hidden), so no existing
   invoice changes. Part of the document itself, so it goes through
   Snapshot (undo) and honors the issued-document lock like every other
   per-document field. */
function invoiceBshellWireBsdToggle() {
  const bsd = document.getElementById("ibshell-set-bsd");
  if (!bsd || bsd.dataset.wired) return;
  bsd.dataset.wired = "1";
  bsd.addEventListener("change", () => {
    if (invoiceBshellLocked()) { bsd.checked = !!invoiceEventState.showBsd; return; }
    invoiceBshellSnapshot();
    invoiceEventState.showBsd = bsd.checked;
    if (typeof renderInvoicePreviewIA === "function") renderInvoicePreviewIA();
    invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
  });
}
function invoiceBshellSyncBsdToggle() {
  const bsd = document.getElementById("ibshell-set-bsd");
  if (!bsd) return;
  bsd.checked = !!invoiceEventState.showBsd;
  bsd.disabled = invoiceBshellLocked();
}

/* Reparents the EXISTING #ia-profile-form wholesale (not recreating
   its fields) into the Shell's Settings panel — its submit handler
   (including the licensed/exempt radio's own VAT-field-visibility
   listener) and logo-upload-to-Storage logic keep working completely
   unchanged. */
function invoiceBshellMoveProfileForm() {
  const group = document.getElementById("ibshell-settings-group-profile");
  if (!group || group.dataset.moved) return;
  group.dataset.moved = "1";
  const form = document.getElementById("ia-profile-form");
  if (form) group.appendChild(form);
}

function invoiceBshellWireProfileLiveUpdate() {
  const map = {
    "ipf-businessName": "business_name", "ipf-tagline1": "tagline1", "ipf-email": "email",
    "ipf-idNumber": "id_number", "ipf-phone": "phone", "ipf-vatRate": "vat_rate",
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.liveWired) return;
    el.dataset.liveWired = "1";
    el.addEventListener("focus", () => invoiceBshellBeginEdit(el));
    el.addEventListener("blur", () => invoiceBshellEndEdit(el));
    el.addEventListener("input", () => {
      if (!currentInvoiceProfile) currentInvoiceProfile = {};
      currentInvoiceProfile[key] = el.value;
      renderInvoicePreviewIA();
      invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
    });
  });
  document.querySelectorAll('input[name="ipf-businessType"]').forEach((r) => {
    if (r.dataset.liveWired) return;
    r.dataset.liveWired = "1";
    r.addEventListener("change", () => {
      if (!currentInvoiceProfile) currentInvoiceProfile = {};
      currentInvoiceProfile.business_type = r.value;
      renderInvoicePreviewIA();
      invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
    });
  });
}

function invoiceBshellWireLogoLiveUpdate() {
  const preview = document.getElementById("ipf-logo-preview");
  if (!preview || preview.dataset.liveWired) return;
  preview.dataset.liveWired = "1";
  new MutationObserver(() => {
    if (!currentInvoiceProfile) currentInvoiceProfile = {};
    currentInvoiceProfile.logo_url = pendingInvoiceLogoUrl;
    invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
  }).observe(preview, { childList: true });
}

/* ---------- Undo / Redo — scoped to invoiceEventState only (never
   the shared profile), and force-disabled once locked — see the file
   header for why this is the single most load-bearing part of the
   file. */

function invoiceBshellSnapshot() {
  if (invoiceBshellLocked()) return;
  invoiceBshellUndoStack.push(JSON.stringify(invoiceEventState));
  if (invoiceBshellUndoStack.length > INVOICEBSHELL_UNDO_CAP) invoiceBshellUndoStack.shift();
  invoiceBshellRedoStack = [];
  invoiceBshellSyncUndoButtons();
  invoiceBshellDirty = true;
}
function invoiceBshellSyncUndoButtons() {
  const undoBtn = document.getElementById("ibshell-undo-btn");
  const redoBtn = document.getElementById("ibshell-redo-btn");
  const locked = invoiceBshellLocked();
  if (undoBtn) undoBtn.disabled = locked || invoiceBshellUndoStack.length === 0;
  if (redoBtn) redoBtn.disabled = locked || invoiceBshellRedoStack.length === 0;
}
function invoiceBshellApplySnapshot(raw) {
  invoiceEventState = JSON.parse(raw);
  renderInvoiceFormIA();
  renderInvoicePreviewIA();
  invoiceBshellSelection = null;
  invoiceBshellSyncUndoButtons();
  invoiceBshellRenderCanvas();
  invoiceBshellRenderHierarchy();
  invoiceBshellRenderProperties();
}
function invoiceBshellUndo() {
  if (invoiceBshellLocked() || !invoiceBshellUndoStack.length) return;
  invoiceBshellRedoStack.push(JSON.stringify(invoiceEventState));
  invoiceBshellApplySnapshot(invoiceBshellUndoStack.pop());
}
function invoiceBshellRedo() {
  if (invoiceBshellLocked() || !invoiceBshellRedoStack.length) return;
  invoiceBshellUndoStack.push(JSON.stringify(invoiceEventState));
  invoiceBshellApplySnapshot(invoiceBshellRedoStack.pop());
}
function invoiceBshellBeginEdit(inputEl) {
  if (invoiceBshellLocked()) return;
  if (inputEl.dataset.ibshellEditing === "1") return;
  inputEl.dataset.ibshellEditing = "1";
  invoiceBshellSnapshot();
}
function invoiceBshellEndEdit(inputEl) {
  delete inputEl.dataset.ibshellEditing;
}

/* ---------- Top bar ---------- */

function invoiceBshellWireTopBar() {
  const root = document.getElementById("ibshell-root");
  if (root.dataset.topWired) return;
  root.dataset.topWired = "1";

  document.getElementById("ibshell-undo-btn").addEventListener("click", invoiceBshellUndo);
  document.getElementById("ibshell-redo-btn").addEventListener("click", invoiceBshellRedo);
  document.addEventListener("keydown", (e) => {
    if (!invoiceBshellActiveFlag || invoiceBshellLocked()) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod || e.key.toLowerCase() !== "z") return;
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;
    e.preventDefault();
    if (e.shiftKey) invoiceBshellRedo(); else invoiceBshellUndo();
  });

  document.getElementById("ibshell-settings-btn").addEventListener("click", invoiceBshellSelectSettings);

  document.getElementById("ibshell-download-btn").addEventListener("click", () => {
    document.getElementById("invoice-download-btn").click();
  });

  document.getElementById("ibshell-save-btn").addEventListener("click", async () => {
    const btn = document.getElementById("ibshell-save-btn");
    btn.disabled = true;
    await invoiceBshellSaveNow();
    btn.disabled = false;
  });

  // Never reimplemented: proxy-clicks the EXISTING button, whose own
  // handler owns the hasItems/recipientName validation, the
  // irreversibility confirm() dialog, and the atomic server-side
  // numbering RPC. invoiceBshellWireFinalizeWatcher() (below) is what
  // notices when that async handler actually finishes and refreshes
  // this Shell's own UI.
  document.getElementById("ibshell-finalize-btn").addEventListener("click", () => {
    document.getElementById("invoice-finalize-btn").click();
  });

  // Synchronous (creditNoteDraftFrom + showInvoiceBuilder have no
  // await between them), so refreshing right after .click() returns
  // is reliable — no watcher needed, unlike finalize.
  document.getElementById("ibshell-credit-btn").addEventListener("click", () => {
    document.getElementById("invoice-credit-btn").click();
    invoiceBshellSelection = null;
    invoiceBshellSyncUndoButtons();
    invoiceBshellRenderCanvas();
    invoiceBshellRenderHierarchy();
    invoiceBshellRenderProperties();
    invoiceBshellSyncLockUI();
  });

  document.getElementById("ibshell-mobile-hier-btn").addEventListener("click", () => {
    document.getElementById("ibshell-props").classList.remove("bshell-drawer-open");
    document.getElementById("ibshell-hier").classList.toggle("bshell-drawer-open");
  });
  document.getElementById("ibshell-mobile-props-btn").addEventListener("click", () => {
    document.getElementById("ibshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("ibshell-props").classList.toggle("bshell-drawer-open");
  });

  window.addEventListener("resize", () => {
    clearTimeout(window._invoiceBshellFitTimer);
    window._invoiceBshellFitTimer = setTimeout(invoiceBshellFitCanvas, 150);
  });
}

/* finalize() is async with no promise this file can await directly
   through a proxy .click() — watching the button's own disabled
   attribute (set true, then back to false, synchronously around the
   await in invoice-app.js's handler) is what reliably tells us the
   whole handler — success or failure — has finished, since nothing
   awaits again after that point in that handler. */
function invoiceBshellWireFinalizeWatcher() {
  const btn = document.getElementById("invoice-finalize-btn");
  if (!btn || btn.dataset.bshellWatched) return;
  btn.dataset.bshellWatched = "1";
  new MutationObserver(() => {
    if (btn.disabled) return; // only react on the true->false transition back
    invoiceBshellSelection = null;
    invoiceBshellSyncUndoButtons();
    invoiceBshellRenderCanvas();
    invoiceBshellRenderHierarchy();
    invoiceBshellRenderProperties();
    invoiceBshellSyncLockUI();
  }).observe(btn, { attributes: true, attributeFilter: ["disabled"] });
}

/* Shows/hides this Shell's own Finalize/Credit-note buttons and the
   locked-document banner — mirrors renderInvoiceFormIA()'s identical
   toggle for the old sidebar's own buttons, computed fresh from
   isInvoiceLocked() every time, never cached. */
function invoiceBshellSyncLockUI() {
  const locked = invoiceBshellLocked();
  document.getElementById("ibshell-finalize-btn").style.display = locked ? "none" : "";
  document.getElementById("ibshell-credit-btn").style.display = locked ? "" : "none";
  document.getElementById("ibshell-locked-note").style.display = locked ? "block" : "none";
  const aiDraftGroup = document.getElementById("ibshell-ai-draft-group");
  if (aiDraftGroup) aiDraftGroup.style.display = locked ? "none" : "";
  const name = (invoiceEventState && INVOICE_DOC_LABEL[invoiceEventState.docType]) || "מסמך חדש";
  document.getElementById("ibshell-top-name").textContent = name;
  invoiceBshellSyncUndoButtons();
}

const INVOICEBSHELL_AI_UPGRADE_MESSAGE = "הגעת למכסת הניסיונות החינמיים ביצירת טיוטה אוטומטית. רוצה להמשיך ללא הגבלה? שדרג לגרסת Pro בתשלום חד-פעמי!";

/* "✨ יצירת טיוטה אוטומטית" — a brand-new control (no old-UI
   equivalent to move/reuse), mirroring quote-builder-shell.js's own
   version at invoice scale. Only ever drafts invoiceEventState.items
   — never recipientName/recipientId/recipientAddress, which name a
   real third party the AI has no way to know (see
   supabase/functions/generate-invoice's own header comment). Hidden
   entirely once the document is locked (invoiceBshellSyncLockUI
   above) — a issued invoice's items can never change through any
   path in this Shell, AI draft included. */
function invoiceBshellWireAiDraft() {
  const btn = document.getElementById("ibshell-ai-draft-btn");
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", invoiceBshellGenerateDraft);
}

function invoiceBshellAiDraftNote(html) {
  const note = document.getElementById("ibshell-ai-draft-note");
  if (note) note.innerHTML = html;
}

async function invoiceBshellGenerateDraft() {
  if (invoiceBshellLocked()) return;
  const btn = document.getElementById("ibshell-ai-draft-btn");
  const input = document.getElementById("ibshell-ai-draft-input");
  if (!btn || !input) return;
  const description = input.value.trim();
  if (!description) {
    invoiceBshellAiDraftNote("תארו קודם בקצרה מה מחויב — אז AI יכין שורות טיוטה ראשוניות.");
    return;
  }
  invoiceBshellAiDraftNote("");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "יוצר טיוטה...";
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("invoice-app.html"); return; }
    const res = await fetch(SUPABASE_URL + "/functions/v1/generate-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ description, businessName: currentInvoiceProfile && currentInvoiceProfile.business_name }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      invoiceBshellAiDraftNote(data.error || "יצירת הטיוטה נכשלה, נסו שוב.");
      return;
    }
    if (data.limitReached) {
      invoiceBshellAiDraftNote(data.isPro ? "הגעתם למכסת השימוש ההוגן היומית. אפשר להמשיך מחר." : `${INVOICEBSHELL_AI_UPGRADE_MESSAGE} <a href="#">שדרוג ל-Pro</a>`);
      return;
    }
    if (invoiceBshellLocked()) return; // locked while the request was in flight
    const items = (data.invoice && Array.isArray(data.invoice.items)) ? data.invoice.items : [];
    if (!items.length) {
      invoiceBshellAiDraftNote("ה-AI לא הצליח להציע שורות מהתיאור הזה — נסו לתאר בפירוט רב יותר.");
      return;
    }
    invoiceBshellSnapshot();
    invoiceEventState.items = items;
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
    invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
    invoiceBshellRenderHierarchy();
    invoiceBshellSyncUndoButtons();
  } catch (err) {
    invoiceBshellAiDraftNote("יצירת הטיוטה נכשלה, נסו שוב.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function invoiceBshellSaveNow() {
  const status = document.getElementById("ibshell-top-status");
  status.textContent = "שומרים...";
  status.className = "bshell-top-status saving";
  const err = await saveInvoiceDraft();
  status.textContent = err ? "השמירה נכשלה, נסו שוב" : "נשמר ✓";
  status.className = "bshell-top-status " + (err ? "" : "saved");
  if (!err) invoiceBshellDirty = false;
  if (window.refreshMyPanel) window.refreshMyPanel();
  setTimeout(() => { if (status.textContent === "נשמר ✓") status.textContent = ""; }, 2500);
}

/* ---------- Hierarchy sidebar ---------- */

function invoiceBshellRenderHierarchy() {
  const list = document.getElementById("ibshell-hier-list");
  const inv = invoiceEventState;
  const locked = invoiceBshellLocked();
  document.getElementById("ibshell-settings-btn").classList.toggle("is-selected", !!(invoiceBshellSelection && invoiceBshellSelection.kind === "settings"));

  const textRow = (key) => {
    const isSel = invoiceBshellSelection && invoiceBshellSelection.kind === "text" && invoiceBshellSelection.key === key;
    return `
      <details class="bshell-sec" open>
        <summary class="bshell-sec-head${isSel ? " is-selected" : ""}" data-ibshell-select-text="${key}">
          <span class="bshell-sec-chevron" style="visibility:hidden;"></span>
          <span>${escapeHtmlI(INVOICEBSHELL_TEXT_LABELS[key])}</span>
        </summary>
      </details>`;
  };

  const isSelSection = invoiceBshellSelection && invoiceBshellSelection.kind === "section" && invoiceBshellSelection.type === "items";
  const itemRows = (inv.items || []).map((it, i) => {
    const isSelItem = invoiceBshellSelection && invoiceBshellSelection.kind === "item" && invoiceBshellSelection.idx === i;
    return `<button type="button" class="bshell-item${isSelItem ? " is-selected" : ""}" data-ibshell-select-item="${i}">${escapeHtmlI(it.desc && it.desc.trim() ? it.desc : `פריט ${i + 1}`)}</button>`;
  }).join("") + (locked ? "" : `<button type="button" class="bshell-add-item" data-ibshell-add-item>+ הוספת פריט</button>`);

  list.innerHTML = [
    textRow("date"), textRow("recipientName"), textRow("recipientId"), textRow("recipientAddress"),
    `<details class="bshell-sec" open>
      <summary class="bshell-sec-head${isSelSection ? " is-selected" : ""}" data-ibshell-select-section="items">
        <span class="bshell-sec-chevron"></span>
        <span>פריטים</span>
      </summary>
      <div class="bshell-sec-body">${itemRows}</div>
    </details>`,
    textRow("paymentMethod"), textRow("notes"),
  ].join("");

  list.querySelectorAll("[data-ibshell-select-text]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); invoiceBshellSelectText(el.dataset.ibshellSelectText); });
  });
  list.querySelectorAll("[data-ibshell-select-section]").forEach((el) => {
    el.addEventListener("click", (e) => { e.preventDefault(); invoiceBshellSelectSection(el.dataset.ibshellSelectSection); });
  });
  list.querySelectorAll("[data-ibshell-select-item]").forEach((el) => {
    el.addEventListener("click", () => invoiceBshellSelectItem(parseInt(el.dataset.ibshellSelectItem, 10)));
  });
  list.querySelectorAll("[data-ibshell-add-item]").forEach((el) => {
    el.addEventListener("click", () => {
      if (invoiceBshellLocked()) return;
      invoiceBshellSnapshot();
      inv.items.push({ desc: "", qty: "1", unitPrice: "" });
      const newIdx = inv.items.length - 1;
      renderInvoiceFormIA();
      invoiceBshellRenderCanvas(() => invoiceBshellSelectItem(newIdx));
      invoiceBshellRenderHierarchy();
    });
  });
}

/* ---------- Canvas: render + click-to-select ---------- */

function invoiceBshellBuildCanvasHtml() {
  const body = renderInvoiceHtml(invoiceEventState, currentInvoiceProfile);
  const fontsLink = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
  // .invoice-pdf-credit{display:none} — same missing rule, same reason,
  // as js/quote-builder-shell.js's own canvas builder (see its comment):
  // this iframe's srcdoc never loads css/builder.css, so the credit
  // line rendered visible by default, widening the canvas.
  // align-items:flex-start / min-height — see js/quote-builder-shell.js's
  // quoteBshellBuildCanvasHtml(): the flex default (stretch) squashed the
  // page to the already-scaled height and cut its bottom off.
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
    ${fontsLink ? fontsLink.outerHTML : ""}
    <style>html,body{margin:0; background:#F3F4F6;} body{display:flex; justify-content:center; align-items:flex-start; padding:36px 20px; box-sizing:border-box;} .invoice-doc{min-height:1123px;} .invoice-pdf-credit{display:none;}</style>
    </head><body>${body}</body></html>`;
}

function invoiceBshellRenderCanvas(afterLoad) {
  const iframe = document.getElementById("ibshell-canvas-iframe");
  iframe.srcdoc = invoiceBshellBuildCanvasHtml();
  invoiceBshellCanvasClickWired = false;
  iframe.onload = () => {
    invoiceBshellWireCanvasClicks();
    invoiceBshellFitCanvas();
    invoiceBshellApplySelectionVisual();
    if (afterLoad) afterLoad();
  };
}

function invoiceBshellFitCanvas() {
  const iframe = document.getElementById("ibshell-canvas-iframe");
  const doc = iframe.contentDocument;
  const el = doc && doc.querySelector(".invoice-doc");
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

function invoiceBshellWireCanvasClicks() {
  const iframe = document.getElementById("ibshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc || invoiceBshellCanvasClickWired) return;
  invoiceBshellCanvasClickWired = true;
  doc.addEventListener("click", (e) => {
    if (e.target.closest("#ibshell-mini-toolbar")) return;
    const a = e.target.closest("a");
    if (a) e.preventDefault();
    const resolved = invoiceBshellResolveClickTarget(e);
    if (!resolved) { invoiceBshellDeselect(); return; }
    invoiceBshellSelection = resolved;
    invoiceBshellApplySelectionVisual();
    invoiceBshellRenderProperties();
    invoiceBshellRenderHierarchy();
  }, true);
  invoiceBshellWireCanvasHover(doc);
}

/* Hover affordance for the canvas — see js/cv-builder-shell.js's
   cvbshellWireCanvasHover for why: without any on-screen cue, editing
   read as possible only from the hierarchy list, never by clicking the
   canvas directly, even though the click handler above always
   supported it (clicking still opens Properties even on a locked/issued
   document — see invoiceBshellWirePropertiesPanel for where the real
   lock check lives — so the hover cue itself needs no lock special-case
   here). Reuses invoiceBshellResolveClickTarget's exact priority
   resolution via delegation so the hover highlight always lands on the
   identical element a click there would select. */
function invoiceBshellWireCanvasHover(doc) {
  if (!doc.getElementById("ibshell-hover-style")) {
    const style = doc.createElement("style");
    style.id = "ibshell-hover-style";
    style.textContent = `.bshell-hover-target{outline:1.5px dashed rgba(20,184,166,.65) !important; outline-offset:2px !important; cursor:pointer;}`;
    doc.head.appendChild(style);
  }
  let hovered = null;
  doc.addEventListener("mouseover", (e) => {
    if (e.target.closest("#ibshell-mini-toolbar")) return;
    const resolved = invoiceBshellResolveClickTarget(e);
    const el = resolved ? resolved.rootEl : null;
    if (el === hovered) return;
    if (hovered) hovered.classList.remove("bshell-hover-target");
    hovered = el;
    if (hovered && hovered !== (invoiceBshellSelection && invoiceBshellSelection.rootEl)) hovered.classList.add("bshell-hover-target");
  });
  doc.addEventListener("mouseout", (e) => {
    if (hovered && !e.relatedTarget) { hovered.classList.remove("bshell-hover-target"); hovered = null; }
  });
}

function invoiceBshellResolveClickTarget(e) {
  const itemEl = e.target.closest("[data-i-item-idx]");
  if (itemEl) return { kind: "item", idx: parseInt(itemEl.dataset.iItemIdx, 10), rootEl: itemEl };
  const textEl = e.target.closest("[data-ikey]");
  if (textEl) return { kind: "text", key: textEl.dataset.ikey, rootEl: textEl };
  return null;
}

function invoiceBshellDeselect() {
  invoiceBshellSelection = null;
  invoiceBshellApplySelectionVisual();
  invoiceBshellRenderProperties();
  invoiceBshellRenderHierarchy();
}

function invoiceBshellSelectText(key) {
  const doc = document.getElementById("ibshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-ikey="${key}"]`);
  invoiceBshellSelection = { kind: "text", key, rootEl: el };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  invoiceBshellApplySelectionVisual();
  invoiceBshellRenderProperties();
  invoiceBshellRenderHierarchy();
}

function invoiceBshellSelectSection(type) {
  invoiceBshellSelection = { kind: "section", type, rootEl: null };
  invoiceBshellApplySelectionVisual();
  invoiceBshellRenderProperties();
  invoiceBshellRenderHierarchy();
}

function invoiceBshellSelectItem(idx) {
  const doc = document.getElementById("ibshell-canvas-iframe").contentDocument;
  const el = doc && doc.querySelector(`[data-i-item-idx="${idx}"]`);
  invoiceBshellSelection = { kind: "item", idx, rootEl: el || null };
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  invoiceBshellApplySelectionVisual();
  invoiceBshellRenderProperties();
  invoiceBshellRenderHierarchy();
}

function invoiceBshellSelectSettings() {
  invoiceBshellSelection = { kind: "settings" };
  invoiceBshellApplySelectionVisual();
  invoiceBshellRenderProperties();
  invoiceBshellRenderHierarchy();
}

function invoiceBshellApplySelectionVisual() {
  const iframe = document.getElementById("ibshell-canvas-iframe");
  const doc = iframe.contentDocument;
  if (!doc) return;
  doc.querySelectorAll(".bshell-outline-target").forEach((el) => el.classList.remove("bshell-outline-target"));
  const oldToolbar = doc.getElementById("ibshell-mini-toolbar");
  if (oldToolbar) oldToolbar.remove();
  if (!invoiceBshellSelection || !invoiceBshellSelection.rootEl || !doc.contains(invoiceBshellSelection.rootEl)) return;

  if (!doc.getElementById("ibshell-outline-style")) {
    const style = doc.createElement("style");
    style.id = "ibshell-outline-style";
    style.textContent = `
      .bshell-outline-target{outline:2px solid #14B8A6 !important; outline-offset:2px !important;}
      #ibshell-mini-toolbar{position:absolute; z-index:999999; display:flex; gap:2px; background:#111827; border-radius:8px; padding:3px; box-shadow:0 4px 14px rgba(0,0,0,.28);}
      #ibshell-mini-toolbar button{all:unset; box-sizing:border-box; cursor:pointer; color:#fff; width:27px; height:27px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:13px; text-align:center;}
      #ibshell-mini-toolbar button:hover:not(:disabled){background:#14B8A6;}
      #ibshell-mini-toolbar button:disabled{opacity:.35; cursor:default;}`;
    doc.head.appendChild(style);
  }

  const el = invoiceBshellSelection.rootEl;
  el.classList.add("bshell-outline-target");
  const rect = el.getBoundingClientRect();
  const scrollY = doc.defaultView.scrollY || doc.documentElement.scrollTop;
  const toolbar = doc.createElement("div");
  toolbar.id = "ibshell-mini-toolbar";
  toolbar.style.top = Math.max(4, rect.top + scrollY - 34) + "px";
  toolbar.style.insetInlineStart = Math.max(4, rect.left) + "px";
  // Same reasoning as js/builder-shell.js's bshellApplySelectionVisual —
  // only show buttons that actually apply to this selection's kind (and
  // to a locked/issued document's real inability to duplicate or delete
  // a line item, same as it can't be edited at all).
  const locked = invoiceBshellLocked();
  const canDuplicateOrDelete = !locked && invoiceBshellSelection.kind === "item";
  const toolbarButtons = [`<button type="button" data-tool="edit" title="עריכה">✎</button>`];
  if (canDuplicateOrDelete) {
    toolbarButtons.push(`<button type="button" data-tool="duplicate" title="שכפול">⧉</button>`);
    toolbarButtons.push(`<button type="button" data-tool="delete" title="מחיקה">🗑</button>`);
  }
  toolbar.innerHTML = toolbarButtons.join("");
  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  toolbar.addEventListener("click", (e) => {
    e.stopPropagation();
    const btn = e.target.closest("button[data-tool]");
    if (!btn || btn.disabled) return;
    invoiceBshellToolbarAction(btn.dataset.tool);
  });
  doc.body.appendChild(toolbar);
}

function invoiceBshellToolbarAction(tool) {
  if (!invoiceBshellSelection) return;
  if (tool === "edit") {
    document.getElementById("ibshell-hier").classList.remove("bshell-drawer-open");
    document.getElementById("ibshell-props").classList.add("bshell-drawer-open");
    const first = document.querySelector("#ibshell-props-dynamic input, #ibshell-props-dynamic textarea, #ibshell-props-dynamic select");
    if (first) first.focus();
    return;
  }
  if (invoiceBshellLocked() || invoiceBshellSelection.kind !== "item") return;
  const list = invoiceEventState.items;
  if (tool === "duplicate") {
    invoiceBshellSnapshot();
    const copyIdx = invoiceBshellSelection.idx + 1;
    list.splice(copyIdx, 0, Object.assign({}, list[invoiceBshellSelection.idx]));
    renderInvoiceFormIA();
    invoiceBshellRenderCanvas(() => invoiceBshellSelectItem(copyIdx));
    invoiceBshellRenderHierarchy();
    return;
  }
  if (tool === "delete") {
    if (list.length <= 1) return; // mirrors the original "can't remove the last item" guard
    invoiceBshellSnapshot();
    list.splice(invoiceBshellSelection.idx, 1);
    renderInvoiceFormIA();
    invoiceBshellDeselect();
    invoiceBshellRenderCanvas();
    invoiceBshellRenderHierarchy();
  }
}

/* ---------- Properties panel ----------
   The Settings view (#ibshell-props-settings) is STATIC markup, never
   innerHTML-replaced — it permanently holds the moved #ia-profile-form
   (see invoiceBshellMoveProfileForm). Every other selection kind
   renders into the separate #ibshell-props-dynamic sibling instead. */
function invoiceBshellRenderProperties() {
  const empty = document.getElementById("ibshell-props-empty");
  const dyn = document.getElementById("ibshell-props-dynamic");
  const settingsView = document.getElementById("ibshell-props-settings");
  if (!invoiceBshellSelection) {
    empty.style.display = "";
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "none";
    return;
  }
  empty.style.display = "none";
  if (invoiceBshellSelection.kind === "settings") {
    dyn.style.display = "none";
    dyn.innerHTML = "";
    settingsView.style.display = "";
    invoiceBshellSyncBsdToggle();
    return;
  }
  settingsView.style.display = "none";
  dyn.style.display = "";
  if (invoiceBshellSelection.kind === "text") dyn.innerHTML = invoiceBshellPropsHtmlForText(invoiceBshellSelection.key);
  else if (invoiceBshellSelection.kind === "item") dyn.innerHTML = invoiceBshellPropsHtmlForItem(invoiceBshellSelection.idx);
  else if (invoiceBshellSelection.kind === "section") dyn.innerHTML = invoiceBshellPropsHtmlForSection();
  invoiceBshellWirePropertiesPanel();
}

function invoiceBshellPropsHtmlForText(key) {
  const locked = invoiceBshellLocked();
  const d = locked ? " disabled" : "";
  const label = INVOICEBSHELL_TEXT_LABELS[key];
  if (key === "paymentMethod") {
    const current = invoiceEventState.paymentMethod || "";
    const options = [["", "בחירה..."]].concat(Object.entries(INVOICE_PAYMENT_METHODS));
    return `
      <span class="bshell-props-kind">טקסט</span>
      <div class="bshell-props-field">
        <label class="bshell-props-label">${escapeHtmlI(label)}</label>
        <select id="ibshell-prop-content"${d}>
          ${options.map(([val, lbl]) => `<option value="${val}"${val === current ? " selected" : ""}>${escapeHtmlI(lbl)}</option>`).join("")}
        </select>
      </div>`;
  }
  const value = invoiceEventState[key] || "";
  const inputTag = key === "notes"
    ? `<textarea id="ibshell-prop-content" rows="3"${d}>${escapeHtmlI(value)}</textarea>`
    : `<input type="text" id="ibshell-prop-content" value="${escapeHtmlI(value).replace(/"/g, "&quot;")}"${d}>`;
  return `
    <span class="bshell-props-kind">טקסט</span>
    <div class="bshell-props-field">
      <label class="bshell-props-label">${escapeHtmlI(label)}</label>
      ${inputTag}
    </div>`;
}

function invoiceBshellPropsHtmlForItem(idx) {
  const it = invoiceEventState.items[idx] || { desc: "", qty: "1", unitPrice: "" };
  const d = invoiceBshellLocked() ? " disabled" : "";
  return `
    <span class="bshell-props-kind">פריט</span>
    <div class="bshell-props-field"><label class="bshell-props-label">תיאור</label><input type="text" id="ibshell-prop-item-desc" value="${escapeHtmlI(it.desc).replace(/"/g, "&quot;")}"${d}></div>
    <div class="bshell-props-field"><label class="bshell-props-label">כמות</label><input type="text" id="ibshell-prop-item-qty" value="${escapeHtmlI(it.qty).replace(/"/g, "&quot;")}"${d}></div>
    <div class="bshell-props-field"><label class="bshell-props-label">מחיר יח'</label><input type="text" id="ibshell-prop-item-unitPrice" value="${escapeHtmlI(it.unitPrice).replace(/"/g, "&quot;")}"${d}></div>`;
}

function invoiceBshellPropsHtmlForSection() {
  return `<span class="bshell-props-kind">Section</span><p style="font-size:12.5px; color:var(--text-muted); margin:0;">הפריטים מופיעים בטבלת המסמך. ניהול הפריטים מתבצע מההיררכיה או מהקנבס.</p>`;
}

function invoiceBshellWirePropertiesPanel() {
  if (invoiceBshellLocked()) return; // disabled inputs render but never get a mutation listener attached
  if (invoiceBshellSelection.kind === "text") return invoiceBshellWireTextProps(invoiceBshellSelection.key);
  if (invoiceBshellSelection.kind === "item") return invoiceBshellWireItemProps(invoiceBshellSelection.idx);
}

function invoiceBshellWireTextProps(key) {
  const el = document.getElementById("ibshell-prop-content");
  if (!el) return;
  const isSelect = key === "paymentMethod";
  if (!isSelect) {
    el.addEventListener("focus", () => invoiceBshellBeginEdit(el));
    el.addEventListener("blur", () => invoiceBshellEndEdit(el));
  }
  el.addEventListener(isSelect ? "change" : "input", () => {
    if (isSelect) invoiceBshellSnapshot();
    invoiceEventState[key] = el.value;
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
    invoiceBshellPatchTextContent(key, el.value);
  });
}

function invoiceBshellPatchTextContent(key, value) {
  if (INVOICEBSHELL_FULL_RERENDER_KEYS.includes(key)) {
    invoiceBshellRenderCanvas(invoiceBshellReanchorSelection);
    return;
  }
  const doc = document.getElementById("ibshell-canvas-iframe").contentDocument;
  if (!doc) return;
  doc.querySelectorAll(`[data-ikey="${key}"]`).forEach((el) => { el.textContent = value; });
  invoiceBshellApplySelectionVisual();
}

function invoiceBshellWireItemProps(idx) {
  const bind = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("focus", () => invoiceBshellBeginEdit(el));
    el.addEventListener("blur", () => invoiceBshellEndEdit(el));
    el.addEventListener("input", () => {
      invoiceEventState.items[idx][key] = el.value;
      renderInvoiceFormIA();
      invoiceBshellRenderCanvas(invoiceBshellReanchorSelection); // totals/VAT depend on every item -- full re-render is simplest correct patch
      invoiceBshellRenderHierarchy();
    });
  };
  bind("ibshell-prop-item-desc", "desc");
  bind("ibshell-prop-item-qty", "qty");
  bind("ibshell-prop-item-unitPrice", "unitPrice");
}

function invoiceBshellReanchorSelection() {
  if (!invoiceBshellSelection) return;
  if (invoiceBshellSelection.kind === "settings" || invoiceBshellSelection.kind === "section") return;
  const doc = document.getElementById("ibshell-canvas-iframe").contentDocument;
  if (!doc) return;
  let el = null;
  if (invoiceBshellSelection.kind === "text") el = doc.querySelector(`[data-ikey="${invoiceBshellSelection.key}"]`);
  else if (invoiceBshellSelection.kind === "item") el = doc.querySelector(`[data-i-item-idx="${invoiceBshellSelection.idx}"]`);
  if (el) { invoiceBshellSelection.rootEl = el; invoiceBshellApplySelectionVisual(); }
  else { invoiceBshellSelection = null; invoiceBshellRenderProperties(); }
}

/* ---------- DOMContentLoaded: activate only behind ?shell=1 — see
   js/invoice-app.js's routeAfterInvoiceAuth/wireInvoiceProfileForm,
   which call invoiceBshellActivate() once invoiceEventState (and, if
   needed, a brand-new profile) actually exists. Nothing to do here at
   load time; this file is purely called INTO, same relationship
   cv-builder-shell.js/quote-builder-shell.js have with their own
   *-app.js. */
