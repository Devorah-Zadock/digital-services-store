/* Private admin page: gated by real Supabase Auth (same login as the rest
   of the site) plus a server-side admin-email allowlist checked inside
   the admin-stats Edge Function — see that file for the actual
   enforcement. This page only decides what to *show*; a visitor who
   isn't signed in as an allow-listed admin gets 401/403 straight from
   the server no matter what this client-side code does, so there's no
   secret in this file to protect. The "הודעות" tab below reads from
   contact_messages via admin-stats' list-messages/mark-message-read/
   delete-message actions — the permanent replacement for Formspree,
   whose free tier silently dropped anything older than 30 days. */

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
function tplBarCell(count, max, note) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 4;
  const noteHtml = note ? `<span class="tpl-note">${note}</span>` : "";
  return `<div class="tpl-count-cell"><span class="tpl-num">${count}</span><div class="tpl-bar-track"><div class="tpl-bar" style="width:${pct}%"></div></div>${noteHtml}</div>`;
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

/* Real Chart.js chart instead of hand-drawn bars — an actual axis,
   gridlines and legend, so this reads as a real chart rather than styled
   divs. Colors mirror the site's own --ink/--primary-dark/--cat-* CSS tokens
   (Chart.js can't read CSS custom properties from a canvas context, so
   they're duplicated here as plain hex — keep them in sync by hand if
   the tokens in css/style.css ever change). */
const ADMIN_CHART_COLORS = {
  gold: "#C99A3B", pending: "#DADFDD", grid: "#EEF1EF",
  categorical: ["#1F5C4E", "#2B6CB0", "#C2622D", "#6B46C1", "#B83280", "#2F855A"],
};
let kpiChartInstance = null;

/* The 7 top-line KPI numbers as a vertical column chart — labels along
   the bottom, values going up, a different color per column so each
   metric is visually distinct at a glance (not just one hue for all 7).
   `pending` renders a flat grey column labeled "—" for a metric that
   isn't measured yet (usage_events not set up), so a real 0 is never
   confused with "not tracked at all". */
function renderKpiChart(canvasId, items) {
  if (kpiChartInstance) { kpiChartInstance.destroy(); kpiChartInstance = null; }
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;
  const labels = items.map((it) => it.pending ? `${it.label} (לא הופעל)` : it.label);
  const values = items.map((it) => it.pending ? 0 : it.value);
  let colorIdx = 0;
  const colors = items.map((it) => {
    if (it.pending) return ADMIN_CHART_COLORS.pending;
    if (it.gold) return ADMIN_CHART_COLORS.gold;
    return ADMIN_CHART_COLORS.categorical[colorIdx++ % ADMIN_CHART_COLORS.categorical.length];
  });
  kpiChartInstance = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 4, maxBarThickness: 46 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => items[ctx.dataIndex].pending ? "לא הופעל" : String(ctx.parsed.y) } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0, font: { family: "Heebo" } }, grid: { color: ADMIN_CHART_COLORS.grid } },
        x: { grid: { display: false }, ticks: { font: { family: "Heebo", size: 11.5 } } },
      },
    },
  });
}

const USAGE_KIND_LABELS = { site: "אתר", cv: "קורות חיים", deck: "מצגת", xlsx: "גיליון", quote: "הצעת מחיר", invoice: "חשבונית/קבלה" };
const USAGE_ACTION_LABELS = { create: "יצירה", edit: "עריכה", download: "הורדה", delete: "מחיקה" };
const USAGE_ACTION_BADGE_CLASS = { create: "badge-create", edit: "badge-edit", download: "badge-download", delete: "badge-delete" };
const INVOICE_DOC_TYPE_LABELS = { invoice_receipt: "חשבונית מס-קבלה", receipt: "קבלה", credit_note: "חשבונית זיכוי" };

function activityItemLabel(entry) {
  if (!entry.slug) return "—";
  if (entry.kind === "quote") return quoteTemplateLabel(entry.slug);
  if (entry.kind === "invoice") return INVOICE_DOC_TYPE_LABELS[entry.slug] || entry.slug;
  if (entry.kind === "site") return templateLabel(entry.slug);
  return productLabel(entry.slug);
}

/* One row per real event — [date+time] | [product] | [action badge] |
   [item] — replacing the old flat bullet-list log, which read fine with
   a handful of entries but became an unreadable wall of text once a
   user had dozens/hundreds of them (confirmed as a real ask: "קשה
   לעקוב אחרי אלפי משתמשים בצורה הזו"). */
function activityRowHtml(entry) {
  const kindLabel = USAGE_KIND_LABELS[entry.kind] || entry.kind;
  const actionLabel = USAGE_ACTION_LABELS[entry.action] || entry.action;
  const badgeClass = USAGE_ACTION_BADGE_CLASS[entry.action] || "";
  const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";
  return `<tr>
    <td class="activity-date">${escapeHtml(dateStr)}</td>
    <td>${escapeHtml(kindLabel)}</td>
    <td><span class="activity-badge ${badgeClass}">${escapeHtml(actionLabel)}</span></td>
    <td>${escapeHtml(activityItemLabel(entry))}</td>
  </tr>`;
}

/* Shared between the Usage Dashboard tiles (per-user detail panel) and
   the main table's "total assets" column — one icon/label per core
   product, in the fixed order the product ask listed them. Counts only,
   deliberately with no "/Y": there is no real per-product quota
   anywhere in this product today (sites are free-to-edit-unlimited,
   publishing is a one-time payment, not a count cap) — see usage.* on
   the server (supabase/functions/admin-stats/index.ts). Showing a fake
   denominator would be worse than showing none. */
const USAGE_DASHBOARD_ITEMS = [
  { key: "sites", icon: "🌐", label: "אתרים" },
  { key: "cv", icon: "📄", label: "קורות חיים" },
  { key: "decks", icon: "📊", label: "מצגות" },
  { key: "sheets", icon: "📈", label: "גליונות" },
  { key: "quotes", icon: "📋", label: "הצעות מחיר" },
  { key: "invoices", icon: "🧾", label: "חשבוניות" },
];

function usageDashboardHtml(usage) {
  const tiles = USAGE_DASHBOARD_ITEMS.map((it) => {
    const count = (usage && usage[it.key]) || 0;
    return `<div class="usage-tile${count ? "" : " usage-tile-empty"}">
      <span class="usage-tile-icon">${it.icon}</span>
      <span class="usage-tile-count">${count}</span>
      <span class="usage-tile-label">${escapeHtml(it.label)}</span>
    </div>`;
  }).join("");
  return `<div class="usage-dashboard">${tiles}</div>`;
}

function usageSummaryRowHtml(usage) {
  return USAGE_DASHBOARD_ITEMS.map((it) => {
    const count = (usage && usage[it.key]) || 0;
    return `<span class="usage-summary-chip${count ? "" : " usage-summary-chip-zero"}" title="${escapeHtml(it.label)}">${it.icon}${count}</span>`;
  }).join("");
}

const ACTIVITY_FILTER_TABS = [
  { key: "all", label: "הכל" },
  { key: "site", label: "אתרים" },
  { key: "cv", label: "קו״ח" },
  { key: "deck", label: "מצגות" },
  { key: "xlsx", label: "גליונות" },
  { key: "quote", label: "הצעות מחיר" },
  { key: "invoice", label: "חשבוניות" },
];

/* Keyed by user id, kept at module level (not re-declared on every
   render) so switching a filter tab survives a background data refresh
   the way the search/sort/page state above already does. */
let dkAdminActivityFilter = {};

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
  // never dilutes it down to a flat "—" bar. Only metrics actually shown
  // as bars belong here — userCount and finalizedCount aren't bars.
  const realValues = [data.cvBuilderUserCount, siteProjectCount];
  if (usageOn) realValues.push(quoteUserCount, deckCount, xlsxCount);
  const kpiMax = Math.max(1, ...realValues);

  // "משתמשים רשומים" is a headcount metric, not a per-template usage
  // count — mixing it into the same comparison chart as "how much was
  // each template used" made the chart compare two unrelated things on
  // one axis. Shown instead as its own stat line above the chart.
  // Likewise the chart's job is comparing categories at a glance, so
  // each bar is labeled with just the category's plain name — the
  // finalized/paid breakdown for sites already lives in the "אתרים"
  // table below (the per-row note), not as a second, oddly-labeled bar
  // here.
  const kpiItems = [
    { label: "אתרים", value: siteProjectCount, max: kpiMax },
    { label: "קורות חיים", value: data.cvBuilderUserCount, max: kpiMax },
    usageOn ? { label: "הצעות מחיר", value: quoteUserCount, max: kpiMax } : { label: "הצעות מחיר", pending: true },
    usageOn ? { label: "מצגות", value: deckCount, max: kpiMax } : { label: "מצגות", pending: true },
    usageOn ? { label: "גליונות", value: xlsxCount, max: kpiMax } : { label: "גליונות", pending: true },
  ];

  summary.innerHTML = `
    <p style="font-size:13.5px; color:var(--grey); margin:0 0 14px;">משתמשים רשומים סה"כ: <b style="color:var(--dark);">${data.userCount}</b></p>
    <div class="admin-chart-card"><canvas id="kpi-chart-canvas" height="230"></canvas></div>
    ${usageOn ? "" : `<p style="font-size:12.5px; color:#8A6212; background:#FBF2E0; border-radius:8px; padding:8px 12px; margin:0 0 20px;">השורות המסומנות "לא הופעל" ידווחו נתונים אמיתיים לאחר הרצת קובץ ה-SQL <code>supabase/sql/usage_events.sql</code> (חד-פעמי) — עד אז הן לא באמת אפס, פשוט עוד לא נמדדות.</p>`}
    <div class="admin-subhead">אתרים</div>
    <table class="stats-table">
      <thead><tr><th>תבנית</th><th>שימושים</th></tr></thead>
      <tbody>${
        Object.keys(data.templateCounts).length
          ? Object.keys(data.templateCounts)
              .sort((a, b) => data.templateCounts[b] - data.templateCounts[a])
              .map((slug) => {
                const openMax = Math.max(1, ...Object.values(data.templateCounts));
                const finalized = data.finalizedTemplateCounts[slug] || 0;
                const note = finalized ? `מתוכם ${finalized} שולמו והורדו` : "";
                return `<tr><td>${escapeHtml(templateLabel(slug))}</td><td>${tplBarCell(data.templateCounts[slug], openMax, note)}</td></tr>`;
              })
              .join("")
          : '<tr><td colspan="2">עדיין אין נתונים</td></tr>'
      }</tbody>
    </table>
    ${renderCountTable("קורות חיים", "תבנית", data.cvTemplateCounts, productLabel, usageOn ? "עדיין אין שימוש" : "לא הופעל")}
    ${renderCountTable("הצעות מחיר", "תבנית", data.quoteTemplateCounts, quoteTemplateLabel, usageOn ? "עדיין אין שימוש" : "לא הופעל")}
    ${renderCountTable("מצגות שהורדו", "מצגת", data.deckDownloadCounts, productLabel, usageOn ? "עדיין אין הורדות" : "לא הופעל")}
    ${renderCountTable("גליונות שהורדו", "גיליון", data.xlsxDownloadCounts, productLabel, usageOn ? "עדיין אין הורדות" : "לא הופעל")}`;

  renderKpiChart("kpi-chart-canvas", kpiItems);

  // Kept across refreshes/deletes (not re-declared here) so a search
  // term, sort column or page the admin already picked survives a
  // "רענון נתונים" click or a row delete instead of resetting every time.
  dkAdminRawUsers = data.users;
  dkAdminPage = Math.min(dkAdminPage, Math.max(1, Math.ceil(dkAdminFilteredUsers().length / DK_ADMIN_PAGE_SIZE)));
  renderUsersTable();
}

let dkAdminRawUsers = [];
let dkAdminSearchQuery = "";
let dkAdminSortKey = "createdAt";
let dkAdminSortDir = "desc";
let dkAdminPage = 1;
const DK_ADMIN_PAGE_SIZE = 50;

const DK_ADMIN_SORTERS = {
  email: (u) => (u.email || u.id || "").toLowerCase(),
  createdAt: (u) => (u.createdAt ? new Date(u.createdAt).getTime() : 0),
  sites: (u) => u.sites.length,
  downloads: (u) => u.downloads || 0,
};

function dkAdminFilteredUsers() {
  const q = dkAdminSearchQuery.trim().toLowerCase();
  const filtered = q ? dkAdminRawUsers.filter((u) => (u.email || u.id || "").toLowerCase().includes(q)) : dkAdminRawUsers;
  const sorter = DK_ADMIN_SORTERS[dkAdminSortKey] || DK_ADMIN_SORTERS.createdAt;
  const sorted = filtered.slice().sort((a, b) => {
    const av = sorter(a), bv = sorter(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dkAdminSortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

/* One user's detail panel: a 6-tile Usage Dashboard up top (at-a-glance
   counts per core product), then a filtered + color-badged Activity
   Log (the real per-event history), then a compact management section
   for the two destructive admin actions this page supports (deleting a
   site or a saved CV). Replaces the old loose quickcounts text, five
   separate mini-tables and flat usage-log bullet list — confirmed ask:
   a "normal, professional, visual" structure instead of long text lines
   that stop being scannable once there are real customers to look
   through. usage/activity both come straight from the server
   (supabase/functions/admin-stats/index.ts) — see its own ActivityEntry
   comment for why there's no "/Y" quota and no fabricated delete rows. */
function userDetailPanelHtml(u) {
  const activity = u.activity || [];
  const filterKey = dkAdminActivityFilter[u.id] || "all";
  const filtered = filterKey === "all" ? activity : activity.filter((e) => e.kind === filterKey);
  const tabsHtml = ACTIVITY_FILTER_TABS.map((t) =>
    `<button type="button" class="activity-filter-btn${t.key === filterKey ? " active" : ""}" data-activity-tab="${t.key}" data-uid="${u.id}">${escapeHtml(t.label)}</button>`
  ).join("");
  const rowsHtml = filtered.length
    ? filtered.map(activityRowHtml).join("")
    : `<tr><td colspan="4">${activity.length ? "אין פעילות מהסוג הזה" : "אין תיעוד פעילות"}</td></tr>`;

  const sitesRows = u.sites.length
    ? u.sites.map((s) => `<tr><td>${escapeHtml(templateLabel(s.template))}</td><td>${s.status === "finalized" ? "✓ שולם והורד" : "טיוטה"}</td><td><button type="button" class="stats-del-btn" data-del="site:${s.id}" title="מחיקת האתר הזה">✕</button></td></tr>`).join("")
    : `<tr><td colspan="3">אין אתרים</td></tr>`;
  const cvRows = u.usedCvBuilder
    ? `<tr><td>נשמרו קורות חיים</td><td><button type="button" class="stats-del-btn" data-del="cv:${u.id}" title="מחיקת קורות החיים">✕</button></td></tr>`
    : `<tr><td colspan="2">לא נעשה שימוש</td></tr>`;

  return `
    <h4 class="user-detail-main-h">סיכום צריכה</h4>
    ${usageDashboardHtml(u.usage)}
    <h4 class="user-detail-main-h">יומן פעילות</h4>
    <div class="activity-filter-tabs">${tabsHtml}</div>
    <div class="stats-table-wrap activity-log-wrap">
      <table class="stats-table activity-log-table">
        <thead><tr><th>תאריך ושעה</th><th>מוצר</th><th>פעולה</th><th>פריט</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <h4 class="user-detail-main-h">ניהול</h4>
    <div class="user-detail-manage-grid">
      <div class="user-detail-group"><h4>אתרים</h4>
        <table class="stats-table"><thead><tr><th>תבנית</th><th>סטטוס</th><th></th></tr></thead><tbody>${sitesRows}</tbody></table>
      </div>
      <div class="user-detail-group"><h4>קורות חיים</h4>
        <table class="stats-table"><tbody>${cvRows}</tbody></table>
      </div>
    </div>`;
}

/* Delegated like the other stats-users-table handlers below — re-renders
   just the one panel whose tab was clicked (looked up fresh from
   dkAdminRawUsers), so the row stays open and every other open panel is
   untouched. */
function handleActivityFilterClick(e) {
  const btn = e.target.closest("[data-activity-tab]");
  if (!btn) return;
  dkAdminActivityFilter[btn.dataset.uid] = btn.dataset.activityTab;
  const u = dkAdminRawUsers.find((x) => x.id === btn.dataset.uid);
  if (!u) return;
  const panel = btn.closest(".user-detail-panel");
  if (panel) panel.innerHTML = userDetailPanelHtml(u);
}

function dkAdminSortArrow(key) {
  if (key !== dkAdminSortKey) return `<span class="sort-arrow">↕</span>`;
  return `<span class="sort-arrow">${dkAdminSortDir === "asc" ? "↑" : "↓"}</span>`;
}

function renderUsersTable() {
  const table = document.getElementById("stats-users-table");
  const countEl = document.getElementById("stats-result-count");
  const pager = document.getElementById("stats-pagination");
  if (!table) return;

  const filtered = dkAdminFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / DK_ADMIN_PAGE_SIZE));
  dkAdminPage = Math.min(Math.max(1, dkAdminPage), totalPages);
  const start = (dkAdminPage - 1) * DK_ADMIN_PAGE_SIZE;
  const pageUsers = filtered.slice(start, start + DK_ADMIN_PAGE_SIZE);

  if (countEl) {
    countEl.textContent = dkAdminSearchQuery
      ? `${filtered.length} מתוך ${dkAdminRawUsers.length} משתמשים`
      : `${dkAdminRawUsers.length} משתמשים`;
  }

  const userRows = pageUsers
    .map((u) => {
      const i = dkAdminRawUsers.indexOf(u);
      const date = u.createdAt ? new Date(u.createdAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";
      const email = u.email || u.id;

      return `
        <tr class="user-row" data-uidx="${i}">
          <td><span class="user-row-toggle">›</span></td>
          <td>${escapeHtml(email)}</td>
          <td>${date}</td>
          <td><div class="usage-summary-row">${usageSummaryRowHtml(u.usage)}</div></td>
        </tr>
        <tr class="user-detail-row" data-uidx="${i}" hidden>
          <td colspan="4"><div class="user-detail-panel">${userDetailPanelHtml(u)}</div></td>
        </tr>`;
    })
    .join("");

  table.innerHTML = `
    <table class="stats-table">
      <thead><tr>
        <th></th>
        <th class="sortable${dkAdminSortKey === "email" ? " sort-active" : ""}" data-sort="email">מייל ${dkAdminSortArrow("email")}</th>
        <th class="sortable${dkAdminSortKey === "createdAt" ? " sort-active" : ""}" data-sort="createdAt">תאריך ושעת הרשמה ${dkAdminSortArrow("createdAt")}</th>
        <th>סך הכל נכסים</th>
      </tr></thead>
      <tbody>${userRows || `<tr><td colspan="4">${dkAdminSearchQuery ? "לא נמצאו משתמשים תואמים" : "עדיין אין משתמשים"}</td></tr>`}</tbody>
    </table>`;

  if (pager) {
    pager.innerHTML = totalPages > 1
      ? `<button type="button" id="stats-page-prev" ${dkAdminPage <= 1 ? "disabled" : ""}>→ הקודם</button>
         <span>עמוד ${dkAdminPage} מתוך ${totalPages}</span>
         <button type="button" id="stats-page-next" ${dkAdminPage >= totalPages ? "disabled" : ""}>הבא ←</button>`
      : "";
    const prevBtn = document.getElementById("stats-page-prev");
    const nextBtn = document.getElementById("stats-page-next");
    if (prevBtn) prevBtn.addEventListener("click", () => { dkAdminPage -= 1; renderUsersTable(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { dkAdminPage += 1; renderUsersTable(); });
  }
}

function handleUsersTableHeaderClick(e) {
  const th = e.target.closest("th.sortable");
  if (!th) return;
  const key = th.dataset.sort;
  if (dkAdminSortKey === key) {
    dkAdminSortDir = dkAdminSortDir === "asc" ? "desc" : "asc";
  } else {
    dkAdminSortKey = key;
    dkAdminSortDir = "asc";
  }
  dkAdminPage = 1;
  renderUsersTable();
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

/* One card per contact-form/feedback-widget submission — unread ones
   (read_at is null) get a tinted background + side bar instead of a
   separate unread badge that could drift out of sync with the actual
   rows. A feedback submission can have a rating with no free text (the
   widget only requires the rating), so the body paragraph is only shown
   when there's actually a message to show. */
function messageCardHtml(m) {
  const unread = !m.read_at;
  const dateStr = m.created_at ? new Date(m.created_at).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "";
  const typeLabel = m.form_type === "feedback" ? "משוב" : "פנייה";
  const ratingHtml = m.rating ? `<span class="message-rating">${"★".repeat(m.rating)}${"☆".repeat(5 - m.rating)}</span>` : "";
  // Feedback from a signed-in visitor carries the account's own name/email
  // (resolved server-side from their session — see
  // supabase/functions/submit-contact-message); anything else came from
  // someone who wasn't signed in.
  const fromHtml = (m.name || m.email)
    ? `<span class="message-from">${escapeHtml(m.name || "")}${m.name && m.email ? " · " : ""}${m.email ? escapeHtml(m.email) : ""}</span>`
    : (m.form_type === "feedback" ? `<span class="message-from">אורח/ת (לא מחובר/ת)</span>` : "");
  return `
    <div class="message-card${unread ? " unread" : ""}" data-mid="${m.id}">
      <div class="message-card-head">
        <span class="message-type">${typeLabel}</span>
        ${fromHtml}
        ${ratingHtml}
        <span class="message-date">${dateStr}</span>
      </div>
      ${m.message ? `<p class="message-body">${escapeHtml(m.message)}</p>` : ""}
      ${m.page ? `<p class="message-page">נשלח מתוך: ${escapeHtml(m.page)}</p>` : ""}
      <div class="message-actions">
        ${unread ? `<button type="button" class="message-action-btn" data-mark-read="${m.id}">סמן כנקרא</button>` : ""}
        <button type="button" class="message-action-btn danger" data-del-msg="${m.id}">מחיקה</button>
      </div>
    </div>`;
}

function renderMessages(messages) {
  const list = document.getElementById("messages-list");
  const countEl = document.getElementById("messages-result-count");
  if (!list) return;
  const unreadCount = messages.filter((m) => !m.read_at).length;
  if (countEl) {
    countEl.textContent = messages.length
      ? `${messages.length} הודעות${unreadCount ? ` (${unreadCount} שלא נקראו)` : ""}`
      : "";
  }
  list.innerHTML = messages.length
    ? messages.map(messageCardHtml).join("")
    : `<p style="font-size:13.5px; color:var(--grey);">אין הודעות עדיין.</p>`;
}

async function loadMessages() {
  const err = document.getElementById("messages-err");
  const btn = document.getElementById("messages-refresh-btn");
  if (err) err.textContent = "";
  if (btn) { btn.disabled = true; btn.textContent = "טוענים..."; }
  try {
    const data = await callAdminStats({ action: "list-messages" });
    renderMessages(data.messages || []);
  } catch (e) {
    if (e.status === 401 || e.status === 403) { showAccessDenied(); return; }
    if (err) err.textContent = "שגיאה בטעינת ההודעות: " + e.message;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "רענון"; }
  }
}

/* Delegated on #messages-list rather than wired per-card, since every
   card re-renders on each loadMessages() call (mark-read/delete both
   refresh the whole list to stay in sync with the server, there being
   only a couple hundred messages at most — no pagination needed yet). */
async function handleMessagesListClick(e) {
  const markBtn = e.target.closest("[data-mark-read]");
  const delBtn = e.target.closest("[data-del-msg]");
  const err = document.getElementById("messages-err");
  if (markBtn) {
    markBtn.disabled = true;
    try {
      await callAdminStats({ action: "mark-message-read", messageId: markBtn.dataset.markRead });
      await loadMessages();
    } catch (e2) {
      if (err) err.textContent = "שגיאה: " + e2.message;
      markBtn.disabled = false;
    }
    return;
  }
  if (delBtn) {
    if (!confirm("למחוק את ההודעה הזאת? הפעולה בלתי הפיכה.")) return;
    delBtn.disabled = true;
    try {
      await callAdminStats({ action: "delete-message", messageId: delBtn.dataset.delMsg });
      await loadMessages();
    } catch (e2) {
      if (err) err.textContent = "שגיאה במחיקה: " + e2.message;
      delBtn.disabled = false;
    }
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
    if (key === "templates" && kpiChartInstance) kpiChartInstance.resize();
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
  document.getElementById("stats-users-table").addEventListener("click", handleUsersTableHeaderClick);
  document.getElementById("stats-users-table").addEventListener("click", handleActivityFilterClick);
  const searchInput = document.getElementById("stats-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      dkAdminSearchQuery = searchInput.value;
      dkAdminPage = 1;
      renderUsersTable();
    });
  }
  loadCustomerStats();
}

function showMessagesCard() {
  document.getElementById("messages-list").addEventListener("click", handleMessagesListClick);
  document.getElementById("messages-refresh-btn").addEventListener("click", loadMessages);
  loadMessages();
}

function showPanel() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";
  wireAdminTopTabs();
  showMessagesCard();
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
