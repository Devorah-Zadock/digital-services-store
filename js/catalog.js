function money(n) { return n === 0 ? "חינם" : "₪" + n; }

function cardHtml(p) {
  return `
    <div class="card" data-cat="${p.categorySlug}">
      <div class="thumb"><img src="images/previews/${p.image}" alt="${p.title}" loading="lazy"></div>
      <div class="body">
        <span class="tag">${p.category} · ${p.format}</span>
        <h3>${p.title}</h3>
        <p>${p.shortDesc}</p>
        <div class="price-row">
          <span class="price">${money(p.price)}</span>
          <a href="product.html?slug=${p.slug}" class="btn btn-teal">${p.downloadUrl ? "הורדה חינמית" : (p.price === 0 ? "עריכה חינמית" : "לצפייה במוצר")}</a>
        </div>
      </div>
    </div>`;
}

function renderGrid(el, products) {
  el.innerHTML = products.length
    ? products.map(cardHtml).join("")
    : `<p style="grid-column:1/-1; text-align:center; color:var(--grey);">אין עדיין מוצרים בקטגוריה הזו.</p>`;
}

function initProductsPage() {
  const grid = document.getElementById("product-grid");
  const tabsEl = document.getElementById("cat-tabs");
  if (!grid || !tabsEl) return;

  tabsEl.innerHTML = CATEGORIES.map((c) => `<button class="tab" data-cat="${c.slug}">${c.label}</button>`).join("");

  const params = new URLSearchParams(location.search);
  let active = params.get("cat") || "all";
  if (!CATEGORIES.some((c) => c.slug === active)) active = "all";

  function apply() {
    tabsEl.querySelectorAll(".tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.cat === active));
    const list = active === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.categorySlug === active);
    renderGrid(grid, list);
  }

  tabsEl.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      active = btn.dataset.cat;
      const url = new URL(location.href);
      if (active === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", active);
      history.replaceState(null, "", url);
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

  document.title = p.title + " — BizKit";
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
