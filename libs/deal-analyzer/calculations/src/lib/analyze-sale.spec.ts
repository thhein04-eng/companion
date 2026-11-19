import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type SaleAssumptions,
} from 'shared-calculations';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { generatedScenarios } from './__fixtures__/generated-scenarios';
import { analyzeSale, saleVerdict } from './analyze-sale';
import { operatingYear } from './operating-year';
import { projectExit } from './project-exit';
import { projectWealth } from './project-wealth';
import type { SaleResult } from './types';
import { resolveSaleAssumptions } from './validate-sale';

/** Spec 013 contracts/sale-calculations.md § Reference vectors. */
const EXAMPLE = { rentGrowthPct: 3, expenseGrowthPct: 2.5, appreciationPct: 3.5 };
const REF = (sale: SaleAssumptions = {}, overrides: Partial<LoanScenario> = {}) =>
  referenceScenario({ sale, ...overrides }, EXAMPLE);
const REF_NR = (sale: SaleAssumptions = {}) =>
  referenceScenario({ rental: null, sale: { appreciationPct: 3.5, ...sale } });

function sale(s: LoanScenario): SaleResult {
  const a = analyzeSale(s, computeSchedule(s));
  if (!a.result) throw new Error(a.naReason ?? 'no result');
  return a.result;
}

const pick = (r: SaleResult) => [
  r.salePrice,
  r.sellingCosts,
  r.remainingBalance,
  r.netSaleProceeds,
  r.cumulativeCashFlow,
  r.totalCashInvested,
  r.totalNetProfit,
];

describe('analyzeSale — the sale and profit (spec 013 US1)', () => {
  it('(a) rental reference vectors at 84, 90 and 12 months', () => {
    expect(pick(sale(REF({ exitMonth: 84 })))).toEqual([
      508911.71, 35623.82, 273442.24, 199845.65, 51574.9, 100000, 151420.55,
    ]);
    expect(pick(sale(REF({ exitMonth: 90 })))).toEqual([
      517741.07, 36241.87, 271001.93, 210497.27, 57268.44, 100000, 167765.71,
    ]);
    expect(pick(sale(REF({ exitMonth: 12 })))).toEqual([
      414000, 28980, 296952.57, 88067.43, 4561.08, 100000, -7371.49,
    ]);
  });

  it('defaults to the 7-year hold (84 months)', () => {
    const r = sale(REF());
    expect(r.exitMonth).toBe(84);
    expect(r.totalNetProfit).toBe(151420.55);
  });

  it('(b) non-rental: cash flow is 0 and cash invested is the down payment', () => {
    const r = sale(REF_NR({ exitMonth: 84 }));
    expect(r.mode).toBe('non-rental');
    expect(pick(r)).toEqual([
      508911.71, 35623.82, 273442.24, 199845.65, 0, 100000, 99845.65,
    ]);
  });

  it('(c) return on cash invested, or N/A with no cash in', () => {
    expect(sale(REF({ exitMonth: 84 })).returnOnCash.value).toBeCloseTo(
      1.5142055,
      7,
    );
    const none = referenceScenario(
      { downPayment: { percent: 0 }, principal: 400_000 },
      { ...EXAMPLE, closingCosts: 0, rehabBudget: 0 },
    );
    expect(sale(none).returnOnCash).toEqual({
      value: null,
      naReason: 'No cash invested — return is undefined.',
    });
  });

  it('(d) the verdict follows the cents-rounded profit', () => {
    expect(sale(REF({ exitMonth: 84 })).verdict).toBe('profit');
    expect(sale(REF({ exitMonth: 12 })).verdict).toBe('loss');
    expect(saleVerdict(0)).toBe('break-even');
    expect(saleVerdict(0.004)).toBe('break-even');
    expect(saleVerdict(-0.004)).toBe('break-even');
    expect(saleVerdict(0.01)).toBe('profit');
    expect(saleVerdict(-0.01)).toBe('loss');
  });

  it('(e) needs a purchase price', () => {
    const s = REF({}, { homePrice: null, downPayment: null });
    const a = analyzeSale(s, computeSchedule(s));
    expect(a.result).toBeNull();
    expect(a.naReason).toBe('Enter a purchase price to model a sale.');
  });

  it('(f) holds the result back on invalid sale inputs', () => {
    const blocked = [
      REF({ exitMonth: 0 }),
      REF_NR({ exitMonth: 0 }),
      referenceScenario({}, { ...EXAMPLE, exit: { sellingCostsPct: 20 } }),
      REF_NR({ appreciationPct: 30 }),
    ];
    for (const s of blocked) {
      const a = analyzeSale(s, computeSchedule(s));
      expect(a.result).toBeNull();
      expect(a.naReason).toBe('Fix the sale inputs to see the result.');
    }
  });

  it('(g) an invalid stored hold or forced appreciation does not block the sale', () => {
    for (const rental of [
      { ...EXAMPLE, exit: { holdYears: 40 } },
      { ...EXAMPLE, wealth: { forcedAppreciation: -5 } },
    ]) {
      const s = referenceScenario({ sale: { exitMonth: 84 } }, rental);
      expect(sale(s).totalNetProfit).toBe(151420.55);
    }
  });

  it('(h) after an early payoff the balance is 0 and months add NOI with no debt service', () => {
    const extra = {
      extraPayments: [
        {
          id: 'x',
          kind: 'recurring' as const,
          amount: 2_000,
          startPeriod: 1,
        },
      ],
    };
    const at360 = sale(REF({ exitMonth: 360 }, extra));
    expect(at360.remainingBalance).toBe(0);
    const s355 = REF({ exitMonth: 355 }, extra);
    const at355 = sale(s355);
    expect(at355.remainingBalance).toBe(0);
    const { gsiMonthly, opexMonthly } = operatingYear(s355, 30);
    expect(
      at360.cumulativeCashFlow - at355.cumulativeCashFlow,
    ).toBeCloseTo(5 * (gsiMonthly - opexMonthly), 1);
  });

  it('clamps an exit past the term and reports it', () => {
    const r = sale(REF({ exitMonth: 400 }));
    expect(r.exitMonth).toBe(360);
    expect(r.clampedFrom).toBe(400);
  });

  it('(i) notes forced appreciation, which this page does not compound', () => {
    expect(sale(REF()).forcedAppreciationNote).toBe(false);
    const forced = referenceScenario(
      {},
      { ...EXAMPLE, wealth: { forcedAppreciation: 20_000 } },
    );
    expect(sale(forced).forcedAppreciationNote).toBe(true);
    expect(sale(forced).salePrice).toBe(508911.71);
  });
});

describe('analyzeSale — invariants (spec 013 data-model §C)', () => {
  const scenarios = generatedScenarios(50);
  const noForced = (s: LoanScenario): LoanScenario => ({
    ...s,
    rental: s.rental && {
      ...s.rental,
      wealth: { ...s.rental.wealth, forcedAppreciation: 0 },
    },
  });

  it('(j) invariant 1: proceeds + cash flow − invested = profit', () => {
    for (const base of scenarios) {
      for (const m of [1, 13, 84, 90, base.termMonths]) {
        const r = sale({ ...base, sale: { exitMonth: m } });
        expect(
          Math.abs(
            r.netSaleProceeds +
              r.cumulativeCashFlow -
              r.totalCashInvested -
              r.totalNetProfit,
          ),
        ).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('(k) invariant 3: a non-rental has no cash flow', () => {
    for (const base of scenarios) {
      const nr: LoanScenario = {
        ...base,
        rental: null,
        sale: { exitMonth: 90, appreciationPct: base.rental?.appreciationPct },
      };
      const r = sale(nr);
      expect(r.mode).toBe('non-rental');
      expect(r.cumulativeCashFlow).toBe(0);
    }
  });

  it('(l) invariant 4 (SC-002): whole-year exits match projectExit to the cent', () => {
    for (const base of [REF(), ...scenarios].map(noForced)) {
      const schedule = computeSchedule(base);
      for (let k = 1; k <= 30 && 12 * k <= base.termMonths; k++) {
        const ex = projectExit(base, schedule, k).result;
        if (!ex) throw new Error(`no exit for ${base.id} at ${k}`);
        const r = analyzeSale(
          { ...base, sale: { exitMonth: 12 * k } },
          schedule,
        ).result;
        expect(r && [
          r.salePrice,
          r.sellingCosts,
          r.remainingBalance,
          r.netSaleProceeds,
          r.totalNetProfit,
        ]).toEqual([
          ex.salePrice,
          ex.sellingCosts,
          ex.loanPayoff,
          ex.netSaleProceeds,
          roundCents(ex.preTax.totalNetProfit),
        ]);
      }
    }
  });
});

describe('analyzeSale — break-even sale price (spec 013 US2)', () => {
  it('(a) reference break-even prices', () => {
    expect(sale(REF({ exitMonth: 84 })).breakEven.salePrice).toBe(346093.91);
    expect(sale(REF({ exitMonth: 90 })).breakEven.salePrice).toBe(337347.84);
    expect(sale(REF({ exitMonth: 12 })).breakEven.salePrice).toBe(421926.33);
    expect(sale(REF_NR({ exitMonth: 84 })).breakEven.salePrice).toBe(401550.8);
  });

  it('(b) the cushion is projected − break-even', () => {
    expect(sale(REF({ exitMonth: 84 })).breakEven.cushion).toBe(162817.8);
    expect(sale(REF({ exitMonth: 12 })).breakEven.cushion).toBe(-7926.33);
  });

  it('(c) break-even as a share of the purchase price', () => {
    expect(sale(REF({ exitMonth: 84 })).breakEven.pctOfPurchase).toBeCloseTo(
      346093.91 / 400000,
      10,
    );
  });

  it('(d) floors at $0 when any price is profitable', () => {
    const r = sale(REF({ exitMonth: 360 }));
    expect(r.breakEven.salePrice).toBe(0);
    expect(r.breakEven.anyPrice).toBe(true);
    expect(r.breakEven.cushion).toBe(r.salePrice);
    expect(sale(REF({ exitMonth: 84 })).breakEven.anyPrice).toBe(false);
  });

  it('invariant 2 (SC-004): profit at the break-even price is $0 ± $0.01', () => {
    for (const base of generatedScenarios(50)) {
      for (const m of [1, 84, base.termMonths]) {
        const r = sale({ ...base, sale: { exitMonth: m } });
        if (r.breakEven.anyPrice) continue;
        const p = r.breakEven.salePrice;
        const s = resolveSaleAssumptions({ ...base, sale: { exitMonth: m } })
          .sellingCostsPct;
        const profit = roundCents(
          p -
            roundCents((p * s) / 100) -
            r.remainingBalance +
            r.cumulativeCashFlow -
            r.totalCashInvested,
        );
        expect(Math.abs(profit)).toBeLessThanOrEqual(0.01);
      }
    }
  });
});

describe('analyzeSale — tax on sale (spec 013 US3)', () => {
  const TAX_ON = { enabled: true };

  it('(a) is off by default and never changes the pre-tax figures', () => {
    const off = sale(REF({ exitMonth: 84 }));
    expect(off.tax).toBeNull();
    expect(off.taxNaReason).toBeNull();
    const on = sale(REF({ exitMonth: 84, tax: TAX_ON }));
    expect(pick(on)).toEqual(pick(off));
    expect(on.breakEven).toEqual(off.breakEven);
  });

  it('(b) rental reference estimate at 84 months', () => {
    expect(sale(REF({ exitMonth: 84, tax: TAX_ON })).tax).toEqual({
      depreciableBasis: 320000,
      depreciationTaken: 81454.52,
      adjustedBasis: 318545.48,
      taxableGain: 154742.41,
      recapturedGain: 81454.52,
      recaptureTax: 20363.63,
      capitalGain: 73287.89,
      capitalGainsTax: 10993.18,
      totalTax: 31356.81,
      afterTaxNetProfit: 120063.74,
      shortTermWarning: false,
    });
  });

  it('(c) non-rental reference estimate at 84 months', () => {
    expect(sale(REF_NR({ exitMonth: 84, tax: TAX_ON })).tax).toEqual({
      depreciableBasis: null,
      depreciationTaken: 0,
      adjustedBasis: 400000,
      taxableGain: 73287.89,
      recapturedGain: 0,
      recaptureTax: 0,
      capitalGain: 73287.89,
      capitalGainsTax: 10993.18,
      totalTax: 10993.18,
      afterTaxNetProfit: 88852.47,
      shortTermWarning: false,
    });
  });

  it('(d) a loss on sale has no tax and no benefit', () => {
    const r = sale(REF({ exitMonth: 12, tax: TAX_ON }));
    expect(r.tax?.taxableGain).toBeLessThanOrEqual(0);
    expect(r.tax?.recaptureTax).toBe(0);
    expect(r.tax?.capitalGainsTax).toBe(0);
    expect(r.tax?.afterTaxNetProfit).toBe(-7371.49);
  });

  it('(e) warns about short-term gains at 12 months or less', () => {
    expect(sale(REF({ exitMonth: 12, tax: TAX_ON })).tax?.shortTermWarning).toBe(
      true,
    );
    expect(sale(REF({ exitMonth: 13, tax: TAX_ON })).tax?.shortTermWarning).toBe(
      false,
    );
  });

  it('(f) closing costs and rehab raise the basis', () => {
    const base = sale(REF({ exitMonth: 84, tax: TAX_ON })).tax;
    const s = referenceScenario(
      { sale: { exitMonth: 84, tax: TAX_ON } },
      { ...EXAMPLE, closingCosts: 8_000, rehabBudget: 20_000 },
    );
    const t = sale(s).tax;
    // Rehab is depreciable: basis +20,000, so annual depreciation is roundCents(340000 / 27.5).
    expect(t?.depreciableBasis).toBe(340000);
    expect(t?.depreciationTaken).toBe(roundCents(roundCents(340000 / 27.5) * 7));
    expect(t?.adjustedBasis).toBe(
      roundCents(400000 + 8_000 + 20_000 - (t?.depreciationTaken ?? 0)),
    );
    expect(base && t && t.adjustedBasis > base.adjustedBasis).toBe(true);
  });

  it('(g) depreciation is capped at the basis', () => {
    const t = sale(REF({ exitMonth: 360, tax: TAX_ON })).tax;
    expect(t?.depreciationTaken).toBe(320000);
  });

  it('(h) invalid tax inputs hide only the estimate', () => {
    const preTax = pick(sale(REF({ exitMonth: 84 })));
    for (const s of [
      REF({ exitMonth: 84, tax: { enabled: true, capitalGainsRatePct: 50 } }),
      referenceScenario(
        { sale: { exitMonth: 84, tax: TAX_ON } },
        { ...EXAMPLE, wealth: { landValuePct: 100 } },
      ),
    ]) {
      const r = sale(s);
      expect(r.tax).toBeNull();
      expect(r.taxNaReason).toBe('Fix the tax inputs to see the estimate.');
      expect(pick(r)).toEqual(preTax);
    }
  });

  it('(h) an invalid tax rate while the estimate is off blocks nothing', () => {
    const r = sale(
      REF({ exitMonth: 84, tax: { enabled: false, capitalGainsRatePct: 50 } }),
    );
    expect(r.tax).toBeNull();
    expect(r.taxNaReason).toBeNull();
  });

  it('(i) invariant 5: depreciation taken matches projectWealth at whole years', () => {
    for (const k of [1, 7, 10]) {
      const s = REF({ exitMonth: 12 * k, tax: TAX_ON });
      const w = projectWealth(s, computeSchedule(s), { horizonYears: k });
      const sum = roundCents(
        (w.years ?? []).slice(1).reduce((t, y) => t + y.depreciation, 0),
      );
      expect(sale(s).tax?.depreciationTaken).toBe(sum);
    }
  });

  it('(j) invariant 6: total = recapture + capital gains; both 0 without a gain', () => {
    for (const base of generatedScenarios(50)) {
      for (const m of [6, 84, base.termMonths]) {
        const t = sale({ ...base, sale: { exitMonth: m, tax: TAX_ON } }).tax;
        if (!t) throw new Error('no tax');
        expect(t.totalTax).toBe(roundCents(t.recaptureTax + t.capitalGainsTax));
        if (t.taxableGain <= 0) {
          expect(t.recaptureTax).toBe(0);
          expect(t.capitalGainsTax).toBe(0);
        }
      }
    }
  });
});
