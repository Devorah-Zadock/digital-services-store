/* Auto-saves the CV builder's state to the signed-in user's account
   (cv_saves table) and restores it on load instead of starting from
   the default template — so it's the same CV from any device.
   Hooks into renderPreview(), which builder.js already calls after
   every single edit, so no per-field wiring is needed here. */

let cvCurrentUserId = null;
let cvSaveTimer = null;

function scheduleCvSave() {
  if (!cvCurrentUserId) return;
  clearTimeout(cvSaveTimer);
  cvSaveTimer = setTimeout(saveCvNow, 1200);
}

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
      if (row && row.data && row.data.content) applyCvSnapshot(row.data);
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });
});
