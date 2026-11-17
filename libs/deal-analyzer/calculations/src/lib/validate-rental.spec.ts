import { describe, expect, it } from 'vitest';
import { validateRental } from './validate-rental';
import type { RentalAssumptions } from 'shared-calculations';

const valid: RentalAssumptions = {
  grossMonthlyRent: 2_400,
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  managementPct: 8,
  maintenanceReservePct: 5,
  capexReservePct: 5,
  closingCosts: 0,
  rehabBudget: 0,
};

describe('validateRental (FR-015)', () => {
  it('accepts the default assumptions', () => {
    expect(validateRental(valid)).toEqual([]);
  });

  it.each([
    'grossMonthlyRent',
    'otherMonthlyIncome',
    'closingCosts',
    'rehabBudget',
  ] as const)(
    'rejects a negative %s with exactly one rental.* error',
    (field) => {
      const errors = validateRental({ ...valid, [field]: -1 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe(`rental.${field}`);
    },
  );

  it.each([
    'vacancyPct',
    'managementPct',
    'maintenanceReservePct',
    'capexReservePct',
  ] as const)('rejects %s outside 0–100 inclusive', (field) => {
    for (const bad of [-1, 101]) {
      const errors = validateRental({ ...valid, [field]: bad });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe(`rental.${field}`);
    }
  });

  it('returns one error per offending field', () => {
    const errors = validateRental({
      ...valid,
      grossMonthlyRent: -5,
      vacancyPct: 150,
      rehabBudget: -1,
    });
    expect(errors.map((e) => e.field).sort()).toEqual(
      [
        'rental.grossMonthlyRent',
        'rental.rehabBudget',
        'rental.vacancyPct',
      ].sort(),
    );
  });

  it('allows 100% vacancy (spec Edge Case)', () => {
    expect(validateRental({ ...valid, vacancyPct: 100 })).toEqual([]);
  });

  it('uses user-friendly messages', () => {
    expect(validateRental({ ...valid, vacancyPct: 101 })[0].message).toBe(
      'Vacancy rate must be between 0% and 100%.',
    );
  });
});
