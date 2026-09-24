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

const CV_LOCAL_KEY_PREFIX = "deskkit_cv_local_";
const CV_LAST_SLUG_KEY = "deskkit_cv_last_slug";
function cvLocalKey(slug) { return CV_LOCAL_KEY_PREFIX + (slug || ""); }

/* Autosave to this browser alone, independent of any account — closing
   the tab (or a crash) used to lose everything typed since the last
   explicit cloud save, and cloud save itself only ever happens once
   someone's signed in. Called from renderPreview() in builder.js, the
   same "one hook point catches every edit" trick site-builder.js's own
   saveSiteState() already uses, rather than needing every individual
   input handler across this whole form to know about saving. */
function saveCvLocalState() {
  if (!state.content) return;
  try {
    const snapshot = {
      slug: state.slug, lang: state.lang, fontId: state.fontId, content: state.content,
      color: document.getElementById("color-picker").value,
      textColor: document.getElementById("text-color-picker").value,
    };
    localStorage.setItem(cvLocalKey(state.slug), JSON.stringify(snapshot));
    localStorage.setItem(CV_LAST_SLUG_KEY, state.slug);
  } catch (err) { /* storage unavailable — not fatal, just won't persist */ }
}

/* Pass a slug to load THAT template's own local draft only (never falls
   back to a different one — picking a different template from the
   catalog must actually start that template, not silently resurrect an
   old draft of some other one); pass nothing to resume whichever
   template was last active. Mirrors site-builder.js's loadSiteState(). */
function loadCvLocalState(slug) {
  try {
    const key = slug ? cvLocalKey(slug) : cvLocalKey(localStorage.getItem(CV_LAST_SLUG_KEY));
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.content && CV_TEMPLATES[parsed.slug]) return parsed;
  } catch (err) { /* corrupt/old data — ignore and start fresh */ }
  return null;
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
      logUsageEvent("cv", state.slug, "edit");
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const btn = document.getElementById("cv-save-btn");
  const status = document.getElementById("cv-save-status");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!cvCurrentUserId) { if (typeof openAuthPrompt === "function") openAuthPrompt(); return; }
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
