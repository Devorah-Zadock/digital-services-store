/* Section Library — add-able sections for every template.
   Loaded after js/site-templates.js and js/site-blocks.js; pure data +
   string rendering, no DOM, so it runs the same in the builder, admin and
   Node tests.

   Data model (all additive — a project without these fields renders
   exactly as before):
     d.sections = { [id]: { type, variant, content: {...},
                            styles?: { [fieldPath]: { size, color, align, font, weight } } } }
     d.blockOrder[page] may hold "x:<id>" next to the built-in type keys.
   Only the home page ("index") renders blockOrder today (about/contact
   pages are fixed per template), so custom sections show on the home page.

   Editor markers on every rendered library section:
     <section id="sec-<id>" data-dk-sec="<id>" data-dk-type="<type>">
     data-dk-field="<path>"  editable text (title, body, items.2.q, button.label)
     data-dk-img="<path>"    image (images.0, image)
     data-dk-btn="<path>"    button whose settings live at <path> (button, buttonLabel)
     data-dk-item="<arrayPath>.<idx>"  one list item (items.1, images.3)
     data-dk-video="url"     the video frame/placeholder
     data-dk-empty           (preview only) an empty text field kept clickable
   Contact details shown inside a section use the same data-dk-bind
   markers as the templates (see site-templates.js).

   Placeholders (photo tiles with no photo yet, a video with no link, an
   inline lead form the account can't deliver) render ONLY when the page is
   rendered with opts.preview === true (SITE_RENDER_PREVIEW) — never on the
   published site. */

/* ---------- Theme tokens: one per template, read from its own CSS ---------- */
const DKS_SERIF = "'Frank Ruhl Libre',serif";
function dksLightTokens(o) {
  return Object.assign({ dark: false, bg: "#FFFFFF", alt: "$ice", text: "#1E1E1E", heading: "$primaryDark", muted: "#5F6368",
    surface: "#FFFFFF", border: "#ECECEC", bw: "1px", shadow: "0 12px 28px rgba(0,0,0,.06)", radius: "16px",
    hfont: "inherit", hweight: "800", btnRadius: "999px", btnBorder: "transparent", btnShadow: "0 10px 24px rgba(0,0,0,.14)" }, o);
}
function dksDarkTokens(o) {
  return Object.assign({ dark: true, bg: "#0E0E10", alt: "rgba(255,255,255,.03)", text: "#F1F0EC", heading: "#FFFFFF", muted: "#A9A8A2",
    surface: "rgba(255,255,255,.05)", border: "rgba(255,255,255,.12)", bw: "1px", shadow: "none", radius: "16px",
    hfont: "inherit", hweight: "800", btnRadius: "999px", btnBorder: "transparent", btnShadow: "none" }, o);
}
/* "$primary" / "$primaryDark" / "$ice" resolve against derivePalette(d.primaryColor)
   at render time (siteThemeTokensFor); the accent itself always comes from there. */
const SITE_THEME_TOKENS = {
  "local-service": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", border: "#EFEFEF" }),
  "freelancer": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", radius: "20px" }),
  "catalog": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", radius: "14px", border: "#EEEEEE" }),
  "gallery": dksLightTokens({ hfont: DKS_SERIF, hweight: "900", radius: "4px", border: "#EAEAEA", shadow: "none", btnRadius: "4px", heading: "#1E1E1E" }),
  "bold": dksLightTokens({ text: "#111111", heading: "#111111", muted: "#444444", border: "#111111", bw: "3px", shadow: "6px 6px 0 #111111",
    radius: "0px", btnRadius: "0px", btnBorder: "#111111", btnShadow: "4px 4px 0 #111111", hweight: "900" }),
  "elegant": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", border: "#E7E2D8", radius: "6px", shadow: "none", muted: "#6B6B6B" }),
  "process": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", border: "#EEEEEE" }),
  "portfolio": dksLightTokens({ border: "#EDEDED", radius: "0px", shadow: "none", heading: "#1E1E1E" }),
  "boutique": dksLightTokens({ hfont: DKS_SERIF, hweight: "700", radius: "12px", border: "#EEEEEE" }),
  "noir": dksDarkTokens({ bg: "#0E0E0E", alt: "#151513", text: "#EDEAE3", heading: "#EDEAE3", muted: "#C9C4B8", surface: "#151513",
    border: "#2A2A28", radius: "2px", btnRadius: "2px", hfont: DKS_SERIF, hweight: "700" }),
  "studio": dksDarkTokens({ bg: "#0C0C0E", alt: "#111113", text: "#F1F0EC", heading: "#F1F0EC", muted: "#9C9B96", surface: "#131315",
    border: "#232321", radius: "0px" }),
  "bento": dksLightTokens({ radius: "24px", border: "#EFEFEF", shadow: "0 4px 18px rgba(0,0,0,.05)", heading: "#111111", alt: "#F6F6F4" }),
  "cinematic": dksDarkTokens({ bg: "#050505", alt: "rgba(255,255,255,.025)", text: "#EDEDED", muted: "#AFAFAF", surface: "rgba(255,255,255,.045)",
    border: "rgba(255,255,255,.1)", radius: "20px" }),
  "brutal": dksLightTokens({ bg: "$ice", alt: "#FFFFFF", text: "#000000", heading: "#000000", muted: "#333333", surface: "#FFFFFF",
    border: "#000000", bw: "4px", shadow: "7px 7px 0 #000000", radius: "0px", btnRadius: "0px", btnBorder: "#000000", btnShadow: "5px 5px 0 #000000", hweight: "900" }),
  "neon": dksDarkTokens({ bg: "#0A0518", alt: "rgba(255,255,255,.03)", text: "#F0EAFF", muted: "#B9AFDB", surface: "rgba(255,255,255,.05)",
    border: "rgba(255,255,255,.12)", radius: "20px", btnShadow: "0 10px 30px rgba(124,92,255,.35)" }),
  "chaos": dksLightTokens({ bg: "#F5F2E8", alt: "#FFFFFF", text: "#0A0A0A", heading: "#0A0A0A", muted: "#333333", border: "#0A0A0A",
    bw: "3px", shadow: "none", radius: "18px", btnBorder: "#0A0A0A", btnShadow: "none", hweight: "900" }),
  "luxury3d": dksLightTokens({ bg: "#FAF8F4", alt: "#F3EFE7", text: "#2A2620", heading: "#2A2620", muted: "#6B6458", border: "#DCD3C0",
    shadow: "none", radius: "0px", btnRadius: "0px", btnShadow: "none", hfont: DKS_SERIF, hweight: "500" }),
  "playground": dksDarkTokens({ bg: "#0F1020", alt: "rgba(255,255,255,.03)", text: "#F2F1FA", muted: "#B8B6D0", surface: "rgba(255,255,255,.06)",
    border: "rgba(255,255,255,.12)", radius: "24px", hweight: "900" }),
};
SITE_THEME_TOKENS["blank"] = SITE_THEME_TOKENS["local-service"];

function siteThemeTokensFor(template, pal) {
  const base = SITE_THEME_TOKENS[template] || SITE_THEME_TOKENS["local-service"];
  const p = pal || derivePalette("#2563EB");
  const res = (v) => (typeof v === "string" && v.charAt(0) === "$" && p[v.slice(1)]) ? "#" + p[v.slice(1)] : v;
  const out = {};
  Object.keys(base).forEach((k) => { out[k] = res(base[k]); });
  out.accent = "#" + p.primary;
  out.accentDark = "#" + p.primaryDark;
  out.accentSoft = "#" + p.ice;
  // Accent as TEXT must stay readable on the section background.
  out.accentText = base.dark ? "#" + p.ice : "#" + p.primaryDark;
  return out;
}

/* ---------- Library ---------- */
const SITE_SECTION_LIBRARY = [
  { type: "gallery", icon: "🖼️", label: { he: "גלריית תמונות", en: "Photo gallery" }, category: { he: "מדיה", en: "Media" },
    variants: { grid: { label: { he: "רשת", en: "Grid" } }, masonry: { label: { he: "פסיפס", en: "Masonry" } } } },
  { type: "textImage", icon: "📰", label: { he: "טקסט ותמונה", en: "Text & image" }, category: { he: "תוכן", en: "Content" },
    variants: { split: { label: { he: "מפוצל", en: "Split" } }, overlap: { label: { he: "כרטיס על תמונה", en: "Overlap card" } } } },
  { type: "features", icon: "✨", label: { he: "יתרונות", en: "Features" }, category: { he: "תוכן", en: "Content" },
    variants: { cards: { label: { he: "כרטיסים", en: "Cards" } }, list: { label: { he: "רשימה עם אייקונים", en: "Icon list" } } } },
  { type: "testimonials", icon: "💬", label: { he: "המלצות", en: "Testimonials" }, category: { he: "אמון", en: "Social proof" },
    variants: { cards: { label: { he: "כרטיסים", en: "Cards" } }, spotlight: { label: { he: "זרקור", en: "Spotlight" } } } },
  { type: "faq", icon: "❓", label: { he: "שאלות נפוצות", en: "FAQ" }, category: { he: "אמון", en: "Social proof" },
    variants: { accordion: { label: { he: "אקורדיון", en: "Accordion" } }, columns: { label: { he: "שני טורים", en: "Two columns" } } } },
  { type: "cta", icon: "📣", label: { he: "קריאה לפעולה", en: "Call to action" }, category: { he: "המרה", en: "Conversion" },
    variants: { banner: { label: { he: "באנר", en: "Banner" } }, card: { label: { he: "כרטיס", en: "Card" } } } },
  { type: "video", icon: "🎬", label: { he: "סרטון", en: "Video" }, category: { he: "מדיה", en: "Media" },
    variants: { wide: { label: { he: "רחב", en: "Wide" } }, split: { label: { he: "כרטיס מפוצל", en: "Split card" } } } },
  { type: "richText", icon: "📝", label: { he: "טקסט חופשי", en: "Text" }, category: { he: "תוכן", en: "Content" },
    variants: { column: { label: { he: "טור קריאה", en: "Reading column" } }, highlight: { label: { he: "מודגש", en: "Highlight" } } } },
  { type: "leadForm", icon: "📨", label: { he: "טופס לידים", en: "Lead form" }, category: { he: "המרה", en: "Conversion" },
    variants: { split: { label: { he: "פרטים + טופס", en: "Details + form" } }, card: { label: { he: "כרטיס ממורכז", en: "Centered card" } } } },
];
const SITE_SECTION_BY_TYPE = {};
SITE_SECTION_LIBRARY.forEach((e) => { SITE_SECTION_BY_TYPE[e.type] = e; });

function siteSectionTypeKnown(type) {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(SITE_SECTION_BY_TYPE, type);
}
function dksVariantOf(sec) {
  const entry = SITE_SECTION_BY_TYPE[sec.type];
  const keys = Object.keys(entry.variants);
  return keys.indexOf(sec.variant) !== -1 ? sec.variant : keys[0];
}

/* lead-intake refuses (404 "site") every site whose owner isn't let into
   DeskKit Automate, and an owner outside it couldn't see the enquiry
   anyway — so the inline form is offered only where it can deliver,
   exactly like the floating "השאירו פרטים" switch. */
function siteLeadFormDeliverable() {
  return typeof DK_AUTOMATE_ENABLED !== "undefined" && DK_AUTOMATE_ENABLED === true;
}
function siteSectionsAvailable(template) {
  if (typeof isTemplateMigrated === "function" && !isTemplateMigrated(template)) return [];
  return SITE_SECTION_LIBRARY.filter((e) => e.type !== "leadForm" || siteLeadFormDeliverable());
}

/* ---------- Default content (in the site's own language) ---------- */
function dksWithLang(d, fn) {
  const prev = SITE_RENDER_EN;
  SITE_RENDER_EN = !!(d && d.siteLang === "en");
  try { return fn(); } finally { SITE_RENDER_EN = prev; }
}
function dksDefaultCtaAction(d) {
  if (d && whatsAppLink(d)) return { kind: "whatsapp", value: "" };
  if (d && d.phone) return { kind: "tel", value: "" };
  if (d && d.email) return { kind: "email", value: "" };
  return { kind: "scroll", value: "" };
}
function siteSectionDefaultContent(d, type) {
  return dksWithLang(d, () => {
    const T = siteTr;
    switch (type) {
      case "gallery":
        return { title: T("רגעים מהעבודה שלנו", "Moments from our work"),
          images: [0, 1, 2, 3, 4, 5].map(() => ({ src: "", alt: T("תמונה מהגלריה", "Gallery photo") })) };
      case "textImage":
        return { title: T("הסיפור שלנו", "Our story"),
          body: T("התחלנו מתוך אהבה אמיתית למקצוע, והיום אנחנו מלווים לקוחות בכל שלב — מהשיחה הראשונה ועד התוצאה הסופית.\nכל פרויקט מקבל אצלנו יחס אישי, תכנון מדויק ועמידה בלוחות זמנים.",
            "We started out of a genuine love for the craft, and today we guide our clients through every step — from the first conversation to the final result.\nEvery project gets personal attention, careful planning and on-time delivery."),
          image: { src: "", alt: "", fit: "cover", ratio: "4:3" }, imageSide: "end" };
      case "features":
        return { title: T("למה לבחור בנו", "Why choose us"), items: [
          { icon: "⭐", title: T("ניסיון מוכח", "Proven experience"), text: T("שנים של עבודה מקצועית ומאות לקוחות מרוצים שחוזרים אלינו שוב.", "Years of professional work and hundreds of happy clients who keep coming back.") },
          { icon: "⏱️", title: T("עמידה בזמנים", "Always on time"), text: T("אנחנו מתחייבים ללוח זמנים ברור — ועומדים בו.", "We commit to a clear schedule — and we stick to it.") },
          { icon: "🤝", title: T("יחס אישי", "Personal attention"), text: T("זמינים לכל שאלה, מקשיבים באמת ומתאימים את הפתרון בדיוק לכם.", "Available for every question, we truly listen and tailor the solution to you.") },
        ] };
      case "testimonials":
        return { title: T("מה הלקוחות שלנו אומרים", "What our clients say"), items: [
          { quote: T("שירות מקצועי, אדיב ומהיר. קיבלנו בדיוק את מה שהובטח, ואפילו יותר.", "Professional, friendly and fast. We got exactly what was promised — and more."), name: T("מיכל לוי", "Sarah Miller"), role: T("לקוחה פרטית", "Private client") },
          { quote: T("מהשיחה הראשונה הרגשנו שאנחנו בידיים טובות. ממליצים בחום!", "From the very first call we knew we were in good hands. Highly recommended!"), name: T("יוסי כהן", "David Cohen"), role: T("בעל עסק", "Business owner") },
          { quote: T("תשומת לב לכל פרט קטן, ותוצאה שמדברת בעד עצמה.", "Attention to every little detail, and a result that speaks for itself."), name: T("רונית אברהם", "Emma Brooks"), role: T("לקוחה חוזרת", "Returning client") },
        ] };
      case "faq":
        return { title: T("שאלות נפוצות", "Frequently asked questions"), items: [
          { q: T("איך מתחילים?", "How do we get started?"), a: T("פשוט פונים אלינו בטלפון, בוואטסאפ או דרך האתר. נחזור אליכם בהקדם לשיחת היכרות קצרה ונבין יחד מה אתם צריכים.", "Just reach out by phone, WhatsApp or through the website. We’ll get back to you shortly for a quick intro call to understand what you need.") },
          { q: T("כמה זמן לוקח לקבל הצעת מחיר?", "How long does a quote take?"), a: T("ברוב המקרים תקבלו הצעת מחיר מסודרת תוך יום עסקים אחד מרגע שקיבלנו את כל הפרטים.", "In most cases you’ll get a detailed quote within one business day of receiving all the details.") },
          { q: T("באילו אזורים אתם עובדים?", "Which areas do you serve?"), a: T("אנחנו נותנים שירות בכל רחבי האזור. ספרו לנו איפה אתם ונבדוק יחד את האפשרויות.", "We serve the whole region. Tell us where you are and we’ll check the options together.") },
          { q: T("אילו אמצעי תשלום אתם מקבלים?", "Which payment methods do you accept?"), a: T("אפשר לשלם בכרטיס אשראי, בהעברה בנקאית או באפליקציות התשלום המקובלות.", "Credit card, bank transfer and the common payment apps.") },
        ] };
      case "cta":
        return { title: T("מוכנים להתחיל?", "Ready to get started?"),
          text: T("דברו איתנו עוד היום ונבנה יחד את הפתרון שמתאים בדיוק לכם.", "Talk to us today and we’ll build the solution that fits you best."),
          button: { label: T("דברו איתנו", "Talk to us"), action: dksDefaultCtaAction(d) } };
      case "video":
        return { title: T("הכירו אותנו מקרוב", "Get to know us"), url: "" };
      case "richText":
        return { title: T("קצת יותר עלינו", "A little more about us"),
          body: T("אנחנו מאמינים ששירות טוב מתחיל בהקשבה. לפני כל עבודה אנחנו לוקחים את הזמן להבין את הצרכים, את התקציב ואת לוחות הזמנים שלכם.\n\nהמטרה שלנו פשוטה: שתצאו מרוצים, ושתרצו לחזור ולהמליץ עלינו לחברים.",
            "We believe great service starts with listening. Before any job we take the time to understand your needs, your budget and your timeline.\n\nOur goal is simple: that you leave happy — and want to come back and recommend us to your friends.") };
      case "leadForm":
        return { title: T("השאירו פרטים ונחזור אליכם", "Leave your details and we’ll get back to you"),
          subtitle: T("ממלאים כמה פרטים, ואנחנו חוזרים אליכם בהקדם — בלי התחייבות.", "Fill in a few details and we’ll get back to you shortly — no obligation."),
          fields: { phone: "required", email: "optional", message: "optional" },
          buttonLabel: T("שליחה", "Send"),
          successText: T("תודה! הפרטים התקבלו ונחזור אליכם בהקדם.", "Thank you! We’ve received your details and will get back to you soon.") };
      default:
        return {};
    }
  });
}

/* ---------- Small helpers ---------- */
const DKS_FORBIDDEN_KEYS = ["__proto__", "constructor", "prototype"];
function dksPathParts(path) {
  const parts = String(path || "").split(".").filter((p) => p !== "");
  return parts.some((p) => DKS_FORBIDDEN_KEYS.indexOf(p) !== -1) ? null : parts;
}
function dksGet(obj, path) {
  const parts = dksPathParts(path);
  if (!parts) return undefined;
  let cur = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
    cur = cur[p];
  }
  return cur;
}
function dksStr(v) { return typeof v === "string" ? v : (typeof v === "number" ? String(v) : ""); }
function dksArr(v) { return Array.isArray(v) ? v : []; }
function dksIdOk(id) { return typeof id === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(id); }

/* Per-field style: the same rules as textStyleCss()/textStyleAttr() (font,
   colour, size, alignment via alignStyleParts) plus weight — every value
   validated, since it lands inside a style attribute. */
function siteSectionStyleCss(s) {
  if (!s || typeof s !== "object") return "";
  const parts = [];
  if (s.font && typeof SITE_FONTS === "object" && Object.prototype.hasOwnProperty.call(SITE_FONTS, s.font)) parts.push(`font-family:${SITE_FONTS[s.font].stack}`);
  if (s.color && /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s.color))) parts.push(`color:#${String(s.color).replace("#", "")}`);
  const size = Number(s.size);
  if (s.size && isFinite(size) && size >= 8 && size <= 160) parts.push(`font-size:${Math.round(size)}px`);
  const w = String(s.weight || "");
  if (/^(?:[1-9]00|normal|bold)$/.test(w)) parts.push(`font-weight:${w}`);
  const aligned = s.align === "right" || s.align === "left" || s.align === "center";
  if (aligned) parts.push(...alignStyleParts(s.align));
  if (typeof siteTextExtraParts === "function") parts.push(...siteTextExtraParts({ lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, maxWidth: s.maxWidth }, aligned));
  return parts.join(";");
}
/* What the editor may set per field (js/builder-shell.js reads this). */
const SITE_SECTION_STYLE_PROPS = {
  text: ["size", "color", "align", "font", "weight", "lineHeight", "letterSpacing", "maxWidth"],
  button: ["bg", "color", "size", "radius"],
  image: ["fit", "ratio", "focal"],
};
/* A button's own look (styles[path] = { bg, color, size, radius }) —
   the same validated rules as the hero button (siteCtaStyleParts). */
function dksBtnStyleAttr(sec, path) {
  const st = sec.styles && typeof sec.styles === "object" ? sec.styles[path] : null;
  const parts = st && typeof siteCtaStyleParts === "function" ? siteCtaStyleParts(st) : [];
  return parts.length ? ` style="${escapeHtmlS(parts.join(";"))}"` : "";
}
/* A photo's frame (styles[path] = { fit, ratio, focal }) — whitelisted by
   siteImageStyle(); applied inline on the <img>. */
function dksImgStyleAttr(sec, path) {
  const st = sec.styles && typeof sec.styles === "object" && typeof siteImageStyle === "function" ? siteImageStyle(sec.styles[path]) : null;
  if (!st) return "";
  const p = [];
  if (st.fit) p.push(`object-fit:${st.fit}`);
  if (st.ratio) p.push(`aspect-ratio:${st.ratio}`, "height:auto");
  if (st.focal) p.push(`object-position:${st.focal}`);
  return p.length ? ` style="${p.join(";")}"` : "";
}
function dksStyleAttr(sec, path) {
  const css = siteSectionStyleCss(sec.styles && typeof sec.styles === "object" ? sec.styles[path] : null);
  return css ? ` style="${escapeHtmlS(css)}"` : "";
}
/* One editable text element. Empty → nothing on the published site; in
   the editor preview an empty, still-clickable element with a hint. */
function dksText(sec, path, tag, cls, opts) {
  const raw = dksStr(dksGet(sec.content, path));
  const html = opts && opts.multiline ? nl2brS(raw) : escapeHtmlS(raw);
  const clsAttr = cls ? ` class="${cls}"` : "";
  if (!raw.trim()) {
    if (!SITE_RENDER_PREVIEW) return "";
    return `<${tag}${clsAttr} data-dk-field="${escapeHtmlS(path)}" data-dk-empty data-dk-ph="${escapeHtmlS(siteTr("הקלידו כאן…", "Type here…"))}"${dksStyleAttr(sec, path)}></${tag}>`;
  }
  return `<${tag}${clsAttr} data-dk-field="${escapeHtmlS(path)}"${dksStyleAttr(sec, path)}>${html}</${tag}>`;
}
/* Image sources: http(s), our own relative paths, or an inline raster
   data: URL — never javascript:/other schemes. */
function dksSafeSrc(src) {
  const s = dksStr(src).trim();
  if (!s) return "";
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/i.test(s)) return s;
  if (/^(?:\.?\/)?[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(s) && s.indexOf("..") === -1) return s;
  return "";
}
function dksImg(sec, path, img, cls, phIcon) {
  const src = dksSafeSrc(img && img.src);
  const alt = escapeHtmlS(dksStr(img && img.alt));
  if (src) return `<img class="${cls}" src="${escapeHtmlS(src)}" alt="${alt}" loading="lazy" data-dk-img="${escapeHtmlS(path)}"${dksImgStyleAttr(sec, path)}>`;
  if (!SITE_RENDER_PREVIEW) return "";
  return `<div class="${cls} dks-ph" role="img" aria-label="${alt || escapeHtmlS(siteTr("מקום לתמונה", "Image placeholder"))}" data-dk-img="${escapeHtmlS(path)}"><span aria-hidden="true">${phIcon || "🖼️"}</span></div>`;
}
/* Where a CTA button goes. Empty value for tel/whatsapp/email falls back
   to the site's own d.phone / whatsAppLink(d) / d.email. */
function dksActionHref(d, action) {
  const a = action && typeof action === "object" ? action : {};
  const v = dksStr(a.value).trim();
  switch (a.kind) {
    case "tel": {
      const n = (v || dksStr(d.phone)).replace(/[^\d+]/g, "");
      return n ? { href: "tel:" + n, bind: v ? "" : "phone" } : null;
    }
    case "whatsapp": {
      const href = v ? waLink(v) : whatsAppLink(d);
      return href ? { href, external: true, bind: v ? "" : "whatsapp" } : null;
    }
    case "email": {
      const e = v || dksStr(d.email);
      return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(e) ? { href: "mailto:" + e, bind: v ? "" : "email" } : null;
    }
    case "scroll":
      return { href: /^[A-Za-z][\w-]*$/.test(v) ? "#" + v : "#", scroll: true };
    case "link": {
      if (/^https?:\/\/[^\s"'<>]+$/i.test(v)) return { href: v, external: true };
      if (/^(?:mailto|tel):[^\s"'<>]+$/i.test(v)) return { href: v };
      if (/^#[A-Za-z][\w-]*$/.test(v)) return { href: v, scroll: true };
      const page = v.match(/^(index|about|contact)\.html$/);
      if (page) return { href: v, page: page[1] };
      return null;
    }
    default:
      return null;
  }
}
function dksButton(d, sec, path, cls) {
  const btn = dksGet(sec.content, path) || {};
  const label = dksStr(btn.label);
  const target = dksActionHref(d, btn.action);
  if (!SITE_RENDER_PREVIEW && (!label.trim() || !target)) return "";
  const t = target || { href: "#" };
  const attrs = [`class="${cls}"`, `href="${escapeHtmlS(t.href)}"`, `data-dk-btn="${escapeHtmlS(path)}"`];
  if (t.external) attrs.push('target="_blank" rel="noopener"');
  if (t.page) attrs.push(`data-site-nav data-page="${t.page}"`);
  if (t.scroll) attrs.push("data-dks-scroll");
  if (t.bind) attrs.push(`data-dk-bind="${t.bind}" data-dk-bind-as="href"`);
  return `<a ${attrs.join(" ")}${dksBtnStyleAttr(sec, path)}>${dksText(sec, path + ".label", "span", "", null) || ""}</a>`;
}

/* ---------- Shared CSS (once per page) ---------- */
function dksBaseCss(tk) {
  return `
.dks{--dks-bg:${tk.bg};--dks-alt:${tk.alt};--dks-text:${tk.text};--dks-heading:${tk.heading};--dks-muted:${tk.muted};--dks-surface:${tk.surface};
--dks-border:${tk.border};--dks-bw:${tk.bw};--dks-shadow:${tk.shadow};--dks-radius:${tk.radius};--dks-hfont:${tk.hfont};--dks-hweight:${tk.hweight};
--dks-btn-radius:${tk.btnRadius};--dks-btn-border:${tk.btnBorder};--dks-btn-shadow:${tk.btnShadow};
--dks-accent:${tk.accent};--dks-accent-dark:${tk.accentDark};--dks-accent-soft:${tk.accentSoft};--dks-accent-text:${tk.accentText};
--dks-r:var(--border-radius,var(--dks-radius));
background:var(--dks-bg);color:var(--dks-text);padding-block:clamp(52px,8vw,96px);line-height:1.65;text-align:start;overflow-wrap:break-word;word-break:break-word;}
.dks *,.dks *::before,.dks *::after{box-sizing:border-box;}
.dks-wrap{max-width:1080px;margin-inline:auto;padding-inline:clamp(16px,4vw,28px);}
.dks-head{max-width:720px;margin:0 auto clamp(26px,4vw,44px);text-align:center;}
.dks-h{font-family:var(--font-family-headings,var(--dks-hfont));font-weight:var(--dks-hweight);font-size:clamp(26px,calc(1.6vw + 18px),40px);line-height:1.2;letter-spacing:-.01em;margin:0;color:var(--dks-heading);}
.dks-sub{color:var(--dks-muted);font-size:clamp(15.5px,calc(.5vw + 13.5px),18px);margin:12px 0 0;}
.dks-body{font-size:clamp(15.5px,calc(.4vw + 14px),17.5px);margin:0;}
.dks-card{background:var(--dks-surface);border:var(--dks-bw) solid var(--dks-border);border-radius:var(--dks-r);box-shadow:var(--dks-shadow);}
.dks-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;max-width:100%;padding:12px 28px;border-radius:var(--dks-btn-radius);
background:var(--accent-color,var(--dks-accent));color:var(--accent-text,#fff);border:var(--dks-bw) solid var(--dks-btn-border);box-shadow:var(--dks-btn-shadow);
font:inherit;font-size:16px;font-weight:800;line-height:1.2;text-align:center;text-decoration:none;cursor:pointer;transition:filter .15s ease;}
.dks-btn:hover{filter:brightness(1.08) saturate(1.05);}
.dks a:focus-visible,.dks button:focus-visible,.dks summary:focus-visible,.dks input:focus-visible,.dks textarea:focus-visible{outline:3px solid var(--dks-accent-text);outline-offset:3px;}
.dks-ph{display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--dks-accent-soft),var(--dks-accent));color:#fff;font-size:30px;}
.dks-ph span{opacity:.85;filter:drop-shadow(0 2px 6px rgba(0,0,0,.2));}
.dks [data-dk-empty]{min-height:1.4em;min-width:4em;}
.dks [data-dk-empty]::before{content:attr(data-dk-ph);opacity:.4;font-style:italic;}
@media (prefers-reduced-motion:reduce){.dks *{transition:none !important;}}`;
}
/* In-page "scroll to" buttons: handled here instead of relying on native
   #anchor navigation, which a srcdoc preview resolves against the
   editor's own URL (see previewNavScript in site-templates.js). */
function dksBaseScript() {
  return `<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[data-dks-scroll]");if(!a)return;var id=(a.getAttribute("href")||"").slice(1);e.preventDefault();var t=id?document.getElementById(id):null;if(t)t.scrollIntoView({behavior:"smooth",block:"start"});else window.scrollTo({top:0,behavior:"smooth"});});</script>`;
}

const DKS_TYPE_CSS = {
  gallery: `
.dks-gal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:clamp(10px,1.6vw,18px);margin:0;padding:0;list-style:none;}
.dks-gal-grid .dks-gal-it{margin:0;aspect-ratio:4/3;overflow:hidden;border-radius:var(--dks-r);border:var(--dks-bw) solid var(--dks-border);box-shadow:var(--dks-shadow);}
.dks-gal-grid .dks-gal-img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease;}
.dks-gal-it:hover .dks-gal-img{transform:scale(1.04);}
.dks-gal-mas{columns:3 240px;column-gap:clamp(10px,1.6vw,18px);margin:0;padding:0;list-style:none;}
.dks-gal-mas .dks-gal-it{margin:0 0 clamp(10px,1.6vw,18px);break-inside:avoid;overflow:hidden;border-radius:var(--dks-r);border:var(--dks-bw) solid var(--dks-border);}
.dks-gal-mas .dks-gal-img{width:100%;height:auto;transition:transform .5s ease;}
.dks-gal-mas .dks-gal-it:nth-child(3n+1) .dks-ph{aspect-ratio:3/4;}
.dks-gal-mas .dks-gal-it:nth-child(3n+2) .dks-ph{aspect-ratio:4/3;}
.dks-gal-mas .dks-gal-it:nth-child(3n) .dks-ph{aspect-ratio:1/1;}`,
  textImage: `
.dks-ti-split{display:grid;gap:clamp(24px,4vw,56px);align-items:center;}
@media (min-width:860px){.dks-ti-split.has-img{grid-template-columns:1fr 1fr;}.dks-ti-split.side-start .dks-ti-media{order:-1;}}
.dks-ti-text .dks-h{margin-bottom:16px;}
.dks-ti-text .dks-body{color:var(--dks-text);opacity:.92;}
.dks-ti-media{overflow:hidden;border-radius:var(--dks-r);box-shadow:var(--dks-shadow);}
.dks-ti-img{width:100%;height:100%;}
.dks-ti-media.r-1-1{aspect-ratio:1/1;}.dks-ti-media.r-4-3{aspect-ratio:4/3;}.dks-ti-media.r-16-9{aspect-ratio:16/9;}.dks-ti-media.r-auto .dks-ph{aspect-ratio:4/3;}
.dks-ti-media.fit-cover .dks-ti-img{object-fit:cover;}.dks-ti-media.fit-contain .dks-ti-img{object-fit:contain;background:var(--dks-alt);}
.dks-ti-ov .dks-ti-media{box-shadow:none;}
.dks-ti-ov .dks-ti-card{position:relative;padding:clamp(22px,4vw,44px);max-width:600px;}
.dks-ti-ov.has-img .dks-ti-card{margin-top:clamp(-120px,-9vw,-36px);margin-inline:clamp(12px,4vw,48px);}
@media (min-width:860px){.dks-ti-ov.side-end .dks-ti-card{margin-inline-start:auto;}.dks-ti-ov.side-start .dks-ti-card{margin-inline-end:auto;}}
.dks-ti-ov .dks-ti-card .dks-h{margin-bottom:14px;}`,
  features: `
.dks-ft-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:clamp(14px,2vw,22px);}
.dks-ft-cards .dks-ft-it{padding:clamp(22px,3vw,30px);}
.dks-ft-ic{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:calc(var(--dks-r) * .75 + 6px);background:var(--dks-accent-soft);font-size:26px;line-height:1;margin-bottom:16px;}
.dks-ft-t{font-size:clamp(17px,calc(.4vw + 15px),19.5px);font-weight:800;margin:0 0 6px;color:var(--dks-heading);}
.dks-ft-x{margin:0;color:var(--dks-muted);font-size:15px;}
.dks-ft-list{display:grid;gap:0 clamp(24px,4vw,56px);margin:0;padding:0;list-style:none;}
@media (min-width:760px){.dks-ft-list{grid-template-columns:1fr 1fr;}}
.dks-ft-list .dks-ft-it{display:flex;gap:16px;align-items:flex-start;padding:20px 0;border-bottom:1px solid var(--dks-border);}
.dks-ft-list .dks-ft-ic{flex:none;margin:0;width:44px;height:44px;font-size:22px;background:transparent;border:2px solid var(--dks-accent);}
.dks-ft-list .dks-ft-body{min-width:0;}`,
  testimonials: `
.dks-ts-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:clamp(14px,2vw,22px);}
.dks-ts-cards .dks-ts-it{margin:0;padding:clamp(22px,3vw,30px);display:flex;flex-direction:column;gap:18px;}
.dks-ts-mark{font-family:Georgia,serif;font-size:54px;line-height:.6;color:var(--dks-accent-text);height:24px;}
.dks-ts-q{margin:0;font-size:16px;flex:1;}
.dks-ts-who{display:flex;align-items:center;gap:12px;}
.dks-ts-av{flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--dks-accent);color:#fff;font-weight:800;}
.dks-ts-n{font-weight:800;margin:0;color:var(--dks-heading);}
.dks-ts-r{margin:0;font-size:13.5px;color:var(--dks-muted);}
.dks-ts-spot{max-width:860px;margin-inline:auto;text-align:center;}
.dks-ts-spot .dks-ts-main{margin:0 0 clamp(28px,4vw,44px);}
.dks-ts-spot .dks-ts-main .dks-ts-q{font-family:var(--font-family-headings,var(--dks-hfont));font-size:clamp(21px,calc(1.4vw + 15px),31px);line-height:1.45;font-weight:600;color:var(--dks-heading);}
.dks-ts-spot .dks-ts-main .dks-ts-who{justify-content:center;margin-top:22px;}
.dks-ts-spot .dks-ts-mark{display:block;margin-bottom:18px;font-size:72px;height:36px;}
.dks-ts-rest{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;text-align:start;}
.dks-ts-rest .dks-ts-it{margin:0;padding:20px 22px;display:flex;flex-direction:column;gap:14px;}`,
  faq: `
.dks-fq-acc{max-width:820px;margin-inline:auto;display:grid;gap:12px;}
.dks-fq-it{padding:0;overflow:hidden;}
.dks-fq-it summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px clamp(16px,3vw,24px);font-weight:800;font-size:clamp(16px,calc(.3vw + 15px),18px);color:var(--dks-heading);}
.dks-fq-it summary::-webkit-details-marker{display:none;}
.dks-fq-pm{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--dks-accent-soft);color:var(--dks-accent-dark);font-weight:800;transition:transform .2s ease;}
.dks-fq-it[open] .dks-fq-pm{transform:rotate(45deg);}
.dks-fq-a{margin:0;padding:0 clamp(16px,3vw,24px) 20px;color:var(--dks-muted);}
.dks-fq-cols{display:grid;gap:clamp(22px,4vw,56px);}
@media (min-width:860px){.dks-fq-cols{grid-template-columns:minmax(0,1fr) minmax(0,2fr);}}
.dks-fq-cols .dks-head{text-align:start;margin:0;}
.dks-fq-grid{display:grid;gap:0 clamp(20px,3vw,40px);margin:0;}
@media (min-width:640px){.dks-fq-grid{grid-template-columns:1fr 1fr;}}
.dks-fq-pair{padding:18px 0;border-top:2px solid var(--dks-border);}
.dks-fq-pair dt{font-weight:800;color:var(--dks-heading);margin:0 0 6px;}
.dks-fq-pair dd{margin:0;color:var(--dks-muted);}`,
  cta: `
.dks-cta-banner{background:linear-gradient(135deg,var(--dks-accent-dark),var(--accent-color,var(--dks-accent)));color:#fff;text-align:center;}
.dks-cta-banner .dks-h{color:#fff;}
.dks-cta-banner .dks-sub{color:#fff;opacity:.9;margin-inline:auto;max-width:640px;}
.dks-cta-banner .dks-btn{background:#fff;color:var(--dks-accent-dark);margin-top:26px;}
.dks-cta-card{max-width:880px;margin-inline:auto;padding:clamp(26px,5vw,52px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px 32px;border-inline-start:6px solid var(--accent-color,var(--dks-accent));}
.dks-cta-card .dks-cta-txt{flex:1 1 320px;min-width:0;}`,
  video: `
.dks-vd-wide .site-video-wrap{max-width:900px;}
.dks-vd-ph{position:relative;max-width:900px;margin:0 auto;aspect-ratio:16/9;border-radius:var(--dks-r);display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;
background:linear-gradient(135deg,#111,#2b2b2b);color:#fff;text-align:center;padding:16px;}
.dks-vd-ph b{display:flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background:var(--dks-accent);font-size:24px;}
.dks-vd-ph span{font-size:14px;opacity:.85;}
.dks-vd-split{display:grid;gap:clamp(20px,3vw,40px);align-items:center;padding:clamp(18px,3vw,32px);}
@media (min-width:860px){.dks-vd-split{grid-template-columns:minmax(0,2fr) minmax(0,3fr);}}
.dks-vd-split .site-video-wrap,.dks-vd-split .dks-vd-ph{max-width:none;margin:0;width:100%;}`,
  richText: `
.dks-rt-col{max-width:720px;margin-inline:auto;}
.dks-rt-col .dks-h{margin-bottom:18px;}
.dks-rt-hl{max-width:860px;margin-inline:auto;padding:clamp(24px,5vw,52px);border-inline-start:6px solid var(--accent-color,var(--dks-accent));}
.dks-rt-hl .dks-h{margin-bottom:16px;}
.dks-rt-hl .dks-body{font-size:clamp(16.5px,calc(.6vw + 14px),20px);line-height:1.7;}`,
  leadForm: `
.dks-lf-grid{display:grid;gap:clamp(24px,4vw,56px);align-items:start;}
@media (min-width:860px){.dks-lf-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);}}
.dks-lf-intro .dks-h{margin-bottom:12px;}
.dks-lf-contact{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:10px;}
.dks-lf-contact li{display:flex;gap:10px;align-items:center;}
.dks-lf-contact a{color:inherit;text-decoration:underline;text-underline-offset:3px;}
.dks-lf-card{max-width:600px;margin-inline:auto;}
.dks-lf-card .dks-head{margin-bottom:22px;}
.dks-lf-form{padding:clamp(20px,4vw,34px);display:grid;gap:14px;}
.dks-lf-f{display:grid;gap:6px;}
.dks-lf-f label{font-weight:700;font-size:14.5px;}
.dks-lf-f label small{font-weight:500;color:var(--dks-muted);}
.dks-lf-f input,.dks-lf-f textarea{width:100%;font:inherit;font-size:16px;padding:12px 14px;border-radius:calc(var(--dks-r) * .5 + 4px);border:1.5px solid var(--dks-border);background:var(--dks-bg);color:var(--dks-text);}
.dks-lf-f textarea{min-height:110px;resize:vertical;}
.dks-lf-f input[aria-invalid="true"],.dks-lf-f textarea[aria-invalid="true"]{border-color:#D92D20;}
.dks-lf-err{font-size:13.5px;color:#D92D20;min-height:0;}
.dks.is-dark .dks-lf-err,.dks.is-dark .dks-lf-msg.err{color:#FDA29B;}
.dks-lf-hp{position:absolute;inset-inline-start:-9999px;width:1px;height:1px;overflow:hidden;}
.dks-lf-form .dks-btn{width:100%;}
.dks-lf-form .dks-btn[disabled]{opacity:.6;cursor:default;}
.dks-lf-msg{font-size:15px;min-height:1.2em;}
.dks-lf-msg.err{color:#B42318;}.dks-lf-msg.ok{color:var(--dks-accent-text);font-weight:700;}
.dks-lf-note{font-size:12.5px;color:var(--dks-muted);margin:0;}
.dks-lf-pv{font-size:13px;padding:10px 12px;border-radius:10px;background:var(--dks-accent-soft);color:#1E1E1E;margin:0;}`,
};

/* ---------- Renderers: (d, sec, ctx) → inner HTML ---------- */
function dksHead(sec, cls) {
  const title = dksText(sec, "title", "h2", "dks-h", null);
  return title ? `<div class="dks-head${cls ? " " + cls : ""}">${title}</div>` : "";
}
const DKS_RENDER = {
  gallery(d, sec, v) {
    const items = dksArr(sec.content.images).map((img, i) => {
      const media = dksImg(sec, `images.${i}`, img, "dks-gal-img", "🖼️");
      return media ? `<li class="dks-gal-it" data-dk-item="images.${i}">${media}</li>` : "";
    }).join("");
    if (!items) return null;
    return `<div class="dks-wrap">${dksHead(sec)}<ul class="${v === "masonry" ? "dks-gal-mas" : "dks-gal-grid"}">${items}</ul></div>`;
  },
  textImage(d, sec, v) {
    const c = sec.content;
    const img = c.image && typeof c.image === "object" ? c.image : {};
    const ratio = ({ "1:1": "r-1-1", "4:3": "r-4-3", "16:9": "r-16-9" })[img.ratio] || "r-auto";
    const fit = img.fit === "contain" ? "fit-contain" : "fit-cover";
    const media = dksImg(sec, "image", img, "dks-ti-img", "📷");
    const side = c.imageSide === "start" ? "side-start" : "side-end";
    const mediaHtml = media ? `<div class="dks-ti-media ${ratio} ${fit}">${media}</div>` : "";
    const text = `${dksText(sec, "title", "h2", "dks-h", null)}${dksText(sec, "body", "p", "dks-body", { multiline: true })}`;
    if (!text && !mediaHtml) return null;
    if (v === "overlap") {
      return `<div class="dks-wrap"><div class="dks-ti-ov ${side}${mediaHtml ? " has-img" : ""}">${mediaHtml}${text ? `<div class="dks-ti-card dks-card">${text}</div>` : ""}</div></div>`;
    }
    return `<div class="dks-wrap"><div class="dks-ti-split ${side}${mediaHtml ? " has-img" : ""}"><div class="dks-ti-text">${text}</div>${mediaHtml}</div></div>`;
  },
  features(d, sec, v) {
    const items = dksArr(sec.content.items).map((it, i) => {
      const p = `items.${i}`;
      const icon = dksText(sec, `${p}.icon`, "span", "dks-ft-ic", null);
      const body = `${dksText(sec, `${p}.title`, "h3", "dks-ft-t", null)}${dksText(sec, `${p}.text`, "p", "dks-ft-x", { multiline: true })}`;
      if (!icon && !body) return "";
      return v === "list"
        ? `<li class="dks-ft-it" data-dk-item="${p}">${icon}<div class="dks-ft-body">${body}</div></li>`
        : `<div class="dks-ft-it dks-card" data-dk-item="${p}">${icon}${body}</div>`;
    }).join("");
    const head = dksHead(sec);
    if (!items && !head) return null;
    return `<div class="dks-wrap">${head}${v === "list" ? `<ul class="dks-ft-list">${items}</ul>` : `<div class="dks-ft-cards">${items}</div>`}</div>`;
  },
  testimonials(d, sec, v) {
    const one = (it, i, cls) => {
      const p = `items.${i}`;
      const quote = dksText(sec, `${p}.quote`, "blockquote", "dks-ts-q", { multiline: true });
      const name = dksStr(it && it.name).trim();
      const who = `${dksText(sec, `${p}.name`, "p", "dks-ts-n", null)}${dksText(sec, `${p}.role`, "p", "dks-ts-r", null)}`;
      if (!quote && !who) return "";
      const initial = name ? escapeHtmlS(Array.from(name)[0]) : "";
      return `<figure class="${cls}" data-dk-item="${p}"><span class="dks-ts-mark" aria-hidden="true">“</span>${quote}${who ? `<figcaption class="dks-ts-who">${initial ? `<span class="dks-ts-av" aria-hidden="true">${initial}</span>` : ""}<div>${who}</div></figcaption>` : ""}</figure>`;
    };
    const items = dksArr(sec.content.items);
    const head = dksHead(sec);
    if (v === "spotlight") {
      const main = items.length ? one(items[0], 0, "dks-ts-main") : "";
      const rest = items.slice(1).map((it, i) => one(it, i + 1, "dks-ts-it dks-card")).join("");
      if (!main && !rest && !head) return null;
      return `<div class="dks-wrap">${head}<div class="dks-ts-spot">${main}${rest ? `<div class="dks-ts-rest">${rest}</div>` : ""}</div></div>`;
    }
    const cards = items.map((it, i) => one(it, i, "dks-ts-it dks-card")).join("");
    if (!cards && !head) return null;
    return `<div class="dks-wrap">${head}<div class="dks-ts-cards">${cards}</div></div>`;
  },
  faq(d, sec, v) {
    const items = dksArr(sec.content.items);
    const head = dksHead(sec);
    if (v === "columns") {
      const pairs = items.map((it, i) => {
        const p = `items.${i}`;
        const q = dksText(sec, `${p}.q`, "dt", "", null), a = dksText(sec, `${p}.a`, "dd", "", { multiline: true });
        return q || a ? `<div class="dks-fq-pair" data-dk-item="${p}">${q}${a}</div>` : "";
      }).join("");
      if (!pairs && !head) return null;
      return `<div class="dks-wrap"><div class="dks-fq-cols">${head || "<div></div>"}<dl class="dks-fq-grid">${pairs}</dl></div></div>`;
    }
    const acc = items.map((it, i) => {
      const p = `items.${i}`;
      const q = dksText(sec, `${p}.q`, "span", "dks-fq-q", null);
      if (!q) return "";
      return `<details class="dks-fq-it dks-card" data-dk-item="${p}"><summary>${q}<span class="dks-fq-pm" aria-hidden="true">+</span></summary>${dksText(sec, `${p}.a`, "p", "dks-fq-a", { multiline: true })}</details>`;
    }).join("");
    if (!acc && !head) return null;
    return `<div class="dks-wrap">${head}<div class="dks-fq-acc">${acc}</div></div>`;
  },
  cta(d, sec, v) {
    const title = dksText(sec, "title", "h2", "dks-h", null);
    const text = dksText(sec, "text", "p", "dks-sub", { multiline: true });
    const btn = dksButton(d, sec, "button", "dks-btn");
    if (!title && !text && !btn) return null;
    if (v === "card") return `<div class="dks-wrap"><div class="dks-cta-card dks-card"><div class="dks-cta-txt">${title}${text}</div>${btn}</div></div>`;
    return `<div class="dks-wrap">${title}${text}${btn}</div>`;
  },
  video(d, sec, v) {
    const src = videoEmbedSrc(dksStr(sec.content.url));
    let frame;
    if (src) frame = videoEmbedHtml(src).replace('<div class="site-video-wrap"', '<div class="site-video-wrap" data-dk-video="url"');
    else if (SITE_RENDER_PREVIEW) frame = `<div class="dks-vd-ph" data-dk-video="url"><b aria-hidden="true">▶</b><span>${escapeHtmlS(siteTr("הדביקו קישור לסרטון מ-YouTube או Vimeo", "Paste a YouTube or Vimeo link"))}</span></div>`;
    else return null; // no valid video → nothing at all on the published site
    if (v === "split") return `<div class="dks-wrap"><div class="dks-vd-split dks-card"><div>${dksText(sec, "title", "h2", "dks-h", null)}</div>${frame}</div></div>`;
    return `<div class="dks-wrap dks-vd-wide">${dksHead(sec)}${frame}</div>`;
  },
  richText(d, sec, v) {
    const inner = `${dksText(sec, "title", "h2", "dks-h", null)}${dksText(sec, "body", "p", "dks-body", { multiline: true })}`;
    if (!inner) return null;
    return v === "highlight" ? `<div class="dks-wrap"><div class="dks-rt-hl dks-card">${inner}</div></div>` : `<div class="dks-wrap"><div class="dks-rt-col">${inner}</div></div>`;
  },
  leadForm(d, sec, v, id, ctx) {
    const cfg = typeof siteLeadDeliveryConfig === "function" ? siteLeadDeliveryConfig(d) : null;
    if (!cfg && !SITE_RENDER_PREVIEW) return null; // can't deliver → never show a form that goes nowhere
    const fields = siteSectionLeadFields(sec.content.fields);
    const fid = `dks-lf-${id}`;
    const req = `<span aria-hidden="true"> *</span>`;
    const opt = ` <small>${escapeHtmlS(siteTr("(לא חובה)", "(optional)"))}</small>`;
    const field = (name, label, mode, input) => {
      if (mode === "off") return "";
      const inId = `${fid}-${name}`;
      return `<div class="dks-lf-f"><label for="${inId}">${escapeHtmlS(label)}${mode === "required" ? req : opt}</label>${input(inId, mode === "required")}<div class="dks-lf-err" id="${inId}-err" data-dk-err="${name}" aria-live="polite"></div></div>`;
    };
    const attrsFor = (inId, required) => `id="${inId}" aria-describedby="${inId}-err"${required ? ' required aria-required="true"' : ""}`;
    const formFields = [
      field("name", siteTr("שם", "Name"), "required", (i, r) => `<input ${attrsFor(i, r)} name="name" autocomplete="name" maxlength="200">`),
      field("phone", siteTr("טלפון", "Phone"), fields.phone, (i, r) => `<input ${attrsFor(i, r)} name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" dir="ltr">`),
      field("email", siteTr("מייל", "Email"), fields.email, (i, r) => `<input ${attrsFor(i, r)} name="email" type="email" autocomplete="email" maxlength="254" dir="ltr">`),
      field("message", siteTr("במה אפשר לעזור?", "How can we help?"), fields.message, (i, r) => `<textarea ${attrsFor(i, r)} name="message" maxlength="2000"></textarea>`),
    ].join("");
    const biz = (d.businessName || "").trim();
    const to = biz ? escapeHtmlS(biz) : siteTr("בעל/ת העסק", "the business owner");
    const btnLabel = dksText(sec, "buttonLabel", "span", "", null) || escapeHtmlS(siteTr("שליחה", "Send"));
    const hasTitle = !!dksStr(sec.content.title).trim();
    const form = `<form class="dks-lf-form dks-card" id="${fid}" novalidate ${hasTitle ? `aria-labelledby="${fid}-t"` : `aria-label="${escapeHtmlS(siteTr("טופס יצירת קשר", "Contact form"))}"`}>
${cfg ? "" : `<p class="dks-lf-pv">${escapeHtmlS(siteTr("תצוגה מקדימה: הטופס יקבל פניות באתר שפורסם רק כשחשבון DeskKit Automate פעיל.", "Preview: this form takes enquiries on the published site only while DeskKit Automate is active for the account."))}</p>`}
${formFields}
<div class="dks-lf-hp" aria-hidden="true"><label>${siteTr("אתר", "Website")}<input name="website" tabindex="-1" autocomplete="off"></label></div>
${cfg && cfg.sitekey ? `<div data-dk-captcha></div>` : ""}
<button type="submit" class="dks-btn" data-dk-lead-send data-dk-btn="buttonLabel"${dksBtnStyleAttr(sec, "buttonLabel")}>${btnLabel}</button>
<div class="dks-lf-msg" role="status" aria-live="polite" data-dk-lead-msg></div>
<p class="dks-lf-note">${siteTr("בשליחת הטופס אתם מבקשים ש", "By sending this form you ask ")}${to} ${siteTr("יחזרו אליכם בנוגע לפנייה. הפרטים יגיעו אליהם בלבד.", "to get back to you about your enquiry. Your details are sent to them only.")}</p>
</form>`;
    const title = dksText(sec, "title", "h2", "dks-h", null).replace("<h2 ", `<h2 id="${fid}-t" `);
    const subtitle = dksText(sec, "subtitle", "p", "dks-sub", { multiline: true });
    let core = "";
    if (!ctx.emittedStyles.__leadCore) { ctx.emittedStyles.__leadCore = true; core = siteLeadCoreScript(); }
    // Same dkLeadWire as the popup; Turnstile loads on first focus in the form.
    const wire = `<script>(function(){var f=document.getElementById(${siteJsonForScript(fid)});if(!f||!window.dkLeadWire)return;var o=${siteJsonForScript({
      endpoint: cfg ? cfg.endpoint : "", sitekey: cfg ? cfg.sitekey : "", msgClass: "dks-lf-msg",
      successText: dksStr(sec.content.successText).trim(), fields })};o.captchaEl=f.querySelector("[data-dk-captcha]");var api=window.dkLeadWire(f,o);if(o.captchaEl){f.addEventListener("focusin",function(){api.captcha();},{once:true});}})();</script>`;
    let body;
    if (v === "card") {
      body = `<div class="dks-wrap"><div class="dks-lf-card">${title || subtitle ? `<div class="dks-head">${title}${subtitle}</div>` : ""}${form}</div></div>`;
    } else {
      const lines = [];
      if (d.phone) lines.push(`<li><span aria-hidden="true">📞</span><a href="tel:${escapeHtmlS(String(d.phone).replace(/[^\d+]/g, ""))}" data-dk-bind="phone" data-dk-bind-as="href"><span data-dk-bind="phone">${escapeHtmlS(d.phone)}</span></a></li>`);
      if (d.email) lines.push(`<li><span aria-hidden="true">✉️</span><a href="mailto:${escapeHtmlS(d.email)}" data-dk-bind="email" data-dk-bind-as="href"><span data-dk-bind="email">${escapeHtmlS(d.email)}</span></a></li>`);
      if (d.address) lines.push(`<li><span aria-hidden="true">📍</span><span data-dk-bind="address">${escapeHtmlS(d.address)}</span></li>`);
      const wa = whatsAppLink(d);
      if (wa) lines.push(`<li><span aria-hidden="true">💬</span><a href="${escapeHtmlS(wa)}" target="_blank" rel="noopener" data-dk-bind="whatsapp" data-dk-bind-as="href">${escapeHtmlS(siteTr("שליחת הודעה בוואטסאפ", "Message us on WhatsApp"))}</a></li>`);
      body = `<div class="dks-wrap"><div class="dks-lf-grid"><div class="dks-lf-intro">${title}${subtitle}${lines.length ? `<ul class="dks-lf-contact">${lines.join("")}</ul>` : ""}</div>${form}</div></div>`;
    }
    return `${body}${core}${wire}`;
  },
};

/* Inline form field modes, normalized to what lead-intake can accept: it
   always needs a name, and a phone OR an email — so phone and email can't
   both be "off" (both fall back to "optional", and the form then asks for
   at least one of them, exactly like the popup). */
function siteSectionLeadFields(f) {
  const m = (v, dflt) => (v === "required" || v === "optional" || v === "off") ? v : dflt;
  const o = f && typeof f === "object" ? f : {};
  const out = { phone: m(o.phone, "required"), email: m(o.email, "optional"), message: m(o.message, "optional") };
  if (out.phone === "off" && out.email === "off") { out.phone = "optional"; out.email = "optional"; }
  return out;
}

/* ---------- Rendering one instance ---------- */
function siteSectionRenderHtml(d, template, id, ctx) {
  if (!dksIdOk(id)) return "";
  const sections = d && d.sections && typeof d.sections === "object" ? d.sections : null;
  const sec = sections && Object.prototype.hasOwnProperty.call(sections, id) ? sections[id] : null;
  if (!sec || typeof sec !== "object" || !siteSectionTypeKnown(sec.type)) return "";
  const c = ctx || {};
  if (!c.emittedStyles) c.emittedStyles = {};
  const safe = { type: sec.type, content: sec.content && typeof sec.content === "object" ? sec.content : {}, styles: sec.styles };
  const variant = dksVariantOf(sec);
  const inner = DKS_RENDER[sec.type](d, safe, variant, id, c);
  if (inner === null || inner === undefined || inner === "") return "";
  const pal = c.pal || derivePalette(d.primaryColor || "#2563EB");
  const tk = siteThemeTokensFor(c.template || template, pal);
  let styles = "";
  if (!c.emittedStyles.__base) { c.emittedStyles.__base = true; styles += `<style>${dksBaseCss(tk)}</style>${dksBaseScript()}`; }
  if (!c.emittedStyles[sec.type]) { c.emittedStyles[sec.type] = true; styles += `<style>${DKS_TYPE_CSS[sec.type]}</style>`; }
  const cls = `dks dks-${sec.type} dks-v-${variant}${tk.dark ? " is-dark" : ""}${sec.type === "cta" && variant === "banner" ? " dks-cta-banner" : ""}`;
  return `${styles}<section id="sec-${id}" class="${cls}" data-dk-sec="${id}" data-dk-type="${sec.type}">${inner}</section>`;
}

/* ---------- Instance management (pure functions on d) ---------- */
function dksNewId(d) {
  const taken = (d && d.sections) || {};
  for (let n = 0; n < 50; n++) {
    let s = "s";
    for (let i = 0; i < 6; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36));
    if (!Object.prototype.hasOwnProperty.call(taken, s)) return s;
  }
  return "s" + Date.now().toString(36).slice(-6);
}
function dksEnsureSections(d) {
  if (!d.sections || typeof d.sections !== "object" || Array.isArray(d.sections)) d.sections = {};
  return d.sections;
}
function dksClone(v) { return JSON.parse(JSON.stringify(v)); }

function siteSectionCreate(d, type, variant) {
  if (!d || !siteSectionTypeKnown(type)) return null;
  const sections = dksEnsureSections(d);
  const id = dksNewId(d);
  const keys = Object.keys(SITE_SECTION_BY_TYPE[type].variants);
  sections[id] = { type, variant: keys.indexOf(variant) !== -1 ? variant : keys[0], content: siteSectionDefaultContent(d, type) };
  return id;
}
/* Puts orderKey (a built-in type or "x:<id>") at visible position
   atVisibleIndex among the blocks currently shown on that page (hidden
   ones are skipped, like moveBlockUp/Down). Index past the end = last. */
function dksPlace(d, template, page, key, atVisibleIndex) {
  if (typeof key !== "string" || !key) return false;
  const order = typeof ensureBlockOrder === "function" ? ensureBlockOrder(d, template, page) : null;
  if (!order) return false;
  const cur = order.indexOf(key);
  if (cur !== -1) order.splice(cur, 1);
  const active = activeBlocksForPage(d, template, page).filter((k) => k !== key);
  const idx = Number.isFinite(Number(atVisibleIndex)) ? Math.max(0, Math.floor(Number(atVisibleIndex))) : active.length;
  if (idx >= active.length) {
    const after = active.length ? order.indexOf(active[active.length - 1]) + 1 : order.length;
    order.splice(after, 0, key);
  } else {
    order.splice(order.indexOf(active[idx]), 0, key);
  }
  return true;
}
function siteSectionInsert(d, template, page, orderKey, atVisibleIndex) {
  return dksPlace(d, template, page || "index", orderKey, atVisibleIndex);
}
function siteSectionMove(d, template, page, orderKey, toVisibleIndex) {
  const order = typeof ensureBlockOrder === "function" ? ensureBlockOrder(d, template, page || "index") : null;
  if (!order || order.indexOf(orderKey) === -1) return false;
  return dksPlace(d, template, page || "index", orderKey, toVisibleIndex);
}
/* Built-in sections are never deleted — hidden with the same flags the
   Shell writes (bshellToggleSectionVisibility): d.pages[type] for the
   about/contact blocks that move to their own page, d.hiddenBlocks[type]
   for everything else. */
function siteBlockSetVisible(d, template, type, visible) {
  const defs = typeof SITE_BLOCK_DEFS === "object" ? SITE_BLOCK_DEFS[template] : null;
  const def = defs && defs[type];
  if (!def) return false;
  if (def._pagesGate) {
    if (!d.pages || typeof d.pages !== "object") d.pages = { about: false, contact: false };
    d.pages[type] = !visible;
  } else {
    if (!d.hiddenBlocks || typeof d.hiddenBlocks !== "object") d.hiddenBlocks = {};
    if (visible) delete d.hiddenBlocks[type]; else d.hiddenBlocks[type] = true;
  }
  return true;
}
function siteSectionRemove(d, template, page, orderKey) {
  if (typeof isCustomBlockKey === "function" && isCustomBlockKey(orderKey)) {
    const id = orderKey.slice(2);
    if (d.blockOrder && typeof d.blockOrder === "object") {
      Object.keys(d.blockOrder).forEach((p) => {
        if (Array.isArray(d.blockOrder[p])) d.blockOrder[p] = d.blockOrder[p].filter((k) => k !== orderKey);
      });
    }
    if (d.sections && typeof d.sections === "object") delete d.sections[id];
    return true;
  }
  return siteBlockSetVisible(d, template, orderKey, false);
}
/* Custom instances only (a built-in block has one fixed content source).
   Returns the new order key, placed right after the original. */
function siteSectionDuplicate(d, template, page, orderKey) {
  if (typeof isCustomBlockKey !== "function" || !isCustomBlockKey(orderKey)) return null;
  const src = d.sections && d.sections[orderKey.slice(2)];
  if (!src || !siteSectionTypeKnown(src.type)) return null;
  const id = dksNewId(d);
  dksEnsureSections(d)[id] = dksClone(src);
  const key = "x:" + id;
  const active = activeBlocksForPage(d, template, page || "index");
  const at = active.indexOf(orderKey);
  dksPlace(d, template, page || "index", key, at === -1 ? active.length : at + 1);
  return key;
}
function siteSectionSetVariant(d, id, variant) {
  const sec = d && d.sections && d.sections[id];
  if (!sec || !siteSectionTypeKnown(sec.type) || !Object.prototype.hasOwnProperty.call(SITE_SECTION_BY_TYPE[sec.type].variants, variant)) return false;
  sec.variant = variant; // content untouched
  return true;
}
function siteSectionGetField(d, id, path) {
  const sec = d && d.sections && d.sections[id];
  return sec ? dksGet(sec.content, path) : undefined;
}
/* Sets content at a dotted path ("items.2.q", "button.action.kind").
   Arrays accept an index up to their length (= append). */
function siteSectionSetField(d, id, path, value) {
  const sec = d && d.sections && d.sections[id];
  const parts = dksPathParts(path);
  if (!sec || !parts || !parts.length) return false;
  if (!sec.content || typeof sec.content !== "object") sec.content = {};
  let cur = sec.content;
  for (let i = 0; i < parts.length; i++) {
    const key = Array.isArray(cur) ? Number(parts[i]) : parts[i];
    if (Array.isArray(cur) && !(Number.isInteger(key) && key >= 0 && key <= cur.length)) return false;
    if (i === parts.length - 1) { cur[key] = value; return true; }
    if (cur[key] === null || typeof cur[key] !== "object") cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[key];
  }
  return false;
}
/* List helpers for the editor: add a ready-made item (copy of the type's
   default item) / remove one by its data-dk-item path. */
function siteSectionAddItem(d, id, arrayPath, atIndex) {
  const sec = d && d.sections && d.sections[id];
  const arr = sec && dksGet(sec.content, arrayPath);
  if (!Array.isArray(arr)) return -1;
  const defaults = dksGet(siteSectionDefaultContent(d, sec.type), arrayPath);
  const item = Array.isArray(defaults) && defaults.length ? dksClone(defaults[defaults.length > arr.length ? arr.length : 0]) : {};
  const i = Number.isInteger(atIndex) && atIndex >= 0 && atIndex <= arr.length ? atIndex : arr.length;
  arr.splice(i, 0, item);
  return i;
}
function siteSectionRemoveItem(d, id, itemPath) {
  const parts = dksPathParts(itemPath);
  const sec = d && d.sections && d.sections[id];
  if (!sec || !parts || parts.length < 2) return false;
  const arr = dksGet(sec.content, parts.slice(0, -1).join("."));
  const i = Number(parts[parts.length - 1]);
  if (!Array.isArray(arr) || !Number.isInteger(i) || i < 0 || i >= arr.length) return false;
  arr.splice(i, 1);
  // per-field styles of later items would now point at the wrong item: drop that list's styles
  if (sec.styles) Object.keys(sec.styles).forEach((k) => { if (k.indexOf(parts.slice(0, -1).join(".") + ".") === 0) delete sec.styles[k]; });
  return true;
}
function siteSectionSetStyle(d, id, path, style) {
  const sec = d && d.sections && d.sections[id];
  if (!sec || !dksPathParts(path)) return false;
  if (!sec.styles || typeof sec.styles !== "object") sec.styles = {};
  if (style && typeof style === "object" && Object.keys(style).length) sec.styles[path] = style; else delete sec.styles[path];
  return true;
}

const DKS_BUILTIN_LABEL_EN = { hero: "Hero", services: "Services", aboutTags: "About + tags", about: "About", contact: "Contact", grid: "Content grid" };
/* {he, en} name for a hierarchy row. d is needed for "x:" keys (to know
   the instance's type); without it a generic name comes back. */
function siteBlockLabel(template, orderKey, d) {
  if (typeof isCustomBlockKey === "function" && isCustomBlockKey(orderKey)) {
    const sec = d && d.sections && d.sections[orderKey.slice(2)];
    const entry = sec && SITE_SECTION_BY_TYPE[sec.type];
    return entry ? { he: entry.label.he, en: entry.label.en } : { he: "מקטע", en: "Section" };
  }
  const def = SITE_BLOCK_DEFS[template] && SITE_BLOCK_DEFS[template][orderKey];
  if (!def) return { he: String(orderKey || ""), en: String(orderKey || "") };
  return { he: def.label, en: DKS_BUILTIN_LABEL_EN[orderKey] || def.label };
}

/* A complete standalone document showing one section type/variant with
   its default content, in this site's fonts, colours and template theme —
   for the "add section" gallery's thumbnail iframes. Does not touch d. */
function siteSectionPreviewHtml(d, template, type, variant) {
  if (!siteSectionTypeKnown(type)) return "";
  const data = d || {};
  const prev = [SITE_RENDER_EN, SITE_RENDER_DATA, SITE_RENDER_PAGE, SITE_RENDER_PREVIEW];
  SITE_RENDER_EN = data.siteLang === "en";
  SITE_RENDER_DATA = data;
  SITE_RENDER_PAGE = "index";
  SITE_RENDER_PREVIEW = true;
  try {
    const tmp = Object.assign({}, data, { sections: {} });
    const keys = Object.keys(SITE_SECTION_BY_TYPE[type].variants);
    tmp.sections.preview = { type, variant: keys.indexOf(variant) !== -1 ? variant : keys[0], content: siteSectionDefaultContent(data, type) };
    const pal = derivePalette(data.primaryColor || "#2563EB");
    const tk = siteThemeTokensFor(template, pal);
    const body = siteSectionRenderHtml(tmp, template, "preview", { pal, template, emittedStyles: {} });
    const entry = SITE_SECTION_BY_TYPE[type];
    return siteDoc({ title: siteTr(entry.label.he, entry.label.en), description: "", css: `body{background:${tk.bg};color:${tk.text};}`, fontFamily: data.fontFamily }, body);
  } finally {
    [SITE_RENDER_EN, SITE_RENDER_DATA, SITE_RENDER_PAGE, SITE_RENDER_PREVIEW] = prev;
  }
}
