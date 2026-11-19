# Contract: Calculation API changes

## `shared-calculations` (public, via `index.ts`)

```ts
export type OccupancyView = 'living' | 'afterMoveOut';

export interface RentUnit { id: string; name: string; bedrooms: number | null;
  bathrooms: number | null; rent: number; vacancyPct: number | null;
  ownerOccupied: boolean; rentAfterMoveOut: number | null; }

export function normalizeUnits(rental: RentalAssumptions): RentUnit[];
export function hasOwnerUnit(rental: RentalAssumptions): boolean;
export function rentRollTotal(rental: RentalAssumptions): number;        // after move-out
export function rentRollIncome(rental: RentalAssumptions, view: OccupancyView): IncomeBasis;
export function currentView(rental: RentalAssumptions): OccupancyView;   // owner unit: stored or 'living'; else 'afterMoveOut'
```

`IncomeBasis` fields per data-model §D. All pure, no I/O; cent tests in `rent-roll.spec.ts`.

`validateRental` gains the §F errors. `readDealField(scenario, 'rental.grossMonthlyRent')` returns
`rentRollIncome(rental, currentView(rental)).rentMonthly`.

## `deal-analyzer-calculations`

```ts
analyzeDeal(scenario, schedule, options?: { view?: OccupancyView }): DealAnalysis;
// DealAnalysis gains:
//   view: OccupancyView | null              // null without an owner unit
//   income: { rent, other, reimbursements } as MonthlyAnnual
//   unitBreakdown: { name, rent, vacancy }[] // when ≥ 2 units
//   netHousingCost: MonthlyAnnual | null     // living view only
// rules (1% / 50%) always use rentRollTotal (FR-015)

operatingYear(scenario, year)          // picks the view per year (research R5)
projectWealth(...) / projectExit(...)  // results gain moveOutYear: number | null
```

Unchanged signatures elsewhere. Golden test: for every existing fixture without `units`, every
field of `analyzeDeal`, `projectRental`, `projectWealth` and `projectExit` equals the pre-feature
output.
