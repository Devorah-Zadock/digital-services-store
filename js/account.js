/* Central login/signup page for every DeskKit tool that needs an account.
   A tool redirects an unauthenticated visitor here with ?redirect=<page>;
   once a session exists (fresh login, or a confirmation/reset link that
   lands back here already authenticated), we send them straight there. */

const params = new URLSearchParams(location.search);
const redirectTarget = params.get("redirect") || "quote-app.html";
let authMode = "login"; // "login" | "signup"

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("qa-auth-err").textContent = "";
  document.getElementById("qa-auth-msg").textContent = "";
  if (mode === "signup") {
    document.getElementById("qa-auth-title").textContent = "פתיחת חשבון עסק";
    document.getElementById("qa-auth-submit").textContent = "הרשמה";
    document.getElementById("qa-switch-text").textContent = "כבר יש לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להתחברות";
  } else {
    document.getElementById("qa-auth-title").textContent = "כניסה לחשבון העסק";
    document.getElementById("qa-auth-submit").textContent = "כניסה";
    document.getElementById("qa-switch-text").textContent = "עדיין אין לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להרשמה";
  }
}

function showCheckEmail(email) {
  document.getElementById("qa-auth-form-wrap").style.display = "none";
  document.getElementById("qa-check-email").style.display = "";
  document.getElementById("qa-check-email-addr").textContent = email;
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
      redirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget),
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
        options: { emailRedirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget) },
      });
      if (error) { err.textContent = "ההרשמה נכשלה: " + error.message; return; }
      if (data.session) return; // email confirmation is off — already logged in, onAuthStateChange handles it
      showCheckEmail(email);
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) { err.textContent = "ההתחברות נכשלה: בדקו מייל וסיסמה ונסו שוב."; return; }
      // onAuthStateChange picks up the new session and redirects onward.
    }
  });

  document.getElementById("qa-back-to-login").addEventListener("click", () => {
    document.getElementById("qa-check-email").style.display = "none";
    document.getElementById("qa-auth-form-wrap").style.display = "";
    setAuthMode("login");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireAuth();
  setAuthMode("login");

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) window.location.href = redirectTarget;
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) window.location.href = redirectTarget;
  });
});
