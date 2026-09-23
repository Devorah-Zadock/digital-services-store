/* Multi-tenant invoice/receipt builder — same shape as quote-app.js:
   sign up once (Supabase Auth), fill the reusable business letterhead
   once (the SAME `profiles` table quote-app.js already writes to, plus
   one extra field: business_type), then just fill event-specific fields
   per document from then on. No design catalog here on purpose — a
   legal document earns nothing from decorative variety, unlike a quote
   letter or a CV, so there's exactly one clean layout (see
   js/invoice-render.js). */

let invoiceUser = null;
let currentInvoiceProfile = null;
let invoiceEventState = null;
let pendingInvoiceDocType = null; // set when arriving to start a specific new document type

function todayHebrewI() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function emptyInvoiceEventState(docType) {
  return {
    docType: docType || "invoice_receipt",
    date: todayHebrewI(),
    recipientName: "", recipientId: "", recipientAddress: "",
    items: [{ desc: "", qty: "1", unitPrice: "" }],
    paymentMethod: "", notes: "",
  };
}

function showInvoiceSection(id) {
  ["ia-profile", "ia-app"].forEach((s) => {
    document.getElementById(s).style.display = s === id ? "" : "none";
  });
}

/* ---------- Business profile (same table as quote-app.js's, plus
   business_type — see supabase/sql/invoices.sql for why that single
   field decides which document this tool is even allowed to produce) */

function renderInvoiceLogoPreview(url) {
  const el = document.getElementById("ipf-logo-preview");
  const removeBtn = document.getElementById("ipf-logo-remove");
  if (url) { el.innerHTML = `<img src="${url}" alt="">`; removeBtn.style.display = ""; }
  else { el.innerHTML = `<span>🖼</span>`; removeBtn.style.display = "none"; }
}

let pendingInvoiceLogoUrl = null;

function fillInvoiceProfileForm(p) {
  document.getElementById("ipf-businessName").value = p?.business_name || "";
  document.getElementById("ipf-tagline1").value = p?.tagline1 || "";
  document.getElementById("ipf-email").value = p?.email || invoiceUser?.email || "";
  document.getElementById("ipf-idNumber").value = p?.id_number || "";
  document.getElementById("ipf-phone").value = p?.phone || "";
  document.getElementById("ipf-vatRate").value = p?.vat_rate || "18";
  const type = p?.business_type || "licensed";
  document.querySelectorAll('input[name="ipf-businessType"]').forEach((r) => { r.checked = r.value === type; });
  updateVatRateVisibility();
  pendingInvoiceLogoUrl = p?.logo_url || null;
  renderInvoiceLogoPreview(pendingInvoiceLogoUrl);
}

function updateVatRateVisibility() {
  const checked = document.querySelector('input[name="ipf-businessType"]:checked');
  const isLicensed = !checked || checked.value === "licensed";
  document.getElementById("ipf-vatRate-field").style.display = isLicensed ? "" : "none";
}

function wireInvoiceProfileForm() {
  document.getElementById("ipf-logo-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert("הקובץ גדול מדי — בחרו לוגו עד 4MB."); e.target.value = ""; return; }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${invoiceUser.id}/logo.${ext}`;
    const { error: upErr } = await supabaseClient.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) { alert("העלאת הלוגו נכשלה, נסו שוב."); e.target.value = ""; return; }
    const { data } = supabaseClient.storage.from("logos").getPublicUrl(path);
    pendingInvoiceLogoUrl = data.publicUrl + "?t=" + Date.now();
    renderInvoiceLogoPreview(pendingInvoiceLogoUrl);
  });
  document.getElementById("ipf-logo-remove").addEventListener("click", () => {
    pendingInvoiceLogoUrl = null;
    document.getElementById("ipf-logo-file").value = "";
    renderInvoiceLogoPreview(null);
  });
  document.querySelectorAll('input[name="ipf-businessType"]').forEach((r) => {
    r.addEventListener("change", updateVatRateVisibility);
  });

  document.getElementById("ia-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("ia-profile-err");
    err.textContent = "";
    const type = document.querySelector('input[name="ipf-businessType"]:checked')?.value || "licensed";
    const row = {
      id: invoiceUser.id,
      business_name: document.getElementById("ipf-businessName").value.trim(),
      tagline1: document.getElementById("ipf-tagline1").value.trim(),
      email: document.getElementById("ipf-email").value.trim(),
      id_number: document.getElementById("ipf-idNumber").value.trim(),
      phone: document.getElementById("ipf-phone").value.trim(),
      vat_rate: document.getElementById("ipf-vatRate").value.trim() || "18",
      business_type: type,
      logo_url: pendingInvoiceLogoUrl,
    };
    const { data, error } = await supabaseClient.from("profiles").upsert(row).select().single();
    if (error) { err.textContent = "השמירה נכשלה, נסו שוב."; return; }
    currentInvoiceProfile = data;
    showInvoiceBuilder();
  });
}

/* ---------- Document builder ---------- */

function renderInvoicePreviewIA() {
  document.getElementById("invoice-preview").innerHTML = renderInvoiceHtml(invoiceEventState, currentInvoiceProfile);
  fitInvoicePreviewToContainer();
}

function invoiceLineItemHtml(it, i, total) {
  const canRemove = total > 1;
  return `
  <div class="ia-item-row" data-idx="${i}">
    <input type="text" placeholder="תיאור" data-item="${i}" data-key="desc" value="${escapeHtmlI(it.desc)}">
    <input type="text" placeholder="כמות" data-item="${i}" data-key="qty" value="${escapeHtmlI(it.qty)}" style="max-width:70px;">
    <input type="text" placeholder="מחיר יח'" data-item="${i}" data-key="unitPrice" value="${escapeHtmlI(it.unitPrice)}" style="max-width:100px;">
    ${canRemove ? `<button type="button" class="job-remove" data-item-remove="${i}">הסרה</button>` : ""}
  </div>`;
}

function renderInvoiceItemsListIA() {
  const items = invoiceEventState.items;
  document.getElementById("ia-items-list").innerHTML = items.map((it, i) => invoiceLineItemHtml(it, i, items.length)).join("");
}

function isInvoiceLocked() {
  return invoiceEventState.status === "issued";
}

function renderInvoiceFormIA() {
  const q = invoiceEventState;
  document.getElementById("if-date").value = q.date;
  document.getElementById("if-recipientName").value = q.recipientName;
  document.getElementById("if-recipientId").value = q.recipientId;
  document.getElementById("if-recipientAddress").value = q.recipientAddress;
  document.getElementById("if-paymentMethod").value = q.paymentMethod || "";
  document.getElementById("if-notes").value = q.notes;
  renderInvoiceItemsListIA();

  const locked = isInvoiceLocked();
  document.querySelectorAll("#ia-app aside input, #ia-app aside textarea, #ia-app aside select, #ia-app aside button.job-remove")
    .forEach((el) => { el.disabled = locked; });
  document.getElementById("ia-locked-note").style.display = locked ? "block" : "none";
  document.getElementById("invoice-finalize-btn").style.display = locked ? "none" : "";
  document.getElementById("invoice-credit-btn").style.display = locked ? "" : "none";
  document.getElementById("add-item-btn").style.display = locked ? "none" : "";
}

function wireInvoiceFormIA() {
  const map = {
    "if-date": "date", "if-recipientName": "recipientName", "if-recipientId": "recipientId",
    "if-recipientAddress": "recipientAddress", "if-notes": "notes",
  };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      invoiceEventState[key] = e.target.value;
      renderInvoicePreviewIA();
    });
  });
  document.getElementById("if-paymentMethod").addEventListener("change", (e) => {
    invoiceEventState.paymentMethod = e.target.value;
    renderInvoicePreviewIA();
  });

  document.getElementById("add-item-btn").addEventListener("click", () => {
    invoiceEventState.items.push({ desc: "", qty: "1", unitPrice: "" });
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
  });
  document.getElementById("ia-items-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.item;
    if (idx === undefined) return;
    invoiceEventState.items[idx][e.target.dataset.key] = e.target.value;
    renderInvoicePreviewIA();
  });
  document.getElementById("ia-items-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.itemRemove;
    if (idx === undefined) return;
    if (invoiceEventState.items.length <= 1) return;
    invoiceEventState.items.splice(Number(idx), 1);
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
  });

  document.getElementById("invoice-download-btn").addEventListener("click", async () => {
    await downloadInvoicePdf(INVOICE_DOC_LABEL[invoiceEventState.docType]);
  });

  document.getElementById("invoice-finalize-btn").addEventListener("click", async () => {
    // A credit note's docType is fixed at creation (creditNoteDraftFrom)
    // and must never be reassigned here — only a fresh invoice/receipt
    // draft's type follows the business's current licensed/exempt
    // status, in case that changed since the draft was started.
    if (invoiceEventState.docType !== "credit_note") {
      const licensed = currentInvoiceProfile.business_type !== "exempt";
      invoiceEventState.docType = licensed ? "invoice_receipt" : "receipt";
    }
    const hasItems = invoiceEventState.items.some((it) => it.desc.trim() && parseILSI(it.unitPrice) > 0);
    if (!invoiceEventState.recipientName.trim() || !hasItems) {
      alert("צריך למלא לכבוד מי המסמך, ולפחות שורה אחת עם תיאור ומחיר.");
      return;
    }
    if (!confirm(`הפקת ${INVOICE_DOC_LABEL[invoiceEventState.docType]} היא סופית ולא ניתנת לעריכה או מחיקה לאחר מכן (רק תיקון באמצעות חשבונית זיכוי נפרדת). להמשיך?`)) return;
    const btn = document.getElementById("invoice-finalize-btn");
    btn.disabled = true;
    const result = await finalizeInvoice(currentInvoiceProfile);
    btn.disabled = false;
    if (result.error) { alert("ההפקה נכשלה, נסו שוב."); return; }
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
  });

  document.getElementById("invoice-credit-btn").addEventListener("click", () => {
    const original = { id: invoiceSavedId, data: invoiceEventState };
    const draft = creditNoteDraftFrom(original);
    invoiceSavedId = null;
    showInvoiceBuilder(draft);
  });

  document.getElementById("ia-edit-profile").addEventListener("click", showInvoiceProfileEditor);
}

function showInvoiceBuilder(loadedState) {
  showInvoiceSection("ia-app");
  if (loadedState) {
    invoiceEventState = loadedState;
  } else {
    // A fresh draft's title/VAT treatment must match the business's type
    // from the moment it's created, not just get corrected at finalize —
    // otherwise an exempt dealer sees "חשבונית מס-קבלה" (a document
    // they're not even allowed to issue) throughout the whole draft.
    const licensed = currentInvoiceProfile.business_type !== "exempt";
    invoiceEventState = emptyInvoiceEventState(pendingInvoiceDocType || (licensed ? "invoice_receipt" : "receipt"));
  }
  pendingInvoiceDocType = null;
  renderInvoiceFormIA();
  renderInvoicePreviewIA();
  if (window.logUsageEvent) logUsageEvent("invoice", invoiceEventState.docType, "edit");
}

function showInvoiceProfileEditor() {
  if (!invoiceUser) { goToInvoiceLogin(); return; }
  showInvoiceSection("ia-profile");
  fillInvoiceProfileForm(currentInvoiceProfile);
}

function goToInvoiceLogin() {
  window.location.href = "account.html?redirect=invoice-app.html";
}

/* ---------- Boot / auth state routing (mirrors quote-app.js, minus the
   design catalog step — see the file header for why there isn't one) */

async function routeAfterInvoiceAuth(user) {
  invoiceUser = user;
  invoiceCurrentUserId = user.id;
  const iid = new URLSearchParams(location.search).get("invoice");

  const { data } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) {
    currentInvoiceProfile = data;
    const loaded = iid ? await loadInvoiceById(iid, user.id) : null;
    showInvoiceBuilder(loaded);
  } else {
    currentInvoiceProfile = null;
    showInvoiceSection("ia-profile");
    fillInvoiceProfileForm(null);
  }
}

function routeAsInvoiceGuest() {
  invoiceUser = null;
  invoiceCurrentUserId = null;
  invoiceSavedId = null;
  const here = location.pathname.split("/").pop() + location.search;
  window.location.href = "account.html?redirect=" + encodeURIComponent(here);
}

let invoiceAppRoutedUserId; // same re-fire guard as quote-app.js's quoteAppRoutedUserId

document.addEventListener("DOMContentLoaded", () => {
  wireInvoiceProfileForm();
  wireInvoiceFormIA();

  function routeIfUserChanged(session) {
    const uid = session && session.user ? session.user.id : null;
    if (uid === invoiceAppRoutedUserId) return;
    invoiceAppRoutedUserId = uid;
    if (uid) routeAfterInvoiceAuth(session.user);
    else routeAsInvoiceGuest();
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => routeIfUserChanged(session));
  supabaseClient.auth.getSession().then(({ data }) => routeIfUserChanged(data.session));
});
