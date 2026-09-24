/* Site-chrome translation (Hebrew/English), scoped deliberately to
   DeskKit's own marketing/UI text only — a customer's own generated CV,
   site or quote content is never touched by this, on purpose (that's a
   separate, much bigger question the user explicitly said not to include
   here). Rolling out page by page: only pages that load this script and
   carry data-i18n attributes actually translate; everywhere else the
   toggle simply doesn't appear yet.

   Deliberately no framework: every translatable string sits in a plain
   he/en dictionary keyed by data-i18n="key", and applyLang() just swaps
   textContent and flips the document direction — logical CSS properties
   (inset-inline-start/end etc, already used throughout the stylesheet)
   do the layout mirroring for free. */
const I18N = {
  he: {
    nav_home: "בית", nav_sites: "אתרים", nav_quotes: "הצעות מחיר", nav_cv: "קורות חיים",
    nav_decks: "מצגות", nav_xlsx: "גליונות", nav_about: "אודות", nav_contact: "צור קשר",
    nav_login: "כניסה", nav_invoices: "חשבוניות",

    hero_eyebrow: "עריכת קורות חיים · בניית אתרים · הצעות מחיר",
    hero_h1: "מסמכים עסקיים ואתרי תדמית. מעוצבים, מוכנים ובלחיצת כפתור.",
    hero_lead: "בוחרים תבנית, עורכים אונליין בבילדר חי, ומורידים קובץ מוכן ברגע. בלי אותיות קטנות, בלי מנוי חודשי.",
    hero_cta_start: "ליצירה בחינם", hero_cta_how: "איך זה עובד?",

    mq_free: "100% חינם", mq_google: "כניסה מהירה עם Google", mq_pdf: "PDF מיידי",
    mq_langs: "עברית ואנגלית", mq_cv15: "15+ תבניות קורות חיים", mq_decks5: "5 מצגות עסקיות",
    mq_xlsx4: "4 גיליונות Excel", mq_uniquedesign: "עיצוב שונה בכל תבנית", mq_fontcolor: "בחירת גופן וצבע",
    mq_livepreview: "תצוגה חיה בזמן אמת", mq_nosub: "בלי מנוי חודשי", mq_customquotes: "הצעות מחיר מותאמות אישית",
    mq_siteminutes: "אתר עסקי תוך דקות", mq_cloudsave: "שמירה בענן", mq_hebrewsupport: "תמיכה מלאה בעברית",

    tools_h: "מה תרצו לעצב היום?", tag_free: "חינם", cta_create: "בואו נתחיל",
    price_onetime: "חד-פעמי", quote_card_title: "הצעת מחיר לעסק שלך", invoice_card_title: "חשבוניות וקבלות",

    flagship_h2: "אתר תדמית שלם לעסק שלך. בלי קוד, בלי מנוי חודשי.",
    flagship_p: "עונים על מספר שאלות, מעצבים בלייב בבילדר שלנו, ומקבלים אתר תדמית מהיר ומקצועי באוויר. משלמים פעם אחת בלבד – והאתר שלכם לתמיד.",
    flagship_price_note: "תשלום חד-פעמי",
    spotlight_cta: "בניית האתר שלי",

    how_kicker: "איך זה עובד", how_h2: "שלושה צעדים פשוטים",
    step1_title: "בוחרים את התבנית הנכונה", step1_desc: "עוברים על התבניות ובוחרים את מה שמתאים לכם.",
    step2_title: "עורכים ומתאימים לעסק", step2_desc: "ממלאים את התוכן שלכם ובוחרים צבע מותג בבילדר החי.",
    step3_title: "הקובץ שלכם מוכן", step3_desc: "מורידים את המסמך המוכן שלכם או מעלים את האתר לאוויר ברגע.",

    features_kicker: "למה DeskKit", features_h2: "עיצוב ייחודי, בשפה שלך",
    features_intro: "לא עוד תבנית גנרית — כל מסמך ואתר מותאמים אליכם, מהצבעים ועד הטיפוגרפיה.",
    feat1_title: "עיצוב עכשווי", feat1_desc: "עמודות צד, טיפוגרפיה גדולה, תגיות צבעוניות.",
    feat2_title: "כלים פתוחים בחינם", feat2_desc: "עורכים את קורות החיים, המצגות או הצעות המחיר ומורידים PDF ללא עלות.",
    feat3_title: "הצבע שלכם", feat3_desc: "בוחרים צבע ראשי אחד, והבילדר מתאים סביבו את כל המסמך או האתר.",

    footer_blurb: "תבניות עסקיות מוכנות לשימוש מיידי — קורות חיים, מצגות ועוד, בעיצוב מקצועי שחוסך לכם שעות עבודה.",
    footer_nav_heading: "ניווט", footer_info_heading: "מידע",
    footer_guides: "מדריכים", footer_admin: "ניהול", footer_terms: "מדיניות", footer_accessibility: "נגישות",
    footer_copyright: "© 2026 DeskKit. כל הזכויות שמורות.",

    about_title: "אודות — DeskKit",
    about_h1: "קצת עלינו",
    about_lead: "DeskKit נולד מתוך צורך פשוט: לא כל אחד צריך — או רוצה — לשלם על מעצב גרפי בשביל קורות חיים או מצגת אחת.",
    about_p1: "אנחנו בונים תבניות עסקיות בעיצוב מקצועי — קורות חיים, מצגות, ובעתיד גם עוד סוגי מסמכים — כדי שתוכלו להשיג תוצאה ברמה גבוהה תוך דקות, בלי ידע בעיצוב ובלי עלות של פרויקט עיצוב מלא.",
    about_p2: "כל תבנית נבנית בקפידה: פלטת צבעים אחת, פונט אחיד, והיררכיה ויזואלית ברורה — כדי שהתוצאה תיראה כאילו מעצב מקצועי בנה אותה במיוחד עבורכם.",
    about_p3a: "לצד התבניות החינמיות, המוצר המרכזי שלנו הוא ",
    about_p3_link: "בניית אתר עסקי שלם",
    about_p3b: " — עיצוב מקצועי, תצוגה חיה, וקובצי אתר מוכנים להורדה, בתשלום חד-פעמי בלבד.",
    about_kicker: "הערכים שלנו", about_h2: "למה לבחור ב-DeskKit",
    about_feat1_h: "עיצוב שנראה יקר", about_feat1_p: "כל תבנית עוברת חשיבה עיצובית.",
    about_feat2_h: "שירות אישי", about_feat2_p: "יש שאלה או בקשה מיוחדת? אנחנו כאן וזמינים לעזור.",
    about_feat3_h: "קנייה בביטחון", about_feat3_p: "תשלום מאובטח וקבלת הקובץ מיידית, ללא הפתעות.",

    contact_title: "צור קשר — DeskKit",
    contact_h1: "נשמח לשמוע מכם",
    contact_lead: "שאלה על מוצר, בקשה מיוחדת, או משהו לא עבד כמו שציפיתם? כתבו לנו.",
    contact_name: "שם מלא", contact_email: "אימייל", contact_message: "הודעה", contact_submit: "שליחה",
    contact_direct: "אפשר גם ישירות במייל: ",

    tools_title: "כלים לעסק — DeskKit",
    tools_h1: "כלים לעסק שלכם",
    tools_lead: "חשבון אחד, וכל כלי הניהול העסקיים במקום אחד — מתחילים בהצעות מחיר, ומכאן והלאה.",
    tools_quote_p: "נרשמים פעם אחת, שומרים את פרטי העסק והלוגו שלכם, ויוצרים הצעת מחיר מוכנה תוך דקה.",
    tools_new_badge: "חדש!",
    tools_invoice_p: "נרשמים פעם אחת, ומפיקים חשבונית מס-קבלה או קבלה ממוספרת אוטומטית — כולל התאמה לעוסק פטור.",

    products_search_ph: "חיפוש תבנית לפי שם...",
    product_related_kicker: "אולי גם יעניין אתכם", product_related_h2: "תבניות נוספות באותה קטגוריה",
    product_banner_h3: "צריכים גם אתר תדמית?",
    product_banner_p: "בנו אתר תדמית שלם עם תצוגה חיה ועיצוב מקצועי, ותורידו את הקבצים המוכנים תוך דקות.",
    product_banner_cta: "לבניית האתר שלי",
  },
  en: {
    nav_home: "Home", nav_sites: "Sites", nav_quotes: "Quotes", nav_cv: "Resumes",
    nav_decks: "Decks", nav_xlsx: "Spreadsheets", nav_about: "About", nav_contact: "Contact",
    nav_login: "Sign in", nav_invoices: "Invoices",

    hero_eyebrow: "CV Editing · Website Building · Price Quotes",
    hero_h1: "Business documents and websites. Designed, ready, one click away.",
    hero_lead: "Pick a template, edit it live online, and download a ready file in seconds. No fine print, no monthly subscription.",
    hero_cta_start: "Start for free", hero_cta_how: "How it works?",

    mq_free: "100% free", mq_google: "Quick sign-in with Google", mq_pdf: "Instant PDF",
    mq_langs: "Hebrew & English", mq_cv15: "15+ resume templates", mq_decks5: "5 business decks",
    mq_xlsx4: "4 Excel spreadsheets", mq_uniquedesign: "Unique design per template", mq_fontcolor: "Choose your font & color",
    mq_livepreview: "Real-time live preview", mq_nosub: "No monthly subscription", mq_customquotes: "Custom price quotes",
    mq_siteminutes: "Business site in minutes", mq_cloudsave: "Cloud save", mq_hebrewsupport: "Full Hebrew support",

    tools_h: "What would you like to design today?", tag_free: "Free", cta_create: "Let's get started",
    price_onetime: "one-time", quote_card_title: "A price quote for your business", invoice_card_title: "Invoices & receipts",

    flagship_h2: "A complete business site. No code, no monthly subscription.",
    flagship_p: "Answer a few questions, design it live in our builder, and get a fast, professional business site online. Pay once — and the site is yours for good.",
    flagship_price_note: "One-time payment",
    spotlight_cta: "Build my site",

    how_kicker: "How it works", how_h2: "Three simple steps",
    step1_title: "Pick the right template", step1_desc: "Browse the templates and choose what fits you.",
    step2_title: "Edit it for your business", step2_desc: "Fill in your content and pick a brand color in the live builder.",
    step3_title: "Your file is ready", step3_desc: "Download your finished document, or publish your site instantly.",

    features_kicker: "Why DeskKit", features_h2: "Distinctive design, in your own language",
    features_intro: "No generic template — every document and site is tailored to you, from colors to typography.",
    feat1_title: "Modern design", feat1_desc: "Side columns, bold typography, colorful tags.",
    feat2_title: "Free, open tools", feat2_desc: "Edit your resume, decks or price quotes and download a PDF at no cost.",
    feat3_title: "Your own color", feat3_desc: "Pick one primary color, and the builder adapts the whole document or site around it.",

    footer_blurb: "Ready-to-use business templates — resumes, decks and more, professionally designed to save you hours of work.",
    footer_nav_heading: "Navigate", footer_info_heading: "Info",
    footer_guides: "Guides", footer_admin: "Admin", footer_terms: "Policies", footer_accessibility: "Accessibility",
    footer_copyright: "© 2026 DeskKit. All rights reserved.",

    about_title: "About — DeskKit",
    about_h1: "About us",
    about_lead: "DeskKit was born from a simple need: not everyone needs — or wants — to pay a graphic designer for one resume or one deck.",
    about_p1: "We build professionally designed business templates — resumes, decks, and more document types to come — so you can get a high-quality result in minutes, with no design skills and none of the cost of a full design project.",
    about_p2: "Every template is built with care: one color palette, one consistent font, and a clear visual hierarchy — so the result looks like a professional designer made it just for you.",
    about_p3a: "Alongside the free templates, our flagship product is a ",
    about_p3_link: "complete business website",
    about_p3b: " — professional design, a live preview, and ready site files to download, for a single one-time payment.",
    about_kicker: "Our values", about_h2: "Why choose DeskKit",
    about_feat1_h: "Design that looks expensive", about_feat1_p: "Every template goes through real design thinking.",
    about_feat2_h: "Personal service", about_feat2_p: "Have a question or a special request? We're here and happy to help.",
    about_feat3_h: "Buy with confidence", about_feat3_p: "Secure payment and instant file delivery, no surprises.",

    contact_title: "Contact — DeskKit",
    contact_h1: "We'd love to hear from you",
    contact_lead: "A question about a product, a special request, or something that didn't work as expected? Write to us.",
    contact_name: "Full name", contact_email: "Email", contact_message: "Message", contact_submit: "Send",
    contact_direct: "You can also reach us directly by email: ",

    tools_title: "Business tools — DeskKit",
    tools_h1: "Tools for your business",
    tools_lead: "One account, every business management tool in one place — start with price quotes, and go from there.",
    tools_quote_p: "Sign up once, save your business details and logo, and create a ready price quote in a minute.",
    tools_new_badge: "New!",
    tools_invoice_p: "Sign up once, and generate a numbered tax invoice or receipt automatically — including support for Israeli exempt-dealer (osek patur) status.",

    products_search_ph: "Search templates by name...",
    product_related_kicker: "You might also like", product_related_h2: "More templates in the same category",
    product_banner_h3: "Need a business website too?",
    product_banner_p: "Build a complete business website with a live preview and professional design, and download the ready files in minutes.",
    product_banner_cta: "Build my site",
  },
};

const I18N_LANG_KEY = "deskkit_lang";

function applyLang(lang) {
  const dict = I18N[lang] || I18N.he;
  document.documentElement.lang = lang === "en" ? "en" : "he";
  document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (dict[key] !== undefined) el.textContent = dict[key];
  });
  // Same idea as data-i18n, for the one attribute textContent can't
  // reach — an <input placeholder> (e.g. the catalog search box).
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });
  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.textContent = lang === "en" ? "עברית" : "EN";
  try { localStorage.setItem(I18N_LANG_KEY, lang); } catch (err) { /* storage unavailable */ }
  // Reveals the body hidden by index.html's own early inline script (see
  // its comment) — a no-op class removal when that script never hid it
  // (the common, default-Hebrew case) in the first place.
  document.documentElement.classList.remove("lang-pending");
  // Pages with their own JS-rendered content (catalog.js's product grid,
  // hero title/lead per ?type=, etc.) can't be reached by the plain
  // data-i18n sweep above — they listen for this and re-render themselves
  // in the new language instead.
  document.dispatchEvent(new CustomEvent("deskkit:langchange", { detail: { lang } }));
}

function currentLang() {
  try { return localStorage.getItem(I18N_LANG_KEY) || "he"; } catch (err) { return "he"; }
}

// No DOMContentLoaded wrapper needed: this script's own <script> tag
// sits near the end of <body>, after every data-i18n element in the
// document — by the time a plain, non-deferred script tag like this one
// actually executes, everything above it in the HTML is already
// parsed and in the DOM. Waiting for the full document (including
// everything BELOW this point too) to finish parsing only delayed
// applying the real language further, widening the exact flash this
// file exists to prevent.
(() => {
  let stored = "he";
  try { stored = localStorage.getItem(I18N_LANG_KEY) || "he"; } catch (err) { /* storage unavailable */ }
  applyLang(stored);

  const toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = document.documentElement.lang === "en" ? "en" : "he";
      applyLang(current === "en" ? "he" : "en");
    });
  }
})();
