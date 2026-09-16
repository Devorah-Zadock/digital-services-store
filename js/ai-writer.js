/* AI writing assistant — v1 is the "✨ שפר עם AI" button next to the
   professional summary field in the CV builder: sends the current draft
   (plus the job title for context) to the ai-rewrite Edge Function and
   replaces the field with a tighter, more results-oriented version.

   Shares its cap/Pro machinery with the ATS checker (same
   customer_profiles.is_pro check, same ai_usage / ai_usage_daily
   tables — just its own "ai-rewrite" tool slug, so it gets its own
   independent 3 free attempts) but keeps its own small inline UI rather
   than a modal, since it's a single-field action, not a whole report.

   Reads `state`/`renderPreview` from builder.js and AI_UPGRADE_MESSAGE
   from ats-checker.js — all plain scripts sharing one global scope on
   builder.html, same pattern as the rest of that page's scripts. */

function aiWriterNote(html) {
  const field = document.getElementById("ai-improve-summary").closest(".field");
  let note = document.getElementById("ai-writer-note");
  if (!note) {
    note = document.createElement("div");
    note.id = "ai-writer-note";
    note.className = "ai-limit-note";
    field.appendChild(note);
  }
  note.innerHTML = html;
}

async function aiImproveSummary() {
  const btn = document.getElementById("ai-improve-summary");
  const textarea = document.getElementById("f-summary");

  const text = textarea.value.trim();
  if (!text) {
    aiWriterNote("צריך לכתוב קודם טיוטה של תקציר — אז AI יעזור לשפר אותה.");
    return;
  }
  if (!state.content) return;

  const existingNote = document.getElementById("ai-writer-note");
  if (existingNote) existingNote.remove();

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "משפר...";

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const res = await fetch(SUPABASE_URL + "/functions/v1/ai-rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ field: "summary", text, title: state.content.title, lang: state.lang }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      aiWriterNote(data.isPro
        ? "הגעת למכסת השימוש ההוגן היומית (50 שיפורים). אפשר להמשיך מחר."
        : `${AI_UPGRADE_MESSAGE} <a href="#">שדרוג ל-Pro</a>`);
      return;
    }

    textarea.value = data.improved;
    state.content.summary = data.improved;
    renderPreview();
  } catch (err) {
    aiWriterNote("משהו השתבש בשיפור התקציר. אפשר לנסות שוב בעוד רגע. (" + escapeHtmlAts(err.message || String(err)) + ")");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("ai-improve-summary");
  if (btn) btn.addEventListener("click", aiImproveSummary);
});
