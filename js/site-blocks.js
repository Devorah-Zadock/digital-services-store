/* Block registry + ordering for the new Builder (Stage 1 pilot:
   local-service, playground, catalog — see the plan for why these were
   migrated first). Depends on the ls*Section()/pg*Section()/cat*Section()
   functions
   in js/site-templates.js (loaded before this file), which already
   render each section's real HTML/CSS/behavior unchanged — this file
   only describes which of them exist per template, in what order, and
   how to call each one, plus the small ordering/visibility data model
   that sits on top.

   Deliberately NOT a new content store: a block just says "render the
   services section here" — the actual service names/descriptions/
   prices still live in d.services exactly as before, still edited by
   the same existing mechanisms. This is what makes "שירות 1/2/3" show
   up as real, already-editable children of the services block for
   free, and what keeps every other template (and every already-saved
   project) completely unaffected — this file adds a capability, it
   doesn't change how existing data is stored or rendered. */

const SITE_BLOCK_DEFS = {
  "local-service": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => lsHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => lsServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => lsAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => lsContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "playground": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => pgHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => pgServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => pgAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => pgContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  // No "contact" entry — catalog genuinely has no inline contact section
  // on its index page (contact details only ever lived on the separate
  // contact.html page), so there's nothing there to make reorderable.
  "catalog": {
    hero: { label: "Hero", render: (d, pal, dd) => catHeroSection(d, pal, dd) },
    services: { label: "מוצרים", hasItems: true, render: (d, pal, dd) => catServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => catAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
  },
  // No "about" entry — freelancer's about text is fused into the same
  // block as the service tags (see frServicesSection's own comment),
  // not a separately toggleable section like local-service/playground
  // have. Deliberately keyed "aboutTags", NOT "services" — the generic
  // Section Variants (Phase 2) registered under "services" assume a
  // pure item list and would silently drop the fused about paragraph if
  // applied here, which is exactly the "variant changes content" bug
  // the whole Variant model promises never happens. A distinct key
  // means variantOptionsFor() correctly finds no options for it rather
  // than offering a variant that doesn't actually fit. "contact" has no
  // active() gate here (unlike local-service's): freelancer's CTA
  // footer always shows on the homepage, even once a separate Contact
  // page exists — matching the original unconditional render exactly.
  "freelancer": {
    hero: { label: "Hero", render: (d, pal, dd) => frHeroSection(d, pal, dd) },
    aboutTags: { label: "אודות + תגיות שירות", hasItems: true, render: (d, pal, dd) => frServicesSection(d, pal, dd) },
    contact: { label: "קריאה לפעולה", render: (d, pal, dd, ctx) => frContactSection(d, pal, dd, ctx.wa) },
  },
};

// "blank" (Phase 3) delegates its actual rendering to local-service's
// own renderLocalServiceSite (see site-templates.js), which always looks
// its blocks up under the literal key "local-service" regardless of
// siteState.template — so this alias only needs to cover the BUILDER'S
// OWN sidebar (reorder/variant-picker UI), which looks blocks up by the
// real siteState.template ("blank"). Same object, not a copy — editing
// one editing the other is correct here since they really are the same
// set of blocks.
SITE_BLOCK_DEFS["blank"] = SITE_BLOCK_DEFS["local-service"];

const SITE_MIGRATED_TEMPLATES = Object.keys(SITE_BLOCK_DEFS);

function isTemplateMigrated(template) {
  return SITE_MIGRATED_TEMPLATES.indexOf(template) !== -1;
}

// A superset of every block-type key any migrated template defines, in
// a sensible default sequence — each template's own ensureBlockOrder()
// call filters this down to only the keys IT actually defines, so
// adding a new key here (like freelancer's "aboutTags") never affects
// local-service/playground/catalog, which simply don't have that key.
const SITE_DEFAULT_BLOCK_ORDER = ["hero", "services", "aboutTags", "about", "contact"];

/* Back-compat: a project saved before this feature existed (or a fresh
   one) has no d.blockOrder yet — seeded once, here, the first time it's
   asked for, rather than requiring a migration step anywhere else. */
function ensureBlockOrder(d, template, page) {
  if (!isTemplateMigrated(template)) return null;
  if (!d.blockOrder || typeof d.blockOrder !== "object") d.blockOrder = {};
  if (!Array.isArray(d.blockOrder[page])) {
    d.blockOrder[page] = SITE_DEFAULT_BLOCK_ORDER.filter((type) => SITE_BLOCK_DEFS[template][type]);
  }
  return d.blockOrder[page];
}

/* What the hierarchy panel shows and what actually gets rendered: the
   saved order, filtered to types this template defines AND whose own
   active() check (if any) currently passes — "אודות" drops out the
   instant a separate About page is switched on, exactly matching what
   the section itself already does. */
function activeBlocksForPage(d, template, page) {
  const defs = SITE_BLOCK_DEFS[template];
  const order = ensureBlockOrder(d, template, page);
  if (!defs || !order) return [];
  return order.filter((type) => {
    const def = defs[type];
    if (!def) return false;
    return !def.active || def.active(d);
  });
}

/* ctx carries the per-render values every section needs but that
   aren't stored on d itself (pal, dd, the resolved CTA/WhatsApp link,
   any video embed) — computed once by the caller, same values the
   monolithic render<Name>Site functions already compute for themselves. */
function renderBlocksHtml(d, template, page, ctx) {
  const types = activeBlocksForPage(d, template, page);
  const blocksHtml = types.map((type) => {
    const variantKey = (d.blockVariants && d.blockVariants[type]) || "default";
    const renderFn = blockRenderFnFor(template, type, variantKey);
    return renderFn(d, ctx.pal, ctx.dd, ctx);
  }).join("\n");
  // Video isn't part of the reorderable hierarchy (optional, and not
  // one of the sections the user actually asked to see as a tree node)
  // — always placed right after the ordered blocks, before the footer.
  const videoHtml = ctx.videoSection ? ctx.videoSection : "";
  return `${blocksHtml}\n${videoHtml}`;
}

/* Generic Section System (Phase 2 of the architecture plan): a Variant
   changes how a section TYPE is laid out, never what content it shows.
   Deliberately generic across templates rather than per-template, since
   every section render function already only touches universal content
   helpers (heading()/t()/taglineText()/aboutText()/heroMediaHtml()/
   ctaHtml(), dd._services, pal) — the exact same inputs each template's
   own default render already takes. That's what lets ONE "centered
   hero" or "grid services" variant work for every migrated template for
   free, with zero duplication of d.services/d.businessName/etc.

   A block type with no entry here (or a variantKey of "default"/missing)
   behaves exactly as before — SITE_BLOCK_DEFS[template][type].render is
   itself the implicit "default" variant. Only two section types get a
   real alternate right now (hero, services) — enough to validate the
   model end-to-end without building options nobody asked for yet. */
function genericHeroVariantCentered(d, pal, dd, ctx) {
  const cta = ctx && ctx.cta;
  const media = heroMediaHtml(d, "");
  const navAttrs = cta && cta.page ? ` data-site-nav data-page="${cta.page}"` : "";
  const ctaButton = cta ? `<a href="${escapeHtmlS(cta.href)}"${cta.external ? ' target="_blank" rel="noopener"' : ""}${navAttrs} style="display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:700; padding:14px 30px; border-radius:30px; text-decoration:none;">${escapeHtmlS(cta.label)}</a>` : "";
  return `
    <section style="position:relative; text-align:center; padding:72px 24px 60px; background:#${pal.primaryDark}; color:#fff; overflow:hidden;">
      ${heroVideoBgHtml(d)}
      <div style="position:relative; z-index:1; max-width:720px; margin:0 auto;">
        <h1 style="font-size:clamp(28px,5vw,46px); margin:0 0 14px; font-weight:800; line-height:1.15;">${heading(d, "heroTitle", dd.businessName)}</h1>
        <p style="font-size:18px; opacity:.92; margin:0 0 26px;">${taglineText(d, dd)}</p>
        ${ctaButton}
        ${d.phone ? `<div style="margin-top:14px;"><a href="tel:${escapeHtmlS(d.phone)}" style="color:#fff; opacity:.85; font-size:15px;">${escapeHtmlS(d.phone)}</a></div>` : ""}
      </div>
      ${media ? `<div style="max-width:380px; margin:36px auto 0; border-radius:18px; overflow:hidden; box-shadow:0 18px 40px rgba(0,0,0,.35); position:relative; z-index:1;">${media}</div>` : ""}
    </section>`;
}
function genericServicesVariantGrid(d, pal, dd) {
  return `
    <section style="padding:56px 24px;">
      <div style="max-width:1000px; margin:0 auto;">
        <div style="text-align:center; margin-bottom:32px;"><h2 style="font-size:28px; font-weight:800; margin:0;">${heading(d, "services", "השירותים שלנו")}</h2></div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px;">
          ${dd._services.map((s) => `
            <div style="border:1.5px solid #EEE; border-radius:16px; padding:24px; text-align:center;">
              <h3 style="margin:0 0 8px; font-size:18px;">${escapeHtmlS(s.name)}</h3>
              ${s.desc ? `<p style="margin:0 0 10px; color:#555; font-size:14.5px;">${escapeHtmlS(s.desc)}</p>` : ""}
              ${s.price ? `<div style="font-weight:700; color:#${pal.primaryDark};">${escapeHtmlS(s.price)}</div>` : ""}
            </div>`).join("")}
        </div>
      </div>
    </section>`;
}

const SITE_SECTION_VARIANTS = {
  hero: {
    options: {
      default: { label: "קלאסי (עיצוב התבנית)" },
      centered: { label: "ממורכז", render: genericHeroVariantCentered },
    },
  },
  services: {
    options: {
      default: { label: "ברירת מחדל (עיצוב התבנית)" },
      grid: { label: "רשת כרטיסים", render: genericServicesVariantGrid },
    },
  },
};

/* Only offer a variant picker for a block type that (a) has real
   alternates defined above and (b) actually exists on this template —
   "about"/"contact" have no variants yet, and that's fine: an empty
   result here just means the Builder shows no picker for them. */
function variantOptionsFor(template, type) {
  const defs = SITE_BLOCK_DEFS[template];
  if (!defs || !defs[type] || !SITE_SECTION_VARIANTS[type]) return null;
  return SITE_SECTION_VARIANTS[type].options;
}

/* Missing/unknown variant (old data, or a variant later removed) always
   resolves to the template's own existing render — never a hard error,
   never destructive. This is the one place backward compatibility for
   blockVariants actually lives; nothing elsewhere needs to "migrate" the
   field in because a missing value already means exactly "default". */
function blockRenderFnFor(template, type, variantKey) {
  const def = SITE_BLOCK_DEFS[template][type];
  if (!variantKey || variantKey === "default") return def.render;
  const variant = SITE_SECTION_VARIANTS[type] && SITE_SECTION_VARIANTS[type].options[variantKey];
  return (variant && variant.render) || def.render;
}

/* Swap by TYPE, not array position — the hierarchy panel only shows
   (and only lets you move relative to) the currently ACTIVE blocks, so
   "move up" has to mean "swap with the previous visible one," skipping
   past any inactive type sitting between them in the saved order. */
function moveBlockUp(d, template, page, type) {
  const order = ensureBlockOrder(d, template, page);
  const active = activeBlocksForPage(d, template, page);
  const activeIdx = active.indexOf(type);
  if (!order || activeIdx <= 0) return;
  const prevType = active[activeIdx - 1];
  const i1 = order.indexOf(type), i2 = order.indexOf(prevType);
  const tmp = order[i1]; order[i1] = order[i2]; order[i2] = tmp;
}
function moveBlockDown(d, template, page, type) {
  const order = ensureBlockOrder(d, template, page);
  const active = activeBlocksForPage(d, template, page);
  const activeIdx = active.indexOf(type);
  if (!order || activeIdx === -1 || activeIdx >= active.length - 1) return;
  const nextType = active[activeIdx + 1];
  const i1 = order.indexOf(type), i2 = order.indexOf(nextType);
  const tmp = order[i1]; order[i1] = order[i2]; order[i2] = tmp;
}
