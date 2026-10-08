/* Optional Cloudflare Turnstile CAPTCHA for sign-up, log-in and password
   reset (and the password re-check in account settings).

   Off until DK_TURNSTILE_SITE_KEY below is filled in — with it empty,
   every helper here is a no-op and the forms behave exactly as before.

   Turning it on, in this order (the reverse order locks everyone out of
   logging in until the key is here):
     1. Cloudflare → Turnstile → add a widget for deskkit.co.il → copy the
        SITE key (public) into DK_TURNSTILE_SITE_KEY below, bump this
        file's ?v= in account.html and account-settings.html, deploy.
     2. Supabase → Authentication → Attack Protection → Enable CAPTCHA
        protection → Turnstile → paste the SECRET key → Save. */
const DK_TURNSTILE_SITE_KEY = "";

const dkCaptcha = { widgets: {}, tokens: {}, scriptPromise: null };

function dkCaptchaEnabled() {
  return !!DK_TURNSTILE_SITE_KEY;
}

function dkCaptchaLoadScript() {
  if (dkCaptcha.scriptPromise) return dkCaptcha.scriptPromise;
  dkCaptcha.scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("captcha script failed to load"));
    document.head.appendChild(s);
  });
  return dkCaptcha.scriptPromise;
}

// Renders the widget into the element with this id (once).
async function dkCaptchaMount(containerId) {
  if (!dkCaptchaEnabled()) return;
  const el = document.getElementById(containerId);
  if (!el || dkCaptcha.widgets[containerId] !== undefined) return;
  await dkCaptchaLoadScript();
  dkCaptcha.widgets[containerId] = window.turnstile.render(el, {
    sitekey: DK_TURNSTILE_SITE_KEY,
    size: "flexible",
    language: document.documentElement.lang === "en" ? "en" : "he",
    callback: (token) => { dkCaptcha.tokens[containerId] = token; },
    "expired-callback": () => { dkCaptcha.tokens[containerId] = null; },
    "error-callback": () => { dkCaptcha.tokens[containerId] = null; },
  });
}

// The current token (waits up to ~8s for the check to finish), or
// undefined when CAPTCHA is off. Each token is single-use: call
// dkCaptchaReset() after every attempt.
async function dkCaptchaToken(containerId) {
  if (!dkCaptchaEnabled()) return undefined;
  await dkCaptchaMount(containerId);
  for (let i = 0; i < 40 && !dkCaptcha.tokens[containerId]; i++) {
    await new Promise((r) => setTimeout(r, 200));
  }
  return dkCaptcha.tokens[containerId] || undefined;
}

function dkCaptchaReset(containerId) {
  if (!dkCaptchaEnabled() || dkCaptcha.widgets[containerId] === undefined || !window.turnstile) return;
  dkCaptcha.tokens[containerId] = null;
  window.turnstile.reset(dkCaptcha.widgets[containerId]);
}
