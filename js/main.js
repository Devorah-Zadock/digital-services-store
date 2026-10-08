/* Shared across every page that caches DeskKit content in localStorage
   (CV drafts, site drafts, CRM demo leads, unlock flags) — deliberately
   defined once here rather than duplicated per-tool. */
const DESKKIT_LOCAL_CONTENT_PREFIXES = [
  "deskkit_cv_",              // CV drafts + "last slug" pointer
  "deskkit_sites_data_v1_",   // site drafts (per template)
  "deskkit_sites_last_template",
  "deskkit_sites_unlocked_",  // site purchase-unlock flags
  "deskkit_crm_",             // CRM demo leads + unlock flag
  "deskkit_schedule_unlocked_", // schedule-builder unlock flag
];

function clearLocalDeskkitContent() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && DESKKIT_LOCAL_CONTENT_PREFIXES.some((p) => key === p || key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch (err) { /* storage unavailable — nothing to clear */ }
}

const LOCAL_DRAFT_OWNER_KEY = "deskkit_local_draft_owner";
/* CV/site local drafts are cached keyed only by template/slug, not by
   account (see cvLocalKey()/siteDataKey() in their own files) — on
   purpose, so the very first paint can show something instantly, before
   any async sign-in check resolves. Confirmed live: on a shared/reused
   browser, that meant a DIFFERENT signed-in account opening the same
   builder could see, keep editing, and even save a previous person's
   real CV/site content (name, phone, email, business details) into
   their own account. Call this the moment a real, signed-in userId is
   confirmed (builder-cloud-save.js / site-cloud-save.js), before doing
   anything else with local or cloud state: if this browser's local
   drafts were last associated with a DIFFERENT account, they're wiped
   before anything can read, keep, or save them under the new one. Same
   person returning (or a fresh browser) — nothing is touched. */
// Returns true when a foreign draft was actually found and cleared — the
// caller still needs to reset whatever it may have already rendered
// in-memory from that draft (clearing localStorage alone doesn't touch a
// form already filled from it), specifically when the newly-confirmed
// account turns out to have no cloud save of its own to overwrite it with.
function guardLocalDraftOwnership(userId) {
  if (!userId) return false;
  try {
    const last = localStorage.getItem(LOCAL_DRAFT_OWNER_KEY);
    localStorage.setItem(LOCAL_DRAFT_OWNER_KEY, userId);
    if (last && last !== userId) {
      clearLocalDeskkitContent();
      return true;
    }
  } catch (err) { /* storage unavailable — nothing to guard */ }
  return false;
}

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
  // zero feedback. Now a real submission, via the submit-contact-message
  // Edge Function (see its own comment — stores the message permanently
  // in contact_messages and emails a notification), with mailto: kept
  // only as a fallback for when the request itself fails, so a visitor
  // is never stuck with a silent, unresponsive button. Previously went
  // straight to Formspree, whose free tier silently drops anything older
  // than 30 days — real messages were disappearing.
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

      if (typeof supabaseClient === "undefined") {
        window.location.href = mailHref;
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      if (note) { note.textContent = t.sending; note.className = "widget-note"; }
      try {
        const { data, error } = await supabaseClient.functions.invoke("submit-contact-message", {
          body: { name, email, message, formType: "contact", page: location.pathname, website: (form.querySelector("#website") || {}).value || "" },
        });
        if (error || !data || data.error) throw new Error((data && data.error) || "bad response");
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

/* Every "שדרוג ל-Pro" link across the AI-limit upgrade cards/notes
   (js/ats-checker.js, js/site-ai-generate.js, js/site-ai-review.js,
   js/*-builder-shell.js, js/*-ai-generate.js, js/ai-writer.js) points
   at a real Pro tier that was never actually built — nothing anywhere
   in this codebase ever sets customer_profiles.is_pro, so the link
   itself was confirmed live to do nothing at all. Delegated at the
   document level (one handler for every one of those call sites,
   instead of wiring each separately) so clicking it now at least says
   something instead of silently going nowhere, until a real Pro
   product/checkout exists to point it at. */
document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href="#"]');
  if (!link) return;
  const isUpgradeLink = link.classList.contains("ats-upgrade-btn") || link.textContent.trim() === "שדרוג ל-Pro";
  if (!isUpgradeLink) return;
  e.preventDefault();
  if (link.dataset.dkUnavailableShown) return;
  link.dataset.dkUnavailableShown = "1";
  const note = document.createElement("div");
  note.textContent = "אפשרות זו אינה זמינה כרגע";
  note.style.cssText = "margin-top:6px; font-size:12.5px; color:#A0A0A0;";
  link.insertAdjacentElement("afterend", note);
});
