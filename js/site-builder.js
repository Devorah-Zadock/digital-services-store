/* Business-website builder: wizard form + live iframe preview (free), with
   publishing live (watermark removal) gated behind a Gumroad license key —
   same pattern as the CV builder used before it went free (see README
   "Gumroad setup" for exact setup steps, and the honest security caveat:
   client-side check, not real DRM). DeskKit never offers a downloadable
   code export of the site — see downloadSiteZip()'s own removal comment
   further down for why. */

/* IMPORTANT: placeholder product ID/checkout link — see README before going
   live with this product. Gumroad's current UI surfaces a per-product
   "product ID" specifically for API license verification (more stable than
   the permalink, which a seller could rename later), so we verify against
   that instead of product_permalink. */
const SITE_GUMROAD_CONFIG = { productId: "NUyzNlvxdpU_49TE5nk9fg==", checkoutUrl: "https://dizstudio.gumroad.com/l/rhkfld" };
const SITE_UNLOCK_KEY = "deskkit_sites_unlocked_" + SITE_GUMROAD_CONFIG.productId;

/* EMERGENCY MANUAL SWITCH — was set true 2026-09-24 after Netlify's
   account hit its monthly production-deploy credit limit and a real
   customer paid, then hit "פרסום" (publish) and got a failure. That's
   what this flag was for: blocking new site purchases (see
   refreshUnlockUI below) so nobody pays for a "live URL" that can't be
   issued right now.
   Set back to false 2026-09-25: publish-site now self-hosts on
   DeskKit's own infrastructure (Supabase + Vercel) instead of deploying
   to Netlify — there is no external host and no shared deploy-credit
   limit of any kind left to run out of, so this specific failure mode
   can't happen anymore. Left in place (not deleted) as a manual switch
   in case some future, different hosting problem ever needs the same
   kind of "pause new purchases" response — see hosting-paused's markup
   in sites.html, still there and still wired to this flag. */
const SITE_HOSTING_PAUSED = false;
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

// Self-hosted publishing (see publish-site/index.ts's own comment: "No
// publish_count/limit here on purpose... a database upsert doesn't
// [spend shared credits] — no limit needed is the whole point of this
// migration") has genuinely no publish cap — unlike the old Netlify
// path this used to mirror, which really did spend shared, limited
// deploy credits per publish. sitePublishCount/data.publishCount are
// never actually sent by the self-hosted response, so this used to
// silently show a permanently-frozen "5 free publishes left" that never
// changes — accurate by coincidence (it never decrements), but
// describing a limit that no longer exists. Left as a no-op rather than
// deleted outright: if a real per-site publish cap is ever reintroduced
// for self-hosting, the #publish-remaining element is still there to
// use.
function renderPublishRemaining() {
  const el = document.getElementById("publish-remaining");
  if (el) el.textContent = "";
}

const SITE_DEFAULT = {
  // Site Schema Phase 1 (see the architecture plan): every new project
  // now carries its own schema version from the moment freshSiteData()
  // clones this object. A project saved before this field existed has
  // no opinion of its own — ensurePagesShape() backfills 1 for it the
  // same way it already backfills pages/heroImages/headings/textStyles,
  // not a separate migration mechanism. Bump this only when a FUTURE
  // change to this shape needs code to tell old data apart from new.
  schemaVersion: 1,
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
  // "blank" (Phase 3) is local-service under the hood (see
  // SITE_TEMPLATES.blank in site-templates.js) — this is the one place
  // that makes a brand-new blank project actually LOOK generic instead
  // of borrowing local-service's own styled identity: it starts on the
  // plain, template-agnostic Section variants from Phase 2 rather than
  // local-service's own default render. Only applies to a genuinely new
  // project (freshSiteData is never called for one that already has
  // saved data), so this never overrides a variant choice the user
  // already made and saved.
  if (template === "blank") data.blockVariants = { hero: "centered", services: "grid" };
  return data;
}

let siteState = { template: "local-service", data: freshSiteData("local-service") };
let lastVerifiedPurchase = null;
let previewPage = "index";

/* Older saved/loaded data (from before the multi-page feature existed)
   won't have a `pages` object — patch it in rather than special-casing
   every read site-wide. Also where schemaVersion gets backfilled (Phase
   1 of the architecture plan) — this function already runs on every
   load path (pre-auth loadSiteState, post-auth cloud load, every
   preview render), so it's the one proven place new-field backfills
   belong, not a reason to invent a separate migration step. Keeping its
   name as-is for this phase even though it now does a bit more than
   "pages" — a rename means touching every call site for no functional
   gain, out of scope for an additive-only change. */
function ensurePagesShape(data) {
  if (typeof data.schemaVersion !== "number") data.schemaVersion = 1;
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
    <input type="text" placeholder="שם השירות/מוצר" data-service="${i}" data-key="name" value="${escapeHtmlS(s.name)}" maxlength="40">
    <input type="text" placeholder="תיאור קצר (לא חובה)" data-service="${i}" data-key="desc" value="${escapeHtmlS(s.desc)}" maxlength="90">
    <input type="text" placeholder="מחיר (לא חובה)" data-service="${i}" data-key="price" value="${escapeHtmlS(s.price)}" maxlength="20">
  </div>`;
}

function renderServicesList() {
  document.getElementById("services-list").innerHTML =
    siteState.data.services.map((s, i) => serviceItemHtml(s, i, siteState.data.services.length)).join("");
}

function renderCurrentTplInfo() {
  const t = SITE_TEMPLATES[siteState.template];
  document.getElementById("current-tpl-info").textContent = t ? t.label : "";
}

/* The landing screen before the Wizard starts — just the primary "בניית
   אתר" CTA. Manual template browsing (a grid/search/filter catalog) used
   to live here as a secondary, collapsed option; removed entirely per
   product decision — no screen should mention "template" or show a
   catalog to choose from. SITE_TEMPLATES/SITE_CATEGORIES/SITE_FILTER_TAGS
   and the per-template thumb/tags/features metadata they drove stay
   defined (still real data; nothing reads them for an on-page catalog
   anymore) — the AI generator still picks a template internally, exactly
   as before, the customer just never sees that happening. */
function showCatalog() {
  document.getElementById("tpl-catalog-section").style.display = "";
  document.getElementById("wizard-section").style.display = "none";
  document.getElementById("builder-top-banner").style.display = "";
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = "";
}

function showWizard() {
  document.getElementById("tpl-catalog-section").style.display = "none";
  document.getElementById("wizard-section").style.display = "";
  const seo = document.getElementById("sites-seo-content");
  if (seo) seo.style.display = "none";
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
  const hasWhatsappCheckbox = document.getElementById("s-has-whatsapp");
  if (hasWhatsappCheckbox) hasWhatsappCheckbox.checked = !d.noWhatsapp;
  document.getElementById("s-whatsapp").value = d.whatsapp;
  document.getElementById("s-email").value = d.email;
  document.getElementById("s-address").value = d.address;
  document.getElementById("s-page-about").checked = d.pages.about;
  document.getElementById("s-page-contact").checked = d.pages.contact;
  document.getElementById("s-video").value = d.videoUrl || "";
  const videoBgCheckbox = document.getElementById("s-video-bg");
  if (videoBgCheckbox) videoBgCheckbox.checked = d.heroVideoBg;
  const hideCopyrightCheckbox = document.getElementById("s-hide-copyright");
  if (hideCopyrightCheckbox) hideCopyrightCheckbox.checked = !!d.hideCopyright;
  const showBsdCheckbox = document.getElementById("s-show-bsd");
  if (showBsdCheckbox) showBsdCheckbox.checked = !!d.showBsd;
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
/* Remembers what someone typed under "אחר" per heading key, purely in
   memory for this editing session — so picking a preset and then
   switching back to "אחר" restores their own text instead of showing
   it empty (confirmed live as a real point of frustration: it read as
   if their custom wording had been silently thrown away). */
let customHeadingDrafts = {};

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
    const current = d.headings[spec.key] || "";
    const isCustom = current && !options.includes(current);
    select.innerHTML = `<option value="">בחירת ניסוח מוכן…</option>` +
      options.map((o) => `<option value="${escapeHtmlS(o)}"${o === current ? " selected" : ""}>${escapeHtmlS(o)}</option>`).join("") +
      `<option value="__custom__"${isCustom ? " selected" : ""}>✏️ אחר</option>`;
    input.value = current;
    input.hidden = !isCustom;
    if (isCustom) customHeadingDrafts[spec.key] = current;
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
    <span class="ts-wrap">
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
      </div>
    </span>`;
}

/* Idempotent — safe to call again (e.g. every showWizard()) without
   duplicating the controls it already mounted the first time. The whole
   control (toggle + its popover) is one positioned ".ts-wrap" sitting
   right after the label, on the same line as it — opening the popover
   floats it over the field below instead of pushing that field (and
   everything after it) down the page, which is what made the sidebar
   feel like it never stopped growing/scrolling. */
function mountTextStyleControls() {
  TEXT_STYLE_FIELDS.forEach(({ key, afterId }) => {
    const input = document.getElementById(afterId);
    if (!input) return;
    const field = input.closest(".field");
    if (!field || field.querySelector(`[data-style-toggle="${key}"]`)) return;
    const label = field.querySelector("label");
    const tmp = document.createElement("div");
    tmp.innerHTML = textStyleControlHtml(key);
    const wrap = tmp.querySelector(".ts-wrap");
    if (label) label.insertAdjacentElement("afterend", wrap);
    else field.insertBefore(wrap, input);
    const row = wrap.querySelector("[data-style-row]");
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
    if (colorInp) {
      colorInp.value = s.color ? `#${String(s.color).replace("#", "")}` : "#000000";
      // A native <input type="color"> always reports SOME value
      // ("#000000" by default) even when nobody has ever touched it —
      // this flag is what lets commitTextStyle tell "the user actually
      // picked black" apart from "nobody picked a color at all," so
      // aligning/resizing/re-fonting a text block doesn't silently
      // force it to black too (confirmed live: it did, on every color
      // that wasn't already deliberately set).
      if (s.color) colorInp.dataset.tsTouched = "1";
      else delete colorInp.dataset.tsTouched;
    }
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
  // Same alignStyleParts() as textStyleAttr in site-templates.js — see
  // its comment for why this isn't just text-align:${s.align}.
  parts.push(...alignStyleParts(s.align));
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

/* Same idea as applyTextStyleLive, for the text itself: patches every
   element sharing this data-textkey directly instead of reloading the
   whole canvas on every keystroke. A cleared field (or a heading reset
   back to "use the template default") falls back to that template's own
   fallback text, which differs per template/section — rather than
   replicating those strings here, patchTextKeyFromFullRender() below
   generates the real HTML in memory (cheap, no navigation) and lifts the
   one element's markup out of it. Returns whether it applied. */
function applyTextContentLive(key, rawValue, multiline) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) return patchTextKeyFromFullRender(key);
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  if (!doc) return false;
  const found = doc.querySelectorAll(`[data-textkey="${key}"]`);
  if (!found.length) return false;
  const html = multiline ? nl2brS(rawValue) : escapeHtmlS(rawValue);
  found.forEach((el) => { el.innerHTML = html; });
  return true;
}

/* Generates the site's real HTML in memory (same string currentSiteHtml()
   already produces for applyGlobalStylesLive) and copies just this one
   data-textkey element's own markup onto the live, already-loaded iframe
   — used when there's no literal value to inject directly (reverting a
   heading to its template default), so that case never has to fall back
   to a full navigation either. */
function patchTextKeyFromFullRender(key) {
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  if (!doc) return false;
  const targets = doc.querySelectorAll(`[data-textkey="${key}"]`);
  if (!targets.length) return false;
  const parsed = new DOMParser().parseFromString(currentSiteHtml(previewPage), "text/html");
  const source = parsed.querySelector(`[data-textkey="${key}"]`);
  if (!source) return false;
  targets.forEach((el) => { el.innerHTML = source.innerHTML; });
  return true;
}

/* Same idea as patchTextKeyFromFullRender, widened from "one line of
   text" to "a whole section" — for edits that add/remove/rearrange
   markup (a service row, a gallery photo, the video embed) rather than
   just changing a string inside markup that's already there.

   Every template's services/about/contact/hero heading already carries
   a data-textkey ("heading-services"/"heading-about"/"heading-contact"/
   "heading-heroTitle") from the shared heading()/t() helpers in
   site-templates.js — that's what lets this work the same way across
   all ~18 templates' completely different class names and layouts,
   instead of needing a hand-maintained per-template selector map. Climb
   from that heading to its nearest ancestor that's a direct child of
   <body> — every template's siteDoc() concatenates hero/services/about/
   contact/etc. as flat siblings with no wrapping container, but not every
   one of them is literally a <section> tag (local-service's services
   block, for one, is a <div class="ls-hscroll-wrap">) — and swap that
   whole top-level block's contents.

   Returns false — same convention as every other *Live() helper here —
   whenever the section isn't there to find, which callers fall back to
   a real renderSitePreview() reload for: a template that (rarely)
   doesn't tag that heading, or a structural change like flipping
   about/contact to its own separate page, where the inline section is
   supposed to disappear entirely and a real reload is the correct,
   honest result anyway. */
/* Same idea as the hierarchy panel's own READONLY_HIER_OVERRIDES — a
   small, explicit list of the rare templates where the assumption above
   doesn't hold, rather than weakening the general rule for everyone.
   Four templates weave services straight into a hero/about mashup with
   no heading of their own to anchor on at all (confirmed by reading
   each render function): catalog reuses heading-services as its HERO
   block's eyebrow label instead ("קטלוג המוצרים שלנו" in
   catHeroSection — patching from it silently patched the hero, not the
   products grid, and the product list never actually updated); bento,
   boutique, chaos and freelancer never call heading(d,"services",...)
   on their index page at all. Each maps to a stable id already on (or
   added to) that template's own services wrapper instead — bento's and
   freelancer's didn't have one, so one was added purely for this. */
const SECTION_PATCH_ANCHOR_OVERRIDES = {
  "catalog": { "heading-services": "#cat-grid" },
  "bento": { "heading-services": "#bt-grid" },
  "boutique": { "heading-services": "#bq-grid" },
  "chaos": { "heading-services": "#oc-hscroll" },
  "freelancer": { "heading-services": "#fr-services-wrap" },
};
function patchSectionFromFullRender(headingKey) {
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  if (!doc) return false;
  const anchorSelector = (SECTION_PATCH_ANCHOR_OVERRIDES[siteState.template] || {})[headingKey];
  const findSection = (rootDoc) => {
    const anchor = anchorSelector ? rootDoc.querySelector(anchorSelector) : rootDoc.querySelector(`[data-textkey="${headingKey}"]`);
    return anchor && anchor.closest("body > *");
  };
  const liveSection = findSection(doc);
  if (!liveSection) return false;
  const parsed = new DOMParser().parseFromString(currentSiteHtml(previewPage), "text/html");
  const newSection = findSection(parsed);
  if (!newSection) return false;
  liveSection.innerHTML = newSection.innerHTML;
  // Already-visible content shouldn't fade in again — the reveal-on-
  // scroll IntersectionObserver (scrollRevealScript(), in
  // site-templates.js) only ever scans for .site-reveal elements once,
  // at initial page load, so anything patched in here would otherwise
  // sit stuck at opacity:0 forever, never observed. The user is looking
  // right at this section while editing it, so skipping straight to
  // "revealed" is also just the correct behavior, not merely a fix.
  if (liveSection.classList.contains("site-reveal")) liveSection.classList.add("site-in");
  liveSection.querySelectorAll(".site-reveal").forEach((el) => el.classList.add("site-in"));
  // Some templates give their own section a trailing <script> right
  // after its markup — the established convention for a reorderable
  // block (see renderBlocksHtml's own comment: "its script must travel
  // with it"), used for things that set themselves up once against
  // whatever's in the DOM at that moment: local-service's horizontal-
  // scroll services track, playground's drag physics. innerHTML doesn't
  // execute <script> tags, so without this they'd silently go stale
  // (still running, just against now-detached old elements) the first
  // time their section gets patched instead of reloaded. Re-injecting a
  // fresh copy as a real element (which DOES execute) re-attaches it to
  // the current DOM.
  const trailingScript = newSection.nextElementSibling;
  if (trailingScript && trailingScript.tagName === "SCRIPT") {
    const script = doc.createElement("script");
    script.textContent = trailingScript.textContent;
    liveSection.after(script);
  }
  // The hero photo gallery's crossfade timer is different: it's not a
  // trailing sibling of any one section, but one script injected once,
  // globally, at the very end of <body> (heroSlideshowScript(), via
  // siteDoc()) — reusing the same trick, just targeting the whole doc.
  if (headingKey === "heading-heroTitle" && liveSection.querySelector(".site-hero-slideshow")) {
    const script = doc.createElement("script");
    script.textContent = heroSlideshowScript().replace(/^<script>|<\/script>$/g, "");
    doc.body.appendChild(script);
  }
  return true;
}

/* Shared by every call site above that mutates section-level markup
   (not just a text string): try the live patch, and only fall back to
   the full reload when the section genuinely can't be found. Keeps
   saveSiteState()/renderHierarchyPanel() in sync with renderSitePreview
   either way, since a live patch skips renderSitePreview() entirely. */
function commitSectionPatch(headingKey) {
  if (patchSectionFromFullRender(headingKey)) {
    saveSiteState();
    if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
  } else {
    renderSitePreview();
  }
}

/* Primary color and font family are global — every #${pal.primary}/
   #${pal.primaryDark}/#${pal.ice} in the template's CSS, and the body
   font, potentially change at once. That's still just CSS (siteDoc()
   puts the whole template's styling in one <style> tag), so swapping
   that tag's content — and, for a font change, the Google Fonts <link>
   tags that load it — updates every color/font on screen instantly
   without navigating the iframe away at all: no reload flash, no lost
   scroll position, and no risk of re-triggering a template's own
   load-time script (confirmed live: playground's physics init, which a
   real reload used to re-run mid-interaction). */
function applyGlobalStylesLive() {
  const frame = document.getElementById("site-preview-frame");
  const doc = frame && frame.contentDocument;
  const styleEl = doc && doc.querySelector("style");
  if (!styleEl) return false;
  const html = currentSiteHtml(previewPage);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) return false;
  styleEl.textContent = styleMatch[1];
  const linkMatches = html.match(/<link rel="preconnect"[^>]*>|<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g);
  if (linkMatches) {
    doc.querySelectorAll('head link[rel="preconnect"], head link[href*="fonts.googleapis.com"]').forEach((el) => el.remove());
    doc.head.insertAdjacentHTML("afterbegin", linkMatches.join(""));
  }
  return true;
}

function commitTextStyle(key) {
  const fontSel = document.querySelector(`[data-style-font="${key}"]`);
  const colorInp = document.querySelector(`[data-style-color="${key}"]`);
  const sizeInp = document.querySelector(`[data-style-size="${key}"]`);
  const activeAlignBtn = document.querySelector(`[data-style-align="${key}"].ts-active`);
  const s = {
    font: (fontSel && fontSel.value) || "",
    // Only counts if the user actually touched the color input — see
    // the dataset.tsTouched comment in syncTextStyleControls for why
    // colorInp.value alone isn't enough to tell that.
    color: (colorInp && colorInp.dataset.tsTouched && colorInp.value) ? colorInp.value.replace("#", "") : "",
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
      if (!row) return;
      const opening = row.hidden;
      // Only one popover open at a time — otherwise a second "Aa" click
      // without closing the first leaves two floating panels stacked on
      // screen, right back to the clutter this redesign is meant to fix.
      closeAllTextStylePopovers(root);
      row.hidden = !opening;
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
    if (e.target.matches("[data-style-color]")) {
      e.target.dataset.tsTouched = "1";
      commitTextStyle(e.target.dataset.styleColor);
    }
    if (e.target.matches("[data-style-size]")) commitTextStyle(e.target.dataset.styleSize);
  });

  // A floating popover left open after clicking elsewhere would just be a
  // different kind of clutter — close it the moment the user's attention
  // visibly moves away, same as any other popover/menu pattern.
  document.addEventListener("click", (e) => {
    if (e.target.closest(".ts-wrap")) return;
    closeAllTextStylePopovers(root);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllTextStylePopovers(root);
  });
}

function closeAllTextStylePopovers(root) {
  root.querySelectorAll("[data-style-row]").forEach((row) => { row.hidden = true; });
}

/* Uploads to the "site-images" Storage bucket (see supabase/sql/
   site_images_bucket.sql) and returns its public URL — or null on
   failure. Replaces the old FileReader.readAsDataURL() path: a base64
   photo baked directly into the saved HTML meant every single page view
   re-sent the whole image with zero caching of its own, and bloated
   every row in hosted_site_pages by however many megabytes the photo
   was. A real uploaded file, referenced by a short URL string, is just
   as transparent to everything downstream (site-templates.js and the
   preview code only ever put this value inside src="...", never cared
   whether that was a data: URI or an https:// URL) — so nothing else
   needed to change, and it's purely additive: every already-published
   site keeps its existing base64 images exactly as they are.
   Namespaced "<user id>/<template>/<name>.<ext>" — same convention the
   "logos" bucket already uses (invoice-app.js/quote-app.js) — so RLS can
   enforce one customer can never touch another's files, and so a user
   with more than one template/project never collides between them. */
async function uploadSiteImage(file, name) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${siteCurrentUserId}/${siteState.template}/${name}.${ext}`;
  const { error } = await supabaseClient.storage.from("site-images").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabaseClient.storage.from("site-images").getPublicUrl(path);
  return data.publicUrl + "?t=" + Date.now();
}

function renderPhotoPreview() {
  const el = document.getElementById("s-photo-preview");
  el.innerHTML = siteState.data.heroImage
    ? `<img src="${siteState.data.heroImage}" alt="תמונת הכותרת שהעליתם">`
    : `<span class="site-photo-placeholder">🖼️</span>`;
}

const SITE_GALLERY_MAX = 5;
function renderGalleryPreview() {
  const el = document.getElementById("s-gallery-preview");
  const images = siteState.data.heroImages || [];
  el.innerHTML = images.map((src, i) =>
    `<div class="site-gallery-thumb" data-idx="${i}"><img src="${src}" alt="תמונה ${i + 1} בגלריה"><button type="button" data-action="remove-gallery-photo" aria-label="הסרה">✕</button></div>`
  ).join("");
}

function enabledSitePages() {
  const d = ensurePagesShape(siteState.data);
  const pages = ["index"];
  if (d.pages.about) pages.push("about");
  if (d.pages.contact) pages.push("contact");
  return pages;
}

// Freemium publish model: a project that hasn't been paid for yet gets a
// small "נבנה ב-DeskKit" badge; a paid one doesn't. Checked straight from
// localStorage's unlock flag (the SAME check refreshUnlockUI() already
// uses) rather than siteIsFinalized — siteIsFinalized only turns true
// once finalizeSiteProject() actually runs, and while that now happens
// right alongside the unlock flag (verifySiteLicense sets both within
// the same success handler), the unlock flag is the one set first and
// is the simpler, more direct signal to read here. Deliberately added
// HERE, inside the one function every render path already goes through
// (preview iframe, live-patch diffing, the publish payload) — not a
// separate integration per call site. This client-side badge is a
// UX-honesty measure ("what you preview is what you'll get"), NOT the
// real security boundary: a technical user could still strip it
// locally before publishing. The actual, non-bypassable
// enforcement is server-side, in publish-site/index.ts, which ignores
// whatever badge markup (or lack of one) arrives in the request and
// re-decides for itself from the real license_redemptions check — see
// that file's own comment. Keep DESKKIT_WATERMARK_ID in sync with that
// file's constant.
const DESKKIT_WATERMARK_ID = "deskkit-badge";
function siteWatermarkHtml() {
  return `<a id="${DESKKIT_WATERMARK_ID}" href="https://deskkit.co.il" target="_blank" rel="noopener" style="position:fixed;bottom:14px;inset-inline-start:14px;z-index:999999;background:rgba(20,20,20,.86);color:#fff;font-family:Heebo,Arial,sans-serif;font-size:12px;font-weight:600;padding:7px 14px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,.25);text-decoration:none;">נבנה ב-DeskKit ✨</a>`;
}
function currentSiteHtml(page) {
  const html = SITE_TEMPLATES[siteState.template].render(siteState.data, page || "index");
  const unlocked = typeof currentUnlockKey === "function" && localStorage.getItem(currentUnlockKey()) === "1";
  if (unlocked) return html;
  return html.includes("</body>") ? html.replace("</body>", siteWatermarkHtml() + "</body>") : html + siteWatermarkHtml();
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
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  flashHighlight(el);
}

/* A silent scroll alone wasn't enough — confirmed live as "אני לא מבינה
   איפה בדיוק רואים" (landing near the right spot didn't read as "this,
   right here, is it"). A brief outline flash removes the ambiguity. Pure
   inline style (outline never affects layout), self-cleans, and restores
   whatever style the element had before. */
function flashHighlight(el) {
  const prev = { outline: el.style.outline, offset: el.style.outlineOffset, transition: el.style.transition };
  el.style.transition = "outline-color .3s ease";
  el.style.outline = "3px solid #FF6B4A";
  el.style.outlineOffset = "3px";
  setTimeout(() => {
    el.style.outline = "3px solid transparent";
    setTimeout(() => {
      el.style.outline = prev.outline;
      el.style.outlineOffset = prev.offset;
      el.style.transition = prev.transition;
    }, 350);
  }, 1000);
}

const HIER_ICON_BY_KEY = { hero: "⌂", heroTitle: "⌂", services: "▦", about: "ℹ", contact: "✉" };
function hierRowHtml({ label, key, hasToggle, expanded, actions, childClass }) {
  const icon = childClass ? "–" : (HIER_ICON_BY_KEY[key] || "•");
  return `
    <div class="hier-row${childClass ? ` ${childClass}` : ""}" data-hier-key="${key}">
      ${hasToggle ? `<span class="hier-icon hier-group-toggle${expanded ? " open" : ""}" data-hier-toggle="${key}">▸</span>` : `<span class="hier-icon">${icon}</span>`}
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
  // Site-level AI commands (Phase 7, js/site-ai-command.js) only make
  // sense where a real Section/block system exists to operate on —
  // shown/hidden in step with the exact same "migrated" check the rest
  // of this function already uses, not a separate one.
  const aiCommandRow = document.getElementById("site-ai-command-row");
  if (aiCommandRow) aiCommandRow.style.display = migrated ? "" : "none";
  // Pure-navigation rows (no reorder/add/remove controls, just "jump to
  // this section") don't need full-width cards — a wrapping row of small
  // pills says the same thing in a fraction of the height. The migrated,
  // reorderable tree keeps real cards since its rows carry actual
  // controls (▲▼✕, nested items) that need the extra room and precision.
  tree.classList.toggle("hier-pills", !migrated);
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
  // Same universal data-textkey selectors FIELD_SCROLL_TARGETS already
  // uses — unlike a template-specific CSS class (.ls-hero/.pg-hero),
  // these keep working regardless of which Section Variant (Phase 2) is
  // currently active for that block, since every variant renders through
  // the same heading()/t() calls. Also what makes "blank" (Phase 3,
  // rendered via local-service's own markup) work here for free, with
  // no template-specific case needed. catalog still needs its own
  // SECTION_PATCH_ANCHOR_OVERRIDES anchor for "services" — its
  // heading-services textkey actually lives on the HERO's eyebrow
  // caption (see that table's own comment), not on the products grid.
  const servicesAnchorOverride = (SECTION_PATCH_ANCHOR_OVERRIDES[template] || {})["heading-services"];
  const scrollTargets = {
    hero: '[data-textkey="heading-heroTitle"], [data-textkey="businessName"]',
    services: servicesAnchorOverride || '[data-textkey="heading-services"]',
    about: '[data-textkey="heading-about"]',
    contact: '[data-textkey="heading-contact"]',
    // bento's fused "grid" block has no heading textkey of its own —
    // #bt-grid is the one stable anchor every cell inside it renders
    // into, regardless of which cells are currently active.
    grid: "#bt-grid",
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
    // Variant picker (Phase 2, Generic Section System) — only shown for a
    // block type that actually has real alternates defined; switching it
    // never touches d.services/d.businessName/etc., only how this one
    // section is laid out. Rendered as its own always-visible row rather
    // than packed into .hier-actions (which is hover-only, meant for the
    // small ▲▼✕ icon buttons — a variant choice should stay visible).
    const variantOpts = typeof variantOptionsFor === "function" ? variantOptionsFor(template, type) : null;
    if (variantOpts) {
      const current = (d.blockVariants && d.blockVariants[type]) || "default";
      html += `<div class="hier-variant-row">
        <span class="hier-variant-label">סגנון תצוגה</span>
        <select class="hier-variant-select" data-hier-variant="${type}">
          ${Object.keys(variantOpts).map((k) => `<option value="${k}"${k === current ? " selected" : ""}>${escapeHtmlS(variantOpts[k].label)}</option>`).join("")}
        </select>
      </div>`;
    }
    if (isServices) {
      const services = d.services || [];
      const childRows = services.map((s, idx) => `
        <div class="hier-row hier-child" data-hier-svc="${idx}">
          <span class="hier-icon">–</span>
          <span class="hier-label">${escapeHtmlS(s.name && s.name.trim() ? s.name : `שירות ${idx + 1}`)}</span>
          <span class="hier-actions">${services.length > 1 ? `<button type="button" class="hier-btn" data-hier-svc-remove="${idx}" title="הסרה">✕</button>` : ""}</span>
        </div>`).join("");
      // No "+ הוספת שירות" here on purpose — confirmed live as a
      // confusing second entry point for the exact same action the
      // services field section (below, on this same sidebar) already
      // owns. This tree only ever needs to view/reorder/remove what's
      // already there.
      html += `<div class="hier-children${hierExpanded.services ? "" : " collapsed"}" data-hier-children="services">
        ${childRows}
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
  tree.querySelectorAll("[data-hier-variant]").forEach((select) => {
    select.addEventListener("change", () => {
      if (!d.blockVariants || typeof d.blockVariants !== "object") d.blockVariants = {};
      d.blockVariants[select.dataset.hierVariant] = select.value;
      renderSitePreview();
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
/* Same debounce, but for a typing field (the video URL) whose live
   patch doesn't need a real navigation — commitSectionPatch() still
   falls back to renderSitePreview() on its own if the section can't be
   found, so this stays safe even mid-typing an unrecognized URL. */
function scheduleSectionPatch(headingKey) {
  clearTimeout(sitePreviewRenderTimer);
  sitePreviewRenderTimer = setTimeout(() => commitSectionPatch(headingKey), 500);
}

/* "Where does this field even show up?" was a real, repeated point of
   confusion (most acutely for aboutText, which often sits well below
   the fold) — focusing a field now scrolls the canvas straight to the
   element it edits, the same target the hierarchy panel's own rows
   already use. */
const FIELD_SCROLL_TARGETS = {
  // Several templates only ever print businessName itself in the
  // footer's copyright line — the hero heading (heading-heroTitle)
  // shows it too, by default, but that's a SEPARATE data-textkey (it
  // falls back to businessName only at render time). A plain
  // businessName selector alone scrolled straight past the hero to
  // the footer for those templates — confirmed live (studio: no
  // businessName-tagged element anywhere except its footer line),
  // which read as "the site starts from the middle." Comma-selector
  // prefers whichever comes first in the page, which is always the
  // hero when it exists.
  "s-name": '[data-textkey="heading-heroTitle"], [data-textkey="businessName"]',
  "s-tagline": '[data-textkey="tagline"]',
  "s-about": '[data-textkey="aboutText"]',
  "h-heroTitle": '[data-textkey="heading-heroTitle"]',
  "h-services": '[data-textkey="heading-services"]',
  "h-about": '[data-textkey="heading-about"]',
  "h-contact": '[data-textkey="heading-contact"]',
};
function wireFieldFocusScroll() {
  Object.entries(FIELD_SCROLL_TARGETS).forEach(([id, selector]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("focus", () => scrollCanvasTo(selector));
  });
}

function wireForm() {
  const map = {
    "s-name": "businessName", "s-tagline": "tagline", "s-about": "about",
    "s-phone": "phone", "s-whatsapp": "whatsapp", "s-email": "email", "s-address": "address",
  };
  // The 3 content fields that also have a data-textkey (see
  // applyTextContentLive) skip the reload pipeline entirely while typing.
  const liveContentKeys = { "s-name": "businessName", "s-tagline": "tagline", "s-about": "aboutText" };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      siteState.data[key] = e.target.value;
      const textkey = liveContentKeys[id];
      const patched = textkey && applyTextContentLive(textkey, e.target.value, id === "s-about");
      // businessName is also the hero heading's own fallback text
      // whenever no custom heroTitle override is set (heading(d,
      // "heroTitle", dd.businessName) in site-templates.js) — a full
      // reload always picked that up automatically; this keeps the
      // live-patch path doing the same, instead of silently leaving
      // the hero showing the old name until something else forces a
      // real reload. Independent of the patched/reload branch below:
      // heroTitle simply not being on this template's page, or already
      // customized, is not itself a reason to fall back to a reload.
      if (id === "s-name" && !siteState.data.headings.heroTitle) {
        applyTextContentLive("heading-heroTitle", e.target.value, false);
      }
      if (patched) {
        saveSiteState();
      } else {
        scheduleSitePreviewRender();
      }
    });
  });
  const hasWhatsappCheckbox = document.getElementById("s-has-whatsapp");
  if (hasWhatsappCheckbox) {
    hasWhatsappCheckbox.addEventListener("change", (e) => {
      siteState.data.noWhatsapp = !e.target.checked;
      saveSiteState();
      // The WhatsApp button/floating action button isn't a data-textkey
      // any live-patch helper tracks — same reasoning as the copyright
      // toggle: a real reload is simplest, and this isn't an every-
      // keystroke field.
      renderSitePreview();
    });
  }
  document.getElementById("s-color").addEventListener("input", (e) => {
    siteState.data.primaryColor = e.target.value;
    if (applyGlobalStylesLive()) saveSiteState();
    else scheduleSitePreviewRender();
  });

  document.getElementById("s-font").addEventListener("change", (e) => {
    siteState.data.fontFamily = e.target.value;
    if (applyGlobalStylesLive()) saveSiteState();
    else renderSitePreview();
  });

  document.getElementById("h-heroTitle").addEventListener("input", (e) => {
    siteState.data.headings.heroTitle = e.target.value;
    if (applyTextContentLive("heading-heroTitle", e.target.value, false)) saveSiteState();
    else scheduleSitePreviewRender();
  });

  ["services", "about", "contact"].forEach((key) => {
    const select = document.getElementById(`h-${key}-pick`);
    const input = document.getElementById(`h-${key}`);
    if (!select || !input) return;
    // The free-text box only ever shows for the "אחר" choice — a preset
    // pick (or clearing back to "בחירת ניסוח מוכן…") hides it again,
    // matching what's actually in effect instead of leaving it sitting
    // there unused. See customHeadingDrafts for why re-selecting "אחר"
    // brings back whatever was typed rather than an empty box.
    select.addEventListener("change", () => {
      if (select.value === "__custom__") {
        input.hidden = false;
        input.value = customHeadingDrafts[key] || "";
        input.focus();
      } else {
        input.hidden = true;
        input.value = select.value;
      }
      siteState.data.headings[key] = select.value === "__custom__" ? input.value : select.value;
      if (!applyTextContentLive(`heading-${key}`, siteState.data.headings[key], false)) renderSitePreview();
      else saveSiteState();
    });
    input.addEventListener("input", () => {
      siteState.data.headings[key] = input.value;
      customHeadingDrafts[key] = input.value;
      if (applyTextContentLive(`heading-${key}`, input.value, false)) saveSiteState();
      else scheduleSitePreviewRender();
    });
  });

  document.getElementById("s-photo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert("התמונה גדולה מדי — בחרו קובץ עד 6MB.");
      e.target.value = "";
      return;
    }
    const url = await uploadSiteImage(file, "hero");
    if (!url) {
      alert("העלאת התמונה נכשלה, נסו שוב.");
      e.target.value = "";
      return;
    }
    siteState.data.heroImage = url;
    renderPhotoPreview();
    commitSectionPatch("heading-heroTitle");
  });
  document.getElementById("s-photo-remove").addEventListener("click", () => {
    siteState.data.heroImage = "";
    document.getElementById("s-photo").value = "";
    renderPhotoPreview();
    commitSectionPatch("heading-heroTitle");
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
    toAdd.forEach(async (file) => {
      if (file.size > 6 * 1024 * 1024) {
        alert(`"${file.name}" גדולה מדי — בחרו קובץ עד 6MB.`);
        remaining -= 1;
        if (remaining === 0) { renderGalleryPreview(); commitSectionPatch("heading-heroTitle"); }
        return;
      }
      // Each gallery photo gets its own unique name (unlike the single,
      // stable "hero" slot) — several can be mid-upload at once, and
      // photos get removed/re-added independently of each other.
      const name = "gallery-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const url = await uploadSiteImage(file, name);
      if (!url) {
        alert(`העלאת "${file.name}" נכשלה, נסו שוב.`);
      } else {
        siteState.data.heroImages.push(url);
      }
      remaining -= 1;
      if (remaining === 0) { renderGalleryPreview(); commitSectionPatch("heading-heroTitle"); }
    });
    e.target.value = "";
  });
  document.getElementById("s-gallery-preview").addEventListener("click", (e) => {
    const btn = e.target.closest('[data-action="remove-gallery-photo"]');
    if (!btn) return;
    const idx = parseInt(btn.closest("[data-idx]").dataset.idx, 10);
    siteState.data.heroImages.splice(idx, 1);
    renderGalleryPreview();
    commitSectionPatch("heading-heroTitle");
  });

  document.getElementById("s-video").addEventListener("input", (e) => {
    siteState.data.videoUrl = e.target.value;
    scheduleSectionPatch("heading-heroTitle");
  });
  const videoBgCheckbox = document.getElementById("s-video-bg");
  if (videoBgCheckbox) {
    videoBgCheckbox.addEventListener("change", (e) => {
      siteState.data.heroVideoBg = e.target.checked;
      commitSectionPatch("heading-heroTitle");
    });
  }
  const showBsdCheckbox = document.getElementById("s-show-bsd");
  if (showBsdCheckbox) {
    showBsdCheckbox.addEventListener("change", (e) => {
      siteState.data.showBsd = e.target.checked;
      saveSiteState();
      renderSitePreview(); // same full reload as #s-hide-copyright below
    });
  }
  const hideCopyrightCheckbox = document.getElementById("s-hide-copyright");
  if (hideCopyrightCheckbox) {
    hideCopyrightCheckbox.addEventListener("change", (e) => {
      siteState.data.hideCopyright = e.target.checked;
      saveSiteState();
      // The footer isn't a data-textkey the live-patch helpers track (it's
      // plain markup, not editable text) — a real reload is simplest and
      // this checkbox is toggled rarely, not on every keystroke like the
      // fields those helpers exist for.
      renderSitePreview();
    });
  }

  document.getElementById("s-page-about").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.about = e.target.checked;
    commitSectionPatch("heading-about");
  });
  document.getElementById("s-page-contact").addEventListener("change", (e) => {
    ensurePagesShape(siteState.data).pages.contact = e.target.checked;
    commitSectionPatch("heading-contact");
  });

  document.getElementById("add-service").addEventListener("click", addServiceItem);
  document.getElementById("services-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.service;
    const key = e.target.dataset.key;
    if (idx === undefined) return;
    siteState.data.services[idx][key] = e.target.value;
    scheduleSectionPatch("heading-services");
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
  commitSectionPatch("heading-services");
}
function removeServiceItem(idx) {
  if (siteState.data.services.length <= 1) return;
  siteState.data.services.splice(idx, 1);
  renderServicesList();
  commitSectionPatch("heading-services");
}

// publishGuideText()/siteExportAuthorized()/downloadSiteZip() — a
// paid-only "ייצוא קובצי האתר" ZIP download under "אפשרויות נוספות" —
// removed entirely per explicit product decision: DeskKit is a
// published, managed site, never a downloadable code export, with no
// button/link/promise of one left anywhere in the product (this is
// the second time this exact feature has been removed; see git
// history, commit b7a7d15, for the first). JSZip's own <script> tag
// in sites.html was removed along with this.

/* One click to a live URL, via the publish-site Edge Function (see
   supabase/functions/publish-site) — no ZIP, no dragging files to
   Netlify Drop by hand. "ייצוא קובצי האתר" above (paid accounts only,
   under "אפשרויות נוספות") stays as a secondary way to keep a portable
   copy — publishing itself is still the one primary action. */
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
    if (data.reason === "host_unavailable") {
      // Netlify itself is refusing new deploys account-wide (see
      // SITE_HOSTING_PAUSED's comment) — not a per-user glitch, so "try
      // again in a moment" would be false. Only reachable from the old,
      // now-unreachable Netlify fallback path in publish-site/index.ts —
      // self-hosted publishing doesn't depend on Netlify at all — kept
      // as a non-broken message in case that path is ever reactivated,
      // rather than assuming it can truly never fire.
      note.innerHTML = `פרסום לאוויר זמנית לא זמין אצלנו בגלל עומס אצל ספק האחסון — זה לא קשור לרכישה שלכם, והיא בתוקף. האתר שלכם שמור ומוכן; אפשר לנסות לפרסם שוב בעוד כמה דקות מאותו מסך. תקועים? <a href="mailto:${["digital.dz.studio", "gmail.com"].join("@")}?subject=${encodeURIComponent("פרסום נכשל — בניית אתר")}" style="color:inherit; text-decoration:underline;">כתבו לנו</a>.`;
      return;
    }
    if (data.reason === "not_purchased") {
      // Should be unreachable from this UI — reaching this point means
      // financeGateOpened/unlock-done are already showing, which only
      // happens after a real redeem-license success. Kept as a plain,
      // non-broken message rather than assuming it can never happen.
      note.textContent = "לא נמצאה רכישה מאומתת לתבנית הזו. אם כבר רכשתם, נסו לאמת את קוד הרישוי מחדש.";
      return;
    }
    if (data.reason === "limit_reached") {
      // Same as host_unavailable above: only reachable from the
      // unreachable old Netlify fallback path — self-hosted publishing
      // has no such limit at all (see publish-site/index.ts's own
      // comment). Kept as a non-broken message, not assumed dead.
      sitePublishCount = data.publishCount;
      renderPublishRemaining();
      note.innerHTML = `הגעתם למספר המרבי של עדכוני פרסום חינמיים לאתר הזה. רוצים להמשיך לפרסם דרכנו? <a href="mailto:${["digital.dz.studio", "gmail.com"].join("@")}?subject=${encodeURIComponent("בקשה להמשך פרסום — בניית אתר")}" style="color:inherit; text-decoration:underline;">כתבו לנו</a>.`;
      return;
    }
    if (!data.success) {
      note.textContent = "הפרסום נכשל. נסו שוב בעוד רגע.";
      return;
    }
    if (typeof data.publishCount === "number") { sitePublishCount = data.publishCount; renderPublishRemaining(); }
    // Claim first, link second — not the other way around. The free
    // netlify.app URL works immediately either way, but every site
    // publishes under DeskKit's own Netlify account until claimed (see
    // publish-site's own comment: that's what keeps hosting liability
    // off a free plan meant for many customers at once). Showing the
    // link before the claim step trained people to skip it. See
    // renderPublishClaimedScreen for why this counts a claim as done
    // the moment the button is clicked, not verified.
    if (data.claimUrl) {
      note.innerHTML = `
        <a href="${data.claimUrl}" target="_blank" rel="noopener" id="publish-claim-btn" class="btn btn-gold" style="width:100%; box-sizing:border-box; text-align:center; display:block;">שלב אחרון: לחצו כאן להפעלת האתר וקבלת בעלות מלאה (חינם לתמיד) 🚀</a>
        <div class="claim-steps">
          <b>💡 שלב חובה להפעלת האתר:</b>
          <ol>
            <li>לחצו על הכפתור למעלה — ייפתח לכם חלון חדש של Netlify.</li>
            <li>בחלון שייפתח, לחצו על הכפתור הטורקיז/ירוק הגדול שכתוב עליו <bdi>"Claim apps"</bdi> (במידה ואין לכם חשבון, תתחברו קודם בחינם ברגע).</li>
            <li>מיד לאחר שלחצתם, חזרו לכאן לאתר כדי לקבל את הקישור הרשמי והסופי שלכם.</li>
          </ol>
          אם תלחצו על הכפתור <bdi>"Claim apps"</bdi> בתוך Netlify, האתר יישמר בחשבון האישי שלכם ותוכלו לעדכן אותו בעתיד.
        </div>
      `;
      document.getElementById("publish-claim-btn").addEventListener("click", () => renderPublishClaimedScreen(data.url), { once: true });
    } else {
      renderPublishClaimedScreen(data.url, data.selfHosted, data.slug);
    }
  } catch (err) {
    note.textContent = "הפרסום נכשל. נסו שוב בעוד רגע.";
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

/* The actual "you're done" screen — reached either straight from
   publishSite() (no claimUrl at all — nothing to gate on) or once the
   claim button above has been clicked. Netlify's claim flow opens in a
   new tab on their own domain and has no callback wired up to tell this
   page it actually finished (confirmed in publish-site/index.ts's own
   setup comment: "no redirect URI needed for this flow") — so this is
   deliberately optimistic, the same trust-the-click model the buy/
   license flow above already uses, rather than leaving the customer
   staring at a spinner for a confirmation that isn't coming. */
// A self-hosted slug auto-generated by publish-site (no picker wired in
// yet at the time it first published) always looks like "site-XXXXXXXX"
// — 8 lowercase hex chars, matching siteProjectId.replace(/-/g,"").
// slice(0,8) exactly. A customer-chosen name (via the picker below) can
// never accidentally match this shape (check-site-slug's own slugify()
// never emits it either), so this is a safe, one-sided test: it only
// ever flags a real not-yet-renamed auto slug.
const AUTO_SLUG_PATTERN = /^site-[0-9a-f]{8}$/;

function renderPublishClaimedScreen(url, selfHosted, slug) {
  const note = document.getElementById("publish-note");
  // The site's current address is THE answer here — open it, copy it.
  // Choosing a different address is a secondary, tucked-away option
  // (collapsed until asked for), whether the address was auto-generated
  // or picked earlier.
  const offerRename = selfHosted && slug;
  const isAuto = slug && AUTO_SLUG_PATTERN.test(slug);
  note.innerHTML = `
    <div style="margin-bottom:4px; font-weight:700; color:var(--ink-dark);">האתר שלכם באוויר ✓</div>
    <div class="publish-url-box">
      <span id="publish-url-text" dir="ltr">${url}</span>
      <button type="button" id="publish-copy-btn" class="btn-mini publish-copy-btn">העתקת קישור</button>
    </div>
    <a href="${url}" target="_blank" rel="noopener" class="btn btn-teal" style="display:block; text-align:center; margin-top:10px;">פתיחת האתר ↗</a>
    <!-- Custom-domain connect button removed for now (per explicit
         request — feature not ready to expose yet). js/domain-guide.js
         still has the real implementation; re-enable by restoring this
         button and the addEventListener call below it. -->
    ${offerRename ? `
    <div style="margin-top:12px; text-align:center;">
      <button type="button" id="slug-rename-toggle" class="cx-link-btn" style="background:none; border:none; color:var(--grey); text-decoration:underline; cursor:pointer; font-family:inherit; font-size:13px;">${isAuto ? "✏️ להחליף לכתובת עם שם משלכם" : "✏️ שינוי כתובת האתר"}</button>
    </div>
    <div class="host-info-box" id="slug-rename-box" style="margin-top:10px;" hidden>
      <b>כתובת חדשה לאתר</b>
      <div style="font-size:12.5px; color:var(--grey); margin-top:4px;">שימו לב: אחרי השינוי, הכתובת הנוכחית תפסיק לעבוד — כדאי לעדכן אותה בכל מקום ששיתפתם.</div>
      <div style="display:flex; align-items:center; gap:8px; background:var(--white); border:2px solid #DDE4E1; border-radius:10px; padding:8px 12px; margin-top:8px;">
        <input type="text" id="slug-rename-input" placeholder="my-business-name" dir="ltr" autocomplete="off" style="flex:1; border:none; outline:none; font-family:inherit; font-size:14px; direction:ltr; text-align:left; background:transparent;">
        <span style="color:var(--grey); font-size:13px; white-space:nowrap;">.deskkit.co.il</span>
      </div>
      <div id="slug-rename-status" style="margin-top:6px; font-size:13px; font-weight:600; min-height:18px;"></div>
      <div id="slug-rename-suggestions" style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;"></div>
      <button type="button" id="slug-rename-confirm-btn" class="btn btn-teal" style="width:100%; margin-top:8px;" disabled>שינוי הכתובת</button>
    </div>` : ""}
  `;
  if (offerRename) {
    document.getElementById("slug-rename-toggle").addEventListener("click", () => {
      const box = document.getElementById("slug-rename-box");
      box.hidden = !box.hidden;
      if (!box.hidden) document.getElementById("slug-rename-input").focus();
    });
  }
  document.getElementById("publish-copy-btn").addEventListener("click", async (e) => {
    const copyBtn = e.currentTarget;
    const original = copyBtn.textContent;
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = "הועתק ✓";
    } catch (err) {
      copyBtn.textContent = "לא הצלחנו להעתיק — סמנו ידנית";
    }
    setTimeout(() => { copyBtn.textContent = original; }, 2000);
  });
  // document.getElementById("publish-domain-guide-btn").addEventListener("click", () => openDomainGuide(siteProjectId));
  if (offerRename) wireSlugRenameUI();
}

/* Gmail-style live availability check (see check-site-slug/claim-site-
   slug Edge Functions) — reused here exactly as proven in the standalone
   site-slug-test.html, wired into the real publish-success screen this
   time instead of a throwaway test page. Only ever mounted when
   renderPublishClaimedScreen actually rendered this markup (see
   offerRename above), so the element lookups below are safe. */
function wireSlugRenameUI() {
  const input = document.getElementById("slug-rename-input");
  const status = document.getElementById("slug-rename-status");
  const suggestionsEl = document.getElementById("slug-rename-suggestions");
  const confirmBtn = document.getElementById("slug-rename-confirm-btn");
  let debounceTimer = null;
  let requestSeq = 0;
  let checkedAvailableSlug = null;

  async function checkSlug(value) {
    const mySeq = ++requestSeq;
    status.style.color = "var(--grey)";
    status.textContent = "בודקים...";
    suggestionsEl.innerHTML = "";
    confirmBtn.disabled = true;
    checkedAvailableSlug = null;
    const { data, error } = await supabaseClient.functions.invoke("check-site-slug", { body: { desired: value } });
    if (mySeq !== requestSeq) return;
    if (error || !data) {
      status.style.color = "#B3401E";
      status.textContent = "שגיאה בבדיקה. נסו שוב.";
      return;
    }
    if (data.available) {
      status.style.color = "#1E7A4C";
      status.textContent = "✓ פנוי: " + data.slug + ".deskkit.co.il";
      checkedAvailableSlug = data.slug;
      confirmBtn.disabled = false;
      return;
    }
    const reasonText = {
      invalid: "שם לא תקין — רק אותיות אנגליות, ספרות ומקפים.",
      reserved: "השם הזה שמור למערכת.",
      taken: "השם הזה כבר תפוס.",
    }[data.reason] || "השם הזה לא זמין.";
    status.style.color = "#B3401E";
    status.textContent = "✗ " + reasonText;
    (data.suggestions || []).forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-mini";
      btn.textContent = s;
      btn.addEventListener("click", () => { input.value = s; checkSlug(s); });
      suggestionsEl.appendChild(btn);
    });
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const value = input.value.trim();
    confirmBtn.disabled = true;
    checkedAvailableSlug = null;
    if (!value) { status.textContent = ""; suggestionsEl.innerHTML = ""; return; }
    debounceTimer = setTimeout(() => checkSlug(value), 400);
  });

  confirmBtn.addEventListener("click", async () => {
    if (!checkedAvailableSlug || !siteProjectId) return;
    confirmBtn.disabled = true;
    const original = confirmBtn.textContent;
    confirmBtn.textContent = "משנה כתובת...";
    const { data, error } = await supabaseClient.functions.invoke("claim-site-slug", {
      body: { siteProjectId, desired: checkedAvailableSlug },
    });
    if (error || !data || !data.success) {
      status.style.color = "#B3401E";
      status.textContent = "השינוי נכשל, נסו שוב.";
      confirmBtn.disabled = false;
      confirmBtn.textContent = original;
      return;
    }
    renderPublishClaimedScreen("https://" + data.slug + ".deskkit.co.il/", true, data.slug);
  });
}

/* The purchase panel used to be visible from the very first moment someone
   opened the wizard — before they'd typed a word of their own content. The
   "finish gate" (a single explicit button + a note explaining exactly what
   locks and what stays free forever) exists so committing to buy is a
   deliberate step, not something that greets you on arrival. Once a
   template is actually unlocked there's nothing left to gate — always show
   unlock-done for it, on this visit and every future one. */
let financeGateOpened = false;

// Freemium publish model: publishing/downloading itself is free for
// everyone once past "finish-gate" — unlocked only changes whether the
// watermark-removal upsell or its "✓ removed" confirmation shows inside
// unlock-done. Someone already unlocked (paid) skips the gate entirely
// on return visits, same as before this change — only the "still has to
// decide to finish editing first" behavior for a NOT-yet-unlocked user
// is new (previously that user saw unlock-pending, a dead end without
// paying; now finish-btn leads straight to a real, working unlock-done).
function refreshUnlockUI() {
  const unlocked = localStorage.getItem(currentUnlockKey()) === "1";
  const gate = document.getElementById("finish-gate");
  const done = document.getElementById("unlock-done");
  const showDone = unlocked || financeGateOpened;
  gate.style.display = showDone ? "none" : "";
  done.style.display = showDone ? "" : "none";
  if (!showDone) return;
  renderPublishRemaining();

  const upsell = document.getElementById("watermark-upsell");
  const removed = document.getElementById("watermark-removed");
  if (upsell) upsell.style.display = unlocked ? "none" : "";
  if (removed) removed.style.display = unlocked ? "" : "none";

  // Inside watermark-upsell: hide only the "buy a new code" block during
  // the outage (see SITE_HOSTING_PAUSED above), never the license-key
  // redemption box below it — someone who already paid before the outage
  // started still needs to be able to enter a code they already have.
  const buyBlock = document.getElementById("buy-new-block");
  const pausedNotice = document.getElementById("hosting-paused");
  if (buyBlock) buyBlock.style.display = SITE_HOSTING_PAUSED ? "none" : "";
  if (pausedNotice) pausedNotice.style.display = SITE_HOSTING_PAUSED ? "" : "none";
  // With buying paused, entering an existing code is the only action left.
  const licenseBox = document.querySelector("#watermark-upsell .dk-pro-license");
  if (licenseBox && SITE_HOSTING_PAUSED) licenseBox.open = true;
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
      const supportMailto = `mailto:${["digital.dz.studio", "gmail.com"].join("@")}?subject=${encodeURIComponent("בעיה בקוד רישוי — בניית אתר")}&body=${encodeURIComponent("הקוד שהזנתי: " + key)}`;
      const supportLine = `<br>עדיין תקועים? <a href="${supportMailto}" style="color:inherit; text-decoration:underline;">כתבו לנו ונפתור את זה ידנית</a>.`;
      const invalidMsg = "קוד לא תקין. בדקו את המייל שקיבלתם ב-Gumroad ונסו שוב." + (data.gumroadMessage ? ` (Gumroad: ${escapeHtmlS(data.gumroadMessage)})` : "") + supportLine;
      note.innerHTML = data.reason === "redeemed-elsewhere" || data.reason === "different-template"
        ? "קוד הרישוי הזה כבר שימש לפתיחת אתר אחר. לתבנית נוספת נדרשת רכישה נפרדת." + supportLine
        : data.reason === "refunded"
          ? "הרכישה הזו בוטלה או הוחזרה, ולכן הקוד כבר לא פעיל." + supportLine
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
    // The preview iframe's srcdoc doesn't update itself just because the
    // unlock flag changed — without this, the watermark badge stayed
    // visible in preview until the next unrelated edit, contradicting
    // "preview must show the same state the user will get on publish"
    // (confirmed live: it really did stay stale right through this
    // success handler). renderSitePreview() re-renders through the same
    // currentSiteHtml() that now reads the just-updated unlock flag.
    if (typeof renderSitePreview === "function") renderSitePreview();
    // The actual moment of payment — this used to only happen later, from
    // the ZIP-download button (removed; see its own comment). Marking the
    // project "finalized" in the DB, sending the purchase receipt, and
    // locking the template choice (applyFinalizedLockUI) all belong right
    // here now: the real signal that a purchase just completed, not an
    // indirect one tied to an unrelated download action.
    if (typeof finalizeSiteProject === "function") await finalizeSiteProject();
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

// sites.html now loads js/require-auth.js like every other builder page,
// so window.revealGatedPage comes from there — no need to define it here.
// window.deferReveal (set before require-auth.js loads) keeps it from
// auto-revealing on a signed-in session; site-cloud-save.js calls it only
// once it has finished correcting siteState for the real signed-in
// account, and the catalog branch below calls it once the catalog itself
// is actually on screen.

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const urlTemplate = params.get("template");
  const urlSiteId = params.get("site");
  const forceBrowse = params.get("browse") === "1";
  const isNewSite = params.get("new") === "1";
  const isFullPreview = params.get("fullpreview") === "1";

  // ?new=1 (always a genuinely fresh project) and a bare visit with no
  // template/id named at all are both handled by the new Website
  // Creation Flow router (js/site-wizard-router.js, dkSitesRouterHandles)
  // instead of the legacy showWizard()/showCatalog() decision just below
  // — but NOT instead of the rest of this handler: the finish/verify/
  // publish/full-preview wiring further down is still load-bearing for
  // the Builder-Shell's own publish button (which hands off to the old
  // #finish-btn), so it must always run regardless of which path decided
  // the initial screen.
  const dkRouterHandled = typeof dkSitesRouterHandles === "function" && dkSitesRouterHandles({ urlTemplate, urlSiteId, forceBrowse, isNewSite });

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
  wireFieldFocusScroll();
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
  const wantsWizard = !!urlSiteId || (urlTemplate && SITE_TEMPLATES[urlTemplate]) || (!forceBrowse && hasSavedContent);
  if (dkRouterHandled) {
    // js/site-wizard-router.js already decided and is showing its own
    // screen (the intro, "האתרים שלי", or — for ?new=1 — launching the
    // questionnaire directly); nothing further to do here.
  } else if (wantsWizard) {
    // The overlay is already visible by default (css/style.css) and
    // require-auth.js is running its own session check in parallel; this
    // call does its own because it also needs the resolved session to
    // decide Shell vs. sidebar vs. preview below, not just to gate entry.
    supabaseClient.auth.getSession().then(async ({ data }) => {
      if (data.session && data.session.user) {
        if (urlTemplate && SITE_TEMPLATES[urlTemplate]) siteState.template = urlTemplate;
        // ?site=<id> names an exact project by identity, not by template —
        // the synchronous loadSiteState() peek above has no way to know
        // which template that project uses, so it's resolved here with a
        // direct fetch before deciding Shell vs. the old sidebar. (A
        // second, redundant resolution in js/site-cloud-save.js's own
        // DOMContentLoaded handler re-confirms the same row a moment
        // later — same dual-resolution pattern already used for
        // ?template=, not something new to this id-based path.)
        if (urlSiteId) {
          const { data: row } = await supabaseClient.from("site_projects").select("*").eq("id", urlSiteId).eq("user_id", data.session.user.id).maybeSingle();
          if (row) {
            siteState.template = row.template;
            siteState.data = row.data;
            ensurePagesShape(siteState.data);
          }
        }
        // A "תצוגה מקדימה" tab (?fullpreview=1, opened by the Shell's own
        // preview button) must show the real, static, read-only rendered
        // site — never any editor. Confirmed live as a real bug: with the
        // Shell default-on, this branch used to go on to call
        // bshellActivate() in that new tab too, covering the supposedly
        // "clean" preview with the full editable canvas again. Rendering
        // the static frame directly here and skipping Shell/wizard
        // activation entirely fixes that at the source.
        if (isFullPreview) {
          const frame = document.getElementById("site-preview-frame");
          if (frame && typeof currentSiteHtml === "function") frame.srcdoc = currentSiteHtml("index");
        } else if (typeof bshellActivate === "function" && typeof BSHELL_SUPPORTED_TEMPLATES !== "undefined" && BSHELL_SUPPORTED_TEMPLATES.includes(siteState.template) && params.get("shell") !== "0") {
          // Builder-Shell entry point — the DEFAULT now for every migrated
          // Design Starting Point (BSHELL_SUPPORTED_TEMPLATES is literally
          // SITE_MIGRATED_TEMPLATES, all 18 — see js/builder-shell.js's own
          // header comment). The Shell now also has its own Settings
          // surface (contact info, WhatsApp, copyright, brand color/font,
          // image gallery — see bshellPropsHtmlForSettings), so a returning
          // project is never stranded from anything the old sidebar used to
          // be the only way to reach. ?shell=0 stays as an explicit escape
          // hatch back to the old sidebar, never required to get in.
          bshellActivate();
        } else {
          showWizard();
        }
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
    // ?browse=1 with no template/id/saved content — the one legacy path
    // dkSitesRouterHandles() never owns (see its own `return false` for
    // forceBrowse). Every tool now gates upfront, catalog browsing
    // included, so this still needs its own session check before
    // revealing — it just never enters the wizard afterward.
    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user) {
        showCatalog();
        if (window.revealGatedPage) window.revealGatedPage();
      } else {
        const here = location.pathname.split("/").pop() + location.search;
        location.href = "account.html?redirect=" + encodeURIComponent(here);
      }
    });
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
