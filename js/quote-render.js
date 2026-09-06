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
  .quote-doc .letterhead-logo { max-height:64px; max-width:220px; margin:0 auto 10px; display:block; }
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
      ${q.logoUrl ? `<img class="letterhead-logo" src="${escapeHtmlQ(q.logoUrl)}" alt="">` : ""}
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

/* .quote-doc is always rendered at its true fixed A4-ish width (794px) so
   the letter's proportions exactly match the printed PDF. On any narrower
   preview column — which is most of the time, since the wizard's form
   panel already claims real estate — the fixed-width box overflowed its
   shrunk grid column with no bound on the overflow, which in this RTL
   layout bled out past the browser's left edge instead of the right,
   reading as "the page is cut off". Scaling it down visually (same
   technique as the CV builder's fitPreviewToContainer) keeps the whole
   letter in view and legible instead. The print stylesheet resets this
   transform, so exported/printed output is never affected. Shared by
   both quote-app.js and quote-builder.js, which each call this right
   after setting #quote-preview's innerHTML. */
function fitQuotePreviewToContainer() {
  const wrap = document.getElementById("quote-preview");
  const doc = wrap && wrap.querySelector(".quote-doc");
  if (!doc) return;
  // Every keystroke replaces #quote-preview's innerHTML wholesale (see
  // renderQuotePreviewQA), so this runs on every single character typed —
  // and .quote-doc has a CSS transition on `transform` for the resize case
  // below. Resetting to transform:none and then immediately reading its
  // layout (getBoundingClientRect, needed to measure the natural size)
  // forces a reflow that locks that untransformed "full size" in as the
  // transition's start point — so every keystroke visibly flashed to full
  // size and animated back down instead of just quietly rescaling. Turning
  // the transition off for this reset-measure-reapply sequence, then
  // restoring it only after the final transform is already committed,
  // keeps the animation for real changes (like a window resize) without
  // it firing on every keystroke.
  const prevTransition = doc.style.transition;
  doc.style.transition = "none";
  doc.style.transform = "none";
  doc.style.margin = "0";
  wrap.style.height = "auto";
  const wrapRect = wrap.getBoundingClientRect();
  const docRect = doc.getBoundingClientRect(); // natural, pre-transform position
  const available = wrapRect.width;
  const natural = doc.offsetWidth;
  const scale = available < natural ? available / natural : 1;
  // Measure rather than assume where the browser naturally places an
  // over-width block in this RTL container (it doesn't reliably sit flush
  // at the container's own start edge), then compute the exact shift
  // needed to land it centered after scaling.
  const preTransformLeft = docRect.left - wrapRect.left;
  const desiredLeft = (available - natural * scale) / 2;
  const translateX = desiredLeft - preTransformLeft;
  doc.style.transformOrigin = "top left";
  doc.style.transform = `translateX(${translateX}px) scale(${scale})`;
  wrap.style.height = (doc.offsetHeight * scale) + "px";
  doc.offsetHeight; // commit the no-transition transform before restoring it
  doc.style.transition = prevTransition;
}

window.addEventListener("resize", () => {
  clearTimeout(window._fitQuotePreviewTimer);
  window._fitQuotePreviewTimer = setTimeout(fitQuotePreviewToContainer, 150);
});
