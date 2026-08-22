/* CV builder: template + language + color selection, live-editing form,
   live preview, and a free PDF export (window.print()). No paywall, no
   account, no license check — the whole thing is free to use. */
const SWATCHES = ["1F5C4E", "24476B", "C24B1F", "B5175A", "1F2A44", "2563EB", "334E68"];

const FONT_OPTIONS = [
  { id: "assistant", label: "Assistant — נקי ומודרני", css: "'Assistant', Arial, sans-serif" },
  { id: "rubik", label: "Rubik — עגול וידידותי", css: "'Rubik', Arial, sans-serif" },
  { id: "heebo", label: "Heebo — סטנדרטי ומאוזן", css: "'Heebo', Arial, sans-serif" },
  { id: "frank", label: "Frank Ruhl Libre — קלאסי ומכובד", css: "'Frank Ruhl Libre', Georgia, serif" },
  { id: "notoserif", label: "Noto Serif Hebrew — רשמי", css: "'Noto Serif Hebrew', Georgia, serif" },
  { id: "davidlibre", label: "David Libre — מסורתי", css: "'David Libre', Georgia, serif" },
];

const FORM_LABELS = {
  he: { name: "שם מלא", title: "תפקיד / כותרת", contact: "פרטי קשר (מופרד ב-|)", summary: "תקציר מקצועי",
    jobsHead: "ניסיון תעסוקתי", addJob: "+ הוסף תפקיד", role: "תפקיד", place: "מקום עבודה", dates: "תאריכים (למשל 2021 – היום)",
    bullets: "הישגים — שורה לכל נקודה", remove: "הסרה", education: "השכלה", skills: "כישורים (מופרד ב-|)",
    projectsHead: "פרויקטים (אופציונלי)", addProject: "+ הוסף פרויקט", projTitle: "שם הפרויקט", projLink: "קישור (למשל github.com/...)",
    font: "גופן", photo: "תמונת פרופיל (אופציונלי)", uploadPhoto: "העלאת תמונה", removePhoto: "הסרת תמונה" },
  en: { name: "Full name", title: "Job title", contact: "Contact info (separate with |)", summary: "Professional summary",
    jobsHead: "Experience", addJob: "+ Add role", role: "Job title", place: "Company", dates: "Dates (e.g. 2021 – Present)",
    bullets: "Achievements — one per line", remove: "Remove", education: "Education", skills: "Skills (separate with |)",
    projectsHead: "Projects (optional)", addProject: "+ Add project", projTitle: "Project name", projLink: "Link (e.g. github.com/...)",
    font: "Font", photo: "Profile photo (optional)", uploadPhoto: "Upload photo", removePhoto: "Remove photo" },
};

let state = { slug: null, lang: "he", fontId: "assistant", content: null };

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function loadTemplate(slug) {
  const tpl = CV_TEMPLATES[slug];
  if (!tpl) return;
  state.slug = slug;
  state.content = deepClone(tpl.content[state.lang]);
  if (!state.content.projects) state.content.projects = [];
  state.content.photo = null;
  state.fontId = tpl.font && tpl.font.indexOf("Georgia") !== -1 ? "frank" : "assistant";
  document.getElementById("color-picker").value = "#" + tpl.defaultColor;
  renderForm();
  renderPreview();
  const url = new URL(location.href);
  url.searchParams.set("template", slug);
  history.replaceState(null, "", url);
}

function setLang(lang) {
  state.lang = lang;
  document.querySelectorAll(".lang-big").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  loadTemplate(state.slug);
}

function renderPreview() {
  const tpl = CV_TEMPLATES[state.slug];
  const palette = derivePalette(document.getElementById("color-picker").value);
  const font = (FONT_OPTIONS.find((f) => f.id === state.fontId) || FONT_OPTIONS[0]).css;
  const html = renderCVHtml({ layout: tpl.layout, font, palette, content: state.content, lang: state.lang });
  document.getElementById("preview-doc").innerHTML = html;
}

function renderPhotoPreview() {
  const el = document.getElementById("photo-preview");
  el.innerHTML = state.content.photo
    ? `<img src="${state.content.photo}" alt="">`
    : `<span class="photo-placeholder">👤</span>`;
}

function jobBlockHtml(job, i) {
  const t = FORM_LABELS[state.lang];
  const dir = state.lang === "en" ? "ltr" : "rtl";
  return `
  <div class="job-block" data-idx="${i}">
    <div class="job-block-head">
      <strong style="font-size:12.5px;">${t.jobsHead} ${i + 1}</strong>
      <button type="button" class="job-remove" data-remove="${i}">${t.remove}</button>
    </div>
    <div class="job-grid">
      <input type="text" dir="${dir}" placeholder="${t.role}" data-job="${i}" data-key="title" value="${job.title.replace(/"/g, "&quot;")}">
      <input type="text" dir="${dir}" placeholder="${t.place}" data-job="${i}" data-key="place" value="${job.place.replace(/"/g, "&quot;")}">
    </div>
    <input type="text" dir="${dir}" placeholder="${t.dates}" data-job="${i}" data-key="dates" value="${job.dates.replace(/"/g, "&quot;")}">
    <textarea rows="2" dir="${dir}" placeholder="${t.bullets}" data-job="${i}" data-key="bullets">${job.bullets}</textarea>
  </div>`;
}

function projectBlockHtml(p, i) {
  const t = FORM_LABELS[state.lang];
  const dir = state.lang === "en" ? "ltr" : "rtl";
  return `
  <div class="job-block" data-pidx="${i}">
    <div class="job-block-head">
      <strong style="font-size:12.5px;">${t.projTitle} ${i + 1}</strong>
      <button type="button" class="project-remove" data-premove="${i}">${t.remove}</button>
    </div>
    <div class="job-grid">
      <input type="text" dir="${dir}" placeholder="${t.projTitle}" data-project="${i}" data-key="title" value="${(p.title || "").replace(/"/g, "&quot;")}">
      <input type="text" dir="ltr" placeholder="${t.projLink}" data-project="${i}" data-key="link" value="${(p.link || "").replace(/"/g, "&quot;")}">
    </div>
    <textarea rows="2" dir="${dir}" placeholder="${t.bullets}" data-project="${i}" data-key="bullets">${p.bullets || ""}</textarea>
  </div>`;
}

function renderForm() {
  const c = state.content;
  const t = FORM_LABELS[state.lang];
  const dir = state.lang === "en" ? "ltr" : "rtl";
  document.querySelectorAll("[data-label]").forEach((el) => { el.textContent = t[el.dataset.label]; });

  ["f-name", "f-title", "f-contact", "f-summary", "f-education", "f-skills"].forEach((id) => {
    document.getElementById(id).dir = dir;
  });
  document.getElementById("f-name").value = c.name;
  document.getElementById("f-title").value = c.title;
  document.getElementById("f-contact").value = c.contact;
  document.getElementById("f-summary").value = c.summary;
  document.getElementById("f-education").value = c.education;
  document.getElementById("f-skills").value = c.skills;
  document.getElementById("jobs-list").innerHTML = c.jobs.map(jobBlockHtml).join("");
  document.getElementById("projects-list").innerHTML = (c.projects || []).map(projectBlockHtml).join("");
  document.getElementById("font-select").value = state.fontId;
  renderPhotoPreview();
}

function wireStaticInputs() {
  const map = { "f-name": "name", "f-title": "title", "f-contact": "contact", "f-summary": "summary", "f-education": "education", "f-skills": "skills" };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      state.content[key] = e.target.value;
      renderPreview();
    });
  });

  document.getElementById("color-picker").addEventListener("input", renderPreview);

  document.getElementById("font-select").addEventListener("change", (e) => {
    state.fontId = e.target.value;
    renderPreview();
  });

  document.getElementById("f-photo").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      alert(state.lang === "en" ? "Image is too large — please pick a file under 6MB." : "התמונה גדולה מדי — בחרו קובץ עד 6MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.content.photo = reader.result;
      renderPhotoPreview();
      renderPreview();
    };
    reader.readAsDataURL(file);
  });
  document.getElementById("photo-remove").addEventListener("click", () => {
    state.content.photo = null;
    document.getElementById("f-photo").value = "";
    renderPhotoPreview();
    renderPreview();
  });

  document.getElementById("swatches").innerHTML = SWATCHES.map((hex) =>
    `<span class="swatch" style="background:#${hex}" data-hex="${hex}" title="#${hex}"></span>`
  ).join("");
  document.getElementById("swatches").addEventListener("click", (e) => {
    const hex = e.target.dataset.hex;
    if (!hex) return;
    document.getElementById("color-picker").value = "#" + hex;
    renderPreview();
  });

  document.getElementById("add-job").addEventListener("click", () => {
    state.content.jobs.push({ title: "", place: "", dates: "", bullets: "" });
    renderForm();
    renderPreview();
  });
  document.getElementById("jobs-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.job;
    const key = e.target.dataset.key;
    if (idx === undefined) return;
    state.content.jobs[idx][key] = e.target.value;
    renderPreview();
  });
  document.getElementById("jobs-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.remove;
    if (idx === undefined) return;
    state.content.jobs.splice(Number(idx), 1);
    renderForm();
    renderPreview();
  });

  document.getElementById("add-project").addEventListener("click", () => {
    if (!state.content.projects) state.content.projects = [];
    state.content.projects.push({ title: "", link: "", bullets: "" });
    renderForm();
    renderPreview();
  });
  document.getElementById("projects-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.project;
    const key = e.target.dataset.key;
    if (idx === undefined) return;
    state.content.projects[idx][key] = e.target.value;
    renderPreview();
  });
  document.getElementById("projects-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.premove;
    if (idx === undefined) return;
    state.content.projects.splice(Number(idx), 1);
    renderForm();
    renderPreview();
  });

  document.getElementById("tpl-select").addEventListener("change", (e) => loadTemplate(e.target.value));
  document.querySelectorAll(".lang-big").forEach((btn) => btn.addEventListener("click", () => setLang(btn.dataset.lang)));
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("tpl-select");
  select.innerHTML = Object.entries(CV_TEMPLATES).map(([slug, t]) => `<option value="${slug}">${t.label}</option>`).join("");
  document.getElementById("font-select").innerHTML = FONT_OPTIONS.map((f) => `<option value="${f.id}">${f.label}</option>`).join("");

  wireStaticInputs();
  document.getElementById("download-btn").addEventListener("click", () => window.print());

  const startSlug = new URLSearchParams(location.search).get("template");
  const startLang = new URLSearchParams(location.search).get("lang");
  state.lang = startLang === "en" ? "en" : "he";
  document.querySelectorAll(".lang-big").forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
  loadTemplate(startSlug && CV_TEMPLATES[startSlug] ? startSlug : Object.keys(CV_TEMPLATES)[0]);
  select.value = state.slug;
});
