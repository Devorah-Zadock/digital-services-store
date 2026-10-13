/* Persists schedule projects (schedule_projects table — one row per saved
   project, not per user, since a school may keep separate projects per
   year/semester) so they show up in the "my content" rail and can be
   reopened later, the same way a quote or a site project already can.

   scheduleCurrentUserId/scheduleSavedId are set here and read by
   schedule-render.js — same shared-globals pattern already used for
   quoteEventState between quote-app.js and quote-cloud-save.js.

   Explicit-save only: saveScheduleNow only runs from #schedule-save-btn —
   editing was silently creating a new saved project before anyone chose
   to keep anything. */

let scheduleCurrentUserId = null;
let scheduleSavedId = null;

/* Saving, made so an edit is never lost silently:
   - every edit bumps scheduleEditVersion; a save only counts the version it
     actually sent, so an edit made while a save is in flight is saved next
     time instead of being marked "saved" by mistake;
   - saves run one at a time (a manual click during an autosave waits for
     it), so a new project is never inserted twice;
   - autosave runs 3 s after the last edit (and when the tab is hidden),
     with a periodic retry while something is still unsaved;
   - a local copy (this browser only) is written on every edit and deleted
     only after the cloud confirms a save of that exact version — if the
     cloud save fails, or the page is closed first, the copy is offered back
     next time;
   - the status next to "שמירה" always says whether the latest changes are
     in the cloud, and the browser warns before leaving with unsaved ones. */
let scheduleEditVersion = 0;
let scheduleSavedVersion = 0;
let scheduleSaveInFlight = null;   // promise of the save currently running
let scheduleLoadFailed = false;    // a saved project couldn't be loaded — never save over it
let scheduleLastSaveFailed = false;
let scheduleAutosaveTimer = null;
let scheduleDraftTimer = null;

function scheduleHasUnsaved() { return scheduleEditVersion !== scheduleSavedVersion; }

function scheduleSetStatus(text, kind) {
  const status = document.getElementById("schedule-save-status");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("ok", kind === "ok");
  status.classList.toggle("err", kind === "err");
}

function scheduleShowSaveState() {
  if (scheduleLoadFailed) {
    scheduleSetStatus(schedL("הפרויקט לא נטען — לא נשמור שינויים עד שתרעננו את הדף", "The project didn't load — nothing will be saved until you reload the page"), "err");
  } else if (scheduleSaveInFlight) {
    scheduleSetStatus(schedL("שומר…", "Saving…"));
  } else if (scheduleHasUnsaved()) {
    scheduleSetStatus(scheduleLastSaveFailed
      ? schedL("לא נשמר בענן — השינויים שמורים רק במחשב הזה", "Not saved to the cloud — changes are kept on this computer only")
      : schedL("● שינויים שעוד לא נשמרו בענן", "● Changes not saved to the cloud yet"), scheduleLastSaveFailed ? "err" : null);
  } else if (scheduleSavedId) {
    scheduleSetStatus(schedL("נשמר בענן ✓", "Saved to the cloud ✓"), "ok");
  } else {
    scheduleSetStatus("");
  }
}

/* ---- local copy (recovery only) ---- */
function scheduleDraftKey(projectId) {
  return scheduleCurrentUserId ? `deskkit_schedule_draft_${scheduleCurrentUserId}_${projectId || "new"}` : null;
}
function scheduleWriteDraft() {
  const key = scheduleDraftKey(scheduleSavedId);
  if (!key || scheduleLoadFailed) return;
  try {
    localStorage.setItem(key, JSON.stringify({ v: 1, savedAt: Date.now(), version: scheduleEditVersion, data: scheduleState }));
  } catch (_e) { /* storage full or blocked — the cloud save still runs */ }
}
function scheduleReadDraft(projectId) {
  const key = scheduleDraftKey(projectId);
  if (!key) return null;
  try {
    const d = JSON.parse(localStorage.getItem(key) || "null");
    return d && d.data && Array.isArray(d.data.assignments) ? d : null;
  } catch (_e) { return null; }
}
function scheduleDeleteDraft(projectId) {
  const key = scheduleDraftKey(projectId);
  if (key) { try { localStorage.removeItem(key); } catch (_e) { /* ignore */ } }
}

function markScheduleDirty() {
  scheduleEditVersion++;
  scheduleShowSaveState();
  clearTimeout(scheduleDraftTimer);
  scheduleDraftTimer = setTimeout(scheduleWriteDraft, 300);
  clearTimeout(scheduleAutosaveTimer);
  scheduleAutosaveTimer = setTimeout(scheduleAutosaveTick, 3000);
}
window.scheduleMarkDirty = markScheduleDirty;

async function scheduleAutosaveTick() {
  if (!scheduleCurrentUserId || scheduleLoadFailed || !scheduleHasUnsaved()) return;
  await saveScheduleNow();
}

async function saveScheduleNow() {
  // One save at a time: wait for the running one, then save what's left.
  while (scheduleSaveInFlight) { try { await scheduleSaveInFlight; } catch (_e) { /* handled there */ } }
  if (!scheduleCurrentUserId || !scheduleState) return "no-user";
  if (scheduleLoadFailed) return "load-failed";
  if (!scheduleHasUnsaved() && scheduleSavedId) return null;
  const version = scheduleEditVersion;
  const projectBefore = scheduleSavedId;
  clearTimeout(scheduleDraftTimer);
  scheduleWriteDraft(); // the copy is current before anything leaves the browser
  const run = (async () => {
    const row = { user_id: scheduleCurrentUserId, data: scheduleState, updated_at: new Date().toISOString() };
    if (scheduleSavedId) row.id = scheduleSavedId;
    const { data, error } = await supabaseClient.from("schedule_projects").upsert(row).select().single();
    if (error || !data || !data.id) return error || "no-row";
    scheduleSavedId = data.id;
    scheduleSavedVersion = Math.max(scheduleSavedVersion, version);
    // The cloud confirmed this version: the local copy for it can go. A
    // newer edit (made during the save) keeps its copy until it's saved.
    if (!projectBefore) scheduleDeleteDraft(null);
    if (!scheduleHasUnsaved()) scheduleDeleteDraft(scheduleSavedId); else scheduleWriteDraft();
    const url = new URL(location.href);
    url.searchParams.set("schedule", data.id);
    history.replaceState(null, "", url);
    if (window.refreshMyPanel) window.refreshMyPanel();
    return null;
  })();
  scheduleSaveInFlight = run;
  scheduleShowSaveState();
  let err;
  try { err = await run; } catch (e) { err = e || "error"; }
  scheduleSaveInFlight = null;
  scheduleLastSaveFailed = !!err;
  scheduleShowSaveState();
  if (scheduleHasUnsaved() && !err) { clearTimeout(scheduleAutosaveTimer); scheduleAutosaveTimer = setTimeout(scheduleAutosaveTick, 3000); }
  return err;
}

/* A local copy newer than what's in the cloud (or for a project never
   saved) is offered back — never applied without asking. */
function scheduleOfferDraft(projectId, cloudUpdatedAt) {
  const d = scheduleReadDraft(projectId);
  if (!d) return false;
  const cloudMs = cloudUpdatedAt ? Date.parse(cloudUpdatedAt) || 0 : 0;
  if (d.savedAt <= cloudMs) return false;
  const when = new Date(d.savedAt).toLocaleString(schedL("he-IL", "en-GB"), { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const ok = confirm(schedL(
    `נמצאו במחשב הזה שינויים שלא נשמרו בענן (מ־${when}). לשחזר אותם?\n\nביטול = להמשיך עם הגרסה השמורה בענן (העותק המקומי יישאר עד השמירה הבאה).`,
    `Changes from ${when} that weren't saved to the cloud were found on this computer. Restore them?\n\nCancel = continue with the cloud version (the local copy stays until the next save).`));
  if (!ok) return false;
  scheduleState = d.data;
  if (window.scheduleOnStateLoaded) window.scheduleOnStateLoaded();
  markScheduleDirty(); // restored changes go to the cloud
  return true;
}

/* Called from schedule-render.js's DOMContentLoaded handler when the URL
   names a specific saved project (?schedule=<id>) — the .eq("user_id", ...)
   is what stops someone from loading another school's project just by
   guessing an id, same belt-and-suspenders check the RLS policy already
   enforces server-side. */
async function loadScheduleById(id, userId) {
  const { data, error } = await supabaseClient.from("schedule_projects").select("id, data, updated_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) return { failed: true };
  if (!data) return null;
  scheduleSavedId = data.id;
  return { data: data.data, updatedAt: data.updated_at };
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      scheduleCurrentUserId = user.id;

      // Same as the site builder: whether the solver is unlocked follows
      // the server's license record, not just a flag in this browser.
      try {
        const { data: paid, error: paidErr } = await supabaseClient.rpc("my_license_templates");
        if (!paidErr && Array.isArray(paid) && typeof SCHEDULE_UNLOCK_KEY !== "undefined") {
          if (paid.includes("schedule-builder")) localStorage.setItem(SCHEDULE_UNLOCK_KEY, "1");
          else localStorage.removeItem(SCHEDULE_UNLOCK_KEY);
          if (typeof refreshScheduleUnlockUi === "function") refreshScheduleUnlockUi();
        }
      } catch (_e) { /* offline / not deployed yet — keep the local flag */ }

      // Prefills the Gumroad checkout with the signed-in email — most
      // buyers want their receipt/license at the same address anyway, and
      // Gumroad's own field stays a normal, editable input, so anyone who
      // wants a different receipt email can still just type over it.
      if (user.email) {
        const buyLink = document.getElementById("sched-buy-link");
        if (buyLink && buyLink.href) {
          try {
            const url = new URL(buyLink.href);
            url.searchParams.set("email", user.email);
            buyLink.href = url.toString();
          } catch (_e) { /* malformed href — leave it as-is */ }
        }
      }

      const urlId = new URLSearchParams(location.search).get("schedule");
      if (urlId) {
        let loaded;
        try { loaded = await loadScheduleById(urlId, user.id); } catch (_e) { loaded = { failed: true }; }
        if (loaded && loaded.failed) {
          // Couldn't reach the project: showing the blank default and later
          // autosaving it would look like the project was lost (or save a
          // stray empty copy). Saving stays off until a reload succeeds.
          scheduleLoadFailed = true;
          alert(schedL("לא הצלחנו לטעון את הפרויקט (בעיית חיבור). רעננו את הדף בעוד רגע — לא נשמור שום שינוי עד שהטעינה תצליח.",
            "We couldn't load the project (connection problem). Reload the page in a moment — nothing will be saved until it loads."));
        } else if (loaded) {
          scheduleState = loaded.data;
          if (window.scheduleOnStateLoaded) window.scheduleOnStateLoaded();
          scheduleOfferDraft(scheduleSavedId, loaded.updatedAt);
        }
      } else {
        scheduleOfferDraft(null, null);
      }
      scheduleShowSaveState();
      logUsageEvent("schedule", null, "edit");
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const mainWrap = document.querySelector(".sched-main");
  if (mainWrap) {
    mainWrap.addEventListener("input", markScheduleDirty);
    mainWrap.addEventListener("change", markScheduleDirty);
    mainWrap.addEventListener("click", markScheduleDirty);
  }
  // The project name sits above .sched-main, so it needs its own listener.
  const nameInput = document.getElementById("sched-name-input");
  if (nameInput) nameInput.addEventListener("input", markScheduleDirty);
  // Retry while something is still unsaved (e.g. after a failed save).
  setInterval(scheduleAutosaveTick, 20000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") scheduleAutosaveTick();
  });
  window.addEventListener("beforeunload", (e) => {
    if (!scheduleCurrentUserId || scheduleLoadFailed || !scheduleHasUnsaved()) return;
    scheduleWriteDraft();
    e.preventDefault();
    e.returnValue = "";
  });

  const btn = document.getElementById("schedule-save-btn");
  const status = document.getElementById("schedule-save-status");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!scheduleCurrentUserId) { window.location.href = "account.html?redirect=schedule-builder.html"; return; }
    if (scheduleLoadFailed) { scheduleShowSaveState(); return; }
    btn.disabled = true;
    // A click always means "save now", even if nothing changed yet.
    if (!scheduleHasUnsaved()) scheduleEditVersion++;
    const err = await saveScheduleNow();
    btn.disabled = false;
    if (err) scheduleSetStatus(schedL("השמירה נכשלה — השינויים שמורים רק במחשב הזה. נסו שוב", "Saving failed — changes are kept on this computer only. Please try again"), "err");
  });
});
