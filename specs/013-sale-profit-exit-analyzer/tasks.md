---
description: 'Task list for 013-sale-profit-exit-analyzer'
---

# Tasks: Sale Profit & Exit Analyzer

**Input**: Design documents from `/specs/013-sale-profit-exit-analyzer/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included. Constitution Principle I requires cent-level unit tests for every
calculation, and the quality gates require e2e. Write each test task first, then confirm it fails
before you implement it.

**Conventions** (these apply to every task):
- Run every command from the worktree root
  `/Users/t_hein/Projects/companion/.claude/worktrees/013-sale-profit-exit-analyzer` on branch
  `013-sale-profit-exit-analyzer`, using `npx nx`. Run `npm ci` first (research R11).
- **Per-task gate (constitution)**: before ticking a task, run
  `npx nx run-many -t lint test typecheck -p <touched projects>`.
  - UI and e2e tasks also run the relevant e2e against this branch's own prod build on :3200
    (quickstart §3). Never use :3000.
- Cross-lib imports use package names only (`shared-calculations`, `shared-data-access`,
  `shared-ui`, `deal-analyzer-calculations`).
  - `annualCashToInvestor`, `cumulativeCashFlow`, `operatingYear` and `rentalLineItems` stay
    internal. Import them relatively and never export them from `index.ts`.
- **Rounding**: money is cents-rounded with `roundCents` at each stored figure. Ratios
  (`returnOnCash`, `pctOfPurchase`) stay unrounded.
- Validated `NumberField`s MUST NOT pass `min`/`max`. The SDK clamps on commit and would hide the
  inline errors.
- **Reference scenario** (`REF`): `referenceScenario({}, { rentGrowthPct: 3, expenseGrowthPct: 2.5,
  appreciationPct: 3.5 })` from
  `libs/deal-analyzer/calculations/src/lib/__fixtures__/dscr-reference.ts`. It uses selling costs
  7% (the default).
  - Expected values are the table in
    [contracts/sale-calculations.md § Reference vectors](./contracts/sale-calculations.md#reference-vectors-unit-tests-sc-001).
  - **Non-rental reference** (`REF_NR`): `referenceScenario({ rental: null, sale: { appreciationPct:
    3.5 } })`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel, because it touches different files and has no
  dependency on an incomplete task.
- **[Story]**: The user story the task belongs to (US1, US2, US3).

---

## Phase 1: Setup

- [X] T001 Install dependencies and record a baseline. Run `npm ci`, then `npx nx run-many -t lint test typecheck -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`, which must pass. Record the result under "Baseline notes" at the end of this file in `specs/013-sale-profit-exit-analyzer/tasks.md`.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: stored types, the write path, the page shell, and the refactor every story's numbers
depend on.

- [X] T002 Add the stored types in `libs/shared/calculations/src/lib/types.ts`, per data-model §A:
  - Add `SaleTaxAssumptions` with every field optional: `enabled?: boolean` ("Default `false`"), `capitalGainsRatePct?: number` ("0 ≤ x ≤ 40. Default 15") and `recaptureRatePct?: number` ("0 ≤ x ≤ 40. Default 25").
  - Add `SaleAssumptions`, also all optional: `exitMonth?: number` ("integer ≥ 1; > term is clamped, not an error"), `exitUnit?: 'years' | 'months'` ("Default 'years'"), `appreciationPct?: number` ("−10 ≤ x ≤ 25; used only when no rental"), `sellingCostsPct?: number` ("0 ≤ x ≤ 15. Default 7; used only when no rental") and `tax?: SaleTaxAssumptions | null`.
  - Add `sale?: SaleAssumptions | null` to `LoanScenario`.
  - Extend the `FieldError['field']` union with `` `sale.${'exitMonth' | 'appreciationPct' | 'sellingCostsPct'}` `` and `` `sale.tax.${'capitalGainsRatePct' | 'recaptureRatePct'}` ``.
  - Export the new types from `libs/shared/calculations/src/index.ts` if the file lists types explicitly.
- [X] T003 Write the test first in `libs/shared/calculations/src/lib/apply-scenario-patch.spec.ts`, covering:
  - `{ sale: { exitMonth: 90 } }` merges into an existing `sale` and keeps its other fields, including `tax`.
  - `sale: null` clears it.
  - A patch without `sale` leaves it untouched.
  - The existing rental and principal rules are unchanged.
- [X] T004 Implement the shallow merge for `sale` in `libs/shared/calculations/src/lib/apply-scenario-patch.ts`, mirroring the `rental` block: `if ('sale' in patch && patch.sale != null) next.sale = scenario.sale ? { ...scenario.sale, ...patch.sale } : patch.sale;`. Make T003 pass. (Depends on T002, T003.)
- [X] T005 [P] Add `TagIcon` in `libs/shared/ui/src/lib/icons.tsx`. Use the same `Icon` wrapper as `KeyIcon`; the path is a price tag: `<path d="M3 12V4h8l10 10-8 8L3 12z" /><circle cx="7.5" cy="7.5" r="1.5" />`. Export it from `libs/shared/ui/src/index.ts`.
- [X] T006 [P] In `libs/shared/ui/src/lib/deal/page-profiles.ts`:
  - Add `'sale'` to `PageProfile['pageId']`.
  - Add `export const SALE_PROFILE: PageProfile = { pageId: 'sale', pinned: ['homePrice', 'downPayment', 'annualInterestRatePct'], muted: [], requires: [{ field: 'homePrice', unlocks: 'sale price' }] };`, per contracts/sale-ui.md.
  - Export it wherever `PRO_FORMA_PROFILE` is exported (check `libs/shared/ui/src/lib/deal/index.ts`).
- [X] T007 Write the test first in `libs/shared/data-access/src/lib/deal-edits-provider.spec.tsx`. It covers `editSale(patch, source)`:
  - The edit writes `scenario.sale` merged through `applyScenarioPatch`.
  - It records a `ChangeRecord` with `field: 'sale'` and `label: 'Sale inputs'`.
  - Undo restores the previous `sale`, including `undefined`.
  - A second edit within 800 ms from the same source coalesces into one record.
- [X] T008 Implement `editSale` in `libs/shared/data-access/src/lib/deal-edits-provider.tsx`, then make T007 pass. (Depends on T004, T007.) Research R10 covers the design:
  - Add `editSale(patch: Partial<SaleAssumptions>, source: DealEditSource): void` to the `DealEdits` interface.
  - Widen `ChangeField` to `DealFieldKey | 'rental' | 'sale'`.
  - Implement it via the existing `record(...)` helper with `{ sale: patch }`.
  - `oldValue` and `newValue` are the whole previous and next `sale`. In `displayOf`, return `''` for `'sale'` (as for `'rental'`), and in `rawOf` return `scenario.sale ?? null` for it.
  - In `libs/shared/ui/src/lib/deal/deal-change-toast.tsx`, add the toast title: `change.field === 'sale' ? 'Sale inputs changed'`, next to the existing `'rental'` case, so the toast never reads "Sale inputs changed  → ".
  - Extend T007 to assert this title in `libs/shared/ui/src/lib/deal/` (the toast's spec, if one exists, or a new `deal-change-toast.spec.tsx`).
- [X] T009 Write the test first by adding a cross-check to `libs/deal-analyzer/calculations/src/lib/project-exit.spec.ts`. For `REF` and every `generatedScenarios(25)` scenario with a valid rental:
  - `annualCashToInvestor(s, computeSchedule(s), k)` equals `projectExit(s, schedule, k).result.years.map((y) => y.cashToInvestor)` for k ∈ {1, 7, 30}.
  - Import `annualCashToInvestor` relatively from `./cash-to-investor`.
- [X] T010 Create `libs/deal-analyzer/calculations/src/lib/cash-to-investor.ts` with `annualCashToInvestor(scenario, schedule, years): number[]`. (Depends on T009.)
  - It extracts the per-year logic from `projectExit` (research R5). The in-term years use `projectRental(...).years[y - 1]` for NOI and debt service.
  - Years past the term use `operatingYear` with debt service 0.
  - `extraPrincipal = roundCents(Σ schedule.periods.slice((y−1)×12, y×12).extraPrincipalApplied)`.
  - `cashToInvestor = roundCents(noi − debtService − extraPrincipal)`. Use NOI exactly as `projectWealth` does, i.e. `roundCents((gsi − opex) × 12)`.
  - Refactor `libs/deal-analyzer/calculations/src/lib/project-exit.ts` to take `cashToInvestor` from it. Every existing `project-exit.spec.ts` and `project-wealth.spec.ts` expectation must stay unchanged and green, as must T009.
  - Do NOT export the helper from `index.ts`.
- [X] T011 [P] Export the existing `downPaymentDollars(scenario)` from `libs/deal-analyzer/calculations/src/lib/analyze-deal.ts`, with no behaviour change. Keep it internal to the lib, so it is not added to `index.ts` unless the UI needs it (it does not).
- [X] T012 Add the derived types to `libs/deal-analyzer/calculations/src/lib/types.ts`, exactly as data-model §B and §C, and export them from the lib's `index.ts`:
  - `ResolvedSaleAssumptions`
  - `SaleBreakEven` (the `breakEven` object)
  - `SaleTaxEstimate`
  - `SaleResult`
  - `SaleAnalysis`
- [X] T013 Create the route and nav with a placeholder view:
  - Create `libs/deal-analyzer/ui/src/lib/sale-view.tsx`, exporting `SaleView`. For now it renders only the `PageHeader` with eyebrow "Analysis", title "Sale Profit & Exit Analyzer", lede "Should you sell now? Profit, break-even price and an optional tax estimate." and note "Simplified model, not tax advice.".
  - Export it from `libs/deal-analyzer/ui/src/index.ts`.
  - Create `apps/amortization-calculator/src/app/sale/page.tsx`. It has `metadata = { title: 'Sale Profit & Exit Analyzer', description: 'Sell at a chosen month: net sale proceeds, total net profit, break-even sale price and an optional tax estimate.' }` and renders `<SaleView />`, modelled on `apps/amortization-calculator/src/app/pro-forma/page.tsx`.
  - Add `{ id: 'sale', label: 'Sale Profit', href: '/sale', icon: <TagIcon /> }` after `pro-forma` in `apps/amortization-calculator/src/app/_nav.tsx`.

**Checkpoint**: `/sale` loads with its title, and all existing tests are green.

---

## Phase 3: User Story 1 — Is selling at this point a real profit? (P1) 🎯 MVP

**Goal**: the sale waterfall, cumulative cash flow, profit, return on cash and verdict for any exit
month, for both rental and non-rental scenarios.

**Independent Test**: on `REF` with a 7-year exit, `/sale` shows net proceeds $199,845.65, cash flow
$51,574.90, profit $151,420.55, return 151.42% and the verdict "Profit". This matches `/pro-forma`
at 7 years.

### Tests for User Story 1 (write first; they must fail)

- [X] T014 [P] [US1] Create `libs/deal-analyzer/calculations/src/lib/validate-sale.spec.ts`. It covers:
  - **Defaults and resolution**:
    - (a) `resolveSaleAssumptions` with no `sale` gives `exitMonth = 84` for `REF` (hold 7 × 12) and `84` for `REF_NR`, with `exitUnit 'years'` and `sellingCostsPct 7`.
    - (b) Setting `rental.exit.holdYears: 5` makes the default 60. An invalid stored hold (40, or 7.5) falls back to 84, with `clampedFrom: null`.
    - (c) For a rental, appreciation and selling costs come from `rental.appreciationPct` and `rental.exit.sellingCostsPct`, and `sale.appreciationPct` and `sale.sellingCostsPct` are ignored. For a non-rental they come from `sale.*`, with defaults 0 and 7.
    - (d) `exitMonth: 400` with `termMonths: 360` resolves to 360 with `clampedFrom: 400`. `exitMonth: 360` gives `clampedFrom: null`.
    - (e) An invalid `exitUnit` falls back to `'years'`.
  - **Validation errors**:
    - (f) `validateSale` errors: `exitMonth` 0, 7.5, `NaN` and `-1` each give `sale.exitMonth`, but 400 does not.
    - (g) `sale.appreciationPct` 26 or −11 gives an error.
    - (h) `sale.sellingCostsPct` 16 or −1 gives an error.
    - (i) `tax.capitalGainsRatePct` 41 and `tax.recaptureRatePct` −1 each give an error, even when `enabled: false`.
    - (j) A missing field gives no error, and the validator never throws on garbage values such as strings.
- [X] T015 [P] [US1] Create `libs/deal-analyzer/calculations/src/lib/analyze-sale.spec.ts` (pre-tax part). It covers:
  - **Reference vectors**:
    - (a) The rental m=84, m=90 and m=12 rows of the reference-vector table, exactly: salePrice, sellingCosts, remainingBalance, netSaleProceeds, cumulativeCashFlow, totalCashInvested 100000 and totalNetProfit.
    - (b) The `REF_NR` m=84 row, with `cumulativeCashFlow 0` and `mode 'non-rental'`.
  - **Returns and verdict**:
    - (c) `returnOnCash.value` ≈ 1.5142055 at m=84. With 0% down and zero closing and rehab, the value is null and the reason is `'No cash invested — return is undefined.'`.
    - (d) The verdict is 'profit' at m=84 and 'loss' at m=12. It is 'break-even' when the cents-rounded profit is exactly 0; construct this by setting `homePrice` so that profit rounds to 0, or by unit-testing the verdict helper.
  - **Not-applicable cases**:
    - (e) `homePrice: null` gives `result null` and naReason `'Enter a purchase price to model a sale.'`.
    - (f) `sale.exitMonth: 0` (rental or not) gives `result null` and `'Fix the sale inputs to see the result.'`. So does an invalid `rental.exit.sellingCostsPct: 20`, and so does a non-rental `sale.appreciationPct: 30`.
    - (g) An invalid stored `rental.exit.holdYears: 40` or `rental.wealth.forcedAppreciation: -5` does NOT block the result.
  - **Edge cases**:
    - (h) An exit past an early payoff (a recurring $2,000 extra payment, m=360) gives `remainingBalance 0`, and months after payoff add NOI with no debt service.
    - (i) `forcedAppreciationNote` is true when `rental.wealth.forcedAppreciation > 0`.
  - **Invariants** (data-model §C), over `generatedScenarios(50)` (with a valid rental) × m ∈ {1, 13, 84, 90, termMonths}:
    - (j) Invariant 1 (the profit identity, ±0.01).
    - (k) Invariant 3, run on the non-rental variants.
    - (l) Invariant 4 (SC-002): for every k from 1 to 30, on `REF` and on every `generatedScenarios(50)` scenario, every equality with `projectExit(s, schedule, k).result` holds to the cent. First override `rental.wealth.forcedAppreciation` to 0, because every 4th generated scenario stores $25,000 and the pages intentionally differ there (spec Assumptions). Only check k where 12k ≤ `termMonths`; all generated terms are 360 months.

### Implementation for User Story 1

- [X] T016 [US1] Create `libs/deal-analyzer/calculations/src/lib/validate-sale.ts` (research R1, R2; data-model §A, §B). Make T014 pass.
  - Exports:
    - `DEFAULT_SALE = { exitUnit: 'years', appreciationPct: 0, sellingCostsPct: 7 } as const`
    - `DEFAULT_SALE_TAX = { enabled: false, capitalGainsRatePct: 15, recaptureRatePct: 25 } as const`
    - `SALE_NON_RENTAL_DEFAULT_MONTHS = 84`
    - `validateSale(scenario): FieldError[]`
    - `resolveSaleAssumptions(scenario): ResolvedSaleAssumptions`
  - **Validation rules** use the same table pattern as `validate-exit.ts`:
    - "exitMonth: finite integer ≥ 1 — 'Exit must be a whole number of months, at least 1.'"
    - "appreciationPct: −10 ≤ x ≤ 25 — 'Appreciation must be between −10% and 25%.'"
    - "sellingCostsPct: 0 ≤ x ≤ 15 — 'Selling costs must be between 0% and 15%.'"
    - "tax.capitalGainsRatePct: 0 ≤ x ≤ 40 — 'Capital gains rate must be between 0% and 40%.'"
    - "tax.recaptureRatePct: 0 ≤ x ≤ 40 — 'Recapture rate must be between 0% and 40%.'"
  - **Resolution**:
    - The default `exitMonth` is `resolveExitAssumptions(rental).holdYears * 12` with a rental, but only when `validateExit(rental)` has no `rental.exit.holdYears` error. Otherwise use `DEFAULT_EXIT.holdYears * 12` (84). It is also 84 without a rental. A defaulted value never sets `clampedFrom`.
    - Clamp to `[1, scenario.termMonths]`. Set `clampedFrom` only when a valid stored value exceeds the term.
    - With a rental, appreciation is `rental.appreciationPct ?? 0` and selling costs are `resolveExitAssumptions(rental).sellingCostsPct`.
    - `tax.landValuePct` is `resolveWealthAssumptions(rental).landValuePct` with a rental, otherwise null.
  - Export the new symbols from `libs/deal-analyzer/calculations/src/index.ts`.
- [X] T017 [US1] Create `libs/deal-analyzer/calculations/src/lib/analyze-sale.ts` with `analyzeSale(scenario, schedule): SaleAnalysis` (pre-tax only; `breakEven` and `tax` are filled in by US2 and US3). It covers research R3–R6. Make T015 pass. (Depends on T010, T011, T016.)
  - **Not-applicable checks**, in order:
    - No price gives `'Enter a purchase price to model a sale.'`.
    - Any non-tax `validateSale` error, or (rental) a `validateExit` error on `rental.exit.sellingCostsPct`, gives `'Fix the sale inputs to see the result.'`. Do not check `rental.appreciationPct` here. `validateRental` owns it, and the precondition (an empty `validateRental`) already excludes it; the view reports it as "Fix the rental inputs to see the result.", with the inline error on the Sale panel's Appreciation field.
  - **Sale waterfall**:
    - `salePrice = roundCents(homePrice × (1 + a/100) ** (m / 12))`
    - `sellingCosts = roundCents(salePrice × s / 100)`
    - `remainingBalance = m > periods.length ? 0 : periods[m − 1].remainingBalance`
    - `netSaleProceeds = roundCents(salePrice − sellingCosts − remainingBalance)`
  - **Cash flow**: add an internal `cumulativeCashFlow(scenario, schedule, m)` in the same file (research R5).
    - Take Σ `annualCashToInvestor(…, floor(m/12))`.
    - For each remaining month k from `floor(m/12) × 12 + 1` to m, add the unrounded `(gsiMonthly − opexMonthly)` from `operatingYear(scenario, ceil(k/12))`.
    - From each of those months subtract `(monthlyPrincipalAndInterest + (period.pmiApplies ? monthlyPmiAmount : 0))` and subtract `period.extraPrincipalApplied`. Use 0 for both when there is no period, i.e. after payoff.
    - Round once at the end. The result is 0 when `mode 'non-rental'`.
  - **Cash invested**: `analyzeDeal(...).totalCashInvested` with a rental, otherwise `roundCents(downPaymentDollars(scenario))`.
  - **Profit and verdict**:
    - `totalNetProfit = roundCents(net + cf − invested)`
    - `returnOnCash` is `profit / invested` when `invested > 0`, otherwise null with the reason.
    - The verdict is `> 0 'profit'`, `< 0 'loss'` and `=== 0 'break-even'`.
  - **Temporary placeholders**: temporarily set `breakEven: { salePrice: 0, anyPrice: false, cushion: 0, pctOfPurchase: 0 }`, `tax: null` and `taxNaReason: null`. Mark them with `// US2` and `// US3` comments.
  - Export `analyzeSale` from `index.ts`.
- [X] T018 [US1] Create `libs/deal-analyzer/ui/src/lib/use-sale-editor.ts` (research R1, R10). It returns:
  - `setExitMonth(months)`: calls `editSale({ exitMonth })`.
  - `setExitUnit(unit)`: calls `editSale({ exitUnit })`.
  - `setAppreciation(pct)`: calls `editRental({ appreciationPct }, 'sheet')` with a rental, otherwise `editSale({ appreciationPct }, 'sheet')`.
  - `setSellingCosts(pct)`: calls `editRental({ exit: { ...rental.exit, sellingCostsPct } }, 'sheet')` with a rental, otherwise `editSale({ sellingCostsPct }, 'sheet')`.
  - `setGrowth(patch)`: calls `editRental(patch, 'sheet')`, using `GrowthPatch` from `./use-wealth-editor`.
  - `setTax(patch: Partial<SaleTaxAssumptions>)`: calls `editSale({ tax: { ...sale?.tax, ...patch } }, 'sheet')`.
  - `setLandShare(pct)`: calls `editRental({ wealth: { ...rental.wealth, landValuePct } }, 'sheet')`.
  - Model it on `libs/deal-analyzer/ui/src/lib/use-exit-editor.ts`.
- [X] T019 [US1] Create `libs/deal-analyzer/ui/src/lib/sale-assumptions-panel.tsx` with `data-testid="sale-assumptions"`, per contracts/sale-ui.md. No input passes `min` or `max`.
  - **Exit timing**:
    - `SegmentedOptions` with `label="Exit unit"`, items "Years" and "Months", and `data-testid="sale-exit-unit"`.
    - `NumberField` "Sell after" with `data-testid="sale-exit"`. Years mode shows `exitMonth / 12` (at most 2 decimals) with the suffix "years" and writes `Math.round(v × 12)`. Months mode shows `exitMonth` with the suffix "months". The step is 1 in both modes.
    - When `clampedFrom != null`, show the note `data-testid="sale-exit-clamped"`: "Sale moved to month {exitMonth}, the end of the loan term."
  - **Sale**:
    - "Appreciation" (%/yr).
    - "Selling costs" (%, step 0.5), with the description "Agent commissions, closing/transfer costs and make-ready prep".
    - With a rental, both descriptions add "Shared with Hold & Exit".
  - **Growth** (rental only): "Rent growth" and "Expense growth" (%/yr).
  - Inline errors come from `validateSale` plus the relevant `validateRental` and `validateExit` errors, keyed by field. Reuse the error-display pattern from `exit-assumptions-panel.tsx`.
  - Leave a clearly marked slot for the US3 tax controls.
- [X] T020 [US1] Create `libs/deal-analyzer/ui/src/lib/sale-summary.tsx` with `data-testid="sale-summary"`, per contracts/sale-ui.md.
  - **Heading** follows the unit: "Sale after {N} years" when `exitMonth % 12 === 0`, "Sale after {y} yr {m} mo" otherwise, or "Sale after {N} months" in Months mode.
  - **Verdict**: a `MetricBadge` with `data-testid="sale-verdict"`. The text is always "Profit", "Loss" or "Break-even".
  - **Waterfall**: a captioned `<table>` with scoped row headers. The rows and testids are `sale-price`, `sale-selling-costs` (shown negative), `sale-balance` (shown negative), `sale-net-proceeds`, `sale-cash-flow`, `sale-invested` (shown negative), `sale-profit` and `sale-return`.
    - `sale-cash-flow` has the caption "No rental: cash flow not included" when non-rental.
    - `sale-return` shows "151.42%" via `percent2`, or "N/A" plus the reason.
  - **Notes**: "Excludes holding costs" for a non-rental. When `forcedAppreciationNote` is set: "Hold & Exit's sale price also includes forced appreciation; this page compounds the purchase price only."
  - Use the existing formatters from `shared-ui` (`currency`, `percent2`).
- [X] T021 [US1] Wire up `libs/deal-analyzer/ui/src/lib/sale-view.tsx`, modelled on `pro-forma-view.tsx`.
  - Use `useMemo` over `activeScenario`: `validateScenario`, then `computeSchedule`, then `validateRental` (when there is a rental), then `analyzeSale`.
  - **`sale-na` reasons**, first that applies:
    - "Fix the loan inputs to see the result."
    - "Fix the rental inputs to see the result." (rental only)
    - `analysis.naReason`
    - Render them via `InputsMessage` with `data-testid="sale-na"`.
  - **Deal Strip**: `profile={SALE_PROFILE}` and headline `{ label: 'Net profit', value: result?.totalNetProfit ?? null, naReason, format: currency, betterWhen: 'higher' }`.
  - **Sections**: "Assumptions" (always, since it works without a rental) and "Result".
  - **Footer link**: "See IRR and year-by-year returns on Hold & Exit →" to `/pro-forma`, using Next `Link`.
- [X] T022 [US1] Create the e2e test `apps/amortization-calculator-e2e/src/sale.spec.ts`, covering contracts/sale-ui.md § E2E 1, 2, 3 and 5. Reuse the `helpers.ts` utilities for entering the reference property.
  - **1**: the nav item `nav-sale` leads to `/sale`. The title is "Sale Profit & Exit Analyzer · Companion" and the h1 matches.
  - **2**: on `REF` with the default 7 years, the US1 84-month figures and the verdict "Profit" appear. Then `/pro-forma` `exit-profit` shows the same $151,420.55.
  - **3**: switch to Months and enter 90; the 90-month figures appear. Switching back to Years shows "7.5".
  - **5**: a new scenario has no rental. Set the price to $400,000, 25% down and appreciation 3.5. Cash flow is $0.00 with its caption, and profit is $99,845.65.
  - Also: set exit 400 months to see the clamp note.

**Checkpoint**: US1 is fully usable and shippable as an MVP.

---

## Phase 4: User Story 2 — Break-even sale price (P2)

**Goal**: the minimum sale price for $0 profit, the cushion and the percentage of purchase price.

**Independent Test**: on `REF` at 84 months, break-even is $346,093.91 and the cushion is
$162,817.80. At 12 months the cushion is −$7,926.33. At 360 months the card shows "$0 — Profitable
at any sale price".

- [X] T023 [P] [US2] Extend `libs/deal-analyzer/calculations/src/lib/analyze-sale.spec.ts`:
  - **Reference vectors**:
    - (a) The break-even column of the reference vectors: 346,093.91 at m=84, 337,347.84 at m=90, 421,926.33 at m=12 and 401,550.80 for `REF_NR` at m=84.
    - (b) Cushion 162,817.80 at m=84 and −7,926.33 at m=12.
    - (c) `pctOfPurchase` ≈ 346,093.91 / 400,000 at m=84.
    - (d) At m=360 on `REF`: `breakEven.salePrice` is 0 and `breakEven.anyPrice` is true.
  - **Invariant 2 (SC-004)**: for `generatedScenarios(50)` × m ∈ {1, 84, termMonths} where `!anyPrice`, `roundCents(P − roundCents(P × s/100) − B + CF − I)` at `P = breakEven.salePrice` is within ±0.01 of 0.
- [X] T024 [US2] Replace the `// US2` placeholder in `libs/deal-analyzer/calculations/src/lib/analyze-sale.ts` (research R7), then make T023 pass:
  - `raw = (B + I − CF) / (1 − s/100)`
  - `salePrice = raw < 0 ? 0 : roundCents(raw)` and `anyPrice = raw < 0`
  - `cushion = roundCents(result.salePrice − breakEven.salePrice)`
  - `pctOfPurchase = breakEven.salePrice / homePrice`
- [X] T025 [US2] Create `libs/deal-analyzer/ui/src/lib/break-even-card.tsx` with `data-testid="sale-break-even"`:
  - `sale-break-even-price`
  - `sale-cushion`: signed currency with the wording "{amount} above break-even" or "{amount} below break-even"
  - `sale-break-even-pct`: "{x}% of purchase price"
  - When `anyPrice`, it shows "$0 — Profitable at any sale price".
  - Render it in `sale-view.tsx` under a "Break-even" `SectionHeader` when `result` exists.
- [X] T026 [US2] Add the e2e for contracts § E2E 4 to `apps/amortization-calculator-e2e/src/sale.spec.ts`:
  - At 7 years: break-even $346,093.91 and cushion $162,817.80 above.
  - At 1 year: verdict "Loss", break-even $421,926.33 and $7,926.33 below.
  - At 360 months: "Profitable at any sale price".

**Checkpoint**: US1 and US2 both work on their own.

---

## Phase 5: User Story 3 — Illustrative tax on the sale (P3)

**Goal**: an optional, off-by-default capital gains and depreciation recapture estimate, and the
after-tax net profit.

**Independent Test**: on `REF` at 84 months with tax On and the defaults, recapture tax is
$20,363.63, capital gains tax $10,993.18 and after-tax profit $120,063.74. With tax Off, no tax UI
shows.

- [X] T027 [P] [US3] Extend `libs/deal-analyzer/calculations/src/lib/analyze-sale.spec.ts`:
  - **Default off**:
    - (a) With tax disabled (the default), `tax` is null, `taxNaReason` is null and the pre-tax figures are identical.
  - **Reference vectors**:
    - (b) The `REF` m=84 values with tax enabled: depreciableBasis 320,000.00, depreciationTaken 81,454.52, adjustedBasis 318,545.48, taxableGain 154,742.41, recapturedGain 81,454.52, recaptureTax 20,363.63, capitalGain 73,287.89, capitalGainsTax 10,993.18, totalTax 31,356.81, afterTaxNetProfit 120,063.74 and shortTermWarning false.
    - (c) The `REF_NR` m=84 values with tax enabled: depreciableBasis null, depreciationTaken 0, adjustedBasis 400,000, gain 73,287.89, recaptureTax 0, capitalGainsTax 10,993.18 and afterTax 88,852.47.
  - **Edge cases**:
    - (d) A loss: at m=12, assert `taxableGain ≤ 0`, both taxes are 0 and `afterTaxNetProfit` equals `totalNetProfit` (−7,371.49).
    - (e) m=12 gives `shortTermWarning true`, and m=13 gives false.
    - (f) Closing costs $8,000 plus rehab $20,000 raise the basis and the adjusted basis by the documented amounts.
    - (g) With 27.5 years or more of depreciation (term 480 months, m=480), `depreciationTaken` is capped at the basis.
    - (h) Tax enabled with `capitalGainsRatePct: 50`, or `rental.wealth.landValuePct: 100`, gives `tax: null` and `taxNaReason: 'Fix the tax inputs to see the estimate.'`, and the pre-tax result is unchanged.
  - **Invariants**:
    - (i) Invariant 5: at m = 12k for k ∈ {1, 7, 10}, `depreciationTaken` equals Σ `projectWealth(s, schedule, { horizonYears: k }).years[1..k].depreciation`.
    - (j) Invariant 6.
- [X] T028 [US3] Replace the `// US3` placeholder in `libs/deal-analyzer/calculations/src/lib/analyze-sale.ts` (research R8; contracts/sale-calculations.md), then make T027 pass:
  - The estimate runs only when the resolved `tax.enabled` is true.
  - **Validity**: invalid `sale.tax.*` rates, or (rental) a `validateWealth` error on `rental.wealth.landValuePct`, give `taxNaReason`.
  - **Basis and depreciation**:
    - `basis = roundCents(price × (1 − land/100) + rehab)` for a rental, otherwise null.
    - `annualDep = roundCents(basis / 27.5)`. Reuse the `DEPRECIATION_YEARS` constant from `project-wealth.ts`, exporting it internally if needed.
    - `depreciationTaken = min(basis, roundCents(annualDep × m / 12))`, or 0 for a non-rental.
    - `adjustedBasis = roundCents(price + closing + rehab − depreciationTaken)`, where closing and rehab are 0 for a non-rental.
  - **Gain and taxes**:
    - `taxableGain = roundCents(salePrice − sellingCosts − adjustedBasis)`
    - `recapturedGain = clamp(taxableGain, 0, depreciationTaken)`
    - `recaptureTax = roundCents(recapturedGain × recapture/100)`
    - `capitalGain = max(0, roundCents(taxableGain − recapturedGain))`
    - `capitalGainsTax = roundCents(capitalGain × cg/100)`
    - `totalTax = roundCents(recaptureTax + capitalGainsTax)`
    - `afterTaxNetProfit = roundCents(totalNetProfit − totalTax)`
    - `shortTermWarning = m ≤ 12`
- [X] T029 [US3] Fill the tax slot in `libs/deal-analyzer/ui/src/lib/sale-assumptions-panel.tsx`:
  - Add `SegmentedOptions` with `label="Estimate taxes on sale"`, items "Off" and "On", `data-testid="sale-tax-toggle"`, and Off by default.
  - When On, show "Capital gains rate" (%), plus "Depreciation recapture rate" (%) and "Land value share" (%) for rentals only, with "Land value share" described as "Shared with Wealth Projection and Hold & Exit".
  - Show the label "Illustrative planning estimate — not tax advice."
  - Inline errors come from the `sale.tax.*` and `rental.wealth.landValuePct` errors.
  - Wire the controls to `setTax` and `setLandShare` from `use-sale-editor.ts`.
- [X] T030 [US3] Create `libs/deal-analyzer/ui/src/lib/sale-tax-panel.tsx` with `data-testid="sale-tax"`:
  - **Heading and label**: the heading repeats "Illustrative planning estimate — not tax advice."
  - **Rows**, in a captioned table: depreciation taken (rental), adjusted basis, taxable gain, recapture tax (rental), capital gains tax, total tax, and `sale-after-tax-profit`.
  - **Short-hold note** `sale-tax-short-term`, when `shortTermWarning`: "Held 1 year or less: gains are usually taxed at ordinary income rates — set the capital gains rate accordingly."
  - When `taxNaReason` is set, every row shows "—" and the reason appears.
  - Render it in `sale-view.tsx` under a "Tax estimate" `SectionHeader` only when tax is enabled and `result` exists.
- [X] T031 [US3] Add the e2e for contracts § E2E 6 to `apps/amortization-calculator-e2e/src/sale.spec.ts`:
  - With the toggle Off by default, `sale-tax` is absent.
  - Switch it On, and the label plus the US3 84-month figures appear, with after-tax profit $120,063.74.
  - Set the capital gains rate to 50: an inline error appears and the tax rows show "—", while `sale-profit` still shows $151,420.55.

**Checkpoint**: all three stories work.

---

## Phase 6: Polish & Cross-Cutting

- [X] T032 [P] Add `'/sale'` to the page lists in the following e2e specs. Update the snapshots only for the new `/sale` entries, and note them under "Baseline notes".
  - `apps/amortization-calculator-e2e/src/a11y.spec.ts`
  - `apps/amortization-calculator-e2e/src/deal-strip.spec.ts`:
    - Add `'/sale'` to the `PAGES` array (~line 10).
    - Add the pair `['/sale', ['homePrice', 'downPayment', 'annualInterestRatePct']]` to the `[path, pinnedChips]` list (~line 240), matching `SALE_PROFILE.pinned`.
  - `apps/amortization-calculator-e2e/src/deal-bar.spec.ts`
  - `apps/amortization-calculator-e2e/src/setup-mode.spec.ts`
  - `apps/amortization-calculator-e2e/src/visual.spec.ts`. Regenerate only the new `/sale` snapshots with `--update-snapshots` scoped to `/sale`.
  - Also update `apps/amortization-calculator-e2e/src/navigation.spec.ts`, if it asserts the nav item count or order.
- [X] T033 [P] Add the SC-003 timing test to `apps/amortization-calculator-e2e/src/performance.spec.ts`, modelled on its `/pro-forma` case. On `/sale`, editing "Sell after" from 7 to 8 updates `sale-profit` within 1000 ms.
- [X] T034 [P] Add the 375 px test to `apps/amortization-calculator-e2e/src/sale.spec.ts` (contracts § E2E 7), with the tax estimate On. At viewport width 375, `document.documentElement.scrollWidth <= 375`.
- [X] T035 [P] Add the `/sale` row to the routes table in `specs/003-feature-pages-navigation/contracts/routes-and-navigation.md`, following the `/pro-forma` row.
- [X] T036 [P] Document the new public APIs in the library READMEs:
  - `libs/deal-analyzer/calculations/README.md`: `analyzeSale`, `validateSale`, `resolveSaleAssumptions` and the defaults
  - `libs/deal-analyzer/ui/README.md`: `SaleView`
  - `libs/shared/data-access/README.md`: `editSale`
  - `libs/shared/calculations/README.md`: `SaleAssumptions`
- [X] T037 Run the full gate. (Depends on all the other tasks.)
  - Run `npx nx run-many -t lint test typecheck build -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`.
  - Then run the whole e2e suite against the :3200 prod build (quickstart §3).
- [X] T038 Execute the `specs/013-sale-profit-exit-analyzer/quickstart.md` §4 manual walk-through once, and record the outcome under "Baseline notes" (Constitution: quickstart must run before done).

---

## Dependencies & Execution Order

```text
T001 → Phase 2 ─┬─ T002 → T003 → T004 → T007 → T008
                ├─ T005 [P], T006 [P], T011 [P]
                ├─ T009 → T010
                ├─ T012 (after T002)
                └─ T013 (after T005, T006)
Phase 2 done → US1 (T014–T022) → US2 (T023–T026) → US3 (T027–T031) → Polish (T032–T038)
```

- **US1** needs all of Phase 2. T016 must come before T017 (both are in validate-sale and analyze-sale), and T017 before T018–T021, with T021 before T022.
- **US2** and **US3** each depend only on US1's `analyze-sale.ts` and `sale-view.tsx`. They edit the same two files, so run them one after the other (US2 first), not in parallel.
- **Within a story**, the tests come first (they must fail), then the calculations, then the UI, then e2e.

## Parallel Examples

- **Phase 2**: T005 (icon), T006 (profile), T011 (export) and T009 (cross-check test) run together after T002.
- **US1**: T014 (`validate-sale.spec.ts`) and T015 (`analyze-sale.spec.ts`) run together. After T017, T019 (panel) and T020 (summary) can be built in parallel; they are different files, and both depend on T018 or T017 only.
- **US2**: T023 (the test) runs alongside the T025 card markup, which only needs the T012 types.
- **US3**: T027 (the test) runs alongside the T030 panel markup.
- **Polish**: T032, T033, T034, T035 and T036 are all [P].

## Implementation Strategy

1. **MVP**: complete Phases 1–3 (T001–T022). This ships `/sale` with the profit answer for rental
   and non-rental scenarios. Stop and validate it against the quickstart rows for US1.
2. **Increment 2**: US2 adds the break-even price (T023–T026).
3. **Increment 3**: US3 adds the optional tax estimate (T027–T031).
4. **Finish**: polish and the full gate (T032–T038). Then run `/speckit-analyze` before or alongside
   `/speckit-implement` (Constitution V: this feature has three user stories).

## Baseline notes

_(Filled in during T001, T032, T037 and T038.)_

- **T001 (2026-11-18)**: The workspace uses **npm**, not pnpm (`packageManager: npm@11.12.1`). The docs were corrected to `npm ci` / `npx nx`. After `npm ci` in the worktree, the baseline `lint test typecheck` run passed for all 7 projects.
- **T011**: `analyze-deal.ts` is re-exported with `export *`, so `downPaymentDollars` is now part of the lib's public API. This is harmless, since it is a pure helper with no behaviour change.
- **T008**: The toast title moved into an exported, tested `dealChangeTitle()` in `deal-change-toast.tsx`. Undo of a sale edit after another change blanks the current keys first, so the restore is exact even though `sale` merges shallowly.
- **Order note**: the US3 tax controls (T029) were written into `sale-assumptions-panel.tsx` together with T019, because they share the file, and `BreakEvenCard` and `SaleTaxPanel` (T025, T030) were written alongside T021. The US2 and US3 calculation tests (T023, T027) were still written first and seen failing (14 failures) before T024 and T028.
- **E2E port**: :3200 was already held by another process, so the e2e ran against this branch's prod build on **:3213** (`BASE_URL=http://127.0.0.1:3213`).
- **E2E bug found and fixed**: a negated $0 balance rendered as "-$0.00". `signedMoney` now normalises −0, and a unit test was added (`sale-summary.spec.ts`).
- **T032**: `/sale` was added to `a11y`, `deal-bar`, `visual`, `setup-mode` and `deal-strip` (`PAGES` plus the pinned-chips pair). The visual spec has no screenshot baselines, so no snapshots needed updating. `navigation.spec.ts` asserts no item count, so it was unchanged.
- **T037 (2026-11-19)**:
  - `lint test typecheck build` passed for all 7 projects. Unit tests: shared-calculations 115, shared-data-access 24, shared-ui 34, deal-analyzer-calculations 261, deal-analyzer-ui 6.
  - Full e2e: 537 passed, 8 skipped, 1 failed. The failure was the Firefox dark-theme axe scan, on `/amortization`'s schedule scroll region (`scrollable-region-focusable`), which this feature does not touch. It passed 3 of 3 when re-run alone (`--repeat-each=3`), so it is a pre-existing flake.
  - `sale.spec.ts` re-run after the final edits: 30 passed on chromium, firefox and webkit.
- **T038**: the quickstart §4 walk-through was executed via automation. `sale.spec.ts` and `performance.spec.ts` cover every row: nav, 7-year figures and the `/pro-forma` match, 90 months and 7.5 years, the 1-year loss and break-even, the 400 → 360 clamp, tax on, invalid tax rate, non-rental, 375 px, and reload persistence.
