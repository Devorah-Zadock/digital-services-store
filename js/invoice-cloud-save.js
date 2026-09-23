/* Persists individual invoices/receipts/credit-notes (invoice_saves
   table — one row per document, same shape as quote_saves) and handles
   the one thing quotes never needed: turning a freely-editable draft
   into a permanently locked, sequentially numbered legal document.

   invoiceCurrentUserId/invoiceSavedId/invoiceEventState are set by
   invoice-app.js — same shared-globals pattern quote-app.js/
   quote-cloud-save.js already use.

   Explicit-save only for drafts, same as quotes: saveInvoiceDraft only
   runs from #invoice-save-btn. Finalizing is a SEPARATE, deliberate
   action (#invoice-finalize-btn) — never something that happens as a
   side effect of an ordinary save, since it's irreversible. */

let invoiceCurrentUserId = null;
let invoiceSavedId = null;

function profileSnapshot(profile) {
  return {
    businessName: profile.business_name, tagline1: profile.tagline1, tagline2: profile.tagline2,
    email: profile.email, businessNumber: profile.id_number, phone: profile.phone,
    logoUrl: profile.logo_url, businessType: profile.business_type, vatRate: profile.vat_rate,
  };
}

async function saveInvoiceDraft() {
  if (!invoiceCurrentUserId || !invoiceEventState) return "no-user";
  const row = {
    user_id: invoiceCurrentUserId,
    doc_type: invoiceEventState.docType,
    original_invoice_id: invoiceEventState.originalInvoiceId || null,
    data: invoiceEventState,
    updated_at: new Date().toISOString(),
  };
  if (invoiceSavedId) row.id = invoiceSavedId;
  const { data, error } = await supabaseClient.from("invoice_saves").upsert(row).select().single();
  if (error) return error;
  invoiceSavedId = data.id;
  const url = new URL(location.href);
  url.searchParams.set("invoice", data.id);
  history.replaceState(null, "", url);
  if (window.refreshMyPanel) window.refreshMyPanel();
  return null;
}

/* Irreversible: freezes the current profile into inv.snapshot (so this
   exact document never changes even if the business later edits its
   letterhead — see invoice-render.js's invoiceLetterhead()), saves that
   as the draft's final state, then calls finalize_invoice() — the only
   thing that ever assigns a real sequential number, and it does so
   atomically server-side (see supabase/sql/invoices.sql) so two rapid
   clicks or two open tabs can never hand out the same number twice.
   From here on invoice_saves' own RLS policy refuses every further
   UPDATE to this row — a correction has to be a brand-new credit note,
   never an edit. */
async function finalizeInvoice(currentProfile) {
  if (!invoiceSavedId) {
    const err = await saveInvoiceDraft();
    if (err) return { error: err };
  }
  invoiceEventState.snapshot = profileSnapshot(currentProfile);
  const err = await saveInvoiceDraft();
  if (err) return { error: err };
  const { data: number, error: rpcErr } = await supabaseClient.rpc("finalize_invoice", { p_id: invoiceSavedId });
  if (rpcErr) return { error: rpcErr };
  invoiceEventState.number = number;
  invoiceEventState.status = "issued";
  return { number };
}

/* Starts a brand-new credit-note draft that negates and references an
   already-issued document — never edits the original (see the comment
   above). Copies the original's line items/snapshot as-is; the render
   layer (renderInvoiceHtml) is what actually flips the displayed sign
   to negative for docType "credit_note". */
function creditNoteDraftFrom(original) {
  return {
    docType: "credit_note",
    originalInvoiceId: original.id,
    originalNumber: original.data.number,
    originalDocType: original.data.docType,
    date: todayHebrewI(),
    recipientName: original.data.recipientName,
    recipientId: original.data.recipientId,
    recipientAddress: original.data.recipientAddress,
    items: (original.data.items || []).map((it) => ({ ...it })),
    paymentMethod: "",
    notes: "",
  };
}

async function loadInvoiceById(id, userId) {
  const { data } = await supabaseClient.from("invoice_saves").select("id, doc_type, status, number, data")
    .eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  invoiceSavedId = data.id;
  return { ...data.data, number: data.number, status: data.status, id: data.id };
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("invoice-save-btn");
  const status = document.getElementById("invoice-save-status");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!invoiceCurrentUserId) { window.location.href = "account.html?redirect=invoice-app.html"; return; }
    btn.disabled = true;
    const err = await saveInvoiceDraft();
    btn.disabled = false;
    status.classList.remove("ok");
    status.textContent = err ? "השמירה נכשלה, נסו שוב" : "נשמר ✓";
    if (!err) status.classList.add("ok");
    setTimeout(() => { status.textContent = ""; status.classList.remove("ok"); }, 2500);
  });
});
