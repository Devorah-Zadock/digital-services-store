/* Renders complete, standalone business-website HTML documents from the
   wizard's data. Three structurally different templates (not just recolored
   copies of each other) share the same data shape, so the customer's own
   content, photo and color still make each result genuinely different from
   another business using the same template. Depends on derivePalette from
   js/color-utils.js (loaded before this file).

   Each template's render(d, page) can produce more than one HTML document:
   page is "index" (default), "about" or "contact" — only used when the
   customer opts in to separate pages (d.pages.about / d.pages.contact).
   When they don't, everything still lives on a single index.html exactly
   as before. */

function escapeHtmlS(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function nl2brS(s) {
  return escapeHtmlS(s).replace(/\n/g, "<br>");
}

/* Per-element font/color/size/alignment overrides ("click any text in the
   live preview to restyle just it" — see the click-to-edit script injected
   by site-builder.js, never shipped in the downloaded/published site
   itself). d.textStyles is keyed by a small set of stable, meaningful
   names (not by position), so a saved override survives edits to
   unrelated content instead of drifting to a different element. Only the
   text categories every template actually shares (heading, business name,
   tagline, about paragraph) are wired up — per-service-item styling isn't
   part of this first pass. */
function textStyleAttr(d, key) {
  const s = d.textStyles && d.textStyles[key];
  if (!s) return "";
  const parts = [];
  if (s.font) { const f = SITE_FONTS[s.font]; if (f) parts.push(`font-family:${f.stack}`); }
  if (s.color) parts.push(`color:#${String(s.color).replace("#", "")}`);
  if (s.size) parts.push(`font-size:${s.size}px`);
  // text-align on a plain inline <span> (the default here) has no visual
  // effect at all — an inline box shrink-wraps its own text, leaving no
  // extra room to shift it into. Forcing the span to block (confirmed
  // live) gives it the width to actually align within.
  if (s.align) parts.push(`text-align:${s.align}`, "display:block");
  return parts.length ? ` style="${parts.join(";")}"` : "";
}
function t(d, key, html) {
  return `<span class="site-editable" data-textkey="${key}"${textStyleAttr(d, key)}>${html}</span>`;
}
function bizName(d, dd) {
  return t(d, "businessName", escapeHtmlS(dd.businessName));
}
function taglineText(d, dd) {
  return t(d, "tagline", escapeHtmlS(dd.tagline));
}
function aboutText(d, dd) {
  return t(d, "aboutText", nl2brS(dd.about));
}
function waLink(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "").replace(/^0/, "972");
  return digits ? `https://wa.me/${digits}` : "";
}

/* Drop-in replacement for every template's own "d.heroImage ? <img
   class=...> : ..." spot — d.heroImages (2+ photos) renders a slow
   crossfading slideshow instead of one static photo, using the exact
   same class the single-image version used (so each template's own
   sizing/shape CSS for that class still applies unchanged), and falls
   straight back to the old single d.heroImage when there's no gallery.
   The actual cycling (.site-hero-slideshow CSS + heroSlideshowScript())
   is shared and injected once per page via siteDoc(), not per template. */
function heroHasImage(d) {
  return !!(d.heroImage || (d.heroImages && d.heroImages.length));
}
function heroMediaHtml(d, imgClass) {
  const images = (d.heroImages && d.heroImages.length) ? d.heroImages : (d.heroImage ? [d.heroImage] : []);
  if (!images.length) return "";
  const cls = imgClass ? ` ${imgClass}` : "";
  if (images.length === 1) return `<img class="${imgClass || ""}" src="${images[0]}" alt="">`;
  return `<div class="site-hero-slideshow${cls}">${images.map((src, i) =>
    `<img class="site-hero-slide${i === 0 ? " active" : ""}" src="${src}" alt="">`).join("")}</div>`;
}
/* Runs on every page regardless of whether it actually has a slideshow —
   querySelectorAll on an absent class is just an empty, harmless no-op. */
function heroSlideshowScript() {
  return `<script>
    document.querySelectorAll(".site-hero-slideshow").forEach(function (wrap) {
      var slides = wrap.querySelectorAll(".site-hero-slide");
      if (slides.length < 2) return;
      var i = 0;
      setInterval(function () {
        slides[i].classList.remove("active");
        i = (i + 1) % slides.length;
        slides[i].classList.add("active");
      }, 4200);
    });
  </script>`;
}
/* The body-copy font a customer can pick in the wizard — applies to every
   template's default text (nav, paragraphs, cards). Deliberately separate
   from each template's own display/heading font (many hardcode 'Frank
   Ruhl Libre' or similar for their signature look) — overriding those too
   would flatten templates that specifically use a serif headline as part
   of their identity, which isn't what "change the font" is asking for. */
const SITE_FONTS = {
  heebo: { name: "Heebo", stack: "'Heebo',Arial,sans-serif", googleParam: "Heebo:wght@400;500;600;700;800;900" },
  rubik: { name: "Rubik", stack: "'Rubik',Arial,sans-serif", googleParam: "Rubik:wght@400;500;600;700;800;900" },
  assistant: { name: "Assistant", stack: "'Assistant',Arial,sans-serif", googleParam: "Assistant:wght@400;500;600;700;800" },
  frankRuhl: { name: "Frank Ruhl Libre (סריפי)", stack: "'Frank Ruhl Libre',serif", googleParam: "Frank+Ruhl+Libre:wght@400;500;700;900" },
  davidLibre: { name: "David Libre (סריפי)", stack: "'David Libre',serif", googleParam: "David+Libre:wght@400;500;700" },
  secularOne: { name: "Secular One", stack: "'Secular One',Arial,sans-serif", googleParam: "Secular+One" },
  suezOne: { name: "Suez One (סריפי)", stack: "'Suez One',serif", googleParam: "Suez+One" },
  varelaRound: { name: "Varela Round (עגול)", stack: "'Varela Round',Arial,sans-serif", googleParam: "Varela+Round" },
};
function siteFontImport(fontKey) {
  const font = SITE_FONTS[fontKey] || SITE_FONTS.heebo;
  // Heebo + Frank Ruhl Libre stay loaded unconditionally — plenty of
  // templates reference them directly in their own CSS for headline
  // styling regardless of which body font the customer picked.
  const extra = (fontKey && fontKey !== "heebo" && fontKey !== "frankRuhl") ? `&family=${font.googleParam}` : "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800;900&family=Frank+Ruhl+Libre:wght@500;700;900${extra}&display=swap" rel="stylesheet">`;
}
function siteBaseCss(fontKey) {
  const font = SITE_FONTS[fontKey] || SITE_FONTS.heebo;
  return `
    * { box-sizing: border-box; }
    html { overflow-x:hidden; }
    body { margin:0; font-family:${font.stack}; color:#1E1E1E; line-height:1.6; }
    /* Belt-and-suspenders against a long, unbroken heading/text pushing the
       page wider than the viewport (confirmed live: forced horizontal
       scroll). overflow-wrap makes long text wrap onto multiple lines
       instead of stretching its box; the html-level overflow-x:hidden above
       is the actual guarantee — it clips any edge case that still manages
       to overflow, so no amount of typed text can ever force side-scroll. */
    .site-editable { overflow-wrap:break-word; word-break:break-word; }
    img { max-width:100%; display:block; }
    a { text-decoration:none; color:inherit; }
    .container { max-width:1000px; margin:0 auto; padding:0 24px; }
    .eyebrow { display:inline-block; font-size:12.5px; font-weight:700; letter-spacing:.05em; padding:7px 18px; border-radius:20px; }
    .wa-fab { position:fixed; bottom:22px; inset-inline-end:22px; width:56px; height:56px; border-radius:50%;
      background:#25D366; color:#fff; display:flex; align-items:center; justify-content:center; font-size:26px;
      box-shadow:0 8px 22px rgba(0,0,0,.25); z-index:50; }
    .site-search { text-align:center; margin:0 0 30px; }
    .site-search-input { width:100%; max-width:360px; padding:11px 18px; border-radius:24px; border:1.5px solid #E2E2E2; font-family:inherit; font-size:14px; }
    .site-search-input:focus { outline:none; border-color:#BBB; }
    .site-search-empty { text-align:center; color:#888; font-size:14px; padding:26px 0; }
    .site-hero-photo { display:block; margin:26px auto 0; border-radius:18px; max-width:320px; width:100%; box-shadow:0 18px 40px rgba(0,0,0,.25); }
    .site-hero-photo.round { border-radius:50%; width:132px; height:132px; object-fit:cover; margin:0 auto 18px; }
    /* Slides are position:absolute (needed so they can stack and cross-
       fade), which takes them out of flow — without an explicit size the
       wrapper itself would collapse to zero height. A generic 4:3 default
       covers the plain/no-class case; anything that already sets its own
       explicit width+height (like .site-hero-photo.round) simply wins,
       since aspect-ratio only fills in a dimension left auto. */
    .site-hero-slideshow { position:relative; overflow:hidden; aspect-ratio:4/3; }
    .site-reveal { opacity:0; transform:translateY(18px); transition:opacity .7s ease, transform .7s ease; }
    .site-reveal.site-in { opacity:1; transform:translateY(0); }
    .site-hero-videobg { position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
    .site-hero-videobg iframe { position:absolute; top:50%; left:50%; width:177.78vh; min-width:100%; height:56.25vw; min-height:100%; transform:translate(-50%,-50%); border:0; }
    .site-hero-videobg::after { content:""; position:absolute; inset:0; background:rgba(0,0,0,.42); }
    .site-hero-slideshow .site-hero-slide { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity 1.4s ease; }
    .site-hero-slideshow .site-hero-slide.active { opacity:1; }
    .site-video-wrap { position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:14px; box-shadow:0 16px 34px rgba(0,0,0,.14); max-width:780px; margin:0 auto; }
    .site-video-wrap iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
  `;
}

/* YouTube/Vimeo only — a raw uploaded video file would balloon a
   few-KB static site into tens of MB, exactly the "heavy" tradeoff a
   link avoids. Returns null for anything else so the section is simply
   skipped rather than embedding a broken player. */
function videoEmbedSrc(url) {
  if (!url) return null;
  const u = String(url).trim();
  let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return null;
}
function videoEmbedHtml(embedSrc) {
  return `<div class="site-video-wrap"><iframe src="${embedSrc}" title="סרטון" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
}

/* Same YouTube/Vimeo URL d.videoUrl already uses for the embedded video
   section, but with autoplay+mute+loop+no-controls params so it can play
   silently behind a hero instead of needing a click. Muted autoplay is
   what every major browser actually allows without the visitor's own
   interaction — a background video that needed sound would just never
   start. */
function videoBgEmbedSrc(url) {
  if (!url) return null;
  const u = String(url).trim();
  let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3`;
  m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}?autoplay=1&muted=1&loop=1&background=1&controls=0`;
  return null;
}
/* Full-bleed, click-through (pointer-events:none — a hero CTA sitting on
   top must stay clickable) video layer with its own built-in dark
   overlay, so it's legible under white hero text regardless of what the
   video itself looks like. The oversized iframe + translate(-50%,-50%)
   centering is the standard "cover" trick for a 16:9 embed: sized off
   the viewport's own aspect so it always fills the box and crops
   overflow, the same way object-fit:cover does for a plain <img> (an
   <iframe> has no object-fit support of its own). */
function heroVideoBgHtml(d) {
  if (!d.heroVideoBg) return "";
  const src = videoBgEmbedSrc(d.videoUrl);
  if (!src) return "";
  return `<div class="site-hero-videobg"><iframe src="${src}" title="" tabindex="-1" aria-hidden="true" allow="autoplay; encrypted-media"></iframe></div>`;
}
function waFabHtml(d) {
  const href = waLink(d.whatsapp || d.phone);
  return href ? `<a class="wa-fab" href="${href}" target="_blank" rel="noopener" aria-label="וואטסאפ">💬</a>` : "";
}
function servicesData(d) {
  return (d.services || []).filter((s) => s.name && s.name.trim());
}

/* Every template used to hard-code its own section headings ("השירותים
   שלנו", "קצת עלינו"...) straight into the HTML string — a customer had
   zero control over that wording, only over the content underneath it.
   d.headings[key] is a free-text override the wizard writes to; heading()
   just prefers it over the template's own built-in default, so every
   existing call site keeps working unchanged for anyone who never
   touches the new field. HEADING_SUGGESTIONS backs the wizard's "pick an
   alternative, or type your own" dropdown — the phrasing options a
   customer sees before falling through to a custom textbox. */
const HEADING_SUGGESTIONS = {
  services: ["השירותים שלנו", "מה אנחנו מציעים", "איך נוכל לעזור", "התחומים שלנו", "מה תמצאו כאן"],
  products: ["המוצרים שלנו", "מה יש לנו בשבילכם", "הקולקציה שלנו", "מה תמצאו בחנות", "המבחר שלנו"],
  work: ["עבודות נבחרות", "תיק העבודות שלי", "פרויקטים אחרונים", "קצת מהעבודות שלי", "מה כבר יצא לי לעשות"],
  about: ["קצת עלינו", "מי אנחנו", "הסיפור שלנו", "למה לבחור בנו", "מאחורי העסק"],
  contact: ["יצירת קשר", "בואו נדבר", "נשמח לשמוע מכם", "דברו איתנו", "בואו נתחיל"],
};
/* Which suggestion bank the wizard shows for a template's own "services"
   heading slot — a boutique's grid is really products, a portfolio's is
   really work, even though the underlying data field is still d.services. */
const TEMPLATE_SECTION_ROLE = {
  "local-service": "services", "freelancer": "services", "process": "services",
  "bento": "services", "cinematic": "services", "neon": "services", "luxury3d": "services",
  "noir": "services", "bold": "services", "elegant": "services", "playground": "services",
  "catalog": "products", "boutique": "products", "brutal": "products", "chaos": "products",
  "gallery": "work", "portfolio": "work", "studio": "work",
};
function heading(d, key, fallback) {
  const v = d.headings && d.headings[key];
  const text = (v && String(v).trim()) ? String(v).trim() : fallback;
  return t(d, `heading-${key}`, escapeHtmlS(text));
}

/* Guarantees every section has something reasonable to show, even for a
   customer who hasn't filled much in yet — placeholders read clearly as
   placeholders (instructive, not invented business claims) so a download
   never looks broken or empty, but also never lies about the business. */
const SITE_PLACEHOLDER_SERVICES = [
  { name: "שירות ראשון", desc: "תארו כאן בקצרה מה כלול בשירות הזה" },
  { name: "שירות שני", desc: "תארו כאן בקצרה מה כלול בשירות הזה" },
  { name: "שירות שלישי", desc: "תארו כאן בקצרה מה כלול בשירות הזה" },
];
function withFallback(d) {
  const services = servicesData(d);
  return {
    businessName: (d.businessName || "").trim() || "שם העסק שלכם",
    tagline: (d.tagline || "").trim() || "התיאור הקצר שלכם יופיע כאן",
    about: (d.about || "").trim() || "ספרו כאן בכמה משפטים מי אתם, מה הניסיון שלכם, ולמה כדאי לבחור בכם.",
    _services: services.length ? services : SITE_PLACEHOLDER_SERVICES,
    _hasContact: !!(d.phone || d.whatsapp || d.email || d.address),
  };
}

/* Falls back through whatever contact channel actually exists, so a CTA
   button never links to nothing. */
function primaryCtaHref(d, page) {
  const wa = waLink(d.whatsapp || d.phone);
  if (wa) return { href: wa, label: "שליחת הודעה בוואטסאפ", external: true };
  if (d.email) return { href: `mailto:${d.email}`, label: "שליחת מייל", external: false };
  if (d.phone) return { href: `tel:${d.phone}`, label: "התקשרות עכשיו", external: false };
  // Same relative "contact.html" the real nav links use, so it needs the
  // same page: "contact" marker — see the comment above previewNavScript().
  if (d.pages && d.pages.contact && page !== "contact") return { href: "contact.html", label: "יצירת קשר", external: false, page: "contact" };
  return null;
}
function ctaHtml(cta, cls) {
  if (!cta) return "";
  // Confirmed live: without data-site-nav, this exact relative "contact.html"
  // link (a customer with no phone/email/WhatsApp set yet, but a separate
  // Contact page turned on) navigated the PREVIEW IFRAME for real instead of
  // switching its tab — since a srcdoc iframe has no URL of its own, the
  // relative link resolved against the editor page's own URL and silently
  // opened DeskKit's own contact page. The real nav links already carry this
  // marker for exactly this reason; the CTA button just never got it.
  const navAttrs = cta.page ? ` data-site-nav data-page="${cta.page}"` : "";
  return `<a class="${cls}" href="${escapeHtmlS(cta.href)}"${cta.external ? ' target="_blank" rel="noopener"' : ""}${navAttrs}>${escapeHtmlS(cta.label)}</a>`;
}

/* Builds the shared multi-page nav links (Home / About / Contact) — only
   returns something when the customer actually turned on extra pages, so a
   single-page site's markup is completely unaffected. */
function siteNavLinks(d, activePage) {
  const pages = [{ key: "index", label: "בית", href: "index.html" }];
  if (d.pages && d.pages.about) pages.push({ key: "about", label: "אודות", href: "about.html" });
  if (d.pages && d.pages.contact) pages.push({ key: "contact", label: "צור קשר", href: "contact.html" });
  if (pages.length < 2) return "";
  return pages.map((p) => `<a href="${p.href}" data-site-nav data-page="${p.key}"${p.key === activePage ? ' class="active"' : ""}>${escapeHtmlS(p.label)}</a>`).join("");
}

/* A downloaded/hosted site's nav links are plain relative hrefs (index.html
   / about.html / contact.html) — that's exactly right once the files are
   sitting in the same folder on real hosting. But our own live preview
   shows these documents inside an iframe via `srcdoc`, which has no file
   of its own — a relative href there resolves against *this* editor page's
   URL, so clicking "About" while previewing would silently load DeskKit's
   own about.html instead of the customer's. This script only ever runs
   when the page is inside an iframe (i.e. our preview, never a real
   visit), and swaps the click for a postMessage the preview page uses to
   switch its tab — the actual downloaded site is completely unaffected. */
function previewNavScript() {
  return `<script>
    if (window.self !== window.top) {
      document.querySelectorAll("a[data-site-nav]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          try { window.parent.postMessage({ deskkitPreviewNav: a.getAttribute("data-page") }, "*"); } catch (err) {}
        });
      });
      // Confirmed live: a plain "#some-id" in-page anchor has the exact
      // same problem as a relative page link above — a srcdoc iframe has
      // no URL of its own, so the browser resolves "#ag-contact" against
      // the EDITOR page's URL, and a native click does a real navigation
      // into the live editor page (loaded for real, nested inside the
      // preview) instead of scrolling to the section on the SAME page.
      // Handled manually here instead of relying on native anchor
      // navigation, which only works when the document has a real URL.
      document.querySelectorAll('a[href^="#"]:not([data-site-nav])').forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          var id = a.getAttribute("href").slice(1);
          var target = id && document.getElementById(id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  </script>`;
}

/* Client-side search — filters the cards inside a target grid as the
   visitor types. Fully offline, no backend: matches against a data-search
   attribute baked into each card at build time. */
function searchBoxHtml(targetSel, placeholder) {
  return `<div class="site-search"><input type="search" class="site-search-input" data-search-target="${targetSel}" placeholder="${escapeHtmlS(placeholder)}" aria-label="${escapeHtmlS(placeholder)}"></div>`;
}
function searchScriptHtml() {
  return `<script>
    document.querySelectorAll(".site-search-input").forEach(function (input) {
      var target = document.querySelector(input.getAttribute("data-search-target"));
      if (!target) return;
      var cards = Array.prototype.slice.call(target.children);
      var empty = document.createElement("div");
      empty.className = "site-search-empty";
      empty.textContent = "לא נמצאו תוצאות מתאימות";
      empty.style.display = "none";
      target.parentNode.insertBefore(empty, target.nextSibling);
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        var anyVisible = false;
        cards.forEach(function (card) {
          var text = (card.getAttribute("data-search") || card.textContent || "").toLowerCase();
          var match = !q || text.indexOf(q) !== -1;
          card.style.display = match ? "" : "none";
          if (match) anyVisible = true;
        });
        empty.style.display = anyVisible ? "none" : "block";
      });
    });
  </script>`;
}

function siteDoc(head, body) {
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtmlS(head.title)}</title>
${head.description ? `<meta name="description" content="${escapeHtmlS(head.description)}">` : ""}
${siteFontImport(head.fontFamily)}
<style>${siteBaseCss(head.fontFamily)}${head.css}</style>
</head>
<body>
${body}
${heroSlideshowScript()}
${scrollRevealScript()}
</body>
</html>`;
}

/* ---------- Template 1: local service business ---------- */

/* Section-renderer decomposition (Builder v2 pilot) — each function
   below returns exactly the HTML chunk renderLocalServiceSite's index
   page used to inline directly, unchanged. Splitting them out is what
   lets the new block-based Builder show/hide/reorder "Hero"/"שירותים/
   מוצרים"/"אודות"/"צור קשר" as real, independent rows, while every
   other template keeps working exactly as before through the
   still-unchanged monolithic function below, which just calls these in
   the same original order. Each section carries its own <script> (where
   it has one) immediately after its own markup, not bundled at the end
   like the original did — behaviorally identical (scripts still run
   after their target elements exist either way), but required once a
   block can be reordered: its script must travel with it. */
function lsHeroSection(d, pal, dd, cta) {
  return `
      <section class="ls-hero">${heroVideoBgHtml(d)}<div class="container">
        <span class="eyebrow">שירות מקצועי ואמין</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "ls-cta")}
        ${d.phone ? `<a class="ls-phone-pill" href="tel:${escapeHtmlS(d.phone)}">${escapeHtmlS(d.phone)}</a>` : ""}
        ${heroMediaHtml(d, "site-hero-photo")}
      </div></section>`;
}
function lsServicesSection(d, pal, dd) {
  const hscrollScript = `<script>
    (function () {
      var wrap = document.getElementById("ls-hscroll");
      var track = document.getElementById("ls-hscroll-track");
      if (!wrap || !track) return;
      if (window.matchMedia && (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(max-width: 760px)").matches)) return;
      var maxShift = 0;
      function recalc() {
        maxShift = Math.max(0, track.scrollWidth - window.innerWidth + 80);
        var extraVh = Math.min(160, Math.max(50, (maxShift / window.innerHeight) * 100 * 1.25));
        wrap.style.height = (100 + extraVh) + "vh";
      }
      function onScroll() {
        var rect = wrap.getBoundingClientRect();
        var total = rect.height - window.innerHeight;
        if (total <= 0) return;
        var progress = Math.min(1, Math.max(0, -rect.top / total));
        track.style.transform = "translateX(" + (progress * maxShift) + "px)";
      }
      recalc();
      onScroll();
      window.addEventListener("resize", function () { recalc(); onScroll(); });
      document.addEventListener("scroll", onScroll, { passive: true });
    })();
  </script>`;
  return `
      <div class="ls-hscroll-wrap" id="ls-hscroll">
        <div class="ls-hscroll-sticky" id="ls-services">
          <div class="container head"><span class="eyebrow">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2></div>
          <div class="ls-hscroll-track" id="ls-hscroll-track">${dd._services.map((s, i) => `
            <div class="ls-card" data-svc-idx="${i}"><div class="num">${String(i + 1).padStart(2, "0")}</div><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price-tag">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        </div>
      </div>
      ${hscrollScript}`;
}
function lsVideoSection(embedSrc) {
  return embedSrc ? `<section class="ls-section site-reveal" style="padding-top:0;"><div class="container">
        <div class="head"><span class="eyebrow">סרטון</span><h2>הכירו אותנו</h2></div>
        ${videoEmbedHtml(embedSrc)}
      </div></section>` : "";
}
function lsAboutSection(d, pal, dd) {
  return (!d.pages || !d.pages.about) ? `<section class="ls-about site-reveal" id="ls-about"><div class="container"><span class="eyebrow" style="background:#fff; color:#${pal.primaryDark};">מי אנחנו</span><h2>${heading(d, "about", "קצת עלינו")}</h2><p>${aboutText(d, dd)}</p></div></section>` : "";
}
function lsContactSection(d, pal, dd, wa) {
  return (!d.pages || !d.pages.contact) ? `<section class="ls-contact site-reveal" id="ls-contact"><div class="container">
        <h2>${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : "";
}

function renderLocalServiceSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#15803D");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  // Single-page mode has no real about.html/contact.html to link to, so the
  // side rail falls back to in-page anchors instead — same trick the studio
  // template already uses for its own vertical rail.
  const inPageRail = !navLinksHtml && page === "index";
  const railLinks = navLinksHtml
    ? navLinksHtml
    : inPageRail
      ? `<a href="#ls-services" class="active">שירותים</a><a href="#ls-about">אודות</a>${dd._hasContact || wa ? `<a href="#ls-contact">יצירת קשר</a>` : ""}`
      : "";
  const css = `
    .ls-rail { position:fixed; top:0; bottom:0; inset-inline-start:0; width:60px; z-index:40; display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-inline-end:1px solid #EEE; }
    .ls-rail-inner { display:flex; flex-direction:column; gap:28px; align-items:center; }
    .ls-rail a { writing-mode:vertical-rl; text-orientation:mixed; font-size:12px; font-weight:700; letter-spacing:.08em; color:#888; }
    .ls-rail a.active, .ls-rail a:hover { color:#${pal.primaryDark}; }
    .ls-rail-biz { writing-mode:vertical-rl; font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:14px; color:#${pal.primaryDark}; margin-bottom:8px; }
    @media (max-width:760px) { .ls-rail { display:none; } }
    body.ls-body { padding-inline-start:60px; }
    @media (max-width:760px) { body.ls-body { padding-inline-start:0; } }
    .ls-topbar { display:none; background:#fff; border-bottom:1px solid #EEE; padding:14px 0; }
    @media (max-width:760px) { .ls-topbar { display:block; } }
    .ls-topbar .row { display:flex; align-items:center; justify-content:space-between; gap:14px; }
    .ls-topbar .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:17px; color:#${pal.primaryDark}; }
    .ls-topbar .phone { font-size:12.5px; font-weight:700; color:#${pal.primaryDark}; }

    .ls-hero { position:relative; overflow:hidden; text-align:center; color:#fff; padding:100px 0 112px;
      background: radial-gradient(circle at 22% 20%, rgba(255,255,255,.18), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark} 0%, #${pal.primary} 60%, #${pal.primaryDark} 130%); }
    .ls-hero .container { position:relative; z-index:1; }
    .ls-hero .eyebrow { background:rgba(255,255,255,.16); color:#fff; margin-bottom:20px; }
    .ls-hero h1 { font-family:'Frank Ruhl Libre',serif; font-size:48px; font-weight:700; margin:0 0 18px; line-height:1.25; }
    .ls-hero p { font-size:18px; opacity:.92; max-width:560px; margin:0 auto 34px; }
    .ls-cta { display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:800; padding:16px 38px; border-radius:30px; font-size:15.5px; box-shadow:0 14px 30px rgba(0,0,0,.28); }
    .ls-phone-pill { display:inline-block; margin-inline-start:10px; font-size:13.5px; font-weight:700; color:#fff; background:rgba(255,255,255,.16); padding:10px 20px; border-radius:20px; }

    .ls-section { padding:68px 0; }
    .ls-section .head { text-align:center; margin-bottom:28px; }
    .ls-section .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:14px; }
    .ls-section h2 { font-family:'Frank Ruhl Libre',serif; font-size:32px; color:#${pal.primaryDark}; margin:0 0 20px; }

    /* Horizontal scroll-jacking rail for services: the section reserves extra
       vertical scroll distance (sized from the actual track width in the
       script below, never a fixed guess), and while the visitor scrolls
       through that distance the cards glide sideways instead of the page
       just continuing to scroll down. */
    .ls-hscroll-wrap { position:relative; }
    .ls-hscroll-sticky { position:sticky; top:0; height:100vh; display:flex; flex-direction:column; justify-content:center; overflow:hidden; }
    .ls-hscroll-track { display:flex; gap:22px; padding:0 40px; will-change:transform; }
    .ls-card { flex:0 0 auto; width:280px; border:1px solid #EFEFEF; border-radius:16px; padding:28px; background:#fff; box-shadow:0 12px 28px rgba(0,0,0,.06); }
    .ls-card .num { width:36px; height:36px; border-radius:50%; background:#${pal.ice}; color:#${pal.primaryDark};
      display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; margin-bottom:16px; }
    .ls-card h3 { margin:0 0 8px; font-size:18px; color:#${pal.primaryDark}; font-weight:700; }
    .ls-card p { margin:0 0 12px; font-size:14px; color:#666; }
    .ls-card .price-tag { font-weight:800; color:#${pal.primary}; font-size:16px; }
    @media (max-width:760px) { .ls-hscroll-sticky { position:static; height:auto; } .ls-hscroll-track { flex-wrap:wrap; transform:none !important; padding:0; } .ls-card { width:100%; } }

    .ls-about { background:#${pal.ice}; padding:68px 0; }
    .ls-about .container { max-width:720px; text-align:center; }
    .ls-about h2 { font-family:'Frank Ruhl Libre',serif; font-size:28px; color:#${pal.primaryDark}; margin:14px 0 18px; }
    .ls-about p { font-size:16.5px; color:#3a3a3a; }

    .ls-contact { background:linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary}); color:#fff; padding:60px 0; text-align:center; }
    .ls-contact h2 { font-family:'Frank Ruhl Libre',serif; font-size:28px; margin:0 0 22px; }
    .ls-contact .line { font-size:15.5px; margin-bottom:8px; opacity:.94; }
    .ls-footer { padding:22px 0; text-align:center; font-size:12px; color:#999; }
  `;
  const rail = railLinks ? `<div class="ls-rail"><div class="ls-rail-inner"><span class="ls-rail-biz">${bizName(d, dd)}</span>${railLinks}</div></div>` : "";
  const topbar = `<div class="ls-topbar"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${d.phone ? `<a class="phone" href="tel:${escapeHtmlS(d.phone)}">${escapeHtmlS(d.phone)}</a>` : ""}
    </div></div>`;
  // previewNavScript() also makes this template's own in-page rail anchors
  // (#ls-services / #ls-about / #ls-contact) safe inside the preview
  // iframe, same reasoning as the studio template's rail.
  const footer = `<div class="ls-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${(navLinksHtml || inPageRail) ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="ls-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1 style="font-size:36px;">${heading(d, "about", dd.businessName)}</h1>
      </div></section>
      <section class="ls-about site-reveal" style="padding:64px 0;"><div class="container"><p>${aboutText(d, dd)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="ls-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1 style="font-size:36px;">${heading(d, "contact", "יצירת קשר")}</h1>
      </div></section>
      <section class="ls-contact site-reveal"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="ls-cta" style="margin-top:10px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else if (typeof isTemplateMigrated === "function" && isTemplateMigrated("local-service")) {
    // Builder v2 (see js/site-blocks.js): the hero/services/about/contact
    // order below is the DEFAULT only — once a customer reorders/hides a
    // block via the hierarchy panel, that saved order renders instead.
    main = renderBlocksHtml(d, "local-service", "index", {
      pal, dd, cta, wa, videoSection: lsVideoSection(embedSrc),
    });
  } else {
    main = `${lsHeroSection(d, pal, dd, cta)}
      ${lsServicesSection(d, pal, dd)}
      ${lsVideoSection(embedSrc)}
      ${lsAboutSection(d, pal, dd)}
      ${lsContactSection(d, pal, dd, wa)}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${rail}${topbar}${main}${footer}`).replace("<body>", '<body class="ls-body">');
}

/* ---------- Template 2: freelancer / consultant ---------- */
function renderFreelancerSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#DC2626");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .fr-nav { background:#fff; border-bottom:1px solid #EEE; padding:14px 0; }
    .fr-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
    .fr-nav-name { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:16px; color:#${pal.primaryDark}; }
    .fr-nav nav { display:flex; gap:16px; }
    .fr-nav nav a { font-size:13.5px; font-weight:600; color:#555; }
    .fr-nav nav a.active { color:#${pal.primaryDark}; }

    .fr-hero { position:relative; overflow:hidden; text-align:center; color:#fff; padding:120px 24px 96px;
      background: radial-gradient(circle at 30% 22%, rgba(255,255,255,.16), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary} 75%); }
    .fr-hero .eyebrow { background:rgba(255,255,255,.16); color:#fff; }
    .fr-name { font-family:'Frank Ruhl Libre',serif; font-size:48px; font-weight:700; margin:18px 0 8px; }
    .fr-role { font-size:17px; opacity:.92; font-weight:600; letter-spacing:.02em; }

    .fr-body { max-width:640px; margin:0 auto; padding:60px 24px; text-align:center; }
    .fr-about { font-size:17px; color:#333; line-height:1.85; margin:0 0 36px; }
    .fr-tags { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; }
    .fr-tag { border:1.5px solid #${pal.primary}; color:#${pal.primaryDark}; padding:9px 20px; border-radius:24px; font-size:13.5px; font-weight:700; background:#${pal.ice}; }

    .fr-cta { background:linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary}); color:#fff; padding:66px 24px; text-align:center; }
    .fr-cta h2 { font-family:'Frank Ruhl Libre',serif; font-size:29px; margin:0 0 24px; }
    .fr-cta .btn { display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:800; padding:14px 30px; border-radius:30px; margin:6px; box-shadow:0 12px 26px rgba(0,0,0,.22); }
    .fr-footer { padding:22px 0; text-align:center; font-size:12px; color:#999; }
  `;
  const navBar = navLinksHtml ? `<div class="fr-nav"><div class="container row"><span class="fr-nav-name">${bizName(d, dd)}</span><nav>${navLinksHtml}</nav></div></div>` : "";
  const footer = `<div class="fr-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="fr-hero" style="padding:70px 24px 54px;">
        <span class="eyebrow">מי אני</span>
        <div class="fr-name" style="font-size:34px;">${heading(d, "about", dd.businessName)}</div>
      </section>
      <div class="fr-body"><p class="fr-about">${aboutText(d, dd)}</p></div>`;
  } else if (page === "contact") {
    main = `
      <section class="fr-hero" style="padding:70px 24px 54px;">
        <span class="eyebrow">נשמח לשמוע מכם</span>
        <div class="fr-name" style="font-size:34px;">יצירת קשר</div>
      </section>
      <section class="fr-cta site-reveal">
        <h2>${heading(d, "contact", "בואו נדבר")}</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
        ${!wa && !d.email && !d.phone ? `<p style="opacity:.85;">פרטו כאן דרכי יצירת קשר.</p>` : ""}
      </section>`;
  } else {
    const services = dd._services;
    main = `
      <section class="fr-hero">
        ${heroMediaHtml(d, "site-hero-photo round")}
        <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "פרילנסר / יועץ"}</span>
        <div class="fr-name">${heading(d, "heroTitle", dd.businessName)}</div>
        <div class="fr-role">${taglineText(d, dd)}</div>
      </section>
      <div class="fr-body">
        <p class="fr-about">${aboutText(d, dd)}</p>
        <div class="fr-tags">${services.map((s) => `<span class="fr-tag">${escapeHtmlS(s.name)}</span>`).join("")}</div>
      </div>
      ${embedSrc ? `<div class="fr-body" style="padding-top:0;">${videoEmbedHtml(embedSrc)}</div>` : ""}
      <section class="fr-cta site-reveal">
        <h2>${heading(d, "contact", "בואו נדבר")}</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
      </section>
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${navBar}${main}${footer}`);
}

/* ---------- Template 3: small catalog / shop ---------- */

/* Section-renderer decomposition, same idea and same guarantee as
   local-service's (see that comment above lsHeroSection): each function
   below returns exactly the HTML chunk renderCatalogSite's index page
   already inlined, unchanged, so migrating this template can never
   alter what an existing, already-saved catalog project looks like —
   only unlocks reordering it going forward. No contact section here on
   purpose — this template genuinely has none inline on its index page
   (see READONLY_HIER_OVERRIDES' catalog: { contact: false } from before
   this migration), so SITE_BLOCK_DEFS's catalog entry below only lists
   hero/services/about. */
function catHeroSection(d, pal, dd) {
  const services = dd._services;
  return `
      <section class="cat-title"><div class="container">
        <span class="eyebrow">${heading(d, "services", "קטלוג המוצרים שלנו")}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        <div class="stats">${services.length} מוצרים/שירותים זמינים</div>
        ${heroMediaHtml(d, "site-hero-photo")}
      </div></section>`;
}
function catServicesSection(d, pal, dd) {
  const services = dd._services;
  const showSearch = services.length >= 3;
  return `
      <div class="container">
        ${showSearch ? searchBoxHtml("#cat-grid", "חיפוש מוצר או שירות...") : ""}
        <div class="cat-grid" id="cat-grid">${services.map((s) => `
          <div class="cat-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><div class="swatch-bar"></div><div class="body">
            <h3>${escapeHtmlS(s.name)}</h3>
            ${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div></div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div>`;
}
function catVideoSection(embedSrc) {
  return embedSrc ? `<div class="container"><div style="padding:36px 0;">${videoEmbedHtml(embedSrc)}</div></div>` : "";
}
function catAboutSection(d, pal, dd) {
  return (!d.pages || !d.pages.about) ? `<div class="cat-about">${aboutText(d, dd)}</div>` : "";
}

function renderCatalogSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#C2410C");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .cat-nav { background:#fff; border-bottom:1px solid #EEE; padding:16px 0; }
    .cat-nav .row { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .cat-nav .biz { font-family:'Frank Ruhl Libre',serif; font-size:19px; font-weight:700; color:#${pal.primaryDark}; }
    .cat-nav a.wa-link { background:#${pal.primary}; color:#fff; padding:9px 18px; border-radius:20px; font-size:13px; font-weight:700; }
    .cat-pagenav { display:flex; gap:16px; }
    .cat-pagenav a { font-size:13.5px; font-weight:600; color:#555; }
    .cat-pagenav a.active { color:#${pal.primaryDark}; }

    .cat-title { position:relative; overflow:hidden; text-align:center; color:#fff; padding:70px 0 60px;
      background: radial-gradient(circle at 25% 25%, rgba(255,255,255,.16), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary} 75%); }
    .cat-title .eyebrow { background:rgba(255,255,255,.16); color:#fff; margin-bottom:16px; }
    .cat-title h1 { font-family:'Frank Ruhl Libre',serif; font-size:38px; margin:0 0 12px; }
    .cat-title p { font-size:15.5px; opacity:.92; margin:0 0 16px; }
    .cat-title .stats { font-size:13px; opacity:.85; }

    .cat-grid { padding:52px 0 20px; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:22px; }
    .cat-card { border:1px solid #EEE; border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 12px 26px rgba(0,0,0,.06); }
    .cat-card .swatch-bar { height:6px; background:linear-gradient(90deg, #${pal.primary}, #${pal.primaryDark}); }
    .cat-card .body { padding:20px; }
    .cat-card h3 { margin:0 0 6px; font-size:16.5px; color:#${pal.primaryDark}; font-weight:700; }
    .cat-card p { margin:0 0 12px; font-size:13.5px; color:#666; }
    .cat-card .price { font-weight:800; color:#${pal.primary}; font-size:15.5px; }

    .cat-about { padding:24px 0 58px; text-align:center; max-width:640px; margin:0 auto; color:#3a3a3a; font-size:15.5px; }
    .cat-info { background:#${pal.ice}; padding:60px 0; text-align:center; }
    .cat-info .line { font-size:16px; color:#333; margin-bottom:8px; }
    .cat-footer { background:#${pal.primaryDark}; color:#fff; padding:28px 0; text-align:center; font-size:13px; }
  `;
  const nav = `
    <nav class="cat-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<div class="cat-pagenav">${navLinksHtml}</div>` : ""}
      ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
    </div></nav>`;
  const footer = `<footer class="cat-footer">
      ${d.phone ? `${escapeHtmlS(d.phone)} · ` : ""}${d.email ? `${escapeHtmlS(d.email)} · ` : ""}${d.address ? escapeHtmlS(d.address) : ""}
    </footer>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="cat-title" style="padding:56px 0 48px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1>${heading(d, "about", dd.businessName)}</h1>
      </div></section>
      <div class="container"><div class="cat-about" style="padding:48px 0;">${aboutText(d, dd)}</div></div>`;
  } else if (page === "contact") {
    main = `
      <section class="cat-title" style="padding:56px 0 48px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1>${heading(d, "contact", "יצירת קשר")}</h1>
      </div></section>
      <section class="cat-info site-reveal"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="wa-link" style="display:inline-block; margin-top:10px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else if (typeof isTemplateMigrated === "function" && isTemplateMigrated("catalog")) {
    // Builder v2 (see js/site-blocks.js): hero/services/about order below
    // is the DEFAULT only — once a customer reorders/hides a block via
    // the hierarchy panel, that saved order renders instead.
    main = renderBlocksHtml(d, "catalog", "index", { pal, dd, videoSection: catVideoSection(embedSrc) });
  } else {
    main = `${catHeroSection(d, pal, dd)}
      ${catServicesSection(d, pal, dd)}
      ${catVideoSection(embedSrc)}
      ${catAboutSection(d, pal, dd)}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${nav}${main}${footer}`);
}

/* ---------- Template 4: modern gallery / editorial ---------- */
function renderGallerySite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#BE185D");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = heroHasImage(d);
  const css = `
    .gl-nav { background:#fff; padding:18px 0; }
    .gl-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .gl-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:18px; color:#${pal.primaryDark}; }
    .gl-nav nav { display:flex; gap:22px; }
    .gl-nav nav a { font-size:13px; font-weight:600; color:#555; }
    .gl-nav nav a.active { color:#${pal.primaryDark}; text-decoration:underline; text-underline-offset:5px; }

    .gl-hero { position:relative; min-height:56vh; display:flex; align-items:flex-end; overflow:hidden; }
    .gl-hero-media { position:absolute; inset:0; z-index:0; width:100%; height:100%; object-fit:cover; }
    /* Before a photo is added (a brand-new project, or the catalog's own
       preview card), the hero needs to stand on its own — a huge, mostly-
       white gradient just faded away here (confirmed live: reads as
       "light pink" regardless of how rich the underlying color actually
       is), where every other bold-color template shows its real color at
       full strength from the very first look. */
    .gl-hero.no-photo { background:linear-gradient(160deg, #${pal.primary}, #${pal.primaryDark}); min-height:auto; padding:90px 0 70px; }
    .gl-hero.has-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,.74)); }
    .gl-hero-inner { position:relative; z-index:1; padding:54px 0; width:100%; }
    .gl-hero.has-photo .gl-hero-inner, .gl-hero.no-photo .gl-hero-inner { color:#fff; }
    .gl-hero.no-photo .gl-hero-inner { text-align:center; }
    .gl-eyebrow { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding-top:8px; border-top:2px solid currentColor; margin-bottom:16px; }
    .gl-title { font-family:'Frank Ruhl Libre',serif; font-weight:900; font-size:52px; line-height:1.08; margin:0 0 16px; max-width:700px; }
    .gl-hero.no-photo .gl-title { margin-inline:auto; }
    .gl-tagline { font-size:16.5px; max-width:460px; opacity:.92; margin:0 0 26px; }
    .gl-hero.no-photo .gl-tagline { margin-inline:auto; }
    .gl-cta { display:inline-block; background:#${pal.primary}; color:#fff; font-weight:700; padding:14px 32px; border-radius:4px; font-size:14.5px; }
    .gl-hero.no-photo .gl-cta { background:#fff; color:#${pal.primaryDark}; }

    .gl-section { padding:76px 0; }
    .gl-section-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:34px; flex-wrap:wrap; gap:16px; }
    .gl-section-head h2 { font-family:'Frank Ruhl Libre',serif; font-size:32px; margin:0; }
    .gl-kicker { font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#${pal.primary}; }
    .gl-bento { display:grid; grid-template-columns:repeat(6,1fr); gap:18px; }
    .gl-card { grid-column:span 3; border:1px solid #EAEAEA; padding:26px; position:relative; }
    .gl-card::before { content:""; position:absolute; top:0; inset-inline-start:0; width:32px; height:3px; background:#${pal.primary}; }
    .gl-bento .gl-card:first-child { grid-column:span 6; }
    .gl-card h3 { font-size:18px; font-weight:700; margin:14px 0 8px; }
    .gl-card p { font-size:13.5px; color:#666; margin:0 0 10px; }
    .gl-card .price { font-weight:800; color:#${pal.primary}; font-size:15px; }
    @media (max-width:640px) { .gl-bento .gl-card { grid-column:span 6; } .gl-title { font-size:36px; } }

    .gl-about { padding:70px 0; background:#${pal.ice}; text-align:center; }
    .gl-about blockquote { font-family:'Frank Ruhl Libre',serif; font-size:25px; line-height:1.5; margin:0 auto; max-width:740px; color:#${pal.primaryDark}; }
    .gl-about cite { display:block; margin-top:20px; font-style:normal; font-size:13px; font-weight:700; color:#888; }

    .gl-contact { padding:70px 0; text-align:center; }
    .gl-contact h2 { font-family:'Frank Ruhl Libre',serif; font-size:30px; margin:0 0 20px; }
    .gl-contact .line { font-size:15px; color:#555; margin-bottom:6px; }
    .gl-footer { border-top:1px solid #EEE; padding:24px 0; text-align:center; font-size:12px; color:#999; }
  `;
  const header = `
    <header class="gl-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="gl-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="gl-about site-reveal"><div class="container">
        <blockquote>${aboutText(d, dd)}</blockquote>
        <cite>${heading(d, "about", dd.businessName)}</cite>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="gl-contact site-reveal"><div class="container">
        <h2>${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="gl-cta" style="margin-top:14px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="gl-hero ${hasPhoto ? "has-photo" : "no-photo"}">${hasPhoto ? heroMediaHtml(d, "gl-hero-media") : ""}<div class="container gl-hero-inner">
        <span class="gl-eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק מקצועי"}</span>
        <h1 class="gl-title">${heading(d, "heroTitle", dd.businessName)}</h1>
        <p class="gl-tagline">${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "gl-cta")}
      </div></section>
      <section class="gl-section site-reveal"><div class="container">
        <div class="gl-section-head"><div><span class="gl-kicker">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2></div>
        ${showSearch ? searchBoxHtml("#gl-bento", "חיפוש שירות...") : ""}</div>
        <div class="gl-bento" id="gl-bento">${dd._services.map((s) => `
          <div class="gl-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 40px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="gl-about site-reveal"><div class="container"><blockquote>${aboutText(d, dd)}</blockquote><cite>${bizName(d, dd)}</cite></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="gl-contact site-reveal"><div class="container">
        <h2>${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 5: bold / neo-brutalist ---------- */
function renderBoldSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#BE185D");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .nb-nav { background:#fff; border-bottom:4px solid #111; padding:16px 0; }
    .nb-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .nb-nav .biz { font-weight:900; font-size:19px; letter-spacing:-.01em; }
    .nb-nav nav { display:flex; gap:16px; flex-wrap:wrap; }
    .nb-nav nav a { font-size:13px; font-weight:700; color:#111; padding:4px 2px; }
    .nb-nav nav a.active { background:#${pal.primary}; color:#fff; padding:4px 10px; }

    .nb-hero { background:#${pal.ice}; border-bottom:4px solid #111; padding:80px 0; text-align:center; }
    .nb-hero .eyebrow { display:inline-block; background:#111; color:#fff; font-size:12px; font-weight:800; letter-spacing:.06em; padding:6px 16px; margin-bottom:18px; }
    .nb-hero h1 { font-family:'Frank Ruhl Libre',serif; font-weight:900; font-size:48px; margin:0 0 16px; line-height:1.1; }
    .nb-hero p { font-size:16.5px; font-weight:600; max-width:480px; margin:0 auto 30px; }
    .nb-cta { display:inline-block; background:#${pal.primary}; color:#fff; font-weight:800; padding:14px 30px; border:3px solid #111; box-shadow:5px 5px 0 #111; font-size:15px; }
    .nb-hero-photo { border:3px solid #111; box-shadow:6px 6px 0 #111; max-width:320px; width:100%; margin:30px auto 0; }
    .nb-hero.last { border-bottom:none; }

    .nb-section { padding:68px 0; border-bottom:4px solid #111; }
    .nb-section.last { border-bottom:none; }
    .nb-section-head { text-align:center; margin-bottom:34px; }
    .nb-section-head h2 { font-family:'Frank Ruhl Libre',serif; font-weight:900; font-size:30px; margin:0 0 8px; }
    .nb-tag { display:inline-block; background:#111; color:#fff; font-size:11.5px; font-weight:800; letter-spacing:.05em; padding:5px 14px; margin-bottom:10px; }
    .nb-section .site-search-input { border-radius:0; border:2px solid #111; }

    .nb-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:24px; }
    .nb-card { background:#fff; border:3px solid #111; box-shadow:6px 6px 0 #111; padding:24px; }
    .nb-card h3 { font-size:17.5px; font-weight:800; margin:0 0 8px; }
    .nb-card p { font-size:13.5px; color:#444; margin:0 0 10px; }
    .nb-card .price { display:inline-block; background:#${pal.ice}; border:2px solid #111; font-weight:800; padding:4px 10px; font-size:13.5px; }

    .nb-about { background:#111; color:#fff; padding:64px 0; text-align:center; }
    .nb-about p { font-size:18.5px; font-weight:600; max-width:700px; margin:0 auto; line-height:1.6; }

    .nb-contact { padding:64px 0; text-align:center; }
    .nb-contact .line { display:inline-block; background:#${pal.ice}; border:2px solid #111; padding:8px 16px; margin:4px; font-weight:700; font-size:13.5px; }

    .nb-footer { border-top:4px solid #111; padding:22px 0; text-align:center; font-size:12px; font-weight:700; }
  `;
  const header = `
    <header class="nb-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="nb-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `<section class="nb-about site-reveal last"><div class="container"><p>${aboutText(d, dd)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="nb-hero last"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span>
        <h1 style="font-size:34px;">${heading(d, "contact", "יצירת קשר")}</h1>
        ${dd._hasContact ? `
          ${d.phone ? `<span class="line" style="display:inline-block; background:#fff; border:2px solid #111; padding:8px 16px; margin:4px; font-weight:700; font-size:13.5px;">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
          ${d.email ? `<span class="line" style="display:inline-block; background:#fff; border:2px solid #111; padding:8px 16px; margin:4px; font-weight:700; font-size:13.5px;">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
          ${d.address ? `<span class="line" style="display:inline-block; background:#fff; border:2px solid #111; padding:8px 16px; margin:4px; font-weight:700; font-size:13.5px;">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
        ` : `<p>פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</p>`}
        <div style="margin-top:20px;">${wa ? `<a class="nb-cta" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}</div>
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="nb-hero"><div class="container">
        <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק מקצועי"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "nb-cta")}
        ${heroMediaHtml(d, "nb-hero-photo")}
      </div></section>
      <section class="nb-section site-reveal"><div class="container">
        <div class="nb-section-head"><span class="nb-tag">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#nb-grid", "חיפוש שירות...") : ""}</div>
        <div class="nb-grid" id="nb-grid">${dd._services.map((s) => `
          <div class="nb-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="nb-section site-reveal"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="nb-about site-reveal"><div class="container"><p>${aboutText(d, dd)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="nb-contact site-reveal last"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
          ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
          ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
        ` : `<p>פרטו כאן טלפון, מייל וכתובת.</p>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 6: elegant split-hero (events / boutique) ---------- */
function renderElegantSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#B8860B");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = heroHasImage(d);
  const css = `
    .eg-nav { padding:26px 0; }
    .eg-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .eg-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:19px; letter-spacing:.02em; color:#${pal.primaryDark}; }
    .eg-nav nav { display:flex; gap:22px; }
    .eg-nav nav a { font-size:12.5px; font-weight:600; letter-spacing:.04em; color:#666; }
    .eg-nav nav a.active { color:#${pal.primaryDark}; }
    .eg-rule { width:56px; height:2px; background:#${pal.primary}; margin:0 auto; }

    .eg-hero { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:44px; padding:38px 0 78px; }
    .eg-hero-text .eyebrow { background:none; padding:0; font-style:italic; font-weight:600; color:#${pal.primary}; letter-spacing:.03em; }
    .eg-hero-text h1 { font-family:'Frank Ruhl Libre',serif; font-size:46px; line-height:1.18; margin:16px 0 18px; color:#1E1E1E; }
    .eg-hero-text p { font-size:16px; color:#555; max-width:420px; margin:0 0 30px; }
    .eg-cta { display:inline-block; border:1.5px solid #${pal.primaryDark}; color:#${pal.primaryDark}; font-weight:700; font-size:13.5px; letter-spacing:.04em; padding:14px 32px; }
    .eg-hero-photo-wrap { position:relative; }
    .eg-hero-photo-wrap img, .eg-hero-photo-wrap .site-hero-slideshow { width:100%; aspect-ratio:4/5; object-fit:cover; }
    .eg-hero-photo-wrap::after { content:""; position:absolute; inset:16px auto auto 16px; width:100%; height:100%; border:1.5px solid #${pal.primary}; z-index:-1; }
    .eg-hero-noPhoto { text-align:center; padding:30px 0 10px; }
    .eg-hero-noPhoto .eg-hero-text { margin:0 auto; }
    .eg-hero-noPhoto .eg-hero-text p { margin-inline:auto; }
    @media (max-width:760px) { .eg-hero { grid-template-columns:1fr; padding-bottom:50px; } .eg-hero-text h1 { font-size:34px; } }

    .eg-section { padding:70px 0; }
    .eg-section-head { text-align:center; margin-bottom:44px; }
    .eg-kicker { font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#${pal.primary}; }
    .eg-section-head h2 { font-family:'Frank Ruhl Libre',serif; font-size:31px; margin:12px 0 0; color:#1E1E1E; }
    .eg-offerings { max-width:760px; margin:0 auto; }
    .eg-offer { display:flex; justify-content:space-between; align-items:baseline; gap:20px; padding:22px 0; border-bottom:1px solid #E7E2D8; }
    .eg-offer:first-child { border-top:1px solid #E7E2D8; }
    .eg-offer-main h3 { margin:0 0 6px; font-size:18px; font-weight:700; color:#1E1E1E; }
    .eg-offer-main p { margin:0; font-size:13.5px; color:#777; max-width:480px; }
    .eg-offer .price { font-weight:700; color:#${pal.primaryDark}; font-size:15px; white-space:nowrap; }

    .eg-about { background:#${pal.ice}; padding:76px 0; text-align:center; }
    .eg-about blockquote { font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:23px; line-height:1.7; max-width:680px; margin:0 auto; color:#${pal.primaryDark}; }

    .eg-contact { padding:70px 0; text-align:center; }
    .eg-contact .line { font-size:15px; color:#555; margin-bottom:8px; }
    .eg-footer { border-top:1px solid #EEE; padding:26px 0; text-align:center; font-size:11.5px; letter-spacing:.04em; color:#999; }
  `;
  const header = `
    <header class="eg-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="eg-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <div class="container"><div class="eg-rule" style="margin:36px auto 0;"></div></div>
      <section class="eg-about site-reveal"><div class="container"><blockquote>${aboutText(d, dd)}</blockquote></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="eg-contact site-reveal"><div class="container">
        <span class="eg-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-size:30px; margin:12px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="eg-cta" style="margin-top:16px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="eg-hero ${hasPhoto ? "" : "eg-hero-noPhoto"}"><div class="container" style="${hasPhoto ? "display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:44px;" : ""}">
        ${hasPhoto ? `
          <div class="eg-hero-text">
            <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק בוטיק"}</span>
            <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
            <p>${taglineText(d, dd)}</p>
            ${ctaHtml(cta, "eg-cta")}
          </div>
          <div class="eg-hero-photo-wrap">${heroMediaHtml(d, "")}</div>
        ` : `
          <div class="eg-hero-text">
            <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק בוטיק"}</span>
            <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
            <p>${taglineText(d, dd)}</p>
            ${ctaHtml(cta, "eg-cta")}
          </div>
        `}
      </div></section>
      <section class="eg-section site-reveal" style="padding-top:0;"><div class="container">
        <div class="eg-section-head"><span class="eg-kicker">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#eg-offerings", "חיפוש שירות...") : ""}</div>
        <div class="eg-offerings" id="eg-offerings">${dd._services.map((s) => `
          <div class="eg-offer" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}">
            <div class="eg-offer-main"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}</div>
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="eg-about site-reveal"><div class="container"><span class="eg-kicker">מי אנחנו</span><blockquote style="margin-top:18px;">${aboutText(d, dd)}</blockquote></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="eg-contact site-reveal"><div class="container">
        <span class="eg-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-size:30px; margin:12px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 7: process / how-we-work ---------- */
function renderProcessSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#15803D");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .pr-nav { background:#fff; border-bottom:1px solid #EEE; padding:16px 0; }
    .pr-nav .row { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .pr-nav .biz { font-family:'Frank Ruhl Libre',serif; font-size:19px; font-weight:700; color:#${pal.primaryDark}; }
    .pr-nav nav { display:flex; gap:18px; }
    .pr-nav nav a { font-size:13.5px; font-weight:600; color:#555; }
    .pr-nav nav a.active { color:#${pal.primaryDark}; }

    .pr-hero { text-align:center; padding:84px 0 60px; background:#${pal.ice}; }
    .pr-hero .eyebrow { background:#fff; color:#${pal.primaryDark}; margin-bottom:20px; }
    .pr-hero h1 { font-family:'Frank Ruhl Libre',serif; font-size:44px; font-weight:700; margin:0 0 16px; color:#1E1E1E; }
    .pr-hero p { font-size:16.5px; color:#555; max-width:520px; margin:0 auto 30px; }
    .pr-cta { display:inline-block; background:#${pal.primary}; color:#fff; font-weight:800; padding:15px 34px; border-radius:6px; font-size:14.5px; }

    .pr-steps { padding:74px 0; }
    .pr-steps-head { text-align:center; margin-bottom:50px; }
    .pr-steps-head .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:14px; }
    .pr-steps-head h2 { font-family:'Frank Ruhl Libre',serif; font-size:31px; margin:0; color:#1E1E1E; }
    .pr-timeline { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:0; position:relative; }
    .pr-step { position:relative; padding:0 20px; text-align:center; }
    .pr-step .circle { width:52px; height:52px; border-radius:50%; background:#${pal.primary}; color:#fff; font-weight:800; font-size:18px;
      display:flex; align-items:center; justify-content:center; margin:0 auto 18px; position:relative; z-index:1; }
    .pr-step h3 { font-size:16.5px; font-weight:700; margin:0 0 8px; color:#1E1E1E; }
    .pr-step p { font-size:13.5px; color:#666; margin:0; }
    .pr-step .price { display:block; margin-top:8px; font-weight:800; color:#${pal.primaryDark}; font-size:14px; }
    .pr-timeline::before { content:""; position:absolute; top:26px; inset-inline-start:8%; inset-inline-end:8%; height:2px; background:#${pal.ice}; z-index:0; }
    @media (max-width:640px) { .pr-timeline::before { display:none; } }

    .pr-about { background:#${pal.primaryDark}; color:#fff; padding:64px 0; text-align:center; }
    .pr-about .eyebrow { background:rgba(255,255,255,.15); color:#fff; margin-bottom:16px; }
    .pr-about p { font-size:17px; max-width:660px; margin:0 auto; line-height:1.75; opacity:.95; }

    .pr-contact { padding:64px 0; text-align:center; }
    .pr-contact h2 { font-family:'Frank Ruhl Libre',serif; font-size:28px; margin:0 0 22px; color:#1E1E1E; }
    .pr-contact .line { font-size:15px; color:#555; margin-bottom:6px; }
    .pr-footer { padding:22px 0; text-align:center; font-size:12px; color:#999; border-top:1px solid #EEE; }
  `;
  const header = `
    <header class="pr-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="pr-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="pr-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1 style="font-size:36px;">${heading(d, "about", dd.businessName)}</h1>
      </div></section>
      <section class="pr-about site-reveal"><div class="container"><p>${aboutText(d, dd)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="pr-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1 style="font-size:36px;">${heading(d, "contact", "יצירת קשר")}</h1>
      </div></section>
      <section class="pr-contact site-reveal"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="pr-cta" style="margin-top:14px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 4;
    main = `
      <section class="pr-hero"><div class="container">
        <span class="eyebrow">איך אנחנו עובדים</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "pr-cta")}
        ${heroMediaHtml(d, "site-hero-photo")}
      </div></section>
      <section class="pr-steps site-reveal"><div class="container">
        <div class="pr-steps-head"><span class="eyebrow">התהליך שלנו</span><h2>${heading(d, "services", "שלב אחר שלב")}</h2>
        ${showSearch ? searchBoxHtml("#pr-timeline", "חיפוש...") : ""}</div>
        <div class="pr-timeline" id="pr-timeline">${dd._services.map((s, i) => `
          <div class="pr-step" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}">
            <div class="circle">${i + 1}</div>
            <h3>${escapeHtmlS(s.name)}</h3>
            ${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}
            ${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}
          </div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="pr-about site-reveal"><div class="container"><span class="eyebrow">מי אנחנו</span><p>${aboutText(d, dd)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="pr-contact site-reveal"><div class="container">
        <h2>${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 8: creative portfolio (personal) ---------- */
function renderPortfolioSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#DC2626");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .po-nav { padding:24px 0; }
    .po-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .po-nav .biz { font-weight:800; font-size:15.5px; letter-spacing:.02em; }
    .po-nav nav { display:flex; gap:20px; }
    .po-nav nav a { font-size:12.5px; font-weight:700; color:#666; }
    .po-nav nav a.active { color:#${pal.primaryDark}; }

    .po-hero { display:grid; grid-template-columns:1fr auto; align-items:center; gap:36px; padding:36px 0 70px; }
    .po-hero .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:18px; }
    .po-hero h1 { font-size:52px; line-height:1.08; font-weight:800; margin:0 0 14px; color:#1E1E1E; }
    .po-hero p { font-size:16px; color:#555; max-width:440px; margin:0 0 26px; }
    .po-hero-photo { width:150px; height:150px; border-radius:50%; object-fit:cover; box-shadow:0 18px 40px rgba(0,0,0,.16); }
    @media (max-width:700px) { .po-hero { grid-template-columns:1fr; text-align:center; } .po-hero h1 { font-size:38px; } .po-hero p { margin-inline:auto; } .po-hero-photo { margin:0 auto; } }

    .po-work { padding:20px 0 70px; }
    .po-work-head { margin-bottom:34px; }
    .po-work-head .kicker { font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#${pal.primary}; }
    .po-work-head h2 { font-size:27px; margin:10px 0 0; }
    .po-work-row { display:grid; grid-template-columns:60px 1fr auto; align-items:baseline; gap:18px; padding:24px 0; border-top:1px solid #EDEDED; }
    .po-work-row:last-child { border-bottom:1px solid #EDEDED; }
    .po-work-idx { font-size:34px; font-weight:800; color:#${pal.primary}; line-height:1; }
    .po-work-main h3 { margin:0 0 6px; font-size:18px; font-weight:800; }
    .po-work-main p { margin:0; font-size:13.5px; color:#777; max-width:480px; }
    .po-work-row .price { font-weight:800; color:#${pal.primaryDark}; font-size:14.5px; white-space:nowrap; }
    @media (max-width:600px) { .po-work-row { grid-template-columns:1fr; gap:6px; } }

    .po-cta { background:#${pal.primaryDark}; color:#fff; padding:64px 0; text-align:center; }
    .po-cta h2 { font-size:27px; margin:0 0 22px; }
    .po-cta .btn { display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:800; padding:14px 30px; border-radius:8px; margin:6px; }
    .po-footer { padding:22px 0; text-align:center; font-size:12px; color:#999; }
  `;
  const header = `
    <header class="po-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="po-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="po-work site-reveal" style="padding-top:44px;"><div class="container" style="max-width:680px;">
        <div class="po-work-head"><span class="kicker">מי אני</span><h2>${heading(d, "about", dd.businessName)}</h2></div>
        <p style="font-size:16px; line-height:1.85; color:#333;">${aboutText(d, dd)}</p>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="po-cta site-reveal">
        <h2>${heading(d, "contact", "בואו נדבר")}</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
        ${!wa && !d.email && !d.phone ? `<p style="opacity:.85;">פרטו כאן דרכי יצירת קשר.</p>` : ""}
      </section>`;
  } else {
    const services = dd._services;
    main = `
      <section class="po-hero"><div class="container" style="display:grid; grid-template-columns:${heroHasImage(d) ? "1fr auto" : "1fr"}; align-items:center; gap:36px;">
        <div>
          <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "תיק עבודות"}</span>
          <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
          <p>${taglineText(d, dd)}</p>
          ${ctaHtml(cta, "po-work-idx")}
        </div>
        ${heroMediaHtml(d, "po-hero-photo")}
      </div></section>
      <section class="po-work site-reveal"><div class="container">
        <div class="po-work-head"><span class="kicker">מה אני עושה</span><h2>${heading(d, "services", "עבודות ושירותים")}</h2></div>
        ${services.map((s, i) => `
          <div class="po-work-row">
            <div class="po-work-idx">${String(i + 1).padStart(2, "0")}</div>
            <div class="po-work-main"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}</div>
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div>`).join("")}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="po-work site-reveal" style="padding-top:0;"><div class="container" style="max-width:680px;"><div class="po-work-head"><span class="kicker">מי אני</span><h2>${heading(d, "about", "עליי")}</h2></div><p style="font-size:15.5px; line-height:1.85; color:#333;">${aboutText(d, dd)}</p></div></section>` : ""}
      <section class="po-cta site-reveal">
        <h2>${heading(d, "contact", "בואו נדבר")}</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
      </section>
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 9: boutique shop with a featured item (shop) ---------- */
function renderBoutiqueSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#C2410C");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .bq-nav { padding:18px 0; border-bottom:1px solid #F0EEEA; }
    .bq-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .bq-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:19px; }
    .bq-nav a.wa-link { background:#${pal.primary}; color:#fff; padding:9px 18px; border-radius:6px; font-size:13px; font-weight:700; }
    .bq-pagenav { display:flex; gap:16px; } .bq-pagenav a { font-size:13.5px; font-weight:600; color:#555; } .bq-pagenav a.active { color:#${pal.primaryDark}; }

    .bq-banner { position:relative; height:280px; display:flex; align-items:center; justify-content:center; text-align:center; color:#fff; overflow:hidden; }
    .bq-banner img, .bq-banner .site-hero-slideshow { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(.55); }
    .bq-banner-noimg { background:linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary} 75%); }
    .bq-banner-inner { position:relative; z-index:1; }
    .bq-banner .eyebrow { background:rgba(255,255,255,.18); color:#fff; margin-bottom:14px; }
    .bq-banner h1 { font-family:'Frank Ruhl Libre',serif; font-size:36px; margin:0 0 8px; }
    .bq-banner p { font-size:15px; opacity:.92; }

    .bq-featured { padding:56px 0 10px; }
    .bq-featured-card { border:1px solid #EEE; border-radius:16px; padding:34px; display:grid; grid-template-columns:auto 1fr; align-items:center; gap:26px; box-shadow:0 16px 34px rgba(0,0,0,.06); }
    .bq-featured-tag { background:#${pal.ice}; color:#${pal.primaryDark}; font-size:11.5px; font-weight:800; letter-spacing:.05em; padding:5px 12px; border-radius:20px; display:inline-block; margin-bottom:10px; }
    .bq-featured-card h3 { margin:0 0 8px; font-size:22px; font-family:'Frank Ruhl Libre',serif; }
    .bq-featured-card p { margin:0 0 14px; color:#666; font-size:14px; max-width:420px; }
    .bq-featured-price { font-size:26px; font-weight:800; color:#${pal.primary}; }
    @media (max-width:640px) { .bq-featured-card { grid-template-columns:1fr; text-align:center; } .bq-featured-card p { margin-inline:auto; } }

    .bq-grid { padding:40px 0 20px; display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:20px; }
    .bq-card { border:1px solid #EEE; border-radius:12px; padding:20px; position:relative; }
    .bq-card .num { position:absolute; top:14px; left:16px; font-size:11px; font-weight:800; color:#CCC; }
    .bq-card h3 { margin:0 0 6px; font-size:15.5px; font-weight:700; }
    .bq-card p { margin:0 0 12px; font-size:13px; color:#666; }
    .bq-card .price { display:inline-block; background:#${pal.ice}; color:#${pal.primaryDark}; font-weight:800; padding:4px 12px; border-radius:20px; font-size:13px; }

    .bq-about { padding:20px 0 60px; text-align:center; max-width:640px; margin:0 auto; color:#3a3a3a; font-size:15px; }
    .bq-info { background:#${pal.ice}; padding:56px 0; text-align:center; }
    .bq-info .line { font-size:15.5px; color:#333; margin-bottom:8px; }
    .bq-footer { background:#${pal.primaryDark}; color:#fff; padding:26px 0; text-align:center; font-size:12.5px; }
  `;
  const nav = `
    <nav class="bq-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<div class="bq-pagenav">${navLinksHtml}</div>` : ""}
      ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
    </div></nav>`;
  const footer = `<footer class="bq-footer">
      ${d.phone ? `${escapeHtmlS(d.phone)} · ` : ""}${d.email ? `${escapeHtmlS(d.email)} · ` : ""}${d.address ? escapeHtmlS(d.address) : ""}
    </footer>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="bq-banner bq-banner-noimg"><div class="bq-banner-inner"><span class="eyebrow">מי אנחנו</span><h1>${heading(d, "about", dd.businessName)}</h1></div></section>
      <div class="container"><div class="bq-about" style="padding-top:48px;">${aboutText(d, dd)}</div></div>`;
  } else if (page === "contact") {
    main = `
      <section class="bq-banner bq-banner-noimg"><div class="bq-banner-inner"><span class="eyebrow">נשמח לשמוע מכם</span><h1>${heading(d, "contact", "יצירת קשר")}</h1></div></section>
      <section class="bq-info site-reveal"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="wa-link" style="display:inline-block; margin-top:10px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const services = dd._services;
    const featured = services[0];
    const rest = services.slice(1);
    const showSearch = rest.length >= 3;
    main = `
      <section class="bq-banner ${heroHasImage(d) ? "" : "bq-banner-noimg"}">
        ${heroMediaHtml(d, "")}
        <div class="bq-banner-inner">
          <span class="eyebrow">חנות בוטיק</span>
          <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
          <p>${taglineText(d, dd)}</p>
        </div>
      </section>
      <div class="container">
        <section class="bq-featured site-reveal"><div class="bq-featured-card">
          <div class="bq-featured-price">${featured.price ? escapeHtmlS(featured.price) : ""}</div>
          <div>
            <span class="bq-featured-tag">המומלץ שלנו</span>
            <h3>${escapeHtmlS(featured.name)}</h3>
            ${featured.desc ? `<p>${escapeHtmlS(featured.desc)}</p>` : ""}
          </div>
        </div></section>
        ${rest.length ? `
          ${showSearch ? searchBoxHtml("#bq-grid", "חיפוש מוצר או שירות...") : ""}
          <div class="bq-grid" id="bq-grid">${rest.map((s, i) => `
            <div class="bq-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}">
              <div class="num">${String(i + 2).padStart(2, "0")}</div>
              <h3>${escapeHtmlS(s.name)}</h3>
              ${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}
              ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
            </div>`).join("")}</div>
          ${showSearch ? searchScriptHtml() : ""}
        ` : ""}
      </div>
      ${embedSrc ? `<div class="container"><div style="padding:36px 0;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<div class="bq-about">${aboutText(d, dd)}</div>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${nav}${main}${footer}`);
}

/* ---------- Template 10: dark luxury (events / boutique) ---------- */
function renderNoirSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#B8860B");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    body.nr-body { background:#0E0E0E; color:#EDEAE3; }
    .nr-nav { padding:26px 0; }
    .nr-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .nr-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:18px; letter-spacing:.03em; color:#${pal.ice}; }
    .nr-nav nav { display:flex; gap:22px; } .nr-nav nav a { font-size:12px; letter-spacing:.05em; color:#999; } .nr-nav nav a.active { color:#${pal.ice}; }

    .nr-hero { position:relative; text-align:center; padding:110px 24px 100px; overflow:hidden; }
    .nr-hero img, .nr-hero .site-hero-slideshow { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(.38); z-index:0; }
    .nr-hero::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 20%, rgba(255,255,255,.06), transparent 60%); z-index:0; }
    .nr-hero-inner { position:relative; z-index:1; }
    .nr-hero .eyebrow { background:none; border:1px solid #${pal.ice}; color:#${pal.ice}; }
    .nr-hero h1 { font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:48px; margin:20px 0 12px; color:#fff; }
    .nr-hero p { font-size:15.5px; color:#C9C4B8; max-width:460px; margin:0 auto 30px; }
    .nr-cta { display:inline-block; background:#${pal.primary}; border:1px solid #${pal.primary}; color:#0E0E0E; font-weight:700; font-size:13px; letter-spacing:.05em; padding:14px 32px; }

    .nr-menu { padding:74px 0; }
    .nr-menu-head { text-align:center; margin-bottom:44px; }
    .nr-kicker { font-size:11.5px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#${pal.ice}; }
    .nr-menu-head h2 { font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:29px; margin:12px 0 0; color:#fff; }
    .nr-menu-list { max-width:640px; margin:0 auto; }
    .nr-menu-row { display:flex; align-items:baseline; gap:10px; padding:18px 0; border-bottom:1px solid #2A2A28; }
    .nr-menu-row .name { font-size:16.5px; font-weight:700; color:#EDEAE3; white-space:nowrap; }
    .nr-menu-row .leader { flex:1; border-bottom:1px dotted #3A3A38; height:0; margin-bottom:6px; }
    .nr-menu-row .price { font-size:14.5px; color:#${pal.ice}; white-space:nowrap; }
    .nr-menu-desc { font-size:12.5px; color:#8C887E; margin:-14px 0 18px; max-width:520px; }

    .nr-about { background:#151513; padding:76px 0; text-align:center; }
    .nr-about blockquote { font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:22px; line-height:1.75; max-width:660px; margin:0 auto; color:#EDEAE3; }

    .nr-contact { padding:74px 0; text-align:center; }
    .nr-contact .line { font-size:14.5px; color:#C9C4B8; margin-bottom:8px; }
    .nr-footer { border-top:1px solid #2A2A28; padding:26px 0; text-align:center; font-size:11px; letter-spacing:.04em; color:#777; }
  `;
  const header = `
    <header class="nr-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="nr-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `<section class="nr-about site-reveal"><div class="container"><span class="nr-kicker">מי אנחנו</span><blockquote style="margin-top:16px;">${aboutText(d, dd)}</blockquote></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="nr-contact site-reveal"><div class="container">
        <span class="nr-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:28px; margin:12px 0 26px; color:#fff;">${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="nr-cta" style="margin-top:16px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    main = `
      <section class="nr-hero">
        ${d.heroVideoBg && videoBgEmbedSrc(d.videoUrl) ? heroVideoBgHtml(d) : heroMediaHtml(d, "")}
        <div class="nr-hero-inner">
          <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "אירוע ובוטיק"}</span>
          <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
          <p>${taglineText(d, dd)}</p>
          ${ctaHtml(cta, "nr-cta")}
        </div>
      </section>
      <section class="nr-menu site-reveal"><div class="container">
        <div class="nr-menu-head"><span class="nr-kicker">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2></div>
        <div class="nr-menu-list">${dd._services.map((s) => `
          <div class="nr-menu-row"><span class="name">${escapeHtmlS(s.name)}</span><span class="leader"></span>${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}</div>
          ${s.desc ? `<div class="nr-menu-desc">${escapeHtmlS(s.desc)}</div>` : ""}`).join("")}</div>
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="nr-about site-reveal"><div class="container"><span class="nr-kicker">מי אנחנו</span><blockquote style="margin-top:16px;">${aboutText(d, dd)}</blockquote></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="nr-contact site-reveal"><div class="container">
        <span class="nr-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:28px; margin:12px 0 26px; color:#fff;">${heading(d, "contact", "יצירת קשר")}</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`).replace("<body>", '<body class="nr-body">');
}

/* Reveal-on-scroll — originally built for the studio template only
   (.ag-reveal/.ag-in), now shared by every template via .site-reveal:
   content sections start faded + shifted down and settle into place the
   first time they cross into view. Injected once in siteDoc(), so no
   per-template footer wiring needed. Respects prefers-reduced-motion by
   simply never hiding anything in the first place, rather than hiding
   then trying to detect the media query in JS. Hero sections are
   deliberately left out (see each template's render function) — nothing
   above the fold should start invisible on a slow connection. */
function scrollRevealScript() {
  return `<script>
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("site-in"); io.unobserve(entry.target); }
        });
      }, { threshold: 0.2 });
      document.querySelectorAll(".site-reveal").forEach(function (el) { io.observe(el); });
    }
  </script>`;
}

/* ---------- Template 11: creative studio (asymmetric split hero, dark) ---------- */
function renderStudioSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#BE185D");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const inPageRail = !navLinksHtml && page === "index";
  // This template builds its own hero CTA below instead of going through
  // ctaHtml() (it always shows the same "רוצה להכיר יותר?" label no matter
  // where it points) — primaryCtaHref() is only reused here for the actual
  // href/marker logic, so it doesn't repeat the same relative-link-in-an-
  // iframe bug ctaHtml() was just fixed for.
  const heroCta = primaryCtaHref(d, page);
  const railLinks = navLinksHtml
    ? navLinksHtml
    : inPageRail
      ? `<a href="#ag-services">שירותים</a><a href="#ag-about">אודות</a>${dd._hasContact || wa ? `<a href="#ag-contact">יצירת קשר</a>` : ""}`
      : "";
  const css = `
    body.ag-body { background:#0C0C0E; color:#F1F0EC; scroll-behavior:smooth; }
    .ag-rail { position:fixed; top:0; bottom:0; inset-inline-start:0; width:52px; z-index:40; display:flex; align-items:center; justify-content:center; }
    .ag-rail-inner { display:flex; flex-direction:column; gap:26px; }
    .ag-rail a { writing-mode:vertical-rl; text-orientation:mixed; font-size:11.5px; font-weight:700; letter-spacing:.08em; color:#8C8C88; }
    .ag-rail a.active, .ag-rail a:hover { color:#${pal.ice}; }
    @media (max-width:760px) { .ag-rail { display:none; } }

    .ag-hero { min-height:88vh; display:grid; grid-template-columns:1fr 1fr; align-items:stretch; }
    .ag-hero-art { position:relative; overflow:hidden; background:#111; min-height:340px; }
    .ag-hero-art .ag-hero-media { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .ag-hero-art .ag-blob {
      position:absolute; inset:-20%; opacity:.9;
      background: radial-gradient(circle at 30% 30%, #${pal.primary}, transparent 55%),
                  radial-gradient(circle at 70% 70%, #${pal.primaryDark}, transparent 60%),
                  radial-gradient(circle at 60% 20%, #${pal.ice}55, transparent 50%);
      filter: blur(40px); animation: ag-spin 22s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) { .ag-hero-art .ag-blob { animation:none; } }
    @keyframes ag-spin { from { transform:rotate(0deg) scale(1.15); } to { transform:rotate(360deg) scale(1.15); } }
    .ag-hero-text { display:flex; flex-direction:column; justify-content:center; padding:60px 56px 60px 24px; }
    .ag-avatar { width:52px; height:52px; border-radius:50%; overflow:hidden; border:2px solid #${pal.primary}; margin-bottom:26px; }
    .ag-avatar img, .ag-avatar .site-hero-slideshow { width:100%; height:100%; object-fit:cover; }
    .ag-hero-text .kicker { font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#${pal.ice}; margin-bottom:14px; }
    .ag-hero-text h1 { font-size:58px; font-weight:800; letter-spacing:-.02em; line-height:1.02; margin:0 0 14px; }
    .ag-hero-text p { font-size:15.5px; color:#B7B6B0; max-width:380px; margin:0 0 30px; }
    .ag-cta { display:inline-flex; align-items:center; gap:8px; background:#${pal.primary}; color:#0C0C0E; font-weight:800; padding:13px 26px; border-radius:30px; font-size:14px; width:fit-content; }
    @media (max-width:760px) { .ag-hero { grid-template-columns:1fr; } .ag-hero-text { padding:48px 24px; } .ag-hero-text h1 { font-size:38px; } .ag-hero-art { min-height:260px; } }


    .ag-section { padding:80px 0; border-top:1px solid #232321; }
    .ag-kicker { font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#${pal.ice}; }
    .ag-section h2 { font-size:32px; font-weight:800; letter-spacing:-.01em; margin:12px 0 0; max-width:640px; }
    .ag-about-body { font-size:16.5px; color:#C8C7C1; line-height:1.85; max-width:640px; margin-top:22px; }

    .ag-grid { margin-top:40px; display:grid; grid-template-columns:repeat(2,1fr); border-top:1px solid #232321; border-inline-start:1px solid #232321; }
    .ag-cell { border-bottom:1px solid #232321; border-inline-end:1px solid #232321; padding:30px 28px; }
    .ag-cell h3 { margin:0 0 8px; font-size:17px; font-weight:700; }
    .ag-cell p { margin:0; font-size:13.5px; color:#9C9B96; line-height:1.6; }
    .ag-cell .price { display:block; margin-top:10px; font-size:12.5px; font-weight:700; color:#${pal.ice}; }
    @media (max-width:600px) { .ag-grid { grid-template-columns:1fr; } }

    .ag-contact-lines { margin-top:22px; }
    .ag-contact-lines .line { font-size:14.5px; color:#C8C7C1; margin-bottom:8px; }
    .ag-footer { border-top:1px solid #232321; padding:26px 0; text-align:center; font-size:11.5px; letter-spacing:.03em; color:#7A7975; }
  `;
  const rail = railLinks ? `<div class="ag-rail"><div class="ag-rail-inner">${railLinks}</div></div>` : "";
  // previewNavScript() is also what makes this template's own in-page
  // rail links (#ag-services / #ag-about / #ag-contact) safe inside the
  // preview iframe — needed here even with no navLinksHtml (single-page
  // mode is exactly when those in-page anchors exist).
  const footer = `<div class="ag-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${(navLinksHtml || inPageRail) ? previewNavScript() : ""}`;

  function contactBlock(heading) {
    return `
      <section class="ag-section" id="ag-contact"><div class="container site-reveal">
        <span class="ag-kicker">נשמח לשמוע מכם</span>
        <h2>${heading}</h2>
        <div class="ag-contact-lines">
          ${dd._hasContact ? `
            ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
            ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
            ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
          ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        </div>
        ${wa ? `<a class="ag-cta" style="margin-top:20px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  }

  let main;
  if (page === "about") {
    main = `
      <section class="ag-section" style="border-top:none; padding-top:64px;"><div class="container site-reveal">
        <span class="ag-kicker">נעים להכיר</span>
        <h2>${heading(d, "about", dd.businessName)}</h2>
        <p class="ag-about-body">${aboutText(d, dd)}</p>
      </div></section>`;
  } else if (page === "contact") {
    main = contactBlock(heading(d, "contact", "יצירת קשר")).replace('style="border-top:none;', 'style="border-top:none; padding-top:64px;');
  } else {
    const services = dd._services;
    main = `
      <section class="ag-hero">
        <div class="ag-hero-art">
          ${heroHasImage(d) ? heroMediaHtml(d, "ag-hero-media") : `<div class="ag-blob"></div>`}
        </div>
        <div class="ag-hero-text">
          ${heroHasImage(d) ? `<div class="ag-avatar">${heroMediaHtml(d, "")}</div>` : ""}
          <span class="kicker">${dd.tagline ? "ברוכים הבאים" : "סטודיו יצירתי"}</span>
          <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
          <p>${taglineText(d, dd)}</p>
          <a class="ag-cta" href="${escapeHtmlS(heroCta ? heroCta.href : (inPageRail ? "#ag-contact" : "#"))}"${heroCta && heroCta.external ? ' target="_blank" rel="noopener"' : ""}${heroCta && heroCta.page ? ' data-site-nav data-page="contact"' : ""}>רוצה להכיר יותר? ‹</a>
        </div>
      </section>
      <section class="ag-section" id="ag-services" style="border-top:none;"><div class="container site-reveal">
        <span class="ag-kicker">זה מה שהעסק שלך מקבל</span>
        <h2>${heading(d, "services", "השירותים שלנו")}</h2>
        <div class="ag-grid">${services.map((s) => `
          <div class="ag-cell"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}</div>`).join("")}</div>
      </div></section>
      ${embedSrc ? `<section class="ag-section"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `
      <section class="ag-section" id="ag-about"><div class="container site-reveal">
        <span class="ag-kicker">נעים להכיר</span>
        <h2>${heading(d, "about", dd.businessName)}</h2>
        <p class="ag-about-body">${aboutText(d, dd)}</p>
      </div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? contactBlock(heading(d, "contact", "יצירת קשר")) : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${rail}${main}${footer}`).replace("<body>", '<body class="ag-body">');
}

/* ---------- Template 12: bento grid (modular, apple-widget style) ---------- */
function renderBentoSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#0E8C8C");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = heroHasImage(d);
  const css = `
    .bt-nav { background:#fff; border-bottom:1px solid #ECECEC; padding:18px 0; }
    .bt-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .bt-nav .biz { font-weight:800; font-size:19px; letter-spacing:-.01em; color:#111; }
    .bt-nav nav { display:flex; gap:18px; }
    .bt-nav nav a { font-size:13.5px; font-weight:600; color:#666; }
    .bt-nav nav a.active { color:#${pal.primaryDark}; }

    .bt-hero { padding:64px 0 48px; text-align:center; }
    .bt-hero .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:18px; }
    .bt-hero h1 { font-size:42px; font-weight:800; letter-spacing:-.02em; margin:0 0 14px; color:#111; }
    .bt-cta { display:inline-block; background:#${pal.primary}; color:#fff; font-weight:800; padding:15px 34px; border-radius:16px; font-size:15px; box-shadow:0 14px 30px rgba(0,0,0,.14); transition:transform .2s ease, box-shadow .2s ease; }
    .bt-cta:hover { transform:translateY(-3px); box-shadow:0 18px 36px rgba(0,0,0,.2); }

    .bt-section { padding:16px 0 80px; }
    .bt-grid { display:grid; grid-template-columns:repeat(4, 1fr); grid-auto-rows:172px; gap:18px; }
    .bt-cell {
      position:relative; overflow:hidden; border-radius:24px; background:#fff;
      border:1px solid #EFEFEF; box-shadow:0 4px 18px rgba(0,0,0,.05);
      padding:24px; display:flex; flex-direction:column; justify-content:flex-start;
      transition:transform .3s ease, background .3s ease, box-shadow .3s ease;
    }
    .bt-cell:hover { transform:translateY(-6px); box-shadow:0 20px 40px rgba(0,0,0,.14); }
    .bt-cell-accent, .bt-cell-photo { justify-content:flex-end; }
    .bt-cell-label { font-size:11.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:#${pal.primary}; margin-bottom:6px; }
    .bt-cell h3 { margin:0 0 6px; font-size:17px; font-weight:800; color:#111; }
    .bt-cell p { margin:0; font-size:13px; color:#666; line-height:1.55; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .bt-cell .price { margin-top:10px; font-weight:800; color:#${pal.primaryDark}; font-size:14px; }
    .bt-cell-dark { background:#111; border-color:#111; justify-content:center; }
    .bt-cell-dark .bt-cell-label { color:#${pal.ice}; }
    .bt-cell-dark h3, .bt-cell-dark p, .bt-cell-dark .line { color:#fff; }
    .bt-cell-accent { background:linear-gradient(150deg, #${pal.primary}, #${pal.primaryDark}); border-color:transparent; }
    .bt-cell-accent .bt-cell-label, .bt-cell-accent h3 { color:#fff; }

    .bt-span-2x1 { grid-column:span 2; }
    .bt-span-1x2 { grid-row:span 2; }
    .bt-span-2x2 { grid-column:span 2; grid-row:span 2; }

    .bt-clock { font-size:34px; font-weight:800; color:#111; letter-spacing:-.02em; }
    .bt-clock-date { font-size:12px; color:#888; margin-top:4px; }
    .bt-cell-photo { padding:0; }
    .bt-cell-photo img, .bt-cell-photo .site-hero-slideshow { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .bt-cell-video { padding:0; }
    .bt-cell-video iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
    .bt-cell .line { font-size:13px; margin-bottom:4px; display:block; -webkit-line-clamp:unset; }
    .bt-cta-mini { display:inline-block; align-self:flex-start; margin-top:10px; background:#fff; color:#111; font-weight:800; font-size:12.5px; padding:8px 16px; border-radius:10px; }

    .bt-footer { border-top:1px solid #ECECEC; padding:24px 0; text-align:center; font-size:12px; color:#999; }

    @media (max-width:820px) { .bt-grid { grid-template-columns:repeat(2, 1fr); grid-auto-rows:150px; } .bt-span-2x2 { grid-column:span 2; } }
    @media (max-width:520px) {
      .bt-grid { grid-template-columns:1fr; grid-auto-rows:auto; }
      .bt-span-2x1, .bt-span-2x2 { grid-column:span 1; }
      .bt-span-1x2, .bt-span-2x2 { grid-row:auto; }
      .bt-cell { min-height:160px; }
      .bt-hero h1 { font-size:32px; }
    }
  `;
  const header = `
    <header class="bt-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="bt-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;
  const clockScript = `<script>
    (function () {
      var clockEl = document.getElementById("bt-clock");
      var dateEl = document.getElementById("bt-date");
      if (!clockEl) return;
      function pad(n) { return String(n).padStart(2, "0"); }
      function tick() {
        var now = new Date();
        clockEl.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
        if (dateEl) dateEl.textContent = now.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
      }
      tick();
      setInterval(tick, 15000);
    })();
  </script>`;

  let main;
  if (page === "about") {
    main = `
      <section class="bt-hero" style="padding:56px 0 20px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1 style="font-size:34px;">${heading(d, "about", dd.businessName)}</h1>
      </div></section>
      <section class="bt-section site-reveal"><div class="container">
        <div class="bt-cell" style="max-width:640px; margin:0 auto; min-height:0;">
          <div class="bt-cell-label">הסיפור שלנו</div>
          <p style="-webkit-line-clamp:unset;">${aboutText(d, dd)}</p>
        </div>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="bt-hero" style="padding:56px 0 20px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1 style="font-size:34px;">${heading(d, "contact", "יצירת קשר")}</h1>
      </div></section>
      <section class="bt-section site-reveal"><div class="container">
        <div class="bt-cell bt-cell-dark" style="max-width:640px; margin:0 auto; min-height:0;">
          <div class="bt-cell-label">פרטי קשר</div>
          ${dd._hasContact ? `
            ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
            ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
            ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
          ` : `<span class="line">פרטו כאן טלפון, מייל וכתובת.</span>`}
          ${wa ? `<a class="bt-cta-mini" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
        </div>
      </div></section>`;
  } else {
    const cellsList = [];
    cellsList.push(`<div class="bt-cell bt-span-2x1 bt-cell-accent"><div class="bt-cell-label">ברוכים הבאים</div><h3 style="font-size:20px;">${taglineText(d, dd)}</h3></div>`);
    cellsList.push(`<div class="bt-cell"><div class="bt-cell-label">השעה עכשיו</div><div class="bt-clock" id="bt-clock">--:--</div><div class="bt-clock-date" id="bt-date"></div></div>`);
    if (hasPhoto) cellsList.push(`<div class="bt-cell bt-cell-photo bt-span-1x2">${heroMediaHtml(d, "")}</div>`);
    if (!d.pages || !d.pages.about) {
      cellsList.push(`<div class="bt-cell bt-span-2x1"><div class="bt-cell-label">מי אנחנו</div><p>${aboutText(d, dd)}</p></div>`);
    }
    if (embedSrc) {
      cellsList.push(`<div class="bt-cell bt-cell-video bt-span-2x1"><iframe src="${embedSrc}" title="סרטון" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`);
    }
    dd._services.forEach((s) => {
      cellsList.push(`<div class="bt-cell"><div class="bt-cell-label">שירות</div><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`);
    });
    if (!d.pages || !d.pages.contact) {
      cellsList.push(`<div class="bt-cell bt-span-2x2 bt-cell-dark"><div class="bt-cell-label">יצירת קשר</div>${dd._hasContact ? `${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}` : `<span class="line">פרטו כאן טלפון, מייל וכתובת.</span>`}${wa ? `<a class="bt-cta-mini" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}</div>`);
    }
    main = `
      <section class="bt-hero"><div class="container">
        <span class="eyebrow">עסק מודולרי, מותאם אישית</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        ${ctaHtml(cta, "bt-cta")}
      </div></section>
      <section class="bt-section site-reveal"><div class="container">
        <div class="bt-grid">${cellsList.join("")}</div>
      </div></section>
      ${clockScript}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`);
}

/* ---------- Template 13: cinematic dark (glassmorphism, mouse-glow) ---------- */
function renderCinematicSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#4338CA");
  const rgb = hexToRgb(pal.primary);
  const glowRgba = `${rgb.r},${rgb.g},${rgb.b}`;
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    body.cd-body { background:#050505; color:#EDEDED; }
    .cd-glow { position:fixed; inset:0; z-index:0; pointer-events:none; transition:background .25s ease;
      background: radial-gradient(650px circle at 50% 20%, rgba(${glowRgba},.16), transparent 45%); }
    .cd-nav, .cd-hero, .cd-section, .cd-footer { position:relative; z-index:1; }
    .cd-nav { padding:26px 0; }
    .cd-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .cd-nav .biz { font-weight:800; font-size:18px; letter-spacing:-.01em; color:#fff; }
    .cd-nav nav { display:flex; gap:20px; }
    .cd-nav nav a { font-size:13px; font-weight:600; color:#9A9A9A; }
    .cd-nav nav a.active, .cd-nav nav a:hover { color:#fff; }

    .cd-hero { text-align:center; padding:90px 24px 70px; }
    .cd-kicker { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#${pal.ice}; margin-bottom:20px; }
    .cd-hero h1 { font-size:60px; font-weight:800; letter-spacing:-.03em; line-height:1.05; margin:0 0 18px; color:#fff; }
    .cd-hero p { font-size:16.5px; color:#B4B4B4; max-width:520px; margin:0 auto 34px; }
    .cd-cta { display:inline-flex; align-items:center; gap:8px; padding:15px 34px; border-radius:40px;
      background:rgba(255,255,255,.07); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
      border:1px solid rgba(255,255,255,.22); color:#fff; font-weight:700; font-size:14.5px; transition:background .2s ease, border-color .2s ease, transform .2s ease; }
    .cd-cta:hover { background:#${pal.primary}; border-color:#${pal.primary}; transform:translateY(-2px); }
    @media (max-width:640px) { .cd-hero h1 { font-size:38px; } }

    .cd-section { padding:70px 0; }
    .cd-section-head { text-align:center; margin-bottom:36px; }
    .cd-section-head h2 { font-size:30px; font-weight:800; color:#fff; margin:10px 0 0; letter-spacing:-.01em; }
    .cd-section .site-search-input { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.18); color:#fff; }

    .cd-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:22px; }
    .cd-card { background:rgba(255,255,255,.045); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:28px; transition:transform .25s ease, border-color .25s ease, background .25s ease; }
    .cd-card:hover { transform:translateY(-5px); border-color:rgba(255,255,255,.25); background:rgba(255,255,255,.07); }
    .cd-card h3 { margin:0 0 8px; font-size:17px; font-weight:700; color:#fff; }
    .cd-card p { margin:0 0 10px; font-size:13.5px; color:#AFAFAF; line-height:1.6; }
    .cd-card .price { font-weight:700; color:#${pal.ice}; font-size:14px; }

    .cd-photo { border-radius:24px; overflow:hidden; margin:44px auto 0; max-width:640px; border:1px solid rgba(255,255,255,.1); }
    .cd-photo img, .cd-photo .site-hero-slideshow { display:block; width:100%; }

    .cd-panel { max-width:640px; margin:0 auto; background:rgba(255,255,255,.045); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      border:1px solid rgba(255,255,255,.1); border-radius:24px; padding:44px 36px; text-align:center; }
    .cd-panel p { font-size:16px; color:#C6C6C6; line-height:1.8; margin:0; }
    .cd-panel .line { font-size:14.5px; color:#C6C6C6; margin-bottom:8px; }

    .cd-footer { border-top:1px solid rgba(255,255,255,.08); padding:26px 0; text-align:center; font-size:12px; color:#777; }
  `;
  const header = `
    <header class="cd-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="cd-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;
  const glowScript = `<script>
    (function () {
      var glow = document.getElementById("cd-glow");
      if (!glow || !window.matchMedia || window.matchMedia("(pointer: coarse)").matches) return;
      document.addEventListener("mousemove", function (e) {
        var x = (e.clientX / window.innerWidth * 100).toFixed(1);
        var y = (e.clientY / window.innerHeight * 100).toFixed(1);
        glow.style.background = "radial-gradient(650px circle at " + x + "% " + y + "%, rgba(${glowRgba},.16), transparent 45%)";
      });
    })();
  </script>`;

  let main;
  if (page === "about") {
    main = `
      <section class="cd-section site-reveal" style="padding-top:56px;"><div class="container" style="text-align:center;">
        <span class="cd-kicker">מי אנחנו</span><h2 style="font-size:32px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "about", dd.businessName)}</h2>
        <div class="cd-panel"><p>${aboutText(d, dd)}</p></div>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="cd-section site-reveal" style="padding-top:56px;"><div class="container" style="text-align:center;">
        <span class="cd-kicker">נשמח לשמוע מכם</span><h2 style="font-size:32px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2>
        <div class="cd-panel">
          ${dd._hasContact ? `
            ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
            ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
            ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
          ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
          ${wa ? `<a class="cd-cta" style="margin-top:18px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
        </div>
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="cd-hero"><div class="container">
        <span class="cd-kicker">${dd.tagline ? "ברוכים הבאים" : "חוויה פרימיום"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "cd-cta")}
        ${heroHasImage(d) ? `<div class="cd-photo">${heroMediaHtml(d, "")}</div>` : ""}
      </div></section>
      <section class="cd-section site-reveal"><div class="container">
        <div class="cd-section-head"><span class="cd-kicker">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#cd-grid", "חיפוש שירות...") : ""}</div>
        <div class="cd-grid" id="cd-grid">${dd._services.map((s) => `
          <div class="cd-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="cd-section site-reveal" style="padding-top:0;"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="cd-section site-reveal" style="text-align:center;"><div class="container"><span class="cd-kicker">מי אנחנו</span><h2 style="font-size:28px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "about", "קצת עלינו")}</h2><div class="cd-panel"><p>${aboutText(d, dd)}</p></div></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="cd-section site-reveal" style="text-align:center;"><div class="container"><span class="cd-kicker">נשמח לשמוע מכם</span><h2 style="font-size:28px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2><div class="cd-panel">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  const glowDiv = `<div class="cd-glow" id="cd-glow"></div>`;
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${glowDiv}${header}${main}${footer}${glowScript}`).replace("<body>", '<body class="cd-body">');
}

/* ---------- Template 14: neo-brutalism (bold color blocks, arcade press) ---------- */
function renderBrutalSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#FFC800");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const tickerText = [dd.businessName, dd.tagline].filter(Boolean).join(" ★ ") || dd.businessName;
  const css = `
    body.br-body { background:#${pal.ice}; }
    .br-nav { background:#fff; border-bottom:4px solid #000; padding:16px 0; }
    .br-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .br-nav .biz { font-weight:900; font-size:20px; letter-spacing:-.01em; color:#000; }
    .br-nav nav { display:flex; gap:14px; flex-wrap:wrap; }
    .br-nav nav a { font-size:13px; font-weight:800; color:#000; padding:5px 4px; }
    .br-nav nav a.active { background:#000; color:#${pal.ice}; padding:5px 10px; }

    .br-ticker { background:#000; color:#${pal.ice}; overflow:hidden; padding:12px 0; border-bottom:4px solid #000; direction:ltr; }
    .br-ticker-track { display:flex; width:max-content; animation:br-marquee 18s linear infinite; }
    .br-ticker-item { font-size:15px; font-weight:900; letter-spacing:.02em; white-space:nowrap; padding:0 22px; direction:rtl; }
    @keyframes br-marquee { from { transform:translateX(0); } to { transform:translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .br-ticker-track { animation:none; } }

    .br-hero { padding:76px 0; text-align:center; border-bottom:4px solid #000; }
    .br-hero .eyebrow { background:#000; color:#${pal.ice}; font-weight:900; border-radius:0; }
    .br-hero h1 { font-weight:900; font-size:50px; letter-spacing:-.02em; margin:18px 0 16px; line-height:1.08; color:#000; }
    .br-hero p { font-size:17px; font-weight:700; max-width:480px; margin:0 auto 30px; color:#000; }
    .br-btn { display:inline-block; background:#${pal.primary}; color:#000; font-weight:900; padding:16px 36px; border:4px solid #000; box-shadow:6px 6px 0 #000; font-size:15.5px; transition:transform .08s ease, box-shadow .08s ease; }
    .br-btn:active { box-shadow:0 0 0 #000; transform:translate(6px,6px); }
    .br-hero-photo { border:4px solid #000; box-shadow:8px 8px 0 #000; max-width:320px; width:100%; margin:32px auto 0; }

    .br-section { padding:70px 0; border-bottom:4px solid #000; }
    .br-section.last { border-bottom:none; }
    .br-section-head { text-align:center; margin-bottom:36px; }
    .br-section-head h2 { font-weight:900; font-size:32px; margin:10px 0 0; color:#000; }
    .br-tag { display:inline-block; background:#000; color:#${pal.ice}; font-size:11.5px; font-weight:900; letter-spacing:.05em; padding:6px 14px; }
    .br-section .site-search-input { border-radius:0; border:3px solid #000; font-weight:700; }

    .br-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:26px; }
    .br-card { background:#fff; border:4px solid #000; box-shadow:7px 7px 0 #000; padding:26px; transition:transform .15s ease, box-shadow .15s ease; }
    .br-card:hover { transform:translate(-3px,-3px); box-shadow:10px 10px 0 #000; }
    .br-card h3 { font-size:18px; font-weight:900; margin:0 0 8px; color:#000; }
    .br-card p { font-size:13.5px; color:#333; margin:0 0 10px; font-weight:600; }
    .br-card .price { display:inline-block; background:#${pal.ice}; border:3px solid #000; font-weight:900; padding:5px 12px; font-size:13.5px; }

    .br-about { background:#000; color:#${pal.ice}; text-align:center; }
    .br-about p { font-size:19px; font-weight:700; max-width:700px; margin:0 auto; line-height:1.6; }

    .br-contact { text-align:center; }
    .br-contact .line { display:inline-block; background:#fff; border:3px solid #000; padding:9px 18px; margin:5px; font-weight:800; font-size:13.5px; }

    .br-footer { border-top:4px solid #000; padding:24px 0; text-align:center; font-size:12.5px; font-weight:800; color:#000; }
  `;
  const header = `
    <header class="br-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>
    <div class="br-ticker"><div class="br-ticker-track">${Array(6).fill(`<span class="br-ticker-item">${escapeHtmlS(tickerText)}</span>`).join("")}</div></div>`;
  const footer = `<div class="br-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `<section class="br-section br-about site-reveal last"><div class="container"><p>${aboutText(d, dd)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="br-section br-contact site-reveal last"><div class="container">
        <div class="br-section-head"><span class="br-tag">נשמח לשמוע מכם</span><h2>${heading(d, "contact", "יצירת קשר")}</h2></div>
        ${dd._hasContact ? `
          ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
          ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
          ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
        ` : `<p style="font-weight:700;">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</p>`}
        <div style="margin-top:22px;">${wa ? `<a class="br-btn" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}</div>
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="br-hero"><div class="container">
        <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק שמעז לבלוט"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "br-btn")}
        ${heroMediaHtml(d, "br-hero-photo")}
      </div></section>
      <section class="br-section site-reveal"><div class="container">
        <div class="br-section-head"><span class="br-tag">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#br-grid", "חיפוש שירות...") : ""}</div>
        <div class="br-grid" id="br-grid">${dd._services.map((s) => `
          <div class="br-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="br-section site-reveal"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="br-section br-about site-reveal"><div class="container"><p>${aboutText(d, dd)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="br-section br-contact site-reveal last"><div class="container">
        <div class="br-section-head"><span class="br-tag">נשמח לשמוע מכם</span><h2>${heading(d, "contact", "יצירת קשר")}</h2></div>
        ${dd._hasContact ? `
          ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
          ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
          ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
        ` : `<p style="font-weight:700;">פרטו כאן טלפון, מייל וכתובת.</p>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`).replace("<body>", '<body class="br-body">');
}

/* ---------- Template 15: neon future (cyberpunk agency) ---------- */
function renderNeonSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#A855F7");
  const rgb = hexToRgb(pal.primary);
  const glowRgba = `${rgb.r},${rgb.g},${rgb.b}`;
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    body.nf-body { background:#0A0518; color:#F0EAFF; }
    .nf-mesh { position:fixed; inset:0; z-index:0; overflow:hidden; pointer-events:none; }
    .nf-blob { position:absolute; border-radius:50%; filter:blur(80px); opacity:.5; }
    .nf-blob-1 { width:520px; height:520px; background:#${pal.primary}; top:-12%; left:-10%; animation:nf-float1 22s ease-in-out infinite; }
    .nf-blob-2 { width:480px; height:480px; background:#EC4899; top:28%; right:-16%; animation:nf-float2 26s ease-in-out infinite; }
    .nf-blob-3 { width:420px; height:420px; background:#22D3EE; bottom:-18%; left:22%; animation:nf-float3 30s ease-in-out infinite; }
    @keyframes nf-float1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(60px,80px) scale(1.15);} }
    @keyframes nf-float2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-70px,50px) scale(.9);} }
    @keyframes nf-float3 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(40px,-60px) scale(1.1);} }
    @media (prefers-reduced-motion:reduce) { .nf-blob { animation:none; } }

    .nf-nav, .nf-hero, .nf-section, .nf-footer { position:relative; z-index:1; }
    .nf-nav { padding:24px 0; }
    .nf-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .nf-nav .biz { font-weight:800; font-size:18px; color:#fff; letter-spacing:-.01em; }
    .nf-nav nav { display:flex; gap:20px; }
    .nf-nav nav a { font-size:13px; font-weight:600; color:#C9BFEA; }
    .nf-nav nav a.active, .nf-nav nav a:hover { color:#fff; }

    .nf-hero { text-align:center; padding:100px 24px 80px; }
    .nf-kicker { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#${pal.ice}; margin-bottom:22px; }
    .nf-hero h1 { font-size:60px; font-weight:800; letter-spacing:-.02em; line-height:1.1; margin:0 0 20px; color:#fff; }
    .nf-word { display:inline-block; opacity:0; transform:translateY(40px); transition:opacity .7s cubic-bezier(.2,.8,.2,1), transform .7s cubic-bezier(.2,.8,.2,1); }
    .nf-split-in .nf-word { opacity:1; transform:translateY(0); }
    .nf-hero p { font-size:16px; color:#C9BFEA; max-width:520px; margin:0 auto 34px; }
    .nf-hero-photo { width:132px; height:132px; border-radius:50%; object-fit:cover; margin:0 auto 26px; border:2px solid rgba(${glowRgba},.6); box-shadow:0 0 40px rgba(${glowRgba},.4); }
    .nf-cta { display:inline-flex; align-items:center; gap:8px; padding:16px 36px; border-radius:40px;
      background:rgba(255,255,255,.08); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
      border:1px solid rgba(255,255,255,.25); color:#fff; font-weight:700; font-size:14.5px;
      transition:box-shadow .3s ease, background .3s ease, transform .2s ease; }
    .nf-cta:hover { background:#${pal.primary}; box-shadow:0 0 44px rgba(${glowRgba},.55); transform:translateY(-2px); }
    @media (max-width:640px) { .nf-hero h1 { font-size:36px; } }

    .nf-section { padding:80px 0; }
    .nf-section-head { text-align:center; margin-bottom:40px; }
    .nf-section-head h2 { font-size:32px; font-weight:800; color:#fff; margin:10px 0 0; }
    .nf-section .site-search-input { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.18); color:#fff; }
    .nf-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:22px; }
    .nf-card { background:rgba(255,255,255,.05); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      border:1px solid rgba(255,255,255,.12); border-radius:20px; padding:28px;
      transition:transform .3s ease, border-color .3s ease, box-shadow .3s ease; }
    .nf-card:hover { transform:translateY(-6px); border-color:rgba(${glowRgba},.55); box-shadow:0 20px 50px rgba(${glowRgba},.25); }
    .nf-card h3 { margin:0 0 8px; font-size:17px; font-weight:700; color:#fff; }
    .nf-card p { margin:0 0 10px; font-size:13.5px; color:#B9AFDB; line-height:1.6; }
    .nf-card .price { font-weight:700; color:#${pal.ice}; font-size:14px; }

    .nf-panel { max-width:640px; margin:0 auto; text-align:center; background:rgba(255,255,255,.05); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
      border:1px solid rgba(255,255,255,.12); border-radius:24px; padding:44px 36px; }
    .nf-panel p { font-size:16px; color:#C9BFEA; line-height:1.8; margin:0; }
    .nf-panel .line { font-size:14.5px; color:#C9BFEA; margin-bottom:8px; }

    .nf-footer { border-top:1px solid rgba(255,255,255,.1); padding:26px 0; text-align:center; font-size:12px; color:#8A80AD; }

    .nf-cursor-dot { position:fixed; top:0; left:0; width:10px; height:10px; border-radius:50%; background:#fff; pointer-events:none; z-index:9999; mix-blend-mode:difference; }
    .nf-cursor-ring { position:fixed; top:0; left:0; width:34px; height:34px; border-radius:50%; border:1.5px solid rgba(255,255,255,.55); pointer-events:none; z-index:9998; }
    body.nf-cursor-active, body.nf-cursor-active a, body.nf-cursor-active button { cursor:none; }
    .nf-particle { position:fixed; top:0; left:0; width:5px; height:5px; border-radius:50%; pointer-events:none; z-index:9997; }
  `;
  const header = `
    <header class="nf-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="nf-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;
  const meshDiv = `<div class="nf-mesh"><div class="nf-blob nf-blob-1"></div><div class="nf-blob nf-blob-2"></div><div class="nf-blob nf-blob-3"></div></div>`;
  const cursorScript = `<script>
    (function () {
      if (!window.matchMedia || window.matchMedia("(pointer: coarse)").matches) return;
      document.body.classList.add("nf-cursor-active");
      var dot = document.createElement("div"); dot.className = "nf-cursor-dot"; document.body.appendChild(dot);
      var ring = document.createElement("div"); ring.className = "nf-cursor-ring"; document.body.appendChild(ring);
      var mx = -50, my = -50, rx = -50, ry = -50;
      document.addEventListener("mousemove", function (e) {
        mx = e.clientX; my = e.clientY;
        dot.style.transform = "translate(" + (mx - 5) + "px," + (my - 5) + "px)";
      });
      function tick() {
        rx += (mx - rx) * .15; ry += (my - ry) * .15;
        ring.style.transform = "translate(" + (rx - 17) + "px," + (ry - 17) + "px)";
        requestAnimationFrame(tick);
      }
      tick();
      function burst(x, y) {
        var colors = ["#${pal.primary}", "#EC4899", "#22D3EE"];
        for (var i = 0; i < 10; i++) {
          var p = document.createElement("div");
          p.className = "nf-particle";
          p.style.background = colors[i % colors.length];
          p.style.left = x + "px"; p.style.top = y + "px";
          document.body.appendChild(p);
          var angle = Math.random() * Math.PI * 2;
          var dist = 40 + Math.random() * 50;
          var dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
          try {
            p.animate([
              { transform: "translate(0,0)", opacity: 1 },
              { transform: "translate(" + dx + "px," + dy + "px)", opacity: 0 }
            ], { duration: 600 + Math.random() * 300, easing: "cubic-bezier(.2,.8,.2,1)" });
          } catch (err) {}
          setTimeout((function (el) { return function () { el.remove(); }; })(p), 1000);
        }
      }
      document.addEventListener("click", function (e) { burst(e.clientX, e.clientY); });
    })();
  </script>`;
  const splitScript = `<script>
    (function () {
      function escWord(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
      var heads = document.querySelectorAll(".nf-split");
      if (!heads.length) return;
      heads.forEach(function (h) {
        // Split inside the data-textkey span (when there is one), not the
        // heading itself — confirmed live: replacing h.innerHTML wholesale
        // destroyed that span (and its data-textkey attribute) entirely,
        // permanently breaking both the hierarchy panel's scroll-to-section
        // and live style edits for every split heading in this template.
        var target = h.querySelector("[data-textkey]") || h;
        var words = target.textContent.split(" ");
        target.innerHTML = words.map(function (w, i) {
          return '<span class="nf-word" style="transition-delay:' + (i * .06) + 's">' + escWord(w) + '</span>';
        }).join(" ");
      });
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { entry.target.classList.add("nf-split-in"); io.unobserve(entry.target); }
          });
        }, { threshold: .4 });
        heads.forEach(function (h) { io.observe(h); });
      } else {
        heads.forEach(function (h) { h.classList.add("nf-split-in"); });
      }
    })();
  </script>`;

  let main;
  if (page === "about") {
    main = `
      <section class="nf-section site-reveal" style="padding-top:56px; text-align:center;"><div class="container">
        <span class="nf-kicker">מי אנחנו</span><h2 class="nf-split" style="font-size:32px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "about", dd.businessName)}</h2>
        <div class="nf-panel"><p>${aboutText(d, dd)}</p></div>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="nf-section site-reveal" style="padding-top:56px; text-align:center;"><div class="container">
        <span class="nf-kicker">נשמח לשמוע מכם</span><h2 class="nf-split" style="font-size:32px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2>
        <div class="nf-panel">
          ${dd._hasContact ? `
            ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
            ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
            ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
          ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
          ${wa ? `<a class="nf-cta" style="margin-top:18px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
        </div>
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="nf-hero"><div class="container">
        ${heroMediaHtml(d, "nf-hero-photo")}
        <span class="nf-kicker">${dd.tagline ? "ברוכים הבאים" : "סוכנות דיגיטל מהעתיד"}</span>
        <h1 class="nf-split">${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "nf-cta")}
      </div></section>
      <section class="nf-section site-reveal"><div class="container">
        <div class="nf-section-head"><span class="nf-kicker">מה אנחנו מציעים</span><h2 class="nf-split">${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#nf-grid", "חיפוש שירות...") : ""}</div>
        <div class="nf-grid" id="nf-grid">${dd._services.map((s) => `
          <div class="nf-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="nf-section site-reveal" style="padding-top:0;"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="nf-section site-reveal" style="text-align:center;"><div class="container"><span class="nf-kicker">מי אנחנו</span><h2 class="nf-split" style="font-size:28px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "about", "קצת עלינו")}</h2><div class="nf-panel"><p>${aboutText(d, dd)}</p></div></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="nf-section site-reveal" style="text-align:center;"><div class="container"><span class="nf-kicker">נשמח לשמוע מכם</span><h2 class="nf-split" style="font-size:28px; font-weight:800; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "יצירת קשר")}</h2><div class="nf-panel">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${meshDiv}${header}${main}${footer}${cursorScript}${splitScript}`).replace("<body>", '<body class="nf-body">');
}

/* ---------- Template 16: organized chaos (fashion / artist portfolio) ---------- */
function renderChaosSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#CCFF00");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const tickerText = [dd.businessName, dd.tagline].filter(Boolean).join(" × ") || dd.businessName;
  const css = `
    body.oc-body { background:#F5F2E8; color:#0A0A0A; overflow-x:hidden; }
    .oc-nav { padding:20px 0; border-bottom:4px solid #0A0A0A; background:#F5F2E8; position:relative; z-index:5; }
    .oc-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .oc-nav .biz { font-weight:900; font-size:20px; letter-spacing:-.02em; }
    .oc-nav nav { display:flex; gap:18px; flex-wrap:wrap; }
    .oc-nav nav a { font-size:13px; font-weight:800; color:#0A0A0A; }
    .oc-nav nav a.active { text-decoration:underline; text-decoration-thickness:3px; text-underline-offset:4px; }

    .oc-hero { padding:90px 24px 70px; text-align:center; background:linear-gradient(135deg, #${pal.primary} 0%, #F5F2E8 58%); position:relative; overflow:hidden; }
    .oc-hero h1 { font-size:64px; font-weight:900; letter-spacing:-.03em; line-height:.98; margin:0 0 20px; text-transform:uppercase; }
    .oc-hero p { font-size:17px; font-weight:600; max-width:480px; margin:0 auto 32px; }
    .oc-cta { display:inline-block; background:#0A0A0A; color:#${pal.primary}; font-weight:900; padding:17px 38px; border-radius:100px; font-size:15px; transition:transform .25s cubic-bezier(.2,.8,.2,1); }
    @media (max-width:640px) { .oc-hero h1 { font-size:36px; } }

    .oc-marquee { background:#0A0A0A; color:#${pal.primary}; overflow:hidden; padding:14px 0; direction:ltr; border-top:4px solid #0A0A0A; border-bottom:4px solid #0A0A0A; }
    .oc-marquee-track { display:flex; width:max-content; animation:oc-marquee 20s linear infinite; }
    .oc-marquee-item { font-size:20px; font-weight:900; text-transform:uppercase; white-space:nowrap; padding:0 26px; direction:rtl; }
    @keyframes oc-marquee { from{transform:translateX(0);} to{transform:translateX(-50%);} }
    @media (prefers-reduced-motion:reduce) { .oc-marquee-track { animation:none; } }

    .oc-hscroll-wrap { height:220vh; position:relative; }
    .oc-hscroll-sticky { position:sticky; top:0; height:100vh; overflow:hidden; display:flex; align-items:center; }
    .oc-hscroll-track { display:flex; direction:ltr; gap:28px; padding:0 6vw; will-change:transform; }
    .oc-hcard { direction:rtl; flex:0 0 320px; background:#fff; border:4px solid #0A0A0A; border-radius:18px; padding:30px; transition:transform .35s cubic-bezier(.2,.8,.2,1), filter .35s ease; }
    .oc-hcard:hover { transform:scale(1.04) rotate(-1deg); filter:saturate(1.3); }
    .oc-hcard h3 { font-size:20px; font-weight:900; margin:0 0 10px; }
    .oc-hcard p { font-size:14px; color:#333; margin:0 0 12px; font-weight:600; }
    .oc-hcard .price { display:inline-block; background:#${pal.primary}; border:2px solid #0A0A0A; font-weight:900; padding:5px 12px; font-size:13px; }
    @media (max-width:760px) {
      .oc-hscroll-wrap { height:auto; }
      .oc-hscroll-sticky { position:static; height:auto; overflow-x:auto; padding:20px 0; }
      .oc-hscroll-track { transform:none !important; }
    }

    .oc-section { padding:80px 0; }
    .oc-section-head { text-align:center; margin-bottom:40px; }
    .oc-section-head h2 { font-size:36px; font-weight:900; text-transform:uppercase; margin:8px 0 0; }
    .oc-tag { display:inline-block; background:#0A0A0A; color:#${pal.primary}; font-size:11.5px; font-weight:900; letter-spacing:.05em; padding:6px 16px; border-radius:100px; text-transform:uppercase; }

    .oc-about { background:#0A0A0A; color:#F5F2E8; text-align:center; }
    .oc-about p { font-size:20px; font-weight:700; max-width:700px; margin:0 auto; line-height:1.6; }

    .oc-contact { text-align:center; }
    .oc-contact .line { display:inline-block; background:#fff; border:3px solid #0A0A0A; border-radius:100px; padding:10px 20px; margin:5px; font-weight:800; font-size:13.5px; }

    .oc-footer { border-top:4px solid #0A0A0A; padding:24px 0; text-align:center; font-size:12.5px; font-weight:800; }

    .oc-distort { overflow:hidden; border-radius:16px; }
    .oc-distort img, .oc-distort .site-hero-slideshow { transition:transform .5s cubic-bezier(.2,.8,.2,1), filter .5s ease; }
    .oc-distort:hover img, .oc-distort:hover .site-hero-slideshow { transform:scale(1.08) skewY(-2deg); filter:saturate(1.4) contrast(1.05); }
  `;
  const header = `
    <header class="oc-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="oc-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;
  const interactionScript = `<script>
    (function () {
      if (window.matchMedia && !window.matchMedia("(pointer: coarse)").matches) {
        document.querySelectorAll(".oc-cta").forEach(function (btn) {
          btn.addEventListener("mousemove", function (e) {
            var r = btn.getBoundingClientRect();
            var x = e.clientX - r.left - r.width / 2;
            var y = e.clientY - r.top - r.height / 2;
            btn.style.transform = "translate(" + (x * .3) + "px," + (y * .3) + "px)";
          });
          btn.addEventListener("mouseleave", function () { btn.style.transform = "translate(0,0)"; });
        });
      }
      var wrap = document.getElementById("oc-hscroll");
      var track = document.getElementById("oc-hscroll-track");
      if (wrap && track && window.innerWidth > 760) {
        // The wrapper's own height sets how much "extra" scroll distance
        // drives the horizontal shift — a fixed vh regardless of card count
        // meant 3 cards and 10 cards scrolled equally (very slow, or barely
        // moving at all). Sizing it from the track's actual measured width
        // instead means the scroll pacing always matches how far the cards
        // actually need to travel, whether there are 3 of them or 10.
        var maxShift = 0;
        function recalc() {
          maxShift = Math.max(0, track.scrollWidth - window.innerWidth + 96);
          var extraVh = Math.min(160, Math.max(60, (maxShift / window.innerHeight) * 100 * 1.3));
          wrap.style.height = (100 + extraVh) + "vh";
        }
        function onScroll() {
          var rect = wrap.getBoundingClientRect();
          var total = rect.height - window.innerHeight;
          if (total <= 0) return;
          var progress = Math.min(1, Math.max(0, -rect.top / total));
          track.style.transform = "translateX(" + (-progress * maxShift) + "px)";
        }
        recalc();
        onScroll();
        window.addEventListener("resize", function () { recalc(); onScroll(); });
        document.addEventListener("scroll", onScroll, { passive: true });
      }
    })();
  </script>`;

  let main;
  if (page === "about") {
    main = `<section class="oc-section oc-about site-reveal"><div class="container"><p>${aboutText(d, dd)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="oc-section site-reveal"><div class="container">
        <div class="oc-section-head"><span class="oc-tag">נשמח לשמוע מכם</span><h2>${heading(d, "contact", "יצירת קשר")}</h2></div>
        <div class="oc-contact">
          ${dd._hasContact ? `
            ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
            ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
            ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
          ` : `<p style="font-weight:700;">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</p>`}
          <div style="margin-top:20px;">${wa ? `<a class="oc-cta" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}</div>
        </div>
      </div></section>`;
  } else {
    main = `
      <section class="oc-hero"><div class="container">
        <span class="eyebrow" style="background:#0A0A0A; color:#${pal.primary}; border-radius:0;">${dd.tagline ? "ברוכים הבאים" : "מותג שלא מתנצל"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "oc-cta")}
        ${heroHasImage(d) ? `<div class="oc-distort" style="max-width:420px; margin:34px auto 0;">${heroMediaHtml(d, "")}</div>` : ""}
      </div></section>
      <div class="oc-marquee"><div class="oc-marquee-track">${Array(6).fill(`<span class="oc-marquee-item">${escapeHtmlS(tickerText)}</span>`).join("")}</div></div>
      <div class="oc-hscroll-wrap" id="oc-hscroll"><div class="oc-hscroll-sticky"><div class="oc-hscroll-track" id="oc-hscroll-track">
        ${dd._services.map((s) => `<div class="oc-hcard"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}
      </div></div></div>
      ${embedSrc ? `<section class="oc-section site-reveal"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="oc-section oc-about site-reveal"><div class="container"><p>${aboutText(d, dd)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="oc-section site-reveal"><div class="container">
        <div class="oc-section-head"><span class="oc-tag">נשמח לשמוע מכם</span><h2>${heading(d, "contact", "יצירת קשר")}</h2></div>
        <div class="oc-contact">
          ${dd._hasContact ? `
            ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
            ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
            ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
          ` : `<p style="font-weight:700;">פרטו כאן טלפון, מייל וכתובת.</p>`}
        </div>
      </div></section>` : ""}
      ${interactionScript}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`).replace("<body>", '<body class="oc-body">');
}

/* ---------- Template 17: 3D minimalist luxury (architects / real estate) ---------- */
function renderLuxurySite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#B08D57");
  const rgb = hexToRgb(pal.primary);
  const tintRgba = `${rgb.r},${rgb.g},${rgb.b}`;
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = heroHasImage(d);
  const aboutExcerptRaw = dd.about.length > 90 ? dd.about.slice(0, 90) + "…" : dd.about;
  const css = `
    body.lx-body { background:#FAF8F4; color:#2A2620; }
    .lx-iris { position:fixed; inset:0; z-index:9999; background:#FAF8F4; pointer-events:none;
      clip-path:circle(150% at 50% 50%); animation:lx-iris-reveal 1.3s .15s cubic-bezier(.4,0,.2,1) both; }
    @keyframes lx-iris-reveal { from { clip-path:circle(150% at 50% 50%); } to { clip-path:circle(0% at 50% 50%); } }
    @media (prefers-reduced-motion:reduce) { .lx-iris { animation:none; clip-path:circle(0% at 50% 50%); } }

    .lx-nav { padding:30px 0; position:relative; z-index:2; }
    .lx-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .lx-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:19px; letter-spacing:.02em; color:#2A2620; }
    .lx-nav nav { display:flex; gap:24px; flex-wrap:wrap; }
    .lx-nav nav a { font-size:12.5px; letter-spacing:.06em; text-transform:uppercase; color:#8A8272; }
    .lx-nav nav a.active, .lx-nav nav a:hover { color:#2A2620; }

    .lx-hero { position:relative; min-height:82vh; display:flex; align-items:center; justify-content:center; text-align:center; overflow:hidden; padding:40px 24px; }
    .lx-hero-bg { position:absolute; inset:-10%; z-index:0;
      background: radial-gradient(circle at 30% 30%, rgba(${tintRgba},.3), transparent 55%),
                  radial-gradient(circle at 75% 70%, rgba(180,180,175,.3), transparent 55%); }
    .lx-hero-inner { position:relative; z-index:1; }
    .lx-kicker { font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#8A8272; margin-bottom:22px; display:block; }
    .lx-hero h1 { font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:56px; line-height:1.15; margin:0 0 20px; color:#2A2620; }
    .lx-hero p { font-size:16px; color:#6B6458; max-width:480px; margin:0 auto 34px; }
    .lx-cta { display:inline-block; border:1px solid #${pal.primaryDark}; color:#${pal.primaryDark}; font-weight:600; font-size:13px; letter-spacing:.06em; padding:15px 38px; transition:background .3s ease, color .3s ease; }
    .lx-cta:hover { background:#${pal.primaryDark}; color:#FAF8F4; }
    @media (max-width:640px) { .lx-hero h1 { font-size:34px; } }

    .lx-parallax { position:relative; height:70vh; overflow:hidden; }
    .lx-parallax-layer { position:absolute; inset:0; will-change:transform; }
    .lx-parallax-bg { background:linear-gradient(160deg, #E8E0D0, #D4BB96 60%, #B8AFA0); overflow:hidden; }
    .lx-parallax-img, .lx-parallax-bg .site-hero-slideshow { position:absolute; inset:-12%; width:124%; height:124%; object-fit:cover; }
    .lx-parallax-mid { display:flex; align-items:center; justify-content:center; padding:0 24px; }
    .lx-parallax-mid h2 { font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:42px; color:#2A2620; text-align:center; max-width:620px; text-shadow:0 2px 24px rgba(250,248,244,.6); }
    @media (max-width:640px) { .lx-parallax { height:48vh; } .lx-parallax-mid h2 { font-size:24px; } }

    .lx-section { padding:90px 0; }
    .lx-section-head { text-align:center; margin-bottom:44px; }
    .lx-kicker2 { font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#8A8272; }
    .lx-section-head h2 { font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:34px; margin:12px 0 0; color:#2A2620; }
    .lx-section .site-search-input { border:1px solid #DCD3C0; background:#fff; }

    .lx-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:2px; background:#DCD3C0; }
    .lx-card { background:#FAF8F4; padding:36px 30px; }
    .lx-card h3 { font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:19px; margin:0 0 10px; color:#2A2620; }
    .lx-card p { font-size:13.5px; color:#6B6458; line-height:1.7; margin:0 0 10px; }
    .lx-card .price { font-size:13px; letter-spacing:.04em; color:#${pal.primaryDark}; }

    .lx-about, .lx-contact { text-align:center; }
    .lx-panel { max-width:620px; margin:0 auto; }
    .lx-panel p { font-size:17px; line-height:1.9; color:#4A453A; }
    .lx-panel .line { font-size:14.5px; color:#4A453A; margin-bottom:8px; }

    .lx-footer { border-top:1px solid #E4DCC8; padding:28px 0; text-align:center; font-size:11.5px; letter-spacing:.04em; color:#8A8272; }
  `;
  const header = `
    <header class="lx-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="lx-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;
  const iris = `<div class="lx-iris" aria-hidden="true"></div>`;
  const parallaxScript = `<script>
    (function () {
      var section = document.getElementById("lx-parallax");
      if (!section) return;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var bg = section.querySelector(".lx-parallax-bg");
      var mid = section.querySelector(".lx-parallax-mid");
      function onScroll() {
        var rect = section.getBoundingClientRect();
        var vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        var progress = (vh - rect.top) / (vh + rect.height);
        if (bg) bg.style.transform = "translateY(" + (progress * 60 - 30) + "px) scale(1.15)";
        if (mid) mid.style.transform = "translateY(" + (progress * -30 + 15) + "px)";
      }
      document.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    })();
  </script>`;

  let main;
  if (page === "about") {
    main = `
      <section class="lx-section site-reveal" style="padding-top:64px; text-align:center;"><div class="container">
        <span class="lx-kicker2">מי אנחנו</span><h2 style="font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:32px; margin:12px 0 26px; color:#2A2620;">${heading(d, "about", dd.businessName)}</h2>
        <div class="lx-panel"><p>${aboutText(d, dd)}</p></div>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="lx-section site-reveal" style="padding-top:64px; text-align:center;"><div class="container">
        <span class="lx-kicker2">נשמח לשמוע מכם</span><h2 style="font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:32px; margin:12px 0 26px; color:#2A2620;">${heading(d, "contact", "יצירת קשר")}</h2>
        <div class="lx-panel">
          ${dd._hasContact ? `
            ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
            ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
            ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
          ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
          ${wa ? `<a class="lx-cta" style="margin-top:18px; display:inline-block;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
        </div>
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="lx-hero"><div class="lx-hero-bg"></div><div class="container lx-hero-inner">
        <span class="lx-kicker">${dd.tagline ? "ברוכים הבאים" : "עיצוב ללא פשרות"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${ctaHtml(cta, "lx-cta")}
      </div></section>
      <div class="lx-parallax" id="lx-parallax">
        <div class="lx-parallax-layer lx-parallax-bg">${hasPhoto ? heroMediaHtml(d, "lx-parallax-img") : ""}</div>
        <div class="lx-parallax-layer lx-parallax-mid"><h2>${escapeHtmlS(aboutExcerptRaw)}</h2></div>
      </div>
      <section class="lx-section site-reveal"><div class="container">
        <div class="lx-section-head"><span class="lx-kicker2">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2>
        ${showSearch ? searchBoxHtml("#lx-grid", "חיפוש שירות...") : ""}</div>
        <div class="lx-grid" id="lx-grid">${dd._services.map((s) => `
          <div class="lx-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="lx-section site-reveal" style="padding-top:0;"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="lx-section lx-about site-reveal"><div class="container"><span class="lx-kicker2">מי אנחנו</span><h2 style="font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:30px; margin:12px 0 26px; color:#2A2620;">${heading(d, "about", "קצת עלינו")}</h2><div class="lx-panel"><p>${aboutText(d, dd)}</p></div></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="lx-section lx-contact site-reveal"><div class="container"><span class="lx-kicker2">נשמח לשמוע מכם</span><h2 style="font-family:'Frank Ruhl Libre',serif; font-weight:500; font-size:30px; margin:12px 0 26px; color:#2A2620;">${heading(d, "contact", "יצירת קשר")}</h2><div class="lx-panel">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></div></section>` : ""}
      ${parallaxScript}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${iris}${header}${main}${footer}`).replace("<body>", '<body class="lx-body">');
}

/* ---------- Template 18: playground (physics-based, playful) ----------
   The showcase for the newest, riskiest interaction ideas: DOM elements
   whose position is driven by a real physics engine (Matter.js, loaded
   from CDN — never bundled, since a customer's downloaded site should stay
   a few KB of HTML/CSS/JS, not ship a physics engine inline) and a liquid/
   gooey SVG-filter button. Both degrade to a perfectly normal static page
   if the CDN is blocked, JS fails, or the visitor prefers reduced motion —
   the "fallback" IS the default CSS layout, physics only ever upgrades it,
   never something the page depends on to not look broken. */
const PG_ACCENTS = ["#FF5C7A", "#22D3EE", "#FFD23F", "#7C5CFF", "#3DDC84"];
/* Section-renderer decomposition (Builder v2 pilot) — same reasoning as
   the local-service functions above: each returns exactly the HTML
   chunk renderPlaygroundSite's index page inlined directly, letting the
   new block-based Builder treat "Hero"/"שירותים/מוצרים"/"אודות"/"צור
   קשר" as independent, reorderable rows while the original monolithic
   function (still used by every not-yet-migrated template) is
   unaffected. The physics <script> now travels with its own section
   instead of being appended at the very end — required so it keeps
   working if that section is ever reordered; behaviorally identical
   either way, since it only looks up its elements by id once they
   already exist above it. */
function pgHeroSection(d, pal, dd, cta) {
  const gooSvg = `<svg width="0" height="0" style="position:absolute;">
    <filter id="pg-goo-filter">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="7" result="noise">
        <animate attributeName="baseFrequency" values="0.012 0.04;0.02 0.07;0.012 0.04" dur="2.4s" begin="pg-goo-btn.mouseover" end="pg-goo-btn.mouseout+0.6s" fill="freeze"/>
      </feTurbulence>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G">
        <animate attributeName="scale" values="0;18;0" dur="0.9s" begin="pg-goo-btn.mouseover" fill="freeze"/>
        <animate attributeName="scale" values="18;0" dur="0.5s" begin="pg-goo-btn.mouseout" fill="freeze"/>
      </feDisplacementMap>
    </filter>
  </svg>`;
  return `
      <section class="pg-hero"><div class="container">
        <span class="pg-kicker">${dd.tagline ? "ברוכים הבאים" : "עסק שמרים אנרגיה"}</span>
        <h1>${heading(d, "heroTitle", dd.businessName)}</h1>
        <p>${taglineText(d, dd)}</p>
        ${cta ? `<span class="pg-cta-wrap" style="filter:url(#pg-goo-filter);"><a id="pg-goo-btn" class="pg-cta" href="${escapeHtmlS(cta.href)}"${cta.external ? ' target="_blank" rel="noopener"' : ""}${cta.page ? ` data-site-nav data-page="${cta.page}"` : ""}>${escapeHtmlS(cta.label)}</a></span>` : ""}
      </div></section>
      ${gooSvg}`;
}
function pgServicesSection(d, pal, dd) {
  // Small hand-rolled physics (gravity + wall/bubble collision + pointer
  // drag) instead of loading a physics engine off a CDN — confirmed
  // live, twice, that the CDN load kept failing for real visitors
  // (network policy, ad-blocker, or just a slow connection racing the
  // 4s timeout), which left the whole services section empty.
  const physicsScript = `<script>
    (function () {
      var wrap = document.getElementById("pg-physics");
      if (!wrap) return;
      var els = Array.prototype.slice.call(wrap.querySelectorAll(".pg-bubble"));
      if (!els.length) return;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      var W, H;
      var GRAVITY = 0.6, DAMPING = 0.985, BOUNCE = 0.42;
      var bodies;
      var started = false;

      // Confirmed live: starting the fall the instant the script runs meant
      // the bubbles had already dropped and settled at the bottom of a tall
      // box before the visitor ever scrolled down to see this section —
      // reading as a big empty gap under the heading. Waiting for the box
      // to actually scroll into view, and starting bubbles just above it
      // (not far off-screen), keeps the fall short and visible instead.
      function activate() {
        if (started) return;
        started = true;
        wrap.classList.add("pg-active");
        W = wrap.clientWidth; H = wrap.clientHeight;

        bodies = els.map(function (el, i) {
          var w = el.offsetWidth, h = el.offsetHeight;
          el.style.width = w + "px";
          return {
            el: el, w: w, h: h, r: Math.max(w, h) / 2,
            x: w / 2 + Math.random() * Math.max(1, W - w),
            y: -10 - i * 45,
            vx: (Math.random() - 0.5) * 2, vy: 0,
            angle: (Math.random() - 0.5) * 0.3, va: (Math.random() - 0.5) * 0.02,
            dragging: false,
          };
        });
        step();
        wireDrag();
      }

      // Confirmed live (a wide/tall preview window, or any big desktop
      // monitor): IntersectionObserver fires its FIRST callback the
      // instant observe() runs, reporting whatever is already true right
      // then — so on a tall enough viewport, where this section already
      // sits inside the initial fold, it reported "intersecting" before
      // the visitor had scrolled at all, activating immediately and
      // reproducing the exact bug this was meant to fix. Gating on a
      // genuine scroll (scrollTop > 0) as well means it only ever
      // activates as a reaction to the visitor actually moving down the
      // page, never just because of how tall their screen happens to be.
      if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && document.documentElement.scrollTop > 0) { activate(); io.disconnect(); }
          });
        }, { threshold: 0.15 });
        io.observe(wrap);
        document.addEventListener("scroll", function onScroll() {
          if (started) { document.removeEventListener("scroll", onScroll); return; }
          var r = wrap.getBoundingClientRect();
          var vh = window.innerHeight || document.documentElement.clientHeight;
          if (r.top < vh && r.bottom > 0) { activate(); io.disconnect(); document.removeEventListener("scroll", onScroll); }
        }, { passive: true });
      } else {
        activate();
      }

      function step() {
        bodies.forEach(function (b) {
          if (b.dragging) return;
          b.vy += GRAVITY;
          b.vx *= DAMPING; b.vy *= DAMPING;
          b.x += b.vx; b.y += b.vy;
          b.angle += b.va; b.va *= 0.98;
          var halfW = b.w / 2, halfH = b.h / 2;
          if (b.y + halfH > H) { b.y = H - halfH; b.vy = -b.vy * BOUNCE; b.vx *= 0.9; }
          if (b.y - halfH < 0) { b.y = halfH; b.vy = -b.vy * BOUNCE; }
          if (b.x - halfW < 0) { b.x = halfW; b.vx = -b.vx * BOUNCE; }
          if (b.x + halfW > W) { b.x = W - halfW; b.vx = -b.vx * BOUNCE; }
        });
        for (var i = 0; i < bodies.length; i++) {
          for (var j = i + 1; j < bodies.length; j++) {
            var a = bodies[i], c = bodies[j];
            var dx = c.x - a.x, dy = c.y - a.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            var minDist = a.r + c.r;
            if (dist < minDist) {
              var overlap = (minDist - dist) / 2;
              var nx = dx / dist, ny = dy / dist;
              if (!a.dragging) { a.x -= nx * overlap; a.y -= ny * overlap; }
              if (!c.dragging) { c.x += nx * overlap; c.y += ny * overlap; }
              var avgVx = (a.vx + c.vx) / 2, avgVy = (a.vy + c.vy) / 2;
              if (!a.dragging) { a.vx = avgVx * 0.9; a.vy = avgVy * 0.9; }
              if (!c.dragging) { c.vx = avgVx * 0.9; c.vy = avgVy * 0.9; }
            }
          }
        }
        bodies.forEach(function (b) {
          b.el.style.transform = "translate(" + (b.x - b.w / 2) + "px," + (b.y - b.h / 2) + "px) rotate(" + b.angle + "rad)";
        });
        requestAnimationFrame(step);
      }

      function wireDrag() {
        var active = null, offX = 0, offY = 0, lastX = 0, lastY = 0;
        bodies.forEach(function (b) {
          b.el.style.touchAction = "none";
          b.el.addEventListener("pointerdown", function (e) {
            active = b; b.dragging = true; b.vx = 0; b.vy = 0;
            try { b.el.setPointerCapture(e.pointerId); } catch (err) {}
            var rect = wrap.getBoundingClientRect();
            offX = (e.clientX - rect.left) - b.x;
            offY = (e.clientY - rect.top) - b.y;
            lastX = e.clientX; lastY = e.clientY;
          });
        });
        wrap.addEventListener("pointermove", function (e) {
          if (!active) return;
          var rect = wrap.getBoundingClientRect();
          active.x = (e.clientX - rect.left) - offX;
          active.y = (e.clientY - rect.top) - offY;
          active.vx = e.clientX - lastX; active.vy = e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
        });
        window.addEventListener("pointerup", function () {
          if (active) active.dragging = false;
          active = null;
        });
      }

      window.addEventListener("resize", function () { W = wrap.clientWidth; H = wrap.clientHeight; });
    })();
  </script>`;
  return `
      <div class="pg-physics-wrap"><div class="container">
        <div class="pg-physics-head"><span class="pg-kicker2">מה אנחנו מציעים</span><h2>${heading(d, "services", "השירותים שלנו")}</h2></div>
        <p class="pg-physics-hint">🖱️ תרגישו חופשי לגעת — גררו, זרקו ושחקו עם השירותים למטה</p>
      </div>
        <div class="pg-physics" id="pg-physics">${dd._services.map((s, i) => `
          <div class="pg-bubble" data-svc-idx="${i}" style="background:${i === 0 ? "#" + pal.primary : PG_ACCENTS[(i - 1) % PG_ACCENTS.length]};"><span>${escapeHtmlS(s.name)}${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}</span></div>`).join("")}</div>
      </div>
      ${physicsScript}`;
}
function pgVideoSection(embedSrc) {
  return embedSrc ? `<section class="pg-section site-reveal"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : "";
}
function pgAboutSection(d, pal, dd) {
  return (!d.pages || !d.pages.about) ? `<section class="pg-section site-reveal" style="text-align:center;"><div class="container"><span class="pg-kicker2">מי אנחנו</span><h2 style="font-size:26px; font-weight:900; color:#fff; margin:10px 0 26px;">${heading(d, "about", "קצת עלינו")}</h2><div class="pg-panel"><p>${aboutText(d, dd)}</p></div></div></section>` : "";
}
function pgContactSection(d, pal, dd, wa) {
  return (!d.pages || !d.pages.contact) ? `<section class="pg-section site-reveal" style="text-align:center;"><div class="container"><span class="pg-kicker2">נשמח לשמוע מכם</span><h2 style="font-size:26px; font-weight:900; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "בואו נדבר")}</h2><div class="pg-panel">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></div></section>` : "";
}

function renderPlaygroundSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#7C5CFF");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    body.pg-body { background:#0F1020; color:#F2F1FA; }
    .pg-nav { padding:22px 0; }
    .pg-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px; }
    .pg-nav .biz { font-weight:900; font-size:18px; letter-spacing:-.01em; color:#fff; }
    .pg-nav nav { display:flex; gap:18px; }
    .pg-nav nav a { font-size:13px; font-weight:700; color:#B8B6D6; }
    .pg-nav nav a.active, .pg-nav nav a:hover { color:#fff; }

    .pg-hero { text-align:center; padding:70px 24px 30px; }
    .pg-kicker { display:inline-block; font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#${pal.headerAccentText}; margin-bottom:18px; }
    .pg-hero h1 {
      font-size:min(15vw, 74px); font-weight:900; letter-spacing:-.02em; line-height:1.03; margin:0 0 18px;
      background:linear-gradient(90deg, #${pal.primary}, ${PG_ACCENTS.join(", ")}, #${pal.primary});
      background-size:300% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent;
      animation:pg-gradient-move 7s ease-in-out infinite;
    }
    @media (prefers-reduced-motion: reduce) { .pg-hero h1 { animation:none; background-position:0% 0%; } }
    @keyframes pg-gradient-move { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
    .pg-hero p { font-size:16.5px; color:#C7C5E0; max-width:480px; margin:0 auto 30px; }

    .pg-cta-wrap { display:inline-block; }
    .pg-cta { display:inline-flex; align-items:center; gap:8px; background:#${pal.primary}; color:#fff; font-weight:900; padding:16px 36px; border-radius:40px; font-size:15px; }

    .pg-physics-wrap { padding:36px 0 16px; }
    .pg-physics-head { text-align:center; margin-bottom:8px; }
    .pg-physics-head h2 { font-size:28px; font-weight:900; color:#fff; margin:8px 0 4px; }
    .pg-physics-hint { text-align:center; font-size:12.5px; color:#8B89AC; margin:0 0 16px; }
    .pg-physics { position:relative; min-height:280px; max-width:920px; margin:0 auto; padding:20px; overflow:hidden;
      display:flex; flex-wrap:wrap; align-content:flex-start; justify-content:center; gap:16px; }
    .pg-physics.pg-active { display:block; height:42vh; min-height:300px; max-height:460px; cursor:grab; touch-action:none; }
    .pg-physics.pg-active:active { cursor:grabbing; }
    .pg-bubble {
      display:inline-flex; align-items:center; justify-content:center; text-align:center; padding:0 22px;
      height:76px; min-width:120px; border-radius:38px; font-weight:800; font-size:15px; color:#0F1020;
      box-shadow:0 10px 26px rgba(0,0,0,.28); user-select:none;
    }
    /* Deliberately physical "left", not the logical inset-inline-start —
       confirmed live: in this RTL site, inset-inline-start:0 anchors the
       bubble's untransformed position to the container's RIGHT edge, but
       the physics script's translate(x,y) math is always physical
       left-to-right (CSS transforms ignore dir). The two disagreeing sent
       every bubble rendering hundreds of pixels off to the right, often
       entirely outside the viewport — which is exactly why none of them
       were visible or draggable. */
    .pg-physics.pg-active .pg-bubble { position:absolute; top:0; left:0; will-change:transform; }
    .pg-bubble .price { display:block; font-size:11.5px; font-weight:700; opacity:.75; margin-top:2px; }

    .pg-section { padding:64px 0; }
    .pg-section-head { text-align:center; margin-bottom:30px; }
    .pg-kicker2 { font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#${pal.headerAccentText}; }
    .pg-section-head h2 { font-size:29px; font-weight:900; color:#fff; margin:10px 0 0; }
    .pg-panel { max-width:640px; margin:0 auto; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:22px; padding:36px; text-align:center; }
    .pg-panel p { font-size:16px; color:#D6D4EC; line-height:1.8; margin:0; }
    .pg-panel .line { font-size:14.5px; color:#D6D4EC; margin-bottom:8px; }

    .pg-footer { border-top:1px solid rgba(255,255,255,.08); padding:24px 0; text-align:center; font-size:12px; color:#7A78A0; }
  `;
  const header = `
    <header class="pg-nav"><div class="container row">
      <div class="biz">${bizName(d, dd)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="pg-footer">© ${new Date().getFullYear()} ${bizName(d, dd)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="pg-section site-reveal" style="padding-top:60px; text-align:center;"><div class="container">
        <span class="pg-kicker2">מי אנחנו</span><h2 style="font-size:30px; font-weight:900; color:#fff; margin:10px 0 26px;">${heading(d, "about", dd.businessName)}</h2>
        <div class="pg-panel"><p>${aboutText(d, dd)}</p></div>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="pg-section site-reveal" style="padding-top:60px; text-align:center;"><div class="container">
        <span class="pg-kicker2">נשמח לשמוע מכם</span><h2 style="font-size:30px; font-weight:900; color:#fff; margin:10px 0 26px;">${heading(d, "contact", "בואו נדבר")}</h2>
        <div class="pg-panel">
          ${dd._hasContact ? `
            ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
            ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
            ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
          ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
          ${wa ? `<a class="pg-cta" style="margin-top:18px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
        </div>
      </div></section>`;
  } else if (typeof isTemplateMigrated === "function" && isTemplateMigrated("playground")) {
    main = renderBlocksHtml(d, "playground", "index", {
      pal, dd, cta, wa, videoSection: pgVideoSection(embedSrc),
    });
  } else {
    main = `${pgHeroSection(d, pal, dd, cta)}
      ${pgServicesSection(d, pal, dd)}
      ${pgVideoSection(embedSrc)}
      ${pgAboutSection(d, pal, dd)}
      ${pgContactSection(d, pal, dd, wa)}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css, fontFamily: d.fontFamily }, `${header}${main}${footer}`).replace("<body>", '<body class="pg-body">');
}

const SITE_CATEGORIES = [
  { slug: "all", label: "הכל" },
  { slug: "service", label: "עסקי שירות" },
  { slug: "personal", label: "תדמית אישית" },
  { slug: "shop", label: "קטלוג ומכירות" },
  { slug: "creative", label: "עיצובי ויצירתי" },
  { slug: "events", label: "אירועים ובוטיק" },
];

/* Ordered so the visually striking designs lead the default "הכל" catalog
   view — the flat, business-card-plain ones (local-service, freelancer,
   catalog) used to sit first purely because of object key order, which
   made the whole catalog read as bland at a glance even though the more
   distinctive templates were there too, just scrolled past. */
const SITE_TEMPLATES = {
  "studio": { label: "סטודיו קריאייטיב", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "הירו א-סימטרי כהה, ניווט צדי אנכי, וטקסטים שנכנסים באנימציה בגלילה", thumb: "images/previews/site-studio.webp?v=2", render: renderStudioSite,
    features: ["הירו א-סימטרי כהה עם ניווט צדי אנכי", "טקסטים שנכנסים באנימציה תוך כדי גלילה", "עיצוב נועז שממש לא נראה כמו \"תבנית\"", "מתאים לסטודיו עיצוב או מותג יצירתי"], tags: ["dark", "rail"] },
  "noir": { label: "יוקרתי כהה", category: "אירועים ובוטיק", categorySlug: "events", desc: "רקע כהה, טיפוגרפיה איטלקית עדינה, ורשימת שירותים בסגנון תפריט", thumb: "images/previews/site-noir.webp", render: renderNoirSite,
    features: ["רקע כהה ויוקרתי עם וידאו רקע אפשרי", "טיפוגרפיה איטלקית עדינה", "רשימת שירותים בסגנון תפריט מסעדה", "מתאים לאירועים ומותגים יוקרתיים"], tags: ["dark", "video"] },
  "bold": { label: "נועז ומודרני", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "מסגרות עבות, צללים חדים, טיפוגרפיה גדולה", thumb: "images/previews/site-bold.webp?v=2", render: renderBoldSite,
    features: ["טיפוגרפיה גדולה ותוססת שקופצת לעין", "מסגרות עבות וצללים חדים", "גלריית תמונות מתחלפות בכותרת", "מתאים למותגים שרוצים לבלוט"], tags: [] },
  "elegant": { label: "אלגנטי ומעוצב", category: "אירועים ובוטיק", categorySlug: "events", desc: "טיפוגרפיה עדינה, תמונה מפוצלת, מתאים לאירועים ועסקי בוטיק", thumb: "images/previews/site-elegant.webp", render: renderElegantSite,
    features: ["פריסה מפוצלת: תמונה בצד, טקסט בצד", "גלריית תמונות מתחלפות", "טיפוגרפיה עדינה שמתאימה לאירועים", "מושלם לעסקי בוטיק ואירועים"], tags: [] },
  "gallery": { label: "גלריה מודרנית", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "תמונה מלאה ברקע, עיצוב עיתונאי ואלגנטי", thumb: "images/previews/site-gallery.webp?v=2", render: renderGallerySite,
    features: ["תמונת רקע מלאה בכותרת, בסגנון עיתונאי", "פריסת \"בֶּנְטוֹ\" מודרנית למוצרים או עבודות", "טיפוגרפיה עדינה ואלגנטית", "צבע ראשי לבחירה שצובע את כל האתר"], tags: [] },
  "portfolio": { label: "תיק עבודות יצירתי", category: "תדמית אישית", categorySlug: "personal", desc: "כותרת אישית גדולה ורשימת עבודות ממוספרת, בסגנון פורטפוליו", thumb: "images/previews/site-portfolio.webp?v=2", render: renderPortfolioSite,
    features: ["כותרת אישית גדולה עם שם ותפקיד", "רשימת עבודות ממוספרת בסגנון פורטפוליו", "גלריית תמונות מתחלפות", "מתאים למעצבים, יוצרים ואנשי מקצוע יצירתיים"], tags: [] },
  "boutique": { label: "חנות בוטיק", category: "קטלוג ומכירות", categorySlug: "shop", desc: "מוצר מומלץ בכרטיס גדול, ואחריו רשת המוצרים הנוספים", thumb: "images/previews/site-boutique.webp", render: renderBoutiqueSite,
    features: ["מוצר מומלץ בכרטיס גדול ובולט", "רשת מוצרים נוספים מתחתיו", "גלריית תמונות מתחלפות בכותרת", "מתאים לחנות בוטיק עם מוצר דגל"], tags: [] },
  "process": { label: "תהליך עבודה", category: "עסקי שירות", categorySlug: "service", desc: "ציר זמן ממוספר שמראה איך אתם עובדים, שלב אחר שלב", thumb: "images/previews/site-process.webp?v=2", render: renderProcessSite,
    features: ["ציר זמן ממוספר שמראה איך אתם עובדים", "בונה אמון עוד לפני שיחת המכירה הראשונה", "גלריית תמונות מתחלפות בכותרת", "מתאים לעסקי שירות עם תהליך עבודה ברור"], tags: [] },
  "local-service": { label: "עסק שירות מקומי", category: "עסקי שירות", categorySlug: "service", desc: "Hero גדול, כרטיסי שירותים, וואטסאפ צף", thumb: "images/previews/site-local-service.webp?v=2", render: renderLocalServiceSite,
    features: ["תמונת רקע גדולה בכותרת — אפשר גם וידאו רקע נגן אוטומטית", "גלריית תמונות מתחלפות בכותרת", "כפתור וואטסאפ צף בכל העמודים", "כרטיסי שירותים עם תיאור ומחיר"], tags: ["hscroll", "video", "rail"] },
  "freelancer": { label: "פרילנסר / יועץ", category: "תדמית אישית", categorySlug: "personal", desc: "מינימלי וממורכז, מתאים למותג אישי", thumb: "images/previews/site-freelancer.webp?v=2", render: renderFreelancerSite,
    features: ["עיצוב ממורכז ונקי, בלי רעשי רקע", "תמונה אישית או גלריית תמונות מתחלפות", "מתאים למותג אישי או ייעוץ פרטני", "צבע ראשי לבחירה שצובע את כל האתר"], tags: [] },
  "catalog": { label: "קטלוג קטן", category: "קטלוג ומכירות", categorySlug: "shop", desc: "רשת מוצרים עם תגי מחיר וניווט עליון", thumb: "images/previews/site-catalog.webp", render: renderCatalogSite,
    features: ["רשת מוצרים עם תגי מחיר ברורים", "ניווט עליון קבוע בין העמודים", "גלריית תמונות מתחלפות בכותרת", "מתאים לחנות קטנה או תפריט שירותים"], tags: [] },
  "bento": { label: "רשת משבצות דינמית", category: "עסקי שירות", categorySlug: "service", desc: "לוח משבצות א-סימטרי בסגנון בנטו, עם שעון חי ותוכן מודולרי לכל עסק", thumb: "images/previews/site-bento.webp", render: renderBentoSite,
    features: ["פריסת בנטו א-סימטרית בהשראת ממשקי פרימיום", "שעון חי שמתעדכן בזמן אמת", "כל משבצת נערכת בנפרד — גמיש לכל סוג עסק", "מתאים לסטודיו, מרפאה, מסעדה או סוכנות"], tags: [] },
  "cinematic": { label: "קולנועי כהה", category: "תדמית אישית", categorySlug: "personal", desc: "מוד כהה יוקרתי עם זכוכית מטושטשת, הילה שעוקבת אחרי העכבר וטיפוגרפיה ענקית", thumb: "images/previews/site-cinematic.webp", render: renderCinematicSite,
    features: ["רקע כהה עם אפקט זכוכית מטושטשת (Glassmorphism)", "הילה זוהרת שעוקבת אחרי תנועת העכבר", "טיפוגרפיה ענקית שמרגישה כמו אפליקציית פרימיום", "מתאים לעורכי דין, יועצים ומותגים יוקרתיים"], tags: ["dark", "effects"] },
  "brutal": { label: "נאו-ברוטליזם נועז", category: "קטלוג ומכירות", categorySlug: "shop", desc: "רקעי צבע עזים, מסגרות שחורות עבות, וכפתורי לחיצה בסגנון ארקייד", thumb: "images/previews/site-brutal.webp", render: renderBrutalSite,
    features: ["רקעים צבעוניים נועזים עם מסגרות שחורות עבות", "כפתורים שנלחצים פיזית בלחיצה, כמו במכונת ארקייד", "כותרת נעה בלולאה (Marquee) בסגנון בורסה", "מתאים לחנויות, מאמנים ומותגים צעירים ותוססים"], tags: [] },
  "neon": { label: "העתיד הניאוני", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "רקע מש-גרדיאנט ניאוני זז, זכוכית מטושטשת, וכותרות שנפתחות דרמטית בגלילה", thumb: "images/previews/site-neon.webp", render: renderNeonSite,
    features: ["רקע גרדיאנט ניאוני (סגול/ורוד/תכלת) שזז לאט וברציפות", "סמן עכבר מותאם אישית עם התפוצצות חלקיקים בלחיצה", "כותרות שנפתחות מילה-אחר-מילה בגלילה", "מתאים לסוכנויות דיגיטל ומותגי קריאייטיב מובילים"], tags: ["dark", "effects"] },
  "chaos": { label: "הכאוס המאורגן", category: "קטלוג ומכירות", categorySlug: "shop", desc: "טיפוגרפיה ענקית, גרדיאנטים חומציים, גלילה אופקית וכפתורים מגנטיים", thumb: "images/previews/site-chaos.webp", render: renderChaosSite,
    features: ["גלילה אופקית ייחודית לתצוגת שירותים/מוצרים", "כפתורים מגנטיים שנמשכים אחרי העכבר", "תמונות עם אפקט עיוות (distortion) בריחוף", "מתאים למותגי אופנה, אמנים ופורטפוליו נועז"], tags: ["hscroll", "effects"] },
  "luxury3d": { label: "יוקרה מינימליסטית תלת-ממדית", category: "אירועים ובוטיק", categorySlug: "events", desc: "פרלקס תלת-ממדי עמוק, גווני פנינה וזהב חיוור, ומעבר כניסה בסגנון עדשת מצלמה", thumb: "images/previews/site-luxury3d.webp", render: renderLuxurySite,
    features: ["אפקט פרלקס תלת-ממדי עם שכבות תמונה וטקסט נעות", "מעבר כניסה אלגנטי בסגנון פתיחת עדשת מצלמה", "טיפוגרפיה עדינה וגווני פנינה וזהב חיוור", "מתאים לאדריכלים, נדל\"ן יוקרתי ומוצרי פרימיום"], tags: ["effects"] },
  "playground": { label: "מגרש המשחקים הפיזיקלי", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "בועות שירותים עם פיזיקה אמיתית שאפשר לגרור ולזרוק, כותרת מסך-גרדיאנט וכפתור נוזלי", thumb: "images/previews/site-playground.webp", render: renderPlaygroundSite,
    features: ["בועות שירותים עם מנוע פיזיקה אמיתי — גוררים, זורקים, מתנגשות", "כותרת ענק עם גרדיאנט צבעוני זז שמוסתר בתוך הטקסט", "כפתור ראשי עם אפקט עיוות נוזלי בריחוף", "מתאים למותגים צעירים, סדנאות והרצאות מרימות אנרגיה"], tags: ["dark", "effects"] },
};

/* "Smart search" filter checkboxes on the catalog page (sites.html) —
   cross-cutting attributes that don't map to the category tabs above,
   each grounded in something real about the template's own code (not
   just marketing copy), so a checked filter always matches what the
   customer actually gets:
   - hscroll: a scroll-jacking horizontal services/products rail
     (local-service, chaos — see their ls-hscroll-/oc-hscroll- CSS classes)
   - dark: a genuinely dark body background, not just a dark hero
   - video: actually wires up d.heroVideoBg (most templates ignore it)
   - effects: real interactive JS beyond the shared scroll-reveal — a
     mouse-follow glow/cursor, live physics, or scroll-linked parallax
   - rail: a fixed vertical side navigation rail instead of a top navbar */
const SITE_FILTER_TAGS = {
  hscroll: "גלילה אופקית לשירותים/מוצרים",
  dark: "עיצוב כהה (Dark Mode)",
  video: "תומך בווידאו רקע בכותרת",
  effects: "אפקטים אינטראקטיביים מתקדמים",
  rail: "ניווט צדדי אנכי",
};
