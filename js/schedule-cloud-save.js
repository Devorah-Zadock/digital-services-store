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

async function saveScheduleNow() {
  if (!scheduleCurrentUserId || !scheduleState) return "no-user";
  const row = { user_id: scheduleCurrentUserId, data: scheduleState, updated_at: new Date().toISOString() };
  if (scheduleSavedId) row.id = scheduleSavedId;
  const { data, error } = await supabaseClient.from("schedule_projects").upsert(row).select().single();
  if (error) return error;
  scheduleSavedId = data.id;
  const url = new URL(location.href);
  url.searchParams.set("schedule", data.id);
  history.replaceState(null, "", url);
  if (window.refreshMyPanel) window.refreshMyPanel();
  return null;
}

/* Called from schedule-render.js's DOMContentLoaded handler when the URL
   names a specific saved project (?schedule=<id>) — the .eq("user_id", ...)
   is what stops someone from loading another school's project just by
   guessing an id, same belt-and-suspenders check the RLS policy already
   enforces server-side. */
async function loadScheduleById(id, userId) {
  const { data } = await supabaseClient.from("schedule_projects").select("id, data").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  scheduleSavedId = data.id;
  return data.data;
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      scheduleCurrentUserId = user.id;
      const urlId = new URLSearchParams(location.search).get("schedule");
      if (urlId) {
        const loaded = await loadScheduleById(urlId, user.id);
        if (loaded) {
          scheduleState = loaded;
          if (window.scheduleOnStateLoaded) window.scheduleOnStateLoaded();
        }
      }
      logUsageEvent("schedule", null, "edit");
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const btn = document.getElementById("schedule-save-btn");
  const status = document.getElementById("schedule-save-status");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!scheduleCurrentUserId) { window.location.href = "account.html?redirect=schedule-builder.html"; return; }
    btn.disabled = true;
    const err = await saveScheduleNow();
    btn.disabled = false;
    status.classList.remove("ok");
    status.textContent = err ? "השמירה נכשלה, נסו שוב" : "נשמר ✓";
    if (!err) status.classList.add("ok");
    setTimeout(() => { status.textContent = ""; status.classList.remove("ok"); }, 2500);
  });
});
