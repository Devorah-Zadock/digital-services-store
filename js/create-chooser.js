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

// Same local helper pattern as js/header.js's dkHeaderLabel and
// js/account.js's dkAcctLabel — this file runs on every page (most of
// which don't load js/i18n.js), so currentLang()/I18N are guarded, not
// assumed.
function dkCreateEn() {
  return typeof currentLang === "function" && currentLang() === "en";
}
function dkCreateT(he, en) {
  return dkCreateEn() ? en : he;
}

const DK_CREATE_OPTIONS = [
  { icon: "🌐", product: "site", title: "אתר", titleEn: "Site", sub: "אתר מקצועי לעסק או לפרויקט", subEn: "A professional site for a business or project", href: "sites.html?new=1" },
  { icon: "📄", product: "cv", title: "קורות חיים", titleEn: "Resume", sub: "קורות חיים שנראים כמו שאתם רוצים להיראות", subEn: "A resume that looks the way you want to be seen", href: "builder.html?new=1" },
  { icon: "📊", product: "deck", title: "מצגת", titleEn: "Deck", sub: "מצגת מעוצבת ומוכנה להצגה", subEn: "A designed deck, ready to present", href: "products.html?type=deck" },
  { icon: "💼", product: "quote", title: "הצעת מחיר", titleEn: "Quote", sub: "הצעת מחיר מקצועית ללקוחות", subEn: "A professional price quote for clients", href: "quote-app.html" },
  { icon: "🧾", product: "invoice", title: "חשבונית", titleEn: "Invoice", sub: "חשבוניות וקבלות", subEn: "Invoices and receipts", href: "invoice-app.html" },
  { icon: "📈", product: "xlsx", title: "גליון", titleEn: "Spreadsheet", sub: "גליון עבודה וניהול מידע", subEn: "A worksheet for tracking and managing data", href: "products.html?type=xlsx" },
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
  if (hit(["קורות חיים", "cv", "resume", "רזומה"])) return "builder.html?new=1";
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
      <button type="button" class="domain-guide-close" id="dk-create-close" aria-label="${dkCreateT("סגירה", "Close")}">✕</button>
      <h2 id="dk-create-title">${dkCreateT("מה תרצו ליצור?", "What would you like to create?")}</h2>
      <div class="dk-create-grid">
        ${DK_CREATE_OPTIONS.map((o, i) => `
          <button type="button" class="dk-create-opt" data-dk-create-idx="${i}" data-dk-product="${o.product}">
            <span class="dk-create-opt-icon">${o.icon}</span>
            <span>
              <span class="dk-create-opt-title">${dkCreateT(o.title, o.titleEn)}</span>
              <span class="dk-create-opt-sub">${dkCreateT(o.sub, o.subEn)}</span>
            </span>
          </button>`).join("")}
      </div>
      <div class="dk-create-unsure">
        <label for="dk-create-unsure-input">✨ ${dkCreateT("אני לא בטוח", "I'm not sure")}</label>
        <textarea id="dk-create-unsure-input" maxlength="300" placeholder="${dkCreateT("אני צריך משהו שיעזור לי להציג את העסק שלי ללקוח...", "I need something to help me present my business to a client...")}"></textarea>
        <button type="button" class="dk-btn dk-btn-primary dk-create-unsure-btn" id="dk-create-unsure-btn">✨ ${dkCreateT("בואו נתחיל", "Let's get started")}</button>
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
