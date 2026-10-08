/* Central login/signup page for every DeskKit tool that needs an account.
   A tool redirects an unauthenticated visitor here with ?redirect=<page>;
   once a session exists (fresh login, or a confirmation/reset link that
   lands back here already authenticated), we send them straight there. */

const params = new URLSearchParams(location.search);

/* ?redirect= comes from the URL, so anyone can craft it. Only same-origin
   http(s) pages are allowed — never "javascript:", another site, or a
   protocol-relative "//evil.com" — otherwise a link to this page could
   run code on deskkit.co.il (and read the session) or bounce a freshly
   signed-in user to a phishing page. Anything else falls back to tools. */
function safeRedirectTarget(raw) {
  if (!raw) return "tools.html";
  try {
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin || (u.protocol !== "https:" && u.protocol !== "http:")) return "tools.html";
    if (/^\/api\//i.test(u.pathname)) return "tools.html";
    return u.pathname + u.search + u.hash;
  } catch (_badUrl) {
    return "tools.html";
  }
}
const redirectTarget = safeRedirectTarget(params.get("redirect"));
let authMode = "login"; // "login" | "signup"

// Same defensive lookup as js/header.js's dkHeaderLabel: js/i18n.js is
// loaded on this page (unlike most of the plain tool pages), but the
// Hebrew fallback is real text, not just a dictionary key, in case this
// page is ever loaded before i18n.js runs.
function dkAcctLabel(key, fallback) {
  const lang = typeof currentLang === "function" ? currentLang() : "he";
  const dict = (typeof I18N !== "undefined" && I18N[lang]) || null;
  return (dict && dict[key]) || fallback;
}

function setAuthMode(mode) {
  authMode = mode;
  // 8+ characters for NEW passwords only — existing accounts with an
  // older, shorter password must still be able to log in.
  const pwInput = document.getElementById("qa-password");
  if (pwInput) {
    if (mode === "signup") { pwInput.minLength = 8; pwInput.autocomplete = "new-password"; }
    else { pwInput.removeAttribute("minlength"); pwInput.autocomplete = "current-password"; }
  }
  document.getElementById("qa-auth-err").textContent = "";
  document.getElementById("qa-auth-msg").textContent = "";
  if (mode === "signup") {
    document.getElementById("qa-auth-title").textContent = dkAcctLabel("acct_signup_title", "הרשמה");
    document.getElementById("qa-auth-submit").textContent = dkAcctLabel("acct_signup_title", "הרשמה");
    document.getElementById("qa-switch-text").textContent = dkAcctLabel("acct_have_account", "כבר יש לכם חשבון?");
    document.getElementById("qa-switch-btn").textContent = dkAcctLabel("acct_to_login", "להתחברות");
  } else {
    document.getElementById("qa-auth-title").textContent = dkAcctLabel("acct_login_title", "כניסה");
    document.getElementById("qa-auth-submit").textContent = dkAcctLabel("acct_login_title", "כניסה");
    document.getElementById("qa-switch-text").textContent = dkAcctLabel("acct_no_account", "עדיין אין לכם חשבון?");
    document.getElementById("qa-switch-btn").textContent = dkAcctLabel("acct_to_signup", "להרשמה");
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
  if (lower.includes("invalid login credentials")) return dkAcctLabel("acct_err_invalid_credentials", "פרטי ההתחברות שגויים — בדקו מייל וסיסמה ונסו שוב.");
  if (lower.includes("email not confirmed")) return dkAcctLabel("acct_err_email_not_confirmed", "המייל שלכם עדיין לא אומת — בדקו את תיבת הדואר (כולל תיקיית ספאם) ולחצו על קישור האימות.");
  if (lower.includes("password should be at least") || lower.includes("password is too short")) return dkAcctLabel("acct_err_password_too_short", "הסיסמה קצרה מדי — נדרשים לפחות 8 תווים.");
  if (lower.includes("pwned") || lower.includes("leaked") || lower.includes("weak") || lower.includes("known to be")) return dkAcctLabel("acct_err_password_weak", "הסיסמה הזו חלשה מדי או שהופיעה בדליפת מידע — בחרו סיסמה אחרת.");
  if (lower.includes("captcha")) return dkAcctLabel("acct_err_captcha", "אימות האבטחה נכשל — רעננו את הדף ונסו שוב.");
  if (lower.includes("already registered") || lower.includes("already exists") || lower.includes("user already registered")) return dkAcctLabel("acct_err_already_registered", "כתובת המייל הזו כבר רשומה אצלנו — נסו להתחבר במקום להירשם.");
  if (lower.includes("rate limit") || lower.includes("too many requests")) return dkAcctLabel("acct_err_rate_limit", "יותר מדי ניסיונות ברצף — המתינו כמה דקות ונסו שוב.");
  return context === "signup"
    ? dkAcctLabel("acct_err_signup_failed", "ההרשמה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב בעוד רגע.")
    : dkAcctLabel("acct_err_login_failed", "ההתחברות נכשלה. בדקו את החיבור לאינטרנט ונסו שוב בעוד רגע.");
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
    if (pw !== pw2) { err.textContent = dkAcctLabel("acct_err_password_mismatch", "הסיסמאות לא תואמות."); return; }
    const { error } = await supabaseClient.auth.updateUser({ password: pw });
    if (error) { err.textContent = dkAcctLabel("acct_err_update_failed", "העדכון נכשל, נסו שוב."); return; }
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
      if (error) document.getElementById("qa-auth-err").textContent = dkAcctLabel("acct_err_google_failed", "לא הצלחנו לפתוח את חלון ההתחברות של Google. נסו שוב.");
    } catch (_networkErr) {
      document.getElementById("qa-auth-err").textContent = dkAcctLabel("acct_err_network", "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
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
    if (!email) { err.textContent = dkAcctLabel("acct_err_email_required", "יש להזין קודם את כתובת המייל למעלה."); return; }
    try {
      const captchaToken = await dkCaptchaToken("qa-captcha");
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget),
        captchaToken,
      });
      dkCaptchaReset("qa-captcha");
      msg.textContent = error
        ? dkAcctLabel("acct_err_reset_send_failed", "לא הצלחנו לשלוח את המייל, נסו שוב.")
        : dkAcctLabel("acct_msg_reset_sent", "נשלח מייל לאיפוס סיסמה — תבדקו את תיבת הדואר.");
    } catch (_networkErr) {
      err.textContent = dkAcctLabel("acct_err_network", "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
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
        const captchaToken = await dkCaptchaToken("qa-captcha");
        const { data, error } = await supabaseClient.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname + "?redirect=" + encodeURIComponent(redirectTarget), captchaToken },
        });
        dkCaptchaReset("qa-captcha");
        if (error) { err.textContent = dkAuthErrorMessage(error, "signup"); return; }
        if (data.session) return; // email confirmation is off — already logged in, onAuthStateChange handles it
        // Supabase's documented anti-enumeration behavior for signUp()
        // against an email that already has a confirmed account: no
        // error, no session — identical shape to a genuine new signup.
        // Without this check, someone who forgot they already have an
        // account was told "נרשמת! בדקו את תיבת הדואר", which is false —
        // no new account was created.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          err.textContent = dkAcctLabel("acct_err_already_registered_short", "כתובת המייל הזו כבר רשומה אצלנו — נסו להתחבר במקום.");
          return;
        }
        showCheckEmail(email);
      } else {
        const captchaToken = await dkCaptchaToken("qa-captcha");
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password, options: { captchaToken } });
        dkCaptchaReset("qa-captcha");
        if (error) { err.textContent = dkAuthErrorMessage(error, "login"); return; }
        // onAuthStateChange picks up the new session and redirects onward.
      }
    } catch (_networkErr) {
      err.textContent = dkAcctLabel("acct_err_network", "אירעה תקלת תקשורת. בדקו את החיבור לאינטרנט ונסו שוב.");
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

// A recovery link lands here with type=recovery in the URL. Checked
// synchronously too: getSession() can resolve before supabase-js fires
// PASSWORD_RECOVERY, which would otherwise redirect away before the
// "choose a new password" form ever shows.
let isPasswordRecovery = /(^|[#&?])type=recovery(&|$)/.test(location.hash) || params.get("type") === "recovery";

document.addEventListener("DOMContentLoaded", () => {
  dkCaptchaMount("qa-captcha"); // no-op unless CAPTCHA is configured (js/captcha.js)
  wireAuth();
  wireResetPassword();
  setAuthMode("login");
  // qa-auth-title/-submit/qa-switch-text/-btn are deliberately NOT
  // data-i18n (setAuthMode fully owns their text, toggling between the
  // login/signup wording) — the sweep in applyLang() would otherwise
  // reset them to whichever mode's text happens to sit in the static
  // HTML, even while actually showing the other mode. Re-running
  // setAuthMode for the CURRENT mode on a language change keeps it
  // correct either way.
  document.addEventListener("deskkit:langchange", () => setAuthMode(authMode));

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      isPasswordRecovery = true;
      showResetPassword();
      return;
    }
    if (session && session.user && !isPasswordRecovery) window.location.href = redirectTarget;
  });

  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user && isPasswordRecovery) { showResetPassword(); return; }
    if (data.session && data.session.user && !isPasswordRecovery) window.location.href = redirectTarget;
  });
});
