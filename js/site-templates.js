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
  `;
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
      </div></section>
      <section class="ls-section"><div class="container">
        <div class="head"><span class="eyebrow">מה אנחנו מציעים</span><h2>השירותים שלנו</h2>
        ${showSearch ? searchBoxHtml("#ls-services-grid", "חיפוש שירות...") : ""}</div>
        <div class="ls-services" id="ls-services-grid">${dd._services.map((s, i) => `
          <div class="ls-card" data-search="${escapeHtmlS((s.name || "") + " " + (s.desc || ""))}"><div class="num">${String(i + 1).padStart(2, "0")}</div><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price-tag">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
        ${showSearch ? searchScriptHtml() : ""}
      </div></section>
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
        <span class="eyebrow">${dd.tagline ? "ברוכים הבאים" : "פרילנסר / יועץ"}</span>
        <div class="fr-name">${escapeHtmlS(dd.businessName)}</div>
        <div class="fr-role">${escapeHtmlS(dd.tagline)}</div>
      </section>
      <div class="fr-body">
        <p class="fr-about">${nl2brS(dd.about)}</p>
        <div class="fr-tags">${services.map((s) => `<span class="fr-tag">${escapeHtmlS(s.name)}</span>`).join("")}</div>
      </div>
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
      ${(!d.pages || !d.pages.about) ? `<div class="cat-about">${nl2brS(dd.about)}</div>` : ""}
    `;
  }
  const titles = { index: dd.businessName, about: `אודות — ${dd.businessName}`, contact: `יצירת קשר — ${dd.businessName}` };
  return siteDoc({ title: titles[page], description: dd.tagline, css }, `${nav}${main}${footer}`);
}

const SITE_TEMPLATES = {
  "local-service": { label: "עסק שירות מקומי", render: renderLocalServiceSite },
  "freelancer": { label: "פרילנסר / יועץ", render: renderFreelancerSite },
  "catalog": { label: "קטלוג קטן", render: renderCatalogSite },
};
