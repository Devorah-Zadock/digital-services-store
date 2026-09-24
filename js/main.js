document.addEventListener("DOMContentLoaded", () => {
  const burger = document.querySelector(".burger");
  const links = document.querySelector(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
  }

  // Used to just redirect to mailto:, silently — which does nothing at
  // all when the visitor's device has no default mail client configured
  // (common on many phones/browsers), leaving "שליחה" looking broken with
  // zero feedback. Now a real submission (via the same Formspree endpoint
  // widgets.js's feedback widget already uses live — see its own
  // FEEDBACK_ENDPOINT comment), with mailto: kept only as a fallback for
  // when Formspree isn't configured or the request itself fails, so a
  // visitor is never stuck with a silent, unresponsive button.
  const form = document.querySelector("form.contact-form");
  if (form) {
    const note = document.getElementById("contact-form-note");
    const submitBtn = document.getElementById("contact-submit-btn");
    const isEn = typeof currentLang === "function" && currentLang() === "en";
    const t = {
      sending: isEn ? "Sending…" : "שולח...",
      ok: isEn ? "Message sent! We'll get back to you soon." : "ההודעה נשלחה! נחזור אליכם בהקדם.",
      failHtml: (mailHref) => isEn
        ? `Couldn't send the message. You can <a href="${mailHref}">send it by email instead</a>.`
        : `לא הצלחנו לשלוח את ההודעה. אפשר <a href="${mailHref}">לשלוח אותה במייל במקום</a>.`,
    };
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#name").value.trim();
      const email = form.querySelector("#email").value.trim();
      const message = form.querySelector("#message").value.trim();
      const subject = encodeURIComponent("פנייה מהאתר - " + name);
      const body = encodeURIComponent(message + "\n\nלחזרה: " + email);
      const mailHref = `mailto:digital.dz.studio@gmail.com?subject=${subject}&body=${body}`;

      if (typeof FEEDBACK_ENDPOINT === "undefined" || !FEEDBACK_ENDPOINT) {
        window.location.href = mailHref;
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      if (note) { note.textContent = t.sending; note.className = "widget-note"; }
      try {
        const res = await fetch(FEEDBACK_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ name, email, message, formType: "contact", _subject: "פנייה חדשה מהאתר - " + name, page: location.pathname }),
        });
        if (!res.ok) throw new Error("bad response");
        if (note) { note.textContent = t.ok; note.className = "widget-note ok"; }
        form.reset();
      } catch (err) {
        if (note) { note.innerHTML = t.failHtml(mailHref); note.className = "widget-note warn"; }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
