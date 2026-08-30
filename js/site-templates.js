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
function waLink(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "").replace(/^0/, "972");
  return digits ? `https://wa.me/${digits}` : "";
}
function siteFontImport() {
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=Frank+Ruhl+Libre:wght@500;700;900&display=swap" rel="stylesheet">`;
}
function siteBaseCss() {
  return `
    * { box-sizing: border-box; }
    body { margin:0; font-family:'Heebo',Arial,sans-serif; color:#1E1E1E; line-height:1.6; }
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
function waFabHtml(d) {
  const href = waLink(d.whatsapp || d.phone);
  return href ? `<a class="wa-fab" href="${href}" target="_blank" rel="noopener" aria-label="וואטסאפ">💬</a>` : "";
}
function servicesData(d) {
  return (d.services || []).filter((s) => s.name && s.name.trim());
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
  if (d.pages && d.pages.contact && page !== "contact") return { href: "contact.html", label: "יצירת קשר", external: false };
  return null;
}
function ctaHtml(cta, cls) {
  if (!cta) return "";
  return `<a class="${cls}" href="${escapeHtmlS(cta.href)}"${cta.external ? ' target="_blank" rel="noopener"' : ""}>${escapeHtmlS(cta.label)}</a>`;
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
${siteFontImport()}
<style>${siteBaseCss()}${head.css}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/* ---------- Template 1: local service business ---------- */
function renderLocalServiceSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const css = `
    .ls-header { background:#fff; border-bottom:1px solid #EEE; padding:16px 0; }
    .ls-header .row { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
    .ls-header .biz { font-family:'Frank Ruhl Libre',serif; font-size:20px; font-weight:700; color:#${pal.primaryDark}; }
    .ls-header .phone { font-size:13.5px; font-weight:700; color:#${pal.primaryDark}; background:#${pal.ice}; padding:9px 18px; border-radius:20px; }
    .ls-nav { display:flex; gap:18px; }
    .ls-nav a { font-size:13.5px; font-weight:600; color:#555; }
    .ls-nav a.active { color:#${pal.primaryDark}; }

    .ls-hero { position:relative; overflow:hidden; text-align:center; color:#fff; padding:100px 0 112px;
      background: radial-gradient(circle at 22% 20%, rgba(255,255,255,.18), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark} 0%, #${pal.primary} 60%, #${pal.primaryDark} 130%); }
    .ls-hero .eyebrow { background:rgba(255,255,255,.16); color:#fff; margin-bottom:20px; }
    .ls-hero h1 { font-family:'Frank Ruhl Libre',serif; font-size:48px; font-weight:700; margin:0 0 18px; line-height:1.25; }
    .ls-hero p { font-size:18px; opacity:.92; max-width:560px; margin:0 auto 34px; }
    .ls-cta { display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:800; padding:16px 38px; border-radius:30px; font-size:15.5px; box-shadow:0 14px 30px rgba(0,0,0,.28); }

    .ls-section { padding:68px 0; }
    .ls-section .head { text-align:center; margin-bottom:28px; }
    .ls-section .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:14px; }
    .ls-section h2 { font-family:'Frank Ruhl Libre',serif; font-size:32px; color:#${pal.primaryDark}; margin:0 0 20px; }
    .ls-services { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:22px; }
    .ls-card { border:1px solid #EFEFEF; border-radius:16px; padding:28px; background:#fff; box-shadow:0 12px 28px rgba(0,0,0,.06); }
    .ls-card .num { width:36px; height:36px; border-radius:50%; background:#${pal.ice}; color:#${pal.primaryDark};
      display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; margin-bottom:16px; }
    .ls-card h3 { margin:0 0 8px; font-size:18px; color:#${pal.primaryDark}; font-weight:700; }
    .ls-card p { margin:0 0 12px; font-size:14px; color:#666; }
    .ls-card .price-tag { font-weight:800; color:#${pal.primary}; font-size:16px; }

    .ls-about { background:#${pal.ice}; padding:68px 0; }
    .ls-about .container { max-width:720px; text-align:center; }
    .ls-about h2 { font-family:'Frank Ruhl Libre',serif; font-size:28px; color:#${pal.primaryDark}; margin:14px 0 18px; }
    .ls-about p { font-size:16.5px; color:#3a3a3a; }

    .ls-contact { background:linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary}); color:#fff; padding:60px 0; text-align:center; }
    .ls-contact h2 { font-family:'Frank Ruhl Libre',serif; font-size:28px; margin:0 0 22px; }
    .ls-contact .line { font-size:15.5px; margin-bottom:8px; opacity:.94; }
    .ls-footer { padding:22px 0; text-align:center; font-size:12px; color:#999; }
  `;
  const header = `
    <header class="ls-header"><div class="container row">
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav class="ls-nav">${navLinksHtml}</nav>` : ""}
      ${d.phone ? `<a class="phone" href="tel:${escapeHtmlS(d.phone)}">${escapeHtmlS(d.phone)}</a>` : ""}
    </div></header>`;
  const footer = `<div class="ls-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="ls-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1 style="font-size:36px;">${escapeHtmlS(dd.businessName)}</h1>
      </div></section>
      <section class="ls-about" style="padding:64px 0;"><div class="container"><p>${nl2brS(dd.about)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="ls-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1 style="font-size:36px;">יצירת קשר</h1>
      </div></section>
      <section class="ls-contact"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="ls-cta" style="margin-top:10px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    main = `
      <section class="ls-hero"><div class="container">
        <span class="eyebrow">שירות מקצועי ואמין</span>
        <h1>${escapeHtmlS(dd.businessName)}</h1>
        <p>${escapeHtmlS(dd.tagline)}</p>
        ${ctaHtml(cta, "ls-cta")}
        ${d.heroImage ? `<img class="site-hero-photo" src="${d.heroImage}" alt="">` : ""}
      </div></section>
      <section class="ls-section"><div class="container">
        <div class="head"><span class="eyebrow">מה אנחנו מציעים</span><h2>השירותים שלנו</h2>
        ${showSearch ? searchBoxHtml("#ls-services-grid", "חיפוש שירות...") : ""}</div>
        <div class="ls-services" id="ls-services-grid">${dd._services.map((s, i) => `
          <div class="ls-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><div class="num">${String(i + 1).padStart(2, "0")}</div><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price-tag">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="ls-section" style="padding-top:0;"><div class="container">
        <div class="head"><span class="eyebrow">סרטון</span><h2>הכירו אותנו</h2></div>
        ${videoEmbedHtml(embedSrc)}
      </div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="ls-about"><div class="container"><span class="eyebrow" style="background:#fff; color:#${pal.primaryDark};">מי אנחנו</span><h2>קצת עלינו</h2><p>${nl2brS(dd.about)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="ls-contact"><div class="container">
        <h2>יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 2: freelancer / consultant ---------- */
function renderFreelancerSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
  const navBar = navLinksHtml ? `<div class="fr-nav"><div class="container row"><span class="fr-nav-name">${escapeHtmlS(dd.businessName)}</span><nav>${navLinksHtml}</nav></div></div>` : "";
  const footer = `<div class="fr-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="fr-hero" style="padding:70px 24px 54px;">
        <span class="eyebrow">מי אני</span>
        <div class="fr-name" style="font-size:34px;">${escapeHtmlS(dd.businessName)}</div>
      </section>
      <div class="fr-body"><p class="fr-about">${nl2brS(dd.about)}</p></div>`;
  } else if (page === "contact") {
    main = `
      <section class="fr-hero" style="padding:70px 24px 54px;">
        <span class="eyebrow">נשמח לשמוע מכם</span>
        <div class="fr-name" style="font-size:34px;">יצירת קשר</div>
      </section>
      <section class="fr-cta">
        <h2>בואו נדבר</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
        ${!wa && !d.email && !d.phone ? `<p style="opacity:.85;">פרטו כאן דרכי יצירת קשר.</p>` : ""}
      </section>`;
  } else {
    const services = dd._services;
    main = `
      <section class="fr-hero">
        ${d.heroImage ? `<img class="site-hero-photo round" src="${d.heroImage}" alt="">` : ""}
        <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "פרילנסר / יועץ"}</span>
        <div class="fr-name">${escapeHtmlS(dd.businessName)}</div>
        <div class="fr-role">${escapeHtmlS(dd.tagline)}</div>
      </section>
      <div class="fr-body">
        <p class="fr-about">${nl2brS(dd.about)}</p>
        <div class="fr-tags">${services.map((s) => `<span class="fr-tag">${escapeHtmlS(s.name)}</span>`).join("")}</div>
      </div>
      ${embedSrc ? `<div class="fr-body" style="padding-top:0;">${videoEmbedHtml(embedSrc)}</div>` : ""}
      <section class="fr-cta">
        <h2>בואו נדבר</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
      </section>
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${navBar}${main}${footer}`);
}

/* ---------- Template 3: small catalog / shop ---------- */
function renderCatalogSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
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
        <span class="eyebrow">מי אנחנו</span><h1>${escapeHtmlS(dd.businessName)}</h1>
      </div></section>
      <div class="container"><div class="cat-about" style="padding:48px 0;">${nl2brS(dd.about)}</div></div>`;
  } else if (page === "contact") {
    main = `
      <section class="cat-title" style="padding:56px 0 48px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1>יצירת קשר</h1>
      </div></section>
      <section class="cat-info"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="wa-link" style="display:inline-block; margin-top:10px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const services = dd._services;
    const showSearch = services.length >= 3;
    main = `
      <section class="cat-title"><div class="container">
        <span class="eyebrow">קטלוג המוצרים שלנו</span>
        <h1>${escapeHtmlS(dd.businessName)}</h1>
        <p>${escapeHtmlS(dd.tagline)}</p>
        <div class="stats">${services.length} מוצרים/שירותים זמינים</div>
        ${d.heroImage ? `<img class="site-hero-photo" src="${d.heroImage}" alt="">` : ""}
      </div></section>
      <div class="container">
        ${showSearch ? searchBoxHtml("#cat-grid", "חיפוש מוצר או שירות...") : ""}
        <div class="cat-grid" id="cat-grid">${services.map((s) => `
          <div class="cat-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><div class="swatch-bar"></div><div class="body">
            <h3>${escapeHtmlS(s.name)}</h3>
            ${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div></div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div>
      ${embedSrc ? `<div class="container"><div style="padding:36px 0;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<div class="cat-about">${nl2brS(dd.about)}</div>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${nav}${main}${footer}`);
}

/* ---------- Template 4: modern gallery / editorial ---------- */
function renderGallerySite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = !!d.heroImage;
  const css = `
    .gl-nav { background:#fff; padding:18px 0; }
    .gl-nav .row { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
    .gl-nav .biz { font-family:'Frank Ruhl Libre',serif; font-weight:700; font-size:18px; color:#${pal.primaryDark}; }
    .gl-nav nav { display:flex; gap:22px; }
    .gl-nav nav a { font-size:13px; font-weight:600; color:#555; }
    .gl-nav nav a.active { color:#${pal.primaryDark}; text-decoration:underline; text-underline-offset:5px; }

    .gl-hero { position:relative; min-height:56vh; display:flex; align-items:flex-end; overflow:hidden; }
    .gl-hero.has-photo { background-size:cover; background-position:center; }
    .gl-hero.no-photo { background:linear-gradient(160deg, #${pal.ice}, #fff); min-height:auto; padding:90px 0 70px; }
    .gl-hero.has-photo::after { content:""; position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,.74)); }
    .gl-hero-inner { position:relative; z-index:1; padding:54px 0; width:100%; }
    .gl-hero.has-photo .gl-hero-inner { color:#fff; }
    .gl-hero.no-photo .gl-hero-inner { color:#1E1E1E; text-align:center; }
    .gl-eyebrow { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding-top:8px; border-top:2px solid currentColor; margin-bottom:16px; }
    .gl-title { font-family:'Frank Ruhl Libre',serif; font-weight:900; font-size:52px; line-height:1.08; margin:0 0 16px; max-width:700px; }
    .gl-hero.no-photo .gl-title { margin-inline:auto; }
    .gl-tagline { font-size:16.5px; max-width:460px; opacity:.92; margin:0 0 26px; }
    .gl-hero.no-photo .gl-tagline { margin-inline:auto; }
    .gl-cta { display:inline-block; background:#${pal.primary}; color:#fff; font-weight:700; padding:14px 32px; border-radius:4px; font-size:14.5px; }

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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="gl-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="gl-about"><div class="container">
        <blockquote>${nl2brS(dd.about)}</blockquote>
        <cite>${escapeHtmlS(dd.businessName)}</cite>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="gl-contact"><div class="container">
        <h2>יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת ליצירת קשר.</div>`}
        ${wa ? `<a class="gl-cta" style="margin-top:14px;" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
      </div></section>`;
  } else {
    const showSearch = dd._services.length >= 3;
    const heroStyle = hasPhoto ? ` style="background-image:url('${d.heroImage}');"` : "";
    main = `
      <section class="gl-hero ${hasPhoto ? "has-photo" : "no-photo"}"${heroStyle}><div class="container gl-hero-inner">
        <span class="gl-eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק מקצועי"}</span>
        <h1 class="gl-title">${escapeHtmlS(dd.businessName)}</h1>
        <p class="gl-tagline">${escapeHtmlS(dd.tagline)}</p>
        ${ctaHtml(cta, "gl-cta")}
      </div></section>
      <section class="gl-section"><div class="container">
        <div class="gl-section-head"><div><span class="gl-kicker">מה אנחנו מציעים</span><h2>השירותים שלנו</h2></div>
        ${showSearch ? searchBoxHtml("#gl-bento", "חיפוש שירות...") : ""}</div>
        <div class="gl-bento" id="gl-bento">${dd._services.map((s) => `
          <div class="gl-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 40px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="gl-about"><div class="container"><blockquote>${nl2brS(dd.about)}</blockquote><cite>${escapeHtmlS(dd.businessName)}</cite></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="gl-contact"><div class="container">
        <h2>יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 5: bold / neo-brutalist ---------- */
function renderBoldSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="nb-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `<section class="nb-about last"><div class="container"><p>${nl2brS(dd.about)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="nb-hero last"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span>
        <h1 style="font-size:34px;">יצירת קשר</h1>
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
        <h1>${escapeHtmlS(dd.businessName)}</h1>
        <p>${escapeHtmlS(dd.tagline)}</p>
        ${ctaHtml(cta, "nb-cta")}
        ${d.heroImage ? `<img class="nb-hero-photo" src="${d.heroImage}" alt="">` : ""}
      </div></section>
      <section class="nb-section"><div class="container">
        <div class="nb-section-head"><span class="nb-tag">מה אנחנו מציעים</span><h2>השירותים שלנו</h2>
        ${showSearch ? searchBoxHtml("#nb-grid", "חיפוש שירות...") : ""}</div>
        <div class="nb-grid" id="nb-grid">${dd._services.map((s) => `
          <div class="nb-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<section class="nb-section"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="nb-about"><div class="container"><p>${nl2brS(dd.about)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="nb-contact last"><div class="container">
        ${dd._hasContact ? `
          ${d.phone ? `<span class="line">טלפון: ${escapeHtmlS(d.phone)}</span>` : ""}
          ${d.email ? `<span class="line">מייל: ${escapeHtmlS(d.email)}</span>` : ""}
          ${d.address ? `<span class="line">כתובת: ${escapeHtmlS(d.address)}</span>` : ""}
        ` : `<p>פרטו כאן טלפון, מייל וכתובת.</p>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 6: elegant split-hero (events / boutique) ---------- */
function renderElegantSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const cta = primaryCtaHref(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const hasPhoto = !!d.heroImage;
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
    .eg-hero-photo-wrap img { width:100%; aspect-ratio:4/5; object-fit:cover; }
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="eg-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <div class="container"><div class="eg-rule" style="margin:36px auto 0;"></div></div>
      <section class="eg-about"><div class="container"><blockquote>${nl2brS(dd.about)}</blockquote></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="eg-contact"><div class="container">
        <span class="eg-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-size:30px; margin:12px 0 26px;">יצירת קשר</h2>
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
            <h1>${escapeHtmlS(dd.businessName)}</h1>
            <p>${escapeHtmlS(dd.tagline)}</p>
            ${ctaHtml(cta, "eg-cta")}
          </div>
          <div class="eg-hero-photo-wrap"><img src="${d.heroImage}" alt=""></div>
        ` : `
          <div class="eg-hero-text">
            <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "עסק בוטיק"}</span>
            <h1>${escapeHtmlS(dd.businessName)}</h1>
            <p>${escapeHtmlS(dd.tagline)}</p>
            ${ctaHtml(cta, "eg-cta")}
          </div>
        `}
      </div></section>
      <section class="eg-section" style="padding-top:0;"><div class="container">
        <div class="eg-section-head"><span class="eg-kicker">מה אנחנו מציעים</span><h2>השירותים שלנו</h2>
        ${showSearch ? searchBoxHtml("#eg-offerings", "חיפוש שירות...") : ""}</div>
        <div class="eg-offerings" id="eg-offerings">${dd._services.map((s) => `
          <div class="eg-offer" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}">
            <div class="eg-offer-main"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}</div>
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="eg-about"><div class="container"><span class="eg-kicker">מי אנחנו</span><blockquote style="margin-top:18px;">${nl2brS(dd.about)}</blockquote></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="eg-contact"><div class="container">
        <span class="eg-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-size:30px; margin:12px 0 26px;">יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 7: process / how-we-work ---------- */
function renderProcessSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="pr-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="pr-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">מי אנחנו</span><h1 style="font-size:36px;">${escapeHtmlS(dd.businessName)}</h1>
      </div></section>
      <section class="pr-about"><div class="container"><p>${nl2brS(dd.about)}</p></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="pr-hero" style="padding:70px 0 54px;"><div class="container">
        <span class="eyebrow">נשמח לשמוע מכם</span><h1 style="font-size:36px;">יצירת קשר</h1>
      </div></section>
      <section class="pr-contact"><div class="container">
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
        <h1>${escapeHtmlS(dd.businessName)}</h1>
        <p>${escapeHtmlS(dd.tagline)}</p>
        ${ctaHtml(cta, "pr-cta")}
        ${d.heroImage ? `<img class="site-hero-photo" src="${d.heroImage}" alt="">` : ""}
      </div></section>
      <section class="pr-steps"><div class="container">
        <div class="pr-steps-head"><span class="eyebrow">התהליך שלנו</span><h2>שלב אחר שלב</h2>
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
      ${(!d.pages || !d.pages.about) ? `<section class="pr-about"><div class="container"><span class="eyebrow">מי אנחנו</span><p>${nl2brS(dd.about)}</p></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="pr-contact"><div class="container">
        <h2>יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 8: creative portfolio (personal) ---------- */
function renderPortfolioSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
    .po-work-idx { font-size:14px; font-weight:800; color:#${pal.primary}; }
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="po-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="po-work" style="padding-top:44px;"><div class="container" style="max-width:680px;">
        <div class="po-work-head"><span class="kicker">מי אני</span><h2>${escapeHtmlS(dd.businessName)}</h2></div>
        <p style="font-size:16px; line-height:1.85; color:#333;">${nl2brS(dd.about)}</p>
      </div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="po-cta">
        <h2>בואו נדבר</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
        ${!wa && !d.email && !d.phone ? `<p style="opacity:.85;">פרטו כאן דרכי יצירת קשר.</p>` : ""}
      </section>`;
  } else {
    const services = dd._services;
    main = `
      <section class="po-hero"><div class="container" style="display:grid; grid-template-columns:${d.heroImage ? "1fr auto" : "1fr"}; align-items:center; gap:36px;">
        <div>
          <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "תיק עבודות"}</span>
          <h1>${escapeHtmlS(dd.businessName)}</h1>
          <p>${escapeHtmlS(dd.tagline)}</p>
          ${ctaHtml(cta, "po-work-idx")}
        </div>
        ${d.heroImage ? `<img class="po-hero-photo" src="${d.heroImage}" alt="">` : ""}
      </div></section>
      <section class="po-work"><div class="container">
        <div class="po-work-head"><span class="kicker">מה אני עושה</span><h2>עבודות ושירותים</h2></div>
        ${services.map((s, i) => `
          <div class="po-work-row">
            <div class="po-work-idx">${String(i + 1).padStart(2, "0")}</div>
            <div class="po-work-main"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}</div>
            ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
          </div>`).join("")}
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="po-work" style="padding-top:0;"><div class="container" style="max-width:680px;"><div class="po-work-head"><span class="kicker">מי אני</span><h2>עליי</h2></div><p style="font-size:15.5px; line-height:1.85; color:#333;">${nl2brS(dd.about)}</p></div></section>` : ""}
      <section class="po-cta">
        <h2>בואו נדבר</h2>
        ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
        ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
        ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
      </section>
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`);
}

/* ---------- Template 9: boutique shop with a featured item (shop) ---------- */
function renderBoutiqueSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
    .bq-banner img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(.55); }
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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<div class="bq-pagenav">${navLinksHtml}</div>` : ""}
      ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
    </div></nav>`;
  const footer = `<footer class="bq-footer">
      ${d.phone ? `${escapeHtmlS(d.phone)} · ` : ""}${d.email ? `${escapeHtmlS(d.email)} · ` : ""}${d.address ? escapeHtmlS(d.address) : ""}
    </footer>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `
      <section class="bq-banner bq-banner-noimg"><div class="bq-banner-inner"><span class="eyebrow">מי אנחנו</span><h1>${escapeHtmlS(dd.businessName)}</h1></div></section>
      <div class="container"><div class="bq-about" style="padding-top:48px;">${nl2brS(dd.about)}</div></div>`;
  } else if (page === "contact") {
    main = `
      <section class="bq-banner bq-banner-noimg"><div class="bq-banner-inner"><span class="eyebrow">נשמח לשמוע מכם</span><h1>יצירת קשר</h1></div></section>
      <section class="bq-info"><div class="container">
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
      <section class="bq-banner ${d.heroImage ? "" : "bq-banner-noimg"}">
        ${d.heroImage ? `<img src="${d.heroImage}" alt="">` : ""}
        <div class="bq-banner-inner">
          <span class="eyebrow">חנות בוטיק</span>
          <h1>${escapeHtmlS(dd.businessName)}</h1>
          <p>${escapeHtmlS(dd.tagline)}</p>
        </div>
      </section>
      <div class="container">
        <section class="bq-featured"><div class="bq-featured-card">
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
      ${(!d.pages || !d.pages.about) ? `<div class="bq-about">${nl2brS(dd.about)}</div>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${nav}${main}${footer}`);
}

/* ---------- Template 10: dark luxury (events / boutique) ---------- */
function renderNoirSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
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
    .nr-hero img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(.38); z-index:0; }
    .nr-hero::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 20%, rgba(255,255,255,.06), transparent 60%); z-index:0; }
    .nr-hero-inner { position:relative; z-index:1; }
    .nr-hero .eyebrow { background:none; border:1px solid #${pal.ice}; color:#${pal.ice}; }
    .nr-hero h1 { font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:48px; margin:20px 0 12px; color:#fff; }
    .nr-hero p { font-size:15.5px; color:#C9C4B8; max-width:460px; margin:0 auto 30px; }
    .nr-cta { display:inline-block; border:1px solid #${pal.ice}; color:#${pal.ice}; font-weight:600; font-size:13px; letter-spacing:.05em; padding:14px 32px; }

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
      <div class="biz">${escapeHtmlS(dd.businessName)}</div>
      ${navLinksHtml ? `<nav>${navLinksHtml}</nav>` : ""}
    </div></header>`;
  const footer = `<div class="nr-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}`;

  let main;
  if (page === "about") {
    main = `<section class="nr-about"><div class="container"><span class="nr-kicker">מי אנחנו</span><blockquote style="margin-top:16px;">${nl2brS(dd.about)}</blockquote></div></section>`;
  } else if (page === "contact") {
    main = `
      <section class="nr-contact"><div class="container">
        <span class="nr-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:28px; margin:12px 0 26px; color:#fff;">יצירת קשר</h2>
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
        ${d.heroImage ? `<img src="${d.heroImage}" alt="">` : ""}
        <div class="nr-hero-inner">
          <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "אירוע ובוטיק"}</span>
          <h1>${escapeHtmlS(dd.businessName)}</h1>
          <p>${escapeHtmlS(dd.tagline)}</p>
          ${ctaHtml(cta, "nr-cta")}
        </div>
      </section>
      <section class="nr-menu"><div class="container">
        <div class="nr-menu-head"><span class="nr-kicker">מה אנחנו מציעים</span><h2>השירותים שלנו</h2></div>
        <div class="nr-menu-list">${dd._services.map((s) => `
          <div class="nr-menu-row"><span class="name">${escapeHtmlS(s.name)}</span><span class="leader"></span>${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}</div>
          ${s.desc ? `<div class="nr-menu-desc">${escapeHtmlS(s.desc)}</div>` : ""}`).join("")}</div>
      </div></section>
      ${embedSrc ? `<div class="container"><div style="padding:0 0 50px;">${videoEmbedHtml(embedSrc)}</div></div>` : ""}
      ${(!d.pages || !d.pages.about) ? `<section class="nr-about"><div class="container"><span class="nr-kicker">מי אנחנו</span><blockquote style="margin-top:16px;">${nl2brS(dd.about)}</blockquote></div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? `<section class="nr-contact"><div class="container">
        <span class="nr-kicker">נשמח לשמוע מכם</span>
        <h2 style="font-family:'Frank Ruhl Libre',serif; font-style:italic; font-size:28px; margin:12px 0 26px; color:#fff;">יצירת קשר</h2>
        ${dd._hasContact ? `
          ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
          ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
          ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
        ` : `<div class="line">פרטו כאן טלפון, מייל וכתובת.</div>`}
      </div></section>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${header}${main}${footer}`).replace("<body>", '<body class="nr-body">');
}

/* Small reveal-on-scroll used only by this template: headings/cards start
   faded + shifted down and settle into place the first time they cross
   into view. Respects prefers-reduced-motion by simply never hiding
   anything in the first place, rather than hiding then trying to detect
   the media query in JS. */
function scrollRevealScript() {
  return `<script>
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("ag-in"); io.unobserve(entry.target); }
        });
      }, { threshold: 0.2 });
      document.querySelectorAll(".ag-reveal").forEach(function (el) { io.observe(el); });
    }
  </script>`;
}

/* ---------- Template 11: creative studio (asymmetric split hero, dark) ---------- */
function renderStudioSite(d, page) {
  page = page || "index";
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const dd = withFallback(d);
  const wa = waLink(d.whatsapp || d.phone);
  const navLinksHtml = siteNavLinks(d, page);
  const embedSrc = videoEmbedSrc(d.videoUrl);
  const inPageRail = !navLinksHtml && page === "index";
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
    .ag-hero-art img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
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
    .ag-avatar img { width:100%; height:100%; object-fit:cover; }
    .ag-hero-text .kicker { font-size:12px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#${pal.ice}; margin-bottom:14px; }
    .ag-hero-text h1 { font-size:58px; font-weight:800; letter-spacing:-.02em; line-height:1.02; margin:0 0 14px; }
    .ag-hero-text p { font-size:15.5px; color:#B7B6B0; max-width:380px; margin:0 0 30px; }
    .ag-cta { display:inline-flex; align-items:center; gap:8px; background:#${pal.primary}; color:#0C0C0E; font-weight:800; padding:13px 26px; border-radius:30px; font-size:14px; width:fit-content; }
    @media (max-width:760px) { .ag-hero { grid-template-columns:1fr; } .ag-hero-text { padding:48px 24px; } .ag-hero-text h1 { font-size:38px; } .ag-hero-art { min-height:260px; } }

    .ag-reveal { opacity:0; transform:translateY(18px); transition:opacity .7s ease, transform .7s ease; }
    .ag-reveal.ag-in { opacity:1; transform:translateY(0); }

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
  const footer = `<div class="ag-footer">© ${new Date().getFullYear()} ${escapeHtmlS(dd.businessName)}</div>${waFabHtml(d)}${navLinksHtml ? previewNavScript() : ""}${scrollRevealScript()}`;

  function contactBlock(heading) {
    return `
      <section class="ag-section" id="ag-contact"><div class="container ag-reveal">
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
      <section class="ag-section" style="border-top:none; padding-top:64px;"><div class="container ag-reveal">
        <span class="ag-kicker">נעים להכיר</span>
        <h2>${escapeHtmlS(dd.businessName)}</h2>
        <p class="ag-about-body">${nl2brS(dd.about)}</p>
      </div></section>`;
  } else if (page === "contact") {
    main = contactBlock("יצירת קשר").replace('style="border-top:none;', 'style="border-top:none; padding-top:64px;');
  } else {
    const services = dd._services;
    main = `
      <section class="ag-hero">
        <div class="ag-hero-art">
          ${d.heroImage ? `<img src="${d.heroImage}" alt="">` : `<div class="ag-blob"></div>`}
        </div>
        <div class="ag-hero-text">
          ${d.heroImage ? `<div class="ag-avatar"><img src="${d.heroImage}" alt=""></div>` : ""}
          <span class="kicker">${dd.tagline ? "ברוכים הבאים" : "סטודיו יצירתי"}</span>
          <h1>${escapeHtmlS(dd.businessName)}</h1>
          <p>${escapeHtmlS(dd.tagline)}</p>
          <a class="ag-cta" href="${wa || (d.email ? "mailto:" + d.email : inPageRail ? "#ag-contact" : "#")}"${wa ? ' target="_blank" rel="noopener"' : ""}>רוצה להכיר יותר? ‹</a>
        </div>
      </section>
      <section class="ag-section" id="ag-services" style="border-top:none;"><div class="container ag-reveal">
        <span class="ag-kicker">זה מה שהעסק שלך מקבל</span>
        <h2>השירותים שלנו</h2>
        <div class="ag-grid">${services.map((s) => `
          <div class="ag-cell"><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<span class="price">${escapeHtmlS(s.price)}</span>` : ""}</div>`).join("")}</div>
      </div></section>
      ${embedSrc ? `<section class="ag-section"><div class="container">${videoEmbedHtml(embedSrc)}</div></section>` : ""}
      ${(!d.pages || !d.pages.about) ? `
      <section class="ag-section" id="ag-about"><div class="container ag-reveal">
        <span class="ag-kicker">נעים להכיר</span>
        <h2>${escapeHtmlS(dd.businessName)}</h2>
        <p class="ag-about-body">${nl2brS(dd.about)}</p>
      </div></section>` : ""}
      ${(!d.pages || !d.pages.contact) ? contactBlock("יצירת קשר") : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${rail}${main}${footer}`).replace("<body>", '<body class="ag-body">');
}

const SITE_CATEGORIES = [
  { slug: "all", label: "הכל" },
  { slug: "service", label: "עסקי שירות" },
  { slug: "personal", label: "תדמית אישית" },
  { slug: "shop", label: "קטלוג ומכירות" },
  { slug: "creative", label: "עיצובי ויצירתי" },
  { slug: "events", label: "אירועים ובוטיק" },
];

const SITE_TEMPLATES = {
  "local-service": { label: "עסק שירות מקומי", category: "עסקי שירות", categorySlug: "service", desc: "Hero גדול, כרטיסי שירותים, וואטסאפ צף", thumb: "images/previews/site-local-service.webp", render: renderLocalServiceSite },
  "freelancer": { label: "פרילנסר / יועץ", category: "תדמית אישית", categorySlug: "personal", desc: "מינימלי וממורכז, מתאים למותג אישי", thumb: "images/previews/site-freelancer.webp", render: renderFreelancerSite },
  "catalog": { label: "קטלוג קטן", category: "קטלוג ומכירות", categorySlug: "shop", desc: "רשת מוצרים עם תגי מחיר וניווט עליון", thumb: "images/previews/site-catalog.webp", render: renderCatalogSite },
  "gallery": { label: "גלריה מודרנית", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "תמונה מלאה ברקע, עיצוב עיתונאי ואלגנטי", thumb: "images/previews/site-gallery.webp", render: renderGallerySite },
  "bold": { label: "נועז ומודרני", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "מסגרות עבות, צללים חדים, טיפוגרפיה גדולה", thumb: "images/previews/site-bold.webp", render: renderBoldSite },
  "elegant": { label: "אלגנטי ומעוצב", category: "אירועים ובוטיק", categorySlug: "events", desc: "טיפוגרפיה עדינה, תמונה מפוצלת, מתאים לאירועים ועסקי בוטיק", thumb: "images/previews/site-elegant.webp", render: renderElegantSite },
  "process": { label: "תהליך עבודה", category: "עסקי שירות", categorySlug: "service", desc: "ציר זמן ממוספר שמראה איך אתם עובדים, שלב אחר שלב", thumb: "images/previews/site-process.webp", render: renderProcessSite },
  "portfolio": { label: "תיק עבודות יצירתי", category: "תדמית אישית", categorySlug: "personal", desc: "כותרת אישית גדולה ורשימת עבודות ממוספרת, בסגנון פורטפוליו", thumb: "images/previews/site-portfolio.webp", render: renderPortfolioSite },
  "boutique": { label: "חנות בוטיק", category: "קטלוג ומכירות", categorySlug: "shop", desc: "מוצר מומלץ בכרטיס גדול, ואחריו רשת המוצרים הנוספים", thumb: "images/previews/site-boutique.webp", render: renderBoutiqueSite },
  "noir": { label: "יוקרתי כהה", category: "אירועים ובוטיק", categorySlug: "events", desc: "רקע כהה, טיפוגרפיה איטלקית עדינה, ורשימת שירותים בסגנון תפריט", thumb: "images/previews/site-noir.webp", render: renderNoirSite },
  "studio": { label: "סטודיו קריאייטיב", category: "עיצובי ויצירתי", categorySlug: "creative", desc: "הירו א-סימטרי כהה, ניווט צדי אנכי, וטקסטים שנכנסים באנימציה בגלילה", thumb: "images/previews/site-studio.webp", render: renderStudioSite },
};
