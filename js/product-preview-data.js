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
            "text": "אנחנו צוות מומחים המספק פתרונות עסקיים מותאמים אישית ללקוחות בכל הגדלים. הגישה שלנו משלבת ניסיון מקצועי מעמיק עם הבנה עסקית אמיתית, כדי לספק תוצאות מדידות שמניעות צמיחה.",
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
            "text": "דוגמאות מהשטח",
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
            "text": "עקרון ראשון: התחילו מהבעיה",
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
            "text": "עקרון שני: מדדו כל דבר",
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
            "text": "פורטפוליו יצירתי — ניתנת להתאמה מלאה",
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
        "bg": "111111",
        "blocks": [
          {
            "text": "\"עבודה יוצאת דופן, יצירתית ומדויקת. חוויה מעולה מתחילה ועד סוף.\"",
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
            "text": "זמינה לפרויקטים חדשים",
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
            "text": "שוק כולל (TAM)",
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
            "text": "שוק בר-השגה (SAM)",
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
            "text": "יעד ראשוני (SOM)",
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
        "bg": "1E1033",
        "blocks": [
          {
            "text": "מגייסים סבב Seed",
            "size": 32.0,
            "bold": true,
            "color": "FFFFFF"
          },
          {
            "text": "$1.5M כדי להאיץ צמיחה ולהרחיב את הצוות",
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
            "text": "+3 שעות",
            "size": 32.0,
            "bold": true,
            "color": "2563EB"
          },
          {
            "text": "נחסכות בממוצע ליום עבודה",
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
  "xlsx-clients": {
    "type": "xlsx",
    "sheetName": "מעקב לקוחות",
    "rows": [
      [
        {
          "v": "מעקב לקוחות",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 18.0
        }
      ],
      [
        {
          "v": "מלאו את פרטי הלקוחות (התאים הצהובים) — הסיכום למטה מתעדכן אוטומטית",
          "fill": null,
          "bold": false,
          "color": "666666",
          "size": 10.0
        }
      ],
      [],
      [
        {
          "v": "שם לקוח",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "טלפון",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "אימייל",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "סטטוס",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "פנייה ראשונה",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "הערות",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "דנה כהן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "050-1234567",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "dana@mail.com",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "פעיל",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "02.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "מעוניינת בחבילה מלאה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "יוסי לוי",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "052-9876543",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "yossi@mail.com",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ליד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "04.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ממתין להצעת מחיר",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "שירה אברהם",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "054-5551234",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "shira@mail.com",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "סגור",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "28.08",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "עסקה נסגרה בהצלחה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "אורי מזרחי",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "053-1112223",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "uri@mail.com",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ליד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "10.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "יש לחזור אליו בשבוע הבא",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "מיכל דגן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "050-7778889",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "michal@mail.com",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "פעיל",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "15.08",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "לקוחה קבועה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [],
      [],
      [
        {
          "v": "סיכום",
          "fill": null,
          "bold": true,
          "color": "1F5C4E",
          "size": 12.0
        }
      ],
      [
        {
          "v": "סה\"כ בסטטוס \"ליד\"",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ בסטטוס \"פעיל\"",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ בסטטוס \"סגור\"",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ לקוחות",
          "fill": null,
          "bold": true,
          "color": "C99A3B",
          "size": 13.0
        }
      ]
    ]
  },
  "xlsx-expense": {
    "type": "xlsx",
    "sheetName": "מעקב הוצאות עסק",
    "rows": [
      [
        {
          "v": "מעקב הוצאות עסק",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 18.0
        }
      ],
      [
        {
          "v": "מלאו את השורות (התאים הצהובים) — הסיכומים למטה מתעדכנים אוטומטית",
          "fill": null,
          "bold": false,
          "color": "666666",
          "size": 10.0
        }
      ],
      [],
      [
        {
          "v": "תאריך",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "קטגוריה",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "ספק",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "תיאור",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "סכום (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "שולם?",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "01.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "שכירות",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "בעל הנכס",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "שכירות משרד חודשית",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "3200",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "03.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ציוד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "אופיס דיפו",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "נייר וטונר למדפסת",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "340",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "05.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "שיווק",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "פייסבוק",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "קמפיין פרסום חודשי",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "600",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "08.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "תוכנה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "Adobe",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "מנוי חודשי לתוכנות עיצוב",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "180",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "10.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "הובלות",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "שליח עד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "משלוחים ללקוחות",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "260",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "לא",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "14.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ציוד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "איקאה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ריהוט למשרד",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "890",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "18.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "שיווק",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "מדפיס מקומי",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כרטיסי ביקור ופלייארים",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "420",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "לא",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "22.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "תוכנה",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "Google Workspace",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "מנוי דואר וענן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "95",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "25.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "אחר",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "רואה חשבון",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "ליווי חודשי",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "750",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "28.09",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "הובלות",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "דלק",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "נסיעות ללקוחות",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "310",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "כן",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [],
      [],
      [
        {
          "v": "סיכום",
          "fill": null,
          "bold": true,
          "color": "1F5C4E",
          "size": 12.0
        }
      ],
      [
        {
          "v": "סה\"כ שכירות",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ ציוד",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ שיווק",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ תוכנה",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ הובלות",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ אחר",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ הוצאות",
          "fill": null,
          "bold": true,
          "color": "C99A3B",
          "size": 13.0
        }
      ]
    ]
  },
  "xlsx-invoice": {
    "type": "xlsx",
    "sheetName": "חשבונית",
    "rows": [
      [
        {
          "v": "חשבונית עסקית",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 20.0
        }
      ],
      [
        {
          "v": "התאים הצהובים הם שדות למילוי — שאר התאים מתעדכנים אוטומטית",
          "fill": null,
          "bold": false,
          "color": "666666",
          "size": 10.0
        }
      ],
      [],
      [
        {
          "v": "שם העסק:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "שם העסק שלכם",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [
        {
          "v": "ח.פ / עוסק מורשה:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "000000000",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [
        {
          "v": "כתובת:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "כתובת העסק, עיר",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [
        {
          "v": "טלפון / מייל:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "050-0000000 | info@business.co.il",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [],
      [
        {
          "v": "לכבוד (לקוח):",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "שם הלקוח",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [
        {
          "v": "מספר חשבונית:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "2026-001",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [
        {
          "v": "תאריך:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 10.0
        },
        {
          "v": "01/01/2026",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 10.0
        }
      ],
      [],
      [],
      [
        {
          "v": "תיאור",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "כמות",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "מחיר יחידה (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "סה\"כ (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "שירות / מוצר לדוגמה 1",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "1",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "500",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "שירות / מוצר לדוגמה 2",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "2",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "250",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [],
      [],
      [
        {
          "v": "סכום ביניים:",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 12.0
        }
      ],
      [
        {
          "v": "מע\"מ (17%):",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 12.0
        }
      ],
      [
        {
          "v": "סה\"כ לתשלום:",
          "fill": "C99A3B",
          "bold": true,
          "color": "FFFFFF",
          "size": 12.0
        }
      ],
      [],
      [
        {
          "v": "שיעור מע\"מ בישראל נכון למועד יצירת התבנית: 17%. יש לעדכן בהתאם לשיעור העדכני.",
          "fill": null,
          "bold": false,
          "color": "999999",
          "size": 9.0
        }
      ]
    ]
  },
  "xlsx-budget": {
    "type": "xlsx",
    "sheetName": "תקציב חודשי",
    "rows": [
      [
        {
          "v": "תקציב חודשי אישי",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 18.0
        }
      ],
      [
        {
          "v": "מלאו את העמודות \"מתוכנן\" ו\"בפועל\" (התאים הצהובים) — הסה\"כ מתעדכן אוטומטית",
          "fill": null,
          "bold": false,
          "color": "666666",
          "size": 10.0
        }
      ],
      [],
      [
        {
          "v": "קטגוריה",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "סוג",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "מתוכנן (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "בפועל (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        },
        {
          "v": "הפרש (₪)",
          "fill": "1F5C4E",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "משכורת",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הכנסה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "12000",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "12000",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "הכנסה נוספת",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הכנסה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "1000",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "800",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "שכירות / משכנתא",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "4500",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "4500",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "חשמל, מים וארנונה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "900",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "950",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סופרמרקט",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "2200",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "2450",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "תחבורה ודלק",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "800",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "720",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "ביטוחים",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "600",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "600",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "בילויים ופנאי",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "700",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "900",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "חיסכון",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "1500",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "1500",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [
        {
          "v": "אחר",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "הוצאה",
          "fill": null,
          "bold": false,
          "color": "222222",
          "size": 11.0
        },
        {
          "v": "400",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        },
        {
          "v": "350",
          "fill": "FFF9C4",
          "bold": false,
          "color": "0000FF",
          "size": 11.0
        }
      ],
      [],
      [
        {
          "v": "סיכום",
          "fill": null,
          "bold": true,
          "color": "1F5C4E",
          "size": 13.0
        }
      ],
      [
        {
          "v": "סה\"כ הכנסות",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "סה\"כ הוצאות",
          "fill": null,
          "bold": true,
          "color": "222222",
          "size": 11.0
        }
      ],
      [
        {
          "v": "יתרה (מאזן)",
          "fill": "C99A3B",
          "bold": true,
          "color": "FFFFFF",
          "size": 11.0
        }
      ]
    ]
  }
};
