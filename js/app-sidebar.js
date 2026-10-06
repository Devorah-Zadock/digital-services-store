/* Persistent app-shell sidebar — DeskKit unified redesign, round 2.
   A real left-edge icon+label nav (Home / My Projects / six create
   shortcuts / Settings), not just the shared top header — closes the
   single biggest gap against the reference mockup: its dashboard
   screens read as a real workspace specifically because of this rail,
   not the top bar alone.

   Opt-in per page via body.dk-has-app-sidebar (Home's logged-in view,
   Projects, and all four Builder Shells: CV/Sites/Quote/Invoice),
   desktop only, and only once a real session is confirmed — never
   shown to a logged-out visitor, never flashed in before the auth
   check resolves. On a Builder-Shell page, css/deskkit-ui.css shrinks
   the Shell's own `inset-inline-start` to start after the sidebar
   instead of at the true edge, so the sidebar and the Shell coexist —
   the sidebar never disappears while editing. A collapse toggle button
   (own id #dk-app-sidebar-toggle) shrinks it from 216px to a 70px
   icon-only rail via the shared --app-sidebar-w custom property, for
   when the Shell needs the extra width back; mobile keeps the bottom
   nav (js/mobile-nav.js) as the one mobile nav, same non-stacking rule
   that already governs that file.

   --header-h is read by the shared top-offset in css/deskkit-ui.css
   (.dk-app-sidebar's `top`) — this file is now the only thing that
   sets it, the exact same technique the old rail used (header's own
   rendered height, not a hardcoded guess), since nothing else does
   anymore. */

const DK_SIDEBAR_ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.6 5.5 3.6 9s-1.3 6.5-3.6 9c-2.3-2.5-3.6-5.5-3.6-9s1.3-6.5 3.6-9z"/></svg>',
  cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13h5M9.5 16.5h5"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  invoice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M10 9v5l4-2.5z" fill="currentColor" stroke="none"/><path d="M8 21h8M12 17v4"/></svg>',
  xlsx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
};

// Labels read from js/i18n.js's I18N dict at render time (see
// dkSidebarLabel below) rather than hardcoded Hebrew — same
// confirmed-live bug as js/header.js: this sidebar is built fresh from
// this array every time it mounts, which ignored whatever language the
// page had just been switched to.
const DK_SIDEBAR_ITEMS = () => [
  { key: "home", labelKey: "nav_home", href: "index.html" },
  { key: "projects", labelKey: "nav_my_projects", href: "projects.html" },
  { divider: true },
  { key: "site", product: "site", labelKey: "tool_site", href: "sites.html?new=1" },
  { key: "cv", product: "cv", labelKey: "nav_cv", href: "builder.html" },
  { key: "quote", product: "quote", labelKey: "card_quote_h", href: "quote-app.html" },
  { key: "invoice", product: "invoice", labelKey: "card_invoice_h", href: "invoice-app.html" },
  { key: "deck", product: "deck", labelKey: "card_deck_h", href: "products.html?type=deck" },
  { key: "xlsx", product: "xlsx", labelKey: "card_xlsx_h", href: "products.html?type=xlsx" },
  { divider: true },
  { key: "settings", labelKey: "nav_settings", href: "account-settings.html" },
];

function dkSidebarLabel(key) {
  const lang = typeof currentLang === "function" ? currentLang() : "he";
  const dict = (typeof I18N !== "undefined" && I18N[lang]) || {};
  return dict[key] || key;
}

function dkAppSidebarItemHtml(it, here) {
  const label = it.labelKey ? dkSidebarLabel(it.labelKey) : "";
  if (it.divider) return '<div class="dk-app-sidebar-divider"></div>';
  const active = it.href.split("?")[0] === here;
  const iconBox = `<span class="dk-app-sidebar-icon">${DK_SIDEBAR_ICONS[it.key] || ""}</span>`;
  return `<a href="${it.href}" class="dk-app-sidebar-item${active ? " active" : ""}"${it.product ? ` data-dk-product="${it.product}"` : ""} title="${label}">${iconBox}<span class="dk-app-sidebar-item-label">${label}</span></a>`;
}

// Collapse state (260px <-> 70px icon-only) is a per-viewer convenience,
// remembered the same way the lang toggle already does — never required
// for the sidebar to render correctly if it's missing or blocked.
function dkSidebarCollapsedPref() {
  try { return localStorage.getItem("dk_sidebar_collapsed") === "1"; } catch (e) { return false; }
}

function dkToggleAppSidebar() {
  const collapsed = document.body.classList.toggle("dk-app-sidebar-collapsed");
  try { localStorage.setItem("dk_sidebar_collapsed", collapsed ? "1" : "0"); } catch (e) {}
}

function dkSidebarAccountIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex:none;"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>';
}

// Same account menu as the header's own (js/nav-auth.js), opened
// upward since this trigger sits at the very bottom of the sidebar —
// the same proven pattern the old, removed my-panel.js rail used for
// its own bottom-anchored account row.
function dkAppSidebarAccountHtml(email) {
  const safeEmail = String(email || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<div class="dk-app-sidebar-account">
    <button type="button" class="dk-app-sidebar-account-toggle" id="dk-app-sidebar-account-toggle">
      ${dkSidebarAccountIcon()}<span class="dk-app-sidebar-account-email">${safeEmail}</span>
    </button>
  </div>`;
}

// Remembered so a language-change re-render (see "deskkit:langchange"
// below) doesn't need a real auth round-trip just to redraw.
let dkSidebarLastEmail = null;

function dkMountAppSidebar(email) {
  if (email !== undefined) dkSidebarLastEmail = email;
  if (document.getElementById("dk-app-sidebar")) return;
  const header = document.querySelector("header.site");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  const here = location.pathname.split("/").pop() || "index.html";

  const aside = document.createElement("aside");
  aside.id = "dk-app-sidebar";
  aside.className = "dk-app-sidebar no-print";
  const toggleBtn = `<button type="button" class="dk-app-sidebar-toggle" id="dk-app-sidebar-toggle" aria-label="${dkSidebarLabel("sidebar_toggle_aria")}">‹</button>`;
  aside.innerHTML = toggleBtn + DK_SIDEBAR_ITEMS().map((it) => dkAppSidebarItemHtml(it, here)).join("") + dkAppSidebarAccountHtml(dkSidebarLastEmail);
  document.body.appendChild(aside);
  document.body.classList.add("dk-app-sidebar-mounted");
  if (dkSidebarCollapsedPref()) document.body.classList.add("dk-app-sidebar-collapsed");
  document.getElementById("dk-app-sidebar-toggle").addEventListener("click", dkToggleAppSidebar);

  const acctToggle = document.getElementById("dk-app-sidebar-account-toggle");
  if (acctToggle && typeof openNavDropdown === "function") {
    acctToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const wrap = aside.querySelector(".dk-app-sidebar-account");
      if (wrap.querySelector(".nav-account-dropdown")) { closeNavDropdown(); return; }
      openNavDropdown(wrap, dkSidebarLastEmail || "", acctToggle, true);
    });
  }
}

function dkUnmountAppSidebar() {
  const aside = document.getElementById("dk-app-sidebar");
  if (aside) aside.remove();
  document.body.classList.remove("dk-app-sidebar-mounted");
}

// Re-renders in place (labels only — same items/order/icons) when the
// language changes while the sidebar is already mounted; a no-op when
// it isn't mounted (logged-out visitor, or a page without the sidebar).
function dkRerenderAppSidebarLabels() {
  const aside = document.getElementById("dk-app-sidebar");
  if (!aside) return;
  dkUnmountAppSidebar();
  dkMountAppSidebar(dkSidebarLastEmail);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dk-has-app-sidebar")) return;
  document.addEventListener("deskkit:langchange", dkRerenderAppSidebarLabels);
  if (typeof supabaseClient === "undefined") return;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) dkMountAppSidebar(session.user.email); else dkUnmountAppSidebar();
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) dkMountAppSidebar(data.session.user.email);
  });
});
