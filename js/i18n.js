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
    nav_login: "כניסה",

    hero_eyebrow: "התחנה הראשונה של העסק שלך",
    hero_h1_line1: "מסמכים עסקיים ואתרי תדמית.", hero_h1_line2: "מעוצבים, מוכנים ובלחיצת כפתור.",
    hero_lead: "בוחרים תבנית, עורכים אונליין בבילדר חי, ומורידים קובץ מוכן ברגע. בלי אותיות קטנות, בלי מנוי חודשי.",
    hero_cta_start: "ליצירה בחינם", hero_cta_how: "איך זה עובד?",

    mq_free: "100% חינם", mq_google: "כניסה מהירה עם Google", mq_pdf: "PDF מיידי",
    mq_langs: "עברית ואנגלית", mq_cv15: "15+ תבניות קורות חיים", mq_decks5: "5 מצגות עסקיות",
    mq_xlsx4: "4 גיליונות Excel", mq_uniquedesign: "עיצוב שונה בכל תבנית", mq_fontcolor: "בחירת גופן וצבע",
    mq_livepreview: "תצוגה חיה בזמן אמת", mq_nosub: "בלי מנוי חודשי", mq_customquotes: "הצעות מחיר מותאמות אישית",
    mq_siteminutes: "אתר עסקי תוך דקות", mq_cloudsave: "שמירה בענן", mq_hebrewsupport: "תמיכה מלאה בעברית",

    tools_h_1: "באיזה כלי", tools_h_2: "תשתמשו היום?", tag_free: "חינם", cta_create: "ליצירה",
    price_onetime: "חד-פעמי", quote_card_title: "הצעת מחיר לעסק שלך",

    spotlight_kicker: "המוצר המשתלם שלנו", spotlight_h2: "בונים לכם אתר עסקי שלם",
    spotlight_p: "וויזארד שממלאים תוך דקות, תצוגה חיה שמתעדכנת תוך כדי מילוי, ובחירה מבין כמה עיצובים — ובסוף מורידים את כל קובצי האתר, מוכנים להעלאה לאוויר.",
    spotlight_li1: "כמה עיצובים מוכנים לבחירה", spotlight_li2: "תצוגה חיה לאורך כל התהליך",
    spotlight_li3: "קובצי אתר מוכנים להורדה — בלי צורך בקוד", spotlight_li4: "תשלום חד-פעמי, בלי מנוי חודשי",
    spotlight_cta: "בניית האתר שלי",
    chip_local: "עסק מקומי", chip_freelancer: "פרילנסר", chip_catalog: "קטלוג",
    price_note: "תשלום חד-פעמי — לא מנוי",

    how_kicker: "איך זה עובד", how_h2: "שלושה צעדים פשוטים",
    step1_title: "בוחרים תבנית", step1_desc: "עוברים על התבניות ובוחרים את מה שמתאים לכם.",
    step2_title: "עורכים ורואים תוצאה חיה", step2_desc: "ממלאים פרטים ובוחרים צבע בבילדר החי.",
    step3_title: "מורידים — חינם", step3_desc: "ה-PDF האישי שלכם מוכן להורדה מיידית — חינם לגמרי.",

    features_kicker: "למה DeskKit", features_h2: "עיצוב שלא נראה כמו כל תבנית אחרת",
    features_p: "כל תבנית בנויה מחדש בפריסה משלה — עמודות, גופנים וסידור שונים לגמרי בין תבנית לתבנית.",
    feat1_title: "עיצוב עכשווי", feat1_desc: "עמודות צד, טיפוגרפיה גדולה, תגיות צבעוניות.",
    feat2_title: "חינם לגמרי", feat2_desc: "עורכים, רואים תוצאה חיה ומורידים PDF.",
    feat3_title: "הצבע שלכם", feat3_desc: "בוחרים צבע ראשי אחד, והבילדר מתאים סביבו את כל העיצוב.",

    footer_blurb: "תבניות עסקיות מוכנות לשימוש מיידי — קורות חיים, מצגות ועוד, בעיצוב מקצועי שחוסך לכם שעות עבודה.",
    footer_nav_heading: "ניווט", footer_info_heading: "מידע",
    footer_guides: "מדריכים", footer_admin: "ניהול", footer_terms: "מדיניות", footer_accessibility: "נגישות",
    footer_copyright: "© 2026 DeskKit. כל הזכויות שמורות.",
  },
  en: {
    nav_home: "Home", nav_sites: "Sites", nav_quotes: "Quotes", nav_cv: "Resumes",
    nav_decks: "Decks", nav_xlsx: "Spreadsheets", nav_about: "About", nav_contact: "Contact",
    nav_login: "Sign in",

    hero_eyebrow: "The first stop for your business",
    hero_h1_line1: "Business documents and websites.", hero_h1_line2: "Designed, ready, one click away.",
    hero_lead: "Pick a template, edit it live online, and download a ready file in seconds. No fine print, no monthly subscription.",
    hero_cta_start: "Start for free", hero_cta_how: "How it works?",

    mq_free: "100% free", mq_google: "Quick sign-in with Google", mq_pdf: "Instant PDF",
    mq_langs: "Hebrew & English", mq_cv15: "15+ resume templates", mq_decks5: "5 business decks",
    mq_xlsx4: "4 Excel spreadsheets", mq_uniquedesign: "Unique design per template", mq_fontcolor: "Choose your font & color",
    mq_livepreview: "Real-time live preview", mq_nosub: "No monthly subscription", mq_customquotes: "Custom price quotes",
    mq_siteminutes: "Business site in minutes", mq_cloudsave: "Cloud save", mq_hebrewsupport: "Full Hebrew support",

    tools_h_1: "Which tool", tools_h_2: "will you use today?", tag_free: "Free", cta_create: "Create",
    price_onetime: "one-time", quote_card_title: "A price quote for your business",

    spotlight_kicker: "Our best-value product", spotlight_h2: "We build your whole business site",
    spotlight_p: "A wizard you fill out in minutes, a live preview that updates as you go, and a choice of several designs — then download all your site files, ready to publish.",
    spotlight_li1: "Several ready-made designs to choose from", spotlight_li2: "Live preview throughout the process",
    spotlight_li3: "Ready-to-use site files — no coding needed", spotlight_li4: "One-time payment, no monthly subscription",
    spotlight_cta: "Build my site",
    chip_local: "Local business", chip_freelancer: "Freelancer", chip_catalog: "Catalog",
    price_note: "One-time payment — not a subscription",

    how_kicker: "How it works", how_h2: "Three simple steps",
    step1_title: "Pick a template", step1_desc: "Browse the templates and choose what fits you.",
    step2_title: "Edit and see a live result", step2_desc: "Fill in your details and pick a color in the live builder.",
    step3_title: "Download — free", step3_desc: "Your personal PDF is ready to download instantly — completely free.",

    features_kicker: "Why DeskKit", features_h2: "Designs that don't look like every other template",
    features_p: "Every template is built from scratch with its own layout — columns, fonts and structure are completely different from one to the next.",
    feat1_title: "Modern design", feat1_desc: "Side columns, bold typography, colorful tags.",
    feat2_title: "Completely free", feat2_desc: "Edit, see a live result, and download a PDF.",
    feat3_title: "Your own color", feat3_desc: "Pick one primary color, and the builder adapts the whole design around it.",

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
}

document.addEventListener("DOMContentLoaded", () => {
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
});
