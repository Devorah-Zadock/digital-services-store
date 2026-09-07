function escapeHtmlPV(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pvHex(h, fallback) {
  return h ? "#" + h : fallback;
}

/* Relative sizing only (not the real file's exact points) — a slide/
   sheet rendered at real point sizes on a phone-width screen would be
   unreadable; scaling everything up by the same ratio keeps each
   element's real size RELATIVE to the others (title clearly bigger than
   body text) while staying legible at any screen width. */
function pvSlideFontPx(sizePt) {
  if (!sizePt) return 15;
  return Math.round(Math.max(13, Math.min(sizePt * 1.15, 52)));
}

function renderDeckPreview(root, product, data) {
  const slides = data.slides;
  let idx = 0;

  function render() {
    const slide = slides[idx];
    const bg = pvHex(slide.bg, "#FFFFFF");
    const isDark = /^#(0|1)/.test(bg) || ["#111111"].includes(bg.toUpperCase());
    const linesHtml = slide.blocks.map((b) => {
      const px = pvSlideFontPx(b.size);
      const color = pvHex(b.color, isDark ? "#FFFFFF" : "#1A1A1A");
      const weight = b.bold ? 800 : 400;
      return `<div class="pv-line" style="font-size:${px}px; font-weight:${weight}; color:${color};">${escapeHtmlPV(b.text)}</div>`;
    }).join("");

    root.innerHTML = `
      <div class="pv-slide-card" style="background:${bg};">${linesHtml}</div>
      <div class="pv-slide-nav">
        <button type="button" id="pv-prev"${idx === 0 ? " disabled" : ""}>הקודם</button>
        <span class="pv-slide-counter">שקופית ${idx + 1} מתוך ${slides.length}</span>
        <button type="button" id="pv-next"${idx === slides.length - 1 ? " disabled" : ""}>הבא</button>
      </div>
      <div class="pv-slide-dots" id="pv-dots">
        ${slides.map((_, i) => `<span class="${i === idx ? "active" : ""}" data-i="${i}"></span>`).join("")}
      </div>`;

    const prev = root.querySelector("#pv-prev");
    const next = root.querySelector("#pv-next");
    if (prev) prev.addEventListener("click", () => { if (idx > 0) { idx--; render(); } });
    if (next) next.addEventListener("click", () => { if (idx < slides.length - 1) { idx++; render(); } });
    root.querySelectorAll("#pv-dots span").forEach((dot) => {
      dot.addEventListener("click", () => { idx = Number(dot.dataset.i); render(); });
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && idx > 0) { idx--; render(); }
    if (e.key === "ArrowLeft" && idx < slides.length - 1) { idx++; render(); }
  });

  render();
}

function renderSheetPreview(root, product, data) {
  const rows = data.rows;
  const html = rows.map((row) => {
    const cells = row.map((c) => {
      const style = [];
      if (c.fill) style.push(`background:${pvHex(c.fill)}`);
      if (c.color) style.push(`color:${pvHex(c.color)}`);
      if (c.bold) style.push("font-weight:700");
      if (c.size) style.push(`font-size:${Math.round(c.size * 1.1)}px`);
      return `<td style="${style.join(";")}">${escapeHtmlPV(c.v)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  root.innerHTML = `
    <div class="pv-sheet-box">
      <div class="pv-sheet-table-wrap">
        <table class="pv-sheet-table">${html}</table>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  const slug = new URLSearchParams(location.search).get("slug");
  const product = PRODUCTS.find((p) => p.slug === slug);
  const data = product && PRODUCT_PREVIEW_DATA[slug];
  const content = document.getElementById("pv-content");
  const backLink = document.getElementById("pv-back");

  if (!product || !data) {
    content.innerHTML = `<p style="text-align:center; color:var(--grey);">התבנית לא נמצאה.</p>`;
    return;
  }

  document.title = "תצוגה מלאה — " + product.title + " — DeskKit";
  document.getElementById("pv-title").textContent = product.title;
  document.getElementById("pv-sub").textContent = data.type === "deck" ? "תצוגת שקופיות מלאה" : "תצוגת גיליון מלאה";
  backLink.href = "product.html?slug=" + encodeURIComponent(slug);

  if (data.type === "deck") {
    renderDeckPreview(content, product, data);
  } else {
    renderSheetPreview(content, product, data);
  }
});
