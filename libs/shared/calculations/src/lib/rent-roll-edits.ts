import { DEFAULT_RENTAL_ASSUMPTIONS } from './rental-defaults';
import { normalizeUnits, rentRollTotal, unitName } from './rent-roll';
import type {
  CustomExpenseItem,
  OccupancyView,
  RentalAssumptions,
  RentUnit,
} from './types';

/** Max units in a rent roll (spec 012 FR-001: 1–4 unit residential). */
export const MAX_UNITS = 4;

/** The rental to edit: the scenario's, or fresh defaults with no rent yet. */
export function baseRental(
  rental: RentalAssumptions | null,
): RentalAssumptions {
  return rental ?? { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 0 };
}

/** Stores `units` and keeps `grossMonthlyRent` = the after-move-out total (research R1). */
function withUnits(
  rental: RentalAssumptions,
  units: RentUnit[],
  extra: Partial<RentalAssumptions> = {},
): RentalAssumptions {
  const next = { ...rental, ...extra, units };
  return { ...next, grossMonthlyRent: rentRollTotal(next) };
}

function nextId(units: RentUnit[]): string {
  const taken = new Set(units.map((u) => u.id));
  for (let i = 0; ; i++) {
    const id = String.fromCharCode(97 + (i % 26)) + (i >= 26 ? i : '');
    if (!taken.has(id)) return id;
  }
}

/** Adds the next unit ("Unit B", …) at $0; no-op at 4 units (FR-004). */
export function addUnit(rental: RentalAssumptions | null): RentalAssumptions {
  const base = baseRental(rental);
  const units = normalizeUnits(base);
  if (units.length >= MAX_UNITS) return base;
  const unit: RentUnit = {
    id: nextId(units),
    name: unitName(units.length),
    bedrooms: null,
    bathrooms: null,
    rent: 0,
    vacancyPct: null,
    ownerOccupied: false,
    rentAfterMoveOut: null,
  };
  return withUnits(base, [...units, unit]);
}

/** Removes a unit; no-op at 1 unit (FR-004). Removing the owner's unit ends the house-hack. */
export function removeUnit(
  rental: RentalAssumptions | null,
  id: string,
): RentalAssumptions {
  const base = baseRental(rental);
  const units = normalizeUnits(base);
  if (units.length <= 1) return base;
  return withUnits(
    base,
    units.filter((u) => u.id !== id),
  );
}

/** Edits one unit's name, beds, baths, rent, vacancy or rent after move-out. */
export function updateUnit(
  rental: RentalAssumptions | null,
  id: string,
  patch: Partial<
    Pick<
      RentUnit,
      | 'name'
      | 'bedrooms'
      | 'bathrooms'
      | 'rent'
      | 'vacancyPct'
      | 'rentAfterMoveOut'
    >
  >,
): RentalAssumptions {
  const base = baseRental(rental);
  return withUnits(
    base,
    normalizeUnits(base).map((u) => (u.id === id ? { ...u, ...patch } : u)),
  );
}

/** Back to a plain rental unit: it keeps the rent it would earn after move-out. */
function unmark(u: RentUnit): RentUnit {
  return u.ownerOccupied
    ? {
        ...u,
        ownerOccupied: false,
        rent: u.rentAfterMoveOut ?? u.rent,
        rentAfterMoveOut: null,
      }
    : u;
}

/**
 * Marks the owner's unit, or none with `null` (spec 012 FR-011, data-model §G). Marking prefills
 * "rent after move-out" with the unit's rent, moves the flag off any other unit, and shows the
 * "Living there" view.
 */
export function setOwnerUnit(
  rental: RentalAssumptions | null,
  id: string | null,
): RentalAssumptions {
  const base = baseRental(rental);
  const units = normalizeUnits(base).map((u) => {
    if (u.id !== id) return unmark(u);
    if (u.ownerOccupied) return u;
    return {
      ...u,
      ownerOccupied: true,
      rentAfterMoveOut: u.rentAfterMoveOut ?? u.rent,
    };
  });
  return withUnits(
    base,
    units,
    id == null ? {} : { occupancyView: 'living' satisfies OccupancyView },
  );
}

/** Edits one custom expense's "Paid by" and recovery rate (spec 012 FR-017). */
export function updateCustomExpense(
  rental: RentalAssumptions | null,
  index: number,
  patch: Partial<Pick<CustomExpenseItem, 'paidBy' | 'recoveryPct'>>,
): RentalAssumptions {
  const base = baseRental(rental);
  return {
    ...base,
    customExpenses: (base.customExpenses ?? []).map((e, i) =>
      i === index ? { ...e, ...patch } : e,
    ),
  };
}
