import type { FieldError, RentalAssumptions } from './types';

/** The single-number rental inputs (everything except the custom-expense list). */
type NumericRentalField = Exclude<keyof RentalAssumptions, 'customExpenses'>;

const DOLLAR_FIELDS: { field: NumericRentalField; label: string }[] = [
  { field: 'grossMonthlyRent', label: 'Monthly rent' },
  { field: 'otherMonthlyIncome', label: 'Other monthly income' },
  { field: 'closingCosts', label: 'Closing costs' },
  { field: 'rehabBudget', label: 'Rehab budget' },
];

const PERCENT_FIELDS: { field: NumericRentalField; label: string }[] = [
  { field: 'vacancyPct', label: 'Vacancy rate' },
  { field: 'managementPct', label: 'Property management fee' },
  { field: 'maintenanceReservePct', label: 'Maintenance reserve' },
  { field: 'capexReservePct', label: 'CapEx reserve' },
];

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

  return errors;
}
