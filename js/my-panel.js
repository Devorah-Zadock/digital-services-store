/* Global "my content" side panel — every logged-in page gets it, laid
   out like a real app rail (brand at the top, account at the bottom,
   content grouped and collapsible in between — see js/nav-auth.js for
   the account dropdown this borrows the sign-out flow from).

   Self-contained on purpose: pages that include this script don't all
   load site-templates.js, so a small local label map stands in for it —
   just the labels, not the render functions — kept in sync by hand
   whenever a template is added to js/site-templates.js. */

const MY_PANEL_TEMPLATE_LABELS = {
  "local-service": "עסק שירות מקומי",
  "freelancer": "פרילנסר / יועץ",
  "catalog": "קטלוג קטן",
  "gallery": "גלריה מודרנית",
  "bold": "נועז ומודרני",
  "elegant": "אלגנטי ומעוצב",
  "process": "תהליך עבודה",
  "portfolio": "תיק עבודות יצירתי",
  "boutique": "חנות בוטיק",
  "noir": "יוקרתי כהה",
  "studio": "סטודיו קריאייטיב",
};

const MY_PANEL_COLLAPSE_KEY = "deskkit_panel_collapsed";

function myPanelEscapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function myPanelTrashIcon() {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/></svg>';
}

function myPanelChevronIcon() {
  return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>';
}

function myPanelRowHtml(opts) {
  const del = opts.deleteAttr
    ? `<button type="button" class="my-content-delete-btn" data-panel-delete="${opts.deleteAttr}" title="מחיקה" aria-label="מחיקה">${myPanelTrashIcon()}</button>`
    : "";
  const activeClass = opts.active ? " active" : "";
  return `<div class="my-content-row">
    <a href="${opts.href}" class="my-site-row${activeClass}">
      <span class="my-site-row-name">${myPanelEscapeHtml(opts.name)}</span>
      ${opts.sub ? `<span class="my-site-row-tpl">${myPanelEscapeHtml(opts.sub)}</span>` : ""}
    </a>${del}
  </div>`;
}

/* Which single row (if any) is "the thing being edited right now" —
   not just hovered, but actually open — so it reads as active the
   whole time you're on it, the same way the hover state looks. */
function myPanelCurrentContext() {
  const path = location.pathname.split("/").pop();
  if (path === "sites.html") {
    const t = new URLSearchParams(location.search).get("template");
    return t ? { kind: "site", template: t } : null;
  }
  if (path === "builder.html") return { kind: "cv" };
  return null;
}

async function loadMyPanel(user) {
  const sitesList = document.getElementById("my-panel-sites");
  const cvList = document.getElementById("my-panel-cv");
  if (!sitesList || !cvList) return;
  const ctx = myPanelCurrentContext();

  const { data: sites } = await supabaseClient
    .from("site_projects").select("id, template, data")
    .eq("user_id", user.id).order("created_at", { ascending: false });

  // One row per template is the data model's own guarantee (each save
  // reuses the same row via its id), but de-duping here too means a
  // stray duplicate never shows as two seemingly-identical rows with
  // nothing to tell them apart.
  const seenTemplates = new Set();
  const dedupedSites = (sites || []).filter((s) => {
    if (seenTemplates.has(s.template)) return false;
    seenTemplates.add(s.template);
    return true;
  });

  if (dedupedSites.length) {
    sitesList.innerHTML = dedupedSites.map((s) => {
      const bizName = s.data && s.data.businessName && s.data.businessName.trim();
      return myPanelRowHtml({
        href: "sites.html?template=" + encodeURIComponent(s.template),
        name: bizName || "אתר עסקי (ללא שם)",
        sub: MY_PANEL_TEMPLATE_LABELS[s.template] || s.template,
        deleteAttr: "site:" + s.id,
        active: !!(ctx && ctx.kind === "site" && ctx.template === s.template),
      });
    }).join("");
  } else {
    sitesList.innerHTML = myPanelRowHtml({ href: "sites.html?browse=1", name: "עדיין לא בנית אתר — לבניה" });
  }

  const { data: cv } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
  const cvName = cv && cv.data && cv.data.content && cv.data.content.name && cv.data.content.name.trim();
  if (cv) {
    cvList.innerHTML = myPanelRowHtml({
      href: "builder.html",
      name: cvName || "קורות חיים (ללא שם)",
      deleteAttr: "cv",
      active: !!(ctx && ctx.kind === "cv"),
    });
  } else {
    cvList.innerHTML = myPanelRowHtml({ href: "builder.html", name: "עדיין לא ערכת קורות חיים — לעריכה" });
  }
}

async function deleteMyPanelItem(kind, id, button) {
  const label = kind === "cv" ? "את קורות החיים שלכם" : "את האתר הזה";
  if (!confirm(`למחוק לצמיתות ${label}? הפעולה בלתי הפיכה.`)) return;
  button.disabled = true;
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session && data.session.user;
  if (!user) return;
  if (kind === "site") {
    await supabaseClient.from("site_projects").delete().eq("id", id).eq("user_id", user.id);
  } else if (kind === "cv") {
    await supabaseClient.from("cv_saves").delete().eq("user_id", user.id);
  }
  await loadMyPanel(user);
}

function myPanelSectionsHtml() {
  let collapsed = {};
  try { collapsed = JSON.parse(localStorage.getItem(MY_PANEL_COLLAPSE_KEY) || "{}"); } catch (err) { /* ignore */ }
  const section = (key, label, listId) => `
    <div class="my-panel-section${collapsed[key] ? " collapsed" : ""}" data-section="${key}">
      <button type="button" class="my-panel-section-head">
        <span>${label}</span>${myPanelChevronIcon()}
      </button>
      <div class="my-panel-section-list" id="${listId}"></div>
    </div>`;
  return section("sites", "אתרים", "my-panel-sites") + section("cv", "קורות חיים", "my-panel-cv");
}

function mountMyPanel() {
  if (document.getElementById("my-panel")) return;
  const header = document.querySelector("header.site");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");

  const aside = document.createElement("aside");
  aside.id = "my-panel";
  aside.className = "my-sites-rail no-print";
  aside.innerHTML = `
    <a href="index.html" class="my-panel-brand">
      <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true"><rect class="bm-fold" x="3" y="9" width="13" height="13" rx="3.5"/><rect class="bm-face" x="8" y="4" width="13" height="13" rx="3.5"/></svg>
      DeskKit
    </a>
    <div class="my-panel-subtitle">התבניות שלי</div>
    <div class="my-panel-body">${myPanelSectionsHtml()}</div>
    <div class="my-panel-account">
      <span class="my-panel-account-email"></span>
      <button type="button" class="my-panel-logout">התנתקות</button>
    </div>
  `;
  document.body.appendChild(aside);
  document.body.classList.add("has-sites-rail");

  aside.querySelectorAll(".my-panel-section-head").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".my-panel-section");
      section.classList.toggle("collapsed");
      let collapsed = {};
      try { collapsed = JSON.parse(localStorage.getItem(MY_PANEL_COLLAPSE_KEY) || "{}"); } catch (err) { /* ignore */ }
      collapsed[section.dataset.section] = section.classList.contains("collapsed");
      try { localStorage.setItem(MY_PANEL_COLLAPSE_KEY, JSON.stringify(collapsed)); } catch (err) { /* ignore */ }
    });
  });

  aside.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-panel-delete]");
    if (!btn) return;
    e.preventDefault();
    const [kind, id] = btn.dataset.panelDelete.split(":");
    deleteMyPanelItem(kind, id, btn);
  });

  aside.querySelector(".my-panel-logout").addEventListener("click", async () => {
    if (!confirm("להתנתק?")) return;
    await supabaseClient.auth.signOut();
    window.location.reload();
  });
}

function unmountMyPanel() {
  const aside = document.getElementById("my-panel");
  if (aside) aside.remove();
  document.body.classList.remove("has-sites-rail");
}

function updatePanelAccountEmail(email) {
  const el = document.querySelector("#my-panel .my-panel-account-email");
  if (el) el.textContent = email || "";
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      mountMyPanel();
      updatePanelAccountEmail(session.user.email);
      loadMyPanel(session.user);
    } else {
      unmountMyPanel();
    }
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      mountMyPanel();
      updatePanelAccountEmail(user.email);
      loadMyPanel(user);
    }
  });
});
