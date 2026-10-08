/* "My account" page: change email, change password, delete account.
   Deletion goes through the delete-account Edge Function (needs the
   service-role key to actually remove the Supabase Auth user, so it can't
   run client-side) — self-service, typing the account's own email
   confirms it, no manual request to us needed. */

// clearLocalDeskkitContent() (used on account deletion, below) now lives
// in js/main.js — shared with the same-purpose guard in
// builder-cloud-save.js/site-cloud-save.js that clears a PREVIOUS
// account's local draft the moment a different one signs in on the same
// browser, rather than only at account-deletion time.

/* Every RLS-protected table is queried with an explicit .eq("user_id"/
   "id", userId) on top of RLS — belt and suspenders, and it means this
   function reads exactly like every other per-user query in this
   project, nothing special-cased for being "the export". Deliberately
   client-side only (no Edge Function): these are plain, already-scoped
   reads the signed-in user is allowed to make directly, so a server
   round trip would add nothing except another thing to keep in sync. */
async function exportMyData(userId, email) {
  const [profile, cvs, sites, quotes, invoices, schedules] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
    // cv_saves is one row per SAVED CV now (see supabase/sql/
    // cv_saves_multi.sql), not one per user — "export my data" must
    // include every one of them, same full-array shape as sites/quotes/
    // invoices/schedules below, not just whichever was touched last.
    supabaseClient.from("cv_saves").select("*").eq("user_id", userId),
    supabaseClient.from("site_projects").select("*").eq("user_id", userId),
    supabaseClient.from("quote_saves").select("*").eq("user_id", userId),
    supabaseClient.from("invoice_saves").select("*").eq("user_id", userId),
    supabaseClient.from("schedule_projects").select("*").eq("user_id", userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: { email },
    businessProfile: profile.data || null,
    cvs: (cvs.data || []).map((r) => r.data),
    sites: sites.data || [],
    quotes: quotes.data || [],
    invoices: invoices.data || [],
    schedules: schedules.data || [],
  };
}

/* Sensitive changes (email, password, deleting the account) re-check
   who's at the keyboard instead of trusting any still-open session: an
   account with a password must type it again; a Google-only account must
   have signed in within the last 15 minutes. Signing in with the password
   here also counts as that fresh sign-in for delete-account's own check. */
const DK_FRESH_LOGIN_MS = 15 * 60 * 1000;
const DK_REAUTH_GOOGLE_MSG = "מטעמי אבטחה צריך להתחבר מחדש: התנתקו, התחברו שוב עם Google, וחזרו לכאן תוך 15 דקות.";

function dkHasPassword(user) {
  const providers = (user && user.app_metadata && user.app_metadata.providers) || [];
  return providers.includes("email") || ((user && user.identities) || []).some((i) => i.provider === "email");
}

// Returns an error message, or "" when it's OK to go ahead.
async function dkReauthenticate(user, password) {
  if (dkHasPassword(user)) {
    if (!password) return "יש להזין את הסיסמה הנוכחית.";
    const { error } = await supabaseClient.auth.signInWithPassword({ email: user.email, password });
    return error ? "הסיסמה הנוכחית שגויה." : "";
  }
  const last = Date.parse(user.last_sign_in_at || "");
  return last && Date.now() - last < DK_FRESH_LOGIN_MS ? "" : DK_REAUTH_GOOGLE_MSG;
}

document.addEventListener("DOMContentLoaded", () => {
  let currentUserEmail = "";
  let currentUserId = "";
  let currentUser = null;
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) return; // require-auth.js already redirects; nothing to do here
    currentUser = user;
    currentUserEmail = user.email;
    currentUserId = user.id;
    document.getElementById("as-current-email").textContent = user.email;
    document.getElementById("as-delete-email-hint").textContent = user.email;
    const hasPw = dkHasPassword(user);
    document.querySelectorAll(".as-current-pw-field").forEach((el) => { el.hidden = !hasPw; });
  });

  const exportBtn = document.getElementById("as-export-btn");
  const exportMsg = document.getElementById("as-export-msg");
  if (exportBtn) {
    exportBtn.addEventListener("click", async () => {
      if (!currentUserId) return;
      exportBtn.disabled = true;
      exportMsg.textContent = "אוספים את המידע...";
      try {
        const payload = await exportMyData(currentUserId, currentUserEmail);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `deskkit-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        exportMsg.textContent = "הקובץ הורד בהצלחה.";
      } catch (err) {
        exportMsg.textContent = "משהו השתבש — נסו שוב בעוד רגע.";
      } finally {
        exportBtn.disabled = false;
      }
    });
  }

  const startBtn = document.getElementById("as-delete-start");
  const confirmBox = document.getElementById("as-delete-confirm");
  const emailInput = document.getElementById("as-delete-email-input");
  const confirmBtn = document.getElementById("as-delete-confirm-btn");
  const cancelBtn = document.getElementById("as-delete-cancel");
  const deleteErr = document.getElementById("as-delete-err");

  startBtn.addEventListener("click", () => {
    startBtn.style.display = "none";
    confirmBox.style.display = "block";
    emailInput.focus();
  });
  cancelBtn.addEventListener("click", () => {
    confirmBox.style.display = "none";
    startBtn.style.display = "";
    emailInput.value = "";
    deleteErr.textContent = "";
    confirmBtn.disabled = true;
  });
  emailInput.addEventListener("input", () => {
    confirmBtn.disabled = emailInput.value.trim().toLowerCase() !== currentUserEmail.toLowerCase();
  });
  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "מוחקים…";
    deleteErr.textContent = "";
    try {
      const reauthErr = currentUser ? await dkReauthenticate(currentUser, document.getElementById("as-delete-password").value) : "";
      if (reauthErr) {
        deleteErr.textContent = reauthErr;
        confirmBtn.textContent = "מחיקה סופית";
        confirmBtn.disabled = false;
        return;
      }
      const { data, error } = await supabaseClient.functions.invoke("delete-account", {});
      if (error && error.context && typeof error.context.json === "function") {
        const body = await error.context.json().catch(() => null);
        if (body && body.reason === "reauth") {
          deleteErr.textContent = dkHasPassword(currentUser) ? "מטעמי אבטחה, נסו שוב עם הסיסמה שלכם." : DK_REAUTH_GOOGLE_MSG;
          confirmBtn.textContent = "מחיקה סופית";
          confirmBtn.disabled = false;
          return;
        }
      }
      if (error || !data || !data.success) {
        deleteErr.textContent = "המחיקה נכשלה. נסו שוב, או כתבו לנו ונטפל בזה ידנית.";
        confirmBtn.textContent = "מחיקה סופית";
        confirmBtn.disabled = false;
        return;
      }
      clearLocalDeskkitContent();
      await supabaseClient.auth.signOut();
      window.location.href = "index.html?accountDeleted=1";
    } catch (err) {
      deleteErr.textContent = "שגיאת חיבור. נסו שוב בעוד רגע.";
      confirmBtn.textContent = "מחיקה סופית";
      confirmBtn.disabled = false;
    }
  });

  document.getElementById("as-email-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newEmail = document.getElementById("as-new-email").value.trim();
    const err = document.getElementById("as-email-err");
    const msg = document.getElementById("as-email-msg");
    err.textContent = "";
    msg.textContent = "";
    const reauthErr = currentUser ? await dkReauthenticate(currentUser, document.getElementById("as-email-current-password").value) : "";
    if (reauthErr) { err.textContent = reauthErr; return; }
    const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
    if (error) { err.textContent = "העדכון נכשל, נסו שוב."; return; }
    msg.textContent = "נשלח מייל אישור לכתובת החדשה — לחצו על הקישור שם כדי לסיים.";
    e.target.reset();
  });

  document.getElementById("as-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = document.getElementById("as-new-password").value;
    const pw2 = document.getElementById("as-new-password-confirm").value;
    const err = document.getElementById("as-password-err");
    const msg = document.getElementById("as-password-msg");
    err.textContent = "";
    msg.textContent = "";
    if (pw !== pw2) { err.textContent = "הסיסמאות לא תואמות."; return; }
    const reauthErr = currentUser ? await dkReauthenticate(currentUser, document.getElementById("as-current-password").value) : "";
    if (reauthErr) { err.textContent = reauthErr; return; }
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) {
      err.textContent = /weak|leaked|pwned|characters/i.test(error.message || "")
        ? "הסיסמה חלשה מדי או שהופיעה בדליפת מידע — בחרו סיסמה אחרת (לפחות 8 תווים)."
        : "העדכון נכשל, נסו שוב.";
      return;
    }
    // Anyone who was signed in elsewhere with the old password is signed
    // out — the whole point of changing it after a suspected leak.
    await supabaseClient.auth.signOut({ scope: "others" }).catch(() => {});
    msg.textContent = "הסיסמה עודכנה בהצלחה. חיבורים במכשירים אחרים נותקו.";
    e.target.reset();
  });
});
