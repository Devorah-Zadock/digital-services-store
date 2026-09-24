/* "My account" page: change email, change password, delete account.
   Deletion goes through the delete-account Edge Function (needs the
   service-role key to actually remove the Supabase Auth user, so it can't
   run client-side) — self-service, typing the account's own email
   confirms it, no manual request to us needed. */

/* delete-account only ever clears the SERVER's copy of a user's data —
   auth.signOut() clears Supabase's own session token, but nothing used
   to clear THIS browser's local working copies (a CV draft, a half-built
   site, saved CRM demo leads — all real content someone typed in, cached
   in localStorage for offline-friendly editing, same as every builder in
   this project). Left alone, that content would still sit in this
   browser's localStorage after "deleting my account". Only removes keys
   under DeskKit's own content prefixes — never the plain device/UI
   preferences (language, sidebar width, cookie-notice dismissal), which
   aren't account data and belong to whoever next uses this browser. */
function clearLocalDeskkitContent() {
  const contentPrefixes = [
    "deskkit_cv_",              // CV drafts + "last slug" pointer
    "deskkit_sites_data_v1_",   // site drafts (per template)
    "deskkit_sites_last_template",
    "deskkit_sites_unlocked_",  // site purchase-unlock flags
    "deskkit_crm_",             // CRM demo leads + unlock flag
    "deskkit_schedule_unlocked_", // schedule-builder unlock flag
  ];
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && contentPrefixes.some((p) => key === p || key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch (err) { /* storage unavailable — nothing to clear */ }
}

document.addEventListener("DOMContentLoaded", () => {
  let currentUserEmail = "";
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) return; // require-auth.js already redirects; nothing to do here
    currentUserEmail = user.email;
    document.getElementById("as-current-email").textContent = user.email;
    document.getElementById("as-delete-email-hint").textContent = user.email;
  });

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
      const { data, error } = await supabaseClient.functions.invoke("delete-account", {});
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
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) { err.textContent = "העדכון נכשל, נסו שוב."; return; }
    msg.textContent = "הסיסמה עודכנה בהצלחה.";
    e.target.reset();
  });
});
