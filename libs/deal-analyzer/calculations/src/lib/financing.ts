import type {
  FinancingTerms,
  LoanScenario,
  RentalAssumptions,
} from 'shared-calculations';

/** Rounds away floating-point drift (e.g. 7 − 0.5 + 1e-16) so derived terms read cleanly. */
function clean(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

/**
 * The matrix terms derived from the scenario until the investor edits them
 * (spec 006 FR-009, data-model §A). Requires `scenario.homePrice > 0`.
 */
export function defaultFinancingTerms(scenario: LoanScenario): FinancingTerms {
  const price = scenario.homePrice as number;
  const rate = scenario.annualInterestRatePct;
  const down = clean(Math.max(0, (1 - scenario.principal / price) * 100));
  return {
    conventional: { downPaymentPct: down, annualRatePct: rate, termYears: 30 },
    arm: {
      downPaymentPct: down,
      annualRatePct: clean(Math.max(0, rate - 0.5)),
      termYears: 30,
      fixedPeriodYears: 7,
      adjustedRatePct: clean(rate + 1.5),
    },
    dscr: {
      downPaymentPct: 25,
      annualRatePct: clean(rate + 1),
      termYears: 30,
    },
  };
}

/** Stored terms when the investor has edited the matrix, otherwise the derived defaults (research R7). */
export function resolveFinancingTerms(scenario: LoanScenario): {
  terms: FinancingTerms;
  isCustomized: boolean;
} {
  const stored = (scenario.rental as RentalAssumptions | null | undefined)
    ?.financing;
  return stored
    ? { terms: stored, isCustomized: true }
    : { terms: defaultFinancingTerms(scenario), isCustomized: false };
}
