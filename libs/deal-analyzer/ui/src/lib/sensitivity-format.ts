import type {
  SensitivityMeasure,
  SensitivityTarget,
} from 'deal-analyzer-calculations';

/** `$300` or `$425.50`: whole dollars unless there are cents. */
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** `$240,092`: whole dollars, for prices and grid cells. */
export const dollars0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** The app's minus sign (U+2212) for visible figures. */
export const minus = (text: string) => text.replace('-', '−');

/** "8% Cash-on-Cash" or "$300/mo cash flow" (the target in words, for legends and labels). */
export function targetText(target: SensitivityTarget): string {
  return target.measure === 'cashOnCash'
    ? `${target.value}% Cash-on-Cash`
    : `${minus(money.format(target.value))}/mo cash flow`;
}

/** The measure's name as the page shows it. */
export const MEASURE_NAME: Record<SensitivityMeasure, string> = {
  cashFlow: 'Monthly cash flow',
  cashOnCash: 'Cash-on-Cash',
};
