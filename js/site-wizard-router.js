/* The Website Creation Flow's top-level router — DeskKit unified
   redesign. Owns exactly the "no template/id named, nothing to resume"
   case: a bare sites.html visit, or an explicit ?new=1. Every other
   case (?template=, ?site=<id>, ?browse=1) stays on the pre-existing
   code path in js/site-builder.js unchanged — dkSitesRouterHandles()
   returns false for those and that file's own DOMContentLoaded handler
   runs exactly as it always has.

   The one thing this file is adamant about: an existing user visiting
   bare sites.html NEVER auto-opens their last site. They see "האתרים
   שלי" (or the intro screen, if they truly have none yet) and choose
   explicitly — opening an existing card goes to ?site=<id>, and
   "+ צור אתר חדש" goes to ?new=1, which this same router also owns. */

function dkSitesRouterHandles(opts) {
  if (opts.urlTemplate || opts.urlSiteId || opts.forceBrowse) return false;

  const overlay = document.getElementById("auth-gate-overlay");
  if (overlay) overlay.style.display = "flex";

  supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;
    if (!user) {
      if (opts.isNewSite) {
        location.href = "account.html?redirect=" + encodeURIComponent("sites.html?new=1");
        return;
      }
      dkShowSitesIntro();
      if (window.revealGatedPage) window.revealGatedPage();
      return;
    }

    if (opts.isNewSite) {
      dkShowSitesIntro({ autoLaunch: true });
      if (window.revealGatedPage) window.revealGatedPage();
      return;
    }

    const { data: rows } = await supabaseClient
      .from("site_projects").select("id, template, data, status, published_url, updated_at, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });

    if (rows && rows.length) {
      dkShowMySites(rows);
    } else {
      dkShowSitesIntro();
    }
    if (window.revealGatedPage) window.revealGatedPage();
  });

  return true;
}

function dkSitesHideAllEntryScreens() {
  ["tpl-catalog-section", "wizard-section", "dk-sites-intro-section", "dk-mysites-section"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = "none";
  const banner = document.getElementById("builder-top-banner");
  if (banner) banner.style.display = "none";
}

function dkShowSitesIntro(opts) {
  dkSitesHideAllEntryScreens();
  document.getElementById("dk-sites-intro-section").style.display = "";
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = ""; // the "how it works"/style marketing sections still make sense below the intro CTA
  const cta = document.getElementById("dk-sites-intro-cta");
  cta.onclick = () => { if (typeof openSiteAiGenerate === "function") openSiteAiGenerate(); };
  if (opts && opts.autoLaunch) cta.click();
}

const DK_MYSITES_LABELS = typeof MY_PANEL_TEMPLATE_LABELS !== "undefined" ? MY_PANEL_TEMPLATE_LABELS : {};
function dkMySitesTimeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עודכן הרגע";
  if (mins < 60) return `עודכן לפני ${mins} דקות`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `עודכן לפני ${hours} שעות`;
  return `עודכן לפני ${Math.round(hours / 24)} ימים`;
}

function dkMySitesCardHtml(row) {
  const biz = (row.data && row.data.businessName && row.data.businessName.trim()) || "אתר תדמית (ללא שם)";
  const tplLabel = (typeof SITE_TEMPLATES !== "undefined" && SITE_TEMPLATES[row.template] && SITE_TEMPLATES[row.template].label) || DK_MYSITES_LABELS[row.template] || row.template;
  const isLive = !!row.published_url;
  return `
    <div class="dk-pcard" data-dk-product="site" data-dk-site-id="${row.id}">
      <div class="dk-pcard-head">
        <div class="dk-pcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.6 5.5 3.6 9s-1.3 6.5-3.6 9c-2.3-2.5-3.6-5.5-3.6-9s1.3-6.5 3.6-9z"/></svg></div>
        <button type="button" class="dk-pcard-more" data-dk-site-more aria-label="עוד">⋮</button>
      </div>
      <p class="dk-pcard-name">${dkProjectsEscape ? dkProjectsEscape(biz) : biz}</p>
      <p class="dk-pcard-meta">
        <span>${tplLabel}</span>
        <span class="dk-pcard-status ${isLive ? "live" : "draft"}">${isLive ? "מפורסם" : "טיוטה"}</span>
      </p>
      <p class="dk-pcard-date">${dkMySitesTimeAgo(row.updated_at || row.created_at)}</p>
      <a href="sites.html?site=${encodeURIComponent(row.id)}" class="dk-pcard-cta">פתחו ב-Builder</a>
    </div>`;
}

function dkMySitesCloseMenu() {
  const m = document.querySelector(".dk-pcard-menu");
  if (m) m.remove();
}

async function dkMySitesDuplicate(row) {
  const { data: session } = await supabaseClient.auth.getSession();
  const user = session.session && session.session.user;
  if (!user) return;
  const { error } = await supabaseClient.from("site_projects").insert({ user_id: user.id, template: row.template, data: row.data });
  if (error) { alert("שכפול נכשל: " + error.message); return; }
  location.reload();
}

async function dkMySitesDelete(row) {
  if (!confirm("למחוק לצמיתות את האתר הזה? הפעולה בלתי הפיכה.")) return;
  const { data: session } = await supabaseClient.auth.getSession();
  const user = session.session && session.session.user;
  if (!user) return;
  await supabaseClient.from("site_projects").delete().eq("id", row.id).eq("user_id", user.id);
  if (window.refreshMyPanel) window.refreshMyPanel();
  location.reload();
}

function dkMySitesOpenMenu(card, row) {
  dkMySitesCloseMenu();
  const menu = document.createElement("div");
  menu.className = "dk-pcard-menu";
  menu.innerHTML = `
    <button type="button" data-act="open">עריכה</button>
    <button type="button" data-act="dup">שכפול</button>
    <button type="button" data-act="rename">שינוי שם</button>
    <button type="button" class="danger" data-act="del">מחיקה</button>
  `;
  card.appendChild(menu);
  menu.querySelector('[data-act="open"]').addEventListener("click", () => { location.href = "sites.html?site=" + encodeURIComponent(row.id); });
  menu.querySelector('[data-act="dup"]').addEventListener("click", () => dkMySitesDuplicate(row));
  menu.querySelector('[data-act="rename"]').addEventListener("click", () => { location.href = "sites.html?site=" + encodeURIComponent(row.id); });
  menu.querySelector('[data-act="del"]').addEventListener("click", () => dkMySitesDelete(row));
  setTimeout(() => document.addEventListener("click", dkMySitesOutsideClick, true), 0);
}
function dkMySitesOutsideClick(e) {
  if (!e.target.closest(".dk-pcard-menu") && !e.target.closest("[data-dk-site-more]")) {
    dkMySitesCloseMenu();
    document.removeEventListener("click", dkMySitesOutsideClick, true);
  }
}

function dkShowMySites(rows) {
  dkSitesHideAllEntryScreens();
  document.getElementById("dk-mysites-section").style.display = "";
  const grid = document.getElementById("dk-mysites-grid");
  grid.innerHTML = rows.map(dkMySitesCardHtml).join("");
  grid.querySelectorAll("[data-dk-site-more]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".dk-pcard");
      const row = rows.find((r) => String(r.id) === card.dataset.dkSiteId);
      if (row) dkMySitesOpenMenu(card, row);
    });
  });
  const newBtn = document.getElementById("dk-mysites-new-btn");
  if (newBtn) newBtn.onclick = () => { location.href = "sites.html?new=1"; };
}

function dkProjectsEscape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ---------- Breadcrumb mirror: keeps #bshell-breadcrumb-current in
   sync with #bshell-top-name (which builder-shell.js already sets on
   every bshellActivate() and every rename) via a MutationObserver
   instead of editing that shared, 18-template-wide file directly. ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("bshell-top-name");
  const crumbEl = document.getElementById("bshell-breadcrumb-current");
  if (!nameEl || !crumbEl) return;
  const sync = () => { crumbEl.textContent = nameEl.textContent; };
  sync();
  new MutationObserver(sync).observe(nameEl, { childList: true, characterData: true, subtree: true });

  /* ---------- Publish-readiness checklist: intercepts the Shell's
     existing publish button in the capture phase (runs before
     builder-shell.js's own bubble-phase listener — e.stopPropagation()
     stops that original listener from ever firing again), shows the
     checklist, and on confirm opens the new Publish modal directly
     instead of letting the original handler run. That original handler
     (bshellSaveNow().then(() => { deactivate Shell; showWizard(); }))
     is what used to dump a person back into the old, pre-Shell sidebar
     the instant they clicked "פרסום" — confirmed live as a jarring,
     unexplained "why am I back in the old builder" moment. Left in
     place (dead code, unreachable through normal use) rather than
     edited, since builder-shell.js is shared by 18 templates and the
     Shell's own ?shell=0 escape hatch still needs a working publish
     path in the old sidebar it falls back to. ---------- */
  const publishBtn = document.getElementById("bshell-publish-btn");
  if (publishBtn) {
    publishBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dkShowPublishChecklist(() => dkOpenPublishModal());
    }, { capture: true });
  }
});

/* ---------- Publish modal: reparents the real #export-panel (finish-
   gate/unlock-done — the existing, untouched Gumroad/license/watermark
   logic) into an on-brand modal, so publishing stays inside the
   Builder-Shell's own context instead of exiting to the old sidebar.
   #export-panel's ORIGINAL spot (inside .preview-sticky, used by the
   ?shell=0 escape hatch) is remembered once and restored on close. ---------- */
let dkExportPanelHome = null; // { parent, nextSibling } — captured once, first open
function dkRememberExportPanelHome(panel) {
  if (dkExportPanelHome) return;
  dkExportPanelHome = { parent: panel.parentElement, nextSibling: panel.nextSibling };
}
function dkRestoreExportPanelHome(panel) {
  if (!dkExportPanelHome) return;
  if (dkExportPanelHome.nextSibling) dkExportPanelHome.parent.insertBefore(panel, dkExportPanelHome.nextSibling);
  else dkExportPanelHome.parent.appendChild(panel);
}

function dkOpenPublishModal() {
  const panel = document.getElementById("export-panel");
  if (!panel || document.getElementById("dk-publish-overlay")) return;
  dkRememberExportPanelHome(panel);

  // Collapses the Shell's own "סיימתי לערוך" confirmation into this
  // same checklist-confirm action instead of asking twice — the real
  // #finish-btn click handler (financeGateOpened=true; refreshUnlockUI();
  // saveSiteNow()) still runs exactly as before, untouched.
  const finishBtn = document.getElementById("finish-btn");
  const alreadyPastGate = document.getElementById("unlock-done").style.display !== "none";
  if (finishBtn && !alreadyPastGate) finishBtn.click();
  else if (typeof bshellSaveNow === "function") bshellSaveNow();

  const overlay = document.createElement("div");
  overlay.id = "dk-publish-overlay";
  overlay.className = "dk-publish-overlay";
  overlay.innerHTML = `
    <div class="dk-publish-modal" role="dialog" aria-modal="true" aria-labelledby="dk-publish-modal-title">
      <button type="button" class="domain-guide-close" id="dk-publish-modal-close" aria-label="סגירה">✕</button>
      <h2 id="dk-publish-modal-title">פרסום האתר</h2>
      <div id="dk-publish-modal-slot"></div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("dk-publish-modal-slot").appendChild(panel);

  const close = () => {
    dkRestoreExportPanelHome(panel);
    overlay.remove();
  };
  document.getElementById("dk-publish-modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
}

function dkChecklistRow(ok, label, warnLabel) {
  return `<div class="dk-checklist-item"><span class="${ok ? "ok" : "warn"}">${ok ? "✓" : "⚠️"}</span> ${ok ? label : (warnLabel || label)}</div>`;
}

function dkShowPublishChecklist(onConfirm) {
  if (document.getElementById("dk-publish-checklist-overlay")) return;
  const d = (typeof siteState !== "undefined" && siteState.data) || {};
  const hasName = !!(d.businessName && d.businessName.trim());
  const hasContact = !!((d.phone && d.phone.trim()) || (d.email && d.email.trim()) || (d.whatsapp && d.whatsapp.trim()));
  const hasContent = !!((d.about && d.about.trim()) || (d.services || []).some((s) => s.name && s.name.trim()));
  const hasImages = !!(d.photo || (d.gallery && d.gallery.length));

  const overlay = document.createElement("div");
  overlay.id = "dk-publish-checklist-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal" role="dialog" aria-modal="true" style="max-width:460px;">
      <button type="button" class="domain-guide-close" id="dk-checklist-close" aria-label="סגירה">✕</button>
      <h2>האתר כמעט מוכן 🚀</h2>
      <div class="dk-checklist">
        ${dkChecklistRow(hasName, "שם העסק")}
        ${dkChecklistRow(hasContact, "פרטי קשר", "מומלץ להוסיף דרך יצירת קשר (טלפון, מייל או וואטסאפ)")}
        ${dkChecklistRow(hasContent, "תוכן", "מומלץ להשלים תיאור או רשימת שירותים")}
        ${dkChecklistRow(hasImages, "תמונות", "מומלץ להוסיף תמונה ראשית")}
        ${dkChecklistRow(true, "תצוגת מובייל")}
      </div>
      <button type="button" class="dk-btn dk-btn-primary" style="width:100%;" id="dk-checklist-confirm">פרסום האתר</button>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("dk-checklist-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.getElementById("dk-checklist-confirm").addEventListener("click", () => { close(); onConfirm(); });
}
