"""Customers, sales, operations, projects, staff and personal templates."""
import datetime as dt

from openpyxl.chart import BarChart, Reference
from openpyxl.chart.series import SeriesLabel
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Font, PatternFill

from xlsx_lib import (GREEN, GREEN_LIGHT, OK_FILL, OK_FONT, RED_FILL, RED_FONT, AMBER_FILL, AMBER_FONT,
                      lists_sheet, q, col)
from xlsx_finance import months

TODAY = dt.date.today()


# ---------------------------------------------------------------- clients
def client_tracker(book):
    L = book.L
    statuses = [L(*x) for x in [("ליד חדש", "New lead"), ("בטיפול", "In progress"), ("הצעה נשלחה", "Quote sent"), ("לקוח פעיל", "Active client"), ("לא רלוונטי", "Not relevant")]]
    lst, _ = lists_sheet(book, [
        ("Statuses", L("סטטוסים", "Statuses"), statuses, 12),
        ("Sources", L("מקור הפנייה", "Lead sources"), [L(*x) for x in [("המלצה", "Referral"), ("אתר", "Website"), ("פייסבוק", "Facebook"), ("אינסטגרם", "Instagram"), ("גוגל", "Google"), ("וואטסאפ", "WhatsApp"), ("אחר", "Other")]], 15),
    ])
    s = book.sheet(L("לקוחות", "Clients"), [20, 14, 24, 13, 14, 13, 13, 14, 30])
    book.wb.move_sheet(s.ws, offset=-1)
    s.title(L("מעקב לקוחות ולידים", "Clients & leads tracker"),
            L("כל לקוח או ליד בשורה. בוחרים סטטוס ומקור מהרשימה, ורושמים מתי לחזור אליו — שורה שמועד המעקב שלה הגיע נצבעת באדום, כדי ששום ליד לא יישכח.",
              "One client or lead per row. Pick a status and source from the list and set a follow-up date — rows whose follow-up is due turn red, so no lead is forgotten."), 9)
    first, last = 14, 513
    R = lambda c: f"${c}${first}:${c}${last}"
    closed = (statuses[3], statuses[4])
    s.kpi("A4", "B4", L("סה״כ ברשימה", "Total in list"), f"=COUNTA({R('A')})", L.num)
    s.kpi("A5", "B5", L("מעקבים להיום ובאיחור", "Follow-ups due"), f'=COUNTIFS({R("G")},"<="&TODAY(),{R("E")},"<>{closed[0]}",{R("E")},"<>{closed[1]}")', L.num)
    s.kpi("A6", "B6", L("שווי עסקאות פתוחות", "Open pipeline value") + L.cur, f'=SUMIFS({R("H")},{R("E")},"<>{closed[0]}",{R("E")},"<>{closed[1]}")', L.money)
    s.rule("B5", "B5>0")
    s.header(4, [L("סטטוס", "Status"), L("כמה", "Count"), L("שווי", "Value") + L.cur], start=4)
    for i, st in enumerate(statuses):
        r = 5 + i
        s.calc(f"D{r}", f"={q(lst.ws.title)}!A{5 + i}", align=s.align)
        s.calc(f"E{r}", f'=IF(D{r}="","",COUNTIF({R("E")},D{r}))', L.num, align="center")
        s.calc(f"F{r}", f'=IF(D{r}="","",SUMIF({R("E")},D{r},{R("H")}))', L.money)
    s.header(13, [L("שם", "Name"), L("טלפון", "Phone"), L("אימייל", "Email"), L("מקור", "Source"), L("סטטוס", "Status"), L("פנייה ראשונה", "First contact"),
                  L("מעקב הבא", "Next follow-up"), L("שווי עסקה", "Deal value") + L.cur, L("הערות", "Notes")])
    ex = [(L("דנה כהן", "Dana Cohen"), "050-1234567", "dana@example.com", L("המלצה", "Referral"), statuses[3], TODAY - dt.timedelta(days=40), None, 4800, L("מעוניינת בחבילה מלאה", "Wants the full package")),
          (L("יוסי לוי", "Yossi Levi"), "052-9876543", "yossi@example.com", L("אתר", "Website"), statuses[2], TODAY - dt.timedelta(days=6), TODAY - dt.timedelta(days=1), 3500, L("לחזור אליו לגבי ההצעה", "Follow up on the quote")),
          (L("שירה אברהם", "Shira Abraham"), "054-5551234", "shira@example.com", L("אינסטגרם", "Instagram"), statuses[0], TODAY - dt.timedelta(days=1), TODAY + dt.timedelta(days=2), 1200, ""),
          (L("אורי מזרחי", "Uri Mizrahi"), "053-1112223", "uri@example.com", L("גוגל", "Google"), statuses[1], TODAY - dt.timedelta(days=10), TODAY, 2000, L("שלחתי דוגמאות", "Sent samples")),
          (L("מיכל דגן", "Michal Dagan"), "050-7778889", "michal@example.com", L("המלצה", "Referral"), statuses[4], TODAY - dt.timedelta(days=60), None, 0, L("בחרה ספק אחר", "Chose another supplier"))]
    s.rows_input(first, last, list("ABCDEFGHI"), {"F": L.date, "G": L.date, "H": L.money}, ex, {"B": "center"})
    s.dropdown(f"D{first}:D{last}", "=Sources")
    s.dropdown(f"E{first}:E{last}", "=Statuses")
    s.rule(f"G{first}:G{last}", f'AND(G{first}<>"",G{first}<=TODAY(),E{first}<>"{closed[0]}",E{first}<>"{closed[1]}")')
    s.status_colors(f"E{first}:E{last}", [(statuses[3], OK_FILL, OK_FONT), (statuses[2], AMBER_FILL, AMBER_FONT)])
    s.freeze(f"B{first}")
    s.ws.auto_filter.ref = f"A13:I{last}"
    return {"main": s, "rows": (13, 18)}


# ---------------------------------------------------------------- inventory
def inventory(book):
    L = book.L
    s = book.sheet(L("מלאי", "Inventory"), [24, 12, 16, 16, 11, 12, 12, 13, 13, 14, 14, 13])
    s.title(L("מעקב מלאי", "Inventory tracker"),
            L("לכל פריט: כמות במלאי, מתי להזמין שוב (נקודת הזמנה), עלות ומחיר. שווי המלאי, הכמות המומלצת להזמנה והסטטוס מחושבים לבד — פריט שנגמר או צריך הזמנה נצבע.",
              "For each item: quantity, reorder point, cost and price. Stock value, suggested order quantity and status are calculated — items out of stock or due for reorder are highlighted."), 12)
    first, last = 10, 509
    R = lambda c: f"${c}${first}:${c}${last}"
    ok, reorder, out = L("תקין", "OK"), L("להזמין", "Reorder"), L("אזל", "Out of stock")
    s.kpi("A4", "B4", L("שווי מלאי (עלות)", "Stock value (cost)") + L.cur, f"=SUM({R('J')})", L.money)
    s.kpi("A5", "B5", L("שווי מלאי (מחיר מכירה)", "Stock value (retail)") + L.cur, f"=SUM({R('K')})", L.money)
    s.kpi("A6", "B6", L("פריטים להזמנה", "Items to reorder"), f'=COUNTIF({R("L")},"{reorder}")', L.num)
    s.kpi("A7", "B7", L("פריטים שאזלו", "Out of stock"), f'=COUNTIF({R("L")},"{out}")', L.num)
    s.rule("B7", "B7>0")
    s.header(9, [L("פריט", "Item"), L("מק״ט", "SKU"), L("קטגוריה", "Category"), L("ספק", "Supplier"), L("כמות במלאי", "In stock"), L("נקודת הזמנה", "Reorder point"),
                 L("להזמין (מומלץ)", "Suggested order"), L("עלות ליחידה", "Unit cost") + L.cur, L("מחיר מכירה", "Unit price") + L.cur,
                 L("שווי בעלות", "Value at cost") + L.cur, L("שווי במכירה", "Value at price") + L.cur, L("סטטוס", "Status")])
    ex = [(L("חולצת כותנה לבנה", "White cotton T-shirt"), "SKU-1001", L("ביגוד", "Clothing"), L("ספק א׳", "Supplier A"), 42, 15, None, 35, 89),
          (L("חולצת כותנה שחורה", "Black cotton T-shirt"), "SKU-1002", L("ביגוד", "Clothing"), L("ספק א׳", "Supplier A"), 8, 15, None, 35, 89),
          (L("מכנסי ג׳ינס", "Jeans"), "SKU-1003", L("ביגוד", "Clothing"), L("ספק ב׳", "Supplier B"), 25, 10, None, 90, 199),
          (L("נעלי ספורט", "Sneakers"), "SKU-1004", L("הנעלה", "Footwear"), L("ספק ג׳", "Supplier C"), 0, 8, None, 140, 329),
          (L("כובע מצחייה", "Cap"), "SKU-1005", L("אביזרים", "Accessories"), L("ספק ב׳", "Supplier B"), 60, 20, None, 25, 59),
          (L("תיק גב", "Backpack"), "SKU-1006", L("אביזרים", "Accessories"), L("ספק ג׳", "Supplier C"), 3, 5, None, 180, 349)]
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F"], {"E": L.num, "F": L.num}, [x[:6] for x in ex], {"B": "center"})
    s.rows_input(first, last, ["H", "I"], {"H": L.money2, "I": L.money2}, [x[7:] for x in ex])
    s.rows_calc(first, last, "G", '=IF(OR(E{r}="",F{r}=""),"",IF(E{r}<=F{r},F{r}*2-E{r},0))', L.num)
    s.rows_calc(first, last, "J", '=IF(OR(E{r}="",H{r}=""),"",E{r}*H{r})', L.money)
    s.rows_calc(first, last, "K", '=IF(OR(E{r}="",I{r}=""),"",E{r}*I{r})', L.money)
    s.rows_calc(first, last, "L", f'=IF(OR(A{{r}}="",E{{r}}=""),"",IF(E{{r}}<=0,"{out}",IF(E{{r}}<=N(F{{r}}),"{reorder}","{ok}")))', align="center")
    s.number_rule(f"E{first}:I{last}")
    s.status_colors(f"L{first}:L{last}", [(out, RED_FILL, RED_FONT), (reorder, AMBER_FILL, AMBER_FONT), (ok, OK_FILL, OK_FONT)])
    s.freeze(f"B{first}")
    s.ws.auto_filter.ref = f"A9:L{last}"
    return {"main": s, "rows": (9, 15)}


# ---------------------------------------------------------------- project timeline + gantt
def project_timeline(book):
    L = book.L
    weeks = 20
    s = book.sheet(L("לוח זמנים", "Timeline"), [28, 13, 13, 13, 9, 11, 13] + [4.2] * weeks)
    s.title(L("לוח זמנים לפרויקט — עם תרשים גאנט", "Project timeline — with a Gantt chart"),
            L("לכל משימה: אחראי, תאריך התחלה וסיום, ואחוז השלמה. המשך, הסטטוס והפסים בתרשים מתעדכנים לבד; הקו הכתום הוא השבוע הנוכחי.",
              "For each task: owner, start and end dates and % complete. Duration, status and the chart bars update by themselves; the orange column is the current week."), 7 + weeks)
    first, last = 9, 68
    R = lambda c: f"${c}${first}:${c}${last}"
    done, late, prog, wait = L("הושלם", "Done"), L("באיחור", "Late"), L("בתהליך", "In progress"), L("טרם התחיל", "Not started")
    s.kpi("A4", "B4", L("התקדמות כוללת", "Overall progress"), f'=IFERROR(SUMPRODUCT({R("E")},{R("F")})/SUM({R("E")}),0)', L.pct)
    s.kpi("A5", "B5", L("משימות באיחור", "Late tasks"), f'=COUNTIF({R("G")},"{late}")', L.num)
    s.kpi("A6", "B6", L("סיום מתוכנן", "Planned finish"), f'=IF(COUNT({R("D")})=0,"",MAX({R("D")}))', L.date)
    s.rule("B5", "B5>0")
    s.label("D4", L("תחילת התרשים:", "Chart starts:"), bold=True)
    s.calc("E4", f'=IF(COUNT({R("C")})=0,TODAY(),MIN({R("C")}))-WEEKDAY(IF(COUNT({R("C")})=0,TODAY(),MIN({R("C")})))+1', L.date)
    s.ws.merge_cells("E4:F4")
    s.header(8, [L("משימה", "Task"), L("אחראי", "Owner"), L("התחלה", "Start"), L("סיום", "End"), L("ימים", "Days"), L("% השלמה", "% done"), L("סטטוס", "Status")])
    for k in range(weeks):
        c = col(8 + k)
        s.put(f"{c}8", f"=$E$4+{7 * k}", fmt="dd/mm", bold=True, color="FFFFFF", fill=GREEN, align="center")
        s.ws[f"{c}8"].alignment = s.ws[f"{c}8"].alignment.copy(textRotation=90)
    s.ws.row_dimensions[8].height = 44
    base = TODAY - dt.timedelta(days=TODAY.weekday() + 1 + 14)
    d = lambda n: base + dt.timedelta(days=n)
    ex = [(L("איסוף דרישות", "Gather requirements"), L("דנה", "Dana"), d(0), d(5), None, 1),
          (L("אפיון ועיצוב", "Spec & design"), L("יוסי", "Yossi"), d(6), d(16), None, 0.8),
          (L("פיתוח שלב א׳", "Build — phase 1"), L("דנה", "Dana"), d(14), d(35), None, 0.3),
          (L("תוכן וצילומים", "Content & photos"), L("רותם", "Rotem"), d(20), d(30), None, 0),
          (L("בדיקות", "Testing"), L("רותם", "Rotem"), d(36), d(45), None, 0),
          (L("השקה", "Launch"), L("יוסי", "Yossi"), d(46), d(48), None, 0)]
    s.rows_input(first, last, ["A", "B", "C", "D"], {"C": L.date, "D": L.date}, [x[:4] for x in ex])
    s.rows_input(first, last, ["F"], {"F": L.pct}, [(x[5],) for x in ex], {"F": "center"})
    s.rows_calc(first, last, "E", '=IF(OR(C{r}="",D{r}=""),"",D{r}-C{r}+1)', "0", align="center")
    s.rows_calc(first, last, "G", f'=IF(A{{r}}="","",IF(N(F{{r}})>=1,"{done}",IF(AND(D{{r}}<>"",TODAY()>D{{r}}),"{late}",IF(AND(C{{r}}<>"",TODAY()<C{{r}}),"{wait}","{prog}"))))', align="center")
    for r in range(first, last + 1):
        for k in range(weeks):
            s.put(f"{col(8 + k)}{r}", None, border=False)
    grid = f"H{first}:{col(7 + weeks)}{last}"
    # today's week, then task bars (done part darker)
    s.ws.conditional_formatting.add(grid, FormulaRule(
        formula=[f"AND($C{first}<>\"\",H$8<=$D{first},H$8+6>=$C{first},$G{first}=\"{done}\")"], fill=PatternFill("solid", fgColor="5B9B87", bgColor="5B9B87"), stopIfTrue=True))
    s.ws.conditional_formatting.add(grid, FormulaRule(
        formula=[f"AND($C{first}<>\"\",H$8<=$D{first},H$8+6>=$C{first},$G{first}=\"{late}\")"], fill=PatternFill("solid", fgColor="E57373", bgColor="E57373"), stopIfTrue=True))
    s.ws.conditional_formatting.add(grid, FormulaRule(
        formula=[f"AND($C{first}<>\"\",H$8<=$D{first},H$8+6>=$C{first})"], fill=PatternFill("solid", fgColor="A8D5C5", bgColor="A8D5C5"), stopIfTrue=True))
    s.ws.conditional_formatting.add(grid, FormulaRule(
        formula=[f"AND(TODAY()>=H$8,TODAY()<H$8+7)"], fill=PatternFill("solid", fgColor="FBE3C8", bgColor="FBE3C8")))
    s.status_colors(f"G{first}:G{last}", [(done, OK_FILL, OK_FONT), (late, RED_FILL, RED_FONT), (prog, AMBER_FILL, AMBER_FONT)])
    s.databar(f"F{first}:F{last}")
    s.freeze(f"B{first}")
    return {"main": s, "rows": (8, 14), "maxcol": 7}


# ---------------------------------------------------------------- timesheet
def timesheet(book):
    L = book.L
    emp = book.sheet(L("עובדים", "Employees"), [22, 15, 14, 16, 14], landscape=False)
    emp.title(L("עובדים ותעריפים", "Employees & rates"),
              L("רושמים כאן את העובדים והתעריף לשעה. בגיליון הדיווח בוחרים עובד מהרשימה, והתעריף נכנס לבד. בחרו חודש כדי לראות סיכום חודשי.",
                "List employees and hourly rates here. On the Hours sheet pick an employee and the rate fills in. Choose a month to see monthly totals."), 5)
    emp.label("A4", L("חודש לסיכום:", "Month to sum:"), bold=True)
    emp.inp("B4", dt.date(TODAY.year, TODAY.month, 1), "mm/yyyy")
    emp.header(6, [L("עובד", "Employee"), L("תעריף לשעה", "Hourly rate") + L.cur, L("שעות בחודש", "Hours this month"), L("לתשלום בחודש", "Pay this month") + L.cur, L("משמרות בחודש", "Shifts this month")])
    names = [L("נועה", "Noa"), L("אורי", "Uri"), L("מאיה", "Maya")]
    for i in range(30):
        r = 7 + i
        emp.inp(f"A{r}", names[i] if i < len(names) else None)
        emp.inp(f"B{r}", [55, 60, 50][i] if i < 3 else None, L.money2)
    book.name("EmpNames", f"{q(emp.ws.title)}!$A$7:$A$36")
    book.name("EmpTable", f"{q(emp.ws.title)}!$A$7:$B$36")
    s = book.sheet(L("דיווח שעות", "Hours"), [13, 18, 11, 11, 12, 11, 13, 14, 26])
    s.title(L("דיווח שעות עבודה", "Timesheet"),
            L("כל משמרת בשורה: תאריך, עובד, שעת כניסה ויציאה והפסקה בדקות. השעות והתשלום מחושבים לבד — גם משמרת שעוברת את חצות.",
              "One shift per row: date, employee, start, end and break in minutes. Hours and pay are calculated — including shifts that pass midnight."), 9)
    first, last = 7, 706
    R = lambda c: f"${c}${first}:${c}${last}"
    s.kpi("A4", "B4", L("סה״כ שעות", "Total hours"), f"=SUM({R('F')})", L.num2)
    s.kpi("C4", "D4", L("סה״כ לתשלום", "Total pay") + L.cur, f"=SUM({R('H')})", L.money)
    s.ws.merge_cells("D4:E4")
    s.header(6, [L("תאריך", "Date"), L("עובד", "Employee"), L("כניסה", "Start"), L("יציאה", "End"), L("הפסקה (דק׳)", "Break (min)"),
                 L("שעות", "Hours"), L("תעריף", "Rate") + L.cur, L("לתשלום", "Pay") + L.cur, L("הערות", "Notes")])
    t = dt.date(TODAY.year, TODAY.month, 1)
    ex = [(t, names[0], dt.time(9, 0), dt.time(17, 30), 30), (t + dt.timedelta(days=1), names[0], dt.time(9, 0), dt.time(16, 0), 30),
          (t, names[1], dt.time(16, 0), dt.time(0, 30), 30), (t + dt.timedelta(days=2), names[1], dt.time(10, 0), dt.time(14, 30), 0),
          (t + dt.timedelta(days=2), names[2], dt.time(8, 0), dt.time(13, 0), 15)]
    s.rows_input(first, last, ["A", "B", "C", "D", "E"], {"A": L.date, "C": L.time, "D": L.time, "E": "0"}, ex, {"C": "center", "D": "center", "E": "center"})
    s.rows_input(first, last, ["I"])
    s.rows_calc(first, last, "F", '=IF(OR(C{r}="",D{r}=""),"",ROUND(MOD(D{r}-C{r},1)*24-N(E{r})/60,2))', L.num2, align="center")
    s.rows_calc(first, last, "G", '=IF(B{r}="","",IFERROR(VLOOKUP(B{r},EmpTable,2,FALSE),""))', L.money2)
    s.rows_calc(first, last, "H", '=IF(OR(F{r}="",G{r}=""),"",F{r}*G{r})', L.money2)
    s.dropdown(f"B{first}:B{last}", "=EmpNames")
    s.freeze(f"A{first}")
    s.ws.auto_filter.ref = f"A6:I{last}"
    H = q(s.ws.title)
    for i in range(30):
        r = 7 + i
        crit = f'{H}!$B${first}:$B${last},$A{r},{H}!$A${first}:$A${last},">="&$B$4,{H}!$A${first}:$A${last},"<"&DATE(YEAR($B$4),MONTH($B$4)+1,1)'
        emp.calc(f"C{r}", f'=IF($A{r}="","",SUMIFS({H}!$F${first}:$F${last},{crit}))', L.num2)
        emp.calc(f"D{r}", f'=IF($A{r}="","",SUMIFS({H}!$H${first}:$H${last},{crit}))', L.money)
        emp.calc(f"E{r}", f'=IF($A{r}="","",COUNTIFS({crit}))', L.num, align="center")
    book.wb._sheets = [s.ws, emp.ws]
    return {"main": s, "rows": (6, 11)}


# ---------------------------------------------------------------- sales targets
def sales_targets(book):
    L = book.L
    s = book.sheet(L("מכירות ויעדים", "Sales vs targets"), [14, 15, 15, 12, 15, 16, 16, 12])
    s.title(L("מכירות מול יעדים — שנה שלמה", "Sales vs targets — a full year"),
            L("ממלאים יעד לכל חודש, ובסוף החודש את המכירות בפועל. אחוז העמידה ביעד, הפער והמצטבר מחושבים לבד: ירוק = עמדתם ביעד, אדום = פחות מ־80%.",
              "Set a target for each month and, at month end, the actual sales. Achievement, gap and running totals are calculated: green = target met, red = under 80%."), 8)
    s.label("A4", L("שנה:", "Year:"), bold=True); s.inp("B4", 2027, "0")
    s.header(6, [L("חודש", "Month"), L("יעד", "Target") + L.cur, L("בפועל", "Actual") + L.cur, L("% עמידה", "% achieved"), L("פער", "Gap") + L.cur,
                 L("יעד מצטבר", "Cumulative target") + L.cur, L("בפועל מצטבר", "Cumulative actual") + L.cur, L("% מצטבר", "Cumulative %")])
    tg = [30000, 30000, 35000, 35000, 40000, 40000, 40000, 38000, 42000, 45000, 45000, 50000]
    ac = [28000, 31500, 33000, 37500, 39000, 44000]
    for i in range(12):
        r = 7 + i
        s.label(f"A{r}", months(L)[i], bold=True)
        s.inp(f"B{r}", tg[i], L.money)
        s.inp(f"C{r}", ac[i] if i < len(ac) else None, L.money)
        s.calc(f"D{r}", f'=IF(OR(B{r}="",C{r}="",B{r}=0),"",C{r}/B{r})', L.pct, align="center")
        s.calc(f"E{r}", f'=IF(OR(B{r}="",C{r}=""),"",C{r}-B{r})', L.money)
        s.calc(f"F{r}", f'=IF(C{r}="","",SUM($B$7:B{r}))', L.money)
        s.calc(f"G{r}", f'=IF(C{r}="","",SUM($C$7:C{r}))', L.money)
        s.calc(f"H{r}", f'=IF(OR(F{r}="",F{r}=0),"",G{r}/F{r})', L.pct, align="center")
    s.label("A19", L("סה״כ", "Total"), bold=True, fill=GREEN_LIGHT)
    s.total("B19", "=SUM(B7:B18)", L.money); s.total("C19", "=SUM(C7:C18)", L.money)
    s.total("D19", '=IF(SUMIF(C7:C18,"<>",B7:B18)=0,"",C19/SUMIF(C7:C18,"<>",B7:B18))', L.pct)
    s.total("E19", '=C19-SUMIF(C7:C18,"<>",B7:B18)', L.money)
    s.label("A21", L("חודשים שעמדו ביעד", "Months on target"), bold=True)
    s.calc("C21", '=COUNTIF(D7:D18,">=1")', L.num)
    s.label("A22", L("כמה חסר ליעד השנתי", "Left to the yearly target"), bold=True)
    s.calc("C22", "=MAX(0,B19-C19)", L.money)
    for rng in ("D7:D19", "H7:H18"):
        from openpyxl.formatting.rule import FormulaRule
        a = rng.split(":")[0]
        s.ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER({a}),{a}>=1)'], fill=PatternFill("solid", fgColor=OK_FILL, bgColor=OK_FILL), font=Font(color=OK_FONT, bold=True)))
        s.ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(ISNUMBER({a}),{a}<0.8)'], fill=PatternFill("solid", fgColor=RED_FILL, bgColor=RED_FILL), font=Font(color=RED_FONT, bold=True)))
    s.negative_red("E7:E19")
    ch = BarChart(); ch.type = "col"; ch.title = L("יעד מול בפועל", "Target vs actual"); ch.height, ch.width = 8, 20
    ch.add_data(Reference(s.ws, min_col=2, min_row=6, max_row=18), titles_from_data=True)
    ch.add_data(Reference(s.ws, min_col=3, min_row=6, max_row=18), titles_from_data=True)
    ch.series[0].tx = SeriesLabel(v=L("יעד", "Target")); ch.series[1].tx = SeriesLabel(v=L("בפועל", "Actual"))
    ch.set_categories(Reference(s.ws, min_col=1, min_row=7, max_row=18))
    ch.y_axis.majorGridlines = None
    s.ws.add_chart(ch, "J6")
    s.freeze("B7")
    return {"main": s, "rows": (6, 12)}


# ---------------------------------------------------------------- vendors
def vendor_comparison(book):
    L = book.L
    s = book.sheet(L("השוואת ספקים", "Vendor comparison"), [16, 24, 13, 12, 12, 12, 11, 11, 11, 11, 13, 9])
    s.title(L("השוואת ספקים — ציון משוקלל", "Vendor comparison — weighted score"),
            L("קובעים כמה חשוב כל קריטריון (המשקלות בצהוב, סה״כ 100%), וממלאים לכל ספק מחיר, זמן אספקה ודירוג 1–5. הספק הזול ביותר מקבל 10 במחיר, המהיר ביותר 10 באספקה — והגיליון מדרג וממליץ.",
              "Set how much each criterion matters (yellow weights, total 100%), then fill in price, delivery time and 1–5 ratings. The cheapest gets 10 on price, the fastest 10 on delivery — the sheet ranks and recommends."), 12)
    s.label("A4", L("משקל מחיר", "Price weight"), bold=True); s.inp("B4", 0.4, L.pct)
    s.label("A5", L("משקל זמן אספקה", "Delivery weight"), bold=True); s.inp("B5", 0.2, L.pct)
    s.label("A6", L("משקל איכות", "Quality weight"), bold=True); s.inp("B6", 0.3, L.pct)
    s.label("A7", L("משקל שירות", "Service weight"), bold=True); s.inp("B7", 0.1, L.pct)
    s.label("C4", L("סה״כ משקלות", "Total weights"), bold=True); s.calc("D4", "=SUM(B4:B7)", L.pct, bold=True)
    s.calc("C5", f'=IF(ROUND(D4,4)<>1,"{L("⚠ סה״כ המשקלות צריך להיות 100%", "⚠ Weights should add up to 100%")}","")', color=RED_FONT, align=s.align)
    s.ws.merge_cells("C5:F5")
    s.kpi("H4", "J4", L("הספק המומלץ", "Recommended"), f'=IF(COUNT(K11:K30)=0,"",INDEX(A11:A30,MATCH(MAX(K11:K30),K11:K30,0)))')
    s.ws.merge_cells("H4:I4")
    s.ws.merge_cells("J4:L4")
    s.header(10, [L("ספק", "Vendor"), L("פריט / שירות", "Item / service"), L("מחיר", "Price") + L.cur, L("אספקה (ימים)", "Delivery (days)"), L("איכות (1–5)", "Quality (1–5)"),
                  L("שירות (1–5)", "Service (1–5)"), L("ציון מחיר", "Price score"), L("ציון אספקה", "Delivery score"), L("ציון איכות", "Quality score"),
                  L("ציון שירות", "Service score"), L("ציון משוקלל", "Weighted score"), L("דירוג", "Rank")])
    ex = [(L("ספק א׳", "Vendor A"), L("אריזות — הזמנה חודשית", "Packaging — monthly order"), 4200, 5, 4, 4),
          (L("ספק ב׳", "Vendor B"), L("אריזות — הזמנה חודשית", "Packaging — monthly order"), 3800, 9, 3, 3),
          (L("ספק ג׳", "Vendor C"), L("אריזות — הזמנה חודשית", "Packaging — monthly order"), 4600, 3, 5, 5),
          (L("ספק ד׳", "Vendor D"), L("אריזות — הזמנה חודשית", "Packaging — monthly order"), 3950, 7, 4, 3)]
    first, last = 11, 30
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F"], {"C": L.money, "D": "0", "E": "0", "F": "0"}, ex, {"D": "center", "E": "center", "F": "center"})
    s.rows_calc(first, last, "G", '=IF(OR(C{r}="",C{r}<=0),"",ROUND(MIN($C$11:$C$30)/C{r}*10,1))', "0.0", align="center")
    s.rows_calc(first, last, "H", '=IF(D{r}="","",ROUND(IF(D{r}<=0,10,MAX(0.5,MIN($D$11:$D$30))/MAX(0.5,D{r})*10),1))', "0.0", align="center")
    s.rows_calc(first, last, "I", '=IF(E{r}="","",E{r}*2)', "0.0", align="center")
    s.rows_calc(first, last, "J", '=IF(F{r}="","",F{r}*2)', "0.0", align="center")
    s.rows_calc(first, last, "K", '=IF(OR(G{r}="",H{r}="",I{r}=""),"",ROUND(G{r}*$B$4+H{r}*$B$5+I{r}*$B$6+N(J{r})*$B$7,2))', "0.00", align="center")
    s.rows_calc(first, last, "L", '=IF(K{r}="","",RANK(K{r},$K$11:$K$30))', "0", align="center")
    s.ws.conditional_formatting.add(f"A{first}:L{last}", FormulaRule(
        formula=[f"$L{first}=1"], fill=PatternFill("solid", fgColor=OK_FILL, bgColor=OK_FILL), font=Font(bold=True, color=OK_FONT)))
    from openpyxl.worksheet.datavalidation import DataValidation as DV
    dv = DV(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
    dv.error = L("דירוג בין 1 ל־5", "A rating from 1 to 5"); dv.errorStyle = "warning"
    s.ws.add_data_validation(dv); dv.add(f"E{first}:F{last}")
    s.freeze(f"B{first}")
    return {"main": s, "rows": (10, 14)}


# ---------------------------------------------------------------- event budget
def event_budget(book):
    L = book.L
    cats = [L(*x) for x in [("אולם / גן אירועים", "Venue"), ("קייטרינג", "Catering"), ("צילום ווידאו", "Photo & video"), ("מוזיקה / DJ", "Music / DJ"),
                            ("עיצוב ופרחים", "Decor & flowers"), ("הזמנות ומדיה", "Invitations"), ("לבוש ואיפור", "Outfits & make-up"), ("רב / עורך טקס", "Officiant"),
                            ("הסעות", "Transport"), ("מתנות לאורחים", "Guest favours"), ("אלכוהול ובר", "Drinks & bar"), ("אחר", "Other")]]
    lst, _ = lists_sheet(book, [("EventCats", L("קטגוריות", "Categories"), cats, 25)])
    s = book.sheet(L("תקציב אירוע", "Event budget"), [22, 18, 14, 14, 14, 14, 14, 13, 13, 24])
    book.wb.move_sheet(s.ws, offset=-1)
    s.title(L("תקציב אירוע — חתונה, בר/בת מצווה, ברית ואירוע עסקי", "Event budget — wedding, bar/bat mitzvah or company event"),
            L("ממלאים את פרטי האירוע ולכל ספק: הצעת מחיר, מחיר סופי וכמה שולם. רואים בכל רגע כמה נשאר לשלם, עלות למוזמן, ואם יוצאים מהתקציב.",
              "Fill in the event details and, for each supplier, the quote, final price and what was paid. See what is left to pay, cost per guest and whether you're over budget."), 10)
    s.label("A4", L("שם האירוע", "Event"), bold=True); s.inp("B4", L("החתונה של נועה ודניאל", "Noa & Daniel's wedding"))
    s.ws.merge_cells("B4:C4")
    s.label("A5", L("תאריך", "Date"), bold=True); s.inp("B5", TODAY + dt.timedelta(days=120), L.date)
    s.label("A6", L("מספר מוזמנים", "Guests"), bold=True); s.inp("B6", 250, L.num)
    s.label("A7", L("תקציב כולל", "Total budget") + L.cur, bold=True); s.inp("B7", 180000, L.money)
    s.label("A8", L("צפי מתנות לאורח (אופציונלי)", "Expected gift per guest (optional)") + L.cur, bold=True); s.inp("B8", 450, L.money)
    first, last = 13, 72
    R = lambda c: f"${c}${first}:${c}${last}"
    s.kpi("E4", "F4", L("עלות צפויה", "Expected cost") + L.cur, f"=SUM({R('E')})+SUMIF({R('E')},\"\",{R('D')})", L.money)
    s.kpi("E5", "F5", L("שולם עד עכשיו", "Paid so far") + L.cur, f"=SUM({R('F')})", L.money)
    s.kpi("E6", "F6", L("נשאר לשלם", "Left to pay") + L.cur, "=F4-F5", L.money)
    s.kpi("E7", "F7", L("מול התקציב", "vs budget") + L.cur, "=B7-F4", L.money)
    s.kpi("E8", "F8", L("עלות למוזמן", "Cost per guest") + L.cur, "=IFERROR(F4/B6,0)", L.money)
    s.kpi("G4", "H4", L("צפי מתנות", "Expected gifts") + L.cur, "=B6*B8", L.money)
    s.kpi("G5", "H5", L("מאזן משוער", "Estimated balance") + L.cur, "=H4-F4", L.money)
    s.negative_red("F7"); s.negative_red("H5")
    s.header(12, [L("קטגוריה", "Category"), L("ספק", "Supplier"), L("טלפון", "Phone"), L("הצעת מחיר", "Quote") + L.cur, L("מחיר סופי", "Final price") + L.cur,
                  L("שולם", "Paid") + L.cur, L("יתרה", "Balance") + L.cur, L("תשלום הבא", "Next payment"), L("סטטוס", "Status"), L("הערות", "Notes")])
    ex = [(cats[0], L("גן האירועים", "The Garden Venue"), "03-0000000", 60000, 58000, 15000, None, TODAY + dt.timedelta(days=30)),
          (cats[1], L("קייטרינג טעמים", "Flavours Catering"), "050-0000000", 55000, None, 5000, None, TODAY + dt.timedelta(days=60)),
          (cats[2], L("סטודיו צילום", "Photo studio"), "052-0000000", 12000, 11000, 3000, None, TODAY + dt.timedelta(days=90)),
          (cats[3], "DJ", "054-0000000", 7000, 6500, 6500, None, None),
          (cats[4], L("פרחי השדה", "Field Flowers"), "053-0000000", 9000, None, 0, None, None),
          (cats[5], L("בית דפוס", "Print shop"), "", 1500, 1400, 1400, None, None)]
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F"], {"D": L.money, "E": L.money, "F": L.money}, [x[:6] for x in ex], {"C": "center"})
    s.rows_input(first, last, ["H", "J"], {"H": L.date}, [(x[7],) for x in ex])
    paid, part, none_ = L("שולם", "Paid"), L("שולם חלקית", "Part paid"), L("טרם שולם", "Not paid")
    s.rows_calc(first, last, "G", '=IF(AND(D{r}="",E{r}=""),"",IF(E{r}="",D{r},E{r})-N(F{r}))', L.money)
    s.rows_calc(first, last, "I", f'=IF(G{{r}}="","",IF(G{{r}}<=0,"{paid}",IF(N(F{{r}})>0,"{part}","{none_}")))', align="center")
    s.dropdown(f"A{first}:A{last}", "=EventCats")
    s.number_rule(f"D{first}:F{last}")
    s.status_colors(f"I{first}:I{last}", [(paid, OK_FILL, OK_FONT), (part, AMBER_FILL, AMBER_FONT), (none_, RED_FILL, RED_FONT)])
    s.rule(f"H{first}:H{last}", f'AND(H{first}<>"",H{first}<=TODAY()+7,G{first}>0)', AMBER_FILL, AMBER_FONT)
    s.freeze(f"B{first}")
    return {"main": s, "rows": (12, 18)}


# ---------------------------------------------------------------- savings goals
def savings_goals(book):
    L = book.L
    s = book.sheet(L("יעדי חיסכון", "Savings goals"), [26, 15, 14, 15, 15, 12, 15, 14, 13])
    s.title(L("יעדי חיסכון", "Savings goals"),
            L("לכל יעד (רכב, חופשה, קרן חירום...): כמה צריך, עד מתי, וכמה כבר חסכתם. הגיליון מחשב כמה להפריש כל חודש כדי להגיע בזמן.",
              "For each goal (car, holiday, emergency fund...): how much, by when and how much is saved. The sheet works out how much to put aside each month to make it on time."), 9)
    first, last = 8, 37
    R = lambda c: f"${c}${first}:${c}${last}"
    s.kpi("A4", "B4", L("סה״כ יעדים", "All goals") + L.cur, f"=SUM({R('B')})", L.money)
    s.kpi("A5", "B5", L("נחסך עד עכשיו", "Saved so far") + L.cur, f"=SUM({R('D')})", L.money)
    s.kpi("D4", "E4", L("להפריש בחודש (כל היעדים)", "Monthly to set aside (all goals)") + L.cur, f"=SUM({R('G')})", L.money)
    s.ws.merge_cells("D4:D4")
    s.kpi("D5", "E5", L("התקדמות כוללת", "Overall progress"), "=IFERROR(B5/B4,0)", L.pct)
    s.header(7, [L("יעד", "Goal"), L("סכום יעד", "Target") + L.cur, L("תאריך יעד", "Target date"), L("נחסך", "Saved") + L.cur, L("חסר", "Remaining") + L.cur,
                 L("חודשים שנותרו", "Months left"), L("להפריש בחודש", "Per month") + L.cur, L("התקדמות", "Progress"), L("מצב", "Status")])
    ex = [(L("קרן חירום (3 חודשי מחיה)", "Emergency fund (3 months)"), 36000, TODAY + dt.timedelta(days=365), 12000),
          (L("חופשה משפחתית", "Family holiday"), 15000, TODAY + dt.timedelta(days=240), 4000),
          (L("רכב", "Car"), 60000, TODAY + dt.timedelta(days=730), 18000),
          (L("מחשב חדש", "New laptop"), 6000, TODAY + dt.timedelta(days=150), 6000)]
    s.rows_input(first, last, ["A", "B", "C", "D"], {"B": L.money, "C": L.date, "D": L.money}, ex)
    done, track = L("הושג!", "Reached!"), L("בדרך", "On the way")
    s.rows_calc(first, last, "E", '=IF(B{r}="","",MAX(0,B{r}-N(D{r})))', L.money)
    s.rows_calc(first, last, "F", '=IF(OR(C{r}="",B{r}=""),"",MAX(1,(YEAR(C{r})-YEAR(TODAY()))*12+MONTH(C{r})-MONTH(TODAY())))', "0", align="center")
    s.rows_calc(first, last, "G", '=IF(OR(E{r}="",F{r}=""),"",ROUNDUP(E{r}/F{r},0))', L.money)
    s.rows_calc(first, last, "H", '=IF(OR(B{r}="",B{r}=0),"",MIN(1,N(D{r})/B{r}))', L.pct, align="center")
    s.rows_calc(first, last, "I", f'=IF(B{{r}}="","",IF(N(D{{r}})>=B{{r}},"{done}","{track}"))', align="center")
    s.databar(f"H{first}:H{last}")
    s.number_rule(f"B{first}:B{last}"); s.number_rule(f"D{first}:D{last}")
    s.status_colors(f"I{first}:I{last}", [(done, OK_FILL, OK_FONT)])
    s.freeze(f"B{first}")
    return {"main": s, "rows": (7, 11)}


# ---------------------------------------------------------------- weekly shifts
def shift_schedule(book):
    L = book.L
    shifts = [(L("בוקר", "Morning"), 8, "D6EEF8"), (L("צהריים", "Midday"), 6, "E3F2D9"), (L("ערב", "Evening"), 8, "FDE7C8"),
              (L("לילה", "Night"), 8, "E2DDF5"), (L("חופש", "Day off"), 0, "EEEEEE"), (L("מחלה", "Sick"), 0, "F8D7DA")]
    lst = book.sheet(L("סוגי משמרות", "Shift types"), [20, 16], landscape=False)
    lst.title(L("סוגי משמרות", "Shift types"), L("אפשר לשנות שם ומספר שעות לכל משמרת.", "Rename shifts or change their hours."), 2)
    lst.header(4, [L("משמרת", "Shift"), L("שעות", "Hours")])
    for i in range(12):
        r = 5 + i
        lst.inp(f"A{r}", shifts[i][0] if i < len(shifts) else None)
        lst.inp(f"B{r}", shifts[i][1] if i < len(shifts) else None, "0.0")
    book.name("ShiftNames", f"{q(lst.ws.title)}!$A$5:$A$16")
    book.name("ShiftHours", f"{q(lst.ws.title)}!$B$5:$B$16")
    days = [L(*x) for x in [("ראשון", "Sun"), ("שני", "Mon"), ("שלישי", "Tue"), ("רביעי", "Wed"), ("חמישי", "Thu"), ("שישי", "Fri"), ("שבת", "Sat")]]
    s = book.sheet(L("סידור עבודה", "Rota"), [20] + [12] * 7 + [11, 11])
    s.title(L("סידור משמרות שבועי", "Weekly shift rota"),
            L("בוחרים שבוע (יום ראשון) ולכל עובד משמרת בכל יום מהרשימה. סופרים לבד כמה משמרות ושעות לכל עובד, וכמה אנשים בכל משמרת ביום.",
              "Pick the week (its Sunday) and, for each employee, a shift per day from the list. Shifts and hours per employee, and staff per shift each day, are counted for you."), 10)
    s.label("A4", L("השבוע שמתחיל ב־", "Week starting"), bold=True)
    sunday = TODAY - dt.timedelta(days=(TODAY.weekday() + 1) % 7)
    s.inp("B4", sunday, L.date)
    s.ws.merge_cells("B4:C4")
    s.header(6, [L("עובד", "Employee")] + days + [L("משמרות", "Shifts"), L("שעות", "Hours")])
    for k in range(7):
        c = col(2 + k)
        s.calc(f"{c}7", f"=$B$4+{k}", "dd/mm", align="center", fill=GREEN_LIGHT, bold=True)
    s.put("A7", L("תאריך", "Date"), bold=True, fill=GREEN_LIGHT)
    s.put("I7", None, fill=GREEN_LIGHT); s.put("J7", None, fill=GREEN_LIGHT)
    names = [L("נועה", "Noa"), L("אורי", "Uri"), L("מאיה", "Maya"), L("דניאל", "Daniel"), L("שירה", "Shira")]
    pattern = [[0, 0, 2, 4, 0, 1, 4], [2, 2, 4, 0, 2, 4, 4], [4, 1, 0, 2, 4, 0, 4], [3, 3, 3, 4, 4, 2, 2], [1, 4, 1, 1, 1, 4, 0]]
    first, last = 8, 27
    off = (shifts[4][0], shifts[5][0])
    for i in range(last - first + 1):
        r = first + i
        s.inp(f"A{r}", names[i] if i < len(names) else None)
        for k in range(7):
            v = shifts[pattern[i][k]][0] if i < len(names) else None
            s.inp(f"{col(2 + k)}{r}", v, align="center")
        s.calc(f"I{r}", f'=IF(A{r}="","",COUNTA(B{r}:H{r})-COUNTIF(B{r}:H{r},"{off[0]}")-COUNTIF(B{r}:H{r},"{off[1]}"))', "0", align="center")
        s.calc(f"J{r}", f'=IF(A{r}="","",SUMPRODUCT(SUMIF(ShiftNames,B{r}:H{r},ShiftHours)))', "0.0", align="center", bold=True)
    s.dropdown(f"B{first}:H{last}", "=ShiftNames")
    from openpyxl.formatting.rule import FormulaRule
    for name, _, color in shifts:
        s.ws.conditional_formatting.add(f"B{first}:H{last}", FormulaRule(formula=[f'B{first}="{name}"'], fill=PatternFill("solid", fgColor=color, bgColor=color)))
    r = last + 2
    s.section(f"A{r}", L("כמה עובדים בכל משמרת", "Staff per shift")); r += 1
    for name, _, color in shifts[:4]:
        s.put(f"A{r}", name, bold=True, fill=color)
        for k in range(7):
            c = col(2 + k)
            s.calc(f"{c}{r}", f'=COUNTIF({c}${first}:{c}${last},"{name}")', "0", align="center")
        r += 1
    s.freeze(f"B{first}")
    book.wb._sheets = [s.ws, lst.ws]
    return {"main": s, "rows": (6, 12)}
