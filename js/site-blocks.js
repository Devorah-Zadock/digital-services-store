/* Block registry + ordering for the central Builder. This file (plus
   SITE_SECTION_VARIANTS just below) IS the Section Library: the one
   place that defines what a "Section" is, independent of which
   template/Starting Point uses it. Migrated so far: local-service,
   playground, catalog, freelancer, blank — see the architecture plan
   for why gradual, one/two at a time, beats migrating all 18 at once.
   Depends on the ls*Section()/pg*Section()/cat*Section()/fr*Section()
   functions in js/site-templates.js (loaded before this file), which
   already render each section's real HTML/CSS/behavior unchanged — this
   file only describes which of them exist per template, in what order,
   and how to call each one, plus the small ordering/visibility/variant
   data model that sits on top.

   Deliberately NOT a new content store: a block just says "render the
   services section here" — the actual service names/descriptions/
   prices still live in d.services exactly as before, still edited by
   the same existing mechanisms. This is what makes "שירות 1/2/3" show
   up as real, already-editable children of the services block for
   free, and what keeps every other template (and every already-saved
   project) completely unaffected — this file adds a capability, it
   doesn't change how existing data is stored or rendered.

   RECIPE — adding a new Section type (e.g. Testimonials/FAQ/Gallery/
   Pricing/Opening Hours) to a template that's already migrated:
     1. Content schema: decide which d.* field(s) hold its content. Reuse
        an existing shape (d.services-like array, or a plain string/
        array field) rather than inventing a new one unless the content
        genuinely has no existing analog.
     2. Render: write one plain function (d, pal, dd, ctx) => htmlString
        in site-templates.js, built only from universal helpers (heading/
        t/escapeHtmlS/etc.) so it can work across templates, not just one.
     3. Register it under that template's key in SITE_BLOCK_DEFS below:
        { label, render, hasItems?, active? }. hasItems shows its content
        as child rows in the hierarchy panel; active() auto-hides it
        (e.g. once a separate page covers the same content).
     4. Add its key to SITE_DEFAULT_BLOCK_ORDER if it's a reasonable
        default position (filtered per-template automatically — adding a
        key here never affects a template that doesn't define it).
     5. Variants are OPTIONAL and separate from step 1-4: only add a
        SITE_SECTION_VARIANTS[type] entry once a second real, generically-
        useful layout exists — never required just to ship the section.
   No template-specific wiring needed anywhere else: renderBlocksHtml(),
   the hierarchy panel, and the variant picker all already work off this
   registry generically. */

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
  "gallery": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => glHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "מוצרים / שירותים", hasItems: true, render: (d, pal, dd) => glServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => glAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => glContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "bold": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => nbHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => nbServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => nbAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => nbContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "elegant": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => egHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => egServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => egAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => egContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "process": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => prHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שלבי התהליך", hasItems: true, render: (d, pal, dd) => prServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => prAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => prContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  // No active() gate on "contact" here — portfolio's CTA footer always
  // shows on the homepage even once a separate Contact page exists,
  // matching the original unconditional render exactly (same as
  // freelancer's own contact block).
  "portfolio": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => poHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "עבודות ושירותים", hasItems: true, render: (d, pal, dd) => poServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => poAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "קריאה לפעולה", render: (d, pal, dd, ctx) => poContactSection(d, pal, dd, ctx.wa) },
  },
  // No "contact" entry — same reasoning as catalog: boutique genuinely
  // has no inline contact section on its index page.
  "boutique": {
    hero: { label: "Hero", render: (d, pal, dd) => bqHeroSection(d, pal, dd) },
    services: { label: "מוצרים (כולל המומלץ)", hasItems: true, render: (d, pal, dd) => bqServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => bqAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
  },
  "noir": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => nrHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => nrServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => nrAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => nrContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "studio": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => agHeroSection(d, pal, dd, ctx.heroCta, ctx.inPageRail) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => agServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => agAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => agContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  // Unlike every other migrated template, bento has no separate
  // services/about/contact SECTIONS to reorder -- it's one continuous
  // CSS grid where welcome/clock/photo/about/video/services/contact
  // are individual CELLS inside it (see btGridSection's own comment).
  // "grid" is a single fused block, same idea as freelancer's
  // "aboutTags" — hasItems:true still surfaces d.services as child
  // rows in the hierarchy even though they're cells, not a section.
  "bento": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => btHeroSection(d, pal, dd, ctx.cta) },
    grid: { label: "רשת תוכן (שעון, שירותים, אודות, קשר)", hasItems: true, render: (d, pal, dd, ctx) => btGridSection(d, pal, dd, ctx.wa, ctx.embedSrc) },
  },
  "cinematic": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => cdHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => cdServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => cdAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => cdContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "brutal": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => brHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => brServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => brAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => brContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "neon": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => nfHeroSection(d, pal, dd, ctx.cta) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => nfServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => nfAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => nfContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
  },
  "chaos": {
    hero: { label: "Hero", render: (d, pal, dd, ctx) => ocHeroSection(d, pal, dd, ctx.cta, ctx.tickerText) },
    services: { label: "שירותים / מוצרים", hasItems: true, render: (d, pal, dd) => ocServicesSection(d, pal, dd) },
    about: { label: "אודות", render: (d, pal, dd) => ocAboutSection(d, pal, dd), active: (d) => !d.pages || !d.pages.about },
    contact: { label: "צור קשר", render: (d, pal, dd, ctx) => ocContactSection(d, pal, dd, ctx.wa), active: (d) => !d.pages || !d.pages.contact },
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
const SITE_DEFAULT_BLOCK_ORDER = ["hero", "services", "aboutTags", "about", "contact", "grid"];

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
