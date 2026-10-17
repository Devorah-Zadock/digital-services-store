#!/usr/bin/env node
/* Renders every site template (SITE_TEMPLATES in js/site-templates.js)
   for a few sample projects and every page, in Node (no browser), and
   prints one sha256 per document as JSON:

     node tests/sites/render_all.js            # print the hashes
     node tests/sites/render_all.js --write    # rewrite baseline_render_hashes.json
     node tests/sites/render_all.js --empty-settings
         # same samples, plus seo/mood/heroAlt present but empty ("ללא")

   The samples carry no seo/mood settings, so the output must stay
   byte-identical to the baseline taken before the SEO panel and the
   design moods existed (tests/sites/e2e_seo_moods.py compares them).
   The clock is pinned so the footer's "© year" can't change the hashes.

   One intentional change since that baseline: בס"ד (d.showBsd, the
   "full" sample) is now plain text instead of a white pill. Its new
   inline style is mapped back to the old one before hashing, so the
   comparison still proves every other byte of every document is
   unchanged (--raw hashes the real output). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..", "..");
const BASELINE = path.join(__dirname, "baseline_render_hashes.json");

const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...a) { if (a.length) super(...a); else super(2026, 0, 1); }
  static now() { return new RealDate(2026, 0, 1).getTime(); }
}
const ctx = { console, Date: FixedDate };
vm.createContext(ctx);
for (const f of ["js/color-utils.js", "js/site-templates.js", "js/site-blocks.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
}

const IMG = "https://vafkjsetlrpaczsmqvqs.supabase.co/storage/v1/object/public/site-images/";
const SAMPLES = {
  empty: { primaryColor: "#1F5C4E", services: [{ name: "", desc: "", price: "" }], pages: { about: false, contact: false }, heroImages: [], headings: {}, textStyles: {} },
  full: {
    businessName: "סטודיו <בדיקה> & \"שות'\"", tagline: "שירות מעולה", about: "שורה\nשנייה", primaryColor: "#2255AA", fontFamily: "rubik",
    phone: "050-1234567", email: "a@b.co", address: "תל אביב",
    services: [{ name: "א", desc: "תיאור", price: "100" }, { name: "ב", desc: "", price: "" }, { name: "ג", desc: "x", price: "5" }],
    headings: { services: "שירותים", about: "", contact: "" }, pages: { about: true, contact: true },
    heroImage: IMG + "u/p/hero.jpg", heroImages: [], textStyles: { businessName: { color: "E11D48" } }, showBsd: true,
  },
  english: {
    businessName: "Gallery Co", tagline: "We do things", siteLang: "en", primaryColor: "#B8860B", fontFamily: "secularOne",
    services: [{ name: "One", desc: "d", price: "" }], pages: { about: false, contact: true },
    heroImage: "", heroImages: [IMG + "u/p/a.jpg", IMG + "u/p/b.jpg"], headings: {}, textStyles: {}, hideCopyright: true,
  },
  variants: {
    businessName: "בלוקים", tagline: "וריאציות", primaryColor: "#7C5CFF", services: [{ name: "א", desc: "", price: "" }],
    pages: { about: false, contact: false }, heroImages: [], headings: {}, textStyles: {}, blockVariants: { hero: "centered", services: "grid" },
  },
};

const EMPTY_SETTINGS = process.argv.includes("--empty-settings");
const RAW = process.argv.includes("--raw");
const BSD_STYLE_NOW = /<div class="site-bsd" style="position:absolute; top:6px; right:10px; z-index:2147483000; font-size:11px; line-height:1.4; color:(?:inherit|#fff); opacity:.75; pointer-events:none;">/g;
const BSD_STYLE_BASELINE = 'style="position:absolute; top:6px; right:10px; z-index:2147483000; font-size:11px; line-height:1.4; color:#333; background:rgba(255,255,255,.85); padding:1px 6px; border-radius:6px; pointer-events:none;"';
function renderAll() {
  const keys = vm.runInContext("Object.keys(SITE_TEMPLATES)", ctx);
  const out = {};
  for (const k of keys) {
    for (const [name, sample] of Object.entries(SAMPLES)) {
      for (const page of ["index", "about", "contact"]) {
        ctx.__d = JSON.parse(JSON.stringify(sample));
        if (EMPTY_SETTINGS) Object.assign(ctx.__d, { seo: { title: " ", description: "", ogImage: "" }, mood: "", heroAlt: "  " });
        ctx.__k = k;
        ctx.__p = page;
        let html = vm.runInContext("SITE_TEMPLATES[__k].render(__d, __p)", ctx);
        if (!RAW) html = html.replace(BSD_STYLE_NOW, `<div class="site-bsd" ${BSD_STYLE_BASELINE}>`);
        out[`${k}/${name}/${page}`] = crypto.createHash("sha256").update(html).digest("hex");
      }
    }
  }
  return out;
}

const hashes = renderAll();
if (process.argv.includes("--write")) {
  fs.writeFileSync(BASELINE, JSON.stringify(hashes, null, 1) + "\n");
  console.error(`wrote ${Object.keys(hashes).length} hashes to ${BASELINE}`);
} else {
  process.stdout.write(JSON.stringify(hashes));
}
