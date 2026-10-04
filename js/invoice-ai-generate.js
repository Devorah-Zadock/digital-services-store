/* Invoice "מה אתם צריכים לחייב?" — free-text-first entry for a NEW
   document (DeskKit redesign). Mirrors js/quote-ai-generate.js exactly,
   at invoice scale: one free-text description -> the SAME
   generate-invoice edge function and SAME normalized {items} shape
   the in-Shell "יצירת טיוטה אוטומטית" button already uses
   (js/invoice-builder-shell.js) -> a fresh invoiceEventState opened
   directly in the Builder-Shell.

   Only ever drafts items[] — never recipientName/recipientId/
   recipientAddress (a real third party the AI has no way to know, see
   supabase/functions/generate-invoice's own header comment), and
   docType/business_type-driven title are decided exactly as they
   already are in showInvoiceBuilder() for a blank draft. A plain
   "start from a blank form" fallback (#ia-intro-skip) stays one click
   away. */

async function dkInvoiceCallGenerate(description) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("invoice-app.html"); return null; }
  const res = await fetch(SUPABASE_URL + "/functions/v1/generate-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ description, businessName: currentInvoiceProfile && currentInvoiceProfile.business_name }),
  });
  return res.json();
}

function dkInvoiceIntroNote(html) {
  const note = document.getElementById("ia-intro-note");
  if (note) note.innerHTML = html;
}

function dkShowInvoiceIntro() {
  showInvoiceSection("ia-intro");
  dkInvoiceIntroNote("");
  const input = document.getElementById("ia-intro-input");
  if (input) input.value = "";
}

async function dkInvoiceIntroSubmit() {
  const btn = document.getElementById("ia-intro-cta");
  const input = document.getElementById("ia-intro-input");
  if (!btn || !input) return;
  const description = input.value.trim();
  if (!description) {
    dkInvoiceIntroNote("תארו קודם במשפט אחד מה מחויב — אז DeskKit תכין שורות טיוטה ראשוניות.");
    return;
  }
  dkInvoiceIntroNote("");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "יוצר טיוטה...";
  try {
    const data = await dkInvoiceCallGenerate(description);
    if (!data) return; // redirected to login
    if (data.error) { dkInvoiceIntroNote(data.error); return; }
    if (data.limitReached) {
      dkInvoiceIntroNote(data.isPro
        ? "הגעתם למכסת השימוש ההוגן היומית ביצירת טיוטה אוטומטית. אפשר להמשיך מחר."
        : 'הגעת למכסת הניסיונות החינמיים ביצירת טיוטה אוטומטית. רוצה להמשיך ללא הגבלה? שדרג לגרסת Pro בתשלום חד-פעמי! <a href="#">שדרוג ל-Pro</a>');
      return;
    }
    const items = (data.invoice && Array.isArray(data.invoice.items)) ? data.invoice.items : [];
    showInvoiceBuilder();
    if (items.length) invoiceEventState.items = items;
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
    if (typeof invoiceBshellActivate === "function") invoiceBshellActivate();
  } catch (err) {
    dkInvoiceIntroNote("יצירת הטיוטה נכשלה, נסו שוב.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cta = document.getElementById("ia-intro-cta");
  if (cta) cta.addEventListener("click", dkInvoiceIntroSubmit);
  const skip = document.getElementById("ia-intro-skip");
  if (skip) {
    skip.addEventListener("click", () => {
      showInvoiceBuilder();
      if (typeof invoiceBshellActivate === "function") invoiceBshellActivate();
    });
  }
});
