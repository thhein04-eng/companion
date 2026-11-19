---
description: 'Task list for 011 UI Polish'
---

# Tasks: UI Polish — Deal Bar, Extra Payments, Metric Cards, Date Picker

**Input**: `/specs/011-ui-polish/`: plan.md, spec.md, research.md (R1–R5), data-model.md,
contracts/ui.md, quickstart.md. The visual source of truth is still
`specs/010-deal-strip-redesign/design-reference.html`.

**Tests**: Included (Constitution I for the new helper; the workspace gate requires lint, test and e2e).

## Format: `[ID] [P?] [Story] Description`

## Conventions (same as spec 010)

- **Tokens only**: The lint rule blocks raw palette classes and `text-faint`. No opacity on text
  (FR-035).
- **Behavior from `@ui-sdk/react`**: Read the component `.d.ts` before using it.
- **Gate**: Before checking off a task, run `npx nx run-many -t lint test typecheck -p <affected>`.
  Story-closing tasks run the full e2e on a :3200 prod build:
  `npx nx build amortization-calculator && npx nx run amortization-calculator:start --port=3200`,
  then `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`.
- **Keep these test ids**: `deal-strip`, `deal-error-count`, `deal-chips`, `cap-rate`,
  `rule-1-rule`, `rule-50-rule`, `deal-metrics`.

---

## Phase 1: Setup

- [X] T001 Record a baseline under "Baseline notes" in `specs/011-ui-polish/tasks.md`: the
  `nx run-many -t lint test typecheck` result and the full e2e count on :3200 (expected
  430 unit / 436 e2e from spec 010).
- [X] T002 [P] Read `node_modules/@ui-sdk/react/dist/date-picker.d.ts`, `calendar.d.ts` and
  `@ui-sdk/core/dist/components/date-picker/date-picker.d.ts`. Append to
  `specs/011-ui-polish/research.md` R5: whether `DatePickerInput` supports segmented mm/dd/yyyy
  typing (the R5 fallback decision), the calendar part names, and how ISO values flow.

---

## Phase 2: Foundational

- [X] T003 Add the full-bleed grid to `libs/shared/ui/src/styles/tokens.css`:
  - `@utility page-grid { display:grid; grid-template-columns: [full-start] minmax(max(16px, env(safe-area-inset-left,0px)),1fr) [content-start] min(1040px, calc(100% - 32px)) [content-end] minmax(max(16px, env(safe-area-inset-right,0px)),1fr) [full-end]; row-gap: var(--space-page); align-content:start; }`
  - `@utility page-grid-child { grid-column: content; }`
  - `@utility col-full { grid-column: full; }`
  - Make `.page-grid > *` default to `grid-column: content` (a nested selector in the utility).
- [X] T004 In `apps/amortization-calculator/src/app/layout.tsx`, change `<main id="main-content">`
  to `className="page-grid w-full pb-10"`, dropping `page-gutter`, `mx-auto`, `max-w-[1040px]`,
  `flex`, `flex-col`, `gap-*` and `py-10`.
- [X] T005 [P] Add `PencilIcon` (`<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>`)
  and `CalendarIcon` (`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`)
  to `libs/shared/ui/src/lib/icons.tsx`.
- [X] T006 [P] Create `libs/shared/ui/src/lib/ds/segmented-control.tsx`, exporting
  `SegmentedControl` per contracts/ui.md (move the body of
  `libs/deal-analyzer/ui/src/lib/segmented-options.tsx`, and add `label` + `showLabel` that
  renders a visible `text-label` label above). Export it from `ds/index.ts`. Replace
  `segmented-options.tsx`'s body with
  `export { SegmentedControl as SegmentedOptions, type SegmentedControlProps as SegmentedOptionsProps } from 'shared-ui';`.
- [X] T007 [P] Write `libs/deal-analyzer/calculations/src/lib/rules.spec.ts`:
  `onePercentRatio({ pass:false, targetRent:4500, actualRent:3200 })` ≈ 0.0071111 (toBeCloseTo 6),
  a `targetRent` of 0 gives `null`, and a pass case of 4500/4500 gives 0.01.
- [X] T008 Implement `libs/deal-analyzer/calculations/src/lib/rules.ts` with
  `onePercentRatio(rule: OnePercentRuleResult): number | null`, which is
  `targetRent > 0 ? actualRent / (targetRent * 100) : null` (data-model). Export it from
  `libs/deal-analyzer/calculations/src/index.ts`. T007 must pass.

**Checkpoint**: The gate is green, and every page still renders, with content in the 1040px
column.

---

## Phase 3: User Story 1 — A shared deal bar with an obvious Edit deal (P1) 🎯 MVP

**Goal**: The strip is an app-level bar above every page title, with a primary "Edit deal" button.

**Independent test**: Spec US1 scenarios 1–6 (quickstart §1).

- [X] T009 [P] [US1] Write `apps/amortization-calculator-e2e/src/deal-bar.spec.ts` (with
  `skipSetupFor` in `beforeEach`):
  - For each of the 5 routes, the `deal-strip` `boundingBox().y` is less than the h1's y, and the
    bar's x equals main's x (±1).
  - The bar's top is the same on all pages (±1).
  - The button named "Edit deal" has `data-variant`/class primary, contains an svg, and its
    center x is greater than 50% of the bar width.
  - At 390×844 the bar is below the mobile header (y ≥ 56), `scrollWidth ≤ 390`, and Edit deal is
    visible.
  - Scroll to the bottom on /amortization: the bar's y stays between 0 and 60.
  - Tab order: focus the first scenario tab, then press Tab. The order is tabs → Edit deal (and the
    error count) → chips → the page, at 1280 and at 390.
  - At 390, the on-screen order matches focus order: Edit deal's y is above the first chip's y, and
    it comes before the chips in the DOM.
  - Opening and closing with Escape returns focus to Edit deal.
- [X] T010 [US1] Rework `libs/shared/ui/src/lib/deal/deal-strip.tsx` per contracts/ui.md and R2:
  - The section gets `col-full sticky top-14 lg:top-0 z-20 border-b border-line bg-sunk`.
  - The inner `div` gets `mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-x-6 gap-y-2.5 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] page-gutter`
    (keep the 33vh / nowrap logic on the chips row).
  - Left column: row 1 is `<Eyebrow>Deal</Eyebrow>` then `ScenarioTabs`, and row 2 is the chips.
  - Actions: a `flex items-center gap-2` group with the error count (when present) then
    `<Button variant="primary" size="md">` holding `<PencilIcon className="size-4"/>` and
    "Edit deal". It goes in the DOM right after the tabs row, which is where it appears on phones,
    at the end of the first row (`justify-between`). On `sm`+, the grid places it in the right
    column across both rows (`sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:self-center`) with no
    visual reordering, so focus order always matches the screen (WCAG 1.3.2 / 2.4.3).
  - Drop the strip's own `rounded-lg border` card look (the bar is not a card).
- [X] T011 [P] [US1] Move `<DealStrip …/>` above `<PageHeader …/>` in
  `libs/amortization/ui/src/lib/amortization-calculator-view.tsx`.
- [X] T012 [P] [US1] Move `<DealStrip …/>` above `<PageHeader …/>` in
  `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx`, `financing-view.tsx`, `wealth-view.tsx`
  and `pro-forma-view.tsx`.
- [X] T013 [US1] Update spec 010 e2e that assumed the strip sat under the header or was a card:
  - `deal-strip.spec.ts`: the "First screen" test now measures the first element after the
    `PageHeader` (the strip comes first), and the sticky test thresholds.
  - `visual.spec.ts`: the gap rule now measures consecutive `#main-content > *` rows (the bar to
    the header gap is the row gap) and allows the bar at y = 0.

  Then run the full e2e on :3200 and fix any selector that relied on the old order.

### US1 rework: deal card + value grid (user follow-up, 2026-11-18)

The user saw the bar and asked for a card above the title, with the chips replaced by a labeled
value grid (spec Clarifications). T009–T013 above shipped the bar; these tasks replace it.

- [X] T030 [US1] Add `DealValue` to `libs/shared/ui/src/lib/deal/deal-value.tsx`:
  - A `forwardRef` button with `label`, `value`, `tone: 'default' | 'pin' | 'err' | 'muted' | 'total' | 'missing'`,
    and `data-chip` / `data-tone`.
  - Layout: `flex flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left hover:bg-sunk`,
    with the label `text-[12.5px] text-muted` and the value
    `num font-display text-[17px] font-semibold` (pin = `text-accent`, err = `text-bad` plus
    "· invalid", muted = `text-muted`, missing value "Add" in `text-accent`).
  - `total` tone renders as a row: "Monthly payment" plus the value `text-[20px]`.
- [X] T031 [US1] Make `libs/shared/ui/src/lib/deal/chip-popover.tsx` render a `DealValue` as its
  popover trigger instead of `Chip`, keeping the editor, headline preview, `data-chip` and the
  accessible name "{label} {value}".
- [X] T032 [US1] Rework `libs/shared/ui/src/lib/deal/deal-strip.tsx` into the card (spec FR-001–FR-003b):
  - The section gets `sticky top-14 lg:top-0 z-20 rounded-xl border border-line bg-surface max-h-[33vh] overflow-y-auto`
    (no `col-full`).
  - Header row: `<Eyebrow>Your deal</Eyebrow>` + `ScenarioTabs` (left), then the actions (error
    count + primary "Edit deal") on the right, in DOM order. `border-b border-line px-[18px] py-3`.
  - Grid: `grid grid-cols-2 gap-x-2 gap-y-1 px-3 pt-3 sm:grid-cols-3 lg:grid-cols-6` with
    `ChipPopover` cells in the fixed order homePrice, downPayment, principal,
    annualInterestRatePct, termMonths, rental.grossMonthlyRent. Tone comes from `toneFor`
    (pinned → pin, muted → muted).
  - Then the monthly payment row (`ChipPopover chip="total"`) and the missing-input hint chips
    (dashed `Chip`) in a `flex flex-wrap gap-2 px-[18px] pb-3`.
  - Drop the nowrap / 33vh measuring code.
- [X] T033 [US1] In `apps/amortization-calculator/src/app/layout.tsx`, set main to
  `page-grid w-full pt-10 pb-10` (the card sits in the content column). The views keep
  `DealStrip` before `PageHeader`.
- [X] T034 [US1] Update the tests for the card:
  - `deal-bar.spec.ts` becomes the card: its x equals the h1's x (±1), it's above the h1, and
    tops are equal across pages. The value labels are in the same order on all pages. Edit deal
    is in the card header, plus the tab order and the phone checks.
  - `deal-strip.spec.ts` "pins its inputs first" asserts emphasis (`data-tone="pin"`) instead of
    order.
  - `libs/shared/ui/src/lib/deal/deal-strip.spec.tsx` chip-order tests now assert the fixed grid
    order plus tones.

  Rebuild and run the full e2e on :3200.

---

## Phase 4: User Story 2 — A clear Extra payments card (P1)

**Goal**: An aligned, labeled form plus a tidy list (FR-004–FR-009).

**Independent test**: Spec US2 scenarios 1–6 (quickstart §2).

- [X] T014 [P] [US2] Write `libs/amortization/ui/src/lib/extra-payment-panel.spec.tsx`:
  - The labels "Type", "Amount" and "When" (for recurring, the text "Every month, starting with
    payment 1") are visible.
  - Switching to One-time shows a "Date" field.
  - Add with $200 recurring calls `onChange` with `{kind:'recurring', amount:200, startPeriod:1}`.
  - The list renders a row per rule with a badge ("Monthly" / "One-time"), the amount, the timing,
    and a button named "Remove extra payment of $200.00" that removes only that rule.
  - The empty state (`extra-payments-empty`) shows with no rules.
- [X] T015 [US2] Rebuild `libs/amortization/ui/src/lib/extra-payment-panel.tsx` per R3 and
  contracts/ui.md:
  - A `Card` wrapping `<form>` (`onSubmit` adds; `preventDefault`) with the row
    `grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] sm:items-end`.
  - `SegmentedControl` with label "Type" (`showLabel`) and options Recurring / One-time.
  - `NumberField` "Amount" (currency, min 0).
  - When: for one-time, `DateField` "Date"; for recurring, a `div` with the label "When" plus
    `DerivedRow`-styled text "Every month, starting with payment 1".
  - `Button` primary "Add" (`type="submit"`).
  - The list goes after the form, followed by the savings note (form → list → note):
    `ul aria-label="Extra payments"`, rows
    `flex items-center gap-3 border-b border-line py-2.5` with a `MetricBadge`-style pill
    (`rounded-full bg-sunk px-2.5 py-0.5 text-[12px] font-semibold`), the amount
    `num font-semibold`, the timing `text-small text-muted` ("Monthly from payment 1" /
    `formatIsoDate(date)`), and a ghost `Button` "Remove" with `aria-label`.
  - Empty: `<p data-testid="extra-payments-empty" class="m-0 text-small text-muted">`, "Add a
    recurring or one-time payment to pay the loan down faster."
  - T014 must pass.
- [X] T016 [US2] Update e2e that use the old controls (`extra-payments.spec.ts`,
  `charts.spec.ts`, `performance.spec.ts`, `wealth-projection.spec.ts`, `undo-ripple.spec.ts`;
  grep `'Extra payment type'`, `name: 'Add'`, `Remove extra payment`). Keep the "Amount" and "Add"
  names, and update the type control to the segmented control (radio role, names "Recurring" /
  "One-time").
- [X] T017 [P] [US2] Write `apps/amortization-calculator-e2e/src/extra-payments-ui.spec.ts`:
  - At 1280, the Type, Amount, When and Add input boxes share a top edge (±2px).
  - Typing 1000000 into Amount shows "$1,000,000.00" untruncated (`scrollWidth ≤ clientWidth` of
    the input).
  - Add recurring and one-time, then check the rows and the removal.
  - At 390px the controls stack and `scrollWidth ≤ 390`.
  - Add 10 payments: the rows don't overlap (each row's top ≥ the previous row's bottom), and
    nothing scrolls sideways at 390px.

  Run the full e2e on :3200.

---

## Phase 5: User Story 3 — Consistent metric cards (P2)

**Goal**: Cap rate, 1% Rule and 50% Rule on one `MetricCard`, as an even row (FR-010–FR-012).

**Independent test**: Spec US3 scenarios 1–5 (quickstart §3).

- [X] T018 [P] [US3] Write `libs/deal-analyzer/ui/src/lib/metric-card.spec.tsx`:
  - It renders the label, an info button ("About {label}"), the value, the status text and the
    explanation, in that DOM order.
  - The `status="fail"` pill text is "Fail" with an ✕ icon (not color alone), and `pass` is
    "Pass".
  - `status="na"` shows "N/A" and the reason.
- [X] T019 [US3] Create `libs/deal-analyzer/ui/src/lib/metric-card.tsx` per R4 and contracts/ui.md:
  - A `Card`-styled `div` (`flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-[18px]`).
  - Header: the label `text-[14px] font-medium text-fg` and the info button (reuse the current
    rule-indicator info `Popover`, `aria-label="About {label}"`).
  - The value: `<Ripple>` + `num font-display text-[24px] font-semibold leading-tight`.
  - The `StatusPill` (from `rule-indicator.tsx`; `info` → neutral `bg-sunk text-muted` "Info").
  - The explanation: `text-small text-muted`.
  - Export it from the index. T018 must pass.
- [X] T020 [US3] Rework `libs/deal-analyzer/ui/src/lib/deal-metrics.tsx` to render three
  `MetricCard`s in `grid grid-cols-1 items-stretch gap-[var(--space-grid)] sm:grid-cols-3`:
  - Cap rate (`data-testid="cap-rate"`): `percent2` of the value, status `info`, explanation
    `naReason ?? 'Independent of financing'`.
  - 1% Rule (`rule-1-rule`): `percent2.format(onePercentRatio(r))`, `pass` / `fail`, explanation
    "Rent $X vs. target $Y" (the existing detail text).
  - 50% Rule (`rule-50-rule`): `percent1.format(opexRatio)`, pass when `withinRule`, explanation
    the existing estimate text.
  - N/A states: value "N/A", status `na`, explanation the existing reason.
  - Remove `RuleIndicator` usage here (keep `StatusPill` exported). Keep the `deal-metrics` root
    test id.
- [X] T021 [US3] Update `deal-analyzer.spec.ts` and `feature-pages.spec.ts` if any asserted the
  old rule text layout. Write `apps/amortization-calculator-e2e/src/metric-cards.spec.ts`:
  - With the reference deal at 1280, the three cards have equal heights (±1) and the same y.
  - Cap rate 4.65%, 1% Rule 0.71% Fail, 50% Rule 45.5% Pass.
  - With no rent, all show N/A with the same layout.
  - At 390, they stack in one column (x equal) with no empty cell.

  Run the full e2e.

---

## Phase 6: User Story 4 — Pick dates from a calendar (P2)

**Goal**: Every `DateField` has a keyboard-operable calendar popup (FR-013–FR-015).

**Independent test**: Spec US4 scenarios 1–6 (quickstart §4).

- [X] T022 [P] [US4] Write `libs/shared/ui/src/lib/date-field.spec.tsx`:
  - The field shows a button "Choose date".
  - Clicking it opens a calendar `grid` showing the value's month with the selected day
    `aria-selected`.
  - Clicking another day calls `onValueChange('2027-01-15')` and closes the calendar.
  - Escape closes it without a change.
  - Typing still calls `onValueChange`.
  - With an invalid typed value, the calendar opens on the last valid date, or on today when
    there's none.
- [X] T023 [US4] Rebuild `libs/shared/ui/src/lib/date-field.tsx` on ui-sdk `DatePicker` per R5 and
  T002's notes:
  - Keep the props (`label`, `value`, `onValueChange`, `description`, `error`).
  - The input row: the existing field look plus a trailing `DatePickerTrigger` icon button
    (`CalendarIcon`, `aria-label="Choose date"`, `text-muted hover:bg-sunk rounded-xs p-1.5`).
  - `DatePickerContent`: the `.pop` look (`rounded-lg border border-line bg-surface p-3.5 shadow-float z-[70]`)
    with a heading row (`CalendarPrevious` / `CalendarHeading` / `CalendarNext`), then
    `CalendarGrid` with weekdays (`text-[12px] text-muted`) and day buttons
    (`size-9 rounded-sm num text-[14px] hover:bg-sunk data-[today]:outline data-[today]:outline-accent data-[selected]:bg-ink data-[selected]:text-ink-fg data-[outside]:text-muted data-[disabled]:cursor-not-allowed`;
    check the real data attributes in T002's notes).
  - It portals to the body so it's never clipped inside the sheet. T022 must pass.
- [X] T024 [US4] Write `apps/amortization-calculator-e2e/src/date-picker.spec.ts`:
  - In the Edit deal sheet, "Choose date" opens the calendar. Pick the 15th by click: the First
    payment date shows it, and the schedule's first date changes on /amortization.
  - By keyboard: open, ArrowRight, PageDown, Enter. The date moves 1 day + 1 month. Home and End
    move focus to the start and end of the week.
  - Escape closes the calendar (the sheet stays open), and a second Escape closes the sheet.
  - The one-time extra payment Date also opens a calendar.
  - Typing still works.

  Add an axe scan with the calendar open (light and dark) to `a11y.spec.ts`. Run the full e2e.

---

## Phase 7: Polish

- [X] T025 [P] Update `libs/shared/ui/README.md` (`SegmentedControl`, the date picker in
  `DateField`, the deal bar) and `libs/deal-analyzer/ui/README.md` (`MetricCard`; `SegmentedOptions`
  is now an alias) and `libs/deal-analyzer/calculations/README.md` (`onePercentRatio`).
- [X] T026 Re-run `visual.spec.ts`, review `test-output/visual/` against `design-reference.html`
  (deal bar, extra payments, metric cards, open calendar, light and dark, 1280 and 390), fix any
  deviation, and note the review under "Baseline notes".
- [X] T027 Full gate: `nx run-many -t lint test typecheck`, then the build and full e2e on :3200
  twice. Record the counts under "Baseline notes".
- [X] T028 [P] Mark the Deal Strip as replaced by spec 011 US1 (app-level deal bar) in
  `specs/010-deal-strip-redesign/contracts/design-system.md` §4 and
  `specs/010-deal-strip-redesign/contracts/deal-ui.md` § DealStrip, so later checks against spec
  010's FR-034 don't flag the new bar.
- [X] T029 Run quickstart.md §1–§5 and append a "Verified on {date}" block to
  `specs/011-ui-polish/quickstart.md`.

---

## Dependencies & Execution Order

- Setup (T001–T002), then Foundational (T003–T008).
  - T003 → T004.
  - T005, T006 and T007 → T008 are in parallel.
- **US1** (T009–T013) needs T003–T005.
- **US2** (T014–T017) needs T006, and T023 for the date field. Until US4 lands, it uses today's
  `DateField`, which is fine.
- **US3** (T018–T021) needs T008.
- **US4** (T022–T024) needs T002 and T005.
- US2, US3 and US4 are independent of each other and of US1, apart from shared e2e runs.
- Polish (T025–T029) needs everything.

## Parallel opportunities

- T005, T006 and T007 together.
- After the foundation: US1 (shared-ui strip + views), US3 (deal-analyzer-ui) and US4
  (shared-ui date-field) touch different files and can run in parallel. US2 touches
  amortization-ui.
- Tests T009, T014, T018 and T022 can be written in parallel.

## Implementation Strategy

1. **MVP**: Foundational, then US1 (the deal bar is the most visible change).
2. **Then**: US2 (P1).
3. **Then**: US3 and US4 (P2).
4. **Finish**: Polish, with the visual review and the gate twice.

## Baseline notes

_(T001 / T026 / T027 record results here; T029 records the quickstart pass.)_

- **T001 baseline (2026-11-18)**: The branch's code equals `main` at `7980b93` (no diff under `libs`
  or `apps`). `nx run-many -t lint test typecheck` passes for 10 projects with 430 unit tests. The
  e2e baseline is carried from spec 010 T099 on the identical code: 436 passed / 8 skipped.
- **WebKit Done-click note (2026-11-18)**: The intermittent webkit `charts.spec.ts › balance chart`
  failure (also seen in spec 010's gate) was traced, not fixed. Under 6 workers, after the chart's
  keyboard step, `pointerdown` on the sheet's Done button was dispatched to the First payment
  date `date-input` (logged at pointer 1232,31; Done at 1205,16; the date input at 1068,614; no
  scroll), so no click fired. That only happens with an active pointer capture, but none of our
  code calls `setPointerCapture`, and ui-sdk's date-input doesn't either. It reproduced about 6/40
  in WebKit only and 0/40 without the chart step. `closeDealSheet` retries the Done click once
  after 2s, and the sheet's action rows got `data-drawer-no-drag` as a general guard. The root
  cause is unconfirmed (a WebKit/Playwright hit-testing quirk is suspected). Revisit if users report
  missed Done clicks in Safari.

### Final verification (2026-11-19)

- **Card rework fallout** (found in the first full e2e after T030–T034, 12 failures = 6 tests × 2
  browsers):
  - `DealValue` replaced a page's pin/muted tone with `missing` when the value was empty. Fixed:
    `data-tone` keeps the page tone, and emptiness is a separate `data-empty`.
  - `useDealEdits` merged a card-popover rent edit into an earlier sheet edit of the same field
    (within 800 ms), so the toast read "Rent changed — → $3,500". Fixed: only edits from the same
    source merge.
- **Load-only accessibility failures** (1 in 505; reproduced 6 in 198 under `--workers=8`):
  - The shared `SegmentedControl`'s checked label was ink-fg on the track until the separately
    positioned indicator laid out (contrast 1.14 light / 1.22 dark). Fixed: the checked item paints
    its own `bg-ink`, and the sliding indicator is removed.
  - The amortization schedule's scroll viewport wasn't focusable (`scrollable-region-focusable`).
    Fixed: `tabIndex={0}` plus a focus ring.
  - After the fix: 198/198 under the same stress.
- **T026**: `visual.spec` passes. Screenshots of the deal card (1280, 390), the calendar (light,
  dark) and the extra-payment form (light, dark) were reviewed against `design-reference.html`.
- **T027**: `nx run-many -t lint test typecheck` passes for 10 projects. The build passes. Full e2e
  on a prod build at :3200, twice: **505 passed, 8 skipped, 0 failed** both times (baseline 436
  passed / 8 skipped).
