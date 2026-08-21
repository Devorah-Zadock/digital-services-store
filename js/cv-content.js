/* Browser-safe CV template data: default bilingual content + theme per
   template slug. This is what powers the live in-browser builder/preview.
   Each template has content.he (RTL) and content.en (LTR) — the builder
   toggles between them; layout direction and section labels are handled
   by cv-render.js based on the chosen language. */
const CV_TEMPLATES = {
  /* ---------------- תכנות / Development ---------------- */
  "cv-dev-dark": {
    label: "תכנות — סיידבר כהה",
    layout: "sidebar",
    defaultColor: "2563EB",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "רועי כהן", title: "מפתח Full-Stack",
        contact: "052-7654321 | roi.cohen@email.com | רמת גן | github.com/roicohen",
        summary: "מפתח Full-Stack עם 5 שנות ניסיון בבניית מערכות web בקנה מידה גדול. ניסיון מוכח בהובלה טכנית מקצה לקצה — מעיצוב ארכיטקטורה ועד פריסה בענן, עם דגש על קוד נקי וביצועים.",
        jobs: [
          { title: "מפתח Full-Stack בכיר", place: "חברת קלאודטק בע\"מ", dates: "2022 – היום", bullets: "פיתוח וארכיטקטורה של מערכת SaaS עם עשרות אלפי משתמשים פעילים\nהובלת מעבר ל-microservices שקיצר זמני פריסה ב-60%" },
          { title: "מפתח Backend", place: "סטארטאפ פינטק", dates: "2019 – 2022", bullets: "בניית API-ים ב-Node.js ו-PostgreSQL עבור מוצר הליבה" },
        ],
        projects: [
          { title: "מעקב הוצאות משותף", link: "github.com/roicohen/split-expenses", bullets: "אפליקציית web לחלוקת הוצאות בין שותפים לדירה, עם חישוב איזון אוטומטי" },
          { title: "צ'אט בזמן אמת", link: "github.com/roicohen/live-chat", bullets: "מערכת צ'אט עם WebSockets ותמיכה בחדרים מרובים" },
        ],
        education: "B.Sc. הנדסת תוכנה — הטכניון, 2019",
        skills: "JavaScript / TypeScript | React | Node.js | Python | PostgreSQL | Docker | AWS | Git",
      },
      en: {
        name: "Roi Cohen", title: "Full-Stack Developer",
        contact: "+972-52-7654321 | roi.cohen@email.com | Ramat Gan | github.com/roicohen",
        summary: "Full-Stack developer with 5 years of experience building large-scale web systems. Proven track record leading technical work end-to-end — from architecture design to cloud deployment, with a focus on clean code and performance.",
        jobs: [
          { title: "Senior Full-Stack Developer", place: "CloudTech Ltd.", dates: "2022 – Present", bullets: "Developed and architected a SaaS platform serving tens of thousands of active users\nLed migration to microservices, cutting deployment time by 60%" },
          { title: "Backend Developer", place: "Fintech Startup", dates: "2019 – 2022", bullets: "Built core-product APIs using Node.js and PostgreSQL" },
        ],
        projects: [
          { title: "Shared Expense Tracker", link: "github.com/roicohen/split-expenses", bullets: "Web app for splitting expenses between roommates, with automatic balance calculation" },
          { title: "Real-Time Chat App", link: "github.com/roicohen/live-chat", bullets: "Chat system built with WebSockets, supporting multiple rooms" },
        ],
        education: "B.Sc. Software Engineering — Technion, 2019",
        skills: "JavaScript / TypeScript | React | Node.js | Python | PostgreSQL | Docker | AWS | Git",
      },
    },
  },
  "cv-dev-minimal": {
    label: "תכנות — נועז",
    layout: "bold",
    defaultColor: "334E68",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "טל ברק", title: "מפתחת Frontend",
        contact: "054-1122334 | tal.barak@email.com | חיפה | github.com/talbarak | talbarak.dev",
        summary: "מפתחת Frontend עם 4 שנות ניסיון בבניית ממשקי משתמש מהירים ונגישים. מתמחה ב-React ובמערכות עיצוב (Design Systems), עם עין קפדנית לפרטים ולחוויית משתמש.",
        jobs: [
          { title: "מפתחת Frontend", place: "חברת אפליקוד", dates: "2021 – היום", bullets: "בניית ותחזוקת Design System משותף ל-3 מוצרים\nשיפור ביצועי טעינה ב-45% באמצעות אופטימיזציית bundle" },
          { title: "מפתחת Junior", place: "סוכנות דיגיטל", dates: "2020 – 2021", bullets: "בניית אתרי תדמית ומסחר עבור לקוחות שונים" },
        ],
        projects: [
          { title: "מעקב הרגלים יומי", link: "github.com/talbarak/habit-tracker", bullets: "אפליקציית PWA למעקב הרגלים עם התראות מקומיות" },
        ],
        education: "B.Sc. מדעי המחשב — אוניברסיטת חיפה, 2020",
        skills: "React | TypeScript | Next.js | Tailwind CSS | Figma-to-Code | Jest | Git",
      },
      en: {
        name: "Tal Barak", title: "Frontend Developer",
        contact: "+972-54-1122334 | tal.barak@email.com | Haifa | github.com/talbarak | talbarak.dev",
        summary: "Frontend developer with 4 years of experience building fast, accessible user interfaces. Specializes in React and design systems, with a keen eye for detail and user experience.",
        jobs: [
          { title: "Frontend Developer", place: "AppliCode", dates: "2021 – Present", bullets: "Built and maintained a shared Design System across 3 products\nImproved load performance by 45% through bundle optimization" },
          { title: "Junior Developer", place: "Digital Agency", dates: "2020 – 2021", bullets: "Built marketing and e-commerce sites for various clients" },
        ],
        projects: [
          { title: "Daily Habit Tracker", link: "github.com/talbarak/habit-tracker", bullets: "PWA for tracking daily habits with local notifications" },
        ],
        education: "B.Sc. Computer Science — University of Haifa, 2020",
        skills: "React | TypeScript | Next.js | Tailwind CSS | Figma-to-Code | Jest | Git",
      },
    },
  },
  "cv-dev-fullstack": {
    label: "תכנות — Full-Stack (סיידבר טורקיז)",
    layout: "sidebar",
    defaultColor: "0E7C86",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "יונתן אדלר", title: "מפתח Full-Stack",
        contact: "050-3344556 | yonatan.adler@email.com | באר שבע | github.com/yadler",
        summary: "מפתח Full-Stack עם 3 שנות ניסיון בפיתוח מוצרי SaaS. נהנה לעבוד על כל שכבות המערכת, מבסיס הנתונים ועד חוויית המשתמש, עם דגש על קוד קריא וניתן לתחזוקה.",
        jobs: [
          { title: "מפתח Full-Stack", place: "חברת דאטהפלואו", dates: "2022 – היום", bullets: "פיתוח מודולים חדשים במוצר B2B עם Node.js ו-React\nכתיבת בדיקות אוטומטיות שהעלו את כיסוי הקוד ל-80%" },
          { title: "מפתח בהכשרה", place: "תוכנית הסבה טכנולוגית", dates: "2021 – 2022", bullets: "השתתפות בפרויקט קבוצתי לבניית מערכת ניהול מלאי" },
        ],
        projects: [
          { title: "עגלת קניות API", link: "github.com/yadler/cart-api", bullets: "REST API לניהול עגלת קניות עם תמיכה בהנחות ומבצעים" },
          { title: "לוח מחוונים מזג אוויר", link: "github.com/yadler/weather-dash", bullets: "דשבורד תחזית מזג אוויר עם גרפים אינטראקטיביים" },
        ],
        education: "תעודת מפתח Full-Stack — תוכנית הסבה טכנולוגית, 2022",
        skills: "JavaScript | React | Node.js | Express | MongoDB | Git | REST APIs",
      },
      en: {
        name: "Yonatan Adler", title: "Full-Stack Developer",
        contact: "+972-50-3344556 | yonatan.adler@email.com | Beer Sheva | github.com/yadler",
        summary: "Full-Stack developer with 3 years of experience building SaaS products. Enjoys working across the full stack, from database to user experience, with a focus on readable, maintainable code.",
        jobs: [
          { title: "Full-Stack Developer", place: "DataFlow Inc.", dates: "2022 – Present", bullets: "Developed new modules for a B2B product using Node.js and React\nWrote automated tests that raised code coverage to 80%" },
          { title: "Developer in Training", place: "Tech Retraining Program", dates: "2021 – 2022", bullets: "Participated in a team project building an inventory management system" },
        ],
        projects: [
          { title: "Shopping Cart API", link: "github.com/yadler/cart-api", bullets: "REST API for managing a shopping cart with discount and promotion support" },
          { title: "Weather Dashboard", link: "github.com/yadler/weather-dash", bullets: "Weather forecast dashboard with interactive charts" },
        ],
        education: "Full-Stack Developer Certificate — Tech Retraining Program, 2022",
        skills: "JavaScript | React | Node.js | Express | MongoDB | Git | REST APIs",
      },
    },
  },
  "cv-dev-junior": {
    label: "תכנות — ג׳וניור/בוגר בוטקאמפ (נועז)",
    layout: "bold",
    defaultColor: "6D28D9",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "שירה בן-דוד", title: "מפתחת תוכנה — Junior",
        contact: "053-7788990 | shira.bd@email.com | מודיעין | github.com/shirabd",
        summary: "בוגרת בוטקאמפ פיתוח Full-Stack עם תשוקה אמיתית לקוד נקי ולפתרון בעיות. מגיעה מרקע של ניתוח נתונים, ומביאה חשיבה אנליטית לכל פרויקט פיתוח.",
        jobs: [
          { title: "סטודנטית מתמחה", place: "מעבדת חדשנות טכנולוגית", dates: "2024 (3 חודשים)", bullets: "סיוע בפיתוח פיצ'רים קטנים במוצר פנימי בהדרכת מפתחים בכירים" },
        ],
        projects: [
          { title: "אפליקציית מעקב תקציב", link: "github.com/shirabd/budget-app", bullets: "אפליקציית React לניהול תקציב אישי עם גרפים חודשיים" },
          { title: "פרויקט גמר בוטקאמפ: מעקב כושר", link: "github.com/shirabd/fitness-tracker", bullets: "אפליקציית Full-Stack למעקב אימונים, עם אימות משתמשים ו-API עצמאי" },
        ],
        education: "בוטקאמפ פיתוח Full-Stack — מכללת קוד, 2024\nתואר ראשון בכלכלה — האוניברסיטה הפתוחה, 2021",
        skills: "JavaScript | React | Node.js | SQL | Git | HTML/CSS",
      },
      en: {
        name: "Shira Ben-David", title: "Junior Software Developer",
        contact: "+972-53-7788990 | shira.bd@email.com | Modiin | github.com/shirabd",
        summary: "Full-Stack bootcamp graduate with a genuine passion for clean code and problem solving. Comes from a data analysis background and brings analytical thinking to every development project.",
        jobs: [
          { title: "Development Intern", place: "Tech Innovation Lab", dates: "2024 (3 months)", bullets: "Assisted in building small features for an internal product, mentored by senior developers" },
        ],
        projects: [
          { title: "Budget Tracking App", link: "github.com/shirabd/budget-app", bullets: "React app for personal budget management with monthly charts" },
          { title: "Bootcamp Capstone: Fitness Tracker", link: "github.com/shirabd/fitness-tracker", bullets: "Full-Stack workout tracking app with user authentication and a custom API" },
        ],
        education: "Full-Stack Development Bootcamp — Code College, 2024\nB.A. Economics — The Open University, 2021",
        skills: "JavaScript | React | Node.js | SQL | Git | HTML/CSS",
      },
    },
  },

  /* ---------------- עיצוב / Design ---------------- */
  "cv-design-creative": {
    label: "עיצוב — יצירתי (נועז)",
    layout: "bold",
    defaultColor: "C24B1F",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "מאיה לוי", title: "מעצבת UX/UI",
        contact: "053-9988776 | maya.levi@email.com | תל אביב | behance.net/mayalevi",
        summary: "מעצבת UX/UI עם 6 שנות ניסיון בעיצוב מוצרים דיגיטליים מקצה לקצה. משלבת חשיבה אסטרטגית עם ביצוע ויזואלי חד, ומובילה תהליכי מחקר משתמשים לפתרונות מבוססי נתונים.",
        jobs: [
          { title: "מעצבת UX/UI בכירה", place: "סוכנות פיקסל־סטודיו", dates: "2021 – היום", bullets: "עיצוב מוצר מקצה לקצה עבור 8 לקוחות ארגוניים\nבניית Design System שאומץ בכל צוותי המוצר" },
          { title: "מעצבת גרפית ופרילנס", place: "עצמאית", dates: "2018 – 2021", bullets: "עיצוב מיתוג וזהות חזותית ל-15+ עסקים קטנים" },
        ],
        education: "תואר ראשון בעיצוב תקשורת חזותית — בצלאל, 2018",
        skills: "Figma | Adobe XD | Photoshop | Illustrator | Design Systems | User Research",
      },
      en: {
        name: "Maya Levi", title: "UX/UI Designer",
        contact: "+972-53-9988776 | maya.levi@email.com | Tel Aviv | behance.net/mayalevi",
        summary: "UX/UI designer with 6 years of experience designing digital products end-to-end. Combines strategic thinking with sharp visual execution, leading user research into data-driven solutions.",
        jobs: [
          { title: "Senior UX/UI Designer", place: "Pixel Studio Agency", dates: "2021 – Present", bullets: "Designed end-to-end products for 8 enterprise clients\nBuilt a Design System adopted across all product teams" },
          { title: "Freelance Graphic Designer", place: "Self-employed", dates: "2018 – 2021", bullets: "Designed branding and visual identity for 15+ small businesses" },
        ],
        education: "B.Des. Visual Communication — Bezalel Academy, 2018",
        skills: "Figma | Adobe XD | Photoshop | Illustrator | Design Systems | User Research",
      },
    },
  },
  "cv-design-portfolio": {
    label: "עיצוב — פורטפוליו (סיידבר בורדו)",
    layout: "sidebar",
    defaultColor: "B5175A",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "נועם שגיא", title: "מעצב גרפי",
        contact: "050-4433221 | noam.sagi@email.com | ירושלים | noamsagi.com",
        summary: "מעצב גרפי עם 3 שנות ניסיון בעיצוב דפוס ודיגיטל כאחד. מתמחה בבניית זהות מותג עקבית — מלוגו ועד חומרים שיווקיים מלאים.",
        jobs: [
          { title: "מעצב גרפי", place: "משרד פרסום סטודיו רימון", dates: "2022 – היום", bullets: "עיצוב קמפיינים רב-ערוציים עבור מותגים מובילים\nאחריות מלאה על מיתוג ועיצוב ל-6 לקוחות קבועים" },
          { title: "סטודנט מתמחה", place: "סטודיו עיצוב עצמאי", dates: "2021 – 2022", bullets: "סיוע בעיצוב חומרי שיווק ואריזות מוצר" },
        ],
        education: "תואר ראשון בעיצוב גרפי — שנקר, 2022",
        skills: "Adobe Illustrator | Photoshop | InDesign | Branding | Typography",
      },
      en: {
        name: "Noam Sagi", title: "Graphic Designer",
        contact: "+972-50-4433221 | noam.sagi@email.com | Jerusalem | noamsagi.com",
        summary: "Graphic designer with 3 years of experience across print and digital media. Specializes in building consistent brand identities — from logo to full marketing collateral.",
        jobs: [
          { title: "Graphic Designer", place: "Rimon Studio Advertising", dates: "2022 – Present", bullets: "Designed multi-channel campaigns for leading brands\nFull ownership of branding and design for 6 retained clients" },
          { title: "Design Intern", place: "Independent Design Studio", dates: "2021 – 2022", bullets: "Assisted with marketing materials and product packaging design" },
        ],
        education: "B.Des. Graphic Design — Shenkar College, 2022",
        skills: "Adobe Illustrator | Photoshop | InDesign | Branding | Typography",
      },
    },
  },
  "cv-design-uiux": {
    label: "עיצוב — UI/UX (סיידבר טורקיז)",
    layout: "sidebar",
    defaultColor: "0E9488",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "עדי מזרחי", title: "מעצבת UI/UX",
        contact: "052-6677889 | adi.mizrahi@email.com | נתניה | dribbble.com/adimizrahi",
        summary: "מעצבת UI/UX עם 4 שנות ניסיון בעיצוב אפליקציות מובייל ו-web. מאמינה בעיצוב מבוסס נתונים ובדיקות משתמשים מתמידות לאורך כל תהליך העבודה.",
        jobs: [
          { title: "מעצבת UI/UX", place: "חברת אפ-סטארט", dates: "2021 – היום", bullets: "עיצוב אפליקציית מובייל עם למעלה ממיליון הורדות\nהובלת בדיקות משתמשים חודשיות ושילוב הממצאים בעיצוב" },
          { title: "מעצבת מוצר זוטרה", place: "סטארטאפ B2B", dates: "2020 – 2021", bullets: "עיצוב מסכי ניהול ודשבורדים למוצר SaaS" },
        ],
        education: "תואר ראשון בעיצוב תעשייתי — טכניון, 2020",
        skills: "Figma | Sketch | Prototyping | User Testing | Design Systems | HTML/CSS",
      },
      en: {
        name: "Adi Mizrahi", title: "UI/UX Designer",
        contact: "+972-52-6677889 | adi.mizrahi@email.com | Netanya | dribbble.com/adimizrahi",
        summary: "UI/UX designer with 4 years of experience designing mobile and web applications. Believes in data-driven design and continuous user testing throughout the process.",
        jobs: [
          { title: "UI/UX Designer", place: "AppStart Inc.", dates: "2021 – Present", bullets: "Designed a mobile app with over one million downloads\nLed monthly user testing sessions and integrated findings into design" },
          { title: "Junior Product Designer", place: "B2B Startup", dates: "2020 – 2021", bullets: "Designed admin screens and dashboards for a SaaS product" },
        ],
        education: "B.Des. Industrial Design — Technion, 2020",
        skills: "Figma | Sketch | Prototyping | User Testing | Design Systems | HTML/CSS",
      },
    },
  },
  "cv-design-motion": {
    label: "עיצוב — מושן/וידאו (נועז)",
    layout: "bold",
    defaultColor: "7C3AED",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "בן אזולאי", title: "מעצב מושן ווידאו",
        contact: "054-9911223 | ben.azulay@email.com | תל אביב | vimeo.com/benazulay",
        summary: "מעצב מושן עם 5 שנות ניסיון בהפקת תוכן וידאו ואנימציה למותגים ולרשתות חברתיות. מומחה ב-After Effects ובסיפור סיפורים ויזואלי קצר וקולע.",
        jobs: [
          { title: "מעצב מושן בכיר", place: "סטודיו הפקות דיגיטל", dates: "2021 – היום", bullets: "הפקת סרטוני מותג ואנימציה ל-20+ קמפיינים בשנה\nניהול תהליך הפקה מקצה לקצה מול לקוחות" },
          { title: "עורך וידאו", place: "ערוץ תוכן דיגיטלי", dates: "2019 – 2021", bullets: "עריכת תוכן יומי לרשתות חברתיות" },
        ],
        education: "תואר ראשון בקולנוע וטלוויזיה — מנשר לאמנות, 2019",
        skills: "After Effects | Premiere Pro | Cinema 4D | Illustrator | Storyboarding",
      },
      en: {
        name: "Ben Azulay", title: "Motion & Video Designer",
        contact: "+972-54-9911223 | ben.azulay@email.com | Tel Aviv | vimeo.com/benazulay",
        summary: "Motion designer with 5 years of experience producing video content and animation for brands and social media. Expert in After Effects and concise, compelling visual storytelling.",
        jobs: [
          { title: "Senior Motion Designer", place: "Digital Productions Studio", dates: "2021 – Present", bullets: "Produced brand videos and animation for 20+ campaigns a year\nManaged end-to-end production process with clients" },
          { title: "Video Editor", place: "Digital Content Channel", dates: "2019 – 2021", bullets: "Edited daily content for social media" },
        ],
        education: "B.A. Film & Television — Minshar School of Art, 2019",
        skills: "After Effects | Premiere Pro | Cinema 4D | Illustrator | Storyboarding",
      },
    },
  },

  /* ---------------- הנהלת חשבונות / Accounting ---------------- */
  "cv-accounting-classic": {
    label: "הנהלת חשבונות — קלאסי",
    layout: "classic-mono",
    defaultColor: "1F2A44",
    font: "Georgia, 'Times New Roman', serif",
    content: {
      he: {
        name: "דנה אברהם", title: "מנהלת חשבונות סוג 3",
        contact: "052-5566778 | dana.avraham@email.com | פתח תקווה",
        summary: "מנהלת חשבונות מוסמכת סוג 3 עם 8 שנות ניסיון בניהול הנהלת חשבונות מלאה, כולל דוחות מע\"מ, ניכויים ומאזני בוחן. מדויקת, אמינה ובעלת ניסיון עשיר בעבודה מול רואי חשבון ורשויות המס.",
        jobs: [
          { title: "מנהלת חשבונות", place: "חברת תעשיות דרום בע\"מ", dates: "2019 – היום", bullets: "ניהול הנהלת חשבונות מלאה עבור חברה עם מחזור של 40 מיליון ש\"ח בשנה\nהפקת דוחות מע\"מ, ניכויים ומאזני בוחן חודשיים" },
          { title: "מנהלת חשבונות זוטרה", place: "משרד רואי חשבון כהן ושות'", dates: "2016 – 2019", bullets: "ניהול הנהלת חשבונות עבור תיק לקוחות של כ-20 עסקים קטנים ובינוניים" },
        ],
        education: "תעודת הנהלת חשבונות סוג 3 — לשכת רואי חשבון, 2016",
        skills: "חשבשבת | Priority | Excel מתקדם | דוחות מע\"מ וניכויים | התאמות בנק",
      },
      en: {
        name: "Dana Avraham", title: "Bookkeeper (Type 3 Certified)",
        contact: "+972-52-5566778 | dana.avraham@email.com | Petah Tikva",
        summary: "Type 3 certified bookkeeper with 8 years of experience managing full-cycle bookkeeping, including VAT reports, tax withholding, and trial balances. Accurate, reliable, with extensive experience working with accountants and tax authorities.",
        jobs: [
          { title: "Bookkeeper", place: "South Industries Ltd.", dates: "2019 – Present", bullets: "Managed full-cycle bookkeeping for a company with 40M NIS annual turnover\nProduced monthly VAT reports, tax withholding, and trial balances" },
          { title: "Junior Bookkeeper", place: "Cohen & Co. Accounting Firm", dates: "2016 – 2019", bullets: "Managed bookkeeping for a portfolio of roughly 20 small and mid-sized businesses" },
        ],
        education: "Type 3 Bookkeeping Certificate — Institute of Certified Public Accountants, 2016",
        skills: "Hashavshevet | Priority | Advanced Excel | VAT & Tax Reports | Bank Reconciliation",
      },
    },
  },
  "cv-accounting-modern": {
    label: "הנהלת חשבונות — מודרני (סיידבר)",
    layout: "sidebar",
    defaultColor: "14665A",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "ליאת כהן", title: "מנהלת חשבונות סוג 2",
        contact: "054-2233118 | liat.cohen@email.com | אשדוד",
        summary: "מנהלת חשבונות סוג 2 עם 5 שנות ניסיון, בעלת שליטה מלאה במערכות ממוחשבות ובעבודה מול ספקים ולקוחות. מחפשת להתפתח לתפקיד הנהלת חשבונות סוג 3.",
        jobs: [
          { title: "מנהלת חשבונות", place: "רשת חנויות קמעונאיות", dates: "2021 – היום", bullets: "ניהול הנהלת חשבונות שוטפת ל-12 סניפים\nהתאמות בנק וניהול תזרים מזומנים חודשי" },
          { title: "פקידת הנהלת חשבונות", place: "משרד עורכי דין", dates: "2019 – 2021", bullets: "הפקת חשבוניות וניהול גבייה שוטפת" },
        ],
        education: "תעודת הנהלת חשבונות סוג 2 — המכללה למנהל, 2019",
        skills: "חשבשבת | Excel | ניהול גבייה | חשבוניות מס | שירות ספקים",
      },
      en: {
        name: "Liat Cohen", title: "Bookkeeper (Type 2 Certified)",
        contact: "+972-54-2233118 | liat.cohen@email.com | Ashdod",
        summary: "Type 2 certified bookkeeper with 5 years of experience, fully proficient in computerized accounting systems and vendor/client management. Looking to grow into a Type 3 bookkeeping role.",
        jobs: [
          { title: "Bookkeeper", place: "Retail Chain", dates: "2021 – Present", bullets: "Managed day-to-day bookkeeping for 12 branches\nHandled bank reconciliation and monthly cash flow management" },
          { title: "Bookkeeping Clerk", place: "Law Firm", dates: "2019 – 2021", bullets: "Issued invoices and managed ongoing collections" },
        ],
        education: "Type 2 Bookkeeping Certificate — College of Management, 2019",
        skills: "Hashavshevet | Excel | Collections Management | Tax Invoices | Vendor Relations",
      },
    },
  },
  "cv-finance-analyst": {
    label: "כספים — אנליסט (שקט)",
    layout: "classic-mono",
    defaultColor: "1F5C4E",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "איתן בר", title: "אנליסט כספים",
        contact: "050-7799221 | eitan.bar@email.com | תל אביב",
        summary: "אנליסט כספים עם 4 שנות ניסיון בבניית מודלים פיננסיים, תקציבים ותחזיות. בעל יכולת גבוהה לתרגם נתונים מורכבים לתובנות עסקיות ברורות להנהלה.",
        jobs: [
          { title: "אנליסט כספים", place: "חברת השקעות", dates: "2021 – היום", bullets: "בניית מודלים פיננסיים לתמיכה בהחלטות השקעה\nהכנת דוחות תקציב ותחזית רבעוניים להנהלה הבכירה" },
          { title: "אנליסט זוטר", place: "בנק מסחרי", dates: "2020 – 2021", bullets: "ניתוח דוחות כספיים של לקוחות עסקיים" },
        ],
        education: "תואר ראשון במימון וכלכלה — האוניברסיטה העברית, 2020",
        skills: "Excel מתקדם | מודלים פיננסיים | Power BI | SQL | ניתוח תקציב",
      },
      en: {
        name: "Eitan Bar", title: "Finance Analyst",
        contact: "+972-50-7799221 | eitan.bar@email.com | Tel Aviv",
        summary: "Finance analyst with 4 years of experience building financial models, budgets, and forecasts. Skilled at translating complex data into clear business insights for leadership.",
        jobs: [
          { title: "Finance Analyst", place: "Investment Firm", dates: "2021 – Present", bullets: "Built financial models to support investment decisions\nPrepared quarterly budget and forecast reports for senior leadership" },
          { title: "Junior Analyst", place: "Commercial Bank", dates: "2020 – 2021", bullets: "Analyzed financial statements for business clients" },
        ],
        education: "B.A. Finance & Economics — Hebrew University, 2020",
        skills: "Advanced Excel | Financial Modeling | Power BI | SQL | Budget Analysis",
      },
    },
  },

  /* ---------------- כללי / General & Business ---------------- */
  "cv-general-modern": {
    label: "כללי / שיווק — סיידבר",
    layout: "sidebar",
    defaultColor: "1F5C4E",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "ישראלה ישראלי", title: "מנהלת שיווק דיגיטלי",
        contact: "050-1234567 | israela@email.com | תל אביב | linkedin.com/in/israela",
        summary: "מנהלת שיווק דיגיטלי עם 7 שנות ניסיון בהובלת קמפיינים רב-ערוציים, צוותי תוכן וביצועים. מומחית בבניית אסטרטגיית תוכן מבוססת נתונים, עם רקורד מוכח של הגדלת מכירות ומודעות מותג.",
        jobs: [
          { title: "מנהלת שיווק דיגיטלי", place: "חברת אקספנד בע\"מ", dates: "2021 – היום", bullets: "הובלת אסטרטגיית שיווק דיגיטלי כוללת עם תקציב שנתי של 2.5 מיליון ש\"ח\nהגדלת ROAS ב-38% תוך שנה באמצעות אופטימיזציה של קמפיינים ממומנים" },
          { title: "רכזת שיווק ותוכן", place: "סטארטאפ נאו-טק", dates: "2018 – 2021", bullets: "בניית אסטרטגיית תוכן לרשתות חברתיות שהובילה לגידול של 120% בעוקבים" },
        ],
        education: "תואר ראשון במנהל עסקים, התמחות שיווק — אוניברסיטת תל אביב, 2018",
        skills: "Google Ads | Meta Business Suite | SEO/SEM | Google Analytics | ניהול צוות",
      },
      en: {
        name: "Israela Israeli", title: "Digital Marketing Manager",
        contact: "+972-50-1234567 | israela@email.com | Tel Aviv | linkedin.com/in/israela",
        summary: "Digital marketing manager with 7 years of experience leading multi-channel campaigns, content, and performance teams. Expert in building data-driven content strategy, with a proven record of growing sales and brand awareness.",
        jobs: [
          { title: "Digital Marketing Manager", place: "Expand Ltd.", dates: "2021 – Present", bullets: "Led overall digital marketing strategy with an annual budget of 2.5M NIS\nIncreased ROAS by 38% within a year through paid campaign optimization" },
          { title: "Marketing & Content Coordinator", place: "NeoTech Startup", dates: "2018 – 2021", bullets: "Built a social media content strategy that grew followers by 120%" },
        ],
        education: "B.A. Business Administration, Marketing — Tel Aviv University, 2018",
        skills: "Google Ads | Meta Business Suite | SEO/SEM | Google Analytics | Team Management",
      },
    },
  },
  "cv-business-clean": {
    label: "כללי / עסקי — שקט",
    layout: "classic-mono",
    defaultColor: "24476B",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "עומר פרידמן", title: "רכז/ת תפעול",
        contact: "058-2233445 | omer.friedman@email.com | ראשון לציון",
        summary: "רכז תפעול עם 4 שנות ניסיון בניהול תהליכים עסקיים, תיאום בין מחלקות ושיפור תהליכי עבודה. בעל יכולת ארגון גבוהה ונסיון בעבודה מול ספקים ולקוחות כאחד.",
        jobs: [
          { title: "רכז תפעול", place: "חברת לוגיסטיקה ארצית", dates: "2021 – היום", bullets: "ניהול שוטף של תהליכי אספקה ותיאום מול 30+ ספקים\nהטמעת תהליך עבודה חדש שקיצר זמני אספקה ב-20%" },
          { title: "נציג שירות לקוחות בכיר", place: "חברת שירותים ארצית", dates: "2019 – 2021", bullets: "טיפול בפניות לקוחות מורכבות ומתן מענה מקצועי" },
        ],
        education: "תואר ראשון בניהול — המכללה למנהל, 2019",
        skills: "ניהול פרויקטים | Excel מתקדם | Priority | תקשורת בין-אישית | פתרון בעיות",
      },
      en: {
        name: "Omer Friedman", title: "Operations Coordinator",
        contact: "+972-58-2233445 | omer.friedman@email.com | Rishon LeZion",
        summary: "Operations coordinator with 4 years of experience managing business processes, cross-department coordination, and workflow improvement. Highly organized, with experience working with both vendors and clients.",
        jobs: [
          { title: "Operations Coordinator", place: "National Logistics Company", dates: "2021 – Present", bullets: "Managed ongoing supply processes and coordination with 30+ vendors\nImplemented a new workflow that cut delivery times by 20%" },
          { title: "Senior Customer Service Rep", place: "National Services Company", dates: "2019 – 2021", bullets: "Handled complex customer inquiries with professional resolution" },
        ],
        education: "B.A. Management — College of Management, 2019",
        skills: "Project Management | Advanced Excel | Priority | Interpersonal Communication | Problem Solving",
      },
    },
  },
  "cv-sales": {
    label: "מכירות / פיתוח עסקי (נועז)",
    layout: "bold",
    defaultColor: "C2410C",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "יעל פרץ", title: "מנהלת פיתוח עסקי",
        contact: "052-8899001 | yael.peretz@email.com | הרצליה | linkedin.com/in/yaelperetz",
        summary: "מנהלת פיתוח עסקי עם 6 שנות ניסיון בבניית צנרת מכירות (pipeline) וסגירת עסקאות B2B. מונעת יעדים, עם רקורד מוכח של עמידה ב-120%+ מהיעד השנתי.",
        jobs: [
          { title: "מנהלת פיתוח עסקי", place: "חברת SaaS ישראלית", dates: "2021 – היום", bullets: "בניית צנרת מכירות שהניבה 4 מיליון ש\"ח הכנסה שנתית חדשה\nניהול מו\"מ ישיר עם לקוחות ארגוניים גדולים" },
          { title: "נציגת מכירות בכירה", place: "חברת טכנולוגיה", dates: "2018 – 2021", bullets: "עמידה עקבית ב-110%+ מיעד המכירות הרבעוני" },
        ],
        education: "תואר ראשון במנהל עסקים — המרכז הבינתחומי הרצליה, 2018",
        skills: "Salesforce | ניהול משא ומתן | Pipeline Management | LinkedIn Sales Navigator | הצגות מכירה",
      },
      en: {
        name: "Yael Peretz", title: "Business Development Manager",
        contact: "+972-52-8899001 | yael.peretz@email.com | Herzliya | linkedin.com/in/yaelperetz",
        summary: "Business development manager with 6 years of experience building sales pipelines and closing B2B deals. Target-driven, with a proven record of exceeding annual quota by 120%+.",
        jobs: [
          { title: "Business Development Manager", place: "Israeli SaaS Company", dates: "2021 – Present", bullets: "Built a sales pipeline generating 4M NIS in new annual revenue\nLed direct negotiations with large enterprise clients" },
          { title: "Senior Sales Representative", place: "Technology Company", dates: "2018 – 2021", bullets: "Consistently exceeded quarterly sales quota by 110%+" },
        ],
        education: "B.A. Business Administration — Interdisciplinary Center Herzliya, 2018",
        skills: "Salesforce | Negotiation | Pipeline Management | LinkedIn Sales Navigator | Sales Presentations",
      },
    },
  },
  "cv-customer-service": {
    label: "שירות לקוחות / הצלחת לקוח (סיידבר)",
    layout: "sidebar",
    defaultColor: "2D6A6E",
    font: "Arial, sans-serif",
    content: {
      he: {
        name: "נועה כץ", title: "מנהלת הצלחת לקוחות",
        contact: "053-5566001 | noa.katz@email.com | רעננה | linkedin.com/in/noakatz",
        summary: "מנהלת הצלחת לקוחות עם 5 שנות ניסיון בליווי לקוחות עסקיים ובניית מערכות יחסים ארוכות טווח. מתמחה בהפחתת נטישה (churn) ובזיהוי הזדמנויות להרחבת חשבון.",
        jobs: [
          { title: "מנהלת הצלחת לקוחות", place: "חברת SaaS", dates: "2021 – היום", bullets: "ניהול תיק של 40 לקוחות ארגוניים עם שיעור שימור של 95%\nזיהוי הזדמנויות upsell שהובילו לגידול של 25% בהכנסות מלקוחות קיימים" },
          { title: "נציגת תמיכה טכנית בכירה", place: "חברת תוכנה", dates: "2019 – 2021", bullets: "מענה לפניות טכניות מורכבות ברמת שביעות רצון של 98%" },
        ],
        education: "תואר ראשון בפסיכולוגיה — אוניברסיטת בר-אילן, 2019",
        skills: "Salesforce | Zendesk | ניהול קשרי לקוחות | פתרון קונפליקטים | הדרכת לקוחות",
      },
      en: {
        name: "Noa Katz", title: "Customer Success Manager",
        contact: "+972-53-5566001 | noa.katz@email.com | Raanana | linkedin.com/in/noakatz",
        summary: "Customer success manager with 5 years of experience supporting business clients and building long-term relationships. Specializes in reducing churn and identifying account expansion opportunities.",
        jobs: [
          { title: "Customer Success Manager", place: "SaaS Company", dates: "2021 – Present", bullets: "Managed a portfolio of 40 enterprise clients with a 95% retention rate\nIdentified upsell opportunities that grew existing-account revenue by 25%" },
          { title: "Senior Technical Support Rep", place: "Software Company", dates: "2019 – 2021", bullets: "Resolved complex technical inquiries with a 98% satisfaction rate" },
        ],
        education: "B.A. Psychology — Bar-Ilan University, 2019",
        skills: "Salesforce | Zendesk | Client Relationship Management | Conflict Resolution | Client Onboarding",
      },
    },
  },
};
