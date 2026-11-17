import type { DownPayment } from './types';

/** The auto-calculation half of FR-014: loan amount = home price minus down payment. */
export function calculatePrincipalFromHomePriceAndDownPayment(
  homePrice: number,
  downPayment: DownPayment,
): number {
  const downAmount =
    'percent' in downPayment
      ? (homePrice * downPayment.percent) / 100
      : downPayment.amount;
  return homePrice - downAmount;
}
