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
  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.textContent = lang === "en" ? "עברית" : "EN";
  try { localStorage.setItem(I18N_LANG_KEY, lang); } catch (err) { /* storage unavailable */ }
  // Reveals the body hidden by index.html's own early inline script (see
  // its comment) — a no-op class removal when that script never hid it
  // (the common, default-Hebrew case) in the first place.
  document.documentElement.classList.remove("lang-pending");
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
