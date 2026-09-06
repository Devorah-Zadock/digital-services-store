/* Global "my content" side panel — every logged-in page gets it, laid
   out like a real app rail (account pinned at the bottom, content
   grouped and collapsible above it — see js/nav-auth.js for the
   account dropdown this borrows the sign-out flow from). The brand
   itself lives only in the page header, same as every other page —
   the rail doesn't repeat it.

   Self-contained on purpose: pages that include this script don't all
   load site-templates.js, so a small local label map stands in for it —
   just the labels, not the render functions — kept in sync by hand
   whenever a template is added to js/site-templates.js. */

const MY_PANEL_TEMPLATE_LABELS = {
  "local-service": "עסק שירות מקומי",
  "freelancer": "פרילנסר / יועץ",
  "catalog": "קטלוג קטן",
  "gallery": "גלריה מודרנית",
  "bold": "נועז ומודרני",
  "elegant": "אלגנטי ומעוצב",
  "process": "תהליך עבודה",
  "portfolio": "תיק עבודות יצירתי",
  "boutique": "חנות בוטיק",
  "noir": "יוקרתי כהה",
  "studio": "סטודיו קריאייטיב",
};

const MY_PANEL_COLLAPSE_KEY = "deskkit_panel_collapsed";
const MY_PANEL_RAIL_W_KEY = "deskkit_rail_w";
const MY_PANEL_RAIL_COLLAPSED_KEY = "deskkit_rail_collapsed";
const MY_PANEL_RAIL_W_DEFAULT = 220;
const MY_PANEL_RAIL_W_MIN = 190;
const MY_PANEL_RAIL_W_MAX = 420;

function myPanelEscapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function myPanelTrashIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>';
}

function myPanelChevronIcon() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';
}

/* Points at the true edge the rail collapses toward — sideways, not up/down
   like myPanelChevronIcon (that one's for the expand/collapse section
   arrows). .my-panel-reopen flips it 180deg via CSS for the reopen state. */
function myPanelCollapseIcon() {
  return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v16M15 8l4 4-4 4"/></svg>';
}

function myPanelAccountIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex:none;"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>';
}

function myPanelSiteIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.6 5.5 3.6 9s-1.3 6.5-3.6 9c-2.3-2.5-3.6-5.5-3.6-9s1.3-6.5 3.6-9z"/></svg>';
}

function myPanelCvIcon() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13h5M9.5 16.5h5"/></svg>';
}

/* Same dropdown as the header's own account menu (js/nav-auth.js) —
   reused class names so it inherits that styling as-is, just opened
   upward ("dropup") since this trigger sits at the very bottom of the
   rail instead of at the top of the header. */
function closePanelAccountMenu() {
  const dd = document.querySelector(".my-panel-account .nav-account-dropdown");
  if (dd) dd.remove();
  document.removeEventListener("click", onPanelAccountOutsideClick, true);
}

function onPanelAccountOutsideClick(e) {
  const dd = document.querySelector(".my-panel-account .nav-account-dropdown");
  const toggle = document.getElementById("my-panel-account-toggle");
  if (dd && !dd.contains(e.target) && toggle && !toggle.contains(e.target)) {
    closePanelAccountMenu();
  }
}

function openPanelAccountMenu(wrap, email) {
  closePanelAccountMenu();
  const dd = document.createElement("div");
  dd.className = "nav-account-dropdown dropup";
  dd.innerHTML = `
    <div class="nav-account-email">${myPanelEscapeHtml(email)}</div>
    <a href="account-settings.html" class="nav-account-settings">החשבון שלי</a>
    <button type="button" class="nav-account-logout">התנתקות</button>
    <div class="nav-account-confirm" hidden>
      <p>להתנתק?</p>
      <div class="nav-account-confirm-row">
        <button type="button" class="nav-confirm-yes">כן, להתנתק</button>
        <button type="button" class="nav-confirm-no">ביטול</button>
      </div>
    </div>
  `;
  wrap.appendChild(dd);

  dd.querySelector(".nav-account-logout").addEventListener("click", () => {
    dd.querySelector(".nav-account-logout").hidden = true;
    dd.querySelector(".nav-account-confirm").hidden = false;
  });
  dd.querySelector(".nav-confirm-no").addEventListener("click", () => {
    dd.querySelector(".nav-account-confirm").hidden = true;
    dd.querySelector(".nav-account-logout").hidden = false;
  });
  dd.querySelector(".nav-confirm-yes").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.reload();
  });

  setTimeout(() => document.addEventListener("click", onPanelAccountOutsideClick, true), 0);
}

/* Not-built-yet state: plain text, not a row that looks clickable
   everywhere — only the trailing call-to-action reads as a link. */
function myPanelEmptyRowHtml(opts) {
  return `<div class="my-panel-empty-row">
    ${myPanelEscapeHtml(opts.text)} <a href="${opts.href}" class="my-panel-empty-link">${myPanelEscapeHtml(opts.linkText)}</a>
  </div>`;
}

function myPanelRowHtml(opts) {
  const del = opts.deleteAttr
    ? `<button type="button" class="my-content-delete-btn" data-panel-delete="${opts.deleteAttr}" title="מחיקה" aria-label="מחיקה">${myPanelTrashIcon()}</button>`
    : "";
  const activeClass = opts.active ? " active" : "";
  const thumbClass = opts.kind === "cv" ? " my-panel-card-thumb-cv" : "";
  const icon = opts.kind === "cv" ? myPanelCvIcon() : myPanelSiteIcon();
  return `<div class="my-content-row">
    <a href="${opts.href}" class="my-panel-card${activeClass}">
      <span class="my-panel-card-thumb${thumbClass}">${icon}</span>
      <span class="my-panel-card-info">
        <span class="my-panel-card-name">${myPanelEscapeHtml(opts.name)}</span>
        ${opts.sub ? `<span class="my-panel-card-tpl">${myPanelEscapeHtml(opts.sub)}</span>` : ""}
      </span>
    </a>${del}
  </div>`;
}

/* Which single row (if any) is "the thing being edited right now" —
   not just hovered, but actually open — so it reads as active the
   whole time you're on it, the same way the hover state looks. */
function myPanelCurrentContext() {
  const path = location.pathname.split("/").pop();
  if (path === "sites.html") {
    const t = new URLSearchParams(location.search).get("template");
    return t ? { kind: "site", template: t } : null;
  }
  if (path === "builder.html") return { kind: "cv" };
  return null;
}

async function loadMyPanel(user) {
  const sitesList = document.getElementById("my-panel-sites");
  const cvList = document.getElementById("my-panel-cv");
  if (!sitesList || !cvList) return;
  const ctx = myPanelCurrentContext();

  const { data: sites } = await supabaseClient
    .from("site_projects").select("id, template, data")
    .eq("user_id", user.id).order("created_at", { ascending: false });

  // One row per template is the data model's own guarantee (each save
  // reuses the same row via its id), but de-duping here too means a
  // stray duplicate never shows as two seemingly-identical rows with
  // nothing to tell them apart.
  const seenTemplates = new Set();
  const dedupedSites = (sites || []).filter((s) => {
    if (seenTemplates.has(s.template)) return false;
    seenTemplates.add(s.template);
    return true;
  });

  if (dedupedSites.length) {
    sitesList.innerHTML = dedupedSites.map((s) => {
      const bizName = s.data && s.data.businessName && s.data.businessName.trim();
      return myPanelRowHtml({
        kind: "site",
        href: "sites.html?template=" + encodeURIComponent(s.template),
        name: bizName || "אתר עסקי (ללא שם)",
        sub: MY_PANEL_TEMPLATE_LABELS[s.template] || s.template,
        deleteAttr: "site:" + s.id,
        active: !!(ctx && ctx.kind === "site" && ctx.template === s.template),
      });
    }).join("");
  } else {
    sitesList.innerHTML = myPanelEmptyRowHtml({ href: "sites.html?browse=1", text: "עדיין לא בנית אתר —", linkText: "לבניה" });
  }

  const { data: cv } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
  const cvName = cv && cv.data && cv.data.content && cv.data.content.name && cv.data.content.name.trim();
  if (cv) {
    cvList.innerHTML = myPanelRowHtml({
      kind: "cv",
      href: "builder.html",
      name: cvName || "קורות חיים (ללא שם)",
      deleteAttr: "cv",
      active: !!(ctx && ctx.kind === "cv"),
    });
  } else {
    cvList.innerHTML = myPanelEmptyRowHtml({ href: "builder.html", text: "עדיין לא ערכת קורות חיים —", linkText: "לעריכה" });
  }
}

async function deleteMyPanelItem(kind, id, button) {
  const label = kind === "cv" ? "את קורות החיים שלכם" : "את האתר הזה";
  if (!confirm(`למחוק לצמיתות ${label}? הפעולה בלתי הפיכה.`)) return;
  button.disabled = true;
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session && data.session.user;
  if (!user) return;
  if (kind === "site") {
    await supabaseClient.from("site_projects").delete().eq("id", id).eq("user_id", user.id);
  } else if (kind === "cv") {
    await supabaseClient.from("cv_saves").delete().eq("user_id", user.id);
  }
  await loadMyPanel(user);
}

function myPanelSectionsHtml() {
  let collapsed = {};
  try { collapsed = JSON.parse(localStorage.getItem(MY_PANEL_COLLAPSE_KEY) || "{}"); } catch (err) { /* ignore */ }
  const section = (key, label, listId) => `
    <div class="my-panel-section${collapsed[key] ? " collapsed" : ""}" data-section="${key}">
      <button type="button" class="my-panel-section-head">
        <span>${label}</span>${myPanelChevronIcon()}
      </button>
      <div class="my-panel-section-list" id="${listId}"></div>
    </div>`;
  return section("sites", "אתרים", "my-panel-sites") + section("cv", "קורות חיים", "my-panel-cv");
}

/* Reads back the width/collapsed state the pre-paint inline script (first
   line of <body> on every page that mounts this rail) already applied to
   --rail-w before first paint, so this doesn't fight it or cause a flash. */
function myPanelRailWidth() {
  const saved = parseInt(localStorage.getItem(MY_PANEL_RAIL_W_KEY), 10);
  if (Number.isFinite(saved)) return Math.min(MY_PANEL_RAIL_W_MAX, Math.max(MY_PANEL_RAIL_W_MIN, saved));
  return MY_PANEL_RAIL_W_DEFAULT;
}
function myPanelIsCollapsed() {
  return localStorage.getItem(MY_PANEL_RAIL_COLLAPSED_KEY) === "1";
}
function myPanelSetCollapsed(collapsed) {
  document.body.classList.toggle("rail-collapsed", collapsed);
  document.documentElement.style.setProperty("--rail-w", collapsed ? "0px" : myPanelRailWidth() + "px");
  try { localStorage.setItem(MY_PANEL_RAIL_COLLAPSED_KEY, collapsed ? "1" : "0"); } catch (err) { /* ignore */ }
}

function mountMyPanel() {
  if (document.getElementById("my-panel")) return;
  const header = document.querySelector("header.site");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  document.documentElement.style.setProperty("--rail-w", (myPanelIsCollapsed() ? 0 : myPanelRailWidth()) + "px");

  const aside = document.createElement("aside");
  aside.id = "my-panel";
  aside.className = "my-sites-rail no-print";
  aside.innerHTML = `
    <div class="my-panel-resize-handle" id="my-panel-resize-handle"></div>
    <div class="my-panel-head">
      <div class="my-panel-subtitle">התבניות שלי</div>
      <button type="button" class="my-panel-collapse" id="my-panel-collapse-btn" title="הסתרת הסרגל" aria-label="הסתרת הסרגל">${myPanelCollapseIcon()}</button>
    </div>
    <div class="my-panel-body">${myPanelSectionsHtml()}</div>
    <div class="my-panel-account">
      <button type="button" class="my-panel-account-toggle" id="my-panel-account-toggle">
        ${myPanelAccountIcon()}
        <span class="my-panel-account-email"></span>
      </button>
    </div>
  `;
  document.body.appendChild(aside);
  document.body.classList.add("has-sites-rail");

  if (!document.getElementById("my-panel-reopen")) {
    const reopen = document.createElement("button");
    reopen.type = "button";
    reopen.id = "my-panel-reopen";
    reopen.className = "my-panel-reopen no-print";
    reopen.title = "הצגת הסרגל";
    reopen.setAttribute("aria-label", "הצגת הסרגל");
    reopen.innerHTML = myPanelCollapseIcon();
    reopen.addEventListener("click", () => myPanelSetCollapsed(false));
    document.body.appendChild(reopen);
  }

  aside.querySelector("#my-panel-collapse-btn").addEventListener("click", () => myPanelSetCollapsed(true));

  const handle = aside.querySelector("#my-panel-resize-handle");
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    handle.classList.add("dragging");
    document.body.style.userSelect = "none";
    const onMove = (ev) => {
      const w = Math.min(MY_PANEL_RAIL_W_MAX, Math.max(MY_PANEL_RAIL_W_MIN, window.innerWidth - ev.clientX));
      document.documentElement.style.setProperty("--rail-w", w + "px");
    };
    const onUp = () => {
      handle.classList.remove("dragging");
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const finalW = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--rail-w"), 10);
      if (Number.isFinite(finalW)) { try { localStorage.setItem(MY_PANEL_RAIL_W_KEY, finalW); } catch (err) { /* ignore */ } }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  aside.querySelectorAll(".my-panel-section-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".my-panel-section");
      section.classList.toggle("collapsed");
      let collapsed = {};
      try { collapsed = JSON.parse(localStorage.getItem(MY_PANEL_COLLAPSE_KEY) || "{}"); } catch (err) { /* ignore */ }
      collapsed[section.dataset.section] = section.classList.contains("collapsed");
      try { localStorage.setItem(MY_PANEL_COLLAPSE_KEY, JSON.stringify(collapsed)); } catch (err) { /* ignore */ }
    });
  });

  aside.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-panel-delete]");
    if (!btn) return;
    e.preventDefault();
    const [kind, id] = btn.dataset.panelDelete.split(":");
    deleteMyPanelItem(kind, id, btn);
  });

  aside.querySelector("#my-panel-account-toggle").addEventListener("click", (e) => {
    e.stopPropagation();
    const wrap = aside.querySelector(".my-panel-account");
    if (wrap.querySelector(".nav-account-dropdown")) {
      closePanelAccountMenu();
      return;
    }
    const email = aside.querySelector(".my-panel-account-email").textContent;
    openPanelAccountMenu(wrap, email);
  });
}

function unmountMyPanel() {
  closePanelAccountMenu();
  const aside = document.getElementById("my-panel");
  if (aside) aside.remove();
  const reopen = document.getElementById("my-panel-reopen");
  if (reopen) reopen.remove();
  document.body.classList.remove("has-sites-rail", "rail-collapsed");
}

function updatePanelAccountEmail(email) {
  const el = document.querySelector("#my-panel .my-panel-account-email");
  if (el) el.textContent = email || "";
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      mountMyPanel();
      updatePanelAccountEmail(session.user.email);
      loadMyPanel(session.user);
    } else {
      unmountMyPanel();
    }
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      mountMyPanel();
      updatePanelAccountEmail(user.email);
      loadMyPanel(user);
    }
  });
});
