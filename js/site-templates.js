/* Renders a complete, standalone business-website HTML document from the
   wizard's data. Three structurally different templates (not just recolored
   copies of each other) share the same data shape, so the customer's own
   content, photo and color still make each result genuinely different from
   another business using the same template. Depends on derivePalette from
   js/color-utils.js (loaded before this file). */

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
  `;
}
function waFabHtml(d) {
  const href = waLink(d.whatsapp || d.phone);
  return href ? `<a class="wa-fab" href="${href}" target="_blank" rel="noopener" aria-label="וואטסאפ">💬</a>` : "";
}
function servicesData(d) {
  return (d.services || []).filter((s) => s.name && s.name.trim());
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
function renderLocalServiceSite(d) {
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const wa = waLink(d.whatsapp || d.phone);
  const services = servicesData(d);
  const css = `
    .ls-header { background:#fff; border-bottom:1px solid #EEE; padding:16px 0; }
    .ls-header .row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .ls-header .biz { font-family:'Frank Ruhl Libre',serif; font-size:20px; font-weight:700; color:#${pal.primaryDark}; }
    .ls-header .phone { font-size:13.5px; font-weight:700; color:#${pal.primaryDark}; background:#${pal.ice}; padding:9px 18px; border-radius:20px; }

    .ls-hero { position:relative; overflow:hidden; text-align:center; color:#fff; padding:100px 0 112px;
      background: radial-gradient(circle at 22% 20%, rgba(255,255,255,.18), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark} 0%, #${pal.primary} 60%, #${pal.primaryDark} 130%); }
    .ls-hero .eyebrow { background:rgba(255,255,255,.16); color:#fff; margin-bottom:20px; }
    .ls-hero h1 { font-family:'Frank Ruhl Libre',serif; font-size:48px; font-weight:700; margin:0 0 18px; line-height:1.25; }
    .ls-hero p { font-size:18px; opacity:.92; max-width:560px; margin:0 auto 34px; }
    .ls-cta { display:inline-block; background:#fff; color:#${pal.primaryDark}; font-weight:800; padding:16px 38px; border-radius:30px; font-size:15.5px; box-shadow:0 14px 30px rgba(0,0,0,.28); }

    .ls-section { padding:68px 0; }
    .ls-section .head { text-align:center; margin-bottom:40px; }
    .ls-section .eyebrow { background:#${pal.ice}; color:#${pal.primaryDark}; margin-bottom:14px; }
    .ls-section h2 { font-family:'Frank Ruhl Libre',serif; font-size:32px; color:#${pal.primaryDark}; margin:0; }
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
  const body = `
    <header class="ls-header"><div class="container row">
      <div class="biz">${escapeHtmlS(d.businessName)}</div>
      ${d.phone ? `<a class="phone" href="tel:${escapeHtmlS(d.phone)}">${escapeHtmlS(d.phone)}</a>` : ""}
    </div></header>
    <section class="ls-hero"><div class="container">
      <span class="eyebrow">שירות מקצועי ואמין</span>
      <h1>${escapeHtmlS(d.businessName)}</h1>
      ${d.tagline ? `<p>${escapeHtmlS(d.tagline)}</p>` : ""}
      ${wa ? `<a class="ls-cta" href="${wa}" target="_blank" rel="noopener">שליחת הודעה בוואטסאפ</a>` : ""}
    </div></section>
    ${services.length ? `<section class="ls-section"><div class="container">
      <div class="head"><span class="eyebrow">מה אנחנו מציעים</span><h2>השירותים שלנו</h2></div>
      <div class="ls-services">${services.map((s, i) => `
        <div class="ls-card"><div class="num">${String(i + 1).padStart(2, "0")}</div><h3>${escapeHtmlS(s.name)}</h3>${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}${s.price ? `<div class="price-tag">${escapeHtmlS(s.price)}</div>` : ""}</div>`).join("")}</div>
    </div></section>` : ""}
    ${d.about ? `<section class="ls-about"><div class="container"><span class="eyebrow" style="background:#fff; color:#${pal.primaryDark};">מי אנחנו</span><h2>קצת עלינו</h2><p>${nl2brS(d.about)}</p></div></section>` : ""}
    <section class="ls-contact"><div class="container">
      <h2>יצירת קשר</h2>
      ${d.phone ? `<div class="line">טלפון: ${escapeHtmlS(d.phone)}</div>` : ""}
      ${d.email ? `<div class="line">מייל: ${escapeHtmlS(d.email)}</div>` : ""}
      ${d.address ? `<div class="line">כתובת: ${escapeHtmlS(d.address)}</div>` : ""}
    </div></section>
    <div class="ls-footer">© ${new Date().getFullYear()} ${escapeHtmlS(d.businessName)}</div>
    ${waFabHtml(d)}
  `;
  return siteDoc({ title: d.businessName, description: d.tagline, css }, body);
}

/* ---------- Template 2: freelancer / consultant ---------- */
function renderFreelancerSite(d) {
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const wa = waLink(d.whatsapp || d.phone);
  const services = servicesData(d);
  const css = `
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
  const body = `
    <section class="fr-hero">
      <span class="eyebrow">${escapeHtmlS(d.tagline) ? "ברוכים הבאים" : "פרילנסר / יועץ"}</span>
      <div class="fr-name">${escapeHtmlS(d.businessName)}</div>
      ${d.tagline ? `<div class="fr-role">${escapeHtmlS(d.tagline)}</div>` : ""}
    </section>
    <div class="fr-body">
      ${d.about ? `<p class="fr-about">${nl2brS(d.about)}</p>` : ""}
      ${services.length ? `<div class="fr-tags">${services.map((s) => `<span class="fr-tag">${escapeHtmlS(s.name)}</span>`).join("")}</div>` : ""}
    </div>
    <section class="fr-cta">
      <h2>בואו נדבר</h2>
      ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
      ${d.email ? `<a class="btn" href="mailto:${escapeHtmlS(d.email)}">שליחת מייל</a>` : ""}
      ${d.phone ? `<a class="btn" href="tel:${escapeHtmlS(d.phone)}">התקשרות</a>` : ""}
    </section>
    <div class="fr-footer">© ${new Date().getFullYear()} ${escapeHtmlS(d.businessName)}</div>
    ${waFabHtml(d)}
  `;
  return siteDoc({ title: d.businessName, description: d.tagline, css }, body);
}

/* ---------- Template 3: small catalog / shop ---------- */
function renderCatalogSite(d) {
  const pal = derivePalette(d.primaryColor || "#1F5C4E");
  const wa = waLink(d.whatsapp || d.phone);
  const services = servicesData(d);
  const css = `
    .cat-nav { background:#fff; border-bottom:1px solid #EEE; padding:16px 0; }
    .cat-nav .row { display:flex; align-items:center; justify-content:space-between; }
    .cat-nav .biz { font-family:'Frank Ruhl Libre',serif; font-size:19px; font-weight:700; color:#${pal.primaryDark}; }
    .cat-nav a.wa-link { background:#${pal.primary}; color:#fff; padding:9px 18px; border-radius:20px; font-size:13px; font-weight:700; }

    .cat-title { position:relative; overflow:hidden; text-align:center; color:#fff; padding:70px 0 60px;
      background: radial-gradient(circle at 25% 25%, rgba(255,255,255,.16), transparent 55%),
                  linear-gradient(155deg, #${pal.primaryDark}, #${pal.primary} 75%); }
    .cat-title .eyebrow { background:rgba(255,255,255,.16); color:#fff; margin-bottom:16px; }
    .cat-title h1 { font-family:'Frank Ruhl Libre',serif; font-size:38px; margin:0 0 12px; }
    .cat-title p { font-size:15.5px; opacity:.92; margin:0 0 16px; }
    .cat-title .stats { font-size:13px; opacity:.85; }

    .cat-grid { padding:52px 0; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:22px; }
    .cat-card { border:1px solid #EEE; border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 12px 26px rgba(0,0,0,.06); }
    .cat-card .swatch-bar { height:6px; background:linear-gradient(90deg, #${pal.primary}, #${pal.primaryDark}); }
    .cat-card .body { padding:20px; }
    .cat-card h3 { margin:0 0 6px; font-size:16.5px; color:#${pal.primaryDark}; font-weight:700; }
    .cat-card p { margin:0 0 12px; font-size:13.5px; color:#666; }
    .cat-card .price { font-weight:800; color:#${pal.primary}; font-size:15.5px; }

    .cat-about { padding:24px 0 58px; text-align:center; max-width:640px; margin:0 auto; color:#3a3a3a; font-size:15.5px; }
    .cat-footer { background:#${pal.primaryDark}; color:#fff; padding:28px 0; text-align:center; font-size:13px; }
  `;
  const body = `
    <nav class="cat-nav"><div class="container row">
      <div class="biz">${escapeHtmlS(d.businessName)}</div>
      ${wa ? `<a class="wa-link" href="${wa}" target="_blank" rel="noopener">וואטסאפ</a>` : ""}
    </div></nav>
    <section class="cat-title"><div class="container">
      <span class="eyebrow">קטלוג המוצרים שלנו</span>
      <h1>${escapeHtmlS(d.businessName)}</h1>
      ${d.tagline ? `<p>${escapeHtmlS(d.tagline)}</p>` : ""}
      ${services.length ? `<div class="stats">${services.length} מוצרים/שירותים זמינים</div>` : ""}
    </div></section>
    ${services.length ? `<div class="container"><div class="cat-grid">${services.map((s) => `
      <div class="cat-card"><div class="swatch-bar"></div><div class="body">
        <h3>${escapeHtmlS(s.name)}</h3>
        ${s.desc ? `<p>${escapeHtmlS(s.desc)}</p>` : ""}
        ${s.price ? `<div class="price">${escapeHtmlS(s.price)}</div>` : ""}
      </div></div>`).join("")}</div></div>` : ""}
    ${d.about ? `<div class="cat-about">${nl2brS(d.about)}</div>` : ""}
    <footer class="cat-footer">
      ${d.phone ? `${escapeHtmlS(d.phone)} · ` : ""}${d.email ? `${escapeHtmlS(d.email)} · ` : ""}${d.address ? escapeHtmlS(d.address) : ""}
    </footer>
    ${waFabHtml(d)}
  `;
  return siteDoc({ title: d.businessName, description: d.tagline, css }, body);
}

const SITE_TEMPLATES = {
  "local-service": { label: "עסק שירות מקומי", render: renderLocalServiceSite },
  "freelancer": { label: "פרילנסר / יועץ", render: renderFreelancerSite },
  "catalog": { label: "קטלוג קטן", render: renderCatalogSite },
};
