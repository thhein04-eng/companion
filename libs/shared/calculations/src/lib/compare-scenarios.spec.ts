import { describe, expect, it } from 'vitest';
import { compareScenarios } from './compare-scenarios';
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

describe('compareScenarios', () => {
  it('returns one row per schedule, in input order, with the correct summary fields', () => {
    const a = computeSchedule(
      baseScenario({ id: 'a', annualInterestRatePct: 6.5 }),
    );
    const b = computeSchedule(
      baseScenario({ id: 'b', annualInterestRatePct: 6.0 }),
    );

    const comparison = compareScenarios([a, b]);

    expect(comparison.rows).toHaveLength(2);
    expect(comparison.rows[0]).toMatchObject({
      scenarioId: 'a',
      monthlyPayment: a.summary.totalMonthlyPayment,
      totalInterest: a.summary.totalInterestPaid,
      totalCost: a.summary.totalPaid,
      payoffDate: a.summary.payoffDate,
    });
    expect(comparison.rows[1]).toMatchObject({
      scenarioId: 'b',
      monthlyPayment: b.summary.totalMonthlyPayment,
    });
  });
});
