---
description: 'Task list for spec 012: multi-unit rent roll, house-hacking and RUBS'
---

# Tasks: Multi-Unit Rent Roll, House-Hacking and Utility Split (RUBS)

**Input**: Design documents from `/specs/012-multi-unit-rent-roll/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R7), data-model.md (§A–§G), contracts/calculations.md, contracts/ui.md, quickstart.md

**Tests**: Required. Constitution I needs cent-level unit tests for every calculation, and spec
FR-023 / SC-001 / SC-006 ask for a backward-compatibility golden test and accessibility scans.

**Gate for every task** (as in specs 010/011): `npx nx run-many -t lint test typecheck` passes
before a task is checked off. A UI task also needs the affected e2e specs to pass against a prod
build on :3200 (`BASE_URL=http://127.0.0.1:3200`, not the :3000 dev server).

**Format**: `[ID] [P?] [Story] Description`. `[P]` = different files, no dependency on an
unfinished task.

---

## Phase 1: Setup

**Purpose**: A baseline to compare against.

- [ ] T000 Finish spec 011: full e2e passing twice and every task checked off. Merge `011-ui-polish` into `main`. Create the `012-multi-unit-rent-roll` branch from `main`, and commit `specs/012-multi-unit-rent-roll/` there.
- [ ] T001 Record the baseline in `specs/012-multi-unit-rent-roll/tasks.md` § Baseline notes:
  - unit test count;
  - e2e pass/skip counts (after the spec 011 e2e failures are resolved or listed as known);
  - the current `git rev-parse HEAD`.
- [ ] T002 [P] Write a golden snapshot generator in `libs/deal-analyzer/calculations/src/lib/__fixtures__/golden-baseline.ts`:
  - For every scenario in `generated-scenarios.ts` and `dscr-reference.ts`, capture the
    pre-feature output of `analyzeDeal`, `projectRental`, `projectWealth` and `projectExit` as
    committed JSON in `__fixtures__/golden-baseline.json`.
  - This runs **before** any calculation change (SC-001).

---

## Phase 2: Foundational (blocks every story)

**Purpose**: The types, the single income function and its wiring into every calculation. These
must land before the UI stories. With one implicit unit and no RUBS, results must be identical.

- [ ] T003 Extend the types in `libs/shared/calculations/src/lib/types.ts` (data-model §A–§C):
  - `RentUnit` = `{ id: string; name: string /* 1–40 chars, trimmed */; bedrooms: number | null /* integer 0–10 */; bathrooms: number | null /* 0–10, step 0.5 */; rent: number /* ≥ 0 */; vacancyPct: number | null /* 0–100; null = use rental.vacancyPct */; ownerOccupied: boolean /* at most one unit true */; rentAfterMoveOut: number | null /* ≥ 0 */ }`.
  - `OccupancyView = 'living' | 'afterMoveOut'`.
  - `RentalAssumptions` gets `units?: RentUnit[]` (1–4), `moveOutYears?: number` (integer
    1–30, default 1) and `occupancyView?: OccupancyView` (default 'living').
  - `CustomExpenseItem` gets `paidBy?: 'landlord' | 'rubs'` (default 'landlord') and
    `recoveryPct?: number` (0–100, default 100).
  - Update the doc comment on `grossMonthlyRent`: it is now "always the after-move-out rent-roll
    total" (R1).
- [ ] T004 Write the failing tests in `libs/shared/calculations/src/lib/rent-roll.spec.ts` (data-model §D), to the cent:
  - `normalizeUnits`: no `units` gives one "Unit A" at `grossMonthlyRent`.
  - Equivalence: one implicit unit, no overrides and no RUBS give `vacancyMonthly = (rent + other) × v/100` and `reimbursementMonthly = 0`.
  - Per-unit vacancy: $1,350 / $1,400 with 5% overall and Unit B at 10% gives $207.50.
  - Owner unit, `'living'` view: rent $1,400 (Unit A contributes 0 with rate 0).
  - Owner unit, `'afterMoveOut'` view: rent $2,750.
  - `rentAfterMoveOut` null counts as $0.
  - RUBS $180 at 100%, 2 units, 0% vacancy: $180 after move-out and $90 living there.
  - RUBS with 50% recovery and 10% vacancy on one unit: $180 × 0.5 × (0.5 × 1 + 0.5 × 0.9) = $85.50.
  - A $0-rent unit pays no RUBS share.
  - `rentRollTotal`, `hasOwnerUnit`, and `currentView` (defaults to 'living').
- [ ] T005 Implement `libs/shared/calculations/src/lib/rent-roll.ts`:
  - The functions: `normalizeUnits`, `hasOwnerUnit`, `rentRollTotal`, `currentView`, and
    `rentRollIncome(rental, view): IncomeBasis`.
  - `IncomeBasis` = `{ rentMonthly, otherMonthly, pctBaseMonthly, vacancyMonthly, reimbursementMonthly, units: { id, name, effectiveRent, rate, vacancyMonthly }[] }`.
  - Group units by vacancy rate, so units without their own rate use `(Σ rent + other) × v` in
    one multiplication. That way the old single-rent results round exactly as before (golden
    test, T010).
  - Follow data-model §D exactly (contracts/calculations.md). Export it from
    `libs/shared/calculations/src/index.ts`, then make T004 pass.
- [ ] T006 Extend `validateRental` in `libs/shared/calculations/src/lib/validate-rental.ts` and its spec `validate-rental.spec.ts` (data-model §F, R7). Add these errors, with these exact messages:

  | Key | Message |
  |---|---|
  | `rental.units` | "Add at least one unit" / "Up to 4 units" / "Only one unit can be yours" |
  | `rental.units.<i>.name` | "Enter a unit name" / "40 characters max" |
  | `rental.units.<i>.rent` | "Rent can't be negative" |
  | `rental.units.<i>.vacancyPct` | "Use 0–100%" |
  | `rental.units.<i>.rentAfterMoveOut` | "Rent can't be negative" |
  | `rental.moveOutYears` | "Use 1–30 years" |
  | `rental.customExpenses.<i>.recoveryPct` | "Use 0–100%" |

  A rental without `units` gets no new errors.
- [ ] T007 Rework `libs/deal-analyzer/calculations/src/lib/rental-line-items.ts` (R2):
  - Take `(scenario, income: IncomeBasis, rentFactor, expenseFactor)`.
  - The vacancy line is `income.vacancyMonthly × rentFactor`, with the label `Vacancy (v%)`, or
    `Vacancy` when any unit has its own rate.
  - The %-lines are based on `income.pctBaseMonthly × rentFactor`.
  - Custom expenses stay full-amount fixed lines for both 'landlord' and 'rubs'.
- [ ] T008 Update `analyze-deal.ts` in `libs/deal-analyzer/calculations/src/lib/` to `analyzeDeal(scenario, schedule, options?: { view?: OccupancyView })`, per contracts/calculations.md:
  - Income: `income = rentRollIncome(rental, options.view ?? currentView(rental))`.
  - GSI = `pctBaseMonthly`. NOI = `pctBaseMonthly + reimbursementMonthly − opex`.
  - New result fields:
    - `view`: null without an owner unit;
    - `income`: `{ rent, other, reimbursements }` as MonthlyAnnual;
    - `unitBreakdown`: when there are 2 or more units;
    - `netHousingCost`: `−monthlyCashFlow` in the living view with an owner unit, else null.
  - The 1% and 50% rules use `rentRollTotal(rental)` (FR-015).
  - **Tests first**, in `analyze-deal.spec.ts`, to the cent (Constitution I, FR-023). All cases use
    the duplex (Unit A $1,350 / Unit B $1,400, 5% vacancy):
    - "After move-out" equals the same deal with a single $2,750 rent.
    - "Living there" with Unit A owner-occupied: rent $1,400, and `netHousingCost` = −cash flow
      (hand-computed).
    - Raising Unit B's rent until the cash flow is above $0 gives `netHousingCost` ≤ 0.
    - With RUBS Water/Sewer $180 at 100% and 0% vacancy, NOI is +$180 after move-out and +$90
      living there.
    - The 1%/50% rules are identical in both views.
    - A single owner-occupied unit (no other units) gives rent $0 in "Living there".
    - Without an owner unit: `view` is null and `netHousingCost` is null.
- [ ] T009 Update the projections to use the shared income function, picking the view per year (R5):
  - **`operating-year.ts`**: use `rentRollIncome` with view = `hasOwnerUnit && year ≤ (moveOutYears ?? 1)` ? 'living' : 'afterMoveOut'.
    - Rent-side figures × `(1+rentGrowth)^(year−1)`; reimbursements × `(1+expenseGrowth)^(year−1)`.
    - Return `{ gsiMonthly, reimbursementMonthly, opexMonthly }`.
  - **`project-rental.ts`, `project-wealth.ts` and `project-exit.ts`**: base their income on
    `operatingYear` / `rentRollIncome` instead of `grossMonthlyRent`, and add NOI with
    reimbursements.
  - **Wealth and exit results** gain `moveOutYear: number | null` (null without an owner unit).
  - Update the `DealAnalysis` / projection types in `types.ts`.
  - **Tests first**, in `project-wealth.spec.ts` / `project-exit.spec.ts` (Constitution I), using
    the duplex with Unit A owner-occupied and 3% rent / 2% expense growth:
    - `moveOutYears` 1: year 1 uses "Living there" income, year 2 uses "After move-out" with
      Unit A at $1,350 × 1.03.
    - `moveOutYears` 3: years 1–3 living there, year 4 after move-out.
    - A move-out past the horizon: every year is "Living there", and `moveOutYear` is still
      returned.
    - RUBS reimbursement grows by 2% a year.
    - `moveOutYear` is null without an owner unit.
- [ ] T010 Add the golden test `libs/deal-analyzer/calculations/src/lib/golden-baseline.spec.ts`. Every fixture's `analyzeDeal` / `projectRental` / `projectWealth` / `projectExit` output must equal `__fixtures__/golden-baseline.json` (T002) field by field (the new fields excepted: `view: null`, `income`, `unitBreakdown: []`, `netHousingCost: null`, `moveOutYear: null`). This must pass before any UI work (SC-001).
- [ ] T011 [P] Update `readDealField` / `formatDealField` in `libs/shared/calculations/src/lib/deal-fields.ts` and `deal-fields.spec.ts`:
  - `rental.grossMonthlyRent` reads `rentRollIncome(rental, currentView(rental)).rentMonthly`.
  - Add `formatRentWithUnits(rental, view = currentView(rental))`, which returns the rent in
    `view` plus " · N units" when N ≥ 2. Test cases: "$2,750 · 2 units" after move-out,
    "$1,400 · 2 units" living there, and plain "$2,750.00" for a single unit.
  - `dealFieldPatch('rental.grossMonthlyRent', x)` on a one-unit roll also sets `units[0].rent`
    (keeping both in sync).
- [ ] T012 [P] Update `rental-defaults.ts` in `libs/shared/calculations/src/lib/`: new rentals start with `units: [{ id, name: 'Unit A', bedrooms: null, bathrooms: null, rent: 0, vacancyPct: null, ownerOccupied: false, rentAfterMoveOut: null }]` (FR-003). Check `persistence.spec.ts` round-trips `units`, `moveOutYears`, `occupancyView`, `paidBy` and `recoveryPct`.
- [ ] T013 Add the rent-roll actions to `libs/shared/data-access/src/lib/use-rental-editor.ts`:
  - The actions: `addUnit()` (no-op at 4), `removeUnit(id)` (no-op at 1), `updateUnit(id, patch)`, `setOwnerUnit(id | null)`, `setMoveOutYears(n)`, `setOccupancyView(view)` and `updateCustomExpense(index, { paidBy, recoveryPct })`.
  - Every rent-roll write also sets `grossMonthlyRent = rentRollTotal(next)` (R1).
  - The owner-unit transitions follow data-model §G.
  - `setOccupancyView` writes without an undo entry or toast (R4).
  - In `deal-edits-provider.tsx`, toast labels read "Rent roll changed" (with the before/after
    total) and "Unit removed" (undoable).
  - Add unit tests for these actions in `use-rental-editor.spec.ts`.

**Checkpoint**: The calculations are unchanged for existing data (golden test green), and the
data layer can represent everything in the spec.

---

## Phase 3: User Story 1 - Enter rent unit by unit (Priority: P1) 🎯 MVP

**Goal**: A 1–4 unit rent roll in the Edit deal sheet, whose total drives every page.

**Independent Test**: Unit A $1,350 plus Unit B $1,400 gives a deal card reading "$2,750 · 2 units", and the results equal a single $2,750 rent.

- [ ] T014 [P] [US1] Write `rent-roll-editor.spec.tsx` in `libs/shared/ui/src/lib/` covering:
  - one row by default;
  - "+ Add unit" adds "Unit B";
  - Remove (`aria-label="Remove Unit B"`) is hidden at 1 unit;
  - add is disabled at 4, with the note "Rent rolls cover 1–4 unit homes";
  - the total row shows "Total rent $2,750.00/mo";
  - an inline error under a negative rent.
- [ ] T015 [US1] Implement `RentRollEditor` in `libs/shared/ui/src/lib/rent-roll-editor.tsx`, per contracts/ui.md:
  - `data-testid="rent-roll"`.
  - Each row is `data-testid="rent-unit"`, a `role="group"` named by the unit name, with the
    fields Name (text, max 40), Beds, Baths (step 0.5) and Rent (`NumberField` currency).
  - Fields use the ds parts. Rows stack below `sm` (SC-007).
  - Export it from `libs/shared/ui/src/index.ts`. Make T014 pass.
- [ ] T016 [US1] Replace the single Rent `NumberField` in `libs/shared/ui/src/lib/rental-inputs-panel.tsx` with `RentRollEditor`, wired to the T013 actions. Leave Other income and the percentage fields as they are.
- [ ] T017 [US1] Update the deal card Rent cell in `libs/shared/ui/src/lib/deal/chip-popover.tsx` and `deal-strip.tsx`:
  - The value uses `formatRentWithUnits`.
  - With N ≥ 2 (or an owner unit), selecting it opens the Edit deal sheet with
    `focusField: 'rental.units'` instead of the number popover.
  - `deal-sheet.tsx` scrolls to and focuses the first unit's Rent field for that key.
- [ ] T018 [P] [US1] Map any `rental.units.*` error to the Rent field in `libs/shared/ui/src/lib/deal/deal-errors.ts` (for the error count and focus, R7), and update `deal-sentence.tsx` to read the total rent with "across N units" when N ≥ 2.
- [ ] T019 [US1] Show one row per unit (name and rent) under Rent in `libs/deal-analyzer/ui/src/lib/income-expense-card.tsx` when `unitBreakdown.length ≥ 2` (FR-010).
- [ ] T020 [US1] Write the e2e `apps/amortization-calculator-e2e/src/rent-roll.spec.ts` covering:
  - an existing single-rent scenario shows "Unit A" at the same rent, with unchanged Deal
    Analyzer figures;
  - adding Unit B ($1,350 / $1,400) reads "$2,750 · 2 units", and the cash flow equals the
    $2,750 single-rent deal;
  - removing a unit, then Undo restores it;
  - add is disabled at 4;
  - the units persist across a reload and a scenario switch;
  - at 390px with 4 units, `scrollWidth ≤ 390`.

**Checkpoint**: The MVP. The rent roll works end to end, and every number is unchanged for a single unit.

---

## Phase 4: User Story 2 - Vacancy per unit (Priority: P2)

**Goal**: A unit can override the overall vacancy rate.

**Independent Test**: With 5% overall and Unit B at 10%, the vacancy line reads $207.50/mo.

- [ ] T021 [US2] Add an optional "Vacancy" % `NumberField` to each row in `rent-roll-editor.tsx` (in `libs/shared/ui/src/lib/`):
  - range 0–100; the placeholder reads "Uses {v}%", and empty means null;
  - clearing it reverts to the overall rate.
  - Extend `rent-roll-editor.spec.tsx` to cover it.
- [ ] T022 [US2] Show each unit's vacancy share in the unit rows of `income-expense-card.tsx` (in `libs/deal-analyzer/ui/src/lib/`), and label the vacancy line `Vacancy` (no %) when rates differ.
- [ ] T023 [US2] Add the per-unit vacancy case to the e2e `rent-roll.spec.ts`: Unit B at 10% gives $207.50/mo vacancy, and clearing it gives $137.50.

---

## Phase 5: User Story 3 - House-hacking (Priority: P2)

**Goal**: An owner-occupied unit, the "Living there / After move-out" views, net housing cost, and the move-out switch in the projections.

**Independent Test**: Unit A marked "I live here" (with $1,350 after move-out) gives a rent of $1,400 and a net housing cost in "Living there", and in "After move-out" the figures equal the both-rented deal.

- [ ] T024 [US3] Add the owner-occupancy controls to `rent-roll-editor.tsx` (in `libs/shared/ui/src/lib/`):
  - an "I live here" ui-sdk checkbox per row;
  - when checked, the Rent field becomes "Rent after move-out", with a read-only line "Rent while you live here: $0";
  - one "Move out after [N] years" `NumberField` (1–30) below the rows;
  - the total row adds "while living there $Y/mo".
  - Checking a second unit moves the flag (`setOwnerUnit`).
  - When the owner unit's `rentAfterMoveOut` is null, the deal card (`deal-strip.tsx`) shows the
    dashed hint "+ Add rent after move-out to see the full rental". Selecting it opens the sheet
    with `focusField: 'rental.units.<i>.rentAfterMoveOut'`. Add a hint case to
    `deal-strip.spec.tsx`.
  - Extend the component spec to cover these.
- [ ] T025 [P] [US3] Create `libs/shared/ui/src/lib/occupancy-view-switch.tsx`:
  - a `SegmentedControl` with label "Income view" and the options "Living there" / "After move-out";
  - `data-testid="occupancy-view"`;
  - it renders only when `hasOwnerUnit`, and writes through `setOccupancyView`.
  - Export it, and add a unit test.
- [ ] T026 [US3] Render `OccupancyViewSwitch` in three places:
  - the deal card header row in `libs/shared/ui/src/lib/deal/deal-strip.tsx`, before the actions;
  - the top of the results in `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx`;
  - the top of the results in `libs/deal-analyzer/ui/src/lib/financing-view.tsx`.

  The Deal Analyzer and DSCR results use `analyzeDeal(..., { view })` with the stored view.
- [ ] T027 [US3] Add a "Net housing cost" `MetricCard` (`data-testid="net-housing-cost"`) in `libs/deal-analyzer/ui/src/lib/deal-metrics.tsx`, shown only in the living view:
  - the value is `netHousingCost` /mo;
  - when it's ≤ 0, the explanation reads "You live for free and net $X/mo".
  - The 1% / 50% cards add "Based on full rent after move-out" when there's an owner unit.
  - Extend `metric-card.spec.tsx` (or the deal-metrics test) to cover it.
- [ ] T028 [US3] Add a move-out marker (`data-testid="move-out-marker"`, text "Move out") at `moveOutYear`:
  - in `libs/deal-analyzer/ui/src/lib/net-worth-chart.tsx`;
  - in the `wealth-table.tsx` and `pro-forma-table.tsx` rows;
  - when `moveOutYear` > horizon, a chart note reads "Move-out (year N) is after the horizon".
- [ ] T029 [US3] Write the e2e `apps/amortization-calculator-e2e/src/house-hack.spec.ts` covering:
  - marking Unit A shows the switch on the card, the Deal Analyzer and DSCR, defaulting to
    "Living there";
  - rent reads $1,400 and net housing cost is visible;
  - switching to "After move-out" makes the figures equal the both-rented deal, and the switch
    state is shared across pages;
  - the move-out marker appears at year 1 on /wealth and /pro-forma;
  - unmarking hides the switch and Unit A's rent becomes $1,350;
  - removing the owner unit hides the switch.

---

## Phase 6: User Story 4 - Utility split / RUBS (Priority: P3)

**Goal**: "Paid by" on custom expenses, and a "Utility reimbursements (RUBS)" income line.

**Independent Test**: Water/Sewer at $180, set to RUBS at 100% with 0% vacancy, gives a reimbursement of $180 and raises NOI by $180.

- [ ] T030 [US4] Add the "Paid by" controls to each custom expense row in `libs/shared/ui/src/lib/rental-inputs-panel.tsx`:
  - a `SegmentedControl label="Paid by"` (**Landlord** / **Tenants (RUBS)**, the exact labels in FR-017);
  - for RUBS, a `NumberField "Recovered"` (%, 0–100, default 100);
  - wired to `updateCustomExpense`, with a component test.
- [ ] T031 [US4] Add an income row "Utility reimbursements (RUBS)" to `libs/deal-analyzer/ui/src/lib/income-expense-card.tsx`, shown when `income.reimbursements > 0`. NOI and cash flow there use the T008 result.
- [ ] T032 [US4] Write the e2e `apps/amortization-calculator-e2e/src/rubs.spec.ts` covering:
  - a new custom expense defaults to Landlord, and the figures are unchanged;
  - RUBS at 100% gives reimbursement $180 and NOI +$180;
  - living in Unit A gives a reimbursement of $90;
  - 50% recovery gives $90 after move-out.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T033 [P] Add the new controls to the accessibility scans in `apps/amortization-calculator-e2e/src/a11y.spec.ts`: axe in light and dark with the rent roll open (4 units, an owner unit and a RUBS expense) and with the occupancy switch visible. Expect zero violations, plus a keyboard-only pass that adds a unit, marks the owner unit and toggles the view (SC-006).
- [ ] T034 [P] Update the READMEs:
  - `libs/shared/calculations/README.md`: the rent-roll API and the R1 sync rule;
  - `libs/deal-analyzer/calculations/README.md`: the `analyzeDeal` view option, `netHousingCost`, `moveOutYear` and RUBS income;
  - `libs/shared/ui/README.md`: `RentRollEditor` and `OccupancyViewSwitch`.
- [ ] T035 Run `visual.spec` and update the snapshots that legitimately changed (the Rental group in the sheet, and the deal card with units). Review them against the spec 010/011 design rules (tokens only, spacing, contrast).
- [ ] T036 Run the full gate: `npx nx run-many -t lint test typecheck`, the build, and the full e2e twice on :3200. Record the counts in § Baseline notes.
- [ ] T037 Run quickstart.md §1–§6 by hand, and append a "Verified on {date}" block to `specs/012-multi-unit-rent-roll/quickstart.md`.

---

## Dependencies & Execution Order

- **T000** → **Setup (T001–T002)** → **Foundational (T003–T013)** → the stories. T002 must run before
  T005–T009 change any calculation.
- In Foundational: T003 → T004 → T005 → (T006, T007, T011, T012 in parallel) → T008 → T009 → T010;
  T013 after T005.
- **US1 (T014–T020)** needs Foundational. It's the MVP.
- **US2 (T021–T023)** needs US1 (it extends the rent roll editor).
- **US3 (T024–T029)** needs US1. It can run alongside US2, except that T024 and T021 both edit
  `rent-roll-editor.tsx`, so do them one after the other.
- **US4 (T030–T032)** needs only Foundational (the calculations are already in T005/T008), so it
  can run alongside US1–US3. T030 and T016 both edit `rental-inputs-panel.tsx`, so do them in
  order.
- **Polish (T033–T037)** comes after the stories you include.

### Parallel examples

- Foundational: after T005, run T006 (validation), T007 (line items), T011 (deal fields) and T012
  (defaults) together.
- US1: T014 (component test) and T018 (errors and sentence) together, then T015 → T016 → T017.
- US3: T025 (switch) alongside T024 (editor).
- Across stories: US4's T031 (income card) can run alongside US3's T027 (metrics), since they're
  different files.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1. Ship it once the golden test and `rent-roll.spec` pass.
   Investors can already model duplexes to fourplexes.
2. Add US2 (small), then US3 (the biggest user value after the MVP), then US4.
3. Polish last: the accessibility scans, the visual check, and the gate run twice.

## Baseline notes

(T001 fills this in.)
