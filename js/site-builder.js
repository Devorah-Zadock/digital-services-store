/* Business-website builder: wizard form + live iframe preview (free), with
   the downloadable ZIP gated behind a Gumroad license key — same pattern as
   the CV builder used before it went free (see README "Gumroad setup" for
   exact setup steps, and the honest security caveat: client-side check,
   not real DRM). */

/* IMPORTANT: placeholder product ID/checkout link — see README before going
   live with this product. Gumroad's current UI surfaces a per-product
   "product ID" specifically for API license verification (more stable than
   the permalink, which a seller could rename later), so we verify against
   that instead of product_permalink. */
const SITE_GUMROAD_CONFIG = { productId: "NUyzNlvxdpU_49TE5nk9fg==", checkoutUrl: "https://dizstudio.gumroad.com/l/rhkfld" };
const SITE_UNLOCK_KEY = "deskkit_sites_unlocked_" + SITE_GUMROAD_CONFIG.productId;
/* Scoped per template, not just per product: unlocking one site must not
   silently unlock a download of a totally different template later —
   each template is its own purchase (see site-cloud-save.js). */
function currentUnlockKey() {
  return SITE_UNLOCK_KEY + "_" + siteState.template;
}
/* Persists the customer's own form input (business name, services, etc.) in
   their browser, so returning to edit or re-download later doesn't mean
   retyping everything from scratch — separate from SITE_UNLOCK_KEY, which
   only remembers whether the license was verified. */
const SITE_DATA_KEY = "deskkit_sites_data_v1";

const SITE_DEFAULT = {
  businessName: "",
  tagline: "",
  about: "",
  primaryColor: "#1F5C4E",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  services: [{ name: "", desc: "", price: "" }],
  pages: { about: false, contact: false },
  heroImage: "",
  videoUrl: "",
};

let siteState = { template: "local-service", data: JSON.parse(JSON.stringify(SITE_DEFAULT)) };
let previewPage = "index";

/* Older saved/loaded data (from before the multi-page feature existed)
   won't have a `pages` object — patch it in rather than special-casing
   every read site-wide. */
function ensurePagesShape(data) {
  if (!data.pages || typeof data.pages !== "object") data.pages = { about: false, contact: false };
  data.pages.about = !!data.pages.about;
  data.pages.contact = !!data.pages.contact;
  return data;
}

function serviceItemHtml(s, i, total) {
  const canRemove = total > 1;
  return `
  <div class="services-item" data-idx="${i}">
    <div class="services-item-head">
      <strong style="font-size:12.5px;">שירות ${i + 1}</strong>
      ${canRemove ? `<button type="button" class="job-remove" data-service-remove="${i}">הסרה</button>` : ""}
    </div>
    <input type="text" placeholder="שם השירות/מוצר" data-service="${i}" data-key="name" value="${escapeHtmlS(s.name)}">
    <input type="text" placeholder="תיאור קצר (לא חובה)" data-service="${i}" data-key="desc" value="${escapeHtmlS(s.desc)}">
    <input type="text" placeholder="מחיר (לא חובה)" data-service="${i}" data-key="price" value="${escapeHtmlS(s.price)}">
  </div>`;
}

function renderServicesList() {
  document.getElementById("services-list").innerHTML =
    siteState.data.services.map((s, i) => serviceItemHtml(s, i, siteState.data.services.length)).join("");
}

/* Full catalog-style browser for the 5 site templates — same card/tab
   markup as the CV catalog (js/catalog.js), reusing its CSS wholesale
   rather than the old cramped in-sidebar picker. Each card links to
   sites.html?template=KEY, a real navigation (mirrors product.html ->
   builder.html?template=) so the wizard below can just read it from
   the URL on load like the CV builder already does. */
function siteTplCardHtml(key, t) {
  return `
    <div class="card" data-cat="${t.categorySlug}">
      <div class="thumb"><img src="${t.thumb}" alt="${escapeHtmlS(t.label)}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${escapeHtmlS(t.category)}</span>
          <span class="price">99 ₪</span>
        </div>
        <h3>${escapeHtmlS(t.label)}</h3>
        <p style="font-size:13px; color:var(--grey); margin:0; flex:1;">${escapeHtmlS(t.desc)}</p>
        <a href="sites.html?template=${key}" class="btn btn-teal card-cta">בחירה ועריכה</a>
      </div>
    </div>`;
}

function renderTplCatalog() {
  const tabsEl = document.getElementById("site-tpl-tabs");
  const gridEl = document.getElementById("site-tpl-grid");
  tabsEl.innerHTML = SITE_CATEGORIES.map((c) => `<button class="tab" data-cat="${c.slug}">${escapeHtmlS(c.label)}</button>`).join("");
  let active = "all";
  function apply() {
    tabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.cat === active));
    const entries = Object.entries(SITE_TEMPLATES).filter(([, t]) => active === "all" || t.categorySlug === active);
    gridEl.innerHTML = entries.map(([key, t]) => siteTplCardHtml(key, t)).join("");
  }
  tabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => { active = btn.dataset.cat; apply(); });
  });
  apply();
}

function renderCurrentTplInfo() {
  const t = SITE_TEMPLATES[siteState.template];
  document.getElementById("current-tpl-info").textContent = t ? t.label : "";
}

function showCatalog() {
  document.getElementById("tpl-catalog-section").style.display = "";
  document.getElementById("wizard-section").style.display = "none";
  renderTplCatalog();
}

function showWizard() {
  document.getElementById("tpl-catalog-section").style.display = "none";
  document.getElementById("wizard-section").style.display = "";
  renderCurrentTplInfo();
  renderFormValues();
  renderSitePreview();
}

function renderFormValues() {
  const d = ensurePagesShape(siteState.data);
  document.getElementById("s-name").value = d.businessName;
  document.getElementById("s-tagline").value = d.tagline;
  document.getElementById("s-about").value = d.about;
  document.getElementById("s-color").value = d.primaryColor;
  document.getElementById("s-phone").value = d.phone;
  document.getElementById("s-whatsapp").value = d.whatsapp;
  document.getElementById("s-email").value = d.email;
  document.getElementById("s-address").value = d.address;
  document.getElementById("s-page-about").checked = d.pages.about;
  document.getElementById("s-page-contact").checked = d.pages.contact;
  document.getElementById("s-video").value = d.videoUrl || "";
  renderPhotoPreview();
  renderServicesList();
}

function renderPhotoPreview() {
  const el = document.getElementById("s-photo-preview");
  el.innerHTML = siteState.data.heroImage
    ? `<img src="${siteState.data.heroImage}" alt="">`
    : `<span class="site-photo-placeholder">🖼️</span>`;
}

function enabledSitePages() {
  const d = ensurePagesShape(siteState.data);
  const pages = ["index"];
  if (d.pages.about) pages.push("about");
  if (d.pages.contact) pages.push("contact");
  return pages;
}

function currentSiteHtml(page) {
  return SITE_TEMPLATES[siteState.template].render(siteState.data, page || "index");
}

function renderPreviewTabs() {
  const wrap = document.getElementById("preview-tabs");
  const pages = enabledSitePages();
  if (!pages.includes(previewPage)) previewPage = "index";
  if (pages.length < 2) { wrap.style.display = "none"; wrap.innerHTML = ""; return; }
  const labels = { index: "בית", about: "אודות", contact: "צור קשר" };
  wrap.style.display = "flex";
  wrap.innerHTML = pages.map((p) =>
    `<button type="button" class="preview-tab-btn${p === previewPage ? " active" : ""}" data-page="${p}">${labels[p]}</button>`
  ).join("");
  wrap.querySelectorAll(".preview-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      previewPage = btn.dataset.page;
      renderPreviewTabs();
      document.getElementById("site-preview-frame").srcdoc = currentSiteHtml(previewPage);
    });
  });
}

function saveSiteState() {
  try { localStorage.setItem(SITE_DATA_KEY, JSON.stringify(siteState)); } catch (err) { /* storage unavailable — not fatal, just won't persist */ }
}

function loadSiteState() {
  try {
    const raw = localStorage.getItem(SITE_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data && SITE_TEMPLATES[parsed.template]) return parsed;
  } catch (err) { /* corrupt/old data — ignore and start fresh */ }
  return null;
}

function renderSitePreview() {
  renderPreviewTabs();
  document.getElementById("site-preview-frame").srcdoc = currentSiteHtml(previewPage);
  saveSiteState();
  if (typeof scheduleSiteSave === "function") scheduleSiteSave();
}

function wireForm() {
  const map = {
    "s-name": "businessName", "s-tagline": "tagline", "s-about": "about",
    "s-phone": "phone", "s-whatsapp": "whatsapp", "s-email": "email", "s-address": "address",
  };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      siteState.data[key] = e.target.value;
      renderSitePreview();
    });
  });
  document.getElementById("s-color").addEventListener("input", (e) => {
    siteState.data.primaryColor = e.target.value;
    renderSitePreview();
  });

  document.getElementById("s-photo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert("התמונה גדולה מדי — בחרו קובץ עד 6MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      siteState.data.heroImage = reader.result;
      renderPhotoPreview();
      renderSitePreview();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("s-photo-remove").addEventListener("click", () => {
    siteState.data.heroImage = "";
    document.getElementById("s-photo").value = "";
    renderPhotoPreview();
    renderSitePreview();
  });
  document.getElementById("s-video").addEventListener("input", (e) => {
    siteState.data.videoUrl = e.target.value;
    renderSitePreview();
  });

  document.getElementById("s-page-about").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.about = e.target.checked;
    renderSitePreview();
  });
  document.getElementById("s-page-contact").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.contact = e.target.checked;
    renderSitePreview();
  });

  document.getElementById("add-service").addEventListener("click", () => {
    siteState.data.services.push({ name: "", desc: "", price: "" });
    renderServicesList();
    renderSitePreview();
  });
  document.getElementById("services-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.service;
    const key = e.target.dataset.key;
    if (idx === undefined) return;
    siteState.data.services[idx][key] = e.target.value;
    renderSitePreview();
  });
  document.getElementById("services-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.serviceRemove;
    if (idx === undefined) return;
    if (siteState.data.services.length <= 1) return;
    siteState.data.services.splice(Number(idx), 1);
    renderServicesList();
    renderSitePreview();
  });
}

function publishGuideText(pages) {
  const fileList = pages.map((p) => `${p}.html`).concat("site-data.json").map((f) => `  • ${f}`).join("\n");
  return `איך להעלות את האתר לאוויר
==========================

מה יש בתיקייה הזו:
${fileList}

שלב 1 — פרסום האתר (בחינם, תוך כמה דקות):
1. נכנסים לכתובת: https://app.netlify.com/drop
2. גוררים את התיקייה הזו (כולה) לתוך העמוד.
3. מקבלים כתובת אתר מיד — אבל היא זמנית! בלי לעשות את שלב 4 האתר
   נשאר מוגן בסיסמה ונמחק תוך שעה.
4. לוחצים על הכפתור "Sign up for free" שמופיע בעמוד — הרשמה חינמית,
   בלי כרטיס אשראי, לוקחת דקה — כדי "לתפוס" את האתר לצמיתות ולהסיר
   את הסיסמה הזמנית.

שלב 2 — דומיין משלכם (לא חובה):
אפשר להמשיך להשתמש בכתובת החינמית שמקבלים מ-Netlify, או לחבר בהמשך
דומיין שרכשתם בנפרד (למשל מ-GoDaddy או מרשם דומיינים ישראלי) — אפשרות
"Domain settings" בתוך האתר שנוצר ב-Netlify.

איך אנשים ימצאו את האתר בגוגל, לא רק מי שיש לו את הקישור?
כתובת ה-Netlify החינמית עצמה לא "עולה" בחיפוש גוגל — היא רק נגישה
למי שקיבל את הקישור. שני דברים עוזרים הכי הרבה:
  • לרשום את העסק בחינם ב-Google עסקים שלי (business.google.com) —
    זה מה שמשפיע הכי הרבה על עסק מקומי/קטן.
  • לחבר דומיין משלכם (כ-60–150 ₪ לשנה) — נראה הרבה יותר מקצועי.

רוצים לערוך שוב בעתיד (גם ממחשב אחר)?
בתוך התיקייה הזו יש קובץ בשם site-data.json — שמרו אותו במקום בטוח.
בפעם הבאה, חוזרים לעמוד בניית האתר ומעלים אותו בכפתור "טעינת קובץ
נתונים", וכל הפרטים חוזרים בדיוק כמו שהיו.

שאלות? digital.dz.studio@gmail.com
`;
}

async function downloadSiteZip() {
  const zip = new JSZip();
  const pages = enabledSitePages();
  pages.forEach((page) => {
    zip.file(`${page}.html`, currentSiteHtml(page));
  });
  // Lets the customer restore their exact form data later — even from a
  // different device — by re-uploading this file to the "load saved data"
  // input, without us needing any account system or server-side storage.
  zip.file("site-data.json", JSON.stringify(siteState, null, 2));
  // The Netlify Drop steps live on this page too, but the ZIP needs to
  // stand on its own — a customer opening it weeks later, or forwarding
  // it to whoever manages their hosting, won't necessarily come back here.
  zip.file("how-to-publish.txt", publishGuideText(pages));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Plain-ASCII filename on purpose: a Hebrew business name in the
  // `download` attribute isn't handled consistently across every
  // browser/OS combination, so keep this generic and safe everywhere.
  a.download = "business-website.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function refreshUnlockUI() {
  const unlocked = localStorage.getItem(currentUnlockKey()) === "1";
  document.getElementById("unlock-pending").style.display = unlocked ? "none" : "";
  document.getElementById("unlock-done").style.display = unlocked ? "" : "none";
}

async function verifySiteLicense() {
  const input = document.getElementById("license-input");
  const note = document.getElementById("license-note");
  const key = input.value.trim();
  if (!key) { note.textContent = "יש להזין קוד רישוי."; note.className = "unlock-note err"; return; }
  note.textContent = "בודקים...";
  note.className = "unlock-note";
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_id: SITE_GUMROAD_CONFIG.productId, license_key: key }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(currentUnlockKey(), "1");
      note.textContent = "";
      refreshUnlockUI();
    } else {
      note.textContent = "קוד לא תקין. בדקו את המייל שקיבלתם ב-Gumroad ונסו שוב.";
      note.className = "unlock-note err";
    }
  } catch (err) {
    note.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
    note.className = "unlock-note err";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const urlTemplate = params.get("template");
  const forceBrowse = params.get("browse") === "1";

  const saved = loadSiteState();
  if (saved) siteState = saved;
  ensurePagesShape(siteState.data);
  const hasSavedContent = !!(saved && (saved.data.businessName || (saved.data.services || []).some((s) => s.name)));

  document.getElementById("buy-link").href = SITE_GUMROAD_CONFIG.checkoutUrl;
  wireForm();
  refreshUnlockUI();

  // Same discovery flow as the CV catalog: browse a real catalog of
  // templates first, land straight in the wizard only when arriving via
  // a template link or continuing a session that already has content.
  if (urlTemplate && SITE_TEMPLATES[urlTemplate]) {
    siteState.template = urlTemplate;
    showWizard();
  } else if (forceBrowse) {
    showCatalog();
  } else if (hasSavedContent) {
    showWizard();
  } else {
    showCatalog();
  }

  document.getElementById("verify-btn").addEventListener("click", verifySiteLicense);
  document.getElementById("download-zip-btn").addEventListener("click", async () => {
    if (typeof finalizeSiteProject === "function") await finalizeSiteProject();
    downloadSiteZip();
  });

  // The preview iframe's nav links can't really navigate (see
  // previewNavScript in site-templates.js — a relative href inside srcdoc
  // would otherwise resolve against THIS page and load DeskKit's own
  // about/contact page instead of the customer's). Instead they post a
  // message here, and we switch the preview tab exactly as if it had been
  // clicked directly.
  window.addEventListener("message", (e) => {
    const frame = document.getElementById("site-preview-frame");
    if (e.source !== frame.contentWindow) return;
    const page = e.data && e.data.deskkitPreviewNav;
    if (!page || !enabledSitePages().includes(page)) return;
    previewPage = page;
    renderPreviewTabs();
    frame.srcdoc = currentSiteHtml(previewPage);
  });
});
