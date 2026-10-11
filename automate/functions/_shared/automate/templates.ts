// DeskKit Automate — the automation library.
//
// Every automation is defined ONCE here and shared by all businesses; a
// business's own settings live in automations.config. A template is a
// list of steps the worker walks through:
//
//   { kind: "action", action, ... }   do something (email, task, …)
//   { kind: "wait", ... }             continue later (a timestamp, not a process)
//   { kind: "check", check, otherwise }  continue only if still relevant
//
// "otherwise" is what happens when a check is false: "stop" ends the run
// (e.g. the lead was already handled), { skip: n } jumps over n steps.
//
// Texts shown to business owners are Hebrew; English labels are kept for
// the English version of the site.

export type ConfigField =
  | { key: string; type: "int"; label: string; labelEn: string; min: number; max: number; default: number; unit?: string; help?: string }
  | { key: string; type: "bool"; label: string; labelEn: string; default: boolean; help?: string }
  | { key: string; type: "text"; label: string; labelEn: string; default: string; maxLength: number; multiline?: boolean; help?: string; placeholders?: string[] }
  | { key: string; type: "choice"; label: string; labelEn: string; default: string; options: { value: string; label: string; labelEn: string }[]; help?: string }
  | { key: string; type: "url"; label: string; labelEn: string; default: string; required?: boolean; help?: string };

export type Check =
  | "lead_from_form" | "lead_still_new" | "client_ack_allowed" | "quote_pending" | "invoice_unpaid"
  | "has_client_email" | "review_ready" | "onboarding_open" | "second_nudge_on" | "welcome_allowed"
  | "invoice_second_allowed" | "invoice_third_allowed";

export type Step =
  | { key: string; kind: "action"; action: "email_owner"; message: string }
  | { key: string; kind: "action"; action: "email_client"; message: string; approval?: "config" | "never" }
  | { key: string; kind: "action"; action: "create_task"; title: string; dueHours?: number; dueHoursFrom?: string }
  | { key: string; kind: "action"; action: "create_checklist" }
  | { key: string; kind: "action"; action: "mark_contact_won" }
  | { key: string; kind: "action"; action: "digest_owner" }
  | { key: string; kind: "wait"; hours?: number; days?: number; hoursFrom?: string; daysFrom?: string; untilDueDatePlusDaysFrom?: string }
  | { key: string; kind: "check"; check: Check; otherwise: "stop" | { skip: number } };

export type Template = {
  key: string;
  version: number;
  trigger: string;
  subject: "contact" | "quote" | "invoice" | null;
  icon: string;
  name: string; nameEn: string;
  outcome: string; outcomeEn: string;          // the business result, in one line
  howItWorks: string[];                        // plain steps shown before activating
  needs: string[];                             // what must exist for it to work
  category: "sales" | "money" | "service" | "assistant";
  config: ConfigField[];
  steps: Step[];
};

const CLIENT_MESSAGES: ConfigField = {
  key: "client_messages", type: "choice", label: "הודעות ללקוחות", labelEn: "Messages to clients", default: "approve",
  options: [
    { value: "approve", label: "להכין, ולשלוח רק אחרי שאאשר", labelEn: "Prepare, send after I approve" },
    { value: "auto", label: "לשלוח אוטומטית", labelEn: "Send automatically" },
  ],
  help: "במצב אישור, ההודעה מחכה לך במסך \"היום\" עם כפתור שליחה.",
};

export const TEMPLATES: Record<string, Template> = {
  lead_autopilot: {
    key: "lead_autopilot", version: 1, trigger: "lead.created", subject: "contact", icon: "🎯",
    name: "אף פנייה לא נופלת", nameEn: "No lead slips away",
    outcome: "כל פנייה מהאתר מקבלת מענה מיידי, ואת/ה מקבל/ת תזכורת עד שמטפלים בה.",
    outcomeEn: "Every website enquiry gets an instant reply, and you're reminded until it's handled.",
    howItWorks: [
      "פנייה מגיעה מטופס האתר ונשמרת אצלך ברשימת הלקוחות.",
      "את/ה מקבל/ת מייל מיד, עם כפתור לחזור בוואטסאפ או בטלפון.",
      "הפונה מקבל/ת אישור קבלה אוטומטי (אם השאיר/ה מייל).",
      "נוצרת משימה \"לחזור ללקוח\". אם לא סימנת שטיפלת עד הזמן שקבעת — תזכורת.",
      "אם עבר עוד יום בלי טיפול — תזכורת אחרונה, לפני שהליד מתקרר.",
    ],
    needs: ["אתר שנבנה ב-DeskKit עם טופס יצירת קשר"],
    category: "sales",
    config: [
      { key: "response_hours", type: "int", label: "תוך כמה שעות להזכיר לי אם לא טיפלתי", labelEn: "Remind me after (hours)", min: 1, max: 48, default: 2, unit: "שעות" },
      { key: "auto_reply", type: "bool", label: "לשלוח לפונה אישור קבלה אוטומטי", labelEn: "Send an automatic acknowledgement", default: true },
      { key: "auto_reply_text", type: "text", label: "נוסח אישור הקבלה", labelEn: "Acknowledgement text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nתודה שפנית ל{עסק}! קיבלנו את הפנייה שלך ונחזור אלייך בהקדם.",
        placeholders: ["{שם}", "{עסק}"] },
      { key: "second_nudge", type: "bool", label: "תזכורת נוספת אחרי יום אם עדיין לא טופל", labelEn: "Second reminder after a day", default: true },
    ],
    steps: [
      { key: "from_form", kind: "check", check: "lead_from_form", otherwise: { skip: 3 } },
      { key: "notify_owner", kind: "action", action: "email_owner", message: "new_lead" },
      { key: "ack_allowed", kind: "check", check: "client_ack_allowed", otherwise: { skip: 1 } },
      { key: "ack_client", kind: "action", action: "email_client", message: "lead_ack", approval: "never" },
      { key: "task", kind: "action", action: "create_task", title: "לחזור אל {שם}", dueHoursFrom: "response_hours" },
      { key: "wait_response", kind: "wait", hoursFrom: "response_hours" },
      { key: "still_new_1", kind: "check", check: "lead_still_new", otherwise: "stop" },
      { key: "remind_owner", kind: "action", action: "email_owner", message: "lead_reminder" },
      { key: "wait_day", kind: "wait", hours: 24 },
      { key: "still_new_2", kind: "check", check: "second_nudge_on", otherwise: "stop" },
      { key: "cooling_owner", kind: "action", action: "email_owner", message: "lead_cooling" },
    ],
  },

  quote_followup: {
    key: "quote_followup", version: 1, trigger: "quote.sent", subject: "quote", icon: "📨",
    name: "הצעות מחיר שלא נשכחות", nameEn: "Quotes that don't get forgotten",
    outcome: "הצעה שלא נענתה מקבלת תזכורת עדינה בזמן הנכון — ונעצרת ברגע שהלקוח אישר או דחה.",
    outcomeEn: "Unanswered quotes get a gentle, well-timed reminder — and stop the moment the client decides.",
    howItWorks: [
      "שולחים הצעת מחיר ללקוח מתוך DeskKit, כקישור עם כפתור \"מאשר/ת\".",
      "אם אין תשובה אחרי מספר הימים שבחרת — תזכורת עדינה ללקוח (אחרי אישורך, או אוטומטית).",
      "אם עדיין אין תשובה — משימה בשבילך להתקשר.",
      "ברגע שהלקוח מאשר או דוחה בקישור — כל התזכורות נעצרות.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit (לא PDF שנשלח ידנית)"],
    category: "sales",
    config: [
      { key: "first_after_days", type: "int", label: "תזכורת ראשונה אחרי", labelEn: "First reminder after", min: 1, max: 14, default: 3, unit: "ימים" },
      { key: "second_after_days", type: "int", label: "משימת טלפון אחרי עוד", labelEn: "Call task after another", min: 1, max: 14, default: 4, unit: "ימים" },
      CLIENT_MESSAGES,
      { key: "reminder_text", type: "text", label: "נוסח התזכורת ללקוח", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nרציתי לוודא שהצעת המחיר שלנו הגיעה אלייך. אפשר לצפות בה ולאשר בלחיצה כאן:\n{קישור}\nאם יש שאלות — נשמח לעזור.",
        placeholders: ["{שם}", "{עסק}", "{קישור}"] },
    ],
    steps: [
      { key: "wait_first", kind: "wait", daysFrom: "first_after_days" },
      { key: "pending_1", kind: "check", check: "quote_pending", otherwise: "stop" },
      { key: "remind_client", kind: "action", action: "email_client", message: "quote_reminder", approval: "config" },
      { key: "tell_owner", kind: "action", action: "email_owner", message: "quote_waiting" },
      { key: "wait_second", kind: "wait", daysFrom: "second_after_days" },
      { key: "pending_2", kind: "check", check: "quote_pending", otherwise: "stop" },
      { key: "call_task", kind: "action", action: "create_task", title: "להתקשר ל{שם} לגבי הצעת המחיר", dueHours: 24 },
    ],
  },

  quote_won: {
    key: "quote_won", version: 1, trigger: "quote.approved", subject: "quote", icon: "🤝",
    name: "הצעה אושרה — מתחילים לעבוד", nameEn: "Quote approved — let's start",
    outcome: "כשלקוח מאשר הצעה: את/ה יודע/ת מיד, הלקוח עובר ל\"נסגר\", ונפתחת משימת תיאום.",
    outcomeEn: "When a client approves: you know at once, the client moves to Won, and a kickoff task opens.",
    howItWorks: [
      "הלקוח לוחץ \"מאשר/ת\" בקישור ההצעה.",
      "את/ה מקבל/ת מייל עם הפרטים.",
      "הלקוח עובר לשלב \"נסגר בהצלחה\" ברשימת הלקוחות (וקליטת לקוח חדש מתחילה, אם הפעלת אותה).",
      "נפתחת משימה לתאם את תחילת העבודה.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit"],
    category: "sales",
    config: [],
    steps: [
      { key: "notify_owner", kind: "action", action: "email_owner", message: "quote_approved" },
      { key: "mark_won", kind: "action", action: "mark_contact_won" },
      { key: "kickoff_task", kind: "action", action: "create_task", title: "לתאם עם {שם} את תחילת העבודה", dueHours: 24 },
    ],
  },

  invoice_collect: {
    key: "invoice_collect", version: 1, trigger: "invoice.tracked", subject: "invoice", icon: "💸",
    name: "גבייה בלי מבוכה", nameEn: "Get paid without the awkwardness",
    outcome: "חשבונית שלא שולמה מקבלת תזכורות מנומסות לפי הלוח שלך — ונעצרת כשמסמנים \"שולם\".",
    outcomeEn: "Unpaid invoices get polite reminders on your schedule — and stop when you mark them paid.",
    howItWorks: [
      "בוחרים חשבונית שהופקה ב-DeskKit, מוסיפים מייל של הלקוח ותאריך לתשלום.",
      "אם עבר המועד ולא סימנת \"שולם\" — תזכורת מנומסת ללקוח (אחרי אישורך, או אוטומטית).",
      "תזכורות נוספות לפי מה שבחרת, ואז משימה בשבילך לבדוק.",
      "כשמסמנים \"שולם\" — הכל נעצר. (DeskKit לא מחובר לבנק — הסימון הוא שלך.)",
    ],
    needs: ["חשבונית שהופקה ב-DeskKit", "מייל של הלקוח"],
    category: "money",
    config: [
      { key: "first_days_after_due", type: "int", label: "תזכורת ראשונה כמה ימים אחרי מועד התשלום", labelEn: "First reminder (days after due)", min: 0, max: 30, default: 1, unit: "ימים" },
      { key: "repeat_days", type: "int", label: "מרווח בין תזכורות", labelEn: "Days between reminders", min: 3, max: 30, default: 7, unit: "ימים" },
      { key: "max_reminders", type: "int", label: "כמה תזכורות לכל היותר", labelEn: "Maximum reminders", min: 1, max: 3, default: 2 },
      CLIENT_MESSAGES,
      { key: "reminder_text", type: "text", label: "נוסח התזכורת", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "שלום {שם},\nתזכורת ידידותית: חשבונית מספר {חשבונית} על סך {סכום} ממתינה לתשלום (מועד התשלום: {מועד}).\nאם כבר שילמת — תודה רבה, ואפשר להתעלם מההודעה.",
        placeholders: ["{שם}", "{עסק}", "{חשבונית}", "{סכום}", "{מועד}"] },
    ],
    steps: [
      { key: "wait_due", kind: "wait", untilDueDatePlusDaysFrom: "first_days_after_due" },
      { key: "unpaid_1", kind: "check", check: "invoice_unpaid", otherwise: "stop" },
      { key: "remind_1", kind: "action", action: "email_client", message: "invoice_reminder", approval: "config" },
      { key: "tell_owner", kind: "action", action: "email_owner", message: "invoice_overdue" },
      { key: "wait_2", kind: "wait", daysFrom: "repeat_days" },
      { key: "allow_2", kind: "check", check: "invoice_second_allowed", otherwise: { skip: 2 } },
      { key: "remind_2", kind: "action", action: "email_client", message: "invoice_reminder", approval: "config" },
      { key: "wait_3", kind: "wait", daysFrom: "repeat_days" },
      { key: "allow_3", kind: "check", check: "invoice_third_allowed", otherwise: { skip: 1 } },
      { key: "remind_3", kind: "action", action: "email_client", message: "invoice_reminder", approval: "config" },
      { key: "unpaid_end", kind: "check", check: "invoice_unpaid", otherwise: "stop" },
      { key: "check_task", kind: "action", action: "create_task", title: "לבדוק את התשלום של {שם} (חשבונית {חשבונית})", dueHours: 24 },
    ],
  },

  client_onboarding: {
    key: "client_onboarding", version: 1, trigger: "client.won", subject: "contact", icon: "🚀",
    name: "קליטת לקוח חדש", nameEn: "New client onboarding",
    outcome: "כל לקוח חדש מקבל הודעת פתיחה מקצועית, ואת/ה מקבל/ת רשימת צעדים מוכנה — בלי לשכוח כלום.",
    outcomeEn: "Every new client gets a professional welcome, and you get a ready checklist.",
    howItWorks: [
      "כשלקוח עובר ל\"נסגר בהצלחה\" (ידנית, או כשאישר הצעת מחיר).",
      "הלקוח מקבל הודעת פתיחה עם מה שקורה הלאה (אם יש לו מייל).",
      "נפתחות משימות קליטה מותאמות לסוג העסק שלך.",
      "אם משימות נתקעות כמה ימים — תזכורת.",
    ],
    needs: [],
    category: "service",
    config: [
      { key: "welcome", type: "bool", label: "לשלוח ללקוח הודעת פתיחה", labelEn: "Send a welcome message", default: true },
      { key: "welcome_text", type: "text", label: "נוסח הודעת הפתיחה", labelEn: "Welcome text", maxLength: 1500, multiline: true,
        default: "היי {שם},\nשמחים שבחרת ב{עסק}! הנה מה שקורה עכשיו:\n1. ניצור איתך קשר לתיאום.\n2. נשלח לך את כל הפרטים.\nלכל שאלה — אנחנו כאן.",
        placeholders: ["{שם}", "{עסק}"] },
      { key: "checklist", type: "text", label: "משימות קליטה (שורה לכל משימה)", labelEn: "Onboarding tasks (one per line)", maxLength: 1500, multiline: true,
        default: "לתאם פגישת פתיחה\nלשלוח ללקוח את פרטי ההתקשרות\nלקבל מהלקוח את החומרים הדרושים" },
      { key: "nudge_days", type: "int", label: "להזכיר לי אם משימות פתוחות אחרי", labelEn: "Remind me if tasks are open after", min: 1, max: 14, default: 3, unit: "ימים" },
    ],
    steps: [
      { key: "welcome_allowed", kind: "check", check: "welcome_allowed", otherwise: { skip: 1 } },
      { key: "welcome_client", kind: "action", action: "email_client", message: "welcome", approval: "never" },
      { key: "checklist", kind: "action", action: "create_checklist" },
      { key: "wait_nudge", kind: "wait", daysFrom: "nudge_days" },
      { key: "open_tasks", kind: "check", check: "onboarding_open", otherwise: "stop" },
      { key: "nudge_owner", kind: "action", action: "email_owner", message: "onboarding_stuck" },
    ],
  },

  review_request: {
    key: "review_request", version: 1, trigger: "job.done", subject: "contact", icon: "⭐",
    name: "ביקורות מלקוחות מרוצים", nameEn: "Reviews from happy clients",
    outcome: "כשמסיימים עבודה, הלקוח מקבל בקשה קצרה לכתוב ביקורת — בדיוק כשהוא הכי מרוצה.",
    outcomeEn: "When a job is done, the client gets a short review request at the right moment.",
    howItWorks: [
      "מסמנים אצל הלקוח \"העבודה הסתיימה\".",
      "אחרי הזמן שבחרת, הלקוח מקבל מייל קצר עם קישור לכתיבת ביקורת (למשל בגוגל).",
    ],
    needs: ["קישור לעמוד הביקורות שלך (למשל Google)"],
    category: "service",
    config: [
      { key: "review_url", type: "url", label: "קישור לכתיבת ביקורת", labelEn: "Review link", default: "", required: true,
        help: "בגוגל: חפשו את העסק שלכם → \"קבלת ביקורות נוספות\" → העתקת הקישור." },
      { key: "delay_days", type: "int", label: "כמה ימים אחרי סיום העבודה", labelEn: "Days after the job", min: 0, max: 14, default: 1, unit: "ימים" },
      { ...CLIENT_MESSAGES, default: "auto" },
      { key: "review_text", type: "text", label: "נוסח הבקשה", labelEn: "Request text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nתודה שבחרת ב{עסק}! אם נהנית מהשירות, נשמח מאוד אם תקדיש/י דקה לכתוב לנו ביקורת:\n{קישור}\nזה עוזר לנו מאוד.",
        placeholders: ["{שם}", "{עסק}", "{קישור}"] },
    ],
    steps: [
      { key: "wait_delay", kind: "wait", daysFrom: "delay_days" },
      { key: "ready", kind: "check", check: "review_ready", otherwise: "stop" },
      { key: "ask_review", kind: "action", action: "email_client", message: "review_request", approval: "config" },
    ],
  },

  daily_digest: {
    key: "daily_digest", version: 1, trigger: "schedule.daily", subject: null, icon: "☀️",
    name: "סיכום בוקר: מה דורש טיפול", nameEn: "Morning brief: what needs you",
    outcome: "כל בוקר מייל קצר עם הדברים שנופלים בין הכיסאות: לידים, הצעות, חשבוניות ומשימות.",
    outcomeEn: "Every morning, a short email with what's slipping: leads, quotes, invoices and tasks.",
    howItWorks: [
      "כל בוקר המערכת בודקת את הלידים, ההצעות, החשבוניות והמשימות שלך.",
      "אם יש משהו שדורש טיפול — מייל אחד קצר, מסודר לפי חשיבות, עם קישור לטיפול.",
      "אם הכל מטופל — לא נשלח כלום.",
    ],
    needs: [],
    category: "assistant",
    config: [],
    steps: [{ key: "digest", kind: "action", action: "digest_owner" }],
  },
};

// ---------------------------------------------------------------------
// Business packs: one choice of business type → sensible defaults for
// everything (texts and onboarding checklists), so most owners just
// press "הפעלה".
export type Pack = { key: string; name: string; nameEn: string; icon: string; templates: string[]; overrides: Record<string, Record<string, unknown>> };

const SALES_CORE = ["lead_autopilot", "quote_followup", "quote_won", "invoice_collect", "client_onboarding", "daily_digest"];

export const PACKS: Pack[] = [
  { key: "general", name: "עסק כללי", nameEn: "General business", icon: "🏢", templates: SALES_CORE, overrides: {} },
  { key: "home_services", name: "שיפוצים, התקנות ובעלי מקצוע", nameEn: "Home services & trades", icon: "🛠️", templates: SALES_CORE,
    overrides: {
      lead_autopilot: { response_hours: 1, auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק}! קיבלנו את הפנייה ונחזור אלייך היום לתיאום הצעת מחיר." },
      client_onboarding: { checklist: "לתאם מועד הגעה\nלאשר כתובת ופרטי גישה\nלהזמין חומרים\nלשלוח ללקוח תזכורת יום לפני" },
    } },
  { key: "beauty", name: "טיפוח, יופי וטיפולים", nameEn: "Beauty & wellness", icon: "💅", templates: ["lead_autopilot", "client_onboarding", "review_request", "daily_digest"],
    overrides: {
      lead_autopilot: { response_hours: 2, auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק} 💛 נחזור אלייך בהקדם לתיאום תור." },
      client_onboarding: { checklist: "לתאם תור ראשון\nלשלוח הנחיות הכנה לטיפול\nלשאול על רגישויות" },
    } },
  { key: "lessons", name: "שיעורים פרטיים והדרכה", nameEn: "Tutoring & coaching", icon: "📚", templates: ["lead_autopilot", "client_onboarding", "invoice_collect", "daily_digest"],
    overrides: {
      lead_autopilot: { auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק}! נחזור אלייך בהקדם כדי להתאים מועד לשיעור ראשון." },
      client_onboarding: { checklist: "לקבוע שיעור ראשון\nלשלוח חומרי פתיחה\nלתאם יום ושעה קבועים" },
    } },
  { key: "events", name: "צילום, אירועים והפקות", nameEn: "Photography & events", icon: "📸", templates: SALES_CORE.concat(["review_request"]),
    overrides: {
      quote_followup: { first_after_days: 2 },
      client_onboarding: { checklist: "לחתום על הזמנה ולקבל מקדמה\nלתאם פגישת תכנון\nלקבל לו\"ז אירוע\nלשלוח תזכורת שבוע לפני" },
    } },
  { key: "consulting", name: "ייעוץ ושירותים מקצועיים", nameEn: "Consulting & professional services", icon: "💼", templates: SALES_CORE,
    overrides: {
      client_onboarding: { checklist: "לשלוח הסכם התקשרות\nלתאם פגישת פתיחה\nלקבל מסמכים מהלקוח" },
    } },
];

// ---------------------------------------------------------------------
// Config validation: anything not in the schema is dropped, numbers are
// clamped, texts trimmed and capped, URLs must be https.
export function validateConfig(t: Template, input: Record<string, unknown>): { config: Record<string, unknown>; errors: string[] } {
  const config: Record<string, unknown> = {};
  const errors: string[] = [];
  for (const f of t.config) {
    const v = input ? input[f.key] : undefined;
    switch (f.type) {
      case "int": {
        const n = Math.round(Number(v));
        config[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : f.default;
        break;
      }
      case "bool":
        config[f.key] = typeof v === "boolean" ? v : f.default;
        break;
      case "text": {
        const s = typeof v === "string" ? v.trim().slice(0, f.maxLength) : "";
        config[f.key] = s || f.default;
        break;
      }
      case "choice":
        config[f.key] = f.options.some((o) => o.value === v) ? v : f.default;
        break;
      case "url": {
        const s = typeof v === "string" ? v.trim() : "";
        let ok = false;
        try { ok = s !== "" && new URL(s).protocol === "https:" && s.length <= 500; } catch (_e) { ok = false; }
        if (ok) config[f.key] = s;
        else if (f.required) errors.push(f.key);
        else config[f.key] = f.default;
        break;
      }
    }
  }
  return { config, errors };
}

export function defaultsFor(t: Template, packKey?: string): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  for (const f of t.config) base[f.key] = f.default;
  const pack = PACKS.find((p) => p.key === packKey);
  return { ...base, ...(pack?.overrides[t.key] || {}) };
}

// Catalog for the UI (no step internals).
export function catalog() {
  return {
    templates: Object.values(TEMPLATES).map((t) => ({
      key: t.key, icon: t.icon, name: t.name, nameEn: t.nameEn, outcome: t.outcome, outcomeEn: t.outcomeEn,
      howItWorks: t.howItWorks, needs: t.needs, category: t.category, config: t.config,
    })),
    packs: PACKS.map((p) => ({ key: p.key, name: p.name, nameEn: p.nameEn, icon: p.icon, templates: p.templates })),
  };
}
