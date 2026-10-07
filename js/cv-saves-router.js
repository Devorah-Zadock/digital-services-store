/* CV's own version of js/site-wizard-router.js: owns the "no specific CV
   named" entry cases for builder.html, now that cv_saves is one row per
   SAVED CV (see supabase/sql/cv_saves_multi.sql) instead of one per
   user — so "the" saved CV no longer exists, and auto-resuming
   whichever one was last touched is no longer a coherent default.

   Handles exactly 3 cases:
   - bare builder.html, signed in, existing CVs found -> "הקורות חיים
     שלי" card grid (dkShowMyCvs), same idea as Sites' "האתרים שלי".
     Opening a card goes to ?cv=<id>; "+ קו"ח חדשים" goes to ?new=1.
   - ?cv=<id> -> fetches that specific CV (js/builder-cloud-save.js's
     loadCvById) and swaps it into the already-activated Shell via
     cvbshellRefreshIfActive() — the same post-activation swap
     js/cv-style-picker.js already uses, since loading by id needs a
     network round trip builder.js's own synchronous DOMContentLoaded
     handler can't wait for.
   - bare visit with NO existing CVs, or ?new=1, or a guest (not signed
     in), or ?template=<slug> -> untouched: builder.js's existing
     synchronous default-template load stands, and (for a genuinely new
     CV) js/cv-style-picker.js's own question flow runs exactly as
     before. ?template=<slug> deliberately isn't handled here at all —
     that's a direct catalog-style link to a specific design, same
     "explicit choice wins" reasoning builder-cloud-save.js's own
     ?template check already used. */

/* window.dkCvRouterGridPromise: resolves true once the My-CVs grid was
   actually shown, false otherwise — js/cv-style-picker.js (registered
   right after this file, so it's always already set by the time that
   listener runs) awaits this before showing its own overlay, since
   both react to the exact same "bare visit, no explicit param" case
   but getSession() only resolves after every synchronous
   DOMContentLoaded listener has already run. Without this, a signed-in
   returning user with existing CVs would see the field/layout
   questions flash on screen a moment before the grid replaced it
   underneath. */
function dkCvRouterHandles(urlCvId, urlTemplate) {
  if (urlTemplate) return false;

  window.dkCvRouterGridPromise = supabaseClient.auth.getSession().then(async ({ data }) => {
    const user = data.session && data.session.user;

    if (urlCvId) {
      if (!user) { location.href = "account.html?redirect=" + encodeURIComponent("builder.html?cv=" + urlCvId); return false; }
      const snap = await loadCvById(urlCvId, user.id);
      if (snap) applyCvSnapshot(snap);
      // No matching row (wrong id, or someone else's) — the Shell is
      // already showing the default template from builder.js's own
      // synchronous load, same honest fallback a bad ?template= slug
      // already gets today, rather than a dead-end error screen.
      return false;
    }

    if (!user || (window.dkCvOriginalParams || new URLSearchParams(location.search)).get("new") === "1") return false; // leave the already-started fresh CV + style picker alone

    const { data: rows } = await supabaseClient
      .from("cv_saves").select("id, data, updated_at, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false });

    if (rows && rows.length) { dkShowMyCvs(rows); return true; }
    return false;
  });

  return true;
}

function dkCvTimeAgo(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "עודכן הרגע";
  if (mins < 60) return `עודכן לפני ${mins} דקות`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `עודכן לפני ${hours} שעות`;
  return `עודכן לפני ${Math.round(hours / 24)} ימים`;
}

function dkMyCvsEscape(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dkMyCvsCardHtml(row) {
  const d = row.data || {};
  const name = (d.content && d.content.name && d.content.name.trim()) || "קורות חיים (ללא שם)";
  const tplLabel = (typeof CV_TEMPLATES !== "undefined" && CV_TEMPLATES[d.slug] && CV_TEMPLATES[d.slug].label) || d.slug || "";
  return `
    <div class="dk-pcard" data-dk-product="cv" data-dk-cv-id="${row.id}">
      <div class="dk-pcard-thumb">
        <span class="dk-pcard-thumb-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v16H7z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg></span>
        <button type="button" class="dk-pcard-more" data-dk-cv-more aria-label="עוד">⋮</button>
      </div>
      <div class="dk-pcard-body">
        <p class="dk-pcard-name">${dkMyCvsEscape(name)}</p>
        <p class="dk-pcard-meta"><span>${dkMyCvsEscape(tplLabel)}</span></p>
        <p class="dk-pcard-date">${dkCvTimeAgo(row.updated_at || row.created_at)}</p>
        <a href="builder.html?cv=${encodeURIComponent(row.id)}" class="dk-pcard-cta">פתחו ב-Builder</a>
      </div>
    </div>`;
}

function dkMyCvsCloseMenu() {
  const m = document.querySelector(".dk-pcard-menu");
  if (m) m.remove();
}

async function dkMyCvsDuplicate(row) {
  const { data: session } = await supabaseClient.auth.getSession();
  const user = session.session && session.session.user;
  if (!user) return;
  const { error } = await supabaseClient.from("cv_saves").insert({ user_id: user.id, data: row.data });
  if (error) { console.error("duplicate CV failed:", error); alert("שכפול נכשל. אפשר לנסות שוב."); return; }
  location.reload();
}

async function dkMyCvsDelete(row) {
  if (!confirm("למחוק לצמיתות את קורות החיים האלה? הפעולה בלתי הפיכה.")) return;
  const { data: session } = await supabaseClient.auth.getSession();
  const user = session.session && session.session.user;
  if (!user) return;
  await supabaseClient.from("cv_saves").delete().eq("id", row.id).eq("user_id", user.id);
  location.reload();
}

function dkMyCvsOpenMenu(card, row) {
  dkMyCvsCloseMenu();
  const menu = document.createElement("div");
  menu.className = "dk-pcard-menu";
  menu.innerHTML = `
    <button type="button" data-act="open">עריכה</button>
    <button type="button" data-act="dup">שכפול</button>
    <button type="button" class="danger" data-act="del">מחיקה</button>
  `;
  card.appendChild(menu);
  menu.querySelector('[data-act="open"]').addEventListener("click", () => { location.href = "builder.html?cv=" + encodeURIComponent(row.id); });
  menu.querySelector('[data-act="dup"]').addEventListener("click", () => dkMyCvsDuplicate(row));
  menu.querySelector('[data-act="del"]').addEventListener("click", () => dkMyCvsDelete(row));
  setTimeout(() => document.addEventListener("click", dkMyCvsOutsideClick, true), 0);
}
function dkMyCvsOutsideClick(e) {
  if (!e.target.closest(".dk-pcard-menu") && !e.target.closest("[data-dk-cv-more]")) {
    dkMyCvsCloseMenu();
    document.removeEventListener("click", dkMyCvsOutsideClick, true);
  }
}

/* Swaps the My-CVs grid in over the already-activated Shell — same
   non-invasive, show-on-top trick js/cv-style-picker.js already uses,
   rather than reworking cv-builder-shell.js's own always-on activation.
   A brief Shell flash only happens for the one case this applies to
   (a signed-in returning user with more than one saved CV on a bare
   visit) — new users, guests, and direct ?cv=/?template= links never
   see it. */
function dkShowMyCvs(rows) {
  const root = document.getElementById("cvbshell-root");
  if (root) root.style.display = "none";
  const section = document.getElementById("dk-mycvs-section");
  if (!section) return;
  section.style.display = "";
  const grid = document.getElementById("dk-mycvs-grid");
  grid.innerHTML = rows.map(dkMyCvsCardHtml).join("");
  grid.querySelectorAll("[data-dk-cv-more]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const card = btn.closest(".dk-pcard");
      const row = rows.find((r) => String(r.id) === card.dataset.dkCvId);
      if (row) dkMyCvsOpenMenu(card, row);
    });
  });
  const newBtn = document.getElementById("dk-mycvs-new-btn");
  if (newBtn) newBtn.onclick = () => { location.href = "builder.html?new=1"; };
}

document.addEventListener("DOMContentLoaded", () => {
  // window.dkCvOriginalParams (builder.html's own first inline script) —
  // not a fresh location.search read — because js/builder.js's own
  // loadTemplate() has already rewritten the URL to carry ?template=
  // <default-slug> by the time this listener runs (it registers and
  // fires first), which would otherwise make every bare visit look like
  // an explicit ?template= link and skip this router entirely.
  const params = window.dkCvOriginalParams || new URLSearchParams(location.search);
  dkCvRouterHandles(params.get("cv"), params.get("template"));
});
