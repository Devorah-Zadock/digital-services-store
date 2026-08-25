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
};

let siteState = { template: "local-service", data: JSON.parse(JSON.stringify(SITE_DEFAULT)) };

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
  const d = siteState.data;
  document.getElementById("s-name").value = d.businessName;
  document.getElementById("s-tagline").value = d.tagline;
  document.getElementById("s-about").value = d.about;
  document.getElementById("s-color").value = d.primaryColor;
  document.getElementById("s-phone").value = d.phone;
  document.getElementById("s-whatsapp").value = d.whatsapp;
  document.getElementById("s-email").value = d.email;
  document.getElementById("s-address").value = d.address;
  renderServicesList();
}

function currentSiteHtml() {
  return SITE_TEMPLATES[siteState.template].render(siteState.data);
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
  document.getElementById("site-preview-frame").srcdoc = currentSiteHtml();
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

async function downloadSiteZip() {
  const zip = new JSZip();
  zip.file("index.html", currentSiteHtml());
  // Lets the customer restore their exact form data later — even from a
  // different device — by re-uploading this file to the "load saved data"
  // input, without us needing any account system or server-side storage.
  zip.file("site-data.json", JSON.stringify(siteState, null, 2));
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
});
