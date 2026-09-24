/* Small UI-chrome dictionary local to this file — separate from js/i18n.js
   on purpose: everything here is generated INSIDE dynamically-built HTML
   (card labels, button text), which data-i18n's textContent sweep can't
   reach. The actual product names/descriptions (PRODUCTS in
   products-data.js) are NOT covered here — they stay Hebrew-only for now,
   a separate, much bigger translation task. */
const CATALOG_STR = {
  he: { free: "חינם", download: "להורדה", edit: "לעריכה", view: "לצפייה",
        emptyCategory: "אין עדיין מוצרים בקטגוריה הזו.",
        emptySearch: (term) => `אין תבניות שמתאימות לחיפוש "${term}".`,
        previewAlt: (title) => `תצוגה מקדימה של ${title}`,
        catalogFallback: "קטלוג",
        viewFull: "צפייה מלאה בתוכן", downloadFile: "הורדת הקובץ — חינם",
        downloadNote: (linkHtml) => `קובץ מלא, מוכן לעריכה. אפשר לצפות בכל התוכן לפני שמורידים. ההורדה עצמה דורשת התחברות (חשבון פשוט וחינמי) כדי שתישאר לכם גישה קבועה. יש שאלה? ${linkHtml} ונשמח לעזור.`,
        contactUs: "כתבו לנו",
        editDownload: "עריכה והורדה — חינם",
        editNote: "ממלאים את הפרטים שלכם ורואים תוצאה חיה, בעברית או באנגלית. עריכה חינמית לגמרי — רק צריך להתחבר כדי להיכנס לעורך.",
        factsDeliveryLabel: "מסירה", factsEditLabel: "עריכה", factsPaymentLabel: "תשלום",
        factsTermsLink: "לתנאי השימוש המלאים",
        factsDelivery: (pType) => pType === "cv" ? "עריכה חיה באתר, ואז הורדת קובץ PDF מיידית" : "קובץ להורדה מיידית, מוכן לשימוש",
        factsEdit: (pType) => pType === "cv" ? "כן — משנים טקסט, צבעים ופרטים בבילדר החי, לפני ההורדה" : pType === "deck" ? "כן — הקובץ נערך בחופשיות ב-PowerPoint (או Google Slides) אחרי ההורדה" : "כן — הקובץ נערך בחופשיות ב-Excel (או Google Sheets) אחרי ההורדה",
        factsPayment: (price) => price === 0 ? "חינם לגמרי — בלי מנוי ובלי חיוב חוזר" : `₪${price} — תשלום חד-פעמי, בלי מנוי` },
  en: { free: "Free", download: "Download", edit: "Edit", view: "View",
        emptyCategory: "No products in this category yet.",
        emptySearch: (term) => `No templates match the search "${term}".`,
        previewAlt: (title) => `Preview of ${title}`,
        catalogFallback: "Catalog",
        viewFull: "View full content", downloadFile: "Download file — free",
        downloadNote: (linkHtml) => `A complete, ready-to-edit file. You can view all the content before downloading. The download itself requires signing in (a simple, free account) so you keep permanent access. Have a question? ${linkHtml} and we'll be happy to help.`,
        contactUs: "Write to us",
        editDownload: "Edit & download — free",
        editNote: "Fill in your details and see a live result, in Hebrew or English. Editing is completely free — you just need to sign in to open the editor.",
        factsDeliveryLabel: "Delivery", factsEditLabel: "Editable", factsPaymentLabel: "Payment",
        factsTermsLink: "Full terms of use",
        factsDelivery: (pType) => pType === "cv" ? "Live editing on the site, then an instant PDF download" : "Instant file download, ready to use",
        factsEdit: (pType) => pType === "cv" ? "Yes — edit text, colors and details in the live builder before downloading" : pType === "deck" ? "Yes — the file opens and edits freely in PowerPoint (or Google Slides) after downloading" : "Yes — the file opens and edits freely in Excel (or Google Sheets) after downloading",
        factsPayment: (price) => price === 0 ? "Completely free — no subscription, no recurring charge" : `₪${price} — one-time payment, no subscription` },
};
function catalogLang() { return (typeof currentLang === "function" ? currentLang() : "he"); }
function cs() { return CATALOG_STR[catalogLang()] || CATALOG_STR.he; }

function money(n) { return n === 0 ? cs().free : "₪" + n; }
function escapeHtmlC(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cardHtml(p) {
  const t = cs();
  const actionLabel = p.downloadUrl ? t.download : (p.price === 0 ? t.edit : t.view);
  return `
    <div class="card" data-cat="${productSubtopic(p)}">
      <div class="thumb"><img src="images/previews/${p.image}" alt="${p.title}" loading="lazy"></div>
      <div class="body">
        <div class="card-meta">
          <span class="tag">${productSubtopicLabel(p)}</span>
          ${p.price === 0 ? `<span class="tag tag-free">${t.free}</span>` : `<span class="price">${money(p.price)}</span>`}
        </div>
        <h3>${p.title}</h3>
        <a href="product.html?slug=${p.slug}" class="btn btn-teal card-cta">${actionLabel}</a>
      </div>
    </div>`;
}

function renderGrid(el, products) {
  el.innerHTML = products.length
    ? products.map(cardHtml).join("")
    : `<p style="grid-column:1/-1; text-align:center; color:var(--grey);">${cs().emptyCategory}</p>`;
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

  // A sub-topic (e.g. ?type=cv&cat=dev) used to just filter the grid —
  // the hero/title/meta-description stayed the type-level one regardless
  // of which of the 13 real sub-topics was showing, so 13 separately
  // crawlable URLs all carried near-duplicate content. SUBTOPIC_HERO
  // (products-data.js) gives the real ones their own specific text;
  // "all" (and anything without an entry) falls back to TYPE_HERO as
  // before.
  function renderHero() {
    const subHero = activeSub !== "all" ? SUBTOPIC_HERO[type + "/" + activeSub] : null;
    const hero = subHero || TYPE_HERO[type];
    if (!hero) return;
    const isEn = catalogLang() === "en";
    const title = (isEn && hero.titleEn) || hero.title;
    const lead = (isEn && hero.leadEn) || hero.lead;
    if (heroTitleEl) heroTitleEl.textContent = title;
    if (heroLeadEl) {
      heroLeadEl.textContent = lead + " ";
      if (type === "cv") {
        const guideLink = document.createElement("a");
        guideLink.href = "guide-cv-tips.html";
        guideLink.style.color = "var(--teal)";
        guideLink.style.fontWeight = "600";
        guideLink.textContent = isEn ? "5 tips for a resume that gets hired" : "5 טיפים לקורות חיים שמתקבלים";
        heroLeadEl.appendChild(guideLink);
      }
    }
    document.title = title + (isEn ? " — Catalog — DeskKit" : " — קטלוג — DeskKit");
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute("content", lead);
    const canonicalTag = document.querySelector('link[rel="canonical"]');
    const canonicalUrl = "https://deskkit.co.il/products.html?type=" + type + (activeSub !== "all" ? "&cat=" + activeSub : "");
    if (canonicalTag) canonicalTag.setAttribute("href", canonicalUrl);
  }
  renderHero();
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
    const isEn = catalogLang() === "en";
    if (!topics.length) { subTabsEl.style.display = "none"; subTabsEl.innerHTML = ""; return; }
    subTabsEl.style.display = "";
    subTabsEl.innerHTML = topics.map((c) => `<button class="tab tab-sub${c.slug === activeSub ? " active" : ""}" data-prof="${c.slug}">${(isEn && c.labelEn) || c.label}</button>`).join("");
    subTabsEl.querySelectorAll(".tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSub = btn.dataset.prof;
        updateUrl();
        apply();
      });
    });
  }

  function apply() {
    renderHero();
    renderSubTabs();
    const term = searchTerm.trim();
    const list = PRODUCTS.filter((p) => {
      if (productType(p) !== type) return false;
      if (activeSub !== "all" && productSubtopic(p) !== activeSub) return false;
      if (term && !p.title.toLowerCase().includes(term.toLowerCase())) return false;
      return true;
    });
    if (term && !list.length) {
      grid.innerHTML = `<p class="tpl-search-empty">${cs().emptySearch(escapeHtmlC(term))}</p>`;
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

  // Language toggled while already on this page (no reload) — data-i18n's
  // own sweep can't reach any of the JS-rendered content above, so redo
  // the language-dependent pieces by hand instead. apply() already calls
  // renderHero() itself (see above — a sub-topic switch needs the same
  // refresh), so this alone covers both cases.
  document.addEventListener("deskkit:langchange", apply);
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
  // "the" canonical and never indexes the rest at all. Same reasoning
  // extends to the OG tags and the JSON-LD block below, both otherwise
  // stuck on generic placeholder content for every product.
  const pageUrl = "https://deskkit.co.il/product.html?slug=" + p.slug;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.setAttribute("content", p.heroDesc);
  const canonicalTag = document.querySelector('link[rel="canonical"]');
  if (canonicalTag) canonicalTag.setAttribute("href", pageUrl);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", p.title + " — DeskKit");
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", p.heroDesc);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", pageUrl);
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute("content", "https://deskkit.co.il/images/previews/" + p.image);
  const schemaTag = document.getElementById("product-schema");
  if (schemaTag) {
    schemaTag.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.title,
      description: p.heroDesc,
      image: "https://deskkit.co.il/images/previews/" + p.image,
      brand: { "@type": "Brand", name: "DeskKit" },
      offers: {
        "@type": "Offer",
        price: String(p.price),
        priceCurrency: "ILS",
        availability: "https://schema.org/InStock",
        url: pageUrl,
      },
    });
  }
  const pType = productType(p);
  // product.html is one shared shell for every product type, but its nav
  // markup had "קורות חיים" hardcoded as the active link — so a deck or
  // xlsx product page still showed the CV tab highlighted. Set it here
  // instead, based on the product actually being shown.
  document.querySelectorAll(".nav-links a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === `products.html?type=${pType}`);
  });

  // p.title/heroDesc/formatBadges/checklist are the product's own content
  // (PRODUCTS in products-data.js) and stay Hebrew-only for now — see the
  // CATALOG_STR comment above. Everything else here (breadcrumb label,
  // buttons, note text) IS UI chrome, so it's re-rendered on language
  // change same as the catalog grid.
  function render() {
    const t = cs();
    const isEn = catalogLang() === "en";
    const pTypeLabel = (PRODUCT_TYPES.find((x) => x.slug === pType) || {}).labelEn && isEn
      ? PRODUCT_TYPES.find((x) => x.slug === pType).labelEn
      : (PRODUCT_TYPES.find((x) => x.slug === pType) || {}).label || t.catalogFallback;
    root.innerHTML = `
      <div class="product-hero">
        <div class="thumb"><img src="images/previews/${p.image}" alt="${t.previewAlt(p.title)}"></div>
        <div>
          <div class="breadcrumb"><a href="products.html?type=${pType}">${pTypeLabel}</a> / ${p.title}</div>
          <h1>${p.title}</h1>
          <p class="desc">${p.heroDesc}</p>
          <div class="format-badges">${p.formatBadges.map((b) => `<span class="format-badge">${b}</span>`).join("")}</div>
          <div class="price-block">
            <span class="price">${money(p.price)}</span>
          </div>
          <ul class="checklist">${p.checklist.map((c) => `<li>${c}</li>`).join("")}</ul>
          <div class="product-facts">
            <div class="pf-row"><span class="pf-label">${t.factsDeliveryLabel}</span><span>${t.factsDelivery(pType)}</span></div>
            <div class="pf-row"><span class="pf-label">${t.factsEditLabel}</span><span>${t.factsEdit(pType)}</span></div>
            <div class="pf-row"><span class="pf-label">${t.factsPaymentLabel}</span><span>${t.factsPayment(p.price)}</span></div>
            <a href="terms.html" class="pf-terms-link">${t.factsTermsLink}</a>
          </div>
          ${p.downloadUrl ? `
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="preview.html?slug=${p.slug}" class="btn btn-outline-dark">${t.viewFull}</a>
            <button type="button" id="download-file-btn" class="btn btn-gold">${t.downloadFile}</button>
          </div>
          <div class="note-box">${t.downloadNote(`<a href="contact.html" style="color:var(--teal); font-weight:600;">${t.contactUs}</a>`)}</div>
          ` : `
          <a href="builder.html?template=${p.slug}" class="btn btn-gold">${t.editDownload}</a>
          <div class="note-box">${t.editNote}</div>
          `}
        </div>
      </div>`;

    if (p.downloadUrl) {
      const downloadBtn = document.getElementById("download-file-btn");
      if (downloadBtn) downloadBtn.addEventListener("click", () => handleGatedDownload(p));
    }
  }
  render();
  document.addEventListener("deskkit:langchange", render);

  const related = document.getElementById("related-grid");
  if (related) {
    const list = PRODUCTS.filter((x) => x.categorySlug === p.categorySlug && x.slug !== p.slug).slice(0, 3);
    if (list.length) {
      renderGrid(related, list);
      document.addEventListener("deskkit:langchange", () => renderGrid(related, list));
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
