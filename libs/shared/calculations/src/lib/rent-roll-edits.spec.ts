import { describe, expect, it } from 'vitest';
import { DEFAULT_RENTAL_ASSUMPTIONS } from './rental-defaults';
import {
  addUnit,
  removeUnit,
  setOwnerUnit,
  updateCustomExpense,
  updateUnit,
} from './rent-roll-edits';
import { normalizeUnits, rentRollTotal } from './rent-roll';
import type { RentalAssumptions } from './types';

const single = (rent = 1_350): RentalAssumptions => ({
  ...DEFAULT_RENTAL_ASSUMPTIONS,
  grossMonthlyRent: rent,
});

/** Every edit keeps `grossMonthlyRent` equal to the after-move-out total (research R1). */
const inSync = (r: RentalAssumptions) =>
  expect(r.grossMonthlyRent).toBe(rentRollTotal(r));

describe('rent roll edits (spec 012 T013)', () => {
  it('adds "Unit B" at $0 after the implicit Unit A, keeping the total', () => {
    const r = addUnit(single());
    expect(r.units?.map((u) => [u.id, u.name, u.rent])).toEqual([
      ['a', 'Unit A', 1_350],
      ['b', 'Unit B', 0],
    ]);
    expect(r.grossMonthlyRent).toBe(1_350);
  });

  it('seeds defaults when the scenario has no rental yet', () => {
    const r = addUnit(null);
    expect(r.vacancyPct).toBe(DEFAULT_RENTAL_ASSUMPTIONS.vacancyPct);
    expect(r.units).toHaveLength(2);
    inSync(r);
  });

  it('stops at 4 units and at 1 unit', () => {
    let r = single();
    for (let i = 0; i < 5; i++) r = addUnit(r);
    expect(r.units).toHaveLength(4);
    expect(addUnit(r)).toBe(r);
    const one = single();
    expect(removeUnit(one, 'a')).toBe(one);
  });

  it('updates a unit’s rent and resyncs the total; removing one resyncs too', () => {
    let r = updateUnit(addUnit(single()), 'b', { rent: 1_400, bedrooms: 2 });
    expect(r.grossMonthlyRent).toBe(2_750);
    expect(r.units?.[1]).toMatchObject({ rent: 1_400, bedrooms: 2 });
    r = removeUnit(r, 'a');
    expect(normalizeUnits(r).map((u) => u.name)).toEqual(['Unit B']);
    expect(r.grossMonthlyRent).toBe(1_400);
  });

  it('marks the owner’s unit: prefills rent after move-out and shows "Living there"', () => {
    const duplex = updateUnit(addUnit(single()), 'b', { rent: 1_400 });
    const r = setOwnerUnit({ ...duplex, occupancyView: 'afterMoveOut' }, 'a');
    expect(r.units?.[0]).toMatchObject({
      ownerOccupied: true,
      rentAfterMoveOut: 1_350,
    });
    expect(r.occupancyView).toBe('living');
    expect(r.grossMonthlyRent).toBe(2_750);
  });

  it('moves the flag to another unit and unmarking keeps the after-move-out rent', () => {
    let r = updateUnit(addUnit(single()), 'b', { rent: 1_400 });
    r = setOwnerUnit(r, 'a');
    r = updateUnit(r, 'a', { rentAfterMoveOut: 1_500 });
    r = setOwnerUnit(r, 'b');
    expect(
      r.units?.map((u) => [u.ownerOccupied, u.rent, u.rentAfterMoveOut]),
    ).toEqual([
      [false, 1_500, null],
      [true, 1_400, 1_400],
    ]);
    r = setOwnerUnit(r, null);
    expect(r.units?.every((u) => !u.ownerOccupied)).toBe(true);
    expect(r.grossMonthlyRent).toBe(2_900);
  });

  it('removing the owner’s unit ends the house-hack', () => {
    let r = updateUnit(addUnit(single()), 'b', { rent: 1_400 });
    r = removeUnit(setOwnerUnit(r, 'a'), 'a');
    expect(r.units?.some((u) => u.ownerOccupied)).toBe(false);
    inSync(r);
  });

  it('tags a custom expense as RUBS with a recovery rate', () => {
    const r = updateCustomExpense(
      {
        ...single(),
        customExpenses: [
          { label: 'Trash', monthlyAmount: 40 },
          { label: 'Water', monthlyAmount: 180 },
        ],
      },
      1,
      { paidBy: 'rubs', recoveryPct: 80 },
    );
    expect(r.customExpenses).toEqual([
      { label: 'Trash', monthlyAmount: 40 },
      { label: 'Water', monthlyAmount: 180, paidBy: 'rubs', recoveryPct: 80 },
    ]);
  });
});
