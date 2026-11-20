# Contract: Calculation API

## `shared-calculations`

```ts
export interface SensitivityAssumptions {
  targetMeasure?: 'cashOnCash' | 'cashFlow';
  cashOnCashPct?: number;      // default 8
  cashFlowMonthly?: number;    // default 300
}
// RentalAssumptions gains: sensitivity?: SensitivityAssumptions | null;
```

`FieldError.field` gains `` `rental.sensitivity.${'cashOnCashPct' | 'cashFlowMonthly'}` ``.

## `deal-analyzer-calculations` (public via `index.ts`)

```ts
export type SensitivityMeasure = 'cashOnCash' | 'cashFlow';
export interface SensitivityTarget { measure: SensitivityMeasure; value: number }  // % or $/mo

export const DEFAULT_SENSITIVITY: Required<Pick<SensitivityAssumptions, 'cashOnCashPct' | 'cashFlowMonthly'>>;
export function resolveTarget(rental: RentalAssumptions, fallbackMeasure?: SensitivityMeasure): SensitivityTarget & { isSet: boolean };
export function validateSensitivityTarget(target: SensitivityTarget): FieldError[];

export function scenarioVariant(
  scenario: LoanScenario,
  change: { ratePct?: number; price?: number; priceChangePct?: number; rentChangePct?: number },
): LoanScenario;

export function rateRows(ratePct: number, stepPct: number): { rows: number[]; currentIndex: number };

export function buildSensitivityGrid(
  scenario: LoanScenario,
  options: {
    columnVariable: 'price' | 'rent';
    rateStepPct: number;       // 0.25 | 0.5 | 1
    columnStepPct: number;     // 2.5 | 5 | 10
    target?: SensitivityTarget;
    maxOfferPrice?: number | null;     // from maxAllowableOffer, to tag the nearest column
  },
): SensitivityGrid;

export function maxAllowableOffer(scenario: LoanScenario, target: SensitivityTarget): MaxOfferResult;
```

Types `SensitivityGrid`, `SensitivityCell`, `MaxOfferResult`: data-model §D, §E.

**Preconditions**: `scenario` passed `validateScenario`; `scenario.rental` is non-null and passed
`validateRental`; the down payment is set. The callers (the view) check these and show a message
instead of calling.

**Guarantees** (all tested):

- The center cell equals `analyzeDeal(scenario, computeSchedule(scenario))` field for field.
- Every cell equals `analyzeDeal` on a scenario re-entered by hand with that rate and price or rent.
- `maxAllowableOffer`: `meets(price)` and `!meets(price + 1)`; found results also satisfy
  `price = largest integer`, validated against brute force over 50+ generated deals.
- No function mutates its input. No I/O.

No existing function changes signature or output.
