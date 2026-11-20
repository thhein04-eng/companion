---
description: 'Task list for 014-refinance-brrrr'
---

# Tasks: Refinance & BRRRR Modeling

**Input**: Design documents from `/specs/014-refinance-brrrr/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Tests are included. Constitution Principle I requires cent-level unit tests for every
calculation, and the quality gates require e2e. Write each test task first, then confirm it fails
before you implement it.

**Conventions** (these apply to every task):

- Run every command from the worktree root
  `/Users/t_hein/Projects/companion/.claude/worktrees/014-refinance-brrrr` on branch
  `014-refinance-brrrr`, using `npx nx`. This is an npm workspace, not pnpm. `npm ci` has already
  run in this worktree.
- **Per-task gate (constitution)**: before ticking a task, run
  `npx nx run-many -t lint test typecheck -p <touched projects>`.
  - UI and e2e tasks also run the relevant e2e against this branch's own prod build on a free port
    (quickstart §2). Check the port with `lsof -iTCP:<port> -sTCP:LISTEN` first, and never use
    :3000, which is usually another checkout's dev server.
- Cross-lib imports use package names only (`shared-calculations`, `shared-data-access`,
  `shared-ui`, `deal-analyzer-calculations`). `refinance-math.ts` stays internal: import it
  relatively and never export it from `index.ts`.
- **Rounding** (research R3): money is cents-rounded with `roundCents` at each stored figure. Monthly
  P&I is `roundCents(monthlyPayment(...))` and annual debt service is `12 × that payment`. Ratios
  (`capitalRecycledPct`, cash-on-cash) stay unrounded.
- Validated `NumberField`s MUST NOT pass `min`/`max`. The SDK clamps on commit and would hide the
  inline errors.
- **Reference deals** (the fixtures from T009): `brrrrReference()` is the BRRRR deal and
  `rateDropReference()` is the $300,000 rate-drop loan, both exactly as in
  [contracts/refinance-calculations.md § Reference vectors](./contracts/refinance-calculations.md#reference-vectors).
  Every expected number in a test comes from that table, never from running the code under test.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: The task can run in parallel, because it touches different files and has no
  dependency on an incomplete task.
- **[Story]**: The user story the task belongs to (US1, US2, US3, US4).

---

## Phase 1: Setup

- [x] T001 Record a baseline. Run `npx nx run-many -t lint test typecheck -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`, which must pass on the untouched branch. Record the result under "Baseline notes" at the end of `specs/014-refinance-brrrr/tasks.md`.

---

## Phase 2: Foundational (blocks every story)

**Purpose**: the stored type, the write path, the validation, the shared math, the fixtures and the
page shell that every story's numbers and UI depend on.

- [x] T002 Add the stored type in `libs/shared/calculations/src/lib/types.ts`, per data-model §A:
  - Add `RefinanceAssumptions` with every field optional: `mode?: 'cash-out' | 'rate-drop'` ("Default `'cash-out'`"), `arvDollars?: number` ("> 0. Not entered: Cash-out shows a prompt"), `ltvPct?: number` ("1 ≤ x ≤ 95. Default 75"), `newRatePct?: number` ("0 ≤ x ≤ 100. Not entered: both modes show a prompt"), `newTermMonths?: number` ("integer, 1 ≤ x ≤ 480. Default: Cash-out 360, Rate-drop months remaining on the current loan"), `termUnit?: 'years' | 'months'` ("Default `'years'`, display only"), `closingCostsDollars?: number` ("≥ 0. Default 0") and `refinanceMonth?: number` ("integer ≥ 1. Default 12. A value above the loan term is clamped to the term, not an error").
  - Add `refinance?: RefinanceAssumptions | null` to `LoanScenario`, with the comment "Refinance & BRRRR Modeling inputs (spec 014). Optional; missing = defaults."
  - Extend the `FieldError['field']` union with `` `refinance.${'arvDollars' | 'ltvPct' | 'newRatePct' | 'newTermMonths' | 'closingCostsDollars' | 'refinanceMonth'}` ``.
  - Export the new type from `libs/shared/calculations/src/index.ts` if the file lists types explicitly.
- [x] T003 Write the test first in `libs/shared/calculations/src/lib/apply-scenario-patch.spec.ts`, covering:
  - `{ refinance: { refinanceMonth: 18 } }` merges into an existing `refinance` and keeps its other fields.
  - `refinance: null` clears it.
  - A patch without `refinance` leaves it untouched.
  - The existing rental, `sale` and principal rules are unchanged.
- [x] T004 Implement the shallow merge for `refinance` in `libs/shared/calculations/src/lib/apply-scenario-patch.ts`, mirroring the `sale` block: `if ('refinance' in patch && patch.refinance != null) next.refinance = scenario.refinance ? { ...scenario.refinance, ...patch.refinance } : patch.refinance;`. Make T003 pass. (Depends on T002, T003.)
- [x] T005 [P] Add `RefreshIcon` in `libs/shared/ui/src/lib/icons.tsx`. Use the same `Icon` wrapper as `TagIcon`; the path is two circular arrows: `<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3" /><path d="M5 4v4h4M19 20v-4h-4" />`. Export it from `libs/shared/ui/src/index.ts`.
- [x] T006 [P] In `libs/shared/ui/src/lib/deal/page-profiles.ts`:
  - Add `'refinance'` to `PageProfile['pageId']`.
  - Add `export const REFINANCE_PROFILE: PageProfile = { pageId: 'refinance', pinned: ['homePrice', 'downPayment', 'annualInterestRatePct'], muted: [], requires: [{ field: 'rental.grossMonthlyRent', unlocks: 'cash-on-cash' }] };`, per research R13. The prompt is static, so it also shows in Rate-drop mode; that is accepted.
  - Export it wherever `SALE_PROFILE` is exported (check `libs/shared/ui/src/lib/deal/index.ts`).
- [x] T007 Write the test first in `libs/shared/data-access/src/lib/deal-edits-provider.spec.tsx`. It covers `editRefinance(patch, source)`:
  - The edit writes `scenario.refinance` merged through `applyScenarioPatch`.
  - It records a `ChangeRecord` with `field: 'refinance'`.
  - Undo restores the previous `refinance`, including `undefined`, and blanks keys added since.
  - A second edit within 800 ms from the same source coalesces into one record.
  - Also assert `dealChangeTitle({ field: 'refinance', ... })` returns `'Refinance inputs changed'` in `libs/shared/ui/src/lib/deal/deal-change-toast.spec.ts`.
- [x] T008 Implement `editRefinance` in `libs/shared/data-access/src/lib/deal-edits-provider.tsx`, then make T007 pass. (Depends on T004, T007.) Research R1 covers the design, which repeats `editSale`:
  - Add `editRefinance(patch: Partial<RefinanceAssumptions>, source: DealEditSource): void` to the `DealEdits` interface.
  - Widen `ChangeField` to `DealFieldKey | 'rental' | 'sale' | 'refinance'`.
  - Implement it via the existing `record(...)` helper with `{ refinance: patch }`.
  - In `displayOf` return `''` for `'refinance'`, and in `rawOf` return `scenario.refinance ?? null`.
  - Extend the undo branch the same way as `'sale'`: blank every current key before laying the old value over it.
  - In `libs/shared/ui/src/lib/deal/deal-change-toast.tsx`, add `if (change.field === 'refinance') return 'Refinance inputs changed';` to `dealChangeTitle`, next to the `'sale'` case.
- [x] T009 [P] Create the fixtures in `libs/deal-analyzer/calculations/src/lib/__fixtures__/refinance-reference.ts`, exactly as the contract's reference deals:
  - `brrrrReference(overrides?, refinance?)`: `referenceScenario({ homePrice: 200_000, downPayment: { percent: 20 }, principal: 160_000, annualPropertyTax: 2_400, annualInsurance: 1_200, refinance: { arvDollars: 320_000, ltvPct: 75, newRatePct: 6.5, newTermMonths: 360, closingCostsDollars: 5_000, refinanceMonth: 12, ...refinance }, ...overrides }, { grossMonthlyRent: 2_800, closingCosts: 6_000, rehabBudget: 50_000 })` (7% / 360 months comes from `referenceScenario`).
  - `rateDropReference(refinance?)`: `referenceScenario({ refinance: { mode: 'rate-drop', newRatePct: 5.5, closingCostsDollars: 4_500, refinanceMonth: 60, ...refinance } })`, which is the $300,000 / 7% / 30-year loan.
  - `nonRentalReference(refinance?)`: `brrrrReference({ rental: null }, refinance)`, the same deal with no rental (cash invested is the $40,000 down payment alone).
  - `generatedRefinanceScenarios(count)`: takes each scenario from `generatedScenarios(count)` (which has no refinance inputs, and includes PMI and extra payments) and attaches deterministic `refinance` inputs from the same seeded generator, so SC-002 and SC-003 run over varied data: `arvDollars` 150,000–600,000, `ltvPct` 50–95, `newRatePct` 2–9, `newTermMonths` 120–360, `closingCostsDollars` 0–10,000, `refinanceMonth` 6–120 (clamped to the term by the code under test), and `mode` alternating. Keep every value inside the data-model §A ranges.
- [x] T010 Add the derived types to `libs/deal-analyzer/calculations/src/lib/types.ts`, per data-model §B–D, and export them from the lib's `index.ts`:
  - `ResolvedRefinanceAssumptions` with `mode`, `arv: number | null`, `ltvPct`, `newRatePct: number | null`, `refinanceMonth`, `clampedFrom: number | null`, `remainingMonths`, `newTermMonths`, `termUnit`, `closingCosts`.
  - `CashOutProceeds` (the US1 fields): `newLoan`, `payoff`, `closingCosts`, `netProceeds`, `isCashIn`, `currentPi`, `newPi`, `piChange`. And `CashOutAnalysis = { result: CashOutProceeds | null; naReason: string | null; errors: FieldError[] }`. (US2 widens `result` in T025.)
  - `RateDropBreakeven`, the tagged union: `{ kind: 'immediate' } | { kind: 'month'; months: number; years: number; remainderMonths: number; loanMonth: number } | { kind: 'none'; reason: string } | { kind: 'beyond-term' }`.
  - `RateDropResult` (`balanceRefinanced`, `currentPi`, `newPi`, `monthlySavings`, `breakeven`, `netSavings`, `horizonMonths`, `newTermMonths`, `termExtended`) and `RateDropAnalysis = { result: RateDropResult | null; naReason: string | null; errors: FieldError[] }`.
- [x] T011 Write the test first in `libs/deal-analyzer/calculations/src/lib/validate-refinance.spec.ts`, per data-model §E and §B:
  - Each rule fires only for a present, invalid value: `arvDollars` "finite, > 0" ("Enter an after-repair value greater than $0."), `ltvPct` "finite, 1–95" ("Loan-to-value must be between 1% and 95%."), `newRatePct` "finite, 0–100" ("Enter a rate between 0% and 100%."), `newTermMonths` "integer, 1–480" ("Term must be between 1 and 480 months."), `closingCostsDollars` "finite, ≥ 0" ("Refinance closing costs can't be negative."), `refinanceMonth` "integer, ≥ 1" ("Refinance month must be a whole month, 1 or more."). Check the boundaries 1 and 95 for LTV, and 1 and 480 for the term.
  - A missing field is never an error.
  - `resolveRefinanceAssumptions`: defaults (mode `'cash-out'`, LTV 75, month 12, closing costs 0, unit `'years'`); a month above the term clamps to the term with `clampedFrom` set; `remainingMonths = termMonths − refinanceMonth` (0 at the term); `newTermMonths` defaults to 360 in cash-out mode and to `remainingMonths` in rate-drop mode, and a stored value overrides both.
- [x] T012 Implement `libs/deal-analyzer/calculations/src/lib/validate-refinance.ts`: `DEFAULT_REFINANCE`, `validateRefinance(scenario)` and `resolveRefinanceAssumptions(scenario)`, per the contract. Make T011 pass, then add `export * from './lib/validate-refinance';` to `libs/deal-analyzer/calculations/src/index.ts`. (Depends on T010, T011.)
- [x] T013 Write the test first in `libs/deal-analyzer/calculations/src/lib/refinance-math.spec.ts`:
  - `newPayment(principal, ratePct, termMonths)` equals `computeSchedule(...).summary.monthlyPrincipalAndInterest` on a synthetic loan, to the cent, for $240,000 at 6.5% / 360, $282,394.77 at 5.5% / 300 (= $1,734.15) and 360 (= $1,603.41), and a 0% loan.
  - `breakeven(costs, savings, remainingMonths, refinanceMonth)` in integer cents: `0` costs → `immediate`; savings ≤ 0 → `none`; $4,500 / $261.76 → month 18, loan month 78, "1 yr 6 mo"; $4,500 / $250.00 → exactly 18 (the float boundary); $4,500 / $392.50 → month 12; $80,000 / $261.76 over 300 months → `beyond-term`.
  - `balanceOwed` is `0` when the new term is at most the horizon, and `$83,942.87` for $282,394.77 at 5.5% / 360 after 300 payments.
- [x] T014 Create `libs/deal-analyzer/calculations/src/lib/refinance-math.ts` (internal, never exported from `index.ts`): `newPayment`, `breakeven` and `balanceOwed`, per research R3, R8 and R10 and the contract. Make T013 pass. (Depends on T010, T013.)
- [x] T015 Create `libs/deal-analyzer/ui/src/lib/use-refinance-editor.ts`, modelled on `use-sale-editor.ts`. (Depends on T008, which adds `editRefinance`.) It returns `setMode`, `setArv`, `setLtv`, `setNewRate`, `setNewTerm`, `setTermUnit`, `setClosingCosts`, `setRefinanceMonth` (each calls `editRefinance(patch, 'sheet')`) and `setRehab` and `setPurchaseClosing` (call `editDeal('rental.rehabBudget' | 'rental.closingCosts', value, 'sheet')`, per research R11).
- [x] T016 Create the page shell `libs/deal-analyzer/ui/src/lib/refinance-view.tsx`, modelled on `sale-view.tsx`, and export it from `libs/deal-analyzer/ui/src/index.ts`. (Depends on T006, T012, T015.) For now it renders the `DealStrip` with `REFINANCE_PROFILE` and the loan and rental errors (with a placeholder headline `{ label: 'Cash left in deal', value: null, naReason: 'Enter the refinance inputs.', format: currency, betterWhen: 'lower' }` and `payment` from `dealPayment(...)`, since `DealStrip` requires both), the `PageHeader` (eyebrow "Analysis", title "Refinance & BRRRR Modeling", lede "Refinance after the rehab, or chase a lower rate. See the cash left in the deal and when a lower rate pays for itself.", note "Simplified model, not financial advice."), an "Assumptions" section and a "Result" section that shows an `InputsMessage` with `data-testid="refinance-na"`.
- [x] T017 [P] Add the route and the nav entry. (Depends on T005, T016.)
  - Create `apps/amortization-calculator/src/app/refinance/page.tsx` that renders `RefinanceView` and exports `metadata = { title: 'Refinance & BRRRR Modeling', description: 'Cash-out refinance proceeds, cash left in the deal, post-refinance cash-on-cash and the rate-drop breakeven month.' }`.
  - In `apps/amortization-calculator/src/app/_nav.tsx`, add `{ id: 'refinance', label: 'Refinance', href: '/refinance', icon: <RefreshIcon /> }` after the `sale` item, and import `RefreshIcon`.

**Checkpoint**: `/refinance` loads with the Deal Strip and an empty result, and `editRefinance`
undo works.

---

## Phase 3: User Story 1 — Cash-out refinance: how much cash do I get out? (P1) 🎯 MVP

**Goal**: ARV, LTV, new rate, term, closing costs and refinance month give the new loan, the
payoff, the net proceeds and the new monthly P&I.

**Independent test**: the BRRRR reference deal shows new loan $240,000.00, payoff $158,374.70, net
proceeds $76,625.30, and P&I $1,064.48 → $1,516.96.

- [x] T018 [P] [US1] Write the test first in `libs/deal-analyzer/calculations/src/lib/analyze-cash-out.spec.ts` (proceeds only), using the T009 fixtures and the contract's vectors:
  - `brrrrReference()`: `newLoan` 240,000.00, `payoff` 158,374.70, `netProceeds` 76,625.30, `currentPi` 1,064.48, `newPi` 1,516.96, `piChange` 452.48, `isCashIn` false.
  - ARV 250,000 → `netProceeds` 24,125.30. ARV 200,000 → `netProceeds` −13,374.70 and `isCashIn` true.
  - Missing ARV → `{ result: null, naReason: CASH_OUT_NO_ARV_REASON }`. Missing new rate → `REFINANCE_NO_RATE_REASON`. An invalid LTV (96) → `REFINANCE_INVALID_REASON` with the error returned.
  - Boundaries: LTV 1 and 95; refinance month 1; refinance month equal to the term (payoff 0); a month above the term clamps; a 0% new rate; a 0% current rate.
  - With `extraPayments` on the scenario, `payoff` equals `schedule.periods[m − 1].remainingBalance`, which is lower than the no-extras payoff (invariant 10).
  - Invariant 1: `netProceeds == roundCents(newLoan − payoff − closingCosts)` over `generatedRefinanceScenarios(25)` (T009).
- [x] T019 [US1] Implement `libs/deal-analyzer/calculations/src/lib/analyze-cash-out.ts`: the exported reasons `CASH_OUT_NO_ARV_REASON` ("Enter an after-repair value to model a refinance."), `REFINANCE_NO_RATE_REASON` ("Enter a new interest rate to model a refinance.") and `REFINANCE_INVALID_REASON` ("Fix the refinance inputs to see the result."), and `analyzeCashOut(scenario, schedule)` for contract steps 1–5, using `refinance-math`. Make T018 pass, then export it, the three reasons and nothing from `refinance-math` through `index.ts`. (Depends on T012, T014, T018.)
- [x] T020 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/refinance-inputs-panel.tsx` (cash-out inputs), per contracts/refinance-ui.md § Inputs. Wrap it with `data-testid="refinance-inputs"`. It takes the resolved assumptions, the errors and the editor callbacks as props.
  - `NumberField`s, none with `min`/`max`: "After-repair value (ARV)" (currency), "Refinance LTV" (`suffix="%"`), "New interest rate" (`suffix="%"`), "Refinance closing costs" (currency), "New loan term" (a number with a Years/Months `SegmentedOptions` toggle bound to `termUnit`, showing the mode's default as a placeholder) and "Refinance month (months after purchase)" (always in months, with no unit toggle).
  - When `clampedFrom` is set, show the note "Refinance moved to month {n}, the end of the loan term." with `data-testid="refinance-clamped"`.
  - Each field shows its error from `validateRefinance` through `errorFor('refinance.<field>')`.
- [x] T021 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/cash-out-summary.tsx`, per contracts/refinance-ui.md § Cash-out result (the proceeds rows only for now), with a small pure formatter spec in `libs/deal-analyzer/ui/src/lib/cash-out-summary.spec.ts`:
  - Rows with test ids `refi-new-loan`, `refi-payoff`, `refi-closing`, `refi-net-proceeds`, `refi-pi-current`, `refi-pi-new`.
  - When `isCashIn`, label the net proceeds row "Cash-in refinance" with the note "You bring cash to close".
  - Money uses the shared `currency` formatter, and a negative $0 never renders as "-$0.00" (the bug fixed in spec 013's `signedMoney`).
- [x] T022 [US1] Wire the story into `libs/deal-analyzer/ui/src/lib/refinance-view.tsx`. (Depends on T019, T020, T021.)
  - Compute `validateScenario`, `computeSchedule`, `validateRental`, `resolveRefinanceAssumptions` and `analyzeCashOut` in a `useMemo` on `activeScenario`, with the first applicable reason as `naMessage` (loan invalid, rental invalid, then the analyzer's own reason).
  - Render `RefinanceInputsPanel` and `CashOutSummary`, or the `InputsMessage` (`refinance-na`).
  - The Deal Strip headline is `{ label: 'Net proceeds', value: result?.netProceeds ?? null, format: currency, betterWhen: 'higher' }` for now (US2 changes it).
  - Export the new UI modules from `libs/deal-analyzer/ui/src/index.ts`.
- [x] T023 [US1] Add the e2e in `apps/amortization-calculator-e2e/src/refinance.spec.ts`, modelled on `sale.spec.ts` and using `fillNumberField` from `helpers.ts`:
  - Enter the BRRRR deal on `/refinance` (home price 200000, down payment 20, rate 7, term 30 years, tax 2400, insurance 1200, rent 2800) and the refinance inputs. Expect `refi-new-loan` $240,000.00, `refi-payoff` $158,374.70, `refi-net-proceeds` $76,625.30, `refi-pi-current` $1,064.48 and `refi-pi-new` $1,516.96.
  - With the ARV empty, `refinance-na` prompts "Enter an after-repair value to model a refinance.".
  - ARV 200000 shows "Cash-in refinance".
  - A refinance month above the term shows `refinance-clamped`.
  - Invalid input (FR-016): LTV 96 shows an inline error on the field and the result area shows "Fix the refinance inputs to see the result.", with no crash.
  - With no loan amount entered, the Deal Strip's usual prompts show and `refinance-na` says "Fix the loan inputs to see the result.".
  - The "Refinance" link in the nav opens `/refinance` (FR-001).
  - Run the spec against this branch's own prod build on a free port.

**Checkpoint**: US1 works alone, the MVP. Validate it against quickstart §3 step 1.

---

## Phase 4: User Story 2 — Capital recycled: how much cash is left in the deal? (P1)

**Goal**: cash left in the deal, capital recycled, and cash-on-cash before and after, with "All
cash recovered" when the cash is all back.

**Independent test**: the BRRRR deal shows cash left $19,374.70, recycled 79.82%, and cash-on-cash
9.89% → 21.00%. ARV $400,000 shows "All cash recovered" with a surplus of $40,625.30.

- [x] T024 [P] [US2] Extend `libs/deal-analyzer/calculations/src/lib/analyze-cash-out.spec.ts` (write first):
  - `brrrrReference()`: `totalCashInvested` 96,000.00, `cashLeft` 19,374.70, `capitalRecycledPct` 0.7982 (79.82%), `noiAnnual` 22,272.00, `cashFlowBefore` 9,498.24, `cashOnCashBefore` 9.89%, `cashFlowAfter` 4,068.48, `cashOnCashAfter` 21.00%.
  - ARV 400,000: `netProceeds` 136,625.30, `cashLeft` −40,625.30, `allCashRecovered` true, `cashSurplus` 40,625.30, `cashOnCashAfter` N/A "All cash recovered". ARV 250,000: `cashLeft` 71,874.70, recycled 25.13%. ARV 200,000: `cashLeft` 109,374.70, recycled −13.93%.
  - A non-rental scenario: cash invested is the down payment alone, and both cash-on-cash figures are N/A "Add rent to see cash-on-cash".
  - A negative post-refinance cash flow gives a negative `cashOnCashAfter`.
  - Invariants 2–5 over `generatedRefinanceScenarios(25)` and the reference deals: `cashLeft == roundCents(totalCashInvested − netProceeds)`; `capitalRecycledPct == netProceeds / totalCashInvested`; `allCashRecovered ⇔ cashLeft ≤ 0` with `cashSurplus == −cashLeft`; `totalCashInvested` and `cashOnCashBefore` equal `analyzeDeal(...)` to the cent.
  - A house-hacked rental (spec 012, with an owner-occupied unit): `noiAnnual`, `cashOnCashBefore` and `cashFlowBefore` follow `analyzeDeal` for the active income view, and `cashFlowAfter` uses that same `noiAnnual`.
- [x] T025 [US2] Extend `analyze-cash-out.ts` for contract steps 6–9, and widen the result type. (Depends on T019, T024.)
  - In `types.ts`, add `CashOutCapital` (`totalCashInvested`, `cashLeft`, `capitalRecycledPct: RatioResult`, `allCashRecovered`, `cashSurplus`, `noiAnnual: number | null`, `cashFlowBefore: number | null`, `cashOnCashBefore: RatioResult`, `cashFlowAfter: number | null`, `cashOnCashAfter: RatioResult`) and set `CashOutResult = CashOutProceeds & CashOutCapital`, with `CashOutAnalysis.result: CashOutResult | null`.
  - `totalCashInvested = rental ? analyzeDeal(...).totalCashInvested : roundCents(downPaymentDollars(scenario))`; `cashFlowAfter = roundCents(noiAnnual − 12 × newPi)`; no PMI on the new loan, no growth applied.
  - Make T024 pass, and keep T018 green.
- [x] T026 [P] [US2] Extend `libs/deal-analyzer/ui/src/lib/cash-out-summary.tsx` and its spec with the US2 rows, per contracts/refinance-ui.md: `refi-cash-left`, "Total cash invested", `refi-recycled` (a percentage, negative allowed), `refi-coc-before` and `refi-coc-after` ("9.89% → 21.00%"). When `allCashRecovered`, show "All cash recovered" with "Cash surplus {amount}" in place of the after figure, and when cash-on-cash is N/A, show its reason. Negative figures carry words as well as colour.
- [x] T027 [US2] Extend the panel and the view. (Depends on T025, T026.)
  - In `refinance-inputs-panel.tsx`, add the cash-out "Rehab budget" and "Purchase closing costs" currency `NumberField`s, bound to `setRehab` and `setPurchaseClosing`, shown only when the scenario has a rental. Without one, show the hint "Add rent to include rehab and closing costs in cash invested." (research R11).
  - In `refinance-view.tsx`, change the Deal Strip headline to `{ label: 'Cash left in deal', value: result?.cashLeft ?? null, format: currency, betterWhen: 'lower' }`.
- [x] T028 [US2] Extend `apps/amortization-calculator-e2e/src/refinance.spec.ts`:
  - The BRRRR deal shows `refi-cash-left` $19,374.70, `refi-recycled` 79.82%, `refi-coc-before` 9.89% and `refi-coc-after` 21.00%.
  - Rehab budget 50000 and purchase closing costs 6000, entered on this page, also appear on `/deal-analyzer`'s total cash invested.
  - ARV 400000 shows "All cash recovered" and "Cash surplus $40,625.30".
  - A scenario without rent shows cash-on-cash "N/A" with the reason, and the rehab inputs replaced by the hint.

**Checkpoint**: US1 and US2 work. The BRRRR scorecard is complete.

---

## Phase 5: User Story 3 — Rate drop: when do the savings pay back the closing costs? (P2)

**Goal**: keep vs. refinance the current mortgage at a lower rate, with the exact breakeven month.

**Independent test**: the $300,000 loan refinanced at month 60 to 5.5% with $4,500 closing costs
shows savings $261.76, breakeven month 18 ("1 yr 6 mo", loan month 78) and net savings $74,028.00.

- [x] T029 [P] [US3] Write the test first in `libs/deal-analyzer/calculations/src/lib/analyze-rate-drop.spec.ts`, using `rateDropReference()` and the contract's rate-drop table:
  - Remaining term (300 months): `balanceRefinanced` 282,394.77, `currentPi` 1,995.91, `newPi` 1,734.15, `monthlySavings` 261.76, breakeven `month` 18 / loan month 78 / 1 yr 6 mo, `netSavings` 74,028.00, `termExtended` false.
  - Fresh 30 years (`newTermMonths: 360`): `newPi` 1,603.41, `monthlySavings` 392.50, breakeven `month` 12, `netSavings` 29,307.13, `termExtended` true.
  - Closing costs $0 → `immediate`, `netSavings` 78,528.00. Closing costs $80,000 → `beyond-term`, `netSavings` −1,472.00.
  - A new rate above the current rate → `none` with the reason "The new payment is not lower than your current payment", negative savings.
  - Refinance month equal to the term → `RATE_DROP_PAID_OFF_REASON`. Missing new rate → `REFINANCE_NO_RATE_REASON`.
  - A shorter new term (120 months) uses `newPi × min(H, newTermMonths)` (research R10).
  - A non-rental scenario works (no rental is needed).
  - Invariants 6–9 over `generatedRefinanceScenarios(25)`: the breakeven `b` satisfies `b × savings ≥ costs > (b − 1) × savings` in cents and equals a brute-force loop; `newPi` and `balanceOwed` equal a synthetic `computeSchedule` loan to the cent; a higher new rate never lowers `newPi` or moves the breakeven earlier.
- [x] T030 [US3] Implement `libs/deal-analyzer/calculations/src/lib/analyze-rate-drop.ts`: `RATE_DROP_PAID_OFF_REASON` ("The loan is already paid off at this month.") and `analyzeRateDrop(scenario, schedule)` for contract steps 1–6, using `refinance-math`. Make T029 pass, then export it and the reason through `index.ts`. (Depends on T012, T014, T029.)
- [x] T031 [P] [US3] Create `libs/deal-analyzer/ui/src/lib/rate-drop-summary.tsx`, per contracts/refinance-ui.md § Rate-drop result, with a pure-formatter spec in `rate-drop-summary.spec.ts`: rows `refi-pi-current`, `refi-pi-new`, `refi-savings`, `refi-breakeven` ("Month 18 (1 yr 6 mo) · loan month 78", "Immediate", "No breakeven" with its reason, or "Not within the loan term") and `refi-net-savings`. When `termExtended`, add the note "Part of this saving comes from the longer term." Negative savings carry words, not only colour.
- [x] T032 [US3] Extend `refinance-inputs-panel.tsx` with the mode toggle and the rate-drop input set. (Depends on T015, T020.)
  - Add a `SegmentedOptions` labelled "Refinance mode" with `data-testid="refinance-mode"` and options "Cash-out (BRRRR)" / "Rate drop", bound to `setMode` (radio semantics).
  - In Rate-drop mode show only "New interest rate", "New loan term" (placeholder: the months remaining), "Refinance closing costs" and "Refinance month"; hide ARV, LTV, rehab and purchase closing costs. The shared fields keep their values when the mode changes.
- [x] T033 [US3] Make the view mode-driven in `refinance-view.tsx`. (Depends on T030, T031, T032.)
  - In Rate-drop mode call `analyzeRateDrop` and render `RateDropSummary`; in Cash-out mode keep `analyzeCashOut`.
  - The Deal Strip headline in Rate-drop mode is `{ label: 'Breakeven', value: months or null, naReason, format: (n) => `${n} mo`, betterWhen: 'lower' }`.
  - Export the new modules from `libs/deal-analyzer/ui/src/index.ts`.
- [x] T034 [US3] Extend `apps/amortization-calculator-e2e/src/refinance.spec.ts`:
  - On the reference loan ($400,000 price, 25% down, 7%, 30 years), switch to Rate drop with month 60, new rate 5.5% and closing costs 4500: `refi-savings` $261.76, `refi-breakeven` "Month 18", `refi-net-savings` $74,028.00.
  - New term 30 years shows breakeven "Month 12" and the longer-term note.
  - Closing costs 0 shows "Immediate", and a new rate of 7.5% shows "No breakeven".
  - Toggling back to Cash-out keeps the shared inputs (new rate, closing costs, month).
  - Keyboard (FR-017): Tab reaches the "Refinance mode" toggle as one stop, the arrow keys move the choice, and Tab then Enter commits a typed value in each input.

**Checkpoint**: all three calculators work.

---

## Phase 6: User Story 4 — The refinance phase travels with the scenario (P3)

**Goal**: each scenario keeps its own refinance phase and mode, across tab switches and reloads, and
older sessions still load. The write path was built in Phase 2, so this phase proves the behavior.

**Independent test**: enter refinance inputs on scenario 1, add scenario 2 with different inputs,
switch back and reload: both scenarios show their own inputs and results.

- [x] T035 [P] [US4] Add the session-compatibility tests (write first):
  - In `libs/shared/calculations/src/lib/persistence.spec.ts`: a session serialized with `refinance` round-trips it, and a saved session without the key deserializes unchanged.
  - In `libs/deal-analyzer/calculations/src/lib/validate-refinance.spec.ts`: a scenario with no `refinance` resolves to every default and produces no validation errors (FR-014).
- [x] T036 [P] [US4] Write `libs/deal-analyzer/ui/src/lib/use-refinance-editor.spec.tsx` (jsdom), inside `ScenariosProvider` and `DealEditsProvider`: `setArv` and `setMode` write `scenario.refinance`; `setRehab` writes `rental.rehabBudget`; a second scenario keeps its own `refinance`; undo restores the previous value.
- [x] T037 [US4] Extend `apps/amortization-calculator-e2e/src/refinance.spec.ts`:
  - Create two scenarios with different ARV and mode; switching tabs shows each one's inputs and results.
  - Reload the page in the same session; the inputs and the selected mode are restored.
  - Change the home price in the Deal Strip; the page recomputes and the refinance inputs stay.
  - Edit an input, then use the toast's Undo; the previous value returns.
  - Load a session that has scenarios but no `refinance` key (set `sessionStorage` before navigating); the page loads with the defaults and no error.

**Checkpoint**: all four stories work.

---

## Phase 7: Polish & Cross-Cutting

- [x] T038 [P] Add `'/refinance'` to the page lists in the following e2e specs. Update the snapshots only for the new `/refinance` entries, and note them under "Baseline notes".
  - `apps/amortization-calculator-e2e/src/a11y.spec.ts`
  - `apps/amortization-calculator-e2e/src/deal-strip.spec.ts`:
    - Add `'/refinance'` to the `PAGES` array.
    - Add the pair `['/refinance', ['homePrice', 'downPayment', 'annualInterestRatePct']]` to the `[path, pinnedChips]` list, matching `REFINANCE_PROFILE.pinned`.
  - `apps/amortization-calculator-e2e/src/deal-bar.spec.ts`
  - `apps/amortization-calculator-e2e/src/setup-mode.spec.ts`
  - `apps/amortization-calculator-e2e/src/visual.spec.ts`
  - Also update `apps/amortization-calculator-e2e/src/navigation.spec.ts`, if it asserts the nav item count or order.
- [x] T039 [P] Add the SC-004 timing test to `apps/amortization-calculator-e2e/src/performance.spec.ts`, modelled on its `/sale` case. On `/refinance`, editing "Refinance LTV" from 75 to 70 updates `refi-net-proceeds` within 1000 ms.
- [x] T040 [P] Add the 375 px test to `apps/amortization-calculator-e2e/src/refinance.spec.ts` (SC-006), in both modes. At viewport width 375, `document.documentElement.scrollWidth <= 375`.
- [x] T041 [P] Add the `/refinance` row to the routes table in `specs/003-feature-pages-navigation/contracts/routes-and-navigation.md`, following the `/sale` row.
- [x] T042 [P] Document the new public APIs in the library READMEs:
  - `libs/deal-analyzer/calculations/README.md`: `analyzeCashOut`, `analyzeRateDrop`, `validateRefinance`, `resolveRefinanceAssumptions` and `DEFAULT_REFINANCE`
  - `libs/deal-analyzer/ui/README.md`: `RefinanceView`
  - `libs/shared/data-access/README.md`: `editRefinance`
  - `libs/shared/calculations/README.md`: `RefinanceAssumptions`
- [x] T043 Run the full gate. (Depends on all the other tasks.)
  - Run `npx nx run-many -t lint test typecheck build -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e`.
  - Then run the whole e2e suite against this branch's prod build on a free port (quickstart §2 and §4), never :3000.
- [x] T044 Execute the `specs/014-refinance-brrrr/quickstart.md` §3 manual walk-through once, and record the outcome under "Baseline notes" (Constitution: quickstart must run before done).

---

## Dependencies & Execution Order

```text
T001 → Phase 2 ─┬─ T002 → T003 → T004 → T007 → T008 → T015
                ├─ T005 [P], T006 [P], T009 [P]
                ├─ T010 (after T002) → T011 → T012
                ├─ T013 → T014 (after T010)
                └─ T016 (after T006, T012, T015; T015 follows T008) → T017 (after T005)
Phase 2 done → US1 (T018–T023) → US2 (T024–T028) → US3 (T029–T034) → US4 (T035–T037) → Polish (T038–T044)
```

- **US1** needs all of Phase 2. T019 must come after T018, and T022 after T019–T021.
- **US2** extends US1's `analyze-cash-out.ts`, `cash-out-summary.tsx`, the panel and the view, so it follows US1.
- **US3** is independent of US2's calculations (it only needs Phase 2's validation and math), but it edits the same panel and view files, so run it after US2 rather than in parallel.
- **US4** needs the UI from US1 to US3 to test mode and inputs end to end. Its unit tests (T035, T036) can start after Phase 2.
- **Within a story**, the tests come first (they must fail), then the calculations, then the UI, then e2e.

## Parallel Examples

- **Phase 2**: T005 (icon), T006 (profile), and T009 (fixtures) run together after T002; T015 (editor hook) follows T008. T011 and T013 (the two test files) also run together once T010 exists.
- **US1**: T018 (calculation test), T020 (panel) and T021 (summary) run together. T019 follows T018, and T022 follows all three.
- **US2**: T024 (test) runs alongside T026 (summary rows), which only needs the T025 type changes.
- **US3**: T029 (test), T031 (summary) and the T032 panel markup run together; T030 follows T029.
- **US4**: T035 and T036 run together.
- **Polish**: T038, T039, T040, T041 and T042 are all [P].

## Implementation Strategy

1. **MVP**: complete Phases 1–3 (T001–T023). This ships `/refinance` with the cash-out proceeds.
   Stop and validate it against the quickstart rows for US1.
2. **Increment 2**: US2 adds cash left, capital recycled and cash-on-cash, the BRRRR scorecard
   (T024–T028).
3. **Increment 3**: US3 adds the rate-drop mode and breakeven (T029–T034).
4. **Increment 4**: US4 proves per-scenario persistence and old-session loading (T035–T037).
5. **Finish**: polish and the full gate (T038–T044). Run `/speckit-analyze` before
   `/speckit-implement` (Constitution V: this feature has four user stories).

## Baseline notes

_(Filled in during T001, T038, T043 and T044.)_

- **T001 (2026-11-19)**: Baseline `lint test typecheck` passed for all 7 projects on the untouched branch (shared-calculations 159, shared-data-access 27, shared-ui 52, deal-analyzer-calculations 275, deal-analyzer-ui 9 tests).
- **T013/T014 (breakeven order)**: `breakeven()` checks "savings ≤ 0" before "costs = $0", so a payment that goes up is never reported as "Immediate" just because the costs are $0. Research R8 and the calculations contract step 4 were updated to match.
- **T016**: the page shell already runs the loan and rental validation in a `useMemo`, so T022 only has to add the refinance analysis to it.
- **T020 (term field)**: the "New loan term" field shows the resolved value (30 years in Cash-out mode) instead of a placeholder, because `NumberField` has no placeholder. The panel shows the stored value when there is one, so an invalid entry (LTV 96) stays visible next to its own error instead of showing the fallback default.
- **T021 (extra file)**: the two summaries share a small `refinance-result-table.tsx` (the label/value table), so the table markup is not duplicated. It is internal and not exported from the lib's `index.ts`.
- **T023/T028 (build flake)**: the first `nx build` in this worktree failed once with a Turbopack `next/font/google` error (a font fetch), and Nx marked the task flaky. A rebuild passed unchanged. The e2e runs use the prod build on :3217.
- **T028 (test 11)**: without rent, only the $40,000 down payment counts as invested, so the BRRRR deal's $76,625.30 proceeds recover all the cash and the page correctly says "All cash recovered". The test uses ARV $250,000 (cash left $15,874.70) to check the "N/A" cash-on-cash state.
- **US1 + US2 e2e (2026-11-19)**: `refinance.spec.ts` 33 passed (11 tests × chromium, firefox, webkit).
- **T038/T039/T040**: `/refinance` was added to the `a11y`, `deal-strip` (`PAGES` plus the pinned-chips pair), `deal-bar`, `setup-mode` and `visual` page lists. `navigation.spec.ts` asserts no item count, so it was unchanged, and the visual spec has no screenshot baselines. The SC-004 timing test (LTV 75 → 70 updates the proceeds within 1 s) and the 375 px test (both modes) were added.
- **T043 (2026-11-19)**:
  - `lint test typecheck build` passed for all 7 projects (shared-calculations 167, shared-data-access 32, shared-ui 53, deal-analyzer-calculations 374, deal-analyzer-ui 36 tests).
  - Full e2e on this worktree's prod build (:3217): 674 passed, 8 skipped, 2 failed. Both failures were the Firefox "every page has no WCAG violations" test (light and dark) hitting its 30 s timeout with "Page crashed", not an axe violation. That one test scans every route in turn, so adding `/refinance` lengthened it under a loaded full run. It passed 36 of 36 alone, so it now calls `test.slow()` (a11y.spec.ts), and then passed again under repeat.
  - After the last layout fix, every spec that touches `/refinance` was re-run: 202 passed, 8 skipped, plus the timing test alone (3 of 3).
- **Layout bug found by the screenshots (T044)**: the view first wrapped its output in a `<div>`, which collapsed the spacing between the Deal Strip, header and sections, and `display: contents` broke the phone layout, because `main.page-grid` places each _direct_ child in its content column. The view now returns a fragment, exactly like `SaleView`, so the unused `refinance-view` test id was dropped from the contract.
- **Build flake**: `nx build` fails intermittently with a Turbopack `next/font/google` fetch error (seen 4 times today in this worktree, always passing on a retry with no change). Final verification used a clean build with exit 0 and no error output.
- **T044 (2026-11-19)**: the quickstart §3 walk-through was executed twice over: by the e2e suite (every figure and state in steps 1–5: BRRRR proceeds and scorecard, rate-drop and the fresh 30-year term, two scenarios, reload, undo, clamped month, $0 costs, non-rental) and by looking at screenshots of both modes at 1280 px and 390 px, which is what caught the layout bug above.
- **US4 (scenario copy)**: `addScenario` copies the active scenario, so a new tab starts with the same refinance inputs (as it does for rent and sale inputs) and then edits independently. The tests assert that.
- **Analyze follow-up**: a house-hack case and the keyboard test from the `/speckit-analyze` report were added as planned (T024, T034).
