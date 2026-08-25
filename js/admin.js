/* Private admin page: password gate (client-side only — same honest
   security caveat as quotes.html, see README) + a live feed of feedback
   submitted through the site.

   Feedback is submitted (from js/widgets.js) into a Google Form, which
   Google Forms automatically saves as rows in a linked Google Sheet — free,
   no submission limit, and it survives refresh because it lives on
   Google's servers, not the visitor's browser. This page reads that same
   sheet back (as public CSV export — that requires the sheet to be shared
   as "Anyone with the link: Viewer") and renders it as a feed below. */

/* SHA-256 hex of the current password. Default password: "deskkit2026".
   To change it: compute a new hash (e.g. in the browser console:
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEW_PASSWORD"))
   then hex-encode it) and replace the value below. */
const ADMIN_PASSWORD_HASH = "94735446ce9e3c2d0a4d9761268127335e9514fd1e0558b9d93e368b34fd5b62";
const ADMIN_AUTH_KEY = "deskkit-admin-auth";

/* The Sheet ID from the linked Google Sheet's URL (the long string between
   /d/ and /edit). GOOGLE_SHEET_GID is which tab to read — "0" is almost
   always right, since it's the first/only tab Google Forms creates.
   See README for exact setup steps. Leave GOOGLE_SHEET_ID empty to show
   setup instructions instead of the feed. */
const GOOGLE_SHEET_ID = "19rpPKlSp73En7PUpCc6nJhv-qlC8ydLaQlpn6XAlrPs";
const GOOGLE_SHEET_GID = "0";

function escapeHtmlA(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Minimal CSV parser: handles quoted fields, embedded commas/newlines, and
   escaped ("") quotes — Google's CSV export needs this, a plain split(",")
   would break on any message containing a comma. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function starsHtml(ratingRaw) {
  const n = Math.max(0, Math.min(5, parseInt(ratingRaw, 10) || 0));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function feedbackItemHtml(cols) {
  const [timestamp, rating, message, page] = cols;
  return `
  <div class="feedback-item">
    <div class="feedback-item-head">
      <span class="feedback-stars">${starsHtml(rating)}</span>
      <span class="feedback-date">${escapeHtmlA(timestamp)}</span>
    </div>
    ${message && message.trim() ? `<p class="feedback-msg">${escapeHtmlA(message)}</p>` : `<p class="feedback-msg feedback-msg-empty">(בלי הערה)</p>`}
    ${page && page.trim() ? `<div class="feedback-page">מהעמוד: ${escapeHtmlA(page)}</div>` : ""}
  </div>`;
}

async function loadFeedback() {
  const feed = document.getElementById("admin-feed");
  feed.innerHTML = `<p class="admin-loading">טוען הודעות…</p>`;
  try {
    const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}&_=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad response");
    const rows = parseCsv(await res.text()).filter((r) => r.some((c) => c.trim()));
    const dataRows = rows.slice(1); // drop header row
    if (!dataRows.length) {
      feed.innerHTML = `<p class="admin-empty">עדיין אין הודעות משוב.</p>`;
      return;
    }
    feed.innerHTML = dataRows.slice().reverse().map(feedbackItemHtml).join("");
  } catch (err) {
    feed.innerHTML = `<p class="admin-error">לא הצלחנו לטעון את ההודעות. ודאו שהגיליון משותף כ"כל מי שיש לו את הקישור — צופה", ושה-ID נכון ב-GOOGLE_SHEET_ID.</p>`;
  }
}

function showPanel() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";

  const status = document.getElementById("admin-status");
  const setupCard = document.getElementById("admin-setup-card");
  const feedCard = document.getElementById("admin-feed-card");

  if (GOOGLE_SHEET_ID) {
    status.innerHTML = `<span class="admin-status connected">מחובר</span>`;
    setupCard.style.display = "none";
    feedCard.style.display = "";
    loadFeedback();
    document.getElementById("admin-refresh").addEventListener("click", loadFeedback);
  } else {
    status.innerHTML = `<span class="admin-status pending">עוד לא חובר</span>`;
    setupCard.style.display = "";
    feedCard.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem(ADMIN_AUTH_KEY);
  if (stored === ADMIN_PASSWORD_HASH) {
    showPanel();
    return;
  }

  const form = document.getElementById("admin-login-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("admin-password");
    const err = document.getElementById("admin-login-err");
    const hash = await sha256Hex(input.value);
    if (hash === ADMIN_PASSWORD_HASH) {
      localStorage.setItem(ADMIN_AUTH_KEY, hash);
      showPanel();
    } else {
      err.textContent = "סיסמה שגויה.";
      input.value = "";
      input.focus();
    }
  });
});
