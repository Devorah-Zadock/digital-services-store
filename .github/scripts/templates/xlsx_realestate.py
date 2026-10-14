"""Real-estate developer templates: apartment sales vs buyers, and a
construction budget for a building project."""
import datetime as dt

from xlsx_lib import (OK_FILL, OK_FONT, RED_FILL, RED_FONT, AMBER_FILL, AMBER_FONT, lists_sheet, q)

TODAY = dt.date.today()


# ---------------------------------------------------------------- apartment sales
def apartment_sales(book):
    L = book.L
    statuses = [L(*x) for x in [("פנויה", "Available"), ("שמורה / במו״מ", "Reserved"), ("נחתם חוזה", "Contract signed"), ("נמסרה", "Handed over")]]
    stages = [L(*x) for x in [("מקדמה בחתימת חוזה", "Deposit at signing"), ("השלמת יסודות", "Foundations done"), ("השלמת שלד", "Frame done"),
                              ("טיח וחלונות", "Plaster & windows"), ("גמר", "Finishing"), ("מסירת מפתח", "Key handover"), ("אחר", "Other")]]
    lst, _ = lists_sheet(book, [
        ("AptStatus", L("סטטוס דירה", "Unit status"), statuses, 10),
        ("PayStages", L("שלבי תשלום", "Payment stages"), stages, 15),
    ])
    available, reserved, signed, handed = statuses

    # -- payments sheet first (the main sheet sums from it), moved after the main one below
    p = book.sheet(L("תשלומי רוכשים", "Buyer payments"), [12, 22, 22, 14, 15, 15, 14, 13, 26])
    p.title(L("תשלומי רוכשים לפי שלבים", "Buyer payments by stage"),
            L("שורה לכל תשלום: מספר הדירה, שלב, מועד וסכום לפי החוזה, וכמה שולם בפועל. שם הקונה נמשך אוטומטית מגיליון הדירות, ותשלום שמועדו עבר ולא שולם נצבע באדום.",
              "One row per payment: unit number, stage, due date and amount per the contract, and what was actually paid. The buyer's name comes from the units sheet; an overdue unpaid payment turns red."), 9)
    pf, pl = 8, 507
    PR = lambda c: f"${c}${pf}:${c}${pl}"
    p.kpi("A4", "B4", L("סה״כ לגבייה לפי חוזים", "Total due per contracts") + L.cur, f"=SUM({PR('E')})", L.money)
    p.kpi("A5", "B5", L("נגבה בפועל", "Collected") + L.cur, f"=SUM({PR('F')})", L.money)
    p.kpi("D4", "E4", L("בפיגור (מועד עבר)", "Overdue") + L.cur,
          f'=SUMPRODUCT(({PR("D")}<>"")*({PR("D")}<TODAY())*({PR("E")}-{PR("F")}>0)*({PR("E")}-{PR("F")}))', L.money)
    p.kpi("D5", "E5", L("לגבייה ב-30 הימים הקרובים", "Due in the next 30 days") + L.cur,
          f'=SUMPRODUCT(({PR("D")}>=TODAY())*({PR("D")}<=TODAY()+30)*({PR("E")}-{PR("F")}>0)*({PR("E")}-{PR("F")}))', L.money)
    p.rule("E4", "E4>0")
    p.header(7, [L("מס׳ דירה", "Unit no."), L("רוכש/ת", "Buyer"), L("שלב", "Stage"), L("מועד לפי חוזה", "Due date"), L("סכום לפי חוזה", "Amount due") + L.cur,
                 L("שולם בפועל", "Paid") + L.cur, L("תאריך תשלום", "Paid on"), L("מצב", "Status"), L("הערות (הצמדה, אסמכתא...)", "Notes (indexation, reference...)")])

    # -- main sheet
    s = book.sheet(L("דירות ומכירות", "Units & sales"), [10, 9, 10, 8, 10, 10, 15, 15, 20, 14, 15, 14, 14, 15, 11, 13, 24])
    s.title(L("מלאי דירות ומכירות — פרויקט יזמי", "Unit inventory & sales — development project"),
            L("שורה לכל דירה: נתונים, מחיר מחירון, סטטוס, והקונה. אחרי חתימה ממלאים מחיר סופי, ואת התשלומים בגיליון ״תשלומי רוכשים״ — כמה שולם וכמה נשאר מתעדכן כאן לבד.",
              "One row per unit: details, list price, status and buyer. Once signed, enter the final price and log payments on the 'Buyer payments' sheet — paid and balance update here by themselves."), 17)
    s.label("A4", L("שם הפרויקט", "Project"), bold=True); s.inp("B4", L("מגדלי הגפן, רחובות", "Vine Towers"))
    s.ws.merge_cells("B4:D4")
    first, last = 12, 311
    R = lambda c: f"${c}${first}:${c}${last}"
    sold_cond = f'({R("H")}="{signed}")+({R("H")}="{handed}")'
    s.kpi("A5", "C5", L("דירות בפרויקט", "Units"), f"=COUNTA({R('C')})", L.num)
    s.kpi("A6", "C6", L("נמכרו (חוזה / נמסרו)", "Sold (signed / handed over)"), f'=COUNTIF({R("H")},"{signed}")+COUNTIF({R("H")},"{handed}")', L.num)
    s.kpi("A7", "C7", L("שמורות / במו״מ", "Reserved"), f'=COUNTIF({R("H")},"{reserved}")', L.num)
    s.kpi("A8", "C8", L("פנויות", "Available"), f'=COUNTIF({R("H")},"{available}")', L.num)
    s.kpi("A9", "C9", L("אחוז מכירות", "Sold %"), "=IFERROR(C6/C5,0)", L.pct)
    s.kpi("E5", "G5", L("שווי מכירות (חוזים)", "Sales value (signed)") + L.cur, f"=SUMPRODUCT(({sold_cond})*({R('G')}))", L.money)
    s.kpi("E6", "G6", L("נגבה מהרוכשים", "Collected from buyers") + L.cur, f"=SUM({R('K')})", L.money)
    s.kpi("E7", "G7", L("נשאר לגבות", "Left to collect") + L.cur, "=G5-G6", L.money)
    s.kpi("E8", "G8", L("מלאי פנוי לפי מחירון", "Unsold stock at list price") + L.cur, f'=SUMPRODUCT(({R("H")}<>"{signed}")*({R("H")}<>"{handed}")*({R("C")}<>"")*({R("F")}))', L.money)
    s.kpi("E9", "G9", L("מחיר ממוצע למ״ר (נמכרו)", "Avg price per m² (sold)") + L.cur, f"=IFERROR(SUMPRODUCT(({sold_cond})*({R('G')}))/SUMPRODUCT(({sold_cond})*({R('E')})),0)", L.money)
    s.header(11, [L("בניין", "Building"), L("קומה", "Floor"), L("מס׳ דירה", "Unit no."), L("חדרים", "Rooms"), L("שטח (מ״ר)", "Area (m²)"),
                  L("מחיר מחירון", "List price") + L.cur, L("מחיר סופי", "Final price") + L.cur, L("סטטוס", "Status"), L("רוכש/ת", "Buyer"), L("טלפון", "Phone"),
                  L("שולם", "Paid") + L.cur, L("יתרה", "Balance") + L.cur, L("אחוז ששולם", "% paid"), L("מחיר למ״ר", "Price per m²") + L.cur,
                  L("תאריך חוזה", "Contract date"), L("חניה / מחסן", "Parking / storage"), L("הערות", "Notes")])
    b = L("בניין A", "Building A")
    ex = [(b, 1, "A-1", 4, 105, 2350000, 2290000, signed, L("משפחת כהן", "Cohen family"), "050-0000000"),
          (b, 1, "A-2", 3, 85, 1950000, None, reserved, L("דנה לוי", "Dana Levi"), "052-0000000"),
          (b, 2, "A-3", 5, 128, 2890000, 2850000, signed, L("יוסי ומיכל אברהם", "Yossi & Michal Avraham"), "054-0000000"),
          (b, 2, "A-4", 4, 104, 2390000, None, available, None, None),
          (b, 3, "A-5", 4, 104, 2420000, None, available, None, None),
          (b, 4, "A-6", 5, 140, 3450000, 3400000, handed, L("רון גולן", "Ron Golan"), "053-0000000")]
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
                 {"B": L.num, "D": L.num1, "E": L.num, "F": L.money, "G": L.money}, ex, {"B": "center", "C": "center", "D": "center", "J": "center"})
    s.rows_input(first, last, ["O", "P", "Q"], {"O": L.date},
                 [(TODAY - dt.timedelta(days=200), L("חניה 12, מחסן 3", "Parking 12, storage 3")), (None,), (TODAY - dt.timedelta(days=120), L("2 חניות", "2 parking spaces")),
                  (None,), (None,), (TODAY - dt.timedelta(days=700), L("חניה 1", "Parking 1"))], {"O": "center"})
    ps = q(p.ws.title)
    s.rows_calc(first, last, "K", f'=IF(C{{r}}="","",SUMIF({ps}!$A${pf}:$A${pl},C{{r}},{ps}!$F${pf}:$F${pl}))', L.money)
    s.rows_calc(first, last, "L", f'=IF(OR(C{{r}}="",AND(H{{r}}<>"{signed}",H{{r}}<>"{handed}")),"",IF(G{{r}}="",F{{r}},G{{r}})-N(K{{r}}))', L.money)
    s.rows_calc(first, last, "M", f'=IF(L{{r}}="","",IFERROR(N(K{{r}})/IF(G{{r}}="",F{{r}},G{{r}}),0))', L.pct, align="center")
    s.rows_calc(first, last, "N", '=IF(OR(C{r}="",N(E{r})=0),"",IF(G{r}="",F{r},G{r})/E{r})', L.money)
    s.dropdown(f"H{first}:H{last}", "=AptStatus")
    s.number_rule(f"E{first}:G{last}")
    s.status_colors(f"H{first}:H{last}", [(available, OK_FILL, OK_FONT), (reserved, AMBER_FILL, AMBER_FONT), (signed, "DCE8F5", "1F4E8C"), (handed, "ECECEC", "444444")])
    s.databar(f"M{first}:M{last}")
    s.freeze(f"D{first}")

    # -- payment rows (examples tie to the units above)
    pex = [("A-1", stages[0], TODAY - dt.timedelta(days=200), 458000, 458000, TODAY - dt.timedelta(days=200)),
           ("A-1", stages[2], TODAY - dt.timedelta(days=20), 687000, 400000, TODAY - dt.timedelta(days=15)),
           ("A-1", stages[5], TODAY + dt.timedelta(days=300), 1145000, None, None),
           ("A-3", stages[0], TODAY - dt.timedelta(days=120), 570000, 570000, TODAY - dt.timedelta(days=118)),
           ("A-3", stages[2], TODAY + dt.timedelta(days=20), 855000, None, None),
           ("A-6", stages[0], TODAY - dt.timedelta(days=700), 3400000, 3400000, TODAY - dt.timedelta(days=690))]
    p.rows_input(pf, pl, ["A"], None, [(x[0],) for x in pex], {"A": "center"})
    p.rows_input(pf, pl, ["C", "D", "E", "F", "G", "I"], {"D": L.date, "E": L.money, "F": L.money, "G": L.date}, [x[1:] for x in pex], {"D": "center", "G": "center"})
    ms = q(s.ws.title)
    p.rows_calc(pf, pl, "B", f'=IF(A{{r}}="","",IFERROR(INDEX({ms}!$I${first}:$I${last},MATCH(A{{r}},{ms}!$C${first}:$C${last},0))&"",""))')
    paid, part, late, future = L("שולם", "Paid"), L("שולם חלקית", "Part paid"), L("באיחור", "Overdue"), L("עתידי", "Upcoming")
    p.rows_calc(pf, pl, "H", f'=IF(E{{r}}="","",IF(N(F{{r}})>=E{{r}},"{paid}",IF(AND(D{{r}}<>"",D{{r}}<TODAY()),"{late}",IF(N(F{{r}})>0,"{part}","{future}"))))', align="center")
    p.dropdown(f"C{pf}:C{pl}", "=PayStages")
    p.number_rule(f"E{pf}:F{pl}")
    p.status_colors(f"H{pf}:H{pl}", [(paid, OK_FILL, OK_FONT), (part, AMBER_FILL, AMBER_FONT), (late, RED_FILL, RED_FONT)])
    p.freeze(f"B{pf}")
    book.wb._sheets = [s.ws, p.ws, lst.ws]
    return {"main": s, "rows": (11, 17)}


# ---------------------------------------------------------------- construction budget
def construction_budget(book):
    L = book.L
    cats = [L(*x) for x in [("קרקע ומיסוי", "Land & taxes"), ("תכנון והיתרים", "Design & permits"), ("אגרות והיטלים", "Fees & levies"),
                            ("עבודות עפר ויסודות", "Earthworks & foundations"), ("שלד", "Structure"), ("אינסטלציה", "Plumbing"), ("חשמל ותקשורת", "Electrical"),
                            ("איטום", "Waterproofing"), ("אלומיניום וחלונות", "Aluminium & windows"), ("טיח וצבע", "Plaster & paint"), ("ריצוף וחיפוי", "Flooring & cladding"),
                            ("מטבחים ונגרות", "Kitchens & carpentry"), ("מעליות", "Lifts"), ("מיזוג אוויר", "Air conditioning"), ("פיתוח וגינון", "Landscaping"),
                            ("פיקוח וניהול פרויקט", "Supervision & PM"), ("מימון וליווי בנקאי", "Finance & bank"), ("ביטוחים", "Insurance"),
                            ("שיווק ומכירות", "Marketing & sales"), ("משפטי", "Legal"), ("בלתי צפוי", "Contingency"), ("אחר", "Other")]]
    lst, _ = lists_sheet(book, [("BuildCats", L("קטגוריות", "Categories"), cats, 35)])
    s = book.sheet(L("תקציב בנייה", "Construction budget"), [22, 24, 18, 15, 15, 15, 15, 14, 11, 14, 13, 24])
    book.wb.move_sheet(s.ws, offset=-1)
    s.title(L("תקציב בניית בניין — תכנון מול ביצוע", "Building construction budget — plan vs actual"),
            L("בתחילת הפרויקט רושמים כמה תכננתם לכל סעיף. במהלך הבנייה מוסיפים את המחיר שסגרתם בפועל עם הקבלן וכמה שילמתם — והגיליון מראה איפה חרגתם, כמה נשאר לשלם, ועלות למ״ר וליחידה.",
              "One row per line item: planned budget, signed contract and what was paid. See overruns per item, what's left to pay, cost per m² and per unit, and how much contingency is left."), 12)
    s.label("A4", L("שם הפרויקט", "Project"), bold=True); s.inp("B4", L("בניין מגורים, רח׳ הגפן 12", "Residential building, 12 Vine St"))
    s.label("A5", L("מספר יחידות דיור", "Housing units"), bold=True); s.inp("B5", 24, L.num)
    s.label("A6", L("שטח בנוי כולל (מ״ר)", "Total built area (m²)"), bold=True); s.inp("B6", 3200, L.num)
    s.label("A7", L("רזרבה לבלתי צפוי", "Contingency reserve"), bold=True); s.inp("B7", 0.07, L.pct)
    first, last = 10, 209
    R = lambda c: f"${c}${first}:${c}${last}"
    s.kpi("D4", "E4", L("תכנון מקורי (סה״כ)", "Original plan (total)") + L.cur, f"=SUM({R('D')})", L.money)
    s.kpi("D5", "E5", L("כולל רזרבה", "Incl. contingency") + L.cur, "=E4*(1+B7)", L.money)
    s.kpi("D6", "E6", L("צפי עלות בפועל", "Actual cost forecast") + L.cur, f"=SUM({R('E')})+SUMIF({R('E')},\"\",{R('D')})", L.money)
    s.kpi("D7", "E7", L("נשאר מול התכנון", "Left vs plan") + L.cur, "=E4-E6", L.money)
    s.kpi("G4", "H4", L("שולם עד עכשיו", "Paid so far") + L.cur, f"=SUM({R('F')})", L.money)
    s.kpi("G5", "H5", L("נשאר לשלם", "Left to pay") + L.cur, "=E6-H4", L.money)
    s.kpi("G6", "H6", L("עלות למ״ר", "Cost per m²") + L.cur, "=IFERROR(E6/B6,0)", L.money)
    s.kpi("G7", "H7", L("עלות ליחידת דיור", "Cost per unit") + L.cur, "=IFERROR(E6/B5,0)", L.money)
    s.kpi("J4", "K4", L("רזרבה שנותרה", "Contingency left") + L.cur, "=E5-E6", L.money)
    s.kpi("J5", "K5", L("ביצוע תשלומים", "Paid vs forecast"), "=IFERROR(H4/E6,0)", L.pct)
    s.negative_red("E7"); s.negative_red("K4")
    s.header(9, [L("קטגוריה", "Category"), L("סעיף", "Item"), L("ספק / קבלן", "Supplier / contractor"), L("תכנון מקורי", "Original plan") + L.cur,
                  L("מחיר שנסגר בפועל", "Actual agreed price") + L.cur, L("שולם", "Paid") + L.cur, L("יתרה לתשלום", "Left to pay") + L.cur, L("חריגה", "Variance") + L.cur,
                  L("חריגה %", "Variance %"), L("תשלום הבא", "Next payment"), L("מצב", "Status"), L("הערות", "Notes")])
    ex = [(cats[0], L("רכישת קרקע", "Land purchase"), L("בעלי הקרקע", "Land owners"), 9500000, 9500000, 9500000),
          (cats[1], L("אדריכל", "Architect"), L("משרד אדריכלים", "Architects office"), 420000, 450000, 300000),
          (cats[2], L("היטל השבחה ואגרות בנייה", "Betterment levy & permit fees"), L("הוועדה המקומית", "Local committee"), 1300000, 1240000, 1240000),
          (cats[4], L("שלד קומות 1-8", "Frame floors 1-8"), L("קבלן שלד", "Frame contractor"), 6800000, 7150000, 2100000),
          (cats[5], L("אינסטלציה", "Plumbing"), L("קבלן אינסטלציה", "Plumbing contractor"), 900000, None, 0),
          (cats[12], L("2 מעליות", "2 lifts"), L("חברת מעליות", "Lift company"), 640000, 610000, 120000)]
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F"], {"D": L.money, "E": L.money, "F": L.money}, ex)
    s.rows_input(first, last, ["J", "L"], {"J": L.date}, [(None,), (TODAY + dt.timedelta(days=14),), (None,), (TODAY + dt.timedelta(days=5),), (TODAY + dt.timedelta(days=90),), (TODAY + dt.timedelta(days=60),)], {"J": "center"})
    s.rows_calc(first, last, "G", '=IF(AND(D{r}="",E{r}=""),"",IF(E{r}="",D{r},E{r})-N(F{r}))', L.money)
    s.rows_calc(first, last, "H", '=IF(OR(D{r}="",E{r}=""),"",E{r}-D{r})', L.money)
    s.rows_calc(first, last, "I", '=IF(H{r}="","",IFERROR(H{r}/D{r},0))', L.pct1, align="center")
    over, ok, paid = L("חריגה", "Over budget"), L("בתקציב", "On budget"), L("שולם במלואו", "Fully paid")
    s.rows_calc(first, last, "K", f'=IF(AND(D{{r}}="",E{{r}}=""),"",IF(N(G{{r}})<=0,"{paid}",IF(N(H{{r}})>0,"{over}","{ok}")))', align="center")
    # forecast per row for the category summary lives in column M (hidden helper)
    s.rows_calc(first, last, "M", '=IF(AND(D{r}="",E{r}=""),"",IF(E{r}="",D{r},E{r}))', L.money)
    s.ws.column_dimensions["M"].hidden = True
    s.dropdown(f"A{first}:A{last}", "=BuildCats")
    s.number_rule(f"D{first}:F{last}")
    s.status_colors(f"K{first}:K{last}", [(paid, OK_FILL, OK_FONT), (over, RED_FILL, RED_FONT)])
    s.rule(f"J{first}:J{last}", f'AND(J{first}<>"",J{first}<=TODAY()+7,N(G{first})>0)', AMBER_FILL, AMBER_FONT)
    s.freeze(f"C{first}")
    # summary by category on its own sheet, so the main sheet's frozen top stays short
    m = q(s.ws.title)
    sm = book.sheet(L("סיכום לפי קטגוריה", "By category"), [26, 16, 16, 16, 16])
    sm.title(L("סיכום לפי קטגוריה", "Summary by category"),
             L("מתעדכן לבד מגיליון ״תקציב בנייה״. הקטגוריות נלקחות מגיליון הרשימות.", "Updates by itself from the budget sheet. Categories come from the Lists sheet."), 5)
    sm.header(4, [L("קטגוריה", "Category"), L("תכנון מקורי", "Original plan") + L.cur, L("צפי בפועל", "Actual forecast") + L.cur,
                  L("הפרש", "Difference") + L.cur, L("שולם", "Paid") + L.cur])
    MR = lambda c: f"{m}!${c}${first}:${c}${last}"
    for i in range(35):
        r = 5 + i
        sm.calc(f"A{r}", f'=IF({q(lst.ws.title)}!A{5 + i}="","",{q(lst.ws.title)}!A{5 + i})', align=sm.align)
        sm.calc(f"B{r}", f'=IF(A{r}="","",SUMIF({MR("A")},A{r},{MR("D")}))', L.money)
        sm.calc(f"C{r}", f'=IF(A{r}="","",SUMIF({MR("A")},A{r},{MR("M")}))', L.money)
        sm.calc(f"D{r}", f'=IF(A{r}="","",C{r}-B{r})', L.money)
        sm.calc(f"E{r}", f'=IF(A{r}="","",SUMIF({MR("A")},A{r},{MR("F")}))', L.money)
    sm.total("A41", L("סה״כ", "Total")); sm.total("B41", "=SUM(B5:B39)", L.money); sm.total("C41", "=SUM(C5:C39)", L.money)
    sm.total("D41", "=SUM(D5:D39)", L.money); sm.total("E41", "=SUM(E5:E39)", L.money)
    sm.rule("D5:D39", 'AND(D5<>"",D5>0)')
    sm.freeze("A5")
    book.wb._sheets = [s.ws, sm.ws, lst.ws]
    return {"main": s, "rows": (9, 15)}
