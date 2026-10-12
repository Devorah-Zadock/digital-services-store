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
   already are in showInvoiceBuilder() for a blank draft.

   The AI draft is a secondary, opt-in option behind #ia-intro-ai-toggle
   — #ia-intro-start-btn (straight into the builder, no AI) is the
   primary action now, mirroring js/quote-ai-generate.js's own
   #qa-intro-start-btn and for the same reason: real feedback against
   AI being the default gate here. */

async function dkInvoiceCallGenerate(description) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("invoice-app.html"); return null; }
  const res = await fetch(SUPABASE_URL + "/functions/v1/generate-invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ lang: (typeof currentLang === "function" ? currentLang() : "he"), description, businessName: currentInvoiceProfile && currentInvoiceProfile.business_name }),
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
  const panel = document.getElementById("ia-intro-ai-panel");
  if (panel) panel.hidden = true;
  const toggle = document.getElementById("ia-intro-ai-toggle");
  if (toggle) toggle.textContent = dkL("או, תנו ל-AI לנסח עבורכם שורות טיוטה ✨", "Or, let AI draft the line items for you ✨");
}

async function dkInvoiceIntroSubmit() {
  const btn = document.getElementById("ia-intro-cta");
  const input = document.getElementById("ia-intro-input");
  if (!btn || !input) return;
  const description = input.value.trim();
  if (!description) {
    dkInvoiceIntroNote(dkL("תארו קודם במשפט אחד מה מחויב — אז DeskKit תכין שורות טיוטה ראשוניות.", "First describe in one sentence what is being billed — then DeskKit will prepare first draft lines."));
    return;
  }
  dkInvoiceIntroNote("");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = dkL("יוצר טיוטה...", "Creating draft...");
  try {
    const data = await dkInvoiceCallGenerate(description);
    if (!data) return; // redirected to login
    if (data.error) { dkInvoiceIntroNote(data.error); return; }
    if (data.limitReached) {
      dkInvoiceIntroNote(data.isPro
        ? dkL("הגעתם למכסת השימוש ההוגן היומית ביצירת טיוטה אוטומטית. אפשר להמשיך מחר.", "You've reached today's fair-use limit for automatic drafts. You can continue tomorrow.")
        : dkL('הגעת למכסת הניסיונות החינמיים ביצירת טיוטה אוטומטית. רוצה להמשיך ללא הגבלה? שדרג לגרסת Pro בתשלום חד-פעמי! <a href="#">שדרוג ל-Pro</a>', 'You\'ve used your free automatic-draft tries. Want to continue without limits? Upgrade to Pro with a one-time payment! <a href="#">Upgrade to Pro</a>'));
      return;
    }
    const items = (data.invoice && Array.isArray(data.invoice.items)) ? data.invoice.items : [];
    showInvoiceBuilder();
    if (items.length) invoiceEventState.items = items;
    renderInvoiceFormIA();
    renderInvoicePreviewIA();
    if (typeof invoiceBshellActivate === "function") invoiceBshellActivate();
  } catch (err) {
    dkInvoiceIntroNote(dkL("יצירת הטיוטה נכשלה, נסו שוב.", "Creating the draft failed, please try again."));
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cta = document.getElementById("ia-intro-cta");
  if (cta) cta.addEventListener("click", dkInvoiceIntroSubmit);

  // Primary path: straight into the builder, no AI call — mirrors
  // js/quote-ai-generate.js's #qa-intro-start-btn (same reasoning:
  // real feedback against AI being the default gate on these intro
  // screens).
  const startBtn = document.getElementById("ia-intro-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      showInvoiceBuilder();
      if (typeof invoiceBshellActivate === "function") invoiceBshellActivate();
    });
  }

  const aiToggle = document.getElementById("ia-intro-ai-toggle");
  const aiPanel = document.getElementById("ia-intro-ai-panel");
  if (aiToggle && aiPanel) {
    aiToggle.addEventListener("click", () => {
      aiPanel.hidden = !aiPanel.hidden;
      aiToggle.textContent = aiPanel.hidden
        ? dkL("או, תנו ל-AI לנסח עבורכם שורות טיוטה ✨", "Or, let AI draft the line items for you ✨")
        : dkL("הסתירו ✕", "Hide ✕");
    });
  }
});
