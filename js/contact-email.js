/* The business email is never written out in the page source: bots that
   harvest addresses by scanning HTML (the source of the inbox spam) find
   nothing, while people see the normal, clickable address — it's put
   together here, in the browser. Without JavaScript the element simply
   stays a link to the contact page. Markup:
     <a class="dk-email" href="contact.html">…</a>                       */
const DK_EMAIL_PARTS = ["digital.dz.studio", "gmail.com"];

function dkContactEmail() {
  return DK_EMAIL_PARTS.join("@");
}

function dkRevealEmails(root) {
  (root || document).querySelectorAll(".dk-email").forEach((el) => {
    const email = dkContactEmail();
    el.textContent = email;
    el.setAttribute("dir", "ltr");
    if (el.tagName === "A") el.setAttribute("href", "mailto:" + email);
  });
}

document.addEventListener("DOMContentLoaded", () => dkRevealEmails());
// i18n re-renders text on language switch; the address isn't translated,
// but re-applying keeps it in place if a container was re-rendered.
document.addEventListener("deskkit:langchange", () => dkRevealEmails());
