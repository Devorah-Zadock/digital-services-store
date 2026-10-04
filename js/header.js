/* Shared header behavior — part of the DeskKit unified redesign.
   Every page keeps its own static <header class="site"><nav> markup
   (brand + .nav-links + .nav-end-group + burger — unchanged structure,
   so nothing else that targets those selectors breaks), but this
   script rewrites the MIDDLE link set and adds the primary CTA based
   on real auth state, so every page shows the same minimal nav instead
   of each page's old hand-written 9-link list. js/nav-auth.js still
   owns turning "כניסה" into the signed-in email + logout dropdown —
   this script only ever touches .nav-links and .nav-end-group's own
   extra CTA, never that element, so the two scripts can't fight. */

const DK_HEADER_LOGGED_OUT_LINKS = () => [
  { href: "index.html#tools", label: "מה אפשר ליצור" },
  { href: "index.html#how", label: "איך זה עובד" },
  { href: "about.html", label: "אודות" },
];

const DK_HEADER_LOGGED_IN_LINKS = () => [
  { href: "#", label: "יצירה", action: "create" },
  { href: "projects.html", label: "הפרויקטים שלי" },
  { href: "automate.html", label: "Automate" },
];

function dkHeaderApply(session) {
  const nav = document.querySelector("header.site .nav");
  if (!nav) return;
  const linksEl = nav.querySelector(".nav-links");
  const endGroup = nav.querySelector(".nav-end-group");
  if (!linksEl) return;

  const loggedIn = !!(session && session.user);
  const here = location.pathname.split("/").pop() || "index.html";
  const links = loggedIn ? DK_HEADER_LOGGED_IN_LINKS() : DK_HEADER_LOGGED_OUT_LINKS();

  linksEl.innerHTML = links.map((l) => {
    // Anchor links (index.html#tools, index.html#how) are same-page
    // scroll jumps, not separate destinations — matching them by page
    // alone made BOTH "מה אפשר ליצור" and "איך זה עובד" show active at
    // once on index.html (confirmed live), since both resolve to the
    // same page. Only a real, anchor-free destination can be "active".
    const isActive = !l.action && !l.href.includes("#") && l.href.split("#")[0] === here;
    return `<a href="${l.href}"${l.action ? ` data-dk-nav-action="${l.action}"` : ""}${isActive ? ' class="active"' : ""}>${l.label}</a>`;
  }).join("");

  const createLink = linksEl.querySelector('[data-dk-nav-action="create"]');
  if (createLink) {
    createLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof openCreateChooser === "function") openCreateChooser();
    });
  }

  if (endGroup) {
    let cta = endGroup.querySelector("#dk-header-cta");
    if (!loggedIn) {
      if (!cta) {
        cta = document.createElement("a");
        cta.id = "dk-header-cta";
        cta.className = "dk-header-cta";
        cta.textContent = "התחילו ליצור";
        cta.href = "account.html?redirect=" + encodeURIComponent(here);
        endGroup.insertBefore(cta, endGroup.firstChild);
      }
    } else if (cta) {
      cta.remove();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof supabaseClient === "undefined") return;
  supabaseClient.auth.onAuthStateChange((_event, session) => dkHeaderApply(session));
  supabaseClient.auth.getSession().then(({ data }) => dkHeaderApply(data.session));
});
