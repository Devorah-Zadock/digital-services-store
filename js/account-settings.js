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

/* Every RLS-protected table is queried with an explicit .eq("user_id"/
   "id", userId) on top of RLS — belt and suspenders, and it means this
   function reads exactly like every other per-user query in this
   project, nothing special-cased for being "the export". Deliberately
   client-side only (no Edge Function): these are plain, already-scoped
   reads the signed-in user is allowed to make directly, so a server
   round trip would add nothing except another thing to keep in sync. */
async function exportMyData(userId, email) {
  const [profile, cv, sites, quotes, invoices, schedules] = await Promise.all([
    supabaseClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabaseClient.from("cv_saves").select("data, updated_at").eq("user_id", userId).maybeSingle(),
    supabaseClient.from("site_projects").select("*").eq("user_id", userId),
    supabaseClient.from("quote_saves").select("*").eq("user_id", userId),
    supabaseClient.from("invoice_saves").select("*").eq("user_id", userId),
    supabaseClient.from("schedule_projects").select("*").eq("user_id", userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account: { email },
    businessProfile: profile.data || null,
    cv: (cv.data && cv.data.data) || null,
    sites: sites.data || [],
    quotes: quotes.data || [],
    invoices: invoices.data || [],
    schedules: schedules.data || [],
  };
}

document.addEventListener("DOMContentLoaded", () => {
  let currentUserEmail = "";
  let currentUserId = "";
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) return; // require-auth.js already redirects; nothing to do here
    currentUserEmail = user.email;
    currentUserId = user.id;
    document.getElementById("as-current-email").textContent = user.email;
    document.getElementById("as-delete-email-hint").textContent = user.email;
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
