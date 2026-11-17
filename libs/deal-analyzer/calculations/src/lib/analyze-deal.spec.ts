import { describe, expect, it } from 'vitest';
import {
  computeSchedule,
  roundCents,
  type LoanScenario,
  type RentalAssumptions,
} from 'shared-calculations';
import { analyzeDeal } from './analyze-deal';
import type { DealAnalysis } from './types';

/**
 * Reference vector A (contracts/deal-analysis-engine.md): $250k purchase,
 * 25% down, 7% / 30yr, $2,400 rent, $3,000/yr tax, $1,200/yr insurance,
 * 5/8/5/5% vacancy/management/maintenance/CapEx, $7,500 closing, $10,000 rehab.
 */
const RENTAL_A: RentalAssumptions = {
  grossMonthlyRent: 2_400,
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 7_500,
  rehabBudget: 10_000,
};

function scenarioA(
  overrides: Partial<LoanScenario> = {},
  rentalOverrides: Partial<RentalAssumptions> = {},
): LoanScenario {
  return {
    id: 'deal-a',
    name: 'Deal A',
    principal: 187_500,
    annualInterestRatePct: 7,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: 250_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 3_000,
    annualInsurance: 1_200,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    rental: { ...RENTAL_A, ...rentalOverrides },
    ...overrides,
  };
}

function analyze(scenario: LoanScenario): DealAnalysis {
  return analyzeDeal(scenario, computeSchedule(scenario));
}

function expectAllFinite(value: unknown, path = 'analysis'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} must be finite, got ${value}`).toBe(
      true,
    );
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      expectAllFinite(child, `${path}.${key}`);
    }
  }
}

describe('analyzeDeal — User Story 1: NOI and cash flow', () => {
  it('vector A: matches hand-calculated income, expenses, NOI, debt service, and cash flow to the cent (SC-001)', () => {
    const a = analyze(scenarioA());

    expect(a.grossScheduledIncome).toEqual({ monthly: 2_400, annual: 28_800 });
    expect(a.totalOperatingExpenses).toEqual({ monthly: 902, annual: 10_824 });
    expect(a.netOperatingIncome).toEqual({ monthly: 1_498, annual: 17_976 });
    expect(a.debtService).toEqual({ monthly: 1_247.44, annual: 14_969.28 });
    expect(a.cashFlow).toEqual({ monthly: 250.56, annual: 3_006.72 });
  });

  it('vector A: itemizes all 7 operating-expense categories in fixed order, reusing tax/insurance/HOA (FR-003)', () => {
    const a = analyze(scenarioA());
    expect(a.operatingExpenses.map((line) => line.category)).toEqual([
      'propertyTax',
      'insurance',
      'hoa',
      'vacancy',
      'management',
      'maintenance',
      'capex',
    ]);
    expect(a.operatingExpenses.map((line) => line.monthly)).toEqual([
      250, 100, 0, 120, 192, 120, 120,
    ]);
  });

  it('vector A + custom expenses: appends each as its own uniquely keyed line and flows into NOI and cash flow to the cent', () => {
    const a = analyze(
      scenarioA(
        {},
        {
          customExpenses: [
            { id: 'water', label: 'Water', monthlyAmount: 75.5 },
            { label: 'Trash', monthlyAmount: 24.5 },
          ],
        }
      )
    );

    expect(a.operatingExpenses.slice(7)).toEqual([
      { category: 'custom-water', label: 'Water', monthly: 75.5, annual: 906 },
      { category: 'custom-1', label: 'Trash', monthly: 24.5, annual: 294 },
    ]);
    expect(a.totalOperatingExpenses).toEqual({ monthly: 1_002, annual: 12_024 });
    expect(a.netOperatingIncome).toEqual({ monthly: 1_398, annual: 16_776 });
    expect(a.cashFlow).toEqual({ monthly: 150.56, annual: 1_806.72 });
  });

  it('vector C: debt service includes PMI for every year-1 month it applies (FR-005)', () => {
    const scenario = scenarioA({
      principal: 225_000,
      downPayment: { percent: 10 },
      pmiAnnualRatePct: 0.5,
    });
    const schedule = computeSchedule(scenario);
    const a = analyzeDeal(scenario, schedule);

    expect(schedule.summary.monthlyPmiAmount).toBe(93.75);
    expect(schedule.periods.slice(0, 12).every((p) => p.pmiApplies)).toBe(true);
    expect(a.debtService.annual).toBe(
      roundCents(
        12 * schedule.summary.monthlyPrincipalAndInterest +
          12 * schedule.summary.monthlyPmiAmount,
      ),
    );
    expect(a.pmiEndsInYearOne).toBe(false);
    expect(a.pmiDropPeriod).toBe(schedule.summary.pmiDropPeriod);
  });

  it('vector E: 100% vacancy is valid input and produces negative cash flow without throwing', () => {
    const a = analyze(scenarioA({}, { vacancyPct: 100 }));
    expect(a.cashFlow.monthly).toBeLessThan(0);
    expectAllFinite(a);
  });

  it('vector F: zero rent yields negative NOI and no 50% Rule result', () => {
    const a = analyze(scenarioA({}, { grossMonthlyRent: 0 }));
    expect(a.netOperatingIncome.monthly).toBeLessThan(0);
    expect(a.fiftyPercentRule).toBeNull();
    expectAllFinite(a);
  });

  it('vector G: a loan shorter than 12 months only counts its actual payments in year-1 debt service', () => {
    const scenario = scenarioA({ termMonths: 6 });
    const schedule = computeSchedule(scenario);
    const a = analyzeDeal(scenario, schedule);
    expect(schedule.periods).toHaveLength(6);
    expect(a.debtService.annual).toBe(
      roundCents(schedule.summary.monthlyPrincipalAndInterest * 6),
    );
  });

  it('invariants: NOI = GSI − opex and cash flow = NOI − debt service', () => {
    for (const scenario of [
      scenarioA(),
      scenarioA({}, { otherMonthlyIncome: 137.5, managementPct: 9.5 }),
    ]) {
      const a = analyze(scenario);
      expect(a.netOperatingIncome.annual).toBe(
        roundCents(
          a.grossScheduledIncome.annual - a.totalOperatingExpenses.annual,
        ),
      );
      expect(a.cashFlow.annual).toBe(
        roundCents(a.netOperatingIncome.annual - a.debtService.annual),
      );
      expectAllFinite(a);
    }
  });

  it('excludes extra principal payments from debt service (research R2)', () => {
    const base = analyze(scenarioA());
    const withExtra = analyze(
      scenarioA({
        extraPayments: [
          { id: 'x', kind: 'recurring', amount: 500, startPeriod: 1 },
        ],
      }),
    );
    expect(withExtra.debtService).toEqual(base.debtService);
    expect(withExtra.cashFlow).toEqual(base.cashFlow);
  });

  it('counts missing tax/insurance/HOA as $0 and counts HOA once, as an operating expense', () => {
    const noCosts = analyze(
      scenarioA({ annualPropertyTax: null, annualInsurance: null }),
    );
    expect(
      noCosts.operatingExpenses.find((l) => l.category === 'propertyTax')
        ?.monthly,
    ).toBe(0);

    const withHoa = analyze(scenarioA({ monthlyHoa: 150 }));
    expect(
      withHoa.operatingExpenses.find((l) => l.category === 'hoa')?.monthly,
    ).toBe(150);
    expect(withHoa.debtService).toEqual(analyze(scenarioA()).debtService);
  });
});

describe('analyzeDeal — User Story 2: cash invested and Cash-on-Cash Return', () => {
  it('vector A: total cash invested is down payment + closing + rehab, and CoC = annual cash flow ÷ cash invested', () => {
    const a = analyze(scenarioA());
    expect(a.totalCashInvested).toBe(80_000);
    expect(a.cashOnCashReturn.value).toBeCloseTo(3_006.72 / 80_000, 4);
    expect(a.cashOnCashReturn.naReason).toBeNull();
  });

  it('vector B: zero cash invested makes CoC not applicable instead of Infinity (FR-008)', () => {
    const a = analyze(
      scenarioA(
        { principal: 250_000, downPayment: { percent: 0 } },
        { closingCosts: 0, rehabBudget: 0 },
      ),
    );
    expect(a.totalCashInvested).toBe(0);
    expect(a.cashOnCashReturn).toEqual({
      value: null,
      naReason: 'No cash invested — Cash-on-Cash Return is undefined.',
    });
    expectAllFinite(a);
  });

  it('resolves dollar and percent down payments to the same cash invested', () => {
    const percent = analyze(scenarioA());
    const dollars = analyze(scenarioA({ downPayment: { amount: 62_500 } }));
    expect(dollars.totalCashInvested).toBe(percent.totalCashInvested);
  });

  it('reports a negative CoC when cash flow is negative', () => {
    const a = analyze(scenarioA({}, { grossMonthlyRent: 1_500 }));
    expect(a.cashOnCashReturn.value).toBeLessThan(0);
  });
});

describe('analyzeDeal — User Story 3: cap rate and rules of thumb', () => {
  it('vector A: cap rate = annual NOI ÷ purchase price (FR-009)', () => {
    const a = analyze(scenarioA());
    expect(a.capRate.value).toBeCloseTo(17_976 / 250_000, 4);
    expect(a.capRate.naReason).toBeNull();
  });

  it('vector A: 1% Rule fails at $2,400 rent against a $2,500 target (FR-010)', () => {
    expect(analyze(scenarioA()).onePercentRule).toEqual({
      pass: false,
      targetRent: 2_500,
      actualRent: 2_400,
    });
    expect(
      analyze(scenarioA({}, { grossMonthlyRent: 2_500 })).onePercentRule?.pass,
    ).toBe(true);
  });

  it('vector A: 50% Rule reports the opex ratio, within-rule flag, and rule-estimated cash flow (FR-011)', () => {
    const rule = analyze(scenarioA()).fiftyPercentRule;
    expect(rule?.opexRatio).toBeCloseTo(902 / 2_400, 4);
    expect(rule?.withinRule).toBe(true);
    expect(rule?.estimatedMonthlyCashFlow).toBe(-47.44);
  });

  it('the 1% Rule uses rent only, not other income (research R4)', () => {
    const a = analyze(scenarioA({}, { otherMonthlyIncome: 200 }));
    expect(a.onePercentRule?.actualRent).toBe(2_400);
  });

  it('vector D: without a purchase price, cap rate and 1% Rule are not applicable but NOI/cash flow still compute', () => {
    const a = analyze(scenarioA({ homePrice: null, downPayment: null }));
    expect(a.capRate.value).toBeNull();
    expect(a.capRate.naReason).toBe(
      'Enter a purchase price to see the cap rate.',
    );
    expect(a.onePercentRule).toBeNull();
    expect(a.netOperatingIncome.monthly).toBe(1_498);
    expect(a.cashFlow.monthly).toBe(250.56);
  });

  it('vector F: zero rent → no 50% Rule result and a negative cap rate', () => {
    const a = analyze(scenarioA({}, { grossMonthlyRent: 0 }));
    expect(a.fiftyPercentRule).toBeNull();
    expect(a.capRate.value).toBeLessThan(0);
  });
});
