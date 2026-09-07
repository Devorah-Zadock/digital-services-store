/* Multi-tenant quote builder: each business signs up once (Supabase Auth),
   fills in its letterhead details one time (Supabase `profiles` table +
   `logos` storage bucket), and from then on only fills in the event-specific
   fields for each new quote. Rendering is shared with the private
   single-business tool via quote-render.js's renderQuoteHtml(). */

let currentUser = null;
let currentProfile = null;
let pendingLogoUrl = null; // set once a newly-picked logo finishes uploading
let quoteEventState = null;
// Set the moment a template is picked (catalog card, or ?template= in the
// URL) but the builder can't be shown yet (still creating a profile) —
// showQuoteBuilder() picks it up once it actually runs.
let pendingTemplate = null;

/* Shown to a signed-out visitor so they can try the tool immediately —
   real business details (and saving them) require an account, same as
   viewing-vs-editing everywhere else on the site. */
function demoProfileQA() {
  return {
    business_name: "שם העסק שלכם", tagline1: "", tagline2: "",
    email: "", id_number: "", phone: "", fax: "", signer_name: "",
    vat_rate: "18", logo_url: null,
  };
}

function todayHebrewQA() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function emptyQuoteEventState() {
  return {
    template: QUOTE_TEMPLATE_DEFAULT,
    today: todayHebrewQA(),
    recipient: "",
    eventName: "",
    eventDates: [""],
    description: "",
    price: "",
    vatNote: "",
    policeNote: "",
  };
}

function showSection(id) {
  ["qa-catalog", "qa-profile", "qa-app"].forEach((s) => {
    document.getElementById(s).style.display = s === id ? "" : "none";
  });
}

/* ---------- Template catalog ---------- */

function quoteTplCardHtml(key, t) {
  return `
    <div class="card" data-cat="${t.categorySlug}">
      <div class="thumb"><img src="images/previews/quote-${key}.webp" alt="${escapeHtmlQ(t.label)}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${escapeHtmlQ(t.category)}</span>
          <span class="tag tag-free">חינם</span>
        </div>
        <h3>${escapeHtmlQ(t.label)}</h3>
        <p style="font-size:13px; color:var(--grey); margin:0; flex:1;">${escapeHtmlQ(t.desc)}</p>
        <a href="quote-app.html?template=${key}" class="btn btn-teal card-cta">בחירה ועריכה</a>
      </div>
    </div>`;
}

function renderQuoteTplCatalog() {
  const tabsEl = document.getElementById("qa-tpl-tabs");
  const gridEl = document.getElementById("qa-tpl-grid");
  if (!tabsEl || !gridEl) return;
  tabsEl.innerHTML = `<button class="tab active" data-cat="all">הכל</button>` +
    QUOTE_CATEGORIES.map((c) => `<button class="tab" data-cat="${c.slug}">${escapeHtmlQ(c.label)}</button>`).join("");
  let active = "all";
  function apply() {
    tabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.cat === active));
    const entries = Object.entries(QUOTE_TEMPLATES).filter(([, t]) => active === "all" || t.categorySlug === active);
    gridEl.innerHTML = entries.map(([key, t]) => quoteTplCardHtml(key, t)).join("");
  }
  tabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => { active = btn.dataset.cat; apply(); });
  });
  apply();
}

/* ---------- Business profile ---------- */

function renderLogoPreview(url) {
  const el = document.getElementById("pf-logo-preview");
  const removeBtn = document.getElementById("pf-logo-remove");
  if (url) {
    el.innerHTML = `<img src="${url}" alt="">`;
    removeBtn.style.display = "";
  } else {
    el.innerHTML = `<span>🖼</span>`;
    removeBtn.style.display = "none";
  }
}

function fillProfileForm(p) {
  document.getElementById("pf-businessName").value = p?.business_name || "";
  document.getElementById("pf-tagline1").value = p?.tagline1 || "";
  document.getElementById("pf-tagline2").value = p?.tagline2 || "";
  document.getElementById("pf-email").value = p?.email || currentUser?.email || "";
  document.getElementById("pf-idNumber").value = p?.id_number || "";
  document.getElementById("pf-phone").value = p?.phone || "";
  document.getElementById("pf-fax").value = p?.fax || "";
  document.getElementById("pf-signerName").value = p?.signer_name || "";
  document.getElementById("pf-vatRate").value = p?.vat_rate || "18";
  pendingLogoUrl = p?.logo_url || null;
  renderLogoPreview(pendingLogoUrl);
}

function wireProfileForm() {
  document.getElementById("pf-logo-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("הקובץ גדול מדי — בחרו לוגו עד 4MB.");
      e.target.value = "";
      return;
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${currentUser.id}/logo.${ext}`;
    const { error: upErr } = await supabaseClient.storage.from("logos").upload(path, file, { upsert: true });
    if (upErr) { alert("העלאת הלוגו נכשלה, נסו שוב."); e.target.value = ""; return; }
    const { data } = supabaseClient.storage.from("logos").getPublicUrl(path);
    pendingLogoUrl = data.publicUrl + "?t=" + Date.now();
    renderLogoPreview(pendingLogoUrl);
  });

  document.getElementById("pf-logo-remove").addEventListener("click", () => {
    pendingLogoUrl = null;
    document.getElementById("pf-logo-file").value = "";
    renderLogoPreview(null);
  });

  document.getElementById("qa-profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("qa-profile-err");
    err.textContent = "";
    const row = {
      id: currentUser.id,
      business_name: document.getElementById("pf-businessName").value.trim(),
      tagline1: document.getElementById("pf-tagline1").value.trim(),
      tagline2: document.getElementById("pf-tagline2").value.trim(),
      email: document.getElementById("pf-email").value.trim(),
      id_number: document.getElementById("pf-idNumber").value.trim(),
      phone: document.getElementById("pf-phone").value.trim(),
      fax: document.getElementById("pf-fax").value.trim(),
      signer_name: document.getElementById("pf-signerName").value.trim(),
      vat_rate: document.getElementById("pf-vatRate").value.trim() || "18",
      logo_url: pendingLogoUrl,
    };
    const { data, error } = await supabaseClient.from("profiles").upsert(row).select().single();
    if (error) { err.textContent = "השמירה נכשלה, נסו שוב."; return; }
    currentProfile = data;
    showQuoteBuilder();
  });
}

/* ---------- Quote builder (event-specific fields only) ---------- */

function mergedQuoteState() {
  return {
    businessName: currentProfile.business_name,
    tagline1: currentProfile.tagline1,
    tagline2: currentProfile.tagline2,
    email: currentProfile.email,
    businessNumber: currentProfile.id_number,
    phone: currentProfile.phone,
    fax: currentProfile.fax,
    signerName: currentProfile.signer_name,
    vatRate: currentProfile.vat_rate,
    logoUrl: currentProfile.logo_url,
    ...quoteEventState,
  };
}

function renderQuotePreviewQA() {
  document.getElementById("quote-preview").innerHTML = renderQuoteHtml(mergedQuoteState());
  fitQuotePreviewToContainer();
}

function dateBlockHtmlQA(date, i, total) {
  const canRemove = total > 1;
  return `
  <div class="job-block" data-didx="${i}">
    <div class="job-block-head">
      <strong style="font-size:12.5px;">תאריך ${i + 1}</strong>
      ${canRemove ? `<button type="button" class="job-remove" data-dremove="${i}">הסרה</button>` : ""}
    </div>
    <input type="text" placeholder="לדוגמה: 18.12.2024" data-date="${i}" value="${escapeHtmlQ(date)}">
  </div>`;
}

function renderQuoteFormQA() {
  const q = quoteEventState;
  document.getElementById("qf-today").value = q.today;
  document.getElementById("qf-recipient").value = q.recipient;
  document.getElementById("qf-eventName").value = q.eventName;
  document.getElementById("qf-description").value = q.description;
  document.getElementById("qf-price").value = q.price;
  document.getElementById("qf-vatNote").value = q.vatNote;
  document.getElementById("qf-policeNote").value = q.policeNote;
  document.getElementById("dates-list").innerHTML = q.eventDates.map((d, i) => dateBlockHtmlQA(d, i, q.eventDates.length)).join("");
}

function wireQuoteFormQA() {
  const map = {
    "qf-today": "today", "qf-recipient": "recipient", "qf-eventName": "eventName",
    "qf-description": "description", "qf-price": "price", "qf-vatNote": "vatNote", "qf-policeNote": "policeNote",
  };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      quoteEventState[key] = e.target.value;
      renderQuotePreviewQA();
    });
  });

  document.getElementById("add-date").addEventListener("click", () => {
    quoteEventState.eventDates.push("");
    renderQuoteFormQA();
    renderQuotePreviewQA();
  });
  document.getElementById("dates-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.date;
    if (idx === undefined) return;
    quoteEventState.eventDates[idx] = e.target.value;
    renderQuotePreviewQA();
  });
  document.getElementById("dates-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.dremove;
    if (idx === undefined) return;
    if (quoteEventState.eventDates.length <= 1) return;
    quoteEventState.eventDates.splice(Number(idx), 1);
    renderQuoteFormQA();
    renderQuotePreviewQA();
  });

  document.getElementById("quote-download-btn").addEventListener("click", () => window.print());
  document.getElementById("qa-edit-profile").addEventListener("click", showProfileEditor);
}

function showQuoteBuilder(loadedState) {
  showSection("qa-app");
  quoteEventState = loadedState || emptyQuoteEventState();
  if (!loadedState && pendingTemplate) quoteEventState.template = pendingTemplate;
  pendingTemplate = null;
  renderQuoteFormQA();
  renderQuotePreviewQA();
  document.getElementById("qa-demo-banner").style.display = currentUser ? "none" : "";
  document.getElementById("quote-save-ctrl").style.display = currentUser ? "" : "none";
}

function showProfileEditor() {
  if (!currentUser) { goToLoginQA(); return; }
  showSection("qa-profile");
  fillProfileForm(currentProfile);
}

function goToLoginQA() {
  window.location.href = "account.html?redirect=quote-app.html";
}

/* ---------- Boot / auth state routing ---------- */

/* No ?quote= and no ?template= in the URL means a genuinely fresh visit
   (the nav link, or the rail's empty-state "ליצירה" link) — show the
   design catalog first, same as "אתרים" always opens its template
   catalog rather than assuming a design. A specific ?template= (a
   catalog card) or ?quote= (an existing saved quote, which already
   carries its own template) skips straight past it. */
function pickedTemplateFromUrl() {
  const t = new URLSearchParams(location.search).get("template");
  return QUOTE_TEMPLATES[t] ? t : null;
}

async function routeAfterAuth(user) {
  currentUser = user;
  quoteCurrentUserId = user.id;
  const qid = new URLSearchParams(location.search).get("quote");
  const tpl = pickedTemplateFromUrl();
  if (!qid && !tpl) { showQuoteCatalog(); return; }
  pendingTemplate = tpl;

  const { data } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) {
    currentProfile = data;
    const loaded = qid ? await loadQuoteById(qid, user.id) : null;
    showQuoteBuilder(loaded);
  } else {
    currentProfile = null;
    showSection("qa-profile");
    fillProfileForm(null);
  }
}

/* Trying the tool never needs an account — same as viewing a template
   anywhere else on the site. A signed-out visitor gets the quote
   builder straight away with placeholder business details (see
   demoProfileQA); only saving their REAL details (qa-profile-form) or
   editing an existing profile requires signing in. */
function routeAsGuest() {
  currentUser = null;
  quoteCurrentUserId = null;
  quoteSavedId = null;
  const tpl = pickedTemplateFromUrl();
  if (!tpl) { showQuoteCatalog(); return; }
  pendingTemplate = tpl;
  currentProfile = demoProfileQA();
  showQuoteBuilder();
}

function showQuoteCatalog() {
  showSection("qa-catalog");
}

document.addEventListener("DOMContentLoaded", () => {
  wireProfileForm();
  wireQuoteFormQA();
  renderQuoteTplCatalog();
  document.getElementById("qa-demo-login").addEventListener("click", (e) => { e.preventDefault(); goToLoginQA(); });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      routeAfterAuth(session.user);
    } else {
      // Signed out (or never signed in) — drop back to the guest demo
      // rather than yanking them off the page entirely.
      routeAsGuest();
    }
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) {
      routeAfterAuth(data.session.user);
    } else {
      routeAsGuest();
    }
  });
});
