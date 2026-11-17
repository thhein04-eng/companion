/**
 * The one set of display formatters both features use (spec 003 FR-012).
 * Formatting only — calculation rounding lives in `shared-calculations`.
 */

/** `$1,234.56` */
export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function percent(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** `12.3%` */
export const percent1 = percent(1);

/** `12.34%` */
export const percent2 = percent(2);

/** `Jan 1, 2057` */
export const dateMedium = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
});

/** Formats an ISO `YYYY-MM-DD` date as a local calendar date (no timezone shift). */
export function formatIsoDate(isoDate: string): string {
  return dateMedium.format(new Date(`${isoDate}T00:00:00`));
}

/** `—` for a missing value, otherwise the formatted value. */
export function orDash(
  value: number | null,
  format: (v: number) => string,
): string {
  return value == null ? '—' : format(value);
}
