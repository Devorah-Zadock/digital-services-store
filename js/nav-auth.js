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

function closeNavDropdown() {
  const dd = document.getElementById("nav-account-dropdown");
  if (dd) dd.remove();
  document.removeEventListener("click", onNavOutsideClick, true);
}

function onNavOutsideClick(e) {
  const dd = document.getElementById("nav-account-dropdown");
  const link = document.getElementById("nav-login-link");
  if (dd && !dd.contains(e.target) && e.target !== link && !link.contains(e.target)) {
    closeNavDropdown();
  }
}

function openNavDropdown(wrap, email) {
  closeNavDropdown();
  const dd = document.createElement("div");
  dd.id = "nav-account-dropdown";
  dd.className = "nav-account-dropdown";
  dd.innerHTML = `
    <div class="nav-account-email">${escapeHtmlNav(email)}</div>
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
      else openNavDropdown(wrap, session.user.email);
    };
  } else {
    const here = location.pathname.split("/").pop() || "tools.html";
    link.href = "account.html?redirect=" + encodeURIComponent(here);
    link.removeAttribute("title");
    link.innerHTML = navIconSvg() + "<span>כניסה</span>";
    link.onclick = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => applyNavAuthState(session));
  supabaseClient.auth.getSession().then(({ data }) => applyNavAuthState(data.session));
});
