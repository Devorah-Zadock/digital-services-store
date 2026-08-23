/* Renders a price-quote letter as an HTML string, mirroring the real
   template supplied by the user (letterhead, horizontal rule, body,
   signature). Shared by the live preview and the print/PDF output. */
function escapeHtmlQ(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Fallback VAT rate (%) used only if the business owner leaves the VAT-rate
   field empty or invalid. The real rate is editable in the builder, since
   Israel's VAT rate can change over time. */
const QUOTE_DEFAULT_VAT_RATE = 18;

function parseILS(s) {
  const n = parseFloat(String(s || "").replace(/,/g, "").trim());
  return isNaN(n) ? null : n;
}
function formatILS(n) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const QUOTE_CSS = `
  .quote-doc { font-family: 'Heebo', Arial, sans-serif; background:#fff; color:#1E1E1E; width:794px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.12); padding:50px 56px; overflow-wrap:break-word; }
  .quote-doc .bsd { font-size:12px; color:#6B6B6B; margin-bottom:6px; }
  .quote-doc .letterhead { text-align:center; margin-bottom:18px; }
  .quote-doc .biz-name { font-size:20px; font-weight:700; color:#163F35; margin-bottom:4px; }
  .quote-doc .tagline { font-size:12.5px; color:#444; line-height:1.5; }
  .quote-doc .contact-line { font-size:11.5px; color:#6B6B6B; margin-top:8px; }
  .quote-doc hr { border:none; border-top:1.5px solid #163F35; margin:18px 0 26px; }
  .quote-doc .date-row { text-align:end; font-size:13px; color:#333; margin-bottom:18px; }
  .quote-doc .recipient { font-size:14.5px; font-weight:700; margin-bottom:14px; }
  .quote-doc .greeting { font-size:14px; margin-bottom:16px; }
  .quote-doc .subject { font-size:14.5px; font-weight:700; margin-bottom:8px; }
  .quote-doc .dates-list { margin:0 0 16px; padding-inline-start:22px; }
  .quote-doc .dates-list li { font-size:14px; margin-bottom:4px; }
  .quote-doc .description { font-size:14px; line-height:1.7; margin-bottom:18px; }
  .quote-doc .price-line { font-size:15px; font-weight:700; margin-bottom:4px; }
  .quote-doc .vat-note { font-size:12.5px; color:#6B6B6B; margin-bottom:18px; }
  .quote-doc .police-note { font-size:13px; margin-bottom:30px; }
  .quote-doc .signature { font-size:14px; line-height:1.8; }
  .quote-doc .signature .signer { font-weight:700; }
  .quote-doc .footer-note { font-size:12px; color:#6B6B6B; margin-top:24px; border-top:1px solid #eee; padding-top:14px; }
`;

function renderQuoteHtml(q) {
  const validDates = (q.eventDates || []).filter(Boolean);
  const isMulti = validDates.length > 1;

  const subjectHtml = isMulti
    ? `<div class="subject">הצעת מחיר ל${escapeHtmlQ(q.eventName)} בתאריכים:</div>
       <ul class="dates-list">${validDates.map((d) => `<li>${escapeHtmlQ(d)}</li>`).join("")}</ul>`
    : `<div class="subject">הצעת מחיר ל${escapeHtmlQ(q.eventName)}${validDates.length === 1 ? ` בתאריך ${escapeHtmlQ(validDates[0])}` : ""}</div>`;

  const priceLabel = isMulti ? "מחיר לכל אירוע" : "מחיר";
  const priceNum = parseILS(q.price);
  const hasVatNote = String(q.vatNote || "").trim().length > 0;
  const vatRateNum = parseFloat(String(q.vatRate ?? "").replace(/,/g, "").trim());
  const vatRatePct = isNaN(vatRateNum) ? QUOTE_DEFAULT_VAT_RATE : vatRateNum;
  // Two mutually exclusive states: either the note says the price excludes
  // VAT (as typed), or — if that note is cleared — show the calculated
  // VAT-inclusive price instead, using the editable VAT-rate field. Never
  // both, never neither.
  const vatLineHtml = hasVatNote
    ? `<div class="vat-note">${escapeHtmlQ(q.vatNote)}</div>`
    : (priceNum !== null
        ? `<div class="vat-note">מע"מ: ${vatRatePct}%</div>
           <div class="price-line vat-inclusive">מחיר כולל מע"מ: ${formatILS(priceNum * (1 + vatRatePct / 100))} ₪.</div>`
        : "");

  return `
  <style>${QUOTE_CSS}</style>
  <div class="quote-doc" dir="rtl">
    <div class="bsd">בס"ד</div>
    <div class="letterhead">
      <div class="biz-name">${escapeHtmlQ(q.businessName)}</div>
      <div class="tagline">${escapeHtmlQ(q.tagline1)}</div>
      <div class="tagline">${escapeHtmlQ(q.tagline2)}</div>
      <div class="contact-line">${escapeHtmlQ(q.email)} &nbsp;&nbsp;•&nbsp;&nbsp; ${escapeHtmlQ(q.businessNumber)}</div>
    </div>
    <hr>
    <div class="date-row">${escapeHtmlQ(q.today)}</div>
    <div class="recipient">לכבוד ${escapeHtmlQ(q.recipient)}</div>
    <div class="greeting">שלום רב,</div>
    ${subjectHtml}
    <div class="description">${escapeHtmlQ(q.description)}</div>
    <div class="price-line">${priceLabel}: ${escapeHtmlQ(q.price)} ₪.</div>
    ${vatLineHtml}
    <div class="police-note">${escapeHtmlQ(q.policeNote)}</div>
    <div class="signature">
      בברכה,<br>
      <span class="signer">${escapeHtmlQ(q.signerName)}</span><br>
      ${escapeHtmlQ(q.phone)}
    </div>
    <div class="footer-note">נא לאשר בפקס: ${escapeHtmlQ(q.fax)} &nbsp;&nbsp;או במייל חוזר</div>
  </div>`;
}
