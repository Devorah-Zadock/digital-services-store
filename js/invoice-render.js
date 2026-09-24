/* Renders an invoice/receipt/credit-note as an HTML string — shared by
   the live preview and the print/PDF output, same split as
   quote-render.js. Two legally distinct document shapes come out of the
   SAME render function, chosen by inv.docType/businessType rather than
   a free per-document choice:
     - "invoice_receipt" (חשבונית מס-קבלה): a VAT-registered business
       (עוסק מורשה/חברה), paid at the time of issue — shows a VAT
       breakdown.
     - "receipt" (קבלה): an exempt dealer (עוסק פטור), who is not
       permitted to charge or show VAT at all.
     - "credit_note" (חשבונית זיכוי): cancels/corrects an already-issued
       document — same layout, negative amounts, and a banner naming
       the original document number (see js/invoice-cloud-save.js for
       why a correction is always a NEW numbered document, never an
       edit to the original).
   Wording here follows common Israeli small-business practice, not
   legal advice — worth a quick check against your own accountant's
   preferred phrasing before relying on it. */
function escapeHtmlI(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseILSI(s) {
  const n = parseFloat(String(s || "").replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}
function formatILSI(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const INVOICE_DEFAULT_VAT_RATE = 18;

const INVOICE_PAYMENT_METHODS = {
  cash: "מזומן", check: "צ'ק", transfer: "העברה בנקאית", credit: "כרטיס אשראי", bit: "ביט / פייבוקס",
};

const INVOICE_DOC_LABEL = {
  invoice_receipt: "חשבונית מס-קבלה",
  receipt: "קבלה",
  credit_note: "חשבונית זיכוי",
};

/* Everything an issued document needs to stay exactly as it looked the
   day it was issued (business name, address, VAT rate...) even if the
   business later edits its profile — a reprint of an old invoice must
   show what was true THEN, not today. inv.snapshot is written once, at
   finalize time (see saveInvoiceDraft in invoice-cloud-save.js), and
   from that point on always wins over the live profile. Only a still-
   unissued draft preview falls back to the live, currently-being-edited
   profile. */
function invoiceLetterhead(inv, liveProfile) {
  const s = inv.snapshot || (liveProfile ? {
    businessName: liveProfile.business_name, tagline1: liveProfile.tagline1, tagline2: liveProfile.tagline2,
    email: liveProfile.email, businessNumber: liveProfile.id_number, phone: liveProfile.phone,
    logoUrl: liveProfile.logo_url, businessType: liveProfile.business_type, vatRate: liveProfile.vat_rate,
  } : {});
  return s;
}

function invoiceLineTotals(inv, letterhead) {
  const items = (inv.items || []).map((it) => ({
    desc: it.desc || "", qty: parseILSI(it.qty) || 1, unitPrice: parseILSI(it.unitPrice),
  }));
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const licensed = letterhead.businessType !== "exempt";
  const vatRateNum = parseFloat(String(letterhead.vatRate ?? "").replace(/,/g, "").trim());
  const vatRatePct = isNaN(vatRateNum) ? INVOICE_DEFAULT_VAT_RATE : vatRateNum;
  const vat = licensed ? subtotal * (vatRatePct / 100) : 0;
  const total = subtotal + vat;
  return { items, subtotal, licensed, vatRatePct, vat, total };
}

const INVOICE_CSS = `
  .invoice-doc { font-family:'Heebo', Arial, sans-serif; background:#fff; color:#1E1E1E; width:794px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.12); overflow-wrap:break-word; overflow:hidden; }
  .invoice-doc .id-inner { padding:0 56px 50px; }
  .invoice-doc .id-credit-banner { background:#FDECEC; color:#A62B2B; font-weight:700; font-size:13.5px; padding:10px 56px; text-align:center; }
  .invoice-doc .letterhead { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:30px 56px 18px; border-bottom:2px solid #163F35; }
  .invoice-doc .letterhead-logo { max-height:60px; max-width:180px; display:block; }
  .invoice-doc .biz-name { font-size:19px; font-weight:700; color:#163F35; }
  .invoice-doc .tagline { font-size:12px; color:#444; line-height:1.5; }
  .invoice-doc .contact-line { font-size:11px; color:#6B6B6B; margin-top:4px; }
  .invoice-doc .id-titlebox { text-align:start; }
  .invoice-doc .id-doctitle { font-size:20px; font-weight:800; color:#163F35; }
  .invoice-doc .id-docnum { font-size:13px; color:#444; margin-top:4px; }
  .invoice-doc .id-meta-row { display:flex; justify-content:space-between; gap:20px; padding:22px 56px 0; font-size:13px; }
  .invoice-doc .id-meta-row .lbl { color:#6B6B6B; font-size:11.5px; }
  .invoice-doc .id-meta-row .val { font-weight:700; }
  .invoice-doc .id-items { width:100%; border-collapse:collapse; margin:20px 0 0; font-size:13.5px; }
  .invoice-doc .id-items th { text-align:start; font-size:11.5px; color:#6B6B6B; font-weight:700; border-bottom:1.5px solid #163F35; padding:6px 4px; }
  .invoice-doc .id-items td { padding:9px 4px; border-bottom:1px solid #EEE; }
  .invoice-doc .id-items td.num, .invoice-doc .id-items th.num { text-align:end; font-variant-numeric:tabular-nums; }
  .invoice-doc .id-totals { margin:16px 0 0; margin-inline-start:auto; width:280px; font-size:13.5px; }
  .invoice-doc .id-totals-row { display:flex; justify-content:space-between; padding:4px 0; }
  .invoice-doc .id-totals-row.grand { border-top:1.5px solid #163F35; margin-top:6px; padding-top:10px; font-size:16px; font-weight:800; color:#163F35; }
  .invoice-doc .id-exempt-note { font-size:11.5px; color:#6B6B6B; margin-top:16px; line-height:1.6; }
  .invoice-doc .id-payment { font-size:13px; margin-top:20px; }
  .invoice-doc .id-notes { font-size:12.5px; color:#444; margin-top:10px; line-height:1.6; }
  .invoice-doc .id-signature { font-size:13px; margin-top:30px; padding-top:14px; border-top:1px solid #eee; }
`;

function renderInvoiceHtml(inv, liveProfile) {
  const letterhead = invoiceLetterhead(inv, liveProfile);
  const { items, subtotal, licensed, vatRatePct, vat, total } = invoiceLineTotals(inv, letterhead);
  const docLabel = INVOICE_DOC_LABEL[inv.docType] || INVOICE_DOC_LABEL.invoice_receipt;
  const sign = inv.docType === "credit_note" ? -1 : 1;
  const fmt = (n) => (sign < 0 ? `(${formatILSI(Math.abs(n))})` : formatILSI(n));

  const rowsHtml = items.map((it) => `
    <tr>
      <td>${escapeHtmlI(it.desc)}</td>
      <td class="num">${it.qty}</td>
      <td class="num">${formatILSI(it.unitPrice)} ₪</td>
      <td class="num">${fmt(it.qty * it.unitPrice)} ₪</td>
    </tr>`).join("");

  const paymentLabel = INVOICE_PAYMENT_METHODS[inv.paymentMethod] || "";

  return `
  <style>${INVOICE_CSS}</style>
  <div class="invoice-doc" dir="rtl">
    ${inv.docType === "credit_note" && inv.originalNumber
      ? `<div class="id-credit-banner">מסמך זה מבטל/מתקן את ${escapeHtmlI(INVOICE_DOC_LABEL[inv.originalDocType] || "המסמך")} מס' ${escapeHtmlI(inv.originalNumber)}</div>`
      : ""}
    <div class="letterhead">
      <div>
        ${letterhead.logoUrl ? `<img class="letterhead-logo" src="${escapeHtmlI(letterhead.logoUrl)}" alt="${escapeHtmlI("לוגו " + (letterhead.businessName || ""))}">` : ""}
        <div class="biz-name">${escapeHtmlI(letterhead.businessName)}</div>
        <div class="tagline">${escapeHtmlI(letterhead.tagline1)}</div>
        <div class="tagline">${escapeHtmlI(letterhead.tagline2)}</div>
        <div class="contact-line">${escapeHtmlI(letterhead.email)} &nbsp;•&nbsp; ${escapeHtmlI(letterhead.phone)} &nbsp;•&nbsp; ע.מ/ח.פ ${escapeHtmlI(letterhead.businessNumber)}</div>
      </div>
      <div class="id-titlebox">
        <div class="id-doctitle">${escapeHtmlI(docLabel)}</div>
        <div class="id-docnum">${inv.number ? `מס' ${escapeHtmlI(inv.number)}` : "טיוטה — טרם הופקה"}</div>
      </div>
    </div>
    <div class="id-meta-row">
      <div><div class="lbl">תאריך</div><div class="val">${escapeHtmlI(inv.date)}</div></div>
      <div style="text-align:end;">
        <div class="lbl">לכבוד</div>
        <div class="val">${escapeHtmlI(inv.recipientName)}</div>
        ${inv.recipientId ? `<div style="font-size:12px; color:#6B6B6B;">${escapeHtmlI(inv.recipientId)}</div>` : ""}
        ${inv.recipientAddress ? `<div style="font-size:12px; color:#6B6B6B;">${escapeHtmlI(inv.recipientAddress)}</div>` : ""}
      </div>
    </div>
    <div class="id-inner">
      <table class="id-items">
        <thead><tr><th>תיאור</th><th class="num">כמות</th><th class="num">מחיר יח'</th><th class="num">סה"כ</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="id-totals">
        ${licensed ? `
          <div class="id-totals-row"><span>סכום ביניים</span><span>${fmt(subtotal)} ₪</span></div>
          <div class="id-totals-row"><span>מע"מ (${vatRatePct}%)</span><span>${fmt(vat)} ₪</span></div>
        ` : ""}
        <div class="id-totals-row grand"><span>${inv.docType === "credit_note" ? 'סה"כ לזיכוי' : 'סה"כ לתשלום'}</span><span>${fmt(total)} ₪</span></div>
      </div>
      ${!licensed ? `<div class="id-exempt-note">"עוסק פטור" — פטור מגביית מע"מ לפי סעיף 31(2) לחוק מס ערך מוסף.</div>` : ""}
      ${paymentLabel ? `<div class="id-payment">אופן תשלום: ${escapeHtmlI(paymentLabel)}</div>` : ""}
      ${inv.notes ? `<div class="id-notes">${escapeHtmlI(inv.notes)}</div>` : ""}
      <div class="id-signature">${escapeHtmlI(letterhead.businessName)}</div>
    </div>
  </div>`;
}

/* Same fixed-A4-width-then-scale-to-fit technique as quote-render.js's
   fitQuotePreviewToContainer — kept as a near-identical duplicate rather
   than a shared helper since the two preview containers have different
   ids and each tool already stands alone (same reasoning as
   escapeHtmlQ/escapeHtmlI both existing rather than one shared
   escapeHtml — every DeskKit tool page loads only its own script). */
function fitInvoicePreviewToContainer() {
  const wrap = document.getElementById("invoice-preview");
  const doc = wrap && wrap.querySelector(".invoice-doc");
  if (!doc) return;
  const prevTransition = doc.style.transition;
  doc.style.transition = "none";
  doc.style.transform = "none";
  doc.style.margin = "0";
  wrap.style.height = "auto";
  const wrapRect = wrap.getBoundingClientRect();
  const docRect = doc.getBoundingClientRect();
  const available = wrapRect.width;
  const natural = doc.offsetWidth;
  const scale = available < natural ? available / natural : 1;
  const preTransformLeft = docRect.left - wrapRect.left;
  const desiredLeft = (available - natural * scale) / 2;
  const translateX = desiredLeft - preTransformLeft;
  doc.style.transformOrigin = "top left";
  doc.style.transform = `translateX(${translateX}px) scale(${scale})`;
  wrap.style.height = (doc.offsetHeight * scale) + "px";
  doc.offsetHeight;
  doc.style.transition = prevTransition;
}

window.addEventListener("resize", () => {
  clearTimeout(window._fitInvoicePreviewTimer);
  window._fitInvoicePreviewTimer = setTimeout(fitInvoicePreviewToContainer, 150);
});

/* Same html2canvas+jsPDF direct-download approach as quote-render.js's
   downloadQuotePdf — see that function's comment for why (no browser
   print dialog). */
async function downloadInvoicePdf(filenameHint) {
  const wrap = document.getElementById("invoice-preview");
  const doc = wrap && wrap.querySelector(".invoice-doc");
  if (!doc) return;
  if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) {
    window.print();
    return;
  }
  const prevTransform = doc.style.transform;
  const prevTransition = doc.style.transition;
  doc.style.transition = "none";
  doc.style.transform = "none";
  await new Promise((resolve) => requestAnimationFrame(resolve));

  let canvas;
  try {
    canvas = await window.html2canvas(doc, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  } finally {
    doc.style.transform = prevTransform;
    doc.style.transition = prevTransition;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let imgW = pageW;
  let imgH = (canvas.height / canvas.width) * imgW;
  if (imgH > pageH) {
    imgW = imgW * (pageH / imgH);
    imgH = pageH;
  }
  const x = (pageW - imgW) / 2;
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, 0, imgW, imgH);
  pdf.save(`${filenameHint || "מסמך"}.pdf`);
}
