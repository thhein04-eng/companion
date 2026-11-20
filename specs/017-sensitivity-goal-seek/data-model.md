# Data Model: Sensitivity Matrix and Max Allowable Offer

All money is dollars, rounded to cents for display with the app's existing rounding. New stored
fields are optional, so existing sessions load unchanged.

## A. `SensitivityAssumptions` (new; `RentalAssumptions.sensitivity`)

| Field | Type | Rule | Default |
|---|---|---|---|
| `targetMeasure` | `'cashOnCash' \| 'cashFlow'` | — | the grid's measure when first set, else `'cashOnCash'` |
| `cashOnCashPct` | number | 0 ≤ x ≤ 1000 ("Use 0–1000%") | 8 |
| `cashFlowMonthly` | number | finite, \|x\| ≤ 1,000,000 ("Enter a dollar amount") | 300 |

Each measure keeps its own value, so switching the target measure back and forth doesn't lose it.

A target is **set** once the investor edits the measure or the value (a saved `sensitivity` object
exists). Until then the offer card shows the defaults, labelled "Default target", and the grid
shows no below-target marks.

## B. Grid settings (page state, not stored)

| Field | Values | Default |
|---|---|---|
| `measure` | `'cashOnCash' \| 'cashFlow'` | `'cashFlow'` |
| `columnVariable` | `'price' \| 'rent'` | `'price'` |
| `rateStepPct` | 0.25, 0.5, 1 | 0.5 |
| `columnStepPct` | 2.5, 5, 10 | 5 |

## C. Variant scenario (`scenarioVariant(scenario, change)`)

`change = { ratePct?, price?, priceChangePct?, rentChangePct? }`. At most one of `price` and
`priceChangePct`. Everything not named stays as in `scenario`.

- **Rate**: `annualInterestRatePct = ratePct`.
- **Price**: `price' = price` if given, else `roundCents(homePrice × (1 + priceChangePct/100))`.
  `homePrice = price'`.
- **Loan**: `down(p) = downPercent × p / 100` or the fixed `downAmount`.
  `principal' = principal + (price' − down(price')) − (homePrice − down(homePrice))`.
  At no price change this is exactly `principal`. `principalIsOverridden` is unchanged.
- **Rent**: with `f = 1 + rentChangePct/100`: every unit's `rent` and `rentAfterMoveOut` are
  `roundCents(x × f)`, `grossMonthlyRent = rentRollTotal(rental')`; a rental without units scales
  `grossMonthlyRent` directly. Other income, vacancy rates, the owner flag, the view and RUBS
  settings are unchanged.
- **Unchanged**: tax, insurance, HOA, custom expense amounts, closing costs, rehab, term, extra
  payments, percentage reserves.

A variant that fails `validateScenario` (a fixed down payment ≥ the new price, a non-positive loan)
is an **invalid cell**: `cashFlowMonthly = null`, `cashOnCash = null`, `naReason` = the first
validation message.

## D. `SensitivityGrid` (derived)

```ts
interface SensitivityCell {
  ratePct: number; columnPct: number;
  cashFlowMonthly: number | null;      // analyzeDeal(variant).cashFlow.monthly
  cashOnCash: number | null;           // analyzeDeal(variant).cashOnCashReturn.value (fraction)
  naReason: string | null;             // why cashOnCash (or the whole cell) is null
  meetsTarget: boolean | null;         // against the target measure; null when no target or n/a
}
interface SensitivityGrid {
  rows: { ratePct: number }[];                       // 5
  columns: { pct: number; amount: number; label: string }[];   // amount = price or monthly rent
  cells: SensitivityCell[][];                        // [row][column]
  current: { row: number; column: number };          // the unchanged deal
  columnVariable: 'price' | 'rent';
  maoColumn: { index: number; pct: number; price: number } | null;   // spec FR-016
}
```

- **Rows**: `rate_k = round4(rate + k × rateStep)` for five consecutive `k` starting at
  `kMin = max(−2, ceil(−rate / rateStep − 1e-9))`; `current.row = −kMin`.
- **Columns**: `pct_k = k × columnStep`, `k = −2…2`; `amount` = `price'` or the rent total
  (`rentRollIncome(…, currentView).rentMonthly` of the scaled rent roll). `current.column = 2`.
- **Center equality (SC-001)**: `cells[current.row][current.column]` equals `analyzeDeal` on the
  original scenario, field for field.
- **`meetsTarget`**: for the target measure `t`: `cashFlowMonthly ≥ t.cashFlowMonthly` or
  `cashOnCash ≥ t.cashOnCashPct / 100 − 1e-12`.
- **`maoColumn`** (price variable only): the column whose `pct` is nearest the offer's percentage
  change, when that change lies within the first and last column; else null.

## E. `MaxOfferResult` (derived; `maxAllowableOffer`)

```ts
type MaxOfferResult =
  | { status: 'found'; price: number; deltaFromCurrent: number; deltaPct: number;
      currentMeets: boolean;
      atOffer: { cashFlowMonthly: number; cashOnCash: number | null };
      atCurrent: { cashFlowMonthly: number; cashOnCash: number | null } }
  | { status: 'unreachable'; reason: string; atLowest: {…} }
  
  | { status: 'invalid'; reason: string };
```

- **Procedure** (research R4): `meets(p)` on `scenarioVariant({ price: p })`; `lo` = $1 (or the fixed
  down amount + $1); bisection on whole dollars. `price` is the largest passing integer. If `meets` is still true at the $10,000,000,000 search cap
  (only possible with extreme leverage), the result is `found` with `price` = the cap.
- **Postconditions** (tested): `meets(price)` is true and `meets(price + 1)` is false (unless the search cap is reached); `deltaFromCurrent = price − homePrice`; `deltaPct = deltaFromCurrent / homePrice`;
  `currentMeets = meets(homePrice)`.
- **unreachable** reasons: "No price reaches this target at this rent and rate. A higher rent or a
  lower rate would help." (for a target the cheapest valid price still misses).
- **invalid**: an invalid target, or a scenario that fails validation or has no rent.

## F. Validation

| Input | Rule | Message |
|---|---|---|
| Cash-on-Cash target | finite, 0 ≤ x ≤ 1000 | "Use 0–1000%" |
| Cash-flow target | finite, \|x\| ≤ 1,000,000 | "Enter a dollar amount" |
| Page inputs | `validateScenario`, `validateRental`, price > 0, down payment present, rent > 0 | the existing messages, via the deal card's error count and `InputsMessage` |

## G. State transitions

- Editing the target saves `rental.sensitivity` (no undo entry) and recomputes the offer and the
  below-target marks.
- "Use this price" → `editDeal('homePrice', price, 'page')`; the grid and offer recompute; undo
  restores the previous price.
- Any deal edit (sheet, card, sentence) recomputes everything (the view is memoized on the
  scenario).
