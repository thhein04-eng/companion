# Research: Sensitivity Matrix and Max Allowable Offer

No `NEEDS CLARIFICATION` items were left in the Technical Context. These are the design decisions.

## R1. Reuse `analyzeDeal` on variant scenarios

- **Decision**: Each grid cell and each solver probe builds a variant of the scenario (new rate,
  price and/or rent) and runs `analyzeDeal(variant, computeSchedule(variant))`. The cell reads
  `cashFlow.monthly` and `cashOnCashReturn` from the result.
- **Rationale**: The center cell then equals the Deal Analyzer exactly by construction (SC-001),
  with no second copy of the cash-flow, PMI or rent-roll logic to keep in step. Spec 012's rent roll,
  vacancy, RUBS and house-hack views come for free.
- **Alternatives**: A closed-form cash flow formula for speed. Rejected: it would duplicate
  PMI, rent-roll and rounding rules, and 60 runs take a few milliseconds anyway.

## R2. Both measures from one run

- **Decision**: A cell stores `{ cashFlowMonthly, cashOnCash (number | null), naReason }`. The measure
  toggle only chooses which to display; the target check uses the target's own measure.
- **Rationale**: Instant toggling, and the "below target" marks work even when the grid shows the
  other measure.

## R3. The variant builder: how the loan follows the price

- **Decision**: For a price change, `principal' = principal + (price' − down(price')) −
  (price − down(price))`, where `down(p)` is the percentage × p or the fixed amount. `price'` is
  rounded to cents, `principalIsOverridden` stays as it was, and the rate is replaced.
- **Rationale**: This equals the app's own "loan = price − down payment" whenever the loan is
  derived, and it keeps a directly entered loan as the starting point (spec Edge Cases), so a 0%
  change reproduces the scenario exactly (the center cell). `computeSchedule` and PMI then see the
  right balance and loan-to-value.
- **Alternatives**: Always re-derive the loan from price and down payment. Rejected: the center
  cell would differ from the Deal Analyzer for a deal with a loan typed in directly.

## R4. Max Allowable Offer: whole-dollar bisection

- **Decision**: `meets(p)` = the variant at price `p` has `cashFlow.monthly ≥ target`, or
  `cashOnCash ≥ target ÷ 100` (a small tolerance of 1e-12 for floating error). The solver:
  1. `lo` = the lowest valid price ($1, or the fixed down payment + $1).
  2. If `!meets(lo)`: **unreachable**.
  3. Starting at the current price (or `lo`), double until `!meets` or a cap of $10,000,000,000 (then return `found` at the cap; this only happens with extreme leverage, e.g. 99.9% down).
  4. Bisect on whole dollars for the largest `p` with `meets(p)`.
  5. Report it with the measure at that price, at `p + 1`'s failure (for the tests), and at the
     current price.
- **Rationale**: Exact at whole-dollar precision (FR-012) and independent of any closed form.
- **Monotonicity (why bisection is valid)**: Cash flow never increases with price: the loan grows
  (a percentage down payment keeps loan-to-value flat, a fixed one raises it), so principal and
  interest and PMI never fall, while tax, insurance and HOA are fixed dollars. Rounding to cents is
  monotone, so it preserves this. Cash-on-Cash = cash flow ÷ cash invested, and cash invested never
  falls with price. For a target ≥ 0 the set of passing prices is therefore a prefix: while cash flow
  is positive the ratio falls, and once cash flow is negative the ratio is negative, below any
  target ≥ 0. A negative Cash-on-Cash target would break this (the ratio can climb back toward
  zero as cash invested grows), so it is rejected by validation (spec Edge Cases).
- **Alternatives**: A closed form (the payment factor is linear in the price, but PMI and rounding
  are not). Rejected for the same reason as R1. Newton's method: no benefit over ~35 bisection
  steps.

## R5. Ranges and the grid shape

- **Decision**: Rows are `rate + k × rateStep` for five consecutive `k`, with the current deal at
  `k = 0` in the middle; if that would go below 0%, `k` starts at the smallest value that keeps the
  rate ≥ 0 (so the current deal moves up from the middle, and its position is returned). Rates are
  rounded to 4 decimals. Columns are `k × columnStep` for `k = −2…2`. Steps are chosen from fixed
  lists (rate 0.25 / 0.5 / 1; column 2.5 / 5 / 10), default 0.5 and 5.
- **Rationale**: Matches the request's examples (5.5%–7.5% around 6.5%, −10% to +10%) and always
  contains the deal.

## R6. Heat tint and non-color cues

- **Decision**: Each cell gets `background: color-mix(in srgb, var(--good|--bad) X%, var(--surface))`
  with X from 0 to 30 by the cell's size relative to the largest absolute value in the grid
  (diverging around 0), and text always in `--fg`. Cues that don't depend on color: the figure
  carries its minus sign; a cell below the target gets "▼" plus an `aria-label` sentence ending in
  "below target"; the current deal gets a ring and "Current deal" in its label.
- **Rationale**: A 30% tint on the surface keeps `--fg` text well above 4.5:1 in both themes
  (verified by axe in the e2e), and no new tokens are needed (spec 010 FR-035).
- **Alternatives**: Tinting the text. Rejected by FR-035 (text is never colored for meaning alone).

## R7. Where the settings live

- **Decision**: Target measure and per-measure values are saved as `rental.sensitivity`
  (`{ targetMeasure, cashOnCashPct, cashFlowMonthly }`, all optional), written through
  `updateActiveScenario` (a page setting, so no undo entry and no toast, like the occupancy view of
  spec 012). Measure, column variable and the two steps are `useState` in the view.
- "Use this price" goes through `editDeal('homePrice', price, 'page')` (a new `DealEditSource`
  value), so it is recorded, undoable, and shows the usual change toast.
- **Rationale**: The target is "saved with the scenario" (FR-010) but isn't a deal input; the display
  choices reset on reload, which is fine for exploration.

## R8. Page profile and requirements

- **Decision**: `SENSITIVITY_PROFILE`: pinned `annualInterestRatePct`, `homePrice`, `downPayment`,
  `rental.grossMonthlyRent`; requires `homePrice`, `downPayment` and rent ("unlocks the grid").
  Missing inputs show the deal card's hints and an `InputsMessage`, with no grid (FR-018).
- **Rationale**: The same mechanism as every analysis page (spec 010).

## R9. Keyboard navigation of the grid

- **Decision**: `role="grid"` with `role="gridcell"` / `columnheader` / `rowheader`, a roving
  `tabindex` (one cell is in the tab order), arrow keys move by one cell, Home/End jump to the row's
  ends, and Ctrl+Home/End to the grid's corners. A small `useGridNavigation` hook, unit-tested.
- **Rationale**: The ARIA grid pattern for read-only data. The SDK has no grid primitive
  (Complexity Tracking).
