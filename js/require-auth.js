/* Gates a page behind login. Include on any page that requires an
   account. Shows a full-screen overlay until the session check
   resolves, then either reveals the real page or sends the visitor
   to account.html to sign in (Google or email), returning here after.

   Pages that also restore saved cloud data (e.g. a saved CV) should
   set `window.deferReveal = true` before this script runs, and call
   `window.revealGatedPage()` themselves once that data is loaded —
   otherwise the page flashes its default state before the real saved
   content replaces it. */

function revealGatedPage() {
  const overlay = document.getElementById("auth-gate-overlay");
  if (overlay) overlay.remove();
}
window.revealGatedPage = revealGatedPage;

document.addEventListener("DOMContentLoaded", () => {
  const here = location.pathname.split("/").pop();

  function route(session) {
    if (session && session.user) {
      if (!window.deferReveal) revealGatedPage();
    } else {
      window.location.href = "account.html?redirect=" + encodeURIComponent(here);
    }
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => route(session));
  supabaseClient.auth.getSession().then(({ data }) => route(data.session));
});
