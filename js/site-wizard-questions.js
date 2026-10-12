/* The smart onboarding Wizard's question model (architecture plan:
   "Template selection is primarily an internal system decision, not a
   mandatory step the user has to understand"). Entirely declarative —
   adding a new question, a new choice option, or a new conditional
   branch is a data change here, never a rewrite of js/site-ai-
   generate.js's step engine that reads this.

   Every question is one of:
     type: "choice"  — a searchable chip grid (see searchable/allowOther)
     type: "text"     — a single-line free input
     type: "textarea" — a multi-line free input

   Fields:
     id        — becomes a key in the answers object the Wizard collects
     label     — the question itself
     type      — see above
     options   — choice only: [{value, label}, ...]
     searchable — choice only: shows a live-filter search box above the chips
     allowOther — choice only: adds an "אחר" chip that reveals a free-text
                  box; its typed value becomes the answer instead of a value
     optional  — shows a "דלג" (skip) action; the Wizard still works if
                 this question is answered with nothing
     condition — (answers) => boolean; only asked when true. Evaluated
                 fresh on every step since later questions can depend on
                 earlier free-text answers too, not just earlier choices.
     maxlength — text/textarea only

   Deliberately NOT one call to AI per question — every question here is
   plain structured data collection (lists, search, conditional
   branches), exactly per the explicit requirement to keep AI calls to
   ONE, at the very end, once the whole structured picture is collected
   (see js/site-ai-generate.js). */

const SITE_WIZARD_QUESTIONS = [
  {
    id: "businessType",
    label: "מה סוג העסק שלך?", labelEn: "What kind of business is it?",
    type: "choice",
    searchable: true,
    allowOther: true,
    options: [
      { value: "restaurant", label: "מסעדה", labelEn: "Restaurant" },
      { value: "cafe", label: "בית קפה", labelEn: "Café" },
      { value: "bakery", label: "מאפייה", labelEn: "Bakery" },
      { value: "hairSalon", label: "מספרה", labelEn: "Hair salon" },
      { value: "beauty", label: "קוסמטיקה / יופי", labelEn: "Beauty / cosmetics" },
      { value: "coach", label: "מאמן/ת", labelEn: "Coach" },
      { value: "therapist", label: "מטפל/ת", labelEn: "Therapist" },
      { value: "fitness", label: "מכון כושר / סטודיו", labelEn: "Gym / studio" },
      { value: "shop", label: "חנות", labelEn: "Shop" },
      { value: "onlineShop", label: "חנות אונליין", labelEn: "Online shop" },
      { value: "photographer", label: "צלם/ת", labelEn: "Photographer" },
      { value: "designer", label: "מעצב/ת", labelEn: "Designer" },
      { value: "lawyer", label: "עורך/ת דין", labelEn: "Lawyer" },
      { value: "accountant", label: "רואה חשבון / הנהלת חשבונות", labelEn: "Accountant / bookkeeping" },
      { value: "realEstate", label: "נדל\"ן", labelEn: "Real estate" },
      { value: "consultant", label: "יועץ/ת עסקי/ת", labelEn: "Business consultant" },
      { value: "contractor", label: "איש מקצוע (חשמלאי, אינסטלטור וכו')", labelEn: "Tradesperson (electrician, plumber, etc.)" },
      { value: "localService", label: "עסק שירות מקומי", labelEn: "Local service business" },
      { value: "other", label: "אחר", labelEn: "Other" },
    ],
  },
  {
    id: "businessName",
    label: "איך קוראים לעסק?", labelEn: "What's the business called?",
    type: "text",
    maxlength: 40,
  },
  {
    id: "description",
    label: "ספרו בכמה מילים מה אתם עושים", labelEn: "Tell us in a few words what you do",
    type: "textarea",
    maxlength: 300,
    placeholder: "מה אתם מציעים, למי, ומה מייחד אתכם...", placeholderEn: "What you offer, to whom, and what makes you different...",
  },
  // --- Conditional, category-specific follow-ups: each business type
  // triggers at most ONE of these, so no one sees more than a single
  // extra question beyond the universal ones above/below. ---
  {
    id: "foodService",
    label: "איך לקוחות מקבלים את ההזמנה?", labelEn: "How do customers get their order?",
    type: "choice",
    condition: (a) => ["restaurant", "cafe", "bakery"].indexOf(a.businessType) !== -1,
    options: [
      { value: "delivery", label: "משלוחים", labelEn: "Delivery" },
      { value: "dineIn", label: "ישיבה במקום", labelEn: "Dine-in" },
      { value: "both", label: "גם וגם", labelEn: "Both" },
      { value: "pickup", label: "איסוף עצמי", labelEn: "Pickup" },
    ],
  },
  {
    id: "appointmentMethod",
    label: "איך לקוחות קובעים תור?", labelEn: "How do clients book an appointment?",
    type: "choice",
    allowOther: true,
    condition: (a) => ["hairSalon", "beauty", "coach", "therapist", "fitness"].indexOf(a.businessType) !== -1,
    options: [
      { value: "phone", label: "טלפון", labelEn: "Phone" },
      { value: "whatsapp", label: "וואטסאפ", labelEn: "WhatsApp" },
      { value: "bookingLink", label: "קישור הזמנה חיצוני", labelEn: "External booking link" },
    ],
  },
  {
    id: "productsOffered",
    label: "אילו מוצרים אתם מוכרים?", labelEn: "What products do you sell?",
    type: "text",
    maxlength: 150,
    condition: (a) => ["shop", "onlineShop"].indexOf(a.businessType) !== -1,
  },
  {
    id: "specialty",
    label: "מה תחום ההתמחות או הסגנון העיקרי?", labelEn: "What's your main specialty or style?",
    type: "text",
    maxlength: 150,
    condition: (a) => ["photographer", "designer", "lawyer", "accountant", "realEstate", "consultant"].indexOf(a.businessType) !== -1,
  },
  // --- Universal tail ---
  {
    id: "goal",
    label: "מה הכי חשוב שהאתר יעשה?", labelEn: "What's the most important thing the site should do?",
    type: "choice",
    searchable: true,
    allowOther: true,
    optional: true,
    options: [
      { value: "contactRequests", label: "שיגרום לאנשים ליצור איתי קשר", labelEn: "Get people to contact me" },
      { value: "bookAppointments", label: "לאפשר קביעת תורים", labelEn: "Let people book appointments" },
      { value: "lookProfessional", label: "שיציג את העסק בצורה מקצועית", labelEn: "Present the business professionally" },
      { value: "showPortfolio", label: "שיציג את העבודות שלי", labelEn: "Show my work" },
      { value: "sellProducts", label: "שימכור מוצרים", labelEn: "Sell products" },
      { value: "explainServices", label: "להסביר מה אני מציע/ה", labelEn: "Explain what I offer" },
      { value: "notSure", label: "עוד לא החלטתי", labelEn: "I haven't decided yet" },
    ],
  },
  // Rendered as visual style swatches, not text chips — see
  // js/site-ai-generate.js's siteWizardStepBodyHtml special-case for
  // question.id === "style". "auto" is the recommended, pre-highlighted
  // option: the AI generator already picks a fitting Design Starting
  // Point on its own, so this question only narrows that choice when
  // someone has an actual preference.
  {
    id: "style",
    label: "איזה סגנון מתאים לכם?", labelEn: "Which style suits you?",
    type: "choice",
    optional: true,
    options: [
      { value: "auto", label: "תנו ל-DeskKit לבחור", labelEn: "Let DeskKit choose" },
      { value: "minimal", label: "מינימליסטי", labelEn: "Minimalist" },
      { value: "luxury", label: "יוקרתי", labelEn: "Luxurious" },
      { value: "bold", label: "נועז", labelEn: "Bold" },
      { value: "warm", label: "חם", labelEn: "Warm" },
      { value: "modern", label: "מודרני", labelEn: "Modern" },
    ],
  },
  {
    id: "sections",
    label: "מה תרצו שיופיע באתר?", labelEn: "What would you like on the site?",
    type: "multiselect",
    optional: true,
    options: [
      { value: "services", label: "שירותים", labelEn: "Services" },
      { value: "about", label: "אודות", labelEn: "About" },
      { value: "testimonials", label: "המלצות", labelEn: "Testimonials" },
      { value: "gallery", label: "גלריה", labelEn: "Gallery" },
      { value: "faq", label: "שאלות נפוצות", labelEn: "FAQ" },
      { value: "contact", label: "יצירת קשר", labelEn: "Contact" },
      { value: "map", label: "מפה", labelEn: "Map" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "hours", label: "שעות פעילות", labelEn: "Opening hours" },
    ],
  },
  {
    id: "targetAudience",
    label: "מי קהל היעד שלכם?", labelEn: "Who's your target audience?",
    type: "text",
    maxlength: 150,
    optional: true,
  },
  {
    id: "extra",
    label: "משהו נוסף שחשוב שנדע?", labelEn: "Anything else we should know?",
    type: "textarea",
    maxlength: 300,
    optional: true,
  },
];

function siteWizardVisibleQuestions(answers) {
  return SITE_WIZARD_QUESTIONS.filter((q) => !q.condition || q.condition(answers));
}

/* Resolves a choice question's stored answer (a value key, or raw "אחר"
   text) back to a human-readable label — used to compose the free-text
   `extra` context sent to generate-site, and for the review step. */
function siteWizardAnswerLabel(question, rawValue) {
  if (!rawValue) return "";
  const opt = (question.options || []).find((o) => o.value === rawValue);
  return opt ? opt.label : String(rawValue);
}

/* English UI: show the English labels (the stored answer values are the
   same in both languages). */
if (typeof currentLang === "function" && currentLang() === "en") {
  SITE_WIZARD_QUESTIONS.forEach((q) => {
    if (q.labelEn) q.label = q.labelEn;
    if (q.placeholderEn) q.placeholder = q.placeholderEn;
    (q.options || []).forEach((o) => { if (o.labelEn) o.label = o.labelEn; });
  });
}
