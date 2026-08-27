/* Syncs the site builder's progress to the account (site_projects table)
   so it's available from any device, and enforces the one-finalized-
   project-per-template rule: once a specific template is finalized (real
   files downloaded), that exact project stays free to keep editing and
   re-downloading forever — but a genuinely different template is a
   separate project of its own, gated by its own Gumroad unlock (see
   currentUnlockKey() in site-builder.js), exactly like a single-site
   theme license. Picking a new template from the catalog always starts
   or resumes THAT template's own project — it never overwrites a
   different, already-finalized one. */

let siteCurrentUserId = null;
let siteProjectId = null;
let siteIsFinalized = false;
let siteSaveTimer = null;

function scheduleSiteSave() {
  if (!siteCurrentUserId) return;
  clearTimeout(siteSaveTimer);
  siteSaveTimer = setTimeout(saveSiteNow, 1200);
}

async function saveSiteNow() {
  if (!siteCurrentUserId) return;
  const row = { user_id: siteCurrentUserId, template: siteState.template, data: siteState.data };
  if (siteProjectId) row.id = siteProjectId;
  const { data, error } = await supabaseClient.from("site_projects").upsert(row).select().single();
  if (!error && data) siteProjectId = data.id;
}

async function finalizeSiteProject() {
  if (!siteCurrentUserId || siteIsFinalized) return;
  if (!siteProjectId) await saveSiteNow();
  if (!siteProjectId) return;
  const licenseInput = document.getElementById("license-input");
  await supabaseClient.from("site_projects").update({
    status: "finalized",
    finalized_at: new Date().toISOString(),
    gumroad_license_key: licenseInput ? licenseInput.value.trim() : null,
  }).eq("id", siteProjectId);
  siteIsFinalized = true;
  applyFinalizedLockUI();
}

function applyFinalizedLockUI() {
  const note = document.getElementById("finalized-note");
  if (note) note.style.display = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const urlTemplate = new URLSearchParams(location.search).get("template");

  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      siteCurrentUserId = user.id;

      // A template named explicitly (arriving from a catalog card) means
      // "resume or start THIS template's own project" — never fall back
      // to a different, unrelated project. No template in the URL means
      // "just continue where I left off" — the most recent project of any
      // template, matching how the builder worked before multiple
      // projects existed.
      let query = supabaseClient.from("site_projects").select("*").eq("user_id", user.id);
      query = urlTemplate
        ? query.eq("template", urlTemplate).limit(1)
        : query.order("created_at", { ascending: false }).limit(1);
      const { data: rows } = await query;
      const row = rows && rows[0];

      if (row) {
        siteProjectId = row.id;
        siteIsFinalized = row.status === "finalized";
        siteState.template = row.template;
        siteState.data = row.data;
        ensurePagesShape(siteState.data);
        if (siteIsFinalized) localStorage.setItem(currentUnlockKey(), "1");
        if (typeof showWizard === "function") showWizard();
        if (typeof refreshUnlockUI === "function") refreshUnlockUI();
        if (siteIsFinalized) applyFinalizedLockUI();
      } else if (urlTemplate) {
        // A template with no saved project yet — a fresh, separate
        // project. siteProjectId stays null so the next save creates a
        // new row instead of touching any other template's project.
        siteProjectId = null;
        siteIsFinalized = false;
      }
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });
});
