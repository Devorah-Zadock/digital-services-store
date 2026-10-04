/* Global mobile bottom navigation — DeskKit unified redesign.
   A real mobile nav (fixed bottom bar: בית/יצירה/פרויקטים/Automate/
   חשבון), not a shrunk desktop header. Hidden automatically while a
   Builder-Shell owns the screen (sites.html/builder.html/quote-app.html/
   invoice-app.html each already have their own mobile top tab bar —
   see css/deskkit-ui.css's body.dk-has-mobile-nav rules), so the two
   mobile navs never stack. */

function dkMobileNavIcon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    create: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    automate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-6 8-6s8 2 8 6"/></svg>',
  };
  return icons[name] || "";
}

function dkMobileNavRender(loggedIn) {
  const here = location.pathname.split("/").pop() || "index.html";
  const accountHref = loggedIn ? "account-settings.html" : "account.html?redirect=" + encodeURIComponent(here);
  const items = [
    { icon: "home", label: "בית", href: "index.html" },
    { icon: "create", label: "יצירה", action: "create" },
    { icon: "projects", label: "פרויקטים", href: "projects.html" },
    { icon: "automate", label: "Automate", href: "automate.html" },
    { icon: "account", label: "חשבון", href: accountHref },
  ];
  return items.map((it) => {
    const active = it.href && it.href.split("?")[0] === here;
    if (it.icon === "create") {
      return `<button type="button" class="dk-mobile-nav-item dk-mobile-nav-item-create" data-dk-mnav-action="create">
        <span class="dk-mobile-nav-create-circle">${dkMobileNavIcon("create")}</span>${it.label}
      </button>`;
    }
    return `<a href="${it.href}" class="dk-mobile-nav-item${active ? " active" : ""}">${dkMobileNavIcon(it.icon)}${it.label}</a>`;
  }).join("");
}

function dkMobileNavMount(loggedIn) {
  document.body.classList.add("dk-has-mobile-nav");
  let nav = document.getElementById("dk-mobile-nav");
  if (!nav) {
    nav = document.createElement("nav");
    nav.id = "dk-mobile-nav";
    nav.className = "dk-mobile-nav no-print";
    document.body.appendChild(nav);
  }
  nav.innerHTML = `<div class="dk-mobile-nav-row">${dkMobileNavRender(loggedIn)}</div>`;
  const createBtn = nav.querySelector('[data-dk-mnav-action="create"]');
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      if (typeof openCreateChooser === "function") openCreateChooser();
      else location.href = "index.html#tools";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof supabaseClient === "undefined") { dkMobileNavMount(false); return; }
  supabaseClient.auth.onAuthStateChange((_event, session) => dkMobileNavMount(!!(session && session.user)));
  supabaseClient.auth.getSession().then(({ data }) => dkMobileNavMount(!!(data.session && data.session.user)));
});
