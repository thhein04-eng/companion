import {
  monthlyPayment,
  remainingBalance,
  roundCents,
} from 'shared-calculations';
import type { RateDropBreakeven } from './types';

/**
 * Internal helpers shared by `analyzeCashOut` and `analyzeRateDrop` (spec 014). Not exported
 * from the lib's `index.ts`; import relatively.
 */

export const NO_SAVINGS_REASON =
  'The new payment is not lower than your current payment';

/**
 * The cents-rounded monthly P&I a lender would bill, the same rounding `computeSchedule` applies
 * to `summary.monthlyPrincipalAndInterest` (research R3, R4).
 */
export function newPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  return roundCents(monthlyPayment(principal, annualRatePct, termMonths));
}

/**
 * The first whole month in which cumulative monthly savings cover the closing costs (research
 * R8), in integer cents so a boundary like $4,500.00 / $250.00 is exactly 18, never 19.
 *
 * `savings` is the cents-rounded monthly P&I saving. `horizonMonths` is the months remaining on
 * the current loan, and `refinanceMonth` places the result on the loan's own calendar.
 */
export function breakeven(
  closingCosts: number,
  savings: number,
  horizonMonths: number,
  refinanceMonth: number,
): RateDropBreakeven {
  const savingsCents = Math.round(savings * 100);
  // A payment that does not drop never pays anything back, even when the costs are $0.
  if (savingsCents <= 0) return { kind: 'none', reason: NO_SAVINGS_REASON };

  const costsCents = Math.round(closingCosts * 100);
  if (costsCents <= 0) return { kind: 'immediate' };

  const months = Math.ceil(costsCents / savingsCents);
  if (months > horizonMonths) return { kind: 'beyond-term' };
  return {
    kind: 'month',
    months,
    years: Math.floor(months / 12),
    remainderMonths: months % 12,
    loanMonth: refinanceMonth + months,
  };
}

/**
 * The balance still owed on the new loan when the current loan's remaining term (`horizonMonths`)
 * ends: `0` unless the new term is longer (research R10).
 */
export function balanceOwed(
  principal: number,
  annualRatePct: number,
  newTermMonths: number,
  horizonMonths: number,
): number {
  if (newTermMonths <= horizonMonths) return 0;
  return roundCents(
    remainingBalance(principal, annualRatePct, newTermMonths, horizonMonths),
  );
}
