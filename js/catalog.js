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
    if (heroLeadEl) {
      heroLeadEl.textContent = hero.lead + " ";
      if (type === "cv") {
        const guideLink = document.createElement("a");
        guideLink.href = "guide-cv-tips.html";
        guideLink.style.color = "var(--teal)";
        guideLink.style.fontWeight = "600";
        guideLink.textContent = "5 טיפים לקורות חיים שמתקבלים";
        heroLeadEl.appendChild(guideLink);
      }
    }
    document.title = hero.title + " — קטלוג — DeskKit";
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute("content", hero.lead);
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    if (canonicalTag) canonicalTag.setAttribute("href", "https://deskkit.co.il/products.html?type=" + type);
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

function initProductPage() {
  const root = document.getElementById("product-root");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("slug");
  const p = PRODUCTS.find((x) => x.slug === slug) || PRODUCTS[0];

  document.title = p.title + " — DeskKit";
  // Every product shares one static product.html shell (?slug=...), so
  // without this every single product would show Google the same generic
  // title/description/canonical — worst case, Google picks one slug as
  // "the" canonical and never indexes the rest at all.
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.setAttribute("content", p.heroDesc);
  const canonicalTag = document.querySelector('link[rel="canonical"]');
  if (canonicalTag) canonicalTag.setAttribute("href", "https://deskkit.co.il/product.html?slug=" + p.slug);
  const pType = productType(p);
  const pTypeLabel = (PRODUCT_TYPES.find((t) => t.slug === pType) || {}).label || "קטלוג";
  // product.html is one shared shell for every product type, but its nav
  // markup had "קורות חיים" hardcoded as the active link — so a deck or
  // xlsx product page still showed the CV tab highlighted. Set it here
  // instead, based on the product actually being shown.
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `products.html?type=${pType}`);
  });
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
    const pType = productType(p);
    if (window.showUpsellBanner) {
      if (pType === "xlsx") {
        showUpsellBanner("מעבר לגיליונות הניהול הפנימיים, הגיע הזמן שיהיה לעסק שלך גם אתר תדמית יפהפה.", "רוצה להיראות עוד יותר מקצועי?");
      } else if (pType === "deck") {
        showUpsellBanner("מעבר למצגת המקצועית שהורדתם, הגיע הזמן שיהיה לעסק שלך גם אתר תדמית יפהפה.", "רוצה להיראות עוד יותר מקצועי?");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage();
  initProductPage();
});
