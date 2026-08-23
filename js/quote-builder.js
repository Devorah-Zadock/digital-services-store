/* Private quote-builder logic: password gate (client-side only — see
   README for the honest security caveat) + live form + PDF export. */

/* SHA-256 hex of the current password. Never store the plaintext here.
   To change the password: compute a new hash (e.g. in the browser
   console: crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEW_PASSWORD"))
   then hex-encode it) and replace the value below. */
const QUOTE_PASSWORD_HASH = "ff008f609e45ce8592322c7b5d7de2cdaf9dfb420812f69b186ba14bacb70318";
const QUOTE_AUTH_KEY = "deskkit-quote-auth";

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

let quoteState = null;

function todayHebrew() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function deepCloneQ(o) { return JSON.parse(JSON.stringify(o)); }

function renderQuotePreview() {
  document.getElementById("quote-preview").innerHTML = renderQuoteHtml(quoteState);
}

function dateBlockHtml(date, i, total) {
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

function renderQuoteForm() {
  const q = quoteState;
  document.getElementById("qf-businessName").value = q.businessName;
  document.getElementById("qf-tagline1").value = q.tagline1;
  document.getElementById("qf-tagline2").value = q.tagline2;
  document.getElementById("qf-email").value = q.email;
  document.getElementById("qf-businessNumber").value = q.businessNumber;
  document.getElementById("qf-today").value = q.today;
  document.getElementById("qf-recipient").value = q.recipient;
  document.getElementById("qf-eventName").value = q.eventName;
  document.getElementById("qf-description").value = q.description;
  document.getElementById("qf-price").value = q.price;
  document.getElementById("qf-vatNote").value = q.vatNote;
  document.getElementById("qf-policeNote").value = q.policeNote;
  document.getElementById("qf-signerName").value = q.signerName;
  document.getElementById("qf-phone").value = q.phone;
  document.getElementById("qf-fax").value = q.fax;
  document.getElementById("dates-list").innerHTML = q.eventDates.map((d, i) => dateBlockHtml(d, i, q.eventDates.length)).join("");
}

function wireQuoteForm() {
  const map = {
    "qf-businessName": "businessName", "qf-tagline1": "tagline1", "qf-tagline2": "tagline2",
    "qf-email": "email", "qf-businessNumber": "businessNumber", "qf-today": "today",
    "qf-recipient": "recipient", "qf-eventName": "eventName", "qf-description": "description",
    "qf-price": "price", "qf-vatNote": "vatNote", "qf-policeNote": "policeNote",
    "qf-signerName": "signerName", "qf-phone": "phone", "qf-fax": "fax",
  };
  Object.entries(map).forEach(([id, key]) => {
    document.getElementById(id).addEventListener("input", (e) => {
      quoteState[key] = e.target.value;
      renderQuotePreview();
    });
  });

  document.getElementById("add-date").addEventListener("click", () => {
    quoteState.eventDates.push("");
    renderQuoteForm();
    renderQuotePreview();
  });
  document.getElementById("dates-list").addEventListener("input", (e) => {
    const idx = e.target.dataset.date;
    if (idx === undefined) return;
    quoteState.eventDates[idx] = e.target.value;
    renderQuotePreview();
  });
  document.getElementById("dates-list").addEventListener("click", (e) => {
    const idx = e.target.dataset.dremove;
    if (idx === undefined) return;
    if (quoteState.eventDates.length <= 1) return; // always need at least one event date
    quoteState.eventDates.splice(Number(idx), 1);
    renderQuoteForm();
    renderQuotePreview();
  });

  document.getElementById("quote-download-btn").addEventListener("click", () => window.print());
}

function showBuilder() {
  document.getElementById("quote-gate").style.display = "none";
  document.getElementById("quote-app").style.display = "";
  quoteState = deepCloneQ(QUOTE_DEFAULT);
  quoteState.today = todayHebrew();
  renderQuoteForm();
  renderQuotePreview();
  wireQuoteForm();
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem(QUOTE_AUTH_KEY);
  if (stored === QUOTE_PASSWORD_HASH) {
    showBuilder();
    return;
  }

  const form = document.getElementById("quote-login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("quote-password");
    const err = document.getElementById("quote-login-err");
    const hash = await sha256Hex(input.value);
    if (hash === QUOTE_PASSWORD_HASH) {
      localStorage.setItem(QUOTE_AUTH_KEY, hash);
      showBuilder();
    } else {
      err.textContent = "סיסמה שגויה.";
      input.value = "";
      input.focus();
    }
  });
});
