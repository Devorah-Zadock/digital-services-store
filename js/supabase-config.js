/* Supabase project connection. The anon/public key below is safe to expose
   client-side by design (Supabase docs: "safe to use in a browser if you
   have RLS enabled") — real access control lives in the RLS policies set
   up in the SQL editor, not in keeping this key secret. */
const SUPABASE_URL = "https://vafkjsetlrpaczsmqvqs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZmtqc2V0bHJwYWN6c21xdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTkwMjAsImV4cCI6MjEwMzMzNTAyMH0.DNYdVBg05E2zZVmA0-SChoXGQ6_gHyBta0nJC4exzxk";

/* Per-account project limits (supabase/sql/project_limits.sql): when the
   database refuses a NEW project because the account already has the
   maximum for that tool, explain it once in plain words — whichever tool
   or save path made the request. The response itself reaches the caller
   unchanged, so each tool still shows its own "not saved" state. */
const DK_LIMIT_KINDS = {
  site_projects: ["אתרים", "sites"],
  cv_saves: ["קורות חיים", "CVs"],
  quote_saves: ["הצעות מחיר", "quotes"],
  invoice_saves: ["חשבוניות", "invoices"],
  schedule_projects: ["מערכות שעות", "schedules"],
};
let dkLimitShownAt = 0;
function dkShowProjectLimit(tbl, limit) {
  if (Date.now() - dkLimitShownAt < 60000 || !document.body) return;
  dkLimitShownAt = Date.now();
  let en = false;
  try { en = localStorage.getItem("deskkit_lang") === "en"; } catch (e) { /* ignore */ }
  const kind = (DK_LIMIT_KINDS[tbl] || ["פרויקטים", "projects"])[en ? 1 : 0];
  const old = document.getElementById("dk-limit-modal");
  if (old) old.remove();
  const wrap = document.createElement("div");
  wrap.id = "dk-limit-modal";
  wrap.setAttribute("role", "alertdialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.dir = en ? "ltr" : "rtl";
  wrap.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;";
  const box = document.createElement("div");
  box.style.cssText = "background:#fff;color:#0f172a;max-width:420px;width:100%;border-radius:18px;padding:24px 22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:start;";
  const h = document.createElement("h2");
  h.style.cssText = "margin:0 0 8px;font-size:19px;";
  h.textContent = en ? "You've reached the limit" : "הגעתם למקסימום";
  const p = document.createElement("p");
  p.style.cssText = "margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;";
  p.textContent = en
    ? `Your account can keep up to ${limit} ${kind}. To create a new one, delete one you no longer need in "My projects". Everything you already have is safe.`
    : `בחשבון אפשר לשמור עד ${limit} ${kind}. כדי ליצור חדש, מחקו אחד שכבר לא צריך ב"הפרויקטים שלי". כל מה שכבר שמור אצלכם נשאר בטוח.`;
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;";
  const go = document.createElement("a");
  go.href = "projects.html";
  go.textContent = en ? "My projects" : "הפרויקטים שלי";
  go.style.cssText = "background:#14B8A6;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:12px;font-size:15px;";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = en ? "Close" : "סגירה";
  close.style.cssText = "background:#f1f5f9;color:#0f172a;border:0;font:inherit;font-weight:600;padding:10px 18px;border-radius:12px;font-size:15px;cursor:pointer;";
  close.addEventListener("click", () => wrap.remove());
  wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
  row.append(go, close);
  box.append(h, p, row);
  wrap.appendChild(box);
  document.body.appendChild(wrap);
  close.focus();
}
function dkLimitAwareFetch(input, init) {
  return fetch(input, init).then((res) => {
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (res.status >= 400 && res.status < 500 && url.indexOf("/rest/v1/") !== -1) {
        res.clone().text().then((t) => {
          const m = /project_limit:([a-z_]+):(\d+)/.exec(t || "");
          if (m) dkShowProjectLimit(m[1], parseInt(m[2], 10));
        }).catch(() => {});
      }
    } catch (e) { /* never break a request */ }
    return res;
  });
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { fetch: dkLimitAwareFetch } });

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
