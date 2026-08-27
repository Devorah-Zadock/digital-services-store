/* Syncs the site builder's progress to the account (site_projects
   table) so it's available from any device, and enforces the
   one-finalized-site-per-purchase rule: once a project is finalized
   (real files downloaded), its template is locked — building a
   different template needs a new purchase, exactly like a single-site
   theme license. Content edits and re-downloads of the SAME template
   stay free forever, matching how the rest of DeskKit already works. */

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
  const link = document.querySelector('a[href="sites.html?browse=1"]');
  if (link) {
    link.textContent = "האתר הזה סופי — לתבנית אחרת נדרשת רכישה חדשה";
    link.href = "#";
    link.onclick = (e) => {
      e.preventDefault();
      alert("סיימתם כבר להוריד את האתר הזה. כדי לבנות אתר נוסף עם תבנית שונה, נדרשת רכישה חדשה.");
    };
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const urlTemplate = new URLSearchParams(location.search).get("template");

  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      siteCurrentUserId = user.id;
      const { data: rows } = await supabaseClient
        .from("site_projects").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(1);
      const row = rows && rows[0];
      if (row) {
        siteProjectId = row.id;
        siteIsFinalized = row.status === "finalized";
        if (siteIsFinalized && urlTemplate && urlTemplate !== row.template) {
          alert("סיימתם כבר להוריד את האתר שלכם עם תבנית אחרת. כדי לבנות אתר נוסף עם תבנית שונה, נדרשת רכישה חדשה.");
        }
        siteState.template = row.template;
        siteState.data = row.data;
        ensurePagesShape(siteState.data);
        if (siteIsFinalized) localStorage.setItem(SITE_UNLOCK_KEY, "1");
        if (typeof showWizard === "function") showWizard();
        if (siteIsFinalized) applyFinalizedLockUI();
      }
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });
});
