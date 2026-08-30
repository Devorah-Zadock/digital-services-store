function money(n) { return n === 0 ? "חינם" : "₪" + n; }

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

/* Two-tier: pick a document TYPE first (big pills), and only once "קורות
   חיים" is the active type does a second, narrower row of profession
   pills appear — a deck or a spreadsheet never had a profession filter
   to begin with, so hiding that row for them isn't a missing feature,
   it's not applicable. ?cat= is kept working for old links (the chatbot
   widget links to products.html?cat=cv / ?cat=deck / ?cat=xlsx) by
   treating those three as type-level, and any profession slug
   (general/dev/design/accounting) as a sub-filter within "cv". */
function initProductsPage() {
  const grid = document.getElementById("product-grid");
  const typeTabsEl = document.getElementById("type-tabs");
  const subTabsEl = document.getElementById("subcat-tabs");
  if (!grid || !typeTabsEl || !subTabsEl) return;

  const params = new URLSearchParams(location.search);
  const catParam = params.get("cat");
  const typeParam = params.get("type");

  let activeType = typeParam || (["deck", "xlsx"].includes(catParam) ? catParam : "cv");
  if (!PRODUCT_TYPES.some((t) => t.slug === activeType)) activeType = "cv";
  let activeProf = CV_PROFESSIONS.some((c) => c.slug === catParam) ? catParam : "all";

  typeTabsEl.innerHTML = PRODUCT_TYPES.map((t) => `<button class="tab" data-type="${t.slug}">${t.label}</button>`).join("");

  function updateUrl() {
    const url = new URL(location.href);
    url.searchParams.set("type", activeType);
    if (activeType === "cv" && activeProf !== "all") url.searchParams.set("cat", activeProf); else url.searchParams.delete("cat");
    history.replaceState(null, "", url);
  }

  function renderSubTabs() {
    if (activeType !== "cv") { subTabsEl.style.display = "none"; subTabsEl.innerHTML = ""; return; }
    subTabsEl.style.display = "";
    subTabsEl.innerHTML = CV_PROFESSIONS.map((c) => `<button class="tab tab-sub${c.slug === activeProf ? " active" : ""}" data-prof="${c.slug}">${c.label}</button>`).join("");
    subTabsEl.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeProf = btn.dataset.prof;
        updateUrl();
        apply();
      });
    });
  }

  function apply() {
    typeTabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.type === activeType));
    renderSubTabs();
    const list = PRODUCTS.filter((p) => {
      if (productType(p) !== activeType) return false;
      if (activeType === "cv" && activeProf !== "all" && p.categorySlug !== activeProf) return false;
      return true;
    });
    renderGrid(grid, list);
  }

  typeTabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeType = btn.dataset.type;
      activeProf = "all";
      updateUrl();
      apply();
    });
  });

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
          <span style="color:var(--grey); font-size:14px;">${p.downloadUrl ? "הורדה מיידית, בלי הרשמה" : "הורדת PDF חינמית תמיד"}</span>
        </div>
        <ul class="checklist">${p.checklist.map((c) => `<li>${c}</li>`).join("")}</ul>
        ${p.downloadUrl ? `
        <a href="${p.downloadUrl}" download class="btn btn-gold">הורדת הקובץ — חינם</a>
        <div class="note-box">קובץ מלא, מוכן לעריכה. יש שאלה? <a href="contact.html" style="color:var(--teal); font-weight:600;">כתבו לנו</a> ונשמח לעזור.</div>
        ` : `
        <a href="builder.html?template=${p.slug}" class="btn btn-gold">עריכה והורדה — חינם</a>
        <div class="note-box">ממלאים את הפרטים שלכם ורואים תוצאה חיה, בעברית או באנגלית. הורדת PDF חינמית לגמרי.</div>
        `}
      </div>
    </div>`;

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

document.addEventListener("DOMContentLoaded", () => {
  initProductsPage();
  initFeatured();
  initProductPage();
});
