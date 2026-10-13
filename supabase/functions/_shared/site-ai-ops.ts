// Pure validation for site-ai-command (no Deno/network APIs, so it can be
// unit-tested on its own — see site-ai-ops_test.ts). The model's answer is
// NEVER trusted: every op, field key, index and value is checked against
// a small server-side whitelist AND the exact context the client sent for
// this project, and anything that doesn't pass is dropped. What survives
// is the only thing the client ever receives (and the client re-checks it
// again against its live data before applying anything).
//
// Supported ops (an answer is {ops: [...], explanation}, up to MAX_OPS):
//   structural  reorder / addSection / removeSection / setVariant (as before)
//   design      setColor {color:"#RRGGBB"}  — the site's primaryColor
//               setFont {font:<key>}         — only fonts the builder offers
//   text        setText {field, value}       — only TEXT_FIELD_LIMITS keys the
//                                              client listed for this site
//   services    addService {name, desc?, price?}
//               editService {index, name?, desc?, price?}
//               removeService {index}
//   images      removeImage {target:"hero"|"gallery"} — uploading/replacing a
//               picture can't be done from text, so that gets a pointer to
//               the image field instead (see unsupportedResult).

export type ServiceItem = { name: string; desc: string; price: string };

export type SiteContext = {
  availableTypes: string[]; // every block type this template defines, active or not
  activeTypes: string[]; // currently showing, in current order
  variantOptions: Record<string, string[]>; // type -> known variant keys, only for types that have real alternates
  textFields: Record<string, string>; // editable text field key -> current value (capped)
  fonts: { key: string; name: string }[]; // fonts the builder offers
  services: ServiceItem[]; // current service items (capped)
  images: { hero: boolean; gallery: number };
  siteLang: "he" | "en";
};

export type Op = Record<string, unknown> & { op: string };

export const MAX_OPS = 6;
export const MAX_SERVICES = 12;
const MAX_TYPES = 20;
const MAX_FONTS = 30;

// Same limits as the builder's own inputs (sites.html / builder-shell.js
// maxlength), so the AI can never write something a person couldn't type.
export const TEXT_FIELD_LIMITS: Record<string, number> = {
  businessName: 40,
  heroTitle: 60,
  tagline: 90,
  about: 500,
  servicesHeading: 40,
  aboutHeading: 40,
  contactHeading: 40,
  phone: 30,
  whatsapp: 30,
  email: 100,
  address: 120,
};
// A field the site can't sensibly show empty — "clear the business name"
// is treated as a bad op rather than blanking the site's identity.
const TEXT_FIELDS_REQUIRED = new Set(["businessName"]);
export const SERVICE_LIMITS = { name: 40, desc: 90, price: 20 };

const STRUCTURAL_OPS = new Set(["reorder", "addSection", "removeSection"]);
export const KNOWN_OPS = new Set([
  "reorder", "addSection", "removeSection", "setVariant",
  "setColor", "setFont", "setText",
  "addService", "editService", "removeService",
  "removeImage",
]);

const KEY_RE = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;
const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const EMAIL_RE = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,90}\.[A-Za-z]{2,24}$/;
const PHONE_RE = /^[0-9+()\-\s]{0,30}$/;

// Strips control characters (keeps \n only where multi-line text is
// allowed), collapses runs of spaces, trims and caps. The templates
// escape every value on render, so this is about tidiness and size, not
// HTML injection.
export function cleanText(v: unknown, max: number, multiline = false): string | null {
  if (typeof v !== "string") return null;
  let s = v.replace(/\r\n?/g, "\n");
  s = multiline
    ? s.replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").replace(/\n{3,}/g, "\n\n")
    : s.replace(/[\u0000-\u001F\u007F​-‏‪-‮⁦-⁩]/g, " ");
  s = s.replace(/[ \t]{2,}/g, " ").trim();
  return s.slice(0, max).trim();
}

export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(HEX_RE);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  return "#" + hex.toUpperCase();
}

function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((t) => typeof t === "string" && KEY_RE.test(t)).slice(0, max) as string[];
}

// Turns whatever the client sent into a bounded, well-typed context. The
// client is the source of truth for WHAT exists in this project, but not
// for sizes or shapes — every list and string is capped here so a
// hand-crafted request can't blow up the prompt (or the bill).
export function parseSiteContext(body: Record<string, unknown>): SiteContext {
  const variantOptions: Record<string, string[]> = {};
  if (body.variantOptions && typeof body.variantOptions === "object" && !Array.isArray(body.variantOptions)) {
    for (const [k, v] of Object.entries(body.variantOptions as Record<string, unknown>).slice(0, MAX_TYPES)) {
      if (KEY_RE.test(k)) variantOptions[k] = strList(v, 10);
    }
  }
  const textFields: Record<string, string> = {};
  if (body.textFields && typeof body.textFields === "object" && !Array.isArray(body.textFields)) {
    for (const [k, v] of Object.entries(body.textFields as Record<string, unknown>)) {
      if (!Object.prototype.hasOwnProperty.call(TEXT_FIELD_LIMITS, k)) continue;
      const cleaned = cleanText(typeof v === "string" ? v : "", TEXT_FIELD_LIMITS[k], k === "about");
      textFields[k] = cleaned ?? "";
    }
  }
  const fonts: { key: string; name: string }[] = [];
  if (Array.isArray(body.fonts)) {
    for (const f of (body.fonts as unknown[]).slice(0, MAX_FONTS)) {
      const key = typeof f === "string" ? f : (f && typeof f === "object" ? (f as Record<string, unknown>).key : null);
      const name = (f && typeof f === "object") ? cleanText((f as Record<string, unknown>).name, 40) : null;
      if (typeof key === "string" && KEY_RE.test(key) && !fonts.some((x) => x.key === key)) fonts.push({ key, name: name || key });
    }
  }
  const services: ServiceItem[] = [];
  if (Array.isArray(body.services)) {
    for (const s of (body.services as unknown[]).slice(0, MAX_SERVICES + 8)) {
      const o = (s && typeof s === "object") ? s as Record<string, unknown> : {};
      services.push({
        name: cleanText(o.name, SERVICE_LIMITS.name) ?? "",
        desc: cleanText(o.desc, SERVICE_LIMITS.desc) ?? "",
        price: cleanText(o.price, SERVICE_LIMITS.price) ?? "",
      });
    }
  }
  const img = (body.images && typeof body.images === "object") ? body.images as Record<string, unknown> : {};
  const galleryRaw = Number(img.gallery);
  return {
    availableTypes: strList(body.availableTypes, MAX_TYPES),
    activeTypes: strList(body.activeTypes, MAX_TYPES),
    variantOptions,
    textFields,
    fonts,
    services,
    images: { hero: img.hero === true, gallery: Number.isFinite(galleryRaw) ? Math.max(0, Math.min(20, Math.floor(galleryRaw))) : 0 },
    siteLang: body.siteLang === "en" ? "en" : "he",
  };
}

function isIndex(v: unknown, length: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < length;
}

// Checks ONE op against the context. Returns the cleaned op (only the
// whitelisted keys, normalized values) or null. `claimed` tracks what
// earlier ops in the same answer already touched, so two ops can never
// fight over the same thing (two colours, the same field twice, the same
// service edited and removed, two structural changes computed from the
// same starting order...).
export function validateOp(raw: unknown, ctx: SiteContext, claimed: Set<string>): Op | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const op = typeof o.op === "string" ? o.op : "";
  if (!KNOWN_OPS.has(op)) return null;

  const claim = (key: string): boolean => {
    if (claimed.has(key)) return false;
    claimed.add(key);
    return true;
  };

  // Structural ops are each computed from the ORIGINAL section order, so
  // only one of them can be applied safely per answer.
  if (STRUCTURAL_OPS.has(op) && claimed.has("structure")) return null;

  if (op === "setVariant") {
    const type = o.type, variant = o.variant;
    if (typeof type !== "string" || !Object.prototype.hasOwnProperty.call(ctx.variantOptions, type)) return null;
    if (typeof variant !== "string" || ctx.variantOptions[type].indexOf(variant) === -1) return null;
    if (!claim("variant:" + type)) return null;
    return { op, type, variant };
  }

  if (op === "addSection") {
    const type = o.type;
    if (typeof type !== "string" || ctx.availableTypes.indexOf(type) === -1) return null;
    if (ctx.activeTypes.indexOf(type) !== -1) return null;
    claim("structure");
    return { op, type };
  }

  if (op === "removeSection") {
    const type = o.type;
    if (typeof type !== "string" || ctx.activeTypes.indexOf(type) === -1) return null;
    if (type === "hero") return null;
    claim("structure");
    return { op, type };
  }

  if (op === "reorder") {
    const order = o.order;
    if (!Array.isArray(order) || order.length !== ctx.activeTypes.length) return null;
    if (!order.every((t) => typeof t === "string")) return null;
    const sortedOrder = [...order].sort();
    const sortedActive = [...ctx.activeTypes].sort();
    if (!sortedOrder.every((v, i) => v === sortedActive[i])) return null;
    claim("structure");
    return { op, order: [...order] };
  }

  if (op === "setColor") {
    const color = normalizeHex(o.color);
    if (!color || !claim("color")) return null;
    return { op, color };
  }

  if (op === "setFont") {
    const font = o.font;
    if (typeof font !== "string" || !ctx.fonts.some((f) => f.key === font)) return null;
    if (!claim("font")) return null;
    return { op, font };
  }

  if (op === "setText") {
    const field = o.field;
    if (typeof field !== "string" || !Object.prototype.hasOwnProperty.call(TEXT_FIELD_LIMITS, field)) return null;
    if (!Object.prototype.hasOwnProperty.call(ctx.textFields, field)) return null;
    const value = cleanText(o.value, TEXT_FIELD_LIMITS[field], field === "about");
    if (value === null) return null;
    if (!value && TEXT_FIELDS_REQUIRED.has(field)) return null;
    if (value && field === "email" && !EMAIL_RE.test(value)) return null;
    if (value && (field === "phone" || field === "whatsapp") && (!PHONE_RE.test(value) || !/[0-9]{5,}/.test(value.replace(/\D/g, "")))) return null;
    if (value === ctx.textFields[field]) return null; // no-op
    if (!claim("text:" + field)) return null;
    return { op, field, value };
  }

  if (op === "addService") {
    const name = cleanText(o.name, SERVICE_LIMITS.name);
    if (!name) return null;
    const desc = cleanText(o.desc, SERVICE_LIMITS.desc) ?? "";
    const price = cleanText(o.price, SERVICE_LIMITS.price) ?? "";
    const added = [...claimed].filter((k) => k.startsWith("svcAdd:")).length;
    if (ctx.services.filter((s) => s.name).length + added >= MAX_SERVICES) return null;
    if (!claim("svcAdd:" + name.toLowerCase())) return null;
    return { op, name, desc, price };
  }

  if (op === "editService") {
    if (!isIndex(o.index, ctx.services.length)) return null;
    const out: Op = { op, index: o.index };
    let changed = false;
    for (const k of ["name", "desc", "price"] as const) {
      if (o[k] === undefined || o[k] === null) continue;
      const v = cleanText(o[k], SERVICE_LIMITS[k]);
      if (v === null) return null;
      if (k === "name" && !v) return null; // use removeService to delete one
      if (v !== ctx.services[o.index][k]) changed = true;
      out[k] = v;
    }
    if (!changed || !claim("svc:" + o.index)) return null;
    return out;
  }

  if (op === "removeService") {
    if (!isIndex(o.index, ctx.services.length)) return null;
    // The builder always keeps at least one service row (its own remove
    // buttons refuse the last one) — same rule here.
    const removed = [...claimed].filter((k) => k.startsWith("svcDel:")).length;
    if (ctx.services.length - removed <= 1) return null;
    if (claimed.has("svc:" + o.index)) return null;
    claim("svc:" + o.index);
    claim("svcDel:" + o.index);
    return { op, index: o.index };
  }

  if (op === "removeImage") {
    const target = o.target;
    if (target === "hero" && !ctx.images.hero) return null;
    if (target === "gallery" && !ctx.images.gallery) return null;
    if (target !== "hero" && target !== "gallery") return null;
    if (!claim("img:" + target)) return null;
    return { op, target };
  }

  return null;
}

// What the command CAN do, in the UI language — appended to every
// "unsupported" answer so a refusal always points somewhere useful.
export function capabilitiesHint(uiLang: "he" | "en"): string {
  return uiLang === "en"
    ? "I can: change the main color or the font, rewrite texts (title, tagline, about, headings, contact details), add/edit/remove services, reorder/add/remove sections, switch a section's style, or remove an image."
    : "אני יכול: לשנות את הצבע הראשי או את הגופן, לכתוב מחדש טקסטים (כותרת, שורת תיאור, אודות, כותרות, פרטי קשר), להוסיף/לערוך/להסיר שירותים, לשנות סדר/להוסיף/להסיר חלקים, להחליף סגנון תצוגה, או להסיר תמונה.";
}

export function imageUploadHint(uiLang: "he" | "en"): string {
  return uiLang === "en"
    ? "I can't upload or pick a new picture from a text command. To replace an image, open Site settings → \"Images & media\" and upload one there (I can remove the current image if you'd like)."
    : "אני לא יכול להעלות או לבחור תמונה חדשה מפקודת טקסט. כדי להחליף תמונה, פתחו את הגדרות האתר ← \"תמונות ומדיה\" והעלו תמונה משם (אם תרצו, אני יכול להסיר את התמונה הנוכחית).";
}

function unsupportedResult(why: string, uiLang: "he" | "en", reason: string) {
  if (reason === "image") return { op: "unsupported", reason, explanation: imageUploadHint(uiLang) };
  const lead = why || (uiLang === "en" ? "That isn't something I can do here." : "את זה אני לא יכול לעשות כאן.");
  return { op: "unsupported", reason: "other", explanation: `${lead} ${capabilitiesHint(uiLang)}` };
}

// The whole answer: {ops:[...], explanation} (or a legacy single
// {op:...}) -> either {op:"unsupported", explanation} or
// {op:<single op's name, or "batch">, ops:[validated...], explanation,
// skipped}. A single op is also spread at the top level so an older,
// still-cached client that only knows result.op/result.type keeps
// working for the four structural ops it understands.
export function validateCommandResult(raw: unknown, ctx: SiteContext, uiLang: "he" | "en" = "he"): Record<string, unknown> {
  const obj = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw as Record<string, unknown> : {};
  const explanation = cleanText(obj.explanation, 200) || "";
  let rawOps: unknown[] = [];
  if (Array.isArray(obj.ops)) rawOps = obj.ops;
  else if (typeof obj.op === "string") rawOps = [obj];

  const unsupportedEntry = rawOps.find((r) => r && typeof r === "object" && (r as Record<string, unknown>).op === "unsupported") as Record<string, unknown> | undefined;
  const reason = (obj.reason === "image" || (unsupportedEntry && unsupportedEntry.reason === "image")) ? "image" : "other";
  const why = cleanText(unsupportedEntry ? unsupportedEntry.explanation : obj.explanation, 200) || "";

  const claimed = new Set<string>();
  const ops: Op[] = [];
  let skipped = 0;
  for (const r of rawOps.slice(0, MAX_OPS)) {
    if (r && typeof r === "object" && (r as Record<string, unknown>).op === "unsupported") continue;
    const v = validateOp(r, ctx, claimed);
    if (v) ops.push(v); else skipped++;
  }
  skipped += Math.max(0, rawOps.filter((r) => !(r && typeof r === "object" && (r as Record<string, unknown>).op === "unsupported")).length - MAX_OPS);

  if (!ops.length) return unsupportedResult(rawOps.length && !unsupportedEntry ? "" : why, uiLang, reason);
  // A partly-doable request ("make it blue and replace the photo") still
  // tells the person about the part that wasn't done.
  if (unsupportedEntry) skipped++;
  const result: Record<string, unknown> = ops.length === 1 ? { ...ops[0] } : { op: "batch" };
  result.ops = ops;
  result.explanation = explanation;
  result.skipped = skipped;
  if (skipped && reason === "image") result.note = imageUploadHint(uiLang);
  return result;
}
