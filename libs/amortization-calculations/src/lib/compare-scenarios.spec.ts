import { describe, expect, it } from 'vitest';
import { analyzeDeal } from './analyze-deal';
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
    const a = computeSchedule(baseScenario({ id: 'a', annualInterestRatePct: 6.5 }));
    const b = computeSchedule(baseScenario({ id: 'b', annualInterestRatePct: 6.0 }));

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

describe('compareScenarios — deal metrics (Deal Analyzer, FR-014)', () => {
  const rental = {
    grossMonthlyRent: 2_400,
    otherMonthlyIncome: 0,
    vacancyPct: 5,
    managementPct: 8,
    maintenanceReservePct: 5,
    capexReservePct: 5,
    closingCosts: 7_500,
    rehabBudget: 10_000,
  };
  const rentalScenario = baseScenario({
    id: 'rental',
    principal: 187_500,
    annualInterestRatePct: 7,
    homePrice: 250_000,
    downPayment: { percent: 25 },
    annualPropertyTax: 3_000,
    annualInsurance: 1_200,
    rental,
  });

  it('carries cash flow, NOI, cap rate, and CoC from each scenario’s analysis', () => {
    const rentalSchedule = computeSchedule(rentalScenario);
    const analysis = analyzeDeal(rentalScenario, rentalSchedule);
    const plain = computeSchedule(baseScenario({ id: 'plain' }));

    const comparison = compareScenarios([rentalSchedule, plain], { rental: analysis, plain: null });

    expect(comparison.rows[0]).toMatchObject({
      monthlyCashFlow: analysis.cashFlow.monthly,
      annualNoi: analysis.netOperatingIncome.annual,
      capRate: analysis.capRate.value,
      cashOnCashReturn: analysis.cashOnCashReturn.value,
    });
    expect(comparison.rows[0].monthlyCashFlow).toBe(250.56);
    expect(comparison.rows[1]).toMatchObject({
      monthlyCashFlow: null,
      annualNoi: null,
      capRate: null,
      cashOnCashReturn: null,
    });
  });

  it('yields null deal fields for scenarios missing from the map, or when no map is passed', () => {
    const a = computeSchedule(baseScenario({ id: 'a' }));
    const b = computeSchedule(baseScenario({ id: 'b' }));
    for (const comparison of [compareScenarios([a, b], {}), compareScenarios([a, b])]) {
      for (const row of comparison.rows) {
        expect(row).toMatchObject({ monthlyCashFlow: null, annualNoi: null, capRate: null, cashOnCashReturn: null });
      }
    }
  });
});
