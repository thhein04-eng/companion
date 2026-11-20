import {
  roundCents,
  type AmortizationSchedule,
  type LoanScenario,
  type RatioResult,
} from 'shared-calculations';
import { analyzeDeal, downPaymentDollars } from './analyze-deal';
import { newPayment } from './refinance-math';
import type { CashOutAnalysis } from './types';
import {
  resolveRefinanceAssumptions,
  validateRefinance,
} from './validate-refinance';

export const CASH_OUT_NO_ARV_REASON =
  'Enter an after-repair value to model a refinance.';
export const REFINANCE_NO_RATE_REASON =
  'Enter a new interest rate to model a refinance.';
export const REFINANCE_INVALID_REASON =
  'Fix the refinance inputs to see the result.';
export const NO_RENTAL_COC_REASON = 'Add rent to see cash-on-cash';
export const ALL_CASH_RECOVERED_REASON = 'All cash recovered';
const NO_INVESTMENT_REASON =
  'No cash invested — capital recycled is undefined.';

/**
 * The remaining balance of the current loan after `month` payments, from the schedule so extra
 * payments are honoured (research R2). Past the last period (paid off early) it is $0.
 */
export function payoffAt(
  schedule: AmortizationSchedule,
  month: number,
): number {
  return month > schedule.periods.length
    ? 0
    : schedule.periods[month - 1].remainingBalance;
}

/**
 * Cash-out refinance at one month: the new loan, the payoff of the current loan and the net
 * proceeds (spec 014 US1, contracts/refinance-calculations.md).
 *
 * Preconditions: `validateScenario(scenario).valid`, `schedule = computeSchedule(scenario)`, and,
 * when `scenario.rental` exists, `validateRental(rental)` is empty.
 */
export function analyzeCashOut(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): CashOutAnalysis {
  const errors = validateRefinance(scenario);
  if (errors.length > 0) {
    return { result: null, naReason: REFINANCE_INVALID_REASON, errors };
  }

  const r = resolveRefinanceAssumptions(scenario);
  if (r.arv == null) {
    return { result: null, naReason: CASH_OUT_NO_ARV_REASON, errors };
  }
  if (r.newRatePct == null) {
    return { result: null, naReason: REFINANCE_NO_RATE_REASON, errors };
  }

  const newLoan = roundCents((r.arv * r.ltvPct) / 100);
  const payoff = payoffAt(schedule, r.refinanceMonth);
  const netProceeds = roundCents(newLoan - payoff - r.closingCosts);
  const currentPi = schedule.summary.monthlyPrincipalAndInterest;
  const newPi = newPayment(newLoan, r.newRatePct, r.newTermMonths);

  // Cash invested and the "before" figures are the rental analysis' own (research R5), so this
  // page agrees with `/deal-analyzer` to the cent. Without a rental there is no income.
  const deal = scenario.rental ? analyzeDeal(scenario, schedule) : null;
  const totalCashInvested = deal
    ? deal.totalCashInvested
    : roundCents(downPaymentDollars(scenario));
  const cashLeft = roundCents(totalCashInvested - netProceeds);
  const allCashRecovered = cashLeft <= 0;
  const capitalRecycledPct: RatioResult =
    totalCashInvested > 0
      ? { value: netProceeds / totalCashInvested, naReason: null }
      : { value: null, naReason: NO_INVESTMENT_REASON };

  const noiAnnual = deal ? deal.netOperatingIncome.annual : null;
  const cashFlowAfter =
    noiAnnual == null ? null : roundCents(noiAnnual - 12 * newPi);
  let cashOnCashAfter: RatioResult;
  if (cashFlowAfter == null) {
    cashOnCashAfter = { value: null, naReason: NO_RENTAL_COC_REASON };
  } else if (allCashRecovered) {
    cashOnCashAfter = { value: null, naReason: ALL_CASH_RECOVERED_REASON };
  } else {
    cashOnCashAfter = { value: cashFlowAfter / cashLeft, naReason: null };
  }

  return {
    result: {
      newLoan,
      payoff,
      closingCosts: r.closingCosts,
      netProceeds,
      isCashIn: netProceeds < 0,
      currentPi,
      newPi,
      piChange: roundCents(newPi - currentPi),
      totalCashInvested,
      cashLeft,
      capitalRecycledPct,
      allCashRecovered,
      // `Math.max` keeps an exact $0 as +0, never -0.
      cashSurplus: allCashRecovered ? Math.max(0, roundCents(-cashLeft)) : 0,
      noiAnnual,
      cashFlowBefore: deal ? deal.cashFlow.annual : null,
      cashOnCashBefore: deal
        ? deal.cashOnCashReturn
        : { value: null, naReason: NO_RENTAL_COC_REASON },
      cashFlowAfter,
      cashOnCashAfter,
    },
    naReason: null,
    errors,
  };
}
