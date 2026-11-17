import { describe, expect, it } from 'vitest';
import { computeSchedule } from './compute-schedule';
import type { LoanScenario } from './types';

function baseScenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'scenario-1',
    name: 'Baseline',
    principal: 300_000,
    annualInterestRatePct: 6.5,
    termMonths: 360,
    startDate: '2027-01-01',
    paymentFrequency: 'monthly',
    homePrice: null,
    downPayment: null,
    annualPropertyTax: null,
    annualInsurance: null,
    pmiAnnualRatePct: null,
    monthlyHoa: null,
    extraPayments: [],
    principalIsOverridden: false,
    ...overrides,
  };
}

describe('computeSchedule — User Story 1 baseline', () => {
  it('matches the closed-form amortization formula to the cent (SC-002, FR-002, FR-003, FR-004)', () => {
    const schedule = computeSchedule(baseScenario());

    expect(schedule.periods).toHaveLength(360);
    expect(schedule.summary.monthlyPrincipalAndInterest).toBeCloseTo(1896.2, 2);
    expect(schedule.periods[0].paymentAmount).toBeCloseTo(1896.2, 2);

    const sumInterest = schedule.periods.reduce((sum, p) => sum + p.interestPortion, 0);
    expect(schedule.summary.totalInterestPaid).toBeCloseTo(sumInterest, 2);

    const last = schedule.periods[schedule.periods.length - 1];
    expect(last.remainingBalance).toBe(0);
  });

  it('handles a 0% interest rate with a straight-line principal schedule and no division by zero', () => {
    const schedule = computeSchedule(baseScenario({ annualInterestRatePct: 0, termMonths: 12 }));

    expect(schedule.periods).toHaveLength(12);
    for (const period of schedule.periods) {
      expect(period.interestPortion).toBe(0);
      expect(Number.isFinite(period.principalPortion)).toBe(true);
    }
    expect(schedule.periods[schedule.periods.length - 1].remainingBalance).toBe(0);
    expect(schedule.summary.totalInterestPaid).toBe(0);
  });

  it('rolls a month-end start date (the 31st) consistently for every subsequent period', () => {
    const schedule = computeSchedule(
      baseScenario({ startDate: '2027-01-31', termMonths: 4 })
    );

    expect(schedule.periods.map((p) => p.date)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
  });

  it('computes a 360-period schedule well within the SC-005 performance budget', () => {
    const start = performance.now();
    computeSchedule(baseScenario());
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe('computeSchedule — User Story 2 real-estate costs', () => {
  it('includes PMI while LTV > 80% and drops it at the first period LTV falls to 80% or below (FR-006)', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 280_000,
        homePrice: 300_000,
        downPayment: { amount: 20_000 },
        pmiAnnualRatePct: 0.5,
        termMonths: 360,
      })
    );

    expect(schedule.periods[0].pmiApplies).toBe(true);
    expect(schedule.summary.pmiDropPeriod).not.toBeNull();

    const dropPeriod = schedule.summary.pmiDropPeriod as number;
    expect(schedule.periods[dropPeriod - 2].pmiApplies).toBe(true);
    expect(schedule.periods[dropPeriod - 1].pmiApplies).toBe(false);

    const dropRow = schedule.periods[dropPeriod - 1];
    expect(dropRow.remainingBalance / 300_000).toBeLessThanOrEqual(0.8);
  });

  it('never applies PMI when the down payment is already at least 20%, and pmiDropPeriod is null', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 240_000,
        homePrice: 300_000,
        downPayment: { amount: 60_000 },
        pmiAnnualRatePct: 0.5,
      })
    );

    expect(schedule.periods.every((p) => !p.pmiApplies)).toBe(true);
    expect(schedule.summary.pmiDropPeriod).toBeNull();
  });

  it('computes the total estimated monthly payment as P&I plus prorated tax/insurance/PMI/HOA, excluding HOA from the schedule columns (FR-005)', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 280_000,
        homePrice: 300_000,
        downPayment: { amount: 20_000 },
        annualPropertyTax: 4_200,
        annualInsurance: 1_500,
        pmiAnnualRatePct: 0.5,
        monthlyHoa: 50,
      })
    );

    const expectedPmiMonthly = ((0.5 / 100) * 280_000) / 12;
    const expectedTotal =
      schedule.summary.monthlyPrincipalAndInterest +
      4_200 / 12 +
      1_500 / 12 +
      expectedPmiMonthly +
      50;
    expect(schedule.summary.totalMonthlyPayment).toBeCloseTo(expectedTotal, 2);

    // HOA must not leak into any period's principal/interest/balance columns.
    const withoutHoa = computeSchedule(
      baseScenario({
        principal: 280_000,
        homePrice: 300_000,
        downPayment: { amount: 20_000 },
        annualPropertyTax: 4_200,
        annualInsurance: 1_500,
        pmiAnnualRatePct: 0.5,
      })
    );
    expect(schedule.periods[0].principalPortion).toBe(withoutHoa.periods[0].principalPortion);
    expect(schedule.periods[0].interestPortion).toBe(withoutHoa.periods[0].interestPortion);
    expect(schedule.periods[0].remainingBalance).toBe(withoutHoa.periods[0].remainingBalance);
  });
});

describe('computeSchedule — User Story 3 extra payments', () => {
  it('shortens the payoff and reports periodsSaved/interestSaved against the no-extra-payment baseline (FR-007, FR-008)', () => {
    const withExtra = computeSchedule(
      baseScenario({ extraPayments: [{ id: 'e1', kind: 'recurring', amount: 200, startPeriod: 1 }] })
    );
    const baseline = computeSchedule(baseScenario());

    expect(withExtra.periods.length).toBeLessThan(baseline.periods.length);
    expect(withExtra.baselineComparison).not.toBeNull();
    expect(withExtra.baselineComparison?.periodsSaved).toBe(
      baseline.periods.length - withExtra.periods.length
    );
    expect(withExtra.baselineComparison?.interestSaved).toBeCloseTo(
      baseline.summary.totalInterestPaid - withExtra.summary.totalInterestPaid,
      2
    );
    expect(withExtra.summary.totalInterestPaid).toBeLessThan(baseline.summary.totalInterestPaid);
  });

  it('applies a one-time extra payment entirely to principal in its enclosing period', () => {
    const schedule = computeSchedule(
      baseScenario({
        termMonths: 24,
        extraPayments: [{ id: 'e1', kind: 'oneTime', amount: 10_000, date: '2027-06-01' }],
      })
    );

    const targetPeriod = schedule.periods.find((p) => p.date === '2027-06-01');
    expect(targetPeriod).toBeDefined();
    expect(targetPeriod?.extraPrincipalApplied).toBe(10_000);
  });

  it('caps an extra payment at the remaining balance and marks the loan paid off without a negative balance', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 5_000,
        termMonths: 360,
        extraPayments: [{ id: 'e1', kind: 'oneTime', amount: 1_000_000, date: '2027-01-01' }],
      })
    );

    expect(schedule.periods).toHaveLength(1);
    expect(schedule.periods[0].remainingBalance).toBe(0);
    expect(schedule.periods[0].remainingBalance).toBeGreaterThanOrEqual(0);
  });
});

describe('computeSchedule — summary.monthlyPmiAmount (Deal Analyzer, research R2)', () => {
  it('exposes the cents-rounded monthly PMI amount when PMI applies', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 280_000,
        homePrice: 300_000,
        downPayment: { amount: 20_000 },
        pmiAnnualRatePct: 0.5,
      })
    );
    expect(schedule.summary.monthlyPmiAmount).toBe(Math.round(((0.5 / 100) * 280_000 / 12) * 100) / 100);
    expect(schedule.summary.monthlyPmiAmount).toBe(116.67);
  });

  it('is 0 when there is no PMI rate or no home price', () => {
    expect(computeSchedule(baseScenario()).summary.monthlyPmiAmount).toBe(0);
    expect(
      computeSchedule(baseScenario({ pmiAnnualRatePct: 0.5, homePrice: null })).summary.monthlyPmiAmount
    ).toBe(0);
  });

  it('is 0 when PMI never applies because the down payment is already at least 20%', () => {
    const schedule = computeSchedule(
      baseScenario({
        principal: 240_000,
        homePrice: 300_000,
        downPayment: { amount: 60_000 },
        pmiAnnualRatePct: 0.5,
      })
    );
    expect(schedule.summary.monthlyPmiAmount).toBe(0);
  });
});
