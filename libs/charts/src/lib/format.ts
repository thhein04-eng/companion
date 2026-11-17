import type { SeriesDef } from './types';

const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** `$1.2M`, `$350K`, `$900`: short enough for an axis label. */
export function formatCompactCurrency(value: number): string {
  return compactCurrency.format(value);
}

/**
 * Keeps the first `max` series (the palette has 8 fixed slots) and reports how many were dropped,
 * so the caller can say so. Never generates a 9th color.
 */
export function capSeries<S extends SeriesDef>(series: S[], max = 8): { shown: S[]; hiddenCount: number } {
  return { shown: series.slice(0, max), hiddenCount: Math.max(0, series.length - max) };
}
