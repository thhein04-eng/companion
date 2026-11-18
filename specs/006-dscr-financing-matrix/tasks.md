---
description: 'Task list for 006-dscr-financing-matrix'
---

# Tasks: DSCR & Financing Matrix

**Input**: Design documents from `/specs/006-dscr-financing-matrix/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included. Constitution Principle I requires cent-level unit tests for every calculation
change, and the quality gates require `nx e2e`. Write each test task first and confirm it fails
before you implement it.

**Conventions**:
- Run every command from the worktree root `.claude/worktrees/006-dscr-financing-matrix`, using
  `npx nx` (this is an npm workspace).
- Import across libs only through package entry points (`shared-calculations`,
  `deal-analyzer-calculations`, `shared-data-access`, `shared-ui`), never through deep paths.
- Money is cents-rounded with `roundCents` from `shared-calculations` at the output boundary only.
  Ratios stay unrounded.
- The **reference scenario** used in many tests: price $400,000, `downPayment: { percent: 25 }`,
  principal $300,000, rate 7.0, `termMonths: 360`, `annualPropertyTax: 4800`,
  `annualInsurance: 1800`, no PMI or HOA, rental
  `{ ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 3800 }`. Expected values are in
  [research.md § Reference scenario](./research.md#reference-scenario-used-in-spec-contracts-and-tests).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the fresh worktree runnable and record a green baseline.

- [X] T001 Run `npm ci` at the worktree root (the fresh worktree has no `node_modules`). Then run `npx nx show projects` and confirm it lists `shared-calculations`, `deal-analyzer-calculations`, `deal-analyzer-ui`, `amortization-calculator` and `amortization-calculator-e2e`.
- [X] T002 Record a baseline by running `npx nx run-many -t lint test -p shared-calculations deal-analyzer-calculations deal-analyzer-ui amortization-calculator`. It must pass before any change. Note any pre-existing failures in this file under "Baseline notes" instead of fixing them.

**Checkpoint**: The baseline is green (or its pre-existing failures are documented).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared payment math and the persisted type additions. Every story depends on these.

**⚠️ CRITICAL**: Do not start any user story until this phase is complete.

- [X] T003 [P] Write `libs/shared/calculations/src/lib/loan-math.spec.ts` (Vitest). It must cover:
  - `roundCents(monthlyPayment(300000, 6.5, 360)) === 1896.20`
  - `roundCents(monthlyPayment(300000, 7, 360)) === 1995.91`
  - `roundCents(monthlyPayment(300000, 8, 360)) === 2201.29`
  - `roundCents(monthlyPayment(300000, 0, 360)) === 833.33`
  - `roundCents(remainingBalance(300000, 6.5, 360, 84)) === 271248.73`
  - `remainingBalance(300000, 6.5, 360, 0) === 300000`
  - `Math.abs(remainingBalance(300000, 6.5, 360, 360)) < 1e-6`
  - at 0%: `remainingBalance(360000, 0, 360, 12) === 348000`
  - the full-cycle check `roundCents(monthlyPayment(remainingBalance(300000, 6.5, 360, 84), 8.5, 276)) === 2240.75`
- [X] T004 Create `libs/shared/calculations/src/lib/loan-math.ts`. It exports:
  - `monthlyPayment(principal, annualRatePct, termMonths): number`. This is the body of the private `fixedPayment` in `compute-schedule.ts`, but it takes an annual **percent** rate and converts it with `annualRatePct / 100 / 12`. It is unrounded and returns `principal / termMonths` at 0%.
  - `remainingBalance(principal, annualRatePct, termMonths, afterPeriods): number`. It uses the closed form `P(1+i)^k − PMT((1+i)^k − 1)/i`, or `P − PMT·k` at 0%, and is unrounded.

  Then re-export it from `libs/shared/calculations/src/index.ts` (`export * from './lib/loan-math';`). T003 must then pass.
- [X] T005 Refactor `libs/shared/calculations/src/lib/compute-schedule.ts` to delete `fixedPayment` and call `monthlyPayment(scenario.principal, scenario.annualInterestRatePct, scenario.termMonths)` from `./loan-math`. Do **not** edit `compute-schedule.spec.ts`. Run `npx nx test shared-calculations`, which must pass unchanged (R5 regression guard). Depends on T004.
- [X] T006 [P] In `libs/shared/calculations/src/lib/types.ts`, add the persisted types exactly as specified in data-model.md §A, each with its JSDoc:
  - `FinancingOptionId = 'conventional' | 'arm' | 'dscr'`.
  - `LoanTerms { downPaymentPct; annualRatePct; termYears }`, documented as "0 ≤ x < 100, % of purchase price", "0 ≤ x ≤ 25 (initial rate for the ARM)" and "integer 1…40".
  - `ArmTerms extends LoanTerms { fixedPeriodYears: 3 | 5 | 7 | 10; adjustedRatePct: number }`, documented as "must be < termYears" and "0 ≤ x ≤ 25, applies for the rest of the term".
  - `FinancingTerms { conventional: LoanTerms; arm: ArmTerms; dscr: LoanTerms }`.
  - Three new **optional** fields on `RentalAssumptions`:
    - `dscrMinimum?: number`, documented as "missing = 1.25. 1.00 ≤ x ≤ 2.00".
    - `financing?: FinancingTerms | null`, documented as "missing = derive from the scenario".
    - `financingSelection?: FinancingOptionId`, documented as "missing = 'conventional'".
  - Two new members of the `FieldError['field']` union: `` `rental.dscrMinimum` `` and `` `rental.financing.${FinancingOptionId}.${string}` ``.
- [X] T007 In `libs/deal-analyzer/calculations/src/lib/validate-rental.ts`, redefine `NumericRentalField` as `Exclude<keyof RentalAssumptions, 'customExpenses' | GrowthField | 'dscrMinimum' | 'financing' | 'financingSelection'>`, so the dollar and percent loops still typecheck and never treat the new fields as numeric rental inputs. `validateRental` MUST NOT emit errors for the new fields (R11). Run `npx nx run-many -t lint test -p shared-calculations deal-analyzer-calculations` to confirm typecheck and existing tests pass. Depends on T006.
- [X] T008 [P] In `libs/shared/calculations/src/lib/persistence.spec.ts`, add a test. A serialized state whose rental has no `dscrMinimum`, `financing` or `financingSelection` round-trips through `deserializeScenarios` with those keys still `undefined` and no throw. A state that has them round-trips them unchanged. Do not change `persistence.ts` (R12). Depends on T006.

**Checkpoint**: `npx nx run-many -t lint test -p shared-calculations deal-analyzer-calculations` passes, and `compute-schedule.spec.ts` is unmodified (`git diff --stat` shows no change to it).

---

## Phase 3: User Story 1 — See whether the property's income covers its debt (Priority: P1) 🎯 MVP

**Goal**: A DSCR card on `/deal-analyzer` shows NOI ÷ annual P&I against an editable minimum
(default 1.25, presets 1.15/1.20/1.25). It is flagged red with text and an icon when below the
minimum, and shows the rent needed. The comparison grid gains a DSCR column.

**Independent Test**: With the reference scenario, the card shows **1.19×** and the red status
"Below 1.25× minimum", with "Rent needed for 1.25×: $3,954.40/mo". Picking 1.15× turns it green.
See quickstart §2.

### Tests for User Story 1 (write first, confirm they fail)

- [X] T009 [P] [US1] Write `libs/deal-analyzer/calculations/src/lib/dscr.spec.ts`. Build the reference scenario's `DealAnalysis` with `analyzeDeal(scenario, computeSchedule(scenario))`, then call `computeDscr({ scenario, annualNoi: 28512, monthlyPrincipalAndInterest: 1995.91, minimum })`. Assert each case from the contract table in `contracts/dscr-financing-calculations.md § computeDscr`:
  - min 1.25: `value.toFixed(4) === '1.1904'`, `meetsMinimum === false`, `coversDebtService === true`, `rentForMinimum === 3954.40`, `annualDebtService === 23950.92`
  - min 1.15: `meetsMinimum === true`, `rentForMinimum === 3695.19`
  - rent 2,000 (rebuild the analysis): `coversDebtService === false`
  - rent 0: `value < 0`, and `rentForMinimum` is still a number
  - vacancy 40 + management 30 + maintenance 20 + capex 10 (= 100%): `rentForMinimum === null`, `rentForMinimumNaReason === 'Reserves and fees take 100% or more of rent.'`
  - rent set to exactly `rentForMinimum`'s unrounded solution: `meetsMinimum === true`
  - `minimum: null`: `meetsMinimum === null`, value still computed
  - `monthlyPrincipalAndInterest: 0`: `value === null` with an `naReason`

  Also test `resolveDscrMinimum`: `{}` → 1.25, `{ dscrMinimum: 1.15 }` → 1.15, `0.9` → null, `2.5` → null, `NaN` → null, and `'1.2'` (a string cast as any) → null.
- [X] T010 [P] [US1] Extend `libs/deal-analyzer/calculations/src/lib/analyze-deal.spec.ts`. Do not change existing assertions. Add: for the reference scenario, `analysis.dscr.value.toFixed(4) === '1.1904'`, `analysis.dscr.minimum === 1.25` and `analysis.dscr.meetsMinimum === false`. Also add that a scenario with a recurring extra payment rule has the same `dscr.value` as without it (R1: extra payments never change DSCR).
- [X] T011 [P] [US1] Extend `libs/deal-analyzer/calculations/src/lib/with-deal-metrics.spec.ts`. A row whose analysis exists gets `dscr === analysis.dscr.value`, and a row with a `null` analysis gets `dscr === null`.

### Implementation for User Story 1

- [X] T012 [US1] Add `DscrResult` to `libs/deal-analyzer/calculations/src/lib/types.ts`, exactly as in data-model.md §B (fields `value`, `naReason`, `minimum`, `meetsMinimum`, `coversDebtService`, `annualDebtService`, `rentForMinimum`, `rentForMinimumNaReason`, with their JSDoc). Add `dscr: DscrResult` to `DealAnalysis` and `dscr: number | null` to `DealComparisonRow`.
- [X] T013 [US1] Create `libs/deal-analyzer/calculations/src/lib/dscr.ts` with:
  - `DEFAULT_DSCR_MINIMUM = 1.25`, `DSCR_MINIMUM_RANGE = { min: 1, max: 2 }` and `DSCR_PRESETS = [1.15, 1.2, 1.25] as const`.
  - `resolveDscrMinimum(rental)`. It returns 1.25 when `dscrMinimum` is `undefined`, the value when `typeof === 'number'`, finite and 1.00 ≤ x ≤ 2.00, and `null` otherwise.
  - `computeDscr({ scenario, annualNoi, monthlyPrincipalAndInterest, minimum })`. It sets `annualDebtService = roundCents(monthlyPI * 12)` and `value = annualNoi / annualDebtService`. When `annualDebtService === 0`, it returns `value: null` with `naReason: 'No principal & interest — DSCR is undefined.'`. It sets `meetsMinimum = value >= minimum` (unrounded) and `coversDebtService = value >= 1`.
  - `rentForMinimum`, per research R3. Call `rentalLineItems(scenario, 1, 1)` (internal import `./rental-line-items`). The percentage lines are the categories `vacancy | management | maintenance | capex`, and `p` is the sum of their `monthly` values at `gsiMonthly = 1`. Every other line is fixed, with `fixed` = the sum of their monthly amounts. Then `rent = (minimum * annualDebtService / 12 + fixed) / (1 − p) − otherMonthlyIncome`. Floor it at 0 and apply `roundCents`. If `p >= 1`, return `null` with reason `'Reserves and fees take 100% or more of rent.'`. If `minimum === null`, `rentForMinimum` is `null` and its reason is `null`.

  Export everything from `libs/deal-analyzer/calculations/src/index.ts`. T009 must then pass.
- [X] T014 [US1] In `libs/deal-analyzer/calculations/src/lib/analyze-deal.ts`, add `dscr: computeDscr({ scenario, annualNoi: netOperatingIncome.annual, monthlyPrincipalAndInterest: schedule.summary.monthlyPrincipalAndInterest, minimum: resolveDscrMinimum(rental) })` to the returned object. All other fields stay unchanged. T010 must then pass.
- [X] T015 [US1] In `libs/deal-analyzer/calculations/src/lib/with-deal-metrics.ts`, set `dscr: analysis?.dscr.value ?? null` on each row. T011 must then pass.
- [X] T016 [US1] Generalize `libs/deal-analyzer/ui/src/lib/rule-indicator.tsx`:
  - Extract and export a `StatusPill({ status, text }: { status: RuleStatus; text?: string })` component that renders the existing `statusStyles` icon and class. `text` defaults to the existing Pass/Fail/N/A label, and the component sets `data-status={status}`.
  - Widen `RuleIndicatorProps['name']` to `string`.
  - Keep the existing rendering (and `rule-1-rule` / `rule-50-rule` test ids) identical, by having `RuleIndicator` use `StatusPill` internally.
- [X] T017 [US1] Create `libs/deal-analyzer/ui/src/lib/dscr-card.tsx` (`'use client'`) per `contracts/financing-ui.md § DscrCard`:
  - The root has `data-testid="dscr"` and the same card classes as the cap-rate card in `deal-metrics.tsx`.
  - The value is formatted as `${value.toFixed(2)}×`, using a real minus sign `−` for negatives, or "N/A" with `naReason`.
  - The status uses `StatusPill` with `data-testid="dscr-status"` and text `Meets ${min.toFixed(2)}× minimum` or `Below ${min.toFixed(2)}× minimum`, or status `na` when `minimum === null`.
  - When `coversDebtService === false`, it shows the line "NOI does not cover the annual principal & interest."
  - When `meetsMinimum === false`, it shows `<p data-testid="dscr-rent-needed">Rent needed for {min}×: {currency.format(rentForMinimum)}/mo</p>`, or the N/A reason.
  - The minimum controls:
    - A `SegmentedControl` from `@ui-sdk/react/segmented-control` with `aria-label="Minimum DSCR"`. It has a `SegmentedControlIndicator` and items with values `'1.15' | '1.20' | '1.25'` and labels `1.15×` / `1.20×` / `1.25×`. It is controlled: `value` is the matching preset string, or `null`/no value when the current minimum is custom. `onValueChange` calls `onMinimumChange(Number(v))`.
    - A `NumberField` from `shared-ui`: label "Custom minimum", `variant="plain"`, `suffix="×"`, `min={1}`, `max={2}`, `step={0.01}`, `value={minimumInput ?? 1.25}`, and `error={minimumError ?? undefined}`.
  - An info `Popover` that copies the `RuleIndicator` pattern, with this text: "Debt Service Coverage Ratio = annual net operating income ÷ annual principal & interest. DSCR lenders typically require 1.15–1.25×."

  Style the indicator per the SDK doc (`node_modules/@ui-sdk/react/docs/components/segmented-control.md § Indicator`).
- [X] T018 [US1] Wire the DSCR card into `libs/deal-analyzer/ui/src/lib/deal-metrics.tsx`:
  - Add the optional props `onDscrMinimumChange?: (v: number) => void`, `dscrMinimumInput?: number` and `dscrMinimumError?: string | null`.
  - Render `<DscrCard>` as the second card (after Cap rate), and change the grid to `sm:grid-cols-2 lg:grid-cols-4`.
  - Create `libs/deal-analyzer/calculations/src/lib/validate-financing.ts` with an initial `validateDscrMinimum(rental): FieldError[]`. It returns `[{ field: 'rental.dscrMinimum', message: 'Minimum DSCR must be between 1.00 and 2.00.' }]` when `dscrMinimum !== undefined && resolveDscrMinimum(rental) === null`. Export it from the lib index, and add a test case for it to `dscr.spec.ts`.
- [X] T019 [US1] In `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx`, pass the new `DealMetrics` props: `onDscrMinimumChange={(v) => updateActiveRental({ dscrMinimum: v })}`, `dscrMinimumInput={activeScenario.rental?.dscrMinimum}`, and `dscrMinimumError` taken from `validateDscrMinimum(activeScenario.rental)`. `updateActiveRental` shallow-merges into `rental` through `applyScenarioPatch`.
- [X] T020 [P] [US1] In `libs/deal-analyzer/ui/src/lib/deal-comparison-columns.ts`, insert `{ id: 'dscr', header: 'DSCR', render: (row) => orDash(row.dscr, (v) => `${v.toFixed(2)}×`) }` immediately after the `capRate` column.
- [X] T021 [US1] Export `dscr-card` from `libs/deal-analyzer/ui/src/index.ts` (`export * from './lib/dscr-card';`). Then run `npx nx run-many -t lint test -p deal-analyzer-calculations deal-analyzer-ui`.
- [X] T022 [US1] Create `apps/amortization-calculator-e2e/src/financing-matrix.spec.ts`. Add a `test.describe('DSCR card')` covering quickstart §2:
  - Open `/deal-analyzer`, fill the reference scenario with the `fillNumberField` helper from `./helpers` (mirror the field labels used in `deal-analyzer.spec.ts`).
  - Expect `getByTestId('dscr')` to contain `1.19×`, `dscr-status` to have `data-status="fail"` and the text "Below 1.25× minimum", and `dscr-rent-needed` to contain `$3,954.40`.
  - Click the `1.15×` radio item, then expect `data-status="pass"` and that `dscr-rent-needed` is not visible.
  - Set rent to 2000 and expect the text "NOI does not cover".
  - Fill "Custom minimum" with 2.5 and expect the inline error and `data-status="na"`.
  - Reload and expect the minimum to be restored (FR-013).

  Add a comparison-grid test: add a second scenario and expect a "DSCR" column header and "—" for the scenario without rent.

**Checkpoint**: US1 works on its own: the unit tests pass, and the e2e `DSCR card` block passes against a :3200 prod build (see quickstart Prerequisites).

---

## Phase 4: User Story 2 — Compare three loan structures side by side (Priority: P2)

**Goal**: A "Financing options" section with Conventional / ARM / DSCR loan columns (loan,
cash invested, P&I, PMI, cash flow, CoC, DSCR; the ARM has initial and after-reset phases), a
segmented toggle for the structure in focus, a breakdown, and a single-column layout on phones.
The terms are derived from the scenario.

**Independent Test**: The reference scenario reproduces every row of the research reference table
in the matrix, and the toggle highlights the chosen column. See quickstart §3 and §5.

### Tests for User Story 2 (write first, confirm they fail)

- [X] T023 [P] [US2] Write `libs/deal-analyzer/calculations/src/lib/financing.spec.ts` for `defaultFinancingTerms` and `resolveFinancingTerms`:
  - The reference scenario gives `conventional = { downPaymentPct: 25, annualRatePct: 7, termYears: 30 }`, `arm = { downPaymentPct: 25, annualRatePct: 6.5, termYears: 30, fixedPeriodYears: 7, adjustedRatePct: 8.5 }` and `dscr = { downPaymentPct: 25, annualRatePct: 8, termYears: 30 }`.
  - Rate 0.3 gives an ARM `annualRatePct` of 0.
  - Principal overridden to 320000 (`principalIsOverridden: true`) gives conventional and ARM `downPaymentPct` 20.
  - Principal 420000 (> price) gives `downPaymentPct` 0.
  - `rental.financing` set to a full `FinancingTerms` makes `resolveFinancingTerms` return it with `isCustomized: true`.
  - Absent or `null` gives the defaults with `isCustomized: false`.
- [X] T024 [P] [US2] Write `libs/deal-analyzer/calculations/src/lib/financing-matrix.spec.ts` for `buildFinancingMatrix(scenario, analyzeDeal(scenario, computeSchedule(scenario)))`. The reference scenario must reproduce, to the cent:
  - Conventional: `loanAmount 300000`, `downPayment 100000`, `totalCashInvested 100000`, one phase with `monthlyPrincipalAndInterest 1995.91`, `monthlyPmi 0`, `monthlyCashFlow 380.09` and DSCR `1.1904` failing.
  - ARM: two phases, labelled `'Initial (years 1–7)'` and `'After reset (years 8–30)'`, with `fromYear`/`toYear` of 1/7 and 8/30. The phases have P&I 1896.20 / 2240.75, cash flow 479.80 / 135.25, and DSCR 1.2530 (pass) / 1.0604 (fail).
  - DSCR loan: P&I 2201.29, cash flow 174.71, DSCR 1.0794 (fail).
  - `options.map(o => o.id)` equals `['conventional','arm','dscr']`, and `selected === 'conventional'`.

  Also test:
  - The conventional `monthlyCashFlow` equals `analysis.cashFlow.monthly` for 4 generated 30-year scenarios (rates 3, 5.5, 7, 9; down 20/25/30%; with PMI rate 0.5 and 10% down, PMI on).
  - At 10% down with `pmiAnnualRatePct: 0.5`, the conventional and ARM `monthlyPmi` is 150 (loan 360000), the DSCR option's is 0, and the PMI never changes any `dscr.value`.
  - `homePrice: null` gives `options: null` with `naReason === 'Enter a purchase price to compare financing options.'`.
  - Rate 0 works.
  - `financingSelection: 'arm'` gives `selected === 'arm'`.
  - `closingCosts: 5000, rehabBudget: 10000` adds 15000 to every option's `totalCashInvested`.
  - Cash-on-cash for the conventional option is `380.09 * 12 / 100000`.

### Implementation for User Story 2

- [X] T025 [US2] Add `FinancingPhase`, `FinancingOptionResult` and `FinancingMatrix` to `libs/deal-analyzer/calculations/src/lib/types.ts`, exactly as in data-model.md §C. Import `FinancingOptionId`, `LoanTerms`, `ArmTerms`, `FieldError` and `RatioResult` from `shared-calculations`.
- [X] T026 [US2] Create `libs/deal-analyzer/calculations/src/lib/financing.ts` with `defaultFinancingTerms(scenario)` and `resolveFinancingTerms(scenario)`, per the data-model §A defaults table:
  - `down = Math.max(0, (1 − principal / homePrice) * 100)`.
  - Conventional is `{down, r, 30}`.
  - The ARM is `{down, Math.max(0, r − 0.5), 30, fixedPeriodYears: 7, adjustedRatePct: r + 1.5}`.
  - The DSCR loan is `{25, r + 1.0, 30}`.
  - Guard against floating-point drift: round the derived `downPaymentPct` and rates to 10 decimal places, so 25 stays 25.

  Export them from the lib index. T023 must then pass.
- [X] T027 [US2] Create `libs/deal-analyzer/calculations/src/lib/financing-matrix.ts` with `buildFinancingMatrix(scenario, analysis)`, per `contracts/dscr-financing-calculations.md § buildFinancingMatrix`:
  - No price gives the `naReason` and nothing else.
  - For each option, in the order `conventional, arm, dscr`: `loan = price * (1 − down / 100)`, `downPayment = price − loan`, `ltv = loan / price`, `totalCashInvested = roundCents(downPayment + closingCosts + rehabBudget)`.
  - Each phase uses `monthlyPayment` / `remainingBalance` from `shared-calculations`. For the ARM, `fixedMonths = fixedPeriodYears * 12`, the reset balance is `remainingBalance(loan, initialRate, termMonths, fixedMonths)`, and the reset payment is `monthlyPayment(balance, adjustedRate, termMonths − fixedMonths)`.
  - `P&I = roundCents(...)`.
  - `monthlyPmi = roundCents(pmiRate / 100 * loan / 12)` only when `id !== 'dscr' && ltv > 0.8 && scenario.pmiAnnualRatePct != null`, and 0 otherwise.
  - `monthlyCashFlow = roundCents(analysis.netOperatingIncome.monthly − P&I − PMI)`.
  - `cashOnCashReturn` reuses the "No cash invested — Cash-on-Cash Return is undefined." reason when `totalCashInvested <= 0`.
  - `dscr = computeDscr({ scenario, annualNoi: analysis.netOperatingIncome.annual, monthlyPrincipalAndInterest: P&I, minimum: resolveDscrMinimum(rental) })`.
  - Descriptions are `'30-yr fixed'`, `` `${fixed}/1 ARM` `` and `` `${termYears}-yr DSCR` `` (use the actual `termYears` for the conventional too: `` `${termYears}-yr fixed` ``). Single-phase labels are `` `Years 1–${termYears}` ``.
  - Leave `errors: []` and always compute `phases` for now (T034 adds validation).
  - `selected = rental.financingSelection ?? 'conventional'`, and `isCustomized` comes from `resolveFinancingTerms`.

  Export it from the lib index. T024 must then pass.
- [X] T028 [US2] Create `libs/deal-analyzer/ui/src/lib/financing-matrix.tsx` (`'use client'`), per `contracts/financing-ui.md § FinancingMatrix`:
  - The root is `data-testid="financing-matrix"`. When `options === null`, render only `<p data-testid="financing-matrix-na">{naReason}</p>`.
  - The toggle is a `SegmentedControl` with `aria-label="Loan structure"` and `data-testid="financing-toggle"`. Its items have values `conventional|arm|dscr` and labels `Conventional|ARM|DSCR loan`. It is controlled by `matrix.selected`, and `onValueChange` calls `onSelect`.
  - At `sm` and up, render a `<table className="hidden sm:table">` with `<caption>`: `Financing options for {scenarioName}`.
    - Column headers are `<th scope="col" data-testid="financing-col-{id}">`, showing name and description. The selected column gets `aria-current="true"`, `data-selected="true"` and a highlight class on every cell in that column.
    - Row headers are `<th scope="row">`, in this order with these row keys: Rate `rate`, Term `term`, Down payment `down-payment`, Loan amount `loan-amount`, Cash invested `cash-invested`, Monthly P&I `monthly-pi`, Monthly PMI `monthly-pmi`, Monthly cash flow `cash-flow`, Cash-on-cash `coc`, DSCR `dscr`.
    - Each cell is `data-testid="{rowKey}-{id}"`. For the ARM's per-phase rows (`monthly-pi`, `cash-flow`, `coc`, `dscr`), render two stacked spans with test ids `{rowKey}-arm-initial` and `{rowKey}-arm-reset`, prefixed `Yrs 1–7` / `Yrs 8–30` from the phase years.
    - DSCR cells show `{v.toFixed(2)}×` plus `StatusPill` (status `pass|fail|na`).
    - Negative cash flow uses `text-red-700` and `currency.format`.
    - Use `currency`, `percent1` and `percent2` from `shared-ui`.
  - Under the table or list, render the selected option's breakdown, `data-testid="financing-breakdown"` (FR-010). It has one line per phase: `NOI {currency(noi.monthly)} − P&I {…} − PMI {…} = Cash flow {…} /mo`, prefixed with the phase label for the ARM. This needs the prop `noiMonthly: number`.
  - Below `sm`, render a `<dl className="sm:hidden">` for the selected option only, with the same row keys and test ids, so there is no horizontal scroll at 375 px.
  - Props are as in the contract, plus `scenarioName: string`. Leave `onTermsChange` and `onReset` unused until US3.
- [X] T029 [US2] Create `libs/deal-analyzer/ui/src/lib/use-financing-editor.ts` (`'use client'`). It exports `useFinancingEditor()`, which returns `setSelection(id)`, implemented as `updateActiveRental({ financingSelection: id })` via `useRentalEditor`. US3 adds the rest.
- [X] T030 [US2] In `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx`:
  - Compute `const matrix = useMemo(() => validation.valid && analysis ? buildFinancingMatrix(validation.scenario, analysis) : null, [validation, analysis])`.
  - After the "Deal analyzer" section, render `<section className="flex flex-col gap-4"><h2 className="text-lg font-medium text-neutral-800">Financing options</h2><FinancingMatrix … /></section>` only when `matrix` is non-null. Pass `scenarioName={activeScenario.name}`, `noiMonthly={analysis.netOperatingIncome.monthly}`, `onSelect={setSelection}`, `errors={[]}` and no-op handlers for the other callbacks.
  - Export `financing-matrix` and `use-financing-editor` from `libs/deal-analyzer/ui/src/index.ts`.
- [X] T031 [US2] Add `test.describe('Financing matrix')` to `apps/amortization-calculator-e2e/src/financing-matrix.spec.ts`, covering quickstart §3 and §5:
  - Assert every cell in the quickstart §3 table by test id. Assert that `cash-flow-conventional` equals the Income & expense card's monthly cash flow text.
  - Focus `financing-toggle`'s checked item, press `ArrowRight` twice, then expect `financing-col-dscr` to have `aria-current="true"`. Then expect `financing-breakdown` to contain "NOI $2,376.00 − P&I $2,201.29 − PMI $0.00 = Cash flow $174.71".
  - Change the loan rate to 6 and expect `monthly-pi-conventional` to change.
  - Clear the purchase price and expect `financing-matrix-na`.
  - Set the viewport to 375×800, expect `document.documentElement.scrollWidth <= 375`, and expect only the selected option's cells to be visible.
  - PMI at 10% down / 0.5%: `monthly-pmi-conventional` is `$150.00` and `monthly-pmi-dscr` is `$0.00`.

**Checkpoint**: US1 and US2 both work. The matrix is correct for derived terms, and the toggle and narrow layout work.

---

## Phase 5: User Story 3 — Adjust each structure's terms (Priority: P3)

**Goal**: Editable terms per structure with inline validation, column-level isolation of errors,
detach-on-first-edit, session persistence and "Reset to defaults".

**Independent Test**: Quickstart §4. Editing the DSCR loan to 20% / 7.5% changes only that column
(loan $320,000). An invalid ARM fixed period blanks only the ARM. A reload keeps the edits, and
Reset restores the defaults.

### Tests for User Story 3 (write first, confirm they fail)

- [X] T032 [P] [US3] Extend `libs/deal-analyzer/calculations/src/lib/financing.spec.ts` (or create `validate-financing.spec.ts`) with tests for `validateFinancing(rental, terms)`. Valid reference terms give `[]`. Each rule from data-model §A gives exactly one error with the exact field key and message:
  - `conventional.downPaymentPct = 100` → `rental.financing.conventional.downPaymentPct`, "Down payment must be at least 0% and less than 100%."
  - `dscr.downPaymentPct = -1` → same message.
  - `arm.annualRatePct = 26` → `rental.financing.arm.annualRatePct`, "Rate must be between 0% and 25%."
  - `arm.adjustedRatePct = -0.5` → `rental.financing.arm.adjustedRatePct`, same message.
  - `conventional.termYears = 30.5` and `= 41` → "Term must be 1 to 40 whole years."
  - `arm.fixedPeriodYears = 6` → `rental.financing.arm.fixedPeriodYears`, "Fixed period must be shorter than the term."
  - `arm.termYears = 5` with `fixedPeriodYears = 7` → the fixed-period error only.
  - `dscrMinimum = 2.5` → `rental.dscrMinimum`, "Minimum DSCR must be between 1.00 and 2.00."
  - Malformed stored terms, such as `financing: { conventional: {} }` cast as any, or a string rate, return errors and never throw.
- [X] T033 [P] [US3] Extend `libs/deal-analyzer/calculations/src/lib/financing-matrix.spec.ts`:
  - With stored terms where the DSCR loan has `downPaymentPct 20, annualRatePct 7.5`: `dscr.loanAmount === 320000`, while the conventional and ARM results deep-equal the reference results, and `isCustomized === true`.
  - With `arm.termYears = 5, fixedPeriodYears = 7`: `arm.phases === null`, `arm.errors.length === 1`, and conventional and DSCR are unchanged.
  - With malformed `financing` (missing `arm`): no throw, `arm.phases === null`, and the other options are computed when their own terms are valid.

### Implementation for User Story 3

- [X] T034 [US3] Complete `libs/deal-analyzer/calculations/src/lib/validate-financing.ts`. Add `validateFinancing(rental, terms): FieldError[]`, implementing the data-model §A validation table verbatim:
  - `dscrMinimum`: finite, 1.00 ≤ x ≤ 2.00, "Minimum DSCR must be between 1.00 and 2.00." Reuse `validateDscrMinimum`.
  - `*.downPaymentPct`: finite, 0 ≤ x < 100, "Down payment must be at least 0% and less than 100%."
  - `*.annualRatePct` and `arm.adjustedRatePct`: finite, 0 ≤ x ≤ 25, "Rate must be between 0% and 25%."
  - `*.termYears`: integer, 1 ≤ x ≤ 40, "Term must be 1 to 40 whole years."
  - `arm.fixedPeriodYears`: ∈ {3,5,7,10} and < `arm.termYears`, "Fixed period must be shorter than the term."

  Keys are `rental.financing.{id}.{field}`. Treat a missing option object as its fields being invalid. Use `typeof x === 'number' && Number.isFinite(x)` checks so it never throws. Then, in `financing-matrix.ts`, call it once and give each option the errors whose key starts with `rental.financing.{id}.`. Set `phases: null` for any option with errors. T032 and T033 must then pass.
- [X] T035 [US3] Complete `libs/deal-analyzer/ui/src/lib/use-financing-editor.ts`:
  - `patchTerms(id, patch)`: read `resolveFinancingTerms(activeScenario).terms` (this materializes the derived terms when `rental.financing` is absent), then call `updateActiveRental({ financing: { ...terms, [id]: { ...terms[id], ...patch } } })`. Send the **full** `FinancingTerms`, because `applyScenarioPatch` merges `rental` only one level deep.
  - `resetTerms()`: call `updateActiveRental({ financing: null })`. This keeps `dscrMinimum` and `financingSelection`.
  - `setDscrMinimum(v)`: call `updateActiveRental({ dscrMinimum: v })`.

  Replace the inline handler from T019 with `setDscrMinimum`.
- [X] T036 [US3] Create `libs/deal-analyzer/ui/src/lib/financing-terms-editor.tsx` (`'use client'`), per `contracts/financing-ui.md § FinancingTermsEditor`. Render it for the selected option only, with root `data-testid="financing-terms-{id}"`.
  - Fields, each a `NumberField` from `shared-ui` (`variant="plain"`) with its error taken from the matching `rental.financing.{id}.{field}` key:
    - "Down payment %": `suffix="%"`, `min 0`, `max 99.99`, `step 0.5`.
    - "Interest rate %", labelled "Initial rate %" for the ARM: `min 0`, `max 25`, `step 0.125`.
    - "Term (years)": `min 1`, `max 40`, `step 1`.
    - ARM only: "Adjusted rate %", with the same limits as the rate field.
  - ARM only, "Fixed period": a select copying the existing `@ui-sdk/react/select` usage in the workspace (find it with `grep -rn "@ui-sdk/react/select" libs`), with options 3/5/7/10 years.
  - A `null` value from `onValueChange` is ignored (it is not written).
  - A "Reset to defaults" `Button` from `@ui-sdk/react/button` with `data-testid="financing-reset"`, shown only when `matrix.isCustomized`.

  Props: `option: FinancingOptionResult`, `errors: FieldError[]`, `isCustomized: boolean`, `onChange(patch)` and `onReset()`.
- [X] T037 [US3] Update `libs/deal-analyzer/ui/src/lib/financing-matrix.tsx`:
  - Render `<FinancingTermsEditor>` under the table for `matrix.options.find(o => o.id === matrix.selected)`, wired to `onTermsChange(selected, patch)` and `onReset`.
  - For options with `phases === null`, show "—" in every derived cell and "Fix the terms below" under the column header.
- [X] T038 [US3] Update `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx` to pass `onTermsChange={patchTerms}`, `onReset={resetTerms}` and `errors={matrix.options?.flatMap(o => o.errors) ?? []}`, using `useFinancingEditor`. Confirm that an invalid matrix term changes nothing outside the matrix: the DSCR card, the Income & expense card and the charts still render.
- [X] T039 [US3] Export `financing-terms-editor` from `libs/deal-analyzer/ui/src/index.ts`. Then run `npx nx run-many -t lint test -p deal-analyzer-calculations deal-analyzer-ui`.
- [X] T040 [US3] Add `test.describe('Editing financing terms')` to `apps/amortization-calculator-e2e/src/financing-matrix.spec.ts`, covering quickstart §4 and §6:
  - Select DSCR loan, then fill "Down payment %" with 20 and "Interest rate %" with 7.5. Expect `loan-amount-dscr` to be `$320,000.00` (match the formatter's output), `monthly-pi-conventional` to be unchanged at `$1,995.91`, and `financing-reset` to be visible.
  - Change the loan rate above and expect `monthly-pi-conventional` to be unchanged, because the terms are detached.
  - Select ARM, set "Term (years)" to 5 and "Fixed period" to 7. Expect the inline error, `cash-flow-arm-initial` to be "—", `cash-flow-dscr` to still show a value, and `dscr` (the card) to still be visible.
  - Reload and expect the edits and the ARM selection to persist.
  - Click `financing-reset` and expect the reference defaults back, with the selection still ARM.
  - Old session: use `page.evaluate` to delete `dscrMinimum`, `financing` and `financingSelection` from the stored scenario JSON in `sessionStorage` (find the key in `libs/shared/data-access/src/lib/scenarios-provider.tsx`). Then reload and expect the 1.25 minimum, Conventional selected, the derived values and no errors.

**Checkpoint**: All three stories work independently and together.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T041 [P] Add a README note: append a "DSCR & financing matrix" bullet to `libs/deal-analyzer/calculations/README.md` and `libs/deal-analyzer/ui/README.md`, listing the new public functions and components.
- [X] T042 Run the full gate: `npx nx run-many -t lint test -p shared-calculations deal-analyzer-calculations deal-analyzer-ui amortization-calculator`. Then run `npx nx build amortization-calculator`, then `npx nx run amortization-calculator:start --port=3200` in the background, then `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`. Do not rely on :3000, which may be the main checkout's server. Every existing spec must still pass, especially `deal-analyzer`, `validation-and-persistence`, `scenario-comparison` and `charts`.
- [X] T043 Execute every quickstart.md scenario (§2–§6) once against the :3200 build, by automation or by hand, and record the date and result in `specs/006-dscr-financing-matrix/quickstart.md` under a "Verified" line (constitution quality gate).
- [X] T044 [P] Keyboard and accessibility pass (SC-004):
  - Tab through the DSCR presets, the custom minimum, the loan-structure toggle, the term fields and Reset. Each must be reachable, arrow keys must move within the segmented controls, and focus rings must be visible.
  - Confirm that no failing status relies on color alone (each has ✕ text).
  - Fix any issue in the component files from T017, T028 and T036.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: Has no dependencies.
- **Foundational (Phase 2)**: Depends on Setup. It blocks all stories. Within it: T003 → T004 → T005; T006 → T007 and T008.
- **US1 (Phase 3)**: Depends on Phase 2. It is the MVP.
- **US2 (Phase 4)**: Depends on Phase 2, and on US1's `computeDscr`, `resolveDscrMinimum` and `StatusPill` (T013, T016). The matrix reuses the DSCR math and the pill.
- **US3 (Phase 5)**: Depends on US2 (the matrix and the editor hook exist).
- **Polish (Phase 6)**: Depends on all the stories.

### Within each story

The tests (T009–T011, T023–T024, T032–T033) are written first and must fail. Then come the types,
then the pure functions, then the UI components, then the view wiring, then the e2e.

### Story dependency graph

```text
Setup ─► Foundational ─► US1 (P1, MVP) ─► US2 (P2) ─► US3 (P3) ─► Polish
```

## Parallel Opportunities

- **Phase 2**: T003 (loan-math spec) ∥ T006 (types). T008 can run alongside T007 once T006 is done.
- **US1**: T009 ∥ T010 ∥ T011 (separate spec files). T020 (comparison column) ∥ T016–T017 (UI components).
- **US2**: T023 ∥ T024. After T027, T028 (component) ∥ T029 (hook).
- **US3**: T032 ∥ T033. T041 and T044 can run in parallel in the Polish phase.

### Parallel example: User Story 1

```text
Task: "T009 Write dscr.spec.ts in libs/deal-analyzer/calculations/src/lib/dscr.spec.ts"
Task: "T010 Extend analyze-deal.spec.ts in libs/deal-analyzer/calculations/src/lib/analyze-deal.spec.ts"
Task: "T011 Extend with-deal-metrics.spec.ts in libs/deal-analyzer/calculations/src/lib/with-deal-metrics.spec.ts"
```

### Parallel example: User Story 2

```text
Task: "T023 Write financing.spec.ts in libs/deal-analyzer/calculations/src/lib/financing.spec.ts"
Task: "T024 Write financing-matrix.spec.ts in libs/deal-analyzer/calculations/src/lib/financing-matrix.spec.ts"
```

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 → Phase 2 → Phase 3.
2. **Stop and validate**: run quickstart §2 and the `DSCR card` e2e block. The DSCR card with the red
   flag is usable on its own.

### Incremental delivery

1. US1: the DSCR card and comparison column. This is shippable on its own.
2. US2: the read-only matrix with derived terms and the toggle.
3. US3: editable terms, validation, persistence and reset.
4. Polish: the full gate on the :3200 build, the quickstart verification, and the accessibility pass.

## Baseline notes

- 2026-11-17: the baseline (`lint test` for shared-calculations, deal-analyzer-calculations, deal-analyzer-ui and amortization-calculator) passed before any change.
- A pre-existing intermittent WebKit failure: `deal-analyzer.spec.ts` "US4: a session saved before the Deal Analyzer loads without errors (FR-016)". It collects `pageerror`s from Next.js RSC prefetches of `/amortization` that are aborted on reload ("due to access control checks"), and failed 1 of 8 isolated runs. This feature does not touch navigation or prefetching, so the test was left unchanged.

## Notes

- Never edit `compute-schedule.spec.ts` (T005 is a pure refactor).
- `applyScenarioPatch` shallow-merges `rental`, so always write the full `FinancingTerms` object (T035).
- `rentalLineItems` is internal to `deal-analyzer-calculations`. Import it relatively, and never export it.
- Commit after each task or logical group, ending commit messages with the attribution lines.
