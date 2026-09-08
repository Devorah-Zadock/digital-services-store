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

function productLabel(slug) {
  const p = (typeof PRODUCTS !== "undefined") && PRODUCTS.find((x) => x.slug === slug);
  return p ? p.title : slug;
}

/* One row of the KPI bar chart — bar length is the value relative to the
   largest value among the chart's own (non-pending) numbers, so the whole
   set reads as one picture instead of needing to compare digits tile by
   tile. `pending` renders a flat grey bar + "—" for a metric that isn't
   measured yet (usage_events not set up), same distinction the old tiles
   made, so a real 0 is never confused with "not tracked at all". */
function kpiRow(label, num, max, opts) {
  opts = opts || {};
  if (opts.pending) {
    return `<div class="kpi-row"><div class="kpi-label">${label} <span style="color:var(--grey); font-weight:400;">(לא הופעל)</span></div><div class="kpi-bar-track"><div class="kpi-bar kpi-bar-pending" style="width:6%"></div></div><div class="kpi-num kpi-num-pending">—</div></div>`;
  }
  const pct = max > 0 ? Math.max(4, Math.round((num / max) * 100)) : 4;
  return `<div class="kpi-row"><div class="kpi-label">${label}</div><div class="kpi-bar-track"><div class="kpi-bar${opts.gold ? " kpi-bar-gold" : ""}" style="width:${pct}%"></div></div><div class="kpi-num">${num}</div></div>`;
}

/* A count + small inline bar inside one table cell, so a per-template row
   carries its own mini "graph" instead of being a bare number next to N
   other bare numbers. */
function tplBarCell(count, max) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  return `<div class="tpl-count-cell"><span class="tpl-num">${count}</span><div class="tpl-bar-track"><div class="tpl-bar" style="width:${pct}%"></div></div></div>`;
}

function renderCustomerStats(data) {
  const summary = document.getElementById("stats-summary");
  const table = document.getElementById("stats-users-table");

  const siteProjectCount = Object.values(data.templateCounts).reduce((a, b) => a + b, 0);
  const finalizedCount = Object.values(data.finalizedTemplateCounts).reduce((a, b) => a + b, 0);
  const usageOn = data.usageEventsAvailable !== false;
  const quoteUserCount = data.quoteBuilderUserCount ?? 0;
  const deckCount = data.deckDownloadCount ?? 0;
  const xlsxCount = data.xlsxDownloadCount ?? 0;

  // Only real (measured) numbers set the chart's scale — a pending metric
  // never dilutes it down to a flat "—" bar.
  const realValues = [data.userCount, data.cvBuilderUserCount, siteProjectCount, finalizedCount];
  if (usageOn) realValues.push(quoteUserCount, deckCount, xlsxCount);
  const kpiMax = Math.max(1, ...realValues);

  summary.innerHTML = `
    <div class="kpi-chart">
      ${kpiRow("משתמשים רשומים", data.userCount, kpiMax)}
      ${kpiRow("השתמשו בקורות חיים", data.cvBuilderUserCount, kpiMax)}
      ${usageOn ? kpiRow("השתמשו בהצעות מחיר", quoteUserCount, kpiMax) : kpiRow("השתמשו בהצעות מחיר", 0, kpiMax, { pending: true })}
      ${kpiRow("אתרים נפתחו", siteProjectCount, kpiMax)}
      ${kpiRow("אתרים שולמו והורדו", finalizedCount, kpiMax, { gold: true })}
      ${usageOn ? kpiRow("מצגות הורדו", deckCount, kpiMax) : kpiRow("מצגות הורדו", 0, kpiMax, { pending: true })}
      ${usageOn ? kpiRow("גליונות הורדו", xlsxCount, kpiMax) : kpiRow("גליונות הורדו", 0, kpiMax, { pending: true })}
    </div>
    ${usageOn ? "" : `<p style="font-size:12.5px; color:#8A6212; background:#FBF2E0; border-radius:8px; padding:8px 12px; margin:0 0 20px;">השורות המסומנות "לא הופעל" ידווחו נתונים אמיתיים לאחר הרצת קובץ ה-SQL <code>supabase/sql/usage_events.sql</code> (חד-פעמי) — עד אז הן לא באמת אפס, פשוט עוד לא נמדדות.</p>`}
    <div class="admin-subhead">תבניות אתר</div>
    <table class="stats-table">
      <thead><tr><th>תבנית</th><th>פרויקטים שנפתחו</th><th>מתוכם הורדו בפועל</th></tr></thead>
      <tbody>${
        Object.keys(data.templateCounts).length
          ? Object.keys(data.templateCounts)
              .sort((a, b) => data.templateCounts[b] - data.templateCounts[a])
              .map((slug) => {
                const openMax = Math.max(1, ...Object.values(data.templateCounts));
                return `<tr><td>${escapeHtml(templateLabel(slug))}</td><td>${tplBarCell(data.templateCounts[slug], openMax)}</td><td>${data.finalizedTemplateCounts[slug] || 0}</td></tr>`;
              })
              .join("")
          : '<tr><td colspan="3">עדיין אין נתונים</td></tr>'
      }</tbody>
    </table>
    <div class="admin-subhead">מצגות שהורדו</div>
    <table class="stats-table">
      <thead><tr><th>מצגת</th><th>הורדות</th></tr></thead>
      <tbody>${
        Object.keys(data.deckDownloadCounts || {}).length
          ? Object.entries(data.deckDownloadCounts).sort((a, b) => b[1] - a[1])
              .map(([slug, count]) => `<tr><td>${escapeHtml(productLabel(slug))}</td><td>${tplBarCell(count, Math.max(1, ...Object.values(data.deckDownloadCounts)))}</td></tr>`)
              .join("")
          : `<tr><td colspan="2">${usageOn ? "עדיין אין הורדות" : "לא הופעל"}</td></tr>`
      }</tbody>
    </table>
    <div class="admin-subhead">גליונות שהורדו</div>
    <table class="stats-table">
      <thead><tr><th>גיליון</th><th>הורדות</th></tr></thead>
      <tbody>${
        Object.keys(data.xlsxDownloadCounts || {}).length
          ? Object.entries(data.xlsxDownloadCounts).sort((a, b) => b[1] - a[1])
              .map(([slug, count]) => `<tr><td>${escapeHtml(productLabel(slug))}</td><td>${tplBarCell(count, Math.max(1, ...Object.values(data.xlsxDownloadCounts)))}</td></tr>`)
              .join("")
          : `<tr><td colspan="2">${usageOn ? "עדיין אין הורדות" : "לא הופעל"}</td></tr>`
      }</tbody>
    </table>`;

  // Each user is two rows: a compact summary row (click to expand) and a
  // detail row that starts hidden — full site list, CV/quote usage and
  // delete controls live there instead of being crammed into chips inside
  // the summary row itself.
  const userRows = data.users
    .map((u, i) => {
      const sitesHtml = u.sites.length
        ? u.sites.map((s) => `<span class="stats-chip">${escapeHtml(templateLabel(s.template))}${s.status === "finalized" ? " ✓ שולם והורד" : " (טיוטה)"}<button type="button" class="stats-del-btn" data-del="site:${s.id}" title="מחיקת האתר הזה">✕</button></span>`).join("")
        : "אין אתרים";
      const cvHtml = u.usedCvBuilder
        ? `<span class="stats-chip">קורות חיים נשמרו<button type="button" class="stats-del-btn" data-del="cv:${u.id}" title="מחיקת קורות החיים">✕</button></span>`
        : "לא נעשה שימוש";
      const quoteHtml = u.usedQuoteBuilder ? "כן" : "לא";
      const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString("he-IL") : "—";
      const email = u.email || u.id;
      const quickCounts = [
        `${u.sites.length} אתרים`,
        u.usedCvBuilder ? "קו״ח: כן" : "קו״ח: לא",
        u.downloads ? `${u.downloads} הורדות` : "0 הורדות",
      ].map((c) => `<span class="user-quickcount">${escapeHtml(c)}</span>`).join("");

      return `
        <tr class="user-row" data-uidx="${i}">
          <td><span class="user-row-toggle">›</span></td>
          <td>${escapeHtml(email)}</td>
          <td>${date}</td>
          <td><div class="user-row-quickcounts">${quickCounts}</div></td>
        </tr>
        <tr class="user-detail-row" data-uidx="${i}" hidden>
          <td colspan="4">
            <div class="user-detail-panel">
              <div class="user-detail-group"><h4>אתרים</h4>${sitesHtml}</div>
              <div class="user-detail-group"><h4>קורות חיים</h4>${cvHtml}</div>
              <div class="user-detail-group"><h4>שימוש בהצעות מחיר</h4>${quoteHtml}</div>
            </div>
          </td>
        </tr>`;
    })
    .join("");

  table.innerHTML = `
    <table class="stats-table">
      <thead><tr><th></th><th>מייל</th><th>נרשם בתאריך</th><th>סיכום</th></tr></thead>
      <tbody>${userRows || '<tr><td colspan="4">עדיין אין משתמשים</td></tr>'}</tbody>
    </table>`;
}

function handleUserRowToggle(e) {
  const row = e.target.closest(".user-row");
  if (!row) return;
  const idx = row.dataset.uidx;
  const detail = document.querySelector(`.user-detail-row[data-uidx="${idx}"]`);
  if (!detail) return;
  detail.hidden = !detail.hidden;
  row.classList.toggle("open", !detail.hidden);
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
  document.getElementById("stats-users-table").addEventListener("click", handleUserRowToggle);
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
    explain.textContent = "הודעות שנשלחות דרך טופס המשוב באתר נשמרות כאן לצמיתות, ולא נעלמות עם רענון — כי הן מאוחסנות בשרת חיצוני, לא בדפדפן.";
    // Formspree blocks its own dashboard from being framed (standard
    // clickjacking protection on account pages), so an embedded iframe here
    // only ever showed an empty grey box — never the real messages. A
    // plain link to the real dashboard is the only thing that actually works.
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
