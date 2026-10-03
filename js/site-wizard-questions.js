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
    label: "מה סוג העסק שלך?",
    type: "choice",
    searchable: true,
    allowOther: true,
    options: [
      { value: "restaurant", label: "מסעדה" },
      { value: "cafe", label: "בית קפה" },
      { value: "bakery", label: "מאפייה" },
      { value: "hairSalon", label: "מספרה" },
      { value: "beauty", label: "קוסמטיקה / יופי" },
      { value: "coach", label: "מאמן/ת" },
      { value: "therapist", label: "מטפל/ת" },
      { value: "fitness", label: "מכון כושר / סטודיו" },
      { value: "shop", label: "חנות" },
      { value: "onlineShop", label: "חנות אונליין" },
      { value: "photographer", label: "צלם/ת" },
      { value: "designer", label: "מעצב/ת" },
      { value: "lawyer", label: "עורך/ת דין" },
      { value: "accountant", label: "רואה חשבון / הנהלת חשבונות" },
      { value: "realEstate", label: "נדל\"ן" },
      { value: "consultant", label: "יועץ/ת עסקי/ת" },
      { value: "contractor", label: "איש מקצוע (חשמלאי, אינסטלטור וכו')" },
      { value: "localService", label: "עסק שירות מקומי" },
      { value: "other", label: "אחר" },
    ],
  },
  {
    id: "businessName",
    label: "איך קוראים לעסק?",
    type: "text",
    maxlength: 40,
  },
  {
    id: "description",
    label: "ספרו בכמה מילים מה אתם עושים",
    type: "textarea",
    maxlength: 300,
    placeholder: "מה אתם מציעים, למי, ומה מייחד אתכם...",
  },
  // --- Conditional, category-specific follow-ups: each business type
  // triggers at most ONE of these, so no one sees more than a single
  // extra question beyond the universal ones above/below. ---
  {
    id: "foodService",
    label: "איך לקוחות מקבלים את ההזמנה?",
    type: "choice",
    condition: (a) => ["restaurant", "cafe", "bakery"].indexOf(a.businessType) !== -1,
    options: [
      { value: "delivery", label: "משלוחים" },
      { value: "dineIn", label: "ישיבה במקום" },
      { value: "both", label: "גם וגם" },
      { value: "pickup", label: "איסוף עצמי" },
    ],
  },
  {
    id: "appointmentMethod",
    label: "איך לקוחות קובעים תור?",
    type: "choice",
    allowOther: true,
    condition: (a) => ["hairSalon", "beauty", "coach", "therapist", "fitness"].indexOf(a.businessType) !== -1,
    options: [
      { value: "phone", label: "טלפון" },
      { value: "whatsapp", label: "וואטסאפ" },
      { value: "bookingLink", label: "קישור הזמנה חיצוני" },
    ],
  },
  {
    id: "productsOffered",
    label: "אילו מוצרים אתם מוכרים?",
    type: "text",
    maxlength: 150,
    condition: (a) => ["shop", "onlineShop"].indexOf(a.businessType) !== -1,
  },
  {
    id: "specialty",
    label: "מה תחום ההתמחות או הסגנון העיקרי?",
    type: "text",
    maxlength: 150,
    condition: (a) => ["photographer", "designer", "lawyer", "accountant", "realEstate", "consultant"].indexOf(a.businessType) !== -1,
  },
  // --- Universal tail ---
  {
    id: "goal",
    label: "מה המטרה המרכזית של האתר?",
    type: "choice",
    searchable: true,
    allowOther: true,
    optional: true,
    options: [
      { value: "contactRequests", label: "לקבל פניות / הזמנות" },
      { value: "bookAppointments", label: "לאפשר קביעת תורים" },
      { value: "lookProfessional", label: "להיראות מקצועי ואמין" },
      { value: "showPortfolio", label: "להציג תיק עבודות" },
      { value: "sellProducts", label: "למכור מוצרים" },
      { value: "explainServices", label: "להסביר מה אני מציע/ה" },
    ],
  },
  {
    id: "targetAudience",
    label: "מי קהל היעד שלכם?",
    type: "text",
    maxlength: 150,
    optional: true,
  },
  {
    id: "extra",
    label: "משהו נוסף שחשוב שנדע?",
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
