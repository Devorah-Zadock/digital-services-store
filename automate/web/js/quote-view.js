/* q.html — a client opens a quote sent through DeskKit and approves or
   declines it. The token in the link is the only key (quote-public). */
(function () {
  "use strict";
  const token = new URLSearchParams(location.search).get("t") || "";
  const $ = (id) => document.getElementById(id);
  // The page follows the quote's own language (an English quote → an English
  // page); before the quote loads, the visitor's browser language.
  let EN = !/^he\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || "he");
  const L = (he, en) => (EN ? en : he);
  const STATUS = () => ({
    approved: ["ok", L("ההצעה אושרה ✓ תודה! העסק קיבל עדכון ויחזור אלייך.", "Quote approved ✓ Thank you! The business has been notified and will get back to you.")],
    declined: ["no", L("ההצעה סומנה כלא מתאימה. תודה על העדכון.", "The quote was marked as not suitable. Thanks for letting us know.")],
    cancelled: ["info", L("ההצעה בוטלה על ידי העסק.", "The business cancelled this quote.")],
    expired: ["info", L("תוקף ההצעה הסתיים. אפשר לפנות לעסק לקבלת הצעה מעודכנת.", "This quote has expired. You can contact the business for an updated quote.")],
  });
  function applyChrome() {
    document.documentElement.lang = EN ? "en" : "he";
    document.documentElement.dir = EN ? "ltr" : "rtl";
    const set = (sel, he, en) => { const el = document.querySelector(sel); if (el) el.textContent = L(he, en); };
    set(".qv-decide h2", "מה דעתך?", "What do you think?");
    set('label[for="qv-name"]', "שם מלא (לאישור)", "Full name (to approve)");
    set('label[for="qv-note"]', "הערה (לא חובה)", "Note (optional)");
    set("#qv-yes", "✓ מאשר/ת את ההצעה", "✓ I approve the quote");
    set("#qv-no", "לא מתאים לי", "Not for me");
    set(".qv-foot", "נשלח באמצעות DeskKit", "Sent via DeskKit");
    set("#qv-title", "הצעת מחיר", "Quote");
    document.title = L("הצעת מחיר", "Quote");
  }
  async function call(action, extra) {
    const res = await fetch(SUPABASE_URL + "/functions/v1/quote-public", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, action, ...(extra || {}) }),
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  }
  function show(d) {
    EN = !!(d.quote && d.quote.lang === "en");
    applyChrome();
    $("qv-title").textContent = d.title ? L("הצעת מחיר: ", "Quote: ") + d.title : L("הצעת מחיר", "Quote");
    $("qv-biz").textContent = d.business ? L("מאת ", "From ") + d.business : "";
    document.title = $("qv-title").textContent;
    // The quote renders exactly as the business built it (escaped by renderQuoteHtml).
    $("qv-doc").innerHTML = typeof renderQuoteHtml === "function" ? renderQuoteHtml(d.quote || {}) : "";
    const st = STATUS()[d.status];
    if (st) { $("qv-status").className = "qv-status " + st[0]; $("qv-status").textContent = st[1]; $("qv-status").hidden = false; }
    $("qv-decide").hidden = d.status !== "sent";
    if (d.status === "sent" && d.client_name) $("qv-name").value = d.client_name;
  }
  async function decide(action) {
    $("qv-err").textContent = "";
    if (action === "approve" && !$("qv-name").value.trim()) { $("qv-err").textContent = L("נא למלא שם לאישור.", "Please enter your name to approve."); return; }
    $("qv-yes").disabled = $("qv-no").disabled = true;
    const r = await call(action, { name: $("qv-name").value, note: $("qv-note").value });
    if (r.ok) show(r.data);
    else if (r.status === 409) { const g = await call("get"); if (g.ok) show(g.data); }
    else { $("qv-err").textContent = L("משהו השתבש. נסו שוב בעוד רגע.", "Something went wrong. Please try again in a moment."); $("qv-yes").disabled = $("qv-no").disabled = false; }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    if (!/^[0-9a-f]{48}$/.test(token)) { applyChrome(); $("qv-doc").textContent = L("הקישור לא תקין.", "This link is not valid."); return; }
    const r = await call("get");
    if (!r.ok) { applyChrome(); $("qv-doc").textContent = L("ההצעה לא נמצאה. ייתכן שהקישור הועתק חלקית.", "Quote not found. The link may have been copied only partly."); return; }
    show(r.data);
    $("qv-yes").onclick = () => decide("approve");
    $("qv-no").onclick = () => decide("decline");
  });
})();
