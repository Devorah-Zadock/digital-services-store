/* Full slide/sheet content AND real styling (background colors, fills,
   font weight/color/size) extracted once from the real downloadable files
   in downloads/ (python-pptx / openpyxl) — powers preview.html, a
   dedicated, no-download "already looking at it" view of a deck/sheet
   (see catalog.js's "צפייה מלאה בתוכן" link) that aims to look like the
   real file, not just list its text. Not a pixel-exact copy of the
   file's real layout (there's no way to rasterize an actual .pptx/.xlsx
   here) but every real color/size choice IS the file's own, so it reads
   as authentic rather than a generic mockup. Regenerate by re-running
   the same extraction whenever a downloads/ file's content or styling
   changes. */
const PRODUCT_PREVIEW_DATA = {
  "biz-deck-profile": {
    "type": "deck",
    "slides": [
      {
        "bg": "163F35",
        "blocks": [
          {
            "text": "שם החברה שלך",
            "size": 44.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "פרופיל חברה | פתרונות מקצועיים שמניבים תוצאות",
            "size": 20.0,
            "bold": false,
            "color": "E8F1EE"
          },
          {
            "text": "תבנית מצגת עסקית — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "9FC4B8"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מי אנחנו",
            "size": 32.0,
            "bold": true,
            "color": "1F5C4E"
          },
          {
            "text": "אנחנו צוות מומחים שמספק פתרונות עסקיים מותאמים אישית לעסקים מכל הגדלים. הגישה שלנו משלבת ניסיון מקצועי מעמיק עם הבנה עסקית אמיתית, כדי להשיג תוצאות מדידות שמניעות צמיחה.",
            "size": 15.0,
            "bold": false,
            "color": "222222"
          },
          {
            "text": "חזון ברור",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "כיוון אסטרטגי מוגדר לכל פרויקט",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "מחויבות אמיתית",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "שותפות לטווח ארוך עם הלקוחות שלנו",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "איכות מוכחת",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "רף מקצועי גבוה בכל תוצר",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "+150",
            "size": 40.0,
            "bold": true,
            "color": "1F5C4E"
          },
          {
            "text": "לקוחות מרוצים",
            "size": 14.0,
            "bold": false,
            "color": "222222"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "השירותים שלנו",
            "size": 32.0,
            "bold": true,
            "color": "1F5C4E"
          },
          {
            "text": "פתרון מקיף לכל צורך עסקי — מבוסס נתונים ותוצאות",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "ייעוץ אסטרטגי",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "בניית תוכנית פעולה ברורה להשגת יעדי הארגון",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "צמיחה ושיווק",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "אסטרטגיות מבוססות נתונים להגדלת הכנסות",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "ניתוח וביצועים",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "מדידה ושיפור מתמיד של תהליכי הליבה",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "ליווי צוותים",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "הכשרה ובניית יכולות ארגוניות פנימיות",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "איך אנחנו עובדים",
            "size": 32.0,
            "bold": true,
            "color": "1F5C4E"
          },
          {
            "text": "01",
            "size": 20.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "אבחון",
            "size": 16.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "הבנת הצרכים והמטרות העסקיות",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "02",
            "size": 20.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "תכנון",
            "size": 16.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "בניית תוכנית עבודה מפורטת",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "03",
            "size": 20.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "ביצוע",
            "size": 16.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "יישום מלא עם ליווי צמוד",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "04",
            "size": 20.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מדידה",
            "size": 16.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "בקרת תוצאות ואופטימיזציה",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "163F35",
        "blocks": [
          {
            "text": "התוצאות מדברות בעד עצמן",
            "size": 30.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "8+",
            "size": 40.0,
            "bold": true,
            "color": "C99A3B"
          },
          {
            "text": "שנות ניסיון",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "150+",
            "size": 40.0,
            "bold": true,
            "color": "C99A3B"
          },
          {
            "text": "לקוחות מרוצים",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "98%",
            "size": 40.0,
            "bold": true,
            "color": "C99A3B"
          },
          {
            "text": "שביעות רצון",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "24/7",
            "size": 40.0,
            "bold": true,
            "color": "C99A3B"
          },
          {
            "text": "זמינות תמיכה",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "הצוות שלנו",
            "size": 32.0,
            "bold": true,
            "color": "1F5C4E"
          },
          {
            "text": "אנשי מקצוע מנוסים שמובילים כל פרויקט להצלחה",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "מנכ\"ל ומייסד",
            "size": 12.0,
            "bold": false,
            "color": "C99A3B"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "סמנכ\"לית תפעול",
            "size": 12.0,
            "bold": false,
            "color": "C99A3B"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 15.0,
            "bold": true,
            "color": "222222"
          },
          {
            "text": "ראש צוות פיתוח עסקי",
            "size": 12.0,
            "bold": false,
            "color": "C99A3B"
          }
        ]
      },
      {
        "bg": "163F35",
        "blocks": [
          {
            "text": "בואו נתחיל לעבוד יחד",
            "size": 34.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "נשמח לשמוע על הפרויקט הבא שלכם וללוות אתכם להצלחה",
            "size": 15.0,
            "bold": false,
            "color": "E8F1EE"
          },
          {
            "text": "050-1234567",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "info@company.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "www.company.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-content-webinar": {
    "type": "deck",
    "slides": [
      {
        "bg": "3D1F0F",
        "blocks": [
          {
            "text": "שם ההרצאה או הוובינר",
            "size": 40.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "תת-כותרת שמסבירה על מה נדבר",
            "size": 18.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "תבנית תוכן / וובינר — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "על מה נדבר היום",
            "size": 32.0,
            "bold": true,
            "color": "C2410C"
          },
          {
            "text": "1",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "פתיחה והצגת הנושא",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "2",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "הבעיה המרכזית ולמה היא חשובה",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "3",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שלושה עקרונות מפתח",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "4",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "דוגמה מהשטח",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "5",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שאלות ותשובות",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FBE9DD",
        "blocks": [
          {
            "text": "עיקרון ראשון: התחילו מהבעיה",
            "size": 28.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "לפני שמדברים על פתרון, חשוב להבין באמת מה הבעיה שהלקוח חווה — לא מה שנוח לנו למכור.",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FBE9DD",
        "blocks": [
          {
            "text": "עיקרון שני: מדדו כל דבר",
            "size": 28.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "אי אפשר לשפר מה שלא נמדד. הגדירו מדדי הצלחה ברורים לפני שמתחילים.",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FBE9DD",
        "blocks": [
          {
            "text": "עיקרון שלישי: שתפו ידע",
            "size": 28.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "תנו ערך אמיתי עוד לפני שאתם מבקשים משהו בתמורה. ידע שאתם משתפים בנדיבות בונה אמון וממצב אתכם כמומחים.",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "דוגמה מהשטח",
            "size": 32.0,
            "bold": true,
            "color": "C2410C"
          },
          {
            "text": "החליפו בסיפור אמיתי מהעבודה שלכם — עם מספרים, אם יש",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "1",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "האתגר: עסק קטן השקיע בפרסום בלי לדעת מה באמת מביא לקוחות",
            "size": 18.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "2",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מה עשינו: הגדרנו שלושה מדדים ברורים ובדקנו אותם מדי שבוע",
            "size": 18.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "3",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "התוצאה: 40% יותר פניות באותו תקציב, תוך שלושה חודשים",
            "size": 18.0,
            "bold": true,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "נקודות מפתח לסיכום",
            "size": 32.0,
            "bold": true,
            "color": "C2410C"
          },
          {
            "text": "התחילו תמיד מהבעיה של הלקוח, לא מהפתרון שלכם",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "מדדו הצלחה במספרים, לא בתחושות",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "שתפו ידע — זה בונה אמון לטווח ארוך",
            "size": 16.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "3D1F0F",
        "blocks": [
          {
            "text": "תודה שהייתם איתנו!",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שאלות? נשמח לשמוע מכם",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "hello@yourbrand.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "www.yourbrand.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-creative-portfolio": {
    "type": "deck",
    "slides": [
      {
        "bg": "111111",
        "blocks": [
          {
            "text": "השם שלך",
            "size": 46.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "תחום העיסוק היצירתי שלך",
            "size": 18.0,
            "bold": false,
            "color": "DB2777"
          },
          {
            "text": "תבנית פורטפוליו יצירתי — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "999999"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "קצת עליי",
            "size": 32.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "תארו כאן בכמה משפטים מי אתם, מה מייחד את הסגנון היצירתי שלכם, ומה מניע אתכם בעבודה.",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "עבודות נבחרות",
            "size": 32.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "פרויקט 1",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "פרויקט 2",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "פרויקט 3",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "פרויקט נבחר: שם הפרויקט",
            "size": 32.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "לקוח: שם הלקוח · תחום: מיתוג ועיצוב · שנה: 2026",
            "size": 12.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "האתגר",
            "size": 17.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "מה הלקוח היה צריך, ומה הקשה על הפרויקט? משפט או שניים.",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "הפתרון",
            "size": 17.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "מה עשיתם ואיך — הרעיון המרכזי, הסגנון והכלים שבחרתם.",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "התוצאה",
            "size": 17.0,
            "bold": true,
            "color": "DB2777"
          },
          {
            "text": "מה השתנה בזכות העבודה? מספרים, משוב מהלקוח או פרסים.",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "כאן מקום לתמונה מהפרויקט",
            "size": 13.0,
            "bold": false,
            "color": "DB2777"
          }
        ]
      },
      {
        "bg": "111111",
        "blocks": [
          {
            "text": "\"עבודה יוצאת דופן, יצירתית ומדויקת. חוויה מעולה מההתחלה ועד הסוף.\"",
            "size": 20.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "— שם הלקוח, תפקיד וחברה",
            "size": 13.0,
            "bold": false,
            "color": "DB2777"
          }
        ]
      },
      {
        "bg": "111111",
        "blocks": [
          {
            "text": "בואו נעבוד יחד",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "פתוחים לפרויקטים חדשים — נשמח לשמוע מכם",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "hello@yourname.com",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "www.yourname.com",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-investor-pitch": {
    "type": "deck",
    "slides": [
      {
        "bg": "1E1033",
        "blocks": [
          {
            "text": "שם הסטארטאפ שלכם",
            "size": 40.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "משפט אחד שמסביר מה אתם עושים",
            "size": 18.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "תבנית פיץ' למשקיעים — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "הבעיה",
            "size": 24.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "תארו כאן בקצרה את הבעיה המשמעותית שהשוק חווה כיום — למה היא כואבת, ולמי.",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "הפתרון",
            "size": 24.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "תארו כאן איך המוצר שלכם פותר את הבעיה הזו בצורה ייחודית וטובה יותר מהחלופות הקיימות.",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "EEE6FB",
        "blocks": [
          {
            "text": "גודל השוק",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "$5B",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "השוק הכולל (TAM)",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "$800M",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "השוק הזמין (SAM)",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "$60M",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "נתח השוק היעד (SOM)",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מודל עסקי: איך אנחנו מרוויחים",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "₪99",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "מנוי חודשי לעסק",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "מנוי SaaS, ללא התחייבות, עם חבילות לפי גודל",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "80%",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "רווח גולמי",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "עלויות תפעול נמוכות לכל לקוח נוסף",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "₪1,800",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "ערך לקוח לאורך זמן (LTV)",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "לעומת עלות גיוס לקוח של כ-₪300",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "התקדמות עד כה",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "10,000+",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "משתמשים רשומים",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "35%",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "צמיחה חודשית",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "₪1.2M",
            "size": 26.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "הכנסות שנתיות",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "EEE6FB",
        "blocks": [
          {
            "text": "תחרות: למה דווקא אנחנו",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "המתחרים העיקריים: מתחרה א', מתחרה ב' ופתרונות ידניים כמו אקסל — וכך אנחנו מתבדלים",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "פי 3",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "הטמעה מהירה יותר מהמתחרים",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "-50%",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "עלות לעומת החלופות הקיימות",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "100%",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "בעברית ומותאם לשוק המקומי",
            "size": 14.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "הצוות",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 20.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "מנכ\"ל ומייסד",
            "size": 13.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "10 שנות ניסיון בניהול מוצר ומכירות",
            "size": 11.5,
            "bold": true,
            "color": "6B6B6B"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 20.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "סמנכ\"לית טכנולוגיה (CTO)",
            "size": 13.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "לשעבר ראש צוות פיתוח בחברת הייטק",
            "size": 11.5,
            "bold": true,
            "color": "6B6B6B"
          },
          {
            "text": "שם פרטי ומשפחה",
            "size": 20.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "סמנכ\"ל שיווק ומכירות",
            "size": 13.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "הוביל צמיחה של פי 4 בחברה הקודמת",
            "size": 11.5,
            "bold": true,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "EEE6FB",
        "blocks": [
          {
            "text": "שימוש בכספי הגיוס",
            "size": 32.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "כך נשתמש ב-$1.5M במהלך 18 החודשים הקרובים",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "40%",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "פיתוח מוצר",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "הרחבת הצוות הטכנולוגי ופיצ׳רים",
            "size": 12.0,
            "bold": true,
            "color": "6B6B6B"
          },
          {
            "text": "35%",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "שיווק ומכירות",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "גיוס לקוחות וכניסה לשוק",
            "size": 12.0,
            "bold": true,
            "color": "6B6B6B"
          },
          {
            "text": "25%",
            "size": 36.0,
            "bold": true,
            "color": "7C3AED"
          },
          {
            "text": "תפעול וגיוס צוות",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "שירות לקוחות, כספים ותשתיות",
            "size": 12.0,
            "bold": true,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "1E1033",
        "blocks": [
          {
            "text": "מגייסים סבב Seed",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "גיוס של $1.5M להאצת הצמיחה ולהרחבת הצוות",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "founders@yourstartup.co",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-product-launch": {
    "type": "deck",
    "slides": [
      {
        "bg": "0F1E3D",
        "blocks": [
          {
            "text": "שם המוצר שלך",
            "size": 40.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "הפתרון שהלקוחות שלך חיכו לו",
            "size": 18.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "תבנית הצגת מוצר — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "הבעיה שאנחנו פותרים",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "עסקים רבים מתמודדים עם תהליך מסורבל, איטי ויקר — ומאבדים זמן יקר על משימות שיכולות להיות פשוטות. המוצר שלנו נבנה כדי לפתור בדיוק את זה.",
            "size": 15.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "3 שעות",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "נחסכות בממוצע בכל יום עבודה",
            "size": 13.0,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "התכונות המרכזיות",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "פשוט לשימוש",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "ממשק אינטואיטיבי שלא דורש הדרכה",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "מבוסס נתונים",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "דוחות וניתוחים בזמן אמת",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "אמין ובטוח",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "גיבוי אוטומטי והצפנה מלאה",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "מותאם אישית",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "מתאים בדיוק לתהליך העבודה שלכם",
            "size": 11.5,
            "bold": false,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "איך זה עובד",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "1",
            "size": 22.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "נרשמים בדקה",
            "size": 17.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "פותחים חשבון בחינם, בלי כרטיס אשראי ובלי התקנה",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "2",
            "size": 22.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "מחברים את הנתונים",
            "size": 17.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "מייבאים לקוחות, משימות ומסמכים בלחיצה אחת",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          },
          {
            "text": "3",
            "size": 22.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "מתחילים לחסוך זמן",
            "size": 17.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "המערכת מטפלת בעבודה השוטפת, ואתם מתפנים לעסק",
            "size": 13.0,
            "bold": false,
            "color": "6B6B6B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מה הלקוחות אומרים",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "”",
            "size": 30.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "\"חסכנו שעות עבודה כבר מהשבוע הראשון. היום אנחנו לא מבינים איך הסתדרנו בלי זה.\"",
            "size": 14.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "שם מלא",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "בעלים, שם העסק",
            "size": 11.5,
            "bold": false,
            "color": "2563EB"
          },
          {
            "text": "”",
            "size": 30.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "\"ההטמעה הייתה פשוטה, והתמיכה עונה מהר ובאמת עוזרת. ממליצים בחום.\"",
            "size": 14.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "שם מלא",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "מנהלת תפעול, שם החברה",
            "size": 11.5,
            "bold": false,
            "color": "2563EB"
          },
          {
            "text": "”",
            "size": 30.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "\"סוף סוף כל הנתונים במקום אחד, ואנחנו מקבלים החלטות מהר יותר.\"",
            "size": 14.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "שם מלא",
            "size": 14.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "מייסד, שם הסטודיו",
            "size": 11.5,
            "bold": false,
            "color": "2563EB"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "תמחור פשוט וברור",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "בסיסי",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "₪49",
            "size": 34.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "לחודש",
            "size": 11.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "תכונה עיקרית 1",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "תכונה עיקרית 2",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "תמיכה במייל",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "מקצועי",
            "size": 15.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "₪99",
            "size": 34.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "לחודש",
            "size": 11.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "כל מה שבבסיסי",
            "size": 11.5,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "תכונה מתקדמת",
            "size": 11.5,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "תמיכה בצ'אט",
            "size": 11.5,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "עסקי",
            "size": 15.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "₪199",
            "size": 34.0,
            "bold": true,
            "color": "1A1A1A"
          },
          {
            "text": "לחודש",
            "size": 11.0,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "כל מה שבמקצועי",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "משתמשים ללא הגבלה",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          },
          {
            "text": "תמיכה 24/7",
            "size": 11.5,
            "bold": false,
            "color": "1A1A1A"
          }
        ]
      },
      {
        "bg": "0F1E3D",
        "blocks": [
          {
            "text": "מוכנים להתחיל?",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "דברו איתנו עוד היום — ההתחלה תמיד בחינם",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "050-1234567",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "info@yourproduct.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "www.yourproduct.co.il",
            "size": 13.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-cinematic-pitch": {
    "type": "deck",
    "slides": [
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "ברוכים הבאים",
            "size": 14.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "שם החברה שלכם",
            "size": 44.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "משפט אחד שמסביר את החזון שלכם",
            "size": 18.0,
            "bold": false,
            "color": "A8A8B8"
          },
          {
            "text": "תבנית מצגת עסקית — Cinematic Dark",
            "size": 11.0,
            "bold": false,
            "color": "6E6E86"
          }
        ]
      },
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "החזון שלנו",
            "size": 30.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "אנחנו מאמינים שכל עסק ראוי לכלים ברמה עולמית. אנחנו בונים פתרונות שמשלבים טכנולוגיה מתקדמת עם עיצוב שמרגיש כמו העתיד — כדי שתוכלו להתמקד במה שאתם עושים הכי טוב.",
            "size": 16.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "1",
            "size": 15.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "מהירות",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "פתרונות שעולים לאוויר תוך ימים, לא חודשים",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          },
          {
            "text": "2",
            "size": 15.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "שקיפות",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "אתם יודעים בדיוק לאן הולך כל שקל",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          },
          {
            "text": "3",
            "size": 15.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "תוצאות",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "כל מה שאנחנו בונים נמדד ומוכיח את עצמו",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          }
        ]
      },
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "מה אנחנו מציעים",
            "size": 30.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "1",
            "size": 20.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "אסטרטגיה",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "בונים תוכנית עבודה מותאמת למטרות שלכם",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          },
          {
            "text": "2",
            "size": 20.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "פיתוח",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מפתחים בטכנולוגיה מתקדמת — מהר ובשקיפות",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          },
          {
            "text": "3",
            "size": 20.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "צמיחה",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מלווים אתכם גם אחרי ההשקה, לתוצאות מתמשכות",
            "size": 13.0,
            "bold": false,
            "color": "A8A8B8"
          }
        ]
      },
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "צמיחה שנה אחר שנה",
            "size": 30.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "30",
            "size": 15.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שנה 1",
            "size": 12.0,
            "bold": true,
            "color": "A8A8B8"
          },
          {
            "text": "85",
            "size": 15.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שנה 2",
            "size": 12.0,
            "bold": true,
            "color": "A8A8B8"
          },
          {
            "text": "190",
            "size": 15.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שנה 3",
            "size": 12.0,
            "bold": true,
            "color": "A8A8B8"
          },
          {
            "text": "340",
            "size": 15.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שנה 4",
            "size": 12.0,
            "bold": true,
            "color": "A8A8B8"
          }
        ]
      },
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "למה לבחור בנו",
            "size": 30.0,
            "bold": true,
            "color": "14B8B8"
          },
          {
            "text": "צוות מומחים עם ניסיון מוכח בתעשייה",
            "size": 17.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "ליווי אישי מהרגע הראשון ועד ההשקה",
            "size": 17.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "טכנולוגיה שגדלה יחד אתכם",
            "size": 17.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "שקיפות מלאה בתהליך ובתמחור",
            "size": 17.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "0D0D12",
        "blocks": [
          {
            "text": "בואו נדבר",
            "size": 40.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "hello@yourcompany.co.il  ·  050-000-0000",
            "size": 16.0,
            "bold": false,
            "color": "14B8B8"
          },
          {
            "text": "תודה שהקדשתם לנו מזמנכם",
            "size": 12.0,
            "bold": false,
            "color": "A8A8B8"
          }
        ]
      }
    ]
  },
  "deck-editorial-brand": {
    "type": "deck",
    "slides": [
      {
        "bg": "FBF6F0",
        "blocks": [
          {
            "text": "תבנית מצגת עסקית",
            "size": 12.0,
            "bold": false,
            "color": "8A8272"
          },
          {
            "text": "שם המותג שלכם",
            "size": 52.0,
            "bold": false,
            "color": "2A2620"
          },
          {
            "text": "עיצוב, יופי ותשומת לב לפרטים",
            "size": 16.0,
            "bold": false,
            "color": "8A8272"
          }
        ]
      },
      {
        "bg": "FBF6F0",
        "blocks": [
          {
            "text": "מי אנחנו",
            "size": 13.0,
            "bold": true,
            "color": "C97B63"
          },
          {
            "text": "\"אנחנו מאמינים שעיצוב טוב הוא לא תוספת — הוא השפה שבה המותג שלכם מדבר אל העולם. כל פרט, מהצבע ועד הרווח הלבן, מספר את הסיפור שלכם.\"",
            "size": 26.0,
            "bold": false,
            "color": "2A2620"
          }
        ]
      },
      {
        "bg": "FBF6F0",
        "blocks": [
          {
            "text": "מה אנחנו מציעים",
            "size": 30.0,
            "bold": false,
            "color": "2A2620"
          },
          {
            "text": "01",
            "size": 22.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "מיתוג",
            "size": 22.0,
            "bold": true,
            "color": "2A2620"
          },
          {
            "text": "זהות ויזואלית שמספרת את הסיפור הנכון",
            "size": 14.0,
            "bold": false,
            "color": "8A8272"
          },
          {
            "text": "02",
            "size": 22.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "עיצוב מוצר",
            "size": 22.0,
            "bold": true,
            "color": "2A2620"
          },
          {
            "text": "חוויית פרימיום מקצה לקצה",
            "size": 14.0,
            "bold": false,
            "color": "8A8272"
          },
          {
            "text": "03",
            "size": 22.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "קמפיינים",
            "size": 22.0,
            "bold": true,
            "color": "2A2620"
          },
          {
            "text": "תוכן שמרגש ומניע לפעולה",
            "size": 14.0,
            "bold": false,
            "color": "8A8272"
          }
        ]
      },
      {
        "bg": "FBF6F0",
        "blocks": [
          {
            "text": "התוצאות מדברות בעד עצמן",
            "size": 24.0,
            "bold": false,
            "color": "2A2620"
          },
          {
            "text": "98%",
            "size": 52.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "שביעות רצון לקוחות",
            "size": 13.0,
            "bold": false,
            "color": "8A8272"
          },
          {
            "text": "250+",
            "size": 52.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "פרויקטים שהושלמו",
            "size": 13.0,
            "bold": false,
            "color": "8A8272"
          },
          {
            "text": "12",
            "size": 52.0,
            "bold": false,
            "color": "C97B63"
          },
          {
            "text": "שנות ניסיון מצטבר",
            "size": 13.0,
            "bold": false,
            "color": "8A8272"
          }
        ]
      },
      {
        "bg": "F1E9DD",
        "blocks": [
          {
            "text": "יוקרה היא לא רעש — היא הבחירה להשאיר רק את מה שבאמת חשוב.",
            "size": 30.0,
            "bold": false,
            "color": "2A2620"
          }
        ]
      },
      {
        "bg": "FBF6F0",
        "blocks": [
          {
            "text": "נשמח להכיר",
            "size": 36.0,
            "bold": false,
            "color": "2A2620"
          },
          {
            "text": "hello@yourbrand.co.il · 050-000-0000",
            "size": 15.0,
            "bold": false,
            "color": "8A8272"
          }
        ]
      }
    ]
  },
  "deck-neopop-business": {
    "type": "deck",
    "slides": [
      {
        "bg": "E8FF3D",
        "blocks": [
          {
            "text": "שם העסק שלכם",
            "size": 54.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "2026",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מצגת עסקית שמרימה אנרגיה",
            "size": 15.0,
            "bold": true,
            "color": "E8FF3D"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מי אנחנו",
            "size": 22.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "אנחנו לא עוד עסק אפור. אנחנו כאן כדי לעורר, להפתיע ולגרום לכם להרגיש משהו. כל פרויקט הוא הזדמנות לעשות את זה אחרת — בגדול, בצבע ובלי פחד.",
            "size": 18.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "★",
            "size": 40.0,
            "bold": true,
            "color": "000000"
          }
        ]
      },
      {
        "bg": "2A4BFF",
        "blocks": [
          {
            "text": "מה אנחנו עושים",
            "size": 30.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "1",
            "size": 40.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "יצירה",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "רעיונות נועזים ועיצוב שאי אפשר לפספס",
            "size": 15.0,
            "bold": false,
            "color": "000000"
          },
          {
            "text": "2",
            "size": 40.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "אסטרטגיה",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "תוכנית חכמה שמכוונת בדיוק לקהל שלכם",
            "size": 15.0,
            "bold": false,
            "color": "000000"
          },
          {
            "text": "3",
            "size": 40.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "ביצוע",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "מהרעיון לביצוע — מהר, מדויק ובלי תירוצים",
            "size": 15.0,
            "bold": false,
            "color": "000000"
          }
        ]
      },
      {
        "bg": "E8FF3D",
        "blocks": [
          {
            "text": "המספרים שלנו",
            "size": 30.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "150+",
            "size": 26.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "לקוחות מרוצים",
            "size": 14.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "4.9",
            "size": 26.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "דירוג ממוצע",
            "size": 14.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "x3",
            "size": 26.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "צמיחה בשנה האחרונה",
            "size": 14.0,
            "bold": true,
            "color": "000000"
          }
        ]
      },
      {
        "bg": "FF7A1A",
        "blocks": [
          {
            "text": "למה אנחנו?",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "✓",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "אנרגיה שאי אפשר להתעלם ממנה",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "✓",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "תוצאות שמדברות בעד עצמן",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "✓",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "צוות שבאמת אוהב את מה שהוא עושה",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "✓",
            "size": 20.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "אפס שעמום, המון תוצאות",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "000000",
        "blocks": [
          {
            "text": "בואו נדבר!",
            "size": 38.0,
            "bold": true,
            "color": "000000"
          },
          {
            "text": "hello@yourbusiness.co.il · 050-000-0000",
            "size": 15.0,
            "bold": true,
            "color": "000000"
          }
        ]
      }
    ]
  },
  "deck-business-plan": {
    "type": "deck",
    "slides": [
      {
        "bg": "0A3A44",
        "blocks": [
          {
            "text": "שם העסק שלכם",
            "size": 44.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "תוכנית עסקית | 2027–2029",
            "size": 20.0,
            "bold": false,
            "color": "D5E7EA"
          },
          {
            "text": "טיוטה לדיון",
            "size": 13.0,
            "bold": true,
            "color": "0A3A44"
          },
          {
            "text": "תבנית תוכנית עסקית — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "9CC3C9"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "תקציר מנהלים",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "כתבו כאן בשלושה–ארבעה משפטים מה העסק עושה, למי הוא פונה ולמה עכשיו. תארו את היתרון המרכזי שלכם, את היעד העסקי לשלוש השנים הקרובות ואת ההשקעה הנדרשת כדי להגיע אליו.",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "המטרה",
            "size": 15.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "להפוך לפתרון המוביל בתחום עבור עסקים קטנים",
            "size": 12.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "הלקוחות",
            "size": 15.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "בעלי עסקים קטנים ובינוניים בישראל",
            "size": 12.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "הצמיחה",
            "size": 15.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "הכנסות של ₪2.4M עד סוף השנה השלישית",
            "size": 12.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "₪2.4M",
            "size": 44.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "הכנסות צפויות בשנה 3",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "18",
            "size": 44.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "חודשים לנקודת האיזון",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "₪600K",
            "size": 44.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "השקעה נדרשת",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "ההזדמנות והפתרון",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "הבעיה שאנחנו מזהים בשוק, ואיך העסק שלנו פותר אותה",
            "size": 14.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "הבעיה וההזדמנות",
            "size": 22.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "תארו את הכאב המרכזי של הלקוחות — מה לא עובד היום",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "כמה זה עולה להם: זמן, כסף או לקוחות שהולכים לאיבוד",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "למה עכשיו: שינוי בשוק, ברגולציה או בטכנולוגיה",
            "size": 15.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "הפתרון שלנו",
            "size": 22.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מה המוצר או השירות עושה, במשפט אחד ברור",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "מה מבדיל אותו מהחלופות שקיימות היום",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "התועלת המדידה ללקוח — למשל חיסכון של 30% בזמן",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      },
      {
        "bg": "0A3A44",
        "blocks": [
          {
            "text": "קהל יעד ושוק",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "החליפו את המספרים בנתוני השוק שלכם ובמקורות שעליהם הם מבוססים",
            "size": 14.0,
            "bold": false,
            "color": "9CC3C9"
          },
          {
            "text": "השוק הכולל",
            "size": 12.0,
            "bold": true,
            "color": "0A3A44"
          },
          {
            "text": "450K",
            "size": 44.0,
            "bold": true,
            "color": "F2A93B"
          },
          {
            "text": "עסקים קטנים בישראל",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "השוק הזמין",
            "size": 12.0,
            "bold": true,
            "color": "0A3A44"
          },
          {
            "text": "60K",
            "size": 44.0,
            "bold": true,
            "color": "F2A93B"
          },
          {
            "text": "עסקים בתחום הפעילות שלנו",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "היעד שלנו",
            "size": 12.0,
            "bold": true,
            "color": "0A3A44"
          },
          {
            "text": "3,000",
            "size": 44.0,
            "bold": true,
            "color": "F2A93B"
          },
          {
            "text": "לקוחות משלמים עד שנה 3",
            "size": 15.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "הלקוח האידיאלי שלנו",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "בעלי עסקים עם 1–20 עובדים, שמנהלים היום את התהליך ידנית, מחפשים לחסוך זמן ומוכנים לשלם על פתרון פשוט בעברית.",
            "size": 14.0,
            "bold": false,
            "color": "D5E7EA"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מודל הכנסות ותמחור",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מאיפה יגיע הכסף — ומה החלק של כל מקור בהכנסות",
            "size": 14.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "70%",
            "size": 44.0,
            "bold": true,
            "color": "F2A93B"
          },
          {
            "text": "מההכנסות",
            "size": 12.0,
            "bold": false,
            "color": "D5E7EA"
          },
          {
            "text": "מנויים חודשיים",
            "size": 19.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "₪149 לחודש לעסק",
            "size": 15.0,
            "bold": true,
            "color": "F2A93B"
          },
          {
            "text": "הכנסה חוזרת וצפויה, עם הנחה על תשלום שנתי",
            "size": 13.0,
            "bold": false,
            "color": "D5E7EA"
          },
          {
            "text": "20%",
            "size": 44.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מההכנסות",
            "size": 12.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "הטמעה והדרכה",
            "size": 19.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "₪1,500 חד-פעמי",
            "size": 15.0,
            "bold": true,
            "color": "B9770E"
          },
          {
            "text": "ליווי בהקמה, הסבת נתונים והדרכת הצוות",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "10%",
            "size": 44.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מההכנסות",
            "size": 12.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "שירותי פרימיום",
            "size": 19.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "לפי הצעת מחיר",
            "size": 15.0,
            "bold": true,
            "color": "B9770E"
          },
          {
            "text": "התאמות אישיות, אינטגרציות ותמיכה מורחבת",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "תוכנית שיווק",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "ארבעה ערוצים מרכזיים לגיוס לקוחות בשנה הראשונה",
            "size": 14.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "תוכן וקידום אורגני",
            "size": 18.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "מדריכים, בלוג וסרטונים קצרים שמביאים תנועה קבועה",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "25%",
            "size": 28.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מהתקציב",
            "size": 11.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "קמפיינים ממומנים",
            "size": 18.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "גוגל ורשתות חברתיות, עם מדידה שבועית של עלות לליד",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "40%",
            "size": 28.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מהתקציב",
            "size": 11.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "שיתופי פעולה",
            "size": 18.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "רואי חשבון, יועצים ואיגודים מקצועיים שמפנים לקוחות",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "20%",
            "size": 28.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מהתקציב",
            "size": 11.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "הפניות מלקוחות",
            "size": 18.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "תוכנית חבר-מביא-חבר עם הטבה לשני הצדדים",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "15%",
            "size": 28.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "מהתקציב",
            "size": 11.0,
            "bold": false,
            "color": "66767B"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "תחזית כספית",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "הכנסות מול הוצאות בשלוש השנים הראשונות (באלפי ₪)",
            "size": 14.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "₪750K",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "רווח תפעולי בשנה 3",
            "size": 14.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "פי 2",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "צמיחה בהכנסות משנה לשנה",
            "size": 14.0,
            "bold": false,
            "color": "1E2B2F"
          },
          {
            "text": "חודש 18",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "נקודת האיזון",
            "size": 14.0,
            "bold": false,
            "color": "1E2B2F"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "אבני דרך",
            "size": 32.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "היעדים המרכזיים בדרך לתוכנית — עדכנו תאריכים לפי הקצב שלכם",
            "size": 14.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "Q1 2027",
            "size": 13.0,
            "bold": true,
            "color": "0A3A44"
          },
          {
            "text": "1",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "השקת המוצר",
            "size": 17.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "גרסה ראשונה ללקוחות פיילוט",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "Q3 2027",
            "size": 13.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "2",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "100 לקוחות",
            "size": 17.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "לקוחות משלמים ראשונים",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "Q1 2028",
            "size": 13.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "3",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "נקודת איזון",
            "size": 17.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "ההכנסות מכסות את ההוצאות",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "Q3 2028",
            "size": 13.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "4",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "הרחבת הצוות",
            "size": 17.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "גיוס של 6 עובדים נוספים",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          },
          {
            "text": "2029",
            "size": 13.0,
            "bold": true,
            "color": "0E5E6B"
          },
          {
            "text": "5",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שוק חדש",
            "size": 17.0,
            "bold": true,
            "color": "1E2B2F"
          },
          {
            "text": "כניסה לתחום פעילות נוסף",
            "size": 13.0,
            "bold": false,
            "color": "66767B"
          }
        ]
      },
      {
        "bg": "0A3A44",
        "blocks": [
          {
            "text": "בואו נדבר על התוכנית",
            "size": 36.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "נשמח לשמוע שאלות, הערות ורעיונות — ולהציג את הפרטים המלאים",
            "size": 16.0,
            "bold": false,
            "color": "D5E7EA"
          },
          {
            "text": "050-1234567",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "info@yourbusiness.co.il",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "www.yourbusiness.co.il",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "deck-quarterly-report": {
    "type": "deck",
    "slides": [
      {
        "bg": "141E38",
        "blocks": [
          {
            "text": "סיכום רבעוני ודוח ביצועים",
            "size": 44.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "רבעון 3 · 2026 | שם החברה שלכם",
            "size": 20.0,
            "bold": false,
            "color": "D3DAEA"
          },
          {
            "text": "תבנית דוח רבעוני — ניתנת להתאמה מלאה",
            "size": 12.0,
            "bold": false,
            "color": "98A3C0"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "עיקרי הרבעון",
            "size": 32.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "המספרים החשובים ביותר ברבעון במבט אחד — החליפו בנתונים שלכם",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "₪1.28M",
            "size": 36.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "הכנסות ברבעון",
            "size": 16.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "עלייה של 18%",
            "size": 12.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "312",
            "size": 36.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "לקוחות פעילים",
            "size": 16.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "24 לקוחות חדשים",
            "size": 12.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "94%",
            "size": 36.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "שימור לקוחות",
            "size": 16.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "עלייה של 2 נק׳ אחוז",
            "size": 12.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "₪4,100",
            "size": 36.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "עסקה ממוצעת",
            "size": 16.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "ירידה של 3%",
            "size": 12.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "כל השינויים מחושבים לעומת רבעון 2 · 2026",
            "size": 12.0,
            "bold": false,
            "color": "6B7385"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "הכנסות לפי חודש",
            "size": 32.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "ביצוע מול יעד בכל חודש ברבעון (באלפי ₪)",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "תובנה מרכזית",
            "size": 14.0,
            "bold": true,
            "color": "FF6F61"
          },
          {
            "text": "+22%",
            "size": 44.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "מעל היעד בספטמבר",
            "size": 16.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "כתבו כאן במשפט או שניים מה הוביל לתוצאה — למשל קמפיין, לקוח גדול או שינוי במחירים.",
            "size": 13.0,
            "bold": false,
            "color": "D3DAEA"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "יעדים מול ביצוע",
            "size": 32.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "עד כמה עמדנו ביעדים שהצבנו בתחילת הרבעון",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "מדד",
            "size": 14.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "יעד",
            "size": 14.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "ביצוע",
            "size": 14.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "עמידה ביעד",
            "size": 14.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "סטטוס",
            "size": 14.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "הכנסות",
            "size": 15.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "₪1.20M",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "₪1.28M",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "107%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "עמד ביעד",
            "size": 15.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "לקוחות חדשים",
            "size": 15.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "30",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "24",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "80%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "מתחת ליעד",
            "size": 15.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "שימור לקוחות",
            "size": 15.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "92%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "94%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "102%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "עמד ביעד",
            "size": 15.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "עסקה ממוצעת",
            "size": 15.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "₪4,300",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "₪4,100",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "95%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "קרוב ליעד",
            "size": 15.0,
            "bold": true,
            "color": "B7791F"
          },
          {
            "text": "שביעות רצון (NPS)",
            "size": 15.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "50",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "56",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "112%",
            "size": 15.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "עמד ביעד",
            "size": 15.0,
            "bold": true,
            "color": "1E8E5A"
          },
          {
            "text": "סטטוס: ירוק — עמד ביעד · כתום — קרוב ליעד · אדום — מתחת ליעד",
            "size": 12.0,
            "bold": false,
            "color": "6B7385"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "מה עבד ומה לשפר",
            "size": 32.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "הלקחים העיקריים מהרבעון — בכנות, כדי שהרבעון הבא יהיה טוב יותר",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "מה עבד",
            "size": 22.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "קמפיין הסתיו הביא 40% יותר פניות מהצפוי",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "זמן המענה ללקוחות ירד לפחות מ-4 שעות",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "שני לקוחות גדולים הרחיבו את ההתקשרות",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "מה לשפר",
            "size": 22.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "גיוס לקוחות חדשים נשאר מתחת ליעד",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "מחזור המכירה התארך בשבוע בממוצע",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          },
          {
            "text": "חסרה מדידה סדורה של מקורות הלידים",
            "size": 16.0,
            "bold": false,
            "color": "1B2233"
          }
        ]
      },
      {
        "bg": "FFFFFF",
        "blocks": [
          {
            "text": "לקוחות ופרויקטים בולטים",
            "size": 32.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "שלושה סיפורי הצלחה מהרבעון שכדאי להכיר",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "₪180K",
            "size": 26.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "שם הלקוח",
            "size": 20.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "תחום: קמעונאות",
            "size": 13.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "הטמעת המערכת בשלושה סניפים, כולל הדרכת צוות",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "₪120K",
            "size": 26.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "שם הלקוח",
            "size": 20.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "תחום: שירותים פיננסיים",
            "size": 13.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "פרויקט אוטומציה שחסך ללקוח 20 שעות בשבוע",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          },
          {
            "text": "+35%",
            "size": 26.0,
            "bold": true,
            "color": "E04E3E"
          },
          {
            "text": "שם הפרויקט",
            "size": 20.0,
            "bold": true,
            "color": "1B2233"
          },
          {
            "text": "פרויקט פנימי",
            "size": 13.0,
            "bold": true,
            "color": "1E2E57"
          },
          {
            "text": "השקת ממשק לקוחות חדש — 1,200 משתמשים בחודש הראשון",
            "size": 14.0,
            "bold": false,
            "color": "6B7385"
          }
        ]
      },
      {
        "bg": "141E38",
        "blocks": [
          {
            "text": "יעדים לרבעון הבא",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "רבעון 4 · 2026 — מה אנחנו מתחייבים להשיג",
            "size": 14.0,
            "bold": false,
            "color": "98A3C0"
          },
          {
            "text": "1",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "₪1.45M",
            "size": 34.0,
            "bold": true,
            "color": "FF6F61"
          },
          {
            "text": "הכנסות",
            "size": 17.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "13% יותר מרבעון 3",
            "size": 13.0,
            "bold": false,
            "color": "D3DAEA"
          },
          {
            "text": "2",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "40",
            "size": 34.0,
            "bold": true,
            "color": "FF6F61"
          },
          {
            "text": "לקוחות חדשים",
            "size": 17.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "בעזרת שני ערוצי גיוס חדשים",
            "size": 13.0,
            "bold": false,
            "color": "D3DAEA"
          },
          {
            "text": "3",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "95%",
            "size": 34.0,
            "bold": true,
            "color": "FF6F61"
          },
          {
            "text": "שימור לקוחות",
            "size": 17.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "תוכנית ליווי ללקוחות חדשים",
            "size": 13.0,
            "bold": false,
            "color": "D3DAEA"
          },
          {
            "text": "4",
            "size": 18.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "3 ימים",
            "size": 34.0,
            "bold": true,
            "color": "FF6F61"
          },
          {
            "text": "זמן הטמעה",
            "size": 17.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "במקום שבוע היום",
            "size": 13.0,
            "bold": false,
            "color": "D3DAEA"
          }
        ]
      },
      {
        "bg": "141E38",
        "blocks": [
          {
            "text": "תודה!",
            "size": 40.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "שאלות, הערות ורעיונות לרבעון הבא — נשמח לשמוע",
            "size": 16.0,
            "bold": false,
            "color": "D3DAEA"
          },
          {
            "text": "שם המציג/ה ותפקיד",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "name@yourcompany.co.il",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          },
          {
            "text": "050-1234567",
            "size": 14.0,
            "bold": false,
            "color": "FFFFFF"
          }
        ]
      }
    ]
  },
  "xlsx-income-expenses": {"type":"xlsx","sheetName":"יומן","rows":[[{"v":"יומן הכנסות והוצאות","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"כל תנועה בשורה: תאריך, הכנסה או הוצאה, קטגוריה וסכום ששולם (כולל מע״מ). ״כולל מע״מ?״ = לא, למשל על הוצאה בלי חשבונית מס. כל הסיכומים בגיליון ״סיכום חודשי״.","color":"666666","size":10.0,"span":10}],[],[{"v":"הכנסות השנה (לפני מע״מ)","fill":"E8F1EE","bold":true,"span":2},{"v":"17,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"הוצאות השנה (לפני מע״מ)","fill":"E8F1EE","bold":true},{"v":"7,159 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"רווח","fill":"E8F1EE","bold":true},{"v":"9,841 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"תאריך","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סוג","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תיאור","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"לקוח / ספק","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מס׳ חשבונית","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סכום ששולם (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"כולל מע״מ?","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מע״מ (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"לפני מע״מ (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שנה","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"02/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"שירותים","fill":"FFF9C4","color":"0000CC"},{"v":"ריטיינר חודשי","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח א׳","fill":"FFF9C4","color":"0000CC"},{"v":"1001","fill":"FFF9C4","color":"0000CC"},{"v":"4,720.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"720.00 ₪"},{"v":"4,000.00 ₪"},{"v":"2,027"}],[{"v":"03/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות סטודיו","fill":"FFF9C4","color":"0000CC"},{"v":"בעל הנכס","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"3,000.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"לא","fill":"FFF9C4","color":"0000CC"},{"v":"0.00 ₪"},{"v":"3,000.00 ₪"},{"v":"2,027"}],[{"v":"09/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"מכירות","fill":"FFF9C4","color":"0000CC"},{"v":"הזמנה מהאתר","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח ב׳","fill":"FFF9C4","color":"0000CC"},{"v":"1002","fill":"FFF9C4","color":"0000CC"},{"v":"1,180.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"180.00 ₪"},{"v":"1,000.00 ₪"},{"v":"2,027"}],[{"v":"12/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"שיווק ופרסום","fill":"FFF9C4","color":"0000CC"},{"v":"קמפיין ממומן","fill":"FFF9C4","color":"0000CC"},{"v":"Meta","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"590.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"90.00 ₪"},{"v":"500.00 ₪"},{"v":"2,027"}],[{"v":"20/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"תוכנות ומנויים","fill":"FFF9C4","color":"0000CC"},{"v":"מנוי חודשי","fill":"FFF9C4","color":"0000CC"},{"v":"Canva","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"59.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"לא","fill":"FFF9C4","color":"0000CC"},{"v":"0.00 ₪"},{"v":"59.00 ₪"},{"v":"2,027"}],[{"v":"28/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"שירותים","fill":"FFF9C4","color":"0000CC"},{"v":"פרויקט עיצוב","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח ג׳","fill":"FFF9C4","color":"0000CC"},{"v":"1003","fill":"FFF9C4","color":"0000CC"},{"v":"7,080.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"1,080.00 ₪"},{"v":"6,000.00 ₪"},{"v":"2,027"}],[{"v":"02/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"שירותים","fill":"FFF9C4","color":"0000CC"},{"v":"ריטיינר חודשי","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח א׳","fill":"FFF9C4","color":"0000CC"},{"v":"1004","fill":"FFF9C4","color":"0000CC"},{"v":"4,720.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"720.00 ₪"},{"v":"4,000.00 ₪"},{"v":"2,027"}],[{"v":"03/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות סטודיו","fill":"FFF9C4","color":"0000CC"},{"v":"בעל הנכס","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"3,000.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"לא","fill":"FFF9C4","color":"0000CC"},{"v":"0.00 ₪"},{"v":"3,000.00 ₪"},{"v":"2,027"}],[{"v":"15/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"ייעוץ מקצועי","fill":"FFF9C4","color":"0000CC"},{"v":"רואה חשבון","fill":"FFF9C4","color":"0000CC"},{"v":"משרד רו״ח","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"708.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"108.00 ₪"},{"v":"600.00 ₪"},{"v":"2,027"}],[{"v":"21/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"מכירות","fill":"FFF9C4","color":"0000CC"},{"v":"הזמנה מהאתר","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח ד׳","fill":"FFF9C4","color":"0000CC"},{"v":"1005","fill":"FFF9C4","color":"0000CC"},{"v":"2,360.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"360.00 ₪"},{"v":"2,000.00 ₪"},{"v":"2,027"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-budget": {"type":"xlsx","sheetName":"תקציב חודשי","rows":[[{"v":"תקציב חודשי למשק הבית","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"ממלאים רק את התאים הצהובים: קטגוריה, סוג (הכנסה/הוצאה), כמה תכננתם וכמה יצא בפועל. הסיכום והגרף מתעדכנים לבד.","color":"666666","size":10.0,"span":7}],[],[{"v":"חודש:","bold":true},{"v":"ינואר 2027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"סה״כ הכנסות בפועל","fill":"E8F1EE","bold":true},{"v":"13,800 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"הכנסות מתוכננות","fill":"E8F1EE","bold":true},{"v":"13,300 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"סה״כ הוצאות בפועל","fill":"E8F1EE","bold":true},{"v":"13,410 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"הוצאות מתוכננות","fill":"E8F1EE","bold":true},{"v":"13,250 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"נשאר בסוף החודש","fill":"E8F1EE","bold":true},{"v":"390 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"קטגוריות בחריגה","fill":"E8F1EE","bold":true},{"v":"3","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סוג","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מתוכנן (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"בפועל (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הפרש (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% מהתכנון","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מצב","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"משכורת","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"תקין"}],[{"v":"הכנסה נוספת","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"1,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"500 ₪"},{"v":"150%"},{"v":"תקין"}],[{"v":"קצבאות","fill":"FFF9C4","color":"0000CC"},{"v":"הכנסה","fill":"FFF9C4","color":"0000CC"},{"v":"300 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"300 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"תקין"}],[{"v":"שכירות / משכנתא","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"בתקציב"}],[{"v":"חשמל, מים, ארנונה","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"900 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"950 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"50 ₪"},{"v":"106%"},{"v":"חריגה"}],[{"v":"סופרמרקט","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"2,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,450 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"250 ₪"},{"v":"111%"},{"v":"חריגה"}],[{"v":"תחבורה ודלק","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"-80 ₪"},{"v":"90%"},{"v":"בתקציב"}],[{"v":"ביטוחים","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"בתקציב"}],[{"v":"תקשורת (סלולר, אינטרנט)","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"250 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"240 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"-10 ₪"},{"v":"96%"},{"v":"בתקציב"}],[{"v":"חינוך וחוגים","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"900 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"900 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"בתקציב"}],[{"v":"בריאות","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"120 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"-80 ₪"},{"v":"60%"},{"v":"בתקציב"}],[{"v":"בילויים ופנאי","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"900 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"200 ₪"},{"v":"129%"},{"v":"חריגה"}],[{"v":"ביגוד","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"300 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"180 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"-120 ₪"},{"v":"60%"},{"v":"בתקציב"}],[{"v":"חיסכון","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"100%"},{"v":"בתקציב"}],[{"v":"אחר","fill":"FFF9C4","color":"0000CC"},{"v":"הוצאה","fill":"FFF9C4","color":"0000CC"},{"v":"400 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"350 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"-50 ₪"},{"v":"88%"},{"v":"בתקציב"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-invoice": {"type":"xlsx","sheetName":"חשבונית","rows":[[{"v":"חשבונית / חשבון עסקה","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":4}],[{"v":"ממלאים את התאים הצהובים — הסכומים, ההנחה, המע״מ והסה״כ מחושבים לבד. עוסק פטור: שיעור מע״מ 0%.","color":"666666","size":10.0,"span":4}],[],[{"v":"סוג המסמך:","bold":true},{"v":"חשבונית מס","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"שם העסק:","bold":true},{"v":"שם העסק שלכם","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"ח.פ / עוסק מורשה / פטור:","bold":true},{"v":"000000000","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"כתובת:","bold":true},{"v":"רחוב, עיר","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"טלפון / אימייל:","bold":true},{"v":"050-0000000 | info@business.co.il","fill":"FFF9C4","color":"0000CC","span":3}],[],[{"v":"לכבוד (לקוח):","bold":true},{"v":"שם הלקוח","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"ח.פ / ת.ז של הלקוח:","bold":true},{"v":"","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"מספר מסמך:","bold":true},{"v":"2027-001","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"תאריך:","bold":true},{"v":"01/01/2027","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"לתשלום עד:","bold":true},{"v":"31/01/2027","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"מספר הקצאה (אם נדרש):","bold":true},{"v":"","fill":"FFF9C4","color":"0000CC","span":3}],[],[{"v":"תיאור","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"כמות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר ליחידה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סה״כ (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"שירות / מוצר לדוגמה","fill":"FFF9C4","color":"0000CC"},{"v":"1.0","fill":"FFF9C4","color":"0000CC"},{"v":"500.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"500.00 ₪"}],[{"v":"שורה נוספת לדוגמה","fill":"FFF9C4","color":"0000CC"},{"v":"2.0","fill":"FFF9C4","color":"0000CC"},{"v":"250.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"500.00 ₪"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-expense": {"type":"xlsx","sheetName":"הוצאות","rows":[[{"v":"מעקב הוצאות לעסק","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":8}],[{"v":"רושמים כל הוצאה בשורה (התאים הצהובים). הקטגוריה ואמצעי התשלום נבחרים מרשימה — אפשר לערוך את הרשימות בגיליון ״רשימות״. סיכום לפי חודש וקטגוריה בגיליון ״סיכום״.","color":"666666","size":10.0,"span":8}],[],[{"v":"סה״כ הוצאות","fill":"E8F1EE","bold":true},{"v":"9,175 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"מספר הוצאות","fill":"E8F1EE","bold":true},{"v":"9","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"הוצאות החודש","fill":"E8F1EE","bold":true},{"v":"0 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"הוצאה ממוצעת","fill":"E8F1EE","bold":true},{"v":"1,019 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"טרם שולם","fill":"E8F1EE","bold":true},{"v":"680 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"תאריך","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ספק","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תיאור","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סכום (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אמצעי תשלום","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שולם?","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"01/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"בעל הנכס","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות משרד","fill":"FFF9C4","color":"0000CC"},{"v":"3,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"העברה בנקאית","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"ציוד","fill":"FFF9C4","color":"0000CC"},{"v":"אופיס דיפו","fill":"FFF9C4","color":"0000CC"},{"v":"נייר וטונר","fill":"FFF9C4","color":"0000CC"},{"v":"340 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"אשראי","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"05/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"שיווק ופרסום","fill":"FFF9C4","color":"0000CC"},{"v":"Meta","fill":"FFF9C4","color":"0000CC"},{"v":"קמפיין חודשי","fill":"FFF9C4","color":"0000CC"},{"v":"600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"אשראי","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"08/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"תוכנות ומנויים","fill":"FFF9C4","color":"0000CC"},{"v":"Google Workspace","fill":"FFF9C4","color":"0000CC"},{"v":"מנוי דואר וענן","fill":"FFF9C4","color":"0000CC"},{"v":"95 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"הוראת קבע","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"10/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"משלוחים","fill":"FFF9C4","color":"0000CC"},{"v":"חברת שליחויות","fill":"FFF9C4","color":"0000CC"},{"v":"משלוחים ללקוחות","fill":"FFF9C4","color":"0000CC"},{"v":"260 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"אשראי","fill":"FFF9C4","color":"0000CC"},{"v":"לא","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"18/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"שיווק ופרסום","fill":"FFF9C4","color":"0000CC"},{"v":"בית דפוס","fill":"FFF9C4","color":"0000CC"},{"v":"כרטיסי ביקור","fill":"FFF9C4","color":"0000CC"},{"v":"420 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"העברה בנקאית","fill":"FFF9C4","color":"0000CC"},{"v":"לא","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"25/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"ייעוץ מקצועי","fill":"FFF9C4","color":"0000CC"},{"v":"רואה חשבון","fill":"FFF9C4","color":"0000CC"},{"v":"ליווי חודשי","fill":"FFF9C4","color":"0000CC"},{"v":"750 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"העברה בנקאית","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"01/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"בעל הנכס","fill":"FFF9C4","color":"0000CC"},{"v":"שכירות משרד","fill":"FFF9C4","color":"0000CC"},{"v":"3,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"העברה בנקאית","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"07/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"רכב ונסיעות","fill":"FFF9C4","color":"0000CC"},{"v":"תחנת דלק","fill":"FFF9C4","color":"0000CC"},{"v":"נסיעות ללקוחות","fill":"FFF9C4","color":"0000CC"},{"v":"310 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"אשראי","fill":"FFF9C4","color":"0000CC"},{"v":"כן","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-clients": {"type":"xlsx","sheetName":"לקוחות","rows":[[{"v":"מעקב לקוחות ולידים","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"כל לקוח או ליד בשורה. בוחרים סטטוס ומקור מהרשימה, ורושמים מתי לחזור אליו — שורה שמועד המעקב שלה הגיע נצבעת באדום, כדי ששום ליד לא יישכח.","color":"666666","size":10.0,"span":9}],[],[{"v":"סה״כ ברשימה","fill":"E8F1EE","bold":true},{"v":"5","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"כמה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שווי (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"מעקבים להיום ובאיחור","fill":"E8F1EE","bold":true},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"ליד חדש"},{"v":"1"},{"v":"1,200 ₪"}],[{"v":"שווי עסקאות פתוחות (₪)","fill":"E8F1EE","bold":true},{"v":"6,700 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"בטיפול"},{"v":"1"},{"v":"2,000 ₪"}],[{"v":""},{"v":""},{"v":""},{"v":"הצעה נשלחה"},{"v":"1"},{"v":"3,500 ₪"}],[{"v":""},{"v":""},{"v":""},{"v":"לקוח פעיל"},{"v":"1"},{"v":"4,800 ₪"}],[{"v":""},{"v":""},{"v":""},{"v":"לא רלוונטי"},{"v":"1"},{"v":"0 ₪"}],[],[],[],[{"v":"שם","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"טלפון","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אימייל","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מקור","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"פנייה ראשונה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מעקב הבא","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שווי עסקה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"דנה כהן","fill":"FFF9C4","color":"0000CC"},{"v":"050-1234567","fill":"FFF9C4","color":"0000CC"},{"v":"dana@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"המלצה","fill":"FFF9C4","color":"0000CC"},{"v":"לקוח פעיל","fill":"FFF9C4","color":"0000CC"},{"v":"03/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"4,800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"מעוניינת בחבילה מלאה","fill":"FFF9C4","color":"0000CC"}],[{"v":"יוסי לוי","fill":"FFF9C4","color":"0000CC"},{"v":"052-9876543","fill":"FFF9C4","color":"0000CC"},{"v":"yossi@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"אתר","fill":"FFF9C4","color":"0000CC"},{"v":"הצעה נשלחה","fill":"FFF9C4","color":"0000CC"},{"v":"07/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"3,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"לחזור אליו לגבי ההצעה","fill":"FFF9C4","color":"0000CC"}],[{"v":"שירה אברהם","fill":"FFF9C4","color":"0000CC"},{"v":"054-5551234","fill":"FFF9C4","color":"0000CC"},{"v":"shira@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"אינסטגרם","fill":"FFF9C4","color":"0000CC"},{"v":"ליד חדש","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"15/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"1,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"אורי מזרחי","fill":"FFF9C4","color":"0000CC"},{"v":"053-1112223","fill":"FFF9C4","color":"0000CC"},{"v":"uri@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"גוגל","fill":"FFF9C4","color":"0000CC"},{"v":"בטיפול","fill":"FFF9C4","color":"0000CC"},{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"2,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"שלחתי דוגמאות","fill":"FFF9C4","color":"0000CC"}],[{"v":"מיכל דגן","fill":"FFF9C4","color":"0000CC"},{"v":"050-7778889","fill":"FFF9C4","color":"0000CC"},{"v":"michal@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"המלצה","fill":"FFF9C4","color":"0000CC"},{"v":"לא רלוונטי","fill":"FFF9C4","color":"0000CC"},{"v":"14/08/2026","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"בחרה ספק אחר","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-cashflow": {"type":"xlsx","sheetName":"תזרים מזומנים","rows":[[{"v":"תחזית תזרים מזומנים — 12 חודשים","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"ממלאים יתרת פתיחה, חודש התחלה, והכנסות והוצאות צפויות בכל חודש (התאים הצהובים). יתרת הסגירה עוברת לחודש הבא לבד, וחודש שבו הקופה במינוס נצבע באדום.","color":"666666","size":10.0,"span":14}],[],[{"v":"חודש ראשון:","bold":true},{"v":"01/2027","fill":"FFF9C4","color":"0000CC"}],[{"v":"יתרת פתיחה:","bold":true},{"v":"20,000 ₪","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"סעיף","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"01/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"02/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"03/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"04/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"05/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"06/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"07/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"08/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"09/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"10/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"11/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"12/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סה״כ","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"יתרת פתיחה","fill":"E8F1EE","bold":true},{"v":"20,000 ₪","fill":"E8F1EE","bold":true},{"v":"21,500 ₪","fill":"E8F1EE","bold":true},{"v":"23,500 ₪","fill":"E8F1EE","bold":true},{"v":"29,000 ₪","fill":"E8F1EE","bold":true},{"v":"30,500 ₪","fill":"E8F1EE","bold":true},{"v":"41,000 ₪","fill":"E8F1EE","bold":true},{"v":"42,500 ₪","fill":"E8F1EE","bold":true},{"v":"45,000 ₪","fill":"E8F1EE","bold":true},{"v":"50,000 ₪","fill":"E8F1EE","bold":true},{"v":"50,500 ₪","fill":"E8F1EE","bold":true},{"v":"57,000 ₪","fill":"E8F1EE","bold":true},{"v":"64,500 ₪","fill":"E8F1EE","bold":true}],[{"v":"הכנסות","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"מכירות / לקוחות","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"22,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"26,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"19,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"21,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"17,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"23,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"24,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"28,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"252,000 ₪","bold":true}],[{"v":"הכנסות אחרות","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,500 ₪","bold":true}],[{"v":"הלוואות / השקעות","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","bold":true}],[{"v":"סה״כ הכנסות","fill":"E8F1EE","bold":true},{"v":"18,000 ₪","fill":"E8F1EE","bold":true},{"v":"18,500 ₪","fill":"E8F1EE","bold":true},{"v":"22,000 ₪","fill":"E8F1EE","bold":true},{"v":"18,000 ₪","fill":"E8F1EE","bold":true},{"v":"27,000 ₪","fill":"E8F1EE","bold":true},{"v":"18,000 ₪","fill":"E8F1EE","bold":true},{"v":"19,000 ₪","fill":"E8F1EE","bold":true},{"v":"21,500 ₪","fill":"E8F1EE","bold":true},{"v":"17,000 ₪","fill":"E8F1EE","bold":true},{"v":"23,000 ₪","fill":"E8F1EE","bold":true},{"v":"24,000 ₪","fill":"E8F1EE","bold":true},{"v":"29,500 ₪","fill":"E8F1EE","bold":true},{"v":"255,500 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"הוצאות","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"54,000 ₪","bold":true}],[{"v":"שכר עובדים","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"72,000 ₪","bold":true}],[{"v":"ספקים וחומרים","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"36,000 ₪","bold":true}],[{"v":"שיווק","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,600 ₪","bold":true}],[{"v":"מע״מ ומסים","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","bold":true}],[{"v":"החזרי הלוואות","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","bold":true}],[{"v":"אחר","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,400 ₪","bold":true}],[{"v":"סה״כ הוצאות","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"16,500 ₪","fill":"E8F1EE","bold":true},{"v":"198,000 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"תזרים נטו בחודש","bold":true},{"v":"1,500 ₪","bold":true},{"v":"2,000 ₪","bold":true},{"v":"5,500 ₪","bold":true},{"v":"1,500 ₪","bold":true},{"v":"10,500 ₪","bold":true},{"v":"1,500 ₪","bold":true},{"v":"2,500 ₪","bold":true},{"v":"5,000 ₪","bold":true},{"v":"500 ₪","bold":true},{"v":"6,500 ₪","bold":true},{"v":"7,500 ₪","bold":true},{"v":"13,000 ₪","bold":true},{"v":"57,500 ₪","bold":true}],[{"v":"יתרת סגירה","fill":"E8F1EE","bold":true},{"v":"21,500 ₪","fill":"E8F1EE","bold":true},{"v":"23,500 ₪","fill":"E8F1EE","bold":true},{"v":"29,000 ₪","fill":"E8F1EE","bold":true},{"v":"30,500 ₪","fill":"E8F1EE","bold":true},{"v":"41,000 ₪","fill":"E8F1EE","bold":true},{"v":"42,500 ₪","fill":"E8F1EE","bold":true},{"v":"45,000 ₪","fill":"E8F1EE","bold":true},{"v":"50,000 ₪","fill":"E8F1EE","bold":true},{"v":"50,500 ₪","fill":"E8F1EE","bold":true},{"v":"57,000 ₪","fill":"E8F1EE","bold":true},{"v":"64,500 ₪","fill":"E8F1EE","bold":true},{"v":"77,500 ₪","fill":"E8F1EE","bold":true},{"v":"77,500 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"היתרה הנמוכה בשנה","fill":"E8F1EE","bold":true},{"v":"21,500 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"חודשים במינוס","fill":"E8F1EE","bold":true},{"v":"0","fill":"E8F1EE","bold":true,"size":12.0}]]},
  "xlsx-inventory": {"type":"xlsx","sheetName":"מלאי","rows":[[{"v":"מעקב מלאי","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"לכל פריט: כמות במלאי, מתי להזמין שוב (נקודת הזמנה), עלות ומחיר. שווי המלאי, הכמות המומלצת להזמנה והסטטוס מחושבים לבד — פריט שנגמר או צריך הזמנה נצבע.","color":"666666","size":10.0,"span":12}],[],[{"v":"שווי מלאי (עלות) (₪)","fill":"E8F1EE","bold":true},{"v":"6,040 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"שווי מלאי (מחיר מכירה) (₪)","fill":"E8F1EE","bold":true},{"v":"14,012 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"פריטים להזמנה","fill":"E8F1EE","bold":true},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"פריטים שאזלו","fill":"E8F1EE","bold":true},{"v":"1","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"פריט","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מק״ט","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ספק","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"כמות במלאי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"נקודת הזמנה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"להזמין (מומלץ)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"עלות ליחידה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר מכירה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שווי בעלות (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שווי במכירה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"חולצת כותנה לבנה","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1001","fill":"FFF9C4","color":"0000CC"},{"v":"ביגוד","fill":"FFF9C4","color":"0000CC"},{"v":"ספק א׳","fill":"FFF9C4","color":"0000CC"},{"v":"42","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"35.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"89.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,470 ₪"},{"v":"3,738 ₪"},{"v":"תקין"}],[{"v":"חולצת כותנה שחורה","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1002","fill":"FFF9C4","color":"0000CC"},{"v":"ביגוד","fill":"FFF9C4","color":"0000CC"},{"v":"ספק א׳","fill":"FFF9C4","color":"0000CC"},{"v":"8","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"22"},{"v":"35.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"89.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"280 ₪"},{"v":"712 ₪"},{"v":"להזמין"}],[{"v":"מכנסי ג׳ינס","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1003","fill":"FFF9C4","color":"0000CC"},{"v":"ביגוד","fill":"FFF9C4","color":"0000CC"},{"v":"ספק ב׳","fill":"FFF9C4","color":"0000CC"},{"v":"25","fill":"FFF9C4","color":"0000CC"},{"v":"10","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"90.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"199.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,250 ₪"},{"v":"4,975 ₪"},{"v":"תקין"}],[{"v":"נעלי ספורט","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1004","fill":"FFF9C4","color":"0000CC"},{"v":"הנעלה","fill":"FFF9C4","color":"0000CC"},{"v":"ספק ג׳","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"8","fill":"FFF9C4","color":"0000CC"},{"v":"16"},{"v":"140.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"329.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"0 ₪"},{"v":"אזל"}],[{"v":"כובע מצחייה","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1005","fill":"FFF9C4","color":"0000CC"},{"v":"אביזרים","fill":"FFF9C4","color":"0000CC"},{"v":"ספק ב׳","fill":"FFF9C4","color":"0000CC"},{"v":"60","fill":"FFF9C4","color":"0000CC"},{"v":"20","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"25.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"59.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪"},{"v":"3,540 ₪"},{"v":"תקין"}],[{"v":"תיק גב","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1006","fill":"FFF9C4","color":"0000CC"},{"v":"אביזרים","fill":"FFF9C4","color":"0000CC"},{"v":"ספק ג׳","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"7"},{"v":"180.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"349.00 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"540 ₪"},{"v":"1,047 ₪"},{"v":"להזמין"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-timeline": {"type":"xlsx","sheetName":"לוח זמנים","rows":[[{"v":"לוח זמנים לפרויקט — עם תרשים גאנט","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"לכל משימה: אחראי, תאריך התחלה וסיום, ואחוז השלמה. המשך, הסטטוס והפסים בתרשים מתעדכנים לבד; הקו הכתום הוא השבוע הנוכחי.","color":"666666","size":10.0,"span":7}],[],[{"v":"התקדמות כוללת","fill":"E8F1EE","bold":true},{"v":"34%","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"תחילת התרשים:","bold":true},{"v":"27/09/2026","span":2}],[{"v":"משימות באיחור","fill":"E8F1EE","bold":true},{"v":"0","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"סיום מתוכנן","fill":"E8F1EE","bold":true},{"v":"14/11/2026","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"משימה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אחראי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"התחלה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סיום","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ימים","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% השלמה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"איסוף דרישות","fill":"FFF9C4","color":"0000CC"},{"v":"דנה","fill":"FFF9C4","color":"0000CC"},{"v":"27/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"02/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"6"},{"v":"100%","fill":"FFF9C4","color":"0000CC"},{"v":"הושלם"}],[{"v":"אפיון ועיצוב","fill":"FFF9C4","color":"0000CC"},{"v":"יוסי","fill":"FFF9C4","color":"0000CC"},{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11"},{"v":"80%","fill":"FFF9C4","color":"0000CC"},{"v":"בתהליך"}],[{"v":"פיתוח שלב א׳","fill":"FFF9C4","color":"0000CC"},{"v":"דנה","fill":"FFF9C4","color":"0000CC"},{"v":"11/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"01/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"22"},{"v":"30%","fill":"FFF9C4","color":"0000CC"},{"v":"בתהליך"}],[{"v":"תוכן וצילומים","fill":"FFF9C4","color":"0000CC"},{"v":"רותם","fill":"FFF9C4","color":"0000CC"},{"v":"17/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"27/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"טרם התחיל"}],[{"v":"בדיקות","fill":"FFF9C4","color":"0000CC"},{"v":"רותם","fill":"FFF9C4","color":"0000CC"},{"v":"02/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"10"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"טרם התחיל"}],[{"v":"השקה","fill":"FFF9C4","color":"0000CC"},{"v":"יוסי","fill":"FFF9C4","color":"0000CC"},{"v":"12/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"14/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"3"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"טרם התחיל"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-pnl": {"type":"xlsx","sheetName":"רווח והפסד","rows":[[{"v":"דוח רווח והפסד — שנתי לפי חודשים","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"ממלאים הכנסות, עלות המכר והוצאות בכל חודש (התאים הצהובים). הרווח הגולמי, הרווח הנקי והאחוזים מחושבים לבד, כולל סה״כ שנתי.","color":"666666","size":10.0,"span":14}],[],[{"v":"שנה:","bold":true},{"v":"2,027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"סעיף","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ינואר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"פברואר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מרץ","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אפריל","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מאי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יוני","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יולי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אוגוסט","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ספטמבר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אוקטובר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"נובמבר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"דצמבר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סה״כ","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"הכנסות","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"מכירת מוצרים","fill":"FFF9C4","color":"0000CC"},{"v":"42,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"43,260 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"44,520 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"45,780 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"47,040 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"48,300 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"49,560 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"50,820 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"52,080 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"53,340 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"54,600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"55,860 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"587,160 ₪","bold":true}],[{"v":"מכירת שירותים","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"18,540 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"19,080 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"19,620 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"20,160 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"20,700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"21,240 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"21,780 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"22,320 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"22,860 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"23,400 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"23,940 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"251,640 ₪","bold":true}],[{"v":"הכנסות אחרות","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","bold":true}],[{"v":"סה״כ הכנסות","fill":"E8F1EE","bold":true},{"v":"60,000 ₪","fill":"E8F1EE","bold":true},{"v":"61,800 ₪","fill":"E8F1EE","bold":true},{"v":"63,600 ₪","fill":"E8F1EE","bold":true},{"v":"65,400 ₪","fill":"E8F1EE","bold":true},{"v":"67,200 ₪","fill":"E8F1EE","bold":true},{"v":"69,000 ₪","fill":"E8F1EE","bold":true},{"v":"70,800 ₪","fill":"E8F1EE","bold":true},{"v":"72,600 ₪","fill":"E8F1EE","bold":true},{"v":"74,400 ₪","fill":"E8F1EE","bold":true},{"v":"76,200 ₪","fill":"E8F1EE","bold":true},{"v":"78,000 ₪","fill":"E8F1EE","bold":true},{"v":"79,800 ₪","fill":"E8F1EE","bold":true},{"v":"838,800 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"עלות המכר","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"חומרי גלם / קניות","fill":"FFF9C4","color":"0000CC"},{"v":"9,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,270 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,540 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,810 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"10,080 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"10,350 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"10,620 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"10,890 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,160 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,430 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,700 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,970 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"125,820 ₪","bold":true}],[{"v":"עבודה ישירה","fill":"FFF9C4","color":"0000CC"},{"v":"7,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,210 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,420 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,630 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,840 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,050 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,260 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,470 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,680 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,890 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,100 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,310 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"97,860 ₪","bold":true}],[{"v":"משלוחים","fill":"FFF9C4","color":"0000CC"},{"v":"1,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,236 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,272 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,308 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,344 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,380 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,416 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,452 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,488 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,524 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,560 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,596 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"16,776 ₪","bold":true}],[{"v":"סה״כ עלות המכר","fill":"E8F1EE","bold":true},{"v":"17,200 ₪","fill":"E8F1EE","bold":true},{"v":"17,716 ₪","fill":"E8F1EE","bold":true},{"v":"18,232 ₪","fill":"E8F1EE","bold":true},{"v":"18,748 ₪","fill":"E8F1EE","bold":true},{"v":"19,264 ₪","fill":"E8F1EE","bold":true},{"v":"19,780 ₪","fill":"E8F1EE","bold":true},{"v":"20,296 ₪","fill":"E8F1EE","bold":true},{"v":"20,812 ₪","fill":"E8F1EE","bold":true},{"v":"21,328 ₪","fill":"E8F1EE","bold":true},{"v":"21,844 ₪","fill":"E8F1EE","bold":true},{"v":"22,360 ₪","fill":"E8F1EE","bold":true},{"v":"22,876 ₪","fill":"E8F1EE","bold":true},{"v":"240,456 ₪","fill":"E8F1EE","bold":true}],[{"v":"רווח גולמי","bold":true},{"v":"42,800 ₪","bold":true},{"v":"44,084 ₪","bold":true},{"v":"45,368 ₪","bold":true},{"v":"46,652 ₪","bold":true},{"v":"47,936 ₪","bold":true},{"v":"49,220 ₪","bold":true},{"v":"50,504 ₪","bold":true},{"v":"51,788 ₪","bold":true},{"v":"53,072 ₪","bold":true},{"v":"54,356 ₪","bold":true},{"v":"55,640 ₪","bold":true},{"v":"56,924 ₪","bold":true},{"v":"598,344 ₪","bold":true}],[{"v":"שיעור רווח גולמי"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"}],[],[{"v":"הוצאות תפעוליות","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"שכירות","fill":"FFF9C4","color":"0000CC"},{"v":"4,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,635 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,770 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,905 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,040 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,175 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,310 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,445 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,580 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,715 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,850 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,985 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"62,910 ₪","bold":true}],[{"v":"שכר עובדים","fill":"FFF9C4","color":"0000CC"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"12,360 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"12,720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"13,080 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"13,440 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"13,800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"14,160 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"14,520 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"14,880 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"15,240 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"15,600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"15,960 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"167,760 ₪","bold":true}],[{"v":"שיווק ופרסום","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,090 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,180 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,270 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,360 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,450 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,540 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,630 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,810 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,900 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,990 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"41,940 ₪","bold":true}],[{"v":"תוכנות ומנויים","fill":"FFF9C4","color":"0000CC"},{"v":"600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"618 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"636 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"654 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"672 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"690 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"708 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"726 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"744 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"762 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"780 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"798 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,388 ₪","bold":true}],[{"v":"כללי ומנהלה","fill":"FFF9C4","color":"0000CC"},{"v":"2,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,060 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,120 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,180 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,240 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,300 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,360 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,420 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,480 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,540 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,660 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"27,960 ₪","bold":true}],[{"v":"פחת / מימון","fill":"FFF9C4","color":"0000CC"},{"v":"500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"515 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"530 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"545 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"560 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"575 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"590 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"605 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"620 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"635 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"650 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"665 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,990 ₪","bold":true}],[{"v":"סה״כ הוצאות תפעוליות","fill":"E8F1EE","bold":true},{"v":"22,600 ₪","fill":"E8F1EE","bold":true},{"v":"23,278 ₪","fill":"E8F1EE","bold":true},{"v":"23,956 ₪","fill":"E8F1EE","bold":true},{"v":"24,634 ₪","fill":"E8F1EE","bold":true},{"v":"25,312 ₪","fill":"E8F1EE","bold":true},{"v":"25,990 ₪","fill":"E8F1EE","bold":true},{"v":"26,668 ₪","fill":"E8F1EE","bold":true},{"v":"27,346 ₪","fill":"E8F1EE","bold":true},{"v":"28,024 ₪","fill":"E8F1EE","bold":true},{"v":"28,702 ₪","fill":"E8F1EE","bold":true},{"v":"29,380 ₪","fill":"E8F1EE","bold":true},{"v":"30,058 ₪","fill":"E8F1EE","bold":true},{"v":"315,948 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"רווח לפני מס","fill":"C9973A","bold":true,"color":"FFFFFF"},{"v":"20,200 ₪","fill":"F6EBD6","bold":true},{"v":"20,806 ₪","fill":"F6EBD6","bold":true},{"v":"21,412 ₪","fill":"F6EBD6","bold":true},{"v":"22,018 ₪","fill":"F6EBD6","bold":true},{"v":"22,624 ₪","fill":"F6EBD6","bold":true},{"v":"23,230 ₪","fill":"F6EBD6","bold":true},{"v":"23,836 ₪","fill":"F6EBD6","bold":true},{"v":"24,442 ₪","fill":"F6EBD6","bold":true},{"v":"25,048 ₪","fill":"F6EBD6","bold":true},{"v":"25,654 ₪","fill":"F6EBD6","bold":true},{"v":"26,260 ₪","fill":"F6EBD6","bold":true},{"v":"26,866 ₪","fill":"F6EBD6","bold":true},{"v":"282,396 ₪","fill":"F6EBD6","bold":true}],[{"v":"שיעור רווח נקי"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"}]]},
  "xlsx-timesheet": {"type":"xlsx","sheetName":"דיווח שעות","rows":[[{"v":"דיווח שעות עבודה","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"כל משמרת בשורה: תאריך, עובד, שעת כניסה ויציאה והפסקה בדקות. השעות והתשלום מחושבים לבד — גם משמרת שעוברת את חצות.","color":"666666","size":10.0,"span":9}],[],[{"v":"סה״כ שעות","fill":"E8F1EE","bold":true},{"v":"31.75","fill":"E8F1EE","bold":true,"size":12.0},{"v":"סה״כ לתשלום (₪)","fill":"E8F1EE","bold":true},{"v":"1,785 ₪","fill":"E8F1EE","bold":true,"size":12.0,"span":2}],[],[{"v":"תאריך","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"עובד","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"כניסה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יציאה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הפסקה (דק׳)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שעות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תעריף (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"לתשלום (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"01/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"נועה","fill":"FFF9C4","color":"0000CC"},{"v":"09:00","fill":"FFF9C4","color":"0000CC"},{"v":"17:30","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"8.00"},{"v":"55.00 ₪"},{"v":"440.00 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"02/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"נועה","fill":"FFF9C4","color":"0000CC"},{"v":"09:00","fill":"FFF9C4","color":"0000CC"},{"v":"16:00","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"6.50"},{"v":"55.00 ₪"},{"v":"357.50 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"01/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"אורי","fill":"FFF9C4","color":"0000CC"},{"v":"16:00","fill":"FFF9C4","color":"0000CC"},{"v":"00:30","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"8.00"},{"v":"60.00 ₪"},{"v":"480.00 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"אורי","fill":"FFF9C4","color":"0000CC"},{"v":"10:00","fill":"FFF9C4","color":"0000CC"},{"v":"14:30","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"4.50"},{"v":"60.00 ₪"},{"v":"270.00 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"מאיה","fill":"FFF9C4","color":"0000CC"},{"v":"08:00","fill":"FFF9C4","color":"0000CC"},{"v":"13:00","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"4.75"},{"v":"50.00 ₪"},{"v":"237.50 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-breakeven": {"type":"xlsx","sheetName":"נקודת איזון","rows":[[{"v":"נקודת איזון ותמחור","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":5}],[{"v":"ממלאים ארבעה תאים צהובים — הגיליון מחשב כמה צריך למכור כדי לא להפסיד, וכמה כדי להגיע לרווח שאתם רוצים.","color":"666666","size":10.0,"span":5}],[],[{"v":"נתוני יסוד","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"הוצאות קבועות בחודש (₪)"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"}],[{"v":"עלות משתנה ליחידה / ללקוח (₪)"},{"v":"45.00 ₪","fill":"FFF9C4","color":"0000CC"}],[{"v":"מחיר מכירה ליחידה (לפני מע״מ) (₪)"},{"v":"85.00 ₪","fill":"FFF9C4","color":"0000CC"}],[{"v":"רווח חודשי שאתם רוצים (₪)"},{"v":"8,000 ₪","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"תוצאות","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"רווח תרומה ליחידה (₪)"},{"v":"40.00 ₪"}],[{"v":"שיעור רווח תרומה"},{"v":"47.1%"}],[{"v":"נקודת איזון — יחידות בחודש","bold":true},{"v":"300","fill":"E8F1EE","bold":true}],[{"v":"נקודת איזון — מחזור בחודש (₪)"},{"v":"25,500 ₪"}],[{"v":"יחידות לרווח היעד","bold":true},{"v":"500","fill":"E8F1EE","bold":true}],[{"v":"מחזור לרווח היעד (₪)"},{"v":"42,500 ₪"}],[{"v":"ביום עבודה (22 ימים בחודש) — יחידות לרווח היעד"},{"v":"23"}],[],[{"v":"תרחישי מכירה","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"יחידות שנמכרו","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחזור (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"עלות משתנה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"רווח / הפסד (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מצב","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"75"},{"v":"6,375 ₪"},{"v":"3,375 ₪"},{"v":"-9,000 ₪","bold":true},{"v":"הפסד"}],[{"v":"150"},{"v":"12,750 ₪"},{"v":"6,750 ₪"},{"v":"-6,000 ₪","bold":true},{"v":"הפסד"}],[{"v":"225"},{"v":"19,125 ₪"},{"v":"10,125 ₪"},{"v":"-3,000 ₪","bold":true},{"v":"הפסד"}]]},
  "xlsx-salestargets": {"type":"xlsx","sheetName":"מכירות ויעדים","rows":[[{"v":"מכירות מול יעדים — שנה שלמה","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":8}],[{"v":"ממלאים יעד לכל חודש, ובסוף החודש את המכירות בפועל. אחוז העמידה ביעד, הפער והמצטבר מחושבים לבד: ירוק = עמדתם ביעד, אדום = פחות מ־80%.","color":"666666","size":10.0,"span":8}],[],[{"v":"שנה:","bold":true},{"v":"2,027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"חודש","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יעד (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"בפועל (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% עמידה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"פער (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יעד מצטבר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"בפועל מצטבר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% מצטבר","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"ינואר","bold":true},{"v":"30,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"28,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"93%"},{"v":"-2,000 ₪"},{"v":"30,000 ₪"},{"v":"28,000 ₪"},{"v":"93%"}],[{"v":"פברואר","bold":true},{"v":"30,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"31,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"105%"},{"v":"1,500 ₪"},{"v":"60,000 ₪"},{"v":"59,500 ₪"},{"v":"99%"}],[{"v":"מרץ","bold":true},{"v":"35,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"33,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"94%"},{"v":"-2,000 ₪"},{"v":"95,000 ₪"},{"v":"92,500 ₪"},{"v":"97%"}],[{"v":"אפריל","bold":true},{"v":"35,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"37,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"107%"},{"v":"2,500 ₪"},{"v":"130,000 ₪"},{"v":"130,000 ₪"},{"v":"100%"}],[{"v":"מאי","bold":true},{"v":"40,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"39,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"98%"},{"v":"-1,000 ₪"},{"v":"170,000 ₪"},{"v":"169,000 ₪"},{"v":"99%"}],[{"v":"יוני","bold":true},{"v":"40,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"44,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"110%"},{"v":"4,000 ₪"},{"v":"210,000 ₪"},{"v":"213,000 ₪"},{"v":"101%"}],[{"v":"יולי","bold":true},{"v":"40,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"אוגוסט","bold":true},{"v":"38,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"ספטמבר","bold":true},{"v":"42,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"אוקטובר","bold":true},{"v":"45,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"נובמבר","bold":true},{"v":"45,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"דצמבר","bold":true},{"v":"50,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"סה״כ","fill":"E8F1EE","bold":true},{"v":"470,000 ₪","fill":"E8F1EE","bold":true},{"v":"213,000 ₪","fill":"E8F1EE","bold":true},{"v":"101%","fill":"E8F1EE","bold":true},{"v":"3,000 ₪","fill":"E8F1EE","bold":true}],[],[{"v":"חודשים שעמדו ביעד","bold":true},{"v":""},{"v":"3"}],[{"v":"כמה חסר ליעד השנתי","bold":true},{"v":""},{"v":"257,000 ₪"}]]},
  "xlsx-vendors": {"type":"xlsx","sheetName":"השוואת ספקים","rows":[[{"v":"השוואת ספקים — ציון משוקלל","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"קובעים כמה חשוב כל קריטריון (המשקלות בצהוב, סה״כ 100%), וממלאים לכל ספק מחיר, זמן אספקה ודירוג 1–5. הספק הזול ביותר מקבל 10 במחיר, המהיר ביותר 10 באספקה — והגיליון מדרג וממליץ.","color":"666666","size":10.0,"span":12}],[],[{"v":"משקל מחיר","bold":true},{"v":"40%","fill":"FFF9C4","color":"0000CC"},{"v":"סה״כ משקלות","bold":true},{"v":"100%","bold":true},{"v":""},{"v":""},{"v":""},{"v":"הספק המומלץ","fill":"E8F1EE","bold":true,"span":2},{"v":"ספק ג׳","fill":"E8F1EE","bold":true,"size":12.0,"span":3}],[{"v":"משקל זמן אספקה","bold":true},{"v":"20%","fill":"FFF9C4","color":"0000CC"}],[{"v":"משקל איכות","bold":true},{"v":"30%","fill":"FFF9C4","color":"0000CC"}],[{"v":"משקל שירות","bold":true},{"v":"10%","fill":"FFF9C4","color":"0000CC"}],[],[],[{"v":"ספק","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"פריט / שירות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אספקה (ימים)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"איכות (1–5)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שירות (1–5)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ציון מחיר","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ציון אספקה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ציון איכות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ציון שירות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ציון משוקלל","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"דירוג","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"ספק א׳","fill":"FFF9C4","color":"0000CC"},{"v":"אריזות — הזמנה חודשית","fill":"FFF9C4","color":"0000CC"},{"v":"4,200 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"9.0"},{"v":"6.0"},{"v":"8.0"},{"v":"8.0"},{"v":"8.00"},{"v":"2"}],[{"v":"ספק ב׳","fill":"FFF9C4","color":"0000CC"},{"v":"אריזות — הזמנה חודשית","fill":"FFF9C4","color":"0000CC"},{"v":"3,800 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"10.0"},{"v":"3.3"},{"v":"6.0"},{"v":"6.0"},{"v":"7.06"},{"v":"4"}],[{"v":"ספק ג׳","fill":"FFF9C4","color":"0000CC"},{"v":"אריזות — הזמנה חודשית","fill":"FFF9C4","color":"0000CC"},{"v":"4,600 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"8.3"},{"v":"10.0"},{"v":"10.0"},{"v":"10.0"},{"v":"9.32"},{"v":"1"}],[{"v":"ספק ד׳","fill":"FFF9C4","color":"0000CC"},{"v":"אריזות — הזמנה חודשית","fill":"FFF9C4","color":"0000CC"},{"v":"3,950 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"9.6"},{"v":"4.3"},{"v":"8.0"},{"v":"6.0"},{"v":"7.70"},{"v":"3"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-receivables": {"type":"xlsx","sheetName":"גבייה","rows":[[{"v":"מעקב גבייה — מי חייב לי כסף","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":11}],[{"v":"כל חשבונית בשורה: לקוח, תאריך, תנאי תשלום (ימים), סכום וכמה שולם. היתרה, ימי האיחור והסטטוס מחושבים לבד — ובראש הגיליון רואים כמה כסף פתוח ובאיחור.","color":"666666","size":10.0,"span":11}],[],[{"v":"סה״כ פתוח לגבייה","fill":"E8F1EE","bold":true,"span":2},{"v":"14,660 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"איחור 1–30 יום","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"31–60","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"61–90","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מעל 90","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"מתוכו באיחור","fill":"E8F1EE","bold":true,"span":2},{"v":"2,860 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"1,360 ₪"},{"v":"1,500 ₪"},{"v":"0 ₪"},{"v":"0 ₪"}],[{"v":"חשבוניות באיחור","fill":"E8F1EE","bold":true,"span":2},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[],[],[{"v":"מס׳ חשבונית","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"לקוח","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תאריך","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תנאי תשלום (ימים)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"לתשלום עד","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סכום (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שולם (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ימי איחור","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"1001","fill":"FFF9C4","color":"0000CC"},{"v":"סטודיו אור","fill":"FFF9C4","color":"0000CC"},{"v":"30/07/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"29/08/2026"},{"v":"4,720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":""},{"v":"שולם"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1002","fill":"FFF9C4","color":"0000CC"},{"v":"מאפיית השכונה","fill":"FFF9C4","color":"0000CC"},{"v":"24/08/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"23/09/2026"},{"v":"2,360 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,360 ₪"},{"v":"20"},{"v":"באיחור"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1003","fill":"FFF9C4","color":"0000CC"},{"v":"משרד עו״ד לוי","fill":"FFF9C4","color":"0000CC"},{"v":"23/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"23/10/2026"},{"v":"7,080 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,080 ₪"},{"v":"0"},{"v":"פתוח"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1004","fill":"FFF9C4","color":"0000CC"},{"v":"גן ירוק","fill":"FFF9C4","color":"0000CC"},{"v":"05/07/2026","fill":"FFF9C4","color":"0000CC"},{"v":"60","fill":"FFF9C4","color":"0000CC"},{"v":"03/09/2026"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪"},{"v":"40"},{"v":"באיחור"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1005","fill":"FFF9C4","color":"0000CC"},{"v":"סטודיו אור","fill":"FFF9C4","color":"0000CC"},{"v":"08/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"07/11/2026"},{"v":"4,720 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"4,720 ₪"},{"v":"0"},{"v":"פתוח"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-event-budget": {"type":"xlsx","sheetName":"תקציב אירוע","rows":[[{"v":"תקציב אירוע — חתונה, בר/בת מצווה, ברית ואירוע עסקי","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"ממלאים את פרטי האירוע ולכל ספק: הצעת מחיר, מחיר סופי וכמה שולם. רואים בכל רגע כמה נשאר לשלם, עלות למוזמן, ואם יוצאים מהתקציב.","color":"666666","size":10.0,"span":10}],[],[{"v":"שם האירוע","bold":true},{"v":"החתונה של נועה ודניאל","fill":"FFF9C4","color":"0000CC","span":2},{"v":""},{"v":"עלות צפויה (₪)","fill":"E8F1EE","bold":true},{"v":"140,900 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"צפי מתנות (₪)","fill":"E8F1EE","bold":true},{"v":"112,500 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"תאריך","bold":true},{"v":"10/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"שולם עד עכשיו (₪)","fill":"E8F1EE","bold":true},{"v":"30,900 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":"מאזן משוער (₪)","fill":"E8F1EE","bold":true},{"v":"-28,400 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"מספר מוזמנים","bold":true},{"v":"250","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"נשאר לשלם (₪)","fill":"E8F1EE","bold":true},{"v":"110,000 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"תקציב כולל (₪)","bold":true},{"v":"180,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"מול התקציב (₪)","fill":"E8F1EE","bold":true},{"v":"39,100 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"צפי מתנות לאורח (אופציונלי) (₪)","bold":true},{"v":"450 ₪","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"עלות למוזמן (₪)","fill":"E8F1EE","bold":true},{"v":"564 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[],[{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ספק","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"טלפון","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הצעת מחיר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר סופי (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שולם (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תשלום הבא","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"אולם / גן אירועים","fill":"FFF9C4","color":"0000CC"},{"v":"גן האירועים","fill":"FFF9C4","color":"0000CC"},{"v":"03-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"60,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"58,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"15,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"43,000 ₪"},{"v":"12/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"שולם חלקית"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"קייטרינג","fill":"FFF9C4","color":"0000CC"},{"v":"קייטרינג טעמים","fill":"FFF9C4","color":"0000CC"},{"v":"050-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"55,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"5,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"50,000 ₪"},{"v":"12/12/2026","fill":"FFF9C4","color":"0000CC"},{"v":"שולם חלקית"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"צילום ווידאו","fill":"FFF9C4","color":"0000CC"},{"v":"סטודיו צילום","fill":"FFF9C4","color":"0000CC"},{"v":"052-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"8,000 ₪"},{"v":"11/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"שולם חלקית"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"מוזיקה / DJ","fill":"FFF9C4","color":"0000CC"},{"v":"DJ","fill":"FFF9C4","color":"0000CC"},{"v":"054-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"7,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"6,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"שולם"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"עיצוב ופרחים","fill":"FFF9C4","color":"0000CC"},{"v":"פרחי השדה","fill":"FFF9C4","color":"0000CC"},{"v":"053-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"9,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,000 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"טרם שולם"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"הזמנות ומדיה","fill":"FFF9C4","color":"0000CC"},{"v":"בית דפוס","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"1,500 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,400 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,400 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"שולם"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-savings": {"type":"xlsx","sheetName":"יעדי חיסכון","rows":[[{"v":"יעדי חיסכון","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"לכל יעד (רכב, חופשה, קרן חירום...): כמה צריך, עד מתי, וכמה כבר חסכתם. הגיליון מחשב כמה להפריש כל חודש כדי להגיע בזמן.","color":"666666","size":10.0,"span":9}],[],[{"v":"סה״כ יעדים (₪)","fill":"E8F1EE","bold":true},{"v":"117,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"להפריש בחודש (כל היעדים) (₪)","fill":"E8F1EE","bold":true},{"v":"5,125 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"נחסך עד עכשיו (₪)","fill":"E8F1EE","bold":true},{"v":"40,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"התקדמות כוללת","fill":"E8F1EE","bold":true},{"v":"34%","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"יעד","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סכום יעד (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תאריך יעד","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"נחסך (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חסר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חודשים שנותרו","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"להפריש בחודש (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"התקדמות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מצב","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"קרן חירום (3 חודשי מחיה)","fill":"FFF9C4","color":"0000CC"},{"v":"36,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2027","fill":"FFF9C4","color":"0000CC"},{"v":"12,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"24,000 ₪"},{"v":"12"},{"v":"2,000 ₪"},{"v":"33%"},{"v":"בדרך"}],[{"v":"חופשה משפחתית","fill":"FFF9C4","color":"0000CC"},{"v":"15,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"10/06/2027","fill":"FFF9C4","color":"0000CC"},{"v":"4,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"11,000 ₪"},{"v":"8"},{"v":"1,375 ₪"},{"v":"27%"},{"v":"בדרך"}],[{"v":"רכב","fill":"FFF9C4","color":"0000CC"},{"v":"60,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2028","fill":"FFF9C4","color":"0000CC"},{"v":"18,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"42,000 ₪"},{"v":"24"},{"v":"1,750 ₪"},{"v":"30%"},{"v":"בדרך"}],[{"v":"מחשב חדש","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"12/03/2027","fill":"FFF9C4","color":"0000CC"},{"v":"6,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"5"},{"v":"0 ₪"},{"v":"100%"},{"v":"הושג!"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-shifts": {"type":"xlsx","sheetName":"סידור עבודה","rows":[[{"v":"סידור משמרות שבועי","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"בוחרים שבוע (יום ראשון) ולכל עובד משמרת בכל יום מהרשימה. סופרים לבד כמה משמרות ושעות לכל עובד, וכמה אנשים בכל משמרת ביום.","color":"666666","size":10.0,"span":10}],[],[{"v":"השבוע שמתחיל ב־","bold":true},{"v":"11/10/2026","fill":"FFF9C4","color":"0000CC","span":2}],[],[{"v":"עובד","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ראשון","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שני","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שלישי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"רביעי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חמישי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שישי","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שבת","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"משמרות","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שעות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"תאריך","fill":"E8F1EE","bold":true},{"v":"11/10","fill":"E8F1EE","bold":true},{"v":"12/10","fill":"E8F1EE","bold":true},{"v":"13/10","fill":"E8F1EE","bold":true},{"v":"14/10","fill":"E8F1EE","bold":true},{"v":"15/10","fill":"E8F1EE","bold":true},{"v":"16/10","fill":"E8F1EE","bold":true},{"v":"17/10","fill":"E8F1EE","bold":true},{"v":"","fill":"E8F1EE"},{"v":"","fill":"E8F1EE"}],[{"v":"נועה","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"38.0","bold":true}],[{"v":"אורי","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"4"},{"v":"32.0","bold":true}],[{"v":"מאיה","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"4"},{"v":"30.0","bold":true}],[{"v":"דניאל","fill":"FFF9C4","color":"0000CC"},{"v":"לילה","fill":"FFF9C4","color":"0000CC"},{"v":"לילה","fill":"FFF9C4","color":"0000CC"},{"v":"לילה","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"ערב","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"40.0","bold":true}],[{"v":"שירה","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"צהריים","fill":"FFF9C4","color":"0000CC"},{"v":"חופש","fill":"FFF9C4","color":"0000CC"},{"v":"בוקר","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"32.0","bold":true}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-freelance-rate": {"type":"xlsx","sheetName":"תמחור שעה","rows":[[{"v":"כמה לגבות על שעת עבודה? — מחשבון לעצמאים","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":3}],[{"v":"ממלאים כמה אתם רוצים שיישאר לכם בחודש, ההוצאות, וכמה שעות באמת אפשר לחייב. הגיליון מחשב את המחיר המינימלי לשעה, ליום ולפרויקט.","color":"666666","size":10.0,"span":3}],[],[{"v":"מה אתם רוצים להרוויח","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"כמה שיישאר לכם נטו בחודש (₪)"},{"v":"15,000 ₪","fill":"FFF9C4","color":"0000CC"}],[{"v":"הוצאות העסק בחודש (תוכנות, ציוד, רכב, רו״ח...) (₪)"},{"v":"2,500 ₪","fill":"FFF9C4","color":"0000CC"}],[{"v":"הערכת מס הכנסה + ביטוח לאומי + פנסיה (%)"},{"v":"30%","fill":"FFF9C4","color":"0000CC"},{"v":"כדאי לבדוק עם רו״ח — תלוי בהכנסה ובנקודות זיכוי","color":"666666","size":9.0}],[{"v":"ימי עבודה בשבוע"},{"v":"5","fill":"FFF9C4","color":"0000CC"}],[{"v":"שעות עבודה ביום"},{"v":"8.0","fill":"FFF9C4","color":"0000CC"}],[{"v":"כמה מהשעות אפשר לחייב לקוח (%)"},{"v":"60%","fill":"FFF9C4","color":"0000CC"},{"v":"שיווק, מיילים, הנהלת חשבונות — לא מחויבים","color":"666666","size":9.0}],[{"v":"שבועות חופש, חגים ומחלה בשנה"},{"v":"6","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"התוצאה","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"הכנסה שצריך לגבות בחודש (לפני מע״מ) (₪)"},{"v":"23,929 ₪"}],[{"v":"שעות לחיוב בחודש (ממוצע)"},{"v":"92.0"}],[{"v":"מחיר מינימלי לשעה (₪)","fill":"E8F1EE","bold":true},{"v":"260 ₪","fill":"E8F1EE","bold":true}],[{"v":"מחיר מינימלי ליום עבודה (₪)"},{"v":"1,248 ₪"}],[{"v":"לשעה כולל מע״מ (18%) (₪)"},{"v":"307 ₪"}],[],[{"v":"תמחור פרויקט","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"כמה שעות הפרויקט ייקח (הערכה)"},{"v":"20","fill":"FFF9C4","color":"0000CC"}],[{"v":"מרווח ביטחון לתיקונים והפתעות (%)"},{"v":"20%","fill":"FFF9C4","color":"0000CC"}],[{"v":"מחיר מומלץ לפרויקט (לפני מע״מ) (₪)","fill":"E8F1EE","bold":true},{"v":"6,250 ₪","fill":"E8F1EE","bold":true}]]},
  "xlsx-loan": {"type":"xlsx","sheetName":"הלוואה","rows":[[{"v":"מחשבון הלוואה ולוח סילוקין","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"ממלאים סכום, ריבית שנתית ותקופה — מקבלים החזר חודשי, כמה ריבית תשלמו בסך הכול ולוח סילוקין מלא (שפיצר: החזר חודשי קבוע).","color":"666666","size":10.0,"span":7}],[],[{"v":"סכום ההלוואה (₪)","bold":true,"span":2},{"v":"100,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"החזר חודשי","fill":"E8F1EE","bold":true},{"v":"1,933.28 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"ריבית שנתית","bold":true,"span":2},{"v":"6%","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"מספר תשלומים","fill":"E8F1EE","bold":true},{"v":"60","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"תקופה (שנים)","bold":true,"span":2},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"סה״כ תשלמו","fill":"E8F1EE","bold":true},{"v":"115,997 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"תשלום ראשון","bold":true,"span":2},{"v":"01/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"מתוכו ריבית","fill":"E8F1EE","bold":true},{"v":"15,997 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"תשלום","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תאריך","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה בתחילת החודש (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"החזר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ריבית (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"קרן (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה בסוף החודש (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"1"},{"v":"01/02/2027"},{"v":"100,000.00 ₪"},{"v":"1,933.28 ₪"},{"v":"500.00 ₪"},{"v":"1,433.28 ₪"},{"v":"98,566.72 ₪"}],[{"v":"2"},{"v":"01/03/2027"},{"v":"98,566.72 ₪"},{"v":"1,933.28 ₪"},{"v":"492.83 ₪"},{"v":"1,440.45 ₪"},{"v":"97,126.27 ₪"}],[{"v":"3"},{"v":"01/04/2027"},{"v":"97,126.27 ₪"},{"v":"1,933.28 ₪"},{"v":"485.63 ₪"},{"v":"1,447.65 ₪"},{"v":"95,678.62 ₪"}],[{"v":"4"},{"v":"01/05/2027"},{"v":"95,678.62 ₪"},{"v":"1,933.28 ₪"},{"v":"478.39 ₪"},{"v":"1,454.89 ₪"},{"v":"94,223.74 ₪"}],[{"v":"5"},{"v":"01/06/2027"},{"v":"94,223.74 ₪"},{"v":"1,933.28 ₪"},{"v":"471.12 ₪"},{"v":"1,462.16 ₪"},{"v":"92,761.58 ₪"}],[{"v":"6"},{"v":"01/07/2027"},{"v":"92,761.58 ₪"},{"v":"1,933.28 ₪"},{"v":"463.81 ₪"},{"v":"1,469.47 ₪"},{"v":"91,292.10 ₪"}],[{"v":"7"},{"v":"01/08/2027"},{"v":"91,292.10 ₪"},{"v":"1,933.28 ₪"},{"v":"456.46 ₪"},{"v":"1,476.82 ₪"},{"v":"89,815.28 ₪"}],[{"v":"8"},{"v":"01/09/2027"},{"v":"89,815.28 ₪"},{"v":"1,933.28 ₪"},{"v":"449.08 ₪"},{"v":"1,484.20 ₪"},{"v":"88,331.08 ₪"}],[{"v":"9"},{"v":"01/10/2027"},{"v":"88,331.08 ₪"},{"v":"1,933.28 ₪"},{"v":"441.66 ₪"},{"v":"1,491.62 ₪"},{"v":"86,839.46 ₪"}],[{"v":"10"},{"v":"01/11/2027"},{"v":"86,839.46 ₪"},{"v":"1,933.28 ₪"},{"v":"434.20 ₪"},{"v":"1,499.08 ₪"},{"v":"85,340.37 ₪"}],[{"v":"11"},{"v":"01/12/2027"},{"v":"85,340.37 ₪"},{"v":"1,933.28 ₪"},{"v":"426.70 ₪"},{"v":"1,506.58 ₪"},{"v":"83,833.79 ₪"}],[{"v":"12"},{"v":"01/01/2028"},{"v":"83,833.79 ₪"},{"v":"1,933.28 ₪"},{"v":"419.17 ₪"},{"v":"1,514.11 ₪"},{"v":"82,319.68 ₪"}],[{"v":"13"},{"v":"01/02/2028"},{"v":"82,319.68 ₪"},{"v":"1,933.28 ₪"},{"v":"411.60 ₪"},{"v":"1,521.68 ₪"},{"v":"80,798.00 ₪"}]]},
  "xlsx-income-expenses@en": {"type":"xlsx","sheetName":"Journal","rows":[[{"v":"Income & expenses journal","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"One line per transaction: date, income or expense, category and the amount paid (including tax). Set \"Includes tax?\" to No when there is no tax on it. Totals are on the Monthly summary sheet.","color":"666666","size":10.0,"span":10}],[],[{"v":"Income this year (net)","fill":"E8F1EE","bold":true,"span":2},{"v":"17,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Expenses this year (net)","fill":"E8F1EE","bold":true},{"v":"7,159","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Profit","fill":"E8F1EE","bold":true},{"v":"9,841","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"Date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Type","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Description","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Client / supplier","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Invoice no.","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Amount paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Includes tax?","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Tax","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Net amount","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Year","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"02/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"Services","fill":"FFF9C4","color":"0000CC"},{"v":"Monthly retainer","fill":"FFF9C4","color":"0000CC"},{"v":"Client A","fill":"FFF9C4","color":"0000CC"},{"v":"1001","fill":"FFF9C4","color":"0000CC"},{"v":"4,720.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"720.00"},{"v":"4,000.00"},{"v":"2,027"}],[{"v":"03/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"Studio rent","fill":"FFF9C4","color":"0000CC"},{"v":"Landlord","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"3,000.00","fill":"FFF9C4","color":"0000CC"},{"v":"No","fill":"FFF9C4","color":"0000CC"},{"v":"0.00"},{"v":"3,000.00"},{"v":"2,027"}],[{"v":"09/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"Sales","fill":"FFF9C4","color":"0000CC"},{"v":"Website order","fill":"FFF9C4","color":"0000CC"},{"v":"Client B","fill":"FFF9C4","color":"0000CC"},{"v":"1002","fill":"FFF9C4","color":"0000CC"},{"v":"1,180.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"180.00"},{"v":"1,000.00"},{"v":"2,027"}],[{"v":"12/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"Marketing","fill":"FFF9C4","color":"0000CC"},{"v":"Paid campaign","fill":"FFF9C4","color":"0000CC"},{"v":"Meta","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"590.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"90.00"},{"v":"500.00"},{"v":"2,027"}],[{"v":"20/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"Software & subscriptions","fill":"FFF9C4","color":"0000CC"},{"v":"Monthly subscription","fill":"FFF9C4","color":"0000CC"},{"v":"Canva","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"59.00","fill":"FFF9C4","color":"0000CC"},{"v":"No","fill":"FFF9C4","color":"0000CC"},{"v":"0.00"},{"v":"59.00"},{"v":"2,027"}],[{"v":"28/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"Services","fill":"FFF9C4","color":"0000CC"},{"v":"Design project","fill":"FFF9C4","color":"0000CC"},{"v":"Client C","fill":"FFF9C4","color":"0000CC"},{"v":"1003","fill":"FFF9C4","color":"0000CC"},{"v":"7,080.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"1,080.00"},{"v":"6,000.00"},{"v":"2,027"}],[{"v":"02/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"Services","fill":"FFF9C4","color":"0000CC"},{"v":"Monthly retainer","fill":"FFF9C4","color":"0000CC"},{"v":"Client A","fill":"FFF9C4","color":"0000CC"},{"v":"1004","fill":"FFF9C4","color":"0000CC"},{"v":"4,720.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"720.00"},{"v":"4,000.00"},{"v":"2,027"}],[{"v":"03/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"Studio rent","fill":"FFF9C4","color":"0000CC"},{"v":"Landlord","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"3,000.00","fill":"FFF9C4","color":"0000CC"},{"v":"No","fill":"FFF9C4","color":"0000CC"},{"v":"0.00"},{"v":"3,000.00"},{"v":"2,027"}],[{"v":"15/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"Professional services","fill":"FFF9C4","color":"0000CC"},{"v":"Accountant","fill":"FFF9C4","color":"0000CC"},{"v":"Accounting firm","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"708.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"108.00"},{"v":"600.00"},{"v":"2,027"}],[{"v":"21/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"Sales","fill":"FFF9C4","color":"0000CC"},{"v":"Website order","fill":"FFF9C4","color":"0000CC"},{"v":"Client D","fill":"FFF9C4","color":"0000CC"},{"v":"1005","fill":"FFF9C4","color":"0000CC"},{"v":"2,360.00","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"360.00"},{"v":"2,000.00"},{"v":"2,027"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-budget@en": {"type":"xlsx","sheetName":"Monthly budget","rows":[[{"v":"Monthly household budget","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"Fill in only the yellow cells: category, type (income/expense), planned and actual. The summary and chart update by themselves.","color":"666666","size":10.0,"span":7}],[],[{"v":"Month:","bold":true},{"v":"January 2027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Total income (actual)","fill":"E8F1EE","bold":true},{"v":"13,800","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Planned income","fill":"E8F1EE","bold":true},{"v":"13,300","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Total expenses (actual)","fill":"E8F1EE","bold":true},{"v":"13,410","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Planned expenses","fill":"E8F1EE","bold":true},{"v":"13,250","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Left at month end","fill":"E8F1EE","bold":true},{"v":"390","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Categories over budget","fill":"E8F1EE","bold":true},{"v":"3","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Type","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Planned","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Actual","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Difference","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% of plan","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Salary","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"OK"}],[{"v":"Extra income","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"1,000","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"500"},{"v":"150%"},{"v":"OK"}],[{"v":"Benefits","fill":"FFF9C4","color":"0000CC"},{"v":"Income","fill":"FFF9C4","color":"0000CC"},{"v":"300","fill":"FFF9C4","color":"0000CC"},{"v":"300","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"OK"}],[{"v":"Rent / mortgage","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"On budget"}],[{"v":"Utilities & council tax","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"900","fill":"FFF9C4","color":"0000CC"},{"v":"950","fill":"FFF9C4","color":"0000CC"},{"v":"50"},{"v":"106%"},{"v":"Over"}],[{"v":"Groceries","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"2,200","fill":"FFF9C4","color":"0000CC"},{"v":"2,450","fill":"FFF9C4","color":"0000CC"},{"v":"250"},{"v":"111%"},{"v":"Over"}],[{"v":"Transport & fuel","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"720","fill":"FFF9C4","color":"0000CC"},{"v":"-80"},{"v":"90%"},{"v":"On budget"}],[{"v":"Insurance","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"600","fill":"FFF9C4","color":"0000CC"},{"v":"600","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"On budget"}],[{"v":"Phone & internet","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"250","fill":"FFF9C4","color":"0000CC"},{"v":"240","fill":"FFF9C4","color":"0000CC"},{"v":"-10"},{"v":"96%"},{"v":"On budget"}],[{"v":"Education & classes","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"900","fill":"FFF9C4","color":"0000CC"},{"v":"900","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"On budget"}],[{"v":"Health","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"200","fill":"FFF9C4","color":"0000CC"},{"v":"120","fill":"FFF9C4","color":"0000CC"},{"v":"-80"},{"v":"60%"},{"v":"On budget"}],[{"v":"Leisure","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"900","fill":"FFF9C4","color":"0000CC"},{"v":"200"},{"v":"129%"},{"v":"Over"}],[{"v":"Clothing","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"300","fill":"FFF9C4","color":"0000CC"},{"v":"180","fill":"FFF9C4","color":"0000CC"},{"v":"-120"},{"v":"60%"},{"v":"On budget"}],[{"v":"Savings","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"100%"},{"v":"On budget"}],[{"v":"Other","fill":"FFF9C4","color":"0000CC"},{"v":"Expense","fill":"FFF9C4","color":"0000CC"},{"v":"400","fill":"FFF9C4","color":"0000CC"},{"v":"350","fill":"FFF9C4","color":"0000CC"},{"v":"-50"},{"v":"88%"},{"v":"On budget"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-invoice@en": {"type":"xlsx","sheetName":"Invoice","rows":[[{"v":"Invoice","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":4}],[{"v":"Fill in the yellow cells — totals, discount, tax and the amount due are calculated for you. No tax? Set the rate to 0%.","color":"666666","size":10.0,"span":4}],[],[{"v":"Document:","bold":true},{"v":"Invoice","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Business name:","bold":true},{"v":"Your business name","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Business / tax ID:","bold":true},{"v":"000000000","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Address:","bold":true},{"v":"Street, city","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Phone / email:","bold":true},{"v":"050-0000000 | info@business.co.il","fill":"FFF9C4","color":"0000CC","span":3}],[],[{"v":"Bill to:","bold":true},{"v":"Client name","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Client ID:","bold":true},{"v":"","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Invoice no.:","bold":true},{"v":"2027-001","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Date:","bold":true},{"v":"01/01/2027","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Due date:","bold":true},{"v":"31/01/2027","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Reference:","bold":true},{"v":"","fill":"FFF9C4","color":"0000CC","span":3}],[],[{"v":"Description","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Qty","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Unit price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Line total","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Sample service / product","fill":"FFF9C4","color":"0000CC"},{"v":"1.0","fill":"FFF9C4","color":"0000CC"},{"v":"500.00","fill":"FFF9C4","color":"0000CC"},{"v":"500.00"}],[{"v":"Another sample line","fill":"FFF9C4","color":"0000CC"},{"v":"2.0","fill":"FFF9C4","color":"0000CC"},{"v":"250.00","fill":"FFF9C4","color":"0000CC"},{"v":"500.00"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-expense@en": {"type":"xlsx","sheetName":"Expenses","rows":[[{"v":"Business expense tracker","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":8}],[{"v":"One expense per row (yellow cells). Category and payment method come from lists you can edit on the Lists sheet. Monthly totals per category are on the Summary sheet.","color":"666666","size":10.0,"span":8}],[],[{"v":"Total expenses","fill":"E8F1EE","bold":true},{"v":"9,175","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Number of expenses","fill":"E8F1EE","bold":true},{"v":"9","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"This month","fill":"E8F1EE","bold":true},{"v":"0","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Average expense","fill":"E8F1EE","bold":true},{"v":"1,019","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Not yet paid","fill":"E8F1EE","bold":true},{"v":"680","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[{"v":"Date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Supplier","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Description","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Amount","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Payment method","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Paid?","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"01/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"Landlord","fill":"FFF9C4","color":"0000CC"},{"v":"Office rent","fill":"FFF9C4","color":"0000CC"},{"v":"3,200","fill":"FFF9C4","color":"0000CC"},{"v":"Bank transfer","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Equipment","fill":"FFF9C4","color":"0000CC"},{"v":"Office supplier","fill":"FFF9C4","color":"0000CC"},{"v":"Paper and toner","fill":"FFF9C4","color":"0000CC"},{"v":"340","fill":"FFF9C4","color":"0000CC"},{"v":"Card","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"05/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Marketing","fill":"FFF9C4","color":"0000CC"},{"v":"Meta","fill":"FFF9C4","color":"0000CC"},{"v":"Monthly campaign","fill":"FFF9C4","color":"0000CC"},{"v":"600","fill":"FFF9C4","color":"0000CC"},{"v":"Card","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"08/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Software & subscriptions","fill":"FFF9C4","color":"0000CC"},{"v":"Google Workspace","fill":"FFF9C4","color":"0000CC"},{"v":"Email and cloud","fill":"FFF9C4","color":"0000CC"},{"v":"95","fill":"FFF9C4","color":"0000CC"},{"v":"Direct debit","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"10/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Shipping","fill":"FFF9C4","color":"0000CC"},{"v":"Courier","fill":"FFF9C4","color":"0000CC"},{"v":"Deliveries to clients","fill":"FFF9C4","color":"0000CC"},{"v":"260","fill":"FFF9C4","color":"0000CC"},{"v":"Card","fill":"FFF9C4","color":"0000CC"},{"v":"No","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"18/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Marketing","fill":"FFF9C4","color":"0000CC"},{"v":"Print shop","fill":"FFF9C4","color":"0000CC"},{"v":"Business cards","fill":"FFF9C4","color":"0000CC"},{"v":"420","fill":"FFF9C4","color":"0000CC"},{"v":"Bank transfer","fill":"FFF9C4","color":"0000CC"},{"v":"No","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"25/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Professional services","fill":"FFF9C4","color":"0000CC"},{"v":"Accountant","fill":"FFF9C4","color":"0000CC"},{"v":"Monthly bookkeeping","fill":"FFF9C4","color":"0000CC"},{"v":"750","fill":"FFF9C4","color":"0000CC"},{"v":"Bank transfer","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"01/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"Landlord","fill":"FFF9C4","color":"0000CC"},{"v":"Office rent","fill":"FFF9C4","color":"0000CC"},{"v":"3,200","fill":"FFF9C4","color":"0000CC"},{"v":"Bank transfer","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"07/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Car & travel","fill":"FFF9C4","color":"0000CC"},{"v":"Fuel station","fill":"FFF9C4","color":"0000CC"},{"v":"Client visits","fill":"FFF9C4","color":"0000CC"},{"v":"310","fill":"FFF9C4","color":"0000CC"},{"v":"Card","fill":"FFF9C4","color":"0000CC"},{"v":"Yes","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-clients@en": {"type":"xlsx","sheetName":"Clients","rows":[[{"v":"Clients & leads tracker","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"One client or lead per row. Pick a status and source from the list and set a follow-up date — rows whose follow-up is due turn red, so no lead is forgotten.","color":"666666","size":10.0,"span":9}],[],[{"v":"Total in list","fill":"E8F1EE","bold":true},{"v":"5","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Count","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Value","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Follow-ups due","fill":"E8F1EE","bold":true},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"New lead"},{"v":"1"},{"v":"1,200"}],[{"v":"Open pipeline value","fill":"E8F1EE","bold":true},{"v":"6,700","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"In progress"},{"v":"1"},{"v":"2,000"}],[{"v":""},{"v":""},{"v":""},{"v":"Quote sent"},{"v":"1"},{"v":"3,500"}],[{"v":""},{"v":""},{"v":""},{"v":"Active client"},{"v":"1"},{"v":"4,800"}],[{"v":""},{"v":""},{"v":""},{"v":"Not relevant"},{"v":"1"},{"v":"0"}],[],[],[],[{"v":"Name","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Phone","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Email","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Source","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"First contact","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Next follow-up","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Deal value","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Dana Cohen","fill":"FFF9C4","color":"0000CC"},{"v":"050-1234567","fill":"FFF9C4","color":"0000CC"},{"v":"dana@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"Referral","fill":"FFF9C4","color":"0000CC"},{"v":"Active client","fill":"FFF9C4","color":"0000CC"},{"v":"03/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"4,800","fill":"FFF9C4","color":"0000CC"},{"v":"Wants the full package","fill":"FFF9C4","color":"0000CC"}],[{"v":"Yossi Levi","fill":"FFF9C4","color":"0000CC"},{"v":"052-9876543","fill":"FFF9C4","color":"0000CC"},{"v":"yossi@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"Website","fill":"FFF9C4","color":"0000CC"},{"v":"Quote sent","fill":"FFF9C4","color":"0000CC"},{"v":"07/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"3,500","fill":"FFF9C4","color":"0000CC"},{"v":"Follow up on the quote","fill":"FFF9C4","color":"0000CC"}],[{"v":"Shira Abraham","fill":"FFF9C4","color":"0000CC"},{"v":"054-5551234","fill":"FFF9C4","color":"0000CC"},{"v":"shira@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"Instagram","fill":"FFF9C4","color":"0000CC"},{"v":"New lead","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"15/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"1,200","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Uri Mizrahi","fill":"FFF9C4","color":"0000CC"},{"v":"053-1112223","fill":"FFF9C4","color":"0000CC"},{"v":"uri@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"Google","fill":"FFF9C4","color":"0000CC"},{"v":"In progress","fill":"FFF9C4","color":"0000CC"},{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"2,000","fill":"FFF9C4","color":"0000CC"},{"v":"Sent samples","fill":"FFF9C4","color":"0000CC"}],[{"v":"Michal Dagan","fill":"FFF9C4","color":"0000CC"},{"v":"050-7778889","fill":"FFF9C4","color":"0000CC"},{"v":"michal@example.com","fill":"FFF9C4","color":"0000CC"},{"v":"Referral","fill":"FFF9C4","color":"0000CC"},{"v":"Not relevant","fill":"FFF9C4","color":"0000CC"},{"v":"14/08/2026","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"Chose another supplier","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-cashflow@en": {"type":"xlsx","sheetName":"Cash flow","rows":[[{"v":"12-month cash-flow forecast","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"Enter the opening balance, the first month, and expected income and spending for each month (yellow cells). Each closing balance rolls into the next month; a month that goes negative turns red.","color":"666666","size":10.0,"span":14}],[],[{"v":"First month:","bold":true},{"v":"01/2027","fill":"FFF9C4","color":"0000CC"}],[{"v":"Opening balance:","bold":true},{"v":"20,000","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Line","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"01/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"02/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"03/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"04/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"05/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"06/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"07/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"08/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"09/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"10/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"11/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"12/2027","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Total","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Opening balance","fill":"E8F1EE","bold":true},{"v":"20,000","fill":"E8F1EE","bold":true},{"v":"21,500","fill":"E8F1EE","bold":true},{"v":"23,500","fill":"E8F1EE","bold":true},{"v":"29,000","fill":"E8F1EE","bold":true},{"v":"30,500","fill":"E8F1EE","bold":true},{"v":"41,000","fill":"E8F1EE","bold":true},{"v":"42,500","fill":"E8F1EE","bold":true},{"v":"45,000","fill":"E8F1EE","bold":true},{"v":"50,000","fill":"E8F1EE","bold":true},{"v":"50,500","fill":"E8F1EE","bold":true},{"v":"57,000","fill":"E8F1EE","bold":true},{"v":"64,500","fill":"E8F1EE","bold":true}],[{"v":"Money in","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Sales / clients","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"22,000","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"26,000","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"19,000","fill":"FFF9C4","color":"0000CC"},{"v":"21,000","fill":"FFF9C4","color":"0000CC"},{"v":"17,000","fill":"FFF9C4","color":"0000CC"},{"v":"23,000","fill":"FFF9C4","color":"0000CC"},{"v":"24,000","fill":"FFF9C4","color":"0000CC"},{"v":"28,000","fill":"FFF9C4","color":"0000CC"},{"v":"252,000","bold":true}],[{"v":"Other income","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"500","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"1,000","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"500","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"3,500","bold":true}],[{"v":"Loans / investment","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","bold":true}],[{"v":"Total in","fill":"E8F1EE","bold":true},{"v":"18,000","fill":"E8F1EE","bold":true},{"v":"18,500","fill":"E8F1EE","bold":true},{"v":"22,000","fill":"E8F1EE","bold":true},{"v":"18,000","fill":"E8F1EE","bold":true},{"v":"27,000","fill":"E8F1EE","bold":true},{"v":"18,000","fill":"E8F1EE","bold":true},{"v":"19,000","fill":"E8F1EE","bold":true},{"v":"21,500","fill":"E8F1EE","bold":true},{"v":"17,000","fill":"E8F1EE","bold":true},{"v":"23,000","fill":"E8F1EE","bold":true},{"v":"24,000","fill":"E8F1EE","bold":true},{"v":"29,500","fill":"E8F1EE","bold":true},{"v":"255,500","fill":"E8F1EE","bold":true}],[],[{"v":"Money out","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"54,000","bold":true}],[{"v":"Salaries","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"72,000","bold":true}],[{"v":"Suppliers & materials","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"36,000","bold":true}],[{"v":"Marketing","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"800","fill":"FFF9C4","color":"0000CC"},{"v":"9,600","bold":true}],[{"v":"Taxes","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","bold":true}],[{"v":"Loan repayments","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","bold":true}],[{"v":"Other","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"700","fill":"FFF9C4","color":"0000CC"},{"v":"8,400","bold":true}],[{"v":"Total out","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"16,500","fill":"E8F1EE","bold":true},{"v":"198,000","fill":"E8F1EE","bold":true}],[],[{"v":"Net cash flow","bold":true},{"v":"1,500","bold":true},{"v":"2,000","bold":true},{"v":"5,500","bold":true},{"v":"1,500","bold":true},{"v":"10,500","bold":true},{"v":"1,500","bold":true},{"v":"2,500","bold":true},{"v":"5,000","bold":true},{"v":"500","bold":true},{"v":"6,500","bold":true},{"v":"7,500","bold":true},{"v":"13,000","bold":true},{"v":"57,500","bold":true}],[{"v":"Closing balance","fill":"E8F1EE","bold":true},{"v":"21,500","fill":"E8F1EE","bold":true},{"v":"23,500","fill":"E8F1EE","bold":true},{"v":"29,000","fill":"E8F1EE","bold":true},{"v":"30,500","fill":"E8F1EE","bold":true},{"v":"41,000","fill":"E8F1EE","bold":true},{"v":"42,500","fill":"E8F1EE","bold":true},{"v":"45,000","fill":"E8F1EE","bold":true},{"v":"50,000","fill":"E8F1EE","bold":true},{"v":"50,500","fill":"E8F1EE","bold":true},{"v":"57,000","fill":"E8F1EE","bold":true},{"v":"64,500","fill":"E8F1EE","bold":true},{"v":"77,500","fill":"E8F1EE","bold":true},{"v":"77,500","fill":"E8F1EE","bold":true}],[],[{"v":"Lowest balance","fill":"E8F1EE","bold":true},{"v":"21,500","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Months below zero","fill":"E8F1EE","bold":true},{"v":"0","fill":"E8F1EE","bold":true,"size":12.0}]]},
  "xlsx-inventory@en": {"type":"xlsx","sheetName":"Inventory","rows":[[{"v":"Inventory tracker","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"For each item: quantity, reorder point, cost and price. Stock value, suggested order quantity and status are calculated — items out of stock or due for reorder are highlighted.","color":"666666","size":10.0,"span":12}],[],[{"v":"Stock value (cost)","fill":"E8F1EE","bold":true},{"v":"6,040","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Stock value (retail)","fill":"E8F1EE","bold":true},{"v":"14,012","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Items to reorder","fill":"E8F1EE","bold":true},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Out of stock","fill":"E8F1EE","bold":true},{"v":"1","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"Item","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"SKU","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Supplier","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"In stock","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Reorder point","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Suggested order","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Unit cost","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Unit price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Value at cost","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Value at price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"White cotton T-shirt","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1001","fill":"FFF9C4","color":"0000CC"},{"v":"Clothing","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier A","fill":"FFF9C4","color":"0000CC"},{"v":"42","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"35.00","fill":"FFF9C4","color":"0000CC"},{"v":"89.00","fill":"FFF9C4","color":"0000CC"},{"v":"1,470"},{"v":"3,738"},{"v":"OK"}],[{"v":"Black cotton T-shirt","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1002","fill":"FFF9C4","color":"0000CC"},{"v":"Clothing","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier A","fill":"FFF9C4","color":"0000CC"},{"v":"8","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"22"},{"v":"35.00","fill":"FFF9C4","color":"0000CC"},{"v":"89.00","fill":"FFF9C4","color":"0000CC"},{"v":"280"},{"v":"712"},{"v":"Reorder"}],[{"v":"Jeans","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1003","fill":"FFF9C4","color":"0000CC"},{"v":"Clothing","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier B","fill":"FFF9C4","color":"0000CC"},{"v":"25","fill":"FFF9C4","color":"0000CC"},{"v":"10","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"90.00","fill":"FFF9C4","color":"0000CC"},{"v":"199.00","fill":"FFF9C4","color":"0000CC"},{"v":"2,250"},{"v":"4,975"},{"v":"OK"}],[{"v":"Sneakers","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1004","fill":"FFF9C4","color":"0000CC"},{"v":"Footwear","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier C","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"8","fill":"FFF9C4","color":"0000CC"},{"v":"16"},{"v":"140.00","fill":"FFF9C4","color":"0000CC"},{"v":"329.00","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"0"},{"v":"Out of stock"}],[{"v":"Cap","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1005","fill":"FFF9C4","color":"0000CC"},{"v":"Accessories","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier B","fill":"FFF9C4","color":"0000CC"},{"v":"60","fill":"FFF9C4","color":"0000CC"},{"v":"20","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"25.00","fill":"FFF9C4","color":"0000CC"},{"v":"59.00","fill":"FFF9C4","color":"0000CC"},{"v":"1,500"},{"v":"3,540"},{"v":"OK"}],[{"v":"Backpack","fill":"FFF9C4","color":"0000CC"},{"v":"SKU-1006","fill":"FFF9C4","color":"0000CC"},{"v":"Accessories","fill":"FFF9C4","color":"0000CC"},{"v":"Supplier C","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"7"},{"v":"180.00","fill":"FFF9C4","color":"0000CC"},{"v":"349.00","fill":"FFF9C4","color":"0000CC"},{"v":"540"},{"v":"1,047"},{"v":"Reorder"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-timeline@en": {"type":"xlsx","sheetName":"Timeline","rows":[[{"v":"Project timeline — with a Gantt chart","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"For each task: owner, start and end dates and % complete. Duration, status and the chart bars update by themselves; the orange column is the current week.","color":"666666","size":10.0,"span":7}],[],[{"v":"Overall progress","fill":"E8F1EE","bold":true},{"v":"34%","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Chart starts:","bold":true},{"v":"27/09/2026","span":2}],[{"v":"Late tasks","fill":"E8F1EE","bold":true},{"v":"0","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Planned finish","fill":"E8F1EE","bold":true},{"v":"14/11/2026","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"Task","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Owner","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Start","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"End","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Days","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% done","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Gather requirements","fill":"FFF9C4","color":"0000CC"},{"v":"Dana","fill":"FFF9C4","color":"0000CC"},{"v":"27/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"02/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"6"},{"v":"100%","fill":"FFF9C4","color":"0000CC"},{"v":"Done"}],[{"v":"Spec & design","fill":"FFF9C4","color":"0000CC"},{"v":"Yossi","fill":"FFF9C4","color":"0000CC"},{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11"},{"v":"80%","fill":"FFF9C4","color":"0000CC"},{"v":"In progress"}],[{"v":"Build — phase 1","fill":"FFF9C4","color":"0000CC"},{"v":"Dana","fill":"FFF9C4","color":"0000CC"},{"v":"11/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"01/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"22"},{"v":"30%","fill":"FFF9C4","color":"0000CC"},{"v":"In progress"}],[{"v":"Content & photos","fill":"FFF9C4","color":"0000CC"},{"v":"Rotem","fill":"FFF9C4","color":"0000CC"},{"v":"17/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"27/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"Not started"}],[{"v":"Testing","fill":"FFF9C4","color":"0000CC"},{"v":"Rotem","fill":"FFF9C4","color":"0000CC"},{"v":"02/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"11/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"10"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"Not started"}],[{"v":"Launch","fill":"FFF9C4","color":"0000CC"},{"v":"Yossi","fill":"FFF9C4","color":"0000CC"},{"v":"12/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"14/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"3"},{"v":"0%","fill":"FFF9C4","color":"0000CC"},{"v":"Not started"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-pnl@en": {"type":"xlsx","sheetName":"Profit & loss","rows":[[{"v":"Profit & loss — by month for a year","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"Enter revenue, cost of sales and expenses for each month (yellow cells). Gross profit, net profit and margins are calculated, with a yearly total.","color":"666666","size":10.0,"span":14}],[],[{"v":"Year:","bold":true},{"v":"2,027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Line","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"January","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"February","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"March","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"April","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"May","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"June","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"July","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"August","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"September","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"October","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"November","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"December","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Total","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Revenue","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Product sales","fill":"FFF9C4","color":"0000CC"},{"v":"42,000","fill":"FFF9C4","color":"0000CC"},{"v":"43,260","fill":"FFF9C4","color":"0000CC"},{"v":"44,520","fill":"FFF9C4","color":"0000CC"},{"v":"45,780","fill":"FFF9C4","color":"0000CC"},{"v":"47,040","fill":"FFF9C4","color":"0000CC"},{"v":"48,300","fill":"FFF9C4","color":"0000CC"},{"v":"49,560","fill":"FFF9C4","color":"0000CC"},{"v":"50,820","fill":"FFF9C4","color":"0000CC"},{"v":"52,080","fill":"FFF9C4","color":"0000CC"},{"v":"53,340","fill":"FFF9C4","color":"0000CC"},{"v":"54,600","fill":"FFF9C4","color":"0000CC"},{"v":"55,860","fill":"FFF9C4","color":"0000CC"},{"v":"587,160","bold":true}],[{"v":"Services","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"18,540","fill":"FFF9C4","color":"0000CC"},{"v":"19,080","fill":"FFF9C4","color":"0000CC"},{"v":"19,620","fill":"FFF9C4","color":"0000CC"},{"v":"20,160","fill":"FFF9C4","color":"0000CC"},{"v":"20,700","fill":"FFF9C4","color":"0000CC"},{"v":"21,240","fill":"FFF9C4","color":"0000CC"},{"v":"21,780","fill":"FFF9C4","color":"0000CC"},{"v":"22,320","fill":"FFF9C4","color":"0000CC"},{"v":"22,860","fill":"FFF9C4","color":"0000CC"},{"v":"23,400","fill":"FFF9C4","color":"0000CC"},{"v":"23,940","fill":"FFF9C4","color":"0000CC"},{"v":"251,640","bold":true}],[{"v":"Other revenue","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"0","bold":true}],[{"v":"Total revenue","fill":"E8F1EE","bold":true},{"v":"60,000","fill":"E8F1EE","bold":true},{"v":"61,800","fill":"E8F1EE","bold":true},{"v":"63,600","fill":"E8F1EE","bold":true},{"v":"65,400","fill":"E8F1EE","bold":true},{"v":"67,200","fill":"E8F1EE","bold":true},{"v":"69,000","fill":"E8F1EE","bold":true},{"v":"70,800","fill":"E8F1EE","bold":true},{"v":"72,600","fill":"E8F1EE","bold":true},{"v":"74,400","fill":"E8F1EE","bold":true},{"v":"76,200","fill":"E8F1EE","bold":true},{"v":"78,000","fill":"E8F1EE","bold":true},{"v":"79,800","fill":"E8F1EE","bold":true},{"v":"838,800","fill":"E8F1EE","bold":true}],[],[{"v":"Cost of sales","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Materials / purchases","fill":"FFF9C4","color":"0000CC"},{"v":"9,000","fill":"FFF9C4","color":"0000CC"},{"v":"9,270","fill":"FFF9C4","color":"0000CC"},{"v":"9,540","fill":"FFF9C4","color":"0000CC"},{"v":"9,810","fill":"FFF9C4","color":"0000CC"},{"v":"10,080","fill":"FFF9C4","color":"0000CC"},{"v":"10,350","fill":"FFF9C4","color":"0000CC"},{"v":"10,620","fill":"FFF9C4","color":"0000CC"},{"v":"10,890","fill":"FFF9C4","color":"0000CC"},{"v":"11,160","fill":"FFF9C4","color":"0000CC"},{"v":"11,430","fill":"FFF9C4","color":"0000CC"},{"v":"11,700","fill":"FFF9C4","color":"0000CC"},{"v":"11,970","fill":"FFF9C4","color":"0000CC"},{"v":"125,820","bold":true}],[{"v":"Direct labour","fill":"FFF9C4","color":"0000CC"},{"v":"7,000","fill":"FFF9C4","color":"0000CC"},{"v":"7,210","fill":"FFF9C4","color":"0000CC"},{"v":"7,420","fill":"FFF9C4","color":"0000CC"},{"v":"7,630","fill":"FFF9C4","color":"0000CC"},{"v":"7,840","fill":"FFF9C4","color":"0000CC"},{"v":"8,050","fill":"FFF9C4","color":"0000CC"},{"v":"8,260","fill":"FFF9C4","color":"0000CC"},{"v":"8,470","fill":"FFF9C4","color":"0000CC"},{"v":"8,680","fill":"FFF9C4","color":"0000CC"},{"v":"8,890","fill":"FFF9C4","color":"0000CC"},{"v":"9,100","fill":"FFF9C4","color":"0000CC"},{"v":"9,310","fill":"FFF9C4","color":"0000CC"},{"v":"97,860","bold":true}],[{"v":"Shipping","fill":"FFF9C4","color":"0000CC"},{"v":"1,200","fill":"FFF9C4","color":"0000CC"},{"v":"1,236","fill":"FFF9C4","color":"0000CC"},{"v":"1,272","fill":"FFF9C4","color":"0000CC"},{"v":"1,308","fill":"FFF9C4","color":"0000CC"},{"v":"1,344","fill":"FFF9C4","color":"0000CC"},{"v":"1,380","fill":"FFF9C4","color":"0000CC"},{"v":"1,416","fill":"FFF9C4","color":"0000CC"},{"v":"1,452","fill":"FFF9C4","color":"0000CC"},{"v":"1,488","fill":"FFF9C4","color":"0000CC"},{"v":"1,524","fill":"FFF9C4","color":"0000CC"},{"v":"1,560","fill":"FFF9C4","color":"0000CC"},{"v":"1,596","fill":"FFF9C4","color":"0000CC"},{"v":"16,776","bold":true}],[{"v":"Total cost of sales","fill":"E8F1EE","bold":true},{"v":"17,200","fill":"E8F1EE","bold":true},{"v":"17,716","fill":"E8F1EE","bold":true},{"v":"18,232","fill":"E8F1EE","bold":true},{"v":"18,748","fill":"E8F1EE","bold":true},{"v":"19,264","fill":"E8F1EE","bold":true},{"v":"19,780","fill":"E8F1EE","bold":true},{"v":"20,296","fill":"E8F1EE","bold":true},{"v":"20,812","fill":"E8F1EE","bold":true},{"v":"21,328","fill":"E8F1EE","bold":true},{"v":"21,844","fill":"E8F1EE","bold":true},{"v":"22,360","fill":"E8F1EE","bold":true},{"v":"22,876","fill":"E8F1EE","bold":true},{"v":"240,456","fill":"E8F1EE","bold":true}],[{"v":"Gross profit","bold":true},{"v":"42,800","bold":true},{"v":"44,084","bold":true},{"v":"45,368","bold":true},{"v":"46,652","bold":true},{"v":"47,936","bold":true},{"v":"49,220","bold":true},{"v":"50,504","bold":true},{"v":"51,788","bold":true},{"v":"53,072","bold":true},{"v":"54,356","bold":true},{"v":"55,640","bold":true},{"v":"56,924","bold":true},{"v":"598,344","bold":true}],[{"v":"Gross margin"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"},{"v":"71.3%"}],[],[{"v":"Operating expenses","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Rent","fill":"FFF9C4","color":"0000CC"},{"v":"4,500","fill":"FFF9C4","color":"0000CC"},{"v":"4,635","fill":"FFF9C4","color":"0000CC"},{"v":"4,770","fill":"FFF9C4","color":"0000CC"},{"v":"4,905","fill":"FFF9C4","color":"0000CC"},{"v":"5,040","fill":"FFF9C4","color":"0000CC"},{"v":"5,175","fill":"FFF9C4","color":"0000CC"},{"v":"5,310","fill":"FFF9C4","color":"0000CC"},{"v":"5,445","fill":"FFF9C4","color":"0000CC"},{"v":"5,580","fill":"FFF9C4","color":"0000CC"},{"v":"5,715","fill":"FFF9C4","color":"0000CC"},{"v":"5,850","fill":"FFF9C4","color":"0000CC"},{"v":"5,985","fill":"FFF9C4","color":"0000CC"},{"v":"62,910","bold":true}],[{"v":"Salaries","fill":"FFF9C4","color":"0000CC"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"},{"v":"12,360","fill":"FFF9C4","color":"0000CC"},{"v":"12,720","fill":"FFF9C4","color":"0000CC"},{"v":"13,080","fill":"FFF9C4","color":"0000CC"},{"v":"13,440","fill":"FFF9C4","color":"0000CC"},{"v":"13,800","fill":"FFF9C4","color":"0000CC"},{"v":"14,160","fill":"FFF9C4","color":"0000CC"},{"v":"14,520","fill":"FFF9C4","color":"0000CC"},{"v":"14,880","fill":"FFF9C4","color":"0000CC"},{"v":"15,240","fill":"FFF9C4","color":"0000CC"},{"v":"15,600","fill":"FFF9C4","color":"0000CC"},{"v":"15,960","fill":"FFF9C4","color":"0000CC"},{"v":"167,760","bold":true}],[{"v":"Marketing","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,090","fill":"FFF9C4","color":"0000CC"},{"v":"3,180","fill":"FFF9C4","color":"0000CC"},{"v":"3,270","fill":"FFF9C4","color":"0000CC"},{"v":"3,360","fill":"FFF9C4","color":"0000CC"},{"v":"3,450","fill":"FFF9C4","color":"0000CC"},{"v":"3,540","fill":"FFF9C4","color":"0000CC"},{"v":"3,630","fill":"FFF9C4","color":"0000CC"},{"v":"3,720","fill":"FFF9C4","color":"0000CC"},{"v":"3,810","fill":"FFF9C4","color":"0000CC"},{"v":"3,900","fill":"FFF9C4","color":"0000CC"},{"v":"3,990","fill":"FFF9C4","color":"0000CC"},{"v":"41,940","bold":true}],[{"v":"Software","fill":"FFF9C4","color":"0000CC"},{"v":"600","fill":"FFF9C4","color":"0000CC"},{"v":"618","fill":"FFF9C4","color":"0000CC"},{"v":"636","fill":"FFF9C4","color":"0000CC"},{"v":"654","fill":"FFF9C4","color":"0000CC"},{"v":"672","fill":"FFF9C4","color":"0000CC"},{"v":"690","fill":"FFF9C4","color":"0000CC"},{"v":"708","fill":"FFF9C4","color":"0000CC"},{"v":"726","fill":"FFF9C4","color":"0000CC"},{"v":"744","fill":"FFF9C4","color":"0000CC"},{"v":"762","fill":"FFF9C4","color":"0000CC"},{"v":"780","fill":"FFF9C4","color":"0000CC"},{"v":"798","fill":"FFF9C4","color":"0000CC"},{"v":"8,388","bold":true}],[{"v":"General & admin","fill":"FFF9C4","color":"0000CC"},{"v":"2,000","fill":"FFF9C4","color":"0000CC"},{"v":"2,060","fill":"FFF9C4","color":"0000CC"},{"v":"2,120","fill":"FFF9C4","color":"0000CC"},{"v":"2,180","fill":"FFF9C4","color":"0000CC"},{"v":"2,240","fill":"FFF9C4","color":"0000CC"},{"v":"2,300","fill":"FFF9C4","color":"0000CC"},{"v":"2,360","fill":"FFF9C4","color":"0000CC"},{"v":"2,420","fill":"FFF9C4","color":"0000CC"},{"v":"2,480","fill":"FFF9C4","color":"0000CC"},{"v":"2,540","fill":"FFF9C4","color":"0000CC"},{"v":"2,600","fill":"FFF9C4","color":"0000CC"},{"v":"2,660","fill":"FFF9C4","color":"0000CC"},{"v":"27,960","bold":true}],[{"v":"Depreciation / finance","fill":"FFF9C4","color":"0000CC"},{"v":"500","fill":"FFF9C4","color":"0000CC"},{"v":"515","fill":"FFF9C4","color":"0000CC"},{"v":"530","fill":"FFF9C4","color":"0000CC"},{"v":"545","fill":"FFF9C4","color":"0000CC"},{"v":"560","fill":"FFF9C4","color":"0000CC"},{"v":"575","fill":"FFF9C4","color":"0000CC"},{"v":"590","fill":"FFF9C4","color":"0000CC"},{"v":"605","fill":"FFF9C4","color":"0000CC"},{"v":"620","fill":"FFF9C4","color":"0000CC"},{"v":"635","fill":"FFF9C4","color":"0000CC"},{"v":"650","fill":"FFF9C4","color":"0000CC"},{"v":"665","fill":"FFF9C4","color":"0000CC"},{"v":"6,990","bold":true}],[{"v":"Total operating expenses","fill":"E8F1EE","bold":true},{"v":"22,600","fill":"E8F1EE","bold":true},{"v":"23,278","fill":"E8F1EE","bold":true},{"v":"23,956","fill":"E8F1EE","bold":true},{"v":"24,634","fill":"E8F1EE","bold":true},{"v":"25,312","fill":"E8F1EE","bold":true},{"v":"25,990","fill":"E8F1EE","bold":true},{"v":"26,668","fill":"E8F1EE","bold":true},{"v":"27,346","fill":"E8F1EE","bold":true},{"v":"28,024","fill":"E8F1EE","bold":true},{"v":"28,702","fill":"E8F1EE","bold":true},{"v":"29,380","fill":"E8F1EE","bold":true},{"v":"30,058","fill":"E8F1EE","bold":true},{"v":"315,948","fill":"E8F1EE","bold":true}],[],[{"v":"Profit before tax","fill":"C9973A","bold":true,"color":"FFFFFF"},{"v":"20,200","fill":"F6EBD6","bold":true},{"v":"20,806","fill":"F6EBD6","bold":true},{"v":"21,412","fill":"F6EBD6","bold":true},{"v":"22,018","fill":"F6EBD6","bold":true},{"v":"22,624","fill":"F6EBD6","bold":true},{"v":"23,230","fill":"F6EBD6","bold":true},{"v":"23,836","fill":"F6EBD6","bold":true},{"v":"24,442","fill":"F6EBD6","bold":true},{"v":"25,048","fill":"F6EBD6","bold":true},{"v":"25,654","fill":"F6EBD6","bold":true},{"v":"26,260","fill":"F6EBD6","bold":true},{"v":"26,866","fill":"F6EBD6","bold":true},{"v":"282,396","fill":"F6EBD6","bold":true}],[{"v":"Net margin"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"},{"v":"33.7%"}]]},
  "xlsx-timesheet@en": {"type":"xlsx","sheetName":"Hours","rows":[[{"v":"Timesheet","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"One shift per row: date, employee, start, end and break in minutes. Hours and pay are calculated — including shifts that pass midnight.","color":"666666","size":10.0,"span":9}],[],[{"v":"Total hours","fill":"E8F1EE","bold":true},{"v":"31.75","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Total pay","fill":"E8F1EE","bold":true},{"v":"1,785","fill":"E8F1EE","bold":true,"size":12.0,"span":2}],[],[{"v":"Date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Employee","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Start","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"End","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Break (min)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Hours","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Rate","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Pay","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"01/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Noa","fill":"FFF9C4","color":"0000CC"},{"v":"09:00","fill":"FFF9C4","color":"0000CC"},{"v":"17:30","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"8.00"},{"v":"55.00"},{"v":"440.00"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"02/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Noa","fill":"FFF9C4","color":"0000CC"},{"v":"09:00","fill":"FFF9C4","color":"0000CC"},{"v":"16:00","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"6.50"},{"v":"55.00"},{"v":"357.50"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"01/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Uri","fill":"FFF9C4","color":"0000CC"},{"v":"16:00","fill":"FFF9C4","color":"0000CC"},{"v":"00:30","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"8.00"},{"v":"60.00"},{"v":"480.00"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Uri","fill":"FFF9C4","color":"0000CC"},{"v":"10:00","fill":"FFF9C4","color":"0000CC"},{"v":"14:30","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"4.50"},{"v":"60.00"},{"v":"270.00"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"03/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Maya","fill":"FFF9C4","color":"0000CC"},{"v":"08:00","fill":"FFF9C4","color":"0000CC"},{"v":"13:00","fill":"FFF9C4","color":"0000CC"},{"v":"15","fill":"FFF9C4","color":"0000CC"},{"v":"4.75"},{"v":"50.00"},{"v":"237.50"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-breakeven@en": {"type":"xlsx","sheetName":"Break-even","rows":[[{"v":"Break-even & pricing","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":5}],[{"v":"Fill in four yellow cells — the sheet works out how much you must sell to stop losing money, and how much to reach the profit you want.","color":"666666","size":10.0,"span":5}],[],[{"v":"Inputs","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Fixed costs per month"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"}],[{"v":"Variable cost per unit"},{"v":"45.00","fill":"FFF9C4","color":"0000CC"}],[{"v":"Selling price per unit"},{"v":"85.00","fill":"FFF9C4","color":"0000CC"}],[{"v":"Target monthly profit"},{"v":"8,000","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Results","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Contribution per unit"},{"v":"40.00"}],[{"v":"Contribution margin"},{"v":"47.1%"}],[{"v":"Break-even — units per month","bold":true},{"v":"300","fill":"E8F1EE","bold":true}],[{"v":"Break-even — monthly revenue"},{"v":"25,500"}],[{"v":"Units for target profit","bold":true},{"v":"500","fill":"E8F1EE","bold":true}],[{"v":"Revenue for target profit"},{"v":"42,500"}],[{"v":"Per working day (22/month) — units for target"},{"v":"23"}],[],[{"v":"Sales scenarios","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Units sold","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Revenue","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Variable cost","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Profit / loss","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Result","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"75"},{"v":"6,375"},{"v":"3,375"},{"v":"-9,000","bold":true},{"v":"Loss"}],[{"v":"150"},{"v":"12,750"},{"v":"6,750"},{"v":"-6,000","bold":true},{"v":"Loss"}],[{"v":"225"},{"v":"19,125"},{"v":"10,125"},{"v":"-3,000","bold":true},{"v":"Loss"}]]},
  "xlsx-salestargets@en": {"type":"xlsx","sheetName":"Sales vs targets","rows":[[{"v":"Sales vs targets — a full year","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":8}],[{"v":"Set a target for each month and, at month end, the actual sales. Achievement, gap and running totals are calculated: green = target met, red = under 80%.","color":"666666","size":10.0,"span":8}],[],[{"v":"Year:","bold":true},{"v":"2,027","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Month","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Target","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Actual","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% achieved","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Gap","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Cumulative target","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Cumulative actual","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Cumulative %","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"January","bold":true},{"v":"30,000","fill":"FFF9C4","color":"0000CC"},{"v":"28,000","fill":"FFF9C4","color":"0000CC"},{"v":"93%"},{"v":"-2,000"},{"v":"30,000"},{"v":"28,000"},{"v":"93%"}],[{"v":"February","bold":true},{"v":"30,000","fill":"FFF9C4","color":"0000CC"},{"v":"31,500","fill":"FFF9C4","color":"0000CC"},{"v":"105%"},{"v":"1,500"},{"v":"60,000"},{"v":"59,500"},{"v":"99%"}],[{"v":"March","bold":true},{"v":"35,000","fill":"FFF9C4","color":"0000CC"},{"v":"33,000","fill":"FFF9C4","color":"0000CC"},{"v":"94%"},{"v":"-2,000"},{"v":"95,000"},{"v":"92,500"},{"v":"97%"}],[{"v":"April","bold":true},{"v":"35,000","fill":"FFF9C4","color":"0000CC"},{"v":"37,500","fill":"FFF9C4","color":"0000CC"},{"v":"107%"},{"v":"2,500"},{"v":"130,000"},{"v":"130,000"},{"v":"100%"}],[{"v":"May","bold":true},{"v":"40,000","fill":"FFF9C4","color":"0000CC"},{"v":"39,000","fill":"FFF9C4","color":"0000CC"},{"v":"98%"},{"v":"-1,000"},{"v":"170,000"},{"v":"169,000"},{"v":"99%"}],[{"v":"June","bold":true},{"v":"40,000","fill":"FFF9C4","color":"0000CC"},{"v":"44,000","fill":"FFF9C4","color":"0000CC"},{"v":"110%"},{"v":"4,000"},{"v":"210,000"},{"v":"213,000"},{"v":"101%"}],[{"v":"July","bold":true},{"v":"40,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"August","bold":true},{"v":"38,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"September","bold":true},{"v":"42,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"October","bold":true},{"v":"45,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"November","bold":true},{"v":"45,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"December","bold":true},{"v":"50,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Total","fill":"E8F1EE","bold":true},{"v":"470,000","fill":"E8F1EE","bold":true},{"v":"213,000","fill":"E8F1EE","bold":true},{"v":"101%","fill":"E8F1EE","bold":true},{"v":"3,000","fill":"E8F1EE","bold":true}],[],[{"v":"Months on target","bold":true},{"v":""},{"v":"3"}],[{"v":"Left to the yearly target","bold":true},{"v":""},{"v":"257,000"}]]},
  "xlsx-vendors@en": {"type":"xlsx","sheetName":"Vendor comparison","rows":[[{"v":"Vendor comparison — weighted score","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"Set how much each criterion matters (yellow weights, total 100%), then fill in price, delivery time and 1–5 ratings. The cheapest gets 10 on price, the fastest 10 on delivery — the sheet ranks and recommends.","color":"666666","size":10.0,"span":12}],[],[{"v":"Price weight","bold":true},{"v":"40%","fill":"FFF9C4","color":"0000CC"},{"v":"Total weights","bold":true},{"v":"100%","bold":true},{"v":""},{"v":""},{"v":""},{"v":"Recommended","fill":"E8F1EE","bold":true,"span":2},{"v":"Vendor C","fill":"E8F1EE","bold":true,"size":12.0,"span":3}],[{"v":"Delivery weight","bold":true},{"v":"20%","fill":"FFF9C4","color":"0000CC"}],[{"v":"Quality weight","bold":true},{"v":"30%","fill":"FFF9C4","color":"0000CC"}],[{"v":"Service weight","bold":true},{"v":"10%","fill":"FFF9C4","color":"0000CC"}],[],[],[{"v":"Vendor","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Item / service","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Delivery (days)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Quality (1–5)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Service (1–5)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Price score","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Delivery score","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Quality score","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Service score","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Weighted score","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Rank","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Vendor A","fill":"FFF9C4","color":"0000CC"},{"v":"Packaging — monthly order","fill":"FFF9C4","color":"0000CC"},{"v":"4,200","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"9.0"},{"v":"6.0"},{"v":"8.0"},{"v":"8.0"},{"v":"8.00"},{"v":"2"}],[{"v":"Vendor B","fill":"FFF9C4","color":"0000CC"},{"v":"Packaging — monthly order","fill":"FFF9C4","color":"0000CC"},{"v":"3,800","fill":"FFF9C4","color":"0000CC"},{"v":"9","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"10.0"},{"v":"3.3"},{"v":"6.0"},{"v":"6.0"},{"v":"7.06"},{"v":"4"}],[{"v":"Vendor C","fill":"FFF9C4","color":"0000CC"},{"v":"Packaging — monthly order","fill":"FFF9C4","color":"0000CC"},{"v":"4,600","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":"8.3"},{"v":"10.0"},{"v":"10.0"},{"v":"10.0"},{"v":"9.32"},{"v":"1"}],[{"v":"Vendor D","fill":"FFF9C4","color":"0000CC"},{"v":"Packaging — monthly order","fill":"FFF9C4","color":"0000CC"},{"v":"3,950","fill":"FFF9C4","color":"0000CC"},{"v":"7","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"9.6"},{"v":"4.3"},{"v":"8.0"},{"v":"6.0"},{"v":"7.70"},{"v":"3"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-receivables@en": {"type":"xlsx","sheetName":"Receivables","rows":[[{"v":"Receivables — who owes me money","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":11}],[{"v":"One invoice per row: client, date, payment terms (days), amount and how much was paid. Balance, days late and status are calculated — the top shows how much is open and late.","color":"666666","size":10.0,"span":11}],[],[{"v":"Total outstanding","fill":"E8F1EE","bold":true,"span":2},{"v":"14,660","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"1–30 days late","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"31–60","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"61–90","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"90+","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Of which late","fill":"E8F1EE","bold":true,"span":2},{"v":"2,860","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"1,360"},{"v":"1,500"},{"v":"0"},{"v":"0"}],[{"v":"Late invoices","fill":"E8F1EE","bold":true,"span":2},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[],[],[{"v":"Invoice no.","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Client","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Terms (days)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Due date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Amount","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Balance","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Days late","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"1001","fill":"FFF9C4","color":"0000CC"},{"v":"Or Studio","fill":"FFF9C4","color":"0000CC"},{"v":"30/07/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"29/08/2026"},{"v":"4,720","fill":"FFF9C4","color":"0000CC"},{"v":"4,720","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":""},{"v":"Paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1002","fill":"FFF9C4","color":"0000CC"},{"v":"Corner Bakery","fill":"FFF9C4","color":"0000CC"},{"v":"24/08/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"23/09/2026"},{"v":"2,360","fill":"FFF9C4","color":"0000CC"},{"v":"1,000","fill":"FFF9C4","color":"0000CC"},{"v":"1,360"},{"v":"20"},{"v":"Late"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1003","fill":"FFF9C4","color":"0000CC"},{"v":"Levi Law","fill":"FFF9C4","color":"0000CC"},{"v":"23/09/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"23/10/2026"},{"v":"7,080","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"7,080"},{"v":"0"},{"v":"Open"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1004","fill":"FFF9C4","color":"0000CC"},{"v":"Green Garden","fill":"FFF9C4","color":"0000CC"},{"v":"05/07/2026","fill":"FFF9C4","color":"0000CC"},{"v":"60","fill":"FFF9C4","color":"0000CC"},{"v":"03/09/2026"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"1,500"},{"v":"40"},{"v":"Late"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"1005","fill":"FFF9C4","color":"0000CC"},{"v":"Or Studio","fill":"FFF9C4","color":"0000CC"},{"v":"08/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"30","fill":"FFF9C4","color":"0000CC"},{"v":"07/11/2026"},{"v":"4,720","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"4,720"},{"v":"0"},{"v":"Open"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-event-budget@en": {"type":"xlsx","sheetName":"Event budget","rows":[[{"v":"Event budget — wedding, bar/bat mitzvah or company event","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"Fill in the event details and, for each supplier, the quote, final price and what was paid. See what is left to pay, cost per guest and whether you're over budget.","color":"666666","size":10.0,"span":10}],[],[{"v":"Event","bold":true},{"v":"Noa & Daniel's wedding","fill":"FFF9C4","color":"0000CC","span":2},{"v":""},{"v":"Expected cost","fill":"E8F1EE","bold":true},{"v":"140,900","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Expected gifts","fill":"E8F1EE","bold":true},{"v":"112,500","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Date","bold":true},{"v":"10/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"Paid so far","fill":"E8F1EE","bold":true},{"v":"30,900","fill":"E8F1EE","bold":true,"size":12.0},{"v":"Estimated balance","fill":"E8F1EE","bold":true},{"v":"-28,400","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Guests","bold":true},{"v":"250","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"Left to pay","fill":"E8F1EE","bold":true},{"v":"110,000","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Total budget","bold":true},{"v":"180,000","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"vs budget","fill":"E8F1EE","bold":true},{"v":"39,100","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Expected gift per guest (optional)","bold":true},{"v":"450","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":"Cost per guest","fill":"E8F1EE","bold":true},{"v":"564","fill":"E8F1EE","bold":true,"size":12.0}],[],[],[],[{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Supplier","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Phone","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Quote","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Final price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Balance","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Next payment","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Venue","fill":"FFF9C4","color":"0000CC"},{"v":"The Garden Venue","fill":"FFF9C4","color":"0000CC"},{"v":"03-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"60,000","fill":"FFF9C4","color":"0000CC"},{"v":"58,000","fill":"FFF9C4","color":"0000CC"},{"v":"15,000","fill":"FFF9C4","color":"0000CC"},{"v":"43,000"},{"v":"12/11/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Part paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Catering","fill":"FFF9C4","color":"0000CC"},{"v":"Flavours Catering","fill":"FFF9C4","color":"0000CC"},{"v":"050-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"55,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"5,000","fill":"FFF9C4","color":"0000CC"},{"v":"50,000"},{"v":"12/12/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Part paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Photo & video","fill":"FFF9C4","color":"0000CC"},{"v":"Photo studio","fill":"FFF9C4","color":"0000CC"},{"v":"052-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"},{"v":"11,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,000","fill":"FFF9C4","color":"0000CC"},{"v":"8,000"},{"v":"11/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"Part paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Music / DJ","fill":"FFF9C4","color":"0000CC"},{"v":"DJ","fill":"FFF9C4","color":"0000CC"},{"v":"054-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"7,000","fill":"FFF9C4","color":"0000CC"},{"v":"6,500","fill":"FFF9C4","color":"0000CC"},{"v":"6,500","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Decor & flowers","fill":"FFF9C4","color":"0000CC"},{"v":"Field Flowers","fill":"FFF9C4","color":"0000CC"},{"v":"053-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"9,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"9,000"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Not paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"Invitations","fill":"FFF9C4","color":"0000CC"},{"v":"Print shop","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"1,500","fill":"FFF9C4","color":"0000CC"},{"v":"1,400","fill":"FFF9C4","color":"0000CC"},{"v":"1,400","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Paid"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-savings@en": {"type":"xlsx","sheetName":"Savings goals","rows":[[{"v":"Savings goals","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":9}],[{"v":"For each goal (car, holiday, emergency fund...): how much, by when and how much is saved. The sheet works out how much to put aside each month to make it on time.","color":"666666","size":10.0,"span":9}],[],[{"v":"All goals","fill":"E8F1EE","bold":true},{"v":"117,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Monthly to set aside (all goals)","fill":"E8F1EE","bold":true},{"v":"5,125","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Saved so far","fill":"E8F1EE","bold":true},{"v":"40,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Overall progress","fill":"E8F1EE","bold":true},{"v":"34%","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"Goal","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Target","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Target date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Saved","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Remaining","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Months left","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Per month","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Progress","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Emergency fund (3 months)","fill":"FFF9C4","color":"0000CC"},{"v":"36,000","fill":"FFF9C4","color":"0000CC"},{"v":"13/10/2027","fill":"FFF9C4","color":"0000CC"},{"v":"12,000","fill":"FFF9C4","color":"0000CC"},{"v":"24,000"},{"v":"12"},{"v":"2,000"},{"v":"33%"},{"v":"On the way"}],[{"v":"Family holiday","fill":"FFF9C4","color":"0000CC"},{"v":"15,000","fill":"FFF9C4","color":"0000CC"},{"v":"10/06/2027","fill":"FFF9C4","color":"0000CC"},{"v":"4,000","fill":"FFF9C4","color":"0000CC"},{"v":"11,000"},{"v":"8"},{"v":"1,375"},{"v":"27%"},{"v":"On the way"}],[{"v":"Car","fill":"FFF9C4","color":"0000CC"},{"v":"60,000","fill":"FFF9C4","color":"0000CC"},{"v":"12/10/2028","fill":"FFF9C4","color":"0000CC"},{"v":"18,000","fill":"FFF9C4","color":"0000CC"},{"v":"42,000"},{"v":"24"},{"v":"1,750"},{"v":"30%"},{"v":"On the way"}],[{"v":"New laptop","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"12/03/2027","fill":"FFF9C4","color":"0000CC"},{"v":"6,000","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"5"},{"v":"0"},{"v":"100%"},{"v":"Reached!"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-shifts@en": {"type":"xlsx","sheetName":"Rota","rows":[[{"v":"Weekly shift rota","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":10}],[{"v":"Pick the week (its Sunday) and, for each employee, a shift per day from the list. Shifts and hours per employee, and staff per shift each day, are counted for you.","color":"666666","size":10.0,"span":10}],[],[{"v":"Week starting","bold":true},{"v":"11/10/2026","fill":"FFF9C4","color":"0000CC","span":2}],[],[{"v":"Employee","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Sun","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Mon","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Tue","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Wed","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Thu","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Fri","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Sat","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Shifts","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Hours","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Date","fill":"E8F1EE","bold":true},{"v":"11/10","fill":"E8F1EE","bold":true},{"v":"12/10","fill":"E8F1EE","bold":true},{"v":"13/10","fill":"E8F1EE","bold":true},{"v":"14/10","fill":"E8F1EE","bold":true},{"v":"15/10","fill":"E8F1EE","bold":true},{"v":"16/10","fill":"E8F1EE","bold":true},{"v":"17/10","fill":"E8F1EE","bold":true},{"v":"","fill":"E8F1EE"},{"v":"","fill":"E8F1EE"}],[{"v":"Noa","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"38.0","bold":true}],[{"v":"Uri","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"4"},{"v":"32.0","bold":true}],[{"v":"Maya","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"4"},{"v":"30.0","bold":true}],[{"v":"Daniel","fill":"FFF9C4","color":"0000CC"},{"v":"Night","fill":"FFF9C4","color":"0000CC"},{"v":"Night","fill":"FFF9C4","color":"0000CC"},{"v":"Night","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"Evening","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"40.0","bold":true}],[{"v":"Shira","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Midday","fill":"FFF9C4","color":"0000CC"},{"v":"Day off","fill":"FFF9C4","color":"0000CC"},{"v":"Morning","fill":"FFF9C4","color":"0000CC"},{"v":"5"},{"v":"32.0","bold":true}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-freelance-rate@en": {"type":"xlsx","sheetName":"Hourly rate","rows":[[{"v":"What should I charge per hour? — freelancer calculator","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":3}],[{"v":"Enter what you want to take home each month, your costs and how many hours you can really bill. The sheet calculates your minimum hourly, daily and project price.","color":"666666","size":10.0,"span":3}],[],[{"v":"What you want to earn","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Monthly take-home (net)"},{"v":"15,000","fill":"FFF9C4","color":"0000CC"}],[{"v":"Monthly business costs (software, gear, car, accountant...)"},{"v":"2,500","fill":"FFF9C4","color":"0000CC"}],[{"v":"Estimated income tax + social security + pension (%)"},{"v":"30%","fill":"FFF9C4","color":"0000CC"},{"v":"Check with an accountant","color":"666666","size":9.0}],[{"v":"Working days per week"},{"v":"5","fill":"FFF9C4","color":"0000CC"}],[{"v":"Working hours per day"},{"v":"8.0","fill":"FFF9C4","color":"0000CC"}],[{"v":"Share of hours you can bill (%)"},{"v":"60%","fill":"FFF9C4","color":"0000CC"},{"v":"Marketing, email and admin aren't billable","color":"666666","size":9.0}],[{"v":"Weeks off per year (holidays, sick days)"},{"v":"6","fill":"FFF9C4","color":"0000CC"}],[],[{"v":"Result","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Monthly revenue needed (before sales tax)"},{"v":"23,929"}],[{"v":"Billable hours per month (average)"},{"v":"92.0"}],[{"v":"Minimum hourly rate","fill":"E8F1EE","bold":true},{"v":"260","fill":"E8F1EE","bold":true}],[{"v":"Minimum day rate"},{"v":"1,248"}],[{"v":"Hourly incl. 18% sales tax"},{"v":"307"}],[],[{"v":"Price a project","bold":true,"color":"1F5C4E","size":12.0}],[{"v":"Estimated hours"},{"v":"20","fill":"FFF9C4","color":"0000CC"}],[{"v":"Buffer for revisions and surprises (%)"},{"v":"20%","fill":"FFF9C4","color":"0000CC"}],[{"v":"Suggested project price (before tax)","fill":"E8F1EE","bold":true},{"v":"6,250","fill":"E8F1EE","bold":true}]]},
  "xlsx-loan@en": {"type":"xlsx","sheetName":"Loan","rows":[[{"v":"Loan calculator & repayment schedule","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":7}],[{"v":"Enter the amount, yearly interest and term — get the monthly payment, total interest and a full schedule (fixed monthly payment).","color":"666666","size":10.0,"span":7}],[],[{"v":"Loan amount","bold":true,"span":2},{"v":"100,000","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Monthly payment","fill":"E8F1EE","bold":true},{"v":"1,933.28","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Yearly interest","bold":true,"span":2},{"v":"6%","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Number of payments","fill":"E8F1EE","bold":true},{"v":"60","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Term (years)","bold":true,"span":2},{"v":"5","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Total paid","fill":"E8F1EE","bold":true},{"v":"115,997","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"First payment","bold":true,"span":2},{"v":"01/02/2027","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Of which interest","fill":"E8F1EE","bold":true},{"v":"15,997","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"No.","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Date","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Opening balance","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Payment","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Interest","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Principal","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Closing balance","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"1"},{"v":"01/02/2027"},{"v":"100,000.00"},{"v":"1,933.28"},{"v":"500.00"},{"v":"1,433.28"},{"v":"98,566.72"}],[{"v":"2"},{"v":"01/03/2027"},{"v":"98,566.72"},{"v":"1,933.28"},{"v":"492.83"},{"v":"1,440.45"},{"v":"97,126.27"}],[{"v":"3"},{"v":"01/04/2027"},{"v":"97,126.27"},{"v":"1,933.28"},{"v":"485.63"},{"v":"1,447.65"},{"v":"95,678.62"}],[{"v":"4"},{"v":"01/05/2027"},{"v":"95,678.62"},{"v":"1,933.28"},{"v":"478.39"},{"v":"1,454.89"},{"v":"94,223.74"}],[{"v":"5"},{"v":"01/06/2027"},{"v":"94,223.74"},{"v":"1,933.28"},{"v":"471.12"},{"v":"1,462.16"},{"v":"92,761.58"}],[{"v":"6"},{"v":"01/07/2027"},{"v":"92,761.58"},{"v":"1,933.28"},{"v":"463.81"},{"v":"1,469.47"},{"v":"91,292.10"}],[{"v":"7"},{"v":"01/08/2027"},{"v":"91,292.10"},{"v":"1,933.28"},{"v":"456.46"},{"v":"1,476.82"},{"v":"89,815.28"}],[{"v":"8"},{"v":"01/09/2027"},{"v":"89,815.28"},{"v":"1,933.28"},{"v":"449.08"},{"v":"1,484.20"},{"v":"88,331.08"}],[{"v":"9"},{"v":"01/10/2027"},{"v":"88,331.08"},{"v":"1,933.28"},{"v":"441.66"},{"v":"1,491.62"},{"v":"86,839.46"}],[{"v":"10"},{"v":"01/11/2027"},{"v":"86,839.46"},{"v":"1,933.28"},{"v":"434.20"},{"v":"1,499.08"},{"v":"85,340.37"}],[{"v":"11"},{"v":"01/12/2027"},{"v":"85,340.37"},{"v":"1,933.28"},{"v":"426.70"},{"v":"1,506.58"},{"v":"83,833.79"}],[{"v":"12"},{"v":"01/01/2028"},{"v":"83,833.79"},{"v":"1,933.28"},{"v":"419.17"},{"v":"1,514.11"},{"v":"82,319.68"}],[{"v":"13"},{"v":"01/02/2028"},{"v":"82,319.68"},{"v":"1,933.28"},{"v":"411.60"},{"v":"1,521.68"},{"v":"80,798.00"}]]},
  "xlsx-apartment-sales": {"type":"xlsx","sheetName":"דירות ומכירות","rows":[[{"v":"מלאי דירות ומכירות — פרויקט יזמי","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"שורה לכל דירה: נתונים, מחיר מחירון, סטטוס, והקונה. אחרי חתימה ממלאים מחיר סופי, ואת התשלומים בגיליון ״תשלומי רוכשים״ — כמה שולם וכמה נשאר מתעדכן כאן לבד.","color":"666666","size":10.0,"span":14}],[],[{"v":"שם הפרויקט","bold":true},{"v":"מגדלי הגפן, רחובות","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"דירות בפרויקט","fill":"E8F1EE","bold":true},{"v":""},{"v":"6","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"שווי מכירות (חוזים) (₪)","fill":"E8F1EE","bold":true},{"v":""},{"v":"8,540,000 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"נמכרו (חוזה / נמסרו)","fill":"E8F1EE","bold":true},{"v":""},{"v":"3","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"נגבה מהרוכשים (₪)","fill":"E8F1EE","bold":true},{"v":""},{"v":"4,828,000 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"שמורות / במו״מ","fill":"E8F1EE","bold":true},{"v":""},{"v":"1","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"נשאר לגבות (₪)","fill":"E8F1EE","bold":true},{"v":""},{"v":"3,712,000 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"פנויות","fill":"E8F1EE","bold":true},{"v":""},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"מלאי פנוי לפי מחירון (₪)","fill":"E8F1EE","bold":true},{"v":""},{"v":"6,760,000 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"אחוז מכירות","fill":"E8F1EE","bold":true},{"v":""},{"v":"50%","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"מחיר ממוצע למ״ר (נמכרו) (₪)","fill":"E8F1EE","bold":true},{"v":""},{"v":"22,895 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"בניין","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"קומה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מס׳ דירה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חדרים","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שטח (מ״ר)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר מחירון (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר סופי (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סטטוס","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"רוכש/ת","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"טלפון","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שולם (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"אחוז ששולם","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר למ״ר (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"1","fill":"FFF9C4","color":"0000CC"},{"v":"A-1","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"105","fill":"FFF9C4","color":"0000CC"},{"v":"2,350,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,290,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"נחתם חוזה","fill":"FFF9C4","color":"0000CC"},{"v":"משפחת כהן","fill":"FFF9C4","color":"0000CC"},{"v":"050-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"858,000 ₪"},{"v":"1,432,000 ₪"},{"v":"37%"},{"v":"21,810 ₪"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"1","fill":"FFF9C4","color":"0000CC"},{"v":"A-2","fill":"FFF9C4","color":"0000CC"},{"v":"3.0","fill":"FFF9C4","color":"0000CC"},{"v":"85","fill":"FFF9C4","color":"0000CC"},{"v":"1,950,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"שמורה / במו״מ","fill":"FFF9C4","color":"0000CC"},{"v":"דנה לוי","fill":"FFF9C4","color":"0000CC"},{"v":"052-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":""},{"v":""},{"v":"22,941 ₪"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"2","fill":"FFF9C4","color":"0000CC"},{"v":"A-3","fill":"FFF9C4","color":"0000CC"},{"v":"5.0","fill":"FFF9C4","color":"0000CC"},{"v":"128","fill":"FFF9C4","color":"0000CC"},{"v":"2,890,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,850,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"נחתם חוזה","fill":"FFF9C4","color":"0000CC"},{"v":"יוסי ומיכל אברהם","fill":"FFF9C4","color":"0000CC"},{"v":"054-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"570,000 ₪"},{"v":"2,280,000 ₪"},{"v":"20%"},{"v":"22,266 ₪"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"2","fill":"FFF9C4","color":"0000CC"},{"v":"A-4","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"104","fill":"FFF9C4","color":"0000CC"},{"v":"2,390,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"פנויה","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":""},{"v":""},{"v":"22,981 ₪"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"A-5","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"104","fill":"FFF9C4","color":"0000CC"},{"v":"2,420,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"פנויה","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":""},{"v":""},{"v":"23,269 ₪"}],[{"v":"בניין A","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"A-6","fill":"FFF9C4","color":"0000CC"},{"v":"5.0","fill":"FFF9C4","color":"0000CC"},{"v":"140","fill":"FFF9C4","color":"0000CC"},{"v":"3,450,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"3,400,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"נמסרה","fill":"FFF9C4","color":"0000CC"},{"v":"רון גולן","fill":"FFF9C4","color":"0000CC"},{"v":"053-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"3,400,000 ₪"},{"v":"0 ₪"},{"v":"100%"},{"v":"24,286 ₪"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-construction-budget": {"type":"xlsx","sheetName":"תקציב בנייה","rows":[[{"v":"תקציב בניית בניין — תכנון מול ביצוע","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"בתחילת הפרויקט רושמים כמה תכננתם לכל סעיף. במהלך הבנייה מוסיפים את המחיר שסגרתם בפועל עם הקבלן וכמה שילמתם — והגיליון מראה איפה חרגתם, כמה נשאר לשלם, ועלות למ״ר וליחידה.","color":"666666","size":10.0,"span":12}],[],[{"v":"שם הפרויקט","bold":true},{"v":"בניין מגורים, רח׳ הגפן 12","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"תכנון מקורי (סה״כ) (₪)","fill":"E8F1EE","bold":true},{"v":"19,560,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"שולם עד עכשיו (₪)","fill":"E8F1EE","bold":true},{"v":"13,260,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"רזרבה שנותרה (₪)","fill":"E8F1EE","bold":true},{"v":"1,079,200 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"מספר יחידות דיור","bold":true},{"v":"24","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"כולל רזרבה (₪)","fill":"E8F1EE","bold":true},{"v":"20,929,200 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"נשאר לשלם (₪)","fill":"E8F1EE","bold":true},{"v":"6,590,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"ביצוע תשלומים","fill":"E8F1EE","bold":true},{"v":"67%","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"שטח בנוי כולל (מ״ר)","bold":true},{"v":"3,200","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"צפי עלות בפועל (₪)","fill":"E8F1EE","bold":true},{"v":"19,850,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"עלות למ״ר (₪)","fill":"E8F1EE","bold":true},{"v":"6,203 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"רזרבה לבלתי צפוי","bold":true},{"v":"7%","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"נשאר מול התכנון (₪)","fill":"E8F1EE","bold":true},{"v":"-290,000 ₪","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"עלות ליחידת דיור (₪)","fill":"E8F1EE","bold":true},{"v":"827,083 ₪","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"קטגוריה","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"סעיף","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"ספק / קבלן","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תכנון מקורי (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מחיר שנסגר בפועל (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"שולם (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"יתרה לתשלום (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חריגה (₪)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"חריגה %","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"תשלום הבא","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"מצב","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"הערות","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"קרקע ומיסוי","fill":"FFF9C4","color":"0000CC"},{"v":"רכישת קרקע","fill":"FFF9C4","color":"0000CC"},{"v":"בעלי הקרקע","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"0 ₪"},{"v":"0.0%"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"שולם במלואו"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000 ₪"}],[{"v":"תכנון והיתרים","fill":"FFF9C4","color":"0000CC"},{"v":"אדריכל","fill":"FFF9C4","color":"0000CC"},{"v":"משרד אדריכלים","fill":"FFF9C4","color":"0000CC"},{"v":"420,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"450,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"300,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"150,000 ₪"},{"v":"30,000 ₪"},{"v":"7.1%"},{"v":"28/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"חריגה"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"450,000 ₪"}],[{"v":"אגרות והיטלים","fill":"FFF9C4","color":"0000CC"},{"v":"היטל השבחה ואגרות בנייה","fill":"FFF9C4","color":"0000CC"},{"v":"הוועדה המקומית","fill":"FFF9C4","color":"0000CC"},{"v":"1,300,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪"},{"v":"-60,000 ₪"},{"v":"-4.6%"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"שולם במלואו"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000 ₪"}],[{"v":"שלד","fill":"FFF9C4","color":"0000CC"},{"v":"שלד קומות 1-8","fill":"FFF9C4","color":"0000CC"},{"v":"קבלן שלד","fill":"FFF9C4","color":"0000CC"},{"v":"6,800,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"7,150,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"2,100,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"5,050,000 ₪"},{"v":"350,000 ₪"},{"v":"5.1%"},{"v":"19/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"חריגה"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"7,150,000 ₪"}],[{"v":"אינסטלציה","fill":"FFF9C4","color":"0000CC"},{"v":"אינסטלציה","fill":"FFF9C4","color":"0000CC"},{"v":"קבלן אינסטלציה","fill":"FFF9C4","color":"0000CC"},{"v":"900,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"900,000 ₪"},{"v":""},{"v":""},{"v":"12/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"בתקציב"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"900,000 ₪"}],[{"v":"מעליות","fill":"FFF9C4","color":"0000CC"},{"v":"2 מעליות","fill":"FFF9C4","color":"0000CC"},{"v":"חברת מעליות","fill":"FFF9C4","color":"0000CC"},{"v":"640,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"610,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"120,000 ₪","fill":"FFF9C4","color":"0000CC"},{"v":"490,000 ₪"},{"v":"-30,000 ₪"},{"v":"-4.7%"},{"v":"13/12/2026","fill":"FFF9C4","color":"0000CC"},{"v":"בתקציב"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"610,000 ₪"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-apartment-sales@en": {"type":"xlsx","sheetName":"Units & sales","rows":[[{"v":"Unit inventory & sales — development project","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":14}],[{"v":"One row per unit: details, list price, status and buyer. Once signed, enter the final price and log payments on the 'Buyer payments' sheet — paid and balance update here by themselves.","color":"666666","size":10.0,"span":14}],[],[{"v":"Project","bold":true},{"v":"Vine Towers","fill":"FFF9C4","color":"0000CC","span":3}],[{"v":"Units","fill":"E8F1EE","bold":true},{"v":""},{"v":"6","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Sales value (signed)","fill":"E8F1EE","bold":true},{"v":""},{"v":"8,540,000","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Sold (signed / handed over)","fill":"E8F1EE","bold":true},{"v":""},{"v":"3","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Collected from buyers","fill":"E8F1EE","bold":true},{"v":""},{"v":"4,828,000","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Reserved","fill":"E8F1EE","bold":true},{"v":""},{"v":"1","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Left to collect","fill":"E8F1EE","bold":true},{"v":""},{"v":"3,712,000","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Available","fill":"E8F1EE","bold":true},{"v":""},{"v":"2","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Unsold stock at list price","fill":"E8F1EE","bold":true},{"v":""},{"v":"6,760,000","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Sold %","fill":"E8F1EE","bold":true},{"v":""},{"v":"50%","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Avg price per m² (sold)","fill":"E8F1EE","bold":true},{"v":""},{"v":"22,895","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"Building","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Floor","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Unit no.","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Rooms","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Area (m²)","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"List price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Final price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Buyer","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Phone","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Balance","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"% paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Price per m²","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"1","fill":"FFF9C4","color":"0000CC"},{"v":"A-1","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"105","fill":"FFF9C4","color":"0000CC"},{"v":"2,350,000","fill":"FFF9C4","color":"0000CC"},{"v":"2,290,000","fill":"FFF9C4","color":"0000CC"},{"v":"Contract signed","fill":"FFF9C4","color":"0000CC"},{"v":"Cohen family","fill":"FFF9C4","color":"0000CC"},{"v":"050-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"858,000"},{"v":"1,432,000"},{"v":"37%"},{"v":"21,810"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"1","fill":"FFF9C4","color":"0000CC"},{"v":"A-2","fill":"FFF9C4","color":"0000CC"},{"v":"3.0","fill":"FFF9C4","color":"0000CC"},{"v":"85","fill":"FFF9C4","color":"0000CC"},{"v":"1,950,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Reserved","fill":"FFF9C4","color":"0000CC"},{"v":"Dana Levi","fill":"FFF9C4","color":"0000CC"},{"v":"052-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":""},{"v":""},{"v":"22,941"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"2","fill":"FFF9C4","color":"0000CC"},{"v":"A-3","fill":"FFF9C4","color":"0000CC"},{"v":"5.0","fill":"FFF9C4","color":"0000CC"},{"v":"128","fill":"FFF9C4","color":"0000CC"},{"v":"2,890,000","fill":"FFF9C4","color":"0000CC"},{"v":"2,850,000","fill":"FFF9C4","color":"0000CC"},{"v":"Contract signed","fill":"FFF9C4","color":"0000CC"},{"v":"Yossi & Michal Avraham","fill":"FFF9C4","color":"0000CC"},{"v":"054-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"570,000"},{"v":"2,280,000"},{"v":"20%"},{"v":"22,266"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"2","fill":"FFF9C4","color":"0000CC"},{"v":"A-4","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"104","fill":"FFF9C4","color":"0000CC"},{"v":"2,390,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Available","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":""},{"v":""},{"v":"22,981"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"3","fill":"FFF9C4","color":"0000CC"},{"v":"A-5","fill":"FFF9C4","color":"0000CC"},{"v":"4.0","fill":"FFF9C4","color":"0000CC"},{"v":"104","fill":"FFF9C4","color":"0000CC"},{"v":"2,420,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Available","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":""},{"v":""},{"v":"23,269"}],[{"v":"Building A","fill":"FFF9C4","color":"0000CC"},{"v":"4","fill":"FFF9C4","color":"0000CC"},{"v":"A-6","fill":"FFF9C4","color":"0000CC"},{"v":"5.0","fill":"FFF9C4","color":"0000CC"},{"v":"140","fill":"FFF9C4","color":"0000CC"},{"v":"3,450,000","fill":"FFF9C4","color":"0000CC"},{"v":"3,400,000","fill":"FFF9C4","color":"0000CC"},{"v":"Handed over","fill":"FFF9C4","color":"0000CC"},{"v":"Ron Golan","fill":"FFF9C4","color":"0000CC"},{"v":"053-0000000","fill":"FFF9C4","color":"0000CC"},{"v":"3,400,000"},{"v":"0"},{"v":"100%"},{"v":"24,286"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"}]]},
  "xlsx-construction-budget@en": {"type":"xlsx","sheetName":"Construction budget","rows":[[{"v":"Building construction budget — plan vs actual","fill":"1F5C4E","bold":true,"color":"FFFFFF","size":18.0,"span":12}],[{"v":"One row per line item: planned budget, signed contract and what was paid. See overruns per item, what's left to pay, cost per m² and per unit, and how much contingency is left.","color":"666666","size":10.0,"span":12}],[],[{"v":"Project","bold":true},{"v":"Residential building, 12 Vine St","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Original plan (total)","fill":"E8F1EE","bold":true},{"v":"19,560,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Paid so far","fill":"E8F1EE","bold":true},{"v":"13,260,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Contingency left","fill":"E8F1EE","bold":true},{"v":"1,079,200","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Housing units","bold":true},{"v":"24","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Incl. contingency","fill":"E8F1EE","bold":true},{"v":"20,929,200","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Left to pay","fill":"E8F1EE","bold":true},{"v":"6,590,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Paid vs forecast","fill":"E8F1EE","bold":true},{"v":"67%","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Total built area (m²)","bold":true},{"v":"3,200","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Actual cost forecast","fill":"E8F1EE","bold":true},{"v":"19,850,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Cost per m²","fill":"E8F1EE","bold":true},{"v":"6,203","fill":"E8F1EE","bold":true,"size":12.0}],[{"v":"Contingency reserve","bold":true},{"v":"7%","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"Left vs plan","fill":"E8F1EE","bold":true},{"v":"-290,000","fill":"E8F1EE","bold":true,"size":12.0},{"v":""},{"v":"Cost per unit","fill":"E8F1EE","bold":true},{"v":"827,083","fill":"E8F1EE","bold":true,"size":12.0}],[],[{"v":"Category","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Item","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Supplier / contractor","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Original plan","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Actual agreed price","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Paid","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Left to pay","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Variance","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Variance %","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Next payment","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Status","fill":"1F5C4E","bold":true,"color":"FFFFFF"},{"v":"Notes","fill":"1F5C4E","bold":true,"color":"FFFFFF"}],[{"v":"Land & taxes","fill":"FFF9C4","color":"0000CC"},{"v":"Land purchase","fill":"FFF9C4","color":"0000CC"},{"v":"Land owners","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"0"},{"v":"0.0%"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Fully paid"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"9,500,000"}],[{"v":"Design & permits","fill":"FFF9C4","color":"0000CC"},{"v":"Architect","fill":"FFF9C4","color":"0000CC"},{"v":"Architects office","fill":"FFF9C4","color":"0000CC"},{"v":"420,000","fill":"FFF9C4","color":"0000CC"},{"v":"450,000","fill":"FFF9C4","color":"0000CC"},{"v":"300,000","fill":"FFF9C4","color":"0000CC"},{"v":"150,000"},{"v":"30,000"},{"v":"7.1%"},{"v":"28/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Over budget"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"450,000"}],[{"v":"Fees & levies","fill":"FFF9C4","color":"0000CC"},{"v":"Betterment levy & permit fees","fill":"FFF9C4","color":"0000CC"},{"v":"Local committee","fill":"FFF9C4","color":"0000CC"},{"v":"1,300,000","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000","fill":"FFF9C4","color":"0000CC"},{"v":"0"},{"v":"-60,000"},{"v":"-4.6%"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"Fully paid"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"1,240,000"}],[{"v":"Structure","fill":"FFF9C4","color":"0000CC"},{"v":"Frame floors 1-8","fill":"FFF9C4","color":"0000CC"},{"v":"Frame contractor","fill":"FFF9C4","color":"0000CC"},{"v":"6,800,000","fill":"FFF9C4","color":"0000CC"},{"v":"7,150,000","fill":"FFF9C4","color":"0000CC"},{"v":"2,100,000","fill":"FFF9C4","color":"0000CC"},{"v":"5,050,000"},{"v":"350,000"},{"v":"5.1%"},{"v":"19/10/2026","fill":"FFF9C4","color":"0000CC"},{"v":"Over budget"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"7,150,000"}],[{"v":"Plumbing","fill":"FFF9C4","color":"0000CC"},{"v":"Plumbing","fill":"FFF9C4","color":"0000CC"},{"v":"Plumbing contractor","fill":"FFF9C4","color":"0000CC"},{"v":"900,000","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"0","fill":"FFF9C4","color":"0000CC"},{"v":"900,000"},{"v":""},{"v":""},{"v":"12/01/2027","fill":"FFF9C4","color":"0000CC"},{"v":"On budget"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"900,000"}],[{"v":"Lifts","fill":"FFF9C4","color":"0000CC"},{"v":"2 lifts","fill":"FFF9C4","color":"0000CC"},{"v":"Lift company","fill":"FFF9C4","color":"0000CC"},{"v":"640,000","fill":"FFF9C4","color":"0000CC"},{"v":"610,000","fill":"FFF9C4","color":"0000CC"},{"v":"120,000","fill":"FFF9C4","color":"0000CC"},{"v":"490,000"},{"v":"-30,000"},{"v":"-4.7%"},{"v":"13/12/2026","fill":"FFF9C4","color":"0000CC"},{"v":"On budget"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"610,000"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}],[{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":""},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"},{"v":""},{"v":"","fill":"FFF9C4","color":"0000CC"}]]}
};
