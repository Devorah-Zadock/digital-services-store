/* Multi-tenant quote builder: each business signs up once (Supabase Auth),
   fills in its letterhead details one time (Supabase `profiles` table +
   `logos` storage bucket), and from then on only fills in the event-specific
   fields for each new quote. Rendering is shared with the private
   single-business tool via quote-render.js's renderQuoteHtml(). */

let currentUser = null;
let currentProfile = null;
let pendingLogoUrl = null; // set once a newly-picked logo finishes uploading
let quoteEventState = null;
let authMode = "login"; // "login" | "signup"

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
  ["qa-auth", "qa-profile", "qa-app"].forEach((s) => {
    document.getElementById(s).style.display = s === id ? "" : "none";
  });
}

/* ---------- Auth ---------- */

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("qa-auth-err").textContent = "";
  document.getElementById("qa-auth-msg").textContent = "";
  if (mode === "signup") {
    document.getElementById("qa-auth-title").textContent = "פתיחת חשבון עסק";
    document.getElementById("qa-auth-sub").textContent = "נרשמים פעם אחת — ובכל כניסה הפרטים והלוגו שלכם כבר מוכנים.";
    document.getElementById("qa-auth-submit").textContent = "הרשמה";
    document.getElementById("qa-switch-text").textContent = "כבר יש לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להתחברות";
  } else {
    document.getElementById("qa-auth-title").textContent = "כניסה לחשבון העסק";
    document.getElementById("qa-auth-sub").textContent = "נרשמים פעם אחת — ובכל כניסה הפרטים והלוגו שלכם כבר מוכנים.";
    document.getElementById("qa-auth-submit").textContent = "כניסה";
    document.getElementById("qa-switch-text").textContent = "עדיין אין לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להרשמה";
  }
}

function wireAuth() {
  document.getElementById("qa-switch-btn").addEventListener("click", () => {
    setAuthMode(authMode === "login" ? "signup" : "login");
  });

  document.getElementById("qa-forgot-btn").addEventListener("click", async () => {
    const email = document.getElementById("qa-email").value.trim();
    const err = document.getElementById("qa-auth-err");
    const msg = document.getElementById("qa-auth-msg");
    err.textContent = "";
    msg.textContent = "";
    if (!email) { err.textContent = "יש להזין קודם את כתובת המייל למעלה."; return; }
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    msg.textContent = error ? "לא הצלחנו לשלוח את המייל, נסו שוב." : "נשלח מייל לאיפוס סיסמה — תבדקו את תיבת הדואר.";
  });

  document.getElementById("qa-auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("qa-email").value.trim();
    const password = document.getElementById("qa-password").value;
    const err = document.getElementById("qa-auth-err");
    err.textContent = "";

    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) { err.textContent = "ההרשמה נכשלה: " + error.message; return; }
      if (data.session) return; // email confirmation is off — already logged in, onAuthStateChange handles it
      showCheckEmail(email);
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { err.textContent = "ההתחברות נכשלה: בדקו מייל וסיסמה ונסו שוב."; return; }
      // onAuthStateChange picks up the new session and routes onward.
    }
  });

  document.getElementById("qa-back-to-login").addEventListener("click", () => {
    document.getElementById("qa-check-email").style.display = "none";
    document.getElementById("qa-auth-form-wrap").style.display = "";
    setAuthMode("login");
  });
}

function showCheckEmail(email) {
  document.getElementById("qa-auth-form-wrap").style.display = "none";
  document.getElementById("qa-check-email").style.display = "";
  document.getElementById("qa-check-email-addr").textContent = email;
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showSection("qa-auth");
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
  document.getElementById("qa-logout-1").addEventListener("click", logout);

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
  document.getElementById("qa-logout-2").addEventListener("click", logout);
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
  wireAuth();
  wireProfileForm();
  setAuthMode("login");

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) {
      routeAfterAuth(session.user);
    } else if (!session) {
      currentUser = null;
      currentProfile = null;
      showSection("qa-auth");
    }
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) routeAfterAuth(data.session.user);
  });
});
