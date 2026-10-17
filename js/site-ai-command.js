/* Site-level AI commands + Undo/History (architecture plan, Phase 7).
   A free-text instruction ("הזז את השירותים לפני האודות", "שנה את הצבע
   לכחול וקצר את האודות") is sent, with the CURRENT real context of this
   exact project (which section types exist, which are active, which
   variants are real, which text fields/fonts/services exist and their
   current values), to the site-ai-command Edge Function — which returns
   a short list of validated operations, never HTML, never a DOM
   mutation. This file's only job is to re-check those operations
   against the live data (the server already did, but the data may have
   changed while the request was out, and the client never trusts a
   response blindly either) and apply them using the exact same fields
   and functions the builder's own controls already use (ensureBlockOrder,
   d.blockVariants, d.primaryColor, d.fontFamily, d.headings, d.services,
   d.heroImage...), so an AI-driven change and a manual edit produce
   identical, equally-trusted results — there is no separate "AI
   mutation path".

   Only ever shown for a migrated template (isTemplateMigrated) — there
   is no Section/block system to operate on otherwise, and pretending
   otherwise would mean inventing a second, parallel editing mechanism
   for the other 14 templates, which the architecture plan explicitly
   rules out.

   Undo: a small, in-memory stack of full siteState.data snapshots
   (capped — this is NOT a version-control system, just "AI change ->
   preview -> apply -> undo" for the one most recent AI-driven change).
   Manual edits made after an AI change still push their own snapshot on
   the next AI command, but are not individually undoable by this
   mechanism — exactly the fast, reliable, un-fancy model the plan asks
   for, not a general-purpose history. The Builder-Shell
   (js/builder-shell.js) uses its own unified Undo/Redo instead. */

const SITE_AI_COMMAND_UNDO_MAX = 10;
let siteAiCommandUndoStack = [];
let siteAiCommandPending = null;

/* Every text field the AI may rewrite — the same d.* fields (and the same
   maxlength) as the builder's own inputs. `needs` = only offered when
   this template actually has that section, so the AI is never told about
   a heading the site doesn't show. Mirrors TEXT_FIELD_LIMITS in
   supabase/functions/_shared/site-ai-ops.ts. */
const SITE_AI_TEXT_FIELDS = {
  businessName: { max: 40, he: "שם העסק", en: "Business name", get: (d) => d.businessName, set: (d, v) => { d.businessName = v; } },
  heroTitle: { max: 60, he: "כותרת ראשית", en: "Main heading", get: (d) => d.headings.heroTitle, set: (d, v) => { d.headings.heroTitle = v; } },
  tagline: { max: 90, he: "שורת תיאור", en: "Tagline", get: (d) => d.tagline, set: (d, v) => { d.tagline = v; } },
  about: { max: 500, multiline: true, he: "טקסט אודות", en: "About text", get: (d) => d.about, set: (d, v) => { d.about = v; } },
  servicesHeading: { max: 40, needs: "services", he: "כותרת השירותים", en: "Services heading", get: (d) => d.headings.services, set: (d, v) => { d.headings.services = v; } },
  aboutHeading: { max: 40, needs: "about", he: "כותרת האודות", en: "About heading", get: (d) => d.headings.about, set: (d, v) => { d.headings.about = v; } },
  contactHeading: { max: 40, needs: "contact", he: "כותרת יצירת הקשר", en: "Contact heading", get: (d) => d.headings.contact, set: (d, v) => { d.headings.contact = v; } },
  phone: { max: 30, he: "טלפון", en: "Phone", get: (d) => d.phone, set: (d, v) => { d.phone = v; } },
  whatsapp: { max: 30, he: "וואטסאפ", en: "WhatsApp", get: (d) => d.whatsapp, set: (d, v) => { d.whatsapp = v; } },
  email: { max: 100, he: "מייל", en: "Email", get: (d) => d.email, set: (d, v) => { d.email = v; } },
  address: { max: 120, he: "כתובת", en: "Address", get: (d) => d.address, set: (d, v) => { d.address = v; } },
};
const SITE_AI_SERVICE_LIMITS = { name: 40, desc: 90, price: 20 };
const SITE_AI_MAX_SERVICES = 12;
const SITE_AI_MAX_OPS = 6;

function siteAiCommandNote(html) {
  const note = document.getElementById("site-ai-command-note");
  if (note) note.innerHTML = html;
}

function siteAiTextFieldsFor(template, availableTypes) {
  return Object.keys(SITE_AI_TEXT_FIELDS).filter((k) => {
    const needs = SITE_AI_TEXT_FIELDS[k].needs;
    return !needs || availableTypes.indexOf(needs) !== -1;
  });
}

function siteAiCommandContext() {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  const defs = SITE_BLOCK_DEFS[template] || {};
  const availableTypes = Object.keys(defs);
  // The template's own blocks only — added library sections ("x:<id>")
  // aren't something the AI ops know how to address.
  const activeTypes = activeBlocksForPage(d, template, "index").filter((t) => defs[t]);
  const variantOptions = {};
  availableTypes.forEach((type) => {
    const opts = typeof variantOptionsFor === "function" ? variantOptionsFor(template, type) : null;
    if (opts) variantOptions[type] = Object.keys(opts);
  });
  // Content context (what the AI may edit, and the current values it
  // needs to rewrite them "shorter"/"more professional") — each value
  // capped to its own field limit, so the request stays small.
  const textFields = {};
  siteAiTextFieldsFor(template, availableTypes).forEach((k) => {
    textFields[k] = String(SITE_AI_TEXT_FIELDS[k].get(d) || "").slice(0, SITE_AI_TEXT_FIELDS[k].max);
  });
  const fonts = (typeof SITE_FONTS === "object") ? Object.keys(SITE_FONTS).map((key) => ({ key, name: SITE_FONTS[key].name })) : [];
  const services = (Array.isArray(d.services) ? d.services : []).slice(0, 20).map((s) => ({
    name: String((s && s.name) || "").slice(0, SITE_AI_SERVICE_LIMITS.name),
    desc: String((s && s.desc) || "").slice(0, SITE_AI_SERVICE_LIMITS.desc),
    price: String((s && s.price) || "").slice(0, SITE_AI_SERVICE_LIMITS.price),
  }));
  const images = { hero: !!d.heroImage, gallery: (d.heroImages || []).length };
  return { availableTypes, activeTypes, variantOptions, textFields, fonts, services, images, siteLang: d.siteLang === "en" ? "en" : "he" };
}

/* The full request body — shared by the old sidebar bar and the Shell's
   AI popover so the two can never drift apart. */
function siteAiCommandRequestBody(command) {
  const ctx = siteAiCommandContext();
  return Object.assign({ lang: (typeof currentLang === "function" ? currentLang() : "he"), command }, ctx);
}

function siteAiCleanText(v, max, multiline) {
  if (typeof v !== "string") return null;
  let s = v.replace(/\r\n?/g, "\n");
  s = multiline
    ? s.replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").replace(/\n{3,}/g, "\n\n")
    : s.replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, " ");
  return s.replace(/[ \t]{2,}/g, " ").trim().slice(0, max).trim();
}

function siteAiIsIndex(v, length) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < length;
}

/* Client-side re-validation against the LIVE data — the same rules as
   the server (supabase/functions/_shared/site-ai-ops.ts), re-run here
   because the data may have changed since the request went out (a
   service removed, a section hidden) and because a response is never
   applied blindly. Accepts the new {ops:[...]} shape and the legacy
   single-op shape (still used by js/site-ai-review.js's suggested
   actions). Returns only clean copies of ops that pass. */
function siteAiCleanOps(result, d, template) {
  if (!result || typeof result !== "object") return [];
  const raw = Array.isArray(result.ops) ? result.ops : [result];
  const defs = SITE_BLOCK_DEFS[template] || {};
  const available = Object.keys(defs);
  const active = activeBlocksForPage(d, template, "index").filter((t) => defs[t]);
  const fields = siteAiTextFieldsFor(template, available);
  const services = Array.isArray(d.services) ? d.services : [];
  const claimed = new Set();
  const claim = (k) => { if (claimed.has(k)) return false; claimed.add(k); return true; };
  const out = [];
  raw.slice(0, SITE_AI_MAX_OPS).forEach((o) => {
    if (!o || typeof o !== "object") return;
    const op = o.op;
    const structural = op === "reorder" || op === "addSection" || op === "removeSection";
    if (structural && claimed.has("structure")) return;
    if (op === "setVariant") {
      const opts = typeof variantOptionsFor === "function" ? variantOptionsFor(template, o.type) : null;
      if (typeof o.type !== "string" || !opts || typeof o.variant !== "string" || !Object.prototype.hasOwnProperty.call(opts, o.variant)) return;
      if (claim("variant:" + o.type)) out.push({ op, type: o.type, variant: o.variant });
    } else if (op === "addSection") {
      if (typeof o.type !== "string" || available.indexOf(o.type) === -1 || active.indexOf(o.type) !== -1) return;
      claim("structure"); out.push({ op, type: o.type });
    } else if (op === "removeSection") {
      if (typeof o.type !== "string" || o.type === "hero" || active.indexOf(o.type) === -1) return;
      claim("structure"); out.push({ op, type: o.type });
    } else if (op === "reorder") {
      if (!Array.isArray(o.order) || o.order.length !== active.length) return;
      const a = o.order.slice().sort(), b = active.slice().sort();
      if (!a.every((v, i) => typeof v === "string" && v === b[i])) return;
      claim("structure"); out.push({ op, order: o.order.slice() });
    } else if (op === "setColor") {
      if (typeof o.color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(o.color)) return;
      if (claim("color")) out.push({ op, color: o.color.toUpperCase() });
    } else if (op === "setFont") {
      if (typeof o.font !== "string" || typeof SITE_FONTS !== "object" || !Object.prototype.hasOwnProperty.call(SITE_FONTS, o.font)) return;
      if (claim("font")) out.push({ op, font: o.font });
    } else if (op === "setText") {
      if (typeof o.field !== "string" || fields.indexOf(o.field) === -1) return;
      const spec = SITE_AI_TEXT_FIELDS[o.field];
      const value = siteAiCleanText(o.value, spec.max, !!spec.multiline);
      if (value === null || (!value && o.field === "businessName")) return;
      if (value && o.field === "email" && !/^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/.test(value)) return;
      if (value && (o.field === "phone" || o.field === "whatsapp") && !/^[0-9+()\-\s]+$/.test(value)) return;
      if (claim("text:" + o.field)) out.push({ op, field: o.field, value });
    } else if (op === "addService") {
      const name = siteAiCleanText(o.name, SITE_AI_SERVICE_LIMITS.name);
      if (!name) return;
      const named = services.filter((s) => s && s.name && String(s.name).trim()).length;
      const added = out.filter((x) => x.op === "addService").length;
      if (named + added >= SITE_AI_MAX_SERVICES) return;
      out.push({ op, name, desc: siteAiCleanText(o.desc, SITE_AI_SERVICE_LIMITS.desc) || "", price: siteAiCleanText(o.price, SITE_AI_SERVICE_LIMITS.price) || "" });
    } else if (op === "editService") {
      if (!siteAiIsIndex(o.index, services.length) || claimed.has("svc:" + o.index)) return;
      const clean = { op, index: o.index };
      let any = false;
      for (const k of ["name", "desc", "price"]) {
        if (o[k] === undefined || o[k] === null) continue;
        const v = siteAiCleanText(o[k], SITE_AI_SERVICE_LIMITS[k]);
        if (v === null || (k === "name" && !v)) return;
        clean[k] = v; any = true;
      }
      if (any && claim("svc:" + o.index)) out.push(clean);
    } else if (op === "removeService") {
      if (!siteAiIsIndex(o.index, services.length) || claimed.has("svc:" + o.index)) return;
      const removing = out.filter((x) => x.op === "removeService").length;
      if (services.length - removing <= 1) return; // the builder always keeps one row
      claim("svc:" + o.index); out.push({ op, index: o.index });
    } else if (op === "removeImage") {
      if (o.target === "hero" && d.heroImage && claim("img:hero")) out.push({ op, target: "hero" });
      else if (o.target === "gallery" && (d.heroImages || []).length && claim("img:gallery")) out.push({ op, target: "gallery" });
    }
  });
  return out;
}

/* One human-readable line per op, in the UI language — the confirm step
   shows THESE (computed from the validated ops themselves), not just the
   model's own summary sentence, so what the person approves is exactly
   what will happen. */
function siteAiSectionLabel(template, type) {
  const def = (SITE_BLOCK_DEFS[template] || {})[type];
  const he = def ? def.label : type;
  return typeof dkSitesLabel === "function" ? dkSitesLabel(he) : he;
}
function siteAiShort(s, n) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function siteAiOpSummary(op, d, template) {
  // <bdi> keeps a Hebrew value readable inside an English line (and vice versa).
  const q = (s) => `“<bdi>${escapeHtmlS(siteAiShort(s, 70))}</bdi>”`;
  const svcName = (i) => `<bdi>${escapeHtmlS(siteAiShort((d.services[i] && d.services[i].name) || dkL(`שירות ${i + 1}`, `Service ${i + 1}`), 40))}</bdi>`;
  switch (op.op) {
    case "reorder": return dkL("סדר חדש לחלקים: ", "New section order: ") + op.order.map((t) => escapeHtmlS(siteAiSectionLabel(template, t))).join(" ← ");
    case "addSection": return dkL("הוספת החלק: ", "Add section: ") + escapeHtmlS(siteAiSectionLabel(template, op.type));
    case "removeSection": return dkL("הסרת החלק: ", "Remove section: ") + escapeHtmlS(siteAiSectionLabel(template, op.type));
    case "setVariant": {
      const opts = variantOptionsFor(template, op.type) || {};
      const label = opts[op.variant] ? opts[op.variant].label : op.variant;
      return dkL("סגנון תצוגה של ", "Display style of ") + escapeHtmlS(siteAiSectionLabel(template, op.type)) + ": " + escapeHtmlS(typeof dkSitesLabel === "function" ? dkSitesLabel(label) : label);
    }
    case "setColor": return dkL("צבע ראשי: ", "Main color: ") + `<span class="site-ai-swatch" style="background:${op.color}"></span><bdi dir="ltr">${op.color}</bdi>`;
    case "setFont": return dkL("גופן: ", "Font: ") + escapeHtmlS(typeof dkSitesLabel === "function" ? dkSitesLabel(SITE_FONTS[op.font].name) : SITE_FONTS[op.font].name);
    case "setText": {
      const spec = SITE_AI_TEXT_FIELDS[op.field];
      return escapeHtmlS(dkL(spec.he, spec.en)) + ": " + (op.value ? q(op.value) : dkL("ריק (ברירת המחדל)", "empty (the default)"));
    }
    case "addService": return dkL("שירות חדש: ", "New service: ") + q(op.name);
    case "editService": {
      const parts = [];
      if (op.name !== undefined) parts.push(dkL("שם ", "name ") + q(op.name));
      if (op.desc !== undefined) parts.push(dkL("תיאור ", "description ") + q(op.desc));
      if (op.price !== undefined) parts.push(dkL("מחיר ", "price ") + q(op.price));
      return dkL("עדכון השירות ", "Update service ") + svcName(op.index) + ": " + parts.join(", ");
    }
    case "removeService": return dkL("הסרת השירות: ", "Remove service: ") + svcName(op.index);
    case "removeImage": return op.target === "hero" ? dkL("הסרת התמונה הראשית", "Remove the main image") : dkL("הסרת תמונות הגלריה", "Remove the gallery images");
  }
  return "";
}

/* The confirm card, shared by both surfaces: the model's own one-line
   summary (if any), the per-op list, and — when part of the request
   couldn't be done — a short note saying so. Ids are prefixed so the
   sidebar and the Shell never collide. */
function siteAiConfirmHtml(result, ops, prefix, btnClassYes) {
  const d = siteState.data;
  const template = siteState.template;
  const lines = ops.map((op) => `<li>${siteAiOpSummary(op, d, template)}</li>`).join("");
  const dropped = Math.max(0, (Number(result.skipped) || 0) + ((Array.isArray(result.ops) ? result.ops.length : 1) - ops.length));
  const note = result.note
    ? `<div class="site-ai-skipped">${escapeHtmlS(result.note)}</div>`
    : (dropped ? `<div class="site-ai-skipped">${dkL("חלק מהבקשה לא אפשרי כאן ולכן לא ייעשה.", "Part of the request isn't possible here, so it won't be done.")}</div>` : "");
  return `
    ${result.explanation ? `<div>${escapeHtmlS(result.explanation)}</div>` : ""}
    <ul class="site-ai-changes">${lines}</ul>
    ${note}
    <div class="${prefix}-confirm-row">
      <button type="button" class="${btnClassYes}" id="${prefix}-confirm">${dkL("אישור", "Confirm")}</button>
      <button type="button" class="${prefix === "site-ai-command" ? "btn-mini" : ""}" id="${prefix}-cancel">${dkL("ביטול", "Cancel")}</button>
    </div>`;
}

function siteAiFindService(d) {
  // The builder starts every project with one empty service row — an
  // AI-added service fills that placeholder instead of leaving a blank
  // row above it.
  return (d.services.length === 1 && !String(d.services[0].name || "").trim() && !String(d.services[0].desc || "").trim()) ? 0 : -1;
}

/* Pure mutation, no rendering/undo-bookkeeping of its own — shared by
   BOTH the old sidebar builder (below) and the new Builder-Shell
   (js/builder-shell.js's bshellApplyAiOp), so an AI-driven change
   produces the exact same data mutation regardless of which editing
   surface issued it, using the same functions/fields the builder's own
   controls already use — never a bespoke mutation path. Re-validates
   (siteAiCleanOps) before touching anything. Order matters for services:
   edits first, then removals from the highest index down (so earlier
   indexes stay correct), then additions. Returns how many ops were
   applied (0 = nothing changed). */
function applySiteAiOp(d, template, result) {
  ensurePagesShape(d);
  const ops = siteAiCleanOps(result, d, template);
  if (!ops.length) return 0;
  if (!Array.isArray(d.services) || !d.services.length) d.services = [{ name: "", desc: "", price: "" }];
  const rank = (op) => (op.op === "removeService" ? 1 : op.op === "addService" ? 2 : 0);
  const ordered = ops.slice().sort((a, b) => rank(a) - rank(b) || (a.op === "removeService" ? b.index - a.index : 0));
  ordered.forEach((op) => {
    if (op.op === "reorder") {
      // The template's own blocks take the new order in their own slots;
      // added library sections ("x:<id>") stay exactly where they are.
      const order = ensureBlockOrder(d, template, "index");
      const isCustom = (t) => typeof t === "string" && t.indexOf("x:") === 0;
      const builtins = op.order.concat(order.filter((t) => !isCustom(t) && op.order.indexOf(t) === -1));
      let next = 0;
      d.blockOrder.index = order.map((t) => (isCustom(t) ? t : builtins[next++])).filter((t) => t !== undefined);
    } else if (op.op === "addSection") {
      ensureBlockOrder(d, template, "index").push(op.type);
    } else if (op.op === "removeSection") {
      const order = ensureBlockOrder(d, template, "index");
      const idx = order.indexOf(op.type);
      if (idx !== -1) order.splice(idx, 1);
    } else if (op.op === "setVariant") {
      if (!d.blockVariants || typeof d.blockVariants !== "object") d.blockVariants = {};
      d.blockVariants[op.type] = op.variant;
    } else if (op.op === "setColor") {
      d.primaryColor = op.color;
    } else if (op.op === "setFont") {
      d.fontFamily = op.font;
    } else if (op.op === "setText") {
      SITE_AI_TEXT_FIELDS[op.field].set(d, op.value);
    } else if (op.op === "editService") {
      ["name", "desc", "price"].forEach((k) => { if (op[k] !== undefined) d.services[op.index][k] = op[k]; });
    } else if (op.op === "removeService") {
      if (d.services.length > 1) d.services.splice(op.index, 1);
    } else if (op.op === "addService") {
      const item = { name: op.name, desc: op.desc || "", price: op.price || "" };
      const slot = siteAiFindService(d);
      if (slot === 0) d.services[0] = item; else d.services.push(item);
    } else if (op.op === "removeImage") {
      if (op.target === "hero") d.heroImage = "";
      else d.heroImages = [];
    }
  });
  return ops.length;
}

function siteAiCommandPushUndo() {
  siteAiCommandUndoStack.push(JSON.stringify(siteState.data));
  if (siteAiCommandUndoStack.length > SITE_AI_COMMAND_UNDO_MAX) siteAiCommandUndoStack.shift();
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (undoBtn) undoBtn.style.display = "";
}

/* After an AI change the sidebar's own inputs (name, about, colour, font,
   services...) must show the new values too, not just the preview. */
function siteAiCommandRefreshSidebar() {
  if (typeof renderFormValues === "function" && document.getElementById("s-name")) renderFormValues();
  renderSitePreview();
  if (typeof renderHierarchyPanel === "function") renderHierarchyPanel();
}

function siteAiCommandUndo() {
  const snapshot = siteAiCommandUndoStack.pop();
  if (!snapshot) return;
  siteState.data = JSON.parse(snapshot);
  siteAiCommandRefreshSidebar();
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (undoBtn && !siteAiCommandUndoStack.length) undoBtn.style.display = "none";
  siteAiCommandNote(dkL("השינוי בוטל.", "Change undone."));
}

function siteAiCommandApply(result) {
  const template = siteState.template;
  const d = ensurePagesShape(siteState.data);
  siteAiCommandPushUndo();
  const applied = applySiteAiOp(d, template, result);
  if (!applied) {
    siteAiCommandUndoStack.pop(); // nothing was actually applied
    const undoBtn = document.getElementById("site-ai-command-undo");
    if (undoBtn && !siteAiCommandUndoStack.length) undoBtn.style.display = "none";
    siteAiCommandNote(dkL("השינוי כבר לא מתאים למצב הנוכחי של האתר, ולכן לא בוצע.", "That change no longer fits the site's current state, so it wasn't made."));
    return;
  }
  siteAiCommandRefreshSidebar();
  siteAiCommandNote(dkL(`בוצע ✓ ${escapeHtmlS(result.explanation || "")} (אפשר לבטל עם "בטל שינוי אחרון")`, `Done ✓ ${escapeHtmlS(result.explanation || "")} (you can undo it with "Undo last change")`));
}

async function siteAiCommandSubmit() {
  const input = document.getElementById("site-ai-command-input");
  const btn = document.getElementById("site-ai-command-btn");
  const command = (input.value || "").trim();
  if (!command) return;

  siteAiCommandPending = null;
  siteAiCommandNote(dkL("ה-AI מעבד את הפקודה…", "The AI is working on it…"));
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = dkL("מעבד...", "Working...");

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session && sessionData.session.access_token;
    if (!token) throw new Error("not signed in");

    const res = await fetch(SUPABASE_URL + "/functions/v1/site-ai-command", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(siteAiCommandRequestBody(command)),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || dkL("שגיאה לא צפויה", "Unexpected error"));

    if (data.limitReached) {
      siteAiCommandNote(data.isPro
        ? dkL("הגעת למכסת השימוש ההוגן היומית לפקודות AI. אפשר להמשיך מחר.", "You've reached today's fair-use limit for AI commands. You can continue tomorrow.")
        : dkL("הגעת למכסת הניסיונות החינמיים לפקודות AI. רוצה להמשיך? שדרג לגרסת Pro בתשלום חד-פעמי!", "You've used your free AI-command tries. Want to continue? Upgrade to Pro with a one-time payment!"));
      return;
    }

    const result = data.result;
    const ops = (result && result.op !== "unsupported") ? siteAiCleanOps(result, ensurePagesShape(siteState.data), siteState.template) : [];
    if (!ops.length) {
      siteAiCommandNote(escapeHtmlS((result && result.op === "unsupported" && result.explanation) || dkL("לא הצלחתי לבצע את הפעולה הזו.", "I couldn't do that.")));
      return;
    }

    // Change-summary-before-apply: a short confirm step listing exactly
    // what each validated op will do, not a silent mutation.
    siteAiCommandPending = result;
    siteAiCommandNote(siteAiConfirmHtml(result, ops, "site-ai-command", "btn-mini"));
    document.getElementById("site-ai-command-confirm").addEventListener("click", () => {
      if (siteAiCommandPending) siteAiCommandApply(siteAiCommandPending);
      siteAiCommandPending = null;
      input.value = "";
    });
    document.getElementById("site-ai-command-cancel").addEventListener("click", () => {
      siteAiCommandPending = null;
      siteAiCommandNote(dkL("בוטל.", "Cancelled."));
    });
  } catch (err) {
    // Never the command or site text — just that it failed.
    console.error("site AI command failed:", err && err.message ? err.message : "error");
    siteAiCommandNote(dkL("משהו השתבש. אפשר לנסות שוב בעוד רגע.", "Something went wrong. Please try again in a moment."));
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("site-ai-command-btn");
  const undoBtn = document.getElementById("site-ai-command-undo");
  if (btn) btn.addEventListener("click", siteAiCommandSubmit);
  if (undoBtn) undoBtn.addEventListener("click", siteAiCommandUndo);
});
