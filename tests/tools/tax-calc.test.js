// Unit tests for the freelancer tax calculator's pure logic (js/tax-calc.js).
// Run: node --test tests/tools/
//
// Every expected value below is worked out BY HAND from the 2026 figures in
// TAX_CONSTANTS (the arithmetic is in the comments), not copied from the
// code's own output. When the constants change for a new year, re-derive
// these too.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../../js/tax-calc.js");

const near = (actual, expected, label, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: expected ${expected}, got ${actual}`);

test("constants are the verified 2026 figures", () => {
  const C = T.TAX_CONSTANTS;
  assert.equal(C.year, 2026);
  assert.equal(C.vatRate, 0.18);
  assert.equal(C.osekPaturCeiling, 122833);
  assert.deepEqual(C.brackets.map((b) => b.upTo), [84120, 120720, 228000, 301200, 560280, Infinity]);
  assert.deepEqual(C.brackets.map((b) => b.rate), [0.10, 0.14, 0.20, 0.31, 0.35, 0.47]);
  assert.equal(C.creditPointYearly, C.creditPointMonthly * 12); // 242 * 12 = 2,904
  assert.equal(C.surtax.threshold / 12, 60130);
});

test("self-employed, 180,000 revenue − 30,000 expenses, man (2.25 points)", () => {
  const r = T.calcSelfEmployed({ revenue: 180000, expenses: 30000, creditPoints: 2.25 });
  // profit = 150,000 → 12,500 / month
  near(r.profit, 150000, "profit");
  // NI+health per month:
  //   reduced part 7,703: NI 7,703×4.47% = 344.3241, health 7,703×3.23% = 248.8069
  //   full part 12,500−7,703 = 4,797: NI 4,797×12.83% = 615.4551, health 4,797×5.17% = 248.0049
  //   NI = 959.7792/mo → 11,517.3504/yr ; health = 496.8118/mo → 5,961.7416/yr
  near(r.niYearly, 11517.3504, "NI");
  near(r.healthYearly, 5961.7416, "health");
  // 52% of NI deductible: 11,517.3504 × 0.52 = 5,989.022208
  near(r.niDeduction, 5989.022208, "NI deduction");
  // taxable = 150,000 − 5,989.022208 = 144,010.977792
  near(r.taxable, 144010.977792, "taxable");
  // tax: 84,120×10% = 8,412 ; 36,600×14% = 5,124 ; (144,010.977792−120,720)=23,290.977792×20% = 4,658.1955584
  //      = 18,194.1955584 ; credits 2.25×2,904 = 6,534 → 11,660.1955584
  near(r.bracketTax, 18194.1955584, "bracket tax");
  near(r.surtax, 0, "surtax");
  near(r.creditsUsed, 6534, "credits");
  near(r.incomeTax, 11660.1955584, "income tax");
  // net = 150,000 − 11,660.1955584 − 11,517.3504 − 5,961.7416 = 120,860.7124416 → /12 = 10,071.7260368
  near(r.net, 120860.7124416, "net");
  near(r.netMonthly, 10071.7260368, "net monthly");
  assert.equal(r.bracketRows.length, 3);
});

test("self-employed below the minimum income, woman (2.75 points)", () => {
  const r = T.calcSelfEmployed({ revenue: 30000, expenses: 0, creditPoints: 2.75 });
  // 30,000/12 = 2,500 < 3,442 minimum → NI charged on 3,442 at the reduced rate
  assert.equal(r.minimumApplied, true);
  // NI 3,442×4.47% = 153.8574/mo → 1,846.2888 ; health 3,442×3.23% = 111.1766/mo → 1,334.1192
  near(r.niYearly, 1846.2888, "NI");
  near(r.healthYearly, 1334.1192, "health");
  // taxable = 30,000 − 0.52×1,846.2888 (= 960.070176) = 29,039.929824 → tax 10% = 2,903.9929824
  near(r.bracketTax, 2903.9929824, "bracket tax");
  // credits 2.75×2,904 = 7,986 > tax → income tax 0 (credits never go negative)
  near(r.creditsValue, 7986, "credits value");
  near(r.incomeTax, 0, "income tax");
  // net = 30,000 − 1,846.2888 − 1,334.1192 = 26,819.592
  near(r.net, 26819.592, "net");
});

test("minimum income can be switched off", () => {
  const r = T.calcSelfEmployed({ revenue: 30000, expenses: 0, creditPoints: 2.75, applyMinimum: false });
  // 2,500/mo: NI 2,500×4.47% = 111.75 → 1,341 ; health 2,500×3.23% = 80.75 → 969
  near(r.niYearly, 1341, "NI");
  near(r.healthYearly, 969, "health");
  near(r.net, 30000 - 1341 - 969, "net");
});

test("self-employed above the NI ceiling and the surtax threshold", () => {
  const r = T.calcSelfEmployed({ revenue: 900000, expenses: 0, creditPoints: 2.25 });
  // 75,000/mo > 51,910 ceiling → NI base capped at 51,910
  //   reduced 7,703: NI 344.3241, health 248.8069
  //   full 51,910−7,703 = 44,207: NI ×12.83% = 5,671.7581, health ×5.17% = 2,285.5019
  //   NI 6,016.0822/mo → 72,192.9864 ; health 2,534.3088/mo → 30,411.7056
  near(r.niYearly, 72192.9864, "NI");
  near(r.healthYearly, 30411.7056, "health");
  // deduction 0.52×72,192.9864 = 37,540.352928 → taxable 862,459.647072
  near(r.taxable, 862459.647072, "taxable");
  // brackets: 8,412 + 5,124 + 107,280×20% (21,456) + 73,200×31% (22,692) + 259,080×35% (90,678)
  //           + (862,459.647072−560,280)=302,179.647072×47% (142,024.43412384) = 290,386.43412384
  near(r.bracketTax, 290386.43412384, "bracket tax");
  // surtax: (862,459.647072 − 721,560) = 140,899.647072 × 3% = 4,226.98941216
  near(r.surtax, 4226.98941216, "surtax");
  // income tax = 290,386.43412384 + 4,226.98941216 − 6,534 = 288,079.423536
  near(r.incomeTax, 288079.423536, "income tax");
  // net = 900,000 − 288,079.423536 − 72,192.9864 − 30,411.7056 = 509,315.884464
  near(r.net, 509315.884464, "net");
});

test("salaried 15,000/month, 2.25 points", () => {
  const r = T.calcSalaried({ grossMonthly: 15000, creditPoints: 2.25 });
  // monthly brackets: 7,010×10% = 701 ; 3,050×14% = 427 ; (15,000−10,060)=4,940×20% = 988 → 2,116
  near(r.bracketTax, 2116, "bracket tax");
  // credits 2.25×242 = 544.5 → income tax 1,571.5
  near(r.incomeTax, 1571.5, "income tax");
  // NI: 7,703×1.04% = 80.1112 + 7,297×7% = 510.79 → 590.9012
  // health: 7,703×3.23% = 248.8069 + 7,297×5.17% = 377.2549 → 626.0618
  near(r.ni, 590.9012, "NI");
  near(r.health, 626.0618, "health");
  // net = 15,000 − 1,571.5 − 590.9012 − 626.0618 = 12,211.537
  near(r.net, 12211.537, "net");
  near(r.netYearly, 12211.537 * 12, "net yearly", 0.1);
});

test("VAT status: 11,000/month is over the osek patur ceiling", () => {
  const r = T.calcVatStatus({ revenue: 11000, period: "month" });
  // 11,000×12 = 132,000 > 122,833 → over by 9,167 ; VAT 132,000×18% = 23,760
  assert.equal(r.yearlyRevenue, 132000);
  assert.equal(r.overCeiling, true);
  assert.equal(r.overBy, 9167);
  near(r.vatYearly, 23760, "VAT");
  near(r.yearlyWithVat, 155760, "with VAT");
});

test("VAT status: 100,000/year stays under the ceiling", () => {
  const r = T.calcVatStatus({ revenue: "100,000", period: "year" });
  assert.equal(r.overCeiling, false);
  assert.equal(r.remaining, 22833); // 122,833 − 100,000
});

test("empty / invalid input gives zeros, never NaN", () => {
  const r = T.calcSelfEmployed({ revenue: "", expenses: "abc", creditPoints: "" });
  assert.equal(r.profit, 0);
  assert.equal(r.incomeTax, 0);
  assert.ok(Number.isFinite(r.net));
  const s = T.calcSalaried({ grossMonthly: -5 });
  assert.equal(s.net, 0);
});
