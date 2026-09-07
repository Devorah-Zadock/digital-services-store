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

/* products.html is one page reused per ?type= (קורות חיים / מצגות /
   גליונות), each reached from its own top-nav link — so the type itself
   is fixed for the page's whole visit (no in-page type switcher; that
   would just duplicate the top nav). What IS shown here is a row of
   sub-topic pills for THAT type only (profession for CV, topic for
   decks/spreadsheets — see TYPE_SUBTOPICS), plus search. ?cat= is kept
   working for old links (the chatbot widget links to
   products.html?cat=cv / ?cat=deck / ?cat=xlsx) by treating those three
   as type-level too, same as ?type=. */
function initProductsPage() {
  const grid = document.getElementById("product-grid");
  const subTabsEl = document.getElementById("subcat-tabs");
  const searchEl = document.getElementById("product-search");
  const heroTitleEl = document.getElementById("products-hero-title");
  const heroLeadEl = document.getElementById("products-hero-lead");
  if (!grid || !subTabsEl) return;

  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat");
  const typeParam = params.get("type");

  const activeType = typeParam || (["deck", "xlsx"].includes(catParam) ? catParam : "cv");
  const type = PRODUCT_TYPES.some((t) => t.slug === activeType) ? activeType : "cv";
  let activeSub = (TYPE_SUBTOPICS[type] || []).some((c) => c.slug === catParam) ? catParam : "all";
  let searchTerm = "";

  const hero = TYPE_HERO[type];
  if (hero) {
    if (heroTitleEl) heroTitleEl.textContent = hero.title;
    if (heroLeadEl) heroLeadEl.textContent = hero.lead;
    document.title = hero.title + " — קטלוג — DeskKit";
  }
  document.querySelectorAll(".nav-links a[data-nav-type]").forEach((a) => {
    a.classList.toggle("active", a.dataset.navType === type);
  });

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set("type", type);
    if (activeSub !== "all") url.searchParams.set("cat", activeSub); else url.searchParams.delete("cat");
    history.replaceState(null, "", url);
  }

  function renderSubTabs() {
    const topics = TYPE_SUBTOPICS[type] || [];
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
    renderSubTabs();
    const term = searchTerm.trim();
    const list = PRODUCTS.filter((p) => {
      if (productType(p) !== type) return false;
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

  updateUrl();

  if (searchEl) {
    searchEl.addEventListener("input", () => {
      searchTerm = searchEl.value;
      apply();
    });
  }

  apply();
}

/* "ארגז הכלים" (catalog.html) — the one place that shows every product
   TYPE together, each as its own horizontally-scrolling row with a "לכל
   ה-X" link into that type's own dedicated page (products.html?type=X).
   Unlike products.html, this page never filters by sub-topic — it's an
   overview, not a browsing tool. */
function siteCardHtmlForToolbox(key, t) {
  return `
    <div class="card" data-cat="${t.categorySlug}">
      <div class="thumb"><img src="${t.thumb}" alt="${escapeHtmlC(t.label)}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${escapeHtmlC(t.category)}</span>
          <span class="price">99 ₪</span>
        </div>
        <h3>${escapeHtmlC(t.label)}</h3>
        <a href="sites.html?template=${key}" class="btn btn-teal card-cta">בחירה ועריכה</a>
      </div>
    </div>`;
}

function quoteCardHtmlForToolbox(key, t) {
  return `
    <div class="card" data-cat="${t.categorySlug}">
      <div class="thumb"><img src="images/previews/quote-${key}.webp" alt="${escapeHtmlC(t.label)}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${escapeHtmlC(t.category)}</span>
          <span class="tag tag-free">חינם</span>
        </div>
        <h3>${escapeHtmlC(t.label)}</h3>
        <a href="quote-app.html?template=${key}" class="btn btn-teal card-cta">בחירה ועריכה</a>
      </div>
    </div>`;
}

/* One label per row, no "לכל" prefix (reads oddly in Hebrew ahead of a
   plain noun like "קורות חיים") — just the type name and an arrow.
   A <div>, not a <section> — the bare "section { padding: 88px 0 }"
   site-wide rule would otherwise apply to EVERY row (this is a repeating
   list item inside one page section, not a page-level section itself),
   stacking 88px of empty top+bottom padding on each and reading as a
   huge dead gap between "אתרים" and the next row. */
function toolboxRowHtml(label, allHref, cardsHtml) {
  return `
    <div class="toolbox-row">
      <div class="toolbox-row-head">
        <h2>${label}</h2>
        <a href="${allHref}" class="toolbox-row-all">${label} ←</a>
      </div>
      <div class="toolbox-scroll-wrap">
        <button type="button" class="toolbox-arrow toolbox-arrow-start" aria-label="גלילה קודמת">›</button>
        <div class="toolbox-scroll">${cardsHtml}</div>
        <button type="button" class="toolbox-arrow toolbox-arrow-end" aria-label="גלילה הבאה">‹</button>
      </div>
    </div>`;
}

/* Ordered by priority (paid flagship product first, then the other free
   tools), not alphabetically or by data-structure order — this is the
   one page that shows every DeskKit tool side by side, so the order
   itself is a statement about what matters most. */
function initToolboxPage() {
  const root = document.getElementById("toolbox-rows");
  if (!root) return;

  const rows = [];

  if (typeof SITE_TEMPLATES !== "undefined") {
    const cards = Object.entries(SITE_TEMPLATES).map(([key, t]) => `<div class="toolbox-card-wrap">${siteCardHtmlForToolbox(key, t)}</div>`).join("");
    rows.push(toolboxRowHtml("אתרים", "sites.html?browse=1", cards));
  }
  if (typeof QUOTE_TEMPLATES !== "undefined") {
    const cards = Object.entries(QUOTE_TEMPLATES).map(([key, t]) => `<div class="toolbox-card-wrap">${quoteCardHtmlForToolbox(key, t)}</div>`).join("");
    rows.push(toolboxRowHtml("הצעות מחיר", "quote-app.html", cards));
  }
  PRODUCT_TYPES.forEach((t) => {
    const items = PRODUCTS.filter((p) => productType(p) === t.slug);
    if (!items.length) return;
    const cards = items.map((p) => `<div class="toolbox-card-wrap">${cardHtml(p)}</div>`).join("");
    rows.push(toolboxRowHtml(t.label, `products.html?type=${t.slug}`, cards));
  });

  root.innerHTML = rows.join("");

  root.querySelectorAll(".toolbox-scroll-wrap").forEach((wrap) => {
    const scroller = wrap.querySelector(".toolbox-scroll");
    const startBtn = wrap.querySelector(".toolbox-arrow-start");
    const endBtn = wrap.querySelector(".toolbox-arrow-end");
    const step = () => Math.min(scroller.clientWidth * 0.8, 600);
    // RTL: scrollLeft moves negative going "forward" (start→end) in most
    // browsers — "start" arrow (visually right, reading-direction start)
    // should move toward more-negative scrollLeft, "end" the opposite.
    startBtn.addEventListener("click", () => scroller.scrollBy({ left: step(), behavior: "smooth" }));
    endBtn.addEventListener("click", () => scroller.scrollBy({ left: -step(), behavior: "smooth" }));
  });
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
  const pType = productType(p);
  const pTypeLabel = (PRODUCT_TYPES.find((t) => t.slug === pType) || {}).label || "קטלוג";
  root.innerHTML = `
    <div class="product-hero">
      <div class="thumb"><img src="images/previews/${p.image}" alt="תצוגה מקדימה של ${p.title}"></div>
      <div>
        <div class="breadcrumb"><a href="products.html?type=${pType}">${pTypeLabel}</a> / ${p.title}</div>
        <h1>${p.title}</h1>
        <p class="desc">${p.heroDesc}</p>
        <div class="format-badges">${p.formatBadges.map((b) => `<span class="format-badge">${b}</span>`).join("")}</div>
        <div class="price-block">
          <span class="price">${money(p.price)}</span>
        </div>
        <ul class="checklist">${p.checklist.map((c) => `<li>${c}</li>`).join("")}</ul>
        ${p.downloadUrl ? `
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a href="preview.html?slug=${p.slug}" class="btn btn-outline-dark">צפייה מלאה בתוכן</a>
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
    const downloadBtn = document.getElementById("download-file-btn");
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

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage();
  initFeatured();
  initProductPage();
  initToolboxPage();
});
