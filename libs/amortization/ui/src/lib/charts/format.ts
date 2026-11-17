/** Shared formatters for the amortization chart presets (en-US, matching feature 001's FR-013). */
export const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});
export const formatUsd = (value: number) => usd.format(value);

const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const yearOnly = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  timeZone: 'UTC',
});

/** `'2027-01-01'` → `'Jan 2027'`. */
export const formatMonthYear = (iso: string) =>
  iso ? monthYear.format(new Date(`${iso}T00:00:00Z`)) : '';
/** `'2027-01-01'` → `'2027'`. */
export const formatYear = (iso: string) =>
  iso ? yearOnly.format(new Date(`${iso}T00:00:00Z`)) : '';

/** Evenly spaced whole-year ticks (multiples of 12·k periods), at most `maxTicks`. */
export function yearTicks(lastPeriod: number, maxTicks = 8): number[] {
  const years = Math.max(1, Math.ceil(lastPeriod / 12));
  const k = Math.max(1, Math.ceil(years / (maxTicks - 1)));
  const ticks: number[] = [];
  for (let p = 0; p <= lastPeriod; p += 12 * k) ticks.push(p);
  return ticks;
}
