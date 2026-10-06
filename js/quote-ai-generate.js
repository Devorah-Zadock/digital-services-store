/* Quote "מה אתם צריכים להכין?" — free-text-first entry for a NEW quote
   (DeskKit redesign). One short free-text description -> one AI call
   to the SAME generate-quote edge function and SAME normalized
   {eventName, description, price, vatNote} shape the in-Shell "יצירת
   טיוטה אוטומטית" button already uses (js/quote-builder-shell.js) ->
   a fresh quoteEventState opened directly in the Builder-Shell,
   already filled in. Reuses the existing, already-saved business
   profile (currentProfile) exactly as every manually-built quote
   already does — this screen only ever decides the EVENT fields, same
   division of responsibility as the in-Shell version.

   Never invents recipient/client details or event dates — those name
   a real third party / real logistics the AI has no way to know, so
   they're left for the user to fill in on the canvas after the draft
   opens (see supabase/functions/generate-quote's own header comment
   for the same rule server-side).

   A plain "start from a blank form" fallback is always one click away
   (#qa-intro-skip) — nothing about the existing manual flow is
   removed, this is a new first screen in front of it. */

async function dkQuoteCallGenerate(description) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) { location.href = "account.html?redirect=" + encodeURIComponent("quote-app.html"); return null; }
  const res = await fetch(SUPABASE_URL + "/functions/v1/generate-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ description, businessName: currentProfile && currentProfile.business_name }),
  });
  return res.json();
}

function dkQuoteIntroNote(html) {
  const note = document.getElementById("qa-intro-note");
  if (note) note.innerHTML = html;
}

// Visible, zero-AI style choice on this same first screen — a real gap
// before this: a new quote always silently opened as QUOTE_TEMPLATE_DEFAULT
// ("classic") with no way to tell that was even a choice. Only 4 real
// styles exist (QUOTE_TEMPLATES, js/quote-render.js) and they already map
// 1:1 onto a style+category description each, so a direct pick list here
// is the right-sized answer — no multi-question flow needed the way CV's
// 15-slug/7-field space needed one (js/cv-style-picker.js).
let dkQuoteIntroStyle = QUOTE_TEMPLATE_DEFAULT;

function dkQuoteIntroRenderStyleRow() {
  const row = document.getElementById("qa-intro-style-row");
  if (!row) return;
  // Reuses .dk-style-chip/.dk-style-grid — the same visual-chip pattern
  // the Site Wizard already uses for its own style choice — rather than
  // a one-off look just for this row.
  row.innerHTML = Object.entries(QUOTE_TEMPLATES).map(([slug, t]) => `
    <button type="button" class="dk-style-chip${slug === dkQuoteIntroStyle ? " selected" : ""}" data-style="${slug}" title="${escapeHtmlQ(t.desc)}">
      <span>${escapeHtmlQ(t.label)}</span>
    </button>
  `).join("");
  row.querySelectorAll("[data-style]").forEach((btn) => {
    btn.addEventListener("click", () => {
      dkQuoteIntroStyle = btn.dataset.style;
      dkQuoteIntroRenderStyleRow();
    });
  });
}

function dkShowQuoteIntro() {
  showSection("qa-intro");
  dkQuoteIntroNote("");
  const input = document.getElementById("qa-intro-input");
  if (input) input.value = "";
  dkQuoteIntroStyle = QUOTE_TEMPLATE_DEFAULT;
  dkQuoteIntroRenderStyleRow();
  const panel = document.getElementById("qa-intro-ai-panel");
  if (panel) panel.hidden = true;
  const toggle = document.getElementById("qa-intro-ai-toggle");
  if (toggle) toggle.textContent = "או, תנו ל-AI לנסח עבורכם טיוטה ראשונית ✨";
}

async function dkQuoteIntroSubmit() {
  const btn = document.getElementById("qa-intro-cta");
  const input = document.getElementById("qa-intro-input");
  if (!btn || !input) return;
  const description = input.value.trim();
  if (!description) {
    dkQuoteIntroNote("תארו קודם במשפט אחד מה אתם רוצים להציע — אז DeskKit תכין טיוטה ראשונית.");
    return;
  }
  dkQuoteIntroNote("");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "יוצר טיוטה...";
  try {
    const data = await dkQuoteCallGenerate(description);
    if (!data) return; // redirected to login
    if (data.error) { dkQuoteIntroNote(data.error); return; }
    if (data.limitReached) {
      dkQuoteIntroNote(data.isPro
        ? "הגעתם למכסת השימוש ההוגן היומית ביצירת טיוטה אוטומטית. אפשר להמשיך מחר."
        : 'הגעת למכסת הניסיונות החינמיים ביצירת טיוטה אוטומטית. רוצה להמשיך ללא הגבלה? שדרג לגרסת Pro בתשלום חד-פעמי! <a href="#">שדרוג ל-Pro</a>');
      return;
    }
    const state = emptyQuoteEventState();
    state.template = dkQuoteIntroStyle;
    const q = data.quote || {};
    if (q.eventName) state.eventName = q.eventName;
    if (q.description) state.description = q.description;
    if (q.price) state.price = q.price;
    if (q.vatNote) state.vatNote = q.vatNote;
    showQuoteBuilder(state);
    if (typeof quoteBshellActivate === "function") quoteBshellActivate();
  } catch (err) {
    dkQuoteIntroNote("יצירת הטיוטה נכשלה, נסו שוב.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cta = document.getElementById("qa-intro-cta");
  if (cta) cta.addEventListener("click", dkQuoteIntroSubmit);

  // Primary path: straight into the builder with the chosen style, no AI
  // call at all — the AI draft is now the secondary, opt-in option below
  // (see #qa-intro-ai-toggle), not the default gate every new quote used
  // to go through. Real user feedback: unwanted AI-spend risk, and no
  // real need for AI here when 4 real styles already cover the choice.
  const startBtn = document.getElementById("qa-intro-start-btn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      pendingTemplate = dkQuoteIntroStyle;
      showQuoteBuilder();
      if (typeof quoteBshellActivate === "function") quoteBshellActivate();
    });
  }

  const aiToggle = document.getElementById("qa-intro-ai-toggle");
  const aiPanel = document.getElementById("qa-intro-ai-panel");
  if (aiToggle && aiPanel) {
    aiToggle.addEventListener("click", () => {
      aiPanel.hidden = !aiPanel.hidden;
      aiToggle.textContent = aiPanel.hidden
        ? "או, תנו ל-AI לנסח עבורכם טיוטה ראשונית ✨"
        : "הסתירו ✕";
    });
  }
});
