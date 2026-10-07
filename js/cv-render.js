/* Renders a CV as an HTML string from {layout, font, palette, content, lang}.
   Shared by the live builder preview and the print/PDF output, so what the
   user sees while editing is exactly what they get in the exported file.

   Three layout systems (deliberately different from each other, not just
   recolored):
   - "sidebar": two-column, colored sidebar with avatar initials + chip skills
   - "bold": single column, oversized editorial name + numbered section badges
   - "classic-mono": quiet, refined, conservative — no chips, generous whitespace

   lang is "he" (RTL) or "en" (LTR) — mirrors layout direction and swaps
   section labels; content itself must already be in the matching language. */
const CV_DARK = "222222";
const CV_GREY = "5A5A5A";

const LABELS = {
  he: { contact: "פרטי קשר", skills: "כישורים", summary: "תקציר מקצועי", experience: "ניסיון תעסוקתי", education: "השכלה", projects: "פרויקטים" },
  en: { contact: "Contact", skills: "Skills", summary: "Professional Summary", experience: "Experience", education: "Education", projects: "Projects" },
};

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function bulletsToLis(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");
}
function splitParts(text) {
  return String(text || "").split("|").map((s) => s.trim()).filter(Boolean);
}
function initialsOf(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
function photoCircleHtml(photo, size) {
  return `<div style="width:${size}px; height:${size}px; border-radius:50%; overflow:hidden; flex:none;"><img src="${photo}" alt="תמונת פרופיל" style="width:100%; height:100%; object-fit:cover; display:block;"></div>`;
}

function sharedCss(tc, rtl) {
  return `
  /* flex-shrink:0 matters specifically inside the Shell's own canvas
     iframe (js/cv-builder-shell.js's cvbshellBuildCanvasHtml wraps this
     in body{display:flex; justify-content:center}, to center it) — a
     flex item's default flex-shrink:1 let the browser silently shrink
     this FIXED 794px design width down to whatever narrower space was
     available whenever the canvas pane itself was narrow, instead of
     cvbshellFitCanvas()'s own CSS transform:scale() doing that shrink
     visually while the real 794px layout (and therefore every line's
     wrap point) stayed intact. The shrunk real width reflowed every
     line of text at the wrong, much-narrower width — confirmed live as
     garbled, overlapping-looking text once the window wasn't wide
     enough. Harmless everywhere else .cv-doc is used (the off-screen
     PDF-export div, the plain preview) since flex-shrink only has any
     effect on an element that is itself a flex item in the first
     place. */
  .cv-doc { font-family: var(--cv-font); background:#fff; color:#${tc}; width:794px; flex-shrink:0; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.12); overflow:hidden; overflow-wrap:break-word; }
  .cv-doc h1, .cv-doc h2, .cv-doc .cv-jobtitle, .cv-doc .contact-line, .cv-doc .role { overflow-wrap:break-word; }
  /* padding-right/left here (not padding-inline-start) — see the
     timeline-dot comment in renderSidebar() below for why: html2canvas
     doesn't reliably resolve CSS logical properties, so every one of
     them anywhere inside what actually gets screenshotted was replaced
     with an explicit physical side computed from the already-known
     rtl flag. */
  .cv-doc ul { margin:0; padding-${rtl ? "right" : "left"}:20px; list-style:none; }
  .cv-doc li { position:relative; font-size:12.5px; color:#${tc}; line-height:1.6; }
  /* Drawn bullet instead of the native list marker: html2canvas paints
     native ::marker bullets on the LTR side regardless of dir="rtl", so a
     Hebrew PDF had every bullet floating at the far end of its line. A
     ::before dot with a physical right/left offset renders identically in
     the live preview and in the screenshot. top = (20px line - 5px)/2. */
  .cv-doc li::before { content:""; position:absolute; ${rtl ? "right" : "left"}:-13px; top:8px; width:5px; height:5px; border-radius:50%; background:currentColor; }
  .cv-doc .cv-jobtitle { font-weight:700; }
  .cv-doc .cv-dates { font-size:11px; font-style:italic; }
  .cv-doc .cv-summary { font-size:13px; line-height:1.65; margin:0; }
  .cv-doc .cv-link { font-size:11px; font-weight:600; }
`;
}

function chipHtml(text, chipBg, chipColor, chipFont) {
  // Fixed height with line-height equal to it (no vertical padding):
  // the text is centered by the line box itself. The previous
  // line-height:1 + 5px padding looked centered in the browser, but
  // line-height:1 is shorter than the font's own content area, and
  // html2canvas positions text from the font metrics rather than the
  // line box — the exported PDF showed the letters sliding out of the
  // bottom of their pill. A line box taller than the glyphs keeps both
  // renderers in agreement.
  return `<span style="display:inline-block; vertical-align:top; height:22px; line-height:22px; background:${chipBg}; color:${chipColor}; font-family:${chipFont || "inherit"}; font-size:11px; padding:0 12px; border-radius:11px; margin:0 0 6px 6px; white-space:nowrap;">${escapeHtml(text)}</span>`;
}
function projectsList(projects, primaryHex) {
  if (!projects || !projects.length) return "";
  return projects.map((p, i) => `
    <div style="margin-bottom:12px;" data-cv-project-idx="${i}">
      <div class="cv-jobtitle" style="font-size:13px;">${escapeHtml(p.title)}${p.link ? ` <span class="cv-link" style="color:#${primaryHex};">(${escapeHtml(p.link)})</span>` : ""}</div>
      <ul style="margin-top:4px;">${bulletsToLis(p.bullets)}</ul>
    </div>`).join("");
}

/* ---------------- Sidebar layout ---------------- */
function renderSidebar({ font, palette, content, lang, textColor }) {
  const tc = textColor || CV_DARK;
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const rtl = lang !== "en";
  const contactLines = splitParts(content.contact);
  const skillChips = splitParts(content.skills).map((s) => chipHtml(s, "rgba(255,255,255,.14)", "#fff")).join("");
  const jobsHtml = content.jobs.map((j, i) => `
    <div class="tl-item" style="padding-bottom:${i === content.jobs.length - 1 ? 0 : 20}px;" data-cv-job-idx="${i}">
      <div class="tl-dot" style="background:#${palette.primary};"></div>
      <div class="cv-jobtitle" style="font-size:13.5px; color:#${tc};">${escapeHtml(j.title)}</div>
      <div style="font-size:12px; color:#${palette.primary}; font-weight:600; margin-top:1px;">${escapeHtml(j.place)}</div>
      <div class="cv-dates" style="color:#${CV_GREY}; margin:2px 0 6px;">${escapeHtml(j.dates)}</div>
      <ul>${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${sharedCss(tc, rtl)}
    /* .cv-side used to rely on align-items:stretch (its background was
       the flex child's own) to reach .cv-main's full height — checked
       out fine in a plain live DOM render and the real Shell canvas
       iframe, but a reported live PDF export still showed the sidebar
       color falling short of the page's bottom edge. The first fix for
       that (a separate absolutely-positioned backing layer, kept in
       pixel sync with .cv-side's own real 307px box by hand) turned out
       to be its own source of html2canvas bugs: a thin white seam at
       the sidebar/main boundary, right where two independently-
       positioned layers have to land on the exact same pixel.
       box-sizing:border-box collapsed this back to ONE element that
       paints its own background over its own full box, and
       .cv-sidebar-wrap itself ALSO gets that same color here — a
       reported-live seam persisted even after that, which fits a
       different, well-documented html2canvas gap: sub-pixel rounding
       (scale:2 for retina quality) can leave a hairline gap between
       two adjacent flex children. Painting the PARENT the same color
       as .cv-side makes any such gap invisible regardless of which
       exact pixel it lands on, instead of chasing exact pixel sync a
       second time. */
    .cv-sidebar-wrap { position:relative; display:flex; flex-direction:${rtl ? "row-reverse" : "row"}; min-height:1123px; background:#${palette.primaryDark}; }
    .cv-side { position:relative; z-index:1; width:307px; box-sizing:border-box; flex:none; background:#${palette.primaryDark}; color:#fff; padding:36px 26px; text-align:center; }
    .cv-side .avatar { width:78px; height:78px; border-radius:50%; background:rgba(255,255,255,.16); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:26px; font-weight:700; color:#fff; }
    .cv-side h1 { font-size:21px; margin:0 0 4px; }
    .cv-side .role { font-size:12.5px; color:${"#" + palette.headerAccentText}; margin-bottom:18px; }
    .cv-side .sec-label { font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:${"#" + palette.headerAccentText}; text-align:${rtl ? "right" : "left"}; margin:20px 0 10px; opacity:.85; }
    .cv-side .contact-line { font-size:11.5px; text-align:${rtl ? "right" : "left"}; margin-bottom:8px; opacity:.92; word-break:break-word; }
    .cv-side .chips { text-align:${rtl ? "right" : "left"}; }
    .cv-main { position:relative; z-index:1; flex:1; padding:36px 30px; min-width:0; background:#fff; }
    .cv-main h2 { font-size:14px; color:#${palette.primary}; margin:0 0 12px; text-transform:uppercase; letter-spacing:.05em; }
    .cv-main h2:not(:first-child) { margin-top:26px; }
    .tl-wrap { position:relative; }
    /* Physical right/left here (not inset-inline-start/text-align:start)
       for the same reason as sharedCss()'s bullet padding above: a
       reported live PDF still showed these on the wrong side even
       after an earlier fix from inset-inline-end to inset-inline-start
       (confirmed correct, by direct pixel measurement, in BOTH a plain
       live DOM render and the real Shell canvas iframe) — the one
       render path neither of those checks can reach is html2canvas
       itself (CDN-blocked in this sandbox), which has known, widely-
       reported gaps in CSS logical-property support: it doesn't
       reliably read the element's own computed direction the way a
       real browser does, so inset-inline-start can silently resolve
       as if the page were always LTR regardless of dir="rtl". Physical
       right/left computed from the already-known rtl flag sidesteps
       that resolution step entirely — there's nothing left for
       html2canvas to get wrong. */
    .tl-wrap::before { content:""; position:absolute; ${rtl ? "right" : "left"}:4px; top:5px; bottom:5px; width:2px; background:#EAEAEA; }
    .tl-item { position:relative; padding-${rtl ? "right" : "left"}:20px; }
    .tl-dot { position:absolute; ${rtl ? "right" : "left"}:0px; top:3px; width:10px; height:10px; border-radius:50%; box-shadow:0 0 0 3px #fff; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-sidebar-wrap">
      <aside class="cv-side">
        ${content.photo ? `<div class="avatar avatar-photo">${photoCircleHtml(content.photo, 78)}</div>` : `<div class="avatar">${escapeHtml(initialsOf(content.name))}</div>`}
        <h1 data-cvkey="name">${escapeHtml(content.name)}</h1>
        <div class="role" data-cvkey="title">${escapeHtml(content.title)}</div>
        <div class="sec-label">${L.contact}</div>
        <div data-cvkey="contact">${contactLines.map((c) => `<div class="contact-line">${escapeHtml(c)}</div>`).join("")}</div>
        <div class="sec-label">${L.skills}</div>
        <div class="chips" data-cvkey="skills">${skillChips}</div>
      </aside>
      <main class="cv-main">
        <h2>${L.summary}</h2>
        <p class="cv-summary" data-cvkey="summary">${escapeHtml(content.summary)}</p>
        <h2>${L.experience}</h2>
        <div class="tl-wrap" data-cvsection="experience">${jobsHtml}</div>
        ${content.projects && content.projects.length ? `<h2>${L.projects}</h2><div data-cvsection="projects">${projectsList(content.projects, palette.primary)}</div>` : ""}
        <h2>${L.education}</h2>
        <p class="cv-summary" data-cvkey="education">${escapeHtml(content.education)}</p>
      </main>
    </div>
  </div>`;
}

/* ---------------- Bold editorial layout ---------------- */
function renderBold({ font, palette, content, lang, textColor }) {
  const tc = textColor || CV_DARK;
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const rtl = lang !== "en";
  const skillChips = splitParts(content.skills).map((s) => chipHtml(s, "#" + palette.ice, "#" + palette.primaryDark)).join("");
  let n = 0;
  const badge = () => { n += 1; return String(n).padStart(2, "0"); };
  const jobsHtml = content.jobs.map((j, i) => `
    <div style="margin-bottom:16px;" data-cv-job-idx="${i}">
      <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
        <span style="width:6px; height:6px; border-radius:50%; background:#${palette.primary}; display:inline-block;"></span>
        <span class="cv-jobtitle" style="font-size:14px;">${escapeHtml(j.title)}</span>
        <span style="font-size:12.5px; color:#${palette.primary}; font-weight:600;">${escapeHtml(j.place)}</span>
        <span class="cv-dates" style="color:#${CV_GREY};">${escapeHtml(j.dates)}</span>
      </div>
      <ul style="margin-top:6px;">${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${sharedCss(tc, rtl)}
    .cv-bold-head { position:relative; padding:44px 40px 26px; overflow:hidden; }
    /* Physical left/right (not inset-inline-end) — see renderSidebar()'s
       own timeline-dot comment for why: html2canvas doesn't reliably
       resolve CSS logical properties against the element's dir. */
    .cv-bold-head::before { content:""; position:absolute; ${rtl ? "left" : "right"}:-60px; top:-70px; width:220px; height:220px; border-radius:50%; background:#${palette.ice}; z-index:0; }
    .cv-bold-head .inner { position:relative; z-index:1; }
    .cv-bold-head h1 { font-size:46px; font-weight:700; margin:0; line-height:1.05; color:#${tc}; }
    .cv-bold-head .role-badge { display:inline-block; background:#${palette.primary}; color:#fff; font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px; margin-top:14px; }
    .cv-bold-head .contact { font-size:12px; color:#${CV_GREY}; margin-top:14px; }
    .cv-bold-body { padding:6px 40px 40px; }
    .cv-bold-body h2 { display:flex; align-items:center; gap:10px; font-size:15px; margin:24px 0 12px; color:#${tc}; }
    .cv-bold-body h2:first-child { margin-top:0; }
    .cv-bold-body h2 .n { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; background:#${palette.primary}; color:#fff; font-size:11px; font-weight:700; flex:none; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-bold-head">
      ${content.photo ? `<div style="position:absolute; z-index:2; top:28px; ${rtl ? "left" : "right"}:32px; box-shadow:0 8px 20px rgba(0,0,0,.15); border-radius:50%;">${photoCircleHtml(content.photo, 72)}</div>` : ""}
      <div class="inner">
        <h1 data-cvkey="name">${escapeHtml(content.name)}</h1>
        <span class="role-badge" data-cvkey="title">${escapeHtml(content.title)}</span>
        <div class="contact" data-cvkey="contact">${escapeHtml(content.contact)}</div>
      </div>
    </div>
    <div class="cv-bold-body">
      <h2><span class="n">${badge()}</span> ${L.summary}</h2>
      <p class="cv-summary" data-cvkey="summary">${escapeHtml(content.summary)}</p>
      <h2><span class="n">${badge()}</span> ${L.experience}</h2>
      <div data-cvsection="experience">${jobsHtml}</div>
      ${content.projects && content.projects.length ? `<h2><span class="n">${badge()}</span> ${L.projects}</h2><div data-cvsection="projects">${projectsList(content.projects, palette.primary)}</div>` : ""}
      <h2><span class="n">${badge()}</span> ${L.education}</h2>
      <p class="cv-summary" data-cvkey="education">${escapeHtml(content.education)}</p>
      <h2><span class="n">${badge()}</span> ${L.skills}</h2>
      <div data-cvkey="skills">${skillChips}</div>
    </div>
  </div>`;
}

/* ---------------- Classic / quiet layout ---------------- */
function renderClassicMono({ font, palette, content, lang, textColor }) {
  const tc = textColor || CV_DARK;
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const rtl = lang !== "en";
  let n = 0;
  const badge = () => { n += 1; return String(n).padStart(2, "0"); };
  const jobsHtml = content.jobs.map((j, i) => `
    <div style="margin-bottom:14px;" data-cv-job-idx="${i}">
      <div class="cv-row" style="font-size:13.5px;"><span class="cv-jobtitle">${escapeHtml(j.title)} — ${escapeHtml(j.place)}</span></div>
      <div class="cv-dates" style="color:#${CV_GREY}; margin:1px 0 6px;">${escapeHtml(j.dates)}</div>
      <ul>${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${sharedCss(tc, rtl)}
    .cv-cm-head { padding:40px 44px 22px; text-align:center; border-bottom:1px solid #E6E6E6; }
    .cv-cm-head h1 { font-size:28px; font-weight:700; margin:0; letter-spacing:.02em; color:#${tc}; }
    .cv-cm-head .role { font-size:13px; color:#${palette.primary}; margin-top:8px; letter-spacing:.05em; text-transform:uppercase; }
    .cv-cm-head .contact { font-size:11.5px; color:#${CV_GREY}; margin-top:10px; }
    .cv-cm-body { padding:28px 44px 44px; }
    .cv-cm-body h2 { display:flex; align-items:center; gap:10px; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase; color:#${tc}; margin:24px 0 12px; }
    .cv-cm-body h2:first-child { margin-top:0; }
    .cv-cm-body h2 .n { font-size:11px; color:#${palette.primary}; font-weight:700; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-cm-head">
      ${content.photo ? `<div style="margin:0 auto 14px; box-shadow:0 4px 14px rgba(0,0,0,.12); border-radius:50%; display:inline-block;">${photoCircleHtml(content.photo, 64)}</div>` : ""}
      <h1 data-cvkey="name">${escapeHtml(content.name)}</h1>
      <div class="role" data-cvkey="title">${escapeHtml(content.title)}</div>
      <div class="contact" data-cvkey="contact">${escapeHtml(content.contact)}</div>
    </div>
    <div class="cv-cm-body">
      <h2><span class="n">${badge()}</span> ${L.summary}</h2>
      <p class="cv-summary" data-cvkey="summary">${escapeHtml(content.summary)}</p>
      <h2><span class="n">${badge()}</span> ${L.experience}</h2>
      <div data-cvsection="experience">${jobsHtml}</div>
      ${content.projects && content.projects.length ? `<h2><span class="n">${badge()}</span> ${L.projects}</h2><div data-cvsection="projects">${projectsList(content.projects, palette.primary)}</div>` : ""}
      <h2><span class="n">${badge()}</span> ${L.education}</h2>
      <p class="cv-summary" data-cvkey="education">${escapeHtml(content.education)}</p>
      <h2><span class="n">${badge()}</span> ${L.skills}</h2>
      <p class="cv-summary" data-cvkey="skills">${escapeHtml(content.skills)}</p>
    </div>
  </div>`;
}

function renderCVHtml({ layout, font, palette, content, lang, textColor, isPro }) {
  const l = lang === "en" ? "en" : "he";
  const args = { font, palette, content, lang: l, textColor };
  let html;
  if (layout === "sidebar") html = renderSidebar(args);
  else if (layout === "bold") html = renderBold(args);
  else html = renderClassicMono(args);
  // Print-only credit line, real selectable text (not an image, not a
  // link) so ATS parsers read past it cleanly — hidden on screen, shown
  // only in the exported PDF via @media print in builder.css. Skipped
  // entirely for Pro accounts (customer_profiles.is_pro).
  const credit = isPro ? "" : `<div class="cv-pdf-credit">Created with DeskKit.co.il</div>`;
  return `<style>.cv-doc{--cv-font:${font};}</style>` + html + credit;
}

/* Same html2canvas+jsPDF off-screen-snapshot approach as quote-render.js's
   downloadQuotePdf / invoice-render.js's downloadInvoicePdf. This REPLACES
   the old window.print()-based export: @media print (css/builder.css) had
   to force #preview-doc's wrapper back to visible and reset the inline
   transform/height fitPreviewToContainer() applies for the on-screen
   scaled-down view, but even with that fixed, the print pass's own
   `width: 100% !important` resolved against the now-unconstrained page
   body (over 1400px on a real monitor) instead of .cv-doc's natural
   794px design width — confirmed live. A resume laid out ~1.8x wider
   than true A4 reflows into far fewer lines than it actually needs at
   real print width, so the page-count looked fine in isolated checks but
   broke in the real, width-dependent browser print pipeline — matching
   the repeated "2 pages, ugly" reports that survived multiple print-CSS
   fixes. Rendering into a fixed 794px-wide off-screen element and
   screenshotting it removes the dependency on @media print / page layout
   entirely, same as quote/invoice already do, and the shrink-to-fit math
   below guarantees a single page regardless of content length. */
async function downloadCvPdf() {
  if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) {
    renderPreview();
    window.print();
    return;
  }
  const tpl = CV_TEMPLATES[state.slug];
  const palette = derivePalette(document.getElementById("color-picker").value);
  const font = (FONT_OPTIONS.find((f) => f.id === state.fontId) || FONT_OPTIONS[0]).css;
  const textColor = document.getElementById("text-color-picker").value.replace("#", "");
  const layout = (state.content && state.content.layoutOverride) || tpl.layout;
  const html = renderCVHtml({ layout, font, palette, content: state.content, lang: state.lang, textColor, isPro: state.isPro });

  const temp = document.createElement("div");
  temp.style.cssText = "position:fixed; top:0; inset-inline-start:-99999px; width:794px; pointer-events:none;";
  temp.innerHTML = html;
  document.body.appendChild(temp);
  const doc = temp.querySelector(".cv-doc");
  if (!doc) { temp.remove(); return; }
  // The credit line is a sibling of .cv-doc (not nested inside it) and
  // is display:none outside @media print — move it inside and make it
  // visible as a normal trailing line so html2canvas (which only
  // captures .cv-doc) picks it up, instead of silently dropping it.
  const credit = temp.querySelector(".cv-pdf-credit");
  if (credit) {
    // Physical left/right (not text-align:end) — same html2canvas
    // logical-property gap as renderSidebar()'s timeline dots.
    // The sidebar layout keeps its colored column on the left in both
    // languages (row-reverse under RTL), so its white side is always the
    // right one.
    const creditAlign = (layout === "sidebar" || state.lang === "en") ? "right" : "left";
    // Absolutely positioned over the bottom corner instead of appended as
    // a trailing line: as a block it added ~45px under the sidebar's
    // full-A4 min-height, which pushed the snapshot past one page, so the
    // shrink-to-fit below narrowed the image and left white strips down
    // both sides of the PDF — cutting the sidebar off the page edge. The
    // corner it lands on is the white main column's side.
    doc.style.position = "relative";
    credit.style.cssText = `display:block; position:absolute; bottom:10px; ${creditAlign}:24px; font-family:Arial, sans-serif; font-size:8.5pt; color:#A0A0A0; z-index:2;`;
    doc.appendChild(credit);
  }
  // document.fonts.ready (not just rAF) — a reported live export showed
  // skill-pill text sitting noticeably above center inside its own
  // rounded background, a known html2canvas symptom of capturing before
  // a @font-face swap finishes: the fallback font's glyph metrics (which
  // the box's own padding was never sized against) get rasterized for a
  // frame instead of the real one. rAF alone only waits for the next
  // paint, not for a still-downloading Google Font to finish loading.
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (err) { /* unsupported — rAF below still runs */ } }
  await new Promise((resolve) => requestAnimationFrame(resolve));

  // Same try/catch as js/quote-render.js's downloadQuotePdf /
  // js/invoice-render.js's downloadInvoicePdf — this file's own profile
  // photo is always a same-origin base64 data URI (see builder.js's
  // FileReader-based upload), so the canvas-taint risk those two
  // actually carry doesn't apply here, but nothing downstream of
  // html2canvas was guarded here either, so any other failure still
  // surfaced as a silent "nothing happened" click.
  // html2canvas finds each font's baseline by measuring a 1x1 <img>
  // with vertical-align:baseline next to sample text. css/style.css's
  // site-wide `img { display:block }` knocks that probe out of the line,
  // so the measured baseline came out a whole line-height low and every
  // piece of text in the PDF was drawn several px below where the browser
  // laid it out — skill text sinking out of its pill, bullet dots looking
  // too high next to their lines. This rule (copied into html2canvas's
  // cloned document along with the page's other styles) puts the probe
  // back inline for the duration of the export only.
  const probeFix = document.createElement("style");
  probeFix.textContent = 'img[width="1"][height="1"] { display:inline !important; }';
  document.head.appendChild(probeFix);
  try {
    let canvas;
    try {
      canvas = await window.html2canvas(doc, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    } finally {
      temp.remove();
      probeFix.remove();
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    let imgW = pageW;
    let imgH = (canvas.height / canvas.width) * imgW;
    // Up to 1% over (the sidebar's 1123px min-height vs A4's 1122.97px)
    // is squeezed vertically instead — invisible, whereas shrinking the
    // width leaves white strips down both page edges beside the sidebar.
    if (imgH > pageH * 1.01) {
      imgW = imgW * (pageH / imgH);
      imgH = pageH;
    } else if (imgH > pageH) {
      imgH = pageH;
    }
    const x = (pageW - imgW) / 2;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", x, 0, imgW, imgH);
    pdf.save(`${(state.content && state.content.name) || "קורות-חיים"}.pdf`);
  } catch (err) {
    console.error("CV PDF export failed:", err);
    alert("הורדת ה-PDF נכשלה. אפשר לנסות שוב בעוד רגע.");
  }
}
