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
};

const SITE_MIGRATED_TEMPLATES = Object.keys(SITE_BLOCK_DEFS);

function isTemplateMigrated(template) {
  return SITE_MIGRATED_TEMPLATES.indexOf(template) !== -1;
}

const SITE_DEFAULT_BLOCK_ORDER = ["hero", "services", "about", "contact"];

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
  const defs = SITE_BLOCK_DEFS[template];
  const types = activeBlocksForPage(d, template, page);
  const blocksHtml = types.map((type) => defs[type].render(d, ctx.pal, ctx.dd, ctx)).join("\n");
  // Video isn't part of the reorderable hierarchy (optional, and not
  // one of the sections the user actually asked to see as a tree node)
  // — always placed right after the ordered blocks, before the footer.
  const videoHtml = ctx.videoSection ? ctx.videoSection : "";
  return `${blocksHtml}\n${videoHtml}`;
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
