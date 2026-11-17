import { describe, expect, it } from 'vitest';
import { computeLtv } from './ltv';
import type { LoanScenario, RentalAssumptions } from './types';

/** Reference vector A from spec 002 (loan side only matters for LTV). */
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

describe('computeLtv (FR-013)', () => {
  it('vector A: loan ÷ purchase price', () => {
    expect(computeLtv(scenarioA())).toEqual({ value: 0.75, naReason: null });
  });

  it('is not applicable without a purchase price', () => {
    expect(computeLtv(scenarioA({ homePrice: null }))).toEqual({
      value: null,
      naReason: 'Enter a purchase price to see LTV.',
    });
  });
});
