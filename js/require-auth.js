/* Gates a page behind login. Include on any page that requires an
   account. Shows a full-screen overlay until the session check
   resolves, then either reveals the real page or sends the visitor
   to account.html to sign in (Google or email), returning here after. */

document.addEventListener("DOMContentLoaded", () => {
  const here = location.pathname.split("/").pop();

  function reveal() {
    const overlay = document.getElementById("auth-gate-overlay");
    if (overlay) overlay.remove();
  }

  function route(session) {
    if (session && session.user) {
      reveal();
    } else {
      window.location.href = "account.html?redirect=" + encodeURIComponent(here);
    }
  }

  supabaseClient.auth.onAuthStateChange((_event, session) => route(session));
  supabaseClient.auth.getSession().then(({ data }) => route(data.session));
});
