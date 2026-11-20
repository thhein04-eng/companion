import type { FieldError, RentalAssumptions } from 'shared-calculations';

/** The two measures the grid shows and the Max Allowable Offer can target (spec 017). */
export type SensitivityMeasure = 'cashOnCash' | 'cashFlow';

/** The target: Cash-on-Cash in percent, or cash flow in dollars per month. */
export interface SensitivityTarget {
  measure: SensitivityMeasure;
  value: number;
}

/** What a new target starts at (spec 017 FR-010). */
export const DEFAULT_SENSITIVITY = {
  cashOnCashPct: 8,
  cashFlowMonthly: 300,
} as const;

/**
 * The scenario's target: the saved measure (or `fallbackMeasure`, the grid's, until one is saved)
 * and that measure's own value (or its default). `isSet` is true once the investor has saved any
 * target field, so the grid shows no below-target marks before then (data-model §A).
 */
export function resolveTarget(
  rental: RentalAssumptions,
  fallbackMeasure: SensitivityMeasure = 'cashOnCash',
): SensitivityTarget & { isSet: boolean } {
  const saved = rental.sensitivity ?? null;
  const measure = saved?.targetMeasure ?? fallbackMeasure;
  const value =
    measure === 'cashOnCash'
      ? (saved?.cashOnCashPct ?? DEFAULT_SENSITIVITY.cashOnCashPct)
      : (saved?.cashFlowMonthly ?? DEFAULT_SENSITIVITY.cashFlowMonthly);
  return { measure, value, isSet: saved != null };
}

/**
 * Validates a target (data-model §F). Cash-on-Cash must be 0–1000%: a negative target would make
 * the highest passing price ill-defined, because the ratio climbs back toward zero as cash invested
 * grows (research R4). Cash flow may be any dollar amount up to $1,000,000/mo.
 */
export function validateSensitivityTarget(
  target: SensitivityTarget,
): FieldError[] {
  const { measure, value } = target;
  if (measure === 'cashOnCash') {
    return Number.isFinite(value) && value >= 0 && value <= 1_000
      ? []
      : [{ field: 'rental.sensitivity.cashOnCashPct', message: 'Use 0–1000%' }];
  }
  return Number.isFinite(value) && Math.abs(value) <= 1_000_000
    ? []
    : [
        {
          field: 'rental.sensitivity.cashFlowMonthly',
          message: 'Enter a dollar amount',
        },
      ];
}
