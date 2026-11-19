import type { OccupancyView, RentalAssumptions, RentUnit } from './types';

/** "Unit A", "Unit B", … by position (spec 012 FR-001). */
export function unitName(index: number): string {
  return `Unit ${String.fromCharCode(65 + index)}`;
}

/**
 * The rent roll of a rental (spec 012 research R1). A rental saved before spec 012 has no `units`
 * and reads as one implicit "Unit A" at `grossMonthlyRent`.
 */
export function normalizeUnits(rental: RentalAssumptions): RentUnit[] {
  if (rental.units && rental.units.length > 0) return rental.units;
  return [
    {
      id: 'a',
      name: unitName(0),
      bedrooms: null,
      bathrooms: null,
      rent: rental.grossMonthlyRent,
      vacancyPct: null,
      ownerOccupied: false,
      rentAfterMoveOut: null,
    },
  ];
}

export function hasOwnerUnit(rental: RentalAssumptions): boolean {
  return normalizeUnits(rental).some((u) => u.ownerOccupied);
}

/** The view a page shows: the stored choice for a house-hacked deal, else after move-out. */
export function currentView(rental: RentalAssumptions): OccupancyView {
  return hasOwnerUnit(rental)
    ? (rental.occupancyView ?? 'living')
    : 'afterMoveOut';
}

/** A unit's rent in `view`: the owner's unit earns $0 while living there. */
function rentIn(unit: RentUnit, view: OccupancyView): number {
  if (!unit.ownerOccupied) return unit.rent;
  return view === 'living' ? 0 : (unit.rentAfterMoveOut ?? 0);
}

/** The after-move-out rent-roll total, kept in `grossMonthlyRent` (spec 012 R1, FR-015). */
export function rentRollTotal(rental: RentalAssumptions): number {
  return normalizeUnits(rental).reduce(
    (sum, u) => sum + rentIn(u, 'afterMoveOut'),
    0,
  );
}

/** Monthly income figures for one view (spec 012 data-model §D). Unrounded. */
export interface IncomeBasis {
  /** Σ unit rent in this view (× rent factor). */
  rentMonthly: number;
  /** Other income (× rent factor). */
  otherMonthly: number;
  /** Rent + other income (× rent factor): the base of management, maintenance and CapEx. */
  pctBaseMonthly: number;
  /** Σ unit rent × unit rate + other income × overall rate (× rent factor). */
  vacancyMonthly: number;
  /** Utility reimbursements from RUBS expenses (× expense factor). */
  reimbursementMonthly: number;
  /** True when any unit has its own vacancy rate (the vacancy line then drops its "%"). */
  hasUnitRates: boolean;
  units: {
    id: string;
    name: string;
    effectiveRent: number;
    rate: number;
    vacancyMonthly: number;
  }[];
}

/**
 * The rent roll's income in `view` (spec 012 FR-002, FR-008/009, FR-012, FR-018–FR-020).
 *
 * `factors.rent` / `factors.expense` are the projection growth factors for a later year (1 in
 * year 1). Vacancy is computed per group of units sharing a rate, with other income in the overall
 * group, as `((Σ group × rent factor) × rate) / 100`: for a rental without units that is exactly
 * the pre-spec-012 `(gsi × pct) / 100`, so old scenarios round to the same cents (SC-001).
 */
export function rentRollIncome(
  rental: RentalAssumptions,
  view: OccupancyView,
  factors: { rent?: number; expense?: number } = {},
): IncomeBasis {
  const rentFactor = factors.rent ?? 1;
  const expenseFactor = factors.expense ?? 1;
  const overall = rental.vacancyPct;
  const roll = normalizeUnits(rental);

  const units = roll.map((u) => {
    const rent = rentIn(u, view);
    const living = u.ownerOccupied && view === 'living';
    const rate = living ? 0 : (u.vacancyPct ?? overall);
    return { unit: u, rent, rate };
  });

  const rentSum = units.reduce((sum, u) => sum + u.rent, 0);
  const other = rental.otherMonthlyIncome;

  // Group by rate; other income joins the overall-rate group after the units.
  const groups = new Map<number, number>();
  for (const { rent, rate } of units) {
    if (rent === 0) continue;
    groups.set(rate, (groups.get(rate) ?? 0) + rent);
  }
  if (other !== 0) groups.set(overall, (groups.get(overall) ?? 0) + other);
  let vacancyMonthly = 0;
  for (const [rate, sum] of groups) {
    vacancyMonthly += (sum * rentFactor * rate) / 100;
  }

  // RUBS: each paying unit reimburses 1/N of the bill, less its own vacancy (R3).
  const share = units.reduce(
    (sum, u) =>
      u.rent > 0 ? sum + (1 / units.length) * (1 - u.rate / 100) : sum,
    0,
  );
  const reimbursementMonthly = (rental.customExpenses ?? []).reduce(
    (sum, e) =>
      e.paidBy === 'rubs'
        ? sum +
          e.monthlyAmount *
            expenseFactor *
            ((e.recoveryPct ?? 100) / 100) *
            share
        : sum,
    0,
  );

  return {
    rentMonthly: rentSum * rentFactor,
    otherMonthly: other * rentFactor,
    pctBaseMonthly: (rentSum + other) * rentFactor,
    vacancyMonthly,
    reimbursementMonthly,
    hasUnitRates: roll.some((u) => u.vacancyPct != null),
    units: units.map(({ unit, rent, rate }) => ({
      id: unit.id,
      name: unit.name,
      effectiveRent: rent * rentFactor,
      rate,
      vacancyMonthly: (rent * rentFactor * rate) / 100,
    })),
  };
}
