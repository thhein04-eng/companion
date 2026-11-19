import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RentalAssumptions,
  type WealthAssumptions,
} from 'shared-calculations';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { generatedScenarios } from './__fixtures__/generated-scenarios';
import { compareHolds, projectExit } from './project-exit';
import { projectWealth } from './project-wealth';
import type { ExitResult } from './types';

/** Spec 009 research.md § Reference scenario: example growth 3 / 2.5 / 3.5, 7% selling costs. */
const EXAMPLE = {
  rentGrowthPct: 3,
  expenseGrowthPct: 2.5,
  appreciationPct: 3.5,
};

function scenario(
  overrides: Partial<LoanScenario> = {},
  rental: Partial<RentalAssumptions> = {},
  wealth?: WealthAssumptions,
): LoanScenario {
  return referenceScenario(overrides, {
    ...EXAMPLE,
    ...rental,
    ...(wealth ? { wealth } : {}),
  });
}

function exit(s: LoanScenario, hold?: number): ExitResult {
  const p = projectExit(s, computeSchedule(s), hold);
  if (!p.result) throw new Error(p.naReason ?? 'no result');
  return p.result;
}

const npv = (r: number, flows: number[]) =>
  flows.reduce((sum, cf, t) => sum + cf / (1 + r) ** t, 0);

function preTaxSeries(r: ExitResult): number[] {
  const flows = r.years.map((y) => y.cashToInvestor);
  flows[flows.length - 1] += r.netSaleProceeds;
  return [-r.totalCashInvested, ...flows];
}

const REFERENCE = {
  5: [
    475074.52,
    33255.22,
    282394.77,
    159424.53,
    31968.01,
    91392.54,
    '1.9139',
    '0.1496',
  ],
  7: [
    508911.71,
    35623.82,
    273442.24,
    199845.65,
    51574.9,
    151420.55,
    '2.5142',
    '0.1566',
  ],
  10: [
    564239.5,
    39496.77,
    257437.15,
    267305.58,
    89068.22,
    256373.8,
    '3.5637',
    '0.1571',
  ],
} as const;

describe('projectExit — reference scenario (spec 009 US1)', () => {
  it.each(Object.entries(REFERENCE))(
    'hold %s matches the research table',
    (hold, row) => {
      const r = exit(scenario(), Number(hold));
      const [sale, selling, payoff, net, cf, profit, multiple, irr] = row;
      expect(r.salePrice).toBe(sale);
      expect(r.sellingCosts).toBe(selling);
      expect(r.loanPayoff).toBe(payoff);
      expect(r.netSaleProceeds).toBe(net);
      expect(r.preTax.totalCashFlow).toBe(cf);
      expect(r.preTax.totalNetProfit).toBe(profit);
      expect(r.preTax.equityMultiple.value?.toFixed(4)).toBe(multiple);
      expect(r.preTax.irr.value?.toFixed(4)).toBe(irr);
    },
  );

  it('matches year 1 to the cent', () => {
    const y1 = exit(scenario(), 7).years[0];
    expect(y1.cashToInvestor).toBe(4561.08);
    expect(y1.afterTaxCashFlow).toBe(5527.75);
    expect(y1.depreciation).toBe(11636.36);
    expect(y1.interest).toBe(20903.45);
  });

  it('defaults to a 7-year hold for an old session', () => {
    const r = exit(scenario());
    expect(r.holdYears).toBe(7);
    expect(r.sellingCosts).toBe(35623.82);
  });

  it('counts extra principal in cash to investor', () => {
    const r = exit(
      scenario({
        extraPayments: [
          { id: 'x', kind: 'recurring', amount: 500, startPeriod: 1 },
        ],
      }),
      7,
    );
    expect(r.loanPayoff).toBe(219442.75);
    expect(r.netSaleProceeds).toBe(253845.14);
    expect(r.preTax.irr.value?.toFixed(4)).toBe('0.1482');
    expect(r.years[0].cashToInvestor).toBe(-1438.92);
  });
});

describe('projectExit — invariants', () => {
  const all = [scenario(), ...generatedScenarios(20)];

  it('puts |NPV(irr)| under $0.01', () => {
    for (const s of all) {
      const r = exit(s);
      if (r.preTax.irr.value == null) continue;
      expect(Math.abs(npv(r.preTax.irr.value, preTaxSeries(r)))).toBeLessThan(
        0.01,
      );
    }
  });

  it('keeps profit = multiple × invested − invested, to the cent', () => {
    for (const s of all) {
      const r = exit(s);
      const m = r.preTax.equityMultiple.value;
      if (m == null) continue;
      const invested = r.totalCashInvested;
      expect(
        Math.abs(r.preTax.totalNetProfit - (m * invested - invested)),
      ).toBeLessThanOrEqual(0.01);
    }
  });

  it.each([1, 7, 30])(
    'agrees with projectWealth row by row for hold %i',
    (hold) => {
      const s = scenario();
      const sch = computeSchedule(s);
      const wealth = projectWealth(s, sch, { horizonYears: hold }).years ?? [];
      for (const y of exit(s, hold).years) {
        const w = wealth[y.year];
        expect([
          y.propertyValue,
          y.loanBalance,
          y.noi,
          y.interest,
          y.depreciation,
          y.taxEffect,
        ]).toEqual([
          w.propertyValue,
          w.loanBalance,
          w.noi,
          w.interest,
          w.depreciation,
          w.taxEffect,
        ]);
      }
    },
  );
});

describe('projectExit — edges', () => {
  it('has no payoff or debt service past the loan term', () => {
    const r = exit(scenario({ termMonths: 180 }), 20);
    expect(r.loanPayoff).toBe(0);
    for (const y of r.years.slice(15)) expect(y.debtService).toBe(0);
  });

  it('nets the sale price minus payoff at 0% selling costs', () => {
    const r = exit(scenario({}, { exit: { sellingCostsPct: 0 } }), 7);
    expect(r.netSaleProceeds).toBe(roundCents(r.salePrice - r.loanPayoff));
  });

  it('reports undefined returns when nothing is invested', () => {
    const r = exit(
      scenario(
        { downPayment: { percent: 0 }, principal: 400_000 },
        { closingCosts: 0, rehabBudget: 0 },
      ),
      7,
    );
    const na = {
      value: null,
      naReason: 'No cash invested — returns are undefined.',
    };
    expect(r.preTax.irr).toEqual(na);
    expect(r.preTax.equityMultiple).toEqual(na);
  });

  it('needs a purchase price', () => {
    const s = scenario({ homePrice: null, downPayment: null });
    const p = projectExit(s, computeSchedule(s));
    expect(p.result).toBeNull();
    expect(p.naReason).toBe('Enter a purchase price to model a sale.');
  });

  it('holds back the exit on invalid exit inputs', () => {
    const s = scenario({}, { exit: { sellingCostsPct: 20 } });
    const p = projectExit(s, computeSchedule(s));
    expect(p.result).toBeNull();
    expect(p.naReason).toBe(
      'Fix the hold and exit assumptions to see the exit.',
    );
    expect(p.errors.map((e) => e.field)).toContain(
      'rental.exit.sellingCostsPct',
    );
  });

  it('nulls after-tax returns on invalid tax inputs and keeps pre-tax', () => {
    const ok = exit(scenario(), 7);
    const r = exit(scenario({}, {}, { landValuePct: 120 }), 7);
    expect(r.afterTax).toBeNull();
    expect(r.taxNaReason).toBe(
      'Fix the tax assumptions to see after-tax figures.',
    );
    expect(r.preTax).toEqual(ok.preTax);
  });

  it('makes after-tax equal pre-tax at a 0% tax rate', () => {
    const r = exit(scenario({}, {}, { marginalTaxRatePct: 0 }), 7);
    expect(r.afterTax).toEqual(r.preTax);
  });

  it('includes shared forced appreciation in the sale price', () => {
    const s = scenario({}, {}, { forcedAppreciation: 20_000 });
    const r = exit(s, 7);
    const w =
      projectWealth(s, computeSchedule(s), { horizonYears: 7 }).years ?? [];
    expect(r.salePrice).toBe(w[7].propertyValue);
    expect(r.forcedAppreciation).toBe(20_000);
  });
});

describe('compareHolds', () => {
  const holds = (s: LoanScenario) =>
    compareHolds(s, computeSchedule(s)).map((p) => p.result?.holdYears);

  it('compares 5, 7 and 10 for the default hold', () => {
    expect(holds(scenario())).toEqual([5, 7, 10]);
  });

  it('adds a custom hold in order', () => {
    expect(holds(scenario({}, { exit: { holdYears: 12 } }))).toEqual([
      5, 7, 10, 12,
    ]);
  });
});
