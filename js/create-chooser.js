/* Global "+ יצירה חדשה" create-chooser — part of the DeskKit unified
   redesign. One modal, reachable from the header's "יצירה" link and
   from Home's quick-create buttons, so there is exactly one place that
   decides where each product type's creation flow begins (never a
   second Builder, never a raw template catalog as the first stop).

   Website and CV already have their own no-catalog entry points
   (sites.html's Website Creation Flow; builder.html's Builder-Shell,
   default since Phase 8) — this modal just routes to them. Deck/XLSX
   have no cloud project/Builder of their own yet, so they still route
   to the existing products.html catalog (real, working infra; not
   touched by this pass). */

const DK_CREATE_OPTIONS = [
  { icon: "🌐", product: "site", title: "אתר", sub: "אתר מקצועי לעסק או לפרויקט", href: "sites.html?new=1" },
  { icon: "📄", product: "cv", title: "קורות חיים", sub: "קורות חיים שנראים כמו שאתם רוצים להיראות", href: "builder.html" },
  { icon: "📊", product: "deck", title: "מצגת", sub: "מצגת מעוצבת ומוכנה להצגה", href: "products.html?type=deck" },
  { icon: "💼", product: "quote", title: "הצעת מחיר", sub: "הצעת מחיר מקצועית ללקוחות", href: "quote-app.html" },
  { icon: "🧾", product: "invoice", title: "חשבונית", sub: "חשבוניות וקבלות", href: "invoice-app.html" },
  { icon: "📈", product: "xlsx", title: "גליון", sub: "גליון עבודה וניהול מידע", href: "products.html?type=xlsx" },
];

/* Very small keyword router for the free-text "אני לא בטוח" box —
   deliberately NOT an AI call (same cost discipline as the site
   Wizard: structured choices are free, AI is reserved for the one
   generation call products already make). Falls back to the Projects
   page, where a human can always pick the right thing, rather than
   guessing wrong with confidence. */
function dkCreateRouteFreeText(text) {
  const t = (text || "").toLowerCase();
  const hit = (words) => words.some((w) => t.includes(w));
  if (hit(["אתר", "site", "website", "דף נחיתה"])) return "sites.html?new=1";
  if (hit(["קורות חיים", "cv", "resume", "רזומה"])) return "builder.html";
  if (hit(["הצעת מחיר", "הצעה", "quote"])) return "quote-app.html";
  if (hit(["חשבונית", "קבלה", "invoice"])) return "invoice-app.html";
  if (hit(["מצגת", "שקפים", "deck", "presentation"])) return "products.html?type=deck";
  if (hit(["גליון", "אקסל", "excel", "xlsx", "טבלה"])) return "products.html?type=xlsx";
  return "projects.html";
}

function dkCreateGoTo(href) {
  if (typeof supabaseClient === "undefined") { location.href = href; return; }
  supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session && data.session.user) {
      location.href = href;
    } else {
      location.href = "account.html?redirect=" + encodeURIComponent(href);
    }
  });
}

window.openCreateChooser = function openCreateChooser() {
  if (document.getElementById("dk-create-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "dk-create-overlay";
  overlay.className = "domain-guide-overlay";
  overlay.innerHTML = `
    <div class="domain-guide-modal" role="dialog" aria-modal="true" aria-labelledby="dk-create-title" style="max-width:600px;">
      <button type="button" class="domain-guide-close" id="dk-create-close" aria-label="סגירה">✕</button>
      <h2 id="dk-create-title">מה תרצו ליצור?</h2>
      <div class="dk-create-grid">
        ${DK_CREATE_OPTIONS.map((o, i) => `
          <button type="button" class="dk-create-opt" data-dk-create-idx="${i}" data-dk-product="${o.product}">
            <span class="dk-create-opt-icon">${o.icon}</span>
            <span>
              <span class="dk-create-opt-title">${o.title}</span>
              <span class="dk-create-opt-sub">${o.sub}</span>
            </span>
          </button>`).join("")}
      </div>
      <div class="dk-create-unsure">
        <label for="dk-create-unsure-input">✨ אני לא בטוח</label>
        <textarea id="dk-create-unsure-input" maxlength="300" placeholder="אני צריך משהו שיעזור לי להציג את העסק שלי ללקוח..."></textarea>
        <button type="button" class="dk-btn dk-btn-primary dk-create-unsure-btn" id="dk-create-unsure-btn">✨ בואו נתחיל</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("dk-create-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  overlay.querySelectorAll("[data-dk-create-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const opt = DK_CREATE_OPTIONS[Number(btn.dataset.dkCreateIdx)];
      dkCreateGoTo(opt.href);
    });
  });
  document.getElementById("dk-create-unsure-btn").addEventListener("click", () => {
    const text = document.getElementById("dk-create-unsure-input").value.trim();
    dkCreateGoTo(dkCreateRouteFreeText(text));
  });
};
