/**
 * Unrounded fully-amortizing monthly payment for a fixed-rate loan
 * (`principal / termMonths` at 0%). Shared by `computeSchedule` and the
 * financing matrix (spec 006 research R5).
 */
export function monthlyPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  const i = annualRatePct / 100 / 12;
  if (i === 0) {
    return principal / termMonths;
  }
  const factor = Math.pow(1 + i, termMonths);
  return (principal * i * factor) / (factor - 1);
}

/**
 * Unrounded balance after `afterPeriods` scheduled payments, by the closed form
 * `P(1+i)^k − PMT((1+i)^k − 1)/i` (`P − PMT·k` at 0%). Spec 006 research R4.
 */
export function remainingBalance(
  principal: number,
  annualRatePct: number,
  termMonths: number,
  afterPeriods: number,
): number {
  const payment = monthlyPayment(principal, annualRatePct, termMonths);
  const i = annualRatePct / 100 / 12;
  if (i === 0) {
    return principal - payment * afterPeriods;
  }
  const growth = Math.pow(1 + i, afterPeriods);
  return principal * growth - (payment * (growth - 1)) / i;
}
