/* Private admin page: gated by real Supabase Auth (same login as the rest
   of the site) plus a server-side admin-email allowlist checked inside
   the admin-stats Edge Function — see that file for the actual
   enforcement. This page only decides what to *show*; a visitor who
   isn't signed in as an allow-listed admin gets 401/403 straight from
   the server no matter what this client-side code does, so there's no
   secret in this file to protect. Also links into the real, persistent
   feedback inbox (Formspree — see admin.html for why a static site needs
   an external service to keep messages after a refresh). */

/* Paste the Formspree submissions-dashboard URL here once it's set up
   (see the setup steps on this page). Leave empty to show the setup
   instructions instead. */
const ADMIN_INBOX_URL = "https://formspree.io/forms/moeagwvk/submissions";

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

function quoteTemplateLabel(slug) {
  return (typeof QUOTE_TEMPLATES !== "undefined" && QUOTE_TEMPLATES[slug]) ? QUOTE_TEMPLATES[slug].label : slug;
}

/* A count + small inline bar inside one table cell, so a per-template row
   carries its own mini "graph" instead of being a bare number next to N
   other bare numbers. */
function tplBarCell(count, max) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  return `<div class="tpl-count-cell"><span class="tpl-num">${count}</span><div class="tpl-bar-track"><div class="tpl-bar" style="width:${pct}%"></div></div></div>`;
}

/* A subheaded table of {label -> count}, used identically for site
   templates, CV templates, quote templates, decks and xlsx sheets — one
   function instead of five near-identical blocks. */
function renderCountTable(subhead, headerLabel, counts, labelFn, emptyMsg) {
  const entries = Object.entries(counts || {});
  const max = Math.max(1, ...entries.map(([, c]) => c));
  const rows = entries.length
    ? entries.sort((a, b) => b[1] - a[1]).map(([slug, count]) => `<tr><td>${escapeHtml(labelFn(slug))}</td><td>${tplBarCell(count, max)}</td></tr>`).join("")
    : `<tr><td colspan="2">${emptyMsg}</td></tr>`;
  return `<div class="admin-subhead">${subhead}</div><table class="stats-table"><thead><tr><th>${headerLabel}</th><th>שימושים</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* Real Chart.js charts instead of hand-drawn bars — an actual axis,
   gridlines and legend, so this reads as a real chart rather than styled
   divs. Colors mirror the site's own --teal/--gold/--cat-* CSS tokens
   (Chart.js can't read CSS custom properties from a canvas context, so
   they're duplicated here as plain hex — keep them in sync by hand if
   the tokens in css/style.css ever change). */
const ADMIN_CHART_COLORS = {
  teal: "#1F5C4E", gold: "#C99A3B", pending: "#DADFDD", grid: "#EEF1EF",
  categorical: ["#1F5C4E", "#2B6CB0", "#C2622D", "#6B46C1", "#B83280", "#2F855A"],
};
let kpiChartInstance = null;
let templatePieChartInstance = null;

/* The 7 top-line KPI numbers as a horizontal bar chart. `pending` renders
   a flat grey bar labeled "—" for a metric that isn't measured yet
   (usage_events not set up), so a real 0 is never confused with "not
   tracked at all". */
function renderKpiChart(canvasId, items) {
  if (kpiChartInstance) { kpiChartInstance.destroy(); kpiChartInstance = null; }
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  const labels = items.map((it) => it.pending ? `${it.label} (לא הופעל)` : it.label);
  const values = items.map((it) => it.pending ? 0 : it.value);
  const colors = items.map((it) => it.pending ? ADMIN_CHART_COLORS.pending : (it.gold ? ADMIN_CHART_COLORS.gold : ADMIN_CHART_COLORS.teal));
  kpiChartInstance = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, maxBarThickness: 22 }] },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => items[ctx.dataIndex].pending ? "לא הופעל" : String(ctx.parsed.x) } },
      },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0, font: { family: "Heebo" } }, grid: { color: ADMIN_CHART_COLORS.grid } },
        y: { grid: { display: false }, ticks: { font: { family: "Heebo", size: 12 } } },
      },
    },
  });
}

/* Doughnut chart for one {label -> count} distribution — used for site
   template popularity, the one breakdown that's a genuine part-of-whole
   (every count here is "a site project", the same unit). */
function renderDistributionChart(canvasId, counts, labelFn) {
  if (templatePieChartInstance) { templatePieChartInstance.destroy(); templatePieChartInstance = null; }
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return;
  const labels = entries.map(([slug]) => labelFn(slug));
  const values = entries.map(([, c]) => c);
  templatePieChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => ADMIN_CHART_COLORS.categorical[i % ADMIN_CHART_COLORS.categorical.length]) }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { font: { family: "Heebo", size: 12 }, padding: 12 } } },
    },
  });
}

const USAGE_KIND_LABELS = { cv: "קורות חיים", deck: "מצגת", xlsx: "גיליון", quote: "הצעת מחיר" };
const USAGE_ACTION_LABELS = { edit: "עריכה", download: "הורדה" };
function usageLogLineHtml(entry) {
  const kindLabel = USAGE_KIND_LABELS[entry.kind] || entry.kind;
  const actionLabel = USAGE_ACTION_LABELS[entry.action] || entry.action;
  const itemLabel = entry.slug ? (entry.kind === "quote" ? quoteTemplateLabel(entry.slug) : productLabel(entry.slug)) : "";
  const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";
  return `<li><span>${escapeHtml(kindLabel)}${itemLabel ? " · " + escapeHtml(itemLabel) : ""} — ${escapeHtml(actionLabel)}</span><span class="usage-log-date">${escapeHtml(dateStr)}</span></li>`;
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

  const kpiItems = [
    { label: "משתמשים רשומים", value: data.userCount, max: kpiMax },
    { label: "השתמשו בקורות חיים", value: data.cvBuilderUserCount, max: kpiMax },
    usageOn ? { label: "השתמשו בהצעות מחיר", value: quoteUserCount, max: kpiMax } : { label: "השתמשו בהצעות מחיר", pending: true },
    { label: "אתרים נפתחו", value: siteProjectCount, max: kpiMax },
    { label: "אתרים שולמו והורדו", value: finalizedCount, max: kpiMax, gold: true },
    usageOn ? { label: "מצגות הורדו", value: deckCount, max: kpiMax } : { label: "מצגות הורדו", pending: true },
    usageOn ? { label: "גליונות הורדו", value: xlsxCount, max: kpiMax } : { label: "גליונות הורדו", pending: true },
  ];

  const siteTemplatesTable = `
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
    </table>`;

  summary.innerHTML = `
    <div class="admin-chart-card"><canvas id="kpi-chart-canvas" height="230"></canvas></div>
    ${usageOn ? "" : `<p style="font-size:12.5px; color:#8A6212; background:#FBF2E0; border-radius:8px; padding:8px 12px; margin:0 0 20px;">השורות המסומנות "לא הופעל" ידווחו נתונים אמיתיים לאחר הרצת קובץ ה-SQL <code>supabase/sql/usage_events.sql</code> (חד-פעמי) — עד אז הן לא באמת אפס, פשוט עוד לא נמדדות.</p>`}
    <div class="admin-subhead">תבניות אתר</div>
    <div class="admin-charts-row">
      <div class="admin-chart-card"><h3>התפלגות תבניות אתר שנפתחו</h3><canvas id="template-pie-canvas" height="220"></canvas></div>
      <div class="stats-table-wrap">${siteTemplatesTable}</div>
    </div>
    ${renderCountTable("תבניות קורות חיים", "תבנית", data.cvTemplateCounts, productLabel, usageOn ? "עדיין אין שימוש" : "לא הופעל")}
    ${renderCountTable("תבניות הצעות מחיר", "תבנית", data.quoteTemplateCounts, quoteTemplateLabel, usageOn ? "עדיין אין שימוש" : "לא הופעל")}
    ${renderCountTable("מצגות שהורדו", "מצגת", data.deckDownloadCounts, productLabel, usageOn ? "עדיין אין הורדות" : "לא הופעל")}
    ${renderCountTable("גליונות שהורדו", "גיליון", data.xlsxDownloadCounts, productLabel, usageOn ? "עדיין אין הורדות" : "לא הופעל")}`;

  renderKpiChart("kpi-chart-canvas", kpiItems);
  renderDistributionChart("template-pie-canvas", data.templateCounts, templateLabel);

  // Each user is two rows: a compact summary row (click to expand) and a
  // detail row that starts hidden — full site list, CV/quote usage, a
  // full itemized usage log and delete controls live there instead of
  // being crammed into chips inside the summary row itself.
  const userRows = data.users
    .map((u, i) => {
      const sitesHtml = u.sites.length
        ? u.sites.map((s) => `<span class="stats-chip">${escapeHtml(templateLabel(s.template))}${s.status === "finalized" ? " ✓ שולם והורד" : " (טיוטה)"}<button type="button" class="stats-del-btn" data-del="site:${s.id}" title="מחיקת האתר הזה">✕</button></span>`).join("")
        : "אין אתרים";
      const cvHtml = u.usedCvBuilder
        ? `<span class="stats-chip">קורות חיים נשמרו<button type="button" class="stats-del-btn" data-del="cv:${u.id}" title="מחיקת קורות החיים">✕</button></span>`
        : "לא נעשה שימוש";
      const quoteHtml = u.usedQuoteBuilder ? "כן" : "לא";
      const usageLogHtml = (u.usageLog && u.usageLog.length)
        ? `<ul class="usage-log-list">${u.usageLog.map(usageLogLineHtml).join("")}</ul>`
        : "אין תיעוד שימוש";
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
              <div class="user-detail-group user-detail-group-wide"><h4>יומן שימוש מפורט</h4>${usageLogHtml}</div>
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

/* The caller's own session access token goes in Authorization — the Edge
   Function verifies it's a real signed-in user and checks their email
   against its own ADMIN_EMAILS allowlist server-side. res.status is
   attached to the thrown error so callers can tell "not an admin" (403)
   apart from "admin-stats isn't set up yet" (500) apart from any other
   failure. */
async function callAdminStats(body) {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) {
    const err = new Error("not signed in");
    err.status = 401;
    throw err;
  }
  const res = await fetch(SUPABASE_URL + "/functions/v1/admin-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || String(res.status));
    err.status = res.status;
    throw err;
  }
  return data;
}

function showAccessDenied() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("admin-denied").style.display = "";
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
    if (e.status === 401 || e.status === 403) {
      showAccessDenied();
      return;
    }
    if (e.message === "ADMIN_EMAILS not configured") {
      document.getElementById("stats-card").style.display = "none";
      document.getElementById("stats-setup-card").style.display = "";
      return;
    }
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

/* Three top-level tabs (הודעות / לקוחות / תבניות) instead of numbered
   stacked sections — "לקוחות" and "תבניות" both live inside the same
   #panel-stats (they share one data fetch, one error message and one
   refresh button) and just toggle which of its two inner views shows. */
function wireAdminTopTabs() {
  const tabs = {
    feedback: { btn: document.getElementById("toptab-feedback"), panel: document.getElementById("panel-feedback") },
    customers: { btn: document.getElementById("toptab-customers"), panel: document.getElementById("panel-stats") },
    templates: { btn: document.getElementById("toptab-templates"), panel: document.getElementById("panel-stats") },
  };
  const innerCustomers = document.getElementById("stats-tab-customers");
  const innerCharts = document.getElementById("stats-tab-charts");

  function activate(key) {
    Object.entries(tabs).forEach(([k, t]) => t.btn.classList.toggle("active", k === key));
    document.getElementById("panel-feedback").style.display = key === "feedback" ? "" : "none";
    document.getElementById("panel-stats").style.display = key === "feedback" ? "none" : "";
    if (key !== "feedback") {
      innerCustomers.style.display = key === "customers" ? "" : "none";
      innerCharts.style.display = key === "templates" ? "" : "none";
    }
    // Chart.js sizes each canvas from its container's current width, so a
    // chart built while its tab was hidden (display:none => 0 width)
    // needs an explicit resize once that tab actually becomes visible.
    if (key === "templates") {
      if (kpiChartInstance) kpiChartInstance.resize();
      if (templatePieChartInstance) templatePieChartInstance.resize();
    }
  }

  tabs.feedback.btn.addEventListener("click", () => activate("feedback"));
  tabs.customers.btn.addEventListener("click", () => activate("customers"));
  tabs.templates.btn.addEventListener("click", () => activate("templates"));
}

function showCustomerStatsCard() {
  document.getElementById("stats-setup-card").style.display = "none";
  document.getElementById("stats-card").style.display = "";
  document.getElementById("stats-load-btn").addEventListener("click", loadCustomerStats);
  document.getElementById("stats-users-table").addEventListener("click", handleStatsDeleteClick);
  document.getElementById("stats-users-table").addEventListener("click", handleUserRowToggle);
  loadCustomerStats();
}

function showPanel() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";
  wireAdminTopTabs();

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

/* Real Supabase Auth gate: not signed in at all → straight to the normal
   login page (same as every other gated tool on this site). Signed in →
   render the panel and let loadCustomerStats's own 401/403 handling
   (showAccessDenied, above) catch a signed-in-but-not-an-admin account —
   that's the server-enforced check; this is just routing. */
document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) {
      window.location.href = "account.html?redirect=admin.html";
      return;
    }
    showPanel();
  });
});
