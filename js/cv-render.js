/* Renders a CV as an HTML string from {headerStyle, font, palette, content}.
   Shared by the live builder preview and the print/PDF output, so what the
   user sees while editing is exactly what they get in the exported file. */
const CV_DARK = "222222";
const CV_GREY = "5A5A5A";

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

function headerHtml(headerStyle, palette, content) {
  if (headerStyle === "block") {
    return `
    <div class="cv-header cv-block" style="background:#${palette.primaryDark}">
      <h1>${escapeHtml(content.name)}</h1>
      <div class="cv-role" style="color:#${palette.headerAccentText}">${escapeHtml(content.title)}</div>
      <div class="cv-contact" style="color:#fff">${escapeHtml(content.contact)}</div>
    </div>`;
  }
  if (headerStyle === "minimal") {
    return `
    <div class="cv-header cv-minimal">
      <h1 style="color:#${palette.primaryDark}">${escapeHtml(content.name)}</h1>
      <div class="cv-role" style="color:#${palette.primary}; border-bottom:3px solid #${palette.primary};">${escapeHtml(content.title)}</div>
      <div class="cv-contact" style="color:#${CV_GREY}">${escapeHtml(content.contact)}</div>
    </div>`;
  }
  return `
  <div class="cv-header cv-classic">
    <h1 style="color:#${CV_DARK}; border-top:2px solid #${CV_DARK}; border-bottom:2px solid #${CV_DARK};">${escapeHtml(content.name)}</h1>
    <div class="cv-role" style="color:#${CV_GREY}">${escapeHtml(content.title)}</div>
    <div class="cv-contact" style="color:#${CV_GREY}">${escapeHtml(content.contact)}</div>
  </div>`;
}

function renderCVHtml({ headerStyle, font, palette, content }) {
  const jobsHtml = content.jobs.map((j) => `
    <div class="cv-job">
      <div class="cv-row"><span class="cv-jobtitle">${escapeHtml(j.title)} | ${escapeHtml(j.place)}</span><span class="cv-dates">${escapeHtml(j.dates)}</span></div>
      <ul>${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>
    .cv-doc { font-family: ${font}; background:#fff; color:#${CV_DARK}; width:100%; max-width:794px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.12); }
    .cv-doc .cv-header.cv-block { color:#fff; padding:34px 40px; }
    .cv-doc .cv-header.cv-block h1 { font-size:34px; font-weight:700; margin:0; }
    .cv-doc .cv-header.cv-block .cv-role { font-size:18px; margin-top:6px; }
    .cv-doc .cv-header.cv-block .cv-contact { font-size:12.5px; margin-top:14px; opacity:.92; }
    .cv-doc .cv-header.cv-minimal { padding:34px 40px 20px; }
    .cv-doc .cv-header.cv-minimal h1 { font-size:32px; font-weight:700; margin:0; }
    .cv-doc .cv-header.cv-minimal .cv-role { font-size:18px; display:inline-block; padding-bottom:10px; margin-top:8px; }
    .cv-doc .cv-header.cv-minimal .cv-contact { font-size:13px; margin-top:14px; }
    .cv-doc .cv-header.cv-classic { padding:34px 40px 20px; text-align:center; }
    .cv-doc .cv-header.cv-classic h1 { font-size:30px; font-weight:700; padding:14px 0; margin:0; }
    .cv-doc .cv-header.cv-classic .cv-role { font-size:15px; font-style:italic; margin-top:10px; }
    .cv-doc .cv-header.cv-classic .cv-contact { font-size:12px; margin-top:8px; }
    .cv-doc .cv-body { padding:26px 40px 40px; }
    .cv-doc h2 { color:#${palette.primary}; font-size:16px; border-bottom:2px solid #${palette.primary}; padding-bottom:6px; margin:22px 0 10px; }
    .cv-doc h2:first-child { margin-top:0; }
    .cv-doc p.cv-summary { font-size:13.5px; line-height:1.6; margin:0; }
    .cv-doc .cv-job { margin-top:12px; }
    .cv-doc .cv-row { font-size:14px; }
    .cv-doc .cv-jobtitle { font-weight:700; }
    .cv-doc .cv-dates { color:#${CV_GREY}; font-size:11.5px; font-style:italic; margin-inline-start:8px; }
    .cv-doc ul { margin:4px 0 0; padding-inline-start:20px; }
    .cv-doc li { font-size:13px; color:#333; line-height:1.65; }
    .cv-doc .cv-skills, .cv-doc .cv-edu { font-size:13px; line-height:1.7; }
  </style>
  <div class="cv-doc" dir="rtl">
    ${headerHtml(headerStyle, palette, content)}
    <div class="cv-body">
      <h2>תקציר מקצועי</h2>
      <p class="cv-summary">${escapeHtml(content.summary)}</p>
      <h2>ניסיון תעסוקתי</h2>
      ${jobsHtml}
      <h2>השכלה</h2>
      <div class="cv-edu">${escapeHtml(content.education)}</div>
      <h2>כישורים</h2>
      <div class="cv-skills">${escapeHtml(content.skills)}</div>
    </div>
  </div>`;
}
