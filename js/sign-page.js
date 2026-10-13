/* sign.html — agreement text + name + date + signature → PDF / PNG.
   Everything runs in the browser: the signature pad is js/signature-pad.js,
   and the PDF is built with the same html2canvas + jsPDF snapshot approach
   as js/quote-render.js / js/cv-render.js — the agreement is laid out as
   real HTML (so Hebrew, RTL and mixed Hebrew/English lines are shaped by
   the browser itself), rasterised, and placed on A4 pages. jsPDF's own
   text API has no Hebrew shaping/bidi, which is why this route is used.
   No network request is made with anything the user types or draws. */
(() => {
  const L = (he, en) => (typeof dkL === "function" ? dkL(he, en) : he);
  const $ = (id) => document.getElementById(id);
  const box = $("sg-pad-box");
  const msg = $("sg-msg");

  const pad = createSignaturePad(box, {
    label: L("אזור חתימה", "Signature area"),
    onChange: (p) => { box.classList.toggle("has-ink", !p.isEmpty()); setMsg(""); },
  });
  // Handy for the browser tests (tests/tools/e2e_tools.py) and for anyone
  // embedding the page; harmless otherwise.
  window.dkSignPad = pad;

  function setMsg(text, isErr) {
    msg.textContent = text;
    msg.classList.toggle("err", !!isErr);
  }

  // Today's date in the visitor's own time zone (toISOString would be UTC
  // and can show yesterday/tomorrow around midnight).
  (() => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    if (!$("sg-date").value) $("sg-date").value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();

  /* ---------- toolbar ---------- */
  const swatches = Array.from(document.querySelectorAll(".ft-swatch"));
  swatches.forEach((s) => s.addEventListener("click", () => {
    pad.setColor(s.dataset.color);
    swatches.forEach((o) => o.setAttribute("aria-pressed", o === s ? "true" : "false"));
  }));
  $("sg-undo").addEventListener("click", () => pad.undo());
  $("sg-clear").addEventListener("click", () => pad.clear());

  function updateCount() {
    const n = $("sg-text").value.length;
    $("sg-text-count").textContent = n ? L(`${n.toLocaleString("en-US")} תווים`, `${n.toLocaleString("en-US")} characters`) : "";
  }
  $("sg-text").addEventListener("input", updateCount);

  function applyLabels() {
    pad.canvas.setAttribute("aria-label", L("אזור חתימה — ציירו את החתימה עם העכבר, האצבע או העט", "Signature area — draw your signature with mouse, finger or pen"));
    swatches[0].setAttribute("aria-label", L("צבע שחור", "Black ink"));
    swatches[1].setAttribute("aria-label", L("צבע כחול", "Blue ink"));
    updateCount();
  }
  document.addEventListener("deskkit:langchange", applyLabels);
  applyLabels();

  /* ---------- helpers ---------- */
  // Direction from the first strong character — a Hebrew agreement is RTL
  // even when the page is in English mode, and vice versa.
  function textDir(text) {
    const m = /[A-Za-zÀ-ɏ]|[֐-׿؀-ۿ]/.exec(text || "");
    if (!m) return document.documentElement.dir === "ltr" ? "ltr" : "rtl";
    return /[֐-׿؀-ۿ]/.test(m[0]) ? "rtl" : "ltr";
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function formatDate(iso, dir) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    return dir === "rtl" ? `${m[3]}.${m[2]}.${m[1]}` : `${m[3]}/${m[2]}/${m[1]}`;
  }
  function safeFileName(s, fallback) {
    const clean = String(s || "").replace(/[\\/:*?"<>|\u0000-\u001F]+/g, " ").replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    return clean || fallback;
  }
  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function validate(forPdf) {
    if (pad.isEmpty()) { setMsg(L("צריך לחתום קודם בתוך המסגרת.", "Please sign inside the box first."), true); box.scrollIntoView({ block: "center", behavior: "smooth" }); return false; }
    if (!forPdf) return true;
    if (!$("sg-text").value.trim()) { setMsg(L("חסר טקסט להסכם.", "The agreement text is empty."), true); $("sg-text").focus(); return false; }
    if (!$("sg-name").value.trim()) { setMsg(L("חסר שם מלא של החותם.", "Please enter the signer's full name."), true); $("sg-name").focus(); return false; }
    if (!$("sg-date").value) { setMsg(L("חסר תאריך.", "Please pick a date."), true); $("sg-date").focus(); return false; }
    return true;
  }

  /* ---------- PNG ---------- */
  $("sg-png").addEventListener("click", async () => {
    if (!validate(false)) return;
    const blob = await pad.toBlob("image/png", { trim: true, scale: 3 });
    if (!blob) { setMsg(L("יצירת התמונה נכשלה. נסו שוב.", "Couldn't create the image. Please try again."), true); return; }
    triggerDownload(blob, L("חתימה", "signature") + ".png");
    setMsg(L("קובץ החתימה ירד למכשיר.", "Signature image downloaded."));
  });

  /* ---------- PDF ---------- */
  /* One block per line, each with its OWN direction: an English line in a
     Hebrew agreement (or the reverse) laid out inside one RTL block gets
     its punctuation reordered — "(AI, SVG)." comes out as ")AI, SVG(." —
     because the bidi algorithm uses the block's direction for neutral
     characters at the line's ends. Blank lines keep their height. */
  function linesHtml(text, docDir) {
    return text.split("\n").map((line) => {
      if (!line.trim()) return `<div style="height:1.85em;"></div>`;
      const d = /[A-Za-z\u0590-\u05FF]/.test(line) ? textDir(line) : docDir;
      return `<div dir="${d}" style="direction:${d}; text-align:${d === "rtl" ? "right" : "left"}; white-space:pre-wrap; overflow-wrap:break-word;">${esc(line)}</div>`;
    }).join("");
  }

  function buildDocHtml() {
    const title = $("sg-title").value.trim();
    const text = $("sg-text").value.replace(/\s+$/, "");
    const name = $("sg-name").value.trim();
    const dir = textDir(title + " " + text);
    const he = dir === "rtl";
    // Physical text-align (right/left), not start/end: html2canvas doesn't
    // reliably resolve logical alignment (same note as js/cv-render.js).
    const align = he ? "right" : "left";
    const sig = pad.toDataURL("image/png", { trim: true, scale: 3 });
    const lbl = (h, e) => (he ? h : e);
    return `
      <div class="sg-doc" dir="${dir}" style="width:794px; box-sizing:border-box; padding:64px 70px 56px; background:#fff; color:#111827; font-family:Heebo, Arial, sans-serif; direction:${dir}; text-align:${align};">
        ${title ? `<h1 style="font-size:24px; font-weight:700; margin:0 0 26px; text-align:center; line-height:1.4;">${esc(title)}</h1>` : ""}
        <div style="font-size:15px; line-height:1.85;">${linesHtml(text, dir)}</div>
        <div style="margin-top:44px; display:flex; flex-direction:row; justify-content:space-between; align-items:flex-end; gap:30px;">
          <div style="font-size:14.5px; line-height:2; text-align:${align};">
            <div><b>${lbl("שם:", "Name:")}</b> ${esc(name)}</div>
            <div><b>${lbl("תאריך:", "Date:")}</b> <span dir="ltr">${esc(formatDate($("sg-date").value, dir))}</span></div>
          </div>
          <div style="text-align:center; min-width:240px;">
            <img src="${sig}" alt="" style="display:block; max-width:260px; max-height:120px; margin:0 auto 4px;">
            <div style="border-top:1px solid #9CA3AF; padding-top:6px; font-size:13px; color:#4B5563;">${lbl("חתימה", "Signature")}</div>
          </div>
        </div>
        <div style="margin-top:40px; font-size:10.5px; color:#9CA3AF; text-align:center;">${lbl("נחתם בחתימה אלקטרונית פשוטה · נוצר באמצעות DeskKit.co.il", "Signed with a simple electronic signature · Created with DeskKit.co.il")}</div>
      </div>`;
  }

  /* Splits the tall snapshot into A4-height slices. Each cut is moved up
     to the nearest fully-white pixel row (between two lines of text) so a
     line is never sliced in half across pages. */
  function findCut(canvas, ideal, minY) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const from = Math.max(minY, ideal - Math.round(canvas.width * 0.25));
    const h = ideal - from;
    if (h <= 0) return ideal;
    let data;
    try { data = ctx.getImageData(0, from, canvas.width, h).data; } catch (err) { return ideal; }
    const w = canvas.width;
    for (let row = h - 1; row >= 0; row--) {
      let white = true;
      for (let x = 0; x < w; x += 2) {
        const i = (row * w + x) * 4;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) { white = false; break; }
      }
      if (white) return from + row;
    }
    return ideal;
  }

  async function downloadPdf() {
    if (!validate(true)) return;
    if (!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)) {
      setMsg(L("רכיב ה-PDF לא נטען. רעננו את הדף ונסו שוב.", "The PDF component didn't load. Refresh the page and try again."), true);
      return;
    }
    const btn = $("sg-pdf");
    btn.disabled = true;
    setMsg(L("מכינים את ה-PDF…", "Preparing the PDF…"));

    const temp = document.createElement("div");
    temp.style.cssText = "position:fixed; top:0; left:-99999px; width:794px; pointer-events:none;";
    temp.innerHTML = buildDocHtml();
    document.body.appendChild(temp);
    const doc = temp.querySelector(".sg-doc");
    // Same baseline-probe fix as js/quote-render.js's downloadQuotePdf():
    // style.css's site-wide img{display:block} otherwise shifts every text
    // line in the snapshot down.
    const probeFix = document.createElement("style");
    probeFix.textContent = 'img[width="1"][height="1"] { display:inline !important; }';
    document.head.appendChild(probeFix);
    try {
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (err) { /* unsupported */ } }
      const img = doc.querySelector("img");
      if (img && !img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
      await new Promise((r) => requestAnimationFrame(r));
      let canvas;
      try {
        canvas = await window.html2canvas(doc, { scale: 2, backgroundColor: "#ffffff", logging: false });
      } finally {
        temp.remove();
        probeFix.remove();
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const pagePx = Math.floor(canvas.width * (pageH / pageW));
      let y = 0;
      let first = true;
      while (y < canvas.height - 2) {
        let end = Math.min(canvas.height, y + pagePx);
        if (end < canvas.height) end = findCut(canvas, end, y + Math.round(pagePx * 0.5));
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = end - y;
        const sctx = slice.getContext("2d");
        sctx.fillStyle = "#ffffff";
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, y, canvas.width, end - y, 0, 0, canvas.width, end - y);
        if (!first) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, (slice.height / slice.width) * pageW);
        first = false;
        y = end;
      }
      const title = $("sg-title").value.trim();
      pdf.save(safeFileName(title, L("הסכם-חתום", "signed-agreement")) + "-" + $("sg-date").value + ".pdf");
      setMsg(L("ה-PDF ירד למכשיר.", "The PDF was downloaded."));
    } catch (err) {
      console.error("sign PDF export failed:", err);
      setMsg(L("הורדת ה-PDF נכשלה. אפשר לנסות שוב בעוד רגע.", "The PDF download failed. Please try again in a moment."), true);
    } finally {
      btn.disabled = false;
    }
  }
  $("sg-pdf").addEventListener("click", downloadPdf);
})();
