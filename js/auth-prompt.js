/* Shared "join to save your work" popup — reused wherever a tool needs a
   real account only once someone's actually about to save/download,
   never as a wall blocking entry. First user: the CV builder (see
   builder-cloud-save.js), which used to hard-redirect to account.html
   the moment you tried to save — losing the point in the page you were
   editing and reading as a cold, generic login wall instead of "you're
   one click from keeping this." A real account is still needed for
   anything that has to survive past this browser (cloud save, PDF
   export, publishing) — this only changes HOW that's asked for, not
   whether it's asked for.

   Google is the only sign-in method here on purpose — it's one click,
   no password to invent or remember mid-edit. Anyone who'd rather use
   email/password still can, via the small link down to account.html
   (which keeps that fuller form) instead of duplicating it here.

   Self-contained and built on demand (same pattern as domain-guide.js) —
   pages that never open it pay nothing for it. Reuses
   .domain-guide-overlay/.domain-guide-modal for the shell so this isn't
   yet another one-off popup style. */
function openAuthPrompt() {
  if (document.getElementById("auth-prompt-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "auth-prompt-overlay";
  overlay.className = "domain-guide-overlay";
  const here = location.pathname + location.search;
  overlay.innerHTML = `
    <div class="domain-guide-modal auth-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title">
      <button type="button" class="domain-guide-close" id="auth-prompt-close" aria-label="סגירה">✕</button>
      <h2 id="auth-prompt-title">הצטרפו ל-DeskKit בחינם לתמיד 🎁</h2>
      <p class="lead">השימוש בכלים פתוח לחלוטין, ללא אותיות קטנות וללא צורך באשראי.</p>
      <button type="button" id="auth-prompt-google-btn" class="google-signin-btn">
        <svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.8741 2.6836-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1022-1.17.2822-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"/><path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z"/></svg>
        <span>המשך עם Google</span>
      </button>
      <a href="account.html?redirect=${encodeURIComponent(here)}" class="auth-prompt-email-link">או המשיכו עם אימייל וסיסמה</a>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  document.getElementById("auth-prompt-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });
  document.getElementById("auth-prompt-google-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.href },
    });
  });
}
