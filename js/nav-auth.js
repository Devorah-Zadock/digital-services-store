/* Keeps the header's "👤 כניסה" link in sync with the real account
   session, on every page — not just the account-related ones. Logged
   out: links to account.html, redirecting back to the current page
   after login. Logged in: becomes a one-click logout, everywhere. */

function applyNavAuthState(session) {
  const link = document.getElementById("nav-login-link");
  if (!link) return;
  if (session && session.user) {
    link.textContent = "👤 התנתקות";
    link.href = "#";
    link.onclick = async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = "tools.html";
    };
  } else {
    const here = location.pathname.split("/").pop() || "tools.html";
    link.textContent = "👤 כניסה";
    link.href = "account.html?redirect=" + encodeURIComponent(here);
    link.onclick = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => applyNavAuthState(session));
  supabaseClient.auth.getSession().then(({ data }) => applyNavAuthState(data.session));
});
