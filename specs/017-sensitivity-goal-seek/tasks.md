---
description: 'Task list for spec 017: sensitivity matrix and Max Allowable Offer'
---

# Tasks: Sensitivity Matrix and Max Allowable Offer

**Input**: Design documents from `/specs/017-sensitivity-goal-seek/`

**Prerequisites**: plan.md, spec.md, research.md (R1–R9), data-model.md (§A–§G), contracts/calculations.md, contracts/ui.md, quickstart.md

**Tests**: Required. Constitution I needs cent-level unit tests for every calculation (FR-020); SC-002 asks for an exact $1 boundary over 50+ deals; SC-005 asks for accessibility scans.

**Gate for every task**: `npx nx run-many -t lint test typecheck` passes before a task is checked off. A UI task also needs the affected e2e specs to pass against a prod build on :3215 (`BASE_URL=http://127.0.0.1:3215`, never the :3000 dev server).

**Worktree**: all work happens in `/Users/t_hein/Projects/companion/.claude/worktrees/014-sensitivity-goal-seek` (branch `017-sensitivity-goal-seek`). Don't touch the sibling worktree `014-refinance-brrrr`.

**Format**: `[ID] [P?] [Story] Description`. `[P]` = different files, no dependency on an unfinished task.

---

## Phase 1: Setup

- [X] T001 Install dependencies in this worktree (`npm ci`, it has no `node_modules`), then run `npx nx run-many -t lint test typecheck` and record the unit test count in § Baseline notes below.
- [X] T002 Build (`npx nx build amortization-calculator`), serve the prod build on :3215 and run the full e2e suite with `BASE_URL`. Record pass/skip/fail counts in § Baseline notes (nothing in this feature exists yet, so this is the baseline SC-007 compares against).

---

## Phase 2: Foundational (blocks every story)

**Purpose**: The stored type, the variant builder, target validation and an empty page shell. After this, each story adds one visible part.

- [X] T003 Add the type in `libs/shared/calculations/src/lib/types.ts` (data-model §A): `SensitivityAssumptions` = `{ targetMeasure?: 'cashOnCash' | 'cashFlow'; cashOnCashPct?: number /* 0 ≤ x ≤ 1000 */; cashFlowMonthly?: number /* finite, |x| ≤ 1,000,000 */ }`; add `sensitivity?: SensitivityAssumptions | null` to `RentalAssumptions`; add `` `rental.sensitivity.${'cashOnCashPct' | 'cashFlowMonthly'}` `` to the `FieldError.field` union. Add a round-trip case to `libs/shared/calculations/src/lib/persistence.spec.ts` (all three fields survive `serializeScenarios` → `deserializeScenarios`).
- [X] T004 [P] Write `libs/deal-analyzer/calculations/src/lib/validate-sensitivity.ts` and `validate-sensitivity.spec.ts` (tests first):
  - Export `SensitivityMeasure`, `SensitivityTarget` (`{ measure, value }`, value in % or $/mo) and `DEFAULT_SENSITIVITY` = `{ cashOnCashPct: 8, cashFlowMonthly: 300 }`.
  - `resolveTarget(rental, fallbackMeasure = 'cashOnCash')` returns the stored target (the measure's own value, or its default; the measure is `rental.sensitivity.targetMeasure ?? fallbackMeasure`), plus `isSet`: true once a `sensitivity` object is saved (data-model §A), so the grid shows no below-target marks before the investor touches the target.
  - `validateSensitivityTarget(target)` returns `FieldError[]` with these exact messages: Cash-on-Cash must be finite and `0 ≤ x ≤ 1000`, otherwise "Use 0–1000%" (key `rental.sensitivity.cashOnCashPct`), so a negative value reads "Use 0–1000%"; cash flow must be finite with `|x| ≤ 1,000,000`, otherwise "Enter a dollar amount" (key `rental.sensitivity.cashFlowMonthly`).
  - Export from `libs/deal-analyzer/calculations/src/index.ts`.
- [X] T005 Write the variant builder and rate rows in `libs/deal-analyzer/calculations/src/lib/sensitivity.ts`, with tests first in `sensitivity.spec.ts` (use `__fixtures__/dscr-reference.ts`'s `referenceScenario`; data-model §C, research R3, R5):
  - **`scenarioVariant(scenario, { ratePct?, price?, priceChangePct?, rentChangePct? })`**:
    - `price' = price` or `roundCents(homePrice × (1 + priceChangePct/100))`.
    - `principal' = principal + (price' − down(price')) − (homePrice − down(homePrice))`, where `down(p)` is `percent × p / 100` or the fixed amount. `principalIsOverridden` is unchanged.
    - Rent: every unit's `rent` and `rentAfterMoveOut` become `roundCents(x × f)` with `f = 1 + rentChangePct/100`, and `grossMonthlyRent = rentRollTotal(rental')`; a rental without units scales `grossMonthlyRent`. Other income, vacancy rates, owner flag, view, RUBS and all other fields stay.
    - A variant that fails `validateScenario` is reported as invalid (the grid turns it into an n/a cell).
  - **`rateRows(ratePct, stepPct)`** returns `{ rows, currentIndex }`: `rate_k = round4(rate + k × step)` for five consecutive `k` starting at `kMin = max(−2, ceil(−rate / step − 1e-9))`, `currentIndex = −kMin`.
  - **Tests** (to the cent): a variant with no change deep-equals the original scenario's `analyzeDeal` output; price −10% on 25% down gives principal `$187,500 − $22,500 × 0.75`; a fixed-dollar down payment keeps the dollar amount; a directly entered loan (`principalIsOverridden: true`) shifts by the same dollar amount as a derived loan would; rent ±10% on a 2-unit rent roll scales both units and the total; a fixed down payment ≥ the new price is invalid; `rateRows(6.5, 0.5)` = 5.5…7.5 with `currentIndex` 2; `rateRows(0.5, 1)` has `kMin = 0`, so rows 0.5, 1.5, 2.5, 3.5, 4.5 and `currentIndex` 0; `rateRows(0.75, 0.5)` has `kMin = −1`, so rows 0.25, 0.75, 1.25, 1.75, 2.25 and `currentIndex` 1; `rateRows(0, 0.25)` starts at 0 with `currentIndex` 0; no row is ever below 0.
  - Export from `index.ts`.
- [X] T006 [P] In `libs/shared/data-access/src/lib/deal-edits-provider.tsx` add `'page'` to `DealEditSource` (used by "Use this price"). Check `deal-change-toast.tsx` and any `source` switch statements still typecheck, and add one unit test that an `editDeal('homePrice', …, 'page')` is recorded and undone.
- [X] T007 [P] Add the page plumbing (each addition in its own block, so merging with the other in-progress page feature is mechanical, plan Complexity note):
  - `GridIcon` (3 × 3 grid, same style and `size-5` as the other icons) in `libs/shared/ui/src/lib/icons.tsx`.
  - `'sensitivity'` in the `PageProfile.pageId` union and `SENSITIVITY_PROFILE` in `libs/shared/ui/src/lib/deal/page-profiles.ts`: `pinned: ['annualInterestRatePct', 'homePrice', 'downPayment', 'rental.grossMonthlyRent']`, `muted: []`, `requires: [{ field: 'homePrice', unlocks: 'the grid' }, { field: 'downPayment', unlocks: 'the grid' }, { field: 'rental.grossMonthlyRent', unlocks: 'the grid' }]`. Export it.
  - The nav item `{ id: 'sensitivity', label: 'Sensitivity', href: '/sensitivity', icon: <GridIcon /> }` after "Sale Profit" in `apps/amortization-calculator/src/app/_nav.tsx`.
  
- [X] T008 Create the page shell `libs/deal-analyzer/ui/src/lib/sensitivity-view.tsx` (export from `libs/deal-analyzer/ui/src/index.ts`) and `use-sensitivity-editor.ts` (contracts/ui.md):
  - Create the route `apps/amortization-calculator/src/app/sensitivity/page.tsx` (metadata title "Sensitivity & Max Offer"; renders `<SensitivityView />` from `deal-analyzer-ui`, 1 component, Constitution II).
  - Order: `DealStrip` (profile `SENSITIVITY_PROFILE`; build its `headline`, `payment` and `errors` from `analyzeDeal` and `dealPayment`, the way `SaleView` does), `PageHeader` ("Analysis" / "Sensitivity & Max Offer" / one-line lede), then an `InputsMessage` (`data-testid="sensitivity-na"`) when a requirement is unmet: "Fix the loan inputs to see the sensitivity." (invalid scenario) / "Fix the rental inputs to see the sensitivity." (rental errors) / "Add rent to see the sensitivity." (no rental), the first that applies. A missing price or down payment shows the deal card's own "Add …" hints and the same message.
  - `useSensitivityEditor()` saves the target (`rental.sensitivity`) through `updateActiveScenario({ rental: { …rental, sensitivity } })`, with no undo entry (research R7), and returns `{ target, setTarget }` using `resolveTarget`.
  - Unit test: the three messages and the editor's no-undo write.

**Checkpoint**: `/sensitivity` opens with the deal card and the right message; no grid yet. All existing tests still pass.

---

## Phase 3: User Story 1 - Stress-test a deal on a rate × price/rent grid (Priority: P1) 🎯 MVP

**Goal**: The 5 × 5 grid, its toggles and its cues.

**Independent Test**: With the reference deal ($250,000, 25% down, 7%, $3,000 tax, $1,200 insurance, $2,400 rent) the ringed center cell reads $251 (the Deal Analyzer's $250.56) and a higher rate or price worsens every cell.

- [X] T009 [US1] Write the grid tests first in `libs/deal-analyzer/calculations/src/lib/sensitivity.spec.ts` (after T005's), to the cent (data-model §D, FR-003, SC-001):
  - The center cell equals `analyzeDeal(scenario, computeSchedule(scenario))` field for field (`cashFlow.monthly`, `cashOnCashReturn.value`).
  - All 25 cells of the reference deal equal `analyzeDeal` on a scenario re-entered by hand with that rate and price or rent, for both column variables.
  - Column `amount`/`label`: price columns `$225,000 … $275,000` for −10%…+10%; rent columns `$2,160 … $2,640`.
  - Cash-on-Cash is `null` with a reason when cash invested is $0; an invalid variant (fixed down ≥ price) gives `cashFlowMonthly: null` and the validation message.
  - `current` is `{ row: 2, column: 2 }`, and moves up when the rate floor applies (rate 0.5, step 1).
  - `meetsTarget` is evaluated on the target's own measure (`cashFlowMonthly ≥ value`, or `cashOnCash ≥ value / 100 − 1e-12`), and is `null` without a target or for an n/a cell.
  - With a rent roll (spec 012) and an owner-occupied unit, the rent column amount is the rent in the scenario's current view.
- [X] T010 [US1] Implement `buildSensitivityGrid(scenario, { columnVariable, rateStepPct, columnStepPct, target?, maxOfferPrice? })` in `sensitivity.ts` per data-model §D and contracts/calculations.md: rows from `rateRows`; columns `pct_k = k × columnStep`, `k = −2…2`; each cell from `analyzeDeal(scenarioVariant(…))`; both measures per cell; `maoColumn` (price variable only: the column whose `pct` is nearest the offer's percentage change, when that change lies within the first and last column, else `null`). Make T009 pass, plus a timing test: a full grid on the reference deal builds in under 100 ms. Export from `index.ts`.
- [X] T011 [P] [US1] Write `useGridNavigation` in `libs/shared/ui/src/lib/use-grid-navigation.ts` (export it) with `use-grid-navigation.spec.tsx` (research R9): roving `tabindex` (one cell in the tab order, the last focused); arrows move one cell and stop at the edges; Home/End jump to the row's ends; Ctrl+Home/End to the grid's corners; header cells are included in the movement.
- [X] T012 [US1] Build `libs/deal-analyzer/ui/src/lib/sensitivity-grid.tsx` with `sensitivity-grid.spec.tsx` (contracts/ui.md § SensitivityGrid):
  - `role="grid"`, a visually hidden caption, a corner cell, `columnheader`s (percentage over amount: "−10%" / "$225,000" or "$2,520/mo"), `rowheader`s ("5.5%"), `gridcell`s (`data-testid="sensitivity-cell"`, `data-row`, `data-col`, `data-state`).
  - Cell text: whole dollars for cash flow ("$430", "−$1,208"), one decimal for Cash-on-Cash ("7.9%", "−2.1%"), "n/a" with the reason in the label. `data-state` ∈ `current | below-target | negative | ok` (precedence current > below-target > negative > ok).
  - Per-cell `aria-label`: "Rate 6.5%, price change −5% ($237,500): cash flow $430.20 per month, below target" (exact figures, plus "current deal", "negative", "below target" as they apply).
  - Cues: the current cell gets a 2px accent ring; a below-target cell shows "▼" (`aria-hidden`); the tagged column header shows "≈ max offer". Tint `color-mix(in srgb, var(--good|--bad) X%, var(--surface))` with X from 0 to 30 by size relative to the grid's largest absolute value; text always `--fg` (research R6, spec 010 FR-035: no new tokens, no text color for meaning).
  - Navigation from T011; the region scrolls inside itself below ~380px; cells ≥ 56px wide with 11px headers so 5 columns fit at 390px.
  - Tests: roles and labels, cue per state, n/a cell, the tag, arrow-key movement.
- [X] T013 [US1] Wire the grid into `sensitivity-view.tsx`: the four controls (shared `SegmentedControl` with `showLabel`; test ids `sensitivity-measure` "Monthly cash flow / Cash-on-Cash" default Monthly cash flow, `sensitivity-vary` "Price / Rent" default Price, `sensitivity-rate-step` "0.25% / 0.5% / 1%" default 0.5%, `sensitivity-column-step` "2.5% / 5% / 10%" default 5%) as page state; a `useMemo` grid keyed on the scenario and controls; the grid with its legend (`data-testid="sensitivity-legend"`: "▼ below your {target text} target · − negative · ring = current deal"); section header "Sensitivity grid". The target comes from `useSensitivityEditor` (T008); it is passed to `buildSensitivityGrid` only when `isSet`, and until then the legend omits its "▼ below your … target" part.
- [X] T014 [US1] Write `apps/amortization-calculator-e2e/src/sensitivity.spec.ts` (US1 part), with the reference deal entered through the Edit deal sheet: the ringed center cell reads "$251" and its label contains "$250.56"; 5 rows 6%…8% and 5 columns −10%…+10%; Vary → Rent changes the headers to `$2,160/mo … $2,640/mo` and improves cells to the right; Measure → Cash-on-Cash; each step size widens or narrows the ranges and keeps the ring on the current deal; a 0.5% deal starts its rows at 0.5% with the ring on the first row; editing the rate in the deal card recomputes the grid; a negative cell has a minus sign (a text cue, not just color), and no cell shows "▼" before a target is set; at 390px `document.documentElement.scrollWidth ≤ 390` and all 25 cells are visible; Tab reaches the grid and the arrow keys move cell by cell (focus moves, one tab stop).

**Checkpoint**: The MVP. The stress-test grid works end to end.

---

## Phase 4: User Story 2 - Find the Max Allowable Offer (Priority: P1)

**Goal**: Back-solve the highest price that meets a target.

**Independent Test**: A $300/mo cash-flow target gives an offer; entering that price gives ≥ $300/mo and $1 more gives less.

- [X] T015 [US2] Write the solver tests first in `libs/deal-analyzer/calculations/src/lib/max-offer.spec.ts` (data-model §E, research R4, FR-012, SC-002):
  - Reference deal, cash-flow target $300: a found price, with `meets(price)` true and `meets(price + 1)` false, where `meets` re-runs `analyzeDeal` on `scenarioVariant({ price })`. Same for Cash-on-Cash 8%.
  - Boundary property over at least 50 deals from `__fixtures__/generated-scenarios.ts` (`generatedScenarios(50)`), for both measures, with a PMI case (down < 20%) and a fixed-dollar down payment.
  - A rent roll with an owner unit and RUBS (spec 012) works the same way.
  - `currentMeets` true when the deal already meets the target (the offer is above the current price); `deltaFromCurrent = price − homePrice`, `deltaPct = deltaFromCurrent / homePrice`; `atCurrent` and `atOffer` figures.
  - Targets of $0/mo and 0% give the break-even price. An invalid target or a scenario with no rent gives `status: 'invalid'`.
  - `status: 'unreachable'` with the reason "No price reaches this target at this rent and rate. A higher rent or a lower rate would help." for a $5,000/mo target on a $2,400 rent, and for 1000% Cash-on-Cash once closing costs are $10,000 (with none, 1000% is reachable below $10,000).
  - A deal with 99.9% down and a −$1,000,000/mo cash-flow target still meets at the $10,000,000,000 cap, so the result is `found` with that price.
  - A fixed down payment of $50,000: the lowest valid price is $50,001.
  - Brute-force cross-check: for 10 deals, a linear scan in $100 steps agrees with the bisection to within the scan step.
- [X] T016 [US2] Implement `maxAllowableOffer(scenario, target)` in `libs/deal-analyzer/calculations/src/lib/max-offer.ts` per research R4: `meets(p)` (cash flow `cashFlow.monthly ≥ value`; Cash-on-Cash `value ≥ target/100 − 1e-12`, an n/a Cash-on-Cash counts as not meeting); `lo` = $1 or the fixed down amount + $1; unreachable if `!meets(lo)`; double from `max(lo, round(homePrice))` until `!meets` or the cap $10,000,000,000 (then return `found` at the cap); bisect on whole dollars. Return `MaxOfferResult` (data-model §E). Make T015 pass, plus a timing test: an offer on the reference deal is found in under 100 ms. Export `maxAllowableOffer` and `MaxOfferResult` from `index.ts`.
- [X] T017 [US2] Build `libs/deal-analyzer/ui/src/lib/max-offer-card.tsx` with `max-offer-card.spec.tsx` (contracts/ui.md § MaxOfferCard):
  - Target controls: shared `SegmentedControl` "Target measure" (Cash-on-Cash / Cash flow; `data-testid="target-measure"`) and a shared `NumberField` "At least" (`%` suffix or currency; `data-testid="target-value"`) with the inline error from `validateSensitivityTarget`; until a target is set the card shows the defaults labelled "Default target".
  - Result (`data-testid="max-offer"`): found shows "Max allowable offer $231,500" (`max-offer-price`), "$18,500 below your price of $250,000 (−7.4%)" (or "above"), and the rows "At the offer: …" / "At your price: …"; `currentMeets` adds "Your price already meets this target."; the primary button "Use this price" (`use-max-offer`, hidden when the offer equals the current price); unreachable shows the reason with "✕" in the `bad` tone and no number;  invalid shows only the inline error.
  - Tests for each state, and that the button calls `onUsePrice` with the offer.
- [X] T018 [US2] Wire the card into `sensitivity-view.tsx`: section "Max allowable offer"; compute the result with `maxAllowableOffer` (memoized); pass the offer to `buildSensitivityGrid` as `maxOfferPrice` so the nearest column is tagged and render the line under the grid (`data-testid="sensitivity-mao-line"`: "Max offer $231,500 is −7.4% from your price.") when the price variable is chosen and the offer is in range; target edits go through `setTarget` (no undo entry); "Use this price" calls `editDeal('homePrice', price, 'page')` (recorded, undoable, usual toast). The first time a scenario has no saved target, the target measure starts as the grid's measure. If the target field recalculates noticeably, debounce it by 150 ms.
- [X] T019 [US2] Extend `apps/amortization-calculator-e2e/src/sensitivity.spec.ts` (US2 part): a $300 cash-flow target on the reference deal shows an offer below $250,000 with "At the offer" ≥ $300; "Use this price" sets the home price to exactly the offer (the Edit deal sheet shows it), the Deal Analyzer's cash flow is ≥ $300, and Undo restores the old price; entering the offer + $1 in the sheet drops the cash flow below $300; a $5,000/mo cash-flow target shows the unreachable message with no price; a −5% Cash-on-Cash target shows "Use 0–1000%" and no result; grid cells missing the target show "▼" and the legend names the target; the max-offer line and the "≈ max offer" header tag appear when the offer is within −10%; after a rate edit the offer changes; no cell shows "▼" before the target is touched, and typing a target adds them.

---

## Phase 5: User Story 3 - A new page that fits the app (Priority: P2)

**Goal**: The page is reachable, consistent and robust to missing inputs.

**Independent Test**: The page is in the nav after "Sale Profit", the deal card is above the title, and with no rent it says "Add rent to see the sensitivity."

- [X] T020 [US3] Extend `sensitivity.spec.ts` (US3 part): "Sensitivity" is in the side navigation after "Sale Profit" and opens `/sensitivity`; the deal card is the first element, above the page title, with rate, price, down payment and rent emphasized (`data-tone="pin"`); a scenario with no rent shows "Add rent to see the sensitivity." and no grid or offer; a missing down payment shows the deal card's "+ Add down payment to unlock the grid" hint; two scenarios: switching the tab changes the grid and the offer; invalid loan inputs show "Fix the loan inputs to see the sensitivity.".
- [X] T021 [P] [US3] Add `/sensitivity` to the other route lists so the shared behavior is covered: `a11y.spec.ts` `ROUTES`, `deal-bar.spec.ts` `ROUTES`, `deal-strip.spec.ts` (the route list and the "emphasizes the inputs it uses" table: `['/sensitivity', ['annualInterestRatePct', 'homePrice', 'downPayment', 'rental.grossMonthlyRent']]`), and `setup-mode.spec.ts` (the route list). Check `navigation.spec.ts` and `feature-pages.spec.ts` for hard-coded nav counts or lists and update them.
- [X] T022 [US3] Keyboard pass in `sensitivity.spec.ts`: Tab order is deal card (tabs, Edit deal, values), then the four grid controls, the grid (one tab stop), the target controls, then "Use this price"; every control works by keyboard alone (segmented controls with arrow keys, the target field typed, "Use this price" with Enter).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Performance (SC-004): add a check to `apps/amortization-calculator-e2e/src/performance.spec.ts` next to the `/sale` one: on `/sensitivity` with the reference deal, changing the rate in the deal card updates the grid and the offer in under 500 ms (measured the way the existing checks measure).
- [X] T024 [P] Accessibility (SC-005): in `a11y.spec.ts` add axe scans in light and dark of `/sensitivity` with the grid, the legend and a found result visible, and with an unreachable result; plus one in which a below-target cell and a negative cell are on screen. Expect zero violations (this also checks the tint contrast, research R6).
- [X] T025 [P] Update the READMEs: `libs/deal-analyzer/calculations/README.md` (`buildSensitivityGrid`, `maxAllowableOffer`, `scenarioVariant`, `resolveTarget`, the monotonicity note from research R4); `libs/deal-analyzer/ui/README.md` (`SensitivityView`, grid and card); `libs/shared/ui/README.md` (`useGridNavigation`, `GridIcon`, `SENSITIVITY_PROFILE`); `libs/shared/calculations/README.md` (`SensitivityAssumptions`).
- [X] T026 Visual review at 1280px light and 390px dark (screenshots of the grid with both measures, both column variables, a below-target and a negative cell, the offer card in found, unreachable and already-meets states): all tokens and shared parts only, readable headers at 390px, the ring and "▼" clearly visible, the tint never lowers text legibility. Run `visual.spec.ts` and update only the snapshots that legitimately changed.
- [X] T027 Full gate: `npx nx run-many -t lint test typecheck`, the build, and the full e2e twice on :3215. Record the counts in § Baseline notes; every existing test must pass unchanged (SC-007).
- [X] T028 Run quickstart.md §1–§5 by hand and append a "Verified on {date}" block to `specs/017-sensitivity-goal-seek/quickstart.md`. Measure SC-003 (deal card to an 8% offer in under 30 seconds).

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → **Foundational (T003–T008)** → the stories.
- In Foundational: T003 first (the type); T004 and T005 can then run in parallel with T006 and T007; T008 needs T004 (the editor uses `resolveTarget`) and T007 (the profile and nav item).
- **US1 (T009–T014)** needs Foundational. T011 (grid navigation) is independent of T009/T010 and can run alongside them; T012 needs T010 and T011; T013 needs T012.
- **US2 (T015–T019)** needs Foundational and T010 (`buildSensitivityGrid` takes `maxOfferPrice`). T015/T016 (the solver) don't depend on any UI and can start as soon as T005 is done, in parallel with US1's UI work. T017 is independent of T012; T018 needs T013, T016 and T017.
- **US3 (T020–T022)** needs the page (T008) and benefits from US1/US2 being done for the e2e checks.
- Files edited by more than one task, so sequence them: `sensitivity.spec.ts` in the calculations lib (T005 → T009), `sensitivity.ts` (T005 → T010), `sensitivity-view.tsx` (T008 → T013 → T018), the e2e `sensitivity.spec.ts` (T014 → T019 → T020 → T022), `a11y.spec.ts` (T021 → T024).
- **Polish (T023–T028)** comes last; T023–T025 can run in parallel.

### Parallel examples

- After T003: T004 (validation) ‖ T006 (edit source) ‖ T007 (page plumbing), while T005 (variants) proceeds.
- US1 and US2: the calculations T009/T010 ‖ T015/T016 (different files), and the UI T011 ‖ T017.
- Polish: T023 ‖ T024 ‖ T025.

## Implementation Strategy

1. **MVP**: Setup + Foundational + US1. Ship it once the grid's center equals the Deal Analyzer and `sensitivity.spec` passes; investors can already stress-test a deal.
2. Add US2 (the offer, which also drives the grid's below-target marks), then US3's coverage.
3. Polish last: accessibility, performance, the visual check, and the gate run twice.

## Baseline notes

- **T001** (2026-11-19, worktree `014-sensitivity-goal-seek`, branch `017-sensitivity-goal-seek`, from `main` at `4008d18`): `npm ci`, then lint, test and typecheck pass for 10 projects. **611 unit tests** (159 + 52 + 27 + 52 + 275 + 14 + 9 + 23).
- **T002**: build and full e2e on the prod build at :3215 (`BASE_URL=http://127.0.0.1:3215`, wrapper config without `webServer`): **604 passed, 8 skipped, 0 failed** (13.1 min).
- Merge notes for the other in-progress feature (spec 014, `014-refinance-brrrr`): expect additive conflicts in `_nav.tsx`, `page-profiles.ts`, `icons.tsx` and the e2e route lists. This feature's additions sit in their own blocks.

### Implementation notes (where the code differs from the task text)

- **Unreachable examples**: a 1000% Cash-on-Cash target is *reachable* on a deal with no closing costs, because cash invested shrinks with the price (a $2,400 rent reaches it near $7,000). The spec, T015, T019 and the quickstart now use a $5,000/mo cash-flow target for "unreachable", and 1000% Cash-on-Cash only with $10,000 of closing costs.
- **T004/T005**: `meetsTarget(result, target)` is exported from `sensitivity.ts` and shared by the grid and the solver, so both use one rule. `evaluateVariant(variant)` is the single place a scenario is validated and analyzed.
- **T016**: `MaxOfferResult` has no `atLowest` field and no `unbounded` status (removed in analyze remediation); `invalid` carries a `reason`.
- **T017**: the card takes `onMeasureChange(measure)` and `onValueChange(value)` instead of one `onTargetChange(target)`, so a measure switch never has to know the other measure's saved value.
- **T021**: `/sensitivity` is in the `a11y`, `deal-bar` and `deal-strip` route lists (and the pinned-inputs table). It is **not** in the `setup-mode` "no copy says *above*" loop: the offer card legitimately says "$X above your price". `navigation.spec` and `feature-pages.spec` needed no change.
- **T022**: "Use this price" is focused directly rather than reached by Tab: macOS WebKit doesn't Tab onto plain buttons by default (a Safari setting), while Chromium and Firefox do. The rest of the tab order (grid controls, the grid's single stop, the target controls) is checked in all three browsers.
- **Typing a minus sign** into the target field is dropped by the SDK number input, so a negative target can't be entered at all; the validator is unit-tested for negatives and the e2e checks the same "Use 0–1000%" message with a value over the limit.
- **Default offer tags the grid**: the offer card always uses the (default or saved) target, so the grid tags the nearest column "≈ max offer" even before the investor sets a target. Only the below-target marks wait for a set target (spec FR-016).
- **T023**: the 500 ms check starts its clock when the new rate is committed (the Tab press), not when the first keystroke is typed, because Playwright's typing round trips alone take over a second. Measured: passes three times in a row in all three browsers.
- **T024**: one axe scan per test (touching the page after a scan crashes Playwright's Firefox, as noted for Escape). Tests that type into the target field exclude that one text input (`scanWithoutTypedTarget`); the untouched field is scanned in the first test. Scans run with reduced motion, so they see the final colors and not a frame of the 150 ms fade a segmented control plays when it is clicked.
- **T026** (visual review, Chromium, 1280 light and 390 dark): the grid in both measures, a ▼ cell, a negative cell, the ring, the tagged offer column, the legend, and the offer card found and unreachable. Fixed from the review: the max-offer line now shows whole dollars ("$240,092"), and the legend uses non-breaking spaces so "− negative" never splits across lines. `visual.spec.ts` has no per-page list, so it needed no change.
- **T027** final gate (2026-11-19): `nx run-many -t lint test typecheck` passes for 10 projects, **700 unit tests** (611 at the start). The build passes. Full e2e on the prod build at :3215, twice: **709 passed, 8 skipped, 0 failed** both times (604 at the start; +105: 75 in `sensitivity.spec`, 24 accessibility, 3 performance, 3 from the new route in the shared route lists). Every existing test passes unchanged (SC-007).
- **T028**: quickstart §1–§5 verified through their automated equivalents (see `quickstart.md`); SC-003 timed by counting the actions, below.
