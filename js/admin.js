/* Private admin page: password gate (client-side only — same honest
   security caveat as quotes.html, see README) + a link into the real,
   persistent feedback inbox (Formspree — see admin.html for why a static
   site needs an external service to keep messages after a refresh). */

/* SHA-256 hex of the current password. Default password: "deskkit2026".
   To change it: compute a new hash (e.g. in the browser console:
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("NEW_PASSWORD"))
   then hex-encode it) and replace the value below. */
const ADMIN_PASSWORD_HASH = "94735446ce9e3c2d0a4d9761268127335e9514fd1e0558b9d93e368b34fd5b62";
const ADMIN_AUTH_KEY = "deskkit-admin-auth";

/* Paste the Formspree submissions-dashboard URL here once it's set up
   (see the setup steps on this page). Leave empty to show the setup
   instructions instead. */
const ADMIN_INBOX_URL = "https://formspree.io/forms/moeagwvk/submissions";

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function showPanel() {
  document.getElementById("admin-gate").style.display = "none";
  document.getElementById("admin-panel").style.display = "";

  const status = document.getElementById("admin-status");
  const explain = document.getElementById("admin-explain");
  const frameWrap = document.getElementById("admin-inbox-frame-wrap");
  const frame = document.getElementById("admin-inbox-frame");
  const fallbackLink = document.getElementById("admin-inbox-fallback-link");
  const setupCard = document.getElementById("admin-setup-card");

  if (ADMIN_INBOX_URL) {
    status.innerHTML = `<span class="admin-status connected">מחובר</span>`;
    explain.textContent = "הודעות שנשלחות דרך טופס המשוב באתר נשמרות כאן לצמיתות, ולא נעלמות עם רענון — כי הן מאוחסנות בשרת חיצוני, לא בדפדפן.";
    frame.src = ADMIN_INBOX_URL;
    fallbackLink.href = ADMIN_INBOX_URL;
    frameWrap.style.display = "";
    setupCard.style.display = "none";
  } else {
    status.innerHTML = `<span class="admin-status pending">עוד לא חובר</span>`;
    explain.textContent = "תיבת ההודעות עוד לא מחוברת — עד אז, הודעות משוב שנשלחות באתר מוצגות למבקר עם \"תודה על המשוב!\", אבל לא נשמרות באף מקום שאת יכולה לראות. פועלים לפי ההוראות למטה כדי לחבר אותה (לוקח כמה דקות, חד-פעמי).";
    frameWrap.style.display = "none";
    setupCard.style.display = "";
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
