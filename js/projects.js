/* projects.html — the central "הפרויקטים שלי" page. Reads the exact
   same tables my-panel.js's rail already reads (site_projects,
   cv_saves, quote_saves, invoice_saves) plus schedule_projects (the
   XLSX/sheet product) — no new storage, no new data model, just a
   fuller view of data that already exists. Site rows are intentionally
   NOT deduped by template here (my-panel.js's rail dedupes for a
   different, space-constrained context) — a real second website using
   the same Design Starting Point is a real, separate project and must
   show as its own card. */

const DK_PROJECTS_TABS = [
  { key: "all", label: "הכול" },
  { key: "site", label: "אתרים" },
  { key: "cv", label: "קורות חיים" },
  { key: "quote", label: "הצעות מחיר" },
  { key: "invoice", label: "חשבוניות" },
  { key: "schedule", label: "גליונות" },
];

let dkProjectsAll = [];
let dkProjectsActiveTab = "all";
let dkProjectsUser = null;

function dkProjectsEscape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dkProjectsTimeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "עודכן הרגע";
  if (mins < 60) return `עודכן לפני ${mins} דקות`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `עודכן לפני ${hours} שעות`;
  const days = Math.round(hours / 24);
  if (days < 30) return `עודכן לפני ${days} ימים`;
  return `עודכן ב-${new Date(iso).toLocaleDateString("he-IL")}`;
}

const DK_PCARD_ICONS = {
  site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.6 5.5 3.6 9s-1.3 6.5-3.6 9c-2.3-2.5-3.6-5.5-3.6-9s1.3-6.5 3.6-9z"/></svg>',
  cv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13h5M9.5 16.5h5"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/><path d="M9 12h6M9 16h6"/></svg>',
  invoice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="3" width="12" height="18" rx="1.5"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  schedule: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16M15 4v16"/></svg>',
};

// Same 6 colors as the sidebar/create-chooser/home cards (data-dk-product);
// "schedule" (the XLSX/sheet product) reuses the xlsx color.
const DK_PCARD_PRODUCT = { site: "site", cv: "cv", quote: "quote", invoice: "invoice", schedule: "xlsx" };

const MY_PANEL_TEMPLATE_LABELS_FALLBACK = typeof MY_PANEL_TEMPLATE_LABELS !== "undefined" ? MY_PANEL_TEMPLATE_LABELS : {};

async function dkProjectsFetchAll(user) {
  let [sitesRes, cvRes, quotesRes, invoicesRes, scheduleRes] = await Promise.all([
    supabaseClient.from("site_projects").select("id, template, data, status, published_url, slug, updated_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabaseClient.from("cv_saves").select("data, updated_at").eq("user_id", user.id).maybeSingle(),
    supabaseClient.from("quote_saves").select("id, data, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabaseClient.from("invoice_saves").select("id, doc_type, status, number, data, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabaseClient.from("schedule_projects").select("id, data, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
  ]);

  // published_url/slug only exist once the one-time
  // supabase/sql/site_projects_publish.sql + site_projects_slug.sql
  // setup has actually been run in the Supabase dashboard — on an
  // account where it hasn't, selecting them makes the WHOLE query fail
  // ("column does not exist"), and since supabase-js never throws on a
  // query error, sitesRes.data silently comes back null and every real
  // site that account has just vanishes from this page with no visible
  // error anywhere — confirmed live as "לא יצרת שום אתר" even though
  // the same account's sites showed up fine in js/my-content.js's older
  // query, which never asks for those two columns. Retrying once with
  // only the columns every site_projects row is guaranteed to have
  // keeps this page working regardless of whether that setup ran.
  if (sitesRes.error) {
    console.warn("site_projects query failed, retrying without published_url/slug:", sitesRes.error.message);
    sitesRes = await supabaseClient.from("site_projects").select("id, template, data, status, updated_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  }
  // Confirmed-live report: even this first retry still came back empty
  // for a real account with a real site, meaning status/updated_at
  // ALSO aren't safe to assume on every account's table — only id/
  // template/data are, because js/my-content.js's older query (which
  // asks for only those three) showed this exact account's sites fine.
  // One more retry, down to that same guaranteed-safe column set,
  // before giving up and calling it a real failure.
  if (sitesRes.error) {
    console.warn("site_projects retry also failed, retrying with minimal columns:", sitesRes.error.message);
    sitesRes = await supabaseClient.from("site_projects").select("id, template, data").eq("user_id", user.id);
  }
  // Same silent-failure shape as above, one layer deeper: if this last
  // retry also errors (RLS misconfigured, a real outage, anything other
  // than a missing-columns case), supabase-js still never throws —
  // (sitesRes.data || []) would quietly produce an empty array again,
  // indistinguishable from "this account genuinely has zero sites".
  // Flagging it (not retrying again — a further retry wouldn't fix a
  // non-column-related error) lets the caller show an honest "couldn't
  // load your sites" instead of the wrong "you have no sites" / "create
  // your first one" empty state.
  const siteFetchFailed = !!sitesRes.error;
  if (siteFetchFailed) console.error("site_projects query failed even after both retries:", sitesRes.error.message);

  const items = [];
  (sitesRes.data || []).forEach((s) => {
    const biz = s.data && s.data.businessName && s.data.businessName.trim();
    items.push({
      kind: "site", id: s.id, name: biz || "אתר תדמית (ללא שם)",
      sub: MY_PANEL_TEMPLATE_LABELS_FALLBACK[s.template] || s.template,
      status: s.published_url ? "live" : "draft",
      statusLabel: s.published_url ? "מפורסם" : "טיוטה",
      updatedAt: s.updated_at || s.created_at,
      href: "sites.html?site=" + encodeURIComponent(s.id),
      raw: s,
    });
  });
  if (cvRes.data) {
    const cvName = cvRes.data.data && cvRes.data.data.content && cvRes.data.data.content.name && cvRes.data.data.content.name.trim();
    items.push({
      kind: "cv", id: "cv", name: cvName || "קורות חיים (ללא שם)", sub: "",
      status: "draft", statusLabel: "",
      updatedAt: cvRes.data.updated_at,
      href: "builder.html", raw: cvRes.data,
    });
  }
  (quotesRes.data || []).forEach((q) => {
    const d = q.data || {};
    const label = (d.recipient && d.recipient.trim()) || (d.eventName && d.eventName.trim());
    items.push({
      kind: "quote", id: q.id, name: label || "הצעת מחיר (ללא שם)",
      sub: d.eventName && d.recipient ? d.eventName : "",
      status: "draft", statusLabel: "",
      updatedAt: q.updated_at,
      href: "quote-app.html?quote=" + encodeURIComponent(q.id), raw: q,
    });
  });
  const invoiceDocLabels = { invoice_receipt: "חשבונית מס-קבלה", receipt: "קבלה", credit_note: "חשבונית זיכוי" };
  (invoicesRes.data || []).forEach((inv) => {
    const d = inv.data || {};
    items.push({
      kind: "invoice", id: inv.id, name: (d.recipientName && d.recipientName.trim()) || "מסמך (ללא שם)",
      sub: invoiceDocLabels[inv.doc_type] || "מסמך",
      status: inv.status === "issued" ? "live" : "draft",
      statusLabel: inv.status === "issued" ? `מס' ${inv.number}` : "טיוטה",
      updatedAt: inv.updated_at,
      href: "invoice-app.html?invoice=" + encodeURIComponent(inv.id), raw: inv,
    });
  });
  (scheduleRes.data || []).forEach((sc) => {
    const name = sc.data && sc.data.name && sc.data.name.trim();
    items.push({
      kind: "schedule", id: sc.id, name: name || "גליון (ללא שם)", sub: "",
      status: "draft", statusLabel: "",
      updatedAt: sc.updated_at,
      href: "schedule-builder.html?schedule=" + encodeURIComponent(sc.id), raw: sc,
    });
  });

  items.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  items.siteFetchFailed = siteFetchFailed;
  return items;
}

function dkPcardHtml(item) {
  const product = DK_PCARD_PRODUCT[item.kind] || "site";
  return `
    <div class="dk-pcard" data-dk-product="${product}" data-dk-pcard-kind="${item.kind}" data-dk-pcard-id="${dkProjectsEscape(item.id)}">
      <div class="dk-pcard-thumb">
        <span class="dk-pcard-thumb-icon">${DK_PCARD_ICONS[item.kind] || ""}</span>
        <button type="button" class="dk-pcard-more" data-dk-pcard-more aria-label="עוד">⋮</button>
      </div>
      <div class="dk-pcard-body">
        <p class="dk-pcard-name">${dkProjectsEscape(item.name)}</p>
        <p class="dk-pcard-meta">
          ${item.sub ? `<span>${dkProjectsEscape(item.sub)}</span>` : ""}
          ${item.statusLabel ? `<span class="dk-pcard-status ${item.status === "live" ? "live" : "draft"}">${dkProjectsEscape(item.statusLabel)}</span>` : ""}
        </p>
        <p class="dk-pcard-date">${dkProjectsTimeAgo(item.updatedAt)}</p>
        <a href="${item.href}" class="dk-pcard-cta">פתיחה</a>
      </div>
    </div>`;
}

function dkProjectsRender() {
  const grid = document.getElementById("dk-projects-grid");
  if (!grid) return;
  const filtered = dkProjectsActiveTab === "all" ? dkProjectsAll : dkProjectsAll.filter((i) => i.kind === dkProjectsActiveTab);
  // A real fetch failure (see dkProjectsFetchAll's own comment) must never
  // look like "you have zero projects" — on an "all"/"site" tab with no
  // site items AND a flagged fetch error, this is "we couldn't load your
  // sites", not "create your first one".
  if (!filtered.length && dkProjectsAll.siteFetchFailed && (dkProjectsActiveTab === "all" || dkProjectsActiveTab === "site")) {
    grid.innerHTML = `<div class="dk-pcard-empty dk-pcard-error">לא הצלחנו לטעון את האתרים שלכם כרגע — זו תקלה בטעינה, לא אומר שאין לכם אתרים. <a href="#" id="dk-projects-retry">נסו לרענן</a></div>`;
    const retryBtn = document.getElementById("dk-projects-retry");
    if (retryBtn) retryBtn.addEventListener("click", (e) => { e.preventDefault(); dkProjectsLoad(); });
    return;
  }
  if (!filtered.length) {
    grid.innerHTML = `<div class="dk-pcard-empty">עדיין אין כאן פרויקטים. <a href="#" id="dk-projects-empty-create">+ צרו את הראשון שלכם</a></div>`;
    const btn = document.getElementById("dk-projects-empty-create");
    if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); if (typeof openCreateChooser === "function") openCreateChooser(); });
    return;
  }
  grid.innerHTML = filtered.map(dkPcardHtml).join("");
}

function dkProjectsRenderTabs() {
  const wrap = document.getElementById("dk-projects-tabs");
  if (!wrap) return;
  wrap.innerHTML = DK_PROJECTS_TABS.map((t) => {
    const count = t.key === "all" ? dkProjectsAll.length : dkProjectsAll.filter((i) => i.kind === t.key).length;
    // "(0)" on the sites tab reads as "confirmed zero sites" — wrong and
    // misleading when the real cause is a failed fetch (see
    // dkProjectsFetchAll's own comment). "⚠" instead signals "couldn't
    // check", not "none exist".
    const countLabel = t.key === "site" && dkProjectsAll.siteFetchFailed ? " ⚠" : count ? ` (${count})` : "";
    return `<button type="button" class="dk-tab${t.key === dkProjectsActiveTab ? " active" : ""}" data-dk-tab="${t.key}">${t.label}${countLabel}</button>`;
  }).join("");
  wrap.querySelectorAll("[data-dk-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      dkProjectsActiveTab = btn.dataset.dkTab;
      dkProjectsRenderTabs();
      dkProjectsRender();
    });
  });
}

function dkProjectsCloseMenu() {
  const m = document.querySelector(".dk-pcard-menu");
  if (m) m.remove();
}

async function dkProjectsDuplicate(item) {
  if (item.kind === "site") {
    const s = item.raw;
    const row = { user_id: dkProjectsUser.id, template: s.template, data: s.data };
    const { error } = await supabaseClient.from("site_projects").insert(row);
    if (error) { alert("שכפול נכשל: " + error.message); return; }
  } else if (item.kind === "quote") {
    const q = item.raw;
    const { error } = await supabaseClient.from("quote_saves").insert({ user_id: dkProjectsUser.id, data: q.data });
    if (error) { alert("שכפול נכשל: " + error.message); return; }
  } else if (item.kind === "schedule") {
    const sc = item.raw;
    const { error } = await supabaseClient.from("schedule_projects").insert({ user_id: dkProjectsUser.id, data: sc.data, updated_at: new Date().toISOString() });
    if (error) { alert("שכפול נכשל: " + error.message); return; }
  }
  await dkProjectsLoad(true);
}

async function dkProjectsDelete(item) {
  const label = item.kind === "cv" ? "את קורות החיים שלכם" : item.kind === "quote" ? "את הצעת המחיר הזו" : item.kind === "invoice" ? "את הטיוטה הזו" : item.kind === "schedule" ? "את הגליון הזה" : "את האתר הזה";
  if (!confirm(`למחוק לצמיתות ${label}? הפעולה בלתי הפיכה.`)) return;
  if (item.kind === "site") await supabaseClient.from("site_projects").delete().eq("id", item.id).eq("user_id", dkProjectsUser.id);
  else if (item.kind === "cv") await supabaseClient.from("cv_saves").delete().eq("user_id", dkProjectsUser.id);
  else if (item.kind === "quote") await supabaseClient.from("quote_saves").delete().eq("id", item.id).eq("user_id", dkProjectsUser.id);
  else if (item.kind === "invoice") await supabaseClient.from("invoice_saves").delete().eq("id", item.id).eq("user_id", dkProjectsUser.id);
  else if (item.kind === "schedule") await supabaseClient.from("schedule_projects").delete().eq("id", item.id).eq("user_id", dkProjectsUser.id);
  if (window.refreshMyPanel) window.refreshMyPanel();
  await dkProjectsLoad(true);
}

function dkProjectsOpenMenu(card, item) {
  dkProjectsCloseMenu();
  const canDuplicate = item.kind === "site" || item.kind === "quote" || item.kind === "schedule";
  const canDelete = item.kind !== "invoice" || item.status !== "live";
  const menu = document.createElement("div");
  menu.className = "dk-pcard-menu";
  menu.innerHTML = `
    <button type="button" data-act="open">עריכה</button>
    ${canDuplicate ? `<button type="button" data-act="dup">שכפול</button>` : ""}
    ${canDelete ? `<button type="button" class="danger" data-act="del">מחיקה</button>` : ""}
  `;
  card.appendChild(menu);
  menu.querySelector('[data-act="open"]').addEventListener("click", () => { location.href = item.href; });
  const dup = menu.querySelector('[data-act="dup"]');
  if (dup) dup.addEventListener("click", () => { dkProjectsCloseMenu(); dkProjectsDuplicate(item); });
  const del = menu.querySelector('[data-act="del"]');
  if (del) del.addEventListener("click", () => { dkProjectsCloseMenu(); dkProjectsDelete(item); });
  setTimeout(() => document.addEventListener("click", dkProjectsOutsideClick, true), 0);
}

function dkProjectsOutsideClick(e) {
  if (!e.target.closest(".dk-pcard-menu") && !e.target.closest("[data-dk-pcard-more]")) {
    dkProjectsCloseMenu();
    document.removeEventListener("click", dkProjectsOutsideClick, true);
  }
}

document.addEventListener("click", (e) => {
  const moreBtn = e.target.closest("[data-dk-pcard-more]");
  if (!moreBtn) return;
  e.preventDefault();
  const card = moreBtn.closest(".dk-pcard");
  const kind = card.dataset.dkPcardKind;
  const id = card.dataset.dkPcardId;
  const item = dkProjectsAll.find((i) => i.kind === kind && String(i.id) === id);
  if (item) dkProjectsOpenMenu(card, item);
});

async function dkProjectsLoad(forceRefresh) {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session && data.session.user;
  if (!user) { location.href = "account.html?redirect=" + encodeURIComponent("projects.html"); return; }
  dkProjectsUser = user;
  dkProjectsAll = await dkProjectsFetchAll(user);
  dkProjectsRenderTabs();
  dkProjectsRender();
  const empty = document.getElementById("dk-projects-overlay");
  if (empty) empty.style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  // Only the actual projects.html page auto-runs (and redirect-to-login
  // is only correct there) — index.html reuses this file's fetch/render
  // helpers for its own logged-in "recent projects" strip via
  // js/index-home.js, which calls dkProjectsFetchAll/dkPcardHtml
  // directly instead of this auto-loader.
  if (document.getElementById("dk-projects-grid")) dkProjectsLoad();
});
