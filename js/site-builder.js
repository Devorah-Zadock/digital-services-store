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
/* Keyed per-template (deskkit_sites_data_v1_<template>), not one shared
   key — a shared key meant that picking a genuinely new template
   pre-filled the form with whatever OTHER template's content happened to
   be cached last, before the (async) Supabase check even had a chance to
   correct it. SITE_LAST_TEMPLATE_KEY remembers which template's key to
   read when arriving with no ?template= at all (plain "continue where I
   left off"). */
const SITE_DATA_KEY = "deskkit_sites_data_v1";
const SITE_LAST_TEMPLATE_KEY = "deskkit_sites_last_template";
function siteDataKey(template) {
  return SITE_DATA_KEY + "_" + template;
}

// Display-only mirror of PUBLISH_LIMIT in supabase/functions/publish-
// site/index.ts, which is what actually enforces it server-side — keep
// the two in sync by hand if the limit ever changes.
const SITE_PUBLISH_LIMIT = 5;
function renderPublishRemaining() {
  const el = document.getElementById("publish-remaining");
  if (!el) return;
  const left = Math.max(0, SITE_PUBLISH_LIMIT - sitePublishCount);
  el.textContent = left > 0
    ? `נותרו ${left} מתוך ${SITE_PUBLISH_LIMIT} עדכוני פרסום חינם לאתר זה.`
    : `הגעתם למגבלת ${SITE_PUBLISH_LIMIT} עדכוני הפרסום החינמיים לאתר זה — אפשר עדיין להוריד את קובצי האתר (ZIP) ולהעלות אותם בעצמכם.`;
}

const SITE_DEFAULT = {
  businessName: "",
  tagline: "",
  about: "",
  primaryColor: "#1F5C4E",
  fontFamily: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  services: [{ name: "", desc: "", price: "" }],
  headings: { services: "", about: "", contact: "" },
  pages: { about: false, contact: false },
  heroImage: "",
  heroImages: [],
  videoUrl: "",
  heroVideoBg: false,
  // Per-element font/color/size/alignment overrides, set via the small
  // style controls next to each relevant field in the sidebar itself
  // (see renderTextStyleControls/wireTextStyleControls below) — keyed by
  // the same stable names site-templates.js's t()/heading() use, e.g.
  // { businessName: { color: "E11D48" }, "heading-services": { size: 40 } }.
  textStyles: {},
};

/* Matches the per-category default accent colors in site-templates.js
   (same category, same color) — without this, every brand-new project
   started life with SITE_DEFAULT's hardcoded green regardless of which
   template it was, so the catalog thumbnails looked varied while the
   actual builder/preview never did. */
const SITE_TEMPLATE_DEFAULT_COLOR = {
  "local-service": "#15803D", "process": "#15803D",
  "freelancer": "#DC2626", "portfolio": "#DC2626",
  "catalog": "#C2410C", "boutique": "#C2410C",
  "gallery": "#BE185D", "bold": "#BE185D", "studio": "#BE185D",
  "elegant": "#B8860B", "noir": "#B8860B",
  "bento": "#0E8C8C", "cinematic": "#4338CA", "brutal": "#FFC800",
  "neon": "#A855F7", "chaos": "#CCFF00", "luxury3d": "#B08D57", "playground": "#7C5CFF",
};
function freshSiteData(template) {
  const data = JSON.parse(JSON.stringify(SITE_DEFAULT));
  data.primaryColor = SITE_TEMPLATE_DEFAULT_COLOR[template] || SITE_DEFAULT.primaryColor;
  return data;
}

let siteState = { template: "local-service", data: freshSiteData("local-service") };
let lastVerifiedPurchase = null;
let previewPage = "index";

/* Older saved/loaded data (from before the multi-page feature existed)
   won't have a `pages` object — patch it in rather than special-casing
   every read site-wide. */
function ensurePagesShape(data) {
  if (!data.pages || typeof data.pages !== "object") data.pages = { about: false, contact: false };
  data.pages.about = !!data.pages.about;
  data.pages.contact = !!data.pages.contact;
  // heroImages didn't exist before the rotating hero-image gallery
  // feature — every project saved before that update needs this to
  // become a real array, not stay undefined, the first time it loads.
  if (!Array.isArray(data.heroImages)) data.heroImages = [];
  data.heroVideoBg = !!data.heroVideoBg;
  // Same backfill for data saved before the custom-headings feature
  // existed — an absent object here just means "use every template
  // default", never a crash reading data.headings.services below.
  if (!data.headings || typeof data.headings !== "object") data.headings = { services: "", about: "", contact: "" };
  if (!data.textStyles || typeof data.textStyles !== "object") data.textStyles = {};
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
  const features = t.features || [];
  return `
    <div class="flip-card" data-cat="${t.categorySlug}">
      <div class="flip-card-inner">
        <div class="flip-card-front card" data-cat="${t.categorySlug}">
          <div class="thumb"><img src="${t.thumb}" alt="${escapeHtmlS(t.label)}" loading="lazy"></div>
          <div class="body">
            <div class="card-meta">
              <span class="tag">${escapeHtmlS(t.category)}</span>
              <span class="price">199 ₪</span>
            </div>
            <h3>${escapeHtmlS(t.label)}</h3>
            <p style="font-size:13px; color:var(--grey); margin:0; flex:1;">${escapeHtmlS(t.desc)}</p>
          </div>
        </div>
        <div class="flip-card-back">
          <h4>${escapeHtmlS(t.label)} — מה כלול</h4>
          <ul>${features.map((f) => `<li>${escapeHtmlS(f)}</li>`).join("")}</ul>
          <a href="sites.html?template=${key}" class="card-cta">בחירה ועריכה</a>
        </div>
      </div>
    </div>`;
}

function renderTplCatalog() {
  const tabsEl = document.getElementById("site-tpl-tabs");
  const gridEl = document.getElementById("site-tpl-grid");
  const searchEl = document.getElementById("site-tpl-search");
  const smartBtn = document.getElementById("site-smart-filter-btn");
  const smartPanel = document.getElementById("site-smart-panel");
  const smartChecksEl = document.getElementById("site-smart-checks");
  const smartCountEl = document.getElementById("site-smart-count");
  tabsEl.innerHTML = SITE_CATEGORIES.map((c) => `<button class="tab" data-cat="${c.slug}">${escapeHtmlS(c.label)}</button>`).join("");
  let active = "all";
  let term = "";
  // Selected but not-yet-applied while the panel is open — kept separate
  // from `appliedTags` so opening the panel to look around, then closing
  // it without hitting "החלה", doesn't silently change the grid.
  let appliedTags = new Set();
  function apply() {
    tabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.cat === active));
    const q = term.trim().toLowerCase();
    const entries = Object.entries(SITE_TEMPLATES).filter(([, t]) =>
      (active === "all" || t.categorySlug === active) &&
      (!q || t.label.toLowerCase().includes(q)) &&
      [...appliedTags].every((tag) => (t.tags || []).includes(tag)));
    gridEl.innerHTML = entries.length
      ? entries.map(([key, t]) => siteTplCardHtml(key, t)).join("")
      : `<p class="tpl-search-empty">אין עיצובים שמתאימים לחיפוש${term.trim() ? ` "${escapeHtmlS(term.trim())}"` : ""}.</p>`;
  }
  tabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => { active = btn.dataset.cat; apply(); });
  });
  if (searchEl) searchEl.addEventListener("input", () => { term = searchEl.value; apply(); });

  if (smartBtn && smartPanel && smartChecksEl) {
    smartChecksEl.innerHTML = Object.entries(SITE_FILTER_TAGS).map(([tagKey, label]) =>
      `<label class="tpl-smart-check" data-tag="${tagKey}"><input type="checkbox" value="${tagKey}"> ${escapeHtmlS(label)}</label>`
    ).join("");
    function syncSmartUi() {
      smartChecksEl.querySelectorAll(".tpl-smart-check").forEach((lbl) => {
        const checked = appliedTags.has(lbl.dataset.tag);
        lbl.classList.toggle("checked", checked);
        lbl.querySelector("input").checked = checked;
      });
      smartBtn.classList.toggle("active", appliedTags.size > 0);
      if (appliedTags.size) { smartCountEl.textContent = appliedTags.size; smartCountEl.style.display = ""; }
      else smartCountEl.style.display = "none";
    }
    smartBtn.addEventListener("click", () => {
      const open = smartPanel.style.display === "none";
      smartPanel.style.display = open ? "" : "none";
      smartBtn.setAttribute("aria-expanded", String(open));
    });
    smartChecksEl.addEventListener("change", (e) => {
      const lbl = e.target.closest(".tpl-smart-check");
      if (!lbl) return;
      lbl.classList.toggle("checked", e.target.checked);
    });
    document.getElementById("site-smart-clear").addEventListener("click", () => {
      appliedTags = new Set();
      syncSmartUi();
      apply();
    });
    document.getElementById("site-smart-apply").addEventListener("click", () => {
      appliedTags = new Set(
        [...smartChecksEl.querySelectorAll('input[type="checkbox"]:checked')].map((i) => i.value)
      );
      syncSmartUi();
      apply();
      smartPanel.style.display = "none";
      smartBtn.setAttribute("aria-expanded", "false");
    });
    syncSmartUi();
  }

  apply();

  // Devices with no real hover (touch) get a tap-to-flip toggle instead —
  // :hover alone would leave the card's back stuck showing after a tap,
  // since there's no "unhover" gesture to flip it back.
  gridEl.addEventListener("click", (e) => {
    if (e.target.closest(".card-cta")) return;
    if (window.matchMedia("(hover: hover)").matches) return;
    const card = e.target.closest(".flip-card");
    if (card) card.classList.toggle("is-flipped");
  });
}

function renderCurrentTplInfo() {
  const t = SITE_TEMPLATES[siteState.template];
  document.getElementById("current-tpl-info").textContent = t ? t.label : "";
}

function showCatalog() {
  document.getElementById("tpl-catalog-section").style.display = "";
  document.getElementById("wizard-section").style.display = "none";
  document.getElementById("builder-top-banner").style.display = "";
  renderTplCatalog();
}

function showWizard() {
  document.getElementById("tpl-catalog-section").style.display = "none";
  document.getElementById("wizard-section").style.display = "";
  // The intro banner ("בניית אתר תדמית") only makes sense while browsing —
  // once actually editing, it just eats vertical space above the canvas.
  document.getElementById("builder-top-banner").style.display = "none";
  renderCurrentTplInfo();
  renderFormValues();
  renderSitePreview();
}

function renderFormValues() {
  const d = ensurePagesShape(siteState.data);
  document.getElementById("s-name").value = d.businessName;
  document.getElementById("h-heroTitle").value = (d.headings && d.headings.heroTitle) || "";
  document.getElementById("s-tagline").value = d.tagline;
  document.getElementById("s-about").value = d.about;
  document.getElementById("s-color").value = d.primaryColor;
  const fontSelect = document.getElementById("s-font");
  if (fontSelect && !fontSelect.options.length) {
    fontSelect.innerHTML = Object.keys(SITE_FONTS)
      .map((key) => `<option value="${key}">${SITE_FONTS[key].name}</option>`)
      .join("");
  }
  if (fontSelect) fontSelect.value = d.fontFamily || "heebo";
  document.getElementById("s-phone").value = d.phone;
  document.getElementById("s-whatsapp").value = d.whatsapp;
  document.getElementById("s-email").value = d.email;
  document.getElementById("s-address").value = d.address;
  document.getElementById("s-page-about").checked = d.pages.about;
  document.getElementById("s-page-contact").checked = d.pages.contact;
  document.getElementById("s-video").value = d.videoUrl || "";
  const videoBgCheckbox = document.getElementById("s-video-bg");
  if (videoBgCheckbox) videoBgCheckbox.checked = d.heroVideoBg;
  renderPhotoPreview();
  renderGalleryPreview();
  renderServicesList();
  renderHeadingsFields();
  syncTextStyleControls();
}

/* Populates the 3 suggestion dropdowns (services/about/contact) and the
   free-text inputs next to them — role-aware for "services", since a
   boutique's grid reads as products and a portfolio's reads as work even
   though they're all still the same d.services array under the hood. */
function renderHeadingsFields() {
  const d = ensurePagesShape(siteState.data);
  const role = TEMPLATE_SECTION_ROLE[siteState.template] || "services";
  const specs = [
    { key: "services", bank: role },
    { key: "about", bank: "about" },
    { key: "contact", bank: "contact" },
  ];
  specs.forEach((spec) => {
    const select = document.getElementById(`h-${spec.key}-pick`);
    const input = document.getElementById(`h-${spec.key}`);
    if (!select || !input) return;
    const options = HEADING_SUGGESTIONS[spec.bank] || [];
    select.innerHTML = `<option value="">בחירת ניסוח מוכן…</option>` +
      options.map((o) => `<option value="${escapeHtmlS(o)}">${escapeHtmlS(o)}</option>`).join("") +
      `<option value="__custom__">✏️ אחר — הקלידו למטה</option>`;
    select.value = "";
    input.value = d.headings[spec.key] || "";
  });
}

/* Per-text style controls (font/color/size/align) — mounted right next to
   the same field that already edits that text's CONTENT, instead of a
   separate click-to-edit popup on the canvas. Having content live in the
   sidebar and style live only on the canvas was the actual point of
   confusion (and the canvas popup's alignment buttons never even reflected
   an already-saved alignment on open, so they looked broken) — one field,
   one place, both content and style. Keyed by the same stable names
   site-templates.js's t()/heading() already use for d.textStyles. */
const TEXT_STYLE_FIELDS = [
  { key: "businessName", afterId: "s-name" },
  { key: "heading-heroTitle", afterId: "h-heroTitle" },
  { key: "tagline", afterId: "s-tagline" },
  { key: "aboutText", afterId: "s-about" },
  { key: "heading-services", afterId: "h-services" },
  { key: "heading-about", afterId: "h-about" },
  { key: "heading-contact", afterId: "h-contact" },
];

function textStyleControlHtml(key) {
  return `
    <button type="button" class="ts-toggle" data-style-toggle="${key}" title="עיצוב טקסט מותאם (גופן, צבע, גודל, יישור)">Aa</button>
    <div class="ts-row" data-style-row="${key}" hidden>
      <div class="ts-row-grid">
        <select data-style-font="${key}"></select>
        <input type="color" data-style-color="${key}" value="#000000">
        <input type="number" data-style-size="${key}" placeholder="גודל (px)" min="8" max="140">
      </div>
      <div class="ts-align" data-style-align-group="${key}">
        <button type="button" data-style-align="${key}" data-align-val="right">ימין</button>
        <button type="button" data-style-align="${key}" data-align-val="center">מרכז</button>
        <button type="button" data-style-align="${key}" data-align-val="left">שמאל</button>
      </div>
      <button type="button" class="ts-clear" data-style-clear="${key}">איפוס עיצוב מותאם</button>
    </div>`;
}

/* Idempotent — safe to call again (e.g. every showWizard()) without
   duplicating the controls it already mounted the first time. Toggle
   button goes right after the label (both inline by default, so they sit
   on the same line); the row itself goes right after the field's actual
   input/textarea, so opening it never pushes the input away from its
   own label. */
function mountTextStyleControls() {
  TEXT_STYLE_FIELDS.forEach(({ key, afterId }) => {
    const input = document.getElementById(afterId);
    if (!input) return;
    const field = input.closest(".field");
    if (!field || field.querySelector(`[data-style-toggle="${key}"]`)) return;
    const label = field.querySelector("label");
    const tmp = document.createElement("div");
    tmp.innerHTML = textStyleControlHtml(key);
    const toggleBtn = tmp.querySelector("[data-style-toggle]");
    const row = tmp.querySelector("[data-style-row]");
    if (label) label.insertAdjacentElement("afterend", toggleBtn);
    else field.insertBefore(toggleBtn, input);
    input.insertAdjacentElement("afterend", row);
    const fontSel = row.querySelector(`[data-style-font="${key}"]`);
    fontSel.innerHTML = `<option value="">(גופן ברירת המחדל)</option>` +
      Object.keys(SITE_FONTS).map((k) => `<option value="${k}">${SITE_FONTS[k].name}</option>`).join("");
  });
}

function syncTextStyleControls() {
  const styles = (siteState.data.textStyles) || {};
  TEXT_STYLE_FIELDS.forEach(({ key }) => {
    const s = styles[key] || {};
    const fontSel = document.querySelector(`[data-style-font="${key}"]`);
    const colorInp = document.querySelector(`[data-style-color="${key}"]`);
    const sizeInp = document.querySelector(`[data-style-size="${key}"]`);
    if (fontSel) fontSel.value = s.font || "";
    if (colorInp) colorInp.value = s.color ? `#${String(s.color).replace("#", "")}` : "#000000";
    if (sizeInp) sizeInp.value = s.size || "";
    document.querySelectorAll(`[data-style-align="${key}"]`).forEach((btn) => {
      btn.classList.toggle("ts-active", btn.dataset.alignVal === s.align);
    });
  });
}

function textStyleCss(s) {
  if (!s) return "";
  const parts = [];
  if (s.font) { const f = SITE_FONTS[s.font]; if (f) parts.push(`font-family:${f.stack}`); }
  if (s.color) parts.push(`color:#${String(s.color).replace("#", "")}`);
  if (s.size) parts.push(`font-size:${s.size}px`);
  if (s.align) parts.push(`text-align:${s.align}`);
  return parts.join(";");
}

/* Patches the already-loaded canvas directly instead of reloading it
   (srcdoc = ...) — confirmed live: a full reload on every single color
   drag/size nudge is jarring on its own, and specifically breaks the
   playground template (a reload tears down and re-inits its physics
   engine mid-interaction). Every element this can target already carries
   data-textkey (site-templates.js's t()/heading()), so this only ever
   needs to touch the handful of elements sharing that one key — safe
   even though the same key can render in more than one place (e.g. a
   business name in both the nav and a footer). */
function applyTextStyleLive(key) {
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  if (!doc) return;
  const css = textStyleCss((siteState.data.textStyles || {})[key]);
  doc.querySelectorAll(`[data-textkey="${key}"]`).forEach((el) => {
    if (css) el.setAttribute("style", css);
    else el.removeAttribute("style");
  });
}

function commitTextStyle(key) {
  const fontSel = document.querySelector(`[data-style-font="${key}"]`);
  const colorInp = document.querySelector(`[data-style-color="${key}"]`);
  const sizeInp = document.querySelector(`[data-style-size="${key}"]`);
  const activeAlignBtn = document.querySelector(`[data-style-align="${key}"].ts-active`);
  const s = {
    font: (fontSel && fontSel.value) || "",
    color: (colorInp && colorInp.value) ? colorInp.value.replace("#", "") : "",
    size: (sizeInp && sizeInp.value) || "",
    align: activeAlignBtn ? activeAlignBtn.dataset.alignVal : "",
  };
  siteState.data.textStyles = siteState.data.textStyles || {};
  const hasAny = s.font || s.color || s.size || s.align;
  if (hasAny) siteState.data.textStyles[key] = s;
  else delete siteState.data.textStyles[key];
  applyTextStyleLive(key);
  saveSiteState();
}

function wireTextStyleControls() {
  const root = document.getElementById("builder-sidebar");
  if (!root || root.dataset.tsWired) return;
  root.dataset.tsWired = "1";
  root.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-style-toggle]");
    if (toggleBtn) {
      const key = toggleBtn.dataset.styleToggle;
      const row = root.querySelector(`[data-style-row="${key}"]`);
      if (row) row.hidden = !row.hidden;
      return;
    }
    const alignBtn = e.target.closest("[data-style-align]");
    if (alignBtn) {
      const key = alignBtn.dataset.styleAlign;
      const wasActive = alignBtn.classList.contains("ts-active");
      root.querySelectorAll(`[data-style-align="${key}"]`).forEach((b) => b.classList.remove("ts-active"));
      if (!wasActive) alignBtn.classList.add("ts-active");
      commitTextStyle(key);
      return;
    }
    const clearBtn = e.target.closest("[data-style-clear]");
    if (clearBtn) {
      const key = clearBtn.dataset.styleClear;
      delete (siteState.data.textStyles || {})[key];
      syncTextStyleControls();
      applyTextStyleLive(key);
      saveSiteState();
    }
  });
  root.addEventListener("change", (e) => {
    if (e.target.matches("[data-style-font]")) commitTextStyle(e.target.dataset.styleFont);
  });
  root.addEventListener("input", (e) => {
    if (e.target.matches("[data-style-color]")) commitTextStyle(e.target.dataset.styleColor);
    if (e.target.matches("[data-style-size]")) commitTextStyle(e.target.dataset.styleSize);
  });
}

function renderPhotoPreview() {
  const el = document.getElementById("s-photo-preview");
  el.innerHTML = siteState.data.heroImage
    ? `<img src="${siteState.data.heroImage}" alt="">`
    : `<span class="site-photo-placeholder">🖼️</span>`;
}

const SITE_GALLERY_MAX = 5;
function renderGalleryPreview() {
  const el = document.getElementById("s-gallery-preview");
  const images = siteState.data.heroImages || [];
  el.innerHTML = images.map((src, i) =>
    `<div class="site-gallery-thumb" data-idx="${i}"><img src="${src}" alt=""><button type="button" data-action="remove-gallery-photo" aria-label="הסרה">✕</button></div>`
  ).join("");
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
      if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
    });
  });
}

/* ---------- Hierarchy panel (Builder v2) ----------
   Shows the page's structure as a real tree — bold section rows, the
   services block expandable to its individual items — matching what the
   customer sees on the canvas instead of a flat field list. For the two
   migrated templates (js/site-blocks.js) it's a live, reorderable/
   addable/removable block list; for every other template it's a plain
   navigation list (click a row to scroll the canvas there) derived from
   the same d.pages.about/contact toggles the section itself already
   respects — no DOM inspection needed, so there's no dependency on the
   iframe having finished loading yet. */
let hierExpanded = { services: true };

function scrollCanvasTo(selector) {
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  const el = doc && doc.querySelector(selector);
  if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
}

function hierRowHtml({ label, key, hasToggle, expanded, actions, childClass }) {
  return `
    <div class="hier-row${childClass ? ` ${childClass}` : ""}" data-hier-key="${key}">
      ${hasToggle ? `<span class="hier-icon hier-group-toggle${expanded ? " open" : ""}" data-hier-toggle="${key}">▸</span>` : `<span class="hier-icon">${childClass ? "–" : "•"}</span>`}
      <span class="hier-label">${escapeHtmlS(label)}</span>
      <span class="hier-actions">${actions || ""}</span>
    </div>`;
}

function renderHierarchyPanel() {
  const tree = document.getElementById("hier-tree");
  if (!tree) return;
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  const migrated = typeof isTemplateMigrated === "function" && isTemplateMigrated(template) && previewPage === "index";
  const addBlockRow = document.getElementById("hier-add-block-row");
  if (migrated) {
    renderMigratedHierarchy(tree, addBlockRow, template, d);
  } else {
    if (addBlockRow) addBlockRow.style.display = "none";
    renderReadOnlyHierarchy(tree, template, d);
  }
}

function renderMigratedHierarchy(tree, addBlockRow, template, d) {
  const defs = SITE_BLOCK_DEFS[template];
  const active = activeBlocksForPage(d, template, "index");
  const scrollTargets = {
    hero: template === "local-service" ? ".ls-hero" : ".pg-hero",
    services: template === "local-service" ? "#ls-hscroll" : "#pg-physics",
    about: '[data-textkey="heading-about"]',
    contact: '[data-textkey="heading-contact"]',
  };
  tree.innerHTML = active.map((type, i) => {
    const def = defs[type];
    const isServices = !!def.hasItems;
    const removable = type !== "hero";
    const actions = `
      <button type="button" class="hier-btn" data-hier-up="${type}" ${i === 0 ? "disabled" : ""} title="הזזה למעלה">▲</button>
      <button type="button" class="hier-btn" data-hier-down="${type}" ${i === active.length - 1 ? "disabled" : ""} title="הזזה למטה">▼</button>
      ${removable ? `<button type="button" class="hier-btn" data-hier-remove="${type}" title="הסרה">✕</button>` : ""}
    `;
    let html = hierRowHtml({ label: def.label, key: type, hasToggle: isServices, expanded: hierExpanded.services, actions });
    if (isServices) {
      const services = d.services || [];
      const childRows = services.map((s, idx) => `
        <div class="hier-row hier-child" data-hier-svc="${idx}">
          <span class="hier-icon">–</span>
          <span class="hier-label">${escapeHtmlS(s.name && s.name.trim() ? s.name : `שירות ${idx + 1}`)}</span>
          <span class="hier-actions">${services.length > 1 ? `<button type="button" class="hier-btn" data-hier-svc-remove="${idx}" title="הסרה">✕</button>` : ""}</span>
        </div>`).join("");
      html += `<div class="hier-children${hierExpanded.services ? "" : " collapsed"}" data-hier-children="services">
        ${childRows}
        <div class="hier-add-item-row"><button type="button" class="hier-add-item-btn" id="hier-add-service-btn">+ הוספת שירות</button></div>
      </div>`;
    }
    return html;
  }).join("");

  tree.querySelectorAll(".hier-row[data-hier-key]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".hier-btn") || e.target.closest(".hier-group-toggle")) return;
      const type = row.dataset.hierKey;
      if (scrollTargets[type]) scrollCanvasTo(scrollTargets[type]);
    });
  });
  tree.querySelectorAll("[data-hier-toggle]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      hierExpanded[el.dataset.hierToggle] = !hierExpanded[el.dataset.hierToggle];
      renderHierarchyPanel();
    });
  });
  tree.querySelectorAll("[data-hier-up]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveBlockUp(d, template, "index", btn.dataset.hierUp);
      renderSitePreview();
    });
  });
  tree.querySelectorAll("[data-hier-down]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveBlockDown(d, template, "index", btn.dataset.hierDown);
      renderSitePreview();
    });
  });
  tree.querySelectorAll("[data-hier-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const order = ensureBlockOrder(d, template, "index");
      const idx = order.indexOf(btn.dataset.hierRemove);
      if (idx !== -1) order.splice(idx, 1);
      renderSitePreview();
    });
  });
  tree.querySelectorAll("[data-hier-svc]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".hier-btn")) return;
      scrollCanvasTo(`[data-svc-idx="${row.dataset.hierSvc}"]`);
    });
  });
  tree.querySelectorAll("[data-hier-svc-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); removeServiceItem(Number(btn.dataset.hierSvcRemove)); });
  });
  const addServiceBtn = document.getElementById("hier-add-service-btn");
  if (addServiceBtn) addServiceBtn.addEventListener("click", (e) => { e.stopPropagation(); addServiceItem(); });

  // Only offers block types this template defines that aren't already
  // showing — "hero" is never offered back (every migrated template
  // always has one; there's nothing to re-add).
  const missing = Object.keys(defs).filter((t) => active.indexOf(t) === -1 && t !== "hero");
  if (addBlockRow) {
    if (missing.length) {
      addBlockRow.style.display = "";
      const btn = addBlockRow.querySelector("#hier-add-block-btn");
      btn.textContent = `+ הוספת "${defs[missing[0]].label}"`;
      btn.onclick = () => {
        ensureBlockOrder(d, template, "index").push(missing[0]);
        renderSitePreview();
      };
    } else {
      addBlockRow.style.display = "none";
    }
  }
}

/* Not every template gives its services/about/contact block a distinct
   heading element (some are headingless paragraphs, tag lists, or a
   single mixed-content grid) — relying only on
   [data-textkey="heading-X"] left several templates' hierarchy buttons
   scrolling nowhere (confirmed live). Per-template overrides here point
   at a real, stable container instead; "false" means the section
   genuinely doesn't exist inline for that template (its row is omitted
   rather than left dead). Audited against every template's actual
   rendered output, not guessed. */
const READONLY_HIER_OVERRIDES = {
  freelancer: { services: ".fr-tags" },
  boutique: { services: "#bq-grid", contact: false },
  bento: { services: ".bt-grid", about: ".bt-grid", contact: ".bt-grid" },
  chaos: { services: "#oc-hscroll" },
  catalog: { contact: false },
  bold: { services: "#nb-grid", contact: ".nb-contact" },
};

function renderReadOnlyHierarchy(tree, template, d) {
  const role = TEMPLATE_SECTION_ROLE[template] || "services";
  const roleLabel = { services: "שירותים / מוצרים", products: "מוצרים", work: "עבודות" }[role] || "שירותים / מוצרים";
  const overrides = READONLY_HIER_OVERRIDES[template] || {};
  const defaultSelectors = {
    services: '[data-textkey="heading-services"]',
    about: '[data-textkey="heading-about"], [data-textkey="aboutText"]',
    contact: '[data-textkey="heading-contact"]',
  };
  function selectorFor(key) {
    const o = overrides[key];
    if (o === false) return false;
    return o || defaultSelectors[key];
  }
  const nodes = [
    { key: "heroTitle", label: "Hero", selector: '[data-textkey="heading-heroTitle"]' },
    { key: "services", label: roleLabel, selector: selectorFor("services") },
  ];
  if (!d.pages || !d.pages.about) {
    const sel = selectorFor("about");
    if (sel) nodes.push({ key: "about", label: "אודות", selector: sel });
  }
  if (!d.pages || !d.pages.contact) {
    const sel = selectorFor("contact");
    if (sel) nodes.push({ key: "contact", label: "צור קשר", selector: sel });
  }
  tree.innerHTML = nodes.map((n) => hierRowHtml({ label: n.label, key: n.key })).join("");
  tree.querySelectorAll(".hier-row[data-hier-key]").forEach((row) => {
    const node = nodes.find((n) => n.key === row.dataset.hierKey);
    if (node) row.addEventListener("click", () => scrollCanvasTo(node.selector));
  });
}

function saveSiteState() {
  try {
    localStorage.setItem(siteDataKey(siteState.template), JSON.stringify(siteState));
    localStorage.setItem(SITE_LAST_TEMPLATE_KEY, siteState.template);
  } catch (err) { /* storage unavailable — not fatal, just won't persist */ }
}

/* Pass a template to load THAT template's own cache only (never falls
   back to a different one — a blank result here means a genuinely fresh
   project). Pass nothing to resume the most recently active template,
   whichever one that was. */
function loadSiteState(template) {
  try {
    const key = template ? siteDataKey(template) : siteDataKey(localStorage.getItem(SITE_LAST_TEMPLATE_KEY) || "");
    const raw = localStorage.getItem(key);
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
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
}

/* Every keystroke in a text field used to call renderSitePreview()
   directly — harmless for a plain template (the iframe just reloads a new
   document instantly), but confirmed live to break the playground
   template specifically: setting .srcdoc is a hard navigation that tears
   down the previous document, so typing a few characters quickly fired
   off several overlapping Matter.js CDN loads and physics inits in a row,
   leaving the services section empty. Debouncing text-input-driven
   re-renders (not click/change-driven ones, which already fire once per
   action) fixes that at the source without templates needing to know
   about it. */
let sitePreviewRenderTimer = null;
function scheduleSitePreviewRender() {
  clearTimeout(sitePreviewRenderTimer);
  sitePreviewRenderTimer = setTimeout(renderSitePreview, 500);
}

function wireForm() {
  const map = {
    "s-name": "businessName", "s-tagline": "tagline", "s-about": "about",
    "s-phone": "phone", "s-whatsapp": "whatsapp", "s-email": "email", "s-address": "address",
  };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      siteState.data[key] = e.target.value;
      scheduleSitePreviewRender();
    });
  });
  document.getElementById("s-color").addEventListener("input", (e) => {
    siteState.data.primaryColor = e.target.value;
    scheduleSitePreviewRender();
  });

  document.getElementById("s-font").addEventListener("change", (e) => {
    siteState.data.fontFamily = e.target.value;
    renderSitePreview();
  });

  document.getElementById("h-heroTitle").addEventListener("input", (e) => {
    siteState.data.headings.heroTitle = e.target.value;
    scheduleSitePreviewRender();
  });

  ["services", "about", "contact"].forEach((key) => {
    const select = document.getElementById(`h-${key}-pick`);
    const input = document.getElementById(`h-${key}`);
    if (!select || !input) return;
    select.addEventListener("change", () => {
      if (!select.value || select.value === "__custom__") { input.focus(); return; }
      input.value = select.value;
      siteState.data.headings[key] = select.value;
      renderSitePreview();
    });
    input.addEventListener("input", () => {
      siteState.data.headings[key] = input.value;
      scheduleSitePreviewRender();
    });
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

  document.getElementById("s-gallery").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (!siteState.data.heroImages) siteState.data.heroImages = [];
    const roomLeft = SITE_GALLERY_MAX - siteState.data.heroImages.length;
    if (roomLeft <= 0) {
      alert(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — הסירו אחת כדי להוסיף חדשה.`);
      e.target.value = "";
      return;
    }
    const toAdd = files.slice(0, roomLeft);
    if (files.length > toAdd.length) {
      alert(`אפשר עד ${SITE_GALLERY_MAX} תמונות בגלריה — נוספו רק ${toAdd.length} מתוך ${files.length} שבחרתם.`);
    }
    let remaining = toAdd.length;
    toAdd.forEach((file) => {
      if (file.size > 6 * 1024 * 1024) {
        alert(`"${file.name}" גדולה מדי — בחרו קובץ עד 6MB.`);
        remaining -= 1;
        if (remaining === 0) { renderGalleryPreview(); renderSitePreview(); }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        siteState.data.heroImages.push(reader.result);
        remaining -= 1;
        if (remaining === 0) { renderGalleryPreview(); renderSitePreview(); }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  });
  document.getElementById("s-gallery-preview").addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="remove-gallery-photo"]');
    if (!btn) return;
    const idx = parseInt(btn.closest("[data-idx]").dataset.idx, 10);
    siteState.data.heroImages.splice(idx, 1);
    renderGalleryPreview();
    renderSitePreview();
  });

  document.getElementById("s-video").addEventListener("input", (e) => {
    siteState.data.videoUrl = e.target.value;
    scheduleSitePreviewRender();
  });
  const videoBgCheckbox = document.getElementById("s-video-bg");
  if (videoBgCheckbox) {
    videoBgCheckbox.addEventListener("change", (e) => {
      siteState.data.heroVideoBg = e.target.checked;
      renderSitePreview();
    });
  }

  document.getElementById("s-page-about").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.about = e.target.checked;
    renderSitePreview();
  });
  document.getElementById("s-page-contact").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.contact = e.target.checked;
    renderSitePreview();
  });

  document.getElementById("add-service").addEventListener("click", addServiceItem);
  document.getElementById("services-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.service;
    const key = e.target.dataset.key;
    if (idx === undefined) return;
    siteState.data.services[idx][key] = e.target.value;
    scheduleSitePreviewRender();
  });
  document.getElementById("services-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.serviceRemove;
    if (idx === undefined) return;
    removeServiceItem(Number(idx));
  });
}

/* Shared by the sidebar's "+ הוספת שירות"/"הסרה" controls and the new
   hierarchy panel's own add/remove buttons on the services block's
   children — one place that actually mutates siteState.data.services,
   so both surfaces always agree with each other and with the preview. */
function addServiceItem() {
  siteState.data.services.push({ name: "", desc: "", price: "" });
  renderServicesList();
  renderSitePreview();
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
}
function removeServiceItem(idx) {
  if (siteState.data.services.length <= 1) return;
  siteState.data.services.splice(idx, 1);
  renderServicesList();
  renderSitePreview();
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
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
פשוט מתחברים לחשבון שלכם בעמוד בניית האתר — הפרטים נשמרים שם
אוטומטית וחוזרים בדיוק כמו שהיו. site-data.json נשאר כאן רק כגיבוי
גולמי לנתונים, למי שרוצה.

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

/* One click to a live URL, via the publish-site Edge Function (see
   supabase/functions/publish-site) — no ZIP, no dragging files to
   Netlify Drop by hand. The download button above stays too: the
   customer still gets to keep their own copy of the files either way. */
async function publishSite() {
  const btn = document.getElementById("publish-site-btn");
  const note = document.getElementById("publish-note");
  if (!siteCurrentUserId) {
    window.location.href = "account.html?redirect=" + encodeURIComponent(location.pathname + location.search);
    return;
  }
  // A blank business name means the placeholder text ("שם העסק שלכם" etc.)
  // is literally all a real visitor would see — worth a real business
  // going live on a public URL, not something to let happen by accident.
  if (!siteState.data.businessName || !siteState.data.businessName.trim()) {
    note.textContent = "לפני הפרסום, צריך למלא לפחות את שם העסק.";
    document.getElementById("s-name").focus();
    return;
  }
  // A real business name alone still leaves every OTHER field showing its
  // raw instructional placeholder ("תארו כאן בקצרה...", "פרטו כאן טלפון,
  // מייל וכתובת" etc.) straight to a real visitor — worth a clear,
  // skippable warning rather than silently publishing half-filled
  // instructions as if they were real content.
  const d = siteState.data;
  const missing = [];
  if (!d.tagline || !d.tagline.trim()) missing.push("תיאור קצר");
  if (!d.about || !d.about.trim()) missing.push("קטע \"עלינו\"");
  if (!(d.services || []).some((s) => s.name && s.name.trim())) missing.push("שירותים/מוצרים");
  if (!d.phone && !d.whatsapp && !d.email && !d.address) missing.push("פרטי יצירת קשר");
  if (missing.length) {
    const proceed = confirm(
      "עדיין חסר תוכן אמיתי ב: " + missing.join(", ") + ".\n" +
      "בלי זה, מבקרים באתר יראו את הטקסטים ההנחיה שנועדו רק לכם, לא תוכן אמיתי.\n\n" +
      "לפרסם בכל זאת?"
    );
    if (!proceed) return;
  }
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "מפרסמים...";
  note.textContent = "";
  try {
    // Publish needs a real project id to attach the deploy to. Used to
    // just tell the visitor "saving first, try again" and stop there —
    // but nothing ever actually triggered that save, so without a
    // separate manual click on the top "שמירה" button first, every
    // retry hit this same message forever.
    if (!siteProjectId) await saveSiteNow();
    if (!siteProjectId) {
      note.textContent = "לא הצלחנו לשמור את האתר. נסו שוב בעוד רגע.";
      return;
    }
    const pages = {};
    enabledSitePages().forEach((page) => { pages[page] = currentSiteHtml(page); });
    const { data, error } = await supabaseClient.functions.invoke("publish-site", {
      body: { siteProjectId, userId: siteCurrentUserId, pages },
    });
    if (error || !data) {
      note.textContent = "הפרסום נכשל. נסו שוב בעוד רגע.";
      return;
    }
    if (data.reason === "limit_reached") {
      sitePublishCount = data.publishCount;
      renderPublishRemaining();
      note.innerHTML = `הגעתם למספר המרבי של עדכוני פרסום חינמיים לאתר הזה. אפשר עדיין ללחוץ על "הורדת קובצי האתר (ZIP)" למטה ולהעלות אותם בעצמכם לכל שירות אחסון — זה לא מוגבל. רוצים להמשיך לפרסם דרכנו? <a href="mailto:digital.dz.studio@gmail.com?subject=${encodeURIComponent("בקשה להמשך פרסום — בניית אתר")}" style="color:inherit; text-decoration:underline;">כתבו לנו</a>.`;
      return;
    }
    if (!data.success) {
      note.textContent = "הפרסום נכשל. נסו שוב בעוד רגע.";
      return;
    }
    if (typeof data.publishCount === "number") { sitePublishCount = data.publishCount; renderPublishRemaining(); }
    note.innerHTML = `
      <div style="margin-bottom:4px;">האתר חי!</div>
      <a href="${data.url}" target="_blank" rel="noopener" style="display:block; font-size:16px; font-weight:700; color:#2B6CB0; word-break:break-all;">${data.url}</a>
      ${data.claimUrl ? `<a href="${data.claimUrl}" target="_blank" rel="noopener" class="btn btn-teal" style="width:100%; box-sizing:border-box; text-align:center; display:block; margin-top:12px;">תפיסת האתר בחשבון Netlify שלכם (חינם)</a>
      <p style="font-size:12px; color:var(--grey); margin:8px 0 0;">חשוב: בלי הצעד הזה האתר יישאר תחת החשבון שלנו — לוחצים כדי שהאתר יהיה שלכם לצמיתות.</p>` : ""}
      <button type="button" id="publish-domain-guide-btn" class="btn-mini" style="width:100%; margin-top:10px;">🌐 רוצים גם דומיין משלכם? לחצו כאן</button>
    `;
    document.getElementById("publish-domain-guide-btn").addEventListener("click", openDomainGuide);
  } catch (err) {
    note.textContent = "הפרסום נכשל. נסו שוב בעוד רגע.";
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* The purchase panel used to be visible from the very first moment someone
   opened the wizard — before they'd typed a word of their own content. The
   "finish gate" (a single explicit button + a note explaining exactly what
   locks and what stays free forever) exists so committing to buy is a
   deliberate step, not something that greets you on arrival. Once a
   template is actually unlocked there's nothing left to gate — always show
   unlock-done for it, on this visit and every future one. */
let financeGateOpened = false;

function refreshUnlockUI() {
  const unlocked = localStorage.getItem(currentUnlockKey()) === "1";
  const gate = document.getElementById("finish-gate");
  const pending = document.getElementById("unlock-pending");
  const done = document.getElementById("unlock-done");
  if (unlocked) {
    gate.style.display = "none";
    pending.style.display = "none";
    done.style.display = "";
    renderPublishRemaining();
    return;
  }
  done.style.display = "none";
  gate.style.display = financeGateOpened ? "none" : "";
  pending.style.display = financeGateOpened ? "" : "none";
}

/* Verification itself happens server-side, in the redeem-license Edge
   Function — Gumroad's own verify endpoint is meant to be called
   repeatedly and never consumes a key, so a purely client-side check (the
   old approach) couldn't stop the same purchased key from being typed
   into a second, unrelated account and unlocking a second site for free.
   The Edge Function atomically claims the key in a table only it can
   write to, so a key can finalize exactly one (account, template) pair,
   full stop — not just "not reused by this same signed-in account",
   which is all a client-side check could ever guarantee. */
let siteVerifying = false;
async function verifySiteLicense() {
  // Without this guard, a double-click (plausible now that the retry
  // logic can take 3-4.5s round-trip) fires two overlapping requests, and
  // whichever response resolves LAST overwrites the note — including a
  // stale "invalid" landing on top of an already-succeeded verification.
  if (siteVerifying) return;
  const input = document.getElementById("license-input");
  const note = document.getElementById("license-note");
  const key = input.value.trim();
  if (!key) { note.textContent = "יש להזין קוד רישוי."; note.className = "unlock-note err"; return; }
  if (!siteCurrentUserId) { note.textContent = "יש להתחבר לחשבון כדי לפתוח את ההורדה."; note.className = "unlock-note err"; return; }
  siteVerifying = true;
  const verifyBtn = document.getElementById("verify-btn");
  if (verifyBtn) verifyBtn.disabled = true;
  note.textContent = "בודקים...";
  note.className = "unlock-note";
  try {
    const { data, error } = await supabaseClient.functions.invoke("redeem-license", {
      body: {
        licenseKey: key,
        productId: SITE_GUMROAD_CONFIG.productId,
        userId: siteCurrentUserId,
        template: siteState.template,
      },
    });
    if (error || !data) {
      note.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
      note.className = "unlock-note err";
      return;
    }
    if (!data.success) {
      // A real, live escape hatch for a genuinely stuck paying customer —
      // not just "try again" with nowhere left to go. Prefills the email
      // with exactly the key they tried, so following up doesn't start
      // from scratch.
      const supportMailto = `mailto:digital.dz.studio@gmail.com?subject=${encodeURIComponent("בעיה בקוד רישוי — בניית אתר")}&body=${encodeURIComponent("הקוד שהזנתי: " + key)}`;
      const supportLine = `<br>עדיין תקועים? <a href="${supportMailto}" style="color:inherit; text-decoration:underline;">כתבו לנו ונפתור את זה ידנית</a>.`;
      const invalidMsg = "קוד לא תקין. בדקו את המייל שקיבלתם ב-Gumroad ונסו שוב." + (data.gumroadMessage ? ` (Gumroad: ${data.gumroadMessage})` : "") + supportLine;
      note.innerHTML = data.reason === "redeemed-elsewhere" || data.reason === "different-template"
        ? "קוד הרישוי הזה כבר שימש לפתיחת אתר אחר. לתבנית נוספת נדרשת רכישה נפרדת." + supportLine
        : invalidMsg;
      note.className = "unlock-note err";
      return;
    }
    // Kept only for the receipt email at finalize time — Gumroad's own
    // record of what the buyer actually paid, not something we ask them
    // to re-enter or trust the client for.
    lastVerifiedPurchase = data.purchase || null;
    localStorage.setItem(currentUnlockKey(), "1");
    note.textContent = "";
    refreshUnlockUI();
    // "Thank you, a receipt is on its way" only makes sense the moment a
    // purchase actually just happened — every later visit to this same
    // unlocked project shows the plain "open for editing" heading instead
    // (set in the page's own HTML), not a purchase message that's stale
    // the very next time someone opens this page.
    const heading = document.getElementById("unlock-done-heading");
    if (heading) {
      heading.textContent = "תודה שרכשתם ב-DeskKit! קבלה על הרכישה נשלחת אליכם למייל מ-Gumroad.";
    }
  } catch (err) {
    note.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
    note.className = "unlock-note err";
  } finally {
    siteVerifying = false;
    if (verifyBtn) verifyBtn.disabled = false;
  }
}

// sites.html doesn't load js/require-auth.js (its auth gating is
// conditional — only entering the wizard needs an account, browsing the
// catalog doesn't), so it has no window.revealGatedPage of its own. This
// page defines it directly instead: site-cloud-save.js calls it only
// once it has finished correcting siteState for the real signed-in
// account, which is what makes it safe to finally show the page.
window.revealGatedPage = function () {
  const overlay = document.getElementById("auth-gate-overlay");
  if (overlay) overlay.remove();
};

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const urlTemplate = params.get("template");
  const forceBrowse = params.get("browse") === "1";
  const isFullPreview = params.get("fullpreview") === "1";

  const saved = loadSiteState(urlTemplate || null);
  if (saved) {
    siteState = saved;
  } else if (urlTemplate && SITE_TEMPLATES[urlTemplate]) {
    // A specific, valid template with no cache of its own yet — a
    // genuinely fresh project. Never inherit whatever a DIFFERENT
    // template's cache happens to hold.
    siteState = { template: urlTemplate, data: freshSiteData(urlTemplate) };
  }
  ensurePagesShape(siteState.data);
  const hasSavedContent = !!(saved && (saved.data.businessName || (saved.data.services || []).some((s) => s.name)));

  const buyLink = document.getElementById("buy-link");
  buyLink.href = SITE_GUMROAD_CONFIG.checkoutUrl;
  wireBuyLinkOnce(buyLink);
  wireForm();
  mountTextStyleControls();
  wireTextStyleControls();
  refreshUnlockUI();

  // Same discovery flow as the CV catalog: browse a real catalog of
  // templates first, land straight in the wizard only when arriving via
  // a template link or continuing a session that already has content.
  // Browsing itself never needs an account — same as products.html ->
  // builder.html — only entering the wizard (an actual template chosen,
  // ready to customize) does, so the auth check sits right here rather
  // than gating the whole page.
  const wantsWizard = (urlTemplate && SITE_TEMPLATES[urlTemplate]) || (!forceBrowse && hasSavedContent);
  if (wantsWizard) {
    const overlay = document.getElementById("auth-gate-overlay");
    if (overlay) overlay.style.display = "flex";
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user) {
        if (urlTemplate && SITE_TEMPLATES[urlTemplate]) siteState.template = urlTemplate;
        showWizard();
        // Confirmed live: this check and site-cloud-save.js's own account
        // check are two independent async calls with no guaranteed order.
        // Removing the overlay right here, the moment THIS faster one
        // resolves, could reveal the page before site-cloud-save.js has
        // corrected siteState away from whatever the synchronous pre-auth
        // loadSiteState() peek guessed (a DIFFERENT account's cached
        // draft, on a shared/reused browser) — briefly showing someone
        // else's content. window.revealGatedPage() (called by
        // site-cloud-save.js only AFTER that correction) is now the sole
        // place responsible for removing the overlay.
      } else {
        const here = location.pathname.split("/").pop() + location.search;
        location.href = "account.html?redirect=" + encodeURIComponent(here);
      }
    });
  } else {
    showCatalog();
  }

  if (isFullPreview) {
    document.body.classList.add("preview-focus");
    const closeBar = document.createElement("div");
    closeBar.id = "close-preview-bar";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.id = "close-preview-btn";
    closeBtn.textContent = "✕ סגירת תצוגה";
    // Opened via window.open() from the wizard tab, so this tab is safe to
    // self-close; if a visitor opened the URL directly (no opener), closing
    // would be silently refused by the browser — falling back to the
    // catalog keeps the button useful either way.
    closeBtn.addEventListener("click", () => {
      window.close();
      setTimeout(() => { location.href = "sites.html?browse=1"; }, 300);
    });
    closeBar.appendChild(closeBtn);
    // Inserted as the very first element in the page (not a fixed corner
    // badge) so it sits in normal document flow, above the iframe, and can
    // never overlap the customer's own site header underneath it.
    document.body.insertBefore(closeBar, document.body.firstChild);
  }

  document.getElementById("full-preview-btn").addEventListener("click", () => {
    const url = new URL(location.href);
    url.searchParams.set("template", siteState.template);
    url.searchParams.set("fullpreview", "1");
    window.open(url.toString(), "_blank", "noopener");
  });

  document.getElementById("finish-btn").addEventListener("click", async () => {
    financeGateOpened = true;
    refreshUnlockUI();
    // Whatever's been typed so far — even just a business name, even
    // nothing at all — gets saved right here, the moment someone commits
    // to buying. Without this, the project only had a real row (and a
    // real id for a license to attach to) once someone separately clicked
    // "שמירה" or finished the whole purchase — so verifying a license
    // right after landing on this screen could succeed against Gumroad
    // and still have nothing real to attach to yet.
    if (typeof saveSiteNow === "function") await saveSiteNow();
  });

  document.getElementById("verify-btn").addEventListener("click", verifySiteLicense);
  document.getElementById("publish-site-btn").addEventListener("click", publishSite);
  document.getElementById("download-zip-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "מכינים את הקבצים...";
    try {
      if (typeof finalizeSiteProject === "function") await finalizeSiteProject();
      downloadSiteZip();
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
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
    if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
  });
});
