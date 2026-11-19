import type { FieldError, RentalAssumptions } from './types';

/** The optional annual growth assumptions (spec 005 FR-013); a missing value means 0%. */
type GrowthField = 'rentGrowthPct' | 'expenseGrowthPct' | 'appreciationPct';

/** The always-present single-number rental inputs (not the custom-expense list or growth). */
type NumericRentalField = Exclude<
  keyof RentalAssumptions,
  | 'customExpenses'
  | GrowthField
  | 'dscrMinimum'
  | 'financing'
  | 'financingSelection'
  | 'wealth'
  | 'exit'
  | 'units'
  | 'moveOutYears'
  | 'occupancyView'
>;

const MAX_UNITS = 4;
const NAME_MAX = 40;
const isPct = (v: number) => Number.isFinite(v) && v >= 0 && v <= 100;
const isMoney = (v: number) => Number.isFinite(v) && v >= 0;

const GROWTH_FIELDS: { field: GrowthField; label: string }[] = [
  { field: 'rentGrowthPct', label: 'Rent growth' },
  { field: 'expenseGrowthPct', label: 'Expense growth' },
  { field: 'appreciationPct', label: 'Appreciation' },
];
const GROWTH_MIN = -10;
const GROWTH_MAX = 25;

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
      errors.push({
        field: `rental.${field}`,
        message: `${label} cannot be negative.`,
      });
    }
  }

  for (const { field, label } of PERCENT_FIELDS) {
    const value = rental[field];
    if (!(Number.isFinite(value) && value >= 0 && value <= 100)) {
      errors.push({
        field: `rental.${field}`,
        message: `${label} must be between 0% and 100%.`,
      });
    }
  }

  for (const { field, label } of GROWTH_FIELDS) {
    const value = rental[field];
    if (value === undefined) continue;
    if (!(
      Number.isFinite(value) &&
      value >= GROWTH_MIN &&
      value <= GROWTH_MAX
    )) {
      errors.push({
        field: `rental.${field}`,
        message: `${label} must be between -10% and 25%.`,
      });
    }
  }

  // Rent roll (spec 012 data-model §F, research R7).
  if (rental.units !== undefined) {
    const units = rental.units;
    if (units.length === 0) {
      errors.push({ field: 'rental.units', message: 'Add at least one unit' });
    } else if (units.length > MAX_UNITS) {
      errors.push({ field: 'rental.units', message: 'Up to 4 units' });
    }
    if (units.filter((u) => u.ownerOccupied).length > 1) {
      errors.push({
        field: 'rental.units',
        message: 'Only one unit can be yours',
      });
    }
    units.forEach((u, i) => {
      const key = `rental.units.${i}` as const;
      const name = u.name.trim();
      if (name === '') {
        errors.push({ field: `${key}.name`, message: 'Enter a unit name' });
      } else if (name.length > NAME_MAX) {
        errors.push({ field: `${key}.name`, message: '40 characters max' });
      }
      if (!isMoney(u.rent)) {
        errors.push({
          field: `${key}.rent`,
          message: "Rent can't be negative",
        });
      }
      if (u.vacancyPct != null && !isPct(u.vacancyPct)) {
        errors.push({ field: `${key}.vacancyPct`, message: 'Use 0–100%' });
      }
      if (u.rentAfterMoveOut != null && !isMoney(u.rentAfterMoveOut)) {
        errors.push({
          field: `${key}.rentAfterMoveOut`,
          message: "Rent can't be negative",
        });
      }
    });
  }
  if (
    rental.moveOutYears !== undefined &&
    !(
      Number.isInteger(rental.moveOutYears) &&
      rental.moveOutYears >= 1 &&
      rental.moveOutYears <= 30
    )
  ) {
    errors.push({ field: 'rental.moveOutYears', message: 'Use 1–30 years' });
  }

  (rental.customExpenses ?? []).forEach((expense, index) => {
    if (
      expense.paidBy === 'rubs' &&
      expense.recoveryPct !== undefined &&
      !isPct(expense.recoveryPct)
    ) {
      errors.push({
        field: `rental.customExpenses.${index}.recoveryPct`,
        message: 'Use 0–100%',
      });
    }
    if (!(
      Number.isFinite(expense.monthlyAmount) && expense.monthlyAmount >= 0
    )) {
      const name = expense.label.trim() || `Custom expense ${index + 1}`;
      errors.push({
        field: `rental.customExpenses.${index}.monthlyAmount`,
        message: `${name} cannot be negative.`,
      });
    }
  });

  return errors;
}
