import type { LoanScenario, RefinanceAssumptions } from 'shared-calculations';
import { generatedScenarios } from './generated-scenarios';
import { referenceScenario } from './dscr-reference';

/**
 * Spec 014 BRRRR reference deal (contracts/refinance-calculations.md § Reference vectors):
 * $200,000 price, 20% down ($40,000), $160,000 loan at 7% / 30 yr, rehab $50,000, purchase
 * closing costs $6,000, rent $2,800/mo, tax $2,400/yr, insurance $1,200/yr, default reserves
 * (NOI $22,272.00/yr). Refinance at month 12: ARV $320,000, LTV 75%, 6.5% / 30 yr, $5,000 costs.
 */
export function brrrrReference(
  overrides: Partial<LoanScenario> = {},
  refinance: RefinanceAssumptions = {},
): LoanScenario {
  return referenceScenario(
    {
      homePrice: 200_000,
      downPayment: { percent: 20 },
      principal: 160_000,
      annualPropertyTax: 2_400,
      annualInsurance: 1_200,
      refinance: {
        arvDollars: 320_000,
        ltvPct: 75,
        newRatePct: 6.5,
        newTermMonths: 360,
        closingCostsDollars: 5_000,
        refinanceMonth: 12,
        ...refinance,
      },
      ...overrides,
    },
    { grossMonthlyRent: 2_800, closingCosts: 6_000, rehabBudget: 50_000 },
  );
}

/**
 * The $300,000 / 7% / 30-year spec 006 reference loan, refinanced at month 60 to 5.5% with
 * $4,500 closing costs, in Rate-drop mode (contracts § Rate drop).
 */
export function rateDropReference(
  refinance: RefinanceAssumptions = {},
  overrides: Partial<LoanScenario> = {},
): LoanScenario {
  return referenceScenario({
    refinance: {
      mode: 'rate-drop',
      newRatePct: 5.5,
      closingCostsDollars: 4_500,
      refinanceMonth: 60,
      ...refinance,
    },
    ...overrides,
  });
}

/** The BRRRR deal with no rental: cash invested is the $40,000 down payment alone. */
export function nonRentalReference(
  refinance: RefinanceAssumptions = {},
): LoanScenario {
  return brrrrReference({ rental: null }, refinance);
}

/**
 * `generatedScenarios(count)` (which has no refinance inputs, and includes PMI and extra
 * payments) with deterministic refinance inputs attached, so the invariants run over varied
 * data. Every value stays inside the data-model §A ranges; the refinance month may exceed a
 * scenario's term, which the code under test clamps.
 */
export function generatedRefinanceScenarios(count: number): LoanScenario[] {
  let state = 7;
  const rand = () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
  const pick = (lo: number, hi: number) =>
    Math.round((lo + rand() * (hi - lo)) * 10) / 10;
  return generatedScenarios(count).map((scenario, i) => ({
    ...scenario,
    refinance: {
      mode: i % 2 === 0 ? 'cash-out' : 'rate-drop',
      arvDollars: Math.round(pick(150_000, 600_000)),
      ltvPct: Math.round(pick(50, 95)),
      newRatePct: pick(2, 9),
      newTermMonths: Math.round(pick(120, 360)),
      closingCostsDollars: Math.round(pick(0, 10_000)),
      refinanceMonth: Math.round(pick(6, 120)),
    },
  }));
}
