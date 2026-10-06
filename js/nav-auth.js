/* Keeps the header's account control in sync with the real session,
   on every page — not just the account-related ones. Logged out: a
   link to account.html, returning here after login. Logged in: opens
   a small menu showing which account is connected, with a
   confirm-before-logout step (not an instant sign-out).

   The session check is async, and every page's static HTML starts as
   "כניסה" — so a logged-in visitor would otherwise see it flash
   "כניסה" then flip on every single page load. The link starts
   hidden (space still reserved, so nothing shifts) and only becomes
   visible once we actually know which state is correct. */

function navIconSvg() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex:none;"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>';
}

function escapeHtmlNav(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Same lookup-with-real-fallback pattern as js/header.js's dkHeaderLabel
// — works whether or not js/i18n.js is even loaded on this page, since
// this file (unlike that one) mounts on every page.
function navLabel(key, fallback) {
  const lang = typeof currentLang === "function" ? currentLang() : "he";
  const dict = (typeof I18N !== "undefined" && I18N[lang]) || null;
  return (dict && dict[key]) || fallback;
}

// Which element opened the currently-open dropdown — originally always
// #nav-login-link, now also js/app-sidebar.js's own account row at the
// bottom of the sidebar. Tracked here (not re-queried by a hardcoded
// id) so a second click on WHICHEVER trigger opened it toggles it
// closed instead of the outside-click listener treating that trigger
// as "outside" and closing it, only to have the trigger's own handler
// reopen it a tick later.
let navDropdownTrigger = null;

function closeNavDropdown() {
  const dd = document.getElementById("nav-account-dropdown");
  if (dd) dd.remove();
  document.removeEventListener("click", onNavOutsideClick, true);
  navDropdownTrigger = null;
}

function onNavOutsideClick(e) {
  const dd = document.getElementById("nav-account-dropdown");
  const trigger = navDropdownTrigger;
  if (dd && !dd.contains(e.target) && (!trigger || (e.target !== trigger && !trigger.contains(e.target)))) {
    closeNavDropdown();
  }
}

// Checked right before offering to sign out — Quote/Invoice's Builder
// Shells (js/quote-builder-shell.js, js/invoice-builder-shell.js) are
// explicit-save-only with no autosave net, and a real sign-out ends the
// session that save itself needs, so this is the last point where
// warning (and giving the person a chance to save first) still helps;
// once already signed out, there's no session left to save with.
// Checking two known globals directly, rather than a generic registry,
// matches how window.openCreateChooser/refreshMyPanel are already
// consulted elsewhere in this codebase — proportional to there being
// exactly two of these today.
function dkAnyUnsavedWork() {
  return !!((window.dkQuoteHasUnsavedWork && window.dkQuoteHasUnsavedWork())
    || (window.dkInvoiceHasUnsavedWork && window.dkInvoiceHasUnsavedWork()));
}

function openNavDropdown(wrap, email, trigger, dropup) {
  closeNavDropdown();
  navDropdownTrigger = trigger || wrap;
  const dd = document.createElement("div");
  dd.id = "nav-account-dropdown";
  // dropup: the trigger sits at the bottom of the app-shell sidebar
  // (js/app-sidebar.js), where opening downward would run off the
  // bottom of the viewport — same upward variant the old, removed
  // my-panel.js rail used for the exact same reason.
  dd.className = "nav-account-dropdown" + (dropup ? " dropup" : "");
  const unsavedWarning = dkAnyUnsavedWork()
    ? `<p class="nav-account-unsaved-warn">${navLabel("nav_logout_unsaved_warn", "יש לך שינויים שלא נשמרו — הם יאבדו אם תתנתקו בלי לשמור.")}</p>`
    : "";
  dd.innerHTML = `
    <div class="nav-account-email">${escapeHtmlNav(email)}</div>
    <a href="account-settings.html" class="nav-account-settings">${navLabel("terms_account_link", "החשבון שלי")}</a>
    <button type="button" class="nav-account-logout">${navLabel("nav_logout", "התנתקות")}</button>
    <div class="nav-account-confirm" hidden>
      ${unsavedWarning}
      <p>${navLabel("nav_logout_confirm_q", "להתנתק?")}</p>
      <div class="nav-account-confirm-row">
        <button type="button" class="nav-confirm-yes">${navLabel("nav_logout_confirm_yes", "כן, להתנתק")}</button>
        <button type="button" class="nav-confirm-no">${navLabel("nav_logout_confirm_cancel", "ביטול")}</button>
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
    // Reload in place rather than jumping to a fixed page: a public page
    // just re-renders with the logged-out header, and a gated page falls
    // through to require-auth.js's own redirect — same as visiting it
    // signed out in the first place. Never surprises the visitor by
    // moving them away from wherever they actually were.
    window.location.reload();
  });

  setTimeout(() => document.addEventListener("click", onNavOutsideClick, true), 0);
}

function applyNavAuthState(session) {
  const link = document.getElementById("nav-login-link");
  if (!link) return;
  link.classList.remove("nav-login-pending");
  closeNavDropdown();

  let wrap = link.parentElement;
  if (!wrap || !wrap.classList.contains("nav-account-wrap")) {
    wrap = document.createElement("span");
    wrap.className = "nav-account-wrap";
    link.parentNode.insertBefore(wrap, link);
    wrap.appendChild(link);
  }

  if (session && session.user) {
    link.href = "#";
    link.title = session.user.email;
    link.innerHTML = navIconSvg() + `<span class="nav-login-email">${escapeHtmlNav(session.user.email)}</span>`;
    link.onclick = (e) => {
      e.preventDefault();
      if (document.getElementById("nav-account-dropdown")) closeNavDropdown();
      else openNavDropdown(wrap, session.user.email, link);
    };
  } else {
    // pathname.split("/").pop() is "" for the bare root ("/" or the
    // domain with no path at all) — that's index.html, not a missing
    // page, so falling back to tools.html there sent a visitor logging
    // in from the homepage somewhere else entirely.
    const here = location.pathname.split("/").pop() || "index.html";
    link.href = "account.html?redirect=" + encodeURIComponent(here);
    link.removeAttribute("title");
    // Hardcoded "כניסה" here never updated on language toggle — this
    // link is owned by this file, not by js/header.js (see this file's
    // own top comment), so header.js's own i18n re-render never touched
    // it. Confirmed-live bug this fixes: toggling to English translated
    // every other nav string except this one, which stayed stuck on
    // Hebrew.
    link.innerHTML = navIconSvg() + `<span>${escapeHtmlNav(navLabel("nav_login", "כניסה"))}</span>`;
    link.onclick = null;
  }
}

let dkNavAuthLastSession = null;

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    dkNavAuthLastSession = session;
    applyNavAuthState(session);
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    dkNavAuthLastSession = data.session;
    applyNavAuthState(data.session);
  });
  document.addEventListener("deskkit:langchange", () => applyNavAuthState(dkNavAuthLastSession));
});
