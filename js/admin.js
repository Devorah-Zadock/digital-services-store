/* Private admin page: gated by real Supabase Auth (same login as the rest
   of the site) plus server-side admin ROLES checked inside the admin-stats
   Edge Function — see that file for the actual enforcement. This page
   only decides what to *show*; every request is re-checked server-side
   (401/403 for anyone without the needed role), so there's no secret in
   this file to protect.

   Tabs: לקוחות (server-paged customer list + details drawer) · הודעות
   (contact form + feedback, from contact_messages) · תבניות (template
   usage charts) · יומן ניהול (audit log, admin+) · הרשאות (admin roles,
   owner only). */

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Only real https:// links ever become clickable in the admin page —
// published_url is a value that once came from the browser, so anything
// else (javascript:, data:, odd strings) is shown as plain text instead.
function dkSafeHttpsUrl(raw) {
  try {
    const u = new URL(String(raw || ""));
    return u.protocol === "https:" ? u.href : "";
  } catch (_bad) {
    return "";
  }
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

function renderTemplateStats(data) {
  const summary = document.getElementById("stats-summary");

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
  // Which page it was sent from — useful context ("feedback on the
  // projects page"), so kept, but as a small tag in the header row.
  const pageLabel = m.page ? (m.page === "/" || m.page === "/index.html" ? "דף הבית" : m.page.replace(/^\//, "")) : "";
  const pageHtml = pageLabel ? `<span class="message-page" title="נשלח מתוך ${escapeHtml(m.page)}">${escapeHtml(pageLabel)}</span>` : "";
  return `
    <div class="message-card${unread ? " unread" : ""}" data-mid="${m.id}">
      <div class="message-card-head">
        <span class="message-type">${typeLabel}</span>
        ${fromHtml}
        ${ratingHtml}
        ${pageHtml}
        <span class="message-date">${dateStr}</span>
        <span class="message-actions">
          ${unread ? `<button type="button" class="message-action-btn" data-mark-read="${m.id}" title="סמן כנקרא">✓ נקרא</button>` : ""}
          <button type="button" class="message-action-btn danger" data-del-msg="${m.id}" title="מחיקה" aria-label="מחיקה">🗑</button>
        </span>
      </div>
      ${m.message ? `<p class="message-body">${escapeHtml(m.message)}</p>` : ""}
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

/* =====================================================================
   Customers dashboard ("לקוחות"), audit log ("יומן ניהול") and admin
   roles ("הרשאות").
   Everything is server-paged: the browser only ever holds one page of
   customers (25–100 rows) plus whichever single customer's details are
   open. Search, filters, sorting and pagination all run in Postgres
   (supabase/sql/admin_dashboard.sql → admin_list_users) via the
   admin-stats Edge Function, which also enforces the role behind every
   action — this file only hides what the signed-in role can't use.
   ===================================================================== */

let dkAdminRole = null; // "owner" | "admin" | "support"
const DK_ROLE_RANK = { support: 1, admin: 2, owner: 3 };
function dkCan(minRole) { return dkAdminRole && DK_ROLE_RANK[dkAdminRole] >= DK_ROLE_RANK[minRole]; }

const DK_ROLE_LABELS = { owner: "בעלים", admin: "מנהל/ת", support: "תמיכה (צפייה בלבד)" };

function fmtDateTime(iso) {
  return iso ? new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";
}
const DK_RTF = (typeof Intl !== "undefined" && Intl.RelativeTimeFormat) ? new Intl.RelativeTimeFormat("he", { numeric: "auto" }) : null;
function fmtRelative(iso) {
  if (!iso) return "—";
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (!DK_RTF) return fmtDateTime(iso);
  if (abs < 60) return "עכשיו";
  if (abs < 3600) return DK_RTF.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return DK_RTF.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return DK_RTF.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return DK_RTF.format(Math.round(diffSec / (86400 * 30)), "month");
  return DK_RTF.format(Math.round(diffSec / (86400 * 365)), "year");
}
function fmtNum(n) { return Number(n || 0).toLocaleString("he-IL"); }
function initialsOf(u) {
  const src = (u.name || u.email || "?").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}

/* ---------- toast + confirm dialog ---------- */

function dkToast(msg, kind) {
  const box = document.getElementById("cx-toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = "cx-toast" + (kind ? " " + kind : "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3600);
  setTimeout(() => el.remove(), 4000);
}

/* Promise-based confirmation for sensitive actions. opts:
   { title, body, confirmLabel, danger, reason: "required"|"optional"|null,
     typeToConfirm: string|null }  → resolves {reason} or null (cancelled). */
function dkConfirm(opts) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "cx-modal-backdrop";
    wrap.innerHTML = `
      <div class="cx-modal" role="dialog" aria-modal="true" aria-labelledby="cx-modal-title">
        <h3 id="cx-modal-title">${escapeHtml(opts.title)}</h3>
        <div class="cx-modal-body">${opts.body || ""}</div>
        ${opts.reason ? `<label class="cx-field-label">סיבה ${opts.reason === "required" ? "(חובה — תישמר ביומן הניהול)" : "(לא חובה)"}</label>
          <textarea class="cx-input" id="cx-modal-reason" rows="2" maxlength="500"></textarea>` : ""}
        ${opts.typeToConfirm ? `<label class="cx-field-label">כדי לאשר, הקלידו: <b dir="ltr">${escapeHtml(opts.typeToConfirm)}</b></label>
          <input class="cx-input" id="cx-modal-type" dir="ltr" autocomplete="off">` : ""}
        <div class="cx-modal-actions">
          <button type="button" class="cx-btn" data-cx-cancel>ביטול</button>
          <button type="button" class="cx-btn ${opts.danger ? "cx-btn-danger" : "cx-btn-primary"}" data-cx-ok>${escapeHtml(opts.confirmLabel || "אישור")}</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const ok = wrap.querySelector("[data-cx-ok]");
    const reasonEl = wrap.querySelector("#cx-modal-reason");
    const typeEl = wrap.querySelector("#cx-modal-type");
    const validate = () => {
      let valid = true;
      if (opts.reason === "required" && reasonEl && !reasonEl.value.trim()) valid = false;
      if (opts.typeToConfirm && typeEl && typeEl.value.trim().toLowerCase() !== opts.typeToConfirm.toLowerCase()) valid = false;
      ok.disabled = !valid;
    };
    [reasonEl, typeEl].forEach((el) => el && el.addEventListener("input", validate));
    validate();
    const close = (val) => { wrap.remove(); document.removeEventListener("keydown", onKey); resolve(val); };
    const onKey = (e) => { if (e.key === "Escape") close(null); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(null); });
    wrap.querySelector("[data-cx-cancel]").addEventListener("click", () => close(null));
    ok.addEventListener("click", () => close({ reason: reasonEl ? reasonEl.value.trim() : "" }));
    (typeEl || reasonEl || ok).focus();
  });
}

/* ---------- state ---------- */

const CX_COLUMNS = [
  { key: "number", label: "#", sort: "user_number", always: true },
  { key: "name", label: "שם", sort: "full_name", def: true },
  { key: "email", label: "אימייל", sort: "email", def: true },
  { key: "createdAt", label: "תאריך הרשמה", sort: "created_at", def: true },
  { key: "lastActiveAt", label: "פעילות אחרונה", sort: "last_active_at", def: true },
  { key: "status", label: "סטטוס", def: true },
  { key: "plan", label: "סוג חשבון", def: true },
  { key: "docs", label: "אתרים / מסמכים", sort: "docs", def: true },
  { key: "lastSignInAt", label: "כניסה אחרונה", def: false },
  { key: "id", label: "מזהה משתמש", def: false },
];
const CX_COLS_KEY = "dk_admin_cx_columns_v1";

const cx = {
  page: 1, pageSize: 25, total: 0, users: [],
  sort: "created_at", dir: "desc",
  filters: { search: "", status: "", plan: "", activity: "", from: "", to: "" },
  selected: new Map(), // id -> user (current-session selection, across pages)
  cols: null,
  loading: false, reqSeq: 0,
};

function cxLoadCols() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(CX_COLS_KEY) || "null"); } catch (e) { /* ignore */ }
  const set = new Set(Array.isArray(saved) ? saved : CX_COLUMNS.filter((c) => c.def || c.always).map((c) => c.key));
  CX_COLUMNS.forEach((c) => { if (c.always) set.add(c.key); });
  cx.cols = set;
}
function cxSaveCols() { try { localStorage.setItem(CX_COLS_KEY, JSON.stringify([...cx.cols])); } catch (e) { /* ignore */ } }

function cxFilterBody() {
  const f = cx.filters;
  return {
    search: f.search || undefined, status: f.status || undefined, plan: f.plan || undefined,
    activity: f.activity || undefined,
    from: f.from ? new Date(f.from).toISOString() : undefined,
    to: f.to ? new Date(f.to).toISOString() : undefined,
    sort: cx.sort, dir: cx.dir,
  };
}
function cxFiltersActive() {
  const f = cx.filters;
  return !!(f.search || f.status || f.plan || f.activity || f.from || f.to);
}

/* ---------- KPIs ---------- */

async function cxLoadSummary() {
  const box = document.getElementById("cx-kpis");
  try {
    const { summary } = await callAdminStats({ action: "summary" });
    const s = summary || {};
    const cards = [
      { label: "סה״כ משתמשים", value: s.total, sub: `${fmtNum(s.new_30d)} הצטרפו ב-30 יום`, filter: null },
      { label: "חדשים · 7 ימים", value: s.new_7d, sub: "לפי תאריך הרשמה", filter: { from: new Date(Date.now() - 7 * 864e5) } },
      { label: "פעילים · 7 ימים", value: s.active_7d, sub: `${fmtNum(s.active_30d)} פעילים ב-30 יום`, filter: { activity: "active7" } },
      { label: "Pro", value: s.pro, sub: "חשבונות בתשלום", filter: { plan: "pro" } },
      { label: "מושעים", value: s.suspended, sub: `${fmtNum(s.unconfirmed)} עם מייל לא מאומת`, filter: { status: "suspended" } },
    ];
    box.innerHTML = cards.map((c, i) => `
      <button type="button" class="cx-kpi" data-kpi="${i}">
        <span class="cx-kpi-label">${escapeHtml(c.label)}</span>
        <span class="cx-kpi-value">${fmtNum(c.value)}</span>
        <span class="cx-kpi-sub">${escapeHtml(c.sub)}</span>
      </button>`).join("");
    box.querySelectorAll("[data-kpi]").forEach((btn) => btn.addEventListener("click", () => {
      const c = cards[Number(btn.dataset.kpi)];
      cx.filters = { search: "", status: "", plan: "", activity: "", from: "", to: "" };
      if (c.filter) {
        if (c.filter.from) cx.filters.from = toLocalInput(c.filter.from);
        Object.assign(cx.filters, Object.fromEntries(Object.entries(c.filter).filter(([k]) => k !== "from")));
      }
      cx.page = 1;
      cxSyncToolbar();
      cxLoadUsers();
    }));
  } catch (e) {
    if (handleSetupError(e)) return;
    box.innerHTML = `<p class="cx-error">לא הצלחנו לטעון את הסיכום: ${escapeHtml(e.message)}</p>`;
  }
}

function toLocalInput(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- table ---------- */

async function cxLoadUsers() {
  const seq = ++cx.reqSeq;
  cx.loading = true;
  document.getElementById("cx-table-wrap").classList.add("is-loading");
  try {
    const data = await callAdminStats({ action: "list-users", page: cx.page, pageSize: cx.pageSize, ...cxFilterBody() });
    if (seq !== cx.reqSeq) return; // a newer request already replaced this one
    cx.users = data.users || [];
    cx.total = data.total || 0;
    cxRenderTable();
  } catch (e) {
    if (seq !== cx.reqSeq) return;
    if (handleSetupError(e)) return;
    document.getElementById("cx-table-wrap").innerHTML = `<p class="cx-error">שגיאה בטעינת הלקוחות: ${escapeHtml(e.message)}</p>`;
  } finally {
    if (seq === cx.reqSeq) {
      cx.loading = false;
      document.getElementById("cx-table-wrap").classList.remove("is-loading");
    }
  }
}

function statusBadge(u) {
  if (u.suspended) return `<span class="cx-badge cx-badge-red">מושעה</span>`;
  if (!u.emailConfirmed) return `<span class="cx-badge cx-badge-amber">מייל לא אומת</span>`;
  return `<span class="cx-badge cx-badge-green">פעיל</span>`;
}
function planBadge(u) {
  return u.pro ? `<span class="cx-badge cx-badge-violet">Pro</span>` : `<span class="cx-badge cx-badge-grey">Free</span>`;
}
function docsCell(u) {
  const c = u.counts || {};
  const total = (c.sites || 0) + (c.cv || 0) + (c.quotes || 0) + (c.invoices || 0);
  const title = `אתרים ${c.sites || 0} · קורות חיים ${c.cv || 0} · הצעות מחיר ${c.quotes || 0} · חשבוניות ${c.invoices || 0}`;
  return `<span class="cx-docs" title="${escapeHtml(title)}"><b>${total}</b>
    <span class="cx-docs-split">🌐${c.sites || 0} · 📄${c.cv || 0} · 📋${c.quotes || 0} · 🧾${c.invoices || 0}</span></span>`;
}

function cxCell(key, u) {
  switch (key) {
    case "number": return `<td class="cx-num">#${u.number}</td>`;
    case "name": return `<td class="cx-name"><span class="cx-avatar">${escapeHtml(initialsOf(u))}</span><span>${u.name ? escapeHtml(u.name) : `<span class="cx-muted">ללא שם</span>`}</span></td>`;
    case "email": return `<td class="cx-email" dir="ltr">${escapeHtml(u.email || "—")}</td>`;
    case "createdAt": return `<td class="cx-nowrap">${escapeHtml(fmtDateTime(u.createdAt))}</td>`;
    case "lastActiveAt": return `<td class="cx-nowrap" title="${escapeHtml(fmtDateTime(u.lastActiveAt))}">${escapeHtml(fmtRelative(u.lastActiveAt))}</td>`;
    case "lastSignInAt": return `<td class="cx-nowrap" title="${escapeHtml(fmtDateTime(u.lastSignInAt))}">${escapeHtml(fmtRelative(u.lastSignInAt))}</td>`;
    case "status": return `<td>${statusBadge(u)}</td>`;
    case "plan": return `<td>${planBadge(u)}</td>`;
    case "docs": return `<td>${docsCell(u)}</td>`;
    case "id": return `<td class="cx-mono" dir="ltr" title="${escapeHtml(u.id)}">${escapeHtml(String(u.id).slice(0, 8))}…</td>`;
    default: return "<td></td>";
  }
}

function cxRenderTable() {
  const wrap = document.getElementById("cx-table-wrap");
  const cols = CX_COLUMNS.filter((c) => cx.cols.has(c.key));
  const canBulk = dkCan("admin");
  const allOnPage = cx.users.length && cx.users.every((u) => cx.selected.has(u.id));
  const head = `<tr>
      ${canBulk ? `<th class="cx-check"><input type="checkbox" id="cx-check-all" aria-label="בחירת כל השורות בעמוד" ${allOnPage ? "checked" : ""}></th>` : ""}
      ${cols.map((c) => c.sort
        ? `<th class="cx-sortable${cx.sort === c.sort ? " is-sorted" : ""}" data-sort="${c.sort}">${escapeHtml(c.label)} <span class="cx-sort-arrow">${cx.sort === c.sort ? (cx.dir === "asc" ? "↑" : "↓") : "↕"}</span></th>`
        : `<th>${escapeHtml(c.label)}</th>`).join("")}
      <th class="cx-actions-col"><span class="cx-sr">פעולות</span></th>
    </tr>`;
  const rows = cx.users.map((u) => `
    <tr class="cx-row${cx.selected.has(u.id) ? " is-selected" : ""}" data-uid="${u.id}">
      ${canBulk ? `<td class="cx-check"><input type="checkbox" data-select="${u.id}" aria-label="בחירה" ${cx.selected.has(u.id) ? "checked" : ""}></td>` : ""}
      ${cols.map((c) => cxCell(c.key, u)).join("")}
      <td class="cx-actions-col"><button type="button" class="cx-icon-btn" data-menu="${u.id}" aria-label="פעולות">⋯</button></td>
    </tr>`).join("");
  const colspan = cols.length + (canBulk ? 2 : 1);
  wrap.innerHTML = `<table class="cx-table">
      <thead>${head}</thead>
      <tbody>${rows || `<tr><td colspan="${colspan}" class="cx-empty">${cxFiltersActive() ? "לא נמצאו לקוחות שתואמים לחיפוש/לסינון." : "עדיין אין לקוחות."}</td></tr>`}</tbody>
    </table>`;
  cxRenderFooter();
  cxRenderBulkBar();
  document.getElementById("cx-clear-filters").hidden = !cxFiltersActive();
}

function cxRenderFooter() {
  const foot = document.getElementById("cx-footer");
  const pages = Math.max(1, Math.ceil(cx.total / cx.pageSize));
  const from = cx.total ? (cx.page - 1) * cx.pageSize + 1 : 0;
  const to = Math.min(cx.total, cx.page * cx.pageSize);
  const nums = [];
  const add = (n) => { if (n >= 1 && n <= pages && !nums.includes(n)) nums.push(n); };
  [1, cx.page - 1, cx.page, cx.page + 1, pages].forEach(add);
  nums.sort((a, b) => a - b);
  let pager = "";
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) pager += `<span class="cx-ellipsis">…</span>`;
    pager += `<button type="button" class="cx-page${n === cx.page ? " is-current" : ""}" data-page="${n}" ${n === cx.page ? 'aria-current="page"' : ""}>${n}</button>`;
  });
  foot.innerHTML = `
    <span class="cx-range">מציג ${fmtNum(from)}–${fmtNum(to)} מתוך ${fmtNum(cx.total)}</span>
    <label class="cx-pagesize">שורות בעמוד
      <select id="cx-pagesize" class="cx-select cx-select-sm">${[25, 50, 100].map((n) => `<option value="${n}" ${n === cx.pageSize ? "selected" : ""}>${n}</option>`).join("")}</select>
    </label>
    <div class="cx-pager">
      <button type="button" class="cx-page" data-page="${cx.page - 1}" ${cx.page <= 1 ? "disabled" : ""} aria-label="הקודם">›</button>
      ${pager}
      <button type="button" class="cx-page" data-page="${cx.page + 1}" ${cx.page >= pages ? "disabled" : ""} aria-label="הבא">‹</button>
    </div>`;
}

function cxRenderBulkBar() {
  const bar = document.getElementById("cx-bulkbar");
  const n = cx.selected.size;
  bar.hidden = !n;
  if (!n) return;
  bar.innerHTML = `
    <span class="cx-bulk-count">נבחרו ${fmtNum(n)}</span>
    <button type="button" class="cx-btn cx-btn-sm" data-bulk="suspend">השעיה</button>
    <button type="button" class="cx-btn cx-btn-sm" data-bulk="unsuspend">ביטול השעיה</button>
    ${dkCan("owner") ? `<button type="button" class="cx-btn cx-btn-sm" data-bulk="export">ייצוא הנבחרים</button>` : ""}
    <button type="button" class="cx-link-btn" data-bulk="clear">ניקוי בחירה</button>`;
}

/* ---------- toolbar ---------- */

function cxSyncToolbar() {
  const f = cx.filters;
  document.getElementById("cx-search").value = f.search;
  document.getElementById("cx-filter-status").value = f.status;
  document.getElementById("cx-filter-plan").value = f.plan;
  document.getElementById("cx-filter-activity").value = f.activity;
  document.getElementById("cx-filter-from").value = f.from;
  document.getElementById("cx-filter-to").value = f.to;
  const dateBtn = document.getElementById("cx-date-btn");
  dateBtn.classList.toggle("is-active", !!(f.from || f.to));
  dateBtn.querySelector("span").textContent = (f.from || f.to)
    ? `${f.from ? fmtDateTime(new Date(f.from).toISOString()) : "…"} – ${f.to ? fmtDateTime(new Date(f.to).toISOString()) : "…"}`
    : "תאריך הרשמה";
}

function cxRenderColumnsMenu() {
  const menu = document.getElementById("cx-cols-menu");
  menu.innerHTML = CX_COLUMNS.filter((c) => !c.always).map((c) => `
    <label class="cx-menu-check"><input type="checkbox" data-col="${c.key}" ${cx.cols.has(c.key) ? "checked" : ""}> ${escapeHtml(c.label)}</label>`).join("")
    + `<button type="button" class="cx-link-btn" id="cx-cols-reset">ברירת מחדל</button>`;
}

function togglePopover(id, anchor) {
  const pop = document.getElementById(id);
  const willOpen = pop.hidden;
  document.querySelectorAll(".cx-popover").forEach((p) => { p.hidden = true; });
  pop.hidden = !willOpen;
  if (willOpen && anchor) anchor.setAttribute("aria-expanded", "true");
}

let cxSearchTimer = null;
function wireCustomersToolbar() {
  const search = document.getElementById("cx-search");
  search.addEventListener("input", () => {
    clearTimeout(cxSearchTimer);
    cxSearchTimer = setTimeout(() => { cx.filters.search = search.value.trim(); cx.page = 1; cxLoadUsers(); }, 300);
  });
  [["cx-filter-status", "status"], ["cx-filter-plan", "plan"], ["cx-filter-activity", "activity"]].forEach(([id, key]) => {
    document.getElementById(id).addEventListener("change", (e) => { cx.filters[key] = e.target.value; cx.page = 1; cxLoadUsers(); });
  });
  document.getElementById("cx-date-btn").addEventListener("click", (e) => { e.stopPropagation(); togglePopover("cx-date-pop", e.currentTarget); });
  document.getElementById("cx-date-apply").addEventListener("click", () => {
    cx.filters.from = document.getElementById("cx-filter-from").value;
    cx.filters.to = document.getElementById("cx-filter-to").value;
    document.getElementById("cx-date-pop").hidden = true;
    cx.page = 1; cxSyncToolbar(); cxLoadUsers();
  });
  document.getElementById("cx-date-clear").addEventListener("click", () => {
    cx.filters.from = ""; cx.filters.to = "";
    document.getElementById("cx-date-pop").hidden = true;
    cx.page = 1; cxSyncToolbar(); cxLoadUsers();
  });
  document.getElementById("cx-cols-btn").addEventListener("click", (e) => { e.stopPropagation(); cxRenderColumnsMenu(); togglePopover("cx-cols-menu", e.currentTarget); });
  document.getElementById("cx-cols-menu").addEventListener("change", (e) => {
    const key = e.target.dataset.col;
    if (!key) return;
    if (e.target.checked) cx.cols.add(key); else cx.cols.delete(key);
    cxSaveCols(); cxRenderTable();
  });
  document.getElementById("cx-cols-menu").addEventListener("click", (e) => {
    if (e.target.id !== "cx-cols-reset") return;
    try { localStorage.removeItem(CX_COLS_KEY); } catch (err) { /* ignore */ }
    cxLoadCols(); cxRenderColumnsMenu(); cxRenderTable();
  });
  document.querySelectorAll(".cx-popover").forEach((p) => p.addEventListener("click", (e) => e.stopPropagation()));
  document.addEventListener("click", () => {
    document.querySelectorAll(".cx-popover").forEach((p) => { p.hidden = true; });
    cxCloseRowMenu();
  });
  document.getElementById("cx-clear-filters").addEventListener("click", () => {
    cx.filters = { search: "", status: "", plan: "", activity: "", from: "", to: "" };
    cx.page = 1; cxSyncToolbar(); cxLoadUsers();
  });
  document.getElementById("cx-refresh").addEventListener("click", () => { cxLoadSummary(); cxLoadUsers(); });
  const exportBtn = document.getElementById("cx-export");
  exportBtn.hidden = !dkCan("owner");
  exportBtn.addEventListener("click", () => cxExport(null));

  const wrap = document.getElementById("cx-table-wrap");
  wrap.addEventListener("click", (e) => {
    const th = e.target.closest("th[data-sort]");
    if (th) {
      const key = th.dataset.sort;
      if (cx.sort === key) cx.dir = cx.dir === "asc" ? "desc" : "asc";
      else { cx.sort = key; cx.dir = key === "email" || key === "full_name" ? "asc" : "desc"; }
      cx.page = 1; cxLoadUsers(); return;
    }
    const menuBtn = e.target.closest("[data-menu]");
    if (menuBtn) { e.stopPropagation(); cxOpenRowMenu(menuBtn, cx.users.find((u) => u.id === menuBtn.dataset.menu)); return; }
    if (e.target.closest("input[type=checkbox]")) return;
    const row = e.target.closest("tr[data-uid]");
    if (row) openUserDrawer(row.dataset.uid);
  });
  wrap.addEventListener("change", (e) => {
    if (e.target.id === "cx-check-all") {
      cx.users.forEach((u) => { if (e.target.checked) cx.selected.set(u.id, u); else cx.selected.delete(u.id); });
      cxRenderTable(); return;
    }
    const id = e.target.dataset.select;
    if (!id) return;
    const u = cx.users.find((x) => x.id === id);
    if (e.target.checked) cx.selected.set(id, u); else cx.selected.delete(id);
    e.target.closest("tr").classList.toggle("is-selected", e.target.checked);
    cxRenderBulkBar();
  });
  document.getElementById("cx-footer").addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    cx.page = Number(b.dataset.page); cxLoadUsers();
    document.getElementById("panel-customers").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("cx-footer").addEventListener("change", (e) => {
    if (e.target.id !== "cx-pagesize") return;
    cx.pageSize = Number(e.target.value); cx.page = 1; cxLoadUsers();
  });
  document.getElementById("cx-bulkbar").addEventListener("click", (e) => {
    const op = e.target.closest("[data-bulk]") && e.target.closest("[data-bulk]").dataset.bulk;
    if (!op) return;
    if (op === "clear") { cx.selected.clear(); cxRenderTable(); return; }
    if (op === "export") { cxExport([...cx.selected.keys()]); return; }
    cxBulk(op);
  });
}

/* ---------- per-row actions menu ---------- */

function cxUserActions(u) {
  const items = [{ key: "open", label: "פרטי לקוח" }];
  if (dkCan("admin")) {
    items.push({ key: "reset", label: "שליחת קישור לאיפוס סיסמה" });
    items.push(u.suspended ? { key: "unsuspend", label: "ביטול השעיה" } : { key: "suspend", label: "השעיית חשבון" });
  }
  if (dkCan("owner")) {
    items.push(u.pro ? { key: "revoke-pro", label: "ביטול Pro" } : { key: "grant-pro", label: "הענקת Pro" });
  }
  items.push({ key: "copy-id", label: "העתקת מזהה משתמש" });
  if (dkCan("owner")) items.push({ key: "delete", label: "מחיקת החשבון…", danger: true, sep: true });
  return items;
}

function cxCloseRowMenu() {
  const m = document.getElementById("cx-row-menu");
  if (m) m.remove();
}

function cxOpenRowMenu(anchor, u) {
  cxCloseRowMenu();
  if (!u) return;
  const menu = document.createElement("div");
  menu.id = "cx-row-menu";
  menu.className = "cx-menu";
  menu.setAttribute("role", "menu");
  menu.innerHTML = cxUserActions(u).map((it) =>
    `${it.sep ? '<div class="cx-menu-sep"></div>' : ""}<button type="button" role="menuitem" class="cx-menu-item${it.danger ? " danger" : ""}" data-act="${it.key}">${escapeHtml(it.label)}</button>`
  ).join("");
  document.body.appendChild(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  menu.style.top = `${window.scrollY + r.bottom + 4}px`;
  menu.style.left = `${Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - mw - 8))}px`;
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    const act = e.target.closest("[data-act]");
    if (!act) return;
    cxCloseRowMenu();
    cxRunUserAction(act.dataset.act, u);
  });
}

function userLabel(u) { return `#${u.number} · ${u.name ? u.name + " · " : ""}${u.email || ""}`; }

async function cxRunUserAction(act, u, afterChange) {
  const done = async (msg) => {
    dkToast(msg, "ok");
    cxLoadSummary(); cxLoadUsers();
    if (afterChange) afterChange();
    // Keep an open details drawer in sync with what just changed.
    if (dkDrawer.userId === u.id && act !== "delete") {
      const tab = dkDrawer.tab;
      await openUserDrawer(u.id);
      dkDrawer.tab = tab; if (dkDrawer.data) renderUserDrawer();
    }
  };
  try {
    if (act === "open") return openUserDrawer(u.id);
    if (act === "copy-id") {
      await navigator.clipboard.writeText(u.id);
      return dkToast("המזהה הועתק", "ok");
    }
    if (act === "reset") {
      const ok = await dkConfirm({ title: "שליחת קישור לאיפוס סיסמה", body: `<p>יישלח מייל לאיפוס סיסמה אל <b dir="ltr">${escapeHtml(u.email)}</b>. הסיסמה הנוכחית לא משתנה עד שהלקוח בוחר חדשה.</p>`, confirmLabel: "שליחה" });
      if (!ok) return;
      await callAdminStats({ action: "send-password-reset", userId: u.id });
      return dkToast("המייל לאיפוס נשלח", "ok");
    }
    if (act === "suspend") {
      const ok = await dkConfirm({ title: "השעיית חשבון", danger: true, reason: "required", confirmLabel: "השעיה",
        body: `<p>${escapeHtml(userLabel(u))}</p><p>הלקוח לא יוכל להתחבר עד ביטול ההשעיה. התוכן שלו לא נמחק, ואתר שכבר פורסם נשאר באוויר.</p>` });
      if (!ok) return;
      await callAdminStats({ action: "suspend-user", userId: u.id, reason: ok.reason });
      return done("החשבון הושעה");
    }
    if (act === "unsuspend") {
      const ok = await dkConfirm({ title: "ביטול השעיה", reason: "optional", confirmLabel: "ביטול ההשעיה", body: `<p>${escapeHtml(userLabel(u))}</p><p>הלקוח יוכל להתחבר שוב.</p>` });
      if (!ok) return;
      await callAdminStats({ action: "unsuspend-user", userId: u.id, reason: ok.reason });
      return done("ההשעיה בוטלה");
    }
    if (act === "grant-pro" || act === "revoke-pro") {
      const grant = act === "grant-pro";
      const ok = await dkConfirm({ title: grant ? "הענקת Pro" : "ביטול Pro", reason: "optional", confirmLabel: grant ? "הענקה" : "ביטול Pro",
        body: `<p>${escapeHtml(userLabel(u))}</p><p>${grant ? "החשבון יקבל את יכולות ה-Pro מיד, בלי תשלום." : "החשבון יחזור לחשבון רגיל (Free)."}</p>` });
      if (!ok) return;
      await callAdminStats({ action: "set-pro", userId: u.id, isPro: grant, reason: ok.reason });
      return done(grant ? "Pro הוענק" : "Pro בוטל");
    }
    if (act === "delete") {
      const ok = await dkConfirm({ title: "מחיקת חשבון לצמיתות", danger: true, reason: "required", typeToConfirm: u.email, confirmLabel: "מחיקה לצמיתות",
        body: `<p>${escapeHtml(userLabel(u))}</p>
               <p><b>הפעולה בלתי הפיכה.</b> החשבון וכל התוכן שלו (אתרים, קורות חיים, הצעות מחיר, חשבוניות, לוגו) יימחקו לצמיתות — בדיוק כמו מחיקה שהלקוח מבצע בעצמו.</p>
               <p class="cx-muted">אם הלקוח הנפיק חשבוניות, הוא חייב לשמור עותק לפי חוק. כדאי לוודא שהוריד אותן לפני המחיקה.</p>` });
      if (!ok) return;
      await callAdminStats({ action: "delete-account", userId: u.id, confirmEmail: u.email, reason: ok.reason });
      closeUserDrawer();
      cx.selected.delete(u.id);
      return done("החשבון נמחק");
    }
  } catch (e) {
    dkToast("הפעולה נכשלה: " + e.message, "err");
  }
}

async function cxBulk(op) {
  const users = [...cx.selected.values()].filter(Boolean);
  if (users.length > 100) return dkToast("אפשר לבצע פעולה מרוכזת על עד 100 לקוחות בכל פעם.", "err");
  const suspend = op === "suspend";
  const ok = await dkConfirm({
    title: suspend ? `השעיית ${users.length} חשבונות` : `ביטול השעיה ל-${users.length} חשבונות`,
    danger: suspend, reason: suspend ? "required" : "optional", confirmLabel: suspend ? "השעיה" : "ביטול השעיה",
    body: `<p>${suspend ? "הלקוחות הנבחרים לא יוכלו להתחבר עד ביטול ההשעיה." : "הלקוחות הנבחרים יוכלו להתחבר שוב."}</p>
           <ul class="cx-modal-list">${users.slice(0, 8).map((u) => `<li>${escapeHtml(userLabel(u))}</li>`).join("")}${users.length > 8 ? `<li>ועוד ${users.length - 8}…</li>` : ""}</ul>`,
  });
  if (!ok) return;
  try {
    const res = await callAdminStats({ action: "bulk", op, userIds: users.map((u) => u.id), reason: ok.reason });
    dkToast(`בוצע עבור ${res.done}${res.skipped && res.skipped.length ? ` · ${res.skipped.length} דולגו (חשבונות מנהלים / החשבון שלך)` : ""}`, "ok");
    cx.selected.clear();
    cxLoadSummary(); cxLoadUsers();
  } catch (e) {
    dkToast("הפעולה נכשלה: " + e.message, "err");
  }
}

/* CSV export — owner only (server-enforced). Only the columns shown in
   the table, never document contents; every export is written to the
   audit log with its filters and row count. Cells starting with = + - @
   are prefixed so a spreadsheet never runs them as formulas. */
async function cxExport(userIds) {
  const ok = await dkConfirm({
    title: "ייצוא לקוחות ל-CSV",
    body: `<p>${userIds ? `ייצוא ${userIds.length} הלקוחות שנבחרו.` : `ייצוא כל ${fmtNum(cx.total)} הלקוחות שתואמים לסינון הנוכחי.`}</p>
           <p class="cx-muted">הקובץ מכיל מידע אישי (שמות ואימיילים). שמרו אותו במקום מאובטח, אל תעבירו אותו לגורם שלא צריך אותו, ומחקו אותו כשסיימתם. הייצוא נרשם ביומן הניהול.</p>`,
    confirmLabel: "ייצוא",
  });
  if (!ok) return;
  try {
    const body = userIds ? { action: "export-users", userIds, sort: cx.sort, dir: cx.dir } : { action: "export-users", ...cxFilterBody() };
    // The server hands rows out in batches; keep asking until a short batch.
    const users = [];
    const btn = document.getElementById("cx-export");
    btn.disabled = true;
    try {
      for (;;) {
        const res = await callAdminStats({ ...body, offset: users.length });
        users.push(...(res.users || []));
        btn.textContent = `⬇ ${fmtNum(users.length)} / ${fmtNum(res.total || users.length)}`;
        if (!res.users || res.users.length < (res.batch || 5000)) break;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = "⬇ ייצוא CSV";
    }
    const header = ["מספר לקוח", "שם", "אימייל", "תאריך הרשמה", "פעילות אחרונה", "סטטוס", "סוג חשבון", "אתרים", "קורות חיים", "הצעות מחיר", "חשבוניות"];
    const safe = (v) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [header.map(safe).join(",")].concat((users || []).map((u) => [
      u.number, u.name || "", u.email || "", fmtDateTime(u.createdAt), fmtDateTime(u.lastActiveAt),
      u.suspended ? "מושעה" : (u.emailConfirmed ? "פעיל" : "מייל לא אומת"), u.pro ? "Pro" : "Free",
      u.counts.sites, u.counts.cv, u.counts.quotes, u.counts.invoices,
    ].map(safe).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `deskkit-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    dkToast(`יוצאו ${fmtNum((users || []).length)} לקוחות`, "ok");
  } catch (e) {
    dkToast("הייצוא נכשל: " + e.message, "err");
  }
}

/* ---------- user details drawer ---------- */

let dkDrawer = { userId: null, data: null, tab: "overview", activityFilter: "all" };

const AUDIT_ACTION_LABELS = {
  view_user: "צפייה בפרטי לקוח", export_users: "ייצוא לקוחות", suspend_user: "השעיית חשבון",
  unsuspend_user: "ביטול השעיה", send_password_reset: "שליחת איפוס סיסמה", grant_pro: "הענקת Pro",
  revoke_pro: "ביטול Pro", delete_account: "מחיקת חשבון", delete_site: "מחיקת אתר", delete_cv: "מחיקת קורות חיים",
  delete_message: "מחיקת הודעה", set_admin_role: "עדכון הרשאת מנהל", remove_admin: "הסרת מנהל",
  admin_unlock: "כניסה לאזור הניהול", admin_unlock_failed: "סיסמת ניהול שגויה", admin_unlock_locked: "ניסיון כניסה בזמן נעילה",
  set_admin_password: "קביעת סיסמת ניהול",
};

function closeUserDrawer() {
  const d = document.getElementById("cx-drawer");
  d.classList.remove("open");
  d.setAttribute("aria-hidden", "true");
  document.getElementById("cx-drawer-backdrop").hidden = true;
  dkDrawer.userId = null;
}

async function openUserDrawer(userId) {
  const d = document.getElementById("cx-drawer");
  dkDrawer = { userId, data: null, tab: "overview", activityFilter: "all" };
  d.innerHTML = `<div class="cx-drawer-loading"><div class="admin-gate-spinner"></div></div>`;
  d.classList.add("open");
  d.setAttribute("aria-hidden", "false");
  document.getElementById("cx-drawer-backdrop").hidden = false;
  try {
    const data = await callAdminStats({ action: "user-detail", userId });
    if (dkDrawer.userId !== userId) return;
    dkDrawer.data = data;
    renderUserDrawer();
  } catch (e) {
    d.innerHTML = `<div class="cx-drawer-head"><button type="button" class="cx-icon-btn" data-drawer-close aria-label="סגירה">✕</button></div><p class="cx-error" style="padding:20px;">לא הצלחנו לטעון את פרטי הלקוח: ${escapeHtml(e.message)}</p>`;
  }
}

function dl(rows) {
  return `<dl class="cx-dl">${rows.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;
}

function renderUserDrawer() {
  const d = document.getElementById("cx-drawer");
  const { user: u, sites, cvs, quotes, invoices, activity, auditEntries } = dkDrawer.data;
  const docCount = (sites || []).length + (cvs || []).length + (quotes || []).length + (invoices || []).length;
  const tabs = [
    { key: "overview", label: "סקירה" },
    { key: "docs", label: `מסמכים (${docCount})` },
    { key: "activity", label: "פעילות" },
  ];
  if (dkCan("admin")) tabs.push({ key: "audit", label: "יומן ניהול" });

  let body = "";
  if (dkDrawer.tab === "overview") {
    body = `
      <h4 class="cx-h4">פרטי חשבון</h4>
      ${dl([
        ["מספר לקוח", `#${u.number}`],
        ["מזהה משתמש", `<span class="cx-mono" dir="ltr">${escapeHtml(u.id)}</span> <button type="button" class="cx-link-btn" data-copy="${escapeHtml(u.id)}">העתקה</button>`],
        ["אימייל", `<span dir="ltr">${escapeHtml(u.email || "—")}</span> ${u.emailConfirmed ? `<span class="cx-badge cx-badge-green">מאומת</span>` : `<span class="cx-badge cx-badge-amber">לא אומת</span>`}`],
        ["שם", u.name ? escapeHtml(u.name) : `<span class="cx-muted">לא הוזן</span>`],
        ["סטטוס", statusBadge(u)],
        ["סוג חשבון", planBadge(u)],
      ])}
      <h4 class="cx-h4">זמנים</h4>
      ${dl([
        ["הצטרפות", escapeHtml(fmtDateTime(u.createdAt))],
        ["כניסה אחרונה", `${escapeHtml(fmtDateTime(u.lastSignInAt))} <span class="cx-muted">(${escapeHtml(fmtRelative(u.lastSignInAt))})</span>`],
        ["פעילות אחרונה", `${escapeHtml(fmtDateTime(u.lastActiveAt))} <span class="cx-muted">(${escapeHtml(fmtRelative(u.lastActiveAt))})</span>`],
      ])}
      <h4 class="cx-h4">שימוש</h4>
      <div class="usage-dashboard">${[
        ["🌐", "אתרים", u.counts.sites], ["📄", "קורות חיים", u.counts.cv],
        ["📋", "הצעות מחיר", u.counts.quotes], ["🧾", "חשבוניות", u.counts.invoices],
      ].map(([i, l, c]) => `<div class="usage-tile${c ? "" : " usage-tile-empty"}"><span class="usage-tile-icon">${i}</span><span class="usage-tile-count">${c || 0}</span><span class="usage-tile-label">${l}</span></div>`).join("")}</div>`;
  } else if (dkDrawer.tab === "docs") {
    const canDel = dkCan("admin");
    const table = (title, headers, rows, empty) => `
      <h4 class="cx-h4">${title}</h4>
      <div class="cx-mini-wrap"><table class="cx-mini">
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}" class="cx-muted">${empty}</td></tr>`}</tbody>
      </table></div>`;
    body =
      table("אתרים", ["תבנית", "סטטוס", "נוצר", ""], (sites || []).map((s) => `<tr>
          <td>${escapeHtml(templateLabel(s.template))}</td>
          <td>${s.published_url ? (dkSafeHttpsUrl(s.published_url) ? `<a href="${escapeHtml(dkSafeHttpsUrl(s.published_url))}" target="_blank" rel="noopener noreferrer">פורסם ↗</a>` : "פורסם") : (s.status === "finalized" ? "שולם" : "טיוטה")}</td>
          <td class="cx-nowrap">${escapeHtml(fmtDateTime(s.created_at))}</td>
          <td>${canDel ? `<button type="button" class="cx-link-btn danger" data-del-site="${s.id}">מחיקה</button>` : ""}</td></tr>`), "אין אתרים")
      + table("קורות חיים", ["נשמר לאחרונה", ""], (cvs || []).map((c) => `<tr>
          <td class="cx-nowrap">${escapeHtml(fmtDateTime(c.updated_at || c.created_at))}</td>
          <td>${canDel && c.id ? `<button type="button" class="cx-link-btn danger" data-del-cv="${c.id}">מחיקה</button>` : ""}</td></tr>`), "אין קורות חיים שמורים")
      + table("הצעות מחיר", ["סגנון", "עודכנה"], (quotes || []).map((q) => `<tr>
          <td>${escapeHtml(q.template ? quoteTemplateLabel(q.template) : "—")}</td>
          <td class="cx-nowrap">${escapeHtml(fmtDateTime(q.updated_at || q.created_at))}</td></tr>`), "אין הצעות מחיר")
      + table("חשבוניות וקבלות", ["סוג", "מספר", "סטטוס", "תאריך"], (invoices || []).map((i) => `<tr>
          <td>${escapeHtml(INVOICE_DOC_TYPE_LABELS[i.doc_type] || i.doc_type)}</td>
          <td>${i.number ? escapeHtml(String(i.number)) : "—"}</td>
          <td>${i.status === "issued" ? "הופקה" : "טיוטה"}</td>
          <td class="cx-nowrap">${escapeHtml(fmtDateTime(i.issued_at || i.created_at))}</td></tr>`), "אין חשבוניות")
      + `<p class="cx-muted cx-small">מוצגים פרטי זיהוי בלבד (סוג, סטטוס, תאריכים) — לא תוכן המסמכים. הצעות מחיר וחשבוניות לא נמחקות מכאן (חשבונית שהופקה נשמרת לפי חוק).</p>`;
  } else if (dkDrawer.tab === "activity") {
    const filterKey = dkDrawer.activityFilter;
    const list = filterKey === "all" ? activity : activity.filter((e) => e.kind === filterKey);
    body = `
      <div class="activity-filter-tabs">${ACTIVITY_FILTER_TABS.map((t) => `<button type="button" class="activity-filter-btn${t.key === filterKey ? " active" : ""}" data-act-filter="${t.key}">${escapeHtml(t.label)}</button>`).join("")}</div>
      <div class="cx-mini-wrap"><table class="cx-mini">
        <thead><tr><th>תאריך ושעה</th><th>מוצר</th><th>פעולה</th><th>פריט</th></tr></thead>
        <tbody>${list.length ? list.map(activityRowHtml).join("") : `<tr><td colspan="4" class="cx-muted">${activity.length ? "אין פעילות מהסוג הזה" : "אין תיעוד פעילות"}</td></tr>`}</tbody>
      </table></div>`;
  } else if (dkDrawer.tab === "audit") {
    body = `<div class="cx-mini-wrap"><table class="cx-mini">
        <thead><tr><th>זמן</th><th>מנהל/ת</th><th>פעולה</th><th>פרטים</th></tr></thead>
        <tbody>${(auditEntries || []).length ? auditEntries.map((a) => `<tr>
          <td class="cx-nowrap">${escapeHtml(fmtDateTime(a.created_at))}</td>
          <td dir="ltr">${escapeHtml(a.admin_email)}</td>
          <td>${escapeHtml(AUDIT_ACTION_LABELS[a.action] || a.action)}</td>
          <td>${escapeHtml(auditDetailsText(a.details))}</td></tr>`).join("") : `<tr><td colspan="4" class="cx-muted">אין פעולות ניהול על הלקוח הזה</td></tr>`}</tbody>
      </table></div>`;
  }

  d.innerHTML = `
    <div class="cx-drawer-head">
      <span class="cx-avatar cx-avatar-lg">${escapeHtml(initialsOf(u))}</span>
      <div class="cx-drawer-title">
        <h3>${u.name ? escapeHtml(u.name) : `<bdi dir="ltr">${escapeHtml(u.email || "")}</bdi>`} <span class="cx-num">#${u.number}</span></h3>
        ${u.name ? `<p dir="ltr">${escapeHtml(u.email || "")}</p>` : ""}
        <div class="cx-drawer-badges">${statusBadge(u)} ${planBadge(u)}</div>
      </div>
      <button type="button" class="cx-btn cx-btn-sm" data-drawer-menu>פעולות ▾</button>
      <button type="button" class="cx-icon-btn" data-drawer-close aria-label="סגירה">✕</button>
    </div>
    <div class="cx-drawer-tabs" role="tablist">${tabs.map((t) => `<button type="button" role="tab" class="cx-drawer-tab${t.key === dkDrawer.tab ? " active" : ""}" data-drawer-tab="${t.key}" aria-selected="${t.key === dkDrawer.tab}">${escapeHtml(t.label)}</button>`).join("")}</div>
    <div class="cx-drawer-body">${body}
      <p class="cx-privacy-note">תזכורת למנהלים: פרטי הלקוח מוצגים לצורכי תמיכה וניהול בלבד, וכל צפייה ופעולה של מנהל/ת כאן נרשמת ב"יומן ניהול" — כנדרש לשמירה על פרטיות הלקוחות. הלקוח עצמו לא רואה את ההודעה הזו.</p>
    </div>`;
}

function auditDetailsText(details) {
  if (!details || typeof details !== "object") return "";
  const parts = [];
  if (details.reason) parts.push(`סיבה: ${details.reason}`);
  if (details.rows != null) parts.push(`${details.rows} שורות`);
  if (details.email) parts.push(details.email);
  if (details.role) parts.push(DK_ROLE_LABELS[details.role] || details.role);
  if (details.template) parts.push(templateLabel(details.template));
  if (details.bulk) parts.push("פעולה מרוכזת");
  if (details.filters) {
    const f = Object.entries(details.filters).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}=${v}`);
    if (f.length) parts.push("סינון: " + f.join(", "));
  }
  return parts.join(" · ");
}

function wireUserDrawer() {
  const d = document.getElementById("cx-drawer");
  document.getElementById("cx-drawer-backdrop").addEventListener("click", closeUserDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dkDrawer.userId && !document.querySelector(".cx-modal-backdrop")) closeUserDrawer(); });
  d.addEventListener("click", async (e) => {
    if (e.target.closest("[data-drawer-close]")) return closeUserDrawer();
    const tab = e.target.closest("[data-drawer-tab]");
    if (tab) { dkDrawer.tab = tab.dataset.drawerTab; return renderUserDrawer(); }
    const af = e.target.closest("[data-act-filter]");
    if (af) { dkDrawer.activityFilter = af.dataset.actFilter; return renderUserDrawer(); }
    const copy = e.target.closest("[data-copy]");
    if (copy) { try { await navigator.clipboard.writeText(copy.dataset.copy); dkToast("הועתק", "ok"); } catch (err) { /* ignore */ } return; }
    const menuBtn = e.target.closest("[data-drawer-menu]");
    if (menuBtn && dkDrawer.data) {
      e.stopPropagation();
      const u = dkDrawer.data.user;
      cxOpenRowMenu(menuBtn, u);
      // Inside the drawer, "פרטי לקוח" is where we already are.
      const open = document.querySelector('#cx-row-menu [data-act="open"]');
      if (open) open.remove();
      return;
    }
    const delSite = e.target.closest("[data-del-site]");
    const delCv = e.target.closest("[data-del-cv]");
    if (delSite || delCv) {
      const isSite = !!delSite;
      const ok = await dkConfirm({ title: isSite ? "מחיקת אתר" : "מחיקת קורות חיים", danger: true, reason: "optional", confirmLabel: "מחיקה לצמיתות",
        body: `<p>${escapeHtml(userLabel(dkDrawer.data.user))}</p><p>${isSite ? "האתר יימחק לצמיתות מהחשבון של הלקוח." : "קורות החיים האלה יימחקו לצמיתות מהחשבון של הלקוח."} הפעולה בלתי הפיכה.</p>` });
      if (!ok) return;
      try {
        await callAdminStats(isSite ? { action: "delete-site", siteId: delSite.dataset.delSite } : { action: "delete-cv", cvId: delCv.dataset.delCv });
        dkToast("נמחק", "ok");
        const uid = dkDrawer.userId;
        await openUserDrawer(uid);
        dkDrawer.tab = "docs"; renderUserDrawer();
        cxLoadUsers();
      } catch (err) {
        dkToast("המחיקה נכשלה: " + err.message, "err");
      }
    }
  });
}

/* ---------- audit log tab ---------- */

const audit = { page: 1, pageSize: 50, total: 0, filterAction: "", filterAdmin: "", filterUserNumber: "" };

async function loadAuditLog() {
  const wrap = document.getElementById("audit-table-wrap");
  wrap.classList.add("is-loading");
  try {
    const data = await callAdminStats({ action: "audit-log", page: audit.page, pageSize: audit.pageSize,
      filterAction: audit.filterAction || undefined, filterAdmin: audit.filterAdmin || undefined, filterUserNumber: audit.filterUserNumber || undefined });
    audit.total = data.total || 0;
    const rows = (data.entries || []).map((a) => `<tr>
      <td class="cx-nowrap">${escapeHtml(fmtDateTime(a.created_at))}</td>
      <td dir="ltr">${escapeHtml(a.admin_email)}</td>
      <td>${escapeHtml(DK_ROLE_LABELS[a.admin_role] || a.admin_role || "")}</td>
      <td>${escapeHtml(AUDIT_ACTION_LABELS[a.action] || a.action)}</td>
      <td>${a.target_user_id ? `<button type="button" class="cx-link-btn" data-open-user="${a.target_user_id}">#${a.target_user_number ?? "?"}</button>` : "—"}</td>
      <td>${escapeHtml(auditDetailsText(a.details))}</td></tr>`).join("");
    wrap.innerHTML = `<table class="cx-table cx-table-plain">
      <thead><tr><th>זמן</th><th>מנהל/ת</th><th>תפקיד</th><th>פעולה</th><th>לקוח</th><th>פרטים</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6" class="cx-empty">אין רשומות.</td></tr>`}</tbody></table>`;
    const pages = Math.max(1, Math.ceil(audit.total / audit.pageSize));
    document.getElementById("audit-footer").innerHTML = `
      <span class="cx-range">${fmtNum(audit.total)} רשומות · עמוד ${audit.page} מתוך ${pages}</span>
      <div class="cx-pager">
        <button type="button" class="cx-page" data-audit-page="${audit.page - 1}" ${audit.page <= 1 ? "disabled" : ""}>›</button>
        <button type="button" class="cx-page" data-audit-page="${audit.page + 1}" ${audit.page >= pages ? "disabled" : ""}>‹</button>
      </div>`;
  } catch (e) {
    if (handleSetupError(e)) return;
    wrap.innerHTML = `<p class="cx-error">שגיאה בטעינת היומן: ${escapeHtml(e.message)}</p>`;
  } finally {
    wrap.classList.remove("is-loading");
  }
}

function wireAuditLog() {
  const sel = document.getElementById("audit-filter-action");
  sel.innerHTML = `<option value="">כל הפעולות</option>` + Object.entries(AUDIT_ACTION_LABELS).map(([k, v]) => `<option value="${k}">${escapeHtml(v)}</option>`).join("");
  sel.addEventListener("change", () => { audit.filterAction = sel.value; audit.page = 1; loadAuditLog(); });
  let t = null;
  document.getElementById("audit-filter-admin").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { audit.filterAdmin = e.target.value.trim(); audit.page = 1; loadAuditLog(); }, 400); });
  document.getElementById("audit-filter-user").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { audit.filterUserNumber = e.target.value.replace(/\D/g, ""); audit.page = 1; loadAuditLog(); }, 400); });
  document.getElementById("audit-refresh").addEventListener("click", loadAuditLog);
  document.getElementById("audit-footer").addEventListener("click", (e) => {
    const b = e.target.closest("[data-audit-page]");
    if (!b || b.disabled) return;
    audit.page = Number(b.dataset.auditPage); loadAuditLog();
  });
  document.getElementById("audit-table-wrap").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open-user]");
    if (b) openUserDrawer(b.dataset.openUser);
  });
}

/* ---------- admins / permissions tab (owner) ---------- */

async function loadAdmins() {
  const wrap = document.getElementById("admins-table-wrap");
  try {
    const { owners, admins } = await callAdminStats({ action: "list-admins" });
    const ownerRows = (owners || []).map((email) => `<tr><td dir="ltr">${escapeHtml(email)}</td><td>${DK_ROLE_LABELS.owner}</td><td class="cx-muted">מוגדר ב-ADMIN_EMAILS</td><td></td></tr>`).join("");
    const adminRows = (admins || []).map((a) => `<tr>
      <td dir="ltr">${escapeHtml(a.email)}</td>
      <td><select class="cx-select cx-select-sm" data-role-for="${escapeHtml(a.email)}">${["support", "admin", "owner"].map((r) => `<option value="${r}" ${r === a.role ? "selected" : ""}>${DK_ROLE_LABELS[r]}</option>`).join("")}</select></td>
      <td class="cx-muted">${escapeHtml(fmtDateTime(a.created_at))}${a.created_by ? ` · ${escapeHtml(a.created_by)}` : ""}</td>
      <td><button type="button" class="cx-link-btn danger" data-remove-admin="${escapeHtml(a.email)}">הסרה</button></td></tr>`).join("");
    wrap.innerHTML = `<table class="cx-table cx-table-plain"><thead><tr><th>אימייל</th><th>תפקיד</th><th>נוסף</th><th></th></tr></thead><tbody>${ownerRows}${adminRows}</tbody></table>`;
  } catch (e) {
    if (handleSetupError(e)) return;
    wrap.innerHTML = `<p class="cx-error">שגיאה: ${escapeHtml(e.message)}</p>`;
  }
}

function wireAdmins() {
  document.getElementById("admin-add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-add-email").value.trim();
    const role = document.getElementById("admin-add-role").value;
    const ok = await dkConfirm({ title: "הוספת מנהל/ת", confirmLabel: "הוספה",
      body: `<p>ל-<b dir="ltr">${escapeHtml(email)}</b> תינתן הרשאת <b>${escapeHtml(DK_ROLE_LABELS[role])}</b> לאזור הניהול, כולל גישה לפרטי הלקוחות.</p><p class="cx-muted">תנו הרשאה רק למי שצריך אותה לצורך העבודה, ובתפקיד המצומצם ביותר שמספיק.</p>` });
    if (!ok) return;
    try {
      await callAdminStats({ action: "set-admin-role", email, role });
      document.getElementById("admin-add-email").value = "";
      dkToast("נוסף", "ok"); loadAdmins();
    } catch (err) { dkToast("נכשל: " + err.message, "err"); }
  });
  const wrap = document.getElementById("admins-table-wrap");
  wrap.addEventListener("change", async (e) => {
    const email = e.target.dataset.roleFor;
    if (!email) return;
    try { await callAdminStats({ action: "set-admin-role", email, role: e.target.value }); dkToast("ההרשאה עודכנה", "ok"); }
    catch (err) { dkToast("נכשל: " + err.message, "err"); loadAdmins(); }
  });
  wrap.addEventListener("click", async (e) => {
    const email = e.target.dataset && e.target.dataset.removeAdmin;
    if (!email) return;
    const ok = await dkConfirm({ title: "הסרת הרשאה", danger: true, confirmLabel: "הסרה", body: `<p>ל-<b dir="ltr">${escapeHtml(email)}</b> לא תהיה יותר גישה לאזור הניהול.</p>` });
    if (!ok) return;
    try { await callAdminStats({ action: "remove-admin", email }); dkToast("ההרשאה הוסרה", "ok"); loadAdmins(); }
    catch (err) { dkToast("נכשל: " + err.message, "err"); }
  });
}

/* ---------- setup notice (admin_dashboard.sql not run yet) ---------- */

function handleSetupError(e) {
  const msg = String(e && e.message || "");
  if (!/admin_list_users|admin_dashboard_summary|admin_audit_log|admin_users|user_number|run supabase\/sql\/admin_dashboard\.sql/i.test(msg)) return false;
  document.getElementById("cx-setup-card").hidden = false;
  return true;
}

/* ---------- server calls ---------- */

/* The caller's own session access token goes in Authorization — the Edge
   Function verifies it's a real signed-in user and resolves their admin
   role server-side. res.status is attached to the thrown error so
   callers can tell "not an admin" (403) apart from "not set up yet"
   (500) apart from any other failure. */
async function callAdminStats(body) {
  let { data: sessionData } = await supabaseClient.auth.getSession();
  // Right after a sign-in redirect the session can take a moment to be
  // restored — wait briefly before calling it "not signed in".
  for (let i = 0; i < 6 && !(sessionData.session && sessionData.session.access_token); i++) {
    await new Promise((r) => setTimeout(r, 500));
    ({ data: sessionData } = await supabaseClient.auth.getSession());
  }
  const token = sessionData.session && sessionData.session.access_token;
  if (!token) {
    const err = new Error("not signed in");
    err.status = 401;
    throw err;
  }
  const res = await fetch(SUPABASE_URL + "/functions/v1/admin-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ ...body, adminToken: dkGetUnlockToken() }),
  });
  const data = await res.json();
  if (!res.ok) {
    // The unlock expired (8 hours) or was never there: back to the lock
    // screen rather than a broken panel.
    if (res.status === 401 && data.error === "admin-locked" && body.action !== "whoami") {
      dkClearUnlockToken();
      window.location.reload();
    }
    const err = new Error(data.error || String(res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---------- admin password ("second lock") ----------
   The unlock token lives in sessionStorage: it's gone when the tab/browser
   closes, and the server also expires it after 8 hours. */
const DK_UNLOCK_KEY = "dk_admin_unlock_v1";
function dkGetUnlockToken() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DK_UNLOCK_KEY) || "null");
    return raw && raw.expiresAt > Date.now() ? raw.token : null;
  } catch (_e) { return null; }
}
function dkSetUnlockToken(t) {
  try { sessionStorage.setItem(DK_UNLOCK_KEY, JSON.stringify({ token: t.token, expiresAt: t.expiresAt })); } catch (_e) { /* storage blocked */ }
}
function dkClearUnlockToken() {
  try { sessionStorage.removeItem(DK_UNLOCK_KEY); } catch (_e) { /* storage blocked */ }
}

// Shows the lock screen inside the existing gate box; resolves once the
// admin password was set or entered correctly.
function dkShowAdminLock(me) {
  return new Promise((resolve) => {
    const box = document.querySelector("#admin-gate .admin-gate-box");
    const isSetup = me.adminPassword !== "set";
    box.innerHTML = `
      <h1>אזור ניהול</h1>
      <p style="margin-bottom:14px;">${isSetup
        ? "שלב אבטחה נוסף: בחרו <b>סיסמת ניהול</b> — סיסמה נפרדת שתידרש בכל כניסה לאזור הניהול, בנוסף להתחברות לחשבון. אל תשתמשו בסיסמה של המייל או של החשבון."
        : "להמשך, הקלידו את <b>סיסמת הניהול</b> שלכם."}</p>
      <form id="dk-lock-form" style="text-align:right;">
        <input type="password" id="dk-lock-pw" class="cx-input" autocomplete="${isSetup ? "new-password" : "current-password"}" placeholder="סיסמת ניהול" style="width:100%; margin-bottom:8px;" required>
        ${isSetup ? `<input type="password" id="dk-lock-pw2" class="cx-input" autocomplete="new-password" placeholder="אימות סיסמת ניהול" style="width:100%; margin-bottom:6px;" required>
        <p style="font-size:12.5px; color:var(--grey); margin:0 0 8px;">לפחות 10 תווים.</p>` : ""}
        <div id="dk-lock-err" style="color:#B23333; font-size:13px; min-height:18px; margin-bottom:6px;"></div>
        <button type="submit" class="btn btn-teal" id="dk-lock-btn" style="width:100%;">${isSetup ? "שמירת סיסמת הניהול" : "כניסה לאזור הניהול"}</button>
      </form>`;
    const form = document.getElementById("dk-lock-form");
    const err = document.getElementById("dk-lock-err");
    const btn = document.getElementById("dk-lock-btn");
    document.getElementById("dk-lock-pw").focus();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const pw = document.getElementById("dk-lock-pw").value;
      if (isSetup) {
        if (pw.length < 10) { err.textContent = "סיסמת הניהול חייבת לכלול לפחות 10 תווים."; return; }
        if (pw !== document.getElementById("dk-lock-pw2").value) { err.textContent = "הסיסמאות לא תואמות."; return; }
      }
      btn.disabled = true;
      try {
        const t = await callAdminStats(isSetup ? { action: "set-admin-password", newPassword: pw } : { action: "unlock", password: pw });
        dkSetUnlockToken(t);
        resolve();
      } catch (ex) {
        const code = ex.message;
        err.textContent = code === "bad-password" ? "סיסמת ניהול שגויה."
          : code === "locked" ? "יותר מדי ניסיונות שגויים — הכניסה נעולה ל-15 דקות."
          : code === "not signed in" ? "נראה שההתחברות לחשבון פגה — רעננו את הדף (או התחברו שוב) ונסו שוב."
          : code === "too-short" ? "סיסמת הניהול חייבת לכלול לפחות 10 תווים."
          : "שגיאה: " + code;
        btn.disabled = false;
      }
    });
  });
}

function showAccessDenied() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "none";
  document.getElementById("admin-denied").style.display = "";
}

/* ---------- "תבניות" tab ---------- */

let templateStatsLoaded = false;
async function loadTemplateStats() {
  const err = document.getElementById("stats-err");
  const btn = document.getElementById("stats-load-btn");
  err.textContent = "";
  btn.disabled = true;
  btn.textContent = "טוענים...";
  try {
    const data = await callAdminStats({ action: "template-stats" });
    renderTemplateStats(data);
    templateStatsLoaded = true;
  } catch (e) {
    err.textContent = "שגיאה בטעינת הנתונים: " + e.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "רענון נתונים";
  }
}

/* ---------- top-level tabs ---------- */

const DK_TABS = [
  { key: "customers", minRole: "support" },
  { key: "feedback", minRole: "support" },
  { key: "templates", minRole: "support" },
  { key: "audit", minRole: "admin" },
  { key: "admins", minRole: "owner" },
];
const dkTabLoaded = {};

function activateTab(key) {
  DK_TABS.forEach((t) => {
    const btn = document.getElementById("toptab-" + t.key);
    const panel = document.getElementById("panel-" + t.key);
    if (btn) { btn.classList.toggle("active", t.key === key); btn.setAttribute("aria-selected", String(t.key === key)); }
    if (panel) panel.hidden = t.key !== key;
  });
  if (!dkTabLoaded[key]) {
    dkTabLoaded[key] = true;
    if (key === "feedback") loadMessages();
    if (key === "templates") loadTemplateStats();
    if (key === "audit") loadAuditLog();
    if (key === "admins") loadAdmins();
  }
  // Chart.js sizes each canvas from its container's current width, so a
  // chart built while its tab was hidden needs a resize once visible.
  if (key === "templates" && kpiChartInstance) kpiChartInstance.resize();
}

function wireAdminTopTabs() {
  DK_TABS.forEach((t) => {
    const btn = document.getElementById("toptab-" + t.key);
    if (!btn) return;
    btn.hidden = !dkCan(t.minRole);
    btn.addEventListener("click", () => activateTab(t.key));
  });
}

async function showPanel() {
  // Role first: it decides which tabs and actions exist at all. A 401/403
  // here is the server saying this account isn't an admin.
  try {
    let me = await callAdminStats({ action: "whoami" });
    // Second lock: until the admin password is entered (or first set),
    // the server answers nothing else. (adminPassword is undefined only
    // while an older server version is still deployed.)
    if (me.adminPassword !== undefined && !me.unlocked) {
      await dkShowAdminLock(me);
      me = await callAdminStats({ action: "whoami" });
    }
    dkAdminRole = me.role;
    document.getElementById("admin-role-pill").textContent = `${me.email} · ${DK_ROLE_LABELS[me.role] || me.role}`;
  } catch (e) {
    if (e.status === 401 || e.status === 403) { showAccessDenied(); return; }
    if (e.message === "ADMIN_EMAILS not configured") {
      document.getElementById("admin-gate").style.display = "none";
      document.getElementById("admin-panel").style.display = "";
      document.getElementById("stats-setup-card").hidden = false;
      return;
    }
    // Any other failure: say so and stop the spinner — it isn't loading.
    const spinner = document.querySelector("#admin-gate .admin-gate-spinner");
    if (spinner) spinner.hidden = true;
    // "unknown action" = the server still runs an older admin-stats that
    // predates "whoami", i.e. the Edge Function wasn't redeployed yet.
    document.querySelector("#admin-gate p").textContent = e.message === "unknown action"
      ? "פונקציית השרת admin-stats עדיין בגרסה הישנה. צריך לפרוס אותה מחדש ב-Supabase (Edge Functions → admin-stats) ואז לרענן את הדף."
      : "שגיאה: " + e.message;
    return;
  }
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";
  cxLoadCols();
  wireAdminTopTabs();
  wireCustomersToolbar();
  wireUserDrawer();
  if (dkCan("admin")) wireAuditLog();
  if (dkCan("owner")) wireAdmins();
  document.getElementById("messages-list").addEventListener("click", handleMessagesListClick);
  document.getElementById("messages-refresh-btn").addEventListener("click", loadMessages);
  document.getElementById("stats-load-btn").addEventListener("click", loadTemplateStats);
  activateTab("customers");
  cxSyncToolbar();
  cxLoadSummary();
  cxLoadUsers();
  // Unread-messages count on the tab, without opening it.
  callAdminStats({ action: "list-messages" }).then((d) => {
    const unread = (d.messages || []).filter((m) => !m.read_at).length;
    const badge = document.getElementById("toptab-feedback-count");
    if (badge) { badge.textContent = unread ? String(unread) : ""; badge.hidden = !unread; }
  }).catch(() => {});
}

/* Real Supabase Auth gate: not signed in at all → straight to the normal
   login page (same as every other gated tool on this site). Signed in →
   showPanel() asks the server for this account's admin role; that's the
   server-enforced check, this is just routing. */
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
