"""Money templates: budget, invoice, expenses, cash flow, P&L, break-even,
income & expenses (business), receivables, loan, freelancer rate."""
import datetime as dt

from xlsx_lib import (GOLD, GREEN_LIGHT, OK_FILL, OK_FONT, RED_FILL, RED_FONT, AMBER_FILL, AMBER_FONT,
                      lists_sheet, q, col)
from openpyxl.chart import BarChart, LineChart, Reference

MONTHS_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def months(L):
    return MONTHS_HE if L.he else MONTHS_EN


def bar_chart(title, cats, data_refs, anchor, ws, y_title=None, width=18, height=8):
    ch = BarChart()
    ch.type = "col"
    ch.title = title
    ch.style = 10
    ch.height, ch.width = height, width
    for ref in data_refs:
        ch.add_data(ref, titles_from_data=True)
    ch.set_categories(cats)
    if y_title:
        ch.y_axis.title = y_title
    ch.y_axis.majorGridlines = None
    ws.add_chart(ch, anchor)


# ---------------------------------------------------------------- budget
def monthly_budget(book):
    L = book.L
    s = book.sheet(L("תקציב חודשי", "Monthly budget"), [26, 12, 15, 15, 15, 13, 14])
    s.title(L("תקציב חודשי למשק הבית", "Monthly household budget"),
            L("ממלאים רק את התאים הצהובים: קטגוריה, סוג (הכנסה/הוצאה), כמה תכננתם וכמה יצא בפועל. הסיכום והגרף מתעדכנים לבד.",
              "Fill in only the yellow cells: category, type (income/expense), planned and actual. The summary and chart update by themselves."), 7)
    s.inp("B4", L("ינואר 2027", "January 2027"))
    s.label("A4", L("חודש:", "Month:"), bold=True)
    first, last = 12, 41
    rng = lambda c: f"{c}{first}:{c}{last}"
    inc, exp = L("הכנסה", "Income"), L("הוצאה", "Expense")
    s.kpi("A6", "B6", L("סה״כ הכנסות בפועל", "Total income (actual)"), f'=SUMIF({rng("B")},"{inc}",{rng("D")})', L.money)
    s.kpi("A7", "B7", L("סה״כ הוצאות בפועל", "Total expenses (actual)"), f'=SUMIF({rng("B")},"{exp}",{rng("D")})', L.money)
    s.kpi("A8", "B8", L("נשאר בסוף החודש", "Left at month end"), "=B6-B7", L.money)
    s.kpi("C6", "D6", L("הכנסות מתוכננות", "Planned income"), f'=SUMIF({rng("B")},"{inc}",{rng("C")})', L.money)
    s.kpi("C7", "D7", L("הוצאות מתוכננות", "Planned expenses"), f'=SUMIF({rng("B")},"{exp}",{rng("C")})', L.money)
    s.kpi("C8", "D8", L("קטגוריות בחריגה", "Categories over budget"), f'=COUNTIF({rng("G")},"{L("חריגה", "Over")}")', L.num)
    s.negative_red("B8")
    s.header(11, [L("קטגוריה", "Category"), L("סוג", "Type"), L("מתוכנן", "Planned") + L.cur, L("בפועל", "Actual") + L.cur,
                  L("הפרש", "Difference") + L.cur, L("% מהתכנון", "% of plan"), L("מצב", "Status")])
    ex = [(L("משכורת", "Salary"), inc, 12000, 12000), (L("הכנסה נוספת", "Extra income"), inc, 1000, 1500),
          (L("קצבאות", "Benefits"), inc, 300, 300),
          (L("שכירות / משכנתא", "Rent / mortgage"), exp, 4500, 4500), (L("חשמל, מים, ארנונה", "Utilities & council tax"), exp, 900, 950),
          (L("סופרמרקט", "Groceries"), exp, 2200, 2450), (L("תחבורה ודלק", "Transport & fuel"), exp, 800, 720),
          (L("ביטוחים", "Insurance"), exp, 600, 600), (L("תקשורת (סלולר, אינטרנט)", "Phone & internet"), exp, 250, 240),
          (L("חינוך וחוגים", "Education & classes"), exp, 900, 900), (L("בריאות", "Health"), exp, 200, 120),
          (L("בילויים ופנאי", "Leisure"), exp, 700, 900), (L("ביגוד", "Clothing"), exp, 300, 180),
          (L("חיסכון", "Savings"), exp, 1500, 1500), (L("אחר", "Other"), exp, 400, 350)]
    s.rows_input(first, last, ["A", "B", "C", "D"], {"C": L.money, "D": L.money}, ex, {"B": "center"})
    s.rows_calc(first, last, "E", '=IF(OR(C{r}="",D{r}=""),"",D{r}-C{r})', L.money)
    s.rows_calc(first, last, "F", '=IF(OR(C{r}="",C{r}=0,D{r}=""),"",D{r}/C{r})', L.pct)
    s.rows_calc(first, last, "G", f'=IF(OR(B{{r}}="",D{{r}}=""),"",IF(B{{r}}="{exp}",IF(D{{r}}>C{{r}},"{L("חריגה", "Over")}","{L("בתקציב", "On budget")}"),IF(D{{r}}<C{{r}},"{L("מתחת לצפי", "Below plan")}","{L("תקין", "OK")}")))', align="center")
    s.dropdown(rng("B"), f'"{inc},{exp}"')
    s.number_rule(f"C{first}:D{last}")
    s.status_colors(rng("G"), [(L("חריגה", "Over"), RED_FILL, RED_FONT), (L("מתחת לצפי", "Below plan"), AMBER_FILL, AMBER_FONT),
                                (L("בתקציב", "On budget"), OK_FILL, OK_FONT), (L("תקין", "OK"), OK_FILL, OK_FONT)])
    s.freeze("A12")
    ws = s.ws
    n = first + len(ex) - 1
    cats = Reference(ws, min_col=1, min_row=first + 3, max_row=n)
    bar_chart(L("הוצאות: מתוכנן מול בפועל", "Expenses: planned vs actual"), cats,
              [Reference(ws, min_col=3, min_row=first + 2, max_row=n), Reference(ws, min_col=4, min_row=first + 2, max_row=n)], "I11", ws)
    # series titles come from the row above the data
    ch = ws._charts[-1]
    from openpyxl.chart.series import SeriesLabel
    ch.series[0].tx = SeriesLabel(v=L("מתוכנן", "Planned"))
    ch.series[1].tx = SeriesLabel(v=L("בפועל", "Actual"))
    return {"main": s, "rows": (11, 26)}


# ---------------------------------------------------------------- invoice
def invoice(book):
    L = book.L
    s = book.sheet(L("חשבונית", "Invoice"), [40, 11, 16, 18], landscape=False)
    s.title(L("חשבונית / חשבון עסקה", "Invoice"),
            L("ממלאים את התאים הצהובים — הסכומים, ההנחה, המע״מ והסה״כ מחושבים לבד. עוסק פטור: שיעור מע״מ 0%.",
              "Fill in the yellow cells — totals, discount, tax and the amount due are calculated for you. No tax? Set the rate to 0%."), 4)
    rows = [(L("סוג המסמך:", "Document:"), L("חשבונית מס", "Invoice")),
            (L("שם העסק:", "Business name:"), L("שם העסק שלכם", "Your business name")),
            (L("ח.פ / עוסק מורשה / פטור:", "Business / tax ID:"), "000000000"),
            (L("כתובת:", "Address:"), L("רחוב, עיר", "Street, city")),
            (L("טלפון / אימייל:", "Phone / email:"), "050-0000000 | info@business.co.il")]
    r = 4
    for lab, val in rows:
        s.label(f"A{r}", lab, bold=True)
        s.ws.merge_cells(f"B{r}:D{r}")
        s.inp(f"B{r}", val)
        r += 1
    s.dropdown("B4", f'"{L("חשבונית מס,חשבון עסקה,חשבונית מס / קבלה,קבלה,הצעת מחיר", "Invoice,Tax invoice,Receipt,Quote")}"')
    r += 1
    meta = [(L("לכבוד (לקוח):", "Bill to:"), L("שם הלקוח", "Client name"), None),
            (L("ח.פ / ת.ז של הלקוח:", "Client ID:"), "", None),
            (L("מספר מסמך:", "Invoice no.:"), "2027-001", None),
            (L("תאריך:", "Date:"), dt.date(2027, 1, 1), L.date),
            (L("לתשלום עד:", "Due date:"), None, L.date),
            (L("מספר הקצאה (אם נדרש):", "Reference:"), "", None)]
    top = r
    for lab, val, fmt in meta:
        s.label(f"A{r}", lab, bold=True)
        s.ws.merge_cells(f"B{r}:D{r}")
        s.inp(f"B{r}", val, fmt=fmt)
        r += 1
    due = top + 4
    s.calc(f"B{due}", f"=B{top + 3}+30", L.date, color="0000CC")
    s.ws[f"B{due}"].fill = s.ws[f"B{top}"].fill.copy()
    r += 1
    h = r
    s.header(h, [L("תיאור", "Description"), L("כמות", "Qty"), L("מחיר ליחידה", "Unit price") + L.cur, L("סה״כ", "Line total") + L.cur])
    first, last = h + 1, h + 12
    s.rows_input(first, last, ["A", "B", "C"], {"B": L.num1, "C": L.money2},
                 [(L("שירות / מוצר לדוגמה", "Sample service / product"), 1, 500), (L("שורה נוספת לדוגמה", "Another sample line"), 2, 250)],
                 {"B": "center"})
    s.rows_calc(first, last, "D", '=IF(OR(B{r}="",C{r}=""),"",B{r}*C{r})', L.money2)
    s.number_rule(f"B{first}:C{last}")
    r = last + 2
    s.label(f"C{r}", L("סכום ביניים", "Subtotal"), bold=True); s.calc(f"D{r}", f"=SUM(D{first}:D{last})", L.money2); sub = r; r += 1
    s.label(f"C{r}", L("הנחה (%)", "Discount (%)"), bold=True); s.inp(f"B{r}", 0, L.pct); s.calc(f"D{r}", f"=-ROUND(D{sub}*B{r},2)", L.money2); disc = r; r += 1
    s.label(f"C{r}", L("אחרי הנחה", "After discount"), bold=True); s.calc(f"D{r}", f"=D{sub}+D{disc}", L.money2); net = r; r += 1
    s.label(f"C{r}", L("מע״מ", "Tax"), bold=True); s.inp(f"B{r}", 0.18, L.pct); s.calc(f"D{r}", f"=ROUND(D{net}*B{r},2)", L.money2); vat = r; r += 1
    s.label(f"C{r}", L("סה״כ לתשלום", "Total due"), bold=True, fill=GREEN_LIGHT); s.total(f"D{r}", f"=D{net}+D{vat}", L.money2); r += 2
    s.section(f"A{r}", L("פרטי תשלום", "Payment details")); r += 1
    for lab, val in [(L("בנק / סניף / חשבון:", "Bank / account:"), L("בנק ___  סניף ___  חשבון ______", "Bank ___  Account ______")),
                     (L("ביט / פייבוקס:", "Other payment:"), "050-0000000")]:
        s.label(f"A{r}", lab, bold=True); s.ws.merge_cells(f"B{r}:D{r}"); s.inp(f"B{r}", val); r += 1
    r += 1
    s.note(f"A{r}", L("שיעור המע״מ בישראל מינואר 2025: 18% (התא הצהוב ליד המע״מ). חשבונית מס מעל הסכום שקבעה רשות המסים צריכה מספר הקצאה. התבנית אינה תחליף לתוכנה מאושרת להפקת חשבוניות.",
                      "Set the tax rate that applies to you in the yellow cell next to Tax. This template is not a replacement for certified invoicing software where one is required."), 4)
    s.ws.row_dimensions[r].height = 40
    s.ws.print_area = f"A1:D{r}"
    return {"main": s, "rows": (h, h + 3)}


# ---------------------------------------------------------------- expenses
def expense_tracker(book):
    L = book.L
    lst, refs = lists_sheet(book, [
        ("ExpCategories", L("קטגוריות הוצאה", "Expense categories"),
         [L(*x) for x in [("שכירות", "Rent"), ("ציוד", "Equipment"), ("שיווק ופרסום", "Marketing"), ("תוכנות ומנויים", "Software & subscriptions"),
                          ("רכב ונסיעות", "Car & travel"), ("משלוחים", "Shipping"), ("חומרי גלם", "Materials"), ("ייעוץ מקצועי", "Professional services"),
                          ("תקשורת", "Phone & internet"), ("ארנונה וחשבונות", "Utilities"), ("אחר", "Other")]], 30),
        ("PayMethods", L("אמצעי תשלום", "Payment methods"), [L(*x) for x in [("אשראי", "Card"), ("העברה בנקאית", "Bank transfer"), ("מזומן", "Cash"), ("צ׳ק", "Cheque"), ("ביט / פייבוקס", "Mobile payment"), ("הוראת קבע", "Direct debit")]], 15),
    ])
    s = book.sheet(L("הוצאות", "Expenses"), [13, 20, 20, 30, 14, 16, 10, 24])
    book.wb.move_sheet(s.ws, offset=-1)
    s.title(L("מעקב הוצאות לעסק", "Business expense tracker"),
            L("רושמים כל הוצאה בשורה (התאים הצהובים). הקטגוריה ואמצעי התשלום נבחרים מרשימה — אפשר לערוך את הרשימות בגיליון ״רשימות״. סיכום לפי חודש וקטגוריה בגיליון ״סיכום״.",
              "One expense per row (yellow cells). Category and payment method come from lists you can edit on the Lists sheet. Monthly totals per category are on the Summary sheet."), 8)
    first, last = 10, 409
    R = lambda c: f"${c}${first}:${c}${last}"
    yes, no = L("כן", "Yes"), L("לא", "No")
    s.kpi("A4", "B4", L("סה״כ הוצאות", "Total expenses"), f"=SUM({R('E')})", L.money)
    s.kpi("A5", "B5", L("הוצאות החודש", "This month"), f'=SUMIFS({R("E")},{R("A")},">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),{R("A")},"<"&DATE(YEAR(TODAY()),MONTH(TODAY())+1,1))', L.money)
    s.kpi("A6", "B6", L("טרם שולם", "Not yet paid"), f'=SUMIF({R("G")},"{no}",{R("E")})', L.money)
    s.kpi("C4", "D4", L("מספר הוצאות", "Number of expenses"), f"=COUNT({R('E')})", L.num)
    s.kpi("C5", "D5", L("הוצאה ממוצעת", "Average expense"), f"=IFERROR(AVERAGE({R('E')}),0)", L.money)
    s.header(9, [L("תאריך", "Date"), L("קטגוריה", "Category"), L("ספק", "Supplier"), L("תיאור", "Description"), L("סכום", "Amount") + L.cur,
                 L("אמצעי תשלום", "Payment method"), L("שולם?", "Paid?"), L("הערות", "Notes")])
    import datetime as dt
    d = lambda m, day: dt.date(2027, m, day)
    ex = [(d(1, 1), L("שכירות", "Rent"), L("בעל הנכס", "Landlord"), L("שכירות משרד", "Office rent"), 3200, L("העברה בנקאית", "Bank transfer"), yes),
          (d(1, 3), L("ציוד", "Equipment"), L("אופיס דיפו", "Office supplier"), L("נייר וטונר", "Paper and toner"), 340, L("אשראי", "Card"), yes),
          (d(1, 5), L("שיווק ופרסום", "Marketing"), "Meta", L("קמפיין חודשי", "Monthly campaign"), 600, L("אשראי", "Card"), yes),
          (d(1, 8), L("תוכנות ומנויים", "Software & subscriptions"), "Google Workspace", L("מנוי דואר וענן", "Email and cloud"), 95, L("הוראת קבע", "Direct debit"), yes),
          (d(1, 10), L("משלוחים", "Shipping"), L("חברת שליחויות", "Courier"), L("משלוחים ללקוחות", "Deliveries to clients"), 260, L("אשראי", "Card"), no),
          (d(1, 18), L("שיווק ופרסום", "Marketing"), L("בית דפוס", "Print shop"), L("כרטיסי ביקור", "Business cards"), 420, L("העברה בנקאית", "Bank transfer"), no),
          (d(1, 25), L("ייעוץ מקצועי", "Professional services"), L("רואה חשבון", "Accountant"), L("ליווי חודשי", "Monthly bookkeeping"), 750, L("העברה בנקאית", "Bank transfer"), yes),
          (d(2, 1), L("שכירות", "Rent"), L("בעל הנכס", "Landlord"), L("שכירות משרד", "Office rent"), 3200, L("העברה בנקאית", "Bank transfer"), yes),
          (d(2, 7), L("רכב ונסיעות", "Car & travel"), L("תחנת דלק", "Fuel station"), L("נסיעות ללקוחות", "Client visits"), 310, L("אשראי", "Card"), yes)]
    ex = [(a, b, c, dd, e, f, g) for a, b, c, dd, e, f, g in ex]
    s.rows_input(first, last, ["A", "B", "C", "D", "E", "F", "G", "H"], {"A": L.date, "E": L.money}, ex, {"G": "center"})
    s.dropdown(f"B{first}:B{last}", "=ExpCategories")
    s.dropdown(f"F{first}:F{last}", "=PayMethods")
    s.dropdown(f"G{first}:G{last}", f'"{yes},{no}"')
    s.number_rule(f"E{first}:E{last}")
    s.rule(f"G{first}:G{last}", f'G{first}="{no}"', AMBER_FILL, AMBER_FONT)
    s.freeze(f"A{first}")
    s.ws.auto_filter.ref = f"A9:H{last}"

    # Summary by month and category
    m = book.sheet(L("סיכום", "Summary"), [24] + [11] * 12 + [13])
    m.title(L("סיכום הוצאות לפי חודש וקטגוריה", "Expenses by month and category"),
            L("בוחרים שנה בתא הצהוב — הטבלה מסכמת את גיליון ההוצאות לבד.", "Pick a year in the yellow cell — the table sums the Expenses sheet for you."), 14)
    m.label("A4", L("שנה:", "Year:"), bold=True)
    m.inp("B4", 2027, "0")
    m.header(6, [L("קטגוריה", "Category")] + months(L) + [L("סה״כ", "Total")])
    E = q(s.ws.title)
    for i in range(30):
        r = 7 + i
        m.calc(f"A{r}", f"=IF({q(lst.ws.title)}!A{5 + i}=\"\",\"\",{q(lst.ws.title)}!A{5 + i})", align=m.align)
        for mm in range(1, 13):
            c = col(1 + mm)
            m.calc(f"{c}{r}", f'=IF($A{r}="","",SUMIFS({E}!$E${first}:$E${last},{E}!$B${first}:$B${last},$A{r},{E}!$A${first}:$A${last},">="&DATE($B$4,{mm},1),{E}!$A${first}:$A${last},"<"&DATE($B$4,{mm + 1},1)))', L.money)
        m.calc(f"N{r}", f'=IF($A{r}="","",SUM(B{r}:M{r}))', L.money, bold=True)
    tr = 37
    m.label(f"A{tr}", L("סה״כ לחודש", "Monthly total"), bold=True, fill=GREEN_LIGHT)
    for k in range(2, 15):
        c = col(k)
        m.total(f"{c}{tr}", f"=SUM({c}7:{c}36)", L.money)
    m.freeze("B7")
    book.wb.move_sheet(m.ws, offset=-1)
    return {"main": s, "rows": (9, 18)}


# ---------------------------------------------------------------- cash flow
def cash_flow(book):
    L = book.L
    s = book.sheet(L("תזרים מזומנים", "Cash flow"), [26] + [12] * 12 + [14])
    s.title(L("תחזית תזרים מזומנים — 12 חודשים", "12-month cash-flow forecast"),
            L("ממלאים יתרת פתיחה, חודש התחלה, והכנסות והוצאות צפויות בכל חודש (התאים הצהובים). יתרת הסגירה עוברת לחודש הבא לבד, וחודש שבו הקופה במינוס נצבע באדום.",
              "Enter the opening balance, the first month, and expected income and spending for each month (yellow cells). Each closing balance rolls into the next month; a month that goes negative turns red."), 14)
    s.label("A4", L("חודש ראשון:", "First month:"), bold=True)
    import datetime as dt
    s.inp("B4", dt.date(2027, 1, 1), "mm/yyyy")
    s.label("A5", L("יתרת פתיחה:", "Opening balance:"), bold=True)
    s.inp("B5", 20000, L.money)
    hdr = 7
    s.put(f"A{hdr}", L("סעיף", "Line"), bold=True, color="FFFFFF", fill="1F5C4E", align="center")
    for k in range(12):
        c = col(2 + k)
        s.put(f"{c}{hdr}", f"=DATE(YEAR($B$4),MONTH($B$4)+{k},1)", fmt="mm/yyyy", bold=True, color="FFFFFF", fill="1F5C4E", align="center")
    s.put(f"N{hdr}", L("סה״כ", "Total"), bold=True, color="FFFFFF", fill="1F5C4E", align="center")
    r = hdr + 1
    s.label(f"A{r}", L("יתרת פתיחה", "Opening balance"), bold=True, fill=GREEN_LIGHT)
    open_row = r
    r += 1
    s.section(f"A{r}", L("הכנסות", "Money in")); r += 1
    inc_lines = [(L("מכירות / לקוחות", "Sales / clients"), [18000, 18000, 22000, 18000, 26000, 18000, 19000, 21000, 17000, 23000, 24000, 28000]),
                 (L("הכנסות אחרות", "Other income"), [0, 500, 0, 0, 1000, 0, 0, 500, 0, 0, 0, 1500]),
                 (L("הלוואות / השקעות", "Loans / investment"), [0] * 12)]
    inc_first = r
    for name, vals in inc_lines:
        s.inp(f"A{r}", name)
        for k in range(12):
            s.inp(f"{col(2 + k)}{r}", vals[k], L.money)
        s.calc(f"N{r}", f"=SUM(B{r}:M{r})", L.money, bold=True)
        r += 1
    inc_last = r - 1
    s.label(f"A{r}", L("סה״כ הכנסות", "Total in"), bold=True, fill=GREEN_LIGHT)
    for k in range(13):
        c = col(2 + k)
        s.total(f"{c}{r}", f"=SUM({c}{inc_first}:{c}{inc_last})", L.money)
    tin = r
    r += 2
    s.section(f"A{r}", L("הוצאות", "Money out")); r += 1
    exp_lines = [(L("שכירות", "Rent"), 4500), (L("שכר עובדים", "Salaries"), 6000), (L("ספקים וחומרים", "Suppliers & materials"), 3000),
                 (L("שיווק", "Marketing"), 800), (L("מע״מ ומסים", "Taxes"), 1500), (L("החזרי הלוואות", "Loan repayments"), 0), (L("אחר", "Other"), 700)]
    exp_first = r
    for name, v in exp_lines:
        s.inp(f"A{r}", name)
        for k in range(12):
            s.inp(f"{col(2 + k)}{r}", v, L.money)
        s.calc(f"N{r}", f"=SUM(B{r}:M{r})", L.money, bold=True)
        r += 1
    exp_last = r - 1
    s.label(f"A{r}", L("סה״כ הוצאות", "Total out"), bold=True, fill=GREEN_LIGHT)
    for k in range(13):
        c = col(2 + k)
        s.total(f"{c}{r}", f"=SUM({c}{exp_first}:{c}{exp_last})", L.money)
    tout = r
    r += 2
    s.label(f"A{r}", L("תזרים נטו בחודש", "Net cash flow"), bold=True)
    for k in range(13):
        c = col(2 + k)
        s.calc(f"{c}{r}", f"={c}{tin}-{c}{tout}", L.money, bold=True)
    net = r
    r += 1
    s.label(f"A{r}", L("יתרת סגירה", "Closing balance"), bold=True, fill=GREEN_LIGHT)
    for k in range(12):
        c = col(2 + k)
        s.total(f"{c}{r}", f"={c}{open_row}+{c}{net}", L.money)
    close = r
    s.total(f"N{r}", f"=M{r}", L.money)
    s.calc(f"B{open_row}", "=$B$5", L.money, bold=True, fill=GREEN_LIGHT)
    for k in range(1, 12):
        s.calc(f"{col(2 + k)}{open_row}", f"={col(1 + k)}{close}", L.money, bold=True, fill=GREEN_LIGHT)
    s.negative_red(f"B{net}:M{close}")
    r += 2
    s.kpi(f"A{r}", f"B{r}", L("היתרה הנמוכה בשנה", "Lowest balance"), f"=MIN(B{close}:M{close})", L.money)
    s.negative_red(f"B{r}")
    s.kpi(f"A{r + 1}", f"B{r + 1}", L("חודשים במינוס", "Months below zero"), f'=COUNTIF(B{close}:M{close},"<0")', L.num)
    s.freeze(f"B{hdr + 1}")
    ch = LineChart()
    ch.title = L("יתרת סגירה לפי חודש", "Closing balance by month")
    ch.height, ch.width = 8, 22
    ch.add_data(Reference(s.ws, min_col=2, max_col=13, min_row=close), from_rows=True, titles_from_data=False)
    ch.set_categories(Reference(s.ws, min_col=2, max_col=13, min_row=hdr))
    ch.legend = None
    ch.y_axis.majorGridlines = None
    s.ws.add_chart(ch, f"D{r}")
    return {"main": s, "rows": (hdr, close)}


# ---------------------------------------------------------------- P&L
def profit_loss(book):
    L = book.L
    s = book.sheet(L("רווח והפסד", "Profit & loss"), [28] + [11] * 12 + [13, 10])
    s.title(L("דוח רווח והפסד — שנתי לפי חודשים", "Profit & loss — by month for a year"),
            L("ממלאים הכנסות, עלות המכר והוצאות בכל חודש (התאים הצהובים). הרווח הגולמי, הרווח הנקי והאחוזים מחושבים לבד, כולל סה״כ שנתי.",
              "Enter revenue, cost of sales and expenses for each month (yellow cells). Gross profit, net profit and margins are calculated, with a yearly total."), 15)
    s.label("A4", L("שנה:", "Year:"), bold=True)
    s.inp("B4", 2027, "0")
    hdr = 6
    s.header(hdr, [L("סעיף", "Line")] + months(L) + [L("סה״כ", "Total"), L("% מהכנסות", "% of revenue")])
    r = hdr + 1

    def block(title, lines, base):
        nonlocal r
        s.section(f"A{r}", title); r += 1
        f0 = r
        for name, v in lines:
            s.inp(f"A{r}", name)
            for k in range(12):
                s.inp(f"{col(2 + k)}{r}", round(v * (1 + 0.03 * k)) if v else 0, L.money)
            s.calc(f"N{r}", f"=SUM(B{r}:M{r})", L.money, bold=True)
            s.calc(f"O{r}", f"=IFERROR(N{r}/$N${{rev}},\"\")", L.pct)
            r += 1
        return f0, r - 1

    rev0, rev1 = block(L("הכנסות", "Revenue"), [(L("מכירת מוצרים", "Product sales"), 42000), (L("מכירת שירותים", "Services"), 18000), (L("הכנסות אחרות", "Other revenue"), 0)], None)
    s.label(f"A{r}", L("סה״כ הכנסות", "Total revenue"), bold=True, fill=GREEN_LIGHT)
    for k in range(13):
        c = col(2 + k)
        s.total(f"{c}{r}", f"=SUM({c}{rev0}:{c}{rev1})", L.money)
    rev = r; r += 2
    c0, c1 = block(L("עלות המכר", "Cost of sales"), [(L("חומרי גלם / קניות", "Materials / purchases"), 9000), (L("עבודה ישירה", "Direct labour"), 7000), (L("משלוחים", "Shipping"), 1200)], None)
    s.label(f"A{r}", L("סה״כ עלות המכר", "Total cost of sales"), bold=True, fill=GREEN_LIGHT)
    for k in range(13):
        c = col(2 + k)
        s.total(f"{c}{r}", f"=SUM({c}{c0}:{c}{c1})", L.money)
    cogs = r; r += 1
    s.label(f"A{r}", L("רווח גולמי", "Gross profit"), bold=True)
    for k in range(13):
        c = col(2 + k)
        s.calc(f"{c}{r}", f"={c}{rev}-{c}{cogs}", L.money, bold=True)
    gp = r; r += 1
    s.label(f"A{r}", L("שיעור רווח גולמי", "Gross margin"))
    for k in range(13):
        c = col(2 + k)
        s.calc(f"{c}{r}", f"=IFERROR({c}{gp}/{c}{rev},\"\")", L.pct1)
    r += 2
    o0, o1 = block(L("הוצאות תפעוליות", "Operating expenses"), [(L("שכירות", "Rent"), 4500), (L("שכר עובדים", "Salaries"), 12000), (L("שיווק ופרסום", "Marketing"), 3000),
                                                                  (L("תוכנות ומנויים", "Software"), 600), (L("כללי ומנהלה", "General & admin"), 2000), (L("פחת / מימון", "Depreciation / finance"), 500)], None)
    s.label(f"A{r}", L("סה״כ הוצאות תפעוליות", "Total operating expenses"), bold=True, fill=GREEN_LIGHT)
    for k in range(13):
        c = col(2 + k)
        s.total(f"{c}{r}", f"=SUM({c}{o0}:{c}{o1})", L.money)
    opx = r; r += 2
    s.label(f"A{r}", L("רווח לפני מס", "Profit before tax"), bold=True, fill=GOLD, color="FFFFFF")
    for k in range(13):
        c = col(2 + k)
        s.calc(f"{c}{r}", f"={c}{gp}-{c}{opx}", L.money, bold=True, fill="F6EBD6")
    np_ = r; r += 1
    s.label(f"A{r}", L("שיעור רווח נקי", "Net margin"))
    for k in range(13):
        c = col(2 + k)
        s.calc(f"{c}{r}", f"=IFERROR({c}{np_}/{c}{rev},\"\")", L.pct1)
    s.negative_red(f"B{np_}:N{np_}")
    # fix the % column now that the revenue row is known
    for row in s.ws.iter_rows(min_row=hdr + 1, max_row=r, min_col=15, max_col=15):
        for cell in row:
            if isinstance(cell.value, str) and "{rev}" in cell.value:
                cell.value = cell.value.replace("{rev}", str(rev))
    for rr in (rev, cogs, gp, opx, np_):
        s.calc(f"O{rr}", f"=IFERROR(N{rr}/$N${rev},\"\")", L.pct, bold=True)
    s.freeze(f"B{hdr + 1}")
    return {"main": s, "rows": (hdr, np_)}


# ---------------------------------------------------------------- break-even
def breakeven(book):
    L = book.L
    s = book.sheet(L("נקודת איזון", "Break-even"), [36, 16, 18, 20, 18], landscape=False)
    s.title(L("נקודת איזון ותמחור", "Break-even & pricing"),
            L("ממלאים ארבעה תאים צהובים — הגיליון מחשב כמה צריך למכור כדי לא להפסיד, וכמה כדי להגיע לרווח שאתם רוצים.",
              "Fill in four yellow cells — the sheet works out how much you must sell to stop losing money, and how much to reach the profit you want."), 5)
    s.section("A4", L("נתוני יסוד", "Inputs"))
    s.label("A5", L("הוצאות קבועות בחודש", "Fixed costs per month") + L.cur); s.inp("B5", 12000, L.money)
    s.label("A6", L("עלות משתנה ליחידה / ללקוח", "Variable cost per unit") + L.cur); s.inp("B6", 45, L.money2)
    s.label("A7", L("מחיר מכירה ליחידה (לפני מע״מ)", "Selling price per unit") + L.cur); s.inp("B7", 85, L.money2)
    s.label("A8", L("רווח חודשי שאתם רוצים", "Target monthly profit") + L.cur); s.inp("B8", 8000, L.money)
    s.number_rule("B5:B8")
    s.calc("C7", f'=IF(B7<=B6,"{L("⚠ המחיר לא מכסה את העלות ליחידה — אין נקודת איזון", "⚠ Price does not cover the unit cost — no break-even")}","")', color=RED_FONT, align=s.align)
    s.ws.merge_cells("C7:E7")
    s.section("A10", L("תוצאות", "Results"))
    res = [(L("רווח תרומה ליחידה", "Contribution per unit") + L.cur, "=B7-B6", L.money2),
           (L("שיעור רווח תרומה", "Contribution margin"), "=IFERROR(B11/B7,0)", L.pct1),
           (L("נקודת איזון — יחידות בחודש", "Break-even — units per month"), '=IF(B11<=0,"—",ROUNDUP(B5/B11,0))', L.num),
           (L("נקודת איזון — מחזור בחודש", "Break-even — monthly revenue") + L.cur, '=IF(B11<=0,"—",B13*B7)', L.money),
           (L("יחידות לרווח היעד", "Units for target profit"), '=IF(B11<=0,"—",ROUNDUP((B5+B8)/B11,0))', L.num),
           (L("מחזור לרווח היעד", "Revenue for target profit") + L.cur, '=IF(B11<=0,"—",B15*B7)', L.money),
           (L("ביום עבודה (22 ימים בחודש) — יחידות לרווח היעד", "Per working day (22/month) — units for target"), '=IF(B11<=0,"—",ROUNDUP(B15/22,0))', L.num)]
    for i, (lab, f, fmt) in enumerate(res):
        rr = 11 + i
        s.label(f"A{rr}", lab, bold=rr in (13, 15))
        s.calc(f"B{rr}", f, fmt, bold=rr in (13, 15), fill=GREEN_LIGHT if rr in (13, 15) else None)
    s.section("A19", L("תרחישי מכירה", "Sales scenarios"))
    s.header(20, [L("יחידות שנמכרו", "Units sold"), L("מחזור", "Revenue") + L.cur, L("עלות משתנה", "Variable cost") + L.cur, L("רווח / הפסד", "Profit / loss") + L.cur, L("מצב", "Result")])
    mult = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]
    for i, m in enumerate(mult):
        rr = 21 + i
        s.calc(f"A{rr}", f'=IF(ISNUMBER($B$13),ROUND($B$13*{m},0),{int(100 * m)})', L.num)
        s.calc(f"B{rr}", f"=A{rr}*$B$7", L.money)
        s.calc(f"C{rr}", f"=A{rr}*$B$6", L.money)
        s.calc(f"D{rr}", f"=B{rr}-C{rr}-$B$5", L.money, bold=True)
        s.calc(f"E{rr}", f'=IF(D{rr}>=0,"{L("רווח", "Profit")}","{L("הפסד", "Loss")}")', align="center")
    rr = 28
    s.inp(f"A{rr}", 500, L.num)
    s.calc(f"B{rr}", f"=A{rr}*$B$7", L.money); s.calc(f"C{rr}", f"=A{rr}*$B$6", L.money)
    s.calc(f"D{rr}", f"=B{rr}-C{rr}-$B$5", L.money, bold=True)
    s.calc(f"E{rr}", f'=IF(D{rr}>=0,"{L("רווח", "Profit")}","{L("הפסד", "Loss")}")', align="center")
    s.note("A29", L("השורה האחרונה: הקלידו כל כמות שתרצו לבדוק.", "Last row: type any number of units to test."), 5)
    s.negative_red("D21:D28")
    s.status_colors("E21:E28", [(L("רווח", "Profit"), OK_FILL, OK_FONT), (L("הפסד", "Loss"), RED_FILL, RED_FONT)])
    return {"main": s, "rows": (4, 17)}


# ---------------------------------------------------------------- income & expenses (business)
def income_expenses(book):
    L = book.L
    inc, exp = L("הכנסה", "Income"), L("הוצאה", "Expense")
    yes, no = L("כן", "Yes"), L("לא", "No")
    st = book.sheet(L("הגדרות", "Settings"), [34, 22, 40], landscape=False)
    st.title(L("הכנסות והוצאות לעסק — הגדרות", "Business income & expenses — settings"),
             L("ממלאים פעם אחת. בעוסק פטור אין מע״מ — בוחרים ״עוסק פטור״ והמע״מ יתאפס בכל הגיליונות.",
               "Fill in once. If you don't charge sales tax, choose \"No tax\" and the tax columns become zero."), 3)
    st.label("A4", L("שם העסק", "Business name"), bold=True); st.inp("B4", L("שם העסק שלכם", "Your business"))
    st.label("A5", L("שנה", "Year"), bold=True); st.inp("B5", 2027, "0")
    st.label("A6", L("סוג העסק", "Business type"), bold=True); st.inp("B6", L("עוסק מורשה", "Charges tax"))
    st.dropdown("B6", f'"{L("עוסק מורשה,עוסק פטור,חברה בע״מ", "Charges tax,No tax")}"')
    st.label("A7", L("שיעור מע״מ", "Tax rate"), bold=True); st.inp("B7", 0.18, L.pct)
    st.label("A8", L("מע״מ בפועל (מחושב)", "Tax rate used"), bold=True)
    st.calc("B8", f'=IF(B6="{L("עוסק פטור", "No tax")}",0,B7)', L.pct, bold=True, fill=GREEN_LIGHT)
    st.note("A10", L("הסכומים ביומן נרשמים כפי ששולמו (כולל מע״מ). הגיליון מפריד את המע״מ לבד, ומסכם מע״מ עסקאות, מע״מ תשומות והפרש לתשלום. זה כלי מעקב — לא תחליף לרואה חשבון או לדיווח רשמי.",
                      "Amounts in the journal are what was actually paid (including tax). The sheet separates the tax and shows tax collected, tax paid and the difference. A tracking tool — not a substitute for an accountant or official filing."), 3)
    st.ws.row_dimensions[10].height = 54
    book.name("TaxRate", f"{q(st.ws.title)}!$B$8")
    book.name("Year", f"{q(st.ws.title)}!$B$5")
    lst, _ = lists_sheet(book, [
        ("IncCats", L("קטגוריות הכנסה", "Income categories"), [L(*x) for x in [("מכירות", "Sales"), ("שירותים", "Services"), ("ריטיינר / מנוי", "Retainer / subscription"), ("הכנסה אחרת", "Other income")]], 20),
        ("ExpCats", L("קטגוריות הוצאה", "Expense categories"), [L(*x) for x in [("שכירות", "Rent"), ("ספקים וחומרים", "Suppliers & materials"), ("שיווק ופרסום", "Marketing"),
                                                                                  ("תוכנות ומנויים", "Software & subscriptions"), ("רכב ונסיעות", "Car & travel"), ("שכר ועובדים", "Salaries & staff"),
                                                                                  ("ייעוץ מקצועי", "Professional services"), ("ציוד", "Equipment"), ("תקשורת", "Phone & internet"), ("ביטוחים", "Insurance"), ("אחר", "Other")]], 30),
    ])
    j = book.sheet(L("יומן", "Journal"), [13, 11, 22, 28, 20, 13, 15, 12, 12, 15, 8])
    j.title(L("יומן הכנסות והוצאות", "Income & expenses journal"),
            L("כל תנועה בשורה: תאריך, הכנסה או הוצאה, קטגוריה וסכום ששולם (כולל מע״מ). ״כולל מע״מ?״ = לא, למשל על הוצאה בלי חשבונית מס. כל הסיכומים בגיליון ״סיכום חודשי״.",
              "One line per transaction: date, income or expense, category and the amount paid (including tax). Set \"Includes tax?\" to No when there is no tax on it. Totals are on the Monthly summary sheet."), 10)
    first, last = 8, 1007
    R = lambda c: f"${c}${first}:${c}${last}"
    j.kpi("A4", "C4", L("הכנסות השנה (לפני מע״מ)", "Income this year (net)"), f'=SUMIFS({R("J")},{R("B")},"{inc}",{R("K")},Year)', L.money)
    j.ws.merge_cells("A4:B4")
    j.kpi("D4", "E4", L("הוצאות השנה (לפני מע״מ)", "Expenses this year (net)"), f'=SUMIFS({R("J")},{R("B")},"{exp}",{R("K")},Year)', L.money)
    j.kpi("F4", "G4", L("רווח", "Profit"), "=C4-E4", L.money)
    j.ws.merge_cells("F4:F4")
    j.negative_red("G4")
    j.header(7, [L("תאריך", "Date"), L("סוג", "Type"), L("קטגוריה", "Category"), L("תיאור", "Description"), L("לקוח / ספק", "Client / supplier"),
                 L("מס׳ חשבונית", "Invoice no."), L("סכום ששולם", "Amount paid") + L.cur, L("כולל מע״מ?", "Includes tax?"),
                 L("מע״מ", "Tax") + L.cur, L("לפני מע״מ", "Net amount") + L.cur, L("שנה", "Year")])
    import datetime as dt
    d = lambda m, day: dt.date(2027, m, day)
    ex = [(d(1, 2), inc, L("שירותים", "Services"), L("ריטיינר חודשי", "Monthly retainer"), L("לקוח א׳", "Client A"), "1001", 4720, yes),
          (d(1, 3), exp, L("שכירות", "Rent"), L("שכירות סטודיו", "Studio rent"), L("בעל הנכס", "Landlord"), "", 3000, no),
          (d(1, 9), inc, L("מכירות", "Sales"), L("הזמנה מהאתר", "Website order"), L("לקוח ב׳", "Client B"), "1002", 1180, yes),
          (d(1, 12), exp, L("שיווק ופרסום", "Marketing"), L("קמפיין ממומן", "Paid campaign"), "Meta", "", 590, yes),
          (d(1, 20), exp, L("תוכנות ומנויים", "Software & subscriptions"), L("מנוי חודשי", "Monthly subscription"), "Canva", "", 59, no),
          (d(1, 28), inc, L("שירותים", "Services"), L("פרויקט עיצוב", "Design project"), L("לקוח ג׳", "Client C"), "1003", 7080, yes),
          (d(2, 2), inc, L("שירותים", "Services"), L("ריטיינר חודשי", "Monthly retainer"), L("לקוח א׳", "Client A"), "1004", 4720, yes),
          (d(2, 3), exp, L("שכירות", "Rent"), L("שכירות סטודיו", "Studio rent"), L("בעל הנכס", "Landlord"), "", 3000, no),
          (d(2, 15), exp, L("ייעוץ מקצועי", "Professional services"), L("רואה חשבון", "Accountant"), L("משרד רו״ח", "Accounting firm"), "", 708, yes),
          (d(2, 21), inc, L("מכירות", "Sales"), L("הזמנה מהאתר", "Website order"), L("לקוח ד׳", "Client D"), "1005", 2360, yes)]
    j.rows_input(first, last, ["A", "B", "C", "D", "E", "F", "G", "H"], {"A": L.date, "G": L.money2}, ex, {"B": "center", "H": "center"})
    j.rows_calc(first, last, "I", f'=IF(G{{r}}="","",IF(H{{r}}="{no}",0,ROUND(G{{r}}*TaxRate/(1+TaxRate),2)))', L.money2)
    j.rows_calc(first, last, "J", '=IF(G{r}="","",G{r}-I{r})', L.money2)
    j.rows_calc(first, last, "K", '=IF(A{r}="","",YEAR(A{r}))', "0", align="center")
    j.dropdown(f"B{first}:B{last}", f'"{inc},{exp}"')
    # one category list per type (INDIRECT keeps it simple and editable)
    j.dropdown(f"C{first}:C{last}", f'=IF($B{first}="{exp}",ExpCats,IncCats)')
    j.dropdown(f"H{first}:H{last}", f'"{yes},{no}"')
    j.number_rule(f"G{first}:G{last}")
    j.status_colors(f"B{first}:B{last}", [(inc, OK_FILL, OK_FONT), (exp, RED_FILL, RED_FONT)])
    j.freeze(f"A{first}")
    j.ws.auto_filter.ref = f"A7:K{last}"
    J = q(j.ws.title)

    m = book.sheet(L("סיכום חודשי", "Monthly summary"), [14, 15, 15, 15, 13, 15, 15, 15])
    m.title(L("סיכום חודשי — הכנסות, הוצאות, רווח ומע״מ", "Monthly summary — income, expenses, profit and tax"),
            L("הכול מחושב מהיומן לפי השנה שבהגדרות. מע״מ לתשלום = מע״מ על ההכנסות פחות מע״מ על ההוצאות.",
              "Everything is calculated from the journal for the year in Settings. Tax due = tax on income minus tax on expenses."), 8)
    m.header(4, [L("חודש", "Month"), L("הכנסות", "Income") + L.cur, L("הוצאות", "Expenses") + L.cur, L("רווח", "Profit") + L.cur, L("% רווח", "Margin"),
                 L("מע״מ עסקאות", "Tax on income") + L.cur, L("מע״מ תשומות", "Tax on expenses") + L.cur, L("מע״מ לתשלום", "Tax due") + L.cur])
    for i in range(12):
        r = 5 + i
        mm = i + 1
        rng = f'{J}!$A${first}:$A${last},">="&DATE(Year,{mm},1),{J}!$A${first}:$A${last},"<"&DATE(Year,{mm + 1},1)'
        m.label(f"A{r}", months(L)[i], bold=True)
        m.calc(f"B{r}", f'=SUMIFS({J}!$J${first}:$J${last},{J}!$B${first}:$B${last},"{inc}",{rng})', L.money)
        m.calc(f"C{r}", f'=SUMIFS({J}!$J${first}:$J${last},{J}!$B${first}:$B${last},"{exp}",{rng})', L.money)
        m.calc(f"D{r}", f"=B{r}-C{r}", L.money, bold=True)
        m.calc(f"E{r}", f'=IF(B{r}=0,"",D{r}/B{r})', L.pct)
        m.calc(f"F{r}", f'=SUMIFS({J}!$I${first}:$I${last},{J}!$B${first}:$B${last},"{inc}",{rng})', L.money)
        m.calc(f"G{r}", f'=SUMIFS({J}!$I${first}:$I${last},{J}!$B${first}:$B${last},"{exp}",{rng})', L.money)
        m.calc(f"H{r}", f"=F{r}-G{r}", L.money, bold=True)
    m.label("A17", L("סה״כ שנה", "Year total"), bold=True, fill=GREEN_LIGHT)
    for c in "BCDFGH":
        m.total(f"{c}17", f"=SUM({c}5:{c}16)", L.money)
    m.total("E17", '=IF(B17=0,"",D17/B17)', L.pct)
    m.negative_red("D5:D17")
    m.label("A19", L("חודש הכי רווחי", "Best month"), bold=True)
    m.calc("B19", f'=IF(MAX(D5:D16)=0,"—",INDEX(A5:A16,MATCH(MAX(D5:D16),D5:D16,0)))', align=m.align)
    m.label("A20", L("ממוצע הכנסות לחודש", "Average monthly income"), bold=True)
    m.calc("B20", '=IFERROR(AVERAGEIF(B5:B16,">0"),0)', L.money)
    m.freeze("B5")
    bar_chart(L("הכנסות מול הוצאות", "Income vs expenses"), Reference(m.ws, min_col=1, min_row=5, max_row=16),
              [Reference(m.ws, min_col=2, min_row=4, max_row=16), Reference(m.ws, min_col=3, min_row=4, max_row=16)], "J4", m.ws, width=20)

    c = book.sheet(L("לפי קטגוריה", "By category"), [28, 16, 12], landscape=False)
    c.title(L("לאן הולך הכסף — לפי קטגוריה", "Where the money goes — by category"),
            L("סיכום השנה (לפי ההגדרות) לכל קטגוריה, לפני מע״מ.", "This year's totals (from Settings) per category, before tax."), 3)
    c.header(4, [L("קטגוריית הוצאה", "Expense category"), L("סה״כ", "Total") + L.cur, L("% מההוצאות", "% of expenses")])
    LS = q(lst.ws.title)
    for i in range(30):
        r = 5 + i
        c.calc(f"A{r}", f'=IF({LS}!B{5 + i}="","",{LS}!B{5 + i})', align=c.align)
        c.calc(f"B{r}", f'=IF(A{r}="","",SUMIFS({J}!$J${first}:$J${last},{J}!$B${first}:$B${last},"{exp}",{J}!$C${first}:$C${last},A{r},{J}!$K${first}:$K${last},Year))', L.money)
        c.calc(f"C{r}", f'=IF(OR(A{r}="",SUM($B$5:$B$34)=0),"",B{r}/SUM($B$5:$B$34))', L.pct)
    c.databar("C5:C34")
    c.header(37, [L("קטגוריית הכנסה", "Income category"), L("סה״כ", "Total") + L.cur, L("% מההכנסות", "% of income")])
    for i in range(20):
        r = 38 + i
        c.calc(f"A{r}", f'=IF({LS}!A{5 + i}="","",{LS}!A{5 + i})', align=c.align)
        c.calc(f"B{r}", f'=IF(A{r}="","",SUMIFS({J}!$J${first}:$J${last},{J}!$B${first}:$B${last},"{inc}",{J}!$C${first}:$C${last},A{r},{J}!$K${first}:$K${last},Year))', L.money)
        c.calc(f"C{r}", f'=IF(OR(A{r}="",SUM($B$38:$B$57)=0),"",B{r}/SUM($B$38:$B$57))', L.pct)
    c.databar("C38:C57")
    # order: Journal, Monthly summary, By category, Settings, Lists
    wb = book.wb
    wb._sheets = [j.ws, m.ws, c.ws, st.ws, lst.ws]
    return {"main": j, "rows": (7, 14), "summary": m}


# ---------------------------------------------------------------- receivables
def receivables(book):
    L = book.L
    s = book.sheet(L("גבייה", "Receivables"), [12, 24, 13, 11, 13, 14, 14, 14, 11, 12, 24])
    s.title(L("מעקב גבייה — מי חייב לי כסף", "Receivables — who owes me money"),
            L("כל חשבונית בשורה: לקוח, תאריך, תנאי תשלום (ימים), סכום וכמה שולם. היתרה, ימי האיחור והסטטוס מחושבים לבד — ובראש הגיליון רואים כמה כסף פתוח ובאיחור.",
              "One invoice per row: client, date, payment terms (days), amount and how much was paid. Balance, days late and status are calculated — the top shows how much is open and late."), 11)
    first, last = 12, 411
    R = lambda c: f"${c}${first}:${c}${last}"
    paid, open_, late = L("שולם", "Paid"), L("פתוח", "Open"), L("באיחור", "Late")
    s.kpi("A4", "C4", L("סה״כ פתוח לגבייה", "Total outstanding"), f"=SUM({R('H')})", L.money)
    s.ws.merge_cells("A4:B4")
    s.kpi("A5", "C5", L("מתוכו באיחור", "Of which late"), f'=SUMIF({R("J")},"{late}",{R("H")})', L.money)
    s.ws.merge_cells("A5:B5")
    s.kpi("A6", "C6", L("חשבוניות באיחור", "Late invoices"), f'=COUNTIF({R("J")},"{late}")', L.num)
    s.ws.merge_cells("A6:B6")
    s.header(4, [L("איחור 1–30 יום", "1–30 days late"), L("31–60", "31–60"), L("61–90", "61–90"), L("מעל 90", "90+")], start=5)
    s.calc("E5", f'=SUMIFS({R("H")},{R("I")},">=1",{R("I")},"<=30")', L.money)
    s.calc("F5", f'=SUMIFS({R("H")},{R("I")},">=31",{R("I")},"<=60")', L.money)
    s.calc("G5", f'=SUMIFS({R("H")},{R("I")},">=61",{R("I")},"<=90")', L.money)
    s.calc("H5", f'=SUMIFS({R("H")},{R("I")},">90")', L.money)
    s.rule("H5", "H5>0")
    s.header(11, [L("מס׳ חשבונית", "Invoice no."), L("לקוח", "Client"), L("תאריך", "Date"), L("תנאי תשלום (ימים)", "Terms (days)"), L("לתשלום עד", "Due date"),
                  L("סכום", "Amount") + L.cur, L("שולם", "Paid") + L.cur, L("יתרה", "Balance") + L.cur, L("ימי איחור", "Days late"), L("סטטוס", "Status"), L("הערות", "Notes")])
    import datetime as dt
    t = dt.date.today()
    ex = [("1001", L("סטודיו אור", "Or Studio"), t - dt.timedelta(days=75), 30, None, 4720, 4720),
          ("1002", L("מאפיית השכונה", "Corner Bakery"), t - dt.timedelta(days=50), 30, None, 2360, 1000),
          ("1003", L("משרד עו״ד לוי", "Levi Law"), t - dt.timedelta(days=20), 30, None, 7080, 0),
          ("1004", L("גן ירוק", "Green Garden"), t - dt.timedelta(days=100), 60, None, 1500, 0),
          ("1005", L("סטודיו אור", "Or Studio"), t - dt.timedelta(days=5), 30, None, 4720, 0)]
    s.rows_input(first, last, ["A", "B", "C", "D", "F", "G", "K"], {"C": L.date, "D": "0", "F": L.money, "G": L.money},
                 [(a, b, c, d, f, g) for a, b, c, d, e, f, g in ex], {"A": "center", "D": "center"})
    s.rows_calc(first, last, "E", '=IF(C{r}="","",C{r}+IF(D{r}="",30,D{r}))', L.date)
    s.rows_calc(first, last, "H", '=IF(F{r}="","",F{r}-N(G{r}))', L.money)
    s.rows_calc(first, last, "I", '=IF(OR(F{r}="",H{r}<=0),"",MAX(0,TODAY()-E{r}))', "0", align="center")
    s.rows_calc(first, last, "J", f'=IF(F{{r}}="","",IF(H{{r}}<=0,"{paid}",IF(TODAY()>E{{r}},"{late}","{open_}")))', align="center")
    s.number_rule(f"F{first}:G{last}")
    s.status_colors(f"J{first}:J{last}", [(paid, OK_FILL, OK_FONT), (late, RED_FILL, RED_FONT), (open_, AMBER_FILL, AMBER_FONT)])
    s.freeze(f"A{first}")
    s.ws.auto_filter.ref = f"A11:K{last}"
    return {"main": s, "rows": (11, 16)}


# ---------------------------------------------------------------- loan
def loan(book):
    L = book.L
    s = book.sheet(L("הלוואה", "Loan"), [10, 14, 16, 15, 15, 15, 16], landscape=False)
    s.title(L("מחשבון הלוואה ולוח סילוקין", "Loan calculator & repayment schedule"),
            L("ממלאים סכום, ריבית שנתית ותקופה — מקבלים החזר חודשי, כמה ריבית תשלמו בסך הכול ולוח סילוקין מלא (שפיצר: החזר חודשי קבוע).",
              "Enter the amount, yearly interest and term — get the monthly payment, total interest and a full schedule (fixed monthly payment)."), 7)
    import datetime as dt
    s.label("A4", L("סכום ההלוואה", "Loan amount") + L.cur, bold=True); s.ws.merge_cells("A4:B4"); s.inp("C4", 100000, L.money)
    s.label("A5", L("ריבית שנתית", "Yearly interest"), bold=True); s.ws.merge_cells("A5:B5"); s.inp("C5", 0.06, "0.00%")
    s.label("A6", L("תקופה (שנים)", "Term (years)"), bold=True); s.ws.merge_cells("A6:B6"); s.inp("C6", 5, "0")
    s.label("A7", L("תשלום ראשון", "First payment"), bold=True); s.ws.merge_cells("A7:B7"); s.inp("C7", dt.date(2027, 2, 1), L.date)
    s.number_rule("C4:C6")
    s.kpi("E4", "F4", L("החזר חודשי", "Monthly payment"), '=IFERROR(IF(C5=0,C4/(C6*12),-PMT(C5/12,C6*12,C4)),0)', L.money2)
    s.kpi("E5", "F5", L("מספר תשלומים", "Number of payments"), "=C6*12", L.num)
    s.kpi("E6", "F6", L("סה״כ תשלמו", "Total paid"), "=F4*F5", L.money)
    s.kpi("E7", "F7", L("מתוכו ריבית", "Of which interest"), "=F6-C4", L.money)
    s.header(9, [L("תשלום", "No."), L("תאריך", "Date"), L("יתרה בתחילת החודש", "Opening balance") + L.cur, L("החזר", "Payment") + L.cur,
                 L("ריבית", "Interest") + L.cur, L("קרן", "Principal") + L.cur, L("יתרה בסוף החודש", "Closing balance") + L.cur])
    for i in range(360):
        r = 10 + i
        n = i + 1
        s.calc(f"A{r}", f'=IF({n}>$F$5,"",{n})', "0", align="center")
        s.calc(f"B{r}", f'=IF(A{r}="","",EDATE($C$7,{i}))', L.date)
        s.calc(f"C{r}", f'=IF(A{r}="","",{"$C$4" if i == 0 else f"G{r - 1}"})', L.money2)
        s.calc(f"D{r}", f'=IF(A{r}="","",MIN($F$4,C{r}*(1+$C$5/12)))', L.money2)
        s.calc(f"E{r}", f'=IF(A{r}="","",C{r}*$C$5/12)', L.money2)
        s.calc(f"F{r}", f'=IF(A{r}="","",D{r}-E{r})', L.money2)
        s.calc(f"G{r}", f'=IF(A{r}="","",MAX(0,C{r}-F{r}))', L.money2)
    s.freeze("A10")
    s.note("A371", L("לוח הסילוקין עד 30 שנה. ההחזר בפועל בבנק עשוי להשתנות (הצמדה, ריבית משתנה, עמלות).",
                     "Schedule up to 30 years. Real bank payments may differ (indexation, variable rates, fees)."), 7)
    return {"main": s, "rows": (9, 15)}


# ---------------------------------------------------------------- freelancer hourly rate
def freelancer_rate(book):
    L = book.L
    s = book.sheet(L("תמחור שעה", "Hourly rate"), [44, 18, 40], landscape=False)
    s.title(L("כמה לגבות על שעת עבודה? — מחשבון לעצמאים", "What should I charge per hour? — freelancer calculator"),
            L("ממלאים כמה אתם רוצים שיישאר לכם בחודש, ההוצאות, וכמה שעות באמת אפשר לחייב. הגיליון מחשב את המחיר המינימלי לשעה, ליום ולפרויקט.",
              "Enter what you want to take home each month, your costs and how many hours you can really bill. The sheet calculates your minimum hourly, daily and project price."), 3)
    s.section("A4", L("מה אתם רוצים להרוויח", "What you want to earn"))
    rows = [(L("כמה שיישאר לכם נטו בחודש", "Monthly take-home (net)") + L.cur, 15000, L.money, ""),
            (L("הוצאות העסק בחודש (תוכנות, ציוד, רכב, רו״ח...)", "Monthly business costs (software, gear, car, accountant...)") + L.cur, 2500, L.money, ""),
            (L("הערכת מס הכנסה + ביטוח לאומי + פנסיה (%)", "Estimated income tax + social security + pension (%)"), 0.3, L.pct, L("כדאי לבדוק עם רו״ח — תלוי בהכנסה ובנקודות זיכוי", "Check with an accountant")),
            (L("ימי עבודה בשבוע", "Working days per week"), 5, "0", ""),
            (L("שעות עבודה ביום", "Working hours per day"), 8, "0.0", ""),
            (L("כמה מהשעות אפשר לחייב לקוח (%)", "Share of hours you can bill (%)"), 0.6, L.pct, L("שיווק, מיילים, הנהלת חשבונות — לא מחויבים", "Marketing, email and admin aren't billable")),
            (L("שבועות חופש, חגים ומחלה בשנה", "Weeks off per year (holidays, sick days)"), 6, "0", "")]
    for i, (lab, v, fmt, hint) in enumerate(rows):
        r = 5 + i
        s.label(f"A{r}", lab)
        s.inp(f"B{r}", v, fmt)
        if hint:
            s.put(f"C{r}", hint, color="666666", size=9, border=False, italic=True)
    s.number_rule("B5:B11")
    s.section("A13", L("התוצאה", "Result"))
    res = [(L("הכנסה שצריך לגבות בחודש (לפני מע״מ)", "Monthly revenue needed (before sales tax)") + L.cur, "=IFERROR(B5/(1-B7)+B6,0)", L.money),
           (L("שעות לחיוב בחודש (ממוצע)", "Billable hours per month (average)"), "=B8*B9*B10*(52-B11)/12", L.num1),
           (L("מחיר מינימלי לשעה", "Minimum hourly rate") + L.cur, "=IFERROR(B14/B15,0)", L.money),
           (L("מחיר מינימלי ליום עבודה", "Minimum day rate") + L.cur, "=B16*B9*B10", L.money),
           (L("לשעה כולל מע״מ (18%)", "Hourly incl. 18% sales tax") + L.cur, "=B16*1.18", L.money)]
    for i, (lab, f, fmt) in enumerate(res):
        r = 14 + i
        s.label(f"A{r}", lab, bold=r == 16, fill=GREEN_LIGHT if r == 16 else None)
        s.calc(f"B{r}", f, fmt, bold=r == 16, fill=GREEN_LIGHT if r == 16 else None)
    s.section("A20", L("תמחור פרויקט", "Price a project"))
    s.label("A21", L("כמה שעות הפרויקט ייקח (הערכה)", "Estimated hours")); s.inp("B21", 20, "0")
    s.label("A22", L("מרווח ביטחון לתיקונים והפתעות (%)", "Buffer for revisions and surprises (%)")); s.inp("B22", 0.2, L.pct)
    s.label("A23", L("מחיר מומלץ לפרויקט (לפני מע״מ)", "Suggested project price (before tax)") + L.cur, bold=True, fill=GREEN_LIGHT)
    s.calc("B23", "=ROUNDUP(B16*B21*(1+B22),-1)", L.money, bold=True, fill=GREEN_LIGHT)
    s.note("A25", L("זה המחיר המינימלי כדי להגיע להכנסה שקבעתם. כדאי לבדוק גם כמה גובים אחרים בתחום — ואם הביקוש גבוה, לגבות יותר.",
                    "This is the minimum price to reach your target. Also check what others in your field charge — and charge more if demand is high."), 3)
    return {"main": s, "rows": (4, 18)}
