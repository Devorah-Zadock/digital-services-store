/* ===========================================================
   Site editor — the on-canvas editing surface of the website builder
   (sites.html). Reached for every migrated template (BSHELL_SUPPORTED_
   TEMPLATES, see site-builder.js's DOMContentLoaded handler); ?shell=0
   stays as the escape hatch back to the old sidebar form.

   The site itself is the editor: hover shows what can be edited, a click
   selects it (outline + a small floating toolbar next to it), texts are
   edited right where they are, sections get their own frame + toolbar
   with "+" buttons between them, and ONE optional side panel (a bottom
   sheet on a phone) holds whatever doesn't fit in a toolbar. The panels,
   the add-section gallery, the dock and dialogs live in
   js/builder-shell-panels.js.

   Same data model as before, nothing new to migrate: siteState.data is
   the one source of truth (BSHELL_TEXT_CONTENT_MAP / d.textStyles /
   d.services / d.phone… for the template's own sections; d.sections /
   d.blockOrder through the section library's functions for added
   sections — every one of those calls is guarded, so the editor works,
   with "add section" hidden, when js/site-sections.js isn't loaded).
   Rendering is always the template's own render (currentSiteHtml), so
   what the canvas shows is what gets published; everything the editor
   adds to the canvas (data-bshell-top tags, its CSS, contenteditable)
   lives only in the canvas iframe, never in currentSiteHtml().
   =========================================================== */

const BSHELL_SUPPORTED_TEMPLATES = SITE_MIGRATED_TEMPLATES;

// UI language helpers — js/i18n.js's dkL() and js/i18n-sites.js's
// dkSitesLabel() when loaded, plain Hebrew otherwise.
function bsL(he, en) { return typeof dkL === "function" ? dkL(he, en) : he; }
function bsLabel(he) { return typeof dkSitesLabel === "function" ? dkSitesLabel(he) : he; }
function bsxEsc(s) { return escapeHtmlS(s); }
function bsxCss(s) { return (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, "\\$&"); }

/* ---------- Section anchors (which top-level element is which block) ----------
   Raw CSS-selector overrides for the (template,type) pairs whose block has
   no heading(d, type, ...) element to anchor on — everything else is found
   through the shared heading()/aboutText() textkeys. */
const BSHELL_ANCHOR_RAW_OVERRIDES = {
  catalog: { services: "#cat-grid" },
  boutique: { services: "#bq-grid" },
  chaos: { services: "#oc-hscroll" },
  bento: { grid: "#bt-grid" },
  freelancer: { aboutTags: "#fr-services-wrap" },
};
function bshellAnchorCandidates(template, type) {
  if (type === "hero") return ["heading-heroTitle"];
  const raw = (BSHELL_ANCHOR_RAW_OVERRIDES[template] || {})[type];
  const candidates = [];
  if (raw) candidates.push(raw);
  candidates.push("heading-" + type);
  if (type === "about" || raw) candidates.push("aboutText");
  return candidates;
}
function bshellQueryAnchor(root, candidates) {
  for (const c of candidates) {
    const sel = c.charAt(0) === "#" ? c : `[data-textkey="${c}"]`;
    if (root.matches && root.matches(sel)) return root;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}
function bshellFindAnchorEl(doc, template, type) {
  return bshellQueryAnchor(doc, bshellAnchorCandidates(template, type));
}
function bshellFindSectionRoot(doc, type) {
  if (!doc || !doc.body) return null;
  const anchorEl = bshellFindAnchorEl(doc, siteState.template, type);
  return anchorEl ? anchorEl.closest("body > *") : null;
}

/* Content getter/setter per built-in text field — the same d.* fields the
   old sidebar builder writes. */
const BSHELL_TEXT_CONTENT_MAP = {
  businessName: { label: bsL("שם העסק", "Business name"), get: (d) => d.businessName || "", set: (d, v) => { d.businessName = v; } },
  "heading-heroTitle": { label: bsL("כותרת ראשית", "Main heading"), heading: true, get: (d) => (d.headings && d.headings.heroTitle) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.heroTitle = v; } },
  tagline: { label: bsL("שורת תיאור", "Tagline"), get: (d) => d.tagline || "", set: (d, v) => { d.tagline = v; } },
  aboutText: { label: bsL("טקסט אודות", "About text"), multiline: true, get: (d) => d.about || "", set: (d, v) => { d.about = v; } },
  "heading-services": { label: bsL("כותרת השירותים", "Services heading"), heading: true, get: (d) => (d.headings && d.headings.services) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.services = v; } },
  "heading-about": { label: bsL("כותרת האודות", "About heading"), heading: true, get: (d) => (d.headings && d.headings.about) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.about = v; } },
  "heading-contact": { label: bsL("כותרת יצירת הקשר", "Contact heading"), heading: true, get: (d) => (d.headings && d.headings.contact) || "", set: (d, v) => { d.headings = d.headings || {}; d.headings.contact = v; } },
};
const BSHELL_STYLE_SIZES = {
  hero: [28, 32, 36, 42, 48, 56, 64, 72],
  heading: [20, 24, 28, 32, 36, 42, 48],
  name: [14, 16, 18, 20, 22, 24, 28, 32],
  body: [12, 13, 14, 15, 16, 17, 18, 20, 22],
};
const BSHELL_ITEM_WORD = {
  services: [bsL("שירות", "Service"), bsL("השירותים", "services")],
  products: [bsL("מוצר", "Product"), bsL("המוצרים", "products")],
  work: [bsL("עבודה", "Project"), bsL("העבודות", "projects")],
};
function bshellItemWord() { return BSHELL_ITEM_WORD[TEMPLATE_SECTION_ROLE[siteState.template]] || BSHELL_ITEM_WORD.services; }

/* hiddenBlocks (additive) gates the blocks that have no active() of their
   own (hero, services, ...) the same way def.active() gates about/contact
   via d.pages. _bshellHiddenGate marks which types this touched, so hiding
   writes the right flag. (When the section library is loaded it defines
   its own siteBlockSetVisible; this patch only fills in what's missing.) */
(function bshellPatchBlockVisibility() {
  (SITE_MIGRATED_TEMPLATES || []).forEach((template) => {
    const defs = SITE_BLOCK_DEFS[template];
    if (!defs) return;
    Object.keys(defs).forEach((type) => {
      if (!defs[type].active) {
        defs[type]._bshellHiddenGate = true;
        defs[type].active = (d) => !(d.hiddenBlocks && d.hiddenBlocks[type]);
      }
    });
  });
})();
function bshellSetBuiltinVisible(type, visible) {
  const d = siteState.data;
  if (typeof siteBlockSetVisible === "function") { siteBlockSetVisible(d, siteState.template, type, visible); return; }
  const def = (SITE_BLOCK_DEFS[siteState.template] || {})[type];
  if (!def) return;
  if (def._bshellHiddenGate) {
    d.hiddenBlocks = d.hiddenBlocks || {};
    if (visible) delete d.hiddenBlocks[type]; else d.hiddenBlocks[type] = true;
  } else {
    // about/contact: the same mechanism as the "separate page" switches.
    ensurePagesShape(d).pages[type] = !visible;
  }
}
function bshellBuiltinVisible(type) {
  const def = (SITE_BLOCK_DEFS[siteState.template] || {})[type];
  return !!def && (!def.active || !!def.active(siteState.data));
}

/* ---------- Icons (inline SVG, stroke = currentColor) ---------- */
const BSX_SVG = (p, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra || ""}>${p}</svg>`;
const BSX_ICONS = {
  menu: BSX_SVG('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  back: BSX_SVG('<path d="M9 6l6 6-6 6"/>'),
  undo: BSX_SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: BSX_SVG('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  desktop: BSX_SVG('<rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>'),
  tablet: BSX_SVG('<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="M11 18.5h2"/>'),
  mobile: BSX_SVG('<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>'),
  layers: BSX_SVG('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
  eye: BSX_SVG('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: BSX_SVG('<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  help: BSX_SVG('<circle cx="12" cy="12" r="9.5"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.7"/><path d="M12 17h.01"/>'),
  more: BSX_SVG('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  save: BSX_SVG('<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-2z"/><path d="M8 3v5h7V3M8 21v-6h8v6"/>'),
  plus: BSX_SVG('<path d="M12 5v14M5 12h14"/>'),
  grip: BSX_SVG('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>'),
  up: BSX_SVG('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  down: BSX_SVG('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  palette: BSX_SVG('<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15.5" cy="7.5" r="1.2"/>'),
  copy: BSX_SVG('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  trash: BSX_SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
  settings: BSX_SVG('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  sliders: BSX_SVG('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  bold: BSX_SVG('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>', ' stroke-width="2.4"'),
  alignStart: BSX_SVG('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'),
  alignCenter: BSX_SVG('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'),
  alignEnd: BSX_SVG('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'),
  link: BSX_SVG('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  image: BSX_SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M21 16l-5-5L5 20"/>'),
  upload: BSX_SVG('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'),
  gallery: BSX_SVG('<rect x="7" y="7" width="14" height="13" rx="2"/><path d="M17 4H5a2 2 0 0 0-2 2v11"/><path d="M21 16l-4-4-7 7"/>'),
  fit: BSX_SVG('<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>'),
  video: BSX_SVG('<rect x="2.5" y="5" width="15" height="14" rx="2"/><path d="M17.5 10l4-2.5v9l-4-2.5"/>'),
  phone: BSX_SVG('<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  mail: BSX_SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  pin: BSX_SVG('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  whatsapp: BSX_SVG('<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 19.1z"/><path d="M9.5 9.2c.4 1.8 2 3.5 3.8 4.2l1.2-1.2 1.8.8-.3 1.6c-3.4.2-7.2-3.5-7-7l1.6-.3.8 1.8z"/>'),
  form: BSX_SVG('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>'),
  business: BSX_SVG('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>'),
  contact: BSX_SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.3"/><path d="M5.5 16.5c.8-1.8 2-2.6 3.5-2.6s2.7.8 3.5 2.6M15 9h3M15 13h3"/>'),
  close: BSX_SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: BSX_SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  caret: BSX_SVG('<path d="M6 9l6 6 6-6"/>'),
  sparkle: BSX_SVG('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  search: BSX_SVG('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  parent: BSX_SVG('<path d="M4 9V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4"/><path d="M12 20V10M8 14l4-4 4 4"/>'),
  edit: BSX_SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  text: BSX_SVG('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  globe: BSX_SVG('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9s1.2-6.4 3.6-9z"/>'),
  external: BSX_SVG('<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>'),
  item: BSX_SVG('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10h8M8 14h5"/>'),
  bsd: '<span class="bsx-bsd-glyph" aria-hidden="true">בס״ד</span>',
  minus: BSX_SVG('<path d="M5 12h14"/>'),
};
function bsxIcon(name) { return BSX_ICONS[name] || ""; }

/* ---------- State ---------- */
let bshellActiveFlag = false;
let bshellUndoStack = [];
let bshellRedoStack = [];
const BSHELL_UNDO_CAP = 60;
let bshellSaveTimer = null;
let bsxSel = null;        // the selection (see bsxResolve for its shape)
let bsxHover = null;      // what the pointer is over (same shape)
let bsxEdit = null;       // the inline text edit in progress
let bsxMap = { keys: [], rootOf: new Map(), keyOfTop: new Map(), firstBlockIdx: -1 };
let bsxDevice = "desktop";
let bsxDrag = null;       // section drag in progress
let bsxPointerOverTools = false;
let bsxHoverClearTimer = null;
let bsxCapsMemo = null;
let bsxDirty = false;

function bsxFrame() { return document.getElementById("bshell-canvas-iframe"); }
function bsxDoc() { const f = bsxFrame(); return f && f.contentDocument; }
function bsxSiteRtl() { return siteState.data.siteLang !== "en"; }

/* ---------- What the renderer / section library can do ----------
   Every optional capability is detected, never assumed: a control is only
   shown when the code that renders its setting is actually loaded, so
   nothing in the editor looks editable without being so. */
function bsxCaps() {
  if (bsxCapsMemo) return bsxCapsMemo;
  const ok = (f) => { try { return !!f(); } catch (e) { return false; } };
  bsxCapsMemo = {
    lib: typeof SITE_SECTION_LIBRARY !== "undefined" && Array.isArray(SITE_SECTION_LIBRARY) && typeof siteSectionCreate === "function" && typeof siteSectionInsert === "function",
    textWeight: ok(() => /font-weight\s*:\s*700/.test(textStyleAttr({ textStyles: { k: { weight: "700" } } }, "k"))),
    textAdvanced: ok(() => /line-height/.test(textStyleAttr({ textStyles: { k: { lineHeight: "1.6" } } }, "k"))),
    heroCta: ok(() => { const r = primaryCtaHref({ heroCta: { label: "Pq", action: { kind: "link", value: "https://example.com/" } } }, "index"); return r && r.label === "Pq"; }),
    ctaStyle: ok(() => /background/.test(ctaHtml({ href: "#", label: "x", style: { bg: "#123456" } }, "c"))),
    imageStyles: ok(() => /object-fit/.test(heroMediaHtml({ heroImage: "x.jpg", imageStyles: { hero: { fit: "contain" } } }, "c"))),
    design: typeof siteDesignCss === "function",
    secStyle: (typeof SITE_SECTION_STYLE_PROPS === "object" && SITE_SECTION_STYLE_PROPS) ? SITE_SECTION_STYLE_PROPS : { text: ["size", "color", "align", "font", "weight"], button: [], image: [] },
  };
  return bsxCapsMemo;
}
function bsxLibOn() { return bsxCaps().lib; }
function bsxLibEntry(type) {
  if (typeof SITE_SECTION_LIBRARY === "undefined" || !Array.isArray(SITE_SECTION_LIBRARY)) return null;
  return SITE_SECTION_LIBRARY.find((e) => e && e.type === type) || null;
}
function bsxLoc(o) {
  if (!o) return "";
  if (typeof o === "string") return bsLabel(o);
  return bsL(o.he || o.en || "", o.en || o.he || "");
}
function bsxAvailableTypes() {
  if (!bsxLibOn()) return [];
  let types = [];
  try { types = typeof siteSectionsAvailable === "function" ? (siteSectionsAvailable(siteState.template) || []) : SITE_SECTION_LIBRARY; } catch (e) { types = []; }
  // entries ({type, ...}) or plain type names — both accepted
  return types.map((t) => (t && typeof t === "object" ? t.type : t)).filter((t) => bsxLibEntry(t));
}

/* ---------- Entry ---------- */
function bshellActivate() {
  bshellActiveFlag = true;
  bsxCapsMemo = null;
  ["tpl-catalog-section", "wizard-section", "builder-top-banner"].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = "none";
  // The global DeskKit sidebar stays, collapsed by default inside the
  // editor (its own per-viewer setting — see js/app-sidebar.js).
  document.body.dataset.dkSidebarScope = "builder";
  if (typeof dkApplyAppSidebarPref === "function") dkApplyAppSidebarPref();
  document.getElementById("bshell-root").classList.add("active");
  ensurePagesShape(siteState.data);
  bsxUpdateTopName();
  bsxWireChrome();
  bshellRenderCanvas();
  bshellSyncUndoButtons();
  bsxSetStatus(bsxDirty ? "saving" : "");
  if (typeof bsxRenderDock === "function") bsxRenderDock();
  bsxStartLoop();
}

function bsxUpdateTopName() {
  const t = SITE_TEMPLATES[siteState.template];
  const el = document.getElementById("bshell-top-name");
  if (el) el.textContent = (siteState.data.businessName || "").trim() || (t ? bsLabel(t.label) : bsL("הפרויקט שלי", "My project"));
}

/* site-cloud-save.js replaces siteState.data when the account's saved copy
   arrives (and calls showWizard()) — after that the editor shows the new
   data instead of the copy it started with. */
(function bsxHookExternalLoads() {
  if (typeof showWizard !== "function") return;
  const orig = showWizard;
  // eslint-disable-next-line no-global-assign
  showWizard = function () {
    orig.apply(this, arguments);
    if (!bshellActiveFlag) return;
    ["wizard-section"].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
    bsxCancelEdit();
    ensurePagesShape(siteState.data);
    bsxUpdateTopName();
    bshellRenderCanvas(() => { if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
    if (typeof bsxRenderDock === "function") bsxRenderDock();
  };
})();

/* ---------- Top bar ---------- */
function bsxFillIcons(root) {
  root.querySelectorAll("[data-icon]").forEach((el) => { if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", bsxIcon(el.dataset.icon)); });
  root.querySelectorAll("[data-icon-before]").forEach((el) => { if (!el.querySelector("svg")) el.insertAdjacentHTML("afterbegin", bsxIcon(el.dataset.iconBefore)); });
}
function bsxTip(el, text, keys) {
  if (!el) return;
  el.title = text + (keys ? ` (${keys})` : "");
  el.setAttribute("aria-label", text);
}

function bsxWireChrome() {
  const root = document.getElementById("bshell-root");
  if (root.dataset.wired) return;
  root.dataset.wired = "1";
  bsxFillIcons(root);
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const mod = mac ? "⌘" : "Ctrl";
  bsxTip(document.getElementById("bsx-sidebar-btn"), bsL("תפריט DeskKit (פתיחה/סגירה)", "DeskKit menu (open/close)"));
  const back = document.getElementById("bsx-back");
  back.querySelector(".bsx-back-label").textContent = bsL("הפרויקטים שלי", "My projects");
  back.title = bsL("חזרה לפרויקטים שלי", "Back to my projects");
  bsxTip(document.getElementById("bshell-save-btn"), bsL("שמירה עכשיו", "Save now"), `${mod}+S`);
  document.getElementById("bsx-save-retry").textContent = bsL("לנסות שוב", "Retry");
  bsxTip(document.getElementById("bshell-undo-btn"), bsL("ביטול", "Undo"), `${mod}+Z`);
  bsxTip(document.getElementById("bshell-redo-btn"), bsL("חזרה על הפעולה", "Redo"), `${mod}+Shift+Z`);
  const devLabels = { desktop: bsL("מחשב", "Desktop"), tablet: bsL("טאבלט", "Tablet"), mobile: bsL("נייד", "Mobile") };
  document.querySelectorAll("#bshell-device-row .bshell-device-btn").forEach((b) => { bsxTip(b, devLabels[b.dataset.device]); b.setAttribute("aria-pressed", String(b.classList.contains("active"))); });
  document.getElementById("bshell-device-row").setAttribute("aria-label", bsL("גודל מסך", "Screen size"));
  const structBtn = document.getElementById("bsx-structure-btn");
  structBtn.querySelector("span").textContent = bsL("מבנה האתר", "Site structure");
  structBtn.title = bsL("כל החלקים באתר — סידור, הצגה והסתרה", "All sections — order, show and hide");
  const prevBtn = document.getElementById("bshell-preview-btn");
  prevBtn.querySelector("span").textContent = bsL("תצוגה מקדימה", "Preview");
  prevBtn.title = bsL("איך האתר ייראה למבקרים", "See the site as visitors will");
  bsxTip(document.getElementById("bsx-help-btn"), bsL("עזרה קצרה", "Quick help"));
  bsxTip(document.getElementById("bsx-more-btn"), bsL("עוד פעולות", "More actions"));
  document.getElementById("bshell-publish-btn").textContent = bsL("פרסום", "Publish");
  document.getElementById("bsx-ai-title").textContent = bsL("עזרה מ-DeskKit", "Help from DeskKit");
  document.getElementById("bshell-ai-input").placeholder = bsL("מה תרצו לשנות?", "What would you like to change?");
  document.getElementById("bshell-ai-submit").textContent = bsL("שליחה", "Send");
  bsxTip(document.getElementById("bsx-ai-close"), bsL("סגירה", "Close"));
  bsxTip(document.getElementById("bsx-panel-close"), bsL("סגירת החלונית", "Close panel"));
  bsxTip(document.getElementById("bsx-panel-back"), bsL("חזרה", "Back"));
  const iframe = bsxFrame();
  if (iframe) iframe.title = bsL("עריכת האתר", "Site editor");

  document.getElementById("bshell-undo-btn").addEventListener("click", bshellUndo);
  document.getElementById("bshell-redo-btn").addEventListener("click", bshellRedo);
  document.getElementById("bshell-save-btn").addEventListener("click", () => { bsxCommitEdit(); bshellSaveNow(); });
  document.getElementById("bsx-save-retry").addEventListener("click", () => bshellSaveNow());
  document.getElementById("bsx-sidebar-btn").addEventListener("click", () => {
    if (typeof dkToggleAppSidebar === "function") dkToggleAppSidebar();
    bsxSyncSidebarBtn();
  });
  new MutationObserver(bsxSyncSidebarBtn).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  bsxSyncSidebarBtn();

  document.getElementById("bshell-device-row").addEventListener("click", (e) => {
    const btn = e.target.closest(".bshell-device-btn");
    if (btn) bsxSetDevice(btn.dataset.device);
  });
  structBtn.addEventListener("click", () => bsxTogglePanel("structure"));
  prevBtn.addEventListener("click", () => { if (typeof bsxStartPreview === "function") bsxStartPreview(); });
  document.getElementById("bsx-help-btn").addEventListener("click", (e) => { e.stopPropagation(); bsxToggleHelp(); });
  const moreBtn = document.getElementById("bsx-more-btn");
  moreBtn.addEventListener("click", (e) => { e.stopPropagation(); bsxToggleMoreMenu(); });
  document.getElementById("bsx-ai-close").addEventListener("click", () => {
    document.getElementById("bshell-ai-panel").setAttribute("hidden", "");
  });
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("bsx-more-menu");
    if (menu && !menu.hidden && !menu.contains(e.target)) { menu.hidden = true; moreBtn.setAttribute("aria-expanded", "false"); }
    const help = document.getElementById("bsx-help");
    if (help && !help.contains(e.target)) bsxCloseHelp();
    bsxClosePopoverIfOutside(e.target);
  });
  document.getElementById("bsx-panel-close").addEventListener("click", () => bsxClosePanel());
  document.getElementById("bsx-panel-back").addEventListener("click", () => { if (typeof bsxPanelBack === "function") bsxPanelBack(); });

  document.addEventListener("keydown", bsxOnKey, true);
  window.addEventListener("beforeunload", (e) => {
    if (!bshellActiveFlag) return;
    bsxCommitEdit();
    if (bsxDirty || bsxSaveState.failed) { e.preventDefault(); e.returnValue = ""; }
  });
  window.addEventListener("resize", () => bsxClosePopover());

  bshellWireAiPanel();
  bsxWireOverlay();
}

function bsxSyncSidebarBtn() {
  const btn = document.getElementById("bsx-sidebar-btn");
  if (!btn) return;
  const mounted = document.body.classList.contains("dk-app-sidebar-mounted");
  btn.hidden = !mounted || window.innerWidth <= 900;
  const open = mounted && !document.body.classList.contains("dk-app-sidebar-collapsed");
  btn.classList.toggle("is-on", open);
  btn.setAttribute("aria-pressed", String(open));
}

function bsxSetDevice(device) {
  bsxDevice = device === "tablet" || device === "mobile" ? device : "desktop";
  document.querySelectorAll("#bshell-device-row .bshell-device-btn").forEach((b) => {
    const on = b.dataset.device === bsxDevice;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", String(on));
  });
  const holder = document.getElementById("bshell-canvas-holder");
  holder.classList.remove("device-tablet", "device-mobile");
  if (bsxDevice !== "desktop") holder.classList.add("device-" + bsxDevice);
  const pf = document.getElementById("bsx-preview-frame");
  if (pf && typeof bsxSyncPreviewDevice === "function") bsxSyncPreviewDevice();
}

function bsxToggleMoreMenu(force) {
  const menu = document.getElementById("bsx-more-menu");
  const btn = document.getElementById("bsx-more-btn");
  const open = force !== undefined ? force : menu.hidden;
  if (!open) { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); return; }
  const items = [
    ["ai", "sparkle", bsL("עזרה מ-DeskKit (AI)", "Help from DeskKit (AI)")],
    ["sep"],
    ["design", "palette", bsL("עיצוב האתר", "Site design")],
    ["business", "business", bsL("פרטי העסק ויצירת קשר", "Business & contact details")],
    ["structure", "layers", bsL("מבנה האתר", "Site structure")],
    ["seo", "search", bsL("איך האתר נראה בגוגל (SEO)", "How the site looks on Google (SEO)")],
    ["settings", "sliders", bsL("הגדרות מתקדמות", "Advanced settings")],
    ["sep"],
    ["preview", "eye", bsL("תצוגה מקדימה", "Preview")],
    ["newtab", "external", bsL("תצוגה מקדימה בכרטיסייה חדשה", "Preview in a new tab")],
    ["help", "help", bsL("עזרה קצרה", "Quick help")],
  ];
  menu.innerHTML = items.map((it) => it[0] === "sep" ? '<div class="bsx-menu-sep" role="separator"></div>'
    : `<button type="button" class="bsx-menu-item" role="menuitem" data-menu="${it[0]}">${bsxIcon(it[1])}<span>${bsxEsc(it[2])}</span></button>`).join("");
  menu.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  const first = menu.querySelector("button");
  if (first) first.focus();
  menu.onclick = (e) => {
    const b = e.target.closest("[data-menu]");
    if (!b) return;
    e.stopPropagation();
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    const k = b.dataset.menu;
    if (k === "ai") {
      bsxClosePanel();
      document.getElementById("bshell-ai-btn").click();
    } else if (k === "preview") { if (typeof bsxStartPreview === "function") bsxStartPreview(); }
    else if (k === "newtab") bsxOpenPreviewTab();
    else if (k === "help") bsxToggleHelp(true);
    else bsxOpenPanel(k);
  };
  menu.onkeydown = (e) => {
    const list = Array.from(menu.querySelectorAll("button"));
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); bsxToggleMoreMenu(false); btn.focus(); }
  };
}

async function bsxOpenPreviewTab() {
  bsxCommitEdit();
  // The preview tab loads the project from the account, so save first.
  if (bsxDirty) await bshellSaveNow();
  const url = new URL(location.href);
  url.searchParams.set("fullpreview", "1");
  url.searchParams.set("template", siteState.template);
  window.open(url.toString(), "_blank", "noopener");
}

/* "?" — a few short tips, not a manual. */
function bsxToggleHelp(force) {
  const existing = document.getElementById("bsx-help");
  if (existing && force !== true) { bsxCloseHelp(); return; }
  if (existing) return;
  const btn = document.getElementById("bsx-help-btn");
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || "");
  const mod = mac ? "⌘" : "Ctrl";
  const box = document.createElement("div");
  box.id = "bsx-help";
  box.className = "bsx-help";
  box.setAttribute("role", "dialog");
  box.innerHTML = `<h3>${bsL("איך עורכים?", "How to edit")}</h3><ol>
    <li>${bsL("לוחצים על כל טקסט באתר ומקלידים במקום.", "Click any text on the site and type right there.")}</li>
    <li>${bsL("לוחצים על תמונה, כפתור או טלפון — ליד יופיע סרגל קטן עם האפשרויות.", "Click an image, button or phone number — a small toolbar appears next to it.")}</li>
    <li>${bsL("מעבר עם העכבר על חלק מציג סרגל להזזה, עיצוב והסתרה, ו-＋ להוספת חלק חדש.", "Hover a section for move, design and hide tools, and ＋ to add a new section.")}</li>
    <li>${bsL("הכלים בתחתית המסך: הוספה, עיצוב האתר, פרטי העסק ועוד.", "The tools at the bottom: add, site design, business details and more.")}</li>
    <li>${bsL("הכול נשמר לבד.", "Everything saves by itself.")} <kbd>${mod}+Z</kbd> ${bsL("מבטל,", "undoes,")} <kbd>Esc</kbd> ${bsL("מבטל בחירה.", "deselects.")}</li>
  </ol>`;
  document.getElementById("bshell-root").appendChild(box);
  const r = btn.getBoundingClientRect();
  const w = Math.min(300, window.innerWidth - 24);
  let left = bsxSiteDirIsRtlUi() ? r.left : r.right - w;
  left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
  box.style.left = left + "px";
  box.style.top = (r.bottom + 8) + "px";
  btn.setAttribute("aria-expanded", "true");
}
function bsxCloseHelp() {
  const el = document.getElementById("bsx-help");
  if (el) el.remove();
  const btn = document.getElementById("bsx-help-btn");
  if (btn) btn.setAttribute("aria-expanded", "false");
}
function bsxSiteDirIsRtlUi() { return (document.documentElement.getAttribute("dir") || "rtl") === "rtl"; }

/* ---------- Undo / Redo — one siteState.data snapshot per logical edit
   (never per keystroke), capped. */
function bshellSnapshot() {
  bshellUndoStack.push(JSON.stringify(siteState.data));
  if (bshellUndoStack.length > BSHELL_UNDO_CAP) bshellUndoStack.shift();
  bshellRedoStack = [];
  bshellSyncUndoButtons();
}
function bshellSyncUndoButtons() {
  const u = document.getElementById("bshell-undo-btn");
  const r = document.getElementById("bshell-redo-btn");
  if (u) u.disabled = bshellUndoStack.length === 0;
  if (r) r.disabled = bshellRedoStack.length === 0;
}
function bshellRestoreAfterHistoryMove() {
  ensurePagesShape(siteState.data);
  bshellSyncUndoButtons();
  bsxUpdateTopName();
  bsxMarkDirty();
  bshellRenderCanvas(() => {
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
  });
  if (typeof bsxRenderDock === "function") bsxRenderDock();
}
function bshellUndo() {
  bsxCommitEdit();
  if (!bshellUndoStack.length) return;
  bshellRedoStack.push(JSON.stringify(siteState.data));
  siteState.data = JSON.parse(bshellUndoStack.pop());
  bshellRestoreAfterHistoryMove();
}
function bshellRedo() {
  bsxCommitEdit();
  if (!bshellRedoStack.length) return;
  bshellUndoStack.push(JSON.stringify(siteState.data));
  siteState.data = JSON.parse(bshellRedoStack.pop());
  bshellRestoreAfterHistoryMove();
}
/* A field snapshots once, on focus — not on every keystroke. */
function bshellBeginEdit(inputEl) {
  if (inputEl.dataset.bshellEditing === "1") return;
  inputEl.dataset.bshellEditing = "1";
  bshellSnapshot();
}
function bshellEndEdit(inputEl) { delete inputEl.dataset.bshellEditing; }

/* ---------- Saving ----------
   Autosave ~1.2s after the last change. One save at a time: a change made
   while a save is on its way is saved right after it (saveSiteNow itself
   is also serialized in site-cloud-save.js). A failed save keeps the
   changes marked unsaved, says so, and retries with a growing delay. */
const bsxSaveState = { inflight: null, pending: false, failed: false, retryDelay: 4000 };
function bsxMarkDirty() { bsxDirty = true; }
function bshellScheduleSave() {
  bsxMarkDirty();
  if (!bsxSaveState.failed) bsxSetStatus("saving");
  clearTimeout(bshellSaveTimer);
  bshellSaveTimer = setTimeout(bshellSaveNow, 1200);
}
function bsxSetStatus(state) {
  const el = document.getElementById("bshell-top-status");
  const retry = document.getElementById("bsx-save-retry");
  if (!el) return;
  const text = { saved: bsL("נשמר", "Saved"), saving: bsL("שומר…", "Saving…"), failed: bsL("לא נשמר — ננסה שוב", "Not saved — retrying") }[state] || "";
  el.textContent = text;
  el.className = "bshell-top-status" + (state ? " " + state : "");
  el.dataset.state = state || "";
  el.title = state === "failed" ? bsL("השינויים עדיין לא נשמרו. ננסה שוב אוטומטית.", "Your changes aren't saved yet. We'll keep trying.") : "";
  if (retry) retry.hidden = state !== "failed";
}
function bshellSaveNow() {
  clearTimeout(bshellSaveTimer);
  if (bsxSaveState.inflight) { bsxSaveState.pending = true; return bsxSaveState.inflight; }
  bsxSetStatus("saving");
  const wasDirty = bsxDirty;
  bsxDirty = false; // edits made from here on mark it dirty again
  const run = (async () => {
    let error = null;
    try { error = typeof saveSiteNow === "function" ? await saveSiteNow() : null; } catch (err) { error = err || new Error("save failed"); }
    bsxSaveState.inflight = null;
    if (error) {
      bsxDirty = bsxDirty || wasDirty || true;
      bsxSaveState.failed = true;
      bsxSetStatus("failed");
      clearTimeout(bshellSaveTimer);
      bshellSaveTimer = setTimeout(bshellSaveNow, bsxSaveState.retryDelay);
      bsxSaveState.retryDelay = Math.min(bsxSaveState.retryDelay * 2, 30000);
      bsxSaveState.pending = false;
      return error;
    }
    bsxSaveState.failed = false;
    bsxSaveState.retryDelay = 4000;
    if (bsxSaveState.pending || bsxDirty) {
      bsxSaveState.pending = false;
      return bshellSaveNow();
    }
    bsxSetStatus("saved");
    return null;
  })();
  bsxSaveState.inflight = run;
  return run;
}

/* ---------- AI helper — the same validated-op pipeline as before
   (site-ai-command.js); only the bookkeeping is the editor's. ---------- */
let bshellAiPending = null;
function bshellApplyAiOp(result) {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  bsxCommitEdit();
  bshellSnapshot();
  if (!applySiteAiOp(d, template, result)) {
    bshellUndoStack.pop();
    bshellSyncUndoButtons();
    bshellAiNote(bsL("השינוי כבר לא מתאים למצב הנוכחי של האתר, ולכן לא בוצע.", "That change no longer fits the site's current state, so it wasn't made."));
    return;
  }
  bsxDeselect();
  bsxUpdateTopName();
  bshellRenderCanvas(() => { if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
  bshellScheduleSave();
  bshellAiNote(`${bsL("בוצע ✓", "Done ✓")} ${escapeHtmlS(result.explanation || "")}
    <div class="bshell-ai-confirm-row"><button type="button" id="bshell-ai-undo">${bsL("↶ ביטול השינוי", "↶ Undo this change")}</button></div>`);
  const undoBtn = document.getElementById("bshell-ai-undo");
  if (undoBtn) undoBtn.addEventListener("click", () => { bshellUndo(); bshellAiNote(bsL("השינוי בוטל.", "Change undone.")); });
}
function bshellAiNote(html) { const note = document.getElementById("bshell-ai-note"); if (note) note.innerHTML = html; }
const BSHELL_AI_TYPE_NAMES = { services: bsL("השירותים", "the services"), about: bsL("האודות", "the about section"), contact: bsL("חלק צור קשר", "the contact section"), aboutTags: bsL("התגיות", "the tags"), grid: bsL("הרשת", "the grid") };
const BSHELL_AI_HINT = bsL("אפשר לבקש: לשנות צבע או גופן, לכתוב מחדש טקסט (כותרת, אודות, פרטי קשר), להוסיף/לערוך/להסיר שירות, לשנות סדר חלקים או סגנון תצוגה. אפשר כמה דברים בבקשה אחת.", "You can ask to: change the color or font, rewrite a text (heading, about, contact details), add/edit/remove a service, reorder sections or switch a display style. Several things in one request is fine.");
function bshellAiExamples() {
  const ctx = siteAiCommandContext();
  const name = (t) => BSHELL_AI_TYPE_NAMES[t] || t;
  const variants = (siteState.data && siteState.data.blockVariants) || {};
  const out = [bsL("שנה את הצבע לכחול והפוך את הגופן לאלגנטי", "Make the color blue and the font more elegant")];
  if (ctx.textFields.about) out.push(bsL("קצר את טקסט האודות", "Make the about text shorter"));
  else out.push(bsL("כתוב שורת תיאור מקצועית יותר", "Write a more professional tagline"));
  const movable = ctx.activeTypes.filter((t) => t !== "hero" && BSHELL_AI_TYPE_NAMES[t]);
  if (movable.length >= 2) out.push(bsL(`הזז את ${name(movable[1])} לפני ${name(movable[0])}`, `Move ${name(movable[1])} before ${name(movable[0])}`));
  if (ctx.variantOptions.hero) out.push(variants.hero === "centered" ? bsL("החזר את ה-Hero לעיצוב הקלאסי", "Switch the Hero back to the classic layout") : bsL("הפוך את ה-Hero לממורכז", "Make the Hero centered"));
  return out.slice(0, 3);
}
function bshellRenderAiExamples() {
  const hint = document.getElementById("bshell-ai-hint");
  if (hint) hint.textContent = BSHELL_AI_HINT;
  const box = document.getElementById("bshell-ai-examples");
  if (!box) return;
  let ex = [];
  try { ex = bshellAiExamples(); } catch (e) { ex = []; }
  box.innerHTML = ex.map((x) => { const safe = escapeHtmlS(x); return `<button type="button" data-ai-example="${safe}">${safe}</button>`; }).join("");
}
function bshellWireAiPanel() {
  const btn = document.getElementById("bshell-ai-btn");
  const panel = document.getElementById("bshell-ai-panel");
  const input = document.getElementById("bshell-ai-input");
  const submitBtn = document.getElementById("bshell-ai-submit");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = panel.hasAttribute("hidden");
    panel.toggleAttribute("hidden", !willOpen);
    btn.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) { bshellRenderAiExamples(); input.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (panel.hasAttribute("hidden")) return;
    if (e.target === btn || panel.contains(e.target) || !e.target.isConnected) return;
    panel.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  });
  document.getElementById("bshell-ai-examples").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-ai-example]");
    if (!chip) return;
    input.value = chip.dataset.aiExample;
    input.focus();
  });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); bshellAiSubmit(); } });
  submitBtn.addEventListener("click", bshellAiSubmit);
}
async function bshellAiSubmit() {
  const input = document.getElementById("bshell-ai-input");
  const btn = document.getElementById("bshell-ai-submit");
  const command = (input.value || "").trim();
  if (!command) return;
  bshellAiPending = null;
  bshellAiNote(bsL("ה-AI מעבד את הפקודה…", "The AI is working on your request…"));
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = bsL("מעבד...", "Working...");
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");
    const res = await fetch(SUPABASE_URL + "/functions/v1/site-ai-command", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(siteAiCommandRequestBody(command)),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "unexpected error");
    if (data.limitReached) {
      bshellAiNote(data.isPro
        ? bsL("הגעת למכסת השימוש ההוגן היומית לפקודות AI. אפשר להמשיך מחר.", "You've reached today's fair-use limit for AI commands. You can continue tomorrow.")
        : bsL("הגעת למכסת הניסיונות החינמיים לפקודות AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!", "You've used up your free AI command tries. Want to keep going? Upgrade to Pro with a one-time payment!"));
      return;
    }
    const result = data.result;
    const ops = (result && result.op !== "unsupported") ? siteAiCleanOps(result, ensurePagesShape(siteState.data), siteState.template) : [];
    if (!ops.length) {
      bshellAiNote(escapeHtmlS((result && result.op === "unsupported" && result.explanation) || `${bsL("לא הצלחתי לבצע את הפעולה הזו.", "I couldn't do that.")} ${BSHELL_AI_HINT}`));
      return;
    }
    bshellAiPending = result;
    bshellAiNote(siteAiConfirmHtml(result, ops, "bshell-ai", "bshell-ai-confirm-yes"));
    document.getElementById("bshell-ai-confirm").addEventListener("click", () => {
      if (bshellAiPending) bshellApplyAiOp(bshellAiPending);
      bshellAiPending = null;
      input.value = "";
    });
    document.getElementById("bshell-ai-cancel").addEventListener("click", () => { bshellAiPending = null; bshellAiNote(bsL("בוטל.", "Canceled.")); });
  } catch (err) {
    console.error("bshell AI command failed:", err && err.message ? err.message : "error");
    bshellAiNote(bsL("משהו השתבש. אפשר לנסות שוב בעוד רגע.", "Something went wrong. Please try again in a moment."));
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* ---------- Canvas: render + in-place patching ----------
   Every change renders the page in memory (the same currentSiteHtml()
   string the published site is made from) and patches only what differs
   in the live canvas document — no reload, no flash, the scroll position
   stays. Only a change to the page's top-level structure (a section
   added/removed/moved, language switched) loads the new page in a hidden
   second iframe and swaps it in once it's ready. Every top-level element
   is tagged data-bshell-top="N" in the canvas copy only. */
let bshellCanvasHtml = "";
let bshellCanvasBuffer = null;

function bshellTaggedDoc(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  Array.from(doc.body.children).forEach((el, i) => el.setAttribute("data-bshell-top", String(i)));
  return doc;
}
function bsxCanvasSiteHtml() { return currentSiteHtml("index", { preview: true }); }
function bshellRenderCanvas(afterLoad) {
  const html = bsxCanvasSiteHtml();
  if (bshellPatchCanvas(html)) {
    bsxOnCanvasUpdated();
    if (afterLoad) afterLoad();
    return;
  }
  bshellSwapInCanvas(html, afterLoad);
}
function bshellPatchCanvas(html) {
  const iframe = bsxFrame();
  const doc = iframe && iframe.contentDocument;
  if (!doc || !doc.body || !bshellCanvasHtml || bshellCanvasBuffer) return false;
  if (!doc.querySelector("body > [data-bshell-top]")) return false;
  if (html === bshellCanvasHtml) return true;
  const oldDoc = bshellTaggedDoc(bshellCanvasHtml);
  const newDoc = bshellTaggedDoc(html);
  const attr = (d, name) => d.documentElement.getAttribute(name);
  if (attr(oldDoc, "lang") !== attr(newDoc, "lang") || attr(oldDoc, "dir") !== attr(newDoc, "dir")) return false;
  if (oldDoc.body.getAttribute("class") !== newDoc.body.getAttribute("class")) return false;
  const oldTop = Array.from(oldDoc.body.children);
  const newTop = Array.from(newDoc.body.children);
  if (oldTop.length !== newTop.length || oldTop.some((el, i) => el.tagName !== newTop[i].tagName)) return false;
  const scriptsOf = (d) => Array.from(d.querySelectorAll("script")).map((s) => s.textContent).join("\u0000");
  if (scriptsOf(oldDoc) !== scriptsOf(newDoc)) return false;
  const jobs = [];
  for (let i = 0; i < oldTop.length; i++) {
    if (oldTop[i].isEqualNode(newTop[i])) continue;
    const live = doc.querySelector(`body > [data-bshell-top="${i}"]`);
    if (!live) return false;
    jobs.push([live, oldTop[i], newTop[i]]);
  }
  const oldStyle = oldDoc.head.querySelector("style");
  const newStyle = newDoc.head.querySelector("style");
  const liveStyle = doc.head.querySelector('style:not([id^="bshell"])');
  if ((oldStyle ? oldStyle.textContent : "") !== (newStyle ? newStyle.textContent : "")) {
    if (!liveStyle || !newStyle) return false;
    liveStyle.textContent = newStyle.textContent;
  }
  const links = (d) => Array.from(d.head.querySelectorAll("link")).map((l) => l.outerHTML).join("");
  if (links(oldDoc) !== links(newDoc)) {
    doc.head.querySelectorAll("link").forEach((l) => l.remove());
    doc.head.insertAdjacentHTML("afterbegin", Array.from(newDoc.head.querySelectorAll("link")).map((l) => l.outerHTML).join(""));
  }
  const touchedTops = new Set();
  jobs.forEach(([live, o, n]) => bshellPatchNode(doc, live, o, n, touchedTops));
  touchedTops.forEach((top) => bshellRerunTrailingScript(doc, top));
  bshellCanvasHtml = html;
  return true;
}
function bshellPatchNode(doc, live, o, n, touchedTops) {
  if (o.isEqualNode(n)) return;
  if (o.tagName !== n.tagName || o.tagName === "SCRIPT") {
    const fresh = doc.importNode(n, true);
    live.replaceWith(fresh);
    bshellAfterRebuild(doc, fresh, touchedTops);
    return;
  }
  Array.from(n.attributes).forEach((a) => { if (o.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value); });
  Array.from(o.attributes).forEach((a) => { if (!n.hasAttribute(a.name)) live.removeAttribute(a.name); });
  if (live.classList && live.classList.contains("site-reveal")) live.classList.add("site-in");
  const oc = o.childNodes, nc = n.childNodes, lc = live.childNodes;
  const sameShape = oc.length === nc.length && lc.length === oc.length
    && Array.prototype.every.call(oc, (c, i) => c.nodeName === nc[i].nodeName && lc[i].nodeName === c.nodeName);
  if (sameShape) {
    for (let i = 0; i < oc.length; i++) {
      if (oc[i].nodeType === 1) bshellPatchNode(doc, lc[i], oc[i], nc[i], touchedTops);
      else if (oc[i].nodeValue !== nc[i].nodeValue) lc[i].nodeValue = nc[i].nodeValue;
    }
    return;
  }
  live.innerHTML = n.innerHTML;
  bshellAfterRebuild(doc, live, touchedTops);
}
function bshellAfterRebuild(doc, el, touchedTops) {
  if (el.classList && el.classList.contains("site-reveal")) el.classList.add("site-in");
  if (el.querySelectorAll) el.querySelectorAll(".site-reveal").forEach((r) => r.classList.add("site-in"));
  const scripts = el.tagName === "SCRIPT" ? [el] : Array.from(el.querySelectorAll ? el.querySelectorAll("script") : []);
  scripts.forEach((old) => {
    const s = doc.createElement("script");
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
  const top = el.closest ? el.closest("body > *") : null;
  if (top && el.tagName !== "SCRIPT") touchedTops.add(top);
}
function bshellRerunTrailingScript(doc, top) {
  if (!top.isConnected) return;
  const next = top.nextElementSibling;
  if (next && next.tagName === "SCRIPT") {
    const s = doc.createElement("script");
    s.textContent = next.textContent;
    top.after(s);
  }
  if (top.querySelector(".site-hero-slideshow") && typeof heroSlideshowScript === "function") {
    const s = doc.createElement("script");
    s.textContent = heroSlideshowScript().replace(/^<script>|<\/script>$/g, "");
    doc.body.appendChild(s);
  }
}
function bshellSwapInCanvas(html, afterLoad) {
  const cur = bsxFrame();
  const tagged = "<!doctype html>\n" + bshellTaggedDoc(html).documentElement.outerHTML;
  const curDoc = cur.contentDocument;
  if (!bshellCanvasHtml || !curDoc || !curDoc.body || !curDoc.body.children.length) {
    if (bshellCanvasBuffer) { bshellCanvasBuffer.remove(); bshellCanvasBuffer = null; }
    cur.onload = () => {
      bshellCanvasHtml = html;
      bshellOnCanvasLoad();
      if (afterLoad) afterLoad();
    };
    cur.srcdoc = tagged;
    return;
  }
  if (bshellCanvasBuffer) bshellCanvasBuffer.remove();
  const scrollY = cur.contentWindow ? cur.contentWindow.scrollY : 0;
  const buf = document.createElement("iframe");
  buf.className = cur.className + " bshell-canvas-buffer";
  buf.title = cur.title;
  buf.setAttribute("aria-hidden", "true");
  bshellCanvasBuffer = buf;
  buf.onload = () => {
    if (bshellCanvasBuffer !== buf) return;
    const bdoc = buf.contentDocument;
    if (!bdoc || !bdoc.head || !bdoc.querySelector("body > [data-bshell-top]")) return;
    const still = bdoc.createElement("style");
    still.id = "bshell-swap-still";
    still.textContent = "*,*::before,*::after{transition:none !important;} html{scroll-behavior:auto !important;}";
    bdoc.head.appendChild(still);
    bdoc.querySelectorAll(".site-reveal").forEach((el) => el.classList.add("site-in"));
    bsxInjectCanvasUi(bdoc);
    buf.contentWindow.scrollTo(0, scrollY);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (bshellCanvasBuffer !== buf) return;
      bshellCanvasBuffer = null;
      bsxCancelEdit();
      cur.remove();
      buf.id = "bshell-canvas-iframe";
      buf.classList.remove("bshell-canvas-buffer");
      buf.removeAttribute("aria-hidden");
      buf.onload = null;
      still.remove();
      bshellCanvasHtml = html;
      bshellOnCanvasLoad();
      if (afterLoad) afterLoad();
    }));
  };
  cur.parentNode.appendChild(buf);
  buf.srcdoc = tagged;
}
function bshellOnCanvasLoad() {
  const doc = bsxDoc();
  if (!doc) return;
  bsxInjectCanvasUi(doc);
  bsxWireCanvas(doc);
  bsxOnCanvasUpdated();
}

/* ---------- The canvas in edit mode ----------
   Only in the canvas copy: everything is visible (no reveal-on-scroll
   waiting), embedded players don't eat clicks, and nothing navigates,
   dials or submits — selecting and activating are kept apart. */
function bsxInjectCanvasUi(doc) {
  if (!doc || !doc.head || doc.getElementById("bshell-canvas-ui")) return;
  const ui = doc.createElement("style");
  ui.id = "bshell-canvas-ui";
  ui.textContent = `
    body, body * { cursor: pointer; }
    iframe { pointer-events: none !important; }
    .site-reveal { opacity: 1 !important; transform: none !important; }
    [data-bsx-editing] { cursor: text !important; outline: none !important; -webkit-user-select: text !important; user-select: text !important; caret-color: #0F766E; }
    [data-bsx-editing] * { cursor: text !important; }
    [data-bsx-editing]:empty::before { content: attr(data-bsx-ph); opacity: .45; }
    [data-dk-empty]:not(:empty)::before { content: none !important; }
    ::selection { background: rgba(20,184,166,.28); }
    a, img { -webkit-user-drag: none; }
  `;
  doc.head.appendChild(ui);
}

function bsxWireCanvas(doc) {
  if (!doc || doc.__bsxWired) return;
  doc.__bsxWired = true;
  doc.addEventListener("mousedown", bsxOnCanvasDown, true);
  doc.addEventListener("click", bsxOnCanvasClick, true);
  doc.addEventListener("dblclick", (e) => { if (!bsxEdit || !bsxEdit.el.contains(e.target)) e.preventDefault(); }, true);
  doc.addEventListener("auxclick", (e) => e.preventDefault(), true);
  doc.addEventListener("submit", (e) => { e.preventDefault(); e.stopPropagation(); }, true);
  doc.addEventListener("dragstart", (e) => e.preventDefault(), true);
  doc.addEventListener("keydown", bsxOnKey, true);
  doc.addEventListener("mousemove", bsxOnCanvasMove, { passive: true });
  doc.documentElement.addEventListener("mouseleave", () => { bsxPointer = null; bsxScheduleHoverClear(); });
  // Scrolling moves the page under a still pointer: re-read what is under it.
  doc.addEventListener("scroll", () => {
    if (!bsxPointer || bsxDrag) return;
    const t = doc.elementFromPoint(bsxPointer.x, bsxPointer.y);
    if (t) bsxOnCanvasMove({ target: t, clientX: bsxPointer.x, clientY: bsxPointer.y });
  }, { passive: true, capture: true });
  doc.addEventListener("paste", bsxOnPaste, true);
  doc.addEventListener("input", bsxOnEditInput, true);
  doc.addEventListener("focusout", (e) => {
    if (bsxEdit && e.target === bsxEdit.el) setTimeout(() => { if (bsxEdit && bsxEdit.el === e.target && doc.activeElement !== e.target) bsxCommitEdit(); }, 0);
  }, true);
}

/* ---------- The section map: which top-level element is which section ---------- */
function bsxVisibleKeys() {
  if (typeof activeBlocksForPage !== "function") return [];
  try { return activeBlocksForPage(siteState.data, siteState.template, "index") || []; } catch (e) { return []; }
}
function bsxOrder() {
  if (typeof ensureBlockOrder !== "function") return [];
  return ensureBlockOrder(siteState.data, siteState.template, "index") || [];
}
function bsxIsCustom(key) { return typeof key === "string" && key.indexOf("x:") === 0; }
function bsxIsBlockKey(key) { return !!key && key !== "video" && key.indexOf("site:") !== 0; }
function bsxCustomId(key) { return bsxIsCustom(key) ? key.slice(2) : null; }
function bsxSecData(key) {
  const id = bsxCustomId(key);
  const d = siteState.data;
  return id && d.sections && d.sections[id] ? d.sections[id] : null;
}
function bsxRootOf(doc, key) {
  if (!doc || !doc.body) return null;
  if (bsxIsCustom(key)) {
    const el = doc.querySelector(`[data-dk-sec="${bsxCss(bsxCustomId(key))}"]`);
    return el ? el.closest("body > *") : null;
  }
  if (key === "video" || key.indexOf("site:") === 0) return null;
  return bshellFindSectionRoot(doc, key);
}
function bsxBuildMap() {
  const doc = bsxDoc();
  const m = { keys: [], rootOf: new Map(), keyOfTop: new Map(), firstBlockIdx: -1 };
  if (!doc || !doc.body) { bsxMap = m; return m; }
  bsxVisibleKeys().forEach((key) => {
    const r = bsxRootOf(doc, key);
    if (r && !m.keyOfTop.has(r)) { m.keys.push(key); m.rootOf.set(key, r); m.keyOfTop.set(r, key); }
  });
  const firstIdx = m.keys.length ? Math.min(...m.keys.map((k) => parseInt(m.rootOf.get(k).getAttribute("data-bshell-top"), 10))) : -1;
  m.firstBlockIdx = firstIdx;
  const v = doc.querySelector(".site-video-wrap");
  if (v) {
    const top = v.closest("body > *");
    if (top && !m.keyOfTop.has(top)) { m.rootOf.set("video", top); m.keyOfTop.set(top, "video"); }
  }
  Array.from(doc.body.children).forEach((el) => {
    if (!el.hasAttribute("data-bshell-top") || m.keyOfTop.has(el) || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName) || el.id === "deskkit-badge") return;
    const key = "site:" + el.getAttribute("data-bshell-top");
    m.keyOfTop.set(el, key);
    m.rootOf.set(key, el);
  });
  bsxMap = m;
  return m;
}
function bsxSectionLabel(key) {
  if (!key) return "";
  if (key === "video") return bsL("סרטון", "Video");
  if (key.indexOf("site:") === 0) {
    const idx = parseInt(key.slice(5), 10);
    return (bsxMap.firstBlockIdx === -1 || idx < bsxMap.firstBlockIdx) ? bsL("ראש האתר", "Site header") : bsL("תחתית האתר", "Site footer");
  }
  if (bsxIsCustom(key)) {
    const s = bsxSecData(key);
    const e = s && bsxLibEntry(s.type);
    if (e) return bsxLoc(e.label);
    if (typeof siteBlockLabel === "function") { try { const l = siteBlockLabel(siteState.template, key, siteState.data); if (l) return bsxLoc(l); } catch (err) { /* generic */ } }
    return bsL("חלק", "Section");
  }
  if (key === "hero") return bsL("פתיח", "Hero");
  if (key === "services") return bsxCap(bshellItemWord()[1]);
  const def = (SITE_BLOCK_DEFS[siteState.template] || {})[key];
  return def ? bsLabel(def.label) || key : key;
}
function bsxCap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ---------- What is under the pointer / was clicked ----------
   A descriptor: { kind, el, secKey, label, loc, ... } where kind is
   text | button | image | contact | item | video | section. Markers from
   the section library / templates win (data-dk-*); the template's own
   data-textkey / data-svc-idx come next; then a few safe heuristics for
   things older templates render without markers (the hero photo by its
   src, the hero button by its link, contact details by their value). */
function bsxResolve(target) {
  if (target && target.nodeType !== 1) target = target.parentElement;
  if (!target || !target.closest) return null;
  if (target.closest("#deskkit-badge")) return null;
  const top = target.closest("body > *");
  if (!top || /^(SCRIPT|STYLE)$/.test(top.tagName)) return null;
  const secKey = bsxMap.keyOfTop.get(top);
  if (!secKey) return null;
  const d = siteState.data;
  const base = (kind, el, extra) => Object.assign({ kind, el, secKey }, extra || {});
  const inTop = (el) => el && top.contains(el) ? el : null;

  const btnEl = inTop(target.closest("[data-dk-btn]"));
  const imgEl = inTop(target.closest("[data-dk-img]"));
  const bindEl = inTop(target.closest("[data-dk-bind]"));
  const itemEl = inTop(target.closest("[data-dk-item]"));
  const fieldEl = inTop(target.closest("[data-dk-field]"));
  const secEl = inTop(target.closest("[data-dk-sec]"));
  const textEl = inTop(target.closest("[data-textkey]"));
  const svcEl = inTop(target.closest("[data-svc-idx]")) || (typeof SITE_GROUP_GRID === "string" ? inTop(bsxGridCardOf(target)) : null);
  const secId = secEl ? secEl.getAttribute("data-dk-sec") : null;
  const videoEl = inTop(target.closest("[data-dk-video]"));

  if (btnEl) {
    const path = btnEl.getAttribute("data-dk-btn");
    const bsec = btnEl.closest("[data-dk-sec]");
    return base("button", btnEl, bsec ? { secId: bsec.getAttribute("data-dk-sec"), path } : { btn: path });
  }
  if (imgEl) {
    const path = imgEl.getAttribute("data-dk-img");
    const isec = imgEl.closest("[data-dk-sec]");
    return base("image", imgEl, isec ? { secId: isec.getAttribute("data-dk-sec"), path } : { img: path });
  }
  if (videoEl && secId) return base("video", videoEl, { secId, path: videoEl.getAttribute("data-dk-video") || "url" });
  if (bindEl) return base("contact", bindEl, { bind: bindEl.getAttribute("data-dk-bind") });
  if (itemEl && secId) {
    const f = fieldEl && itemEl.contains(fieldEl) ? fieldEl : null;
    return base("item", itemEl, { secId, itemPath: itemEl.getAttribute("data-dk-item"), fieldEl: f, field: f ? f.getAttribute("data-dk-field") : null });
  }
  if (fieldEl && secId) return base("text", fieldEl, { secId, path: fieldEl.getAttribute("data-dk-field") });
  if (textEl && BSHELL_TEXT_CONTENT_MAP[textEl.dataset.textkey]) return base("text", textEl, { key: textEl.dataset.textkey });
  if (svcEl) {
    const shown = svcEl.hasAttribute("data-svc-idx") ? parseInt(svcEl.getAttribute("data-svc-idx"), 10) : parseInt(svcEl.dataset.bshellGridIdx, 10);
    const f = bsxServiceFieldOf(svcEl, target, shown);
    return base("item", svcEl, { svc: shown, fieldEl: f ? f.el : null, field: f ? f.field : null });
  }
  // A photo the template renders from the project's images.
  const img = target.tagName === "IMG" ? target : null;
  if (img) {
    const src = img.getAttribute("src") || "";
    if (src && src === d.heroImage && !(d.heroImages && d.heroImages.length)) return base("image", img, { img: "hero" });
    const gi = (d.heroImages || []).indexOf(src);
    if (gi !== -1) return base("image", img, { img: "gallery." + gi });
    if (src && src === d.logo) return base("image", img, { img: "logo" });
  }
  const link = target.closest("a[href]");
  // The hero's main button (the template's own call-to-action link).
  if (link && top.contains(link) && secKey === "hero") {
    const cta = bsxHeroCta();
    if (cta && link.getAttribute("href") === cta.href) return base("button", link, { btn: "heroCta" });
  }
  if (link && top.contains(link)) {
    const href = link.getAttribute("href") || "";
    if (/^tel:/i.test(href)) return base("contact", link, { bind: "phone" });
    if (/^mailto:/i.test(href)) return base("contact", link, { bind: "email" });
    if (/wa\.me\//i.test(href)) return base("contact", link, { bind: "whatsapp" });
  }
  // A plain "טלפון: 050-..." line.
  const leaf = bsxContactLeaf(target);
  if (leaf) return base("contact", leaf.el, { bind: leaf.bind });
  const video = target.closest(".site-video-wrap");
  if (video && top.contains(video) && !secId) return base("video", video, {});
  return base("section", top, {});
}
function bsxGridCardOf(el) {
  if (typeof SITE_GROUP_GRID !== "string") return null;
  const card = el.closest && el.closest(SITE_GROUP_GRID);
  if (!card || card.closest("[data-svc-idx]") || card.closest("[data-dk-sec]")) return null;
  card.dataset.bshellGridIdx = String(Array.prototype.indexOf.call(card.parentElement.children, card));
  return card;
}
function bsxHeroCta() {
  if (typeof primaryCtaHref !== "function") return null;
  try { return primaryCtaHref(siteState.data, "index"); } catch (e) { return null; }
}
function bsxContactLeaf(target) {
  const d = siteState.data;
  let el = target;
  for (let depth = 0; el && depth < 3; depth++, el = el.parentElement) {
    if (!el || el === el.ownerDocument.body || el.parentElement === el.ownerDocument.body) break;
    if (el.childElementCount > 2) break;
    const text = (el.textContent || "").trim();
    if (!text || text.length > 140) continue;
    for (const k of ["phone", "email", "address"]) {
      const v = String(d[k] || "").trim();
      if (v && text.indexOf(v) !== -1) return { el, bind: k };
    }
  }
  return null;
}
/* Which text of a service card was clicked: its name, description or
   price (the card shows dd._services[shown], so the match is exact). */
function bsxServiceFieldOf(card, target, shown) {
  const dd = withFallback(siteState.data);
  const s = (dd._services || [])[shown];
  if (!s) return null;
  let el = target;
  while (el && el !== card.parentElement) {
    const text = (el.textContent || "").trim();
    if (el.childElementCount === 0 || el === target) {
      for (const f of ["name", "desc", "price"]) {
        if (s[f] && text === String(s[f]).trim()) return { el, field: f };
      }
    }
    if (el === card) break;
    el = el.parentElement;
  }
  return null;
}

/* Stable way back to the same element after the canvas re-renders. */
function bsxLocatorFor(el, secKey) {
  const root = bsxMap.rootOf.get(secKey);
  if (!root || !el) return { secKey };
  if (el === root) return { secKey };
  const attrs = ["data-dk-field", "data-dk-btn", "data-dk-img", "data-dk-video", "data-dk-item", "data-dk-bind", "data-textkey", "data-svc-idx"];
  for (const a of attrs) {
    if (el.hasAttribute(a)) {
      const sel = `[${a}="${bsxCss(el.getAttribute(a))}"]`;
      const list = (root.matches(sel) ? [root] : []).concat(Array.from(root.querySelectorAll(sel)));
      return { secKey, sel, nth: Math.max(0, list.indexOf(el)) };
    }
  }
  const path = [];
  let n = el;
  while (n && n !== root && n.parentElement) { path.unshift(Array.prototype.indexOf.call(n.parentElement.children, n)); n = n.parentElement; }
  return n === root ? { secKey, path } : { secKey };
}
function bsxLocate(loc) {
  if (!loc) return null;
  const root = bsxMap.rootOf.get(loc.secKey);
  if (!root) return null;
  if (loc.sel) {
    const list = (root.matches(loc.sel) ? [root] : []).concat(Array.from(root.querySelectorAll(loc.sel)));
    return list[loc.nth] || list[0] || null;
  }
  if (loc.path) {
    let n = root;
    for (const i of loc.path) { n = n && n.children[i]; }
    return n || null;
  }
  return root;
}

/* ---------- Labels for the hover/selection chip ---------- */
function bsxLabelOf(desc) {
  if (!desc) return "";
  const word = bshellItemWord();
  switch (desc.kind) {
    case "text": {
      if (desc.key) return BSHELL_TEXT_CONTENT_MAP[desc.key].label;
      return /^H[1-6]$/.test(desc.el.tagName) ? bsL("כותרת", "Heading") : bsL("טקסט", "Text");
    }
    case "button": return bsL("כפתור", "Button");
    case "image": return desc.img === "logo" ? bsL("לוגו", "Logo") : bsL("תמונה", "Image");
    case "contact": return { phone: bsL("טלפון", "Phone"), email: bsL("מייל", "Email"), address: bsL("כתובת", "Address"), whatsapp: bsL("וואטסאפ", "WhatsApp") }[desc.bind] || bsL("פרט קשר", "Contact detail");
    case "item": return desc.svc != null ? `${word[0]} ${desc.svc + 1}` : bsL("פריט", "Item");
    case "video": return bsL("סרטון", "Video");
    default: return bsxSectionLabel(desc.secKey);
  }
}

/* ---------- Selection ---------- */
function bsxSelect(desc, opts) {
  opts = opts || {};
  if (bsxEdit && (!desc || desc.el !== bsxEdit.el)) bsxCommitEdit();
  if (!desc) { bsxDeselect(); return; }
  desc.loc = bsxLocatorFor(desc.el, desc.secKey);
  if (desc.fieldEl) desc.fieldLoc = bsxLocatorFor(desc.fieldEl, desc.secKey);
  desc.label = bsxLabelOf(desc);
  bsxSel = desc;
  bsxClosePopover();
  bsxRenderElTools();
  if (typeof bsxOnSelectionChanged === "function") bsxOnSelectionChanged();
  if (opts.edit !== false) {
    if (desc.kind === "text") bsxStartTextEdit(desc);
    else if (desc.kind === "item" && desc.fieldEl) bsxStartItemFieldEdit(desc);
  }
  if (opts.scroll) bsxScrollIntoView(desc.el);
  bsxDraw();
}
function bsxDeselect() {
  bsxCommitEdit();
  bsxSel = null;
  bsxClosePopover();
  bsxRenderElTools();
  if (typeof bsxOnSelectionChanged === "function") bsxOnSelectionChanged();
  bsxDraw();
}
function bsxSelectSection(key, opts) {
  const root = bsxMap.rootOf.get(key);
  if (!root) { bsxDeselect(); return false; }
  bsxSelect({ kind: "section", el: root, secKey: key }, Object.assign({ edit: false }, opts || {}));
  return true;
}
function bsxScrollIntoView(el) {
  if (!el || !el.isConnected) return;
  try { el.scrollIntoView({ behavior: bsxReducedMotion() ? "auto" : "smooth", block: "center" }); } catch (e) { el.scrollIntoView(); }
}
function bsxReducedMotion() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

/* After every re-render: rebuild the map, find the selected element again
   (or drop a selection whose element is gone), redraw. */
function bsxOnCanvasUpdated() {
  const cdoc = bsxDoc();
  // FAQ answers sit in <details>: open in the editor so they can be edited.
  if (cdoc) cdoc.querySelectorAll("details:not([open])").forEach((el) => { el.open = true; });
  bsxBuildMap();
  if (bsxSel) {
    const el = bsxLocate(bsxSel.loc);
    if (el) {
      bsxSel.el = el;
      if (bsxSel.fieldLoc) bsxSel.fieldEl = bsxLocate(bsxSel.fieldLoc);
    } else if (bsxSel.kind === "contact" && bsxSel.lastRect) {
      bsxSel.el = null; // keep the toolbar where it was while the value is being typed
    } else {
      bsxSel = null;
      bsxRenderElTools();
      if (typeof bsxOnSelectionChanged === "function") bsxOnSelectionChanged();
    }
  }
  if (bsxHover && !(bsxHover.el && bsxHover.el.isConnected)) bsxHover = null;
  bsxDraw();
}

/* ---------- Pointer handling in the canvas ---------- */
let bsxDownHandled = false;
function bsxOnCanvasDown(e) {
  bsxDownHandled = false;
  if (e.button !== 0) return;
  if (bsxEdit && bsxEdit.el.contains(e.target)) return; // caret placement inside the text being edited
  const desc = bsxResolve(e.target);
  if (!desc) { bsxDeselect(); bsxDownHandled = true; return; }
  // Texts become editable on mousedown so the browser puts the caret
  // exactly where the click landed.
  if (desc.kind === "text" || (desc.kind === "item" && desc.fieldEl)) {
    bsxSelect(desc);
    bsxDownHandled = true;
    return;
  }
  e.preventDefault(); // no text selection / focus on links while selecting
}
function bsxOnCanvasClick(e) {
  // Nothing in the canvas ever navigates, dials, submits or opens.
  const editingHere = bsxEdit && bsxEdit.el.contains(e.target);
  e.preventDefault();
  e.stopPropagation();
  if (editingHere || bsxDownHandled) { bsxDownHandled = false; return; }
  const desc = bsxResolve(e.target);
  if (!desc) { bsxDeselect(); return; }
  if (bsxSel && bsxSel.kind !== "section" && desc.kind === "section" && bsxSel.secKey === desc.secKey && bsxSel.el === desc.el) return;
  bsxSelect(desc);
}
let bsxMoveRaf = 0, bsxMoveTarget = null;
let bsxPointer = null; // last pointer position inside the canvas (canvas coordinates)
function bsxOnCanvasMove(e) {
  bsxMoveTarget = e.target;
  bsxPointer = { x: e.clientX, y: e.clientY };
  if (bsxMoveRaf) return;
  bsxMoveRaf = requestAnimationFrame(() => {
    bsxMoveRaf = 0;
    clearTimeout(bsxHoverClearTimer);
    if (bsxDrag) return;
    bsxHover = bsxResolve(bsxMoveTarget);
    if (bsxHover) bsxHover.label = bsxLabelOf(bsxHover);
    bsxDraw();
  });
}
function bsxScheduleHoverClear() {
  clearTimeout(bsxHoverClearTimer);
  bsxHoverClearTimer = setTimeout(() => {
    if (bsxPointerOverTools) return;
    bsxHover = null;
    bsxDraw();
  }, 350);
}

/* ---------- Overlay: outlines, chips, toolbars, "+" buttons ----------
   Drawn in the editor page on top of the canvas (never inside the site's
   own document), re-measured every frame while anything is shown so it
   follows scrolling, animations and typing. */
const bsxOv = {};
function bsxWireOverlay() {
  const ov = document.getElementById("bsx-overlay");
  const mk = (cls, tag) => { const el = document.createElement(tag || "div"); el.className = "bsx-ov " + cls; el.hidden = true; ov.appendChild(el); return el; };
  bsxOv.secBox = mk("bsx-box is-sec");
  bsxOv.secChip = mk("bsx-chip is-sec");
  bsxOv.hoverBox = mk("bsx-box is-hover");
  bsxOv.hoverChip = mk("bsx-chip");
  bsxOv.selBox = mk("bsx-box is-sel");
  bsxOv.selChip = mk("bsx-chip");
  bsxOv.lineTop = mk("bsx-insert-line");
  bsxOv.lineBottom = mk("bsx-insert-line");
  bsxOv.insTop = mk("bsx-insert", "button");
  bsxOv.insBottom = mk("bsx-insert", "button");
  [bsxOv.insTop, bsxOv.insBottom].forEach((b) => {
    b.type = "button";
    b.innerHTML = bsxIcon("plus") + `<span>${bsL("הוספת חלק", "Add section")}</span>`;
    b.addEventListener("click", (e) => { e.stopPropagation(); if (typeof bsxOpenAddSection === "function") bsxOpenAddSection(parseInt(b.dataset.at, 10)); });
  });
  bsxOv.secTools = mk("bsx-tools bsx-sectools");
  bsxOv.secTools.setAttribute("role", "toolbar");
  bsxOv.elTools = mk("bsx-tools");
  bsxOv.elTools.setAttribute("role", "toolbar");
  bsxOv.drop = mk("bsx-drop-line");
  bsxOv.ghost = mk("bsx-drag-ghost");
  [bsxOv.secTools, bsxOv.elTools, bsxOv.insTop, bsxOv.insBottom].forEach((el) => {
    el.addEventListener("mouseenter", () => { bsxPointerOverTools = true; clearTimeout(bsxHoverClearTimer); });
    el.addEventListener("mouseleave", () => { bsxPointerOverTools = false; bsxScheduleHoverClear(); });
  });
  bsxOv.secTools.addEventListener("click", bsxOnSecToolsClick);
  bsxOv.secTools.addEventListener("pointerdown", bsxOnSecToolsPointerDown);
  bsxOv.secTools.addEventListener("keydown", bsxOnSecToolsKey);
  bsxOv.elTools.addEventListener("click", bsxOnElToolsClick);
  bsxOv.elTools.addEventListener("mousedown", (e) => { if (!e.target.closest("input, select, textarea")) e.preventDefault(); });
  new ResizeObserver(() => bsxDraw()).observe(document.getElementById("bsx-stage"));
}
let bsxLoopOn = false;
function bsxStartLoop() {
  if (bsxLoopOn) return;
  bsxLoopOn = true;
  const tick = () => {
    if (!bshellActiveFlag) { bsxLoopOn = false; return; }
    if (bsxSel || bsxHover || bsxDrag) bsxDraw();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function bsxGeom() {
  const stage = document.getElementById("bsx-stage");
  const f = bsxFrame();
  if (!stage || !f) return null;
  const s = stage.getBoundingClientRect();
  const fr = f.getBoundingClientRect();
  return { s, fr, vis: { x0: fr.left - s.left, y0: fr.top - s.top, x1: fr.right - s.left, y1: fr.bottom - s.top }, w: s.width, h: s.height };
}
function bsxRectIn(g, el) {
  if (!el || !el.isConnected || !el.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return { x: g.vis.x0 + r.left, y: g.vis.y0 + r.top, w: r.width, h: r.height };
}
function bsxClip(g, r) {
  const x0 = Math.max(r.x, g.vis.x0), y0 = Math.max(r.y, g.vis.y0);
  const x1 = Math.min(r.x + r.w, g.vis.x1), y1 = Math.min(r.y + r.h, g.vis.y1);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function bsxPlace(el, r) {
  el.hidden = !r;
  if (!r) return;
  el.style.left = r.x + "px"; el.style.top = r.y + "px";
  el.style.width = r.w + "px"; el.style.height = r.h + "px";
}
function bsxDraw() {
  if (!bsxOv.selBox) return;
  const g = bsxGeom();
  const previewing = document.getElementById("bshell-root").classList.contains("is-previewing");
  const hideAll = () => Object.values(bsxOv).forEach((el) => { el.hidden = true; });
  if (!g || previewing) { hideAll(); return; }
  const uiRtl = bsxSiteDirIsRtlUi();

  // Selected element
  let selRect = null;
  if (bsxSel) {
    const r = bsxSel.el ? bsxRectIn(g, bsxSel.el) : bsxSel.lastRect || null;
    if (r && bsxSel.el) bsxSel.lastRect = r;
    selRect = r ? bsxClip(g, r) : null;
    const isSec = bsxSel.kind === "section";
    bsxPlace(bsxOv.selBox, isSec ? null : selRect);
    bsxOv.selBox.classList.toggle("is-editing", !!bsxEdit);
    if (!isSec && selRect && bsxSel.label && !bsxOv.elTools.childElementCount) {
      bsxOv.selChip.hidden = false;
      bsxOv.selChip.textContent = bsxSel.label;
      bsxChipAt(bsxOv.selChip, selRect, g, uiRtl);
      bsxOv.selChip.classList.toggle("is-global", bsxSel.kind === "contact");
    } else bsxOv.selChip.hidden = true;
  } else { bsxOv.selBox.hidden = true; bsxOv.selChip.hidden = true; }

  // Hovered element (not the selected one)
  const hv = bsxHover && !bsxDrag ? bsxHover : null;
  if (hv && hv.kind !== "section" && !(bsxSel && bsxSel.el === hv.el)) {
    const r = bsxRectIn(g, hv.el);
    const c = r ? bsxClip(g, r) : null;
    bsxPlace(bsxOv.hoverBox, c);
    if (c && !(bsxSel && bsxSel.kind !== "section" && selRect && Math.abs(selRect.y - c.y) < 24)) {
      bsxOv.hoverChip.hidden = false;
      bsxOv.hoverChip.textContent = hv.label || bsxLabelOf(hv);
      bsxChipAt(bsxOv.hoverChip, c, g, uiRtl);
    } else bsxOv.hoverChip.hidden = true;
  } else { bsxOv.hoverBox.hidden = true; bsxOv.hoverChip.hidden = true; }

  // Section frame: the hovered section, else the selected one's.
  let secKey = bsxDrag ? null : (hv ? hv.secKey : (bsxSel ? bsxSel.secKey : null));
  if (hv && bsxSel && hv.secKey !== bsxSel.secKey) {
    // a hovered section scrolled out of view: show the selected one's tools
    const hr = bsxMap.rootOf.get(hv.secKey);
    const hrr = hr ? bsxRectIn(g, hr) : null;
    if (!hrr || !bsxClip(g, hrr)) secKey = bsxSel.secKey;
  }
  const secRoot = secKey ? bsxMap.rootOf.get(secKey) : null;
  const secR = secRoot ? bsxRectIn(g, secRoot) : null;
  const secC = secR ? bsxClip(g, secR) : null;
  bsxPlace(bsxOv.secBox, secC);
  bsxOv.secBox.classList.toggle("is-sel", !!(bsxSel && bsxSel.kind === "section" && bsxSel.secKey === secKey));
  if (secC) {
    bsxOv.secChip.hidden = false;
    bsxOv.secChip.textContent = bsxSectionLabel(secKey);
    const cw = bsxOv.secChip.offsetWidth || 80;
    bsxOv.secChip.style.top = secC.y + "px";
    bsxOv.secChip.style.left = (uiRtl ? secC.x + secC.w - cw : secC.x) + "px";
    if (bsxOv.secTools.dataset.key !== secKey || bsxOv.secTools.dataset.v !== bsxSecToolsVersion(secKey)) bsxRenderSecTools(secKey);
    bsxOv.secTools.hidden = false;
    const tw = bsxOv.secTools.offsetWidth, th = bsxOv.secTools.offsetHeight;
    let ty = secC.y + 8;
    if (secC.h < th + 16) ty = secC.y + Math.max(0, (secC.h - th) / 2);
    const tx = uiRtl ? secC.x + 8 : secC.x + secC.w - tw - 8;
    bsxOv.secTools.style.top = ty + "px";
    bsxOv.secTools.style.left = Math.max(g.vis.x0 + 4, tx) + "px";
  } else { bsxOv.secChip.hidden = true; bsxOv.secTools.hidden = true; }

  // "+" between sections (blocks only, and only when sections can be added)
  const visIdx = secKey ? bsxMap.keys.indexOf(secKey) : -1;
  const canAdd = bsxLibOn() && bsxAvailableTypes().length > 0;
  const placeIns = (btn, line, y, at) => {
    if (!canAdd || visIdx === -1 || !secR || y < g.vis.y0 + 2 || y > g.vis.y1 - 2) { btn.hidden = true; line.hidden = true; return; }
    btn.hidden = false;
    btn.dataset.at = String(at);
    btn.style.top = y + "px";
    btn.style.left = (secC.x + secC.w / 2) + "px";
    btn.setAttribute("aria-label", bsL("הוספת חלק כאן", "Add a section here"));
    line.hidden = false;
    line.style.top = (y - 1) + "px";
    line.style.left = secC.x + "px";
    line.style.width = secC.w + "px";
  };
  placeIns(bsxOv.insTop, bsxOv.lineTop, secR ? secR.y : 0, visIdx);
  placeIns(bsxOv.insBottom, bsxOv.lineBottom, secR ? secR.y + secR.h : 0, visIdx + 1);
  if (!bsxOv.insTop.hidden && !bsxOv.secTools.hidden) {
    // keep the "+" off the section toolbar
    const tt = parseFloat(bsxOv.secTools.style.top);
    if (Math.abs(tt - parseFloat(bsxOv.insTop.style.top)) < 30 && secC && secC.y > g.vis.y0 + 2) bsxOv.secTools.style.top = (secC.y + 22) + "px";
  }

  // Element toolbar
  if (bsxSel && bsxSel.kind !== "section" && selRect && bsxOv.elTools.childElementCount) {
    bsxOv.elTools.hidden = false;
    const tw = bsxOv.elTools.offsetWidth, th = bsxOv.elTools.offsetHeight;
    let ty = selRect.y - th - 12;
    if (ty < g.vis.y0 + 4) ty = selRect.y + selRect.h + 12;
    if (ty + th > g.h - 76) ty = Math.max(g.vis.y0 + 4, selRect.y - th - 12);
    if (ty < 4) ty = 4;
    let tx = uiRtl ? selRect.x + selRect.w - tw : selRect.x;
    tx = Math.max(8, Math.min(tx, g.w - tw - 8));
    bsxOv.elTools.style.top = ty + "px";
    bsxOv.elTools.style.left = tx + "px";
  } else bsxOv.elTools.hidden = true;

  if (!bsxDrag) { bsxOv.drop.hidden = true; bsxOv.ghost.hidden = true; }
}
function bsxChipAt(chip, r, g, uiRtl) {
  const cw = chip.offsetWidth || 60;
  let x = uiRtl ? r.x + r.w - cw : r.x;
  x = Math.max(4, Math.min(x, g.w - cw - 4));
  chip.style.left = x + "px";
  chip.style.top = (r.y < g.vis.y0 + 24 ? r.y + 24 : r.y) + "px";
}

/* ---------- Section toolbar ---------- */
function bsxSecToolsVersion(key) {
  const vis = bsxMap.keys;
  return [vis.indexOf(key), vis.length, bsxLibOn() ? 1 : 0].join(",");
}
function bsxVariantChoices(key) {
  if (bsxIsCustom(key)) {
    const s = bsxSecData(key);
    const e = s && bsxLibEntry(s.type);
    const v = e && e.variants ? Object.keys(e.variants) : [];
    return v.length > 1 && typeof siteSectionSetVariant === "function" ? v : [];
  }
  if (!bsxIsBlockKey(key) || typeof variantOptionsFor !== "function") return [];
  const o = variantOptionsFor(siteState.template, key);
  return o ? Object.keys(o) : [];
}
function bsxRenderSecTools(key) {
  const el = bsxOv.secTools;
  el.dataset.key = key;
  el.dataset.v = bsxSecToolsVersion(key);
  const b = (act, icon, label, extra) => `<button type="button" class="bsx-icon-btn" data-sec="${act}" title="${bsxEsc(label)}" aria-label="${bsxEsc(label)}"${extra || ""}>${bsxIcon(icon)}</button>`;
  const label = bsxSectionLabel(key);
  if (!bsxIsBlockKey(key)) {
    const parts = [b("settings", "settings", bsL("הגדרות", "Settings"))];
    if (key === "video") parts.push(b("remove-video", "trash", bsL("הסרת הסרטון", "Remove the video")));
    el.innerHTML = parts.join("");
    el.setAttribute("aria-label", label);
    return;
  }
  const vis = bsxMap.keys;
  const i = vis.indexOf(key);
  const custom = bsxIsCustom(key);
  const parts = [
    `<button type="button" class="bsx-grip" data-sec="drag" title="${bsxEsc(bsL("גררו כדי להזיז (או חיצים במקלדת)", "Drag to move (or arrow keys)"))}" aria-label="${bsxEsc(bsL("הזזת החלק", "Move section"))}: ${bsxEsc(label)}">${bsxIcon("grip")}</button>`,
    b("up", "up", bsL("הזזה למעלה", "Move up"), i <= 0 ? " disabled" : ""),
    b("down", "down", bsL("הזזה למטה", "Move down"), i >= vis.length - 1 ? " disabled" : ""),
  ];
  if (bsxVariantChoices(key).length > 1) parts.push(`<span class="bsx-tools-sep"></span>`, `<button type="button" class="bsx-tool-txt" data-sec="variant" title="${bsxEsc(bsL("בחירת עיצוב אחר לחלק", "Pick another design for this section"))}">${bsxIcon("palette")}<span>${bsL("עיצוב", "Design")}</span></button>`);
  parts.push(`<span class="bsx-tools-sep"></span>`);
  if (custom && typeof siteSectionDuplicate === "function") parts.push(b("duplicate", "copy", bsL("שכפול", "Duplicate")));
  parts.push(custom ? b("delete", "trash", bsL("מחיקת החלק", "Delete section")) : b("hide", "eyeOff", bsL("הסתרת החלק", "Hide section")));
  parts.push(b("settings", "settings", bsL("הגדרות החלק", "Section settings")));
  el.innerHTML = parts.join("");
  el.setAttribute("aria-label", label);
}
function bsxOnSecToolsClick(e) {
  const btn = e.target.closest("[data-sec]");
  if (!btn || btn.disabled) return;
  e.stopPropagation();
  const key = bsxOv.secTools.dataset.key;
  const act = btn.dataset.sec;
  if (act === "drag") return;
  bsxSectionAction(key, act);
}
function bsxSectionAction(key, act) {
  if (!key) return;
  const vis = bsxMap.keys;
  const i = vis.indexOf(key);
  if (act === "up") bsxMoveSection(key, i - 1);
  else if (act === "down") bsxMoveSection(key, i + 1);
  else if (act === "variant") { if (typeof bsxOpenVariantPicker === "function") bsxOpenVariantPicker(key); }
  else if (act === "duplicate") bsxDuplicateSection(key);
  else if (act === "delete") bsxDeleteSection(key);
  else if (act === "hide") bsxHideSection(key);
  else if (act === "remove-video") bsxRemoveBuiltinVideo();
  else if (act === "settings") {
    if (key.indexOf("site:") === 0) { bsxSelectSection(key); bsxOpenPanel("chrome"); }
    else if (key === "video") { bsxSelectSection(key); bsxOpenPanel("video"); }
    else { bsxSelectSection(key); bsxOpenPanel("section"); }
  }
}
function bsxOnSecToolsKey(e) {
  const grip = e.target.closest('[data-sec="drag"]');
  if (!grip) return;
  const key = bsxOv.secTools.dataset.key;
  const i = bsxMap.keys.indexOf(key);
  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    e.preventDefault();
    bsxMoveSection(key, e.key === "ArrowUp" ? i - 1 : i + 1, { refocusGrip: true });
  }
}

/* ---------- Section operations ---------- */
function bsxMoveKeyFallback(d, key, toVis) {
  const order = ensureBlockOrder(d, siteState.template, "index");
  const vis = activeBlocksForPage(d, siteState.template, "index");
  if (!order || order.indexOf(key) === -1) return;
  const rest = vis.filter((k) => k !== key);
  toVis = Math.max(0, Math.min(toVis, rest.length));
  order.splice(order.indexOf(key), 1);
  if (toVis >= rest.length) {
    const last = rest[rest.length - 1];
    order.splice(last ? order.indexOf(last) + 1 : order.length, 0, key);
  } else order.splice(order.indexOf(rest[toVis]), 0, key);
}
function bsxMoveSection(key, toVis, opts) {
  const vis = bsxMap.keys;
  const from = vis.indexOf(key);
  if (from === -1 || toVis < 0 || toVis > vis.length - 1 || toVis === from) return;
  bsxCommitEdit();
  bshellSnapshot();
  const d = siteState.data;
  if (typeof siteSectionMove === "function") siteSectionMove(d, siteState.template, "index", key, toVis);
  else bsxMoveKeyFallback(d, key, toVis);
  bshellScheduleSave();
  bshellRenderCanvas(() => {
    bsxSelectSection(key, { scroll: true });
    if (opts && opts.refocusGrip) {
      bsxRenderSecTools(key);
      bsxDraw();
      const g = bsxOv.secTools.querySelector('[data-sec="drag"]');
      if (g) g.focus();
    }
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
    bsxAnnounce(bsL(`החלק הוזז למקום ${toVis + 1}`, `Section moved to position ${toVis + 1}`));
  });
}
function bsxDuplicateSection(key) {
  if (!bsxIsCustom(key) || typeof siteSectionDuplicate !== "function") return;
  bsxCommitEdit();
  bshellSnapshot();
  const newKey = siteSectionDuplicate(siteState.data, siteState.template, "index", key);
  bshellScheduleSave();
  bshellRenderCanvas(() => {
    if (newKey) bsxSelectSection(newKey, { scroll: true });
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
  });
  bsxToast(bsL("החלק שוכפל", "Section duplicated"));
}
function bsxSectionHasContent(key) {
  const s = bsxSecData(key);
  if (!s) return false;
  const walk = (v) => {
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some(walk);
    if (v && typeof v === "object") return Object.keys(v).some((k) => walk(v[k]));
    return false;
  };
  return walk(s.content);
}
async function bsxDeleteSection(key) {
  if (!bsxIsCustom(key)) return bsxHideSection(key);
  if (typeof siteSectionRemove !== "function") return;
  bsxCommitEdit();
  if (bsxSectionHasContent(key)) {
    const ok = await bsxConfirm({
      title: bsL("למחוק את החלק?", "Delete this section?"),
      text: bsL(`"${bsxSectionLabel(key)}" וכל התוכן שבו יימחקו מהאתר. אפשר לבטל מיד אחר כך.`, `"${bsxSectionLabel(key)}" and everything in it will be removed. You can undo right after.`),
      ok: bsL("מחיקה", "Delete"), danger: true,
    });
    if (!ok) return;
  }
  bshellSnapshot();
  siteSectionRemove(siteState.data, siteState.template, "index", key);
  bsxAfterStructural();
  bsxToast(bsL("החלק נמחק", "Section deleted"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
}
function bsxHideSection(key) {
  if (!bsxIsBlockKey(key) || bsxIsCustom(key)) return;
  bsxCommitEdit();
  bshellSnapshot();
  bshellSetBuiltinVisible(key, false);
  bsxAfterStructural();
  bsxToast(bsL("החלק הוסתר — אפשר להחזיר אותו ממבנה האתר", "Section hidden — bring it back from Site structure"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
}
function bsxShowSection(key) {
  bsxCommitEdit();
  bshellSnapshot();
  bshellSetBuiltinVisible(key, true);
  bshellScheduleSave();
  bshellRenderCanvas(() => {
    bsxSelectSection(key, { scroll: true });
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
  });
}
function bsxAfterStructural(after) {
  bsxSel = null;
  bsxHover = null;
  bsxRenderElTools();
  if (typeof bsxOnSelectionChanged === "function") bsxOnSelectionChanged();
  bshellScheduleSave();
  bshellRenderCanvas(() => {
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
    if (after) after();
  });
}
function bsxRemoveBuiltinVideo() {
  if (!siteState.data.videoUrl) return;
  bsxCommitEdit();
  bshellSnapshot();
  siteState.data.videoUrl = "";
  siteState.data.heroVideoBg = false;
  bsxAfterStructural();
  bsxToast(bsL("הסרטון הוסר", "Video removed"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
}
/* Adds a library section at a visible position, then selects it. */
function bsxInsertSection(type, variant, at) {
  if (!bsxLibOn()) return null;
  bsxCommitEdit();
  bshellSnapshot();
  const d = siteState.data;
  const id = siteSectionCreate(d, type, variant);
  if (!id) { bshellUndoStack.pop(); bshellSyncUndoButtons(); return null; }
  const key = "x:" + id;
  const vis = bsxMap.keys.length;
  siteSectionInsert(d, siteState.template, "index", key, Math.max(0, Math.min(at == null ? vis : at, vis)));
  bshellScheduleSave();
  bshellRenderCanvas(() => {
    bsxSelectSection(key, { scroll: true });
    if (typeof bsxRefreshPanel === "function") bsxRefreshPanel();
  });
  return key;
}

/* Drag & drop of a section by its handle: a shield over the canvas keeps
   the pointer events here, a teal line shows where it will land, the
   canvas scrolls near its edges. */
function bsxOnSecToolsPointerDown(e) {
  const grip = e.target.closest('[data-sec="drag"]');
  if (!grip || e.button !== 0) return;
  e.preventDefault();
  const key = bsxOv.secTools.dataset.key;
  if (bsxMap.keys.indexOf(key) === -1) return;
  bsxCommitEdit();
  const stage = document.getElementById("bsx-stage");
  const shield = document.createElement("div");
  shield.className = "bsx-shield";
  stage.appendChild(shield);
  bsxDrag = { key, from: bsxMap.keys.indexOf(key), gap: null, shield, sx: e.clientX, sy: e.clientY, moved: false };
  bsxOv.ghost.textContent = bsxSectionLabel(key);
  const move = (ev) => bsxDragMove(ev.clientX, ev.clientY);
  const up = () => {
    shield.removeEventListener("pointermove", move);
    shield.removeEventListener("pointerup", up);
    shield.removeEventListener("pointercancel", up);
    bsxDragEnd();
  };
  shield.addEventListener("pointermove", move);
  shield.addEventListener("pointerup", up);
  shield.addEventListener("pointercancel", up);
  try { shield.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  bsxDragMove(e.clientX, e.clientY);
}
function bsxDragMove(cx, cy) {
  if (!bsxDrag) return;
  const g = bsxGeom();
  if (!g) return;
  if (Math.abs(cx - bsxDrag.sx) + Math.abs(cy - bsxDrag.sy) > 4) bsxDrag.moved = true;
  const y = cy - g.s.top;
  const keys = bsxMap.keys;
  let gap = keys.length;
  for (let i = 0; i < keys.length; i++) {
    const r = bsxRectIn(g, bsxMap.rootOf.get(keys[i]));
    if (r && y < r.y + r.h / 2) { gap = i; break; }
  }
  bsxDrag.gap = gap;
  const ref = gap < keys.length ? bsxRectIn(g, bsxMap.rootOf.get(keys[gap])) : bsxRectIn(g, bsxMap.rootOf.get(keys[keys.length - 1]));
  const ly = ref ? (gap < keys.length ? ref.y : ref.y + ref.h) : y;
  const lineY = Math.max(g.vis.y0 + 2, Math.min(ly, g.vis.y1 - 4));
  bsxOv.drop.hidden = false;
  bsxOv.drop.style.top = (lineY - 2) + "px";
  bsxOv.drop.style.left = (g.vis.x0 + 12) + "px";
  bsxOv.drop.style.width = (g.vis.x1 - g.vis.x0 - 24) + "px";
  bsxOv.ghost.hidden = false;
  bsxOv.ghost.style.left = (cx - g.s.left + 14) + "px";
  bsxOv.ghost.style.top = (cy - g.s.top + 10) + "px";
  ["secTools", "insTop", "insBottom", "lineTop", "lineBottom", "elTools", "hoverBox", "hoverChip"].forEach((k) => { bsxOv[k].hidden = true; });
  // auto-scroll near the canvas edges
  const win = bsxFrame().contentWindow;
  const edge = 60;
  if (cy - g.fr.top < edge) win.scrollBy(0, -18);
  else if (g.fr.bottom - cy < edge) win.scrollBy(0, 18);
}
function bsxDragEnd() {
  const drag = bsxDrag;
  bsxDrag = null;
  if (drag && drag.shield) drag.shield.remove();
  bsxOv.drop.hidden = true;
  bsxOv.ghost.hidden = true;
  if (!drag || drag.gap == null || !drag.moved) { bsxDraw(); return; }
  const to = drag.gap > drag.from ? drag.gap - 1 : drag.gap;
  if (to !== drag.from) bsxMoveSection(drag.key, to);
  else bsxDraw();
}

/* ---------- Element toolbar ---------- */
function bsxRenderElTools() {
  const el = bsxOv.elTools;
  if (!el) return;
  if (!bsxSel || bsxSel.kind === "section") { el.innerHTML = ""; el.hidden = true; return; }
  el.innerHTML = bsxElToolsHtml(bsxSel);
  el.setAttribute("aria-label", bsxSel.label || "");
  if (bsxSel.kind === "contact" || bsxSel.kind === "video") bsxWireToolsField();
}
function bsxTB(act, icon, label, extra) {
  return `<button type="button" class="bsx-icon-btn${extra && extra.cls ? " " + extra.cls : ""}" data-act="${act}" title="${bsxEsc(label)}" aria-label="${bsxEsc(label)}"${extra && extra.pressed != null ? ` aria-pressed="${extra.pressed}"` : ""}${extra && extra.disabled ? " disabled" : ""}>${bsxIcon(icon)}</button>`;
}
const BSX_SEP = '<span class="bsx-tools-sep"></span>';
function bsxElToolsHtml(sel) {
  const parent = BSX_SEP + bsxTB("parent", "parent", bsL("בחירת החלק כולו", "Select the whole section"));
  if (sel.kind === "text") return bsxTextToolsHtml(sel) + parent;
  if (sel.kind === "item") return bsxItemToolsHtml(sel) + parent;
  if (sel.kind === "image") return bsxImageToolsHtml(sel) + parent;
  if (sel.kind === "button") return bsxButtonToolsHtml(sel) + parent;
  if (sel.kind === "contact") {
    const v = bsxContactValue(sel.bind);
    const icon = { phone: "phone", email: "mail", address: "pin", whatsapp: "whatsapp" }[sel.bind] || "contact";
    const dir = sel.bind === "address" ? "" : ' dir="ltr"';
    return `<div class="bsx-tools-field">${bsxIcon(icon)}<input type="text" data-tfield="contact" value="${bsxEsc(v)}"${dir} aria-label="${bsxEsc(sel.label)}" placeholder="${bsxEsc(sel.label)}"></div>`
      + bsxTB("open-business", "settings", bsL("כל פרטי העסק", "All business details"))
      + `<div class="bsx-tools-note">${bsxIcon("globe")}<span>${bsL("פרט עסקי — מתעדכן בכל האתר", "Business detail — updates across the whole site")}</span></div>`;
  }
  if (sel.kind === "video") {
    return `<div class="bsx-tools-field">${bsxIcon("video")}<input type="url" data-tfield="video" dir="ltr" value="${bsxEsc(bsxVideoUrlOf(sel))}" placeholder="https://youtube.com/watch?v=…" aria-label="${bsxEsc(bsL("קישור לסרטון (YouTube או Vimeo)", "Video link (YouTube or Vimeo)"))}"></div>`
      + bsxTB("video-remove", "trash", bsL("הסרת הסרטון", "Remove the video"), { cls: "bsx-danger" }) + parent;
  }
  return "";
}

/* ----- text ----- */
function bsxStyleTarget(sel) {
  // { get(): style object, set(prop, value) } for the selected text
  const d = siteState.data;
  if (sel.key) {
    return {
      get: () => (d.textStyles && d.textStyles[sel.key]) || {},
      set: (prop, value) => bshellSetTextStyle(sel.key, prop, value),
      reset: () => { if (d.textStyles) delete d.textStyles[sel.key]; },
    };
  }
  if (sel.secId) {
    const sec = () => (siteState.data.sections || {})[sel.secId];
    return {
      get: () => { const s = sec(); return (s && s.styles && s.styles[sel.path]) || {}; },
      set: (prop, value) => bsxStyleWrite(sel.secId, sel.path, prop, value),
      reset: () => { const s = sec(); if (s && s.styles) { delete s.styles[sel.path]; if (!Object.keys(s.styles).length) delete s.styles; } },
    };
  }
  return null;
}
function bsxTextCaps(sel) {
  const c = bsxCaps();
  if (sel.secId) {
    const p = (c.secStyle && c.secStyle.text) || [];
    return { font: p.indexOf("font") !== -1, size: p.indexOf("size") !== -1, color: p.indexOf("color") !== -1, align: p.indexOf("align") !== -1, weight: p.indexOf("weight") !== -1, advanced: p.indexOf("lineHeight") !== -1 };
  }
  return { font: true, size: true, color: true, align: true, weight: c.textWeight, advanced: c.textAdvanced };
}
function bsxSizesFor(sel) {
  if (sel.key === "heading-heroTitle") return BSHELL_STYLE_SIZES.hero;
  if (sel.key && sel.key.indexOf("heading-") === 0) return BSHELL_STYLE_SIZES.heading;
  if (sel.key === "businessName") return BSHELL_STYLE_SIZES.name;
  if (sel.key) return BSHELL_STYLE_SIZES.body;
  const tag = sel.el && sel.el.tagName;
  if (tag === "H1") return BSHELL_STYLE_SIZES.hero;
  if (/^H[2-3]$/.test(tag)) return BSHELL_STYLE_SIZES.heading;
  if (/^H[4-6]$/.test(tag)) return BSHELL_STYLE_SIZES.name;
  return BSHELL_STYLE_SIZES.body;
}
/* "start"/"end" in the site's own direction, stored as the physical
   right/left the renderer already understands. */
function bsxAlignToStored(a) {
  const rtl = bsxSiteRtl();
  if (a === "start") return rtl ? "right" : "left";
  if (a === "end") return rtl ? "left" : "right";
  return a;
}
function bsxAlignFromStored(a) {
  if (!a) return "";
  const rtl = bsxSiteRtl();
  if (a === "center") return "center";
  if (a === "right") return rtl ? "start" : "end";
  if (a === "left") return rtl ? "end" : "start";
  return "";
}
function bsxComputed(sel) {
  const el = sel.el;
  if (!el || !el.isConnected) return {};
  const cs = el.ownerDocument.defaultView.getComputedStyle(el);
  return { color: bsxRgbToHex(cs.color), size: Math.round(parseFloat(cs.fontSize) || 0), weight: parseInt(cs.fontWeight, 10) || 400 };
}
function bsxRgbToHex(c) {
  const m = String(c || "").match(/\d+(\.\d+)?/g);
  return m ? "#" + m.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, "0")).join("") : "#000000";
}
function bsxTextToolsHtml(sel) {
  const st = bsxStyleTarget(sel);
  const s = st ? st.get() : {};
  const caps = bsxTextCaps(sel);
  const comp = bsxComputed(sel);
  const parts = [];
  if (caps.font) {
    const fname = s.font && SITE_FONTS[s.font] ? bsLabel(SITE_FONTS[s.font].name).replace(/\s*\(.*\)$/, "") : bsL("גופן", "Font");
    parts.push(`<button type="button" class="bsx-tool-txt" data-act="font" title="${bsxEsc(bsL("גופן", "Font"))}" aria-haspopup="listbox"><span>${bsxEsc(fname)}</span>${bsxIcon("caret").replace("<svg", '<svg class="bsx-caret"')}</button>`);
  }
  if (caps.size) parts.push(`<button type="button" class="bsx-tool-txt" data-act="size" title="${bsxEsc(bsL("גודל", "Size"))}" aria-haspopup="listbox"><span>${s.size ? bsxEsc(String(s.size)) : (comp.size || "")}</span>${bsxIcon("caret").replace("<svg", '<svg class="bsx-caret"')}</button>`);
  if (caps.color) parts.push(`<button type="button" class="bsx-tool-color" data-act="color" title="${bsxEsc(bsL("צבע", "Color"))}" aria-label="${bsxEsc(bsL("צבע", "Color"))}"><i style="background:${bsxEsc(s.color ? "#" + String(s.color).replace("#", "") : comp.color)}"></i></button>`);
  if (caps.weight) parts.push(bsxTB("bold", "bold", bsL("מודגש", "Bold"), { pressed: String(String(s.weight) === "700"), cls: String(s.weight) === "700" ? "is-on" : "" }));
  if (caps.align) {
    const a = bsxAlignFromStored(s.align);
    const icon = bsxAlignIcon(a || "start");
    parts.push(bsxTB("align", icon, bsL("יישור", "Alignment"), { cls: a ? "is-on" : "" }));
  }
  parts.push(BSX_SEP, bsxTB("text-more", "sliders", bsL("עוד אפשרויות עיצוב", "More style options")));
  return parts.join("");
}

/* ----- items (a service / a list item) ----- */
function bsxItemToolsHtml(sel) {
  const list = bsxItemList(sel);
  const i = list ? list.index : -1;
  const n = list ? list.count : 0;
  const word = sel.svc != null ? bshellItemWord()[0] : bsL("פריט", "Item");
  return [
    bsxTB("item-up", "up", bsL("הקדמה", "Move earlier"), { disabled: i <= 0 }),
    bsxTB("item-down", "down", bsL("הזזה אחורה", "Move later"), { disabled: i < 0 || i >= n - 1 }),
    bsxTB("item-dup", "copy", bsL(`שכפול ${word}`, `Duplicate ${word.toLowerCase()}`), { disabled: i < 0 }),
    bsxTB("item-del", "trash", bsL(`מחיקת ${word}`, `Delete ${word.toLowerCase()}`), { disabled: i < 0, cls: "bsx-danger" }),
    BSX_SEP,
    `<button type="button" class="bsx-tool-txt" data-act="item-add" title="${bsxEsc(bsL(`הוספת ${word}`, `Add ${word.toLowerCase()}`))}">${bsxIcon("plus")}<span>${bsxEsc(bsL(`${word} חדש`, `New ${word.toLowerCase()}`))}</span></button>`,
    sel.svc != null ? bsxTB("item-style", "sliders", bsL(`עיצוב כל ה${bshellItemWord()[1]}`, `Style all ${bshellItemWord()[1]}`)) : "",
  ].join("");
}

/* ----- images ----- */
function bsxImageToolsHtml(sel) {
  const info = bsxImageInfo(sel);
  const parts = [
    `<button type="button" class="bsx-tool-txt" data-act="img-replace" title="${bsxEsc(bsL("העלאת תמונה חדשה", "Upload a new image"))}">${bsxIcon("upload")}<span>${bsL("החלפה", "Replace")}</span></button>`,
    bsxTB("img-library", "gallery", bsL("בחירה מהתמונות שכבר העליתם", "Choose from images you already uploaded")),
  ];
  if (info.canStyle) parts.push(bsxTB("img-fit", "fit", info.fit === "contain" ? bsL("תמונה מלאה (לחצו למילוי המסגרת)", "Whole image (click to fill the frame)") : bsL("ממלאת את המסגרת (לחצו להצגת התמונה המלאה)", "Fills the frame (click to show the whole image)"), { pressed: String(info.fit === "contain"), cls: info.fit === "contain" ? "is-on" : "" }));
  parts.push(bsxTB("img-more", "sliders", bsL("עוד: יחס, מיקוד, תיאור", "More: ratio, focus, description")));
  if (info.canRemove) parts.push(BSX_SEP, bsxTB("img-remove", "trash", bsL("הסרת התמונה", "Remove the image"), { cls: "bsx-danger" }));
  return parts.join("");
}

/* ----- buttons ----- */
function bsxButtonToolsHtml(sel) {
  const info = bsxButtonInfo(sel);
  if (!info.editable) {
    // The template's own button: it follows the contact details.
    return `<div class="bsx-tools-note" style="flex-basis:auto">${bsxIcon("link")}<span>${bsxEsc(info.note)}</span></div>`
      + bsxTB("open-business", "edit", bsL("עריכת פרטי הקשר", "Edit contact details"));
  }
  const parts = [
    bsxTB("btn-label", "edit", bsL("עריכת הטקסט על הכפתור", "Edit the button text")),
    info.submit ? "" : `<button type="button" class="bsx-tool-txt" data-act="btn-action" title="${bsxEsc(bsL("לאן הכפתור מוביל", "Where the button leads"))}">${bsxIcon("link")}<span>${bsxEsc(bsxActionLabel(info.action))}</span></button>`,
  ];
  if (info.canStyle) {
    parts.push(`<button type="button" class="bsx-tool-color" data-act="btn-bg" title="${bsxEsc(bsL("צבע הכפתור", "Button color"))}" aria-label="${bsxEsc(bsL("צבע הכפתור", "Button color"))}"><i style="background:${bsxEsc(info.style.bg || bsxComputedBg(sel))}"></i></button>`);
    parts.push(bsxTB("btn-more", "sliders", bsL("עיצוב הכפתור", "Button style")));
  }
  if (sel.secId && !info.submit) {
    parts.push(BSX_SEP);
    if (bsxButtonIsListItem(sel)) parts.push(bsxTB("btn-dup", "copy", bsL("שכפול הכפתור", "Duplicate button")));
    parts.push(bsxTB("btn-del", "trash", bsL("הסרת הכפתור", "Remove button"), { cls: "bsx-danger" }));
  }
  return parts.join("");
}
function bsxComputedBg(sel) {
  if (!sel.el || !sel.el.isConnected) return "#14B8A6";
  return bsxRgbToHex(sel.el.ownerDocument.defaultView.getComputedStyle(sel.el).backgroundColor);
}

function bsxOnElToolsClick(e) {
  const btn = e.target.closest("[data-act]");
  if (!btn || btn.disabled || !bsxSel) return;
  e.stopPropagation();
  const act = btn.dataset.act;
  const sel = bsxSel;
  if (act === "parent") { bsxSelectSection(sel.secKey); return; }
  if (act === "open-business") { bsxOpenPanel("business", { focus: sel.bind }); return; }
  if (act === "font") return bsxFontPopover(btn, sel);
  if (act === "size") return bsxSizePopover(btn, sel);
  if (act === "color") return bsxColorPopover(btn, sel, "text");
  if (act === "bold") { const st = bsxStyleTarget(sel); const on = String(st.get().weight) === "700"; bsxApplyStyle(sel, "weight", on ? "" : "700"); return; }
  if (act === "align") return bsxAlignPopover(btn, sel);
  if (act === "text-more") { bsxOpenPanel("text"); return; }
  if (act.indexOf("item-") === 0) return bsxItemAction(sel, act.slice(5));
  if (act === "img-replace") return bsxPickAndUpload(sel);
  if (act === "img-library") return bsxLibraryPopover(btn, sel);
  if (act === "img-fit") { const info = bsxImageInfo(sel); bsxSetImageStyle(sel, "fit", info.fit === "contain" ? "" : "contain"); return; }
  if (act === "img-more") { bsxOpenPanel("image"); return; }
  if (act === "img-remove") return bsxRemoveImage(sel);
  if (act === "btn-label") return bsxStartButtonLabelEdit(sel);
  if (act === "btn-action" || act === "btn-more") { bsxOpenPanel("button"); return; }
  if (act === "btn-bg") return bsxColorPopover(btn, sel, "btn-bg");
  if (act === "btn-dup") return bsxButtonDuplicate(sel);
  if (act === "btn-del") return bsxButtonRemove(sel);
  if (act === "video-remove") {
    if (sel.secId) { bsxCommitEdit(); bshellSnapshot(); siteSectionSetField(siteState.data, sel.secId, sel.path || "url", ""); bsxAfterStructural(); return; }
    bsxDeselect(); bsxRemoveBuiltinVideo(); return;
  }
}

/* Contact + video fields typed right in the toolbar. */
function bsxWireToolsField() {
  const input = bsxOv.elTools.querySelector("[data-tfield]");
  if (!input) return;
  let timer = null;
  input.addEventListener("focus", () => bshellBeginEdit(input));
  input.addEventListener("blur", () => bshellEndEdit(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); input.blur(); bsxDeselect(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); input.blur(); bsxDeselect(); }
  });
  input.addEventListener("input", () => {
    const d = siteState.data;
    if (input.dataset.tfield === "contact") bsxSetContactValue(bsxSel.bind, input.value);
    else if (bsxSel.secId) siteSectionSetField(d, bsxSel.secId, bsxSel.path || "url", input.value.trim());
    else d.videoUrl = input.value.trim();
    bshellScheduleSave();
    clearTimeout(timer);
    timer = setTimeout(() => bshellRenderCanvas(), input.dataset.tfield === "video" ? 450 : 90);
  });
  if (bsxSel && bsxSel.kind === "contact") setTimeout(() => { if (document.activeElement !== input) { input.focus(); input.select(); } }, 0);
}
function bsxVideoUrlOf(sel) {
  if (sel && sel.secId) { const v = typeof siteSectionGetField === "function" ? siteSectionGetField(siteState.data, sel.secId, sel.path || "url") : ""; return typeof v === "string" ? v : ""; }
  return siteState.data.videoUrl || "";
}
function bsxContactValue(bind) {
  const d = siteState.data;
  if (bind === "whatsapp") return d.whatsapp || (d.noWhatsapp ? "" : d.phone || "");
  return d[bind] || "";
}
function bsxSetContactValue(bind, v) {
  const d = siteState.data;
  if (bind === "whatsapp") {
    d.whatsapp = v;
    if (v.trim()) d.noWhatsapp = false;
  } else d[bind] = v;
}

/* ---------- Styles ---------- */
const BSX_STYLE_PROPS = ["font", "color", "size", "align", "weight", "lineHeight", "letterSpacing", "maxWidth"];
function bshellSetTextStyle(key, prop, value) {
  const d = siteState.data;
  d.textStyles = d.textStyles || {};
  const next = Object.assign({}, d.textStyles[key]);
  if (value) next[prop] = value; else delete next[prop];
  if (BSX_STYLE_PROPS.some((p) => next[p])) d.textStyles[key] = next;
  else delete d.textStyles[key];
}
function bsxApplyStyle(sel, prop, value) {
  const st = bsxStyleTarget(sel);
  if (!st) return;
  bsxCommitEdit();
  bshellSnapshot();
  st.set(prop, value);
  bshellScheduleSave();
  bshellRenderCanvas(() => { bsxRenderElTools(); if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
}

/* ---------- Popovers (font / size / colour / image library) ---------- */
let bsxPopEl = null;
function bsxClosePopover() { if (bsxPopEl) { bsxPopEl.remove(); bsxPopEl = null; } }
function bsxClosePopoverIfOutside(t) { if (bsxPopEl && !bsxPopEl.contains(t) && !(t.closest && t.closest("[data-act]"))) bsxClosePopover(); }
function bsxPopover(anchor, html, wire) {
  bsxClosePopover();
  const pop = document.createElement("div");
  pop.className = "bsx-pop";
  pop.setAttribute("role", "dialog");
  pop.innerHTML = html;
  document.getElementById("bshell-root").appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = bsxSiteDirIsRtlUi() ? r.right - w : r.left;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  pop.style.left = left + "px";
  pop.style.top = top + "px";
  bsxPopEl = pop;
  pop.addEventListener("mousedown", (e) => { if (!e.target.closest("input")) e.preventDefault(); });
  pop.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); bsxClosePopover(); anchor.focus(); }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = Array.from(pop.querySelectorAll("button"));
      const i = items.indexOf(document.activeElement);
      e.preventDefault();
      const n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      if (items[n]) items[n].focus();
    }
  });
  if (wire) wire(pop);
  const first = pop.querySelector(".is-on") || pop.querySelector("button, input");
  if (first) first.focus({ preventScroll: true });
  return pop;
}
let bsxFontsLoaded = false;
function bsxEnsureFontPreviews() {
  if (bsxFontsLoaded || typeof SITE_FONTS !== "object") return;
  bsxFontsLoaded = true;
  const fams = Object.keys(SITE_FONTS).map((k) => "family=" + SITE_FONTS[k].googleParam.split(":")[0]).join("&");
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?" + fams + "&display=swap";
  document.head.appendChild(l);
}
function bsxFontPopover(anchor, sel) {
  bsxEnsureFontPreviews();
  const cur = (bsxStyleTarget(sel).get().font) || "";
  const html = `<button type="button" class="bsx-pop-item${!cur ? " is-on" : ""}" data-font=""><span>${bsL("גופן האתר", "Site font")}</span><small>${bsL("ברירת מחדל", "Default")}</small></button><div class="bsx-pop-sep"></div>`
    + Object.keys(SITE_FONTS).map((k) => `<button type="button" class="bsx-pop-item${cur === k ? " is-on" : ""}" data-font="${k}" style="font-family:${bsxEsc(SITE_FONTS[k].stack)}"><span>${bsxEsc(bsLabel(SITE_FONTS[k].name).replace(/\s*\(.*\)$/, ""))}</span><small>אבג Abc</small></button>`).join("");
  bsxPopover(anchor, html, (pop) => pop.addEventListener("click", (e) => {
    const b = e.target.closest("[data-font]");
    if (!b) return;
    bsxClosePopover();
    bsxApplyStyle(sel, "font", b.dataset.font);
  }));
}
function bsxSizePopover(anchor, sel) {
  const cur = String(bsxStyleTarget(sel).get().size || "");
  const sizes = bsxSizesFor(sel).slice();
  if (cur && sizes.indexOf(Number(cur)) === -1) sizes.push(Number(cur));
  sizes.sort((a, b) => a - b);
  const html = `<button type="button" class="bsx-pop-item${!cur ? " is-on" : ""}" data-size=""><span>${bsL("גודל רגיל", "Normal size")}</span></button><div class="bsx-pop-sep"></div>`
    + sizes.map((n) => `<button type="button" class="bsx-pop-item${cur === String(n) ? " is-on" : ""}" data-size="${n}"><span>${n}</span><small>px</small></button>`).join("")
    + `<div class="bsx-pop-sep"></div><div class="bsx-pop-row"><label style="font-size:12.5px;color:#475569">${bsL("גודל אחר", "Custom")}</label><input type="number" min="8" max="160" step="1" data-size-custom value="${bsxEsc(cur)}" aria-label="${bsxEsc(bsL("גודל בפיקסלים", "Size in pixels"))}"><button type="button" class="bsx-btn" data-size-apply style="height:32px">${bsL("החלה", "Apply")}</button></div>`;
  bsxPopover(anchor, html, (pop) => {
    const apply = () => {
      const v = parseInt(pop.querySelector("[data-size-custom]").value, 10);
      if (v >= 8 && v <= 160) { bsxClosePopover(); bsxApplyStyle(sel, "size", String(v)); }
    };
    pop.addEventListener("click", (e) => {
      if (e.target.closest("[data-size-apply]")) return apply();
      const b = e.target.closest("[data-size]");
      if (!b) return;
      bsxClosePopover();
      bsxApplyStyle(sel, "size", b.dataset.size);
    });
    pop.querySelector("[data-size-custom]").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } });
  });
}
/* The alignment glyphs are drawn left-to-right; on a right-to-left site
   "start" is the right edge. */
function bsxAlignIcon(a) {
  if (a === "center") return "alignCenter";
  const rtl = bsxSiteRtl();
  return (a === "start") === rtl ? "alignEnd" : "alignStart";
}
function bsxAlignPopover(anchor, sel) {
  const cur = bsxAlignFromStored(bsxStyleTarget(sel).get().align);
  const opts = [["", "", bsL("כמו בעיצוב", "As designed")], ["start", bsxAlignIcon("start"), bsL("לתחילת השורה", "Start")], ["center", "alignCenter", bsL("למרכז", "Center")], ["end", bsxAlignIcon("end"), bsL("לסוף השורה", "End")]];
  const html = opts.map(([v, icon, l]) => `<button type="button" class="bsx-pop-item${cur === v ? " is-on" : ""}" data-align="${v}"><span style="display:inline-flex;align-items:center;gap:8px">${v ? bsxIcon(icon) : ""}${bsxEsc(l)}</span></button>`).join("");
  bsxPopover(anchor, html, (pop) => pop.addEventListener("click", (e) => {
    const b = e.target.closest("[data-align]");
    if (!b) return;
    bsxClosePopover();
    bsxApplyStyle(sel, "align", b.dataset.align ? bsxAlignToStored(b.dataset.align) : "");
  }));
}
function bsxThemeColors() {
  const d = siteState.data;
  const out = [];
  try {
    const pal = derivePalette(d.primaryColor || "#1F5C4E");
    out.push("#" + pal.primary, "#" + pal.primaryDark, "#" + pal.ice);
  } catch (e) { /* no palette */ }
  return out.concat(["#111827", "#374151", "#6B7280", "#FFFFFF", "#DC2626", "#D97706", "#059669", "#2563EB", "#7C3AED"]).slice(0, 12);
}
function bsxColorPopover(anchor, sel, which) {
  const cur = which === "text" ? String(bsxStyleTarget(sel).get().color || "") : (which === "btn-bg" ? String(bsxButtonInfo(sel).style.bg || "") : String(bsxButtonInfo(sel).style.color || ""));
  const norm = (c) => String(c || "").replace("#", "").toLowerCase();
  const colors = bsxThemeColors();
  const html = `<div class="bsx-pop-colors">${colors.map((c) => `<button type="button" data-color="${c}" class="${norm(c) === norm(cur) ? "is-on" : ""}" style="background:${c}" title="${c}" aria-label="${c}"></button>`).join("")}</div>
    <div class="bsx-pop-sep"></div>
    <div class="bsx-pop-row"><label style="font-size:12.5px;color:#475569">${bsL("צבע אחר", "Custom")}</label><input type="color" data-color-custom value="${bsxEsc(cur ? "#" + norm(cur) : (which === "text" ? bsxComputed(sel).color || "#000000" : "#14b8a6"))}" style="width:44px;height:32px;padding:2px;border:1px solid #CBD5E1;border-radius:8px"></div>
    <button type="button" class="bsx-pop-item" data-color=""><span>${bsL("צבע ברירת המחדל", "Default color")}</span></button>`;
  bsxPopover(anchor, html, (pop) => {
    const set = (v) => {
      if (which === "text") bsxApplyStyle(sel, "color", v ? norm(v).toUpperCase() : "");
      else bsxSetButtonStyle(sel, which === "btn-bg" ? "bg" : "color", v ? "#" + norm(v).toUpperCase() : "");
    };
    pop.addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      bsxClosePopover();
      set(b.dataset.color);
    });
    const ci = pop.querySelector("[data-color-custom]");
    ci.addEventListener("change", () => { bsxClosePopover(); set(ci.value); });
  });
}

/* ---------- Inline text editing ---------- */
function bsxTextSpec(sel) {
  const d = () => siteState.data;
  if (sel.key) {
    const f = BSHELL_TEXT_CONTENT_MAP[sel.key];
    return {
      get: () => f.get(d()), set: (v) => f.set(d(), v), multiline: !!f.multiline, heading: !!f.heading,
      mirror: `[data-textkey="${sel.key}"]`, onSet: sel.key === "businessName" ? bsxUpdateTopName : null,
    };
  }
  if (sel.secId) {
    const multi = /^(P|DIV|BLOCKQUOTE|LI|DD)$/.test(sel.el.tagName) || /(body|text|desc|answer|quote|content|paragraph)$/i.test(sel.path);
    return {
      get: () => { const v = typeof siteSectionGetField === "function" ? siteSectionGetField(d(), sel.secId, sel.path) : ""; return typeof v === "string" ? v : ""; },
      set: (v) => { if (typeof siteSectionSetField === "function") siteSectionSetField(d(), sel.secId, sel.path, v); },
      multiline: multi,
      mirror: `[data-dk-sec="${bsxCss(sel.secId)}"] [data-dk-field="${bsxCss(sel.path)}"]`,
    };
  }
  return null;
}
function bsxStartTextEdit(sel) {
  const spec = bsxTextSpec(sel);
  if (!spec || !sel.el) return;
  bsxBeginInline(sel.el, spec);
}
function bsxItemFieldSpec(sel) {
  const d = () => siteState.data;
  if (sel.svc != null) {
    const field = sel.field;
    return {
      get: () => { const i = bsxSvcRealIndex(sel.svc); return i == null ? "" : String((d().services[i] || {})[field] || ""); },
      set: (v) => bsxSetServiceField(sel.svc, field, v),
      multiline: field === "desc",
    };
  }
  const path = sel.field;
  return {
    get: () => { const v = typeof siteSectionGetField === "function" ? siteSectionGetField(d(), sel.secId, path) : ""; return typeof v === "string" ? v : ""; },
    set: (v) => { if (typeof siteSectionSetField === "function") siteSectionSetField(d(), sel.secId, path, v); },
    multiline: /^(P|DIV|BLOCKQUOTE|LI|DD)$/.test(sel.fieldEl.tagName) || /(body|text|desc|answer|a|quote)$/i.test(path),
  };
}
function bsxStartItemFieldEdit(sel) {
  if (!sel.fieldEl) return;
  bsxBeginInline(sel.fieldEl, bsxItemFieldSpec(sel));
}
function bsxBeginInline(el, spec) {
  if (bsxEdit && bsxEdit.el === el) return;
  if (bsxEdit) bsxCommitEdit();
  const doc = el.ownerDocument;
  const mirrors = spec.mirror ? Array.from(doc.querySelectorAll(spec.mirror)).filter((m) => m !== el) : [];
  bsxEdit = { el, spec, orig: spec.get(), origHtml: el.innerHTML, mirrors: mirrors.map((m) => [m, m.innerHTML]), snap: false, changed: false };
  try { el.setAttribute("contenteditable", "plaintext-only"); } catch (e) { /* older engines */ }
  if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
  el.setAttribute("data-bsx-editing", "1");
  el.setAttribute("spellcheck", "true");
  el.setAttribute("role", "textbox");
  el.setAttribute("aria-multiline", String(!!spec.multiline));
  if (el.hasAttribute("data-dk-empty")) el.setAttribute("data-bsx-ph", el.getAttribute("data-dk-ph") || bsL("הקלידו כאן…", "Type here…"));
  else if (spec.heading || spec.placeholder) el.setAttribute("data-bsx-ph", spec.placeholder || bsL("כותרת", "Heading"));
  const focusIt = () => {
    if (!bsxEdit || bsxEdit.el !== el) return;
    try { if (doc.defaultView && !doc.hasFocus()) doc.defaultView.focus(); } catch (e) { /* not focusable */ }
    if (doc.activeElement !== el) el.focus({ preventScroll: true });
  };
  setTimeout(focusIt, 0);
  bsxDraw();
}
function bsxReadText(el, multiline) {
  let v = el.innerText != null ? el.innerText : el.textContent;
  v = String(v || "").replace(/\u00a0/g, " ");
  if (!multiline) v = v.replace(/[\r\n]+/g, " ");
  else v = v.replace(/\n$/, "");
  return v;
}
function bsxOnEditInput(e) {
  if (!bsxEdit || e.target !== bsxEdit.el) return;
  const v = bsxReadText(bsxEdit.el, bsxEdit.spec.multiline);
  if (!bsxEdit.snap) { bshellSnapshot(); bsxEdit.snap = true; }
  bsxEdit.changed = true;
  bsxEdit.spec.set(v);
  if (bsxEdit.spec.onSet) bsxEdit.spec.onSet();
  if (v.trim()) bsxEdit.mirrors.forEach(([m]) => { if (m.isConnected) m.textContent = v; });
  bshellScheduleSave();
}
function bsxOnPaste(e) {
  if (!bsxEdit || !bsxEdit.el.contains(e.target)) return;
  e.preventDefault();
  let text = (e.clipboardData && e.clipboardData.getData("text/plain")) || "";
  if (!bsxEdit.spec.multiline) text = text.replace(/[\r\n]+/g, " ");
  const doc = bsxEdit.el.ownerDocument;
  if (!doc.execCommand("insertText", false, text)) {
    const s = doc.getSelection();
    if (s && s.rangeCount) { const r = s.getRangeAt(0); r.deleteContents(); r.insertNode(doc.createTextNode(text)); r.collapse(false); }
    bsxOnEditInput({ target: bsxEdit.el });
  }
}
function bsxEndInlineDom(ed) {
  const el = ed.el;
  el.removeAttribute("contenteditable");
  el.removeAttribute("data-bsx-editing");
  el.removeAttribute("data-bsx-ph");
  el.removeAttribute("spellcheck");
  el.removeAttribute("role");
  el.removeAttribute("aria-multiline");
  if (el.ownerDocument.activeElement === el) el.blur();
}
function bsxCommitEdit() {
  const ed = bsxEdit;
  if (!ed) return;
  bsxEdit = null;
  bsxEndInlineDom(ed);
  if (ed.changed) {
    let v = bsxReadText(ed.el, ed.spec.multiline);
    if (!ed.spec.multiline) v = v.trim();
    ed.spec.set(v);
    if (ed.spec.onSet) ed.spec.onSet();
    bshellScheduleSave();
    // Put the edited element (and its mirrors) back to what the canvas'
    // last render had, then patch from there: the patch always knows the
    // real starting point, and an emptied heading gets its default text.
    if (ed.el.isConnected) ed.el.innerHTML = ed.origHtml;
    ed.mirrors.forEach(([m, h]) => { if (m.isConnected) m.innerHTML = h; });
    bshellRenderCanvas();
  }
  bsxDraw();
}
function bsxCancelEdit() {
  const ed = bsxEdit;
  if (!ed) return;
  bsxEdit = null;
  bsxEndInlineDom(ed);
  if (ed.changed) {
    ed.spec.set(ed.orig);
    if (ed.spec.onSet) ed.spec.onSet();
    if (ed.snap) { bshellUndoStack.pop(); bshellSyncUndoButtons(); }
    if (ed.el.isConnected) ed.el.innerHTML = ed.origHtml;
    ed.mirrors.forEach(([m, h]) => { if (m.isConnected) m.innerHTML = h; });
    bshellScheduleSave();
  }
  bsxDraw();
}

/* ---------- Keyboard ---------- */
function bsxOnKey(e) {
  if (!bshellActiveFlag) return;
  const mod = e.ctrlKey || e.metaKey;
  const k = (e.key || "").toLowerCase();
  const inCanvas = e.target && e.target.ownerDocument === bsxDoc();
  const t = document.activeElement;
  const typingInEditor = !inCanvas && t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  if (document.querySelector(".bsx-modal-back")) return; // dialogs handle their own keys

  if (bsxEdit && inCanvas) {
    if (k === "enter" && !bsxEdit.spec.multiline) { e.preventDefault(); bsxCommitEdit(); return; }
    if (k === "escape") { e.preventDefault(); bsxCancelEdit(); return; }
    if (k === "tab") { e.preventDefault(); bsxCommitEdit(); return; }
    if (mod && (k === "z" || k === "y")) { e.preventDefault(); bsxCommitEdit(); if (k === "y" || e.shiftKey) bshellRedo(); else bshellUndo(); return; }
    if (mod && k === "s") { e.preventDefault(); bsxCommitEdit(); bshellSaveNow(); return; }
    return;
  }
  if (mod && k === "s") { e.preventDefault(); bsxCommitEdit(); bshellSaveNow(); return; }
  if (mod && (k === "z" || k === "y")) {
    if (typingInEditor) return; // native undo inside a panel field
    e.preventDefault();
    if (k === "y" || e.shiftKey) bshellRedo(); else bshellUndo();
    return;
  }
  if (typingInEditor) return;
  if (inCanvas && (k === "enter" || k === " ")) { e.preventDefault(); return; } // no link/button activation by keyboard
  if (k === "escape") {
    if (bsxPopEl) { e.preventDefault(); bsxClosePopover(); return; }
    const preview = document.getElementById("bshell-root").classList.contains("is-previewing");
    if (preview && typeof bsxStopPreview === "function") { e.preventDefault(); bsxStopPreview(); return; }
    if (document.getElementById("bsx-help")) { e.preventDefault(); bsxCloseHelp(); return; }
    if (bsxSel) { e.preventDefault(); bsxDeselect(); return; }
    if (typeof bsxPanelMode !== "undefined" && bsxPanelMode) { e.preventDefault(); bsxClosePanel(); return; }
    return;
  }
  if ((k === "delete" || k === "backspace") && bsxSel) {
    if (bsxSel.kind === "section" && bsxIsCustom(bsxSel.secKey)) { e.preventDefault(); bsxDeleteSection(bsxSel.secKey); return; }
    if (bsxSel.kind === "item") { e.preventDefault(); bsxItemAction(bsxSel, "del"); return; }
  }
}

/* ---------- Items: the template's services, or a library section's list ---------- */
function bsxSvcNamedIdx() {
  const out = [];
  (siteState.data.services || []).forEach((s, i) => { if (s && s.name && s.name.trim()) out.push(i); });
  return out;
}
function bsxSvcRealIndex(shown) {
  const named = bsxSvcNamedIdx();
  if (named.length) return named[shown] != null ? named[shown] : null;
  return null; // placeholders on screen
}
function bsxSetServiceField(shown, field, v) {
  const d = siteState.data;
  d.services = Array.isArray(d.services) ? d.services : [];
  let i = bsxSvcRealIndex(shown);
  if (i == null) {
    // Typing over a placeholder card turns it into a real item (it has to
    // have a name to be shown).
    const dd = withFallback(d);
    const ph = (dd._services || [])[shown] || {};
    const item = { name: field === "name" ? v : (ph.name || ""), desc: field === "desc" ? v : "", price: field === "price" ? v : "" };
    const emptyIdx = d.services.findIndex((s) => !s || !(s.name && s.name.trim()));
    if (emptyIdx !== -1) { d.services[emptyIdx] = item; i = emptyIdx; } else { d.services.push(item); i = d.services.length - 1; }
    return;
  }
  d.services[i] = Object.assign({}, d.services[i], { [field]: v });
}
function bsxItemList(sel) {
  if (sel.svc != null) {
    const named = bsxSvcNamedIdx();
    return { index: named.length ? sel.svc : -1, count: named.length };
  }
  if (sel.secId && sel.itemPath && typeof siteSectionGetField === "function") {
    const m = sel.itemPath.match(/^(.*)\.(\d+)$/);
    if (!m) return null;
    const arr = siteSectionGetField(siteState.data, sel.secId, m[1]);
    return Array.isArray(arr) ? { index: parseInt(m[2], 10), count: arr.length, arrPath: m[1], arr } : null;
  }
  return null;
}
async function bsxItemAction(sel, act) {
  const d = siteState.data;
  const list = bsxItemList(sel);
  bsxCommitEdit();
  if (sel.svc != null) {
    const word = bshellItemWord();
    const named = bsxSvcNamedIdx();
    const real = bsxSvcRealIndex(sel.svc);
    if (act === "style") { bsxOpenPanel("itemstyle"); return; }
    if (act === "add") {
      bshellSnapshot();
      d.services = Array.isArray(d.services) ? d.services.filter((s) => s && s.name && s.name.trim()) : [];
      const at = real == null ? d.services.length : real + 1;
      d.services.splice(at, 0, { name: siteState.data.siteLang === "en" ? `New ${word[0].toLowerCase()}` : `${word[0]} חדש`, desc: "", price: "" });
      const shownNew = d.services.slice(0, at + 1).filter((s) => s.name && s.name.trim()).length - 1;
      bshellScheduleSave();
      bshellRenderCanvas(() => bsxSelectItemByShown(shownNew, "name"));
      return;
    }
    if (real == null) return;
    if (act === "up" || act === "down") {
      const pos = named.indexOf(real);
      const other = named[act === "up" ? pos - 1 : pos + 1];
      if (other == null) return;
      bshellSnapshot();
      const tmp = d.services[real]; d.services[real] = d.services[other]; d.services[other] = tmp;
      bshellScheduleSave();
      bshellRenderCanvas(() => bsxSelectItemByShown(act === "up" ? sel.svc - 1 : sel.svc + 1));
      return;
    }
    if (act === "dup") {
      bshellSnapshot();
      d.services.splice(real + 1, 0, Object.assign({}, d.services[real]));
      bshellScheduleSave();
      bshellRenderCanvas(() => bsxSelectItemByShown(sel.svc + 1));
      return;
    }
    if (act === "del") {
      const last = named.length <= 1;
      const name = (d.services[real].name || "").trim();
      const ok = await bsxConfirm({
        title: last ? bsL(`למחוק את ה${word[0]} האחרון?`, `Delete the last ${word[0].toLowerCase()}?`) : bsL(`למחוק את "${name}"?`, `Delete "${name}"?`),
        text: last ? bsL("אחרי המחיקה יוצגו באתר דוגמאות במקומו, עד שתוסיפו חדש.", "After deleting, examples will show in its place until you add a new one.") : bsL("אפשר לבטל מיד אחר כך.", "You can undo right after."),
        ok: bsL("מחיקה", "Delete"), danger: true,
      });
      if (!ok) return;
      bshellSnapshot();
      d.services.splice(real, 1);
      if (!d.services.length) d.services.push({ name: "", desc: "", price: "" });
      bsxAfterStructural();
      bsxToast(bsL("נמחק", "Deleted"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
      return;
    }
    return;
  }
  // A library section's list
  if (!list || typeof siteSectionSetField !== "function") return;
  const arr = JSON.parse(JSON.stringify(list.arr));
  const i = list.index;
  if (act === "add") {
    bshellSnapshot();
    if (typeof siteSectionAddItem === "function") siteSectionAddItem(d, sel.secId, list.arrPath, i + 1);
    else { arr.splice(i + 1, 0, bsxBlankLike(arr[i] !== undefined ? arr[i] : arr[0])); siteSectionSetField(d, sel.secId, list.arrPath, arr); }
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxSelectCustomItem(sel.secId, list.arrPath, i + 1));
    return;
  }
  if (act === "up" || act === "down") {
    const j = act === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    bshellSnapshot();
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    siteSectionSetField(d, sel.secId, list.arrPath, arr);
    bsxSwapItemStyles(sel.secId, list.arrPath, i, j);
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxSelectCustomItem(sel.secId, list.arrPath, j));
    return;
  }
  if (act === "dup") {
    bshellSnapshot();
    arr.splice(i + 1, 0, JSON.parse(JSON.stringify(arr[i])));
    siteSectionSetField(d, sel.secId, list.arrPath, arr);
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxSelectCustomItem(sel.secId, list.arrPath, i + 1));
    return;
  }
  if (act === "del") {
    const last = arr.length <= 1;
    const ok = await bsxConfirm({
      title: last ? bsL("למחוק את הפריט האחרון?", "Delete the last item?") : bsL("למחוק את הפריט?", "Delete this item?"),
      text: bsL("אפשר לבטל מיד אחר כך.", "You can undo right after."), ok: bsL("מחיקה", "Delete"), danger: true,
    });
    if (!ok) return;
    bshellSnapshot();
    if (typeof siteSectionRemoveItem === "function") siteSectionRemoveItem(d, sel.secId, sel.itemPath);
    else { arr.splice(i, 1); siteSectionSetField(d, sel.secId, list.arrPath, arr); }
    bsxAfterStructural();
    bsxToast(bsL("נמחק", "Deleted"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
  }
}
/* Per-field styles are keyed by path ("items.2.title"): moving an item
   carries its styles with it. */
function bsxSwapItemStyles(secId, arrPath, i, j) {
  const s = siteState.data.sections && siteState.data.sections[secId];
  if (!s || !s.styles) return;
  const pi = arrPath + "." + i + ".", pj = arrPath + "." + j + ".";
  const next = {};
  Object.keys(s.styles).forEach((k) => {
    if (k.indexOf(pi) === 0) next[pj + k.slice(pi.length)] = s.styles[k];
    else if (k.indexOf(pj) === 0) next[pi + k.slice(pj.length)] = s.styles[k];
    else next[k] = s.styles[k];
  });
  s.styles = next;
}
function bsxBlankLike(v) {
  if (typeof v === "string") return "";
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") { const o = {}; Object.keys(v).forEach((k) => { o[k] = bsxBlankLike(v[k]); }); return o; }
  return v === undefined ? "" : v;
}
function bsxSelectItemByShown(shown, field) {
  const doc = bsxDoc();
  if (!doc) return;
  let card = doc.querySelector(`[data-svc-idx="${shown}"]`);
  if (!card && typeof SITE_GROUP_GRID === "string") {
    const grid = doc.querySelectorAll(SITE_GROUP_GRID);
    card = grid[shown] ? bsxGridCardOf(grid[shown]) : null;
  }
  if (!card) return;
  let fieldEl = null;
  if (field) { const f = bsxFieldElOfCard(card, shown, field); if (f) fieldEl = f; }
  const desc = { kind: "item", el: card, secKey: bsxMap.keyOfTop.get(card.closest("body > *")), svc: shown, fieldEl, field: fieldEl ? field : null };
  if (!desc.secKey) return;
  bsxSelect(desc, { scroll: true });
  if (fieldEl && bsxEdit) {
    // put the caret at the end and select the placeholder name
    const s = doc.getSelection(); const r = doc.createRange(); r.selectNodeContents(fieldEl); s.removeAllRanges(); s.addRange(r);
  }
}
function bsxFieldElOfCard(card, shown, field) {
  const dd = withFallback(siteState.data);
  const s = (dd._services || [])[shown];
  if (!s || !s[field]) return null;
  const want = String(s[field]).trim();
  return Array.from(card.querySelectorAll("*")).find((el) => el.childElementCount === 0 && (el.textContent || "").trim() === want) || null;
}
function bsxSelectCustomItem(secId, arrPath, idx) {
  const doc = bsxDoc();
  const el = doc && doc.querySelector(`[data-dk-sec="${bsxCss(secId)}"] [data-dk-item="${bsxCss(arrPath + "." + idx)}"]`);
  if (!el) return;
  const secKey = bsxMap.keyOfTop.get(el.closest("body > *"));
  bsxSelect({ kind: "item", el, secKey, secId, itemPath: arrPath + "." + idx, fieldEl: null, field: null }, { scroll: true });
}

/* ---------- Images ---------- */
function bsxImageInfo(sel) {
  const d = siteState.data;
  const caps = bsxCaps();
  if (sel.secId) {
    const v = typeof siteSectionGetField === "function" ? siteSectionGetField(d, sel.secId, sel.path) : null;
    const s = d.sections && d.sections[sel.secId];
    const st = (s && s.styles && s.styles[sel.path]) || {};
    const imgProps = (caps.secStyle && caps.secStyle.image) || [];
    const obj = v && typeof v === "object" ? v : null;
    // The library keeps fit/ratio on the image itself ({src, alt, fit,
    // ratio}) where its renderer uses them (text & image); only offered
    // where the object carries them.
    const inContent = !!(obj && ("fit" in obj || "ratio" in obj));
    return {
      src: typeof v === "string" ? v : (obj && obj.src) || "", alt: obj ? obj.alt || "" : "",
      canAlt: !!obj, canStyle: inContent || imgProps.indexOf("fit") !== -1, canRatio: inContent || imgProps.indexOf("ratio") !== -1, canFocal: imgProps.indexOf("focal") !== -1,
      fit: (inContent ? (obj.fit === "contain" ? "contain" : "") : st.fit) || "", ratio: (inContent ? obj.ratio : st.ratio) || "", focal: st.focal || "",
      canRemove: true, objectish: !!obj, inContent, ratioOptions: inContent ? ["1:1", "4:3", "16:9"] : null,
    };
  }
  const key = sel.img === "logo" ? "logo" : "hero";
  const st = (d.imageStyles && d.imageStyles[key]) || {};
  let src = "";
  if (sel.img === "hero") src = d.heroImage || "";
  else if (sel.img === "logo") src = d.logo || "";
  else { const i = parseInt(String(sel.img).split(".")[1], 10); src = (d.heroImages || [])[i] || ""; }
  return {
    src, alt: d.heroAlt || "", canAlt: sel.img !== "logo", canStyle: caps.imageStyles, canRatio: caps.imageStyles, canFocal: caps.imageStyles,
    fit: st.fit || "", ratio: st.ratio || "", focal: st.focal || "", canRemove: true, styleKey: key,
  };
}
function bsxSetImageSrc(sel, url) {
  const d = siteState.data;
  if (sel.secId) {
    if (typeof siteSectionSetField !== "function") return;
    const v = typeof siteSectionGetField === "function" ? siteSectionGetField(d, sel.secId, sel.path) : null;
    if (v && typeof v === "object") siteSectionSetField(d, sel.secId, sel.path + ".src", url);
    else siteSectionSetField(d, sel.secId, sel.path, url);
    return;
  }
  if (sel.img === "hero") d.heroImage = url;
  else if (sel.img === "logo") d.logo = url;
  else {
    const i = parseInt(String(sel.img).split(".")[1], 10);
    d.heroImages = Array.isArray(d.heroImages) ? d.heroImages : [];
    if (i >= 0 && i < d.heroImages.length) d.heroImages[i] = url; else d.heroImages.push(url);
  }
}
function bsxSetImageStyle(sel, prop, value) {
  const d = siteState.data;
  bsxCommitEdit();
  bshellSnapshot();
  if (sel.secId) {
    const info = bsxImageInfo(sel);
    if (info.inContent && (prop === "fit" || prop === "ratio")) siteSectionSetField(d, sel.secId, sel.path + "." + prop, prop === "fit" ? (value || "cover") : (value || "auto"));
    else bsxStyleWrite(sel.secId, sel.path, prop, value);
  } else {
    const key = sel.img === "logo" ? "logo" : "hero";
    d.imageStyles = d.imageStyles || {};
    const next = Object.assign({}, d.imageStyles[key]);
    if (value) next[prop] = value; else delete next[prop];
    if (Object.keys(next).length) d.imageStyles[key] = next; else delete d.imageStyles[key];
    if (!Object.keys(d.imageStyles).length) delete d.imageStyles;
  }
  bshellScheduleSave();
  bshellRenderCanvas(() => { bsxRenderElTools(); if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
}
function bsxSetImageAlt(sel, v) {
  const d = siteState.data;
  if (sel.secId) {
    if (typeof siteSectionSetField === "function") siteSectionSetField(d, sel.secId, sel.path + ".alt", v);
  } else if (v.trim()) d.heroAlt = v; else delete d.heroAlt;
  bshellScheduleSave();
}
function bsxProjectImages() {
  const out = [];
  const seen = new Set();
  const walk = (v, depth) => {
    if (depth > 8 || v == null) return;
    if (typeof v === "string") {
      if (/^https?:\/\/\S+$/i.test(v) && (/\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(v) || /\/site-images\//.test(v)) && !seen.has(v)) { seen.add(v); out.push(v); }
      return;
    }
    if (Array.isArray(v)) { v.forEach((x) => walk(x, depth + 1)); return; }
    if (typeof v === "object") Object.keys(v).forEach((k) => { if (k !== "moodPrev" && k !== "moodBefore") walk(v[k], depth + 1); });
  };
  walk(siteState.data, 0);
  return out;
}
function bsxLibraryPopover(anchor, sel) {
  const imgs = bsxProjectImages();
  const cur = bsxImageInfo(sel).src;
  const html = imgs.length
    ? `<div style="font-size:12.5px;font-weight:700;color:#475569;padding:4px 6px 8px">${bsL("התמונות באתר הזה", "Images in this site")}</div><div class="bsx-thumb-grid" style="width:240px">${imgs.map((src) => `<button type="button" class="bsx-thumb${src === cur ? " is-on" : ""}" data-img-src="${bsxEsc(src)}" aria-label="${bsxEsc(bsL("בחירת התמונה", "Choose this image"))}"><img src="${bsxEsc(src)}" alt=""></button>`).join("")}</div>`
    : `<div class="bsx-empty" style="width:220px">${bsL("עדיין לא הועלו תמונות לאתר הזה.", "No images have been uploaded to this site yet.")}</div>`;
  bsxPopover(anchor, html, (pop) => pop.addEventListener("click", (e) => {
    const b = e.target.closest("[data-img-src]");
    if (!b) return;
    bsxClosePopover();
    bsxCommitEdit();
    bshellSnapshot();
    bsxSetImageSrc(sel, b.dataset.imgSrc);
    bshellScheduleSave();
    bshellRenderCanvas(() => { bsxRenderElTools(); if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
  }));
}
/* Upload through the existing pipeline (shrink in the browser, the
   project's own folder, the storage-allowance messages). */
function bsxPickFile(multiple) {
  return new Promise((resolve) => {
    const input = document.getElementById("bsx-file-input");
    input.value = "";
    input.multiple = !!multiple;
    const done = () => { input.removeEventListener("change", done); resolve(Array.from(input.files || [])); };
    input.addEventListener("change", done);
    input.click();
  });
}
async function bsxUploadOne(file, name) {
  if (!file) return null;
  if (typeof SITE_IMAGE_MAX_INPUT === "number" && file.size > SITE_IMAGE_MAX_INPUT) {
    bsxToast(bsL(`"${file.name}" גדולה מדי — בחרו קובץ עד 25MB.`, `"${file.name}" is too large — choose a file up to 25MB.`), { error: true });
    return null;
  }
  const url = typeof uploadSiteImage === "function" ? await uploadSiteImage(file, name) : null;
  if (!url) bsxToast(typeof siteUploadErrorText === "function" ? siteUploadErrorText(file.name) : bsL("העלאת התמונה נכשלה, נסו שוב.", "The upload failed, please try again."), { error: true, ms: 7000 });
  return url;
}
async function bsxPickAndUpload(sel) {
  const files = await bsxPickFile(false);
  if (!files.length) return;
  const toast = bsxToast(bsL("מעלים את התמונה…", "Uploading the image…"), { ms: 60000 });
  const name = sel.secId ? "sec-" + String(sel.secId).replace(/[^a-z0-9_-]/gi, "").slice(0, 24) : (sel.img === "logo" ? "logo" : sel.img === "hero" ? "hero" : "gallery-" + Date.now());
  const url = await bsxUploadOne(files[0], name);
  if (toast) toast.remove();
  if (!url) return;
  bsxCommitEdit();
  bshellSnapshot();
  bsxSetImageSrc(sel, url);
  bshellScheduleSave();
  bshellRenderCanvas(() => { bsxRenderElTools(); if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
  bsxToast(bsL("התמונה הוחלפה", "Image replaced"));
}
function bsxRemoveImage(sel) {
  const d = siteState.data;
  bsxCommitEdit();
  bshellSnapshot();
  if (sel.secId) {
    const info = bsxImageInfo(sel);
    if (typeof siteSectionSetField === "function") siteSectionSetField(d, sel.secId, info.objectish ? sel.path + ".src" : sel.path, "");
  } else if (sel.img === "hero") d.heroImage = "";
  else if (sel.img === "logo") delete d.logo;
  else {
    const i = parseInt(String(sel.img).split(".")[1], 10);
    if (Array.isArray(d.heroImages) && i >= 0) d.heroImages.splice(i, 1);
  }
  bsxAfterStructural();
  bsxToast(bsL("התמונה הוסרה", "Image removed"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
}

/* ---------- Buttons ---------- */
/* Button actions use the section library's shape:
   { kind: "link" | "tel" | "whatsapp" | "email" | "scroll", value }.
   An empty value for tel/whatsapp/email means "the business's own
   phone / WhatsApp / email" (it follows the contact details). */
const BSX_ACTION_KINDS = ["link", "tel", "whatsapp", "email", "scroll"];
function bsxActionLabel(a) {
  if (!a || !a.kind) return bsL("לאן?", "Where to?");
  return { link: bsL("קישור", "Link"), tel: bsL("שיחה", "Call"), whatsapp: bsL("וואטסאפ", "WhatsApp"), email: bsL("מייל", "Email"), scroll: bsL("חלק באתר", "Section") }[a.kind] || bsL("קישור", "Link");
}
function bsxButtonIsListItem(sel) { return !!(sel.secId && /\.\d+$/.test(sel.path)); }
/* Where a library button keeps its text: an object button ({label,
   action}) at path.label, or a plain string field (the lead form's
   "buttonLabel"). */
function bsxBtnLabelPath(sel) {
  const v = typeof siteSectionGetField === "function" ? siteSectionGetField(siteState.data, sel.secId, sel.path) : undefined;
  if (typeof v === "string" || (v == null && sel.el && sel.el.closest && sel.el.closest("form"))) return sel.path;
  return sel.path + ".label";
}
function bsxButtonInfo(sel) {
  const d = siteState.data;
  const caps = bsxCaps();
  if (sel.secId) {
    const get = (p) => (typeof siteSectionGetField === "function" ? siteSectionGetField(d, sel.secId, p) : undefined);
    const s = d.sections && d.sections[sel.secId];
    const btnProps = (caps.secStyle && caps.secStyle.button) || [];
    const labelPath = bsxBtnLabelPath(sel);
    const submit = labelPath === sel.path;
    return {
      editable: typeof siteSectionSetField === "function",
      submit, labelPath,
      label: String(get(labelPath) || (sel.el ? sel.el.textContent.trim() : "")),
      action: submit ? null : get(sel.path + ".action") || null,
      style: (s && s.styles && s.styles[sel.path]) || {},
      canStyle: btnProps.indexOf("bg") !== -1, canSize: btnProps.indexOf("size") !== -1, canRadius: btnProps.indexOf("radius") !== -1,
    };
  }
  if (sel.btn === "heroCta" && caps.heroCta) {
    const h = d.heroCta || {};
    const cta = bsxHeroCta();
    return { editable: true, labelPath: "label", label: h.label || (sel.el && sel.el.isConnected ? sel.el.textContent.trim() : (cta ? cta.label : "")), action: h.action || null, style: h.style || {}, canStyle: caps.ctaStyle, canSize: caps.ctaStyle, canRadius: caps.ctaStyle, builtin: true };
  }
  // The template's own hero button: label and target come from the
  // contact details (primaryCtaHref) — explained, not faked.
  const cta = bsxHeroCta();
  const href = cta ? cta.href : "";
  const via = /wa\.me/.test(href) ? bsL("וואטסאפ", "WhatsApp") : /^mailto:/.test(href) ? bsL("מייל", "email") : /^tel:/.test(href) ? bsL("שיחת טלפון", "a phone call") : bsL("עמוד יצירת הקשר", "the contact page");
  return { editable: false, note: bsL(`הכפתור מוביל ל${via} לפי פרטי הקשר`, `This button leads to ${via}, from your contact details`), style: {} };
}
function bsxStyleWrite(secId, path, prop, v) {
  const d = siteState.data;
  const s = d.sections && d.sections[secId];
  if (!s) return;
  const next = Object.assign({}, s.styles && s.styles[path]);
  if (v) next[prop] = v; else delete next[prop];
  if (typeof siteSectionSetStyle === "function") { siteSectionSetStyle(d, secId, path, Object.keys(next).length ? next : null); if (s.styles && !Object.keys(s.styles).length) delete s.styles; return; }
  s.styles = s.styles || {};
  if (Object.keys(next).length) s.styles[path] = next; else delete s.styles[path];
  if (!Object.keys(s.styles).length) delete s.styles;
}
function bsxButtonWrite(sel, mutate) {
  const d = siteState.data;
  bsxCommitEdit();
  bshellSnapshot();
  if (sel.secId) {
    const labelPath = bsxBtnLabelPath(sel);
    mutate({
      setLabel: (v) => siteSectionSetField(d, sel.secId, labelPath, v),
      setAction: (a) => { if (labelPath !== sel.path) siteSectionSetField(d, sel.secId, sel.path + ".action", a); },
      setStyle: (prop, v) => bsxStyleWrite(sel.secId, sel.path, prop, v),
    });
  } else mutate({
    setLabel: (v) => { d.heroCta = Object.assign({}, d.heroCta); if (v) d.heroCta.label = v; else delete d.heroCta.label; bsxTidyHeroCta(); },
    setAction: (a) => { d.heroCta = Object.assign({}, d.heroCta); if (a) d.heroCta.action = a; else delete d.heroCta.action; bsxTidyHeroCta(); },
    setStyle: (prop, v) => {
      d.heroCta = Object.assign({}, d.heroCta);
      const st = Object.assign({}, d.heroCta.style);
      if (v) st[prop] = v; else delete st[prop];
      if (Object.keys(st).length) d.heroCta.style = st; else delete d.heroCta.style;
      bsxTidyHeroCta();
    },
  });
  bshellScheduleSave();
  bshellRenderCanvas(() => { bsxRenderElTools(); if (typeof bsxRefreshPanel === "function") bsxRefreshPanel(); });
}
function bsxTidyHeroCta() { const d = siteState.data; if (d.heroCta && !Object.keys(d.heroCta).length) delete d.heroCta; }
function bsxSetButtonStyle(sel, prop, v) { bsxButtonWrite(sel, (w) => w.setStyle(prop, v)); }
function bsxSetButtonLabelData(sel, v) {
  const d = siteState.data;
  if (sel.secId) siteSectionSetField(d, sel.secId, bsxBtnLabelPath(sel), v);
  else { d.heroCta = Object.assign({}, d.heroCta); if (v.trim()) d.heroCta.label = v; else delete d.heroCta.label; bsxTidyHeroCta(); }
}
function bsxStartButtonLabelEdit(sel) {
  const el = sel.el;
  if (!el) return;
  const info = bsxButtonInfo(sel);
  const target = el.querySelector("[data-dk-field]") || el;
  bsxBeginInline(target, { get: () => info.label, set: (v) => bsxSetButtonLabelData(sel, v), multiline: false });
  const doc = target.ownerDocument;
  setTimeout(() => { const s = doc.getSelection(); const r = doc.createRange(); r.selectNodeContents(target); s.removeAllRanges(); s.addRange(r); }, 10);
}
function bsxButtonDuplicate(sel) {
  const m = sel.path.match(/^(.*)\.(\d+)$/);
  if (!m || typeof siteSectionGetField !== "function") return;
  const arr = siteSectionGetField(siteState.data, sel.secId, m[1]);
  if (!Array.isArray(arr)) return;
  const copy = JSON.parse(JSON.stringify(arr));
  copy.splice(parseInt(m[2], 10) + 1, 0, JSON.parse(JSON.stringify(copy[parseInt(m[2], 10)])));
  bsxCommitEdit();
  bshellSnapshot();
  siteSectionSetField(siteState.data, sel.secId, m[1], copy);
  bsxAfterStructural();
}
async function bsxButtonRemove(sel) {
  const ok = await bsxConfirm({ title: bsL("להסיר את הכפתור?", "Remove this button?"), text: bsL("אפשר לבטל מיד אחר כך.", "You can undo right after."), ok: bsL("הסרה", "Remove"), danger: true });
  if (!ok) return;
  const d = siteState.data;
  bsxCommitEdit();
  bshellSnapshot();
  const m = sel.path.match(/^(.*)\.(\d+)$/);
  const arr = m && typeof siteSectionGetField === "function" ? siteSectionGetField(d, sel.secId, m[1]) : null;
  if (Array.isArray(arr)) {
    if (typeof siteSectionRemoveItem === "function") siteSectionRemoveItem(d, sel.secId, sel.path);
    else { const copy = JSON.parse(JSON.stringify(arr)); copy.splice(parseInt(m[2], 10), 1); siteSectionSetField(d, sel.secId, m[1], copy); }
  } else siteSectionSetField(d, sel.secId, bsxBtnLabelPath(sel), "");
  bsxAfterStructural();
  bsxToast(bsL("הכפתור הוסר", "Button removed"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
}

/* ---------- Toasts, dialogs, live region ---------- */
function bsxToast(msg, opts) {
  opts = opts || {};
  const box = document.getElementById("bsx-toasts");
  if (!box) return null;
  const t = document.createElement("div");
  t.className = "bsx-toast" + (opts.error ? " is-error" : "");
  t.setAttribute("role", opts.error ? "alert" : "status");
  t.innerHTML = `<span>${bsxEsc(msg)}</span>`;
  if (opts.action) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = opts.action.label;
    b.addEventListener("click", () => { t.remove(); opts.action.fn(); });
    t.appendChild(b);
  }
  while (box.children.length > 2) box.firstChild.remove();
  box.appendChild(t);
  setTimeout(() => t.remove(), opts.ms || (opts.action ? 7000 : 2600));
  return t;
}
function bsxAnnounce(msg) {
  let live = document.getElementById("bsx-live");
  if (!live) {
    live = document.createElement("div");
    live.id = "bsx-live";
    live.setAttribute("aria-live", "polite");
    live.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);";
    document.getElementById("bshell-root").appendChild(live);
  }
  live.textContent = msg;
}
function bsxConfirm(o) {
  return new Promise((resolve) => {
    const back = document.createElement("div");
    back.className = "bsx-modal-back";
    back.innerHTML = `<div class="bsx-modal bsx-modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="bsx-confirm-title" dir="${bsxSiteDirIsRtlUi() ? "rtl" : "ltr"}">
      <div class="bsx-modal-head"><h2 id="bsx-confirm-title">${bsxEsc(o.title)}</h2></div>
      ${o.text ? `<div class="bsx-modal-text">${bsxEsc(o.text)}</div>` : ""}
      <div class="bsx-modal-foot"><button type="button" data-no>${bsL("ביטול", "Cancel")}</button><button type="button" data-yes class="${o.danger ? "is-danger" : "is-primary"}">${bsxEsc(o.ok || bsL("אישור", "OK"))}</button></div>
    </div>`;
    document.body.appendChild(back);
    const prevFocus = document.activeElement;
    const done = (v) => { back.remove(); document.removeEventListener("keydown", key, true); if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ } resolve(v); };
    const key = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); }
      else if (e.key === "Tab") {
        const btns = Array.from(back.querySelectorAll("button"));
        const i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    };
    document.addEventListener("keydown", key, true);
    back.addEventListener("click", (e) => { if (e.target === back) done(false); });
    back.querySelector("[data-no]").addEventListener("click", () => done(false));
    back.querySelector("[data-yes]").addEventListener("click", () => done(true));
    back.querySelector("[data-yes]").focus();
  });
}

/* ---------- Moods (site design) ---------- */
function bshellMoodPickerHtml(d) {
  if (typeof SITE_MOODS !== "object") return "";
  const current = (d.mood && SITE_MOODS[d.mood]) ? d.mood : "";
  const btn = (key, label, mood) => {
    const swatch = mood
      ? `<span class="bshell-mood-swatch" style="background:${mood.primaryColor};"></span><span class="bshell-mood-swatch" style="background:${mood.accent};"></span>`
      : `<span class="bshell-mood-swatch bshell-mood-swatch-none"></span>`;
    const sample = mood ? ` style="border-radius:${mood.radius};"` : "";
    return `<button type="button" class="bshell-mood-btn${key === current ? " active" : ""}" role="radio" aria-checked="${key === current}" data-mood="${key}"${sample}>
        <span class="bshell-mood-swatches">${swatch}</span>
        <span class="bshell-mood-name">${escapeHtmlS(label)}</span>
      </button>`;
  };
  return `
      <div class="bsx-field">
        <span class="bsx-label" id="bshell-mood-label">${bsL("סגנון מוכן", "Ready-made style")}</span>
        <div class="bshell-mood-grid" role="radiogroup" aria-labelledby="bshell-mood-label">
          ${btn("", bsL("ללא", "None"), null)}
          ${Object.keys(SITE_MOODS).map((k) => btn(k, bsL(SITE_MOODS[k].label, SITE_MOODS[k].labelEn), SITE_MOODS[k])).join("")}
        </div>
        ${d.moodPrev && typeof d.moodPrev === "object" ? `<button type="button" class="bshell-mood-restore" id="bshell-mood-restore">${bsL("↩ חזרה לעיצוב הקודם", "↩ Back to the previous design")}</button>` : ""}
        <p class="bsx-hint">${bsL("בוחר צבע, גופנים, פינות ומרווחים שמתאימים זה לזה. שימו לב: סגנון מחליף גם צבעים וגופנים שבחרתם לטקסטים בודדים (אפשר לחזור עם הכפתור למעלה).", "Picks a colour, fonts, corners and spacing that go together. Note: a style also replaces colours and fonts you chose for single texts (the button above brings them back).")}</p>
      </div>`;
}
/* A mood writes its colour + body font into d.primaryColor/d.fontFamily
   and clears per-text colours/fonts (sizes and alignment stay). d.moodBefore
   = the look before the first mood (for "ללא"), d.moodPrev = the exact
   design before the last mood click (for "↩ חזרה לעיצוב הקודם"). */
const BSHELL_DESIGN_KEYS = ["mood", "moodBefore", "primaryColor", "fontFamily", "textStyles"];
function bshellApplyMood(d, key) {
  const next = (key && SITE_MOODS[key]) ? SITE_MOODS[key] : null;
  const cur = (d.mood && SITE_MOODS[d.mood]) ? SITE_MOODS[d.mood] : null;
  if (next) {
    const prev = {};
    BSHELL_DESIGN_KEYS.forEach((k) => { if (d[k] !== undefined) prev[k] = JSON.parse(JSON.stringify(d[k])); });
    if (!cur) {
      const styles = {};
      Object.keys(d.textStyles || {}).forEach((k) => {
        const s = d.textStyles[k] || {};
        if (s.color || s.font) styles[k] = Object.assign({}, s.color ? { color: s.color } : {}, s.font ? { font: s.font } : {});
      });
      d.moodBefore = { primaryColor: d.primaryColor, fontFamily: d.fontFamily };
      if (Object.keys(styles).length) d.moodBefore.textStyles = styles;
    }
    d.mood = key;
    d.primaryColor = next.primaryColor;
    d.fontFamily = next.bodyFont;
    Object.keys(d.textStyles || {}).forEach((k) => {
      if (d.textStyles[k]) { delete d.textStyles[k].color; delete d.textStyles[k].font; }
    });
    d.moodPrev = prev;
    return;
  }
  const before = d.moodBefore;
  if (cur && before && typeof before === "object") {
    if (String(d.primaryColor || "").toLowerCase() === cur.primaryColor.toLowerCase()) {
      if (before.primaryColor === undefined) delete d.primaryColor; else d.primaryColor = before.primaryColor;
    }
    if (d.fontFamily === cur.bodyFont) {
      if (before.fontFamily === undefined) delete d.fontFamily; else d.fontFamily = before.fontFamily;
    }
    Object.keys(before.textStyles || {}).forEach((k) => {
      d.textStyles = d.textStyles || {};
      const s = d.textStyles[k] || (d.textStyles[k] = {});
      ["color", "font"].forEach((p) => { if (before.textStyles[k][p] && !s[p]) s[p] = before.textStyles[k][p]; });
    });
  }
  delete d.mood;
  delete d.moodBefore;
  delete d.moodPrev;
}
function bshellRestorePrevDesign(d) {
  const prev = d.moodPrev;
  if (!prev || typeof prev !== "object") return false;
  BSHELL_DESIGN_KEYS.forEach((k) => {
    if (prev[k] === undefined) delete d[k]; else d[k] = JSON.parse(JSON.stringify(prev[k]));
  });
  delete d.moodPrev;
  return true;
}

/* ---------- SEO / "איך האתר נראה בגוגל" ---------- */
const BSHELL_SEO_RANGES = { title: [50, 60], description: [150, 160] };
const BSHELL_SERP_CUT = { desktop: { title: 60, description: 160 }, mobile: { title: 78, description: 120 } };
let bshellSerpDevice = "desktop";
function bshellSeoGroupHtml(d) {
  const seo = (d.seo && typeof d.seo === "object") ? d.seo : {};
  return `
    <div class="bsx-pgroup" id="bshell-seo-group">
      <div class="bsx-pgroup-title">${bsL("SEO / איך האתר נראה בגוגל", "SEO / How your site looks on Google")}</div>
      <p class="bsx-hint" style="margin:0 0 12px">${bsL("לא חובה. מה שתשאירו ריק ימולא אוטומטית משם העסק ומשורת התיאור. השינויים יופיעו באתר החי אחרי הפרסום הבא.", "Optional. Anything left empty is filled in automatically from your business name and tagline. Changes reach the live site the next time you publish.")}</p>
      <div class="bsx-field">
        <label class="bsx-label" for="bshell-seo-title">${bsL("כותרת בגוגל", "Title on Google")}</label>
        <input type="text" id="bshell-seo-title" maxlength="200" value="${escapeHtmlS(seo.title || "")}" placeholder="${bsL("לדוגמה: סטודיו לעיצוב פנים בתל אביב | שם העסק", "e.g. Interior design studio in Tel Aviv | Business name")}">
        <div class="bshell-seo-count" id="bshell-seo-title-count" aria-live="polite"></div>
      </div>
      <div class="bsx-field">
        <label class="bsx-label" for="bshell-seo-desc">${bsL("תיאור בגוגל", "Description on Google")}</label>
        <textarea id="bshell-seo-desc" class="bshell-seo-desc" maxlength="500" rows="4" placeholder="${bsL("משפט או שניים: מה אתם עושים, לאיזה אזור, ולמה לבחור בכם.", "A sentence or two: what you do, where, and why choose you.")}">${escapeHtmlS(seo.description || "")}</textarea>
        <div class="bshell-seo-count" id="bshell-seo-desc-count" aria-live="polite"></div>
      </div>
      <div class="bsx-field">
        <div class="bshell-serp-head">
          <span class="bsx-label" style="margin:0;">${bsL("תצוגה מקדימה בגוגל", "Google preview")}</span>
          <div class="bshell-serp-toggle" role="group" aria-label="${bsL("גודל מסך", "Screen size")}">
            <button type="button" data-serp-device="desktop" class="${bshellSerpDevice === "desktop" ? "active" : ""}" aria-pressed="${bshellSerpDevice === "desktop"}">${bsL("מחשב", "Desktop")}</button>
            <button type="button" data-serp-device="mobile" class="${bshellSerpDevice === "mobile" ? "active" : ""}" aria-pressed="${bshellSerpDevice === "mobile"}">${bsL("נייד", "Mobile")}</button>
          </div>
        </div>
        <div class="bshell-serp-scroll"><div class="bshell-serp" id="bshell-serp"></div></div>
      </div>
      <div class="bsx-field">
        <span class="bsx-label">${bsL("תמונה לשיתוף (וואטסאפ, פייסבוק)", "Share image (WhatsApp, Facebook)")}</span>
        <div class="bshell-og-grid" id="bshell-og-grid" role="radiogroup">${bshellOgOptionsHtml(d)}</div>
      </div>
    </div>`;
}
function bshellOgOptionsHtml(d) {
  const gallery = (d.heroImages || []).filter(Boolean);
  const chosen = (d.seo && d.seo.ogImage && d.seo.ogImage !== d.heroImage && gallery.includes(d.seo.ogImage)) ? d.seo.ogImage : "";
  const heroSrc = d.heroImage || gallery[0] || "";
  const opt = (value, src, label) => `<button type="button" class="bshell-og-opt${value === chosen ? " active" : ""}" role="radio" aria-checked="${value === chosen}" data-og="${escapeHtmlS(value)}" title="${escapeHtmlS(label)}">
      ${src ? `<img src="${escapeHtmlS(src)}" alt="">` : `<span class="site-photo-placeholder">🖼️</span>`}<span>${escapeHtmlS(label)}</span></button>`;
  if (!heroSrc) return `<p class="bsx-hint" style="margin:0;">${bsL("עדיין אין תמונות באתר. אחרי שתעלו תמונה ראשית היא תשמש גם לשיתוף.", "No images on the site yet. Once you upload a main image it's used for sharing too.")}</p>`;
  return opt("", heroSrc, bsL("התמונה הראשית", "Main image"))
    + gallery.filter((src) => src !== d.heroImage).map((src, i) => opt(src, src, bsL(`גלריה ${i + 1}`, `Gallery ${i + 1}`))).join("");
}
function bshellSeoCount(el, value, kind) {
  if (!el) return;
  const [lo, hi] = BSHELL_SEO_RANGES[kind];
  const len = Array.from(value.trim()).length;
  let state, msg;
  if (!len) { state = "empty"; msg = kind === "title" ? bsL("ריק — תוצג הכותרת האוטומטית (שם העסק)", "Empty — the automatic title (business name) is used") : bsL("ריק — יוצג התיאור האוטומטי (שורת התיאור)", "Empty — the automatic description (tagline) is used"); }
  else if (len < lo) { state = "warn"; msg = bsL(`קצר מהמומלץ (${lo}–${hi} תווים)`, `Shorter than recommended (${lo}–${hi} characters)`); }
  else if (len > hi) { state = "warn"; msg = bsL(`ארוך מהמומלץ (${lo}–${hi}) — גוגל עלול לקצר`, `Longer than recommended (${lo}–${hi}) — Google may cut it`); }
  else { state = "good"; msg = bsL("אורך מצוין", "Great length"); }
  el.className = "bshell-seo-count is-" + state;
  el.dataset.state = state;
  el.innerHTML = `<b>${len}</b>/${hi} · ${escapeHtmlS(msg)}`;
}
function bshellSerpCut(text, max) {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  let cut = chars.slice(0, max).join("");
  const space = cut.lastIndexOf(" ");
  if (space > max * 0.6) cut = cut.slice(0, space);
  return cut.replace(/[\s,.;:–—-]+$/, "") + "…";
}
function bshellSerpSource() {
  const html = currentSiteHtml("index");
  const headEnd = html.indexOf("</head>");
  const doc = new DOMParser().parseFromString(html.slice(0, headEnd > 0 ? headEnd : html.length) + "</head><body></body>", "text/html");
  const meta = doc.querySelector('meta[name="description"]');
  return { title: (doc.title || "").trim(), description: meta ? (meta.getAttribute("content") || "").trim() : "" };
}
function bshellRenderSerp() {
  const box = document.getElementById("bshell-serp");
  if (!box) return;
  const d = siteState.data;
  const src = bshellSerpSource();
  const cut = BSHELL_SERP_CUT[bshellSerpDevice];
  const liveUrl = typeof currentSiteUrl === "function" ? currentSiteUrl() : "";
  const host = (liveUrl.match(/^https?:\/\/([^/]+)/i) || [])[1] || "your-site.deskkit.co.il";
  const name = (d.businessName || "").trim() || host;
  box.className = "bshell-serp is-" + bshellSerpDevice;
  box.setAttribute("dir", d.siteLang === "en" ? "ltr" : "rtl");
  box.innerHTML = `
    <div class="bshell-serp-site">
      <span class="bshell-serp-fav" aria-hidden="true">${escapeHtmlS(Array.from(name)[0] || "D")}</span>
      <span class="bshell-serp-site-text"><span class="bshell-serp-name">${escapeHtmlS(name)}</span><bdi dir="ltr" class="bshell-serp-url">https://${escapeHtmlS(host)}</bdi></span>
    </div>
    <div class="bshell-serp-title">${escapeHtmlS(bshellSerpCut(src.title, cut.title))}</div>
    <div class="bshell-serp-desc">${src.description ? escapeHtmlS(bshellSerpCut(src.description, cut.description)) : `<span class="bshell-serp-missing">${bsL("(אין תיאור — גוגל יבחר טקסט מהעמוד בעצמו)", "(No description — Google will pick text from the page itself)")}</span>`}</div>
    ${liveUrl ? "" : `<div class="bshell-serp-note">${bsL("הכתובת הסופית תיקבע בפרסום הראשון.", "The final address is set when you first publish.")}</div>`}`;
}
function bshellSetSeoField(d, key, value) {
  d.seo = (d.seo && typeof d.seo === "object") ? d.seo : {};
  if (value.trim()) d.seo[key] = value; else delete d.seo[key];
  if (!Object.keys(d.seo).length) delete d.seo;
}
function bshellWireSeoPanel(d) {
  const titleEl = document.getElementById("bshell-seo-title");
  const descEl = document.getElementById("bshell-seo-desc");
  const bind = (el, key, countEl, kind) => {
    if (!el) return;
    bshellSeoCount(countEl, el.value, kind);
    el.addEventListener("focus", () => bshellBeginEdit(el));
    el.addEventListener("blur", () => bshellEndEdit(el));
    el.addEventListener("input", () => {
      bshellSetSeoField(siteState.data, key, el.value);
      bshellSeoCount(countEl, el.value, kind);
      bshellRenderSerp();
      bshellScheduleSave();
    });
  };
  bind(titleEl, "title", document.getElementById("bshell-seo-title-count"), "title");
  bind(descEl, "description", document.getElementById("bshell-seo-desc-count"), "description");
  document.querySelectorAll("[data-serp-device]").forEach((btn) => {
    btn.addEventListener("click", () => {
      bshellSerpDevice = btn.dataset.serpDevice;
      document.querySelectorAll("[data-serp-device]").forEach((b) => { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", String(b === btn)); });
      bshellRenderSerp();
    });
  });
  const ogGrid = document.getElementById("bshell-og-grid");
  if (ogGrid) {
    ogGrid.addEventListener("click", (e) => {
      const opt = e.target.closest(".bshell-og-opt");
      if (!opt) return;
      bshellSnapshot();
      bshellSetSeoField(siteState.data, "ogImage", opt.dataset.og || "");
      ogGrid.innerHTML = bshellOgOptionsHtml(siteState.data);
      bshellScheduleSave();
    });
  }
  bshellRenderSerp();
}
