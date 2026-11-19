import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RentalAssumptions,
  type WealthAssumptions,
} from 'shared-calculations';
import { projectRental } from './project-rental';
import { projectWealth } from './project-wealth';
import { rentalLineItems } from './rental-line-items';
import type { WealthYear } from './types';
import { resolveWealthAssumptions } from './validate-wealth';
import { referenceScenario } from './__fixtures__/dscr-reference';
import { generatedScenarios } from './__fixtures__/generated-scenarios';

const TYPICAL = {
  appreciationPct: 3,
  rentGrowthPct: 2.5,
  expenseGrowthPct: 2.5,
};

function scenario(
  overrides: Partial<LoanScenario> = {},
  rental: Partial<RentalAssumptions> = {},
  wealth?: WealthAssumptions,
): LoanScenario {
  return referenceScenario(overrides, {
    ...TYPICAL,
    ...rental,
    ...(wealth ? { wealth } : {}),
  });
}

function project(s: LoanScenario) {
  return projectWealth(s, computeSchedule(s));
}

function rows(s: LoanScenario): WealthYear[] {
  const years = project(s).years;
  if (!years) throw new Error('no projection');
  return years;
}

/** research.md § Reference scenario, every column. */
const REFERENCE: Record<number, Partial<WealthYear>> = {
  1: {
    noi: 28512,
    cashFlow: 4561.08,
    interest: 20903.45,
    taxableIncome: -4027.81,
    taxEffect: 966.67,
    propertyValue: 412000,
    loanBalance: 296952.57,
    equity: 115047.43,
    cumulativeCashFlow: 4561.08,
    netWorth: 119608.51,
    netWorthAfterTax: 120575.18,
  },
  2: {
    noi: 29224.8,
    cashFlow: 5273.88,
    interest: 20683.16,
    taxableIncome: -3094.72,
    taxEffect: 742.73,
    propertyValue: 424360,
    loanBalance: 293684.84,
    equity: 130675.16,
    cumulativeCashFlow: 9834.96,
    netWorth: 140510.12,
    netWorthAfterTax: 142219.52,
  },
  5: {
    noi: 31471.91,
    cashFlow: 7520.99,
    interest: 19922,
    taxableIncome: -86.45,
    taxEffect: 20.75,
    propertyValue: 463709.63,
    loanBalance: 282394.77,
    equity: 181314.86,
    cumulativeCashFlow: 30113.84,
    netWorth: 211428.7,
    netWorthAfterTax: 213939.7,
  },
  6: {
    noi: 32258.71,
    cashFlow: 8307.79,
    interest: 19630.79,
    taxableIncome: 991.56,
    taxEffect: -237.97,
    propertyValue: 477620.92,
    loanBalance: 278074.66,
    equity: 199546.26,
    cumulativeCashFlow: 38421.63,
    netWorth: 237967.89,
    netWorthAfterTax: 240240.92,
  },
  10: {
    noi: 35607.58,
    cashFlow: 11656.66,
    interest: 18239.46,
    taxableIncome: 5731.76,
    taxEffect: -1375.62,
    propertyValue: 537566.55,
    loanBalance: 257437.15,
    equity: 280129.4,
    cumulativeCashFlow: 79921.62,
    netWorth: 360051.02,
    netWorthAfterTax: 358581.92,
  },
};

describe('projectWealth — reference scenario (US1)', () => {
  const projection = project(scenario());

  it('starts at purchase with equity = net worth = $100,000', () => {
    expect(projection.years?.[0]).toMatchObject({
      year: 0,
      propertyValue: 400_000,
      loanBalance: 300_000,
      equity: 100_000,
      noi: 0,
      cashFlow: 0,
      cumulativeCashFlow: 0,
      netWorth: 100_000,
      netWorthAfterTax: 100_000,
    });
  });

  it.each(Object.entries(REFERENCE))(
    'reproduces research.md year %s to the cent',
    (year, expected) => {
      expect(projection.years?.[Number(year)]).toMatchObject(expected);
    },
  );

  it('covers the 10-year default horizon with a 3.6× multiple', () => {
    expect(projection.years).toHaveLength(11);
    expect(projection.horizonYears).toBe(10);
    expect(projection.totalCashInvested).toBe(100_000);
    expect(projection.multiple.value?.toFixed(1)).toBe('3.6');
    expect(projection.naReason).toBeNull();
    expect(projection.errors).toEqual([]);
  });

  it('override ignores an invalid stored horizon (spec 009 T007)', () => {
    const s = scenario({}, {}, { horizonYears: 31 });
    const result = projectWealth(s, computeSchedule(s), { horizonYears: 3 });
    expect(result.years).toHaveLength(4);
    expect(result.horizonYears).toBe(3);
    expect(result.errors.map((e) => e.field)).toContain(
      'rental.wealth.horizonYears',
    );
  });

  it('ends at year 5 with a 5-year horizon', () => {
    const years = rows(scenario({}, {}, { horizonYears: 5 }));
    expect(years).toHaveLength(6);
    expect(years[5].netWorth).toBe(211428.7);
  });

  it('agrees with projectRental inside the loan term (R1)', () => {
    const s = scenario();
    const rental = projectRental(s, computeSchedule(s)).years;
    for (const y of rows(s).slice(1)) {
      const r = rental[y.year - 1];
      expect([y.noi, y.cashFlow, y.loanBalance]).toEqual([
        r.noi,
        r.cashFlow,
        r.loanBalance,
      ]);
    }
  });

  it('continues past the loan term with no debt', () => {
    const s = scenario({ termMonths: 180 }, {}, { horizonYears: 20 });
    const years = rows(s);
    expect(years).toHaveLength(21);
    for (const y of years.slice(16)) {
      expect(y.loanBalance).toBe(0);
      expect(y.interest).toBe(0);
      expect(y.cashFlow).toBe(y.noi);
      expect(y.principalPaid).toBe(300_000);
    }
    expect(years[20].noi).toBeGreaterThan(years[16].noi);
  });

  it.each([
    [360, 30],
    [180, 16],
  ])(
    'has no one-cent seam at the end of a %d-month term',
    (termMonths, horizonYears) => {
      const s = scenario({ termMonths }, {}, { horizonYears });
      const termYears = termMonths / 12;
      const years = rows(s);
      // Independent unrounded NOI for the year after the term.
      const rental = s.rental as RentalAssumptions;
      const gsi =
        (rental.grossMonthlyRent + rental.otherMonthlyIncome) *
        1.025 ** termYears;
      const opex = rentalLineItems(s, gsi, 1.025 ** termYears).reduce(
        (sum, l) => sum + l.monthly,
        0,
      );
      if (horizonYears > termYears) {
        expect(years[termYears + 1].noi).toBe(roundCents((gsi - opex) * 12));
      } else {
        expect(years[termYears].noi).toBe(
          projectRental(s, computeSchedule(s)).years[termYears - 1].noi,
        );
      }
    },
  );

  it('needs a purchase price', () => {
    const projection = project(scenario({ homePrice: null }));
    expect(projection.years).toBeNull();
    expect(projection.naReason).toBe(
      'Enter a purchase price to project equity and net worth.',
    );
  });

  it('reports no multiple without cash invested', () => {
    const s = scenario({ downPayment: { percent: 0 }, principal: 400_000 });
    expect(project(s).multiple).toEqual({
      value: null,
      naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
    });
  });

  it('tracks net worth below equity when cash flow is negative', () => {
    const years = rows(scenario({}, { grossMonthlyRent: 2_000 }));
    expect(years[1].cashFlow).toBeLessThan(0);
    expect(years[1].netWorth).toBeLessThan(years[1].equity);
  });

  it('defaults the assumptions for a session saved before this feature', () => {
    expect(
      resolveWealthAssumptions(referenceScenario().rental as RentalAssumptions),
    ).toEqual({
      horizonYears: 10,
      forcedAppreciation: 0,
      landValuePct: 20,
      marginalTaxRatePct: 24,
    });
  });
});

describe('projectWealth — invariants (SC-005)', () => {
  it.each(generatedScenarios(20).map((s) => [s.id, s] as const))(
    '%s: equity parts, net worth and depreciation hold every year',
    (_id, s) => {
      const projection = project(s);
      const years = projection.years as WealthYear[];
      let totalDepreciation = 0;
      for (const y of years) {
        expect(
          roundCents(
            y.initialEquity +
              y.forcedAppreciation +
              y.marketAppreciation +
              y.principalPaid,
          ),
        ).toBe(y.equity);
        expect(roundCents(y.netWorth - y.equity)).toBe(y.cumulativeCashFlow);
        totalDepreciation = roundCents(totalDepreciation + y.depreciation);
      }
      expect(totalDepreciation).toBeLessThanOrEqual(
        projection.depreciableBasis as number,
      );
    },
  );
});

describe('projectWealth — drivers (US2)', () => {
  it('adds forced appreciation at purchase and compounds it', () => {
    const base = rows(scenario());
    const forced = rows(scenario({}, {}, { forcedAppreciation: 20_000 }));
    expect(forced[0]).toMatchObject({
      propertyValue: 420_000,
      equity: 120_000,
      forcedAppreciation: 20_000,
      marketAppreciation: 0,
    });
    expect(forced[10].equity).toBe(roundCents(base[10].equity + 26878.33));
    expect(forced[10].marketAppreciation).toBe(
      roundCents(forced[10].propertyValue - 400_000 - 20_000),
    );
    expect(forced.every((y) => y.forcedAppreciation === 20_000)).toBe(true);
  });

  it('keeps value and NOI flat at 0% growth', () => {
    const years = rows(
      scenario(
        {},
        { appreciationPct: 0, rentGrowthPct: 0, expenseGrowthPct: 0 },
      ),
    );
    expect(new Set(years.map((y) => y.propertyValue))).toEqual(
      new Set([400_000]),
    );
    expect(new Set(years.slice(1).map((y) => y.noi))).toEqual(
      new Set([28_512]),
    );
  });

  it('handles falling values', () => {
    const years = rows(scenario({}, { appreciationPct: -2 }));
    expect(years[10].propertyValue).toBeLessThan(400_000);
    expect(years[10].marketAppreciation).toBeLessThan(0);
  });

  it('blanks the projection for a negative forced appreciation', () => {
    const projection = project(scenario({}, {}, { forcedAppreciation: -1 }));
    expect(projection.years).toBeNull();
    expect(projection.naReason).toBe(
      'Fix the projection assumptions to see the projection.',
    );
    expect(projection.errors).toEqual([
      {
        field: 'rental.wealth.forcedAppreciation',
        message: 'Forced appreciation cannot be negative.',
      },
    ]);
  });
});

describe('projectWealth — tax (US3)', () => {
  it('depreciates the building over 27.5 years', () => {
    const projection = project(scenario());
    expect(projection.depreciableBasis).toBe(320_000);
    expect(projection.taxNaReason).toBeNull();
    expect(
      projection.years?.slice(1).every((y) => y.depreciation === 11636.36),
    ).toBe(true);
  });

  it('includes rehab in the basis', () => {
    const projection = project(scenario({}, { rehabBudget: 10_000 }));
    expect(projection.depreciableBasis).toBe(330_000);
    expect(projection.years?.[1].depreciation).toBe(12_000);
  });

  it('stops depreciating once the basis is used up', () => {
    const years = rows(scenario({}, {}, { horizonYears: 30 }));
    expect(years[27].depreciation).toBe(11636.36);
    expect(years[28].depreciation).toBe(5818.28);
    expect(years[29].depreciation).toBe(0);
    expect(years[30].depreciation).toBe(0);
    expect(roundCents(years.reduce((sum, y) => sum + y.depreciation, 0))).toBe(
      320_000,
    );
  });

  it('equals pre-tax net worth at a 0% rate', () => {
    for (const y of rows(scenario({}, {}, { marginalTaxRatePct: 0 }))) {
      expect(y.netWorthAfterTax).toBe(y.netWorth);
      expect(Object.is(y.taxEffect, -0)).toBe(false);
    }
  });

  it('lowers interest and balance with extra payments, not cash flow', () => {
    const plain = rows(scenario());
    const extra = rows(
      scenario({
        extraPayments: [
          { id: 'x', kind: 'recurring', amount: 500, startPeriod: 1 },
        ],
      }),
    );
    expect(extra[5].interest).toBeLessThan(plain[5].interest);
    expect(extra[5].loanBalance).toBeLessThan(plain[5].loanBalance);
    expect(extra[5].cashFlow).toBe(plain[5].cashFlow);
  });

  it.each([[{ landValuePct: 100 }], [{ marginalTaxRatePct: 61 }]])(
    'blanks only the tax figures for %o',
    (wealth) => {
      const valid = project(scenario());
      const invalid = project(scenario({}, {}, wealth));
      expect(invalid.taxNaReason).toBe(
        'Fix the tax assumptions to see after-tax figures.',
      );
      expect(invalid.depreciableBasis).toBeNull();
      for (const [i, y] of (invalid.years as WealthYear[]).entries()) {
        expect([
          y.taxableIncome,
          y.taxEffect,
          y.cumulativeTaxEffect,
          y.netWorthAfterTax,
        ]).toEqual([null, null, null, null]);
        const v = (valid.years as WealthYear[])[i];
        expect([y.netWorth, y.equity, y.cashFlow]).toEqual([
          v.netWorth,
          v.equity,
          v.cashFlow,
        ]);
      }
    },
  );
});
