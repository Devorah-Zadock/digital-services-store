/* Private admin page: password gate (client-side only — same honest
   security caveat as quotes.html, see README) + a link into the real,
   persistent feedback inbox (Formspree — see admin.html for why a static
   site needs an external service to keep messages after a refresh). */

/* SHA-256 hex of the current password. Default password: "deskkit2026".
   To change it: compute a new hash (e.g. in the browser console:
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEW_PASSWORD"))
   then hex-encode it) and replace the value below. */
const ADMIN_PASSWORD_HASH = "94735446ce9e3c2d0a4d9761268127335e9514fd1e0558b9d93e368b34fd5b62";
const ADMIN_AUTH_KEY = "deskkit-admin-auth";

/* Paste the Formspree submissions-dashboard URL here once it's set up
   (see the setup steps on this page). Leave empty to show the setup
   instructions instead. */
const ADMIN_INBOX_URL = "https://formspree.io/forms/moeagwvk/submissions";

/* Same Supabase project as everywhere else on the site (see
   js/supabase-config.js) — duplicated here as a plain constant instead of
   loading the full supabase-js SDK, since this page only ever makes one
   raw fetch() to a single Edge Function endpoint. The project URL isn't
   secret (Supabase docs: safe to expose client-side); the anon key below
   is the same public anon key used site-wide. */
const ADMIN_SUPABASE_URL = "https://vafkjsetlrpaczsmqvqs.supabase.co";
const ADMIN_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZmtqc2V0bHJwYWN6c21xdnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTkwMjAsImV4cCI6MjEwMzMzNTAyMH0.DNYdVBg05E2zZVmA0-SChoXGQ6_gHyBta0nJC4exzxk";

/* Set to the same string you paste into the admin-stats Edge Function's
   ADMIN_STATS_KEY secret (Supabase Dashboard → Edge Functions →
   admin-stats → Secrets). Leave empty to show setup instructions instead
   of the customers/usage card. This is a shared token, not real auth —
   same honest caveat as the password gate on this whole page: a
   determined visitor who reads this file's source could see it too, it
   just isn't handed out or discoverable by accident. */
const ADMIN_STATS_KEY = "f2028a2049432be08e4c7c4279071da12b1a5a559db88dae";

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function templateLabel(slug) {
  return (typeof SITE_TEMPLATES !== "undefined" && SITE_TEMPLATES[slug]) ? SITE_TEMPLATES[slug].label : slug;
}

function renderCustomerStats(data) {
  const summary = document.getElementById("stats-summary");
  const table = document.getElementById("stats-users-table");

  const templateRows = Object.keys(data.templateCounts)
    .sort((a, b) => data.templateCounts[b] - data.templateCounts[a])
    .map((slug) => `<tr><td>${escapeHtml(templateLabel(slug))}</td><td>${data.templateCounts[slug]}</td><td>${data.finalizedTemplateCounts[slug] || 0}</td></tr>`)
    .join("");

  summary.innerHTML = `
    <p style="margin:0 0 10px;"><b>${data.userCount}</b> משתמשים רשומים · <b>${data.cvBuilderUserCount}</b> מהם השתמשו בבניית קורות חיים.</p>
    <table class="stats-table">
      <thead><tr><th>תבנית אתר</th><th>פרויקטים שנפתחו</th><th>מתוכם הורדו בפועל</th></tr></thead>
      <tbody>${templateRows || '<tr><td colspan="3">עדיין אין נתונים</td></tr>'}</tbody>
    </table>`;

  const userRows = data.users
    .map((u) => {
      const sitesHtml = u.sites.length
        ? u.sites.map((s) => `<span class="stats-chip">${escapeHtml(templateLabel(s.template))}${s.status === "finalized" ? " ✓" : " (טיוטה)"}<button type="button" class="stats-del-btn" data-del="site:${s.id}" title="מחיקת האתר הזה">✕</button></span>`).join("")
        : "—";
      const cvHtml = u.usedCvBuilder
        ? `<span class="stats-chip">כן<button type="button" class="stats-del-btn" data-del="cv:${u.id}" title="מחיקת קורות החיים">✕</button></span>`
        : "—";
      const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString("he-IL") : "—";
      return `<tr><td>${escapeHtml(u.email || u.id)}</td><td>${date}</td><td>${sitesHtml}</td><td>${cvHtml}</td></tr>`;
    })
    .join("");

  table.innerHTML = `
    <table class="stats-table">
      <thead><tr><th>מייל</th><th>נרשם בתאריך</th><th>אתרים</th><th>קורות חיים</th></tr></thead>
      <tbody>${userRows || '<tr><td colspan="4">עדיין אין משתמשים</td></tr>'}</tbody>
    </table>`;
}

async function callAdminStats(body) {
  const res = await fetch(ADMIN_SUPABASE_URL + "/functions/v1/admin-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + ADMIN_SUPABASE_ANON_KEY },
    body: JSON.stringify(Object.assign({ adminKey: ADMIN_STATS_KEY }, body)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || String(res.status));
  return data;
}

async function loadCustomerStats() {
  const btn = document.getElementById("stats-load-btn");
  const err = document.getElementById("stats-err");
  err.textContent = "";
  btn.disabled = true;
  btn.textContent = "טוענים...";
  try {
    const data = await callAdminStats({ action: "stats" });
    renderCustomerStats(data);
  } catch (e) {
    err.textContent = "שגיאה בטעינת הנתונים: " + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "רענון נתונים";
  }
}

/* Deletion is admin-only reach into another customer's data — worth a
   real confirmation, not a silent click. The Edge Function returns fresh
   stats right after the delete, so the table re-renders from that
   response instead of firing a second round-trip. */
async function handleStatsDeleteClick(e) {
  const btn = e.target.closest("[data-del]");
  if (!btn) return;
  const [kind, id] = btn.dataset.del.split(":");
  const label = kind === "cv" ? "את קורות החיים של הלקוח הזה" : "את האתר הזה של הלקוח";
  if (!confirm(`למחוק ${label}? הפעולה בלתי הפיכה.`)) return;
  const err = document.getElementById("stats-err");
  err.textContent = "";
  btn.disabled = true;
  try {
    const data = kind === "cv"
      ? await callAdminStats({ action: "delete-cv", userId: id })
      : await callAdminStats({ action: "delete-site", siteId: id });
    renderCustomerStats(data);
  } catch (e2) {
    err.textContent = "שגיאה במחיקה: " + e2.message;
    btn.disabled = false;
  }
}

function showCustomerStatsCard() {
  const setup = document.getElementById("stats-setup-card");
  const card = document.getElementById("stats-card");
  if (!ADMIN_STATS_KEY) {
    setup.style.display = "";
    card.style.display = "none";
    return;
  }
  setup.style.display = "none";
  card.style.display = "";
  document.getElementById("stats-load-btn").addEventListener("click", loadCustomerStats);
  document.getElementById("stats-users-table").addEventListener("click", handleStatsDeleteClick);
  loadCustomerStats();
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function showPanel() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";

  const status = document.getElementById("admin-status");
  const explain = document.getElementById("admin-explain");
  const action = document.getElementById("admin-inbox-action");
  const setupCard = document.getElementById("admin-setup-card");

  if (ADMIN_INBOX_URL) {
    status.innerHTML = `<span class="admin-status connected">מחובר</span>`;
    explain.textContent = "הודעות שנשלחות דרך טופס המשוב באתר נשמרות כאן לצמיתות, ולא נעלמות עם רענון — כי הן מאוחסנות בשרת חיצוני, לא בדפדפן. הכפתור למטה נוחת ישר על טבלה עם כל ההודעות — אם כבר מחוברים ל-formspree בדפדפן הזה, זה לא יבקש התחברות נוספת.";
    action.innerHTML = `<a href="${ADMIN_INBOX_URL}" target="_blank" rel="noopener" class="btn btn-gold">פתיחת תיבת ההודעות</a>`;
    setupCard.style.display = "none";
  } else {
    status.innerHTML = `<span class="admin-status pending">עוד לא חובר</span>`;
    explain.textContent = "תיבת ההודעות עוד לא מחוברת — עד אז, הודעות משוב שנשלחות באתר מוצגות למבקר עם \"תודה על המשוב!\", אבל לא נשמרות באף מקום שאת יכולה לראות. פועלים לפי ההוראות למטה כדי לחבר אותה (לוקח כמה דקות, חד-פעמי).";
    action.innerHTML = "";
    setupCard.style.display = "";
  }

  showCustomerStatsCard();
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem(ADMIN_AUTH_KEY);
  if (stored === ADMIN_PASSWORD_HASH) {
    showPanel();
    return;
  }

  const form = document.getElementById("admin-login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("admin-password");
    const err = document.getElementById("admin-login-err");
    const hash = await sha256Hex(input.value);
    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem(ADMIN_AUTH_KEY, hash);
      showPanel();
    } else {
      err.textContent = "סיסמה שגויה.";
      input.value = "";
      input.focus();
    }
  });
});
