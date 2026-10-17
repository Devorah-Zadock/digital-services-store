/* ===========================================================
   Site editor — the one side panel, the quick-actions dock, the
   "add section" gallery, the "change design" picker, site structure and
   preview mode. Companion of js/builder-shell.js (same globals: siteState,
   bsxSel, bsL, bshellSnapshot, bshellScheduleSave, bshellRenderCanvas…).

   ONE panel at a time (desktop: a column next to the canvas, so it never
   covers the site; phone: a bottom sheet). It shows only what belongs to
   what is selected, or one of the site-wide views (design, business
   details, structure, advanced settings, SEO). Every field writes the same
   d.* field the rest of the builder uses, with one undo step per edit.
   =========================================================== */

let bsxPanelMode = null;
let bsxPanelOpts = {};
const BSX_SELECTION_PANELS = ["text", "button", "image", "section", "itemstyle", "chrome"];

function bsxPanelTitle(mode) {
  const sel = bsxSel;
  switch (mode) {
    case "text": return bsL("עיצוב טקסט", "Text style");
    case "button": return bsL("כפתור", "Button");
    case "image": return bsL("תמונה", "Image");
    case "heroimages": return bsL("תמונות הפתיח", "Hero images");
    case "video": return bsL("סרטון", "Video");
    case "section": return sel ? bsxSectionLabel(sel.secKey) : bsL("חלק", "Section");
    case "chrome": return sel ? bsxSectionLabel(sel.secKey) : bsL("ראש ותחתית", "Header & footer");
    case "itemstyle": return bsL(`עיצוב ${bshellItemWord()[1]}`, `Style of the ${bshellItemWord()[1]}`);
    case "design": return bsL("עיצוב האתר", "Site design");
    case "business": return bsL("פרטי העסק ויצירת קשר", "Business & contact details");
    case "structure": return bsL("מבנה האתר", "Site structure");
    case "settings": return bsL("הגדרות מתקדמות", "Advanced settings");
    case "seo": return bsL("איך האתר נראה בגוגל", "How the site looks on Google");
    default: return "";
  }
}

function bsxOpenPanel(mode, opts) {
  bsxClosePopover();
  const ai = document.getElementById("bshell-ai-panel");
  if (ai) ai.setAttribute("hidden", "");
  bsxPanelMode = mode;
  bsxPanelOpts = opts || {};
  const panel = document.getElementById("bsx-panel");
  const body = bsxFreshPanelBody();
  document.getElementById("bsx-panel-title").textContent = bsxPanelTitle(mode);
  document.getElementById("bsx-panel-back").hidden = true;
  const html = bsxPanelHtml(mode);
  if (html == null) { bsxClosePanel(); return; }
  body.innerHTML = html;
  bsxFillIcons(body);
  panel.hidden = false;
  panel.dataset.mode = mode;
  document.getElementById("bshell-root").classList.add("has-panel");
  bsxWirePanel(mode, body);
  document.getElementById("bsx-structure-btn").classList.toggle("is-on", mode === "structure");
  if (typeof bsxRenderDock === "function") bsxRenderDock();
  if (bsxPanelOpts.focus) {
    const f = body.querySelector(`[data-focus-key="${bsxPanelOpts.focus}"]`);
    if (f) { f.scrollIntoView({ block: "center" }); const i = f.querySelector("input, textarea, select") || f; setTimeout(() => i.focus && i.focus(), 30); }
  }
  setTimeout(bsxDraw, 260);
}
/* A new, listener-free body element for every render, so panel-level
   listeners never pile up across re-renders. */
function bsxFreshPanelBody() {
  const old = document.getElementById("bsx-panel-body");
  const fresh = old.cloneNode(false);
  old.replaceWith(fresh);
  return fresh;
}
function bsxClosePanel() {
  const panel = document.getElementById("bsx-panel");
  if (!panel) return;
  if (panel.contains(document.activeElement)) document.activeElement.blur();
  panel.hidden = true;
  bsxPanelMode = null;
  document.getElementById("bshell-root").classList.remove("has-panel");
  const sb = document.getElementById("bsx-structure-btn");
  if (sb) sb.classList.remove("is-on");
  if (typeof bsxRenderDock === "function") bsxRenderDock();
  setTimeout(bsxDraw, 30);
}
function bsxTogglePanel(mode) { if (bsxPanelMode === mode) bsxClosePanel(); else bsxOpenPanel(mode); }
function bsxPanelBack() { bsxClosePanel(); }
/* Re-render the open panel (after undo, a canvas change…) — never while
   the user is typing in one of its fields. */
function bsxRefreshPanel(force) {
  if (!bsxPanelMode) return;
  const body = document.getElementById("bsx-panel-body");
  if (!force && body.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  if (BSX_SELECTION_PANELS.indexOf(bsxPanelMode) !== -1 && !bsxSel) { bsxClosePanel(); return; }
  const scroll = body.scrollTop;
  const html = bsxPanelHtml(bsxPanelMode);
  if (html == null) { bsxClosePanel(); return; }
  document.getElementById("bsx-panel-title").textContent = bsxPanelTitle(bsxPanelMode);
  const fresh = bsxFreshPanelBody();
  fresh.innerHTML = html;
  bsxFillIcons(fresh);
  bsxWirePanel(bsxPanelMode, fresh);
  fresh.scrollTop = scroll;
}
function bsxPanelModeForSel(sel) {
  if (!sel) return null;
  if (sel.kind === "text") return "text";
  if (sel.kind === "button") return bsxButtonInfo(sel).editable ? "button" : "business";
  if (sel.kind === "image") return "image";
  if (sel.kind === "contact") return "business";
  if (sel.kind === "video") return "video";
  if (sel.kind === "item") return sel.svc != null ? "itemstyle" : "section";
  if (sel.kind === "section") {
    if (sel.secKey.indexOf("site:") === 0) return "chrome";
    if (sel.secKey === "video") return "video";
    return "section";
  }
  return null;
}
function bsxOnSelectionChanged() {
  if (!bsxPanelMode) return;
  if (BSX_SELECTION_PANELS.indexOf(bsxPanelMode) === -1) return;
  const want = bsxPanelModeForSel(bsxSel);
  if (!want) { bsxClosePanel(); return; }
  bsxOpenPanel(want);
}

/* ---------- small field builders ---------- */
const bsxF = {
  text: (id, label, value, o) => {
    o = o || {};
    const attrs = `id="${id}"${o.dir ? ` dir="${o.dir}"` : ""}${o.max ? ` maxlength="${o.max}"` : ""} placeholder="${bsxEsc(o.ph || "")}"${o.data || ""}`;
    const input = o.multiline ? `<textarea ${attrs} rows="${o.rows || 4}">${bsxEsc(value)}</textarea>` : `<input type="${o.type || "text"}" ${attrs} value="${bsxEsc(value)}">`;
    return `<div class="bsx-field"${o.focusKey ? ` data-focus-key="${o.focusKey}"` : ""}><label class="bsx-label" for="${id}">${bsxEsc(label)}</label>${input}${o.hint ? `<p class="bsx-hint">${o.hint}</p>` : ""}</div>`;
  },
  toggle: (id, label, checked, hint, o) => `<div class="bsx-field"${o && o.focusKey ? ` data-focus-key="${o.focusKey}"` : ""}><label class="bsx-toggle" for="${id}"><span>${label}</span><input type="checkbox" id="${id}"${checked ? " checked" : ""}></label>${hint ? `<p class="bsx-hint">${hint}</p>` : ""}</div>`,
  select: (id, label, options, value, hint) => `<div class="bsx-field"><label class="bsx-label" for="${id}">${bsxEsc(label)}</label><select id="${id}">${options.map(([v, l]) => `<option value="${bsxEsc(v)}"${String(v) === String(value) ? " selected" : ""}>${bsxEsc(l)}</option>`).join("")}</select>${hint ? `<p class="bsx-hint">${hint}</p>` : ""}</div>`,
  seg: (name, label, options, value) => `<div class="bsx-field"><span class="bsx-label">${bsxEsc(label)}</span><div class="bsx-seg" role="radiogroup" aria-label="${bsxEsc(label)}" data-seg="${name}">${options.map(([v, l, icon]) => `<button type="button" role="radio" aria-checked="${String(v) === String(value)}" data-val="${bsxEsc(v)}" class="${String(v) === String(value) ? "is-on" : ""}"${icon ? ` title="${bsxEsc(l)}" aria-label="${bsxEsc(l)}"` : ""}>${icon ? bsxIcon(icon) : bsxEsc(l)}</button>`).join("")}</div></div>`,
  group: (title, inner, id) => `<div class="bsx-pgroup"${id ? ` id="${id}"` : ""}>${title ? `<div class="bsx-pgroup-title">${title}</div>` : ""}${inner}</div>`,
  note: (text) => `<p class="bsx-note-global">${bsxIcon("globe")}<span>${text}</span></p>`,
};
function bsxFontOptions(withDefault) {
  const out = withDefault ? [["", withDefault]] : [];
  return out.concat(Object.keys(SITE_FONTS).map((k) => [k, bsLabel(SITE_FONTS[k].name)]));
}
/* Text inputs: one undo step per focus, live canvas update while typing. */
function bsxBindInput(el, apply, opts) {
  if (!el) return;
  opts = opts || {};
  let t = null;
  el.addEventListener("focus", () => bshellBeginEdit(el));
  el.addEventListener("blur", () => { bshellEndEdit(el); if (opts.onBlur) opts.onBlur(); });
  el.addEventListener("input", () => {
    apply(el.value);
    bshellScheduleSave();
    if (opts.noRender) return;
    clearTimeout(t);
    t = setTimeout(() => bshellRenderCanvas(), opts.delay || 60);
  });
}
/* Toggles/selects: snapshot, apply, re-render, save. */
function bsxBindChange(el, apply, after) {
  if (!el) return;
  el.addEventListener("change", () => {
    bsxCommitEdit();
    bshellSnapshot();
    apply(el.type === "checkbox" ? el.checked : el.value);
    bshellScheduleSave();
    bshellRenderCanvas(() => { if (after) after(); });
  });
}
function bsxBindSeg(body, name, apply) {
  const seg = body.querySelector(`[data-seg="${name}"]`);
  if (!seg) return;
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("[data-val]");
    if (!b) return;
    bsxCommitEdit();
    bshellSnapshot();
    apply(b.dataset.val);
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxRefreshPanel(true));
  });
}

/* ---------- panel content ---------- */
function bsxPanelHtml(mode) {
  const d = siteState.data;
  const sel = bsxSel;
  switch (mode) {
    case "text": return sel && sel.kind === "text" ? bsxTextPanelHtml(sel) : null;
    case "button": return sel && sel.kind === "button" ? bsxButtonPanelHtml(sel) : null;
    case "image": return sel && sel.kind === "image" ? bsxImagePanelHtml(sel) : null;
    case "heroimages": return bsxHeroImagesHtml(null);
    case "video": return bsxVideoPanelHtml();
    case "section": return sel ? bsxSectionPanelHtml(sel.secKey) : null;
    case "chrome": return bsxChromePanelHtml(d);
    case "itemstyle": return bsxItemStyleHtml();
    case "design": return bsxDesignPanelHtml(d);
    case "business": return bsxBusinessPanelHtml(d);
    case "structure": return bsxStructureHtml();
    case "settings": return bsxSettingsPanelHtml(d);
    case "seo": return bshellSeoGroupHtml(d);
    default: return null;
  }
}
function bsxWirePanel(mode, body) {
  const map = {
    text: bsxWireTextPanel, button: bsxWireButtonPanel, image: bsxWireImagePanel, heroimages: bsxWireHeroImages,
    video: bsxWireVideoPanel, section: bsxWireSectionPanel, chrome: bsxWireChromePanel, itemstyle: bsxWireItemStyle,
    design: bsxWireDesignPanel, business: bsxWireBusinessPanel, structure: bsxWireStructure, settings: bsxWireSettingsPanel,
    seo: () => bshellWireSeoPanel(siteState.data),
  };
  if (map[mode]) map[mode](body);
}

/* ----- text ----- */
function bsxTextPanelHtml(sel) {
  const st = bsxStyleTarget(sel);
  const s = st ? st.get() : {};
  const caps = bsxTextCaps(sel);
  const spec = bsxTextSpec(sel);
  const sizes = bsxSizesFor(sel).slice();
  if (s.size && sizes.indexOf(Number(s.size)) === -1) sizes.push(Number(s.size));
  sizes.sort((a, b) => a - b);
  const comp = bsxComputed(sel);
  const parts = [];
  if (spec) {
    const v = spec.get();
    parts.push(bsxF.group(bsL("הטקסט", "The text"), bsxF.text("bsx-text-value", sel.label || bsL("טקסט", "Text"), v, {
      multiline: spec.multiline, rows: spec.multiline ? 6 : 2,
      ph: spec.heading ? bsL("ריק — תוצג כותרת ברירת המחדל", "Empty — the default heading is shown") : "",
      hint: spec.heading ? bsL("כותרת אפשר לשנות ולעצב, אבל לא למחוק — כשהיא ריקה מוצגת כותרת ברירת המחדל.", "A heading can be changed and styled but not deleted — when empty, the default heading shows.") : "",
    })));
  }
  const style = [];
  if (caps.font) style.push(bsxF.select("bsx-ts-font", bsL("גופן", "Font"), bsxFontOptions(bsL("גופן האתר", "Site font")), s.font || "", bsL("כל הגופנים כאן תומכים בעברית ובאנגלית.", "All fonts here support Hebrew and English.")));
  if (caps.size) style.push(`<div class="bsx-field"><label class="bsx-label" for="bsx-ts-size">${bsL("גודל", "Size")}</label><div class="bsx-row"><select id="bsx-ts-size" class="bsx-grow"><option value="">${bsL(`רגיל (${comp.size || "—"})`, `Normal (${comp.size || "—"})`)}</option>${sizes.map((n) => `<option value="${n}"${String(s.size) === String(n) ? " selected" : ""}>${n}px</option>`).join("")}</select><input type="number" id="bsx-ts-size-custom" min="8" max="160" style="width:84px" placeholder="${bsL("אחר", "Other")}" aria-label="${bsL("גודל אחר בפיקסלים", "Custom size in pixels")}"></div></div>`);
  if (caps.color) style.push(`<div class="bsx-field"><span class="bsx-label">${bsL("צבע", "Color")}</span><div class="bsx-row"><input type="color" id="bsx-ts-color" value="${bsxEsc(s.color ? "#" + String(s.color).replace("#", "") : comp.color)}" aria-label="${bsL("צבע", "Color")}"><div class="bsx-swatches bsx-grow" id="bsx-ts-swatches">${bsxThemeColors().slice(0, 6).map((c) => `<button type="button" class="bsx-swatch${String(s.color || "").toLowerCase() === c.replace("#", "").toLowerCase() ? " is-on" : ""}" style="background:${c}" data-color="${c}" title="${c}" aria-label="${c}"></button>`).join("")}</div></div></div>`);
  if (caps.weight) style.push(bsxF.seg("ts-weight", bsL("עובי", "Weight"), [["", bsL("רגיל", "Regular")], ["700", bsL("מודגש", "Bold")]], String(s.weight || "") === "700" ? "700" : ""));
  if (caps.align) style.push(bsxF.seg("ts-align", bsL("יישור", "Alignment"), [["", bsL("כמו בתבנית", "As designed")], ["start", bsL("התחלה", "Start"), bsxAlignIcon("start")], ["center", bsL("מרכז", "Center"), "alignCenter"], ["end", bsL("סוף", "End"), bsxAlignIcon("end")]], bsxAlignFromStored(s.align)));
  if (style.length) parts.push(bsxF.group(bsL("עיצוב", "Style"), style.join("")));
  if (caps.advanced) {
    parts.push(bsxF.group(bsL("מתקדם", "Advanced"),
      bsxF.select("bsx-ts-lh", bsL("מרווח בין שורות", "Line spacing"), [["", bsL("כמו בתבנית", "As designed")], ["1.15", bsL("צפוף", "Tight")], ["1.4", bsL("רגיל", "Normal")], ["1.7", bsL("מרווח", "Relaxed")], ["2", bsL("מרווח מאוד", "Loose")]], s.lineHeight || "")
      + bsxF.select("bsx-ts-ls", bsL("מרווח בין אותיות", "Letter spacing"), [["", bsL("כמו בתבנית", "As designed")], ["-0.5px", bsL("צפוף", "Tight")], ["0.5px", bsL("מעט רווח", "A little wider")], ["1.5px", bsL("רחב", "Wide")], ["3px", bsL("רחב מאוד", "Very wide")]], s.letterSpacing || "")
      + bsxF.select("bsx-ts-mw", bsL("רוחב מרבי", "Maximum width"), [["", bsL("כמו בתבנית", "As designed")], ["420", bsL("צר", "Narrow")], ["620", bsL("בינוני", "Medium")], ["820", bsL("רחב", "Wide")]], s.maxWidth || "")));
  }
  if (Object.keys(s).length) parts.push(`<button type="button" class="bsx-btn bsx-btn-block" id="bsx-ts-reset">${bsxIcon("undo")}${bsL("חזרה לעיצוב המקורי", "Back to the original style")}</button>`);
  return parts.join("");
}
function bsxWireTextPanel(body) {
  const sel = bsxSel;
  const spec = bsxTextSpec(sel);
  const valEl = body.querySelector("#bsx-text-value");
  if (valEl && spec) {
    bsxBindInput(valEl, (v) => { spec.set(spec.multiline ? v : v.replace(/[\r\n]+/g, " ")); if (spec.onSet) spec.onSet(); });
  }
  const restyle = (prop, v) => bsxApplyStyle(sel, prop, v);
  const font = body.querySelector("#bsx-ts-font");
  if (font) font.addEventListener("change", () => restyle("font", font.value));
  const size = body.querySelector("#bsx-ts-size");
  if (size) size.addEventListener("change", () => restyle("size", size.value));
  const sizeC = body.querySelector("#bsx-ts-size-custom");
  if (sizeC) sizeC.addEventListener("change", () => { const v = parseInt(sizeC.value, 10); if (v >= 8 && v <= 160) restyle("size", String(v)); });
  const color = body.querySelector("#bsx-ts-color");
  if (color) {
    color.addEventListener("focus", () => bshellBeginEdit(color));
    color.addEventListener("blur", () => bshellEndEdit(color));
    color.addEventListener("input", () => {
      const st = bsxStyleTarget(sel);
      st.set("color", color.value.replace("#", "").toUpperCase());
      bshellScheduleSave();
      bshellRenderCanvas(() => bsxRenderElTools());
    });
  }
  const sw = body.querySelector("#bsx-ts-swatches");
  if (sw) sw.addEventListener("click", (e) => { const b = e.target.closest("[data-color]"); if (b) restyle("color", b.dataset.color.replace("#", "").toUpperCase()); });
  const seg = (name, fn) => {
    const s = body.querySelector(`[data-seg="${name}"]`);
    if (s) s.addEventListener("click", (e) => { const b = e.target.closest("[data-val]"); if (b) fn(b.dataset.val); });
  };
  seg("ts-weight", (v) => restyle("weight", v));
  seg("ts-align", (v) => restyle("align", v ? bsxAlignToStored(v) : ""));
  [["#bsx-ts-lh", "lineHeight"], ["#bsx-ts-ls", "letterSpacing"], ["#bsx-ts-mw", "maxWidth"]].forEach(([id, prop]) => {
    const el = body.querySelector(id);
    if (el) el.addEventListener("change", () => restyle(prop, el.value));
  });
  const reset = body.querySelector("#bsx-ts-reset");
  if (reset) reset.addEventListener("click", () => {
    bsxCommitEdit();
    bshellSnapshot();
    bsxStyleTarget(sel).reset();
    bshellScheduleSave();
    bshellRenderCanvas(() => { bsxRenderElTools(); bsxRefreshPanel(true); });
  });
}

/* ----- button ----- */
function bsxSectionAnchors() {
  // the current order: where a button can scroll to
  return bsxMap.keys.map((k) => {
    const root = bsxMap.rootOf.get(k);
    return { key: k, label: bsxSectionLabel(k), anchor: (root && root.id) || (root && root.querySelector("[id]") && root.querySelector("[id]").id) || "" };
  });
}
function bsxButtonPanelHtml(sel) {
  const info = bsxButtonInfo(sel);
  if (!info.editable) return null;
  const a = info.action || {};
  const kind = a.kind || "";
  const d = siteState.data;
  const valueField = () => {
    if (kind === "scroll") {
      const opts = [["", bsL("לראש העמוד", "Top of the page")]].concat(bsxSectionAnchors().filter((s) => /^[A-Za-z][\w-]*$/.test(s.anchor)).map((s) => [s.anchor, s.label]));
      return bsxF.select("bsx-btn-target", bsL("לאיזה חלק לגלול", "Which section to scroll to"), opts, a.value || "");
    }
    if (kind === "tel") return bsxF.text("bsx-btn-value", bsL("מספר טלפון", "Phone number"), a.value || "", { dir: "ltr", type: "tel", ph: d.phone || "050-0000000", hint: bsL("ריק — הטלפון של העסק (מתעדכן לבד).", "Empty — the business phone (stays in sync).") });
    if (kind === "whatsapp") return bsxF.text("bsx-btn-value", bsL("מספר וואטסאפ", "WhatsApp number"), a.value || "", { dir: "ltr", type: "tel", ph: bsxContactValue("whatsapp") || "050-0000000", hint: bsL("ריק — הוואטסאפ של העסק (מתעדכן לבד).", "Empty — the business WhatsApp (stays in sync).") });
    if (kind === "email") return bsxF.text("bsx-btn-value", bsL("כתובת מייל", "Email address"), a.value || "", { dir: "ltr", type: "email", ph: d.email || "name@example.com", hint: bsL("ריק — המייל של העסק (מתעדכן לבד).", "Empty — the business email (stays in sync).") });
    if (kind === "link") return bsxF.text("bsx-btn-value", bsL("כתובת הקישור", "Link address"), a.value || "", { dir: "ltr", ph: "https://", type: "url", hint: bsL("כתובת מלאה שמתחילה ב-https://", "A full address starting with https://") });
    return info.builtin ? `<p class="bsx-hint">${bsL("כרגע הכפתור מוביל לפי פרטי הקשר שלכם (וואטסאפ, מייל או טלפון).", "Right now the button follows your contact details (WhatsApp, email or phone).")}</p>` : "";
  };
  const parts = [
    bsxF.group(bsL("הטקסט על הכפתור", "Button text"), bsxF.text("bsx-btn-label", bsL("טקסט", "Text"), info.label, { max: 40 })),
    info.submit ? bsxF.group(bsL("מה קורה בלחיצה", "What happens on click"), `<p class="bsx-hint" style="margin:0">${bsL("הכפתור שולח את הטופס.", "The button sends the form.")}</p>`) : bsxF.group(bsL("מה קורה בלחיצה", "What happens on click"),
      bsxF.select("bsx-btn-type", bsL("סוג הפעולה", "Action"), [["", info.builtin ? bsL("לפי פרטי הקשר (אוטומטי)", "From contact details (automatic)") : bsL("בחרו…", "Choose…")], ["whatsapp", bsL("הודעת וואטסאפ", "WhatsApp message")], ["tel", bsL("שיחת טלפון", "Phone call")], ["email", bsL("שליחת מייל", "Send an email")], ["link", bsL("פתיחת קישור", "Open a link")], ["scroll", bsL("גלילה לחלק באתר", "Scroll to a section")]], kind)
      + valueField()
      + `<p class="bsx-hint">${bsL("בעורך הכפתור לא מגיב ללחיצה — כך אפשר לבחור ולערוך אותו. באתר החי הוא יעבוד.", "In the editor the button doesn't react to clicks, so you can select and edit it. On the live site it works.")}</p>`),
  ];
  if (info.canStyle || info.canSize || info.canRadius) {
    const st = info.style || {};
    const style = [];
    if (info.canStyle) {
      style.push(`<div class="bsx-field"><span class="bsx-label">${bsL("צבעים", "Colors")}</span><div class="bsx-row"><label class="bsx-row" style="gap:6px;font-size:13px"><input type="color" id="bsx-btn-bg" value="${bsxEsc(st.bg || bsxComputedBg(sel))}">${bsL("רקע", "Background")}</label><label class="bsx-row" style="gap:6px;font-size:13px"><input type="color" id="bsx-btn-color" value="${bsxEsc(st.color || (sel.el ? bsxRgbToHex(sel.el.ownerDocument.defaultView.getComputedStyle(sel.el).color) : "#ffffff"))}">${bsL("טקסט", "Text")}</label></div></div>`);
    }
    if (info.canSize) style.push(bsxF.seg("btn-size", bsL("גודל", "Size"), [["", bsL("רגיל", "Normal")], ["sm", bsL("קטן", "Small")], ["lg", bsL("גדול", "Large")]], st.size || ""));
    if (info.canRadius) style.push(bsxF.seg("btn-radius", bsL("פינות", "Corners"), [["", bsL("כמו בתבנית", "As designed")], ["0", bsL("ישרות", "Square")], ["10", bsL("מעוגלות", "Rounded")], ["999", bsL("כדור", "Pill")]], st.radius != null ? String(st.radius) : ""));
    if (Object.keys(st).length) style.push(`<button type="button" class="bsx-btn bsx-btn-block" id="bsx-btn-style-reset">${bsL("חזרה לעיצוב המקורי", "Back to the original style")}</button>`);
    parts.push(bsxF.group(bsL("עיצוב הכפתור", "Button style"), style.join("")));
  }
  return parts.join("");
}
function bsxWireButtonPanel(body) {
  const sel = bsxSel;
  const label = body.querySelector("#bsx-btn-label");
  if (label) bsxBindInput(label, (v) => bsxSetButtonLabelData(sel, v));
  const typeEl = body.querySelector("#bsx-btn-type");
  const setActionData = (a) => {
    const d = siteState.data;
    if (sel.secId) siteSectionSetField(d, sel.secId, sel.path + ".action", a);
    else { d.heroCta = Object.assign({}, d.heroCta); if (a) d.heroCta.action = a; else delete d.heroCta.action; bsxTidyHeroCta(); }
  };
  if (typeEl) typeEl.addEventListener("change", () => {
    const kind = typeEl.value;
    bsxButtonWrite(sel, (w) => w.setAction(kind ? { kind, value: "" } : null));
    bsxRefreshPanel(true);
  });
  const valEl = body.querySelector("#bsx-btn-value");
  if (valEl) bsxBindInput(valEl, (v) => setActionData({ kind: typeEl.value, value: v.trim() }), { delay: 300 });
  const target = body.querySelector("#bsx-btn-target");
  if (target) target.addEventListener("change", () => bsxButtonWrite(sel, (w) => w.setAction({ kind: "scroll", value: target.value })));
  [["#bsx-btn-bg", "bg"], ["#bsx-btn-color", "color"]].forEach(([id, prop]) => {
    const el = body.querySelector(id);
    if (!el) return;
    el.addEventListener("focus", () => bshellBeginEdit(el));
    el.addEventListener("blur", () => bshellEndEdit(el));
    el.addEventListener("input", () => {
      const d = siteState.data;
      const v = el.value.toUpperCase();
      if (sel.secId) bsxStyleWrite(sel.secId, sel.path, prop, v);
      else {
        d.heroCta = Object.assign({}, d.heroCta);
        d.heroCta.style = Object.assign({}, d.heroCta.style, { [prop]: v });
      }
      bshellScheduleSave();
      bshellRenderCanvas(() => bsxRenderElTools());
    });
  });
  const seg = (name, prop) => {
    const s = body.querySelector(`[data-seg="${name}"]`);
    if (s) s.addEventListener("click", (e) => { const b = e.target.closest("[data-val]"); if (b) bsxSetButtonStyle(sel, prop, b.dataset.val); });
  };
  seg("btn-size", "size");
  seg("btn-radius", "radius");
  const reset = body.querySelector("#bsx-btn-style-reset");
  if (reset) reset.addEventListener("click", () => bsxButtonWrite(sel, (w) => { ["bg", "color", "size", "radius"].forEach((p) => w.setStyle(p, "")); }));
}

/* ----- images ----- */
function bsxImageStyleFields(info) {
  const out = [];
  if (info.canStyle) out.push(bsxF.seg("img-fit", bsL("התאמה למסגרת", "Fit in the frame"), [["", bsL("מילוי המסגרת", "Fill the frame")], ["contain", bsL("תמונה מלאה", "Whole image")]], info.fit || ""));
  if (info.canRatio) {
    const opts = info.ratioOptions
      ? [["", bsL("לפי התמונה", "As the photo")], ["1:1", bsL("ריבוע 1:1", "Square 1:1")], ["4:3", "4:3"], ["16:9", bsL("רחב 16:9", "Wide 16:9")]]
      : [["", bsL("כמו בתבנית", "As designed")], ["1/1", bsL("ריבוע 1:1", "Square 1:1")], ["4/3", "4:3"], ["3/2", "3:2"], ["16/9", bsL("רחב 16:9", "Wide 16:9")], ["3/4", bsL("לאורך 3:4", "Portrait 3:4")]];
    out.push(bsxF.select("bsx-img-ratio", bsL("יחס גובה-רוחב", "Aspect ratio"), opts, info.ratio === "auto" ? "" : info.ratio || ""));
  }
  if (info.canFocal) {
    const cur = info.focal || "50% 50%";
    const cells = [["0% 0%", "↖"], ["50% 0%", "↑"], ["100% 0%", "↗"], ["0% 50%", "←"], ["50% 50%", "•"], ["100% 50%", "→"], ["0% 100%", "↙"], ["50% 100%", "↓"], ["100% 100%", "↘"]];
    out.push(`<div class="bsx-field"><span class="bsx-label" id="bsx-focal-l">${bsL("מה חשוב בתמונה (נקודת מיקוד)", "What matters in the photo (focal point)")}</span><div class="bsx-focal" role="radiogroup" aria-labelledby="bsx-focal-l" style="background-image:url('${bsxEsc(info.src)}')">${cells.map(([v, a]) => `<button type="button" role="radio" aria-checked="${v === cur}" class="${v === cur ? "is-on" : ""}" data-focal="${v}" aria-label="${a}"></button>`).join("")}</div><p class="bsx-hint">${bsL("כשהתמונה נחתכת, החלק הזה יישאר בתמונה.", "When the photo is cropped, this part stays in view.")}</p></div>`);
  }
  return out.join("");
}
function bsxImagePanelHtml(sel) {
  if (!sel.secId) return bsxHeroImagesHtml(sel);
  const info = bsxImageInfo(sel);
  return bsxF.group("", `<div class="bsx-field"><div style="border-radius:10px;overflow:hidden;border:1px solid var(--bsx-line);background:#F8FAFC;aspect-ratio:16/10">${info.src ? `<img src="${bsxEsc(info.src)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : `<div class="bsx-empty">${bsL("אין תמונה", "No image")}</div>`}</div></div>
      <div class="bsx-row"><button type="button" class="bsx-btn bsx-btn-primary bsx-grow" id="bsx-img-upload">${bsxIcon("upload")}${bsL("העלאת תמונה", "Upload image")}</button><button type="button" class="bsx-btn" id="bsx-img-lib">${bsxIcon("gallery")}${bsL("מהאתר", "From site")}</button></div>`)
    + (info.canStyle || info.canRatio || info.canFocal ? bsxF.group(bsL("תצוגה", "Display"), bsxImageStyleFields(info)) : "")
    + (info.canAlt ? bsxF.group(bsL("תיאור התמונה", "Image description"), bsxF.text("bsx-img-alt", bsL("תיאור (לא חובה)", "Description (optional)"), info.alt, { max: 125, hint: bsL("נקרא בקול לגולשים עיוורים ועוזר לגוגל להבין את התמונה.", "Read aloud to blind visitors and helps Google understand the image.") })) : "")
    + `<button type="button" class="bsx-btn bsx-btn-danger bsx-btn-block" id="bsx-img-remove">${bsxIcon("trash")}${bsL("הסרת התמונה", "Remove the image")}</button>`;
}
function bsxWireImagePanel(body) {
  const sel = bsxSel;
  if (!sel.secId) return bsxWireHeroImages(body, sel);
  const up = body.querySelector("#bsx-img-upload");
  if (up) up.addEventListener("click", () => bsxPickAndUpload(sel));
  const lib = body.querySelector("#bsx-img-lib");
  if (lib) lib.addEventListener("click", () => bsxLibraryPopover(lib, sel));
  bsxWireImageStyle(body, sel);
  const alt = body.querySelector("#bsx-img-alt");
  if (alt) bsxBindInput(alt, (v) => bsxSetImageAlt(sel, v), { noRender: false, delay: 300 });
  const rm = body.querySelector("#bsx-img-remove");
  if (rm) rm.addEventListener("click", () => bsxRemoveImage(sel));
}
function bsxWireImageStyle(body, sel) {
  const fit = body.querySelector('[data-seg="img-fit"]');
  if (fit) fit.addEventListener("click", (e) => { const b = e.target.closest("[data-val]"); if (b) bsxSetImageStyle(sel, "fit", b.dataset.val); });
  const ratio = body.querySelector("#bsx-img-ratio");
  if (ratio) ratio.addEventListener("change", () => bsxSetImageStyle(sel, "ratio", ratio.value));
  const focal = body.querySelector(".bsx-focal");
  if (focal) focal.addEventListener("click", (e) => { const b = e.target.closest("[data-focal]"); if (b) bsxSetImageStyle(sel, "focal", b.dataset.focal === "50% 50%" ? "" : b.dataset.focal); });
}
/* The hero's photo(s): one main image, or a rotating gallery. */
function bsxHeroImagesHtml(sel) {
  const d = siteState.data;
  const max = typeof SITE_GALLERY_MAX === "number" ? SITE_GALLERY_MAX : 5;
  const gallery = d.heroImages || [];
  const selSrc = sel ? bsxImageInfo(sel).src : "";
  const info = bsxImageInfo(sel || { img: "hero" });
  if (sel && sel.img === "logo") {
    return bsxF.group("", `<div class="bsx-row"><button type="button" class="bsx-btn bsx-btn-primary bsx-grow" id="bsx-img-upload">${bsxIcon("upload")}${bsL("החלפת הלוגו", "Replace the logo")}</button><button type="button" class="bsx-btn" id="bsx-img-lib">${bsxIcon("gallery")}${bsL("מהאתר", "From site")}</button></div>`)
      + `<button type="button" class="bsx-btn bsx-btn-danger bsx-btn-block" id="bsx-img-remove">${bsxIcon("trash")}${bsL("הסרת הלוגו", "Remove the logo")}</button>`;
  }
  const main = `<div class="bsx-field"><span class="bsx-label">${bsL("תמונה ראשית", "Main image")}</span>
      <div class="bsx-row"><div style="width:84px;height:64px;border-radius:9px;overflow:hidden;background:#F1F5F9;flex:none;border:2px solid ${selSrc && selSrc === d.heroImage ? "var(--bsx-accent)" : "transparent"}">${d.heroImage ? `<img src="${bsxEsc(d.heroImage)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : ""}</div>
      <div style="display:grid;gap:6px" class="bsx-grow"><button type="button" class="bsx-btn" id="bsx-hero-upload">${bsxIcon("upload")}${d.heroImage ? bsL("החלפה", "Replace") : bsL("העלאה", "Upload")}</button>${d.heroImage ? `<button type="button" class="bsx-btn bsx-btn-ghost bsx-btn-danger" id="bsx-hero-remove">${bsxIcon("trash")}${bsL("הסרה", "Remove")}</button>` : ""}</div></div>
      ${gallery.length ? `<p class="bsx-hint">${bsL("יש תמונות בגלריה, ולכן הן מוצגות במקום התמונה הראשית.", "The gallery has images, so they show instead of the main image.")}</p>` : ""}</div>`;
  const gal = `<div class="bsx-field"><span class="bsx-label">${bsL(`גלריה מתחלפת (עד ${max})`, `Rotating gallery (up to ${max})`)}</span>
      ${gallery.length ? `<div class="bsx-thumb-grid" id="bsx-gal">${gallery.map((src, i) => `<div class="bsx-thumb${src === selSrc ? " is-on" : ""}" data-gi="${i}"><img src="${bsxEsc(src)}" alt="${bsxEsc(bsL(`תמונה ${i + 1} בגלריה`, `Gallery image ${i + 1}`))}"><button type="button" class="bsx-thumb-x" data-gal-remove="${i}" aria-label="${bsxEsc(bsL("הסרה", "Remove"))}">${bsxIcon("close")}</button></div>`).join("")}</div>` : `<p class="bsx-hint" style="margin-top:0">${bsL("שתי תמונות או יותר מתחלפות לאט בפתיח.", "Two or more images rotate slowly in the hero.")}</p>`}
      ${gallery.length < max ? `<button type="button" class="bsx-btn bsx-btn-block" id="bsx-gal-add" style="margin-top:8px">${bsxIcon("plus")}${bsL("הוספת תמונות לגלריה", "Add images to the gallery")}</button>` : ""}</div>`;
  const display = (info.canStyle || info.canRatio || info.canFocal) && (d.heroImage || gallery.length) ? bsxF.group(bsL("תצוגה", "Display"), bsxImageStyleFields(Object.assign({}, info, { src: info.src || d.heroImage || gallery[0] || "" }))) : "";
  const alt = bsxF.group(bsL("תיאור התמונה", "Image description"), bsxF.text("bshell-set-hero-alt", bsL("תיאור התמונה הראשית (לא חובה)", "Main image description (optional)"), d.heroAlt || "", { max: 125, ph: bsL("לדוגמה: הצוות שלנו בסטודיו", "e.g. Our team at the studio"), hint: bsL("נקרא בקול לגולשים עיוורים ועוזר לגוגל להבין את התמונה. ריק — ישמש שם העסק.", "Read aloud to blind visitors and helps Google understand the photo. Empty — your business name is used.") }));
  return bsxF.group("", main + gal) + display + alt;
}
function bsxWireHeroImages(body, sel) {
  const d = () => siteState.data;
  const max = typeof SITE_GALLERY_MAX === "number" ? SITE_GALLERY_MAX : 5;
  if (sel && sel.img === "logo") {
    const up = body.querySelector("#bsx-img-upload"); if (up) up.addEventListener("click", () => bsxPickAndUpload(sel));
    const lib = body.querySelector("#bsx-img-lib"); if (lib) lib.addEventListener("click", () => bsxLibraryPopover(lib, sel));
    const rm = body.querySelector("#bsx-img-remove"); if (rm) rm.addEventListener("click", () => bsxRemoveImage(sel));
    return;
  }
  const heroUp = body.querySelector("#bsx-hero-upload");
  if (heroUp) heroUp.addEventListener("click", () => bsxPickAndUpload({ img: "hero" }));
  const heroRm = body.querySelector("#bsx-hero-remove");
  if (heroRm) heroRm.addEventListener("click", () => bsxRemoveImage({ img: "hero" }));
  const gal = body.querySelector("#bsx-gal");
  if (gal) gal.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-gal-remove]");
    if (rm) { bsxRemoveImage({ img: "gallery." + rm.dataset.galRemove }); return; }
  });
  const add = body.querySelector("#bsx-gal-add");
  if (add) add.addEventListener("click", async () => {
    const files = await bsxPickFile(true);
    if (!files.length) return;
    const room = max - (d().heroImages || []).length;
    if (room <= 0) { bsxToast(bsL(`אפשר עד ${max} תמונות בגלריה — הסירו אחת כדי להוסיף חדשה.`, `The gallery holds up to ${max} images — remove one to add a new one.`), { error: true }); return; }
    const pick = files.slice(0, room);
    if (files.length > pick.length) bsxToast(bsL(`נוספו רק ${pick.length} מתוך ${files.length} — הגלריה מלאה.`, `Only ${pick.length} of ${files.length} were added — the gallery is full.`));
    const toast = bsxToast(bsL("מעלים תמונות…", "Uploading images…"), { ms: 120000 });
    const urls = [];
    for (const f of pick) {
      const url = await bsxUploadOne(f, "gallery-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
      if (url) urls.push(url);
    }
    if (toast) toast.remove();
    if (!urls.length) return;
    bsxCommitEdit();
    bshellSnapshot();
    d().heroImages = (d().heroImages || []).concat(urls).slice(0, max);
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxRefreshPanel(true));
  });
  const imgSel = sel || { img: "hero" };
  bsxWireImageStyle(body, imgSel);
  const alt = body.querySelector("#bshell-set-hero-alt");
  if (alt) bsxBindInput(alt, (v) => { if (v.trim()) d().heroAlt = v; else delete d().heroAlt; }, { noRender: true });
}

/* ----- video ----- */
function bsxVideoTarget() {
  const sel = bsxSel;
  if (sel && sel.kind === "section" && bsxIsCustom(sel.secKey)) {
    const s = bsxSecData(sel.secKey);
    if (s && s.type === "video") return { secId: bsxCustomId(sel.secKey) };
  }
  return { builtin: true };
}
function bsxVideoPanelHtml() {
  const d = siteState.data;
  const t = bsxVideoTarget();
  const url = t.builtin ? d.videoUrl || "" : String((typeof siteSectionGetField === "function" && siteSectionGetField(d, t.secId, "url")) || "");
  const src = typeof videoEmbedSrc === "function" ? videoEmbedSrc(url) : null;
  return bsxF.group("", bsxF.text(t.builtin ? "bshell-set-video" : "bsx-video-url", bsL("קישור לסרטון ביוטיוב או בווימאו", "YouTube or Vimeo link"), url, { dir: "ltr", ph: "https://youtube.com/watch?v=…", type: "url",
      hint: url && !src ? `<span style="color:#B45309">${bsL("הקישור לא נראה כמו סרטון ביוטיוב או בווימאו.", "That link doesn't look like a YouTube or Vimeo video.")}</span>` : bsL("מעתיקים את הקישור מהדפדפן ומדביקים כאן.", "Copy the link from your browser and paste it here.") })
    + `<div class="bsx-field" id="bsx-video-prev">${bsxVideoPreviewHtml(src)}</div>`)
    + (t.builtin ? bsxF.group(bsL("הצגה", "Display"), bsxF.toggle("bshell-set-video-bg", bsL("להציג את הסרטון כרקע לפתיח (בלי קול)", "Play the video behind the hero (muted)"), !!d.heroVideoBg)) : "")
    + (url ? `<button type="button" class="bsx-btn bsx-btn-danger bsx-btn-block" id="bsx-video-remove">${bsxIcon("trash")}${bsL("הסרת הסרטון", "Remove the video")}</button>` : "");
}
function bsxVideoPreviewHtml(src) {
  return src ? `<div style="position:relative;padding-bottom:56.25%;border-radius:10px;overflow:hidden;background:#0F172A"><iframe src="${bsxEsc(src)}" title="${bsxEsc(bsL("תצוגה מקדימה של הסרטון", "Video preview"))}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>` : "";
}
function bsxWireVideoPanel(body) {
  const t = bsxVideoTarget();
  const d = () => siteState.data;
  const input = body.querySelector(t.builtin ? "#bshell-set-video" : "#bsx-video-url");
  let shown = null;
  bsxBindInput(input, (v) => {
    if (t.builtin) d().videoUrl = v.trim();
    else siteSectionSetField(d(), t.secId, "url", v.trim());
    const src = typeof videoEmbedSrc === "function" ? videoEmbedSrc(v) : null;
    const box = body.querySelector("#bsx-video-prev");
    if (box && src !== shown) { shown = src; box.innerHTML = bsxVideoPreviewHtml(src); }
  }, { delay: 450, onBlur: () => bsxRefreshPanel(true) });
  bsxBindChange(body.querySelector("#bshell-set-video-bg"), (v) => { d().heroVideoBg = !!v; });
  const rm = body.querySelector("#bsx-video-remove");
  if (rm) rm.addEventListener("click", () => {
    if (t.builtin) { bsxRemoveBuiltinVideo(); bsxRefreshPanel(true); return; }
    bsxCommitEdit(); bshellSnapshot();
    siteSectionSetField(d(), t.secId, "url", "");
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxRefreshPanel(true));
  });
}

/* ----- section ----- */
function bsxSectionPanelHtml(key) {
  if (!key) return null;
  if (key.indexOf("site:") === 0) return bsxChromePanelHtml(siteState.data);
  if (key === "video") return bsxVideoPanelHtml();
  const d = siteState.data;
  const custom = bsxIsCustom(key);
  const vis = bsxMap.keys;
  const i = vis.indexOf(key);
  const parts = [];
  const variants = bsxVariantChoices(key);
  const pos = `<div class="bsx-row" style="flex-wrap:wrap">
      <button type="button" class="bsx-btn" data-secp="up"${i <= 0 ? " disabled" : ""}>${bsxIcon("up")}${bsL("למעלה", "Up")}</button>
      <button type="button" class="bsx-btn" data-secp="down"${i < 0 || i >= vis.length - 1 ? " disabled" : ""}>${bsxIcon("down")}${bsL("למטה", "Down")}</button>
      ${custom && typeof siteSectionDuplicate === "function" ? `<button type="button" class="bsx-btn" data-secp="duplicate">${bsxIcon("copy")}${bsL("שכפול", "Duplicate")}</button>` : ""}
    </div>`;
  if (variants.length > 1) {
    const cur = custom ? (bsxSecData(key) || {}).variant : ((d.blockVariants && d.blockVariants[key]) || "default");
    parts.push(bsxF.group(bsL("עיצוב החלק", "Section design"), `<button type="button" class="bsx-btn bsx-btn-block" data-secp="variant">${bsxIcon("palette")}${bsL("בחירת עיצוב אחר", "Pick another design")}</button><p class="bsx-hint">${bsL("עכשיו: ", "Now: ")}${bsxEsc(bsxVariantLabel(key, cur))}. ${bsL("התוכן נשאר כמו שהוא.", "Your content stays as it is.")}</p>`));
  }
  if (custom) {
    const s = bsxSecData(key);
    if (s && s.type === "leadForm") parts.push(bsxLeadFormSettingsHtml(key));
    else if (s && s.type === "video") parts.push(bsxF.group(bsL("הסרטון", "The video"), bsxF.text("bsx-video-url", bsL("קישור לסרטון ביוטיוב או בווימאו", "YouTube or Vimeo link"), String(siteSectionGetField(d, bsxCustomId(key), "url") || ""), { dir: "ltr", ph: "https://youtube.com/watch?v=…", type: "url" })));
    else parts.push(`<p class="bsx-hint" style="margin:0 0 16px">${bsL("כדי לערוך טקסט, תמונה או כפתור — לוחצים עליהם ישירות באתר.", "To edit a text, image or button — click it right on the site.")}</p>`);
  } else {
    if (key === "hero") parts.push(bsxF.group(bsL("בפתיח", "In the hero"), bsxF.toggle("bshell-prop-bsd", bsL("הצגת בס\"ד בראש האתר", "Show בס\"ד at the top of the site"), !!d.showBsd) + `<button type="button" class="bsx-btn bsx-btn-block" data-secp="images">${bsxIcon("image")}${bsL("תמונות הפתיח", "Hero images")}</button>`));
    const def = (SITE_BLOCK_DEFS[siteState.template] || {})[key];
    if (def && def.hasItems) {
      const named = bsxSvcNamedIdx();
      const word = bshellItemWord();
      parts.push(bsxF.group(bsxCap(word[1]), `<div class="bsx-list">${named.map((ri, n) => `<div class="bsx-list-row"><button type="button" class="bsx-list-name" data-secp-item="${n}">${bsxEsc(d.services[ri].name)}</button></div>`).join("") || `<p class="bsx-hint">${bsL("עדיין אין — מוצגות דוגמאות.", "None yet — examples are shown.")}</p>`}</div>
        <button type="button" class="bsx-btn bsx-btn-block" data-secp="add-item" style="margin-top:8px">${bsxIcon("plus")}${bsL(`הוספת ${word[0]}`, `Add ${word[0].toLowerCase()}`)}</button>
        <button type="button" class="bsx-btn bsx-btn-ghost bsx-btn-block" data-secp="item-style" style="margin-top:4px">${bsxIcon("sliders")}${bsL(`עיצוב כל ה${word[1]}`, `Style all ${word[1]}`)}</button>`));
    }
  }
  parts.push(bsxF.group(bsL("מיקום", "Position"), pos));
  if (custom) parts.push(`<button type="button" class="bsx-btn bsx-btn-danger bsx-btn-block" data-secp="delete">${bsxIcon("trash")}${bsL("מחיקת החלק", "Delete section")}</button>`);
  else parts.push(`<button type="button" class="bsx-btn bsx-btn-block" data-secp="hide">${bsxIcon("eyeOff")}${bsL("הסתרת החלק", "Hide section")}</button><p class="bsx-hint">${bsL("חלק מוסתר נשאר שמור ואפשר להחזיר אותו ממבנה האתר.", "A hidden section stays saved — bring it back from Site structure.")}</p>`);
  return parts.join("");
}
function bsxVariantLabel(key, v) {
  if (bsxIsCustom(key)) {
    const s = bsxSecData(key);
    const e = s && bsxLibEntry(s.type);
    return e && e.variants && e.variants[v] ? bsxLoc(e.variants[v].label) : String(v || "");
  }
  const o = typeof variantOptionsFor === "function" ? variantOptionsFor(siteState.template, key) : null;
  return o && o[v] ? bsLabel(o[v].label) : String(v || "");
}
function bsxWireSectionPanel(body) {
  const sel = bsxSel;
  if (!sel) return;
  const key = sel.secKey;
  if (key === "video") return bsxWireVideoPanel(body);
  if (key.indexOf("site:") === 0) return bsxWireChromePanel(body);
  body.addEventListener("click", (e) => {
    const it = e.target.closest("[data-secp-item]");
    if (it) { bsxSelectItemByShown(parseInt(it.dataset.secpItem, 10), "name"); return; }
    const b = e.target.closest("[data-secp]");
    if (!b || b.disabled) return;
    const a = b.dataset.secp;
    if (a === "images") return bsxOpenPanel("heroimages");
    if (a === "add-item") { const named = bsxSvcNamedIdx(); bsxItemAction({ svc: Math.max(0, named.length - 1) }, "add"); return; }
    if (a === "item-style") return bsxOpenPanel("itemstyle");
    bsxSectionAction(key, a);
  });
  bsxBindChange(body.querySelector("#bshell-prop-bsd"), (v) => { siteState.data.showBsd = !!v; }, () => { if (typeof bsxRenderDock === "function") bsxRenderDock(); });
  const vurl = body.querySelector("#bsx-video-url");
  if (vurl) bsxBindInput(vurl, (v) => siteSectionSetField(siteState.data, bsxCustomId(key), "url", v.trim()), { delay: 450 });
  bsxWireLeadFormSettings(body, key);
}

/* ----- lead form (a library "leadForm" section) ----- */
const BSX_FORM_FIELDS = [["phone", bsL("טלפון", "Phone")], ["email", bsL("מייל", "Email")], ["message", bsL("הודעה", "Message")]];
function bsxLeadFormSettingsHtml(key) {
  const id = bsxCustomId(key);
  const g = (p) => { const v = siteSectionGetField(siteState.data, id, p); return v == null ? "" : v; };
  const fields = typeof siteSectionLeadFields === "function" ? siteSectionLeadFields(g("fields")) : (g("fields") || {});
  return bsxF.group(bsL("טופס יצירת קשר", "Contact form"),
    bsxF.text("bsx-form-title", bsL("כותרת", "Title"), String(g("title")), { max: 80 })
    + bsxF.text("bsx-form-subtitle", bsL("שורת הסבר", "Subtitle"), String(g("subtitle")), { max: 160 })
    + `<div class="bsx-field"><span class="bsx-label">${bsL("שדות בטופס", "Form fields")}</span>
      <div class="bsx-row" style="margin-bottom:6px"><span class="bsx-grow" style="font-size:13.5px">${bsL("שם", "Name")}</span><span class="bsx-tag">${bsL("תמיד חובה", "Always required")}</span></div>
      ${BSX_FORM_FIELDS.map(([f, l]) => {
      const v = String(fields[f] || "off");
      return `<div class="bsx-row" style="margin-bottom:6px"><span class="bsx-grow" style="font-size:13.5px">${bsxEsc(l)}</span><select data-form-field="${f}" style="width:130px" aria-label="${bsxEsc(l)}">${[["required", bsL("חובה", "Required")], ["optional", bsL("רשות", "Optional")], ["off", bsL("לא מוצג", "Hidden")]].map(([o, ol]) => `<option value="${o}"${o === v ? " selected" : ""}>${ol}</option>`).join("")}</select></div>`;
    }).join("")}<p class="bsx-hint">${bsL("צריך לפחות טלפון או מייל, כדי שתוכלו לחזור לפונים.", "At least a phone or an email is needed, so you can get back to people.")}</p></div>`
    + bsxF.text("bsx-form-button", bsL("טקסט הכפתור", "Button text"), String(g("buttonLabel")), { max: 40 })
    + bsxF.text("bsx-form-success", bsL("הודעה אחרי שליחה", "Message after sending"), String(g("successText")), { max: 200, multiline: true, rows: 2 })
    + `<p class="bsx-hint">${bsL("הפניות מגיעות אליכם. בעורך הטופס לא נשלח.", "Enquiries come to you. In the editor the form isn't sent.")}</p>`);
}
function bsxWireLeadFormSettings(body, key) {
  if (!body.querySelector("#bsx-form-title")) return;
  const id = bsxCustomId(key);
  const set = (p) => (v) => siteSectionSetField(siteState.data, id, p, v);
  bsxBindInput(body.querySelector("#bsx-form-title"), set("title"));
  bsxBindInput(body.querySelector("#bsx-form-subtitle"), set("subtitle"));
  bsxBindInput(body.querySelector("#bsx-form-button"), set("buttonLabel"));
  bsxBindInput(body.querySelector("#bsx-form-success"), set("successText"), { noRender: true });
  body.querySelectorAll("[data-form-field]").forEach((sl) => bsxBindChange(sl, (v) => {
    const d = siteState.data;
    const cur = Object.assign({}, siteSectionGetField(d, id, "fields") || {});
    cur[sl.dataset.formField] = v;
    siteSectionSetField(d, id, "fields", typeof siteSectionLeadFields === "function" ? siteSectionLeadFields(cur) : cur);
  }, () => bsxRefreshPanel(true)));
}

/* ----- header & footer ----- */
function bsxChromePanelHtml(d) {
  return bsxF.group(bsL("ראש ותחתית האתר", "Site header & footer"),
    bsxF.text("bsx-chrome-name", bsL("שם העסק", "Business name"), d.businessName || "", { max: 60, hint: bsL("מופיע בראש האתר, בפתיח ובתחתית.", "Shown in the header, the hero and the footer.") })
    + bsxF.toggle("bshell-prop-hide-copyright", bsL("הסתרת שורת זכויות היוצרים בתחתית", "Hide the copyright line at the bottom"), !!d.hideCopyright)
    + bsxF.toggle("bsx-chrome-bsd", bsL("הצגת בס\"ד בראש האתר", "Show בס\"ד at the top of the site"), !!d.showBsd));
}
function bsxWireChromePanel(body) {
  bsxBindInput(body.querySelector("#bsx-chrome-name"), (v) => { siteState.data.businessName = v; bsxUpdateTopName(); });
  bsxBindChange(body.querySelector("#bshell-prop-hide-copyright"), (v) => { siteState.data.hideCopyright = !!v; });
  bsxBindChange(body.querySelector("#bsx-chrome-bsd"), (v) => { siteState.data.showBsd = !!v; }, () => bsxRenderDock());
}

/* ----- the services' group styles (one style for all names / all descriptions) ----- */
function bsxItemStyleHtml() {
  const d = siteState.data;
  const word = bshellItemWord();
  const group = (key, label, sizes) => {
    const s = (d.textStyles && d.textStyles[key]) || {};
    const sz = sizes.slice();
    if (s.size && sz.indexOf(Number(s.size)) === -1) sz.push(Number(s.size));
    sz.sort((a, b) => a - b);
    return bsxF.group(label, `<div class="bshell-style-group" data-style-key="${key}">
      ${bsxF.select("bsx-gs-font-" + key, bsL("גופן", "Font"), bsxFontOptions(bsL("גופן התבנית", "Template font")), s.font || "")}
      <div class="bsx-field"><span class="bsx-label">${bsL("צבע וגודל", "Color and size")}</span><div class="bsx-row"><input type="color" data-style-prop="color" value="${bsxEsc(s.color ? "#" + String(s.color).replace("#", "") : bshellCurrentGroupColor(key))}" aria-label="${bsL("צבע", "Color")}"><select data-style-prop="size" class="bsx-grow" aria-label="${bsL("גודל", "Size")}"><option value="">${bsL("גודל רגיל", "Normal size")}</option>${sz.map((n) => `<option value="${n}"${String(s.size) === String(n) ? " selected" : ""}>${n}px</option>`).join("")}</select></div></div>
      ${(s.font || s.color || s.size) ? `<button type="button" class="bsx-btn bsx-btn-ghost" data-style-reset>${bsxIcon("undo")}${bsL("ברירת מחדל", "Default")}</button>` : ""}
    </div>`);
  };
  return `<p class="bsx-hint" style="margin:0 0 14px">${bsL(`העיצוב חל על כל ה${word[1]} יחד, כדי שהאתר יישאר אחיד.`, `The style applies to all ${word[1]} together, so the site stays consistent.`)}</p>`
    + group("svc-name", bsL(`שמות ה${word[1]}`, `Names of the ${word[1]}`), BSHELL_STYLE_SIZES.name)
    + group("svc-desc", bsL(`תיאורי ה${word[1]}`, `Descriptions of the ${word[1]}`), BSHELL_STYLE_SIZES.body);
}
function bshellCurrentGroupColor(key) {
  const doc = bsxDoc();
  const el = doc && typeof SITE_GROUP_STYLE_SELECTORS === "object" ? doc.querySelector(`:is(${SITE_GROUP_STYLE_SELECTORS[key]})`) : null;
  return el ? bsxRgbToHex(doc.defaultView.getComputedStyle(el).color) : "#000000";
}
function bsxWireItemStyle(body) {
  body.querySelectorAll("[data-style-key]").forEach((g) => {
    const key = g.dataset.styleKey;
    const font = g.querySelector("select[id^='bsx-gs-font-']");
    if (font) font.addEventListener("change", () => { bshellSnapshot(); bshellSetTextStyle(key, "font", font.value); bshellScheduleSave(); bshellRenderCanvas(() => bsxRefreshPanel(true)); });
    const size = g.querySelector('[data-style-prop="size"]');
    if (size) size.addEventListener("change", () => { bshellSnapshot(); bshellSetTextStyle(key, "size", size.value); bshellScheduleSave(); bshellRenderCanvas(() => bsxRefreshPanel(true)); });
    const color = g.querySelector('[data-style-prop="color"]');
    if (color) {
      color.addEventListener("focus", () => bshellBeginEdit(color));
      color.addEventListener("blur", () => bshellEndEdit(color));
      color.addEventListener("input", () => { bshellSetTextStyle(key, "color", color.value.replace("#", "")); bshellScheduleSave(); bshellRenderCanvas(); });
    }
    const reset = g.querySelector("[data-style-reset]");
    if (reset) reset.addEventListener("click", () => { bshellSnapshot(); delete (siteState.data.textStyles || {})[key]; bshellScheduleSave(); bshellRenderCanvas(() => bsxRefreshPanel(true)); });
  });
}

/* ----- site design ----- */
const BSX_PRESET_COLORS = ["#0F766E", "#15803D", "#2563EB", "#1E3A8A", "#7C3AED", "#BE185D", "#DC2626", "#C2410C", "#B8860B", "#1F2937"];
function bsxDesignPanelHtml(d) {
  const caps = bsxCaps();
  const primary = /^#?[0-9a-f]{6}$/i.test(String(d.primaryColor || "")) ? "#" + String(d.primaryColor).replace("#", "") : "#1F5C4E";
  let strip = "";
  try {
    const pal = derivePalette(primary);
    strip = `<div class="bsx-palette-strip" aria-hidden="true">${["primaryDark", "primary", "headerAccentText", "ice"].map((k) => `<span style="background:#${pal[k]}"></span>`).join("")}</div><p class="bsx-hint">${bsL("הגוונים המשלימים נגזרים אוטומטית מהצבע הראשי.", "The matching shades are derived automatically from the main colour.")}</p>`;
  } catch (e) { strip = ""; }
  const ds = (d.design && typeof d.design === "object") ? d.design : {};
  const parts = [
    bsxF.group(bsL("סגנון", "Style"), bshellMoodPickerHtml(d)),
    bsxF.group(bsL("צבעים", "Colours"), `<div class="bsx-field"><span class="bsx-label">${bsL("צבע ראשי", "Main colour")}</span><div class="bsx-row"><input type="color" id="bshell-set-color" value="${bsxEsc(primary)}" aria-label="${bsL("צבע ראשי", "Main colour")}"><div class="bsx-swatches bsx-grow" id="bsx-preset-colors">${BSX_PRESET_COLORS.map((c) => `<button type="button" class="bsx-swatch${c.toLowerCase() === primary.toLowerCase() ? " is-on" : ""}" style="background:${c}" data-preset="${c}" title="${c}" aria-label="${c}"></button>`).join("")}</div></div></div>${strip}<p class="bsx-hint">${bsL("צבעים שבחרתם לטקסטים בודדים נשארים.", "Colours you picked for single texts stay.")}</p>`),
    bsxF.group(bsL("גופנים", "Fonts"),
      bsxF.select("bshell-set-font", bsL("גופן הטקסט", "Body font"), bsxFontOptions(), d.fontFamily || "heebo", bsL("כל הגופנים תומכים בעברית ובאנגלית.", "All fonts support Hebrew and English."))
      + (caps.design ? bsxF.select("bsx-design-heading", bsL("גופן הכותרות", "Heading font"), bsxFontOptions(bsL("כמו בתבנית", "As designed")), ds.headingFont || "") : "")),
  ];
  if (caps.design) {
    parts.push(bsxF.group(bsL("כפתורים ורקע", "Buttons & background"),
      bsxF.seg("design-btn-radius", bsL("פינות הכפתורים", "Button corners"), [["", bsL("כמו בתבנית", "As designed")], ["sharp", bsL("ישרות", "Square")], ["soft", bsL("מעוגלות", "Rounded")], ["pill", bsL("כדור", "Pill")]], ds.buttonRadius || "")
      + bsxF.seg("design-btn-fill", bsL("מילוי הכפתורים", "Button fill"), [["", bsL("כמו בתבנית", "As designed")], ["solid", bsL("מלא", "Solid")], ["outline", bsL("מסגרת", "Outline")]], ds.buttonFill || "")
      + (typeof siteDesignSupports !== "function" || siteDesignSupports(siteState.template, "bgTone")
        ? bsxF.seg("design-bg", bsL("גוון הרקע", "Background tone"), [["", bsL("כמו בתבנית", "As designed")], ["white", bsL("לבן", "White")], ["warm", bsL("חמים", "Warm")], ["cool", bsL("קריר", "Cool")]], ds.bgTone || "")
        : `<p class="bsx-hint">${bsL("לתבנית הכהה הזו יש רקע משלה, ולכן אין כאן בחירת גוון רקע.", "This dark design has its own background, so there's no background tone to pick.")}</p>`)));
  }
  return parts.join("");
}
function bsxWireDesignPanel(body) {
  const d = () => siteState.data;
  body.querySelectorAll(".bshell-mood-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.mood || "";
      if ((d().mood || "") === key) return;
      bsxCommitEdit();
      bshellSnapshot();
      bshellApplyMood(d(), key);
      bshellScheduleSave();
      bsxRefreshPanel(true);
      bshellRenderCanvas(() => bsxRenderElTools());
    });
  });
  const restore = body.querySelector("#bshell-mood-restore");
  if (restore) restore.addEventListener("click", () => {
    bsxCommitEdit();
    bshellSnapshot();
    if (!bshellRestorePrevDesign(d())) { bshellUndoStack.pop(); bshellSyncUndoButtons(); return; }
    bshellScheduleSave();
    bsxRefreshPanel(true);
    bshellRenderCanvas(() => bsxRenderElTools());
  });
  const color = body.querySelector("#bshell-set-color");
  if (color) {
    color.addEventListener("focus", () => bshellBeginEdit(color));
    color.addEventListener("change", () => bshellEndEdit(color));
    color.addEventListener("blur", () => bshellEndEdit(color));
    color.addEventListener("input", () => { d().primaryColor = color.value; bshellScheduleSave(); bshellRenderCanvas(); });
  }
  const presets = body.querySelector("#bsx-preset-colors");
  if (presets) presets.addEventListener("click", (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b) return;
    bshellSnapshot();
    d().primaryColor = b.dataset.preset;
    bshellScheduleSave();
    bshellRenderCanvas(() => bsxRefreshPanel(true));
  });
  bsxBindChange(body.querySelector("#bshell-set-font"), (v) => { d().fontFamily = v; });
  const setDesign = (prop) => (v) => {
    const ds = Object.assign({}, d().design);
    if (v) ds[prop] = v; else delete ds[prop];
    if (Object.keys(ds).length) d().design = ds; else delete d().design;
  };
  bsxBindChange(body.querySelector("#bsx-design-heading"), setDesign("headingFont"));
  bsxBindSeg(body, "design-btn-radius", setDesign("buttonRadius"));
  bsxBindSeg(body, "design-btn-fill", setDesign("buttonFill"));
  bsxBindSeg(body, "design-bg", setDesign("bgTone"));
}

/* ----- business & contact details ----- */
function bsxBusinessPanelHtml(d) {
  return bsxF.group(bsL("העסק", "The business"),
      bsxF.text("bsx-biz-name", bsL("שם העסק", "Business name"), d.businessName || "", { max: 60, focusKey: "name" })
      + bsxF.text("bsx-biz-tagline", bsL("שורת תיאור", "Tagline"), d.tagline || "", { max: 140, focusKey: "tagline" })
      + bsxF.text("bsx-biz-about", bsL("קצת עליכם", "About you"), d.about || "", { multiline: true, rows: 4, focusKey: "about" }))
    + bsxF.group(bsL("פרטי קשר", "Contact details"),
      bsxF.note(bsL("פרטים עסקיים — מתעדכנים בכל מקום באתר (ראש, כפתורים, תחתית).", "Business details — they update everywhere on the site (header, buttons, footer)."))
      + bsxF.text("bshell-set-phone", bsL("טלפון", "Phone"), d.phone || "", { dir: "ltr", focusKey: "phone", type: "tel" })
      + bsxF.toggle("bshell-set-has-whatsapp", bsL("המספר הזה הוא גם הוואטסאפ שלי", "This number is also my WhatsApp"), !d.noWhatsapp)
      + bsxF.text("bshell-set-whatsapp", bsL("מספר וואטסאפ אחר (אם שונה מהטלפון)", "Other WhatsApp number (if different)"), d.whatsapp || "", { dir: "ltr", focusKey: "whatsapp", type: "tel" })
      + bsxF.text("bshell-set-email", bsL("מייל", "Email"), d.email || "", { dir: "ltr", focusKey: "email", type: "email" })
      + bsxF.text("bshell-set-address", bsL("כתובת", "Address"), d.address || "", { focusKey: "address" }), "bsx-contact-group");
}
function bsxWireBusinessPanel(body) {
  const d = () => siteState.data;
  bsxBindInput(body.querySelector("#bsx-biz-name"), (v) => { d().businessName = v; bsxUpdateTopName(); });
  bsxBindInput(body.querySelector("#bsx-biz-tagline"), (v) => { d().tagline = v; });
  bsxBindInput(body.querySelector("#bsx-biz-about"), (v) => { d().about = v; });
  ["phone", "whatsapp", "email", "address"].forEach((k) => bsxBindInput(body.querySelector("#bshell-set-" + k), (v) => { d()[k] = v; }));
  bsxBindChange(body.querySelector("#bshell-set-has-whatsapp"), (v) => { d().noWhatsapp = !v; });
}

/* ----- advanced settings (every site-wide switch stays reachable) ----- */
function bsxSettingsPanelHtml(d) {
  const lead = typeof DK_AUTOMATE_ENABLED !== "undefined" && DK_AUTOMATE_ENABLED === true;
  return bsxF.group(bsL("שפה", "Language"),
      bsxF.select("bshell-set-site-lang", bsL("שפת האתר", "Site language"), [["he", bsL("עברית", "Hebrew")], ["en", "English"]], d.siteLang === "en" ? "en" : "he", bsL("כיוון הטקסט והכותרות והתוויות שמופיעות כברירת מחדל. הטקסטים שכתבתם לא משתנים.", "Text direction and the default headings and labels. Text you wrote stays as it is.")))
    + bsxF.group(bsL("עמודים", "Pages"),
      bsxF.toggle("bshell-set-page-about", bsL("\"אודות\" בעמוד נפרד", "\"About\" on its own page"), !!(d.pages && d.pages.about), bsL("כשמופעל, החלק עובר לעמוד משלו עם קישור בתפריט.", "When on, the section moves to its own page, linked from the menu."))
      + bsxF.toggle("bshell-set-page-contact", bsL("\"צור קשר\" בעמוד נפרד", "\"Contact\" on its own page"), !!(d.pages && d.pages.contact)))
    + bsxF.group(bsL("בראש ובתחתית", "Header & footer"),
      bsxF.toggle("bshell-set-bsd", bsL("הצגת בס\"ד בראש האתר", "Show בס\"ד at the top of the site"), !!d.showBsd, bsL("מופיע קטן בפינה העליונה של כל העמודים.", "Appears small in the top corner of every page."))
      + bsxF.toggle("bshell-set-hide-copyright", bsL("הסתרת שורת זכויות היוצרים", "Hide the copyright line"), !!d.hideCopyright))
    + bsxF.group(bsL("וואטסאפ ופניות", "WhatsApp & enquiries"),
      bsxF.toggle("bsx-set-has-whatsapp", bsL("כפתור וואטסאפ צף (לפי מספר הטלפון)", "Floating WhatsApp button (from the phone number)"), !d.noWhatsapp)
      + (lead ? bsxF.toggle("bshell-set-leadform", bsL("כפתור צף \"השאירו פרטים\"", "Floating \"Leave your details\" button"), d.leadForm === true, bsL("כל פנייה נכנסת ל-DeskKit Automate כליד חדש. אחרי ההפעלה צריך לפרסם מחדש.", "Every enquiry goes into DeskKit Automate as a new lead. Republish after turning it on.")) : ""))
    + bsxF.group(bsL("מדיה", "Media"),
      `<button type="button" class="bsx-btn bsx-btn-block" data-goto="heroimages">${bsxIcon("image")}${bsL("תמונות הפתיח", "Hero images")}</button>
       <button type="button" class="bsx-btn bsx-btn-block" data-goto="video" style="margin-top:6px">${bsxIcon("video")}${bsL("סרטון", "Video")}</button>`)
    + bsxF.group(bsL("גוגל ושיתוף", "Google & sharing"), `<button type="button" class="bsx-btn bsx-btn-block" data-goto="seo">${bsxIcon("search")}${bsL("איך האתר נראה בגוגל (SEO)", "How the site looks on Google (SEO)")}</button>`);
}
function bsxWireSettingsPanel(body) {
  const d = () => siteState.data;
  bsxBindChange(body.querySelector("#bshell-set-site-lang"), (v) => { if (v === "en") d().siteLang = "en"; else delete d().siteLang; });
  bsxBindChange(body.querySelector("#bshell-set-page-about"), (v) => { ensurePagesShape(d()).pages.about = !!v; });
  bsxBindChange(body.querySelector("#bshell-set-page-contact"), (v) => { ensurePagesShape(d()).pages.contact = !!v; });
  bsxBindChange(body.querySelector("#bshell-set-bsd"), (v) => { d().showBsd = !!v; }, () => bsxRenderDock());
  bsxBindChange(body.querySelector("#bshell-set-hide-copyright"), (v) => { d().hideCopyright = !!v; });
  bsxBindChange(body.querySelector("#bsx-set-has-whatsapp"), (v) => { d().noWhatsapp = !v; });
  bsxBindChange(body.querySelector("#bshell-set-leadform"), (v) => { if (v) d().leadForm = true; else delete d().leadForm; });
  body.addEventListener("click", (e) => { const b = e.target.closest("[data-goto]"); if (b) bsxOpenPanel(b.dataset.goto); });
}

/* ----- site structure ----- */
function bsxStructureRows() {
  const order = bsxOrder();
  const vis = bsxMap.keys;
  const defs = SITE_BLOCK_DEFS[siteState.template] || {};
  return order.filter((k) => bsxIsCustom(k) ? !!bsxSecData(k) : !!defs[k]).map((k) => {
    const visible = vis.indexOf(k) !== -1;
    const def = defs[k];
    const pagesGate = def ? (def._pagesGate !== undefined ? def._pagesGate : !def._bshellHiddenGate) : false;
    const separatePage = !visible && def && pagesGate && !bsxIsCustom(k);
    return { key: k, visible, custom: bsxIsCustom(k), separatePage, label: bsxSectionLabel(k) };
  });
}
function bsxStructureHtml() {
  const rows = bsxStructureRows();
  const vis = bsxMap.keys;
  const header = Array.from(bsxMap.rootOf.keys()).filter((k) => k.indexOf("site:") === 0);
  const head = header.filter((k) => bsxMap.firstBlockIdx === -1 || parseInt(k.slice(5), 10) < bsxMap.firstBlockIdx).slice(0, 1);
  const foot = header.filter((k) => bsxMap.firstBlockIdx !== -1 && parseInt(k.slice(5), 10) > bsxMap.firstBlockIdx).slice(0, 1);
  const fixedRow = (k, text) => `<div class="bsx-list-row is-fixed${bsxSel && bsxSel.secKey === k ? " is-selected" : ""}"><span class="bsx-grip" style="visibility:hidden">${bsxIcon("grip")}</span><button type="button" class="bsx-list-name" data-struct-select="${k}">${bsxEsc(text)}</button><span class="bsx-tag">${bsL("קבוע", "Fixed")}</span></div>`;
  const b = (act, icon, label, key, dis) => `<button type="button" class="bsx-icon-btn bsx-icon-btn-sm" data-struct="${act}" data-key="${bsxEsc(key)}" title="${bsxEsc(label)}" aria-label="${bsxEsc(label)}"${dis ? " disabled" : ""}>${bsxIcon(icon)}</button>`;
  const list = rows.map((r) => {
    const i = vis.indexOf(r.key);
    const tag = r.visible ? "" : `<span class="bsx-tag">${r.separatePage ? bsL("בעמוד נפרד", "Own page") : bsL("מוסתר", "Hidden")}</span>`;
    const controls = r.visible
      ? b("up", "up", bsL("למעלה", "Up"), r.key, i <= 0) + b("down", "down", bsL("למטה", "Down"), r.key, i >= vis.length - 1)
        + (r.custom ? b("delete", "trash", bsL("מחיקה", "Delete"), r.key) : b("hide", "eyeOff", bsL("הסתרה", "Hide"), r.key))
      : b("show", "eye", r.separatePage ? bsL("החזרה לעמוד הבית", "Back to the home page") : bsL("הצגה", "Show"), r.key);
    return `<div class="bsx-list-row${r.visible ? "" : " is-hidden"}${bsxSel && bsxSel.secKey === r.key ? " is-selected" : ""}" data-row="${bsxEsc(r.key)}">
      ${r.visible ? `<button type="button" class="bsx-grip" data-struct-grip="${bsxEsc(r.key)}" aria-label="${bsxEsc(bsL("גרירה לשינוי הסדר", "Drag to reorder"))}: ${bsxEsc(r.label)}" title="${bsxEsc(bsL("גררו או השתמשו בחיצים", "Drag, or use the arrow keys"))}">${bsxIcon("grip")}</button>` : `<span class="bsx-grip" style="visibility:hidden">${bsxIcon("grip")}</span>`}
      <button type="button" class="bsx-list-name" data-struct-select="${bsxEsc(r.key)}"${r.visible ? "" : " disabled"}>${bsxEsc(r.label)}</button>${tag}${controls}</div>`;
  }).join("");
  return `<p class="bsx-hint" style="margin:0 0 12px">${bsL("כל החלקים בעמוד הבית, לפי הסדר. גוררים לשינוי הסדר, לוחצים על שם כדי לקפוץ אליו.", "All sections of the home page, in order. Drag to reorder, click a name to jump to it.")}</p>
    <div class="bsx-list" id="bsx-struct-list">${head.map((k) => fixedRow(k, bsL("ראש האתר", "Site header"))).join("")}${list}${bsxMap.rootOf.has("video") ? fixedRow("video", bsL("סרטון", "Video")) : ""}${foot.map((k) => fixedRow(k, bsL("תחתית האתר", "Site footer"))).join("")}</div>
    ${bsxLibOn() && bsxAvailableTypes().length ? `<button type="button" class="bsx-btn bsx-btn-primary bsx-btn-block" id="bsx-struct-add" style="margin-top:12px">${bsxIcon("plus")}${bsL("הוספת חלק", "Add section")}</button>` : ""}`;
}
function bsxWireStructure(body) {
  body.addEventListener("click", (e) => {
    const s = e.target.closest("[data-struct-select]");
    if (s && !s.disabled) { bsxSelectSection(s.dataset.structSelect, { scroll: true }); bsxRefreshPanel(true); return; }
    const b = e.target.closest("[data-struct]");
    if (b && !b.disabled) {
      const key = b.dataset.key;
      const i = bsxMap.keys.indexOf(key);
      const a = b.dataset.struct;
      if (a === "up") bsxMoveSection(key, i - 1);
      else if (a === "down") bsxMoveSection(key, i + 1);
      else if (a === "hide") bsxHideSection(key);
      else if (a === "delete") bsxDeleteSection(key);
      else if (a === "show") bsxShowSection(key);
      return;
    }
    if (e.target.closest("#bsx-struct-add")) bsxOpenAddSection(bsxMap.keys.length);
  });
  body.addEventListener("keydown", (e) => {
    const g = e.target.closest("[data-struct-grip]");
    if (!g || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const key = g.dataset.structGrip;
    const i = bsxMap.keys.indexOf(key);
    bsxMoveSection(key, e.key === "ArrowUp" ? i - 1 : i + 1);
    setTimeout(() => { const ng = document.querySelector(`#bsx-panel-body [data-struct-grip="${bsxCss(key)}"]`); if (ng) ng.focus(); }, 80);
  });
  body.addEventListener("pointerdown", (e) => {
    const g = e.target.closest("[data-struct-grip]");
    if (!g || e.button !== 0) return;
    e.preventDefault();
    bsxStructDrag(g, e);
  });
}
function bsxStructDrag(grip, e) {
  const list = document.getElementById("bsx-struct-list");
  const key = grip.dataset.structGrip;
  const row = grip.closest(".bsx-list-row");
  const rows = Array.from(list.querySelectorAll(".bsx-list-row[data-row]")).filter((r) => bsxMap.keys.indexOf(r.dataset.row) !== -1);
  const from = rows.indexOf(row);
  let gap = null;
  const line = document.createElement("div");
  line.className = "bsx-list-drop";
  row.classList.add("is-dragging");
  const move = (ev) => {
    const y = ev.clientY;
    gap = rows.length;
    for (let i = 0; i < rows.length; i++) { const r = rows[i].getBoundingClientRect(); if (y < r.top + r.height / 2) { gap = i; break; } }
    if (gap < rows.length) rows[gap].before(line); else rows[rows.length - 1].after(line);
  };
  const up = () => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    line.remove();
    row.classList.remove("is-dragging");
    if (gap == null) return;
    const to = gap > from ? gap - 1 : gap;
    if (to !== from) bsxMoveSection(key, to);
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  move(e);
}

/* ---------- Add-section gallery ---------- */
function bsxOpenAddSection(at, opts) {
  if (!bsxLibOn()) return;
  opts = opts || {};
  bsxCommitEdit();
  const types = bsxAvailableTypes().filter((t) => !opts.types || opts.types.indexOf(t) !== -1);
  if (!types.length) return;
  const entries = types.map(bsxLibEntry).filter(Boolean);
  const cats = [];
  entries.forEach((e) => { const c = bsxLoc(e.category) || bsL("כללי", "General"); if (cats.indexOf(c) === -1) cats.push(c); });
  let curCat = opts.category || "";
  const back = document.createElement("div");
  back.className = "bsx-modal-back";
  back.innerHTML = `<div class="bsx-modal" role="dialog" aria-modal="true" aria-labelledby="bsx-add-title" dir="${bsxSiteDirIsRtlUi() ? "rtl" : "ltr"}">
    <div class="bsx-modal-head"><div style="flex:1"><h2 id="bsx-add-title">${bsL("הוספת חלק לאתר", "Add a section")}</h2><p>${bsL("לחצו על עיצוב כדי להוסיף אותו במקום שבחרתם. אחר כך עורכים הכול ישירות באתר.", "Click a design to add it where you chose. Then edit everything right on the site.")}</p></div><button type="button" class="bsx-modal-x" data-close aria-label="${bsL("סגירה", "Close")}">${bsxIcon("close")}</button></div>
    <div class="bsx-modal-body">
      <nav class="bsx-cats" aria-label="${bsL("סוגי חלקים", "Section types")}">${cats.length > 1 ? `<button type="button" class="bsx-cat" data-cat="">${bsL("הכול", "All")}<small>${entries.length}</small></button>` : ""}${cats.map((c) => `<button type="button" class="bsx-cat" data-cat="${bsxEsc(c)}">${bsxEsc(c)}<small>${entries.filter((e) => (bsxLoc(e.category) || bsL("כללי", "General")) === c).length}</small></button>`).join("")}</nav>
      <div class="bsx-cards" id="bsx-add-cards"></div>
    </div></div>`;
  document.body.appendChild(back);
  const cardsEl = back.querySelector("#bsx-add-cards");
  let io = null;
  const render = () => {
    back.querySelectorAll(".bsx-cat").forEach((b) => { b.classList.toggle("is-on", b.dataset.cat === curCat); b.setAttribute("aria-pressed", String(b.dataset.cat === curCat)); });
    const shown = entries.filter((e) => !curCat || (bsxLoc(e.category) || bsL("כללי", "General")) === curCat);
    cardsEl.innerHTML = shown.map((e) => Object.keys(e.variants || { default: {} }).map((v, vi) => `
      <button type="button" class="bsx-card" data-type="${bsxEsc(e.type)}" data-variant="${bsxEsc(v)}" aria-label="${bsxEsc(bsxLoc(e.label) + " — " + bsxLoc((e.variants[v] || {}).label))}">
        <div class="bsx-card-prev" data-prev></div>
        <div class="bsx-card-body"><div><div class="bsx-card-name">${bsxEsc(bsxLoc(e.label))}</div><div class="bsx-card-sub">${bsxEsc(bsxLoc((e.variants[v] || {}).label))}</div></div>${vi === 0 && e.type === "leadForm" ? `<span class="bsx-card-badge">${bsL("מומלץ", "Recommended")}</span>` : ""}</div>
      </button>`).join("")).join("");
    if (io) io.disconnect();
    io = new IntersectionObserver((list) => list.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      bsxFillPreview(en.target.querySelector("[data-prev]"), () => siteSectionPreviewHtml(siteState.data, siteState.template, en.target.dataset.type, en.target.dataset.variant));
    }), { root: cardsEl, rootMargin: "200px" });
    cardsEl.querySelectorAll(".bsx-card").forEach((c) => io.observe(c));
    cardsEl.scrollTop = 0;
  };
  const close = () => { if (io) io.disconnect(); back.remove(); document.removeEventListener("keydown", onKey, true); };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
  };
  document.addEventListener("keydown", onKey, true);
  back.addEventListener("click", (e) => {
    if (e.target === back || e.target.closest("[data-close]")) { close(); return; }
    const cat = e.target.closest("[data-cat]");
    if (cat) { curCat = cat.dataset.cat; render(); return; }
    const card = e.target.closest(".bsx-card");
    if (card) {
      close();
      const key = bsxInsertSection(card.dataset.type, card.dataset.variant, at);
      if (key) {
        bsxToast(bsL("החלק נוסף — לחצו על טקסט כדי לערוך", "Section added — click any text to edit it"));
        if (card.dataset.type === "leadForm" || card.dataset.type === "video") setTimeout(() => bsxOpenPanel("section"), 400);
      }
    }
  });
  render();
  const first = back.querySelector(".bsx-cat.is-on") || back.querySelector(".bsx-card");
  if (first) first.focus();
}
/* A real, scaled-down render in a sandboxed iframe (no scripts). */
function bsxFillPreview(box, getHtml) {
  if (!box || box.dataset.filled) return;
  box.dataset.filled = "1";
  let html = "";
  try { html = getHtml() || ""; } catch (e) { html = ""; }
  if (!html) { box.innerHTML = `<div class="bsx-empty">${bsL("אין תצוגה מקדימה", "No preview")}</div>`; return; }
  html = String(html).replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const f = document.createElement("iframe");
  f.setAttribute("sandbox", "allow-same-origin");
  f.setAttribute("tabindex", "-1");
  f.setAttribute("aria-hidden", "true");
  f.srcdoc = html;
  box.appendChild(f);
  const scale = () => { const w = box.clientWidth || 260; f.style.transform = `scale(${w / 1200})`; };
  scale();
  f.addEventListener("load", () => {
    scale();
    try {
      const doc = f.contentDocument;
      const st = doc.createElement("style");
      st.textContent = ".site-reveal{opacity:1!important;transform:none!important} html{overflow:hidden}";
      doc.head.appendChild(st);
    } catch (e) { /* sandboxed */ }
  });
}

/* ---------- "Change design": the variants as live previews, with the
   section's own content ---------- */
function bsxVariantPreviewHtml(key, variant) {
  const copy = JSON.parse(JSON.stringify(siteState.data));
  if (bsxIsCustom(key)) siteSectionSetVariant(copy, bsxCustomId(key), variant);
  else { copy.blockVariants = Object.assign({}, copy.blockVariants); if (variant === "default") delete copy.blockVariants[key]; else copy.blockVariants[key] = variant; }
  const prev = siteState.data;
  siteState.data = copy;
  let html = "";
  try { html = SITE_TEMPLATES[siteState.template].render(copy, "index", { preview: true }); } finally { siteState.data = prev; }
  // keep only this section (plus the page's own styles)
  const doc = new DOMParser().parseFromString(html, "text/html");
  let root = null;
  if (bsxIsCustom(key)) { const el = doc.querySelector(`[data-dk-sec="${bsxCss(bsxCustomId(key))}"]`); root = el && el.closest("body > *"); }
  else { const a = bshellQueryAnchor(doc, bshellAnchorCandidates(siteState.template, key)); root = a && a.closest("body > *"); }
  if (!root) return html;
  Array.from(doc.body.children).forEach((el) => { if (el !== root && el.tagName !== "STYLE") el.remove(); });
  doc.querySelectorAll("script").forEach((s) => s.remove());
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
function bsxOpenVariantPicker(key) {
  const choices = bsxVariantChoices(key);
  if (choices.length < 2) return;
  bsxCommitEdit();
  const d = siteState.data;
  const cur = bsxIsCustom(key) ? (bsxSecData(key) || {}).variant : ((d.blockVariants && d.blockVariants[key]) || "default");
  const back = document.createElement("div");
  back.className = "bsx-modal-back";
  back.innerHTML = `<div class="bsx-modal" role="dialog" aria-modal="true" aria-labelledby="bsx-var-title" style="max-width:860px" dir="${bsxSiteDirIsRtlUi() ? "rtl" : "ltr"}">
    <div class="bsx-modal-head"><div style="flex:1"><h2 id="bsx-var-title">${bsL("עיצוב אחר ל", "Another design for ")}${bsxEsc(bsxSectionLabel(key))}</h2><p>${bsL("התצוגות מראות את התוכן שלכם. הטקסטים והתמונות נשמרים.", "The previews show your own content. Texts and images are kept.")}</p></div><button type="button" class="bsx-modal-x" data-close aria-label="${bsL("סגירה", "Close")}">${bsxIcon("close")}</button></div>
    <div class="bsx-modal-body"><div class="bsx-cards" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))">${choices.map((v) => `
      <button type="button" class="bsx-card${v === cur ? " is-current" : ""}" data-variant="${bsxEsc(v)}" aria-pressed="${v === cur}">
        <div class="bsx-card-prev" data-prev style="height:200px"></div>
        <div class="bsx-card-body"><div class="bsx-card-name">${bsxEsc(bsxVariantLabel(key, v))}</div>${v === cur ? `<span class="bsx-card-badge">${bsL("העיצוב הנוכחי", "Current")}</span>` : ""}</div>
      </button>`).join("")}</div></div></div>`;
  document.body.appendChild(back);
  back.querySelectorAll(".bsx-card").forEach((c) => bsxFillPreview(c.querySelector("[data-prev]"), () => bsxVariantPreviewHtml(key, c.dataset.variant)));
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey, true); };
  const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
  document.addEventListener("keydown", onKey, true);
  back.addEventListener("click", (e) => {
    if (e.target === back || e.target.closest("[data-close]")) { close(); return; }
    const card = e.target.closest(".bsx-card");
    if (!card) return;
    close();
    const v = card.dataset.variant;
    if (v === cur) return;
    bshellSnapshot();
    const dd = siteState.data;
    if (bsxIsCustom(key)) siteSectionSetVariant(dd, bsxCustomId(key), v);
    else { dd.blockVariants = dd.blockVariants || {}; if (v === "default") delete dd.blockVariants[key]; else dd.blockVariants[key] = v; }
    bshellScheduleSave();
    bshellRenderCanvas(() => { bsxSelectSection(key, { scroll: true }); bsxRefreshPanel(true); });
    bsxToast(bsL("העיצוב הוחלף", "Design changed"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
  });
  const first = back.querySelector(".bsx-card");
  if (first) first.focus();
}

/* ---------- Quick-actions dock ---------- */
function bsxDockItems() {
  const d = siteState.data;
  const lib = bsxLibOn();
  const avail = bsxAvailableTypes();
  const leadLegacy = typeof DK_AUTOMATE_ENABLED !== "undefined" && DK_AUTOMATE_ENABLED === true;
  const items = [];
  if (lib && avail.length) items.push({ act: "add", icon: "plus", label: bsL("הוספת חלק", "Add section"), primary: true });
  if ((lib && avail.indexOf("leadForm") !== -1) || leadLegacy) items.push({ act: "form", icon: "form", label: bsL("טופס פניות", "Contact form") });
  items.push({ act: "images", icon: "image", label: bsL("תמונות", "Images") });
  items.push({ act: "video", icon: "video", label: bsL("סרטון", "Video") });
  items.push({ sep: true });
  items.push({ act: "business", icon: "business", label: bsL("פרטי העסק", "Business") });
  items.push({ act: "contact", icon: "contact", label: bsL("פרטי קשר", "Contact") });
  items.push({ act: "bsd", icon: "bsd", label: bsL("בס\"ד", "BS\"D"), on: !!d.showBsd, pressed: true });
  items.push({ sep: true });
  items.push({ act: "design", icon: "palette", label: bsL("עיצוב", "Design"), on: bsxPanelMode === "design" });
  items.push({ act: "structure", icon: "layers", label: bsL("מבנה", "Structure"), on: bsxPanelMode === "structure" });
  items.push({ act: "settings", icon: "sliders", label: bsL("הגדרות", "Settings"), on: bsxPanelMode === "settings" });
  return items;
}
function bsxRenderDock() {
  const dock = document.getElementById("bsx-dock");
  if (!dock) return;
  dock.setAttribute("aria-label", bsL("כלים מהירים", "Quick tools"));
  dock.innerHTML = bsxDockItems().map((it) => it.sep ? '<span class="bsx-dock-sep" aria-hidden="true"></span>'
    : `<button type="button" class="bsx-dock-btn${it.primary ? " is-primary" : ""}${it.on ? " is-on" : ""}" data-dock="${it.act}"${it.pressed ? ` aria-pressed="${!!it.on}"` : ""} title="${bsxEsc(it.act === "bsd" ? (it.on ? bsL("בס\"ד מופיע בראש האתר — לחצו להסתרה", "בס\"ד shows at the top — click to hide") : bsL("הוספת בס\"ד בראש האתר", "Add בס\"ד at the top of the site")) : it.label)}">${bsxIcon(it.icon)}<span>${bsxEsc(it.label)}${it.act === "bsd" ? (it.on ? " ✓" : "") : ""}</span></button>`).join("");
  if (!dock.dataset.wired) {
    dock.dataset.wired = "1";
    dock.addEventListener("click", (e) => { const b = e.target.closest("[data-dock]"); if (b) bsxDockAction(b.dataset.dock); });
  }
}
function bsxDockAction(act) {
  const d = siteState.data;
  const avail = bsxAvailableTypes();
  const atEnd = () => bsxSel && bsxIsBlockKey(bsxSel.secKey) && bsxMap.keys.indexOf(bsxSel.secKey) !== -1 ? bsxMap.keys.indexOf(bsxSel.secKey) + 1 : bsxMap.keys.length;
  if (act === "add") return bsxOpenAddSection(atEnd());
  if (act === "form") {
    if (bsxLibOn() && avail.indexOf("leadForm") !== -1) {
      const existing = bsxMap.keys.find((k) => { const s = bsxSecData(k); return s && s.type === "leadForm"; });
      if (existing) { bsxSelectSection(existing, { scroll: true }); bsxOpenPanel("section"); bsxToast(bsL("כבר יש טופס באתר — אלה ההגדרות שלו", "There's already a form — here are its settings")); return; }
      const lib = bsxLibEntry("leadForm");
      const variant = lib && lib.variants ? Object.keys(lib.variants)[0] : undefined;
      const key = bsxInsertSection("leadForm", variant, atEnd());
      if (key) setTimeout(() => bsxOpenPanel("section"), 350);
      return;
    }
    bsxOpenPanel("settings");
    return;
  }
  if (act === "images") {
    if (bsxLibOn() && avail.indexOf("gallery") !== -1) return bsxOpenAddSectionOrHero("gallery");
    return bsxOpenPanel("heroimages");
  }
  if (act === "video") {
    if (bsxLibOn() && avail.indexOf("video") !== -1) return bsxOpenAddSection(atEnd(), { types: ["video"] });
    return bsxOpenPanel("video");
  }
  if (act === "business") return bsxOpenPanel("business", { focus: "name" });
  if (act === "contact") return bsxOpenPanel("business", { focus: "phone" });
  if (act === "bsd") {
    bsxCommitEdit();
    bshellSnapshot();
    d.showBsd = !d.showBsd;
    bshellScheduleSave();
    bshellRenderCanvas(() => { if (bsxPanelMode === "settings" || bsxPanelMode === "chrome" || bsxPanelMode === "section") bsxRefreshPanel(true); });
    bsxRenderDock();
    bsxToast(d.showBsd ? bsL("בס\"ד מופיע עכשיו בראש האתר", "בס\"ד now shows at the top of the site") : bsL("בס\"ד הוסר מראש האתר", "בס\"ד removed from the top of the site"), { action: { label: bsL("ביטול", "Undo"), fn: bshellUndo } });
    return;
  }
  bsxTogglePanel(act);
}
function bsxOpenAddSectionOrHero(type) {
  const at = bsxSel && bsxIsBlockKey(bsxSel.secKey) && bsxMap.keys.indexOf(bsxSel.secKey) !== -1 ? bsxMap.keys.indexOf(bsxSel.secKey) + 1 : bsxMap.keys.length;
  bsxOpenAddSection(at, { types: [type] });
  const modal = document.querySelector(".bsx-modal-back .bsx-modal-head p");
  if (modal) {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "bsx-btn bsx-btn-ghost";
    link.style.cssText = "height:28px;padding:0 8px;margin-top:4px;color:#0F766E";
    link.textContent = bsL("או: לנהל את תמונות הפתיח ←", "Or: manage the hero images →");
    link.addEventListener("click", () => { document.querySelector(".bsx-modal-back").remove(); bsxOpenPanel("heroimages"); });
    modal.after(link);
  }
}

/* ---------- Preview mode: the site exactly as visitors will see it ---------- */
let bsxPreviewPage = "index";
function bsxStartPreview() {
  bsxCommitEdit();
  bsxDeselect();
  bsxClosePopover();
  const root = document.getElementById("bshell-root");
  root.classList.add("is-previewing");
  const frameBox = document.querySelector(".bsx-frame");
  let f = document.getElementById("bsx-preview-frame");
  if (!f) {
    f = document.createElement("iframe");
    f.id = "bsx-preview-frame";
    f.className = "bsx-preview-frame";
    f.title = bsL("תצוגה מקדימה של האתר", "Site preview");
    frameBox.appendChild(f);
  }
  bsxPreviewPage = "index";
  f.srcdoc = currentSiteHtml("index");
  let bar = document.getElementById("bsx-preview-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "bsx-preview-bar";
    bar.className = "bsx-preview-bar";
    document.getElementById("bsx-stage").appendChild(bar);
  }
  const pages = typeof enabledSitePages === "function" ? enabledSitePages() : ["index"];
  const names = { index: bsL("בית", "Home"), about: bsL("אודות", "About"), contact: bsL("צור קשר", "Contact") };
  bar.innerHTML = `<span>${bsL("תצוגה מקדימה", "Preview")}</span>${pages.length > 1 ? pages.map((p) => `<button type="button" data-pv-page="${p}">${names[p]}</button>`).join("") : ""}<button type="button" data-pv="tab" title="${bsxEsc(bsL("פתיחה בכרטיסייה חדשה", "Open in a new tab"))}">${bsL("בכרטיסייה חדשה", "New tab")}</button><button type="button" class="is-primary" data-pv="exit">${bsL("חזרה לעריכה", "Back to editing")}</button>`;
  bar.onclick = (e) => {
    const p = e.target.closest("[data-pv-page]");
    if (p) { bsxPreviewPage = p.dataset.pvPage; f.srcdoc = currentSiteHtml(bsxPreviewPage); return; }
    const b = e.target.closest("[data-pv]");
    if (!b) return;
    if (b.dataset.pv === "exit") bsxStopPreview();
    else bsxOpenPreviewTab();
  };
  document.getElementById("bshell-preview-btn").classList.add("is-on");
  bar.querySelector('[data-pv="exit"]').focus();
}
function bsxStopPreview() {
  const root = document.getElementById("bshell-root");
  root.classList.remove("is-previewing");
  const f = document.getElementById("bsx-preview-frame");
  if (f) f.remove();
  const bar = document.getElementById("bsx-preview-bar");
  if (bar) bar.remove();
  document.getElementById("bshell-preview-btn").classList.remove("is-on");
  bsxDraw();
}
function bsxSyncPreviewDevice() { /* the preview frame sits in the same holder, so it follows the device width */ }
window.addEventListener("message", (e) => {
  const f = document.getElementById("bsx-preview-frame");
  if (!f || e.source !== f.contentWindow) return;
  const page = e.data && e.data.deskkitPreviewNav;
  if (!page || typeof enabledSitePages !== "function" || enabledSitePages().indexOf(page) === -1) return;
  bsxPreviewPage = page;
  f.srcdoc = currentSiteHtml(page);
});
