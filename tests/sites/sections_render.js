#!/usr/bin/env node
/* Section Library (js/site-sections.js) render + data-model checks, in
   Node (no browser):

     node tests/sites/sections_render.js

   - every template × every section type × every variant, inserted into a
     real project shape, rendered for the editor preview and for publishing:
     no throws, every inline <script> compiles, the editor markers exist
   - every text field set to an HTML payload comes out escaped (also the
     per-field styles and the lead form's JSON config)
   - old-shape projects (no sections / no blockOrder) and an "x:" key with
     no d.sections entry render without throwing
   - built-in blocks hidden via d.hiddenBlocks lose their in-page nav links
   - the instance API (create/insert/move/duplicate/remove/variant/fields)
   Exit code 1 on any failure. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
function makeCtx(extra) {
  const ctx = Object.assign({ console }, extra || {});
  vm.createContext(ctx);
  for (const f of ["js/color-utils.js", "js/site-templates.js", "js/site-blocks.js", "js/site-sections.js"]) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  return ctx;
}
let failures = 0, checks = 0;
function check(name, ok, info) {
  checks++;
  if (!ok) { failures++; console.log("FAIL " + name + (info ? "  [" + String(info).slice(0, 300) + "]" : "")); }
}
function run(ctx, code, vars) {
  Object.assign(ctx, vars || {});
  return vm.runInContext(code, ctx);
}
function scriptsCompile(html) {
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try { new vm.Script(m[1]); } catch (e) { return e.message + " :: " + m[1].slice(0, 120); }
  }
  return "";
}

const PAYLOAD = "<img src=x onerror=alert(1)>";
const PROJECT = {
  businessName: "סטודיו בדיקה", tagline: "שירות מעולה", about: "שורה", primaryColor: "#2255AA", fontFamily: "rubik",
  phone: "050-1234567", email: "a@b.co", address: "תל אביב",
  services: [{ name: "א", desc: "תיאור", price: "100" }, { name: "ב", desc: "", price: "" }],
  headings: {}, pages: { about: false, contact: false }, heroImage: "", heroImages: [], textStyles: {},
};
const clone = (o) => JSON.parse(JSON.stringify(o));

/* Markers every type must expose in the editor preview. */
const EXPECT = {
  gallery: ['data-dk-field="title"', 'data-dk-item="images.0"', 'data-dk-img="images.0"'],
  textImage: ['data-dk-field="title"', 'data-dk-field="body"', 'data-dk-img="image"'],
  features: ['data-dk-field="title"', 'data-dk-item="items.0"', 'data-dk-field="items.0.icon"', 'data-dk-field="items.0.title"', 'data-dk-field="items.0.text"'],
  testimonials: ['data-dk-field="title"', 'data-dk-item="items.0"', 'data-dk-field="items.0.quote"', 'data-dk-field="items.0.name"', 'data-dk-field="items.0.role"'],
  faq: ['data-dk-field="title"', 'data-dk-item="items.0"', 'data-dk-field="items.0.q"', 'data-dk-field="items.0.a"'],
  cta: ['data-dk-field="title"', 'data-dk-field="text"', 'data-dk-btn="button"', 'data-dk-field="button.label"'],
  video: ['data-dk-field="title"', 'data-dk-video="url"'],
  richText: ['data-dk-field="title"', 'data-dk-field="body"'],
  leadForm: ['data-dk-field="title"', 'data-dk-field="subtitle"', 'data-dk-btn="buttonLabel"', 'data-dk-field="buttonLabel"', "data-dk-lead-msg"],
};

function setAllStrings(obj, value) {
  if (Array.isArray(obj)) obj.forEach((v, i) => { if (typeof v === "string") obj[i] = value; else if (v && typeof v === "object") setAllStrings(v, value); });
  else Object.keys(obj).forEach((k) => {
    if (k === "fields" || k === "kind" || k === "fit" || k === "ratio" || k === "imageSide") return;
    if (typeof obj[k] === "string") obj[k] = value; else if (obj[k] && typeof obj[k] === "object") setAllStrings(obj[k], value);
  });
}

/* --dump DIR: write, for tests/sites/e2e_sections.py, one home page per
   sample template with every section type (both variants) inserted, for
   publishing (published=) and for the editor preview (preview=). Lead
   forms render as on an Automate-enabled account. */
const dumpAt = process.argv.indexOf("--dump");
if (dumpAt !== -1) {
  const dir = process.argv[dumpAt + 1];
  const ctx = makeCtx({ DK_AUTOMATE_ENABLED: true, SUPABASE_URL: "https://vafkjsetlrpaczsmqvqs.supabase.co", DK_TURNSTILE_SITE_KEY: "" });
  const tpls = ["local-service", "bold", "brutal", "luxury3d", "bento", "elegant", "studio", "noir", "neon", "cinematic", "playground"];
  fs.mkdirSync(dir, { recursive: true });
  for (const tpl of tpls) for (const lang of ["he", "en"]) {
    const d = clone(PROJECT);
    if (lang === "en") d.siteLang = "en";
    d.heroImage = "";
    fs.writeFileSync(path.join(dir, `base-${tpl}-${lang}.html`), run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")', { __d: d, __tpl: tpl }));
    const lib =run(ctx, "SITE_SECTION_LIBRARY.map(e => ({ type: e.type, variants: Object.keys(e.variants) }))");
    let i = 1;
    for (const { type, variants } of lib) for (const v of variants) {
      const id = run(ctx, "siteSectionCreate(__d, __t, __v)", { __d: d, __t: type, __v: v });
      if (type === "video") d.sections[id].content.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      if (type === "gallery") d.sections[id].content.images.forEach((im, k) => { im.src = `img${k % 3}.svg`; });
      run(ctx, 'siteSectionInsert(__d, __tpl, "index", "x:" + __id, __i)', { __tpl: tpl, __id: id, __i: i++ });
    }
    d.leadForm = true; // the floating popup too: it shares the inline form's submit code
    fs.writeFileSync(path.join(dir, `published-${tpl}-${lang}.html`), run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")'));
    fs.writeFileSync(path.join(dir, `preview-${tpl}-${lang}.html`), run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index", { preview: true })'));
  }
  ["#1F5C4E", "#B8860B", "#7C5CFF"].forEach((c, k) => fs.writeFileSync(path.join(dir, `img${k}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="${[800, 600, 700][k]}" height="${[600, 800, 700][k]}"><rect width="100%" height="100%" fill="${c}"/></svg>`));
  console.log("dumped to " + dir);
  process.exit(0);
}

// ---------------------------------------------------------------- matrix
for (const automate of [false, true]) {
  const ctx = makeCtx(automate ? { DK_AUTOMATE_ENABLED: true, SUPABASE_URL: "https://example.invalid", DK_TURNSTILE_SITE_KEY: "0x4AAAAAAATESTKEY000" } : {});
  const templates = run(ctx, "Object.keys(SITE_TEMPLATES)");
  const lib = run(ctx, "SITE_SECTION_LIBRARY.map(e => ({ type: e.type, variants: Object.keys(e.variants) }))");
  check("library has 9 types", lib.length === 9, lib.map((e) => e.type).join(","));
  check(`siteSectionsAvailable gates leadForm (automate=${automate})`,
    run(ctx, 'siteSectionsAvailable("studio").some(e => e.type === "leadForm")') === automate);
  check("tokens for every SITE_BLOCK_DEFS template", run(ctx, "Object.keys(SITE_BLOCK_DEFS).every(k => SITE_THEME_TOKENS[k])"));
  for (const tpl of templates) {
    for (const { type, variants } of lib) {
      for (const variant of variants) {
        const label = `${tpl}/${type}/${variant}${automate ? "/automate" : ""}`;
        for (const mode of ["normal", "xss", "en"]) {
          const d = clone(PROJECT);
          if (mode === "en") d.siteLang = "en";
          let id, preview, published;
          try {
            id = run(ctx, "siteSectionCreate(__d, __type, __variant)", { __d: d, __type: type, __variant: variant });
            run(ctx, 'siteSectionInsert(__d, __tpl, "index", "x:" + __id, 1)', { __tpl: tpl, __id: id });
            if (mode === "xss") {
              setAllStrings(d.sections[id].content, PAYLOAD);
              d.sections[id].styles = { title: { color: PAYLOAD, size: PAYLOAD, font: PAYLOAD, weight: PAYLOAD, align: PAYLOAD } };
              if (type === "leadForm") d.sections[id].content.successText = "</script><script>alert(1)</script>";
            }
            preview = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index", { preview: true })');
            published = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")');
          } catch (e) {
            check(`${label}/${mode} renders`, false, e.stack);
            continue;
          }
          check(`${label}/${mode} id format`, /^s[a-z0-9]{6}$/.test(id), id);
          check(`${label}/${mode} section root marker`, preview.includes(`<section id="sec-${id}" class="dks dks-${type} dks-v-${variant}`) &&
            preview.includes(`data-dk-sec="${id}" data-dk-type="${type}"`), "");
          if (mode !== "xss") for (const m of EXPECT[type]) check(`${label}/${mode} marker ${m}`, preview.includes(m));
          check(`${label}/${mode} base style once`, (preview.match(/<style>\s*\.dks\{/g) || []).length === 1);
          for (const [which, html] of [["preview", preview], ["published", published]]) {
            const bad = scriptsCompile(html);
            check(`${label}/${mode}/${which} scripts compile`, !bad, bad);
            if (mode === "xss") {
              check(`${label}/${which} payload escaped`, !html.includes(PAYLOAD) && !html.includes("<script>alert(1)"), html.slice(Math.max(0, html.indexOf(PAYLOAD) - 200), html.indexOf(PAYLOAD) + 50));
              check(`${label}/${which} no javascript: urls`, !/(?:src|href)="\s*javascript:/i.test(html));
            }
          }
          if (mode === "xss" && ["title"].length) check(`${label} payload visible as text (preview)`, type === "video" ? true : preview.includes("&lt;img src=x onerror=alert(1)&gt;"));
          if (mode === "en") check(`${label} English defaults`, !/[֐-׿]/.test(JSON.stringify(d.sections[id].content).replace(/סטודיו בדיקה/g, "")));
          // published-site rules
          if (type === "video" || type === "gallery") check(`${label}/${mode} placeholder-only section hidden when published`, !published.includes(`id="sec-${id}"`));
          if (type === "leadForm") {
            check(`${label}/${mode} leadForm published only when deliverable`, published.includes(`id="sec-${id}"`) === automate);
            if (automate && mode === "normal") {
              check(`${label} leadForm uses lead-intake`, published.includes("https://example.invalid/functions/v1/lead-intake"));
              check(`${label} leadForm honeypot + turnstile`, published.includes('name="website"') && published.includes("data-dk-captcha") && published.includes("0x4AAAAAAATESTKEY000"));
            }
          }
          if (type === "video" && mode === "normal") {
            run(ctx, '__d.sections[__id].content.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"');
            const pub = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")');
            check(`${label} valid video published`, pub.includes("https://www.youtube.com/embed/dQw4w9WgXcQ") && pub.includes('data-dk-video="url"'));
            run(ctx, '__d.sections[__id].content.url = "javascript:alert(1)"');
            check(`${label} invalid video url renders nothing`, !run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")').includes(`id="sec-${id}"`));
          }
          if (type === "gallery" && mode === "normal") {
            run(ctx, '__d.sections[__id].content.images[0].src = "https://example.invalid/a.jpg"; __d.sections[__id].content.images[1].src = "javascript:alert(1)"');
            const pub = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")');
            check(`${label} gallery published with real photos only`, pub.includes('src="https://example.invalid/a.jpg"') && !pub.includes('data-dk-img="images.1"'));
          }
        }
      }
    }
    // preview thumbnails
    for (const { type, variants } of lib) for (const variant of variants) {
      const doc = run(ctx, "siteSectionPreviewHtml(__d, __tpl, __type, __variant)", { __d: clone(PROJECT), __tpl: tpl, __type: type, __variant: variant });
      check(`${tpl}/${type}/${variant} preview doc`, doc.startsWith("<!doctype html>") && doc.includes(`data-dk-type="${type}"`) && !scriptsCompile(doc));
    }
  }
}

// ---------------------------------------------------------------- back compat + robustness
{
  const ctx = makeCtx();
  const templates = run(ctx, "Object.keys(SITE_TEMPLATES)");
  for (const tpl of templates) {
    for (const page of ["index", "about", "contact"]) {
      const old = clone(PROJECT); // no sections, no blockOrder
      let html = "";
      try { html = run(ctx, "SITE_TEMPLATES[__tpl].render(__d, __p)", { __d: old, __tpl: tpl, __p: page }); } catch (e) { check(`${tpl}/${page} old shape renders`, false, e.stack); continue; }
      check(`${tpl}/${page} old shape has no library css`, !html.includes("dks-"));
    }
    const d = clone(PROJECT);
    d.blockOrder = { index: ["hero", "x:nope", "x:", "x:__proto__", "services"] };
    d.sections = { other: { type: "unknownType", content: {} } };
    d.blockOrder.index.push("x:other");
    try {
      const html = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index", { preview: true })', { __d: d, __tpl: tpl });
      check(`${tpl} dangling x: keys skipped`, !html.includes("sec-nope") && !html.includes("sec-other") && !html.includes("dks-"));
    } catch (e) { check(`${tpl} dangling x: keys`, false, e.stack); }
  }
  // hidden built-in sections lose their in-page nav links
  for (const [tpl, anchor] of [["studio", "ag-services"], ["local-service", "ls-services"], ["blank", "ls-services"]]) {
    const d = clone(PROJECT);
    const before = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")', { __d: d, __tpl: tpl });
    check(`${tpl} rail links #${anchor} while shown`, before.includes(`href="#${anchor}"`) && before.includes(`id="${anchor}"`));
    run(ctx, 'siteBlockSetVisible(__d, __tpl, "services", false)');
    const after = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")');
    check(`${tpl} hidden services: no section, no link`, !after.includes(`href="#${anchor}"`) && !after.includes(`id="${anchor}"`) && d.hiddenBlocks.services === true);
    run(ctx, 'siteBlockSetVisible(__d, __tpl, "about", false)');
    const noAbout = run(ctx, 'SITE_TEMPLATES[__tpl].render(__d, "index")');
    check(`${tpl} about hidden via d.pages (separate page)`, d.pages.about === true && !noAbout.includes(`href="#${anchor.replace("services", "about")}"`));
  }
  // studio hero button: points to "#" instead of a section that isn't there
  {
    const d = clone(PROJECT); delete d.phone; delete d.email; d.noWhatsapp = true; delete d.address;
    d.pages = { about: false, contact: true };
    const html = run(ctx, 'SITE_TEMPLATES.studio.render(__d, "index")', { __d: d });
    check("studio hero cta marker", html.includes('data-dk-btn="heroCta"'));
  }
  // contact binds + hero markers
  {
    const d = clone(PROJECT); d.heroImages = ["https://example.invalid/1.jpg", "https://example.invalid/2.jpg"]; d.whatsapp = "0541112222";
    const html = run(ctx, 'SITE_TEMPLATES["local-service"].render(__d, "index")', { __d: d });
    for (const m of ['<span data-dk-bind="phone">050-1234567</span>', '<span data-dk-bind="email">a@b.co</span>', '<span data-dk-bind="address">תל אביב</span>',
      'data-dk-bind="whatsapp" data-dk-bind-as="href"', 'data-dk-btn="heroCta"', 'data-dk-img="gallery.0"', 'data-dk-img="gallery.1"']) check(`local-service marker ${m}`, html.includes(m));
    d.heroImages = []; d.heroImage = "https://example.invalid/h.jpg";
    check("hero image marker", run(ctx, 'SITE_TEMPLATES["gallery"].render(__d, "index")').includes('data-dk-img="hero"'));
  }
}

// ---------------------------------------------------------------- API
{
  const ctx = makeCtx();
  const d = clone(PROJECT);
  ctx.__d = d;
  const a = run(ctx, 'siteSectionCreate(__d, "faq", "accordion")');
  const b = run(ctx, 'siteSectionCreate(__d, "cta", "nope")');
  check("unknown variant falls back to first", d.sections[b].variant === "banner");
  check("unknown type → null", run(ctx, 'siteSectionCreate(__d, "about2")') === null);
  run(ctx, `siteSectionInsert(__d, "studio", "index", "x:${a}", 0)`);
  run(ctx, `siteSectionInsert(__d, "studio", "index", "x:${b}", 99)`);
  const active = () => run(ctx, 'activeBlocksForPage(__d, "studio", "index")');
  check("insert at visible index", JSON.stringify(active()) === JSON.stringify([`x:${a}`, "hero", "services", "about", "contact", `x:${b}`]), active());
  run(ctx, `siteSectionMove(__d, "studio", "index", "x:${b}", 1)`);
  check("move", active()[1] === `x:${b}`, active());
  run(ctx, 'siteBlockSetVisible(__d, "studio", "services", false)');
  run(ctx, `siteSectionMove(__d, "studio", "index", "x:${a}", 3)`);
  check("move skips hidden blocks", JSON.stringify(active()) === JSON.stringify([`x:${b}`, "hero", "about", `x:${a}`, "contact"]), active());
  run(ctx, 'siteBlockSetVisible(__d, "studio", "services", true)');
  check("show again", active().includes("services") && !("services" in d.hiddenBlocks));
  const dup = run(ctx, `siteSectionDuplicate(__d, "studio", "index", "x:${a}")`);
  check("duplicate placed after original", active()[active().indexOf(`x:${a}`) + 1] === dup && JSON.stringify(d.sections[dup.slice(2)].content) === JSON.stringify(d.sections[a].content) && dup !== `x:${a}`);
  check("duplicate is a deep copy", (d.sections[dup.slice(2)].content.items[0].q = "X") && d.sections[a].content.items[0].q !== "X");
  check("built-in can't be duplicated", run(ctx, 'siteSectionDuplicate(__d, "studio", "index", "hero")') === null);
  const before = JSON.stringify(d.sections[a].content);
  check("setVariant", run(ctx, `siteSectionSetVariant(__d, "${a}", "columns")`) && d.sections[a].variant === "columns" && JSON.stringify(d.sections[a].content) === before);
  check("setVariant rejects unknown", !run(ctx, `siteSectionSetVariant(__d, "${a}", "zzz")`));
  check("getField", run(ctx, `siteSectionGetField(__d, "${a}", "items.1.q")`) === d.sections[a].content.items[1].q);
  check("setField", run(ctx, `siteSectionSetField(__d, "${a}", "items.1.q", "שאלה?")`) && d.sections[a].content.items[1].q === "שאלה?");
  check("setField append", run(ctx, `siteSectionSetField(__d, "${a}", "items.4", { q: "q5", a: "a5" })`) && d.sections[a].content.items.length === 5);
  check("setField refuses gaps", !run(ctx, `siteSectionSetField(__d, "${a}", "items.9", {})`));
  check("setField refuses __proto__", !run(ctx, `siteSectionSetField(__d, "${a}", "__proto__.x", 1)`) && ({}).x === undefined);
  check("addItem", run(ctx, `siteSectionAddItem(__d, "${a}", "items")`) === 5 && d.sections[a].content.items.length === 6);
  check("removeItem", run(ctx, `siteSectionRemoveItem(__d, "${a}", "items.5")`) && d.sections[a].content.items.length === 5);
  check("label custom", run(ctx, `siteBlockLabel("studio", "x:${a}", __d).en`) === "FAQ");
  check("label built-in", run(ctx, 'siteBlockLabel("studio", "services").he') === "שירותים / מוצרים");
  run(ctx, `siteSectionRemove(__d, "studio", "index", "x:${b}")`);
  check("remove custom", !d.sections[b] && !d.blockOrder.index.includes(`x:${b}`));
  run(ctx, 'siteSectionRemove(__d, "studio", "index", "hero")');
  check("remove built-in = hide", d.hiddenBlocks.hero === true && d.blockOrder.index.includes("hero"));
  run(ctx, 'siteSectionRemove(__d, "studio", "index", "contact")');
  check("remove contact = separate page (d.pages)", d.pages.contact === true);
  const lf = run(ctx, "siteSectionLeadFields({ phone: 'off', email: 'off', message: 'bogus' })");
  check("lead fields normalized", lf.phone === "optional" && lf.email === "optional" && lf.message === "optional", JSON.stringify(lf));
}


/* ---------- the site editor's renderer settings (textStyles extras,
   d.heroCta, d.imageStyles, d.design, per-field button/image styles):
   valid values render, anything else is ignored — never injected ---------- */
{
  const ctx = makeCtx();
  const BAD = '"><script>alert(1)</script><x a="';
  const BADCSS = "red;background:url(javascript:alert(1))";
  const base = () => ({ businessName: "עסק", tagline: "t", phone: "050-1234567", email: "a@b.co", primaryColor: "#15803D",
    services: [{ name: "א", desc: "ב", price: "" }], pages: { about: false, contact: false }, heroImages: [], headings: {}, textStyles: {},
    heroImage: "https://x.example/p.jpg" });
  const render = (tpl, d, opts) => run(ctx, "SITE_TEMPLATES[__t].render(__d, 'index', __o)", { __t: tpl, __d: d, __o: opts || {} });
  // no live payload: no injected <script>, no javascript: URL, no style escaping its attribute
  const clean = (html) => !/<script>alert|javascript:alert|url\(javascript|style="[^"]*"[^>]*alert/i.test(html);
  const templates = run(ctx, "Object.keys(SITE_TEMPLATES)");

  // text extras
  let d = base();
  d.textStyles["heading-heroTitle"] = { weight: "700", lineHeight: "1.7", letterSpacing: "1.5px", maxWidth: "620" };
  let html = render("local-service", d);
  check("text extras render", /data-textkey="heading-heroTitle" style="font-weight:700;line-height:1.7;letter-spacing:1.5px;display:block;margin-inline:auto;max-width:620px"/.test(html), (html.match(/data-textkey="heading-heroTitle"[^>]*/) || [])[0]);
  d.textStyles["heading-heroTitle"] = { weight: BAD, lineHeight: BADCSS, letterSpacing: "1px;color:red", maxWidth: "9999999" };
  html = render("local-service", d);
  check("text extras: invalid values ignored", !/data-textkey="heading-heroTitle" style=/.test(html) && clean(html));

  // hero button
  d = base();
  d.heroCta = { label: "קבעו תור", action: { kind: "link", value: "https://example.com/book" }, style: { bg: "#112233", color: "fff", size: "lg", radius: "12" } };
  for (const tpl of templates) {
    if (!/data-dk-btn="heroCta"/.test(render(tpl, base()))) continue; // this template's hero has no button
    html = render(tpl, d);
    const btn = (html.match(/<a [^>]*data-dk-btn="heroCta"[^>]*>[^<]*/) || [])[0] || "";
    check(`${tpl}: hero button label/target/style from d.heroCta`, btn.includes('href="https://example.com/book"') && btn.includes("קבעו תור")
      && btn.includes("background:#112233") && btn.includes("color:#FFF") && btn.includes("font-size:18px") && btn.includes("border-radius:12px"), btn);
  }
  d.heroCta = { label: BAD, action: { kind: "link", value: "javascript:alert(1)" }, style: { bg: BADCSS, color: "url(x)", size: "huge", radius: "1;x:y" } };
  html = render("local-service", d);
  const btn2 = (html.match(/<a [^>]*data-dk-btn="heroCta"[^>]*>/) || [])[0] || "";
  check("hero button: bad action keeps the derived target, bad style ignored, label escaped", btn2.includes('href="https://wa.me/972501234567"') && !btn2.includes("style=") && clean(html)
    && html.includes("&quot;&gt;&lt;script&gt;"), btn2);
  d.heroCta = { label: "", action: { kind: "scroll", value: "x\" onmouseover=\"alert(1)" } };
  html = render("local-service", d);
  check("hero button: scroll target is an id or nothing", html.includes('data-dk-btn="heroCta" href="#"') && clean(html));
  d.heroCta = { label: "   " };
  check("hero button: an empty label keeps today's output exactly", render("local-service", d) === render("local-service", base()));
  const nd = base(); nd.phone = ""; nd.email = ""; nd.noWhatsapp = true; nd.heroCta = { label: "רק תווית" };
  check("hero button: a label with nowhere to go adds no button", !/data-dk-btn="heroCta"/.test(render("local-service", nd)));
  const sd = base(); sd.heroCta = { label: "בואו נדבר", action: { kind: "tel", value: "" } };
  check("studio uses the owner's label", /class="ag-cta" data-dk-btn="heroCta" href="tel:0501234567"[^>]*>בואו נדבר</.test(render("studio", sd)));
  check("playground uses the owner's label", /class="pg-cta" data-dk-btn="heroCta" href="tel:0501234567"[^>]*>בואו נדבר</.test(render("playground", sd)));
  const cv = base(); cv.blockVariants = { hero: "centered" }; cv.heroCta = { style: { bg: "#000000" } };
  check("centered hero variant takes the button style", /data-dk-btn="heroCta" style="[^"]*text-decoration:none; background:#000000;/.test(render("blank", cv)));

  // hero photo
  d = base();
  d.imageStyles = { hero: { fit: "contain", ratio: "4/3", focal: "50% 0%" } };
  html = render("local-service", d);
  check("hero photo: fit/ratio/focus on the <img>", /data-dk-img="hero" style="object-fit:contain;aspect-ratio:4\/3;height:auto;object-position:50% 0%"/.test(html), (html.match(/data-dk-img="hero"[^>]*/) || [])[0]);
  d.heroImages = ["https://x.example/a.jpg", "https://x.example/b.jpg"];
  html = render("local-service", d);
  check("hero slideshow: ratio on the frame, fit/focus on the slides", /site-hero-slideshow site-hero-photo" style="aspect-ratio:4\/3"/.test(html) && /data-dk-img="gallery.1" style="object-fit:contain;object-position:50% 0%"/.test(html));
  d.imageStyles = { hero: { fit: BADCSS, ratio: "1/1;x", focal: "50% 0%;background:red" } };
  d.heroImages = [];
  html = render("local-service", d);
  check("hero photo: invalid values ignored", !/data-dk-img="hero" style=/.test(html) && clean(html));

  // site-wide design
  for (const tpl of templates) {
    d = base();
    d.design = { headingFont: "suezOne", buttonRadius: "pill", buttonFill: "outline", bgTone: "warm" };
    html = render(tpl, d);
    const dark = run(ctx, "SITE_DARK_TEMPLATES").indexOf(tpl) !== -1;
    check(`${tpl}: design CSS (heading font, button corners/outline${dark ? ", no tone on a dark template" : ", tone"})`,
      html.includes("'Suez One'") && html.includes("border-radius:999px !important") && html.includes("background:transparent !important")
      && (dark ? !html.includes("background:#FBF7F1") : html.includes("html, body { background:#FBF7F1; }")));
  }
  d = base();
  d.design = { headingFont: "x;}</style><script>alert(1)</script>", buttonRadius: BADCSS, buttonFill: "neon", bgTone: "#000" };
  html = render("local-service", d);
  check("design: invalid values add no CSS", render("local-service", d) === render("local-service", base()) && clean(html));

  // section buttons / images / text extras
  d = base();
  const id = run(ctx, "siteSectionCreate(__d, 'cta', 'banner')", { __d: d });
  run(ctx, `siteSectionInsert(__d, 'local-service', 'index', 'x:${id}', 1)`);
  run(ctx, `siteSectionSetStyle(__d, '${id}', 'button', { bg: '#123456', color: '#ffffff', size: 'sm', radius: '0' })`);
  run(ctx, `siteSectionSetStyle(__d, '${id}', 'title', { lineHeight: '1.4', letterSpacing: '0.5px', maxWidth: '420', weight: '800' })`);
  html = render("local-service", d);
  check("section button style", /data-dk-btn="button"[^>]* style="background:#123456;border-color:#123456;color:#FFFFFF;font-size:13px;border-radius:0px"/.test(html), (html.match(/<a [^>]*data-dk-btn="button"[^>]*>/) || [])[0]);
  check("section text extras", /data-dk-field="title" style="font-weight:800;line-height:1.4;letter-spacing:0.5px;display:block;margin-inline:auto;max-width:420px"/.test(html), (html.match(/data-dk-field="title"[^>]*/) || [])[0]);
  run(ctx, `siteSectionSetStyle(__d, '${id}', 'button', { bg: '${BADCSS}', radius: 'x' })`);
  run(ctx, `siteSectionSetStyle(__d, '${id}', 'title', { lineHeight: '9;color:red', letterSpacing: 'url(x)', maxWidth: '-1' })`);
  html = render("local-service", d);
  check("section styles: invalid values ignored", !/data-dk-btn="button"[^>]* style=/.test(html) && !/data-dk-field="title" style=/.test(html) && clean(html));
  const gid = run(ctx, "siteSectionCreate(__d, 'gallery', 'grid')", { __d: d });
  run(ctx, `siteSectionInsert(__d, 'local-service', 'index', 'x:${gid}', 1)`);
  run(ctx, `siteSectionSetField(__d, '${gid}', 'images.0.src', 'https://x.example/g.jpg')`);
  run(ctx, `siteSectionSetStyle(__d, '${gid}', 'images.0', { fit: 'contain', ratio: '1/1', focal: '0% 100%' })`);
  html = render("local-service", d);
  check("section photo fit/ratio/focus", /data-dk-img="images.0" style="object-fit:contain;aspect-ratio:1\/1;height:auto;object-position:0% 100%"/.test(html));
  run(ctx, `siteSectionSetStyle(__d, '${gid}', 'images.0', { fit: '${BADCSS}', focal: 'x' })`);
  check("section photo: invalid values ignored", !/data-dk-img="images.0" style=/.test(render("local-service", d)));
  check("SITE_SECTION_STYLE_PROPS lists what renders", JSON.stringify(run(ctx, "SITE_SECTION_STYLE_PROPS.button")) === '["bg","color","size","radius"]');
}

console.log(`${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
