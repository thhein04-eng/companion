import { describe, expect, it } from 'vitest';
import { validateRental } from './validate-rental';
import type { RentalAssumptions } from './types';

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

  it.each(['grossMonthlyRent', 'otherMonthlyIncome', 'closingCosts', 'rehabBudget'] as const)(
    'rejects a negative %s with exactly one rental.* error',
    (field) => {
      const errors = validateRental({ ...valid, [field]: -1 });
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe(`rental.${field}`);
    }
  );

  it.each(['vacancyPct', 'managementPct', 'maintenanceReservePct', 'capexReservePct'] as const)(
    'rejects %s outside 0–100 inclusive',
    (field) => {
      for (const bad of [-1, 101]) {
        const errors = validateRental({ ...valid, [field]: bad });
        expect(errors).toHaveLength(1);
        expect(errors[0].field).toBe(`rental.${field}`);
      }
    }
  );

  it('returns one error per offending field', () => {
    const errors = validateRental({ ...valid, grossMonthlyRent: -5, vacancyPct: 150, rehabBudget: -1 });
    expect(errors.map((e) => e.field).sort()).toEqual(
      ['rental.grossMonthlyRent', 'rental.rehabBudget', 'rental.vacancyPct'].sort()
    );
  });

  it('allows 100% vacancy (spec Edge Case)', () => {
    expect(validateRental({ ...valid, vacancyPct: 100 })).toEqual([]);
  });

  it('uses user-friendly messages', () => {
    expect(validateRental({ ...valid, vacancyPct: 101 })[0].message).toBe(
      'Vacancy rate must be between 0% and 100%.'
    );
  });
});

describe('validateRental growth assumptions (FR-013)', () => {
  const labels = { rentGrowthPct: 'Rent growth', expenseGrowthPct: 'Expense growth', appreciationPct: 'Appreciation' } as const;

  it.each(Object.keys(labels) as (keyof typeof labels)[])('%s accepts the bounds -10 and 25, and undefined', (field) => {
    expect(validateRental({ ...valid, [field]: 25 })).toEqual([]);
    expect(validateRental({ ...valid, [field]: -10 })).toEqual([]);
    expect(validateRental({ ...valid, [field]: undefined })).toEqual([]);
  });

  it.each(
    (Object.keys(labels) as (keyof typeof labels)[]).flatMap((field) => [25.01, -10.01, Number.NaN].map((v) => [field, v] as const))
  )('%s rejects %d with exactly one error', (field, value) => {
    const errors = validateRental({ ...valid, [field]: value });
    expect(errors).toEqual([{ field: `rental.${field}`, message: `${labels[field]} must be between -10% and 25%.` }]);
  });
});
