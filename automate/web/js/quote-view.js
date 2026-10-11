/* q.html — a client opens a quote sent through DeskKit and approves or
   declines it. The token in the link is the only key (quote-public). */
(function () {
  "use strict";
  const token = new URLSearchParams(location.search).get("t") || "";
  const $ = (id) => document.getElementById(id);
  const STATUS = {
    approved: ["ok", "ההצעה אושרה ✓ תודה! העסק קיבל עדכון ויחזור אלייך."],
    declined: ["no", "ההצעה סומנה כלא מתאימה. תודה על העדכון."],
    cancelled: ["info", "ההצעה בוטלה על ידי העסק."],
    expired: ["info", "תוקף ההצעה הסתיים. אפשר לפנות לעסק לקבלת הצעה מעודכנת."],
  };
  async function call(action, extra) {
    const res = await fetch(SUPABASE_URL + "/functions/v1/quote-public", {
      method: "POST", headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ token, action, ...(extra || {}) }),
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
  }
  function show(d) {
    $("qv-title").textContent = d.title ? "הצעת מחיר: " + d.title : "הצעת מחיר";
    $("qv-biz").textContent = d.business ? "מאת " + d.business : "";
    document.title = $("qv-title").textContent;
    // The quote renders exactly as the business built it (escaped by renderQuoteHtml).
    $("qv-doc").innerHTML = typeof renderQuoteHtml === "function" ? renderQuoteHtml(d.quote || {}) : "";
    const st = STATUS[d.status];
    if (st) { $("qv-status").className = "qv-status " + st[0]; $("qv-status").textContent = st[1]; $("qv-status").hidden = false; }
    $("qv-decide").hidden = d.status !== "sent";
    if (d.status === "sent" && d.client_name) $("qv-name").value = d.client_name;
  }
  async function decide(action) {
    $("qv-err").textContent = "";
    if (action === "approve" && !$("qv-name").value.trim()) { $("qv-err").textContent = "נא למלא שם לאישור."; return; }
    $("qv-yes").disabled = $("qv-no").disabled = true;
    const r = await call(action, { name: $("qv-name").value, note: $("qv-note").value });
    if (r.ok) show(r.data);
    else if (r.status === 409) { const g = await call("get"); if (g.ok) show(g.data); }
    else { $("qv-err").textContent = "משהו השתבש. נסו שוב בעוד רגע."; $("qv-yes").disabled = $("qv-no").disabled = false; }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    if (!/^[0-9a-f]{48}$/.test(token)) { $("qv-doc").textContent = "הקישור לא תקין."; return; }
    const r = await call("get");
    if (!r.ok) { $("qv-doc").textContent = "ההצעה לא נמצאה. ייתכן שהקישור הועתק חלקית."; return; }
    show(r.data);
    $("qv-yes").onclick = () => decide("approve");
    $("qv-no").onclick = () => decide("decline");
  });
})();
