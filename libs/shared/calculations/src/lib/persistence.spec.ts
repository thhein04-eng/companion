import { describe, expect, it } from 'vitest';
import { deserializeScenarios, serializeScenarios } from './persistence';
import type { LoanScenario, RentalAssumptions } from './types';

function scenario(overrides: Partial<LoanScenario> = {}): LoanScenario {
  return {
    id: 'scenario-1',
    name: 'Scenario 1',
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
    ...overrides,
  };
}

const rental: RentalAssumptions = {
  grossMonthlyRent: 2_400,
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 7_500,
  rehabBudget: 10_000,
};

describe('deserializeScenarios (FR-016)', () => {
  it('normalizes a pre-Deal-Analyzer payload without `rental` to rental === null', () => {
    const legacy = scenario();
    delete (legacy as Partial<LoanScenario>).rental;
    const raw = JSON.stringify({
      scenarios: [legacy],
      activeScenarioId: 'scenario-1',
    });
    const state = deserializeScenarios(raw);
    expect(state?.scenarios[0].rental).toBeNull();
  });

  it('round-trips a scenario with rental assumptions deep-equal', () => {
    const scenarios = [scenario({ rental })];
    const state = deserializeScenarios(
      serializeScenarios(scenarios, 'scenario-1'),
    );
    expect(state).toEqual({ scenarios, activeScenarioId: 'scenario-1' });
  });

  it('returns null for corrupt JSON and never throws', () => {
    expect(deserializeScenarios('{not json')).toBeNull();
    expect(deserializeScenarios(null)).toBeNull();
  });
});
