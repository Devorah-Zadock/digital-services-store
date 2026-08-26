/* Multi-tenant quote builder: each business signs up once (Supabase Auth),
   fills in its letterhead details one time (Supabase `profiles` table +
   `logos` storage bucket), and from then on only fills in the event-specific
   fields for each new quote. Rendering is shared with the private
   single-business tool via quote-render.js's renderQuoteHtml(). */

let currentUser = null;
let currentProfile = null;
let pendingLogoUrl = null; // set once a newly-picked logo finishes uploading
let quoteEventState = null;

function todayHebrewQA() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function emptyQuoteEventState() {
  return {
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
  ["qa-profile", "qa-app"].forEach((s) => {
    document.getElementById(s).style.display = s === id ? "" : "none";
  });
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

function showQuoteBuilder() {
  showSection("qa-app");
  quoteEventState = emptyQuoteEventState();
  renderQuoteFormQA();
  renderQuotePreviewQA();
  wireQuoteFormQA();
}

function showProfileEditor() {
  showSection("qa-profile");
  fillProfileForm(currentProfile);
}

/* ---------- Boot / auth state routing ---------- */

async function routeAfterAuth(user) {
  currentUser = user;
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) {
    currentProfile = data;
    showQuoteBuilder();
  } else {
    currentProfile = null;
    showSection("qa-profile");
    fillProfileForm(null);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireProfileForm();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      routeAfterAuth(session.user);
    } else {
      window.location.href = "account.html?redirect=quote-app.html";
    }
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) {
      routeAfterAuth(data.session.user);
    } else {
      window.location.href = "account.html?redirect=quote-app.html";
    }
  });
});
