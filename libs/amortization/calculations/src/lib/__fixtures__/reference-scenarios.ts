import type { LoanScenario } from 'shared-calculations';

/**
 * Reference scenarios for chart dataset tests (contracts/amortization-chart-data.md).
 * Test-only; not exported from the library's public entry point.
 */
export function baseScenario(
  overrides: Partial<LoanScenario> = {},
): LoanScenario {
  return {
    id: 'r1',
    name: 'R1',
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

/** R1: $300,000 at 6.5% for 360 months, starting 2027-01-01, no costs or extras. */
export const R1 = baseScenario();

/** R2: R1 plus a recurring $200 extra principal payment from period 1. */
export const R2 = baseScenario({
  id: 'r2',
  name: 'R2',
  extraPayments: [{ id: 'x1', kind: 'recurring', amount: 200, startPeriod: 1 }],
});

/**
 * R3: real-estate costs. Home price $330,000 with 10% down, so the loan is $297,000
 * (purchase price − down payment, as the calculator auto-computes it). Tax $3,600/yr,
 * insurance $1,200/yr, HOA $50/mo, PMI 0.5%.
 */
export const R3 = baseScenario({
  id: 'r3',
  name: 'R3',
  principal: 297_000,
  homePrice: 330_000,
  downPayment: { percent: 10 },
  annualPropertyTax: 3_600,
  annualInsurance: 1_200,
  monthlyHoa: 50,
  pmiAnnualRatePct: 0.5,
});

/** R4: $12,000 at 0% for 12 months. */
export const R4 = baseScenario({
  id: 'r4',
  name: 'R4',
  principal: 12_000,
  annualInterestRatePct: 0,
  termMonths: 12,
});
