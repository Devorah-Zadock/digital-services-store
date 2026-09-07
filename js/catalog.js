function money(n) { return n === 0 ? "חינם" : "₪" + n; }
function escapeHtmlC(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cardHtml(p) {
  const actionLabel = p.downloadUrl ? "להורדה" : (p.price === 0 ? "לעריכה" : "לצפייה");
  return `
    <div class="card" data-cat="${p.categorySlug}">
      <div class="thumb"><img src="images/previews/${p.image}" alt="${p.title}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${p.category}</span>
          ${p.price === 0 ? `<span class="tag tag-free">חינם</span>` : `<span class="price">${money(p.price)}</span>`}
        </div>
        <h3>${p.title}</h3>
        <a href="product.html?slug=${p.slug}" class="btn btn-teal card-cta">${actionLabel}</a>
      </div>
    </div>`;
}

function renderGrid(el, products) {
  el.innerHTML = products.length
    ? products.map(cardHtml).join("")
    : `<p style="grid-column:1/-1; text-align:center; color:var(--grey);">אין עדיין מוצרים בקטגוריה הזו.</p>`;
}

/* Two-tier: pick a document TYPE first (big pills — though since each type
   now also has its own top-nav link straight into products.html?type=X,
   this mostly just confirms which one you're on), then a second, narrower
   row of sub-topic pills for THAT type (profession for CV, topic for
   decks/spreadsheets — see TYPE_SUBTOPICS). ?cat= is kept working for old
   links (the chatbot widget links to products.html?cat=cv / ?cat=deck /
   ?cat=xlsx) by treating those three as type-level, and any other slug as
   a sub-topic filter within whichever type is active. */
function initProductsPage() {
  const grid = document.getElementById("product-grid");
  const typeTabsEl = document.getElementById("type-tabs");
  const subTabsEl = document.getElementById("subcat-tabs");
  const searchEl = document.getElementById("product-search");
  if (!grid || !typeTabsEl || !subTabsEl) return;

  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat");
  const typeParam = params.get("type");

  let activeType = typeParam || (["deck", "xlsx"].includes(catParam) ? catParam : "cv");
  if (!PRODUCT_TYPES.some((t) => t.slug === activeType)) activeType = "cv";
  let activeSub = (TYPE_SUBTOPICS[activeType] || []).some((c) => c.slug === catParam) ? catParam : "all";
  let searchTerm = "";

  typeTabsEl.innerHTML = PRODUCT_TYPES.map((t) => `<button class="tab" data-type="${t.slug}">${t.label}</button>`).join("");

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set("type", activeType);
    if (activeSub !== "all") url.searchParams.set("cat", activeSub); else url.searchParams.delete("cat");
    history.replaceState(null, "", url);
  }

  function renderSubTabs() {
    const topics = TYPE_SUBTOPICS[activeType] || [];
    if (!topics.length) { subTabsEl.style.display = "none"; subTabsEl.innerHTML = ""; return; }
    subTabsEl.style.display = "";
    subTabsEl.innerHTML = topics.map((c) => `<button class="tab tab-sub${c.slug === activeSub ? " active" : ""}" data-prof="${c.slug}">${c.label}</button>`).join("");
    subTabsEl.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSub = btn.dataset.prof;
        updateUrl();
        apply();
      });
    });
  }

  function apply() {
    typeTabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.type === activeType));
    // The top header nav also has direct קורות חיים/מצגות/גליונות links
    // (same page, different ?type=) — without this they'd need their own
    // static "active" class, which can only ever match ONE of the three
    // no matter which type is actually showing (products.html is a single
    // page reused for all three), making the header look stuck on
    // whichever type happened to be hardcoded.
    document.querySelectorAll(".nav-links a[data-nav-type]").forEach((a) => {
      a.classList.toggle("active", a.dataset.navType === activeType);
    });
    renderSubTabs();
    const term = searchTerm.trim();
    const list = PRODUCTS.filter((p) => {
      if (productType(p) !== activeType) return false;
      if (activeSub !== "all" && productSubtopic(p) !== activeSub) return false;
      if (term && !p.title.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });
    if (term && !list.length) {
      grid.innerHTML = `<p class="tpl-search-empty">אין תבניות שמתאימות לחיפוש "${escapeHtmlC(term)}".</p>`;
    } else {
      renderGrid(grid, list);
    }
  }

  typeTabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeType = btn.dataset.type;
      activeSub = "all";
      updateUrl();
      apply();
    });
  });

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchTerm = searchEl.value;
      apply();
    });
  }

  apply();
}

function initFeatured() {
  const el = document.getElementById("featured-grid");
  if (!el) return;
  renderGrid(el, PRODUCTS.filter((p) => p.featured));
}

function initProductPage() {
  const root = document.getElementById("product-root");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("slug");
  const p = PRODUCTS.find((x) => x.slug === slug) || PRODUCTS[0];

  document.title = p.title + " — DeskKit";
  root.innerHTML = `
    <div class="product-hero">
      <div class="thumb"><img src="images/previews/${p.image}" alt="תצוגה מקדימה של ${p.title}"></div>
      <div>
        <div class="breadcrumb"><a href="products.html">קטלוג</a> / ${p.title}</div>
        <h1>${p.title}</h1>
        <p class="desc">${p.heroDesc}</p>
        <div class="format-badges">${p.formatBadges.map((b) => `<span class="format-badge">${b}</span>`).join("")}</div>
        <div class="price-block">
          <span class="price">${money(p.price)}</span>
        </div>
        <ul class="checklist">${p.checklist.map((c) => `<li>${c}</li>`).join("")}</ul>
        ${p.downloadUrl ? `
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="button" id="preview-full-btn" class="btn btn-outline-dark">צפייה מלאה בתוכן</button>
          <button type="button" id="download-file-btn" class="btn btn-gold">הורדת הקובץ — חינם</button>
        </div>
        <div class="note-box">קובץ מלא, מוכן לעריכה. אפשר לצפות בכל התוכן לפני שמורידים. ההורדה עצמה דורשת התחברות (חשבון פשוט וחינמי) כדי שתישאר לכם גישה קבועה. יש שאלה? <a href="contact.html" style="color:var(--teal); font-weight:600;">כתבו לנו</a> ונשמח לעזור.</div>
        ` : `
        <a href="builder.html?template=${p.slug}" class="btn btn-gold">עריכה והורדה — חינם</a>
        <div class="note-box">ממלאים את הפרטים שלכם ורואים תוצאה חיה, בעברית או באנגלית. עריכה חינמית לגמרי — רק צריך להתחבר כדי להיכנס לעורך.</div>
        `}
      </div>
    </div>`;

  if (p.downloadUrl) {
    const previewBtn = document.getElementById("preview-full-btn");
    const downloadBtn = document.getElementById("download-file-btn");
    if (previewBtn) previewBtn.addEventListener("click", () => openContentPreviewModal(p));
    if (downloadBtn) downloadBtn.addEventListener("click", () => handleGatedDownload(p));
  }

  const related = document.getElementById("related-grid");
  if (related) {
    const list = PRODUCTS.filter((x) => x.categorySlug === p.categorySlug && x.slug !== p.slug).slice(0, 3);
    if (list.length) {
      renderGrid(related, list);
    } else {
      document.getElementById("related-section")?.remove();
    }
  }
}

/* Downloading is real usage (same bar as editing a CV/quote), so it
   requires an account — same "account.html?redirect=" pattern used
   everywhere else on the site a page is gated behind login. Logs the
   download too, best-effort, so it shows up in the admin usage stats. */
function handleGatedDownload(p) {
  supabaseClient.auth.getSession().then(({ data }) => {
    const user = data.session && data.session.user;
    if (!user) {
      const here = location.pathname.split("/").pop() + location.search;
      window.location.href = "account.html?redirect=" + encodeURIComponent(here);
      return;
    }
    if (window.logUsageEvent) logUsageEvent(productType(p), p.slug, "download");
    const a = document.createElement("a");
    a.href = p.downloadUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
}

/* Viewing the full content stays free — same as browsing anything else
   on the site — since it's what helps someone DECIDE whether to bother
   downloading (and signing up) in the first place. Not a pixel-accurate
   copy of the real file's design (there's no way to render an actual
   .pptx/.xlsx to an image here) but every slide/row's real content, in
   full — see js/product-preview-data.js for how it was extracted. */
function openContentPreviewModal(p) {
  const data = (typeof PRODUCT_PREVIEW_DATA !== "undefined") && PRODUCT_PREVIEW_DATA[p.slug];
  if (!data) return;
  const overlay = document.createElement("div");
  overlay.className = "preview-modal-overlay";
  overlay.innerHTML = `
    <div class="preview-modal-box">
      <div class="preview-modal-head">
        <h3>${escapeHtmlC(p.title)} — תצוגה מלאה</h3>
        <button type="button" class="preview-modal-close" aria-label="סגירה">✕</button>
      </div>
      <div class="preview-modal-body" id="preview-modal-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector(".preview-modal-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  const body = overlay.querySelector("#preview-modal-body");
  if (data.type === "deck") {
    renderDeckPreview(body, data.slides);
  } else {
    renderSheetPreview(body, data.rows);
  }
}

function renderDeckPreview(body, slides) {
  let idx = 0;
  function render() {
    const lines = slides[idx];
    body.innerHTML = `
      <div class="preview-slide-card">
        <div class="ps-title">${escapeHtmlC(lines[0])}</div>
        ${lines.slice(1).map((l) => `<div class="ps-line">${escapeHtmlC(l)}</div>`).join("")}
      </div>
      <div class="preview-slide-nav">
        <button type="button" id="ps-prev"${idx === 0 ? " disabled" : ""}>הקודם</button>
        <span class="preview-slide-counter">שקופית ${idx + 1} מתוך ${slides.length}</span>
        <button type="button" id="ps-next"${idx === slides.length - 1 ? " disabled" : ""}>הבא</button>
      </div>`;
    const prev = body.querySelector("#ps-prev");
    const next = body.querySelector("#ps-next");
    if (prev) prev.addEventListener("click", () => { if (idx > 0) { idx--; render(); } });
    if (next) next.addEventListener("click", () => { if (idx < slides.length - 1) { idx++; render(); } });
  }
  render();
}

function renderSheetPreview(body, rows) {
  body.innerHTML = `
    <div class="preview-sheet-table-wrap">
      <table class="preview-sheet-table">
        ${rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtmlC(String(c))}</td>`).join("")}</tr>`).join("")}
      </table>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage();
  initFeatured();
  initProductPage();
});
