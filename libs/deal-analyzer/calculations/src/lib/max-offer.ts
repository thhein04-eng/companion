import { validateScenario, type LoanScenario } from 'shared-calculations';
import {
  evaluateVariant,
  meetsTarget,
  scenarioVariant,
  type VariantResult,
} from './sensitivity';
import {
  validateSensitivityTarget,
  type SensitivityTarget,
} from './validate-sensitivity';

/** The two measures at one price (data-model §E). */
export interface OfferFigures {
  cashFlowMonthly: number | null;
  /** A fraction (0.08 = 8%), or null when undefined. */
  cashOnCash: number | null;
}

export type MaxOfferResult =
  | {
      status: 'found';
      /** The highest whole-dollar price that meets the target. */
      price: number;
      /** `price − homePrice`, and as a fraction of the home price. */
      deltaFromCurrent: number;
      deltaPct: number;
      /** The deal as entered already meets the target. */
      currentMeets: boolean;
      atOffer: OfferFigures;
      atCurrent: OfferFigures;
    }
  | { status: 'unreachable'; reason: string }
  | { status: 'invalid'; reason: string };

/** The solver never looks above this price. */
export const MAX_OFFER_SEARCH_CAP = 10_000_000_000;

export const UNREACHABLE_REASON =
  'No price reaches this target at this rent and rate. A higher rent or a lower rate would help.';

const figures = (r: VariantResult): OfferFigures => ({
  cashFlowMonthly: r.cashFlowMonthly,
  cashOnCash: r.cashOnCash,
});

/**
 * The Max Allowable Offer (spec 015 FR-011–FR-014): the highest whole-dollar purchase price at
 * which the deal still meets the target, with the rate, down payment, rent and costs as entered.
 *
 * Cash flow never rises with the price (the loan only grows; tax, insurance and HOA are fixed
 * dollars), and for a target ≥ 0 neither does Cash-on-Cash, so the passing prices are a prefix
 * and bisection on whole dollars is exact (research R4).
 *
 * Preconditions are checked here and reported as `invalid`: a valid target, a rental, a home
 * price and a down payment.
 */
export function maxAllowableOffer(
  scenario: LoanScenario,
  target: SensitivityTarget,
): MaxOfferResult {
  const targetErrors = validateSensitivityTarget(target);
  if (targetErrors.length > 0) {
    return { status: 'invalid', reason: targetErrors[0].message };
  }
  if (!scenario.rental)
    return { status: 'invalid', reason: 'Add rent to find an offer.' };
  if (scenario.homePrice == null || !(scenario.homePrice > 0)) {
    return { status: 'invalid', reason: 'Add a home price to find an offer.' };
  }
  if (!scenario.downPayment) {
    return {
      status: 'invalid',
      reason: 'Add a down payment to find an offer.',
    };
  }
  if (!validateScenario(scenario).valid) {
    return {
      status: 'invalid',
      reason: 'Fix the loan inputs to find an offer.',
    };
  }

  const current = Math.round(scenario.homePrice);
  const at = (price: number) =>
    evaluateVariant(scenarioVariant(scenario, { price }));
  const meets = (price: number) => meetsTarget(at(price), target) === true;

  // The lowest price that is a valid deal: a fixed down payment must fit under it and a loan the
  // investor typed in must stay positive. Validity only improves as the price rises.
  const isValid = (price: number) =>
    validateScenario(scenarioVariant(scenario, { price })).valid;
  let invalidBelow = 0;
  let validFrom = Math.max(1, current);
  if (!isValid(1)) {
    while (validFrom - invalidBelow > 1) {
      const mid = Math.floor((invalidBelow + validFrom) / 2);
      if (isValid(mid)) validFrom = mid;
      else invalidBelow = mid;
    }
  } else {
    validFrom = 1;
  }
  const lo = validFrom;

  const atLowest = at(lo);
  if (meetsTarget(atLowest, target) !== true) {
    // Cash-on-Cash with nothing ever invested is undefined, not "too low".
    if (
      target.measure === 'cashOnCash' &&
      atLowest.cashOnCash == null &&
      atLowest.naReason
    ) {
      return { status: 'unreachable', reason: atLowest.naReason };
    }
    return { status: 'unreachable', reason: UNREACHABLE_REASON };
  }

  // Bracket the answer: `pass` meets the target, `fail` does not.
  let pass = lo;
  let fail: number | null = null;
  const start = Math.max(lo, current);
  if (meets(start)) {
    pass = start;
    let probe = start * 2;
    for (;;) {
      if (probe >= MAX_OFFER_SEARCH_CAP) probe = MAX_OFFER_SEARCH_CAP;
      if (meets(probe)) {
        pass = probe;
        if (probe === MAX_OFFER_SEARCH_CAP) break;
        probe *= 2;
      } else {
        fail = probe;
        break;
      }
    }
  } else {
    fail = start;
  }

  if (fail != null) {
    while (fail - pass > 1) {
      const mid = Math.floor((pass + fail) / 2);
      if (meets(mid)) pass = mid;
      else fail = mid;
    }
  }

  const atCurrent = evaluateVariant(scenario);
  return {
    status: 'found',
    price: pass,
    deltaFromCurrent: pass - scenario.homePrice,
    deltaPct: (pass - scenario.homePrice) / scenario.homePrice,
    currentMeets: meetsTarget(atCurrent, target) === true,
    atOffer: figures(at(pass)),
    atCurrent: figures(atCurrent),
  };
}
