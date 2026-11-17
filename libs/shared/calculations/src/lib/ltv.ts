import type { LoanScenario, RatioResult } from './types';

/** Loan-to-value: loan amount ÷ purchase price (FR-013). Not applicable without a purchase price. */
export function computeLtv(scenario: LoanScenario): RatioResult {
  if (scenario.homePrice == null || !(scenario.homePrice > 0)) {
    return { value: null, naReason: 'Enter a purchase price to see LTV.' };
  }
  return { value: scenario.principal / scenario.homePrice, naReason: null };
}
