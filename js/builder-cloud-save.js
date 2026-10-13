/* Saves the CV builder's state to the signed-in user's account. cv_saves
   is one row PER SAVED CV (not per user — see supabase/sql/
   cv_saves_multi.sql), same shape as quote_saves/invoice_saves/
   site_projects, so a user can have more than one CV. cvSavedId tracks
   which row this tab is editing, exactly like quoteSavedId in
   js/quote-cloud-save.js — set once the first save creates a row (or
   immediately, if js/cv-saves-router.js loaded an existing one), then
   every later save updates that same row via upsert's own id.

   Autosave (signed-in only): a few seconds after the last real edit,
   and when the tab is hidden/closed, the CV is saved to that same row —
   most people who opened the builder never pressed "שמירה" and lost
   their work. "A real edit" is measured against cvAutosaveBaseline (the
   snapshot last saved, or last loaded): just opening/looking at a CV,
   loading a template or switching language never creates or
   overwrites a save by itself. Signed-out visitors keep the local
   draft only (saveCvLocalState below). */

let cvCurrentUserId = null;
let cvSavedId = null;
// Cached from the session so the page-close save can run synchronously
// (getSession() is async, and an unloading page won't wait for it).
let cvAccessToken = null;

function cvCurrentSnapshot() {
  return {
    slug: state.slug,
    lang: state.lang,
    fontId: state.fontId,
    content: state.content,
    color: document.getElementById("color-picker").value,
    textColor: document.getElementById("text-color-picker").value,
  };
}

// Returns the Supabase error (or null on success) — confirmed-live bug
// this fixes: both callers (the legacy #cv-save-btn handler and
// cvbshellSaveNow, the Shell's real "שמירה" button) used to show
// "נשמר ✓" unconditionally, because this never surfaced whether the
// upsert actually succeeded. supabase-js never throws on a query
// error, so without checking the return value a failed save looked
// identical to a successful one.
// Saves run one at a time: an autosave still creating the row while the
// person clicks "שמירה"/"הורדת PDF" would otherwise send two inserts (no
// id yet on either) and leave two copies of the same CV in "My CVs".
let cvSaveQueue = Promise.resolve();
function saveCvNow() {
  const run = cvSaveQueue.then(cvSaveNowInner, cvSaveNowInner);
  cvSaveQueue = run.catch(() => {});
  return run;
}

async function cvSaveNowInner() {
  if (!cvCurrentUserId || !state.content) return null;
  const snapshot = cvCurrentSnapshot();
  const json = JSON.stringify(snapshot);
  const row = { user_id: cvCurrentUserId, data: snapshot, updated_at: new Date().toISOString() };
  if (cvSavedId) row.id = cvSavedId;
  const { data, error } = await supabaseClient.from("cv_saves").upsert(row).select().single();
  if (error) return error;
  cvSavedId = data.id;
  cvAutosaveBaseline = json;
  const url = new URL(location.href);
  url.searchParams.set("cv", data.id);
  url.searchParams.delete("new");
  history.replaceState(null, "", url);
  return null;
}

/* Called from js/cv-saves-router.js when the URL names a specific saved
   CV (?cv=<id>) — the .eq("user_id", userId) is what stops someone
   from loading another account's CV just by guessing an id, same
   belt-and-suspenders check the RLS policy already enforces
   server-side. Mirrors js/quote-cloud-save.js's loadQuoteById. */
async function loadCvById(id, userId) {
  const { data } = await supabaseClient.from("cv_saves").select("id, data").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  cvSavedId = data.id;
  return data.data;
}

const CV_LOCAL_KEY_PREFIX = "deskkit_cv_local_";
const CV_LAST_SLUG_KEY = "deskkit_cv_last_slug";
function cvLocalKey(key) { return CV_LOCAL_KEY_PREFIX + (key || ""); }

/* Autosave to this browser alone, independent of any account — closing
   the tab (or a crash) used to lose everything typed since the last
   explicit cloud save, and cloud save itself only ever happens once
   someone's signed in. Called from renderPreview() in builder.js, the
   same "one hook point catches every edit" trick site-builder.js's own
   saveSiteState() already uses, rather than needing every individual
   input handler across this whole form to know about saving.

   Keyed by cvSavedId once a CV has one (so two different saved CVs that
   happen to share a template slug never overwrite each other's local
   draft) — a brand-new, not-yet-saved CV still keys off its slug, the
   same transient "draft before the first save" case this always
   covered, now just superseded the moment saveCvNow() hands it a real
   id. */
function saveCvLocalState() {
  if (!state.content) return;
  try {
    const snapshot = {
      slug: state.slug, lang: state.lang, fontId: state.fontId, content: state.content,
      color: document.getElementById("color-picker").value,
      textColor: document.getElementById("text-color-picker").value,
    };
    const key = cvSavedId ? ("id:" + cvSavedId) : state.slug;
    localStorage.setItem(cvLocalKey(key), JSON.stringify(snapshot));
    if (!cvSavedId) localStorage.setItem(CV_LAST_SLUG_KEY, state.slug);
  } catch (err) { /* storage unavailable — not fatal, just won't persist */ }
  // Same "every edit passes through here" hook point, for the account.
  cvAutosaveSchedule();
}

/* ---------- Autosave to the account ---------- */

const CV_AUTOSAVE_DELAY_MS = 3000;
let cvAutosaveBaseline = null; // JSON of the snapshot last saved/loaded
let cvAutosaveTimer = null;

// One status line in the Shell's top bar, the mobile download bar and
// the old (?shell=0) top row — all show the same thing.
function cvSetSaveStatus(kind) {
  const text = {
    saving: dkL("שומר…", "Saving…"),
    saved: dkL("נשמר ✓", "Saved ✓"),
    failed: dkL("לא נשמר — נסו שוב", "Not saved — try again"),
  }[kind] || "";
  ["cvbshell-top-status", "cvbshell-mobile-status"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = "bshell-top-status" + (text ? " " + kind : "");
  });
  const old = document.getElementById("cv-save-status");
  if (old) { old.textContent = text; old.classList.toggle("ok", kind === "saved"); }
}

// Whatever is on screen now counts as "already saved" — called after
// loading a CV (or a fresh template), so loading alone never saves.
function cvAutosaveResetBaseline() {
  clearTimeout(cvAutosaveTimer);
  cvAutosaveTimer = null;
  if (state && state.content) cvAutosaveBaseline = JSON.stringify(cvCurrentSnapshot());
}

function cvAutosaveSchedule() {
  if (!cvCurrentUserId) return;
  clearTimeout(cvAutosaveTimer);
  cvAutosaveTimer = setTimeout(cvAutosaveFlush, CV_AUTOSAVE_DELAY_MS);
}

function cvAutosaveIsDirty() {
  if (!cvCurrentUserId || !state.content || cvAutosaveBaseline === null) return false;
  return JSON.stringify(cvCurrentSnapshot()) !== cvAutosaveBaseline;
}

async function cvAutosaveFlush() {
  clearTimeout(cvAutosaveTimer);
  cvAutosaveTimer = null;
  if (!cvAutosaveIsDirty()) return;
  cvSetSaveStatus("saving");
  const error = await saveCvNow();
  cvSetSaveStatus(error ? "failed" : "saved");
  if (!error && window.refreshMyPanel) window.refreshMyPanel();
}

/* Tab hidden / closed: a normal save may be cut off by the page going
   away, so an already-created row is updated with a keepalive request
   instead (browsers cap keepalive bodies at 64KB — a CV with a large
   photo falls back to the normal save, which usually still completes
   on a tab switch). A CV with no row yet goes through the normal,
   queued save so it can never be inserted twice. */
function cvAutosaveOnHide() {
  if (!cvAutosaveIsDirty()) return;
  clearTimeout(cvAutosaveTimer);
  cvAutosaveTimer = null;
  const snapshot = cvCurrentSnapshot();
  const json = JSON.stringify(snapshot);
  const body = JSON.stringify({ data: snapshot, updated_at: new Date().toISOString() });
  if (cvSavedId && cvAccessToken && body.length < 60000) {
    try {
      fetch(`${SUPABASE_URL}/rest/v1/cv_saves?id=eq.${encodeURIComponent(cvSavedId)}&user_id=eq.${encodeURIComponent(cvCurrentUserId)}`, {
        method: "PATCH",
        keepalive: true,
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + cvAccessToken, Prefer: "return=minimal" },
        body,
      }).then((r) => { if (!r.ok) cvAutosaveBaseline = ""; }, () => { cvAutosaveBaseline = ""; }); // "" = dirty again, retried on the next edit/flush
      cvAutosaveBaseline = json;
      return;
    } catch (_e) { /* fall through to the normal save */ }
  }
  cvAutosaveFlush();
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") cvAutosaveOnHide(); });
window.addEventListener("pagehide", cvAutosaveOnHide);

/* Pass a saved CV's id (prefixed "id:") to resume THAT CV's own local
   draft only, a template slug to resume a not-yet-saved draft of that
   exact template, or nothing to resume whichever not-yet-saved
   template was last active (the pre-router-era fallback, still used by
   js/cv-saves-router.js's own "start fresh" path before any id
   exists). Never falls back across different keys — picking a
   different template, or opening a different saved CV, must actually
   show that one, not silently resurrect an unrelated draft. */
function loadCvLocalState(key) {
  try {
    const realKey = key ? cvLocalKey(key) : cvLocalKey(localStorage.getItem(CV_LAST_SLUG_KEY));
    const raw = localStorage.getItem(realKey);
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
  // The CV Shell (js/cv-builder-shell.js) may already be active and
  // showing stale content by the time this resolves — its own
  // DOMContentLoaded activation runs synchronously, before this
  // function's async auth/cloud-save check below gets a chance to.
  if (typeof cvbshellRefreshIfActive === "function") cvbshellRefreshIfActive();
  cvAutosaveResetBaseline();
}

document.addEventListener("DOMContentLoaded", () => {
  // builder.html is deliberately usable signed-out (local-only draft),
  // so it never loads require-auth.js and nothing here used to react to
  // auth state changing AFTER the page already loaded — only the one
  // getSession() check below, run once at load. Confirmed-live bug this
  // caused: signing out from the nav dropdown while still on this page
  // left a previous account's real saved CV (name, contact info, work
  // history) fully visible and still editable on screen, with nothing
  // indicating the account was no longer signed in — a real problem on
  // a shared/public computer, not just a visual nit. Mirrors the
  // "foreign draft" reset below: once there's no session to own this
  // content, it's reset to a blank template rather than left showing a
  // now-logged-out account's real data.
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const stillSignedIn = session && session.user;
    cvAccessToken = stillSignedIn ? session.access_token : null;
    if (!stillSignedIn && cvCurrentUserId) {
      cvCurrentUserId = null;
      clearTimeout(cvAutosaveTimer);
      cvSetSaveStatus("");
      if (typeof loadTemplate === "function" && state.slug) loadTemplate(state.slug);
    }
  });

  // Deciding WHICH CV to show (an existing one by id, the "My CVs" list,
  // or a genuinely fresh one) is now js/cv-saves-router.js's job alone —
  // cv_saves is one row per SAVED CV, not per user, so there's no
  // single "the" save left to silently resume here. This block only
  // tracks sign-in state (cvCurrentUserId, used by saveCvNow() and the
  // save button below) and the same foreign-draft guard as always.
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      cvCurrentUserId = user.id;
      cvAccessToken = data.session.access_token;
      const clearedForeignDraft = typeof guardLocalDraftOwnership === "function" && guardLocalDraftOwnership(user.id);
      if (clearedForeignDraft) {
        // guardLocalDraftOwnership just wiped a PREVIOUS account's local
        // draft from storage, but builder.js may already have painted it
        // into the form/state before this async check even started —
        // reset to a genuinely blank version of whatever template is
        // showing, rather than silently leaving a stranger's real name,
        // contact info and work history on screen and editable. The
        // router (below, same DOMContentLoaded tick) still decides what
        // to show instead right after.
        if (typeof loadTemplate === "function" && state.slug) loadTemplate(state.slug);
      }
      // Whatever is on screen at sign-in is the starting point — only
      // edits from here on are autosaved (applyCvSnapshot resets this
      // again if js/cv-saves-router.js then loads a specific saved CV).
      cvAutosaveResetBaseline();
      logUsageEvent("cv", state.slug, "edit");
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const btn = document.getElementById("cv-save-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!cvCurrentUserId) { if (typeof openAuthPrompt === "function") openAuthPrompt(); return; }
      btn.disabled = true;
      clearTimeout(cvAutosaveTimer);
      cvSetSaveStatus("saving");
      const error = await saveCvNow();
      btn.disabled = false;
      cvSetSaveStatus(error ? "failed" : "saved");
      if (!error && window.refreshMyPanel) window.refreshMyPanel();
    });
  }
});
