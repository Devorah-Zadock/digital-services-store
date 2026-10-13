/* Israeli freelancer tax calculator — pure logic (no DOM).
   Loaded by tax-calculator.html (via js/tax-calc-ui.js) and by
   tests/tools/tax-calc.test.js under Node (module.exports at the bottom,
   same pattern as js/schedule-content.js).

   Every number the calculator uses lives in TAX_CONSTANTS below, each with
   its source and the year it applies to — so the yearly update is one
   object, not a hunt through the code. When a new tax year starts:
   update the figures, the `year` field and the `checked` dates, then re-run
   `node --test tests/tools/` (the worked examples there are computed by
   hand from these exact figures and will need their expected values
   re-derived too).

   Deliberately an ESTIMATE: it ignores pension/study-fund deposits,
   extra credit points (children, degree, discharged soldier, periphery…),
   advance payments already made, and every other personal circumstance.
   The page says so prominently. */

const TAX_CONSTANTS = {
  year: 2026,

  /* ---- מע"מ (VAT) ----
     18% since 1 January 2025 (was 17%). Government decision 1270 to raise
     the rate by one point; still 18% for 2026.
     Sources: https://www.gov.il/he/pages/dec1270-2024
              https://www.kolzchut.org.il/he/מס_ערך_מוסף_(מע"מ)
     Checked: 2026-10. */
  vatRate: 0.18,

  /* ---- תקרת עוסק פטור (osek patur yearly turnover ceiling) ----
     122,833 ₪ for 2026 (was 120,000 ₪ in 2024–2025). Measured on yearly
     TURNOVER (מחזור עסקאות), not profit.
     Source: Israel Tax Authority, "סכומים ושיעורים במע"מ"
             https://www.gov.il/he/departments/general/vat-rate-amount-new
             secondary: https://www.kolzchut.org.il/he/עוסק_פטור
     Checked: 2026-10. */
  osekPaturCeiling: 122833,

  /* ---- מדרגות מס הכנסה (income tax brackets, yearly, income from
     personal exertion — salary and business alike) ----
     2026 brackets AFTER the 20%/31% bracket widening (economic
     efficiency law for 2026, approved end of March 2026, retroactive to
     1 January 2026). Monthly equivalents = yearly / 12:
     7,010 / 10,060 / 19,000 / 25,100 / 46,690.
     Source: Israel Tax Authority, "לוח עזר לחישוב מס הכנסה ממשכורת ושכר
             עבודה לחודש ינואר 2026 ואילך"
             https://www.gov.il/BlobFolder/generalpage/income-tax-monthly-deductions-booklet/he/generalInformation_income-tax-monthly-deductions-booklet_monthly-deductions-booklet-2026.pdf
             and Ministry of Finance wage division, tax brackets 2026:
             https://www.gov.il/BlobFolder/reports/press-income-tax-brackets/he/SalaryDataDetails_tax_bracket_2026.pdf
     Checked: 2026-10. */
  brackets: [
    { upTo: 84120, rate: 0.10 },
    { upTo: 120720, rate: 0.14 },
    { upTo: 228000, rate: 0.20 },
    { upTo: 301200, rate: 0.31 },
    { upTo: 560280, rate: 0.35 },
    { upTo: Infinity, rate: 0.47 },
  ],

  /* ---- מס יסף (surtax, section 121B) ----
     3% on yearly taxable income above 721,560 ₪ (60,130 ₪ a month). The
     Finance Ministry 2026 table above shows the top marginal rate as 50%
     (= 47% + 3%) above 60,130 ₪/month, which matches.
     Sources: SalaryDataDetails_tax_bracket_2026.pdf (above);
              secondary: https://protocol.co.il/high-income-tax/
     NOTE: the extra 2% on capital income above the threshold is ignored
     here — this calculator only handles work/business income.
     Checked: 2026-10. */
  surtax: { threshold: 721560, rate: 0.03 },

  /* ---- נקודת זיכוי (tax credit point) ----
     242 ₪ a month / 2,904 ₪ a year in 2026 (frozen since 2024).
     Every resident gets 2.25 points; a woman gets another 0.5 (2.75).
     Sources: https://www.kolzchut.org.il/he/נקודות_זיכוי_ממס_הכנסה
              https://www.gov.il/BlobFolder/reports/press-income-tax-brackets/he/SalaryDataDetails_tax_bracket_2026.pdf
     Checked: 2026-10. */
  creditPointMonthly: 242,
  creditPointYearly: 2904,
  defaultCreditPoints: { man: 2.25, woman: 2.75 },

  /* ---- ביטוח לאומי + ביטוח בריאות לעצמאי (self-employed, monthly) ----
     Reduced rate up to 7,703 ₪/month ("60% of the average wage" as the
     law defines it), full rate from there up to the 51,910 ₪/month
     ceiling; nothing above the ceiling. Income below 3,442 ₪/month is
     charged as if it were 3,442 ₪ (הכנסה מזערית).
       reduced: national insurance 4.47%, health 3.23%  (= 7.70%)
       full:    national insurance 12.83%, health 5.17% (= 18.00%)
     Source: https://www.btl.gov.il/Insurance/National%20Insurance/type_list/Self_Employed/Pages/rates.aspx
     (rates and amounts valid from 01.01.2026)
     Checked: 2026-10. */
  selfEmployedNI: {
    reducedUpTo: 7703,
    ceiling: 51910,
    minimumIncome: 3442,
    reduced: { ni: 0.0447, health: 0.0323 },
    full: { ni: 0.1283, health: 0.0517 },
  },

  /* ---- ניכוי 52% מדמי הביטוח הלאומי (self-employed) ----
     52% of the national-insurance part (NOT the health-insurance part)
     paid on non-salary income is deductible from taxable income.
     Source: Income Tax Ordinance section 47 (deduction for national
     insurance payments); secondary explanations:
       https://www.golang.co.il/article50
       https://indigofinance.co.il/self-employed-insurance-refund
     NOT re-confirmed on an official gov.il page for 2026 (the share has
     been 52% for many years) — see the report / page notes.
     Checked: 2026-10. */
  niDeductibleShare: 0.52,

  /* ---- ביטוח לאומי + בריאות לשכיר (employee share only, monthly) ----
       up to 7,703 ₪: national insurance 1.04%, health 3.23% (= 4.27%)
       7,703–51,910 ₪: national insurance 7%, health 5.17% (= 12.17%)
     Source: https://www.btl.gov.il/Insurance/Rates/Pages/לעובדים%20שכירים.aspx
     (valid from 01.01.2026)
     Checked: 2026-10. */
  employeeNI: {
    reducedUpTo: 7703,
    ceiling: 51910,
    reduced: { ni: 0.0104, health: 0.0323 },
    full: { ni: 0.07, health: 0.0517 },
  },
};

function taxNum(v) {
  const n = typeof v === "string" ? Number(v.replace(/[,\s₪]/g, "")) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* Income tax by brackets on a YEARLY taxable amount. `scale` = 1 for a
   year, 1/12 for a month (salaried mode) — the monthly brackets are just
   the yearly ones divided by 12. Returns the total and one row per
   bracket actually reached, for the breakdown table. */
function taxByBrackets(taxable, scale, C) {
  C = C || TAX_CONSTANTS;
  scale = scale || 1;
  const rows = [];
  let prev = 0;
  let total = 0;
  for (const b of C.brackets) {
    const top = b.upTo === Infinity ? Infinity : b.upTo * scale;
    if (taxable <= prev) break;
    const part = Math.min(taxable, top) - prev;
    const amount = part * b.rate;
    rows.push({ from: prev, to: top, rate: b.rate, base: part, amount });
    total += amount;
    prev = top;
  }
  return { total, rows };
}

function surtaxOn(taxable, scale, C) {
  C = C || TAX_CONSTANTS;
  const threshold = C.surtax.threshold * (scale || 1);
  return taxable > threshold ? (taxable - threshold) * C.surtax.rate : 0;
}

/* National + health insurance on a MONTHLY income, split reduced/full. */
function insuranceMonthly(monthlyIncome, table) {
  const base = Math.min(monthlyIncome, table.ceiling);
  const reducedBase = Math.min(base, table.reducedUpTo);
  const fullBase = Math.max(0, base - table.reducedUpTo);
  const ni = reducedBase * table.reduced.ni + fullBase * table.full.ni;
  const health = reducedBase * table.reduced.health + fullBase * table.full.health;
  return { base, reducedBase, fullBase, ni, health };
}

/* (a) עוסק פטור vs עוסק מורשה. `revenue` is turnover before VAT;
   `period` "month" or "year". */
function calcVatStatus(input, C) {
  C = C || TAX_CONSTANTS;
  const amount = taxNum(input && input.revenue);
  const yearly = input && input.period === "month" ? amount * 12 : amount;
  const ceiling = C.osekPaturCeiling;
  const overCeiling = yearly > ceiling;
  return {
    yearlyRevenue: yearly,
    monthlyRevenue: yearly / 12,
    ceiling,
    overCeiling,
    overBy: overCeiling ? yearly - ceiling : 0,
    remaining: overCeiling ? 0 : ceiling - yearly,
    usedShare: ceiling > 0 ? yearly / ceiling : 0,
    vatRate: C.vatRate,
    // As עוסק מורשה, VAT is added on top of the price and passed on to the
    // tax authority — it's not income, but the client pays it.
    vatYearly: yearly * C.vatRate,
    yearlyWithVat: yearly * (1 + C.vatRate),
  };
}

/* (b) עצמאי — yearly revenue minus expenses → net. */
function calcSelfEmployed(input, C) {
  C = C || TAX_CONSTANTS;
  const revenue = taxNum(input && input.revenue);
  const expenses = taxNum(input && input.expenses);
  const points = input && input.creditPoints !== undefined && input.creditPoints !== "" ? Math.max(0, Number(input.creditPoints) || 0) : C.defaultCreditPoints.man;
  const applyMinimum = !(input && input.applyMinimum === false);

  const profit = Math.max(0, revenue - expenses);
  const monthlyProfit = profit / 12;
  const T = C.selfEmployedNI;
  const niMonthlyBase = applyMinimum && monthlyProfit < T.minimumIncome ? T.minimumIncome : monthlyProfit;
  const ins = insuranceMonthly(niMonthlyBase, T);
  const niYearly = ins.ni * 12;
  const healthYearly = ins.health * 12;
  const niDeduction = niYearly * C.niDeductibleShare;

  const taxable = Math.max(0, profit - niDeduction);
  const br = taxByBrackets(taxable, 1, C);
  const surtax = surtaxOn(taxable, 1, C);
  const grossTax = br.total + surtax;
  const creditsValue = points * C.creditPointYearly;
  const creditsUsed = Math.min(creditsValue, grossTax);
  const incomeTax = grossTax - creditsUsed;

  const net = profit - incomeTax - niYearly - healthYearly;
  return {
    revenue, expenses, profit, creditPoints: points,
    niMonthlyBase, minimumApplied: niMonthlyBase > monthlyProfit,
    niReducedBase: ins.reducedBase * 12, niFullBase: ins.fullBase * 12,
    niYearly, healthYearly, niDeduction,
    taxable, bracketRows: br.rows, bracketTax: br.total, surtax,
    creditsValue, creditsUsed, incomeTax,
    totalDeductions: incomeTax + niYearly + healthYearly,
    net, netMonthly: net / 12,
    effectiveRate: profit > 0 ? (profit - net) / profit : 0,
  };
}

/* (c) שכיר — monthly gross salary → monthly net (income tax + employee's
   national/health insurance only; no pension, study fund or other
   payslip deductions). */
function calcSalaried(input, C) {
  C = C || TAX_CONSTANTS;
  const gross = taxNum(input && input.grossMonthly);
  const points = input && input.creditPoints !== undefined && input.creditPoints !== "" ? Math.max(0, Number(input.creditPoints) || 0) : C.defaultCreditPoints.man;
  const br = taxByBrackets(gross, 1 / 12, C);
  const surtax = surtaxOn(gross, 1 / 12, C);
  const grossTax = br.total + surtax;
  const creditsValue = points * C.creditPointMonthly;
  const creditsUsed = Math.min(creditsValue, grossTax);
  const incomeTax = grossTax - creditsUsed;
  const ins = insuranceMonthly(gross, C.employeeNI);
  const net = gross - incomeTax - ins.ni - ins.health;
  return {
    gross, creditPoints: points,
    bracketRows: br.rows, bracketTax: br.total, surtax,
    creditsValue, creditsUsed, incomeTax,
    ni: ins.ni, health: ins.health,
    totalDeductions: incomeTax + ins.ni + ins.health,
    net, netYearly: net * 12,
    effectiveRate: gross > 0 ? (gross - net) / gross : 0,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TAX_CONSTANTS, taxNum, taxByBrackets, surtaxOn, insuranceMonthly, calcVatStatus, calcSelfEmployed, calcSalaried };
}
