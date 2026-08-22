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

const SHARED_CSS = `
  .cv-doc { font-family: var(--cv-font); background:#fff; color:#${CV_DARK}; width:100%; max-width:794px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,.12); overflow:hidden; }
  .cv-doc ul { margin:0; padding-inline-start:20px; }
  .cv-doc li { font-size:12.5px; color:#333; line-height:1.6; }
  .cv-doc .cv-jobtitle { font-weight:700; }
  .cv-doc .cv-dates { font-size:11px; font-style:italic; }
  .cv-doc .cv-summary { font-size:13px; line-height:1.65; margin:0; }
  .cv-doc .cv-link { font-size:11px; font-weight:600; }
`;

function chipHtml(text, chipBg, chipColor, chipFont) {
  return `<span style="display:inline-block; background:${chipBg}; color:${chipColor}; font-family:${chipFont || "inherit"}; font-size:11px; padding:5px 12px; border-radius:20px; margin:0 0 6px 6px;">${escapeHtml(text)}</span>`;
}
function projectsList(projects, primaryHex) {
  if (!projects || !projects.length) return "";
  return projects.map((p) => `
    <div style="margin-bottom:12px;">
      <div class="cv-jobtitle" style="font-size:13px;">${escapeHtml(p.title)}${p.link ? ` <span class="cv-link" style="color:#${primaryHex};">(${escapeHtml(p.link)})</span>` : ""}</div>
      <ul style="margin-top:4px;">${bulletsToLis(p.bullets)}</ul>
    </div>`).join("");
}

/* ---------------- Sidebar layout ---------------- */
function renderSidebar({ font, palette, content, lang }) {
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const contactLines = splitParts(content.contact);
  const skillChips = splitParts(content.skills).map((s) => chipHtml(s, "rgba(255,255,255,.14)", "#fff")).join("");
  const jobsHtml = content.jobs.map((j, i) => `
    <div class="tl-item" style="position:relative; padding-inline-end:20px; padding-bottom:${i === content.jobs.length - 1 ? 0 : 22}px;">
      <div style="position:absolute; inset-inline-end:0; top:4px; width:9px; height:9px; border-radius:50%; background:#${palette.primary};"></div>
      ${i !== content.jobs.length - 1 ? `<div style="position:absolute; inset-inline-end:4px; top:15px; bottom:0; width:1px; background:#E4E4E4;"></div>` : ""}
      <div class="cv-jobtitle" style="font-size:13.5px; color:#${CV_DARK};">${escapeHtml(j.title)}</div>
      <div style="font-size:12px; color:#${palette.primary}; font-weight:600; margin-top:1px;">${escapeHtml(j.place)}</div>
      <div class="cv-dates" style="color:#${CV_GREY}; margin:2px 0 6px;">${escapeHtml(j.dates)}</div>
      <ul>${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${SHARED_CSS}
    .cv-sidebar-wrap { display:flex; flex-direction:${lang === "en" ? "row" : "row-reverse"}; min-height:600px; }
    .cv-side { width:255px; flex:none; background:#${palette.primaryDark}; color:#fff; padding:36px 26px; text-align:center; }
    .cv-side .avatar { width:78px; height:78px; border-radius:50%; background:rgba(255,255,255,.16); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:26px; font-weight:700; color:#fff; }
    .cv-side h1 { font-size:21px; margin:0 0 4px; }
    .cv-side .role { font-size:12.5px; color:${"#" + palette.headerAccentText}; margin-bottom:18px; }
    .cv-side .sec-label { font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:${"#" + palette.headerAccentText}; text-align:start; margin:20px 0 10px; opacity:.85; }
    .cv-side .contact-line { font-size:11.5px; text-align:start; margin-bottom:8px; opacity:.92; word-break:break-word; }
    .cv-side .chips { text-align:start; }
    .cv-main { flex:1; padding:36px 30px; min-width:0; }
    .cv-main h2 { font-size:14px; color:#${palette.primary}; margin:0 0 12px; text-transform:uppercase; letter-spacing:.05em; }
    .cv-main h2:not(:first-child) { margin-top:26px; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-sidebar-wrap">
      <aside class="cv-side">
        <div class="avatar">${escapeHtml(initialsOf(content.name))}</div>
        <h1>${escapeHtml(content.name)}</h1>
        <div class="role">${escapeHtml(content.title)}</div>
        <div class="sec-label">${L.contact}</div>
        ${contactLines.map((c) => `<div class="contact-line">${escapeHtml(c)}</div>`).join("")}
        <div class="sec-label">${L.skills}</div>
        <div class="chips">${skillChips}</div>
      </aside>
      <main class="cv-main">
        <h2>${L.summary}</h2>
        <p class="cv-summary">${escapeHtml(content.summary)}</p>
        <h2>${L.experience}</h2>
        ${jobsHtml}
        ${content.projects && content.projects.length ? `<h2>${L.projects}</h2>${projectsList(content.projects, palette.primary)}` : ""}
        <h2>${L.education}</h2>
        <p class="cv-summary">${escapeHtml(content.education)}</p>
      </main>
    </div>
  </div>`;
}

/* ---------------- Bold editorial layout ---------------- */
function renderBold({ font, palette, content, lang }) {
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  const skillChips = splitParts(content.skills).map((s) => chipHtml(s, "#" + palette.ice, "#" + palette.primaryDark)).join("");
  let n = 0;
  const badge = () => { n += 1; return String(n).padStart(2, "0"); };
  const jobsHtml = content.jobs.map((j) => `
    <div style="margin-bottom:16px;">
      <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
        <span style="width:6px; height:6px; border-radius:50%; background:#${palette.primary}; display:inline-block;"></span>
        <span class="cv-jobtitle" style="font-size:14px;">${escapeHtml(j.title)}</span>
        <span style="font-size:12.5px; color:#${palette.primary}; font-weight:600;">${escapeHtml(j.place)}</span>
        <span class="cv-dates" style="color:#${CV_GREY};">${escapeHtml(j.dates)}</span>
      </div>
      <ul style="margin-top:6px;">${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${SHARED_CSS}
    .cv-bold-head { position:relative; padding:44px 40px 26px; overflow:hidden; }
    .cv-bold-head::before { content:""; position:absolute; inset-inline-end:-60px; top:-70px; width:220px; height:220px; border-radius:50%; background:#${palette.ice}; z-index:0; }
    .cv-bold-head .inner { position:relative; z-index:1; }
    .cv-bold-head h1 { font-size:46px; font-weight:700; margin:0; line-height:1.05; color:#${CV_DARK}; }
    .cv-bold-head .role-badge { display:inline-block; background:#${palette.primary}; color:#fff; font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px; margin-top:14px; }
    .cv-bold-head .contact { font-size:12px; color:#${CV_GREY}; margin-top:14px; }
    .cv-bold-body { padding:6px 40px 40px; }
    .cv-bold-body h2 { display:flex; align-items:center; gap:10px; font-size:15px; margin:24px 0 12px; color:#${CV_DARK}; }
    .cv-bold-body h2:first-child { margin-top:0; }
    .cv-bold-body h2 .n { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; background:#${palette.primary}; color:#fff; font-size:11px; font-weight:700; flex:none; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-bold-head">
      <div class="inner">
        <h1>${escapeHtml(content.name)}</h1>
        <span class="role-badge">${escapeHtml(content.title)}</span>
        <div class="contact">${escapeHtml(content.contact)}</div>
      </div>
    </div>
    <div class="cv-bold-body">
      <h2><span class="n">${badge()}</span> ${L.summary}</h2>
      <p class="cv-summary">${escapeHtml(content.summary)}</p>
      <h2><span class="n">${badge()}</span> ${L.experience}</h2>
      ${jobsHtml}
      ${content.projects && content.projects.length ? `<h2><span class="n">${badge()}</span> ${L.projects}</h2>${projectsList(content.projects, palette.primary)}` : ""}
      <h2><span class="n">${badge()}</span> ${L.education}</h2>
      <p class="cv-summary">${escapeHtml(content.education)}</p>
      <h2><span class="n">${badge()}</span> ${L.skills}</h2>
      <div>${skillChips}</div>
    </div>
  </div>`;
}

/* ---------------- Classic / quiet layout ---------------- */
function renderClassicMono({ font, palette, content, lang }) {
  const L = LABELS[lang];
  const dir = lang === "en" ? "ltr" : "rtl";
  let n = 0;
  const badge = () => { n += 1; return String(n).padStart(2, "0"); };
  const jobsHtml = content.jobs.map((j) => `
    <div style="margin-bottom:14px;">
      <div class="cv-row" style="font-size:13.5px;"><span class="cv-jobtitle">${escapeHtml(j.title)} — ${escapeHtml(j.place)}</span></div>
      <div class="cv-dates" style="color:#${CV_GREY}; margin:1px 0 6px;">${escapeHtml(j.dates)}</div>
      <ul>${bulletsToLis(j.bullets)}</ul>
    </div>`).join("");

  return `
  <style>${SHARED_CSS}
    .cv-cm-head { padding:40px 44px 22px; text-align:center; border-bottom:1px solid #E6E6E6; }
    .cv-cm-head h1 { font-size:28px; font-weight:700; margin:0; letter-spacing:.02em; color:#${CV_DARK}; }
    .cv-cm-head .role { font-size:13px; color:#${palette.primary}; margin-top:8px; letter-spacing:.05em; text-transform:uppercase; }
    .cv-cm-head .contact { font-size:11.5px; color:#${CV_GREY}; margin-top:10px; }
    .cv-cm-body { padding:28px 44px 44px; }
    .cv-cm-body h2 { display:flex; align-items:center; gap:10px; font-size:12.5px; letter-spacing:.08em; text-transform:uppercase; color:#${CV_DARK}; margin:24px 0 12px; }
    .cv-cm-body h2:first-child { margin-top:0; }
    .cv-cm-body h2 .n { font-size:11px; color:#${palette.primary}; font-weight:700; }
  </style>
  <div class="cv-doc" dir="${dir}">
    <div class="cv-cm-head">
      <h1>${escapeHtml(content.name)}</h1>
      <div class="role">${escapeHtml(content.title)}</div>
      <div class="contact">${escapeHtml(content.contact)}</div>
    </div>
    <div class="cv-cm-body">
      <h2><span class="n">${badge()}</span> ${L.summary}</h2>
      <p class="cv-summary">${escapeHtml(content.summary)}</p>
      <h2><span class="n">${badge()}</span> ${L.experience}</h2>
      ${jobsHtml}
      ${content.projects && content.projects.length ? `<h2><span class="n">${badge()}</span> ${L.projects}</h2>${projectsList(content.projects, palette.primary)}` : ""}
      <h2><span class="n">${badge()}</span> ${L.education}</h2>
      <p class="cv-summary">${escapeHtml(content.education)}</p>
      <h2><span class="n">${badge()}</span> ${L.skills}</h2>
      <p class="cv-summary">${escapeHtml(content.skills)}</p>
    </div>
  </div>`;
}

function renderCVHtml({ layout, font, palette, content, lang }) {
  const l = lang === "en" ? "en" : "he";
  const args = { font, palette, content, lang: l };
  let html;
  if (layout === "sidebar") html = renderSidebar(args);
  else if (layout === "bold") html = renderBold(args);
  else html = renderClassicMono(args);
  return `<style>.cv-doc{--cv-font:${font};}</style>` + html;
}
