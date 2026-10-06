/* Central login/signup page for every DeskKit tool that needs an account.
   A tool redirects an unauthenticated visitor here with ?redirect=<page>;
   once a session exists (fresh login, or a confirmation/reset link that
   lands back here already authenticated), we send them straight there. */

const params = new URLSearchParams(location.search);
const redirectTarget = params.get("redirect") || "tools.html";
let authMode = "login"; // "login" | "signup"

function setAuthMode(mode) {
  authMode = mode;
  document.getElementById("qa-auth-err").textContent = "";
  document.getElementById("qa-auth-msg").textContent = "";
  if (mode === "signup") {
    document.getElementById("qa-auth-title").textContent = "הרשמה";
    document.getElementById("qa-auth-submit").textContent = "הרשמה";
    document.getElementById("qa-switch-text").textContent = "כבר יש לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להתחברות";
  } else {
    document.getElementById("qa-auth-title").textContent = "כניסה";
    document.getElementById("qa-auth-submit").textContent = "כניסה";
    document.getElementById("qa-switch-text").textContent = "עדיין אין לכם חשבון?";
    document.getElementById("qa-switch-btn").textContent = "להרשמה";
  }
}

/* Supabase Auth's own error.message is always English and often
   genuinely technical ("Password should be at least 6 characters.",
   raw rate-limit text) — confirmed-live bug this fixes: it used to be
   concatenated straight into an otherwise fully-Hebrew form, right at
   the one moment (an error) a non-English-reading visitor most needs
   something they can actually read. context is "signup"|"login", for
   the handful of messages worth a different Hebrew phrasing depending
   on which form this was. */
function dkAuthErrorMessage(error, context) {
  const msg = (error && error.message) || "";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) return "פרטי ההתחברות שגויים — בדקו מייל וסיסמה ונסו שוב.";
  if (lower.includes("email not confirmed")) return "המייל שלכם עדיין לא אומת — בדקו את תיבת הדואר (כולל תיקיית ספאם) ולחצו על קישור האימות.";
  if (lower.includes("password should be at least") || lower.includes("password is too short")) return "הסיסמה קצרה מדי — נדרשים לפחות 6 תווים.";
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already registered")) return "כתובת המייל הזו כבר רשומה אצלנו — נסו להתחבר במקום להירשם.";
  if (lower.includes("rate limit") || lower.includes("too many requests")) return "יותר מדי ניסיונות ברצף — המתינו כמה דקות ונסו שוב.";
  return context === "signup"
    ? "ההרשמה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב בעוד רגע."
    : "ההתחברות נכשלה. בדקו את החיבור לאינטרנט ונסו שוב בעוד רגע.";
}

function showCheckEmail(email) {
  document.getElementById("qa-auth-form-wrap").style.display = "none";
  document.getElementById("qa-check-email").style.display = "";
  document.getElementById("qa-check-email-addr").textContent = email;
}

function showResetPassword() {
  document.getElementById("qa-auth-form-wrap").style.display = "none";
  document.getElementById("qa-check-email").style.display = "none";
  document.getElementById("qa-reset-password").style.display = "";
}

function wireResetPassword() {
  document.getElementById("qa-reset-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = document.getElementById("qa-new-password").value;
    const pw2 = document.getElementById("qa-new-password-confirm").value;
    const err = document.getElementById("qa-reset-err");
    err.textContent = "";
    if (pw !== pw2) { err.textContent = "הסיסמאות לא תואמות."; return; }
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) { err.textContent = "העדכון נכשל, נסו שוב."; return; }
    window.location.href = redirectTarget;
  });
}

function wireAuth() {
  document.getElementById("qa-google-btn").addEventListener("click", async () => {
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget) },
      });
      if (error) document.getElementById("qa-auth-err").textContent = "לא הצלחנו לפתוח את חלון ההתחברות של Google. נסו שוב.";
    } catch (_networkErr) {
      document.getElementById("qa-auth-err").textContent = "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.";
    }
  });

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
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget),
      });
      msg.textContent = error ? "לא הצלחנו לשלוח את המייל, נסו שוב." : "נשלח מייל לאיפוס סיסמה — תבדקו את תיבת הדואר.";
    } catch (_networkErr) {
      err.textContent = "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.";
    }
  });

  document.getElementById("qa-auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("qa-email").value.trim();
    const password = document.getElementById("qa-password").value;
    const err = document.getElementById("qa-auth-err");
    const submitBtn = document.getElementById("qa-auth-submit");
    err.textContent = "";

    // Confirmed-live bug this whole try/catch fixes: nothing here ever
    // caught a thrown error — only the {error} Supabase normally
    // RESOLVES with, via a regular return value. A real network failure
    // (offline, DNS, a dropped connection — exactly what this sandbox
    // itself hit against *.supabase.co) throws instead of resolving,
    // which an async submit handler with no catch just lets become an
    // unhandled rejection: no message shown, the button never
    // re-enables, the form looks like it silently did nothing.
    submitBtn.disabled = true;
    try {
      if (authMode === "signup") {
        const { data, error } = await supabaseClient.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget) },
        });
        if (error) { err.textContent = dkAuthErrorMessage(error, "signup"); return; }
        if (data.session) return; // email confirmation is off — already logged in, onAuthStateChange handles it
        // Supabase's documented anti-enumeration behavior for signUp()
        // against an email that already has a confirmed account: no
        // error, no session — identical shape to a genuine new signup.
        // Without this check, someone who forgot they already have an
        // account was told "נרשמת! בדקו את תיבת הדואר", which is false —
        // no new account was created.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          err.textContent = "כתובת המייל הזו כבר רשומה אצלנו — נסו להתחבר במקום.";
          return;
        }
        showCheckEmail(email);
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) { err.textContent = dkAuthErrorMessage(error, "login"); return; }
        // onAuthStateChange picks up the new session and redirects onward.
      }
    } catch (_networkErr) {
      err.textContent = "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.";
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById("qa-back-to-login").addEventListener("click", () => {
    document.getElementById("qa-check-email").style.display = "none";
    document.getElementById("qa-auth-form-wrap").style.display = "";
    setAuthMode("login");
  });
}

let isPasswordRecovery = false;

document.addEventListener("DOMContentLoaded", () => {
  wireAuth();
  wireResetPassword();
  setAuthMode("login");

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      isPasswordRecovery = true;
      showResetPassword();
      return;
    }
    if (session && session.user && !isPasswordRecovery) window.location.href = redirectTarget;
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user && !isPasswordRecovery) window.location.href = redirectTarget;
  });
});
