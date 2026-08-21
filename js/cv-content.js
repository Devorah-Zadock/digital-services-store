/* Browser-safe CV template data: default content + theme per template slug.
   Mirrors the docx generator (kept server-side in the private build scripts) —
   this is what powers the live in-browser builder / preview. */
const CV_TEMPLATES = {
  "cv-general-modern": {
    label: "כללי / שיווק — מודרני",
    layout: "sidebar",
    defaultColor: "1F5C4E",
    font: "Arial, sans-serif",
    content: {
      name: "ישראלה ישראלי",
      title: "מנהלת שיווק דיגיטלי",
      contact: "050-1234567 | israela@email.com | תל אביב | linkedin.com/in/israela",
      summary: "מנהלת שיווק דיגיטלי עם 7 שנות ניסיון בהובלת קמפיינים רב-ערוציים, צוותי תוכן וביצועים. מומחית בבניית אסטרטגיית תוכן מבוססת נתונים, עם רקורד מוכח של הגדלת מכירות ומודעות מותג.",
      jobs: [
        { title: "מנהלת שיווק דיגיטלי", place: "חברת אקספנד בע\"מ", dates: "2021 – היום", bullets: "הובלת אסטרטגיית שיווק דיגיטלי כוללת עם תקציב שנתי של 2.5 מיליון ש\"ח\nהגדלת ROAS ב-38% תוך שנה באמצעות אופטימיזציה של קמפיינים ממומנים" },
        { title: "רכזת שיווק ותוכן", place: "סטארטאפ נאו-טק", dates: "2018 – 2021", bullets: "בניית אסטרטגיית תוכן לרשתות חברתיות שהובילה לגידול של 120% בעוקבים" },
      ],
      education: "תואר ראשון במנהל עסקים, התמחות שיווק — אוניברסיטת תל אביב, 2018",
      skills: "Google Ads | Meta Business Suite | SEO/SEM | Google Analytics | ניהול צוות",
    },
  },
  "cv-dev-dark": {
    label: "תכנות — כהה",
    layout: "sidebar",
    defaultColor: "2563EB",
    font: "Arial, sans-serif",
    content: {
      name: "רועי כהן",
      title: "מפתח Full-Stack",
      contact: "052-7654321 | roi.cohen@email.com | רמת גן | github.com/roicohen",
      summary: "מפתח Full-Stack עם 5 שנות ניסיון בבניית מערכות web בקנה מידה גדול. ניסיון מוכח בהובלה טכנית מקצה לקצה — מעיצוב ארכיטקטורה ועד פריסה בענן, עם דגש על קוד נקי וביצועים.",
      jobs: [
        { title: "מפתח Full-Stack בכיר", place: "חברת קלאודטק בע\"מ", dates: "2022 – היום", bullets: "פיתוח וארכיטקטורה של מערכת SaaS עם עשרות אלפי משתמשים פעילים\nהובלת מעבר ל-microservices שקיצר זמני פריסה ב-60%" },
        { title: "מפתח Backend", place: "סטארטאפ פינטק", dates: "2019 – 2022", bullets: "בניית API-ים ב-Node.js ו-PostgreSQL עבור מוצר הליבה" },
      ],
      education: "B.Sc. הנדסת תוכנה — הטכניון, 2019",
      skills: "JavaScript / TypeScript | React | Node.js | Python | PostgreSQL | Docker | AWS | Git",
    },
  },
  "cv-dev-minimal": {
    label: "תכנות — נועז",
    layout: "bold",
    defaultColor: "334E68",
    font: "Arial, sans-serif",
    content: {
      name: "טל ברק",
      title: "מפתחת Frontend",
      contact: "054-1122334 | tal.barak@email.com | חיפה | github.com/talbarak | talbarak.dev",
      summary: "מפתחת Frontend עם 4 שנות ניסיון בבניית ממשקי משתמש מהירים ונגישים. מתמחה ב-React ובמערכות עיצוב (Design Systems), עם עין קפדנית לפרטים ולחוויית משתמש.",
      jobs: [
        { title: "מפתחת Frontend", place: "חברת אפליקוד", dates: "2021 – היום", bullets: "בניית ותחזוקת Design System משותף ל-3 מוצרים\nשיפור ביצועי טעינה ב-45% באמצעות אופטימיזציית bundle" },
        { title: "מפתחת Junior", place: "סוכנות דיגיטל", dates: "2020 – 2021", bullets: "בניית אתרי תדמית ומסחר עבור לקוחות שונים" },
      ],
      education: "B.Sc. מדעי המחשב — אוניברסיטת חיפה, 2020",
      skills: "React | TypeScript | Next.js | Tailwind CSS | Figma-to-Code | Jest | Git",
    },
  },
  "cv-design-creative": {
    label: "עיצוב — יצירתי",
    layout: "bold",
    defaultColor: "C24B1F",
    font: "Arial, sans-serif",
    content: {
      name: "מאיה לוי",
      title: "מעצבת UX/UI",
      contact: "053-9988776 | maya.levi@email.com | תל אביב | behance.net/mayalevi",
      summary: "מעצבת UX/UI עם 6 שנות ניסיון בעיצוב מוצרים דיגיטליים מקצה לקצה. משלבת חשיבה אסטרטגית עם ביצוע ויזואלי חד, ומובילה תהליכי מחקר משתמשים לפתרונות מבוססי נתונים.",
      jobs: [
        { title: "מעצבת UX/UI בכירה", place: "סוכנות פיקסל־סטודיו", dates: "2021 – היום", bullets: "עיצוב מוצר מקצה לקצה עבור 8 לקוחות ארגוניים\nבניית Design System שאומץ בכל צוותי המוצר" },
        { title: "מעצבת גרפית ופרילנס", place: "עצמאית", dates: "2018 – 2021", bullets: "עיצוב מיתוג וזהות חזותית ל-15+ עסקים קטנים" },
      ],
      education: "תואר ראשון בעיצוב תקשורת חזותית — בצלאל, 2018",
      skills: "Figma | Adobe XD | Photoshop | Illustrator | Design Systems | User Research",
    },
  },
  "cv-design-portfolio": {
    label: "עיצוב — פורטפוליו",
    layout: "sidebar",
    defaultColor: "B5175A",
    font: "Arial, sans-serif",
    content: {
      name: "נועם שגיא",
      title: "מעצב גרפי",
      contact: "050-4433221 | noam.sagi@email.com | ירושלים | noamsagi.com",
      summary: "מעצב גרפי עם 3 שנות ניסיון בעיצוב דפוס ודיגיטל כאחד. מתמחה בבניית זהות מותג עקבית — מלוגו ועד חומרים שיווקיים מלאים.",
      jobs: [
        { title: "מעצב גרפי", place: "משרד פרסום סטודיו רימון", dates: "2022 – היום", bullets: "עיצוב קמפיינים רב-ערוציים עבור מותגים מובילים\nאחריות מלאה על מיתוג ועיצוב ל-6 לקוחות קבועים" },
        { title: "סטודנט מתמחה", place: "סטודיו עיצוב עצמאי", dates: "2021 – 2022", bullets: "סיוע בעיצוב חומרי שיווק ואריזות מוצר" },
      ],
      education: "תואר ראשון בעיצוב גרפי — שנקר, 2022",
      skills: "Adobe Illustrator | Photoshop | InDesign | Branding | Typography",
    },
  },
  "cv-accounting-classic": {
    label: "הנהלת חשבונות — קלאסי",
    layout: "classic-mono",
    defaultColor: "1F2A44",
    font: "Georgia, 'Times New Roman', serif",
    content: {
      name: "דנה אברהם",
      title: "מנהלת חשבונות סוג 3",
      contact: "052-5566778 | dana.avraham@email.com | פתח תקווה",
      summary: "מנהלת חשבונות מוסמכת סוג 3 עם 8 שנות ניסיון בניהול הנהלת חשבונות מלאה, כולל דוחות מע\"מ, ניכויים ומאזני בוחן. מדויקת, אמינה ובעלת ניסיון עשיר בעבודה מול רואי חשבון ורשויות המס.",
      jobs: [
        { title: "מנהלת חשבונות", place: "חברת תעשיות דרום בע\"מ", dates: "2019 – היום", bullets: "ניהול הנהלת חשבונות מלאה עבור חברה עם מחזור של 40 מיליון ש\"ח בשנה\nהפקת דוחות מע\"מ, ניכויים ומאזני בוחן חודשיים" },
        { title: "מנהלת חשבונות זוטרה", place: "משרד רואי חשבון כהן ושות'", dates: "2016 – 2019", bullets: "ניהול הנהלת חשבונות עבור תיק לקוחות של כ-20 עסקים קטנים ובינוניים" },
      ],
      education: "תעודת הנהלת חשבונות סוג 3 — לשכת רואי חשבון, 2016",
      skills: "חשבשבת | Priority | Excel מתקדם | דוחות מע\"מ וניכויים | התאמות בנק",
    },
  },
  "cv-business-clean": {
    label: "כללי / עסקי — נקי",
    layout: "classic-mono",
    defaultColor: "24476B",
    font: "Arial, sans-serif",
    content: {
      name: "עומר פרידמן",
      title: "רכז/ת תפעול",
      contact: "058-2233445 | omer.friedman@email.com | ראשון לציון",
      summary: "רכז תפעול עם 4 שנות ניסיון בניהול תהליכים עסקיים, תיאום בין מחלקות ושיפור תהליכי עבודה. בעל יכולת ארגון גבוהה ונסיון בעבודה מול ספקים ולקוחות כאחד.",
      jobs: [
        { title: "רכז תפעול", place: "חברת לוגיסטיקה ארצית", dates: "2021 – היום", bullets: "ניהול שוטף של תהליכי אספקה ותיאום מול 30+ ספקים\nהטמעת תהליך עבודה חדש שקיצר זמני אספקה ב-20%" },
        { title: "נציג שירות לקוחות בכיר", place: "חברת שירותים ארצית", dates: "2019 – 2021", bullets: "טיפול בפניות לקוחות מורכבות ומתן מענה מקצועי" },
      ],
      education: "תואר ראשון בניהול — המכללה למנהל, 2019",
      skills: "ניהול פרויקטים | Excel מתקדם | Priority | תקשורת בין-אישית | פתרון בעיות",
    },
  },
};
