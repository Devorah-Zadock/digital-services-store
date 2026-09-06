/* Saves the CV builder's state to the signed-in user's account (cv_saves
   table) and restores it on load instead of starting from the default
   template — so it's the same CV from any device. Explicit-save only:
   nothing here runs on every edit, only when #cv-save-btn is clicked —
   editing a CV (or just looking at one) was silently creating/overwriting
   a save before a person ever chose to keep anything. */

let cvCurrentUserId = null;

async function saveCvNow() {
  if (!cvCurrentUserId || !state.content) return;
  const snapshot = {
    slug: state.slug,
    lang: state.lang,
    fontId: state.fontId,
    content: state.content,
    color: document.getElementById("color-picker").value,
    textColor: document.getElementById("text-color-picker").value,
  };
  await supabaseClient.from("cv_saves").upsert({ user_id: cvCurrentUserId, data: snapshot, updated_at: new Date().toISOString() });
}

function applyCvSnapshot(snap) {
  state.slug = snap.slug;
  state.lang = snap.lang || "he";
  state.fontId = snap.fontId || "assistant";
  state.content = snap.content;
  document.getElementById("color-picker").value = snap.color || "#1F5C4E";
  document.getElementById("text-color-picker").value = snap.textColor || "#222222";
  document.getElementById("font-select").value = state.fontId;
  document.getElementById("tpl-select").value = state.slug;
  document.querySelectorAll(".lang-big").forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
  renderForm();
  renderPreview();
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      cvCurrentUserId = user.id;
      const { data: row } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
      // Only resume the saved CV if nothing more specific was asked for —
      // a plain builder.html link (nav, "my content" rail) means "continue
      // where I left off", same as the saved template. But a catalog card
      // for a DIFFERENT template links to builder.html?template=<slug>,
      // and builder.js's own DOMContentLoaded handler already loaded that
      // exact template fresh (synchronously, before this async check
      // resolves) — restoring the old save on top of it here silently
      // discarded that choice and made "pick a different template" not
      // actually work.
      const urlTemplate = new URLSearchParams(location.search).get("template");
      if (row && row.data && row.data.content && (!urlTemplate || urlTemplate === row.data.slug)) {
        applyCvSnapshot(row.data);
      }
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const btn = document.getElementById("cv-save-btn");
  const status = document.getElementById("cv-save-status");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!cvCurrentUserId) { window.location.href = "account.html?redirect=builder.html"; return; }
      btn.disabled = true;
      await saveCvNow();
      btn.disabled = false;
      status.textContent = "נשמר ✓";
      status.classList.add("ok");
      if (window.refreshMyPanel) window.refreshMyPanel();
      setTimeout(() => { status.textContent = ""; status.classList.remove("ok"); }, 2500);
    });
  }
});
