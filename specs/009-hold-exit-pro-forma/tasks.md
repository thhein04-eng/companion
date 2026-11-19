---
description: 'Task list for 009-hold-exit-pro-forma'
---

# Tasks: Multi-Year Hold & Exit Pro Forma

**Input**: Design documents from `/specs/009-hold-exit-pro-forma/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution Principle I requires cent-level unit tests for every
calculation, and the quality gates require e2e. Write each test task first and confirm it fails
before you implement it.

**Conventions** (apply to every task):
- Run every command from the repo root on branch `009-hold-exit-pro-forma`, using `npx nx`.
- **Per-task gate (constitution)**: before ticking a task, run
  `npx nx run-many -t lint test typecheck -p <touched projects>`. For UI or e2e tasks, also run the
  relevant e2e against this branch's own prod build on :3200 (quickstart Prerequisites). Never use
  :3000.
- Cross-lib imports go through package names only. `operatingYear` and `rentalLineItems` stay
  internal: import them relatively and never export them from `index.ts`.
- Money is cents-rounded with `roundCents` at each stored figure. Ratios, including IRR, stay
  unrounded.
- Validated `NumberField`s MUST NOT pass `min`/`max`, because the SDK clamps on commit and would
  hide the errors.
- **Reference scenario**: `referenceScenario({}, { rentGrowthPct: 3, expenseGrowthPct: 2.5,
  appreciationPct: 3.5 })` from
  `libs/deal-analyzer/calculations/src/lib/__fixtures__/dscr-reference.ts`. Expected values are in
  [research.md § Reference scenario](./research.md#reference-scenario-spec-contracts-and-tests).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Record a baseline: `npx nx run-many -t lint test typecheck -p shared-calculations shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e` must pass. Note the result under "Baseline notes".

---

## Phase 2: Foundational (blocks all stories)

- [X] T002 [P] In `libs/shared/calculations/src/lib/types.ts`:
  - Add `ExitAssumptions`, exactly as in data-model.md §A, with this JSDoc: `holdYears?` "Integer 1…30. Default 7." and `sellingCostsPct?` "% of the sale price, 0 ≤ x ≤ 15. Default 7."
  - Add `exit?: ExitAssumptions | null` to `RentalAssumptions`.
  - Add `` `rental.exit.${keyof ExitAssumptions}` `` to the `FieldError['field']` union.
- [X] T003 In `libs/deal-analyzer/calculations/src/lib/validate-rental.ts`, add `'exit'` to the `Exclude<…>` of `NumericRentalField`. Depends on T002.
- [X] T004 [P] Add `KeyIcon` to `libs/shared/ui/src/lib/icons.tsx`, using the same `Icon` wrapper, e.g. `<circle cx="7.5" cy="15.5" r="3.5" /><path d="M10 13l9-9M16 7l2 2M14 9l2 2" />`.
- [X] T005 Add the route and nav:
  - Create `apps/amortization-calculator/src/app/pro-forma/page.tsx`, which exports `metadata = { title: 'Hold & Exit Pro Forma', description: 'Model a sale after a 1–30 year hold: net sale proceeds, IRR, total net profit and equity multiple, before and after tax.' }` and renders `<ProFormaView />` from `deal-analyzer-ui`.
  - Append `{ id: 'pro-forma', label: 'Hold & Exit', href: '/pro-forma', icon: <KeyIcon /> }` to `NAV_ITEMS` in `apps/amortization-calculator/src/app/_nav.tsx`.
  - Create a placeholder `libs/deal-analyzer/ui/src/lib/pro-forma-view.tsx` (`'use client'`) containing:
    - an h1 "Hold & Exit Pro Forma" (`tabIndex={-1}`, the same classes as `wealth-view.tsx`);
    - the description "Model a sale after holding the property: IRR, profit and equity multiple.";
    - "Simplified model, not tax advice."

    Export it from `libs/deal-analyzer/ui/src/index.ts`.

  Depends on T004.
- [X] T006 Extract a shared operating-year helper:
  - Add the internal `operatingYear(scenario: LoanScenario, year: number): { gsiMonthly: number; opexMonthly: number }` to `libs/deal-analyzer/calculations/src/lib/rental-line-items.ts`. It computes:
    - `gsiMonthly = (rent + other) × (1 + rentGrowth)^(year−1)`;
    - `opexMonthly = Σ rentalLineItems(scenario, gsiMonthly, (1 + expenseGrowth)^(year−1)).monthly`.

    It uses `growthRates` from `./project-rental`. If importing it from `rental-line-items.ts` would create a cycle, put the helper in a new internal `operating-year.ts` instead.
  - Replace the past-term branch of `projectWealth` in `libs/deal-analyzer/calculations/src/lib/project-wealth.ts` (around line 127) with `const { gsiMonthly, opexMonthly } = operatingYear(scenario, year); noi = roundCents((gsiMonthly − opexMonthly) × 12)`.

  `project-wealth.spec.ts` must pass **unchanged**.
- [X] T007 Add the horizon override to `projectWealth(scenario, schedule, options?: { horizonYears?: number })`:
  - When `options.horizonYears` is given, use it as the horizon, and drop the `rental.wealth.horizonYears` error from the blocking check. It stays in `errors`, so `/wealth` still shows it.
  - Add the test "override ignores an invalid stored horizon" to `project-wealth.spec.ts`: stored `horizonYears: 31` with `{ horizonYears: 3 }` gives `years.length === 4`.

  Existing tests stay unchanged.

**Checkpoint**: `/pro-forma` builds and shows its h1 and current nav link, and every existing unit test passes.

---

## Phase 3: User Story 1 — Return from buy, hold, sell (P1) 🎯 MVP

**Goal**: An exit summary (sale price, selling costs, payoff, net proceeds, pre-tax IRR, profit,
multiple) for the chosen hold, plus the 5/7/10 comparison, the hold presets and input, the
selling-costs input, and the not-ready messages.

**Independent Test**: With the reference scenario, a 7-year hold and 7% selling costs:
- the sale price is $508,911.71, net proceeds $199,845.65;
- IRR is 15.66%, profit $151,420.55, multiple 2.51×;
- the comparison shows a 5-year IRR of 14.96% and a 10-year IRR of 15.71%.

### Tests (write first)

- [X] T008 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/irr.spec.ts`. Each vector is checked with `toBeCloseTo(expected, 9)`:
  - `[-100, 110]` → 0.1
  - `[-1000, 300, 400, 500]` → 0.0889633947
  - `[-100, 0, 0, 133.1]` → 0.1
  - `[-100, -10, 50]` → null
  - `[100, 10]` → null
  - `[0, 0]` → null
  - `[]` → null

  Also check that NPV at the result is within 1e-6 for `[-1000, 300, 400, 500]`.
- [X] T009 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/validate-exit.spec.ts`:
  - `{}` and `exit: null` both give `[]`.
  - `holdYears` 0, 31, 7.5 and `'7'` each give exactly `[{ field: 'rental.exit.holdYears', message: 'Hold period must be 1 to 30 whole years.' }]`.
  - `sellingCostsPct` −1, 15.5 and `NaN` each give `[{ field: 'rental.exit.sellingCostsPct', message: 'Selling costs must be between 0% and 15%.' }]`.
  - The boundaries `holdYears: 30` and `sellingCostsPct` 0 or 15 give `[]`.
  - `resolveExitAssumptions` of a rental without `exit` is `{ holdYears: 7, sellingCostsPct: 7 }`.
- [X] T010 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/project-exit.spec.ts` (pre-tax part). Use `projectExit(s, computeSchedule(s), hold)`:
  - **Reference holds 5, 7 and 10**: `salePrice`, `sellingCosts`, `loanPayoff`, `netSaleProceeds`, `preTax.totalCashFlow` and `preTax.totalNetProfit` match the research table to the cent. `preTax.equityMultiple.value.toFixed(4)` and `preTax.irr.value.toFixed(4)` equal 1.9139/0.1496, 2.5142/0.1566 and 3.5637/0.1571.
  - **Defaults**: with no `hold` argument, `holdYears === 7` (the default).
  - **NPV**: for the reference and the 20 seeded scenarios generated as in `project-wealth.spec.ts` (copy its `generatedScenarios` into a shared fixture `__fixtures__/generated-scenarios.ts` and import it from both specs), `|NPV(irr)| < 0.01` over the pre-tax series.
  - **Profit identity**: `|totalNetProfit − (multiple × invested − invested)| ≤ 0.01`.
  - **Agreement**: for holds 1, 7 and 30, each `ProFormaYear` matches `projectWealth(s, sch, { horizonYears: hold }).years[y]` in `propertyValue`, `loanBalance`, `noi`, `interest`, `depreciation` and `taxEffect`.
  - **Past the loan term**: a 15-year loan with hold 20 gives `loanPayoff === 0` and `debtService === 0` for years 16–20.
  - **0% selling costs**: `sellingCostsPct: 0` gives `netSaleProceeds === roundCents(salePrice − loanPayoff)`.
  - **No cash invested**: 0% down, no costs, gives `preTax.irr` and `preTax.equityMultiple` both `{ value: null, naReason: 'No cash invested — returns are undefined.' }`.
  - **No price**: `result === null`, `naReason === 'Enter a purchase price to model a sale.'`.
  - **Invalid exit inputs**: `exit: { sellingCostsPct: 20 }` gives `result === null`, `naReason === 'Fix the hold and exit assumptions to see the exit.'`, and `errors` containing the selling-costs error.
  - **Forced appreciation**: `wealth: { forcedAppreciation: 20000 }` gives a `salePrice` with it included (equal to `projectWealth`'s year-N `propertyValue`) and `forcedAppreciation === 20000`.
  - **`compareHolds`**: the stored hold 7 gives holds `[5, 7, 10]`, and the stored hold 12 gives `[5, 7, 10, 12]`, in ascending order with no duplicates.

### Implementation

- [X] T011 [US1] Add `ProFormaYear`, `ExitReturns`, `ExitResult` and `ExitProjection` to `libs/deal-analyzer/calculations/src/lib/types.ts`, exactly as in data-model.md §B, with their comments.
- [X] T012 [US1] Create `libs/deal-analyzer/calculations/src/lib/irr.ts` with `irr(cashFlows: number[]): number | null`, implementing research R4:
  - Return null when `cashFlows.length < 2` or `cashFlows[0] >= 0`.
  - `npv(r) = Σ cf_t / (1+r)^t`. Return null when `npv(−0.99)` and `npv(10)` have the same sign.
  - Bisect until `hi − lo < 1e-10`, with at most 200 iterations.

  T008 must then pass.
- [X] T013 [US1] Create `libs/deal-analyzer/calculations/src/lib/validate-exit.ts`:
  - Export `DEFAULT_EXIT = { holdYears: 7, sellingCostsPct: 7 }`, `HOLD_PRESETS = [5, 7, 10] as const` and `EXAMPLE_GROWTH = { rentGrowthPct: 3, expenseGrowthPct: 2.5, appreciationPct: 3.5 } as const`.
  - `resolveExitAssumptions(rental)` takes each stored value, or the default when it is `undefined`.
  - `validateExit(rental)` follows data-model §A verbatim:
    - `holdYears`: "integer, 1 ≤ x ≤ 30", message "Hold period must be 1 to 30 whole years."
    - `sellingCostsPct`: "finite, 0 ≤ x ≤ 15", message "Selling costs must be between 0% and 15%."

    It only validates fields that are present, uses `typeof === 'number'` guards, and never throws.

  T009 must then pass.
- [X] T014 [US1] Create `libs/deal-analyzer/calculations/src/lib/project-exit.ts`, following contracts/exit-calculations.md § projectExit:
  - **Inputs**: resolve the exit assumptions and validate them, and guard the price.
  - **Rows**: `wealth = projectWealth(scenario, schedule, { horizonYears: hold })` and `rental = projectRental(scenario, schedule).years`. Each row y in 1…hold:
    - `grossIncome` and `operatingExpenses` come from `rental[y−1]` when it exists, otherwise from `operatingYear` × 12, rounded.
    - `debtService` comes from `rental[y−1]?.debtService ?? 0`.
    - `extraPrincipal = roundCents(Σ schedule.periods.slice((y−1)·12, y·12).extraPrincipalApplied)`.
    - `cashToInvestor = roundCents(noi − debtService − extraPrincipal)`. Here `noi` comes from the wealth row, and `noi − debtService` equals the wealth row's `cashFlow`.
    - The tax fields come from the wealth row, and `afterTaxCashFlow = taxEffect == null ? null : roundCents(cashToInvestor + taxEffect)`.
  - **Sale**: follows research R3.
  - **Returns**: a helper `returns(flows: number[], net: number, invested: number): ExitReturns` that builds the series `[−invested, …flows with net added to the last]`, then computes the totals per R5 and `irr()` per R4, with the N/A reasons from the contract.
  - **`afterTax`**: `null` when `wealth.taxNaReason`, and `taxNaReason` is copied through.
  - **`compareHolds`**: runs `projectExit` for each unique hold in `[...HOLD_PRESETS, chosen]`, sorted ascending.

  Export `irr`, `validate-exit` and `project-exit` from `libs/deal-analyzer/calculations/src/index.ts`. T010 must then pass.
- [X] T015 [US1] Create `libs/deal-analyzer/ui/src/lib/use-exit-editor.ts` (`'use client'`). It provides:
  - `setExit(patch)`: writes `{ exit: { ...rental.exit, ...patch } }` (the full object, because `applyScenarioPatch` merges only one level deep).
  - `setGrowth(patch)`.
  - `applyExampleRates()`: writes `EXAMPLE_GROWTH`.
  - `setTax(patch: Pick<WealthAssumptions, 'landValuePct' | 'marginalTaxRatePct'>)`: writes `{ wealth: { ...rental.wealth, ...patch } }`.
- [X] T016 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/exit-summary.tsx`, following contracts/pro-forma-ui.md § ExitSummary:
  - Heading: "Sale at end of year {N}".
  - Sale tiles: `exit-sale-price`, `exit-selling-costs` and `exit-loan-payoff`, the last two shown negated with a leading minus, plus `exit-net-proceeds`.
  - Pre-tax tiles:
    - `exit-irr`: `percent2` with 2 decimals, or "N/A" with the reason as a caption;
    - `exit-profit`;
    - `exit-multiple`: `${v.toFixed(2)}×`, or N/A.
  - After-tax tiles: render the after-tax group only once `afterTax` exists (US3 fills it in). Until then, render it with "—" and the caption "After-tax cash flow; excludes tax on sale".
  - `exit-forced-note`: shown when `forcedAppreciation > 0`.
  - Root `data-testid="exit-summary"`. Negatives use `text-red-700`.
- [X] T017 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/hold-comparison-table.tsx`, following contracts/pro-forma-ui.md § HoldComparisonTable:
  - Input `projections: ExitProjection[]` and `chosen: number`.
  - A `<table>` with a `<caption>` ("Exit returns by hold period") inside `role="region" aria-label="Hold period comparison" tabIndex=0 overflow-x-auto`.
  - The column headers are `<th scope="col">` with "{N} yrs". The chosen column has `aria-current="true"` and a `bg-sky-50` highlight.
  - The rows are `irr`, `irr-after-tax`, `profit`, `multiple` and `net-proceeds`, with each cell `data-testid="hold-{N}-{row}"`. The after-tax cells show "—" until US3.
- [X] T018 [US1] Create `libs/deal-analyzer/ui/src/lib/exit-assumptions-panel.tsx` with the **Hold** and **Sale** groups only (US2 and US3 add the rest):
  - The root is `data-testid="exit-assumptions"`.
  - Hold: `SegmentedOptions` with `label="Hold period"`, `data-testid="hold-presets"` and options 5/7/10 yrs, set to `null` when the hold is custom. Next to it, `NumberField` "Hold (years)" with step 1.
  - Sale: `NumberField` "Selling costs" with `suffix="%"`, step 0.5 and the description "Commissions, transfer taxes and closing".
  - No min/max on any field. Errors are matched by `rental.exit.*` key.
- [X] T019 [US1] Complete `libs/deal-analyzer/ui/src/lib/pro-forma-view.tsx`, mirroring `wealth-view.tsx`:
  - Sections: ScenarioTabs; Loan; Real-estate costs; Rental income (`RentalInputsPanel hideGrowth`); then "Assumptions" (the panel, only when rental exists); "Exit"; "Compare hold periods"; "Pro forma" (a placeholder until T024).
  - The memoized `projection` and `comparison` (`compareHolds`) are computed only when the rental exists, `validateRental` passes and the loan is valid.
  - Otherwise, `<p data-testid="pro-forma-na">` shows the first applicable message from contracts/pro-forma-ui.md, in this order:
    1. "Enter rent above to model a sale."
    2. "Fix the highlighted rental inputs to see the exit."
    3. "Fix the highlighted loan fields above to see the exit."
    4. `projection.naReason`
  - The comparison and pro forma sections render only when `projection.result` exists.
  - Pass `errors = [...validateExit(rental), ...validateWealth(rental), ...rentalErrors]` to the panel.

  Export the new components and the hook from `libs/deal-analyzer/ui/src/index.ts`.
- [X] T020 [US1] Create `apps/amortization-calculator-e2e/src/pro-forma.spec.ts`. Its `enterReference(page)` helper goes to `/pro-forma`, fills the property fields like `wealth-projection.spec.ts` does, and sets Rent growth 3, Expense growth 2.5 and Appreciation 3.5.

  Until US2 adds growth fields to this page, seed the growth rates on `/wealth` (whose assumptions panel has the same labels), then `page.goto('/pro-forma')`.

  Add `test.describe('Hold & Exit page (spec 009 US1)')` with these tests:
  - **Route**: title "Hold & Exit Pro Forma · Companion", the h1, the nav link "Hold & Exit" current, and with no rent, `pro-forma-na` shows "Enter rent above to model a sale."
  - **Reference exit**: `exit-sale-price` $508,911.71, `exit-net-proceeds` $199,845.65, `exit-irr` 15.66%, `exit-profit` $151,420.55, `exit-multiple` 2.51×.
  - **Comparison**: `hold-5-irr` 14.96%, `hold-10-irr` 15.71%, and the 7-year header `aria-current="true"`.
  - **10-year preset**: the "10 yrs" radio gives `exit-net-proceeds` $267,305.58 and `exit-multiple` 3.56×.
  - **No price**: clearing Home price shows `pro-forma-na` with "Enter a purchase price to model a sale."
  - **Phone width**: at 375 px, `scrollWidth − clientWidth ≤ 0` (polled).

**Checkpoint**: US1 unit tests and e2e pass. The pre-tax exit works.

---

## Phase 4: User Story 2 — Growth and inflation drive the pro forma (P2)

**Goal**: Growth inputs on the page, "Use example rates", the year-by-year pro forma table with its
sale row, and extra principal treated as cash out.

**Independent Test**: With growth at 0%, "Use example rates" gives a 7-year IRR of 15.66%. Row 1
shows NOI $28,512.00 and cash to investor $4,561.08, and the sale row shows net proceeds
$199,845.65. With a $500/mo extra payment, payoff is $219,442.75 and IRR is 14.82%.

### Tests (write first)

- [X] T021 [P] [US2] Extend `project-exit.spec.ts`:
  - **Year 1**: `{ grossIncome: 45600, noi: 28512, debtService: 23950.92, extraPrincipal: 0, cashToInvestor: 4561.08 }`.
  - **Extra payment**: a recurring $500 payment from period 1 with hold 7 gives:
    - `loanPayoff 219442.75`, `netSaleProceeds 253845.14`, `preTax.totalCashFlow 9574.9`, `preTax.totalNetProfit 163420.04`;
    - `preTax.equityMultiple.value.toFixed(4) === '2.6342'` and `preTax.irr.value.toFixed(4) === '0.1482'`;
    - year-1 `extraPrincipal 6000` and `cashToInvestor -1438.92`.
  - **Flat growth**: at 0% growth, the gross income is identical every year.

### Implementation

- [X] T022 [US2] Add the **Growth** group to `exit-assumptions-panel.tsx`:
  - `NumberField`s "Rent growth", "Expense growth" and "Appreciation", with `suffix="%"`, `step={0.1}`, `description="per year"` and no min/max. Their values are `rental.*Pct ?? 0`, their errors come from `rental.*Pct`, and they write through `onGrowthChange`.
  - A `Button` "Use example rates (3% / 2.5% / 3.5%)" with `data-testid="pro-forma-example-rates"`, calling `onExampleRates`.

  Wire both in `pro-forma-view.tsx`.
- [X] T023 [P] [US2] Create `libs/deal-analyzer/ui/src/lib/pro-forma-table.tsx`, following contracts/pro-forma-ui.md § ProFormaTable:
  - Columns, with their cell keys, in contract order:
    - `gross-income`, `opex`, `noi`
    - `debt-service`, `extra-principal`, `cash-to-investor`
    - `interest`, `depreciation`, `taxable`, `tax-effect`, `after-tax-cf`
    - `balance`, `value`
  - Rows `pro-forma-row-{year}` for 1…N.
  - A final row `pro-forma-sale` with `sale-price`, `selling-costs` (negative), `payoff` (negative) and `net-proceeds`. The labels go in the first cell, and the unused cells are left empty.
  - Null values show "—". Negatives are red with a minus sign.
  - The note: "Cash to investor includes extra principal payments as an outflow."
  - A `<caption>`, scoped headers, and its own scroll region.
- [X] T024 [US2] Render `ProFormaTable` in the "Pro forma" section of `pro-forma-view.tsx`.
- [X] T025 [US2] Update `enterReference` in `pro-forma.spec.ts` to set growth on `/pro-forma` itself. Add `test.describe('Assumptions (spec 009 US2)')` with these tests:
  - **Example rates**: with growth at 0, `pro-forma-example-rates` gives `exit-irr` 15.66%.
  - **Row 1**: `pro-forma-row-1` `noi` $28,512.00 and `cash-to-investor` $4,561.08, and `pro-forma-sale` `net-proceeds` $199,845.65.
  - **Selling costs 20**: the inline error "Selling costs must be between 0% and 15%." and `pro-forma-na` with "Fix the hold and exit assumptions to see the exit.". "Loan amount" is still editable.
  - **Shared growth**: after the example rates, `/wealth` shows Appreciation 3.5.
  - **Extra payment**: seed a recurring $500 extra payment through `sessionStorage` (the same pattern as `wealth-projection.spec.ts`'s `seedLegacySessionWithExtraPayment`), then reload. Expect `exit-loan-payoff` −$219,442.75, `exit-irr` 14.82% and `pro-forma-row-1` `extra-principal` $6,000.00.

**Checkpoint**: US1 and US2 pass.

---

## Phase 5: User Story 3 — After-tax cash flow from depreciation and interest (P3)

**Goal**: After-tax rows and returns, and the land and tax inputs (shared with `/wealth`).

**Independent Test**: Row 1 shows depreciation $11,636.36, interest $20,903.45, tax effect $966.67
and after-tax CF $5,527.75. The after-tax IRR is 15.88%, profit $152,217.73 and multiple 2.52×. A
0% rate gives after-tax equal to pre-tax, and land 100 blanks only the after-tax figures.

### Tests (write first)

- [X] T026 [P] [US3] Extend `project-exit.spec.ts`:
  - **Year 1**: `{ depreciation: 11636.36, interest: 20903.45, taxEffect: 966.67, afterTaxCashFlow: 5527.75 }`.
  - **After-tax returns**: for holds 5, 7 and 10, `afterTax.totalCashFlow` and `totalNetProfit` match the research ΣATCF and Profit AT to the cent. The multiple and IRR to 4 dp are 1.9346/0.1537, 2.5222/0.1588 and 3.5271/0.1570.
  - **Rate 0**: `marginalTaxRatePct: 0` makes `afterTax` deep-equal `preTax`.
  - **Invalid tax inputs**: land 100 gives `afterTax === null`, `taxNaReason === 'Fix the tax assumptions to see after-tax figures.'`, null tax fields in every row, and `preTax` deep-equal to the valid run.

### Implementation

- [X] T027 [US3] Add the **Tax** group to `exit-assumptions-panel.tsx`: `NumberField`s "Land value share" (%, step 1, description "Land doesn't depreciate; shared with Wealth Projection") and "Marginal tax rate" (%, step 1). Their values are `resolveWealthAssumptions(rental)`, their errors come from `rental.wealth.*`, and they write through `onTaxChange` (`setTax`). Wire it in `pro-forma-view.tsx`.
- [X] T028 [US3] Make `exit-summary.tsx` and `hold-comparison-table.tsx` render the real after-tax values, with the same formats as the pre-tax ones, and "—" plus `taxNaReason` when `afterTax` is null. Confirm that `pro-forma-table.tsx` shows the tax columns (they already handle null). Add the line "Depreciation: building value ÷ 27.5 years (land excluded). Simplified model; not tax advice." under the table.
- [X] T029 [US3] Add `test.describe('Tax (spec 009 US3)')` to `pro-forma.spec.ts`, with these tests:
  - **Row 1**: `pro-forma-row-1` `depreciation` $11,636.36, `interest` $20,903.45, `tax-effect` $966.67 and `after-tax-cf` $5,527.75.
  - **After-tax returns**: `exit-irr-after-tax` 15.88%, `exit-profit-after-tax` $152,217.73 and `exit-multiple-after-tax` 2.52×.
  - **Rate 0**: "Marginal tax rate" 0 gives `exit-irr-after-tax` 15.66%.
  - **Land 100**: shows the inline error, and `exit-irr-after-tax` "—" while `exit-irr` is still 15.66%.
  - **Persistence**: reload restores the hold, selling costs, land and rate.
  - **Old session**: deleting `rental.exit` from `sessionStorage['amortization:scenarios']` and reloading gives "Sale at end of year 7" and Selling costs 7, with no errors.
  - **Forced appreciation**: seed `rental.wealth.forcedAppreciation = 20000`, then reload, and `exit-forced-note` is visible.

**Checkpoint**: All three stories pass.

---

## Phase 6: Polish & Cross-Cutting

- [X] T030 Add a SC-003 test to `apps/amortization-calculator-e2e/src/performance.spec.ts`: on `/pro-forma` with the reference property, change "Rent growth" and expect `exit-irr` to change within 1000 ms (the same pattern as the wealth timing test).
- [X] T031 [P] Docs:
  - Add a row `/pro-forma | ProFormaView (added by spec 009) | Hold & Exit Pro Forma · Companion | "Hold & Exit Pro Forma"` to `specs/003-feature-pages-navigation/contracts/routes-and-navigation.md`.
  - Append to `libs/deal-analyzer/calculations/README.md`: `irr`, `projectExit`, `compareHolds`, `validateExit`, `resolveExitAssumptions`, `DEFAULT_EXIT`, `HOLD_PRESETS`, `EXAMPLE_GROWTH`, the exit types, and the `projectWealth` `options.horizonYears` override.
  - Append to `libs/deal-analyzer/ui/README.md`: `ProFormaView`, `ExitAssumptionsPanel`, `ExitSummary`, `HoldComparisonTable`, `ProFormaTable` and `useExitEditor`.
- [X] T032 Full gate:
  - lint, test and typecheck for all 6 projects;
  - `npx nx build amortization-calculator`;
  - `npx nx run amortization-calculator:start --port=3200` in the background;
  - `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`.

  All of it must pass. Run the full e2e twice to catch flakes, and record both results.
- [X] T033 Run every quickstart.md scenario (§2–§6) once against :3200, then append a "Verified on {date}" block to `specs/009-hold-exit-pro-forma/quickstart.md`. Include the keyboard pass: Tab reaches the hold presets (arrow keys move the choice), every assumption field, Use example rates, and both table regions.

---

## Dependencies & Execution Order

```text
Setup (T001) ─► Foundational (T002–T007) ─► US1 (T008–T020, MVP) ─► US2 (T021–T025) ─► US3 (T026–T029) ─► Polish (T030–T033)
```

- **Foundational**: T003 depends on T002, and T005 depends on T004. T006 and T007 both touch `project-wealth.ts`, so they run in sequence.
- **US1**: tests T008–T010 come before T011–T014. The UI tasks T016 and T017 need T011, and T019 needs T015–T018.
- **US2 and US3**: these extend `project-exit.spec.ts`, `exit-assumptions-panel.tsx` and `pro-forma-view.tsx`, so they run in sequence after US1.

## Parallel Opportunities

- **Foundational**: T002 ∥ T004.
- **US1**: T008 ∥ T009 ∥ T010, then T016 ∥ T017 once T011 is done.
- **US2**: T023 ∥ T021. **US3**: T026 alongside T027 (different files). **Polish**: T031 alongside T030.

### Parallel example: US1 tests

```text
Task: "T008 irr.spec.ts in libs/deal-analyzer/calculations/src/lib/irr.spec.ts"
Task: "T009 validate-exit.spec.ts in libs/deal-analyzer/calculations/src/lib/validate-exit.spec.ts"
Task: "T010 project-exit.spec.ts in libs/deal-analyzer/calculations/src/lib/project-exit.spec.ts"
```

## Implementation Strategy

- **MVP**: Phases 1–3. `/pro-forma` then shows the pre-tax exit and the 5/7/10 comparison, using
  growth rates set on the other pages. Validate it with quickstart §2–§3.
- **Then**: US2 (on-page growth and the pro forma table), US3 (after-tax), and Polish.

## Baseline notes

_(filled by T001)_

- **Delivered through spec 010** (`specs/010-deal-strip-redesign/tasks.md` T065–T072, 2026-11-18).
  The page runs on the spec 010 Deal Strip, so it has no inline Loan, Real-estate costs or Rental
  sections. Its "not ready" messages drop "above": "Add rent to model a sale.", "Fix the rental
  inputs to see the exit.", and "Fix the loan inputs to see the exit." `validate-rental.ts` now
  lives in `shared-calculations` (spec 010 R6).
- **T008 vector corrected**: `irr([-100, -10, 50])` has a real root at r ≈ −0.3411 inside R4's
  bracket, so it is not null. See spec 010 tasks.md notes.

