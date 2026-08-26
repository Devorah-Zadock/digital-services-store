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

function renderTplButtons() {
  const row = document.getElementById("tpl-row");
  row.innerHTML = Object.entries(SITE_TEMPLATES).map(([key, t]) =>
    `<button type="button" class="site-tpl-btn${key === siteState.template ? " active" : ""}" data-tpl="${key}">${t.label}</button>`
  ).join("");
  row.querySelectorAll(".site-tpl-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      siteState.template = btn.dataset.tpl;
      renderTplButtons();
      renderSitePreview();
    });
  });
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

function loadDataFromFile(file) {
  const note = document.getElementById("load-data-note");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !parsed.data || !SITE_TEMPLATES[parsed.template]) throw new Error("invalid shape");
      siteState = parsed;
      ensurePagesShape(siteState.data);
      previewPage = "index";
      renderTplButtons();
      renderFormValues();
      renderSitePreview();
      note.textContent = "הנתונים נטענו בהצלחה!";
      note.style.color = "var(--teal)";
    } catch (err) {
      note.textContent = "לא הצלחנו לקרוא את הקובץ הזה. ודאו שזה הקובץ site-data.json שהורדתם מהאתר.";
      note.style.color = "#B23";
    }
  };
  reader.onerror = () => {
    note.textContent = "שגיאה בקריאת הקובץ. נסו שוב.";
    note.style.color = "#B23";
  };
  reader.readAsText(file);
}

function refreshUnlockUI() {
  const unlocked = localStorage.getItem(SITE_UNLOCK_KEY) === "1";
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
      localStorage.setItem(SITE_UNLOCK_KEY, "1");
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
  const saved = loadSiteState();
  if (saved) siteState = saved;
  ensurePagesShape(siteState.data);

  document.getElementById("buy-link").href = SITE_GUMROAD_CONFIG.checkoutUrl;
  renderTplButtons();
  renderFormValues();
  wireForm();
  renderSitePreview();
  refreshUnlockUI();

  document.getElementById("verify-btn").addEventListener("click", verifySiteLicense);
  document.getElementById("download-zip-btn").addEventListener("click", downloadSiteZip);

  document.getElementById("load-data-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) loadDataFromFile(file);
    e.target.value = "";
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
