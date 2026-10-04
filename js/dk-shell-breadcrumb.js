/* Adds a "DeskKit / הפרויקטים שלי / <project name>" breadcrumb to any
   Builder-Shell top bar — CV (builder.html), Quote (quote-app.html) and
   Invoice (invoice-app.html) all share the exact same .bshell-top-name
   element (class, not per-product id), so one generic script covers
   all three without editing cv-builder-shell.js/quote-builder-shell.js/
   invoice-builder-shell.js at all: it mirrors whatever text node each
   Shell already keeps current there via a MutationObserver, the same
   bridging pattern already used elsewhere in this codebase (e.g. the
   Invoice Shell's own finalize-button watcher).

   sites.html's Builder-Shell already has its own static breadcrumb
   markup (#bshell-breadcrumb) wired in js/site-wizard-router.js — the
   guard below means including this same script there too is harmless. */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bshell-breadcrumb")) return;
  const nameEl = document.querySelector(".bshell-top .bshell-top-name");
  if (!nameEl) return;

  const crumb = document.createElement("span");
  crumb.className = "dk-crumb";
  crumb.id = "bshell-breadcrumb";
  crumb.innerHTML = `<a href="index.html">DeskKit</a><span class="dk-crumb-sep">/</span><a href="projects.html">הפרויקטים שלי</a><span class="dk-crumb-sep">/</span><span class="dk-crumb-current" id="bshell-breadcrumb-current"></span>`;
  nameEl.insertAdjacentElement("beforebegin", crumb);
  nameEl.style.display = "none";

  const crumbCurrent = crumb.querySelector("#bshell-breadcrumb-current");
  const sync = () => { crumbCurrent.textContent = nameEl.textContent; };
  sync();
  new MutationObserver(sync).observe(nameEl, { childList: true, characterData: true, subtree: true });
});
