/* CV builder: template + language + color selection, live-editing form,
   live preview. Freemium model: PDF export (window.print()) is ALWAYS free,
   with a small "made with BizKit" credit line. One Gumroad product
   ("BizKit Pro") removes the credit line from every template, verified
   client-side against Gumroad's public License Verification API — no
   backend needed.
   IMPORTANT: GUMROAD_PRODUCT below has a placeholder permalink/link —
   see README "Gumroad setup" before going live. */
const GUMROAD_PRODUCT = { permalink: "REPLACE_ME_bizkit_pro", checkoutUrl: "https://gum.co/REPLACE_ME_bizkit_pro" };
const UNLOCK_KEY = "bizkit_pro_unlocked";

function gumroadConfigured() {
  return !GUMROAD_PRODUCT.permalink.startsWith("REPLACE_ME");
}

const SWATCHES = ["1F5C4E", "24476B", "C24B1F", "B5175A", "1F2A44", "2563EB", "334E68"];

const FORM_LABELS = {
  he: { name: "שם מלא", title: "תפקיד / כותרת", contact: "פרטי קשר (מופרד ב-|)", summary: "תקציר מקצועי",
    jobsHead: "ניסיון תעסוקתי", addJob: "+ הוסף תפקיד", role: "תפקיד", place: "מקום עבודה", dates: "תאריכים (למשל 2021 – היום)",
    bullets: "הישגים — שורה לכל נקודה", remove: "הסרה", education: "השכלה", skills: "כישורים (מופרד ב-|)",
    projectsHead: "פרויקטים (אופציונלי)", addProject: "+ הוסף פרויקט", projTitle: "שם הפרויקט", projLink: "קישור (למשל github.com/...)" },
  en: { name: "Full name", title: "Job title", contact: "Contact info (separate with |)", summary: "Professional summary",
    jobsHead: "Experience", addJob: "+ Add role", role: "Job title", place: "Company", dates: "Dates (e.g. 2021 – Present)",
    bullets: "Achievements — one per line", remove: "Remove", education: "Education", skills: "Skills (separate with |)",
    projectsHead: "Projects (optional)", addProject: "+ Add project", projTitle: "Project name", projLink: "Link (e.g. github.com/...)" },
};

let state = { slug: null, lang: "he", content: null };

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function isUnlocked() {
  return localStorage.getItem(UNLOCK_KEY) === "1";
}

function loadTemplate(slug) {
  const tpl = CV_TEMPLATES[slug];
  if (!tpl) return;
  state.slug = slug;
  state.content = deepClone(tpl.content[state.lang]);
  if (!state.content.projects) state.content.projects = [];
  document.getElementById("color-picker").value = "#" + tpl.defaultColor;
  renderForm();
  renderPreview();
  const url = new URL(location.href);
  url.searchParams.set("template", slug);
  history.replaceState(null, "", url);
}

function setLang(lang) {
  state.lang = lang;
  document.querySelectorAll(".lang-tab").forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
  loadTemplate(state.slug);
}

function renderPreview() {
  const tpl = CV_TEMPLATES[state.slug];
  const palette = derivePalette(document.getElementById("color-picker").value);
  const html = renderCVHtml({ layout: tpl.layout, font: tpl.font, palette, content: state.content, showCredit: !isUnlocked(), lang: state.lang });
  document.getElementById("preview-doc").innerHTML = html;
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
  document.querySelectorAll(".lang-tab").forEach((btn) => btn.addEventListener("click", () => setLang(btn.dataset.lang)));
}

function refreshLockUI() {
  const unlocked = isUnlocked();
  document.getElementById("lock-state").style.display = unlocked ? "none" : "block";
  document.getElementById("unlock-state").style.display = unlocked ? "block" : "none";
  renderPreview();
}

async function verifyLicense() {
  const key = document.getElementById("license-key").value.trim();
  const msg = document.getElementById("license-msg");
  if (!key) { msg.textContent = "יש להזין קוד רישוי."; msg.className = "err"; return; }
  msg.textContent = "בודקים...";
  msg.className = "";
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ product_permalink: GUMROAD_PRODUCT.permalink, license_key: key }),
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(UNLOCK_KEY, "1");
      msg.textContent = "";
      refreshLockUI();
    } else {
      msg.textContent = "קוד לא תקין. בדקו את המייל שקיבלתם ב-Gumroad ונסו שוב.";
      msg.className = "err";
    }
  } catch (err) {
    msg.textContent = "שגיאת חיבור לשירות האימות. נסו שוב בעוד רגע.";
    msg.className = "err";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("tpl-select");
  select.innerHTML = Object.entries(CV_TEMPLATES).map(([slug, t]) => `<option value="${slug}">${t.label}</option>`).join("");

  wireStaticInputs();
  const buyLink = document.getElementById("buy-link");
  if (gumroadConfigured()) {
    buyLink.href = GUMROAD_PRODUCT.checkoutUrl;
  } else {
    buyLink.href = "#";
    buyLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("license-msg").textContent = "השדרוג עוד לא זמין לרכישה — בקרוב.";
      document.getElementById("license-msg").className = "err";
    });
  }
  document.getElementById("verify-btn").addEventListener("click", verifyLicense);
  document.getElementById("download-btn").addEventListener("click", () => window.print());
  document.getElementById("download-btn-free").addEventListener("click", () => window.print());

  const startSlug = new URLSearchParams(location.search).get("template");
  const startLang = new URLSearchParams(location.search).get("lang");
  state.lang = startLang === "en" ? "en" : "he";
  document.querySelectorAll(".lang-tab").forEach((b) => b.classList.toggle("active", b.dataset.lang === state.lang));
  loadTemplate(startSlug && CV_TEMPLATES[startSlug] ? startSlug : Object.keys(CV_TEMPLATES)[0]);
  select.value = state.slug;
  refreshLockUI();
});
