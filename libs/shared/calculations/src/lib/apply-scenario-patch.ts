import type { LoanScenario } from './types';
import { calculatePrincipalFromHomePriceAndDownPayment } from './calculate-principal';

/**
 * The single enforcement point for FR-014's auto-calculate/override state
 * machine. Every edit to a `LoanScenario` MUST go through this function
 * instead of a plain object spread.
 */
export function applyScenarioPatch(
  scenario: LoanScenario,
  patch: Partial<LoanScenario>,
): LoanScenario {
  const next: LoanScenario = { ...scenario, ...patch };

  // Rental assumptions merge shallowly so a single-field edit never drops the
  // other fields; an explicit `rental: null` clears the rental analysis.
  if ('rental' in patch && patch.rental != null) {
    next.rental = scenario.rental
      ? { ...scenario.rental, ...patch.rental }
      : patch.rental;
  }

  // Sale assumptions (spec 013) merge the same way; an explicit `sale: null` clears them.
  if ('sale' in patch && patch.sale != null) {
    next.sale = scenario.sale ? { ...scenario.sale, ...patch.sale } : patch.sale;
  }

  // Rule 1 (and rule 4's precedence): an explicit `principal` in the patch
  // always wins, even if the same patch also touches homePrice/downPayment.
  if ('principal' in patch) {
    return { ...next, principalIsOverridden: true };
  }

  // Rule 2: recompute only once both homePrice and downPayment are present
  // after merging. Rule 3 (leave principal/principalIsOverridden untouched)
  // falls out naturally from `next` already carrying over `scenario`'s values.
  if (
    ('homePrice' in patch || 'downPayment' in patch) &&
    next.homePrice != null &&
    next.downPayment != null
  ) {
    return {
      ...next,
      principal: calculatePrincipalFromHomePriceAndDownPayment(
        next.homePrice,
        next.downPayment,
      ),
      principalIsOverridden: false,
    };
  }

  return next;
}
