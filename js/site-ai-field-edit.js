/* AI field editing inside the site Builder (architecture plan, Phase 6)
   — a small "✨ שפר עם AI" button next to a field, same shape as
   js/ai-writer.js's CV summary button and sharing its exact Edge
   Function (ai-rewrite, generalized to accept more field kinds — see
   that function's own header comment). ONE generic handler for every
   field this wires to, keyed by data-ai-field/data-ai-input, rather
   than a copy of ai-writer.js's single-field function per field.

   On success, the rewritten text is written into the field and the
   SAME native "input" event the user's own typing already fires is
   dispatched on it — site-builder.js's existing wireForm() listeners
   (already wired, not touched by this file) pick it up exactly like a
   keystroke: siteState.data is updated, the live-patch/save path runs,
   and nothing else changes. This is also what guarantees scope: there
   is no code path here that touches services/colors/layout/sections —
   only the one input this button sits next to. */

async function siteAiFieldImprove(btn) {
  const fieldKind = btn.dataset.aiField;
  const input = document.getElementById(btn.dataset.aiInput);
  if (!input) return;

  const text = input.value.trim();
  const noteHost = btn.closest(".field");
  const existingNote = noteHost && noteHost.querySelector(".ai-limit-note");
  if (existingNote) existingNote.remove();

  if (!text) {
    if (noteHost) {
      const note = document.createElement("div");
      note.className = "ai-limit-note";
      note.textContent = "צריך לכתוב קודם טיוטה — אז AI יעזור לשפר אותה.";
      noteHost.appendChild(note);
    }
    return;
  }

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
      body: JSON.stringify({ field: fieldKind, text, title: siteState.data.businessName, lang: "he" }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "שגיאה לא צפויה");

    if (data.limitReached) {
      if (noteHost) {
        const note = document.createElement("div");
        note.className = "ai-limit-note";
        note.innerHTML = data.isPro
          ? "הגעת למכסת השימוש ההוגן היומית. אפשר להמשיך מחר."
          : "הגעת למכסת הניסיונות החינמיים לשיפור טקסט עם AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!";
        noteHost.appendChild(note);
      }
      return;
    }

    // The field's own maxlength only blocks manual typing, not a
    // programmatic .value assignment — clamped here so an AI result can
    // never exceed the exact same limit the user's own typing is held to.
    const maxLen = input.maxLength;
    input.value = (maxLen > 0) ? data.improved.slice(0, maxLen) : data.improved;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } catch (err) {
    console.error("AI field edit failed:", err);
    if (noteHost) {
      const note = document.createElement("div");
      note.className = "ai-limit-note";
      note.textContent = "משהו השתבש בשיפור הטקסט. אפשר לנסות שוב בעוד רגע.";
      noteHost.appendChild(note);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-ai-field][data-ai-input]").forEach((btn) => {
    btn.addEventListener("click", () => siteAiFieldImprove(btn));
  });
});
