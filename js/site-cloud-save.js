/* Syncs the site builder's progress to the account (site_projects table)
   so it's available from any device, and enforces the one-finalized-
   project-per-template rule: once a specific template is finalized (real
   files downloaded), that exact project stays free to keep editing and
   re-downloading forever — but a genuinely different template is a
   separate project of its own, gated by its own Gumroad unlock (see
   currentUnlockKey() in site-builder.js), exactly like a single-site
   theme license. Picking a new template from the catalog always starts
   or resumes THAT template's own project — it never overwrites a
   different, already-finalized one.

   Explicit-save only: saveSiteNow only runs from #site-save-btn (or from
   finalizeSiteProject, which needs a real project id to attach the
   purchase to) — editing was silently creating/overwriting a saved
   project before anyone chose to keep anything. */

let siteCurrentUserId = null;
let siteProjectId = null;
let siteIsFinalized = false;
// Mirrors the site_projects row's own publish_count — read here so
// site-builder.js can show "X מתוך 5 נשארו" before anyone even clicks
// פרסום, not just after the Edge Function refuses. See
// supabase/sql/site_projects_publish_limit.sql and publish-site's
// PUBLISH_LIMIT for where the actual cap is enforced (server-side —
// this is display-only, never trust it for the real check).
let sitePublishCount = 0;

/* Autosave: a refresh with no manual save used to lose everything typed
   in since the last click of "שמירה" — confirmed live. Every edit inside
   #wizard-section marks the project dirty; a periodic tick saves it
   quietly in the background (same status element the manual save button
   uses), without needing every individual handler in site-builder.js to
   know about saving. */
let siteDirty = false;
let siteAutosaving = false;

function markSiteDirty() {
  siteDirty = true;
  const status = document.getElementById("site-save-status");
  if (status && status.classList.contains("ok")) { status.textContent = ""; status.classList.remove("ok"); }
}

async function siteAutosaveTick() {
  if (!siteCurrentUserId || !siteDirty || siteAutosaving) return;
  siteAutosaving = true;
  await saveSiteNow();
  siteAutosaving = false;
  if (siteProjectId) {
    siteDirty = false;
    const status = document.getElementById("site-save-status");
    if (status) { status.textContent = "נשמר אוטומטית ✓"; status.classList.add("ok"); }
  }
}

async function saveSiteNow() {
  if (!siteCurrentUserId) return;
  const row = { user_id: siteCurrentUserId, template: siteState.template, data: siteState.data };
  if (siteProjectId) row.id = siteProjectId;
  const { data, error } = await supabaseClient.from("site_projects").upsert(row).select().single();
  if (!error && data) siteProjectId = data.id;
}

async function finalizeSiteProject() {
  // Called right after a license verifies successfully (site-builder.js's
  // verifySiteLicense) — the real moment a purchase completes. The guard
  // below is a defense-in-depth backstop for that one real call site, not
  // load-bearing on its own: the localStorage unlock flag it checks is
  // set by that same function immediately before calling this, so in
  // practice it always passes there. Kept explicit anyway, since
  // unlock-done (where this and the rest of the finish/publish flow live)
  // is reachable without ever paying under the freemium model — a future
  // call site added here without this check could otherwise mark a
  // project "finalized" and send a real "thank you for your purchase"
  // receipt for a purchase that never happened.
  if (typeof currentUnlockKey !== "function" || localStorage.getItem(currentUnlockKey()) !== "1") return;
  if (!siteCurrentUserId || siteIsFinalized) return;
  // Set before any await: a fast double-click fires this twice before the
  // first call's network requests resolve, so checking siteIsFinalized only
  // at the end (as it used to) let both calls race past the guard — that's
  // exactly what sent two receipt emails for one download.
  siteIsFinalized = true;
  if (!siteProjectId) await saveSiteNow();
  if (!siteProjectId) { siteIsFinalized = false; return; }
  const licenseInput = document.getElementById("license-input");
  // .eq("user_id", ...) here is a defense-in-depth backstop, not the real
  // guard (RLS's own update policy is) — but every other write in this
  // project pairs a client-side owner filter with RLS rather than relying
  // on RLS alone, so a tampered siteProjectId (devtools, a direct API
  // call) can't even attempt to "finalize" (unlock) someone else's site
  // if RLS were ever misconfigured.
  await supabaseClient.from("site_projects").update({
    status: "finalized",
    finalized_at: new Date().toISOString(),
    gumroad_license_key: licenseInput ? licenseInput.value.trim() : null,
  }).eq("id", siteProjectId).eq("user_id", siteCurrentUserId);
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
    const amount = formatGumroadAmount(purchase);
    // Gumroad's own license-verify response flags a sandbox/test-mode
    // purchase with purchase.test — real money never changed hands, so
    // its `price` can legitimately be a throwaway sandbox value instead
    // of the product's real listed price. A receipt for one of these
    // must say so loudly: a real-looking "קבלה" (receipt) email with an
    // unexplained wrong amount is exactly the kind of thing that erodes
    // trust in every OTHER receipt, even the real ones.
    const isTest = !!(purchase && purchase.test);

    await supabaseClient.functions.invoke("send-receipt", {
      body: {
        buyerEmail,
        buyerName: (purchase && purchase.full_name) || bizName || "",
        itemDescription: `בניית אתר עסקי — ${escapeHtmlS(tplLabel)}${bizName ? ` (${escapeHtmlS(bizName)})` : ""}`,
        amount,
        isTest,
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
   only starts from the top-level "אתרים" nav link, which always
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
  const urlSiteId = params.get("site");
  const forceBrowse = params.get("browse") === "1";
  // "+ צור אתר חדש" / the create-chooser always sends ?new=1 — never
  // auto-resume ANY existing project (by template or otherwise) in that
  // case, same as forceBrowse. js/site-builder.js's own router is what
  // decides what to show instead (the intro screen or the questionnaire
  // modal), not this file.
  const isNewSite = params.get("new") === "1";

  // sites.html is deliberately usable signed-out (local-only draft until
  // someone signs in), so nothing here used to react to auth state
  // changing AFTER the page already loaded — only the one getSession()
  // check below, run once at load. Same confirmed-live bug as the CV
  // builder (js/builder-cloud-save.js): signing out from the nav
  // dropdown while still on this page left a previous account's real
  // saved site (business name, contact info, photos) fully visible and
  // still editable, with nothing indicating the account was signed out.
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const stillSignedIn = session && session.user;
    if (!stillSignedIn && siteCurrentUserId) {
      siteCurrentUserId = null;
      siteProjectId = null;
      sitePublishCount = 0;
      siteIsFinalized = false;
      if (typeof freshSiteData === "function" && siteState.template) {
        siteState.data = freshSiteData(siteState.template);
        if (typeof showWizard === "function") showWizard();
      }
    }
  });

  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      siteCurrentUserId = user.id;
      const clearedForeignDraft = typeof guardLocalDraftOwnership === "function" && guardLocalDraftOwnership(user.id);

      // Prefills the Gumroad checkout with the signed-in email — most
      // buyers want their receipt/license at the same address anyway, and
      // Gumroad's own field stays a normal, editable input, so anyone who
      // wants a different receipt email can still just type over it.
      if (user.email) {
        const buyLink = document.getElementById("buy-link");
        if (buyLink && buyLink.href) {
          try {
            const url = new URL(buyLink.href);
            url.searchParams.set("email", user.email);
            buyLink.href = url.toString();
          } catch (_e) { /* malformed href — leave it as-is */ }
        }
      }

      const { data: rows } = await supabaseClient
        .from("site_projects").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const allRows = rows || [];

      // Explicitly asked to browse the catalog, or to start a genuinely
      // new site (?new=1) — nothing to resume either way, and resuming
      // here would silently snap the page right back to a DIFFERENT,
      // already-saved project the moment this async check resolves.
      if (!forceBrowse && !isNewSite) {
        // ?site=<id> (the My Websites list, and every new-flow redirect
        // after generation) names an exact project by its own identity —
        // takes priority over ?template= so a second site using the same
        // Design Starting Point is never confused with a different one.
        // A bare ?template= (an old bookmark, or the internal catalog
        // fallback) still means "resume or start THAT template's own
        // project". No template/id in the URL means "just continue where
        // I left off" — the most recent project of any kind.
        const row = urlSiteId
          ? allRows.find((r) => String(r.id) === urlSiteId) || (urlTemplate ? allRows.find((r) => r.template === urlTemplate) : allRows[0])
          : urlTemplate
            ? allRows.find((r) => r.template === urlTemplate)
            : allRows[0];

        if (row) {
          siteProjectId = row.id;
          siteIsFinalized = row.status === "finalized";
          sitePublishCount = row.publish_count || 0;
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
          sitePublishCount = 0;
          siteIsFinalized = false;
          // The synchronous loadSiteState() call (before this account was
          // even known) reads a localStorage cache keyed only by template,
          // not by account — on a shared/reused browser, that can silently
          // load a DIFFERENT account's leftover draft for this exact
          // template. Now that the real signed-in account is confirmed to
          // have no saved project for it, that stale draft is discarded in
          // favor of a genuinely fresh one, and the already-rendered form
          // is refreshed to match.
          siteState.template = urlTemplate;
          siteState.data = freshSiteData(urlTemplate);
          if (typeof showWizard === "function") showWizard();
        } else if (clearedForeignDraft && siteState.template) {
          // No specific template requested and this account has no saved
          // project of its own at all — but guardLocalDraftOwnership just
          // wiped a PREVIOUS account's local draft that the synchronous
          // pre-auth loadSiteState() had already loaded into siteState.
          // Reset to a blank version of whatever template that was,
          // rather than leaving a stranger's real business name and
          // contact details on screen, editable and savable under this
          // account.
          siteProjectId = null;
          sitePublishCount = 0;
          siteIsFinalized = false;
          siteState.data = freshSiteData(siteState.template);
          if (typeof showWizard === "function") showWizard();
        }
      }
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  const wizard = document.getElementById("wizard-section");
  if (wizard) {
    wizard.addEventListener("input", markSiteDirty);
    wizard.addEventListener("change", markSiteDirty);
    wizard.addEventListener("click", markSiteDirty);
  }
  setInterval(siteAutosaveTick, 20000);

  const btn = document.getElementById("site-save-btn");
  const status = document.getElementById("site-save-status");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!siteCurrentUserId) { window.location.href = "account.html?redirect=" + encodeURIComponent(location.pathname + location.search); return; }
      btn.disabled = true;
      await saveSiteNow();
      btn.disabled = false;
      siteDirty = false;
      status.textContent = "נשמר ✓";
      status.classList.add("ok");
      if (window.refreshMyPanel) window.refreshMyPanel();
      setTimeout(() => { status.textContent = ""; status.classList.remove("ok"); }, 2500);
    });
  }
});
