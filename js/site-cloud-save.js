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
  // Set before any await: a fast double-click fires this twice before the
  // first call's network requests resolve, so checking siteIsFinalized only
  // at the end (as it used to) let both calls race past the guard — that's
  // exactly what sent two receipt emails for one download.
  siteIsFinalized = true;
  if (!siteProjectId) await saveSiteNow();
  if (!siteProjectId) { siteIsFinalized = false; return; }
  const licenseInput = document.getElementById("license-input");
  await supabaseClient.from("site_projects").update({
    status: "finalized",
    finalized_at: new Date().toISOString(),
    gumroad_license_key: licenseInput ? licenseInput.value.trim() : null,
  }).eq("id", siteProjectId);
  applyFinalizedLockUI();
  sendPurchaseReceipt();
}

/* Fires exactly once, right here — never on a later edit or re-download
   of the same finalized project. Best-effort: a receipt failing to send
   must never block the actual download the customer is waiting for. */
async function sendPurchaseReceipt() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const sessionEmail = data.session && data.session.user && data.session.user.email;
    const purchase = typeof lastVerifiedPurchase !== "undefined" ? lastVerifiedPurchase : null;
    const buyerEmail = (purchase && purchase.email) || sessionEmail;
    if (!buyerEmail) return;

    const tplLabel = typeof SITE_TEMPLATES !== "undefined" && SITE_TEMPLATES[siteState.template]
      ? SITE_TEMPLATES[siteState.template].label : siteState.template;
    const bizName = siteState.data && siteState.data.businessName && siteState.data.businessName.trim();
    const amount = purchase && purchase.price != null ? `${(purchase.price / 100).toFixed(2)} ₪` : null;

    await supabaseClient.functions.invoke("send-receipt", {
      body: {
        buyerEmail,
        buyerName: (purchase && purchase.full_name) || bizName || "",
        itemDescription: `בניית אתר עסקי — ${escapeHtmlS(tplLabel)}${bizName ? ` (${escapeHtmlS(bizName)})` : ""}`,
        amount,
      },
    });
  } catch (err) {
    // silent — a failed receipt email is a support follow-up, not a
    // reason to interrupt someone who just finished paying
  }
}

/* Once a project is paid for, there's no path from inside it back to
   "pick a different template" — that's exactly the loophole that let
   someone keep the same content and freely try (and fully preview) a
   new template after only ever paying once. A genuinely different site
   only starts from the top-level "בניית אתר" nav link, which always
   opens the full catalog fresh (see the site-wide ?browse=1 links) and
   the "האתרים שלי" rail there to get back to any existing project. */
function applyFinalizedLockUI() {
  const note = document.getElementById("finalized-note");
  if (note) note.style.display = "";
  const link = document.getElementById("change-template-link");
  if (link) link.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const urlTemplate = params.get("template");
  const forceBrowse = params.get("browse") === "1";

  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      siteCurrentUserId = user.id;

      const { data: rows } = await supabaseClient
        .from("site_projects").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const allRows = rows || [];

      // Explicitly asked to browse the catalog (no template picked yet) —
      // nothing to resume, and resuming here would silently snap the page
      // right back to the wizard the moment this async check resolves,
      // making "שינוי תבנית" look like it does nothing.
      if (!forceBrowse) {
        // A template named explicitly (arriving from a catalog card or
        // the "האתרים שלי" list) means "resume or start THAT template's
        // own project" — never fall back to a different, unrelated one.
        // No template in the URL means "just continue where I left off"
        // — the most recent project of any template.
        const row = urlTemplate
          ? allRows.find((r) => r.template === urlTemplate)
          : allRows[0];

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
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });
});
