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

const DK_SIDEBAR_ITEMS = [
  { key: "home", label: "בית", href: "index.html" },
  { key: "projects", label: "הפרויקטים שלי", href: "projects.html" },
  { divider: true },
  { key: "site", product: "site", label: "אתר", href: "sites.html?new=1" },
  { key: "cv", product: "cv", label: "קורות חיים", href: "builder.html" },
  { key: "quote", product: "quote", label: "הצעת מחיר", href: "quote-app.html" },
  { key: "invoice", product: "invoice", label: "חשבונית", href: "invoice-app.html" },
  { key: "deck", product: "deck", label: "מצגת", href: "products.html?type=deck" },
  { key: "xlsx", product: "xlsx", label: "גליון", href: "products.html?type=xlsx" },
  { divider: true },
  { key: "settings", label: "הגדרות", href: "account-settings.html" },
];

function dkAppSidebarItemHtml(it, here) {
  if (it.divider) return '<div class="dk-app-sidebar-divider"></div>';
  const active = it.href.split("?")[0] === here;
  const iconBox = `<span class="dk-app-sidebar-icon">${DK_SIDEBAR_ICONS[it.key] || ""}</span>`;
  return `<a href="${it.href}" class="dk-app-sidebar-item${active ? " active" : ""}"${it.product ? ` data-dk-product="${it.product}"` : ""} title="${it.label}">${iconBox}<span class="dk-app-sidebar-item-label">${it.label}</span></a>`;
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

function dkMountAppSidebar() {
  if (document.getElementById("dk-app-sidebar")) return;
  const header = document.querySelector("header.site");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  const here = location.pathname.split("/").pop() || "index.html";

  const aside = document.createElement("aside");
  aside.id = "dk-app-sidebar";
  aside.className = "dk-app-sidebar no-print";
  const toggleBtn = '<button type="button" class="dk-app-sidebar-toggle" id="dk-app-sidebar-toggle" aria-label="כיווץ או הרחבת סרגל הצד">‹</button>';
  aside.innerHTML = toggleBtn + DK_SIDEBAR_ITEMS.map((it) => dkAppSidebarItemHtml(it, here)).join("");
  document.body.appendChild(aside);
  document.body.classList.add("dk-app-sidebar-mounted");
  if (dkSidebarCollapsedPref()) document.body.classList.add("dk-app-sidebar-collapsed");
  document.getElementById("dk-app-sidebar-toggle").addEventListener("click", dkToggleAppSidebar);
}

function dkUnmountAppSidebar() {
  const aside = document.getElementById("dk-app-sidebar");
  if (aside) aside.remove();
  document.body.classList.remove("dk-app-sidebar-mounted");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("dk-has-app-sidebar")) return;
  if (typeof supabaseClient === "undefined") return;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) dkMountAppSidebar(); else dkUnmountAppSidebar();
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) dkMountAppSidebar();
  });
});
