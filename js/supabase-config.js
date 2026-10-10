/* Supabase project connection. The anon/public key below is safe to expose
   client-side by design (Supabase docs: "safe to use in a browser if you
   have RLS enabled") — real access control lives in the RLS policies set
   up in the SQL editor, not in keeping this key secret. */
const SUPABASE_URL = "https://vafkjsetlrpaczsmqvqs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZmtqc2V0bHJwYWN6c21xdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTkwMjAsImV4cCI6MjEwMzMzNTAyMH0.DNYdVBg05E2zZVmA0-SChoXGQ6_gHyBta0nJC4exzxk";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Welcome email: right after a new account is signed in (and its email
   confirmed), ask the server to send it — once. The server decides who
   actually gets one (supabase/functions/account-welcome); this browser
   just remembers the answer, so it asks at most once per account. */
(function dkWelcomeOnce() {
  function ask(session) {
    const user = session && session.user;
    if (!user || !user.id) return;
    const key = "dk_welcome_done_" + user.id;
    try { if (localStorage.getItem(key)) return; } catch (e) { return; }
    // Accounts older than a week were never going to get one.
    if (user.created_at && Date.now() - new Date(user.created_at).getTime() > 7 * 864e5) {
      try { localStorage.setItem(key, "1"); } catch (e) { /* ignore */ }
      return;
    }
    if (!user.email_confirmed_at && !user.confirmed_at) return;
    fetch(SUPABASE_URL + "/functions/v1/account-welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token, apikey: SUPABASE_ANON_KEY },
      body: "{}",
    }).then((r) => r.json()).then((d) => {
      if (d && d.done) { try { localStorage.setItem(key, "1"); } catch (e) { /* ignore */ } }
    }).catch(() => {});
  }
  try {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") setTimeout(() => ask(session), 1500);
    });
  } catch (e) { /* never break the page */ }
})();
