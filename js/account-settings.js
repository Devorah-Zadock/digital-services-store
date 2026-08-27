/* "My account" page: change email, change password, request account
   deletion. Deletion has no self-service API without exposing the
   service_role key client-side, so it's a mailto request instead —
   handled manually in the Supabase dashboard for now. */

document.addEventListener("DOMContentLoaded", () => {
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) return; // require-auth.js already redirects; nothing to do here
    document.getElementById("as-current-email").textContent = user.email;
    const subject = encodeURIComponent("בקשת מחיקת חשבון DeskKit");
    const body = encodeURIComponent("שלום, אני מבקש/ת למחוק את החשבון שלי בכתובת: " + user.email);
    document.getElementById("as-delete-link").href = "mailto:digital.dz.studio@gmail.com?subject=" + subject + "&body=" + body;
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
