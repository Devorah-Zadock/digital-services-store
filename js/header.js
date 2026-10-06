/* Shared header behavior — part of the DeskKit unified redesign.
   Every page keeps its own static <header class="site"><nav> markup
   (brand + .nav-links + .nav-end-group + burger — unchanged structure,
   so nothing else that targets those selectors breaks), but this
   script rewrites the MIDDLE link set and adds the primary CTA based
   on real auth state, so every page shows the same minimal nav instead
   of each page's old hand-written 9-link list. js/nav-auth.js still
   owns turning "כניסה" into the signed-in email + logout dropdown —
   this script only ever touches .nav-links and .nav-end-group's own
   extra CTA, never that element, so the two scripts can't fight.

   Reads its labels from js/i18n.js's I18N dict + currentLang() (both
   plain globals, loaded before this file's own DOMContentLoaded logic
   ever runs) rather than hardcoding Hebrew — confirmed-live bug this
   fixes: since this re-renders .nav-links/the CTA from scratch on
   every auth-state change, it was overwriting whatever language
   index.html's own data-i18n sweep had just set, back to Hebrew,
   regardless of the toggle. Also re-runs on "deskkit:langchange" (the
   event applyLang() already dispatches for exactly this kind of
   JS-rendered content) so toggling the language updates this header
   immediately instead of only on the next auth event. */

// fallback is the real Hebrew text, not just a dictionary key — i18n.js
// is only loaded on a handful of pages so far (see its own "rolling out
// page by page" comment), but this header mounts on EVERY page via
// js/header.js, most of which don't load i18n.js at all. Confirmed-live
// regression this fixes: on those pages, I18N/currentLang are simply
// undefined globals, and without a real fallback here this printed the
// raw key string itself ("nav_what_create") instead of any real text.
function dkHeaderLabel(key, fallback) {
  const lang = typeof currentLang === "function" ? currentLang() : "he";
  const dict = (typeof I18N !== "undefined" && I18N[lang]) || null;
  return (dict && dict[key]) || fallback;
}

const DK_HEADER_LOGGED_OUT_LINKS = () => [
  { href: "index.html#tools", label: dkHeaderLabel("nav_what_create", "מה אפשר ליצור") },
  { href: "index.html#how", label: dkHeaderLabel("nav_how_works", "איך זה עובד") },
  { href: "about.html", label: dkHeaderLabel("nav_about", "אודות") },
];

const DK_HEADER_LOGGED_IN_LINKS = () => [
  { href: "#", label: dkHeaderLabel("nav_create", "יצירה"), action: "create" },
  { href: "projects.html", label: dkHeaderLabel("nav_my_projects", "הפרויקטים שלי") },
  { href: "automate.html", label: "Automate" },
];

// Remembered across re-renders (e.g. a language-change re-render) so this
// doesn't need a real auth round-trip just to redraw in the new language.
let dkHeaderLastSession = null;

function dkHeaderApply(session) {
  if (session !== undefined) dkHeaderLastSession = session;
  const nav = document.querySelector("header.site .nav");
  if (!nav) return;
  const linksEl = nav.querySelector(".nav-links");
  const endGroup = nav.querySelector(".nav-end-group");
  if (!linksEl) return;

  const loggedIn = !!(dkHeaderLastSession && dkHeaderLastSession.user);
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
        cta.href = "account.html?redirect=" + encodeURIComponent(here);
        endGroup.insertBefore(cta, endGroup.firstChild);
      }
      // Always refreshed (not just on creation), so a language-change
      // re-render updates existing text instead of leaving the first
      // language it was created in — the bug this whole file fixes.
      cta.textContent = dkHeaderLabel("header_cta_start", "התחילו ליצור");
    } else if (cta) {
      cta.remove();
    }
  }
}

/* Mounts the EN/עברית toggle into EVERY page's header, not just the 16
   pages that load js/i18n.js and carry real data-i18n translations —
   requested live: "the EN switch icon needs to be in the header on
   every single page". On an i18n.js page the button already exists in
   that page's own static markup (built long before this function
   existed) — reused as-is, nothing duplicated. On every other page
   this creates it fresh, since there's nothing there yet.

   Clicking it still calls the real applyLang() when i18n.js is loaded
   on the current page — identical behavior to before, nothing lost.
   On a page with no i18n.js (no data-i18n content to translate at all
   yet), there is nothing on THIS page translation could change, so the
   click instead persists the preference and sends the visitor to the
   Home page, which is guaranteed to render correctly in the chosen
   language — a toggle that visibly did nothing on click would read as
   broken, not just "not translated here yet". */
function dkHeaderMountLangToggle() {
  const endGroup = document.querySelector("header.site .nav .nav-end-group");
  if (!endGroup) return;
  let toggle = document.getElementById("lang-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "lang-toggle";
    toggle.className = "lang-toggle";
    toggle.setAttribute("aria-label", "Switch language");
    endGroup.appendChild(toggle);
  }
  const lang = document.documentElement.lang === "en" ? "en" : "he";
  toggle.textContent = lang === "en" ? "עברית" : "EN";
  toggle.addEventListener("click", () => {
    if (typeof applyLang === "function") {
      const cur = typeof currentLang === "function" ? currentLang() : lang;
      applyLang(cur === "en" ? "he" : "en");
      return;
    }
    let stored = null;
    try { stored = localStorage.getItem("deskkit_lang"); } catch (err) { /* storage unavailable */ }
    const current = stored === "en" ? "en" : "he";
    try { localStorage.setItem("deskkit_lang", current === "en" ? "he" : "en"); } catch (err) { /* storage unavailable */ }
    location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  dkHeaderMountLangToggle();
  document.addEventListener("deskkit:langchange", () => dkHeaderApply(undefined));
  if (typeof supabaseClient === "undefined") return;
  supabaseClient.auth.onAuthStateChange((_event, session) => dkHeaderApply(session));
  supabaseClient.auth.getSession().then(({ data }) => dkHeaderApply(data.session));
});
