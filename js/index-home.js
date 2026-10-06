/* index.html — toggles the logged-out/logged-in Home variants and
   wires the free-text "not sure what you need" router. Reuses
   js/projects.js's fetch/render helpers (dkProjectsFetchAll/dkPcardHtml)
   for the logged-in "recent projects" strip instead of re-implementing
   that query — same data, same cards as projects.html itself. */

function dkHomeFreeTextRoute() {
  const input = document.getElementById("dk-home-freetext");
  const text = input ? input.value.trim() : "";
  const href = typeof dkCreateRouteFreeText === "function" ? dkCreateRouteFreeText(text) : "projects.html";
  if (typeof dkCreateGoTo === "function") dkCreateGoTo(href);
  else location.href = href;
}

async function dkHomeShowLoggedIn(user) {
  const out = document.getElementById("dk-home-out");
  const inEl = document.getElementById("dk-home-in");
  if (!out || !inEl) return;
  out.hidden = true;
  inEl.hidden = false;

  const nameEl = document.getElementById("dk-home-greet-name");
  if (nameEl) {
    // Cached on the element itself (not just a local var) so the
    // deskkit:langchange listener below — which fires on its own, long
    // after this function has returned — can still re-render the
    // greeting in the new language without needing the real name
    // passed back in. Confirmed-live bug this fixes: toggling to
    // English left the greeting itself stuck on the Hebrew "שלום" even
    // though every other translated string on the page updated, because
    // nothing was wired to rebuild this one specific string, is set to
    // once at load and never touched again.
    const displayName = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || (user.email || "").split("@")[0];
    nameEl.dataset.dkDisplayName = displayName;
    dkHomeRenderGreeting(nameEl);
  }

  const grid = document.getElementById("dk-home-recent-grid");
  if (grid && typeof dkProjectsFetchAll === "function") {
    try {
      const items = (await dkProjectsFetchAll(user)).slice(0, 4);
      grid.innerHTML = items.length
        ? items.map(dkPcardHtml).join("")
        : `<div class="dk-pcard-empty">עדיין אין כאן פרויקטים. <a href="#" id="dk-home-empty-create">+ צרו את הראשון שלכם</a></div>`;
      const btn = document.getElementById("dk-home-empty-create");
      if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); if (typeof openCreateChooser === "function") openCreateChooser(); });
      dkProjectsAll = items; // so the shared more-menu delegated click handler (js/projects.js) can resolve these cards too
      dkProjectsUser = user;
    } catch (err) { /* non-fatal — the quick-create row above still works */ }
  }
}

function dkHomeRenderGreeting(nameEl) {
  const name = nameEl.dataset.dkDisplayName;
  if (!name) return;
  const lang = typeof currentLang === "function" ? currentLang() : "he";
  const dict = (typeof I18N !== "undefined" && I18N[lang]) || null;
  const tpl = (dict && dict.greet_hello) || "שלום, {name} 👋";
  nameEl.textContent = tpl.replace("{name}", name);
}

function dkHomeShowLoggedOut() {
  const out = document.getElementById("dk-home-out");
  const inEl = document.getElementById("dk-home-in");
  if (out) out.hidden = false;
  if (inEl) inEl.hidden = true;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("dk-home-freetext-btn");
  if (btn) btn.addEventListener("click", dkHomeFreeTextRoute);
  const textarea = document.getElementById("dk-home-freetext");
  if (textarea) textarea.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); dkHomeFreeTextRoute(); } });

  document.addEventListener("deskkit:langchange", () => {
    const nameEl = document.getElementById("dk-home-greet-name");
    if (nameEl) dkHomeRenderGreeting(nameEl);
  });

  if (typeof supabaseClient === "undefined") return;
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (session && session.user) dkHomeShowLoggedIn(session.user);
    else dkHomeShowLoggedOut();
  });
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) dkHomeShowLoggedIn(data.session.user);
  });
});
