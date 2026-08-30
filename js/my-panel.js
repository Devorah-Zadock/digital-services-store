/* Global "my content" side panel — every logged-in page gets it, showing
   every site and the CV the account has, even when both are still empty
   (with a link straight to starting one). This replaces the old
   sites.html-only rail (site-cloud-save.js used to render its own copy,
   visible only there) with one component included site-wide, so "my
   stuff" is always in the same place no matter which page you're on.

   Self-contained on purpose: pages that include this script don't all
   load site-templates.js, so this never assumes SITE_TEMPLATES exists —
   a project's own businessName (or a plain fallback) is enough to label
   a row without needing the template catalog. */

function myPanelEscapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function myPanelRowHtml(opts) {
  const del = opts.deleteAttr
    ? `<button type="button" class="my-content-delete-btn" data-panel-delete="${opts.deleteAttr}" title="מחיקה" aria-label="מחיקה">🗑</button>`
    : "";
  return `<div class="my-content-row">
    <a href="${opts.href}" class="my-site-row">
      <span class="my-site-row-name">${myPanelEscapeHtml(opts.name)}</span>
      ${opts.sub ? `<span class="my-site-row-tpl">${myPanelEscapeHtml(opts.sub)}</span>` : ""}
    </a>${del}
  </div>`;
}

async function loadMyPanel(user) {
  const list = document.getElementById("my-panel-list");
  if (!list) return;

  const rows = [];

  const { data: sites } = await supabaseClient
    .from("site_projects").select("id, template, data")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  if (sites && sites.length) {
    sites.forEach((s) => {
      const bizName = s.data && s.data.businessName && s.data.businessName.trim();
      rows.push(myPanelRowHtml({
        href: "sites.html?template=" + encodeURIComponent(s.template),
        name: bizName || "אתר עסקי (ללא שם עדיין)",
        sub: "בניית אתר",
        deleteAttr: "site:" + s.id,
      }));
    });
  } else {
    rows.push(myPanelRowHtml({ href: "sites.html?browse=1", name: "עדיין לא בנית אתר", sub: "בניית אתר — לעריכה" }));
  }

  const { data: cv } = await supabaseClient.from("cv_saves").select("data").eq("user_id", user.id).maybeSingle();
  const cvName = cv && cv.data && cv.data.content && cv.data.content.name && cv.data.content.name.trim();
  rows.push(myPanelRowHtml({
    href: "builder.html",
    name: cvName || "עדיין לא ערכת קורות חיים",
    sub: "קורות חיים — לעריכה",
    deleteAttr: cv ? "cv" : null,
  }));

  list.innerHTML = rows.join("");
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

function mountMyPanel() {
  if (document.getElementById("my-panel")) return;
  const header = document.querySelector("header.site");
  if (header) document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");

  const aside = document.createElement("aside");
  aside.id = "my-panel";
  aside.className = "my-sites-rail no-print";
  aside.innerHTML = `<h3 class="my-sites-rail-title">האתרים והתכנים שלי</h3><div class="my-sites-list" id="my-panel-list"></div>`;
  document.body.appendChild(aside);
  document.body.classList.add("has-sites-rail");

  aside.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-panel-delete]");
    if (!btn) return;
    e.preventDefault();
    const [kind, id] = btn.dataset.panelDelete.split(":");
    deleteMyPanelItem(kind, id, btn);
  });
}

function unmountMyPanel() {
  const aside = document.getElementById("my-panel");
  if (aside) aside.remove();
  document.body.classList.remove("has-sites-rail");
}

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      mountMyPanel();
      loadMyPanel(session.user);
    } else {
      unmountMyPanel();
    }
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (user) {
      mountMyPanel();
      loadMyPanel(user);
    }
  });
});
