---
description: 'Task list template for feature implementation'
---

# Tasks: Real Estate Amortization Calculator

**Input**: Design documents from `/specs/001-real-estate-amortization-calculator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/calculation-engine.md, quickstart.md

**Tests**: Included. Spec success criterion **SC-002** ("Calculated payment and schedule values match standard amortization formulas to the nearest cent for 100% of tested loan combinations") and the contract postconditions in `contracts/calculation-engine.md` can only be verified by automated tests, and `plan.md`/`research.md` already commit to Vitest (unit, for `libs/amortization-calculations`) and Playwright (e2e, mapped to `quickstart.md`'s validation scenarios).

**Note on Task IDs**: IDs are stable identifiers assigned in the order each task was authored, not a strict execution sequence — tasks T051-T059 were appended during a later remediation pass but belong physically within earlier phases (see their placement below). **Follow document/phase order when executing, not numeric ID order.**

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Every task includes an exact file path

## Path Conventions (from plan.md)

- `apps/amortization-calculator/src/app/` — Next.js App Router app (routes, page-level components, hooks)
- `libs/amortization-calculations/src/lib/` — framework-free TypeScript calculation engine (Vitest-tested)
- `libs/amortization-ui/src/lib/` — shared React components built on `@ui-sdk/react`, styled with Tailwind
- `apps/amortization-calculator-e2e/src/` — Playwright e2e specs

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Nx workspace projects and install dependencies decided in research.md

- [x] T001 Generate the Next.js App Router application via `nx g @nx/next:app amortization-calculator --directory=apps/amortization-calculator --appDir=true --src=true --style=tailwind --e2eTestRunner=playwright --unitTestRunner=vitest`, producing `apps/amortization-calculator/` and `apps/amortization-calculator-e2e/`
- [x] T002 [P] Generate the framework-free calculation library via `nx g @nx/js:lib amortization-calculations --directory=libs/amortization-calculations --unitTestRunner=vitest --bundler=none`
- [x] T003 [P] Generate the shared UI library via `nx g @nx/react:lib amortization-ui --directory=libs/amortization-ui --style=tailwind --unitTestRunner=vitest`
- [x] T004 Install the vercel-labs/ui behavior SDK, pinned to the version validated in research.md: `npm install @ui-sdk/core@0.1.0-beta.1 @ui-sdk/react@0.1.0-beta.1` (workspace root, consumed from `libs/amortization-ui`), per research.md Decision 3 and plan.md's Technical Context
- [x] T005 [P] Configure `tsconfig.base.json` path aliases `@amortization/calculations` → `libs/amortization-calculations/src/index.ts` and `@amortization/ui` → `libs/amortization-ui/src/index.ts`
- [x] T006 [P] Configure Nx module-boundary ESLint rule (`@nx/enforce-module-boundaries`) so `apps/amortization-calculator` only imports the public barrel exports of `libs/amortization-calculations` and `libs/amortization-ui`, not internal files

**Checkpoint**: Workspace builds (`nx build amortization-calculator`) and lints (`nx lint amortization-calculator`) with empty projects before any feature code is written.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, validation, persistence, and app shell that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define core types in `libs/amortization-calculations/src/lib/types.ts`: `LoanScenario`, `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `ScenarioComparison`, `PersistedState` — exact shapes and field-level notes per data-model.md (e.g., `principal: number` must be `> 0`; `annualInterestRatePct: number` must be `>= 0`; `downPayment: { amount: number } | { percent: number } | null` must satisfy `amount < homePrice` or `0 <= percent < 100`)
- [x] T008 [P] Implement `validateScenario(input: unknown): { valid: true; scenario: LoanScenario } | { valid: false; errors: FieldError[] }` in `libs/amortization-calculations/src/lib/validate-scenario.ts`, returning one `FieldError` per offending field (not just the first) per contracts/calculation-engine.md — rejects `principal <= 0`, `termMonths <= 0`, negative `annualInterestRatePct`, down payment `>= homePrice`, and negative `annualPropertyTax`/`annualInsurance`/`pmiAnnualRatePct`/`monthlyHoa`/`extraPayments[].amount`
- [x] T009 [P] Implement `serializeScenarios(scenarios, activeScenarioId): string` and `deserializeScenarios(raw: string | null): PersistedState | null` in `libs/amortization-calculations/src/lib/persistence.ts` — `deserializeScenarios` must return `null` (never throw) on missing/corrupt input, per contracts/calculation-engine.md
- [x] T010 Create the root App Router shell in `apps/amortization-calculator/src/app/layout.tsx` as a Server Component (HTML shell, Tailwind `globals.css` import, page metadata), per research.md Decision 2
- [x] T011 [P] Create a `"use client"` providers wrapper in `apps/amortization-calculator/src/app/providers.tsx` establishing any portal/root container `@ui-sdk/react`'s popup/dialog/date-picker behaviors need, mounted from `layout.tsx`
- [x] T012 [P] Implement `useScenarios()` hook in `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts`: on mount calls `deserializeScenarios(sessionStorage.getItem("amortization:scenarios"))`, falls back to one default `LoanScenario` when `null`, calls `serializeScenarios` to `sessionStorage` on every change (`"amortization:scenarios"` key, per data-model.md Persistence shape) — this is the session-only retention required by FR-012

**Checkpoint**: Foundation ready — `libs/amortization-calculations` exports validated types/functions, the app renders an empty shell, and scenario state survives a same-tab reload. User story implementation can now begin.

---

## Phase 3: User Story 1 - Calculate a standard mortgage payment and schedule (Priority: P1) 🎯 MVP

**Goal**: Enter principal/rate/term/start date and see the monthly payment plus a complete, cent-accurate amortization schedule.

**Independent Test**: Enter a $300,000 loan at 6.5% for 30 years and verify the displayed monthly payment and 360-row schedule match the textbook amortization formula, ending at exactly $0.00 remaining balance (quickstart.md Scenario 1).

### Tests for User Story 1 ⚠️

> Write these first; they must fail before T016 is implemented.

- [x] T013 [P] [US1] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: for a $300,000/6.5%/30yr loan, `computeSchedule()` returns 360 periods, the monthly payment matches the closed-form formula to the cent, `summary.totalInterestPaid` equals the sum of all `interestPortion` values, and the final period's `remainingBalance` is exactly `0` (FR-002, FR-003, FR-004, SC-002)
- [x] T014 [P] [US1] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: `annualInterestRatePct === 0` produces a valid straight-line principal schedule with no division-by-zero error (Edge Cases)
- [x] T015 [P] [US1] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: a `startDate` on the 31st of a month produces consistently rolled-over monthly payment dates for every subsequent period (Edge Cases)

### Implementation for User Story 1

- [x] T016 [US1] Implement `computeSchedule(scenario: LoanScenario): AmortizationSchedule` baseline (principal, rate, term, start date only — no extra payments/PMI/tax/insurance/HOA yet) in `libs/amortization-calculations/src/lib/compute-schedule.ts`: fixed periodic payment formula, per-period principal/interest split, final period absorbs rounding so `remainingBalance === 0` exactly (depends on T007)
- [x] T017 [P] [US1] Build `NumberField`/`CurrencyField` in `libs/amortization-ui/src/lib/number-field.tsx` using `@ui-sdk/react`'s Number Input behavior, styled with Tailwind for currency and plain-number variants (research.md Decision 3)
- [x] T018 [P] [US1] Build `DateField` in `libs/amortization-ui/src/lib/date-field.tsx` using `@ui-sdk/react`'s Date Picker behavior, styled with Tailwind
- [x] T019 [US1] Build `ScheduleTable` in `libs/amortization-ui/src/lib/schedule-table.tsx`: `@ui-sdk/react` Scroll Area behavior wrapping a styled `<table>` with columns `periodNumber`, `date`, `paymentAmount`, `principalPortion`, `interestPortion`, `remainingBalance`, formatted via `Intl.NumberFormat`/`Intl.DateTimeFormat` (FR-003, FR-013)
- [x] T020 [US1] Build `LoanInputForm` in `apps/amortization-calculator/src/app/_components/loan-input-form.tsx` composing `NumberField`/`DateField` for `principal`, `annualInterestRatePct`, `startDate`, and a term field with an explicit years/months unit toggle (converting to `termMonths` internally) so the unit is never ambiguous (Edge Cases); calls `validateScenario()` on change and renders inline `FieldError` messages (depends on T008, T017, T018)
- [x] T021 [US1] Wire `apps/amortization-calculator/src/app/page.tsx`: hold the active `LoanScenario` via `useScenarios()`, call `computeSchedule()` whenever the scenario is valid, and render `LoanInputForm` + a monthly-payment summary + `ScheduleTable` (depends on T012, T016, T019, T020)
- [x] T022 [P] [US1] Playwright e2e spec in `apps/amortization-calculator-e2e/src/baseline-schedule.spec.ts` covering quickstart.md Scenario 1: enter the $300k/6.5%/30yr loan, assert the displayed payment and that the final schedule row shows $0.00 remaining balance
- [x] T051 [P] [US1] Implement `scheduleToCsv(schedule: AmortizationSchedule): string` in `libs/amortization-calculations/src/lib/export-schedule.ts`: header row + one row per `SchedulePeriod` field (FR-011)
- [x] T052 [P] [US1] Unit test in `libs/amortization-calculations/src/lib/export-schedule.spec.ts`: verifies CSV header + row count + field order against a known schedule (FR-011)
- [x] T053 [US1] Build `ExportScheduleButton` in `apps/amortization-calculator/src/app/_components/export-schedule-button.tsx`: triggers a print-optimized view (`window.print()` + print stylesheet) and a CSV download via `scheduleToCsv()`; wire into `page.tsx` next to `ScheduleTable` (depends on T019, T051)
- [x] T054 [P] [US1] Playwright e2e spec in `apps/amortization-calculator-e2e/src/export-schedule.spec.ts`: verify the export/print control is present and produces a downloadable file with the expected row count (FR-011)
- [x] T057 [P] [US1] Add a performance assertion in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: `computeSchedule()` for a 360-period scenario completes in under 100ms, as the computation-side budget behind SC-005's <1s end-to-end target

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Model real-estate-specific costs (Priority: P2)

**Goal**: Add home price, down payment, property tax, insurance, PMI, and HOA so the displayed total monthly payment reflects real homeownership cost, with PMI dropping off automatically at 80% LTV.

**Independent Test**: Enter a home price, down payment under 20%, tax/insurance/PMI/HOA values, and confirm the "total monthly payment" correctly sums P&I plus prorated extras, with PMI disappearing once equity crosses 80% (quickstart.md Scenario 2).

### Tests for User Story 2 ⚠️

- [x] T023 [P] [US2] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: PMI is included (`pmiApplies: true`) while `remainingBalance / (homePrice ?? principal) > 0.8` and excluded from the first period that condition fails onward; `summary.pmiDropPeriod` records that period (or `null` if PMI never applies) (FR-006)
- [x] T024 [P] [US2] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: the total estimated monthly payment equals P&I plus prorated monthly `annualPropertyTax`/`annualInsurance`/PMI/`monthlyHoa`, while HOA is excluded from each period's `principalPortion`/`interestPortion`/`remainingBalance` columns (FR-005)
- [x] T025 [P] [US2] Unit test in `libs/amortization-calculations/src/lib/validate-scenario.spec.ts`: `validateScenario()` rejects a `downPayment` `>= homePrice` with a field-level error (FR-009, Edge Cases)

### Implementation for User Story 2

- [x] T026 [US2] Extend `computeSchedule()` in `libs/amortization-calculations/src/lib/compute-schedule.ts` to accept `homePrice`, `downPayment`, `pmiAnnualRatePct` and compute `pmiApplies` per period plus `summary.pmiDropPeriod` (FR-006) (depends on T016)
- [x] T027 [US2] Extend `computeSchedule()` in `libs/amortization-calculations/src/lib/compute-schedule.ts` to accept `annualPropertyTax`, `annualInsurance`, `monthlyHoa` and compute the total estimated monthly payment distinct from the P&I-only figure (FR-005) (depends on T026)
- [x] T028 [P] [US2] Build `CostBreakdownPanel` in `apps/amortization-calculator/src/app/_components/cost-breakdown-panel.tsx`: home price and down payment (amount/percent toggle via `@ui-sdk/react` Tabs) fields, tax/insurance/PMI/HOA `NumberField`s, and a clearly separated "total estimated monthly payment" vs. "principal & interest only" display (FR-005)
- [x] T029 [US2] Wire `CostBreakdownPanel` into `apps/amortization-calculator/src/app/page.tsx`, extending the active `LoanScenario` state and surfacing the PMI drop-off period in the UI (depends on T021, T026, T027, T028)
- [x] T030 [P] [US2] Playwright e2e spec in `apps/amortization-calculator-e2e/src/real-estate-costs.spec.ts` covering quickstart.md Scenario 2: set home price/down payment/tax/insurance/PMI/HOA, assert the total-payment figure and that PMI disappears from the schedule at the 80% LTV period

### FR-014 addendum: loan amount auto-calculation & override (clarification, 2026-11-16)

- [x] T060 [P] [US2] Add `principalIsOverridden: boolean` to `LoanScenario` in `libs/amortization-calculations/src/lib/types.ts`: `true` once the user has typed `principal` directly, `false` while `principal` reflects the auto-calculation (FR-014; see data-model.md "Principal auto-calculation & override")
- [x] T061 [P] [US2] Implement `calculatePrincipalFromHomePriceAndDownPayment(homePrice: number, downPayment: DownPayment): number` in `libs/amortization-calculations/src/lib/calculate-principal.ts`: returns `homePrice - (downPayment is a percent ? homePrice * percent / 100 : downPayment.amount)`, per contracts/calculation-engine.md
- [x] T062 [P] [US2] Unit tests in `libs/amortization-calculations/src/lib/calculate-principal.spec.ts`: covers both an amount-based and a percent-based down payment against known results
- [x] T063 [US2] Implement `applyScenarioPatch(scenario: LoanScenario, patch: Partial<LoanScenario>): LoanScenario` in `libs/amortization-calculations/src/lib/apply-scenario-patch.ts` enforcing the 4-rule state machine from data-model.md: (1) patch includes `principal` → keep it, set `principalIsOverridden: true`; (2) patch includes `homePrice`/`downPayment` (not `principal`) and both are non-null after merging → recompute `principal` via `calculatePrincipalFromHomePriceAndDownPayment` and set `principalIsOverridden: false`; (3) patch touches neither → `principal`/`principalIsOverridden` unchanged; (4) patch includes both `principal` and `homePrice`/`downPayment` at once → rule 1 wins (depends on T060, T061)
- [x] T064 [P] [US2] Unit tests in `libs/amortization-calculations/src/lib/apply-scenario-patch.spec.ts` covering all 4 rules from T063, including the "either homePrice or downPayment still missing after the patch leaves principal unchanged" case (depends on T063)
- [x] T065 [US2] Export `calculatePrincipalFromHomePriceAndDownPayment` and `applyScenarioPatch` from `libs/amortization-calculations/src/index.ts` (depends on T061, T063)
- [x] T066 [US2] Add `principalIsOverridden: false` to the `LoanScenario` literals/fixtures in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`, `validate-scenario.spec.ts`, `compare-scenarios.spec.ts`, and `export-schedule.spec.ts` so they satisfy the extended type from T060 (depends on T060)
- [x] T067 [US2] In `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts`: set `principalIsOverridden: false` in `createDefaultScenario()`, and change `updateActiveScenario()` to call `applyScenarioPatch(activeScenario, patch)` instead of a plain object spread, so every scenario edit enforces FR-014 regardless of which component made it (depends on T063, T065)
- [x] T068 [P] [US2] Playwright e2e spec in `apps/amortization-calculator-e2e/src/principal-auto-calculation.spec.ts` covering quickstart.md Scenario 2 steps 4-6: entering home price + down payment auto-fills the loan amount, manually typing a different loan amount sticks, and changing the down payment again discards that override and recalculates (FR-014) (depends on T067)

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Evaluate extra payments and early payoff (Priority: P2)

**Goal**: Let users add recurring or one-time extra principal payments and see the payoff-date and interest savings versus the baseline schedule.

**Independent Test**: Add a recurring extra monthly payment to a baseline scenario and confirm the recalculated schedule shows an earlier payoff date and lower total interest, with savings clearly displayed (quickstart.md Scenario 3).

### Tests for User Story 3 ⚠️

- [x] T031 [P] [US3] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: adding a recurring extra payment shortens `periods.length` and `baselineComparison.periodsSaved`/`interestSaved` are computed correctly against the same scenario with `extraPayments: []` (FR-007, FR-008)
- [x] T032 [P] [US3] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: a one-time extra payment on a given date is applied entirely to principal in its enclosing period, and all subsequent periods recalculate from the reduced balance (FR-007)
- [x] T033 [P] [US3] Unit test in `libs/amortization-calculations/src/lib/compute-schedule.spec.ts`: an extra payment exceeding the remaining balance is capped at the remaining balance, with the loan marked paid off and no negative `remainingBalance` (Edge Cases)

### Implementation for User Story 3

- [x] T034 [US3] Implement `extraPayments` application (recurring and one-time, capped at the remaining balance per period) inside `computeSchedule()` in `libs/amortization-calculations/src/lib/compute-schedule.ts` (depends on T026)
- [x] T035 [US3] Implement `baselineComparison` in `libs/amortization-calculations/src/lib/compute-schedule.ts`: internally recompute the same scenario with `extraPayments: []` and diff `periodsSaved`/`interestSaved`; set to `null` when `extraPayments` is empty (FR-008) (depends on T034)
- [x] T036 [P] [US3] Build `ExtraPaymentPanel` in `apps/amortization-calculator/src/app/_components/extra-payment-panel.tsx`: add/remove `ExtraPaymentRule` entries (recurring vs. one-time via `@ui-sdk/react` Tabs, amount via `NumberField`, date via `DateField` for one-time)
- [x] T037 [US3] Wire `ExtraPaymentPanel` into `apps/amortization-calculator/src/app/page.tsx`, displaying the "time and interest saved vs. baseline" comparison whenever `extraPayments` is non-empty (depends on T021, T035, T036)
- [x] T038 [P] [US3] Playwright e2e spec in `apps/amortization-calculator-e2e/src/extra-payments.spec.ts` covering quickstart.md Scenario 3: recurring extra payment, one-time extra payment, and an overpayment exceeding the remaining balance

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - Compare multiple loan scenarios side-by-side (Priority: P3)

**Goal**: Create multiple independent loan scenarios and view their key outcomes side-by-side.

**Independent Test**: Create two scenarios with different rates on the same amount/term and confirm the comparison view correctly shows each scenario's monthly payment, total interest, and payoff date side-by-side (quickstart.md Scenario 4).

### Tests for User Story 4 ⚠️

- [x] T039 [P] [US4] Unit test in `libs/amortization-calculations/src/lib/compare-scenarios.spec.ts`: `compareScenarios()` given 2+ computed schedules returns one row per schedule, in input order, with correct `monthlyPayment`/`totalInterest`/`totalCost`/`payoffDate`

### Implementation for User Story 4

- [x] T040 [US4] Implement `compareScenarios(schedules: AmortizationSchedule[]): ScenarioComparison` in `libs/amortization-calculations/src/lib/compare-scenarios.ts` per contracts/calculation-engine.md (depends on T007)
- [x] T041 [US4] Extend `useScenarios()` in `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts` to manage multiple named `LoanScenario` entries plus `activeScenarioId`, with a "duplicate scenario" action that copies inputs into a new independent scenario (depends on T012)
- [x] T042 [P] [US4] Build `ScenarioTabs` in `libs/amortization-ui/src/lib/scenario-tabs.tsx` using `@ui-sdk/react`'s Tabs behavior for switching between and duplicating scenarios
- [x] T043 [P] [US4] Build `ComparisonGrid` in `libs/amortization-ui/src/lib/comparison-grid.tsx` rendering `ScenarioComparison.rows` (monthly payment, total interest, total cost, payoff date) in a single aligned view (FR-010)
- [x] T044 [US4] Wire `ScenarioTabs` and `ComparisonGrid` into `apps/amortization-calculator/src/app/page.tsx`, calling `compareScenarios()` across all stored scenarios (depends on T040, T041, T042, T043)
- [x] T045 [P] [US4] Playwright e2e spec in `apps/amortization-calculator-e2e/src/scenario-comparison.spec.ts` covering quickstart.md Scenario 4: duplicate a scenario, edit it independently, verify the side-by-side comparison view, and removing a scenario leaves the remaining scenario(s) intact and correctly re-selects the active one
- [x] T055 [US4] Extend `useScenarios()` in `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts` with a `removeScenario(id)` action: deletes the scenario, reassigns `activeScenarioId` to a remaining scenario, or creates a fresh default when none remain (FR-010) (depends on T041)
- [x] T056 [P] [US4] Add a remove control to `ScenarioTabs` in `libs/amortization-ui/src/lib/scenario-tabs.tsx` (FR-010)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation/accessibility/formatting coverage that spans every user story

- [x] T046 [P] Playwright e2e spec in `apps/amortization-calculator-e2e/src/validation-and-persistence.spec.ts` covering quickstart.md Scenario 5: zero-principal field error, 0% interest rate accepted, down-payment-equals-home-price error, and session-only persistence (reload same tab retains inputs; new session starts fresh) (FR-009, FR-012)
- [x] T047 [P] Accessibility pass across `NumberField`, `DateField`, `ScheduleTable`, `ScenarioTabs` in `libs/amortization-ui/src/lib/`: verify keyboard navigation and ARIA roles supplied by `@ui-sdk/react` behaviors are intact after styling (FR-009, SC-006)
- [x] T048 [P] Locale-formatting review across all currency/date displays (`ScheduleTable`, `CostBreakdownPanel`, `ComparisonGrid`) confirming consistent `Intl.NumberFormat`/`Intl.DateTimeFormat` usage (FR-013)
- [x] T049 Execute the full manual walkthrough in `specs/001-real-estate-amortization-calculator/quickstart.md` end-to-end and record results
- [x] T050 Run `nx lint amortization-calculator`, `nx test amortization-calculations`, `nx test amortization-ui`, `nx e2e amortization-calculator-e2e`, and `nx build amortization-calculator`; confirm all pass
- [x] T058 [P] Playwright timing check in `apps/amortization-calculator-e2e/src/performance.spec.ts`: measure elapsed time from an input change to the schedule re-rendering for a 360-period scenario, asserting under 1 second (SC-005)
- [x] T059 Conduct a lightweight usability check (e.g., 5-person review) of `CostBreakdownPanel`'s "total estimated monthly payment" vs. "principal & interest only" labeling; record whether reviewers correctly distinguish the two figures, against SC-006's 90% comprehension bar — document results in quickstart.md's validation notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational only
- **User Story 2 (Phase 4)**: Depends on Foundational; extends `computeSchedule()` from US1 (T026 depends on T016) but is independently testable once its own tasks are done
- **User Story 3 (Phase 5)**: Depends on Foundational; extends `computeSchedule()` from US2 (T034 depends on T026)
- **User Story 4 (Phase 6)**: Depends on Foundational only (`compareScenarios()` consumes already-computed schedules; does not require US2/US3 code changes, though it is more useful once they exist)
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories — the MVP
- **US2 (P2)**: Builds on US1's `computeSchedule()` signature but delivers independent value (cost breakdown) and is independently testable
- **US3 (P2)**: Builds on US2's extended `computeSchedule()` but delivers independent value (extra-payment savings) and is independently testable
- **US4 (P3)**: Only depends on Foundational types; can be built in parallel with US2/US3 by a second developer, though its comparison view is most useful once those stories add more scenario detail

### Within Each User Story

- Tests (if any) before implementation
- Calculation-engine extensions before the UI components that consume them
- UI components before the `page.tsx` wiring that composes them
- Story implementation before that story's e2e spec

### Parallel Opportunities

- T002, T003 (Setup) in parallel with T001's own follow-up config tasks
- T008, T009, T011, T012 (Foundational) in parallel once T007 lands
- T013, T014, T015 (US1 tests) in parallel; T017, T018 (US1 UI atoms) in parallel
- T023, T024, T025 (US2 tests) in parallel; T028 in parallel with T026/T027
- T031, T032, T033 (US3 tests) in parallel
- T042, T043 (US4 UI) in parallel
- T046, T047, T048 (Polish) in parallel
- T051, T052 (US1 export) in parallel; T054 in parallel with T057
- T055, T056 (US4 remove-scenario) — T056 can run in parallel with T055
- T058, T059 (Polish additions) in parallel with T046-T048
- T060, T061 (FR-014 type + pure function) in parallel; T062, T064 (FR-014 tests) in parallel with each other once their implementation lands
- Once Foundational is done, US4's tasks (T039-T045, T055-T056) can proceed in parallel with US2/US3 by a second developer, since US4 does not depend on US2/US3 code

---

## Parallel Example: User Story 1

```bash
# Tests together:
Task: "Unit test $300k/6.5%/30yr baseline schedule in libs/amortization-calculations/src/lib/compute-schedule.spec.ts"
Task: "Unit test 0% interest rate edge case in libs/amortization-calculations/src/lib/compute-schedule.spec.ts"
Task: "Unit test month-end start date rollover in libs/amortization-calculations/src/lib/compute-schedule.spec.ts"

# UI atoms together:
Task: "Build NumberField in libs/amortization-ui/src/lib/number-field.tsx"
Task: "Build DateField in libs/amortization-ui/src/lib/date-field.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks everything)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md Scenario 1 manually and `nx e2e amortization-calculator-e2e -- baseline-schedule`
5. Demo: a working payment calculator with a full amortization schedule

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → validate independently → MVP demo
3. US2 → validate independently → real-estate cost breakdown demo
4. US3 → validate independently → extra-payment savings demo
5. US4 → validate independently → scenario-comparison demo
6. Polish → accessibility/formatting/full quickstart pass

### Parallel Team Strategy

With two developers: both complete Setup + Foundational together, then one takes US1 → US2 → US3 (the dependent chain) while the other starts US4 (independent of US2/US3) as soon as Foundational lands, rejoining for Polish.

---

## Implementation Notes (as-built)

All 59 tasks are implemented and verified: 16 Vitest unit tests (`nx test amortization-calculations`) and 24 Playwright e2e tests across Chromium/Firefox/WebKit (`nx run-many -t e2e`) pass, `nx run-many -t lint,test,build` is clean, and `nx dev` serves a fully working app. A few real-world adaptations versus the original task wording, discovered only once the actual installed tool versions were in hand:

- **Workspace bootstrap**: `npx create-nx-workspace@latest` (research.md's prerequisite for T001) was required before any `nx g` command could run; this installed Nx 24, whose `apps`/`next` preset now scaffolds via a template rather than the classic generator-only flow. The resulting `apps/` + `libs/` layout matches the plan exactly.
- **T005 (path aliases)**: Nx 24 resolves workspace libraries as real npm-workspace packages (via each lib's `package.json` name + `exports` map), not `tsconfig.json` "paths". The libraries are named `amortization-calculations` and `amortization-ui` (plain names, not the `@amortization/*` scope originally planned — scoped names collided with Nx's package-name-as-project-name convention and would have required quoting every `nx` command). Imports use these plain names.
- **T006 (module boundaries)**: satisfied by the default `@nx/enforce-module-boundaries` ESLint config Nx generates, combined with each library's `package.json` `exports` map restricting consumers to the public barrel (`./src/index.ts`) — deep imports into a library's internals are structurally blocked, not just lint-warned.
- **T011 (SDK portal/root container)**: turned out to be unnecessary. `@ui-sdk/react`'s popups/menus render via the browser's top layer with no Portal/Provider required (confirmed in the package's own docs), and this feature uses no popup-based component (`DateInput` is a segmented text control, not a calendar popup). No `providers.tsx` was created.
- **Next.js + workspace libraries**: `@nx/next` v24 no longer wraps `next.config.js` with `composePlugins(withNx, ...)`; Nx's task running is purely "inferred tasks" calling `next` directly. `apps/amortization-calculator/next.config.js` instead declares `transpilePackages: ['amortization-calculations', 'amortization-ui']` so Next/Turbopack compiles the two workspace libraries' TypeScript source.
- **Tailwind CSS**: the installed `@nx/next:app` and `@nx/react:lib` generators (v24) have no `--style=tailwind` option (only `css`/`scss`/`none`). Tailwind v4 was wired manually: `tailwindcss` + `@tailwindcss/postcss`, `postcss.config.mjs`, and `@import 'tailwindcss'; @source '../../../../libs/amortization-ui/src';` in `global.css` so classes used only in the UI library are still scanned.
- **`DateField` (T018)**: built on `@ui-sdk/react`'s `DateInput` (a segmented M/D/Y text control with an ISO-string value) rather than the full calendar `DatePicker`, since this app's date fields need unambiguous entry, not a calendar — `DateInput` matches the data model's `ISO date string` type directly.
- **Playwright + WebKit**: `locator.fill()` did not reliably update the custom `NumberInput` control in WebKit (it updated instantly in Chromium/Firefox). All e2e specs use a shared `fillNumberField()` helper (`apps/amortization-calculator-e2e/src/helpers.ts`) that clicks, selects all, and types the value as real keystrokes instead, which is reliable across all three engines.

### FR-014 addendum (T060-T068, 2026-11-16)

All 9 tasks implemented and verified: `calculatePrincipalFromHomePriceAndDownPayment()` and `applyScenarioPatch()` added to `libs/amortization-calculations` with 8 new unit tests (24 total, up from 16), `use-scenarios.ts` now routes every scenario edit through `applyScenarioPatch`, and a new Playwright spec (`principal-auto-calculation.spec.ts`) covers the full auto-calculate → override → discard-on-change flow across all 3 browsers (27 e2e tests total, up from 24). `nx run-many -t lint,test,build` is clean.

- **Accessibility fix found along the way**: writing T068 surfaced that the "Down payment" (`CostBreakdownPanel`) and "Loan term" (`LoanInputForm`) `NumberField`s were rendered with `label=""` — relying entirely on an adjacent `<span>` for the visible text, so the control itself had no accessible name (a real a11y gap, not just a test inconvenience). Added a `visuallyHiddenLabel` prop to `NumberField` (`libs/amortization-ui/src/lib/number-field.tsx`) so these fields now carry a real accessible name (`sr-only` label) while keeping the same visual layout.
- **`fillNumberField()` bug fix**: the helper's `Backspace`-then-type approach (used since the WebKit fix above) broke the first time a test retyped over an *already-populated, currency-formatted* field (overriding the auto-calculated loan amount): clearing a real value commits/reformats the field to `"$0.00"` immediately, so subsequent keystrokes appended after that text instead of replacing it, silently producing `$0.00` instead of the intended value. Earlier specs never hit this because they only ever typed into previously-empty or non-currency fields. Fixed by dropping the `Backspace` step — select-all followed by `pressSequentially()` replaces the selection on the first keystroke, which works correctly in all three browsers and for both empty and already-populated fields.
