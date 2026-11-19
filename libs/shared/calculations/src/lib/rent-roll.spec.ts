import { describe, expect, it } from 'vitest';
import { DEFAULT_RENTAL_ASSUMPTIONS } from './rental-defaults';
import {
  currentView,
  hasOwnerUnit,
  normalizeUnits,
  rentRollIncome,
  rentRollTotal,
  unitName,
} from './rent-roll';
import type { RentalAssumptions, RentUnit } from './types';

const unit = (over: Partial<RentUnit> & { id: string }): RentUnit => ({
  name: `Unit ${over.id.toUpperCase()}`,
  bedrooms: null,
  bathrooms: null,
  rent: 0,
  vacancyPct: null,
  ownerOccupied: false,
  rentAfterMoveOut: null,
  ...over,
});

const rental = (over: Partial<RentalAssumptions> = {}): RentalAssumptions => ({
  ...DEFAULT_RENTAL_ASSUMPTIONS,
  grossMonthlyRent: 0,
  otherMonthlyIncome: 0,
  vacancyPct: 5,
  ...over,
});

/** Spec 012's duplex: Unit A $1,350, Unit B $1,400, 5% overall vacancy. */
const duplex = (
  a: Partial<RentUnit> = {},
  b: Partial<RentUnit> = {},
  over: Partial<RentalAssumptions> = {},
) =>
  rental({
    grossMonthlyRent: 2_750,
    units: [
      unit({ id: 'a', rent: 1_350, ...a }),
      unit({ id: 'b', rent: 1_400, ...b }),
    ],
    ...over,
  });

const rubs = (monthlyAmount: number, recoveryPct?: number) => ({
  customExpenses: [
    {
      id: 'w',
      label: 'Water/Sewer',
      monthlyAmount,
      paidBy: 'rubs' as const,
      recoveryPct,
    },
  ],
});

describe('normalizeUnits', () => {
  it('reads a rental without units as one "Unit A" at the single rent', () => {
    expect(normalizeUnits(rental({ grossMonthlyRent: 2_750 }))).toEqual([
      unit({ id: 'a', name: 'Unit A', rent: 2_750 }),
    ]);
  });

  it('returns the stored rent roll as is', () => {
    const r = duplex();
    expect(normalizeUnits(r)).toBe(r.units);
  });

  it('names units by position', () => {
    expect([0, 1, 2, 3].map(unitName)).toEqual([
      'Unit A',
      'Unit B',
      'Unit C',
      'Unit D',
    ]);
  });
});

describe('rentRollIncome', () => {
  it('equals the single-rent figures exactly for a rental without units (SC-001)', () => {
    const r = rental({
      grossMonthlyRent: 3_800,
      otherMonthlyIncome: 135.55,
      vacancyPct: 7.3,
    });
    const income = rentRollIncome(r, 'afterMoveOut');
    expect(income.rentMonthly).toBe(3_800);
    expect(income.pctBaseMonthly).toBe(3_800 + 135.55);
    // Same operations, same order as the pre-spec-012 `(gsi × pct) / 100`.
    expect(income.vacancyMonthly).toBe(((3_800 + 135.55) * 7.3) / 100);
    expect(income.reimbursementMonthly).toBe(0);
    expect(income.hasUnitRates).toBe(false);
  });

  it('applies the rent growth factor the way the projections do', () => {
    const r = rental({
      grossMonthlyRent: 2_745.67,
      otherMonthlyIncome: 75.01,
      vacancyPct: 12.5,
    });
    const f = 1.031 ** 4;
    const income = rentRollIncome(r, 'afterMoveOut', { rent: f });
    const gsi = (2_745.67 + 75.01) * f;
    expect(income.pctBaseMonthly).toBe(gsi);
    expect(income.vacancyMonthly).toBe((gsi * 12.5) / 100);
  });

  it('sums the units: $1,350 + $1,400 = $2,750, vacancy $137.50', () => {
    const income = rentRollIncome(duplex(), 'afterMoveOut');
    expect(income.rentMonthly).toBe(2_750);
    expect(income.vacancyMonthly).toBeCloseTo(137.5, 10);
  });

  it('uses a unit’s own vacancy rate: 5% + 10% gives $207.50 (US2)', () => {
    const income = rentRollIncome(
      duplex({}, { vacancyPct: 10 }),
      'afterMoveOut',
    );
    expect(income.vacancyMonthly).toBeCloseTo(207.5, 10);
    expect(income.hasUnitRates).toBe(true);
    expect(income.units.map((u) => u.vacancyMonthly)).toEqual([67.5, 140]);
  });

  it('keeps other income at the overall rate', () => {
    const income = rentRollIncome(
      duplex({}, { vacancyPct: 10 }, { otherMonthlyIncome: 100 }),
      'afterMoveOut',
    );
    expect(income.vacancyMonthly).toBeCloseTo(67.5 + 140 + 5, 10);
  });

  describe('house-hacking (US3)', () => {
    const owner = duplex({ ownerOccupied: true, rentAfterMoveOut: 1_350 });

    it('counts the owner’s unit at $0 with no vacancy while living there', () => {
      const income = rentRollIncome(owner, 'living');
      expect(income.rentMonthly).toBe(1_400);
      expect(income.vacancyMonthly).toBeCloseTo(70, 10);
      expect(income.units[0]).toMatchObject({ effectiveRent: 0, rate: 0 });
    });

    it('counts the rent after move-out in the other view', () => {
      const income = rentRollIncome(owner, 'afterMoveOut');
      expect(income.rentMonthly).toBe(2_750);
      expect(income.vacancyMonthly).toBeCloseTo(137.5, 10);
    });

    it('reads a missing rent after move-out as $0', () => {
      const r = duplex({ ownerOccupied: true, rentAfterMoveOut: null });
      expect(rentRollIncome(r, 'afterMoveOut').rentMonthly).toBe(1_400);
    });

    it('handles a single unit that the owner lives in', () => {
      const r = rental({
        grossMonthlyRent: 2_000,
        units: [
          unit({ id: 'a', ownerOccupied: true, rentAfterMoveOut: 2_000 }),
        ],
      });
      expect(rentRollIncome(r, 'living').rentMonthly).toBe(0);
      expect(rentRollIncome(r, 'afterMoveOut').rentMonthly).toBe(2_000);
    });

    it('treats both views the same without an owner unit', () => {
      expect(rentRollIncome(duplex(), 'living')).toEqual(
        rentRollIncome(duplex(), 'afterMoveOut'),
      );
    });
  });

  describe('RUBS (US4)', () => {
    it('reimburses $180 with both units rented and 0% vacancy', () => {
      const r = duplex({}, {}, { vacancyPct: 0, ...rubs(180) });
      expect(rentRollIncome(r, 'afterMoveOut').reimbursementMonthly).toBe(180);
    });

    it('reimburses only the paying units’ share: $90 while living in Unit A', () => {
      const r = duplex(
        { ownerOccupied: true, rentAfterMoveOut: 1_350 },
        {},
        { vacancyPct: 0, ...rubs(180) },
      );
      expect(rentRollIncome(r, 'living').reimbursementMonthly).toBe(90);
      expect(rentRollIncome(r, 'afterMoveOut').reimbursementMonthly).toBe(180);
    });

    it('applies the recovery rate and each unit’s vacancy: $85.50', () => {
      const r = duplex(
        {},
        { vacancyPct: 10 },
        { vacancyPct: 0, ...rubs(180, 50) },
      );
      expect(
        rentRollIncome(r, 'afterMoveOut').reimbursementMonthly,
      ).toBeCloseTo(85.5, 10);
    });

    it('gives a $0-rent unit no share', () => {
      const r = duplex({}, { rent: 0 }, { vacancyPct: 0, ...rubs(180) });
      expect(rentRollIncome(r, 'afterMoveOut').reimbursementMonthly).toBe(90);
    });

    it('ignores landlord-paid expenses and grows with the expense factor', () => {
      const r = duplex(
        {},
        {},
        {
          vacancyPct: 0,
          customExpenses: [
            { label: 'Trash', monthlyAmount: 50 },
            { label: 'Water', monthlyAmount: 180, paidBy: 'rubs' },
          ],
        },
      );
      expect(
        rentRollIncome(r, 'afterMoveOut', { expense: 1.02 })
          .reimbursementMonthly,
      ).toBe(180 * 1.02);
    });

    it('is $0 for a rental without units (it has no RUBS expenses)', () => {
      expect(
        rentRollIncome(rental({ grossMonthlyRent: 1_000 }), 'living')
          .reimbursementMonthly,
      ).toBe(0);
    });
  });
});

describe('helpers', () => {
  it('rentRollTotal is the after-move-out total', () => {
    expect(
      rentRollTotal(duplex({ ownerOccupied: true, rentAfterMoveOut: 1_300 })),
    ).toBe(2_700);
    expect(rentRollTotal(rental({ grossMonthlyRent: 1_234 }))).toBe(1_234);
  });

  it('hasOwnerUnit and currentView', () => {
    expect(hasOwnerUnit(duplex())).toBe(false);
    const owner = duplex({ ownerOccupied: true });
    expect(hasOwnerUnit(owner)).toBe(true);
    expect(currentView(owner)).toBe('living');
    expect(currentView({ ...owner, occupancyView: 'afterMoveOut' })).toBe(
      'afterMoveOut',
    );
    expect(currentView(duplex({}, {}, { occupancyView: 'living' }))).toBe(
      'afterMoveOut',
    );
  });
});
