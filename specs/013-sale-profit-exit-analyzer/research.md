# Research: Sale Profit & Exit Analyzer

There were no open `NEEDS CLARIFICATION` items in Technical Context. Each decision below resolves a
choice the description left open. The reference figures in spec.md were produced by prototyping
these formulas against the real engine (`computeSchedule`, `projectExit`, `operatingYear`,
`analyzeDeal`) on 2026-11-18. The 84-month figures reproduce spec 009's 7-year exit to the cent.

## R1. Where the sale inputs are stored

- **Decision**: Add an optional scenario-level `LoanScenario.sale?: SaleAssumptions | null`. It
  holds the exit month, the input unit, the tax switch and tax rates, plus appreciation and selling
  costs **for non-rental scenarios only**. With a rental, appreciation reads/writes the shared
  `rental.appreciationPct` (spec 005) and selling costs read/write `rental.exit.sellingCostsPct`
  (spec 009). Land share reads/writes `rental.wealth.landValuePct` (spec 008).
- **Rationale**: The page must work without a rental, so its own inputs cannot live under `rental`.
  For a rental, sharing the existing fields keeps `/sale`, `/pro-forma` and `/wealth` in agreement
  (SC-002); duplicate fields would let them silently disagree.
- **Alternatives**: (a) Everything under `rental.sale`: breaks the non-rental case. (b) Everything
  under `sale`, ignoring the rental fields: two appreciation inputs that can disagree across pages.

## R2. Exit timing: unit, default, clamping

- **Decision**: Store `exitMonth` (integer). `exitUnit: 'years' | 'months'` is a display preference
  (default `'years'`). In Years mode the field shows `exitMonth / 12` (up to 2 decimals, e.g. 7.5)
  and writes `Math.round(years × 12)`. Default `exitMonth` = `resolveExitAssumptions(rental).holdYears
  × 12` with a rental when that stored hold is valid (no `validateExit` error), else 84. The calculation uses `clamp(exitMonth, 1, termMonths)`; when the
  clamp changes the value, the result carries `clampedFrom` and the UI shows a note. Values that
  are non-integer, non-finite or < 1 are validation errors (`sale.exitMonth`).
- **Rationale**: "Clamped to the loan schedule length" → the term. Defaulting to the pro forma hold
  means a first visit agrees with `/pro-forma`. Clamping rather than erroring keeps the page
  useful when the term is shortened after the exit was set.
- **Alternatives**: Clamp to `schedule.periods.length` (the payoff month) — rejected: with extra
  payments the investor could not model holding a paid-off property (spec Assumptions).

## R3. Projected sale price

- **Decision**: `salePrice = roundCents(homePrice × (1 + a)^(m / 12))`; `sellingCosts =
  roundCents(salePrice × s / 100)`. No forced appreciation.
- **Rationale**: Matches `projectWealth`'s `valueAt(year)` at whole years when forced appreciation
  is 0 (default), and follows the description literally. A note on the page covers forced > 0.
- **Alternatives**: Monthly compounding at a/12 — rejected: disagrees with every other page at
  whole years.

## R4. Remaining balance

- **Decision**: `schedule.periods[m − 1].remainingBalance`, or 0 when `m > periods.length`.
- **Rationale**: Same rule as `projectRental`'s year-end balance; extra payments are already in the
  schedule.

## R5. Cumulative cash flow (rental)

- **Decision**: Extract an internal `annualCashToInvestor(scenario, schedule, years)` from
  `projectExit` (NOI − scheduled debt service − extra principal per year, spec 009 R2) and use it
  for both pages. Cumulative cash flow at month m = Σ full years `floor(m/12)` from that helper +
  Σ remaining months of the partial year, each month = (gsi − opex) of its operating year (via
  `operatingYear`) − (P&I + PMI if the period applies; 0 past payoff) − extra principal applied,
  rounded once at the end. Non-rental: 0.
- **Rationale**: Reusing the annual rows gives cent-exact agreement with `/pro-forma` at whole years
  (SC-002). Calling `projectExit` directly was rejected because it returns null when the stored
  `rental.exit.holdYears` or spec 008 forced-appreciation inputs are invalid, which must not block
  this page. Subtracting extra principal avoids double counting it (it already raises net proceeds
  through a lower balance).
- **Alternatives**: Sum 12×N monthly values from scratch — cent drift from `/pro-forma` because the
  existing code rounds annually.

## R6. Cash invested, profit, return

- **Decision**: Rental: `analyzeDeal(...).totalCashInvested` (down payment + closing + rehab).
  Non-rental: down payment dollars (the helper in `analyze-deal.ts`, exported as
  `downPaymentDollars`). `totalNetProfit = roundCents(net + cumulativeCashFlow − invested)`.
  `returnOnCash = profit / invested` (unrounded ratio) or N/A "No cash invested — return is
  undefined." Verdict: `'profit' | 'loss' | 'break-even'` from the cents-rounded profit.
- **Rationale**: One definition of cash invested across pages. Closing costs and rehab are rental
  inputs; the description treats non-rental as a sale-only view.

## R7. Break-even sale price

- **Decision**: Profit is linear in price P: `P(1 − s) − B + CF − I`. So
  `P* = (B + I − CF) / (1 − s)`, cents-rounded, floored at 0 with `breakEvenAnyPrice = true` when
  raw < 0. `cushion = salePrice − P*`; `breakEvenPctOfPurchase = P* / homePrice`. s ≤ 15% so the
  divisor is never 0.
- **Rationale**: Closed form; no iterative solver needed. Reference: 84 months → $346,093.91.
- **Alternatives**: Bisection — unnecessary for a linear equation.

## R8. Tax estimates

- **Decision** (only when `sale.tax.enabled`):
  - `basis = roundCents(price × (1 − land%) + rehab)` and `annualDepreciation =
    roundCents(basis / 27.5)` — identical to `projectWealth` (spec 008 R5).
  - `depreciationTaken = min(basis, roundCents(annualDepreciation × m / 12))` (rental only; 0
    otherwise). Equals `projectWealth`'s cumulative depreciation at whole years.
  - `adjustedBasis = price + closingCosts + rehab − depreciationTaken` (non-rental: price).
  - `gain = (salePrice − sellingCosts) − adjustedBasis`.
  - `recaptured = clamp(gain, 0, depreciationTaken)`; `recaptureTax = roundCents(recaptured ×
    recapture%)`.
  - `capitalGain = max(0, gain − recaptured)`; `capitalGainsTax = roundCents(capitalGain × cg%)`.
  - `afterTaxNetProfit = profit − recaptureTax − capitalGainsTax`.
  - Defaults: capital gains 15%, recapture 25% (the US maximum unrecaptured §1250 rate), land 20%.
  - Short holds (m ≤ 12): a note only; the rate stays the user's.
- **Rationale**: Illustrative, transparent, and consistent with spec 008's basis. Tax inputs are
  validated separately so invalid tax inputs only null the tax block (FR-011).
- **Alternatives**: MACRS mid-month convention, brackets, NIIT, state tax, §121 exclusion,
  loss carry-forward — out of scope for a planning estimate (spec Assumptions).

## R9. Placement and UI

- **Decision**: Calculations go in `deal-analyzer-calculations` (`analyze-sale.ts`,
  `validate-sale.ts`) and UI in `deal-analyzer-ui` (`SaleView` and parts), like `/pro-forma`. No new
  Nx projects. A `SALE_PROFILE` Deal Strip profile with the headline "Net profit". A new `TagIcon`
  in `shared-ui`.
- **Rationale**: The module already owns `analyzeDeal`, `operatingYear` and the exit helpers it
  reuses; a new lib would need to depend on it anyway.

## R10. Editing and undo

- **Decision**: Rental-backed fields go through `useDealEdits().editRental` (recorded for undo,
  spec 010 R7). Scenario-level `sale` fields go through a new `editSale(patch)` on
  `DealEditsProvider` that applies `{ sale: { ...current.sale, ...patch } }` via
  `applyScenarioPatch`, which gains a shallow merge for `sale` (like `rental`). `editSale` records
  a change with the label "Sale inputs".
- **Rationale**: Keeps every edit undoable and every write through the single patch entry point.
- **Alternatives**: `updateActiveScenario` directly — rejected: bypasses undo.

## R11. Worktree test setup

- **Finding**: The new worktree has no `node_modules`, so `npx nx …` fails silently there. Run
  `npm ci` in the worktree first. E2E must use a prod build on a non-3000 port with
  `BASE_URL` (the main checkout's dev server usually holds :3000).
