---
description: 'Task list for 008-wealth-projection'
---

# Tasks: Multi-Year Projections & Wealth Accumulation Simulator

**Input**: Design documents from `/specs/008-wealth-projection/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution Principle I requires cent-level unit tests for every calculation,
and the quality gates require e2e. Write each test task first and confirm it fails before you
implement it.

**Conventions** (apply to every task):
- Run commands from the repo root on branch `008-wealth-projection`, using `npx nx` (this is an npm
  workspace).
- **Per-task gate (constitution)**: before ticking a task, run
  `npx nx run-many -t lint test typecheck -p <touched projects>`. For any task touching UI or e2e,
  also run the relevant e2e against this branch's own prod build on :3200 (quickstart
  Prerequisites). Never rely on :3000.
- Import across libs only through package names (`shared-calculations`,
  `deal-analyzer-calculations`, `shared-ui`, `shared-data-access`, `@companion/charts`).
- Money is cents-rounded with `roundCents` at each stored figure. Ratios stay unrounded.
- `NumberField`s for validated inputs MUST NOT pass `min`/`max`, because the SDK clamps on commit
  and would hide the errors (precedent: `rental-inputs-panel.tsx`, `dscr-card.tsx`).
- **Reference scenario**: `referenceScenario({}, { appreciationPct: 3, rentGrowthPct: 2.5,
  expenseGrowthPct: 2.5 })` from
  `libs/deal-analyzer/calculations/src/lib/__fixtures__/dscr-reference.ts`. Expected figures are in
  [research.md § Reference scenario](./research.md#reference-scenario-spec-contracts-and-tests).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Run `npm ci` if `node_modules` is missing. Then record a baseline with `npx nx run-many -t lint test typecheck -p shared-calculations shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`, which must pass, and note the result under "Baseline notes" at the end of this file.

---

## Phase 2: Foundational (blocks all stories)

- [X] T002 [P] Add `WealthAssumptions` to `libs/shared/calculations/src/lib/types.ts`, exactly as in data-model.md §A, with this JSDoc on each field:
  - `horizonYears?` "Integer 1…30. Default 10."
  - `forcedAppreciation?` "One-time value uplift at purchase, $ ≥ 0. Default 0."
  - `landValuePct?` "Land share of the price, 0 ≤ x < 100. Default 20."
  - `marginalTaxRatePct?` "0 ≤ x ≤ 60. Default 24."

  Add `wealth?: WealthAssumptions | null` to `RentalAssumptions`, and add `` `rental.wealth.${keyof WealthAssumptions}` `` to the `FieldError['field']` union.
- [X] T003 In `libs/deal-analyzer/calculations/src/lib/validate-rental.ts`, add `'wealth'` to the `Exclude<…>` in `NumericRentalField`, so `validateRental` never treats it as a numeric input. Depends on T002.
- [X] T004 [P] Add `TrendingUpIcon` to `libs/shared/ui/src/lib/icons.tsx`, using the same `Icon` wrapper and a rising polyline with an arrow head, e.g. `<path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />`. It is exported through the existing `export * from './lib/icons'`.
- [X] T005 Add the route and nav:
  - Create `apps/amortization-calculator/src/app/wealth/page.tsx`. It exports `metadata = { title: 'Wealth Projection', description: 'Project a rental’s equity, cash flow, tax effect and net worth over 1–30 years.' }` and renders `<WealthView />` from `deal-analyzer-ui`.
  - Append `{ id: 'wealth', label: 'Wealth Projection', href: '/wealth', icon: <TrendingUpIcon /> }` to `NAV_ITEMS` in `apps/amortization-calculator/src/app/_nav.tsx`.
  - Create a placeholder `libs/deal-analyzer/ui/src/lib/wealth-view.tsx` (`'use client'`) with only the `<header>`: h1 "Wealth Projection" (with `tabIndex={-1}` and the same classes as `financing-view.tsx`), the line "Project equity, cash flow and net worth over time.", and "Simplified model, not tax advice."
  - Export it from `libs/deal-analyzer/ui/src/index.ts`.

  Depends on T004.

**Checkpoint**: `/wealth` builds, shows the h1, and the nav link "Wealth Projection" is current there.

---

## Phase 3: User Story 1 — See net worth grow year by year (P1) 🎯 MVP

**Goal**: `/wealth` shows the pre-tax projection: a line chart (Net worth, Equity) from year 0 to
the horizon, the horizon summary, a year table, and a horizon control (default 10, presets 5/10,
range 1–30).

**Independent Test**: With the reference scenario, the summary shows net worth $360,051.02, equity
$280,129.40, cumulative cash flow $79,921.62 and a 3.6× multiple. Row 0 shows $100,000.00 and
row 5 shows $211,428.70. Picking 5 yrs ends the projection at $211,428.70.

### Tests (write first)

- [X] T006 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/project-wealth.spec.ts` (pre-tax part). Use `projectWealth(s, computeSchedule(s))` and assert:
  - **Reference rows**: years 0, 1, 2, 5, 6 and 10 match every pre-tax column of the research table to the cent (`propertyValue`, `loanBalance`, `equity`, `noi`, `cashFlow`, `cumulativeCashFlow`, `netWorth`).
  - **Year 0**: `{ year: 0, propertyValue: 400000, loanBalance: 300000, equity: 100000, noi: 0, cashFlow: 0, cumulativeCashFlow: 0, netWorth: 100000 }`.
  - **Shape and summary**: `years.length === 11`, `horizonYears === 10`, `totalCashInvested === 100000`, and `(multiple.value).toFixed(1) === '3.6'`.
  - **Horizon 5**: `rental.wealth = { horizonYears: 5 }` gives 6 rows, with the last `netWorth` 211428.70.
  - **Spec 005 agreement**: for every year 1–10, `noi`, `cashFlow` and `loanBalance` equal `projectRental(s, schedule).years[y-1]`.
  - **Past the loan term**: a 15-year loan (`termMonths: 180`, recompute `principal`) with horizon 20. Years 16–20 have `loanBalance 0` and `cashFlow === noi`, and NOI keeps growing by 2.5% per year. **Term boundary**: for a 30-year loan with horizon 30, and for a 15-year loan with horizon 16, year (term+1) NOI equals `roundCents(year(term) unrounded NOI × 1.025)` when rent and expense growth are equal. Compute the unrounded value independently from `rentalLineItems`, so there is no one-cent seam at the switch from `projectRental` rows to the past-term loop.
  - **No price**: `homePrice: null` gives `years === null` and `naReason === 'Enter a purchase price to project equity and net worth.'`.
  - **Zero cash invested**: down payment 0% with closing and rehab both 0 gives `multiple.value === null` and `multiple.naReason === 'No cash invested — Cash-on-Cash Return is undefined.'`.
  - **Old session**: a rental without `wealth` gives `resolveWealthAssumptions` equal to `{ horizonYears: 10, forcedAppreciation: 0, landValuePct: 20, marginalTaxRatePct: 24 }`.
  - **Invariants**, over 20 generated scenarios (seeded loop: rates 3–9%, down 10–40%, appreciation −2…6%, rent −1…5%, horizons 1–30, with and without a recurring extra payment):
    - `initialEquity + forcedAppreciation + marketAppreciation + principalPaid === equity`
    - `netWorth − equity === cumulativeCashFlow`, compared after `roundCents`
- [X] T007 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/validate-wealth.spec.ts` (horizon part):
  - `{}` gives `[]`.
  - `horizonYears` 0, 31, 7.5, `NaN` and `'10'` (cast) each give exactly `[{ field: 'rental.wealth.horizonYears', message: 'Horizon must be 1 to 30 whole years.' }]`.
  - `wealth: null` gives `[]`.
  - `projectWealth` with horizon 31 gives `years === null`, `naReason === 'Fix the projection assumptions to see the projection.'` and `errors` containing that error.

### Implementation

- [X] T008 [US1] Add `WealthYear` and `WealthProjection` to `libs/deal-analyzer/calculations/src/lib/types.ts`, exactly as in data-model.md §B, including the JSDoc comments.
- [X] T009 [US1] Create `libs/deal-analyzer/calculations/src/lib/validate-wealth.ts`:
  - `resolveWealthAssumptions(rental)` returns `{ ...DEFAULT_WEALTH, ...defined fields of rental.wealth }`, ignoring `undefined` values. It uses this constant, exported from `project-wealth.ts`: `DEFAULT_WEALTH = { horizonYears: 10, forcedAppreciation: 0, landValuePct: 20, marginalTaxRatePct: 24 }`.
  - `validateWealth(rental): FieldError[]` implements the data-model §A table verbatim, with key `rental.wealth.{field}`. Each field is validated only when present.
    - `horizonYears`: "integer, 1 ≤ x ≤ 30", message "Horizon must be 1 to 30 whole years."
    - `forcedAppreciation`: "finite, ≥ 0", message "Forced appreciation cannot be negative."
    - `landValuePct`: "finite, 0 ≤ x < 100", message "Land value must be at least 0% and less than 100%."
    - `marginalTaxRatePct`: "finite, 0 ≤ x ≤ 60", message "Tax rate must be between 0% and 60%."

    Use `typeof x === 'number'` guards, so it never throws on malformed values.
- [X] T010 [US1] Create `libs/deal-analyzer/calculations/src/lib/project-wealth.ts` with these exports:
  - Constants: `DEPRECIATION_YEARS = 27.5`, `DEFAULT_WEALTH`, `TYPICAL_GROWTH = { appreciationPct: 3, rentGrowthPct: 2.5, expenseGrowthPct: 2.5 } as const`, and the NA strings from contracts/wealth-calculations.md.
  - `projectWealth(scenario, schedule)`:
    - Guard the price, then validate (horizon and forced errors give `years: null` with `errors`).
    - `rental = projectRental(scenario, schedule)`, `deal = analyzeDeal(scenario, schedule)`, `loan = scenario.principal`, `F = forced`, `a = appreciationPct / 100`.
    - Year 0 row: value `roundCents(price + F)`, balance `loan`, everything else as in T006.
    - For each year y from 1 to N:
      - Inside the loan term, take `noi`, `cashFlow` and `loanBalance` from `rental.years[y-1]`.
      - Past the term, compute NOI with the same growth rule: `gsi = (rent + other) × (1 + rentGrowth)^(y−1)`, and `opex = Σ rentalLineItems(scenario, gsi, (1 + expenseGrowth)^(y−1))`, imported relatively from `./rental-line-items`. Then `noi = roundCents((gsiMonthly − opexMonthly) × 12)`, which is exactly `projectRental`'s rounding order, never summing rounded monthly figures. Set `cashFlow = noi` and `balance = 0`.
      - `value = roundCents((price + F) × (1 + a)^y)` and `equity = roundCents(value − balance)`.
      - The parts: `initialEquity = roundCents(price − loan)`, `forcedAppreciation = F`, `marketAppreciation = roundCents(value − price − F)` and `principalPaid = roundCents(loan − balance)`.
      - `cumulativeCashFlow += cashFlow` (rounded), and `netWorth = roundCents(equity + cumulativeCashFlow)`.
    - Set the tax fields to `null` and set `taxNaReason` to the tax message for now (T025 fills them in).
    - `multiple` = `netWorth(N) / deal.totalCashInvested`, or the null/reason case.

  Export `project-wealth` and `validate-wealth` from `libs/deal-analyzer/calculations/src/index.ts`. T006 and T007 must then pass.
- [X] T011 [US1] Create `libs/deal-analyzer/ui/src/lib/use-wealth-editor.ts` (`'use client'`):
  - `setWealth(patch: Partial<WealthAssumptions>)` calls `updateActiveRental({ wealth: { ...activeScenario.rental?.wealth, ...patch } })`, always writing the full object because `applyScenarioPatch` merges `rental` only one level deep.
  - `setGrowth(patch: Partial<Pick<RentalAssumptions, 'appreciationPct' | 'rentGrowthPct' | 'expenseGrowthPct'>>)` calls `updateActiveRental(patch)`.
  - `applyTypicalRates()` calls `setGrowth({ ...TYPICAL_GROWTH })`.

  It uses `useScenarios` and `useRentalEditor`.
- [X] T012 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/net-worth-chart.tsx` (`'use client'`), per contracts/wealth-ui.md § NetWorthChart, using `LineChart` from `@companion/charts`:
  - `data-testid="chart-net-worth"`, title "Net worth over time", description "Equity + cumulative cash flow".
  - Data `{ x: year, netWorth, equity, netWorthAfterTax }`.
  - Series: `netWorth` "Net worth" slot 1, `equity` "Equity" slot 3, and `netWorthAfterTax` "Net worth after tax" slot 2, included only when `taxNaReason == null`.
  - `xTickValues`: every year when N ≤ 10, otherwise every 5 years plus N.
  - Formatters: `x: n => n === 0 ? 'Purchase' : 'Yr ' + n`, `y: formatCompactCurrency`, `tooltipY: v => currency.format(v)`.
  - `tooltipExtras: i => [Property value, Loan balance, Cumulative cash flow, Cumulative tax effect (or '—')]`, formatted as currency.
- [X] T013 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/wealth-summary.tsx`, per contracts/wealth-ui.md § WealthSummary:
  - An `<h3>` "In year {N}" and 5 tiles with test ids `wealth-net-worth`, `wealth-equity`, `wealth-cum-cash-flow`, `wealth-cum-tax` ("—" when `taxNaReason`) and `wealth-multiple` (`${value.toFixed(1)}×`, or "N/A" with the reason as a small caption).
  - The root is `data-testid="wealth-summary"`, with the card classes used by `deal-metrics.tsx`. Negative values are `text-red-700`.
- [X] T014 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/wealth-table.tsx`, per contracts/wealth-ui.md § WealthTable:
  - A `<table>` inside `<div role="region" aria-label="Year-by-year projection" tabIndex={0} className="overflow-x-auto …">`, with `<caption className="sr-only">`.
  - Columns, in FR-012 order: Year, Property value, Loan balance, Equity, Initial equity, Principal paid, Market appreciation, Forced appreciation, Cash flow, Cumulative cash flow, Interest, Depreciation, Taxable income, Tax effect, Net worth, Net worth after tax.
  - Each row is `data-testid="wealth-row-{year}"`, and each cell `data-testid="{column-key}"`, using the keys `value balance equity initial-equity principal-paid market-appreciation forced-appreciation cash-flow cum-cash-flow interest depreciation taxable tax-effect net-worth net-worth-after-tax`.
  - Null values show "—", and negatives are red with a minus sign. Year 0 is labelled "Purchase".
  - Add a note under the table: "Tax effect: positive = tax saved, negative = tax owed."
- [X] T015 [US1] Create `libs/deal-analyzer/ui/src/lib/wealth-assumptions-panel.tsx` with the **horizon controls only** for now:
  - `data-testid="wealth-assumptions"`.
  - `SegmentedOptions` with `label="Projection horizon"` and options `[{ value: '5', label: '5 yrs' }, { value: '10', label: '10 yrs' }]`. Its `value` is the matching string or `null`, and it calls `onWealthChange({ horizonYears: Number(v) })`.
  - A `NumberField` "Horizon (years)" with `step={1}`, no min/max, and its error from `rental.wealth.horizonYears`.

  Props: `rental: RentalAssumptions`, `errors: FieldError[]`, `onWealthChange`, `onGrowthChange` and `onTypicalRates`. The last two are unused until US2.
- [X] T016 [US1] Complete `libs/deal-analyzer/ui/src/lib/wealth-view.tsx`, mirroring `financing-view.tsx`:
  - Use `useScenarios`, `useRentalEditor` and `useWealthEditor`.
  - Memoize on `activeScenario`: `validation`, `schedule`, `rentalErrors`, the `analysis` gate (`validateRental` passes), and `projection = validation.valid && schedule && rental && rentalErrors.length === 0 ? projectWealth(validation.scenario, schedule) : null`.
  - Sections, in this order and with these h2 texts:
    - ScenarioTabs
    - "Loan" (LoanInputForm)
    - "Real-estate costs" (CostBreakdownPanel)
    - "Rental income" (RentalInputsPanel)
    - "Projection assumptions" (WealthAssumptionsPanel, only when `rental` exists)
    - "Net worth over time": always a section. Render `<p data-testid="wealth-na">` with the first message that applies:
      - no rental: "Enter rent above to project net worth."
      - `rentalErrors.length > 0`: "Fix the highlighted rental inputs to see the projection."
      - invalid loan: "Fix the highlighted loan fields above to see the projection."
      - `projection.years === null`: `projection.naReason`

      Otherwise render WealthSummary and NetWorthChart. "Year by year" renders only when `years` is non-null.
    - "Year by year" (WealthTable)
  - Pass `errors = validateWealth(rental)` to the panel.

  Export all the new components from `libs/deal-analyzer/ui/src/index.ts`.
- [X] T017 [US1] Create `apps/amortization-calculator-e2e/src/wealth-projection.spec.ts`. Its helper `enterReference(page)` goes to `/wealth`, fills Home price 400000, Down payment 25, Annual interest rate 7, Annual property tax 4800, Annual homeowner's insurance 1800 and Monthly rent 3800, then sets Appreciation 3, Rent growth 2.5 and Expense growth 2.5 with `fillNumberField`. In US1 these fields are the growth group of the `RentalInputsPanel` shown on `/wealth`. US2 moves them into the assumptions panel under the same labels, so the helper does not change.

  Add `test.describe('Wealth Projection page (spec 008 US1)')` with tests for:
  - **Route**: title "Wealth Projection · Companion", h1, and the nav link `aria-current="page"`.
  - **Reference summary**: `wealth-net-worth` $360,051.02, `wealth-equity` $280,129.40, `wealth-cum-cash-flow` $79,921.62 and `wealth-multiple` 3.6×.
  - **Table**: `wealth-row-0` `net-worth` $100,000.00 and `wealth-row-5` `net-worth` $211,428.70.
  - **Horizon**: the "5 yrs" radio makes the summary read "In year 5", shows $211,428.70 and leaves no `wealth-row-6`.
  - **No price**: clearing Home price shows `wealth-na` with "Enter a purchase price to project equity and net worth."
  - **No rent**: a fresh session on `/wealth` shows `wealth-na` with "Enter rent above to project net worth."
  - **375 px**: `scrollWidth − clientWidth ≤ 0`, polled with `expect.poll`.

**Checkpoint**: The US1 unit tests and e2e pass. The pre-tax page is usable.

---

## Phase 4: User Story 2 — Model the growth and equity drivers (P2)

**Goal**: The page has growth inputs (the shared spec 005 fields), "Use typical rates" and forced
appreciation, with validation.

**Independent Test**: With growth at 0%, Use typical rates gives a year-10 net worth of
$360,051.02. Forced appreciation of $20,000 gives a row-0 equity of $120,000.00, and year-10 equity
rises by $26,878.33.

### Tests (write first)

- [X] T018 [P] [US2] Extend `project-wealth.spec.ts`:
  - **Forced 20000**: row 0 `equity` 120000 and `propertyValue` 420000. Year-10 `equity` is the reference value + 26878.33, and `forcedAppreciation === 20000` in every row.
  - **Market appreciation**: `marketAppreciation` in year 10 is `roundCents(propertyValue − 400000 − 20000)`.
  - **Growth at 0**: every year's `propertyValue` is 400000, and NOI is flat.
  - **Negative appreciation (−2)**: value falls, and the invariants still hold.
- [X] T019 [P] [US2] Extend `validate-wealth.spec.ts`. `forcedAppreciation: -1` gives exactly `{ field: 'rental.wealth.forcedAppreciation', message: 'Forced appreciation cannot be negative.' }`, and `projectWealth` then returns `years === null`.

### Implementation

- [X] T020 [US2] Add the growth and equity controls to `wealth-assumptions-panel.tsx`:
  - **Growth**: a group labelled "Growth" with `NumberField`s "Appreciation", "Rent growth" and "Expense growth" (`suffix="%"`, `step={0.1}`, `description="per year"`, no min/max). Their values are `rental.appreciationPct ?? 0` etc., they write through `onGrowthChange`, and their errors come from `rental.appreciationPct` / `rental.rentGrowthPct` / `rental.expenseGrowthPct` (from `validateRental`).
  - **Use typical rates**: a `Button` from `@ui-sdk/react/button` with `data-testid="wealth-typical-rates"` and the text "Use typical rates (3% / 2.5% / 2.5%)", calling `onTypicalRates`.
  - **Forced appreciation**: a `NumberField` "Forced appreciation" (`variant="currency"`, no min) with the description "Value added at purchase, e.g. after-repair value − price" and its error from `rental.wealth.forcedAppreciation`.

  `RentalInputsPanel` already renders fields with exactly these labels (`rental-inputs-panel.tsx` lines 128–130), so add an optional prop `hideGrowth?: boolean` (default `false`) to `libs/deal-analyzer/ui/src/lib/rental-inputs-panel.tsx` that skips its growth group. Pass `hideGrowth` from `wealth-view.tsx` only, so each label appears once on `/wealth`. `/deal-analyzer` is unchanged.
- [X] T021 [US2] Wire `onGrowthChange={setGrowth}`, `onTypicalRates={applyTypicalRates}` and the rental errors into the panel in `wealth-view.tsx`.
- [X] T022 [US2] Add `test.describe('Drivers (spec 008 US2)')` with tests for:
  - **Typical rates**: with growth at 0, clicking `wealth-typical-rates` gives `wealth-net-worth` $360,051.02.
  - **Forced appreciation**: 20000 gives `wealth-row-0` `equity` $120,000.00 and `forced-appreciation` $20,000.00. In `wealth-row-10`, `initial-equity` is $100,000.00, and `initial-equity + principal-paid + market-appreciation + forced-appreciation` equals `equity` (parse the currency text).
  - **Validation**: Appreciation 30 shows "must be between -10% and 25%", and the "Loan amount" field is still editable.
  - **Shared rates**: after setting rates on `/wealth`, the rental charts on `/deal-analyzer` reflect them. For example, `chart-equity` is visible with the "Appreciation" legend entry.

**Checkpoint**: US1 and US2 pass.

---

## Phase 5: User Story 3 — See the tax advantages (P3)

**Goal**: Depreciation (27.5-year straight-line on the building value), mortgage interest,
taxable income, the tax effect, its cumulative total, the after-tax line and the tax inputs.

**Independent Test**: Year 1 shows depreciation $11,636.36, interest $20,903.45, taxable
−$4,027.81 and tax effect $966.67. Year-10 net worth after tax is $358,581.92. A 0% rate gives
after-tax = net worth, and land 100 blanks only the tax figures.

### Tests (write first)

- [X] T023 [P] [US3] Extend `project-wealth.spec.ts`:
  - **Reference tax columns**: every reference row matches `interest`, `depreciation` (11636.36), `taxableIncome`, `taxEffect` and `netWorthAfterTax` (year 10: 358581.92), `depreciableBasis === 320000`, and `taxNaReason === null`.
  - **Rate 0**: `netWorthAfterTax === netWorth` every year.
  - **Rehab 10000**: basis 330000 and depreciation 12000.
  - **Horizon 30**: year-28 depreciation is 5818.28, years 29–30 are 0, and Σ depreciation is exactly 320000.
  - **Extra payments**: a recurring $500 extra payment gives lower `interest` and `loanBalance` than without it, while `cashFlow` is equal.
  - **Invalid tax inputs**: land 100 or rate 61 makes every tax field and `netWorthAfterTax` null, sets `taxNaReason === 'Fix the tax assumptions to see after-tax figures.'`, and leaves the pre-tax fields deep-equal to the valid run.
  - **Invariant**: Σ depreciation ≤ basis over the generated scenarios from T006.
- [X] T024 [P] [US3] Extend `validate-wealth.spec.ts`:
  - `landValuePct` 100 and −1 give "Land value must be at least 0% and less than 100%."
  - `marginalTaxRatePct` 61 and −1 give "Tax rate must be between 0% and 60%."
  - Malformed `wealth: { landValuePct: '20' }` (cast) gives one error and does not throw.

### Implementation

- [X] T025 [US3] Fill in the tax part of `projectWealth` in `project-wealth.ts`, per research R5–R7:
  - `basis = roundCents(price × (1 − land / 100) + rehabBudget)`.
  - `annual = roundCents(basis / DEPRECIATION_YEARS)`.
  - Each year's depreciation is `min(annual, basis − Σ prior)`, rounded, with 0 for year 0.
  - `interest(y) = roundCents(Σ schedule.periods.slice((y−1)·12, y·12).interestPortion)`, which is 0 past payoff or the term.
  - `taxableIncome = roundCents(noi − interest − depreciation)`.
  - `taxEffect = roundCents(−taxableIncome × rate / 100)`.
  - Accumulate `cumulativeTaxEffect`, and set `netWorthAfterTax = roundCents(netWorth + cumulativeTaxEffect)`. Year 0 has all of these at 0.
  - If `validateWealth` reports a land or rate error, set the tax fields to null and set `taxNaReason`. Set `depreciableBasis` when valid.

  T023 and T024 must then pass.
- [X] T026 [US3] Add the tax controls to `wealth-assumptions-panel.tsx`: a group labelled "Tax" with `NumberField`s "Land value share" (`suffix="%"`, `step={1}`, description "Land doesn't depreciate") and "Marginal tax rate" (`suffix="%"`, `step={1}`). There is no min/max, and their errors come from `rental.wealth.landValuePct` / `marginalTaxRatePct`. They write through `onWealthChange`, and their displayed values are `resolveWealthAssumptions(rental)`.
- [X] T027 [US3] Confirm that `NetWorthChart`, `WealthSummary` and `WealthTable` now render the tax fields. They already handle null, so there is no code change unless it is missing. Add the line "Depreciation: 27.5-year straight-line on the building value. Simplified model; not tax advice." under the table in `wealth-table.tsx`. Also render `<p data-testid="wealth-extra-note">Cash flow excludes extra principal payments; they show up as faster principal paydown in equity.</p>` when `scenario.extraPayments.length > 0`. Pass `hasExtraPayments` from `wealth-view.tsx`.
- [X] T028 [US3] Add `test.describe('Tax (spec 008 US3)')` to `wealth-projection.spec.ts`, with tests for:
  - **Year 1 row**: `wealth-row-1` has `depreciation` $11,636.36, `interest` $20,903.45, `taxable` −$4,027.81 and `tax-effect` $966.67, and `wealth-row-10` has `net-worth-after-tax` $358,581.92.
  - **Rate 0**: "Marginal tax rate" 0 makes `wealth-row-10` `net-worth-after-tax` equal $360,051.02.
  - **Land 100**: shows the inline error, `wealth-cum-tax` "—" and `wealth-net-worth` still $360,051.02, and the chart legend has no "Net worth after tax".
  - **Horizon 30**: `wealth-row-28` `depreciation` is $5,818.28, and `wealth-row-29` is $0.00.
  - **Persistence**: reload restores the horizon, forced appreciation, land and rate.
  - **Extra payments**: after adding a recurring extra payment, `wealth-extra-note` is visible. It is absent without extra payments. If `/wealth` has no extra-payment inputs, seed one through `sessionStorage`, the same way as the old-session test.
  - **Old session**: deleting `rental.wealth` from `sessionStorage['amortization:scenarios']` and reloading gives the defaults, with no inline errors.

**Checkpoint**: All three stories pass.

---

## Phase 6: Polish & Cross-Cutting

- [X] T029 Add a SC-003 test to `apps/amortization-calculator-e2e/src/performance.spec.ts`: on `/wealth` with the reference scenario, change "Rent growth" and expect `wealth-net-worth` to update within 1000 ms (the same pattern as the existing Cash-on-Cash test).
- [X] T030 [P] Docs:
  - Add the `/wealth` row (`WealthView`, `Wealth Projection · Companion`, "Wealth Projection") to `specs/003-feature-pages-navigation/contracts/routes-and-navigation.md`.
  - Append the new public API to `libs/deal-analyzer/calculations/README.md` (`projectWealth`, `resolveWealthAssumptions`, `validateWealth`, `DEFAULT_WEALTH`, `TYPICAL_GROWTH`, `DEPRECIATION_YEARS`, `WealthYear`, `WealthProjection`).
  - Append the new components to `libs/deal-analyzer/ui/README.md` (`WealthView`, `WealthAssumptionsPanel`, `WealthSummary`, `NetWorthChart`, `WealthTable`, `useWealthEditor`).
- [X] T031 Full gate:
  - `npx nx run-many -t lint test typecheck -p shared-calculations shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`
  - `npx nx build amortization-calculator`
  - `npx nx run amortization-calculator:start --port=3200` in the background
  - `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`

  Everything must pass, except the known intermittent WebKit `deal-analyzer.spec.ts` FR-016 test. If it fails, rerun once and record it.
- [X] T032 Run every quickstart.md scenario (§2–§6) once against :3200, then append a "Verified on {date}" block to `specs/008-wealth-projection/quickstart.md` with the results, including the keyboard pass:
  - Tab reaches the horizon presets, every assumption field, Use typical rates, the chart and the table region.
  - Arrow keys move within the presets.

---

## Dependencies & Execution Order

```text
Setup (T001) ─► Foundational (T002–T005) ─► US1 (T006–T017, MVP) ─► US2 (T018–T022) ─► US3 (T023–T028) ─► Polish (T029–T032)
```

- **Foundational**: T003 depends on T002, and T005 depends on T004.
- **US1**: it needs the foundation. The tests (T006, T007) come before T008–T010. The UI tasks
  (T012–T015) need T008, and T016 needs T011–T015.
- **US2** builds on the US1 panel and view. **US3** builds on `projectWealth` from US1 and the panel.
  The stories share `project-wealth.ts` and `wealth-assumptions-panel.tsx`, so they run in sequence.

## Parallel Opportunities

- **Foundational**: T002 ∥ T004.
- **US1**: T006 ∥ T007, then T012 ∥ T013 ∥ T014 (separate component files) once T008 lands.
- **US2**: T018 ∥ T019. **US3**: T023 ∥ T024. **Polish**: T030 alongside T029.

### Parallel example: US1 UI

```text
Task: "T012 NetWorthChart in libs/deal-analyzer/ui/src/lib/net-worth-chart.tsx"
Task: "T013 WealthSummary in libs/deal-analyzer/ui/src/lib/wealth-summary.tsx"
Task: "T014 WealthTable in libs/deal-analyzer/ui/src/lib/wealth-table.tsx"
```

## Implementation Strategy

- **MVP**: Phases 1–3. `/wealth` then shows the pre-tax net-worth projection, using growth rates
  entered on the Deal Analyzer. Validate it with quickstart §2–§3.
- **Then**: US2 (drivers on the page), US3 (tax), and Polish (full gate on :3200, quickstart
  verification, docs).

## Baseline notes

- 2026-11-17: the baseline (`lint test typecheck` for all 6 projects) passed before any change.
- The branch `008-wealth-projection` was renamed to `main` outside this session. Both pointed at `55803ec`, so nothing was lost, and the work stayed uncommitted on `main`.
- The pre-existing intermittent WebKit `deal-analyzer.spec.ts` FR-016 test failed more often with the fourth nav link (more cancelled RSC prefetches). It was fixed during T031 by ignoring only those aborts (see quickstart "Verified").
