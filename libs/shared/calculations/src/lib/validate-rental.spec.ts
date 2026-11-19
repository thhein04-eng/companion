import { describe, expect, it } from 'vitest';
import { validateRental } from './validate-rental';
import type { RentalAssumptions, RentUnit } from './types';

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

  describe('custom operating expenses', () => {
    it('accepts zero and positive monthly amounts', () => {
      expect(
        validateRental({
          ...valid,
          customExpenses: [
            { id: 'water', label: 'Water', monthlyAmount: 75.5 },
            { label: 'Trash', monthlyAmount: 0 },
          ],
        }),
      ).toEqual([]);
    });

    it('rejects a negative amount with one error keyed by its index, named after the expense', () => {
      const errors = validateRental({
        ...valid,
        customExpenses: [
          { label: 'Water', monthlyAmount: 75.5 },
          { label: '  Trash ', monthlyAmount: -0.01 },
        ],
      });
      expect(errors).toEqual([
        {
          field: 'rental.customExpenses.1.monthlyAmount',
          message: 'Trash cannot be negative.',
        },
      ]);
    });

    it('falls back to "Custom expense N" for an unnamed expense', () => {
      const errors = validateRental({
        ...valid,
        customExpenses: [{ label: '', monthlyAmount: -20 }],
      });
      expect(errors[0].message).toBe('Custom expense 1 cannot be negative.');
    });

    it('rejects a non-finite amount', () => {
      const errors = validateRental({
        ...valid,
        customExpenses: [{ label: 'Water', monthlyAmount: Number.NaN }],
      });
      expect(errors.map((e) => e.field)).toEqual([
        'rental.customExpenses.0.monthlyAmount',
      ]);
    });

    it('reports each offending expense alongside other rental errors', () => {
      const errors = validateRental({
        ...valid,
        grossMonthlyRent: -1,
        customExpenses: [
          { label: 'A', monthlyAmount: -1 },
          { label: 'B', monthlyAmount: 10 },
          { label: 'C', monthlyAmount: -2 },
        ],
      });
      expect(errors.map((e) => e.field)).toEqual([
        'rental.grossMonthlyRent',
        'rental.customExpenses.0.monthlyAmount',
        'rental.customExpenses.2.monthlyAmount',
      ]);
    });
  });

  it('uses user-friendly messages', () => {
    expect(validateRental({ ...valid, vacancyPct: 101 })[0].message).toBe(
      'Vacancy rate must be between 0% and 100%.',
    );
  });
});

describe('validateRental growth assumptions (spec 005 FR-013)', () => {
  const labels = {
    rentGrowthPct: 'Rent growth',
    expenseGrowthPct: 'Expense growth',
    appreciationPct: 'Appreciation',
  } as const;
  const fields = Object.keys(labels) as (keyof typeof labels)[];

  it.each(fields)(
    '%s accepts the bounds -10 and 25, and undefined',
    (field) => {
      expect(validateRental({ ...valid, [field]: 25 })).toEqual([]);
      expect(validateRental({ ...valid, [field]: -10 })).toEqual([]);
      expect(validateRental({ ...valid, [field]: undefined })).toEqual([]);
    },
  );

  it.each(
    fields.flatMap((field) =>
      [25.01, -10.01, Number.NaN].map((v) => [field, v] as const),
    ),
  )('%s rejects %d with exactly one error', (field, value) => {
    expect(validateRental({ ...valid, [field]: value })).toEqual([
      {
        field: `rental.${field}`,
        message: `${labels[field]} must be between -10% and 25%.`,
      },
    ]);
  });
});

describe('validateRental rent roll and RUBS (spec 012 data-model §F)', () => {
  const unit = (over: Partial<RentUnit> = {}): RentUnit => ({
    id: 'a',
    name: 'Unit A',
    bedrooms: 2,
    bathrooms: 1,
    rent: 1_350,
    vacancyPct: null,
    ownerOccupied: false,
    rentAfterMoveOut: null,
    ...over,
  });
  const withUnits = (
    units: RentUnit[],
    over: Partial<RentalAssumptions> = {},
  ) => validateRental({ ...valid, units, ...over });

  it('accepts a valid 1–4 unit rent roll, an owner unit and the move-out bounds', () => {
    expect(withUnits([unit()])).toEqual([]);
    expect(
      withUnits(
        [
          unit({ ownerOccupied: true, rentAfterMoveOut: 1_350, vacancyPct: 0 }),
          unit({ id: 'b', name: 'Unit B', vacancyPct: 100 }),
          unit({ id: 'c', name: 'Unit C', rent: 0 }),
          unit({ id: 'd', name: 'x'.repeat(40) }),
        ],
        { moveOutYears: 30 },
      ),
    ).toEqual([]);
    expect(withUnits([unit()], { moveOutYears: 1 })).toEqual([]);
  });

  it('rejects an empty or oversized rent roll and two owner units', () => {
    expect(withUnits([])).toEqual([
      { field: 'rental.units', message: 'Add at least one unit' },
    ]);
    expect(withUnits([unit(), unit(), unit(), unit(), unit()])).toEqual([
      { field: 'rental.units', message: 'Up to 4 units' },
    ]);
    expect(
      withUnits([
        unit({ ownerOccupied: true }),
        unit({ id: 'b', ownerOccupied: true }),
      ]),
    ).toEqual([
      { field: 'rental.units', message: 'Only one unit can be yours' },
    ]);
  });

  it('rejects bad unit fields with keys rental.units.<i>.*', () => {
    expect(
      withUnits([
        unit(),
        unit({
          name: '  ',
          rent: -1,
          vacancyPct: 100.5,
          rentAfterMoveOut: -5,
        }),
      ]),
    ).toEqual([
      { field: 'rental.units.1.name', message: 'Enter a unit name' },
      { field: 'rental.units.1.rent', message: "Rent can't be negative" },
      { field: 'rental.units.1.vacancyPct', message: 'Use 0–100%' },
      {
        field: 'rental.units.1.rentAfterMoveOut',
        message: "Rent can't be negative",
      },
    ]);
    expect(withUnits([unit({ name: 'x'.repeat(41) })])).toEqual([
      { field: 'rental.units.0.name', message: '40 characters max' },
    ]);
  });

  it('rejects a move-out outside 1–30 whole years', () => {
    for (const moveOutYears of [0, 31, 2.5]) {
      expect(withUnits([unit()], { moveOutYears })).toEqual([
        { field: 'rental.moveOutYears', message: 'Use 1–30 years' },
      ]);
    }
  });

  it('rejects a RUBS recovery rate outside 0–100%', () => {
    const expense = (recoveryPct: number) =>
      validateRental({
        ...valid,
        customExpenses: [
          { label: 'Water', monthlyAmount: 180, paidBy: 'rubs', recoveryPct },
        ],
      });
    expect(expense(0)).toEqual([]);
    expect(expense(100)).toEqual([]);
    expect(expense(101)).toEqual([
      { field: 'rental.customExpenses.0.recoveryPct', message: 'Use 0–100%' },
    ]);
  });

  it('adds no errors to a rental without units', () => {
    expect(validateRental(valid)).toEqual([]);
  });
});
