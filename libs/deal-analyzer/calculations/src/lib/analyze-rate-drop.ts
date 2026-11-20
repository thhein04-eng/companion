import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
} from 'shared-calculations';
import {
  payoffAt,
  REFINANCE_INVALID_REASON,
  REFINANCE_NO_RATE_REASON,
} from './analyze-cash-out';
import { balanceOwed, breakeven, newPayment } from './refinance-math';
import type { RateDropAnalysis } from './types';
import {
  resolveRefinanceAssumptions,
  validateRefinance,
} from './validate-refinance';

export const RATE_DROP_PAID_OFF_REASON =
  'The loan is already paid off at this month.';

/** Rate-drop mode does not use these, so an invalid value must not block it. */
const CASH_OUT_ONLY = new Set(['refinance.arvDollars', 'refinance.ltvPct']);

/**
 * Keep the current mortgage, or refinance its remaining balance at a new rate? Returns the
 * monthly P&I savings, the exact breakeven month and the net savings over the remaining term
 * (spec 014 US3, contracts/refinance-calculations.md).
 *
 * Preconditions: `validateScenario(scenario).valid` and `schedule = computeSchedule(scenario)`.
 * A rental is not needed.
 */
export function analyzeRateDrop(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): RateDropAnalysis {
  const errors = validateRefinance(scenario).filter(
    (e) => !CASH_OUT_ONLY.has(e.field),
  );
  if (errors.length > 0) {
    return { result: null, naReason: REFINANCE_INVALID_REASON, errors };
  }

  const r = resolveRefinanceAssumptions(scenario);
  if (r.newRatePct == null) {
    return { result: null, naReason: REFINANCE_NO_RATE_REASON, errors };
  }

  // Nothing to refinance at the final month, or once extra payments have cleared the loan.
  const balanceRefinanced = payoffAt(schedule, r.refinanceMonth);
  if (r.remainingMonths === 0 || balanceRefinanced <= 0) {
    return { result: null, naReason: RATE_DROP_PAID_OFF_REASON, errors };
  }

  const horizon = r.remainingMonths;
  const currentPi = schedule.summary.monthlyPrincipalAndInterest;
  const newPi = newPayment(balanceRefinanced, r.newRatePct, r.newTermMonths);
  const monthlySavings = roundCents(currentPi - newPi);
  const owed = balanceOwed(
    balanceRefinanced,
    r.newRatePct,
    r.newTermMonths,
    horizon,
  );

  return {
    result: {
      balanceRefinanced,
      currentPi,
      newPi,
      monthlySavings,
      breakeven: breakeven(
        r.closingCosts,
        monthlySavings,
        horizon,
        r.refinanceMonth,
      ),
      // What the current loan would cost over its remaining term, less what the new loan costs
      // in the same period (it stops paying at its own term), the closing costs and any balance
      // still owed on the new loan (research R10).
      netSavings: roundCents(
        currentPi * horizon -
          newPi * Math.min(horizon, r.newTermMonths) -
          r.closingCosts -
          owed,
      ),
      horizonMonths: horizon,
      newTermMonths: r.newTermMonths,
      termExtended: r.newTermMonths > horizon,
    },
    naReason: null,
    errors,
  };
}
