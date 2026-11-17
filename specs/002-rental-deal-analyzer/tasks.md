---
description: 'Task list for the Rental Property Deal Analyzer'
---

# Tasks: Rental Property Deal Analyzer

**Input**: Design documents from `/specs/002-rental-deal-analyzer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included, because they are mandatory here. Constitution Principle I requires cent-level unit tests for every calculation change, and SC-001 and SC-005 require reference-vector and regression coverage. Calculation tests use Vitest in `libs/amortization-calculations`. User flows are tested with Playwright in `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts`. The UI components have no unit-test suite yet, so they are covered by e2e.

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1–US4)
- Run every Nx task through `npx nx …`. The workspace uses npm.

## Path Conventions

- Calculation lib: `libs/amortization-calculations/src/lib/`, public API in `libs/amortization-calculations/src/index.ts`
- UI lib: `libs/amortization-ui/src/lib/`, public API in `libs/amortization-ui/src/index.ts`
- App: `apps/amortization-calculator/src/app/`
- E2E: `apps/amortization-calculator-e2e/src/`. Reuse `fillNumberField` from `helpers.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm a green baseline before changing anything. No new Nx projects or dependencies are needed (plan: Structure Decision).

- [X] T001 Run `npx nx run-many -t lint test` and `npx nx e2e amortization-calculator-e2e` from the repo root and confirm all existing 001 checks pass. Record any pre-existing failures in this file's Notes before continuing, because SC-005 needs a clean regression baseline.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, the schedule's PMI exposure, persistence compatibility, and rental patching. Every story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add the new types to `libs/amortization-calculations/src/lib/types.ts` exactly as specified in data-model.md:
  - `RentalAssumptions` with the fields `grossMonthlyRent`, `otherMonthlyIncome`, `vacancyPct`, `managementPct`, `maintenanceReservePct`, `capexReservePct`, `closingCosts`, and `rehabBudget` (all `number`). Add a doc comment with the constraints: dollar fields "≥ 0"; percentage fields "0 ≤ x ≤ 100".
  - `rental?: RentalAssumptions | null` on `LoanScenario` ("null/absent = not analyzing as a rental").
  - `monthlyPmiAmount: number` on `AmortizationSchedule['summary']`.
  - `MonthlyAnnual`, `OperatingExpenseCategory` (`'propertyTax' | 'insurance' | 'hoa' | 'vacancy' | 'management' | 'maintenance' | 'capex'`), `OperatingExpenseLine`, `RatioResult` (`{ value: number | null; naReason: string | null }`), `OnePercentRuleResult`, `FiftyPercentRuleResult`, and `DealAnalysis`, with all fields listed in data-model.md.
  - Extend the `FieldError['field']` union with `` `rental.${keyof RentalAssumptions}` ``.
  - Add `monthlyCashFlow`, `annualNoi`, `capRate`, and `cashOnCashReturn` (each `number | null`) to `ScenarioComparison['rows'][number]`.
- [X] T003 In `libs/amortization-calculations/src/lib/compute-schedule.ts`, expose the existing internal `monthlyPmiAmount` as `summary.monthlyPmiAmount`, rounded with `roundCents`, and `0` when there is no PMI (research R2). This is an additive change; every other output must stay the same.
- [X] T004 [P] In `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`, add assertions that `summary.monthlyPmiAmount` equals `roundCents(pmiAnnualRatePct / 100 × principal / 12)` for a PMI scenario and `0` without PMI. All existing assertions must still pass. (Depends on T003.)
- [X] T005 [P] In `libs/amortization-calculations/src/lib/persistence.ts`, make `deserializeScenarios` normalize every scenario so that a missing or `undefined` `rental` becomes `null` (FR-016, research R7). It must still never throw, and it keeps the same storage shape and key.
- [X] T006 [P] Create `libs/amortization-calculations/src/lib/persistence.spec.ts`:
  - A 001-era payload without `rental` deserializes with `rental === null`.
  - A payload with `rental` round-trips through `serializeScenarios` and `deserializeScenarios` and comes back deep-equal.
  - Corrupt JSON returns `null`.
- [X] T007 In `libs/amortization-calculations/src/lib/apply-scenario-patch.ts`, merge a `patch.rental` object shallowly into the existing `scenario.rental` instead of replacing it. If `scenario.rental` is null and the patch sets rental fields, start from the patch as-is; seeding defaults is the caller's job (T016). `patch.rental === null` clears it. The existing FR-014 principal override rules must stay unchanged.
- [X] T008 [P] In `libs/amortization-calculations/src/lib/apply-scenario-patch.spec.ts`, add cases:
  - A rental patch merges without dropping other rental fields.
  - `rental: null` clears rental.
  - A rental patch does not touch `principal` or `principalIsOverridden`.

  (Depends on T007.)
- [X] T009 [P] Create `libs/amortization-calculations/src/lib/validate-rental.ts` exporting `validateRental(rental: RentalAssumptions): FieldError[]`, per contracts/deal-analysis-engine.md:
  - Return one `FieldError` per offending field, keyed `rental.<field>`.
  - Reject negative `grossMonthlyRent`, `otherMonthlyIncome`, `closingCosts`, and `rehabBudget`.
  - Reject `vacancyPct`, `managementPct`, `maintenanceReservePct`, and `capexReservePct` outside "0 ≤ x ≤ 100" (inclusive, so 100% vacancy is valid).
  - Use user-friendly messages, for example "Vacancy rate must be between 0% and 100%."
- [X] T010 [P] Create `libs/amortization-calculations/src/lib/validate-rental.spec.ts`:
  - Valid defaults return `[]`.
  - Each negative dollar field and each percentage of -1 or 101 returns exactly one error with the right `rental.*` key.
  - Several bad fields return several errors.
  - `vacancyPct: 100` is valid (spec Edge Case).
- [X] T011 Export `validate-rental` from `libs/amortization-calculations/src/index.ts`. Then run `npx nx test amortization-calculations` and `npx nx lint amortization-calculations`; both must pass.

**Checkpoint**: The foundation is ready. Types compile, persistence accepts old and new payloads, and rental validation is tested.

---

## Phase 3: User Story 1 - See monthly cash flow and NOI for a rental (Priority: P1) 🎯 MVP

**Goal**: An investor enters rent and operating assumptions and sees GSI, itemized operating expenses, NOI, debt service, and cash flow (monthly and annual) in a "Rental Income vs. Operating Expenses" card.

**Independent Test**: Quickstart Scenario 1 (card figures only): NOI $1,498.00/mo ($17,976.00/yr), debt service $1,247.44/mo, cash flow $250.56/mo ($3,006.72/yr).

### Tests for User Story 1 ⚠️ (write first, and make sure they fail)

- [X] T012 [P] [US1] Create `libs/amortization-calculations/src/lib/analyze-deal.spec.ts` with **vector A** from contracts/deal-analysis-engine.md, plus vectors **C**, **E**, **F**, and **G**:
  - **A**: Price 250,000; down `{ percent: 25 }`; 7% over 360 months; rent 2,400; tax 3,000/yr; insurance 1,200/yr; 5/8/5/5%; closing 7,500; rehab 10,000. Expect opex 902.00/mo, NOI 1,498.00/mo and 17,976.00/yr, debt service 1,247.44/mo, cash flow 250.56/mo and 3,006.72/yr.
  - **C**: A with 10% down and a PMI rate of 0.5%. Debt service includes 12 × `monthlyPmiAmount`.
  - **E**: A with vacancy 100. Valid input, negative cash flow, no throw.
  - **F**: A with rent 0. `fiftyPercentRule === null`, negative NOI.
  - **G**: A with `termMonths: 6`. `debtService.annual === roundCents(monthlyPrincipalAndInterest × 6)`, so a loan shorter than 12 months is not overstated.

  Also assert these invariants:
  - `operatingExpenses` has all 7 categories in the fixed order propertyTax, insurance, hoa, vacancy, management, maintenance, capex.
  - `netOperatingIncome.annual === roundCents(GSI.annual − totalOpex.annual)` and `cashFlow.annual === roundCents(NOI.annual − debtService.annual)`.
  - No field is `NaN` or `Infinity`.
  - A recurring extra payment does not change `debtService` (research R2).
- [X] T013 [P] [US1] Create `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts` with a "US1: income vs. expenses card" test:
  - Fill the quickstart Scenario 1 inputs with `fillNumberField`.
  - Assert the card titled "Rental Income vs. Operating Expenses" shows NOI `$1,498.00`, debt service `$1,247.44`, and cash flow `$250.56`.
  - Switch to the annual tab and assert `$17,976.00` and `$3,006.72`.
  - Set rent to 1,000 and assert the cash-flow row shows a "Negative" text label, not just a color.

  The test fails until T014–T021 are done.

### Implementation for User Story 1

- [X] T014 [US1] Create `libs/amortization-calculations/src/lib/analyze-deal.ts` with the following, using `roundCents` for dollar figures. Reuse it by moving it from `compute-schedule.ts` into a shared internal `round.ts` that both files import, without changing its behavior.
  - `DEFAULT_RENTAL_ASSUMPTIONS = { otherMonthlyIncome: 0, vacancyPct: 5, managementPct: 8, maintenanceReservePct: 5, capexReservePct: 5, closingCosts: 0, rehabBudget: 0 }`.
  - `analyzeDeal(scenario, schedule): DealAnalysis`, with these parts for US1:
    - GSI is rent + other income.
    - The 7 operating-expense lines: tax, insurance, and HOA come from the scenario (null counts as 0); vacancy, management, maintenance, and CapEx are each a % of GSI.
    - Total opex and NOI.
    - `debtService.annual = roundCents(summary.monthlyPrincipalAndInterest × min(12, periods.length) + summary.monthlyPmiAmount × count(periods[0..11].pmiApplies))`, and `monthly = roundCents(annual / 12)`.
    - Cash flow is NOI − debt service.
    - `pmiDropPeriod` passes through from `schedule.summary.pmiDropPeriod`. `pmiEndsInYearOne` does **not** exist on the schedule — compute it as `periods.slice(0, 12).some(p => p.pmiApplies) && !periods.slice(0, 12).every(p => p.pmiApplies)` (PMI applies in some but not all of the first 12 periods).
  - For now, return placeholder `{ value: null, naReason: null }` or `null` for the CoC, cap-rate, and rule fields; US2 and US3 fill them in. Extra payments must never affect debt service.
  - Follow the rounding rule in data-model.md: compute every line unrounded, round only at output (`monthly = roundCents(raw)`, `annual = roundCents(raw × 12)`), and never sum rounded lines.
  - Get T012's US1 assertions passing.
- [X] T015 [US1] Export `analyze-deal` from `libs/amortization-calculations/src/index.ts`. Run `npx nx test amortization-calculations`; the vector A, C, E, F, and invariant tests from T012 must pass.
- [X] T016 [US1] In `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts`, add `updateActiveRental(patch: Partial<RentalAssumptions> | null)`. When the active scenario's `rental` is null and the patch sets `grossMonthlyRent`, seed it with `{ ...DEFAULT_RENTAL_ASSUMPTIONS, ...patch }`. Always route the change through `applyScenarioPatch(s, { rental })` (data-model state transitions). Add `rental: null` to `createDefaultScenario`.
- [X] T017 [P] [US1] Create `apps/amortization-calculator/src/app/_components/rental-inputs-panel.tsx` (`RentalInputsPanel`, props per contracts/ui-components.md, where `onChange` accepts `Partial<RentalAssumptions> | null`).
  - Use `NumberField` from `amortization-ui` for gross monthly rent and other monthly income (`variant="currency"`, `min={0}`), and for vacancy, management, maintenance reserve, and CapEx reserve (`suffix="%"`, `min={0}`, `max={100}`).
  - When `rental == null`, show only the rent field with the hint "Enter rent to analyze this as a rental."
  - Show `rental.*` `FieldError`s beside their fields.
  - Add a "Remove rental analysis" button that calls `onChange(null)`.
  - Closing costs and rehab fields are added in T026.
- [X] T018 [P] [US1] Create `libs/amortization-ui/src/lib/income-expense-card.tsx` (`IncomeExpenseCard`, props per contracts/ui-components.md):
  - Title "Rental Income vs. Operating Expenses".
  - Rows: GSI, each `operatingExpenses` line by its `label`, Total operating expenses, **NOI**, Debt service, **Cash flow**.
  - A monthly/annual toggle built on `@ui-sdk/react/tabs`, following the `TabsList`/`TabsTab` pattern in `cost-breakdown-panel.tsx`.
  - Format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
  - Negative cash flow uses red text, a minus sign, and the visible text "▼ Negative", so it never relies on color alone (FR-012).
  - When `pmiDropPeriod != null`, show "Cash flow improves after PMI drops off at payment #N."
  - Keep it purely presentational, with no math beyond picking the monthly or annual value.
- [X] T019 [US1] Export `IncomeExpenseCard` from `libs/amortization-ui/src/index.ts`, then run `npx nx lint amortization-ui`.
- [X] T020 [US1] Wire a new "Deal analyzer" `<section>` into `apps/amortization-calculator/src/app/page.tsx`, directly after "Real-estate costs":
  - Render `RentalInputsPanel` bound to `activeScenario.rental` and `updateActiveRental`.
  - Compute `rentalErrors = activeScenario.rental ? validateRental(activeScenario.rental) : []`.
  - When `schedule` exists, `rental != null`, and `rentalErrors.length === 0`, compute `analysis = analyzeDeal(validation.scenario, schedule)` and render `<IncomeExpenseCard analysis={analysis} />`.
  - Invalid rental inputs must not hide the amortization schedule (FR-015).
  - Keep the derivation in the render path; no effects (SC-003).
- [X] T021 [US1] Run `npx nx e2e amortization-calculator-e2e` and confirm T013's US1 test and all existing 001 specs pass (SC-005).

**Checkpoint**: The MVP is done. The investor can see NOI and cash flow for a deal.

---

## Phase 4: User Story 2 - Judge return on cash invested with a live CoC badge (Priority: P1)

**Goal**: The investor enters closing costs and rehab, and an LTV badge with a real-time Cash-on-Cash Return badge beside it updates on every input change.

**Independent Test**: Quickstart Scenarios 1 (badges), 2, and 3. LTV 75.0%, CoC 3.8%, cash invested $80,000. A rent change turns CoC negative within 1 s. With 0 down, 0 closing, and 0 rehab, CoC shows N/A.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Extend `libs/amortization-calculations/src/lib/analyze-deal.spec.ts`:
  - Vector **A**: `totalCashInvested === 80000`, and `cashOnCashReturn.value` is within 0.0001 of `3006.72 / 80000`.
  - Vector **B** (A with 0% down, closing 0, rehab 0): `cashOnCashReturn.value === null` and `naReason === "No cash invested — Cash-on-Cash Return is undefined."`
  - Dollar and percent down payments give the same `totalCashInvested`.
  - `computeLtv`: vector A returns 0.75; with no `homePrice`, `{ value: null, naReason: "Enter a purchase price to see LTV." }`.
- [X] T023 [P] [US2] Add a "US2: LTV and CoC badges" test to `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts`:
  - With the quickstart Scenario 1 inputs, `getByTestId('badge-ltv')` contains `75.0%` and `getByTestId('badge-cash-on-cash')` contains `3.8%`, and the two sit in the same `role="group"` named "Key deal metrics".
  - After changing rent to 1,500, the CoC badge shows a negative value with "Negative" text, with no click.
  - With down payment 0, closing 0, and rehab 0, the CoC badge shows `N/A`.
  - After clearing the home price, the LTV badge shows `N/A`.

### Implementation for User Story 2

- [X] T024 [US2] In `libs/amortization-calculations/src/lib/analyze-deal.ts`:
  - Compute `totalCashInvested = downPaymentDollars + closingCosts + rehabBudget`. Resolve a `{ percent }` down payment against `homePrice`; with no down payment it is 0.
  - Compute `cashOnCashReturn` as a `RatioResult` equal to `cashFlow.annual / totalCashInvested`, unrounded. When `totalCashInvested === 0`, return `{ value: null, naReason: "No cash invested — Cash-on-Cash Return is undefined." }`.
  - Add the exported `computeLtv(scenario): RatioResult` (`principal / homePrice`), which returns `{ value: null, naReason: "Enter a purchase price to see LTV." }` when `homePrice == null`.
  - Get T022 passing with `npx nx test amortization-calculations`.
- [X] T025 [P] [US2] Create `libs/amortization-ui/src/lib/metric-badge.tsx` with `MetricBadge` and `MetricBadgeGroup` (props per contracts/ui-components.md).
  - The group renders `role="group"`, `aria-label="Key deal metrics"`, and `aria-live="polite"`.
  - The badge formats `value` with `Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: fractionDigits ?? 1, maximumFractionDigits: fractionDigits ?? 1 })`.
  - A `null` value renders "N/A", with `naReason` as both a `title` and visually hidden text.
  - `tone="negative"` adds a visible "Negative" label or sign along with the color.
  - Add `data-testid={"badge-" + kebab(label)}`, which produces `badge-ltv` and `badge-cash-on-cash`.
  - Export both from `libs/amortization-ui/src/index.ts`.
- [X] T026 [US2] Add closing-costs and rehab-budget `NumberField`s (`variant="currency"`, `min={0}`) to `apps/amortization-calculator/src/app/_components/rental-inputs-panel.tsx`, under a "Cash invested" subheading that shows `totalCashInvested` when an analysis is available. Pass it in as an optional prop.
- [X] T027 [US2] In `apps/amortization-calculator/src/app/page.tsx`, add a `MetricBadgeGroup` next to the `ScenarioTabs` header area.
  - LTV badge (`label="LTV"`): bound to `computeLtv(activeScenario)`. Render it whenever `homePrice` is set, even without rent; when there is no home price it shows N/A.
  - CoC badge (`label="Cash-on-Cash"`): bound to `analysis.cashOnCashReturn`, with `tone` set from the sign of the value, and rendered only when `analysis` exists.
  - Both are derived in the render path, so they update with no submit action (FR-013, SC-003).
- [X] T028 [US2] Run `npx nx e2e amortization-calculator-e2e` and confirm the T023 tests and all earlier specs pass.

**Checkpoint**: US1 and US2 both work. Cash flow, CoC, and LTV are visible and live.

---

## Phase 5: User Story 3 - Compare against market yield and rules of thumb (Priority: P2)

**Goal**: Show the cap rate, plus 1% Rule and 50% Rule indicators with accessible popover explanations.

**Independent Test**: Quickstart Scenarios 1 (rules), 3 (no price), and 5:
- Cap rate 7.19%.
- 1% Rule Fail, showing rent $2,400 vs. target $2,500.
- 50% Rule within, at 37.6%, with an estimated cash flow of −$47.44/mo.
- The info popover opens with Enter and closes with Esc.

### Tests for User Story 3 ⚠️

- [X] T029 [P] [US3] Extend `libs/amortization-calculations/src/lib/analyze-deal.spec.ts`:
  - Vector **A**:
    - `capRate.value` is within 0.0001 of `17976 / 250000`.
    - `onePercentRule` is `{ pass: false, targetRent: 2500, actualRent: 2400 }`.
    - `fiftyPercentRule.opexRatio` is within 0.0001 of `902 / 2400`.
    - `withinRule === true` and `estimatedMonthlyCashFlow === -47.44`.
  - The 1% Rule uses rent only: adding `otherMonthlyIncome: 200` to A does not change `actualRent`.
  - Vector **D** (A with `homePrice = null`, principal 187,500): `capRate.value === null` with an `naReason`, and `onePercentRule === null`. NOI and cash flow are still computed.
  - Vector **F**: `fiftyPercentRule === null`, and cap rate is negative.
- [X] T030 [P] [US3] Add a "US3: cap rate and rules of thumb" test to `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts`:
  - With the quickstart Scenario 1 inputs, assert cap rate `7.19%`, 1% Rule `Fail` with `$2,500`, 50% Rule within at `37.6%`, and `-$47.44`.
  - Focus the 1% Rule info button, press Enter, assert the popover explanation is visible, press Escape, and assert it is hidden.
  - Hover the 50% Rule info button and assert its explanation becomes visible (`openOnHover`).
  - After clearing the home price, the cap rate and 1% Rule show `N/A`.

### Implementation for User Story 3

- [X] T031 [US3] In `libs/amortization-calculations/src/lib/analyze-deal.ts` (research R4, R5):
  - `capRate`: `netOperatingIncome.annual / homePrice`, unrounded; `null` with the naReason "Enter a purchase price to see the cap rate." when there is no `homePrice`.
  - `onePercentRule`: `{ pass: grossMonthlyRent >= 0.01 × homePrice, targetRent: roundCents(0.01 × homePrice), actualRent: grossMonthlyRent }`, or `null` without `homePrice`.
  - `fiftyPercentRule`: `{ opexRatio: totalOpex.monthly / GSI.monthly, withinRule: opexRatio <= 0.5, estimatedMonthlyCashFlow: roundCents(0.5 × GSI.monthly − debtService.monthly) }`, or `null` when GSI is 0.
  - Get T029 passing.
- [X] T032 [P] [US3] Create `libs/amortization-ui/src/lib/rule-indicator.tsx` (`RuleIndicator`, props per contracts/ui-components.md).
  - Show the status as visible text ("Pass", "Fail", or "N/A") plus an icon and color.
  - Show the `detail` text.
  - Add an info button that opens a `@ui-sdk/react/popover` (not a tooltip, per research R8, so it works on tap) containing the one-sentence `explanation`. Pass `openOnHover` so it also opens on hover; pressing (tap, click, or Enter) still opens it. It must be reachable by keyboard and screen reader (Constitution IV).
  - Check the Popover part names in `node_modules/@ui-sdk/react/dist/popover.d.ts` before using them.
  - Export it from `libs/amortization-ui/src/index.ts`.
- [X] T033 [US3] In `apps/amortization-calculator/src/app/page.tsx`, inside the Deal analyzer section, render a metrics row after `IncomeExpenseCard`:
  - Cap rate: two decimals, labeled "Cap rate (independent of financing)", or N/A with its reason.
  - A `RuleIndicator` for the 1% Rule. Detail: "Rent $X vs. target $Y". Explanation: "Monthly rent should be at least 1% of the purchase price."
  - A `RuleIndicator` for the 50% Rule. Detail: "Expenses X% of income · Rule estimate $Z/mo". Explanation: "Operating expenses (excluding the mortgage) typically run about 50% of gross rent."
  - Map `null` results to `status="na"`.
- [X] T034 [US3] Run `npx nx e2e amortization-calculator-e2e` and confirm the T030 tests and all earlier specs pass.

**Checkpoint**: Screening metrics are complete.

---

## Phase 6: User Story 4 - Compare deal metrics across scenarios (Priority: P3)

**Goal**: The comparison grid shows monthly cash flow, annual NOI, cap rate, and CoC for each scenario.

**Independent Test**: Quickstart Scenario 6. Two scenarios with rent 2,400 and 2,800 both show deal columns, a scenario without rent shows "—", and everything persists across a reload.

### Tests for User Story 4 ⚠️

- [X] T035 [P] [US4] In `libs/amortization-calculations/src/lib/compare-scenarios.spec.ts`, add cases:
  - With an `analyses` map, rows carry `monthlyCashFlow`, `annualNoi`, `capRate`, and `cashOnCashReturn` from each `DealAnalysis`.
  - A scenario mapped to `null`, or missing from the map, gets `null` in all four.
  - Calling with no second argument keeps every existing assertion passing and yields `null` deal fields.
- [X] T036 [P] [US4] Add a "US4: comparison and persistence" test to `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts`:
  - Set up the Scenario 1 inputs, add a second scenario with rent 2,800, and assert the comparison grid has "Cash Flow /mo", "NOI /yr", "Cap Rate", and "CoC" columns with values for both rows.
  - Reload the page and assert the rental inputs persisted.
  - Add a third scenario without rent and assert its deal cells show "—".
  - Seed `sessionStorage` with a 001-era payload (no `rental` field), reload, and assert no error and no deal badges (FR-016).

### Implementation for User Story 4

- [X] T037 [US4] In `libs/amortization-calculations/src/lib/compare-scenarios.ts`, add an optional second parameter `analyses?: Record<string, DealAnalysis | null>`. For each row, set `monthlyCashFlow = a?.cashFlow.monthly ?? null`, `annualNoi = a?.netOperatingIncome.annual ?? null`, `capRate = a?.capRate.value ?? null`, and `cashOnCashReturn = a?.cashOnCashReturn.value ?? null`. Get T035 passing.
- [X] T038 [P] [US4] In `libs/amortization-ui/src/lib/comparison-grid.tsx`, add the columns "Cash Flow /mo" (currency), "NOI /yr" (currency), "Cap Rate" (percent, two decimals), and "CoC" (percent, one decimal). Render them only when at least one row has a non-null deal value. A `null` cell renders "—".
- [X] T039 [US4] In the `comparison` `useMemo` in `apps/amortization-calculator/src/app/page.tsx`:
  - For each scenario with a valid schedule, `rental != null`, and `validateRental(rental).length === 0`, build `analyses[scenario.id] = analyzeDeal(scenario, schedule)`; otherwise map it to `null`.
  - Pass `analyses` to `compareScenarios(schedules, analyses)`.
- [X] T040 [US4] Run `npx nx e2e amortization-calculator-e2e` and confirm the T036 tests and all earlier specs pass.

**Checkpoint**: All four user stories work on their own.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T041 [P] Add the cell-level checks from FR-017 to `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts`: dollar values use the `$` and thousands-separator format; badges use one decimal place; cap rate uses two.
- [X] T042 [P] Update the page subtitle in `apps/amortization-calculator/src/app/page.tsx` to mention rental cash-flow analysis. Keep the existing `h1` text unchanged so the 001 e2e selectors still match.
- [X] T043 [P] Extend `apps/amortization-calculator-e2e/src/performance.spec.ts`. With the quickstart Scenario 1 inputs, change rent from 2,400 to 2,000, then assert `getByTestId('badge-cash-on-cash')` shows a negative value within 1000 ms (`expect(...).toContainText(..., { timeout: 1000 })`) (SC-003).
- [X] T044 Run `npx nx run-many -t lint test` and `npx nx e2e amortization-calculator-e2e`. Everything must pass (constitution: Development Workflow & Quality Gates).
- [X] T045 Run every manual scenario (1–6) in [quickstart.md](./quickstart.md) against `npx nx dev amortization-calculator` and record pass or fail in this file's Notes. The constitution requires this before the feature is reported done.
- [ ] T046 Conduct a lightweight usability check (e.g., 5-person review): show each reviewer the Deal Analyzer section for reference vector A (quickstart Scenario 1) and ask them to state the property's monthly cash flow and whether it passes the 1% Rule after a single look. Record the pass rate against SC-004's 90% bar in this file's Notes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on T001 and blocks all stories. Within the phase, T002 comes first. Then T003, T005, T007, and T009 can run in parallel (different files), each followed by its own test task (T004, T006, T008, T010). T011 comes last.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on US1's `analyze-deal.ts`, `RentalInputsPanel`, and the page section (T014, T017, T020), because the CoC needs cash flow.
- **US3 (Phase 5)**: Depends on US1 (T014, T020). It is independent of US2 and can run in parallel with it, but both edit `analyze-deal.ts`, `analyze-deal.spec.ts`, `page.tsx`, and `deal-analyzer.spec.ts`, so coordinate or run them in sequence.
- **US4 (Phase 6)**: Depends on US1. The CoC and cap-rate columns show `null` until US2 and US3 are done, so run it after them for meaningful values.
- **Polish (Phase 7)**: After all the stories you plan to ship.

### Within Each User Story

Write the tests first and make sure they fail, but check them off only together with their paired implementation task (see the test-first completion rule in Notes). Then build in this order: lib math, lib export, UI component, app wiring, and finally the e2e run.

### Parallel Opportunities

- Phase 2: T003, T005, T007, and T009 after T002; then T004, T006, T008, and T010.
- US1: T012 and T013 (tests); T017 and T018 (panel and card, different projects) once T014 and T016 are done.
- US2: T022 and T023; T025 in parallel with T024.
- US3: T029 and T030; T032 in parallel with T031.
- US4: T035 and T036; T038 in parallel with T037.

---

## Parallel Example: User Story 1

```bash
# Tests first:
Task: "T012 analyze-deal.spec.ts vectors A, C, E, F + invariants"
Task: "T013 deal-analyzer.spec.ts US1 income vs. expenses card"

# After T014/T016, presentation in parallel:
Task: "T017 RentalInputsPanel in apps/amortization-calculator/src/app/_components/rental-inputs-panel.tsx"
Task: "T018 IncomeExpenseCard in libs/amortization-ui/src/lib/income-expense-card.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (baseline) and Phase 2 (foundation).
2. Phase 3 (US1). Stop and validate with quickstart Scenario 1's card figures.
3. Demo: the investor can see whether a property cash-flows positive.

### Incremental Delivery

1. US1: cash flow and NOI card (MVP).
2. US2: LTV and CoC badges. This completes both P1 stories, which is the requested headline UI.
3. US3: cap rate and the 1% and 50% rules.
4. US4: comparison columns.
5. Polish and the quickstart sign-off.

---

## Notes

- `[P]` means a different file with no dependency on incomplete tasks. `[USn]` maps the task to its spec user story.
- Calculation changes without matching tests must be rejected (Constitution I).
- The app may import only from the `amortization-calculations` and `amortization-ui` public `index.ts` files (Constitution II).
- **Test-first completion rule (constitution gate)**: A test task written ahead of its implementation stays unchecked until the implementation that makes it pass is done. Then both are checked together: T012↔T015, T013↔T021, T022↔T024, T023↔T028, T029↔T031, T030↔T034, T035↔T037, T036↔T040. That way, lint, test, and e2e are green whenever any task is marked complete.
- Baseline (T001) results (2026-11-16): `npx nx run-many -t lint test`: 7/7 tasks passed. `npx nx e2e amortization-calculator-e2e`: all 9 tests passed in Chromium, Firefox, and WebKit. **Pre-existing issue, out of scope:** `nx typecheck amortization-calculations` was already failing in 001 code (TS2835 relative imports need `.js` extensions under node16 resolution, plus TS7006 errors). Type safety for this feature is verified with `npx nx build amortization-calculator`, which type-checks the app and the libs it imports.
- **Implementation deviation (T017)**: The percentage `NumberField`s use `min={0}` but no `max={100}`. With `max`, the SDK number input clamps out-of-range values, so the FR-015 field-level message (quickstart Scenario 4, vacancy 150) could never appear. Values above 100 are rejected by `validateRental` instead.
- **Pre-existing 001 bug fixed during T040**: `addScenario` and `removeScenario` in `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts` called `crypto.randomUUID()` and `setActiveScenarioId` inside a `setScenarios` updater. React StrictMode runs updaters twice in development, so `activeScenarioId` pointed at an id that was never stored, and every edit after "Add scenario" was silently dropped. The 001 comparison e2e test didn't assert that its edit applied, so it never caught this. Both functions now generate ids and set the active id outside the updater.
- **E2E helper added**: `clearNumberField` in `apps/amortization-calculator-e2e/src/helpers.ts`. `fillNumberField(page, name, '')` leaves the previous value, because an empty `pressSequentially` doesn't clear the field.
- **Quickstart (T045) results (2026-11-16), checked by automation as the constitution allows, plus a visual screenshot check:**
  - Scenario 1 (positive cash flow): PASS. `deal-analyzer.spec.ts` US1, US2, and US3 tests; card, badges, cap rate, and rules match vector A. A screenshot review confirmed the card figures.
  - Scenario 2 (real-time updates): PASS. US2 test and `performance.spec.ts` SC-003 test (CoC turns negative in under 1 s).
  - Scenario 3 (N/A states): PASS. US2 (CoC N/A with zero cash invested; LTV N/A without a price) and US3 (cap rate and 1% Rule N/A).
  - Scenario 4 (validation doesn't block the schedule): PASS. FR-015 test (vacancy 150 shows the error and the 360-row schedule stays).
  - Scenario 5 (accessibility): PASS for keyboard (Enter opens, Esc closes) and hover on the rule popovers, in all 3 browsers. The `aria-live` announcement is present in the markup but was **not verified with a real screen reader**.
  - Scenario 6 (persistence and comparison): PASS. Both US4 tests (deal columns, reload persistence, "—" for a scenario without rent, legacy session loads with no page errors).
  - Final gate: `npx nx run-many -t lint test` (4 projects, 69 unit tests), `npx nx build amortization-calculator`, and `npx nx e2e amortization-calculator-e2e` (51/51 across Chromium, Firefox, and WebKit) all passed.
  - Fixed after the screenshot review: a $0 expense line rendered as "-$0.00" (negative zero); `IncomeExpenseCard` now normalizes it.
- Usability check (T046) results: _record here_
