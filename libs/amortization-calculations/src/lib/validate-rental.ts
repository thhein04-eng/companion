import type { FieldError, RentalAssumptions } from './types';

/** The always-present numeric rental fields (the growth fields are optional; see GROWTH_FIELDS). */
type RequiredRentalField = Exclude<keyof RentalAssumptions, 'rentGrowthPct' | 'expenseGrowthPct' | 'appreciationPct'>;

const DOLLAR_FIELDS: { field: RequiredRentalField; label: string }[] = [
  { field: 'grossMonthlyRent', label: 'Monthly rent' },
  { field: 'otherMonthlyIncome', label: 'Other monthly income' },
  { field: 'closingCosts', label: 'Closing costs' },
  { field: 'rehabBudget', label: 'Rehab budget' },
];

const PERCENT_FIELDS: { field: RequiredRentalField; label: string }[] = [
  { field: 'vacancyPct', label: 'Vacancy rate' },
  { field: 'managementPct', label: 'Property management fee' },
  { field: 'maintenanceReservePct', label: 'Maintenance reserve' },
  { field: 'capexReservePct', label: 'CapEx reserve' },
];

/** Optional annual growth assumptions (FR-013); a missing value means 0%. */
const GROWTH_FIELDS: { field: 'rentGrowthPct' | 'expenseGrowthPct' | 'appreciationPct'; label: string }[] = [
  { field: 'rentGrowthPct', label: 'Rent growth' },
  { field: 'expenseGrowthPct', label: 'Expense growth' },
  { field: 'appreciationPct', label: 'Appreciation' },
];
const GROWTH_MIN = -10;
const GROWTH_MAX = 25;

/**
 * Validates Deal Analyzer inputs (FR-015). Returns one error per offending
 * field, keyed `rental.<field>`. Kept separate from `validateScenario` so
 * invalid rental inputs never block the amortization schedule.
 */
export function validateRental(rental: RentalAssumptions): FieldError[] {
  const errors: FieldError[] = [];

  for (const { field, label } of DOLLAR_FIELDS) {
    const value = rental[field];
    if (!(Number.isFinite(value) && value >= 0)) {
      errors.push({ field: `rental.${field}`, message: `${label} cannot be negative.` });
    }
  }

  for (const { field, label } of PERCENT_FIELDS) {
    const value = rental[field];
    if (!(Number.isFinite(value) && value >= 0 && value <= 100)) {
      errors.push({ field: `rental.${field}`, message: `${label} must be between 0% and 100%.` });
    }
  }

  for (const { field, label } of GROWTH_FIELDS) {
    const value = rental[field];
    if (value === undefined) continue;
    if (!(Number.isFinite(value) && value >= GROWTH_MIN && value <= GROWTH_MAX)) {
      errors.push({ field: `rental.${field}`, message: `${label} must be between -10% and 25%.` });
    }
  }

  return errors;
}
