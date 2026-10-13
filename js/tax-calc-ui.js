/* tax-calculator.html — UI for js/tax-calc.js (which holds all the maths
   and every 2026 figure). Recalculates live on every keystroke, renders
   the breakdown tables, and re-renders in the other language on
   "deskkit:langchange" (js/i18n.js's event for JS-built content).
   Nothing typed here is stored or sent anywhere. */
(() => {
  const L = (he, en) => (typeof dkL === "function" ? dkL(he, en) : he);
  const C = TAX_CONSTANTS;
  const $ = (id) => document.getElementById(id);

  // "12,345 ₪" kept as one left-to-right run inside RTL text (.ft-money is
  // direction:ltr + unicode-bidi:isolate), so the sign never jumps sides.
  function money(n, opts) {
    const v = Math.round(Number(n) || 0);
    const sign = opts && opts.minus && v !== 0 ? "−" : "";
    return `<span class="ft-money">${sign}${Math.abs(v).toLocaleString("en-US")} ₪</span>`;
  }
  // Trailing zeros only after a decimal point ("18.00" → "18", "10" stays "10").
  const pct = (r, digits) => `<span class="ft-money">${(r * 100).toFixed(digits === undefined ? 2 : digits).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}%</span>`;
  const num = (n) => `<span class="ft-money">${Number(n).toLocaleString("en-US")}</span>`;
  const radio = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ""; };

  // Format a money input with thousands separators on blur (and keep the
  // caret alone while typing — reformatting mid-typing fights the user).
  function bindMoneyInput(el, onInput) {
    el.addEventListener("input", onInput);
    el.addEventListener("blur", () => {
      const v = taxNum(el.value);
      el.value = v ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "";
      onInput();
    });
  }

  // "מדרגת 20%: 120,720–144,011" — the numeric range is one LTR run.
  function bracketLabel(row) {
    // Upper end = how far this income actually reaches into the bracket.
    const range = `<span class="ft-money">${Math.round(row.from).toLocaleString("en-US")}–${Math.round(row.from + row.base).toLocaleString("en-US")}</span>`;
    return `${L("מדרגת", "Bracket")} ${pct(row.rate, 0)}: ${range}`;
  }

  function kpis(items) {
    return `<div class="ft-kpis">${items.map((k) => `
      <div class="ft-kpi${k.main ? " is-main" : ""}">
        <div class="ft-kpi-label">${k.label}</div>
        <div class="ft-kpi-value" ${k.id ? `id="${k.id}"` : ""}>${k.value}</div>
      </div>`).join("")}</div>`;
  }

  /* ---------- Self-employed ---------- */
  function renderSelfEmployed() {
    const r = calcSelfEmployed({
      revenue: $("tc-se-revenue").value,
      expenses: $("tc-se-expenses").value,
      creditPoints: $("tc-se-points").value,
      applyMinimum: $("tc-se-minimum").checked,
    });
    const both = (y, o) => `<td class="ft-amt">${money(y, o)}</td><td class="ft-amt">${money(y / 12, o)}</td>`;
    const brRows = r.bracketRows.map((b) => `<tr class="ft-sub"><td>${bracketLabel(b)}</td>${both(b.amount)}</tr>`).join("");
    const minNote = r.minimumApplied
      ? `<li>${L(`ההכנסה החודשית נמוכה מההכנסה המזערית לעצמאי (${C.selfEmployedNI.minimumIncome.toLocaleString("en-US")} ₪), ולכן ביטוח לאומי ומס בריאות חושבו לפיה.`, `Monthly income is below the self-employed minimum income (${C.selfEmployedNI.minimumIncome.toLocaleString("en-US")} ₪), so national and health insurance were calculated on that minimum.`)}</li>`
      : "";
    $("tc-se-results").innerHTML = kpis([
      { label: L("נטו לשנה", "Net per year"), value: money(r.net), main: true, id: "tc-se-net-year" },
      { label: L("נטו לחודש (ממוצע)", "Net per month (average)"), value: money(r.netMonthly), main: true, id: "tc-se-net-month" },
      { label: L("סך מסים ותשלומי חובה", "Total taxes & contributions"), value: `${money(r.totalDeductions)} <small style="font-size:14px;font-weight:600;color:var(--text-secondary)">(${pct(r.effectiveRate, 1)})</small>` },
    ]) + `
      <div class="ft-table-wrap"><table class="ft-table" id="tc-se-table">
        <caption>${L("פירוט החישוב", "Breakdown")}</caption>
        <thead><tr><th scope="col">${L("סעיף", "Item")}</th><th scope="col" class="ft-amt">${L("לשנה", "Per year")}</th><th scope="col" class="ft-amt">${L("לחודש", "Per month")}</th></tr></thead>
        <tbody>
          <tr><td>${L("הכנסות (מחזור)", "Revenue (turnover)")}</td>${both(r.revenue)}</tr>
          <tr class="ft-minus"><td>${L("הוצאות מוכרות", "Deductible expenses")}</td>${both(r.expenses, { minus: true })}</tr>
          <tr class="ft-total"><td>${L("רווח (הכנסה לפני מס)", "Profit (income before tax)")}</td>${both(r.profit)}</tr>
          <tr class="ft-minus"><td>${L("ביטוח לאומי", "National insurance (Bituach Leumi)")}</td>${both(r.niYearly, { minus: true })}</tr>
          <tr class="ft-minus"><td>${L("מס בריאות", "Health insurance")}</td>${both(r.healthYearly, { minus: true })}</tr>
          <tr class="ft-sub"><td>${L(`ניכוי ${Math.round(C.niDeductibleShare * 100)}% מדמי הביטוח הלאומי מההכנסה החייבת`, `${Math.round(C.niDeductibleShare * 100)}% of national insurance deducted from taxable income`)}</td>${both(r.niDeduction)}</tr>
          <tr><td>${L("הכנסה חייבת במס", "Taxable income")}</td>${both(r.taxable)}</tr>
          <tr><td>${L("מס הכנסה לפי מדרגות", "Income tax by brackets")}</td>${both(r.bracketTax)}</tr>
          ${brRows}
          ${r.surtax > 0 ? `<tr><td>${L("מס יסף (3%)", "Surtax (3%)")}</td>${both(r.surtax)}</tr>` : ""}
          <tr><td>${L(`זיכוי ${r.creditPoints} נקודות זיכוי`, `Credit for ${r.creditPoints} credit points`)}</td>${both(r.creditsUsed, { minus: true })}</tr>
          <tr class="ft-minus"><td>${L("מס הכנסה לתשלום", "Income tax payable")}</td>${both(r.incomeTax, { minus: true })}</tr>
          <tr class="ft-total"><td>${L("נטו", "Net")}</td>${both(r.net)}</tr>
        </tbody>
      </table></div>
      <ul class="ft-list">
        ${minNote}
        <li>${L("ביטוח לאומי ומס בריאות חושבו לפי הרווח החודשי הממוצע (שיעור מופחת עד 7,703 ₪ בחודש, שיעור מלא עד התקרה של 51,910 ₪).", "National and health insurance use the average monthly profit (reduced rate up to 7,703 ₪ a month, full rate up to the 51,910 ₪ ceiling).")}</li>
        <li>${L("הפקדה לפנסיה ולקרן השתלמות לעצמאים מקטינה את המס בפועל — היא לא נכללת כאן.", "Pension and study-fund deposits reduce the real tax bill — they're not included here.")}</li>
      </ul>`;
  }

  /* ---------- Osek patur / murshe ---------- */
  function renderVat() {
    const r = calcVatStatus({ revenue: $("tc-vat-revenue").value, period: radio("tc-vat-period") });
    const share = Math.min(1, r.usedShare);
    const status = r.overCeiling
      ? `<div class="ft-status over" id="tc-vat-status">${L(`המחזור השנתי (${r.yearlyRevenue.toLocaleString("en-US")} ₪) גבוה מתקרת עוסק פטור ב-${Math.round(r.overBy).toLocaleString("en-US")} ₪ — צריך להיות עוסק מורשה ולגבות מע"מ.`, `Yearly turnover (${r.yearlyRevenue.toLocaleString("en-US")} ₪) is ${Math.round(r.overBy).toLocaleString("en-US")} ₪ over the osek patur ceiling — you need to be an osek murshe and charge VAT.`)}</div>`
      : `<div class="ft-status ok" id="tc-vat-status">${L(`המחזור השנתי מתחת לתקרת עוסק פטור — נשארו ${Math.round(r.remaining).toLocaleString("en-US")} ₪ עד התקרה.`, `Yearly turnover is under the osek patur ceiling — ${Math.round(r.remaining).toLocaleString("en-US")} ₪ left before the ceiling.`)}</div>`;
    $("tc-vat-results").innerHTML = status + `
      <div aria-hidden="true">
        <div class="ft-meter${r.overCeiling ? " over" : ""}"><span style="width:${(share * 100).toFixed(1)}%"></span></div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">${L(`${Math.round(r.usedShare * 100)}% מהתקרה`, `${Math.round(r.usedShare * 100)}% of the ceiling`)}</div>
      </div>
      <div class="ft-table-wrap"><table class="ft-table" id="tc-vat-table">
        <thead><tr><th scope="col">${L("נתון", "Figure")}</th><th scope="col" class="ft-amt">${L("לשנה", "Per year")}</th><th scope="col" class="ft-amt">${L("לחודש", "Per month")}</th></tr></thead>
        <tbody>
          <tr><td>${L("המחזור שלכם (לפני מע\"מ)", "Your turnover (before VAT)")}</td><td class="ft-amt">${money(r.yearlyRevenue)}</td><td class="ft-amt">${money(r.monthlyRevenue)}</td></tr>
          <tr><td>${L(`תקרת עוסק פטור ${C.year}`, `Osek patur ceiling ${C.year}`)}</td><td class="ft-amt">${money(r.ceiling)}</td><td class="ft-amt">${money(r.ceiling / 12)}</td></tr>
          <tr class="ft-sub"><td>${L(`כעוסק מורשה: מע"מ (${Math.round(C.vatRate * 100)}%) שתוסיפו לחשבונית ותעבירו לרשות המסים`, `As osek murshe: VAT (${Math.round(C.vatRate * 100)}%) you add to invoices and pass on to the Tax Authority`)}</td><td class="ft-amt">${money(r.vatYearly)}</td><td class="ft-amt">${money(r.vatYearly / 12)}</td></tr>
          <tr class="ft-sub"><td>${L("כעוסק מורשה: מה הלקוחות משלמים כולל מע\"מ", "As osek murshe: what clients pay including VAT")}</td><td class="ft-amt">${money(r.yearlyWithVat)}</td><td class="ft-amt">${money(r.yearlyWithVat / 12)}</td></tr>
        </tbody>
      </table></div>
      <ul class="ft-list">
        <li>${L("עוסק פטור לא גובה מע\"מ ולא מקזז מע\"מ על הוצאות. עוסק מורשה מוסיף מע\"מ לכל חשבונית, מגיש דוחות מע\"מ ומקזז את המע\"מ ששילם על הוצאות העסק.", "An osek patur charges no VAT and can't reclaim VAT on expenses. An osek murshe adds VAT to every invoice, files VAT reports and reclaims VAT paid on business expenses.")}</li>
        <li>${L("התקרה נבדקת לפי המחזור (כל ההכנסות), לא לפי הרווח.", "The ceiling is measured on turnover (all income), not on profit.")}</li>
        <li>${L("יש מקצועות שחייבים להיות עוסק מורשה גם במחזור נמוך (למשל עורכי דין, רואי חשבון, אדריכלים) — בדקו מול רשות המסים.", "Some professions must register as osek murshe even with low turnover (e.g. lawyers, accountants, architects) — check with the Tax Authority.")}</li>
        <li>${L("מע\"מ לא משנה את מס ההכנסה וביטוח לאומי — לחישוב הנטו עברו ללשונית \"עצמאי\".", "VAT doesn't change income tax or national insurance — for your net income use the \"Self-employed\" tab.")}</li>
      </ul>`;
  }

  /* ---------- Salaried ---------- */
  function renderSalaried() {
    const r = calcSalaried({ grossMonthly: $("tc-sal-gross").value, creditPoints: $("tc-sal-points").value });
    const both = (m, o) => `<td class="ft-amt">${money(m, o)}</td><td class="ft-amt">${money(m * 12, o)}</td>`;
    const brRows = r.bracketRows.map((b) => `<tr class="ft-sub"><td>${bracketLabel(b)}</td>${both(b.amount)}</tr>`).join("");
    $("tc-sal-results").innerHTML = kpis([
      { label: L("נטו לחודש", "Net per month"), value: money(r.net), main: true, id: "tc-sal-net-month" },
      { label: L("נטו לשנה", "Net per year"), value: money(r.netYearly), main: true },
      { label: L("סך ניכויי חובה", "Total mandatory deductions"), value: `${money(r.totalDeductions)} <small style="font-size:14px;font-weight:600;color:var(--text-secondary)">(${pct(r.effectiveRate, 1)})</small>` },
    ]) + `
      <div class="ft-table-wrap"><table class="ft-table" id="tc-sal-table">
        <caption>${L("פירוט החישוב", "Breakdown")}</caption>
        <thead><tr><th scope="col">${L("סעיף", "Item")}</th><th scope="col" class="ft-amt">${L("לחודש", "Per month")}</th><th scope="col" class="ft-amt">${L("לשנה", "Per year")}</th></tr></thead>
        <tbody>
          <tr class="ft-total"><td>${L("ברוטו", "Gross")}</td>${both(r.gross)}</tr>
          <tr><td>${L("מס הכנסה לפי מדרגות (חודשיות)", "Income tax by (monthly) brackets")}</td>${both(r.bracketTax)}</tr>
          ${brRows}
          ${r.surtax > 0 ? `<tr><td>${L("מס יסף (3%)", "Surtax (3%)")}</td>${both(r.surtax)}</tr>` : ""}
          <tr><td>${L(`זיכוי ${r.creditPoints} נקודות זיכוי`, `Credit for ${r.creditPoints} credit points`)}</td>${both(r.creditsUsed, { minus: true })}</tr>
          <tr class="ft-minus"><td>${L("מס הכנסה", "Income tax")}</td>${both(r.incomeTax, { minus: true })}</tr>
          <tr class="ft-minus"><td>${L("ביטוח לאומי (חלק העובד)", "National insurance (employee share)")}</td>${both(r.ni, { minus: true })}</tr>
          <tr class="ft-minus"><td>${L("מס בריאות", "Health insurance")}</td>${both(r.health, { minus: true })}</tr>
          <tr class="ft-total"><td>${L("נטו", "Net")}</td>${both(r.net)}</tr>
        </tbody>
      </table></div>
      <ul class="ft-list">
        <li>${L("בתלוש אמיתי יורדים גם פנסיה (בדרך כלל 6% מהשכר), קרן השתלמות ועוד — והנטו בפועל יהיה נמוך יותר.", "A real payslip also deducts pension (usually 6% of salary), study fund and more — actual take-home pay will be lower.")}</li>
      </ul>`;
  }

  /* ---------- Figures table ---------- */
  function renderConstants() {
    const se = C.selfEmployedNI, emp = C.employeeNI;
    const rows = [
      [L("שיעור מע\"מ", "VAT rate"), pct(C.vatRate, 0)],
      [L("תקרת עוסק פטור (מחזור שנתי)", "Osek patur ceiling (yearly turnover)"), money(C.osekPaturCeiling)],
      [L("מדרגות מס הכנסה (שנתי)", "Income tax brackets (yearly)"), C.brackets.map((b, i) => `${pct(b.rate, 0)} ${b.upTo === Infinity ? L("מעל", "above") + " " + num(C.brackets[i - 1].upTo) : L("עד", "up to") + " " + num(b.upTo)}`).join("<br>")],
      [L("מס יסף", "Surtax"), `${pct(C.surtax.rate, 0)} ${L("מעל", "above")} ${money(C.surtax.threshold)} ${L("לשנה", "a year")}`],
      [L("שווי נקודת זיכוי", "Credit point value"), `${money(C.creditPointMonthly)} ${L("לחודש", "a month")} · ${money(C.creditPointYearly)} ${L("לשנה", "a year")}`],
      [L("נקודות זיכוי בסיסיות", "Basic credit points"), L(`תושב/ת: ${C.defaultCreditPoints.man} · אישה: ${C.defaultCreditPoints.woman}`, `Resident: ${C.defaultCreditPoints.man} · Woman: ${C.defaultCreditPoints.woman}`)],
      [L("עצמאי — ביטוח לאומי + בריאות", "Self-employed — national + health insurance"), L(`עד ${se.reducedUpTo.toLocaleString("en-US")} ₪ בחודש: ${pct(se.reduced.ni)} + ${pct(se.reduced.health)}<br>מעל ועד ${se.ceiling.toLocaleString("en-US")} ₪: ${pct(se.full.ni)} + ${pct(se.full.health)}<br>הכנסה מזערית: ${se.minimumIncome.toLocaleString("en-US")} ₪ בחודש`, `Up to ${se.reducedUpTo.toLocaleString("en-US")} ₪ a month: ${pct(se.reduced.ni)} + ${pct(se.reduced.health)}<br>Above, up to ${se.ceiling.toLocaleString("en-US")} ₪: ${pct(se.full.ni)} + ${pct(se.full.health)}<br>Minimum income: ${se.minimumIncome.toLocaleString("en-US")} ₪ a month`)],
      [L("עצמאי — חלק ביטוח לאומי המותר בניכוי", "Self-employed — deductible share of national insurance"), pct(C.niDeductibleShare, 0)],
      [L("שכיר — ביטוח לאומי + בריאות (חלק העובד)", "Employee — national + health insurance (employee share)"), L(`עד ${emp.reducedUpTo.toLocaleString("en-US")} ₪: ${pct(emp.reduced.ni)} + ${pct(emp.reduced.health)}<br>מעל ועד ${emp.ceiling.toLocaleString("en-US")} ₪: ${pct(emp.full.ni)} + ${pct(emp.full.health)}`, `Up to ${emp.reducedUpTo.toLocaleString("en-US")} ₪: ${pct(emp.reduced.ni)} + ${pct(emp.reduced.health)}<br>Above, up to ${emp.ceiling.toLocaleString("en-US")} ₪: ${pct(emp.full.ni)} + ${pct(emp.full.health)}`)],
    ];
    $("tc-constants").innerHTML = `<caption>${L(`שנת המס ${C.year}`, `Tax year ${C.year}`)}</caption><tbody>${rows.map(([k, v]) => `<tr><th scope="row" style="font-weight:600;">${k}</th><td>${v}</td></tr>`).join("")}</tbody>`;
  }

  /* ---------- Tabs (WAI-ARIA tabs pattern: arrows move between tabs) ---------- */
  const tabs = Array.from(document.querySelectorAll('.ft-tabs [role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
    try { history.replaceState(null, "", "#" + tab.id.replace("tc-tab-", "")); } catch (err) { /* file:// */ }
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      const rtl = document.documentElement.dir === "rtl";
      let next = null;
      if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) next = tabs[(i + 1) % tabs.length];
      if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });
  const initial = tabs.find((t) => "#" + t.id.replace("tc-tab-", "") === location.hash);
  if (initial) selectTab(initial);

  /* ---------- Wiring ---------- */
  function linkGender(radioName, pointsId, render) {
    document.querySelectorAll(`input[name="${radioName}"]`).forEach((r) => r.addEventListener("change", () => {
      $(pointsId).value = C.defaultCreditPoints[r.value];
      render();
    }));
    $(pointsId).addEventListener("input", render);
  }
  bindMoneyInput($("tc-se-revenue"), renderSelfEmployed);
  bindMoneyInput($("tc-se-expenses"), renderSelfEmployed);
  $("tc-se-minimum").addEventListener("change", renderSelfEmployed);
  linkGender("tc-se-gender", "tc-se-points", renderSelfEmployed);
  bindMoneyInput($("tc-vat-revenue"), renderVat);
  document.querySelectorAll('input[name="tc-vat-period"]').forEach((r) => r.addEventListener("change", renderVat));
  bindMoneyInput($("tc-sal-gross"), renderSalaried);
  linkGender("tc-sal-gender", "tc-sal-points", renderSalaried);
  document.querySelectorAll(".ft-panel form").forEach((f) => f.addEventListener("submit", (e) => e.preventDefault()));

  function renderAll() {
    const tl = document.querySelector(".ft-tabs");
    if (tl) tl.setAttribute("aria-label", L("סוג החישוב", "Calculation type"));
    renderSelfEmployed(); renderVat(); renderSalaried(); renderConstants();
  }
  document.addEventListener("deskkit:langchange", renderAll);
  renderAll();
})();
