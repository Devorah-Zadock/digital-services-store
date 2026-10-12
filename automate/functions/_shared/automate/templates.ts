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
// Texts shown to business owners are Hebrew; the *En fields hold the
// English version (UI labels, how-it-works, needs and default wordings).

// English: labelEn/helpEn/unitEn for the UI, and for texts defaultEn — the
// default wording used when the owner works in English (the app sends it
// on activation; defaultsFor(t, pack, "en") gives the same on the server).
// English texts use English placeholders ({name}, {business}, {link},
// {invoice}, {amount}, {date}) — see placeholdersEn.
export type ConfigField =
  | { key: string; type: "int"; label: string; labelEn: string; min: number; max: number; default: number; unit?: string; unitEn?: string; help?: string; helpEn?: string }
  | { key: string; type: "bool"; label: string; labelEn: string; default: boolean; help?: string; helpEn?: string }
  | { key: string; type: "text"; label: string; labelEn: string; default: string; defaultEn: string; maxLength: number; multiline?: boolean; help?: string; helpEn?: string; placeholders?: string[]; placeholdersEn?: string[] }
  | { key: string; type: "choice"; label: string; labelEn: string; default: string; options: { value: string; label: string; labelEn: string }[]; help?: string; helpEn?: string }
  | { key: string; type: "url"; label: string; labelEn: string; default: string; required?: boolean; help?: string; helpEn?: string };

export type Check =
  | "lead_from_form" | "lead_still_new" | "client_ack_allowed" | "quote_pending" | "invoice_unpaid"
  | "has_client_email" | "review_ready" | "onboarding_open" | "second_nudge_on" | "welcome_allowed"
  | "invoice_second_allowed" | "invoice_third_allowed"
  | "lead_open_no_quote" | "auto_close_on" | "no_newer_job" | "service_client_ok" | "review_not_asked"
  | "invoice_paid" | "paid_review_ok" | "referral_ok" | "feedback_ok" | "reengage_on" | "client_not_back"
  | "quote_has_expiry";

export type Step =
  | { key: string; kind: "action"; action: "email_owner"; message: string }
  | { key: string; kind: "action"; action: "email_client"; message: string; approval?: "config" | "never" }
  | { key: string; kind: "action"; action: "create_task"; title: string; dueHours?: number; dueHoursFrom?: string }
  | { key: string; kind: "action"; action: "create_checklist" }
  | { key: string; kind: "action"; action: "mark_contact_won" }
  | { key: string; kind: "action"; action: "set_stage"; stage: "followup" | "lost"; note: string }
  | { key: string; kind: "action"; action: "digest_owner" }
  | { key: string; kind: "action"; action: "weekly_owner" }
  | { key: string; kind: "wait"; hours?: number; days?: number; hoursFrom?: string; daysFrom?: string; untilDueDatePlusDaysFrom?: string; untilQuoteExpiryMinusDaysFrom?: string }
  | { key: string; kind: "check"; check: Check; otherwise: "stop" | { skip: number } };

export type Template = {
  key: string;
  version: number;
  trigger: string;
  subject: "contact" | "quote" | "invoice" | null;
  icon: string;
  name: string; nameEn: string;
  outcome: string; outcomeEn: string;          // the business result, in one line
  howItWorks: string[]; howItWorksEn: string[]; // plain steps shown before activating
  needs: string[]; needsEn: string[];          // what must exist for it to work
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
  helpEn: "In approval mode, the message waits for you on the Today screen with a Send button.",
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
    howItWorksEn: [
      "An enquiry arrives from your website form and is saved to your client list.",
      "You get an email right away, with a button to reply on WhatsApp or call.",
      "The sender gets an automatic acknowledgement (if they left an email).",
      "A \"Get back to the client\" task is created. If you haven't marked it handled by the time you set, you get a reminder.",
      "If another day passes without it being handled, a final reminder goes out before the lead goes cold.",
    ],
    needs: ["אתר שנבנה ב-DeskKit עם טופס יצירת קשר"],
    needsEn: ["A DeskKit-built website with a contact form"],
    category: "sales",
    config: [
      { key: "response_hours", type: "int", label: "תוך כמה שעות להזכיר לי אם לא טיפלתי", labelEn: "Remind me after (hours)", min: 1, max: 48, default: 2, unit: "שעות", unitEn: "hours" },
      { key: "auto_reply", type: "bool", label: "לשלוח לפונה אישור קבלה אוטומטי", labelEn: "Send an automatic acknowledgement", default: true },
      { key: "auto_reply_text", type: "text", label: "נוסח אישור הקבלה", labelEn: "Acknowledgement text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nתודה שפנית ל{עסק}! קיבלנו את הפנייה שלך ונחזור אלייך בהקדם.",
        defaultEn: "Hi {name},\nThanks for contacting {business}! We've received your message and will get back to you soon.",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
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
    howItWorksEn: [
      "Send a quote to the client from DeskKit, as a link with an \"I approve\" button.",
      "If there's no answer after the number of days you chose, the client gets a gentle reminder (after your approval, or automatically).",
      "If there's still no answer, you get a task to call.",
      "As soon as the client approves or declines through the link, all reminders stop.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit (לא PDF שנשלח ידנית)"],
    needsEn: ["A quote sent from DeskKit (not a PDF sent manually)"],
    category: "sales",
    config: [
      { key: "first_after_days", type: "int", label: "תזכורת ראשונה אחרי", labelEn: "First reminder after", min: 1, max: 14, default: 3, unit: "ימים", unitEn: "days" },
      { key: "second_after_days", type: "int", label: "משימת טלפון אחרי עוד", labelEn: "Call task after another", min: 1, max: 14, default: 4, unit: "ימים", unitEn: "days" },
      CLIENT_MESSAGES,
      { key: "reminder_text", type: "text", label: "נוסח התזכורת ללקוח", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nרציתי לוודא שהצעת המחיר שלנו הגיעה אלייך. אפשר לצפות בה ולאשר בלחיצה כאן:\n{קישור}\nאם יש שאלות — נשמח לעזור.",
        defaultEn: "Hi {name},\nJust making sure our quote reached you. You can view and approve it with one click here:\n{link}\nIf you have any questions, we're happy to help.",
        placeholders: ["{שם}", "{עסק}", "{קישור}"], placeholdersEn: ["{name}", "{business}", "{link}"] },
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
    howItWorksEn: [
      "The client clicks \"I approve\" in the quote link.",
      "You get an email with the details.",
      "The client moves to the Won stage in your client list (and new-client onboarding starts, if you've turned it on).",
      "A task opens to schedule the start of the work.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit"],
    needsEn: ["A quote sent from DeskKit"],
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
    howItWorksEn: [
      "Pick an invoice issued in DeskKit, add the client's email and a due date.",
      "If the due date passes and you haven't marked it paid, the client gets a polite reminder (after your approval, or automatically).",
      "More reminders follow as you chose, then a task for you to check.",
      "Marking it paid stops everything. (DeskKit isn't connected to your bank, so marking it paid is up to you.)",
    ],
    needs: ["חשבונית שהופקה ב-DeskKit", "מייל של הלקוח"],
    needsEn: ["An invoice issued in DeskKit", "The client's email"],
    category: "money",
    config: [
      { key: "first_days_after_due", type: "int", label: "תזכורת ראשונה כמה ימים אחרי מועד התשלום", labelEn: "First reminder (days after due)", min: 0, max: 30, default: 1, unit: "ימים", unitEn: "days" },
      { key: "repeat_days", type: "int", label: "מרווח בין תזכורות", labelEn: "Days between reminders", min: 3, max: 30, default: 7, unit: "ימים", unitEn: "days" },
      { key: "max_reminders", type: "int", label: "כמה תזכורות לכל היותר", labelEn: "Maximum reminders", min: 1, max: 3, default: 2 },
      CLIENT_MESSAGES,
      { key: "reminder_text", type: "text", label: "נוסח התזכורת", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "שלום {שם},\nתזכורת ידידותית: חשבונית מספר {חשבונית} על סך {סכום} ממתינה לתשלום (מועד התשלום: {מועד}).\nאם כבר שילמת — תודה רבה, ואפשר להתעלם מההודעה.",
        defaultEn: "Hello {name},\nA friendly reminder: invoice no. {invoice} for {amount} is awaiting payment (due date: {date}).\nIf you've already paid, thank you, and please ignore this message.",
        placeholders: ["{שם}", "{עסק}", "{חשבונית}", "{סכום}", "{מועד}"], placeholdersEn: ["{name}", "{business}", "{invoice}", "{amount}", "{date}"] },
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
    howItWorksEn: [
      "When a client moves to Won (manually, or by approving a quote).",
      "The client gets a welcome message explaining what happens next (if they have an email).",
      "Onboarding tasks tailored to your type of business are created.",
      "If tasks are stuck for a few days, you get a reminder.",
    ],
    needs: [],
    needsEn: [],
    category: "service",
    config: [
      { key: "welcome", type: "bool", label: "לשלוח ללקוח הודעת פתיחה", labelEn: "Send a welcome message", default: true },
      { key: "welcome_text", type: "text", label: "נוסח הודעת הפתיחה", labelEn: "Welcome text", maxLength: 1500, multiline: true,
        default: "היי {שם},\nשמחים שבחרת ב{עסק}! הנה מה שקורה עכשיו:\n1. ניצור איתך קשר לתיאום.\n2. נשלח לך את כל הפרטים.\nלכל שאלה — אנחנו כאן.",
        defaultEn: "Hi {name},\nWe're glad you chose {business}! Here's what happens next:\n1. We'll contact you to schedule.\n2. We'll send you all the details.\nIf you have any questions, we're here.",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
      { key: "checklist", type: "text", label: "משימות קליטה (שורה לכל משימה)", labelEn: "Onboarding tasks (one per line)", maxLength: 1500, multiline: true,
        default: "לתאם פגישת פתיחה\nלשלוח ללקוח את פרטי ההתקשרות\nלקבל מהלקוח את החומרים הדרושים",
        defaultEn: "Schedule a kickoff meeting\nSend the client our contact details\nGet the materials we need from the client" },
      { key: "nudge_days", type: "int", label: "להזכיר לי אם משימות פתוחות אחרי", labelEn: "Remind me if tasks are open after", min: 1, max: 14, default: 3, unit: "ימים", unitEn: "days" },
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
    howItWorksEn: [
      "Mark \"Job done\" on the client.",
      "After the time you chose, the client gets a short email with a link to write a review (e.g. on Google).",
    ],
    needs: ["קישור לעמוד הביקורות שלך (למשל Google)"],
    needsEn: ["A link to your reviews page (e.g. Google)"],
    category: "service",
    config: [
      { key: "review_url", type: "url", label: "קישור לכתיבת ביקורת", labelEn: "Review link", default: "", required: true,
        help: "בגוגל: חפשו את העסק שלכם → \"קבלת ביקורות נוספות\" → העתקת הקישור.",
        helpEn: "In Google: search for your business → \"Ask for reviews\" → copy the link." },
      { key: "delay_days", type: "int", label: "כמה ימים אחרי סיום העבודה", labelEn: "Days after the job", min: 0, max: 14, default: 1, unit: "ימים", unitEn: "days" },
      { ...CLIENT_MESSAGES, default: "auto" },
      { key: "review_text", type: "text", label: "נוסח הבקשה", labelEn: "Request text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nתודה שבחרת ב{עסק}! אם נהנית מהשירות, נשמח מאוד אם תקדיש/י דקה לכתוב לנו ביקורת:\n{קישור}\nזה עוזר לנו מאוד.",
        defaultEn: "Hi {name},\nThanks for choosing {business}! If you enjoyed our service, we'd really appreciate a minute of your time to write us a review:\n{link}\nIt helps us a lot.",
        placeholders: ["{שם}", "{עסק}", "{קישור}"], placeholdersEn: ["{name}", "{business}", "{link}"] },
    ],
    steps: [
      { key: "wait_delay", kind: "wait", daysFrom: "delay_days" },
      { key: "ready", kind: "check", check: "review_ready", otherwise: "stop" },
      { key: "not_asked", kind: "check", check: "review_not_asked", otherwise: "stop" },
      { key: "ask_review", kind: "action", action: "email_client", message: "review_request", approval: "config" },
    ],
  },

  lead_nurture: {
    key: "lead_nurture", version: 1, trigger: "lead.created", subject: "contact", icon: "🌱",
    name: "ליד שלא התקדם — מעקב עד החלטה", nameEn: "Stalled leads — followed up until decided",
    outcome: "פנייה שלא התקדמה מקבלת הודעת מעקב עדינה; אם אין תגובה — את/ה מחליט/ה, ואם בחרת — הליד נסגר מסודר.",
    outcomeEn: "A lead that stalls gets a gentle follow-up; if nothing moves, you decide — or it's closed neatly.",
    howItWorks: [
      "כמה ימים אחרי פנייה שלא התקדמה (לא נשלחה הצעה, לא נסגר) — הודעת מעקב קצרה ללקוח (אחרי אישורך, או אוטומטית).",
      "אם בינתיים נשלחה הצעה, הלקוח נסגר או סומן \"לא רלוונטי\" — שום דבר לא נשלח והמעקב נעצר.",
      "אם עברו עוד ימים בלי התקדמות — הליד עובר ל\"פולו-אפ\", ונפתחת לך משימה: להמשיך או לסגור.",
      "אם בחרת בסגירה אוטומטית — ליד שנשאר תקוע עוד זמן רב נסגר כ\"לא רלוונטי\", ואת/ה מקבל/ת עדכון.",
    ],
    howItWorksEn: [
      "A few days after an enquiry that hasn't moved (no quote sent, not won), the client gets a short follow-up (after your approval, or automatically).",
      "If a quote was sent in the meantime, or the client was won or marked Not relevant, nothing is sent and the follow-up stops.",
      "If more days pass with no progress, the lead moves to Follow-up and you get a task: continue or close.",
      "If you chose auto-close, a lead that stays stuck for a long time is closed as Not relevant, and you get an update.",
    ],
    needs: ["מייל של הלקוח (בשביל הודעת המעקב)"],
    needsEn: ["The client's email (for the follow-up message)"],
    category: "sales",
    config: [
      { key: "first_days", type: "int", label: "הודעת מעקב ללקוח אחרי", labelEn: "Follow-up to the client after", min: 1, max: 14, default: 3, unit: "ימים", unitEn: "days" },
      CLIENT_MESSAGES,
      { key: "followup_text", type: "text", label: "נוסח הודעת המעקב", labelEn: "Follow-up text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nרציתי לבדוק אם הפנייה שלך ל{עסק} עדיין רלוונטית. אם כן — אפשר פשוט להשיב למייל הזה ונמשיך משם.\nאם כבר לא — הכל בסדר, תודה שחשבת עלינו.",
        defaultEn: "Hi {name},\nI wanted to check whether your enquiry to {business} is still relevant. If it is, just reply to this email and we'll take it from there.\nIf not, that's fine. Thanks for thinking of us.",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
      { key: "decide_days", type: "int", label: "משימת \"להמשיך או לסגור\" אחרי עוד", labelEn: "\"Continue or close\" task after another", min: 2, max: 30, default: 7, unit: "ימים", unitEn: "days" },
      { key: "auto_close", type: "bool", label: "לסגור אוטומטית ליד שנשאר תקוע", labelEn: "Close stalled leads automatically", default: false },
      { key: "close_days", type: "int", label: "לסגור אחרי עוד", labelEn: "Close after another", min: 7, max: 90, default: 21, unit: "ימים", unitEn: "days" },
    ],
    steps: [
      { key: "wait_first", kind: "wait", daysFrom: "first_days" },
      { key: "open_1", kind: "check", check: "lead_open_no_quote", otherwise: "stop" },
      { key: "can_email", kind: "check", check: "has_client_email", otherwise: { skip: 1 } },
      { key: "followup_client", kind: "action", action: "email_client", message: "lead_followup", approval: "config" },
      { key: "wait_decide", kind: "wait", daysFrom: "decide_days" },
      { key: "open_2", kind: "check", check: "lead_open_no_quote", otherwise: "stop" },
      { key: "to_followup", kind: "action", action: "set_stage", stage: "followup", note: "" },
      { key: "decide_task", kind: "action", action: "create_task", title: "להחליט על {שם}: להמשיך או לסגור", dueHours: 24 },
      { key: "tell_owner", kind: "action", action: "email_owner", message: "lead_decide" },
      { key: "close_on", kind: "check", check: "auto_close_on", otherwise: "stop" },
      { key: "wait_close", kind: "wait", daysFrom: "close_days" },
      { key: "open_3", kind: "check", check: "lead_open_no_quote", otherwise: "stop" },
      { key: "close", kind: "action", action: "set_stage", stage: "lost", note: "נסגר אוטומטית — לא הייתה התקדמות" },
      { key: "tell_closed", kind: "action", action: "email_owner", message: "lead_closed" },
    ],
  },

  service_reminder: {
    key: "service_reminder", version: 1, trigger: "job.done", subject: "contact", icon: "🔁",
    name: "לקוחות שחוזרים: תזכורת לטיפול הבא", nameEn: "Repeat clients: next-visit reminder",
    outcome: "כשמגיע הזמן לטיפול או לשירות הבא, הלקוח מקבל תזכורת אישית — ואם לא חזר, את/ה יודע/ת למי להתקשר.",
    outcomeEn: "When the next visit is due, the client gets a personal reminder — and if they don't book, you know whom to call.",
    howItWorks: [
      "מסמנים אצל הלקוח \"העבודה הסתיימה\".",
      "אחרי הזמן שבחרת (למשל חצי שנה לטיפול במזגן, 4 שבועות לטיפול יופי) — הלקוח מקבל תזכורת אישית.",
      "אם הלקוח כבר חזר בינתיים (סימנת עבודה חדשה) — שום דבר לא נשלח, והספירה מתחילה מחדש מהעבודה החדשה.",
      "אם עבר שבוע מהתזכורת והלקוח לא חזר — משימה בשבילך להתקשר.",
    ],
    howItWorksEn: [
      "Mark \"Job done\" on the client.",
      "After the time you chose (e.g. six months for AC servicing, 4 weeks for a beauty treatment), the client gets a personal reminder.",
      "If the client has already come back (you marked a new job), nothing is sent, and the count restarts from the new job.",
      "If a week passes after the reminder and the client hasn't come back, you get a task to call.",
    ],
    needs: ["מייל של הלקוח"],
    needsEn: ["The client's email"],
    category: "service",
    config: [
      { key: "after_days", type: "int", label: "תזכורת אחרי", labelEn: "Remind after", min: 7, max: 730, default: 180, unit: "ימים", unitEn: "days",
        help: "כמה זמן אחרי סיום העבודה כדאי לחזור? למשל: 28 לטיפול יופי, 180 לטיפול במזגן, 365 לבדיקה שנתית.",
        helpEn: "How long after the job should the client come back? E.g. 28 for a beauty treatment, 180 for AC servicing, 365 for an annual check." },
      { ...CLIENT_MESSAGES },
      { key: "reminder_text", type: "text", label: "נוסח התזכורת", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nעבר זמן מאז הביקור האחרון שלנו, וזה זמן טוב לקבוע את הבא.\nאפשר להשיב למייל הזה או להתקשר, ונתאם מועד שנוח לך.\n{עסק}",
        defaultEn: "Hi {name},\nIt's been a while since our last visit, so now is a good time to book the next one.\nReply to this email or give us a call, and we'll find a time that suits you.\n{business}",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
      { key: "call_after_days", type: "int", label: "משימת טלפון אם לא חזר אחרי", labelEn: "Call task if no booking after", min: 1, max: 30, default: 7, unit: "ימים", unitEn: "days" },
    ],
    steps: [
      { key: "wait_due", kind: "wait", daysFrom: "after_days" },
      { key: "same_job_1", kind: "check", check: "no_newer_job", otherwise: "stop" },
      { key: "can_send", kind: "check", check: "service_client_ok", otherwise: { skip: 1 } },
      { key: "remind_client", kind: "action", action: "email_client", message: "service_due", approval: "config" },
      { key: "wait_call", kind: "wait", daysFrom: "call_after_days" },
      { key: "same_job_2", kind: "check", check: "no_newer_job", otherwise: "stop" },
      { key: "call_task", kind: "action", action: "create_task", title: "להתקשר ל{שם} לתיאום הביקור הבא", dueHours: 24 },
    ],
  },

  paid_thanks: {
    key: "paid_thanks", version: 1, trigger: "invoice.paid", subject: "invoice", icon: "🙏",
    name: "שולם — תודה, ביקורת והמלצה", nameEn: "Paid — thanks, a review and a referral",
    outcome: "כשמסמנים שחשבונית שולמה: הלקוח מקבל תודה, אחר כך בקשה לביקורת, ובהמשך בקשה להמליץ עליך.",
    outcomeEn: "When an invoice is marked paid: a thank-you, then a review request, then a referral request.",
    howItWorks: [
      "מסמנים \"שולם\" בחשבונית שבמעקב.",
      "הלקוח מקבל מייל תודה קצר.",
      "אחרי כמה ימים — בקשה לכתוב ביקורת (אם הוספת קישור, ורק אם לא ביקשנו ממנו כבר בשנה האחרונה).",
      "אחרי חודש — בקשה עדינה להמליץ עליך לחברים (אם הפעלת).",
      "אם סימון ה\"שולם\" בוטל — שום דבר נוסף לא נשלח.",
    ],
    howItWorksEn: [
      "Mark a tracked invoice as paid.",
      "The client gets a short thank-you email.",
      "A few days later, a review request (if you added a link, and only if we haven't asked them in the past year).",
      "After a month, a gentle request to recommend you to friends (if turned on).",
      "If the paid mark is removed, nothing more is sent.",
    ],
    needs: ["חשבונית במעקב עם מייל של הלקוח"],
    needsEn: ["A tracked invoice with the client's email"],
    category: "money",
    config: [
      { ...CLIENT_MESSAGES, default: "auto" },
      { key: "thanks_text", type: "text", label: "נוסח התודה", labelEn: "Thank-you text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nקיבלנו את התשלום על חשבונית {חשבונית} — תודה רבה!\nשמחנו לעבוד איתך, ואנחנו כאן לכל דבר.\n{עסק}",
        defaultEn: "Hi {name},\nWe've received your payment for invoice {invoice}. Thank you!\nIt was a pleasure working with you, and we're here for anything you need.\n{business}",
        placeholders: ["{שם}", "{עסק}", "{חשבונית}", "{סכום}"], placeholdersEn: ["{name}", "{business}", "{invoice}", "{amount}"] },
      { key: "review_url", type: "url", label: "קישור לכתיבת ביקורת (לא חובה)", labelEn: "Review link (optional)", default: "",
        help: "בלי קישור — לא תישלח בקשה לביקורת.",
        helpEn: "Without a link, no review request is sent." },
      { key: "review_after_days", type: "int", label: "בקשת ביקורת אחרי", labelEn: "Review request after", min: 1, max: 14, default: 3, unit: "ימים", unitEn: "days" },
      { key: "review_text", type: "text", label: "נוסח בקשת הביקורת", labelEn: "Review request text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nאם נהנית מהעבודה איתנו, נשמח מאוד לביקורת קצרה:\n{קישור}\nזה עוזר לעסק קטן יותר ממה שנדמה. תודה!",
        defaultEn: "Hi {name},\nIf you enjoyed working with us, we'd love a short review:\n{link}\nIt helps a small business more than you might think. Thank you!",
        placeholders: ["{שם}", "{עסק}", "{קישור}"], placeholdersEn: ["{name}", "{business}", "{link}"] },
      { key: "referral", type: "bool", label: "לבקש המלצה לחברים אחרי חודש", labelEn: "Ask for a referral after a month", default: false },
      { key: "referral_after_days", type: "int", label: "בקשת המלצה אחרי", labelEn: "Referral request after", min: 14, max: 90, default: 30, unit: "ימים", unitEn: "days" },
      { key: "referral_text", type: "text", label: "נוסח בקשת ההמלצה", labelEn: "Referral text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nאם מכירים מישהו שיכול להיעזר ב{עסק} — נשמח מאוד אם תעבירו לו את הפרטים שלנו.\nהמלצה מלקוח מרוצה היא הדבר הכי שווה שיש לנו. תודה!",
        defaultEn: "Hi {name},\nIf you know anyone who could use {business}, we'd be grateful if you passed our details along.\nA recommendation from a happy client means the world to us. Thank you!",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
    ],
    steps: [
      { key: "paid", kind: "check", check: "invoice_paid", otherwise: "stop" },
      { key: "can_email", kind: "check", check: "has_client_email", otherwise: "stop" },
      { key: "thank", kind: "action", action: "email_client", message: "paid_thanks", approval: "config" },
      { key: "wait_review", kind: "wait", daysFrom: "review_after_days" },
      { key: "review_ok", kind: "check", check: "paid_review_ok", otherwise: { skip: 1 } },
      { key: "ask_review", kind: "action", action: "email_client", message: "review_request", approval: "config" },
      { key: "referral_on", kind: "check", check: "referral_ok", otherwise: "stop" },
      { key: "wait_referral", kind: "wait", daysFrom: "referral_after_days" },
      { key: "still_paid", kind: "check", check: "invoice_paid", otherwise: "stop" },
      { key: "ask_referral", kind: "action", action: "email_client", message: "referral_request", approval: "config" },
    ],
  },

  quote_lost: {
    key: "quote_lost", version: 1, trigger: "quote.declined", subject: "quote", icon: "🧭",
    name: "הצעה שנדחתה — לומדים וחוזרים בזמן", nameEn: "Declined quote — learn, then come back",
    outcome: "כשלקוח דוחה הצעה: את/ה יודע/ת מיד, הלקוח נשאל בעדינות מה היה חסר, ואחרי זמן — פנייה חוזרת אם עדיין לא סגר עם אף אחד.",
    outcomeEn: "When a quote is declined: you know at once, the client is gently asked what was missing, and later you reach out again.",
    howItWorks: [
      "הלקוח לוחץ \"לא מתאים\" בקישור ההצעה — את/ה מקבל/ת מייל מיד.",
      "למחרת: שאלה קצרה ללקוח מה היה חסר (אחרי אישורך, או אוטומטית) — כדי ללמוד ולשפר את ההצעה הבאה.",
      "אחרי הזמן שבחרת: אם לא נשלחה ללקוח הצעה חדשה והוא לא נסגר — פנייה חוזרת עדינה, ומשימה בשבילך.",
    ],
    howItWorksEn: [
      "The client clicks \"Not for me\" in the quote link, and you get an email right away.",
      "The next day, the client gets a short question about what was missing (after your approval, or automatically), so you can learn and improve your next quote.",
      "After the time you chose, if no new quote was sent and the client wasn't won, a gentle reach-out goes out, plus a task for you.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit"],
    needsEn: ["A quote sent from DeskKit"],
    category: "sales",
    config: [
      { key: "ask_feedback", type: "bool", label: "לשאול את הלקוח מה היה חסר", labelEn: "Ask the client what was missing", default: true },
      CLIENT_MESSAGES,
      { key: "feedback_text", type: "text", label: "נוסח השאלה", labelEn: "Question text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nתודה שבדקת את ההצעה של {עסק}. כדי שנשתפר — נשמח לשמוע במשפט אחד מה היה חסר או לא התאים (מחיר, מועד, משהו אחר?). אפשר פשוט להשיב למייל הזה.",
        defaultEn: "Hi {name},\nThanks for considering the quote from {business}. To help us improve, we'd love to hear in one sentence what was missing or didn't fit (price, timing, something else?). Just reply to this email.",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
      { key: "reengage", type: "bool", label: "לפנות שוב אחרי זמן", labelEn: "Reach out again later", default: false,
        help: "מייל שיווקי — להפעיל רק אם הלקוח הסכים לקבל מכם פניות (חוק התקשורת, \"חוק הספאם\"). בכל מייל יש קישור להסרה.",
        helpEn: "A marketing email: turn on only if the client agreed to hear from you (anti-spam laws). Every email has an unsubscribe link." },
      { key: "reengage_days", type: "int", label: "פנייה חוזרת אחרי", labelEn: "Reach out again after", min: 30, max: 180, default: 60, unit: "ימים", unitEn: "days" },
      { key: "reengage_text", type: "text", label: "נוסח הפנייה החוזרת", labelEn: "Reach-out text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nלפני זמן מה בדקת הצעה מ{עסק}. אם הצורך עדיין קיים, או שמשהו השתנה — נשמח להכין הצעה מעודכנת. פשוט להשיב למייל הזה.",
        defaultEn: "Hi {name},\nA while ago you looked at a quote from {business}. If you still need it, or something has changed, we'd be happy to prepare an updated quote. Just reply to this email.",
        placeholders: ["{שם}", "{עסק}"], placeholdersEn: ["{name}", "{business}"] },
    ],
    steps: [
      { key: "tell_owner", kind: "action", action: "email_owner", message: "quote_declined" },
      { key: "feedback_on", kind: "check", check: "feedback_ok", otherwise: { skip: 2 } },
      { key: "wait_feedback", kind: "wait", hours: 24 },
      { key: "ask_feedback", kind: "action", action: "email_client", message: "quote_feedback", approval: "config" },
      { key: "reengage_on", kind: "check", check: "reengage_on", otherwise: "stop" },
      { key: "wait_reengage", kind: "wait", daysFrom: "reengage_days" },
      { key: "not_back", kind: "check", check: "client_not_back", otherwise: "stop" },
      { key: "reengage_client", kind: "action", action: "email_client", message: "quote_reengage", approval: "config" },
      { key: "reengage_task", kind: "action", action: "create_task", title: "לבדוק אם {שם} רלוונטי/ת שוב", dueHours: 48 },
    ],
  },

  quote_expiry: {
    key: "quote_expiry", version: 1, trigger: "quote.sent", subject: "quote", icon: "⏳",
    name: "הצעה שעומדת לפוג", nameEn: "Quote about to expire",
    outcome: "כמה ימים לפני שתוקף ההצעה נגמר, לקוח שעוד לא ענה מקבל תזכורת עדינה — ואת/ה יודע/ת שכדאי להתקשר.",
    outcomeEn: "A few days before a quote expires, a client who hasn't answered gets a gentle nudge — and you know to call.",
    howItWorks: [
      "כל הצעה שנשלחת מ-DeskKit מקבלת תוקף (30 יום, אם לא בחרת אחרת).",
      "כמה ימים לפני שהתוקף נגמר, אם הלקוח עוד לא אישר או דחה — הוא מקבל תזכורת עדינה עם הקישור (אחרי אישורך, או אוטומטית).",
      "את/ה מקבל/ת עדכון, כדי להחליט אם להתקשר או להאריך.",
      "אם הלקוח כבר ענה — לא נשלח כלום.",
    ],
    howItWorksEn: [
      "Every quote sent from DeskKit gets an expiry date (30 days, unless you chose otherwise).",
      "A few days before it expires, if the client hasn't approved or declined yet, they get a gentle reminder with the link (after your approval, or automatically).",
      "You get an update so you can decide whether to call or extend it.",
      "If the client has already answered, nothing is sent.",
    ],
    needs: ["הצעת מחיר שנשלחה מתוך DeskKit"],
    needsEn: ["A quote sent from DeskKit"],
    category: "sales",
    config: [
      { key: "days_before", type: "int", label: "כמה ימים לפני סוף התוקף", labelEn: "Days before expiry", min: 1, max: 7, default: 2, unit: "ימים", unitEn: "days" },
      CLIENT_MESSAGES,
      { key: "expiry_text", type: "text", label: "נוסח התזכורת", labelEn: "Reminder text", maxLength: 1000, multiline: true,
        default: "היי {שם},\nרק תזכורת: הצעת המחיר מ{עסק} בתוקף עד {מועד}. אפשר לצפות בה ולאשר כאן:\n{קישור}\nאם צריך עוד זמן או שינוי — פשוט להשיב למייל הזה.",
        defaultEn: "Hi {name},\nJust a reminder: the quote from {business} is valid until {date}. You can view and approve it here:\n{link}\nIf you need more time or a change, just reply to this email.",
        placeholders: ["{שם}", "{עסק}", "{קישור}", "{מועד}"], placeholdersEn: ["{name}", "{business}", "{link}", "{date}"] },
    ],
    steps: [
      { key: "has_expiry", kind: "check", check: "quote_has_expiry", otherwise: "stop" },
      { key: "wait_expiry", kind: "wait", untilQuoteExpiryMinusDaysFrom: "days_before" },
      { key: "pending", kind: "check", check: "quote_pending", otherwise: "stop" },
      { key: "remind_client", kind: "action", action: "email_client", message: "quote_expiring", approval: "config" },
      { key: "tell_owner", kind: "action", action: "email_owner", message: "quote_expiring_owner" },
    ],
  },

  weekly_report: {
    key: "weekly_report", version: 1, trigger: "schedule.weekly", subject: null, icon: "📊",
    name: "סיכום שבועי: איך היה השבוע", nameEn: "Weekly summary: how the week went",
    outcome: "כל יום ראשון בבוקר מייל קצר עם המספרים של השבוע: פניות, הצעות שאושרו, כסף שנכנס ומה עדיין פתוח.",
    outcomeEn: "Every Sunday morning, the week in numbers: leads, approved quotes, money in, and what's still open.",
    howItWorks: [
      "כל יום ראשון בבוקר המערכת סוכמת את השבוע שעבר.",
      "מייל אחד קצר: פניות חדשות וכמה מהן טופלו, הצעות שנשלחו ואושרו (בשקלים), תשלומים שהתקבלו, חובות פתוחים ומשימות.",
      "שבוע בלי שום פעילות — לא נשלח כלום.",
    ],
    howItWorksEn: [
      "Every Sunday morning, the system sums up the past week.",
      "One short email: new leads and how many were handled, quotes sent and approved (in shekels), payments received, open debts and tasks.",
      "If there was no activity during the week, nothing is sent.",
    ],
    needs: [],
    needsEn: [],
    category: "assistant",
    config: [],
    steps: [{ key: "weekly", kind: "action", action: "weekly_owner" }],
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
    howItWorksEn: [
      "Every morning, the system checks your leads, quotes, invoices and tasks.",
      "If something needs attention, you get one short email, sorted by priority, with a link to take care of it.",
      "If everything is handled, nothing is sent.",
    ],
    needs: [],
    needsEn: [],
    category: "assistant",
    config: [],
    steps: [{ key: "digest", kind: "action", action: "digest_owner" }],
  },
};

// ---------------------------------------------------------------------
// Business packs: one choice of business type → sensible defaults for
// everything (texts and onboarding checklists), so most owners just
// press "הפעלה".
// overridesEn: the English wording of a pack's text overrides (numbers and
// choices in overrides apply in both languages).
export type Pack = { key: string; name: string; nameEn: string; icon: string; templates: string[]; overrides: Record<string, Record<string, unknown>>; overridesEn?: Record<string, Record<string, unknown>> };

const SALES_CORE = ["lead_autopilot", "quote_followup", "quote_won", "invoice_collect", "client_onboarding", "daily_digest"];
// What each pack adds on top: the follow-ups that turn one sale into the next.
const GROWTH = ["lead_nurture", "quote_lost", "paid_thanks"];
// Fits every pack (owner-only email, no client contact).
const WEEKLY = ["weekly_report"];

export const PACKS: Pack[] = [
  { key: "general", name: "עסק כללי", nameEn: "General business", icon: "🏢", templates: SALES_CORE.concat(GROWTH, WEEKLY), overrides: {} },
  { key: "home_services", name: "שיפוצים, התקנות ובעלי מקצוע", nameEn: "Home services & trades", icon: "🛠️", templates: SALES_CORE.concat(["lead_nurture", "service_reminder", "paid_thanks"]),
    overrides: {
      service_reminder: { after_days: 180 },
      lead_autopilot: { response_hours: 1, auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק}! קיבלנו את הפנייה ונחזור אלייך היום לתיאום הצעת מחיר." },
      client_onboarding: { checklist: "לתאם מועד הגעה\nלאשר כתובת ופרטי גישה\nלהזמין חומרים\nלשלוח ללקוח תזכורת יום לפני" },
    },
    overridesEn: {
      lead_autopilot: { auto_reply_text: "Hi {name},\nThanks for contacting {business}! We've received your enquiry and will get back to you today to arrange a quote." },
      client_onboarding: { checklist: "Schedule an arrival date\nConfirm the address and access details\nOrder materials\nSend the client a reminder the day before" },
    } },
  { key: "beauty", name: "טיפוח, יופי וטיפולים", nameEn: "Beauty & wellness", icon: "💅", templates: ["lead_autopilot", "lead_nurture", "client_onboarding", "review_request", "service_reminder", "daily_digest"],
    overrides: {
      service_reminder: { after_days: 28, client_messages: "auto", reminder_text: "היי {שם} 💛\nעברו כמה שבועות מהטיפול האחרון — זה בדיוק הזמן לקבוע את הבא.\nאפשר להשיב למייל הזה ונתאם תור.\n{עסק}" },
      lead_autopilot: { response_hours: 2, auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק} 💛 נחזור אלייך בהקדם לתיאום תור." },
      client_onboarding: { checklist: "לתאם תור ראשון\nלשלוח הנחיות הכנה לטיפול\nלשאול על רגישויות" },
    },
    overridesEn: {
      service_reminder: { reminder_text: "Hi {name} 💛\nIt's been a few weeks since your last treatment, so it's the perfect time to book the next one.\nJust reply to this email and we'll set up an appointment.\n{business}" },
      lead_autopilot: { auto_reply_text: "Hi {name},\nThanks for contacting {business} 💛 We'll get back to you soon to book an appointment." },
      client_onboarding: { checklist: "Book the first appointment\nSend treatment prep instructions\nAsk about sensitivities" },
    } },
  { key: "lessons", name: "שיעורים פרטיים והדרכה", nameEn: "Tutoring & coaching", icon: "📚", templates: ["lead_autopilot", "lead_nurture", "client_onboarding", "invoice_collect", "paid_thanks", "daily_digest"],
    overrides: {
      lead_autopilot: { auto_reply_text: "היי {שם},\nתודה שפנית ל{עסק}! נחזור אלייך בהקדם כדי להתאים מועד לשיעור ראשון." },
      client_onboarding: { checklist: "לקבוע שיעור ראשון\nלשלוח חומרי פתיחה\nלתאם יום ושעה קבועים" },
    },
    overridesEn: {
      lead_autopilot: { auto_reply_text: "Hi {name},\nThanks for contacting {business}! We'll get back to you soon to find a time for a first lesson." },
      client_onboarding: { checklist: "Schedule the first lesson\nSend intro materials\nAgree on a regular day and time" },
    } },
  { key: "events", name: "צילום, אירועים והפקות", nameEn: "Photography & events", icon: "📸", templates: SALES_CORE.concat(["review_request", "quote_lost", "lead_nurture"]),
    overrides: {
      quote_followup: { first_after_days: 2 },
      client_onboarding: { checklist: "לחתום על הזמנה ולקבל מקדמה\nלתאם פגישת תכנון\nלקבל לו\"ז אירוע\nלשלוח תזכורת שבוע לפני" },
    },
    overridesEn: {
      client_onboarding: { checklist: "Sign the order and collect a deposit\nSchedule a planning meeting\nGet the event schedule\nSend a reminder a week before" },
    } },
  { key: "consulting", name: "ייעוץ ושירותים מקצועיים", nameEn: "Consulting & professional services", icon: "💼", templates: SALES_CORE.concat(GROWTH, WEEKLY),
    overrides: {
      client_onboarding: { checklist: "לשלוח הסכם התקשרות\nלתאם פגישת פתיחה\nלקבל מסמכים מהלקוח" },
    },
    overridesEn: {
      client_onboarding: { checklist: "Send the engagement agreement\nSchedule a kickoff meeting\nCollect documents from the client" },
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

export function defaultsFor(t: Template, packKey?: string, lang: "he" | "en" = "he"): Record<string, unknown> {
  const en = lang === "en";
  const base: Record<string, unknown> = {};
  for (const f of t.config) base[f.key] = en && f.type === "text" ? f.defaultEn : f.default;
  const pack = PACKS.find((p) => p.key === packKey);
  return { ...base, ...(pack?.overrides[t.key] || {}), ...(en ? pack?.overridesEn?.[t.key] || {} : {}) };
}

// Catalog for the UI (no step internals).
export function catalog() {
  return {
    templates: Object.values(TEMPLATES).map((t) => ({
      key: t.key, icon: t.icon, name: t.name, nameEn: t.nameEn, outcome: t.outcome, outcomeEn: t.outcomeEn,
      howItWorks: t.howItWorks, howItWorksEn: t.howItWorksEn, needs: t.needs, needsEn: t.needsEn, category: t.category, config: t.config,
    })),
    packs: PACKS.map((p) => ({ key: p.key, name: p.name, nameEn: p.nameEn, icon: p.icon, templates: p.templates, overridesEn: p.overridesEn || {} })),
  };
}
