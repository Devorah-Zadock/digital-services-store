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

/* A project is named by its own business name (what the customer
   actually typed in), not by its template — "מרכז המתכונים" means far
   more to them than "גלריה מודרנית". The template only shows as a small
   second line, and only once there's a real name to distinguish it
   from — otherwise it's just noise. */
function mySiteRowLabel(row) {
  const t = typeof SITE_TEMPLATES !== "undefined" ? SITE_TEMPLATES[row.template] : null;
  const tplLabel = t ? t.label : row.template;
  const bizName = row.data && row.data.businessName && row.data.businessName.trim();
  return bizName ? { name: bizName, sub: tplLabel } : { name: tplLabel, sub: "" };
}

/* "האתרים שלי" — every project the account has (draft or finalized),
   one per template, so switching templates never strands an already-
   built site with no way back to it. Rendered as a plain switchable
   list (not buttons) into every [data-my-sites-rail] mount on the page
   — the catalog and wizard views each have their own, so it's visible
   in both without special-casing which one is showing. */
function renderMySitesList(rows, activeTemplate) {
  const rails = document.querySelectorAll("[data-my-sites-rail]");
  const lists = document.querySelectorAll("[data-my-sites-list]");
  if (!rails.length) return;
  const show = rows.length > 0;
  rails.forEach((el) => { el.style.display = show ? "" : "none"; });
  if (!show) return;
  const html = rows
    .map((r) => {
      const { name, sub } = mySiteRowLabel(r);
      const activeClass = r.template === activeTemplate ? " active" : "";
      return `<a href="sites.html?template=${encodeURIComponent(r.template)}" class="my-site-row${activeClass}">
        <span class="my-site-row-name">${escapeHtmlS(name)}</span>
        ${sub ? `<span class="my-site-row-tpl">${escapeHtmlS(sub)}</span>` : ""}
      </a>`;
    })
    .join("");
  lists.forEach((el) => { el.innerHTML = html; });
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
      const activeTemplate = urlTemplate || (allRows[0] && allRows[0].template);
      renderMySitesList(allRows, activeTemplate);

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
