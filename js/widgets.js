/* Site-wide floating widgets: feedback/rating modal + a small rule-based
   guide chatbot. Both are self-injecting (no markup needed in the HTML
   pages) — just include this script after main.js.

   Feedback submissions go through the submit-contact-message Edge
   Function (see its own comment) — stored permanently in
   contact_messages and emailed as a notification, the same two things
   Formspree used to do, minus Formspree's 30-day free-tier retention
   limit that was silently dropping real messages. */

/* Picks the Hebrew or English variant of a chat/widget string at the
   moment it's rendered (not baked in at page load), same as every other
   dynamically-set piece of text on an i18n.js page — js/i18n.js isn't
   loaded on every page this file runs on, hence the typeof guard. */
function dkWidgetsEn() {
  return typeof currentLang === "function" && currentLang() === "en";
}
function dkWidgetsT(he, en) {
  return dkWidgetsEn() ? en : he;
}

/* Each entry's keyword list decides which entry wins for free-typed
   questions (highest keyword-match count, see chatMatch()) — so a
   pricing word like "עולה"/"מחיר" is repeated INSIDE every topic-specific
   entry rather than living in one lone generic entry. A generic entry
   used to mean "כמה עולה אתר?" (an "אתר" question) scored only on "עולה"
   and matched the CV entry's free-tools answer instead — wrong, and
   confirmed live. Now the sites entry itself carries "עולה"/"מחיר", so a
   question mentioning both "אתר" and "עולה" outscores anything vaguer.
   Keyword matching stays Hebrew/English-mixed regardless of UI language
   (a visitor types in whichever language they think in) — only the `a`
   answer and link label actually displayed switch with aEn/linkLabelEn. */
const CHAT_FAQ = [
  /* ---- Specific topics first: on a keyword-count tie, the earlier entry
     wins, so "אפשר להוסיף בס"ד לאתר?" lands on בס"ד, not on the generic
     sites entry further down. ---- */
  { kw: ["בס\"ד", "בס״ד", "בס''ד", "בס”ד", "בסד", "בעזרת השם", "בסייעתא", "b\"h", "bsd"],
    a: "כן! בכל הכלים אפשר להוסיף בס\"ד קטן בפינה הימנית העליונה — הוא כבוי כברירת מחדל ומדליקים אותו במתג: באתר — ב\"פרטי העסק ועיצוב\" או בחלק ה-Hero; בקורות חיים — ב\"עיצוב והגדרות\"; בהצעת מחיר — ב\"עיצוב ופרטי העסק\"; בחשבונית — ב\"פרטי העסק\" (לפני הפקה סופית).",
    aEn: "Yes! Every tool can add a small \"בס\"ד\" in the top-right corner — it's off by default and turned on with a switch: on a website — in \"Business details & design\" or in the Hero section; on a resume — in \"Design & settings\"; on a quote — in \"Design & business details\"; on an invoice — in \"Business details\" (before it's issued)." },
  { kw: ["ats", "מערכות סינון", "סינון קורות", "התאמה למשרה", "מילות מפתח", "keywords"],
    a: "בבילדר קורות החיים יש כפתור \"בדיקת ATS\": מדביקים את מודעת המשרה, ומקבלים ציון התאמה והמלצות אילו מילות מפתח כדאי להוסיף כדי לעבור את מערכות הסינון האוטומטיות.",
    aEn: "The resume builder has an \"ATS check\" button: paste the job ad and get a match score plus suggestions for which keywords to add so you get past automated screening systems.",
    link: { href: "builder.html", label: "לבילדר קורות החיים", labelEn: "Open the resume builder" } },
  { kw: ["עמוד אחד", "שני עמודים", "2 עמודים", "דף אחד", "ארוך מדי", "one page", "two pages"],
    a: "קובץ ה-PDF של קורות החיים תמיד יוצא בעמוד אחד. אם התוכן ארוך במיוחד, הוא מוקטן קצת כדי להיכנס — ולכן כדאי לקצר נקודות ולהשאיר את הניסיון הרלוונטי ביותר.",
    aEn: "The resume PDF always comes out as a single page. If the content is especially long it's scaled down slightly to fit — so it's worth trimming bullet points and keeping the most relevant experience." },
  { kw: ["created with", "קרדיט", "מיתוג", "סימן מים", "watermark", "תגית", "נבנה ב"],
    a: "במסמכים (קורות חיים, הצעות מחיר, חשבוניות) מופיעה שורה קטנה \"Created with DeskKit.co.il\" בתחתית ה-PDF בחשבון חינמי — בחשבון Pro היא לא מופיעה. באתר החינמי מופיעה תגית קטנה \"נבנה ב-DeskKit\", שאפשר להסיר בתשלום חד-פעמי של 199 ₪.",
    aEn: "Documents (resumes, quotes, invoices) on a free account carry a small \"Created with DeskKit.co.il\" line at the bottom of the PDF — Pro accounts don't. A free website shows a small \"Built with DeskKit\" tag, which can be removed with a one-time payment of ₪199." },
  { kw: ["גרסת pro", "חשבון pro", "מה זה pro", "pro?", "שדרוג", "upgrade", "פרימיום", "premium"],
    a: "Pro הוא שדרוג בתשלום חד-פעמי (לא מנוי): בלי שורת הקרדיט בתחתית המסמכים, ויותר שימושים בכלי ה-AI. כל העריכה וההורדה הבסיסית חינמיות גם בלי Pro.",
    aEn: "Pro is a one-time-payment upgrade (not a subscription): no credit line at the bottom of documents, and more uses of the AI tools. All basic editing and downloading is free without Pro too." },
  { kw: ["מנוי", "חודשי", "subscription", "monthly", "חיוב חוזר"],
    a: "אין מנוי חודשי ואין חיוב חוזר. רוב הכלים חינמיים לגמרי, ובמקומות שיש תשלום (הסרת התגית מאתר, Pro, מערכת שעות) — הוא חד-פעמי.",
    aEn: "There's no monthly subscription and no recurring charge. Most tools are completely free, and wherever there is a payment (removing the site tag, Pro, the school schedule) it's one-time." },
  { kw: ["החזר", "ביטול עסקה", "refund", "לבטל את הרכישה", "כסף בחזרה"],
    a: "לפי חוק הגנת הצרכן, רכישת תוכן דיגיטלי שכבר נמסר אינה ניתנת לביטול. אם משהו שקיבלתם פגום או לא תואם לתיאור — כתבו לנו ונפתור את זה.",
    aEn: "Under Israeli consumer protection law, a purchase of digital content that has already been delivered can't be cancelled. If something you received is faulty or doesn't match its description — write to us and we'll sort it out.",
    link: { href: "contact.html", label: "לעמוד צור קשר", labelEn: "Go to the Contact page" } },
  { kw: ["אשראי", "לשלם", "תשלום", "gumroad", "paypal", "כרטיס", "payment", "pay"],
    a: "התשלומים (כשיש) מתבצעים בעמוד תשלום מאובטח של Gumroad — אנחנו לא רואים ולא שומרים את פרטי הכרטיס שלכם. אחרי התשלום מקבלים אישור וקבלה במייל.",
    aEn: "Payments (where there are any) go through Gumroad's secure checkout page — we never see or store your card details. After paying you get a confirmation and a receipt by email." },
  { kw: ["למחוק את החשבון", "מוחקים את החשבון", "מחיקת החשבון", "מחיקת חשבון", "למחוק חשבון", "delete account", "delete my account"],
    a: "אפשר למחוק את החשבון וכל התוכן שלו בכל עת, דרך \"החשבון שלי\" ← הגדרות ← מחיקת חשבון.",
    aEn: "You can delete your account and all its content at any time, via \"My account\" → Settings → Delete account.",
    link: { href: "account-settings.html", label: "להגדרות החשבון", labelEn: "Account settings" } },
  { kw: ["פרטיות", "אבטחה", "מאובטח", "בטוח", "privacy", "security", "מידע שלי"],
    a: "המידע שאתם שומרים נשמר מוצפן אצל Supabase, וכל משתמש יכול לגשת רק למידע שלו — ההפרדה נאכפת ברמת מסד הנתונים. אנחנו לא שומרים סיסמאות בעצמנו.",
    aEn: "What you save is stored encrypted at Supabase, and each user can access only their own data — the separation is enforced at the database level. We don't store passwords ourselves.",
    link: { href: "security.html", label: "לעמוד אבטחת המידע", labelEn: "Security page" } },
  { kw: ["שכחתי", "סיסמה", "סיסמא", "password", "להתחבר", "התחברות", "כניסה", "הרשמה", "להירשם", "login", "sign in", "sign up"],
    a: "נרשמים ומתחברים עם מייל וסיסמה או עם Google, בלי כרטיס אשראי. שכחתם סיסמה? בעמוד הכניסה יש קישור לאיפוס, ונשלח אליכם מייל.",
    aEn: "You sign up and sign in with email and password or with Google, no credit card. Forgot your password? The sign-in page has a reset link, and we'll email you.",
    link: { href: "account.html", label: "לעמוד הכניסה", labelEn: "Sign-in page" } },
  { kw: ["מסחרי", "לעסק שלי", "רישיון", "license", "commercial", "זכויות"],
    a: "כן — התוצר הסופי (קורות החיים, המצגת, האתר וכו') שלכם לשימוש אישי או עסקי ללא הגבלה. רק מכירה או הפצה מחדש של התבנית עצמה כמוצר אינה מותרת.",
    aEn: "Yes — the final result (resume, deck, site, etc.) is yours for personal or business use without limit. Only reselling or redistributing the template itself as a product isn't allowed.",
    link: { href: "terms.html", label: "לתנאי השימוש", labelEn: "Terms of use" } },
  { kw: ["דומיין", "domain", "כתובת משלי", "co.il", ".com"],
    a: "האתר מתפרסם בחינם עם קישור משלו. אם תרצו דומיין משלכם (כ-60–150 ₪ לשנה אצל כל ספק דומיינים), אפשר לחבר אותו לפי המדריך שמופיע אחרי הפרסום.",
    aEn: "Your site is published for free with its own link. If you'd like your own domain (around ₪60–150 a year from any domain provider), you can connect it following the guide shown after publishing." },
  { kw: ["גוגל", "google", "seo", "קידום", "חיפוש", "למצוא אותי"],
    a: "שני דברים עוזרים הכי הרבה שיימצאו אתכם: לרשום את העסק בחינם ב-Google עסקים שלי (Google Business Profile), ולחבר לאתר דומיין משלכם.",
    aEn: "Two things help most for being found: listing your business for free on Google Business Profile, and connecting your own domain to the site." },
  { kw: ["לפרסם", "פרסום", "מפרסמים", "מפרסם", "באוויר", "publish", "online", "live"],
    a: "כשמסיימים לערוך, לוחצים \"פרסום\" בבילדר — והאתר עולה לאוויר מיד, באחסון חינמי לתמיד, עם קישור שאפשר לשתף.",
    aEn: "When you're done editing, click \"Publish\" in the builder — the site goes live immediately on free-forever hosting, with a link you can share." },
  { kw: ["אחרי הפרסום", "לעדכן את האתר", "לשנות את האתר", "לערוך את האתר", "edit my site", "update my site"],
    a: "כן, אפשר לחזור לאתר בכל זמן מ\"הפרויקטים שלי\", לערוך כל דבר וללחוץ שוב \"פרסום\" — השינויים עולים לאוויר באותו קישור.",
    aEn: "Yes — you can come back to the site anytime from \"My projects\", edit anything and click \"Publish\" again — the changes go live at the same link.",
    link: { href: "projects.html", label: "לפרויקטים שלי", labelEn: "My projects" } },
  { kw: ["וואטסאפ", "whatsapp", "ווצאפ"],
    a: "באתר יש כפתור וואטסאפ צף שמפנה ישר אליכם. ב\"פרטי העסק ועיצוב\" מגדירים אם הטלפון הוא גם הוואטסאפ, או מספר וואטסאפ אחר. בהצעת מחיר או חשבונית — מורידים PDF ושולחים ללקוח בוואטסאפ או במייל.",
    aEn: "Sites have a floating WhatsApp button that goes straight to you. In \"Business details & design\" you set whether your phone is also your WhatsApp, or a different WhatsApp number. For a quote or invoice — download the PDF and send it to the client on WhatsApp or by email." },
  { kw: ["עזרה מ-deskkit", "פקודה", "ai", "בינה מלאכותית", "צ'אט gpt", "chatgpt"],
    a: "יש כמה כלי AI: \"עזרה מ-DeskKit\" בבילדר האתרים (משנה סדר חלקים, מוסיף או מסיר חלק, או מחליף סגנון של ה-Hero והשירותים), יצירת טיוטה אוטומטית להצעות מחיר וחשבוניות, ובדיקת ATS לקורות חיים.",
    aEn: "There are a few AI tools: \"DeskKit help\" in the site builder (reorders sections, adds or removes a section, or switches the Hero and services style), automatic drafts for quotes and invoices, and an ATS check for resumes." },
  { kw: ["מערכת שעות", "בית ספר", "מורים", "כיתות", "schedule", "timetable"],
    a: "יש בונה מערכת שעות לבתי ספר: מילוי המקצועות, הכיתות, המורים והאילוצים חינמי וללא הגבלה, והשיבוץ האוטומטי שפותר את כל ההתנגשויות הוא בתשלום חד-פעמי של 499 ₪.",
    aEn: "There's a school timetable builder: entering subjects, classes, teachers and constraints is free and unlimited, and the automatic scheduling that resolves every clash is a one-time payment of ₪499.",
    link: { href: "schedule-builder.html", label: "לבונה מערכת השעות", labelEn: "Timetable builder" } },
  { kw: ["אוטומציה", "אוטומציות", "automate", "automation"],
    a: "DeskKit Automate — חיבור אוטומטי בין הכלים לבין מה שקורה בעסק, בלי קוד — עדיין בבנייה ויגיע בקרוב.",
    aEn: "DeskKit Automate — automatically connecting your tools to what happens in your business, no code — is still being built and coming soon.",
    link: { href: "automate.html", label: "לפרטים", labelEn: "Details" } },
  { kw: ["זיכוי", "טעיתי בחשבונית", "טעות בחשבונית", "לבטל חשבונית", "לבטל את החשבונית", "לתקן חשבונית", "לתקן את החשבונית", "credit note", "cancel invoice"],
    a: "חשבונית שהופקה סופית נעולה ואי אפשר לערוך או למחוק אותה (כך החוק דורש). כדי לתקן — מפיקים חשבונית זיכוי נפרדת מתוך אותה חשבונית.",
    aEn: "An invoice that's been issued is locked and can't be edited or deleted (as the law requires). To correct it — issue a separate credit note from that same invoice." },
  { kw: ["חוקי", "חוקית", "רשות המסים", "מספר הקצאה", "legal", "tax authority"],
    a: "חשבונית דיגיטלית חוקית לגמרי בישראל — אין חובה לפנקס נייר. שימו לב: לעסקאות מעל סף מסוים (20,000 ₪ לפני מע\"מ ב-2025, ויורד בהדרגה) רשות המסים דורשת \"מספר הקצאה\" — כדאי לבדוק מול רואה החשבון שלכם.",
    aEn: "A digital invoice is fully legal in Israel — there's no requirement for a paper receipt book. Note: for deals above a certain threshold (₪20,000 before VAT in 2025, decreasing gradually) the Tax Authority requires an \"allocation number\" — check with your accountant.",
    link: { href: "invoice-product.html", label: "עוד על חשבוניות", labelEn: "More about invoices" } },
  { kw: ["מע\"מ", "מעמ", "מע״מ", "vat", "עוסק מורשה"],
    a: "בחשבוניות בוחרים בפרטי העסק עוסק מורשה (עם מע\"מ ושיעור מע\"מ) או עוסק פטור (בלי מע\"מ, עם הנוסח המתאים). בהצעות מחיר יש שדה \"הערת מע\"מ\" לכתוב אם המחיר כולל מע\"מ או לא.",
    aEn: "For invoices you choose in your business details between a licensed dealer (with VAT and a VAT rate) or a tax-exempt dealer (no VAT, with the right wording). Quotes have a \"VAT note\" field to state whether the price includes VAT." },
  { kw: ["לוגו", "logo"],
    a: "את הלוגו מעלים פעם אחת בפרטי העסק, והוא מופיע אוטומטית בכל הצעות המחיר והחשבוניות. באתר מעלים לוגו ותמונות ב\"פרטי העסק ועיצוב\".",
    aEn: "You upload your logo once in your business details, and it appears automatically on every quote and invoice. On a website you upload a logo and images in \"Business details & design\"." },
  { kw: ["נייד", "סלולר", "טלפון נייד", "mobile", "phone", "מכשיר"],
    a: "האתרים שנבנים כאן מותאמים לנייד. בבילדר האתרים יש כפתורי מחשב / טאבלט / נייד למעלה, כדי לראות איך האתר ייראה בכל מכשיר. את העריכה עצמה הכי נוח לעשות ממחשב.",
    aEn: "Sites built here are mobile-friendly. The site builder has desktop / tablet / mobile buttons at the top so you can see how it looks on each device. Editing itself is most comfortable on a computer." },
  { kw: ["אתר באנגלית", "site in english", "website in english"],
    a: "תבניות האתרים בנויות כרגע בעברית (מימין לשמאל). קורות חיים, לעומת זאת, אפשר ליצור גם באנגלית.",
    aEn: "Site templates are currently built in Hebrew (right-to-left). Resumes, on the other hand, can be created in English too." },
  { kw: ["נגישות", "accessibility"],
    a: "הצהרת הנגישות של DeskKit נמצאת בעמוד הנגישות (גם דרך הכפתור הצף בפינה).",
    aEn: "DeskKit's accessibility statement is on the Accessibility page (also via the floating button in the corner).",
    link: { href: "accessibility.html", label: "להצהרת הנגישות", labelEn: "Accessibility statement" } },
  { kw: ["בוט", "אדם אמיתי", "נציג", "בן אדם", "human", "are you a bot", "robot"],
    a: "אני עוזר אוטומטי עם תשובות מוכנות לשאלות הנפוצות 🤖 לשאלה שלא מצאתם כאן תשובה — כתבו לנו בעמוד צור קשר, ואדם אמיתי יחזור אליכם.",
    aEn: "I'm an automated assistant with ready answers to common questions 🤖 For anything you can't find here — write to us on the Contact page and a real person will get back to you.",
    link: { href: "contact.html", label: "לעמוד צור קשר", labelEn: "Go to the Contact page" } },
  { kw: ["מי בנה", "מי עומד", "מי אתם", "who are you", "who made", "about deskkit"],
    a: "DeskKit נוצר ומופעל באופן עצמאי על ידי דבורה צדוק — כלים ומסמכים דיגיטליים לעסקים, במקום אחד.",
    aEn: "DeskKit is independently created and run by Devorah Zadock — digital tools and documents for businesses, in one place.",
    link: { href: "about.html", label: "לעמוד אודות", labelEn: "About page" } },
  { kw: ["מדריך", "מדריכים", "טיפים", "guide", "tips"],
    a: "יש מדריכים קצרים: מה חייב להיות באתר עסקי, טיפים לכתיבת קורות חיים, ובניית מערכת שעות.",
    aEn: "There are short guides: what a business website must have, resume-writing tips, and building a school timetable.",
    link: { href: "guides.html", label: "למדריכים", labelEn: "Guides" } },

  /* ---- Broader topics ---- */
  { kw: ["קו\"ח", "קוח", "קורות חיים", "cv", "resume", "בילדר", "builder", "עולה", "כמה", "מחיר", "cost", "price"],
    a: "עריכת קורות החיים בבילדר חופשית וללא הגבלה, גם בלי חשבון — הרשמה מהירה נדרשת רק בשמירה או בהורדת ה-PDF, שהיא עצמה חינמית לגמרי.",
    aEn: "Editing your resume in the builder is free and unlimited, even without an account — a quick signup is only needed to save or download the PDF, which is itself completely free.",
    link: { href: "products.html?type=cv", label: "לתבניות קורות החיים", labelEn: "Browse resume templates" } },
  { kw: ["מצגת", "מצגות", "powerpoint", "pptx", "deck", "עולה", "כמה", "מחיר", "cost", "price"],
    a: "יש תבניות מצגות עסקיות מוכנות, כולן חינם להורדה ישירה כקובץ PowerPoint מלא לעריכה.",
    aEn: "There are ready-made business deck templates, all free to download directly as a fully-editable PowerPoint file.",
    link: { href: "products.html?type=deck", label: "לתבניות המצגות", labelEn: "Browse deck templates" } },
  { kw: ["אקסל", "excel", "xlsx", "תקציב", "גיליון", "גליון", "עולה", "כמה", "מחיר", "cost", "price"],
    a: "יש קבצי Excel מוכנים להורדה בחינם — תקציב חודשי, תזרים מזומנים, מעקב הוצאות, רווח והפסד ועוד — עם נוסחאות אמיתיות, לא מספרים קבועים.",
    aEn: "There are ready-made Excel files to download for free — monthly budget, cash flow, expense tracker, profit & loss and more — with real formulas, not fixed numbers.",
    link: { href: "products.html?type=xlsx", label: "לתבניות ה-Excel", labelEn: "Browse Excel templates" } },
  { kw: ["אתר", "אתרים", "site", "website", "תדמית", "עולה", "מחיר", "כמה", "cost", "price"],
    a: "בונים אתר עסקי תוך דקות מ-18 תבניות, עם תצוגה חיה. העריכה והפרסום חינמיים לגמרי, עם אחסון חינמי לתמיד ותגית קטנה \"נבנה ב-DeskKit\" — שאפשר להסיר בתשלום חד-פעמי של 199 ₪. בלי מנוי חודשי.",
    aEn: "You can build a business site in minutes from 18 templates, with a live preview. Editing and publishing are completely free, with free-forever hosting and a small \"Built with DeskKit\" tag — which can be removed with a one-time payment of ₪199. No monthly subscription.",
    link: { href: "sites.html", label: "לבניית אתר", labelEn: "Build a site" } },
  { kw: ["הצעת מחיר", "הצעות מחיר", "quote", "עולה", "כמה", "מחיר", "cost", "price"],
    a: "נרשמים פעם אחת עם מייל או Google וממלאים את פרטי העסק והלוגו — ומכאן כל הצעת מחיר מופקת מוכנה תוך דקה, עם תצוגה חיה והורדת PDF.",
    aEn: "You sign up once with email or Google and fill in your business details and logo — from there, every quote is generated ready in under a minute, with a live preview and a PDF download.",
    link: { href: "quote-app.html", label: "להצעות מחיר", labelEn: "Go to quotes" } },
  { kw: ["חשבונית", "חשבוניות", "קבלה", "עוסק פטור", "invoice", "receipt", "עולה", "כמה", "מחיר", "cost", "price"],
    a: "מערכת החשבוניות מפיקה חשבונית מס-קבלה או קבלה עם מספור רץ אוטומטי, מותאמת לעוסק פטור או מורשה, כ-PDF מוכן תוך דקה. יש גם תבנית Excel נפרדת להורדה.",
    aEn: "The invoicing system issues a tax invoice-receipt or a receipt with automatic sequential numbering, suited to a tax-exempt or licensed dealer, as a ready PDF in under a minute. There's also a separate Excel template to download.",
    link: { href: "invoice-app.html", label: "לחשבוניות וקבלות", labelEn: "Go to invoices & receipts" } },
  { kw: ["crm", "ניהול לקוחות", "לידים", "קנבן"],
    a: "מערכת CRM פשוטה עם לוח קנבן, ישירות בדפדפן — עוזרת לעקוב אחרי לידים ולקוחות בלי אקסל מבולגן.",
    aEn: "There's a simple CRM with a kanban board, right in the browser — it helps you track leads and customers without a messy spreadsheet.",
    link: { href: "crm-product.html", label: "למערכת ה-CRM", labelEn: "Go to the CRM" } },
  { kw: ["צבע", "גופן", "פונט", "עיצוב", "פלטה", "סגנון", "font", "color", "style"],
    a: "בכל הבילדרים בוחרים צבע ראשי וגופן, וברוב הכלים גם \"סגנון עיצוב\" — שמחליף את המראה בלי לאבד את התוכן. התצוגה החיה מתעדכנת מיד.",
    aEn: "In every builder you pick a primary color and font, and in most tools a \"design style\" too — which changes the look without losing your content. The live preview updates instantly." },
  { kw: ["תמונה", "תמונות", "פרופיל", "אווטאר", "photo", "picture", "image"],
    a: "בקורות חיים אפשר להעלות תמונת פרופיל (או להסיר אותה) — היא מופיעה בעיגול ליד השם. באתר מעלים תמונות ללוגו, לכותרת ולגלריה ב\"פרטי העסק ועיצוב\".",
    aEn: "On a resume you can upload a profile photo (or remove it) — it appears in a circle next to your name. On a website you upload images for the logo, header and gallery in \"Business details & design\"." },
  { kw: ["אנגלית", "english", "שפה", "language", "עברית", "ltr", "rtl"],
    a: "כפתור EN / עברית בראש כל עמוד מחליף את שפת הממשק. בבילדר קורות החיים יש גם בחירת שפה לקורות החיים עצמם — עברית או אנגלית, כולל היפוך כיוון אוטומטי.",
    aEn: "The EN / עברית button at the top of every page switches the interface language. The resume builder also lets you choose the resume's own language — Hebrew or English — with automatic direction flipping." },
  { kw: ["הורדה", "להוריד", "pdf", "export", "הדפסה", "להדפיס", "download", "print"],
    a: "לוחצים \"הורדת PDF\" בבילדר, והקובץ יורד ישר למחשב — מוכן לשליחה או להדפסה.",
    aEn: "Click \"Download PDF\" in the builder and the file downloads straight to your computer — ready to send or print." },
  { kw: ["שמירה", "נשמר", "נשמרת", "לשמור", "אבד", "save", "saved", "ענן", "cloud"],
    a: "הטיוטה נשמרת אוטומטית בדפדפן תוך כדי עבודה, ואחרי הרשמה גם בענן — אפשר להמשיך לערוך מכל מכשיר דרך \"הפרויקטים שלי\".",
    aEn: "Your draft is saved automatically in the browser as you work, and after signing up in the cloud too — you can keep editing from any device via \"My projects\".",
    link: { href: "projects.html", label: "לפרויקטים שלי", labelEn: "My projects" } },
  { kw: ["צור קשר", "יצירת קשר", "קשר", "מייל", "email", "contact", "בעיה", "תקלה", "באג", "bug", "לא עובד"],
    a: "אפשר לכתוב לנו דרך עמוד צור קשר או ישירות ל-digital.dz.studio@gmail.com, ונחזור אליכם בהקדם.",
    aEn: "You can write to us through the Contact page or directly at digital.dz.studio@gmail.com, and we'll get back to you soon.",
    link: { href: "contact.html", label: "לעמוד צור קשר", labelEn: "Go to the Contact page" } },
  { kw: ["קטלוג", "מוצרים", "תבניות", "products", "templates"],
    a: "כל התבניות — קורות חיים, מצגות וגיליונות Excel — נמצאות בקטלוג, מסונן לפי קטגוריה.",
    aEn: "All the templates — resumes, decks and Excel spreadsheets — are in the catalog, filterable by category.",
    link: { href: "products.html", label: "לקטלוג המלא", labelEn: "Go to the full catalog" } },
  { kw: ["חינם", "free"],
    a: "רוב DeskKit חינמי: עריכה והורדה של קורות חיים, מצגות וגיליונות, הצעות מחיר וחשבוניות, ובנייה ופרסום של אתר. תשלום חד-פעמי יש רק על תוספות — הסרת התגית מאתר, Pro, ומערכת שעות אוטומטית.",
    aEn: "Most of DeskKit is free: editing and downloading resumes, decks and spreadsheets, quotes and invoices, and building and publishing a site. There's a one-time payment only for extras — removing the site tag, Pro, and the automatic school timetable." },
];
const CHAT_FALLBACK = {
  a: "זה נראה לא קשור לכלים של DeskKit — אפשר לנסות לשאול אחרת (קורות חיים, אתרים, הצעות מחיר, חשבוניות...), או לפנות אלינו ישירות.",
  aEn: "That doesn't seem related to DeskKit's tools — you can try asking differently (resumes, sites, quotes, invoices...), or contact us directly.",
  link: { href: "contact.html", label: "לעמוד צור קשר", labelEn: "Go to the Contact page" },
};

/* Small, honest "not really AI" layer: a handful of genuinely useful
   things a browser already knows for free (current time/date, basic
   arithmetic) — answered for real, with a light note that it's outside
   what DeskKit's tools actually do, instead of either faking real
   understanding or silently ignoring the question. Checked only after
   CHAT_FAQ finds zero keyword matches, so a real product question never
   gets shadowed by this. */
function chatUtilityAnswer(q) {
  const en = dkWidgetsEn();
  if (/שעה/.test(q)) {
    const time = new Date().toLocaleTimeString(en ? "en-US" : "he-IL", { hour: "2-digit", minute: "2-digit" });
    return { a: en
      ? `That's a bit outside what we cover here 🙂 Anyway — the time right now is ${time}. Now seriously: can I help with resumes, sites, quotes or invoices?`
      : `זו שאלה שקצת חורגת מהנושא שלנו כאן 🙂 בכל מקרה — השעה עכשיו היא ${time}. עכשיו ברצינות: אפשר לעזור עם קורות חיים, אתרים, הצעות מחיר או חשבוניות?` };
  }
  if (/תאריך|איזה יום/.test(q)) {
    const date = new Date().toLocaleDateString(en ? "en-US" : "he-IL", { day: "numeric", month: "long", year: "numeric" });
    return { a: en
      ? `That's not really related to our tools, but customer service mode: today is ${date}. What can I help you with here on DeskKit?`
      : `זה לא ממש קשור לכלים שלנו, אבל שירות לקוחות: היום ${date}. במה אפשר לעזור לך כאן ב-DeskKit?` };
  }
  const mathMatch = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*xX×÷/])\s*(-?\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const b = parseFloat(mathMatch[3]);
    let result;
    if (op === "+") result = a + b;
    else if (op === "-") result = a - b;
    else if (op === "*" || op === "x" || op === "X" || op === "×") result = a * b;
    else if (op === "/" || op === "÷") result = b === 0 ? null : a / b;
    if (result !== null && result !== undefined && Number.isFinite(result)) {
      const rounded = Math.round(result * 1000) / 1000;
      return { a: en
        ? `Outside our scope, but happy to: ${mathMatch[1]} ${mathMatch[2]} ${mathMatch[3]} = ${rounded}. Now — what can I help you with on DeskKit?`
        : `חוץ מהתחום שלנו, אבל בשמחה: ${mathMatch[1]} ${mathMatch[2]} ${mathMatch[3]} = ${rounded}. עכשיו — במה אפשר לעזור לך עם DeskKit?` };
    }
  }
  return null;
}

/* The category tree shown when the chat opens, in place of the old flat
   list of quick-suggestion chips — grouped to match the tool families
   that actually exist on the site today, with answers that reflect each
   tool's real current behavior (free editing vs. gated download, autosave,
   etc.) rather than generic copy. */
const CHAT_CATEGORIES = [
  {
    id: "cv",
    icon: "📄",
    label: "קורות חיים ומצגות", labelEn: "Resumes & decks",
    items: [
      { q: "האם עריכת קורות החיים בחינם?", qEn: "Is editing a resume free?",
        a: "לגמרי. עריכת התוכן, הצבע והגופן בבילדר פתוחה לכולם בלי הרשמה — הרשמה מהירה (מייל או Google) נדרשת רק ברגע השמירה או ההורדה, בלי כרטיס אשראי.",
        aEn: "Completely. Editing the content, color and font in the builder is open to everyone, no signup needed — a quick signup (email or Google) is only required when you save or download, no credit card.",
        link: { href: "products.html?type=cv", label: "לתבניות קורות החיים", labelEn: "Browse resume templates" } },
      { q: "אפשר ליצור קורות חיים באנגלית?", qEn: "Can I create a resume in English?",
        a: "כן — בראש בילדר קורות החיים בוחרים עברית או English, וכל התבנית מתהפכת לכיוון הנכון אוטומטית.",
        aEn: "Yes — at the top of the resume builder you choose עברית or English, and the whole template flips to the right direction automatically." },
      { q: "מה זו בדיקת ATS?", qEn: "What is the ATS check?",
        a: "בבילדר קורות החיים יש כפתור \"בדיקת ATS\": מדביקים את מודעת המשרה, ומקבלים ציון התאמה והמלצות אילו מילות מפתח להוסיף כדי לעבור את מערכות הסינון האוטומטיות.",
        aEn: "The resume builder has an \"ATS check\" button: paste the job ad and get a match score plus suggestions for which keywords to add to get past automated screening systems." },
      { q: "קורות החיים יוצאים בעמוד אחד?", qEn: "Does the resume come out on one page?",
        a: "כן, ה-PDF תמיד יוצא בעמוד אחד. אם התוכן ארוך במיוחד הוא מוקטן קצת כדי להיכנס — לכן כדאי לקצר ולהשאיר את הניסיון הרלוונטי ביותר.",
        aEn: "Yes, the PDF always comes out on one page. If the content is especially long it's scaled down slightly to fit — so it's worth trimming and keeping the most relevant experience." },
      { q: "העבודה שלי נשמרת אוטומטית?", qEn: "Is my work saved automatically?",
        a: "כן — הטיוטה נשמרת אוטומטית בדפדפן תוך כדי הקלדה, גם בלי חשבון. אחרי הרשמה אפשר גם לשמור לענן ולהמשיך לערוך מכל מכשיר.",
        aEn: "Yes — the draft is saved automatically in the browser as you type, even without an account. After signing up you can also save to the cloud and keep editing from any device." },
      { q: "יש גם תבניות מצגות ו-Excel?", qEn: "Are there deck and Excel templates too?",
        a: "כן — תבניות מצגות עסקיות (PowerPoint) וגיליונות Excel עם נוסחאות אמיתיות, כולם חינם להורדה ישירה כקובץ פתוח לעריכה.",
        aEn: "Yes — business deck templates (PowerPoint) and Excel spreadsheets with real formulas, all free to download directly as an editable file.",
        link: { href: "products.html", label: "לקטלוג", labelEn: "Go to the catalog" } },
    ],
  },
  {
    id: "sites",
    icon: "🌐",
    label: "בניית אתרים ודומיינים", labelEn: "Building sites & domains",
    items: [
      { q: "איך בונים אתר עסקי?", qEn: "How do I build a business site?",
        a: "בוחרים אחת מ-18 תבניות מוכנות, עונים על כמה שאלות על העסק, ועורכים טקסטים, תמונות, צבעים וגופנים עם תצוגה חיה — בלי לדעת לתכנת.",
        aEn: "You pick one of 18 ready templates, answer a few questions about your business, and edit texts, images, colors and fonts with a live preview — no coding knowledge needed.",
        link: { href: "sites.html", label: "לבניית אתר", labelEn: "Build a site" } },
      { q: "כמה עולה לבנות ולפרסם אתר?", qEn: "How much does it cost to build and publish a site?",
        a: "הבנייה והפרסום חינמיים לגמרי, עם אחסון חינמי לתמיד ותגית קטנה \"נבנה ב-DeskKit\". את התגית אפשר להסיר בתשלום חד-פעמי של 199 ₪ — בלי מנוי חודשי.",
        aEn: "Building and publishing are completely free, with free-forever hosting and a small \"Built with DeskKit\" tag. The tag can be removed with a one-time payment of ₪199 — no monthly subscription." },
      { q: "אפשר לערוך את האתר אחרי הפרסום?", qEn: "Can I edit the site after publishing?",
        a: "כן — חוזרים לאתר מ\"הפרויקטים שלי\", עורכים, ולוחצים שוב \"פרסום\". השינויים עולים לאוויר באותו קישור.",
        aEn: "Yes — open the site from \"My projects\", edit, and click \"Publish\" again. The changes go live at the same link." },
      { q: "איך מחברים דומיין אישי?", qEn: "How do I connect a custom domain?",
        a: "האתר עולה עם קישור משלו בחינם. לדומיין משלכם (כ-60–150 ₪ לשנה אצל כל ספק) — מחברים לפי המדריך שמופיע אחרי הפרסום.",
        aEn: "The site goes live with its own free link. For your own domain (around ₪60–150 a year from any provider) — connect it following the guide shown after publishing." },
      { q: "איך מגיעים לגוגל?", qEn: "How do people find me on Google?",
        a: "שני דברים עוזרים הכי הרבה: לרשום את העסק בחינם ב-Google עסקים שלי, ולחבר לאתר דומיין משלכם.",
        aEn: "Two things help most: listing your business for free on Google Business Profile, and connecting your own domain to the site." },
      { q: "מה יודע לעשות \"עזרה מ-DeskKit\"?", qEn: "What can \"DeskKit help\" do?",
        a: "בבילדר האתרים הוא יודע לשנות את סדר החלקים, להוסיף או להסיר חלק, ולהחליף סגנון של ה-Hero (קלאסי / ממורכז) ושל השירותים (רגיל / רשת כרטיסים). צבע וגופן משנים ב\"פרטי העסק ועיצוב\".",
        aEn: "In the site builder it can reorder sections, add or remove a section, and switch the Hero style (classic / centered) and the services style (default / card grid). Color and font are changed in \"Business details & design\"." },
    ],
  },
  {
    id: "biz",
    icon: "💼",
    label: "הצעות מחיר וחשבוניות", labelEn: "Quotes & invoices",
    items: [
      { q: "איך מתחילים?", qEn: "How do I get started?",
        a: "נרשמים פעם אחת עם מייל או Google וממלאים את פרטי העסק והלוגו — ומכאן והלאה כל הצעת מחיר או חשבונית מופקת מוכנה תוך דקה.",
        aEn: "You sign up once with email or Google and fill in your business details and logo — from then on, every quote or invoice is generated ready in under a minute." },
      { q: "החשבוניות מתאימות לעוסק פטור?", qEn: "Are the invoices suitable for a tax-exempt dealer?",
        a: "כן — עוסק פטור או מורשה, עם או בלי מע\"מ, ומספור רץ אוטומטי של חשבונית מס-קבלה או קבלה.",
        aEn: "Yes — tax-exempt or licensed dealer, with or without VAT, and automatic sequential numbering of a tax invoice-receipt or a receipt.",
        link: { href: "invoice-app.html", label: "לחשבוניות וקבלות", labelEn: "Go to invoices & receipts" } },
      { q: "חשבונית דיגיטלית חוקית?", qEn: "Is a digital invoice legal?",
        a: "כן, לגמרי — אין חובה לפנקס נייר. לעסקאות מעל סף מסוים (20,000 ₪ לפני מע\"מ ב-2025, ויורד בהדרגה) רשות המסים דורשת \"מספר הקצאה\" — כדאי לבדוק מול רואה החשבון.",
        aEn: "Yes, fully — there's no requirement for a paper receipt book. For deals above a certain threshold (₪20,000 before VAT in 2025, decreasing gradually) the Tax Authority requires an \"allocation number\" — check with your accountant." },
      { q: "טעיתי בחשבונית — איך מתקנים?", qEn: "I made a mistake on an invoice — how do I fix it?",
        a: "חשבונית שהופקה סופית נעולה ואי אפשר לערוך או למחוק אותה (כך החוק דורש). מתקנים בהפקת חשבונית זיכוי נפרדת מתוך אותה חשבונית.",
        aEn: "An issued invoice is locked and can't be edited or deleted (as the law requires). You fix it by issuing a separate credit note from that same invoice." },
      { q: "איך שולחים ללקוח?", qEn: "How do I send it to a client?",
        a: "לוחצים \"הורדת PDF\", והקובץ יורד מוכן — שולחים אותו בוואטסאפ או במייל כמו כל קובץ.",
        aEn: "Click \"Download PDF\" and the file downloads ready — send it on WhatsApp or by email like any file." },
    ],
  },
  {
    id: "design",
    icon: "✨",
    label: "עיצוב, שפה ותוספות", labelEn: "Design, language & extras",
    items: [
      { q: "אפשר לשנות צבעים וגופן?", qEn: "Can I change colors and font?",
        a: "כן — בכל הבילדרים בוחרים צבע ראשי וגופן, וברוב הכלים גם \"סגנון עיצוב\" שמחליף את המראה בלי לאבד את התוכן.",
        aEn: "Yes — every builder lets you pick a primary color and font, and most tools also have a \"design style\" that changes the look without losing your content." },
      { q: "איך עוברים לאנגלית?", qEn: "How do I switch to English?",
        a: "כפתור EN / עברית בראש כל עמוד מחליף את שפת הממשק. בבילדר קורות החיים בוחרים גם את שפת קורות החיים עצמם.",
        aEn: "The EN / עברית button at the top of every page switches the interface language. In the resume builder you also choose the resume's own language." },
      { q: "אפשר להוסיף בס\"ד בראש המסמך?", qEn: "Can I add \"בס\"ד\" at the top?",
        a: "כן — בכל הכלים יש מתג לבס\"ד קטן בפינה הימנית העליונה (כבוי כברירת מחדל): באתר — ב\"פרטי העסק ועיצוב\" או בחלק ה-Hero; בקורות חיים — ב\"עיצוב והגדרות\"; בהצעת מחיר — ב\"עיצוב ופרטי העסק\"; בחשבונית — ב\"פרטי העסק\" (לפני הפקה סופית).",
        aEn: "Yes — every tool has a switch for a small \"בס\"ד\" in the top-right corner (off by default): on a website — in \"Business details & design\" or in the Hero section; on a resume — in \"Design & settings\"; on a quote — in \"Design & business details\"; on an invoice — in \"Business details\" (before it's issued)." },
      { q: "אפשר להוריד את \"Created with DeskKit\"?", qEn: "Can I remove \"Created with DeskKit\"?",
        a: "בחשבון Pro (תשלום חד-פעמי) השורה לא מופיעה במסמכים. באתר, את התגית \"נבנה ב-DeskKit\" מסירים בתשלום חד-פעמי של 199 ₪.",
        aEn: "On a Pro account (one-time payment) the line doesn't appear on documents. On a website, the \"Built with DeskKit\" tag is removed with a one-time payment of ₪199." },
    ],
  },
  {
    id: "account",
    icon: "🔒",
    label: "חשבון, תשלום ופרטיות", labelEn: "Account, payment & privacy",
    items: [
      { q: "יש מנוי חודשי?", qEn: "Is there a monthly subscription?",
        a: "לא. רוב הכלים חינמיים לגמרי, ובמקומות שיש תשלום — הוא חד-פעמי.",
        aEn: "No. Most tools are completely free, and wherever there's a payment it's one-time." },
      { q: "איך משלמים?", qEn: "How do I pay?",
        a: "בעמוד תשלום מאובטח של Gumroad — אנחנו לא רואים ולא שומרים את פרטי הכרטיס. אחרי התשלום מקבלים אישור וקבלה במייל.",
        aEn: "Through Gumroad's secure checkout page — we never see or store your card details. After paying you get a confirmation and a receipt by email." },
      { q: "המידע שלי בטוח?", qEn: "Is my data safe?",
        a: "כן — הוא נשמר מוצפן אצל Supabase, וכל משתמש יכול לגשת רק למידע שלו. אנחנו לא שומרים סיסמאות בעצמנו.",
        aEn: "Yes — it's stored encrypted at Supabase, and each user can access only their own data. We don't store passwords ourselves.",
        link: { href: "security.html", label: "לעמוד אבטחת המידע", labelEn: "Security page" } },
      { q: "איך מוחקים את החשבון?", qEn: "How do I delete my account?",
        a: "דרך \"החשבון שלי\" ← הגדרות ← מחיקת חשבון. החשבון וכל התוכן שלו נמחקים.",
        aEn: "Via \"My account\" → Settings → Delete account. The account and all its content are deleted.",
        link: { href: "account-settings.html", label: "להגדרות החשבון", labelEn: "Account settings" } },
      { q: "אפשר לקבל החזר?", qEn: "Can I get a refund?",
        a: "לפי חוק הגנת הצרכן, תוכן דיגיטלי שכבר נמסר אינו ניתן לביטול. אם משהו פגום או לא תואם לתיאור — כתבו לנו ונפתור את זה.",
        aEn: "Under consumer protection law, digital content that's already been delivered can't be cancelled. If something is faulty or doesn't match its description — write to us and we'll sort it out.",
        link: { href: "contact.html", label: "לעמוד צור קשר", labelEn: "Go to the Contact page" } },
    ],
  },
];

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function chatMatch(text) {
  const q = String(text || "").trim().toLowerCase();
  if (!q) return null;
  // Guide pages (guide-*.html) shouldn't surface a CRM link — the CRM
  // product (crm-product.html) isn't a fully supported, promoted tool
  // the way CV/sites/quote/invoice are, and routing a guide-page reader
  // into it from the floating chatbot was reported live as exactly the
  // kind of stray cross-promo link guide pages shouldn't carry.
  const onGuidePage = /\/?guide-[^/]*\.html/.test(location.pathname);
  const faq = onGuidePage ? CHAT_FAQ.filter((item) => !item.link || item.link.href !== "crm-product.html") : CHAT_FAQ;
  // A plain arithmetic question ("כמה זה 5*6") would otherwise be
  // claimed by the price words ("כמה") several entries carry.
  if (/\d\s*[+\-*xX×÷/]\s*\d/.test(q)) {
    const util = chatUtilityAnswer(q);
    if (util) return util;
  }
  let best = null, bestScore = 0;
  faq.forEach((item) => {
    const score = item.kw.filter((k) => q.includes(k.toLowerCase())).length;
    if (score > bestScore) { bestScore = score; best = item; }
  });
  if (best) return best;
  return chatUtilityAnswer(q) || CHAT_FALLBACK;
}

// Picks a {he, en} pair's link label at render time.
function dkWidgetsLinkLabel(link) {
  if (!link) return "";
  return dkWidgetsEn() ? (link.labelEn || link.label) : link.label;
}

function bubbleHtml(text, link, who) {
  return `<div class="chat-msg chat-msg-${who}">
    <div class="chat-bubble">${escapeHtml(text)}${link ? `<a href="${link.href}" class="chat-link">${escapeHtml(dkWidgetsLinkLabel(link))} ←</a>` : ""}</div>
  </div>`;
}

function injectFeedbackWidget() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="fab fab-feedback no-print" id="feedback-fab" title="${dkWidgetsT("שתפו משוב", "Share feedback")}" aria-label="${dkWidgetsT("שתפו משוב", "Share feedback")}">★</button>
    <div class="widget-overlay no-print" id="feedback-overlay">
      <div class="widget-modal">
        <button type="button" class="widget-close" id="feedback-close" aria-label="${dkWidgetsT("סגירה", "Close")}">✕</button>
        <h3>${dkWidgetsT("מה דעתכם על DeskKit?", "What do you think of DeskKit?")}</h3>
        <p class="widget-sub">${dkWidgetsT("דירוג קצר עוזר לנו להשתפר — לוקח חצי דקה.", "A quick rating helps us improve — takes half a minute.")}</p>
        <div class="star-row" id="star-row">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-star="${n}" aria-label="${n} ${dkWidgetsT("כוכבים", "stars")}">★</button>`).join("")}</div>
        <textarea id="feedback-text" rows="3" placeholder="${dkWidgetsT("רוצים להוסיף עוד משהו? (לא חובה)", "Want to add anything else? (optional)")}"></textarea>
        <button type="button" class="btn btn-gold" id="feedback-submit" style="width:100%;">${dkWidgetsT("שליחת משוב", "Send feedback")}</button>
        <div class="widget-note" id="feedback-note"></div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  let rating = 0;
  const stars = wrap.querySelectorAll(".star");
  stars.forEach((s) => s.addEventListener("click", () => {
    rating = Number(s.dataset.star);
    stars.forEach((st) => st.classList.toggle("filled", Number(st.dataset.star) <= rating));
  }));

  const overlay = document.getElementById("feedback-overlay");
  const closeFeedback = () => overlay.classList.remove("open");
  document.getElementById("feedback-fab").addEventListener("click", () => overlay.classList.add("open"));
  document.getElementById("feedback-close").addEventListener("click", closeFeedback);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeFeedback(); });

  document.getElementById("feedback-submit").addEventListener("click", async () => {
    const note = document.getElementById("feedback-note");
    if (!rating) { note.textContent = dkWidgetsT("בחרו דירוג לפני השליחה 🙂", "Pick a rating before sending 🙂"); note.className = "widget-note warn"; return; }
    const text = document.getElementById("feedback-text").value.trim();

    if (typeof supabaseClient === "undefined") {
      const mailHref = `mailto:digital.dz.studio@gmail.com?subject=${encodeURIComponent(dkWidgetsT("משוב על האתר — " + rating + " כוכבים", "Site feedback — " + rating + " stars"))}&body=${encodeURIComponent(text)}`;
      note.innerHTML = dkWidgetsT(
        `תודה! טופס המשוב האוטומטי עוד לא מחובר — אם תרצו, אפשר <a href="${mailHref}">לשלוח לנו את זה במייל</a>.`,
        `Thanks! The automatic feedback form isn't connected yet — if you'd like, you can <a href="${mailHref}">send it to us by email</a> instead.`
      );
      note.className = "widget-note";
      return;
    }
    note.textContent = dkWidgetsT("שולח…", "Sending…");
    note.className = "widget-note";
    try {
      const { data, error } = await supabaseClient.functions.invoke("submit-contact-message", {
        body: { rating, message: text, formType: "feedback", page: location.pathname },
      });
      if (error || !data || data.error) throw new Error((data && data.error) || "bad response");
      note.textContent = dkWidgetsT("תודה על המשוב!", "Thanks for the feedback!");
      note.className = "widget-note ok";
      document.getElementById("feedback-text").value = "";
    } catch (err) {
      note.textContent = dkWidgetsT("משהו השתבש בשליחה — נסו שוב בעוד רגע.", "Something went wrong sending this — try again in a moment.");
      note.className = "widget-note warn";
    }
  });

  // Same bug/fix as injectCookieNotice's own langchange listener — this
  // whole widget's chrome only ever rendered once, in whatever language
  // was current at page load, and never updated on a later toggle.
  document.addEventListener("deskkit:langchange", () => {
    if (!document.body.contains(wrap)) return;
    const fab = document.getElementById("feedback-fab");
    const label = dkWidgetsT("שתפו משוב", "Share feedback");
    fab.title = label;
    fab.setAttribute("aria-label", label);
    document.getElementById("feedback-close").setAttribute("aria-label", dkWidgetsT("סגירה", "Close"));
    wrap.querySelector(".widget-modal h3").textContent = dkWidgetsT("מה דעתכם על DeskKit?", "What do you think of DeskKit?");
    wrap.querySelector(".widget-sub").textContent = dkWidgetsT("דירוג קצר עוזר לנו להשתפר — לוקח חצי דקה.", "A quick rating helps us improve — takes half a minute.");
    stars.forEach((s) => s.setAttribute("aria-label", `${s.dataset.star} ${dkWidgetsT("כוכבים", "stars")}`));
    document.getElementById("feedback-text").placeholder = dkWidgetsT("רוצים להוסיף עוד משהו? (לא חובה)", "Want to add anything else? (optional)");
    document.getElementById("feedback-submit").textContent = dkWidgetsT("שליחת משוב", "Send feedback");
  });
}

function injectAccessibilityFab() {
  const a = document.createElement("a");
  a.href = "accessibility.html";
  a.className = "fab fab-a11y no-print";
  const label = dkWidgetsT("הצהרת נגישות", "Accessibility statement");
  a.title = label;
  a.setAttribute("aria-label", label);
  a.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M12 7c-1.1 0-2 .9-2 2v3.5L6.5 14l1 2 3-1.5V22h3v-6.5l1.5.8 2.5-4-3-1.6V9c0-1.1-.9-2-2-2z"/></svg>';
  document.body.appendChild(a);

  // Same bug/fix as injectCookieNotice's own langchange listener.
  document.addEventListener("deskkit:langchange", () => {
    if (!document.body.contains(a)) return;
    const newLabel = dkWidgetsT("הצהרת נגישות", "Accessibility statement");
    a.title = newLabel;
    a.setAttribute("aria-label", newLabel);
  });
}

function injectChatWidget() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <button type="button" class="fab fab-chat no-print" id="chat-fab" title="${dkWidgetsT("עוזר DeskKit", "DeskKit Assistant")}" aria-label="${dkWidgetsT("פתיחת צ'אט עזרה", "Open help chat")}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><circle cx="8" cy="11" r="1.3" fill="#fff"/><circle cx="12" cy="11" r="1.3" fill="#fff"/><circle cx="16" cy="11" r="1.3" fill="#fff"/></svg></button>
    <div class="chat-panel no-print" id="chat-panel">
      <div class="chat-head">
        <span id="chat-head-label">${dkWidgetsT("עוזר DeskKit", "DeskKit Assistant")}</span>
        <button type="button" class="widget-close" id="chat-close" aria-label="${dkWidgetsT("סגירה", "Close")}">✕</button>
      </div>
      <div class="chat-body" id="chat-body"></div>
      <div class="chat-quick" id="chat-quick"></div>
      <form class="chat-input-row" id="chat-form">
        <input type="text" id="chat-input" placeholder="${dkWidgetsT("כתבו שאלה...", "Type a question...")}" autocomplete="off">
        <button type="submit" class="btn btn-gold">${dkWidgetsT("שליחה", "Send")}</button>
      </form>
    </div>`;
  document.body.appendChild(wrap);

  const panel = document.getElementById("chat-panel");
  const body = document.getElementById("chat-body");
  const quick = document.getElementById("chat-quick");
  let greeted = false;

  function addMsg(text, link, who) {
    body.insertAdjacentHTML("beforeend", bubbleHtml(text, link, who));
    body.scrollTop = body.scrollHeight;
  }

  // Top-level category buttons — the chat's home screen.
  function renderCategoryMenu() {
    quick.innerHTML = CHAT_CATEGORIES.map((cat) =>
      `<button type="button" class="chat-menu-btn" data-cat="${cat.id}">${cat.icon} ${escapeHtml(dkWidgetsEn() ? cat.labelEn : cat.label)}</button>`
    ).join("");
  }

  // A category's 2-3 questions, plus a way back to the category menu.
  function renderCategoryQuestions(catId) {
    const cat = CHAT_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return renderCategoryMenu();
    quick.innerHTML =
      `<button type="button" class="chat-menu-btn chat-menu-back" data-back="1">⬅ ${dkWidgetsT("חזרה לתפריט הראשי", "Back to main menu")}</button>` +
      cat.items.map((item, i) =>
        `<button type="button" class="chat-menu-btn" data-cat="${cat.id}" data-item="${i}">${escapeHtml(dkWidgetsEn() ? item.qEn : item.q)}</button>`
      ).join("");
  }

  function ask(text) {
    if (!text.trim()) return;
    addMsg(text, null, "user");
    const match = chatMatch(text);
    setTimeout(() => addMsg(dkWidgetsEn() ? (match.aEn || match.a) : match.a, match.link, "bot"), 300);
  }

  document.getElementById("chat-fab").addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open") && !greeted) {
      greeted = true;
      addMsg(dkWidgetsT("היי! אני העוזר של DeskKit 🤖 אפשר לבחור נושא למטה, או לכתוב שאלה בעצמכם.", "Hi! I'm the DeskKit assistant 🤖 You can pick a topic below, or type your own question."), null, "bot");
      renderCategoryMenu();
    }
  });
  document.getElementById("chat-close").addEventListener("click", () => panel.classList.remove("open"));
  quick.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.back) { renderCategoryMenu(); return; }
    if (btn.dataset.item !== undefined) {
      const cat = CHAT_CATEGORIES.find((c) => c.id === btn.dataset.cat);
      const item = cat && cat.items[Number(btn.dataset.item)];
      if (!item) return;
      addMsg(dkWidgetsEn() ? item.qEn : item.q, null, "user");
      setTimeout(() => addMsg(dkWidgetsEn() ? item.aEn : item.a, item.link, "bot"), 300);
      return;
    }
    if (btn.dataset.cat) {
      const cat = CHAT_CATEGORIES.find((c) => c.id === btn.dataset.cat);
      if (!cat) return;
      addMsg(cat.icon + " " + (dkWidgetsEn() ? cat.labelEn : cat.label), null, "user");
      setTimeout(() => {
        addMsg(dkWidgetsT("בחרו שאלה מהרשימה, או חזרו לתפריט הראשי:", "Pick a question from the list, or go back to the main menu:"), null, "bot");
        renderCategoryQuestions(cat.id);
      }, 300);
    }
  });
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    ask(input.value);
    input.value = "";
  });

  // Chat chrome (fab tooltip/aria, panel header, input placeholder, send
  // button) re-renders on a language toggle — same as every other
  // JS-rendered widget on an i18n.js page. Already-sent bubbles stay as
  // sent, same as a real chat history would.
  document.addEventListener("deskkit:langchange", () => {
    document.getElementById("chat-fab").title = dkWidgetsT("עוזר DeskKit", "DeskKit Assistant");
    document.getElementById("chat-fab").setAttribute("aria-label", dkWidgetsT("פתיחת צ'אט עזרה", "Open help chat"));
    document.getElementById("chat-head-label").textContent = dkWidgetsT("עוזר DeskKit", "DeskKit Assistant");
    document.getElementById("chat-close").setAttribute("aria-label", dkWidgetsT("סגירה", "Close"));
    document.getElementById("chat-input").placeholder = dkWidgetsT("כתבו שאלה...", "Type a question...");
    document.querySelector("#chat-form button[type=submit]").textContent = dkWidgetsT("שליחה", "Send");
    // Re-render whichever quick-menu level is currently showing, so an
    // open category's question list switches language too, not just the
    // top-level menu.
    if (quick.children.length) renderCategoryMenu();
  });
}

/* Not a legal requirement here (Israel has no EU-style mandatory
   consent banner, and the site sets no tracking cookies of its own —
   see terms.html "עוגיות ואחסון מקומי") — a simple non-blocking
   disclosure, dismissed once and remembered, as an extra precaution. */
const COOKIE_NOTICE_KEY = "deskkit_cookie_notice_dismissed";
function injectCookieNotice() {
  if (localStorage.getItem(COOKIE_NOTICE_KEY) === "1") return;
  const bar = document.createElement("div");
  bar.className = "cookie-notice no-print";
  // A bare <div> appended straight to <body> sits outside every
  // landmark (header/main/footer) — confirmed via axe-core as a real
  // "content not contained by landmarks" violation. role="region" +
  // aria-label makes it its own, properly announced landmark.
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", dkWidgetsT("הודעת עוגיות ואחסון מקומי", "Cookie and local storage notice"));
  bar.innerHTML = `
    <p>${dkWidgetsT(
      'האתר משתמש בעוגיות ואחסון מקומי כדי לשמור את העבודה שלכם. פרטים ב<a href="terms.html#privacy">מדיניות הפרטיות</a>.',
      'This site uses cookies and local storage to save your work. Details in the <a href="terms.html#privacy">Privacy Policy</a>.'
    )}</p>
    <button type="button" class="btn btn-teal" id="cookie-notice-ok">${dkWidgetsT("הבנתי", "Got it")}</button>
  `;
  document.body.appendChild(bar);
  document.body.classList.add("cookie-notice-active");
  document.getElementById("cookie-notice-ok").addEventListener("click", () => {
    localStorage.setItem(COOKIE_NOTICE_KEY, "1");
    bar.remove();
    document.body.classList.remove("cookie-notice-active");
  });

  // Confirmed-live bug this fixes: this bar renders once at page load in
  // whichever language was current then, and — unlike every data-i18n
  // element the sweep in applyLang() already handles — never re-rendered
  // on a later language toggle, so clicking EN/עברית visibly changed
  // every other string on the page except this one.
  document.addEventListener("deskkit:langchange", () => {
    if (!document.body.contains(bar)) return;
    bar.setAttribute("aria-label", dkWidgetsT("הודעת עוגיות ואחסון מקומי", "Cookie and local storage notice"));
    bar.querySelector("p").innerHTML = dkWidgetsT(
      'האתר משתמש בעוגיות ואחסון מקומי כדי לשמור את העבודה שלכם. פרטים ב<a href="terms.html#privacy">מדיניות הפרטיות</a>.',
      'This site uses cookies and local storage to save your work. Details in the <a href="terms.html#privacy">Privacy Policy</a>.'
    );
    bar.querySelector("#cookie-notice-ok").textContent = dkWidgetsT("הבנתי", "Got it");
  });
}

/* Shared by site-builder.js and schedule-render.js: once the Gumroad
   checkout link has been opened, clicking it again only reopens the same
   page — there's nothing new to do there, so it's disabled (visually and
   for real, via pointer-events) rather than left clickable forever.
   Deliberately in-memory only (no localStorage): a flag that persisted
   across reloads turned out to survive a reload or an account switch on
   the SAME browser too, permanently graying out the button for whoever
   logs in next on that machine — confusing for account-switch testing,
   and no less confusing for two different real customers sharing a
   computer. Guarding against an accidental double-click within the same
   page visit is all this needs to do. */
function wireBuyLinkOnce(link) {
  if (!link) return;
  link.addEventListener("click", () => {
    link.classList.add("btn-disabled");
    link.setAttribute("aria-disabled", "true");
    link.textContent = "דף הרכישה נפתח ✓";
  });
}

/* Shared by site-cloud-save.js and schedule-render.js's receipt senders.
   Gumroad's `price` is in the smallest unit of the PRODUCT'S OWN currency
   (e.g. cents for a USD-priced product) — not necessarily ₪. The old code
   divided by 100 and hardcoded "₪" regardless, so a USD sale showed its
   dollar amount mislabeled as shekels (163.65 "₪" for what was really
   $163.65). Reading purchase.currency, which Gumroad always includes,
   fixes that instead of assuming everyone sells in ILS. */
const GUMROAD_CURRENCY_SYMBOLS = { ils: "₪", usd: "$", eur: "€", gbp: "£" };
function formatGumroadAmount(purchase) {
  if (!purchase || purchase.price == null) return null;
  const code = String(purchase.currency || "").toLowerCase();
  const symbol = GUMROAD_CURRENCY_SYMBOLS[code] || (code ? code.toUpperCase() + " " : "");
  return `${(purchase.price / 100).toFixed(2)} ${symbol}`;
}

document.addEventListener("DOMContentLoaded", () => {
  injectFeedbackWidget();
  injectChatWidget();
  injectAccessibilityFab();
  injectCookieNotice();
});
