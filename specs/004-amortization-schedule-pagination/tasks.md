---
description: 'Task list for Paginated Amortization Schedule'
---

# Tasks: Paginated Amortization Schedule

**Input**: Design documents from `/specs/004-amortization-schedule-pagination/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/schedule-table-ui.md, quickstart.md

**Tests**: Included. The plan specifies Vitest unit tests for the pure helpers (research R3) and
Playwright coverage (research R8). The constitution's quality gates require `nx test`, `nx lint`,
and `nx e2e` to pass.

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1, US2, US3)
- Paths are relative to the worktree root `.claude/worktrees/004-amortization-schedule-pagination/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the worktree runnable and confirm the baseline is green before anything changes.

- [x] T001 Install dependencies in the worktree with `pnpm install` (the worktree has no `node_modules`). Then confirm `@ui-sdk/react/pagination` and `@ui-sdk/react/select` resolve: their typings are at `node_modules/@ui-sdk/react/dist/pagination.d.ts` and `node_modules/@ui-sdk/react/dist/select.d.ts`.
- [x] T002 Run `pnpm nx run-many -t test lint -p amortization-ui amortization-calculations amortization-calculator` and `pnpm nx e2e amortization-calculator-e2e` to record a green baseline before any change. Fix nothing here; just note any failures that already exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure pagination helpers and types that every story uses (contract §"Pure helpers", data-model.md).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Write failing Vitest tests in `libs/amortization-ui/src/lib/schedule-pagination.spec.ts`. Cover `getSchedulePage(total, page, pageSize)` with every row of the data-model.md Examples table:
  - (360,12,1) → pageCount 30, rows 1–12
  - (360,12,30) → 349–360
  - (100,12,9) → 97–100
  - (180,12,25) → page 15, 169–180 (clamped)
  - (360,'all',4) → page 1, pageCount 1, 1–360
  - (12,12,1) → pageCount 1, 1–12
  - total 0 → pageCount 1, firstRow 0, lastRow 0
  - page < 1 → clamped to 1

  Add an invariant test: for each total in [1, 12, 100, 360] and each numeric size in [12, 24, 60, 120], concatenating `[startIndex, endIndex)` over pages 1..pageCount covers `0..total` exactly once with no gaps, and `lastRow − firstRow + 1 ≤ pageSize`. Cover `pageContainingRow(rowIndex, pageSize)`: (24,60) → 1, (24,12) → 3, (359,12) → 30, (0,12) → 1, (any,'all') → 1.

- [x] T004 Implement `libs/amortization-ui/src/lib/schedule-pagination.ts` exactly per contracts/schedule-table-ui.md. It must be pure, framework-free, and import nothing from React. Export these:
  - `type SchedulePageSize = 12 | 24 | 60 | 120 | 'all'`
  - `SCHEDULE_PAGE_SIZES = [12, 24, 60, 120, 'all'] as const`
  - `DEFAULT_SCHEDULE_PAGE_SIZE = 12`
  - `interface SchedulePaginationState { page: number; pageSize: SchedulePageSize }`
  - `interface SchedulePageRange { page; pageCount; startIndex; endIndex; firstRow; lastRow }`
  - `getSchedulePage`, with the data-model rules:
    - `pageCount`: `'all'` or `total = 0` → 1, otherwise `ceil(total / pageSize)`
    - `page = clamp(requestedPage, 1, pageCount)`
    - `startIndex = (page − 1) × pageSize` (0 for `'all'`)
    - `endIndex = min(startIndex + pageSize, total)` (`total` for `'all'`)
    - `firstRow = startIndex + 1` (0 when `total = 0`)
    - `lastRow = endIndex`
  - `pageContainingRow = floor(rowIndex / pageSize) + 1` (1 for `'all'`)

  Make T003 pass with `pnpm nx test amortization-ui`. (Depends on T003)

- [x] T005 Export the new module from `libs/amortization-ui/src/index.ts` by adding `export * from './lib/schedule-pagination';`. (Depends on T004)

**Checkpoint**: `pnpm nx test amortization-ui` passes, and the helpers are importable from `amortization-ui`.

---

## Phase 3: User Story 1 - Browse the schedule a page at a time (Priority: P1) 🎯 MVP

**Goal**: The schedule shows 12 rows per page, with First, Previous, Next, and Last controls, numbered links with ellipses, and live "Payments X–Y of N" text (FR-001, FR-002, FR-003, FR-006, FR-008).

**Independent Test**: With the default $300,000 / 6.5% / 30-year scenario, page 1 shows rows 1–12 and the text "Payments 1–12 of 360". Last shows rows 349–360, and row 360 has `$0.00` remaining.

### Tests for User Story 1

- [x] T006 [P] [US1] Create `apps/amortization-calculator-e2e/src/schedule-pagination.spec.ts` with US1 tests (quickstart scenarios 1–3). Use the contract's UI names. The table is `page.getByRole('region', { name: 'Amortization schedule' }).locator('tbody tr')`, and the pager is `page.getByRole('navigation', { name: 'Schedule pages' })`.
  - (a) The first page has 12 rows, row 1 starts with `1`, and the text `Payments 1–12 of 360` is visible. The "First page" and "Previous page" controls have `aria-disabled="true"`, and the page link `30` is visible.
  - (b) After clicking "Next page", rows 13–24 are shown and the text reads `Payments 13–24 of 360`.
  - (c) After clicking "Last page", the text reads `Payments 349–360 of 360`, the last row contains `$0.00`, and "Next page" and "Last page" are `aria-disabled="true"`.
  - (d) Keyboard only: focus "Next page" and press Enter twice. The text reads `Payments 25–36 of 360` and focus is still on "Next page".
  - (e) Clicking the page link `30` has the same effect as Last, and that link has `aria-current="page"`.
  - (f) Timing (SC-002): record `Date.now()`, click "Next page", wait for `Payments 13–24 of 360`, and assert that less than 250 ms elapsed. That leaves headroom for Playwright overhead; the 100 ms target is checked by eye in T019.
  - (g) One-page schedule (edge case): `fillNumberField(page, 'Loan term', '1')` (the term unit defaults to Years), then press Tab. Expect 12 rows and `Payments 1–12 of 12`. Expect "First page", "Previous page", "Next page" and "Last page" all to have `aria-disabled="true"`.

  These tests are expected to fail until T008 is done.

- [x] T007 [P] [US1] Update the assertions that this feature breaks on purpose (research R8). Replace each 360-row `toHaveCount(360)` check with `toHaveCount(12)` plus `await expect(page.getByText('Payments 1–12 of 360')).toBeVisible()`, in these places:
  - `apps/amortization-calculator-e2e/src/baseline-schedule.spec.ts`: after that check, also click "Last page" and keep the `rows.last()` toContainText `$0.00` assertion.
  - `apps/amortization-calculator-e2e/src/deal-analyzer.spec.ts` (line ~186).

  Do not change `export-schedule.spec.ts`. It must still see 360 CSV rows (FR-007). `performance.spec.ts` is handled in T010(f), because keeping its 360-row measurement needs the Rows-per-page control. Until then it fails at its `toHaveCount(360)` line, which is expected.

### Implementation for User Story 1

- [x] T008 [US1] Extend `libs/amortization-ui/src/lib/schedule-table.tsx` per contracts/schedule-table-ui.md. (Depends on T005)
  - Add the optional props `pagination?: SchedulePaginationState` and `onPaginationChange?: (next: SchedulePaginationState) => void`. Without them, use internal `useState({ page: 1, pageSize: DEFAULT_SCHEDULE_PAGE_SIZE })`. Pick controlled vs uncontrolled by whether `pagination` is defined.
  - Compute `range = getSchedulePage(periods.length, state.page, state.pageSize)` and `numericSize = state.pageSize === 'all' ? periods.length : state.pageSize` on every render. Do not write the clamped page back to state; there must be no `useEffect` for clamping (research R5).
  - Render only `periods.slice(range.startIndex, range.endIndex)` in the existing `<tbody>`. Keep every column, header, class, and `Intl` formatter exactly as they are (FR-008).
  - Change the `ScrollArea` class from `h-96` to `max-h-96` (research R6). Keep `role="region" aria-label="Amortization schedule"` on the viewport.
  - Below the table, add a footer row (`flex flex-wrap items-center justify-between gap-3`, using the neutral Tailwind palette like the rest of the file). It holds:
    - (1) `<p aria-live="polite">` with the exact text `Payments {firstRow}–{lastRow} of {total}`, using an en dash (U+2013) and `Intl.NumberFormat('en-US')` for each number.
    - (2) The `@ui-sdk/react/pagination` composition from `node_modules/@ui-sdk/react/docs/components/pagination.md`: `<Pagination aria-label="Schedule pages" total={periods.length} pageSize={numericSize} page={range.page} siblings={1} onPageChange={(page) => setState({ ...state, page })}>`, with a `PaginationList` whose children function renders `PaginationItem`s in this order:
      - `PaginationFirst`, `PaginationPrevious`
      - for each `item`, `PaginationLink page={item}` if it is a number, otherwise `PaginationEllipsis`, keyed by the item
      - `PaginationNext`, `PaginationLast`
    - Give the four steps the accessible names `First page`, `Previous page`, `Next page`, and `Last page` (visible text or `aria-label`). Style the current link with `data-[current]:` classes and disabled steps with `data-[disabled]:` classes.
  - Do not hand-roll any keyboard or ARIA handling (Constitution IV).
  - Update the component's JSDoc to describe pagination.
- [x] T009 [US1] Run `pnpm nx e2e amortization-calculator-e2e --grep "pagination|baseline|deal"`. Make T006 and T007 pass, adjusting T008 rather than the contract if they disagree, and confirm `export-schedule.spec.ts` still passes. (Depends on T006, T007, T008)

**Checkpoint**: The MVP is shippable. The schedule is paginated at 12 rows per page and works uncontrolled; `page.tsx` hasn't changed yet.

---

## Phase 4: User Story 2 - Choose how many rows per page (Priority: P2)

**Goal**: A rows-per-page select with 12, 24, 60, 120, and All. A size change keeps the first visible row on screen, and All restores the full scrolling list (FR-004). Also a Go to year field that jumps to any loan year in one interaction (FR-002, SC-001).

**Independent Test**: At 12 rows per page on page 3 (rows 25–36), choosing 60 shows page 1 (rows 1–60). Choosing All shows all 360 rows and hides the pager. Entering 15 in Go to year shows payments 169–180.

### Tests for User Story 2

- [x] T010 [P] [US2] Add a `test.describe('rows per page')` block to `apps/amortization-calculator-e2e/src/schedule-pagination.spec.ts` (quickstart scenario 4). Open the select labelled `Rows per page`; its options are `12`, `24`, `60`, `120`, and `All`.
  - (a) Go to page 3, choose `60`, and expect `Payments 1–60 of 360` and 60 rows.
  - (b) Go to page 10 at 12 rows (rows 109–120), choose `24`, and expect `Payments 97–120 of 360`. That is `pageContainingRow(108, 24) = 5`.
  - (c) Choose `All` and expect 360 rows, `Payments 1–360 of 360`, and the "Schedule pages" navigation to have count 0.
  - (d) Choose `12` again and expect 12 rows.
  - (e) Go to year (SC-001): at 12 rows per page, run `fillNumberField(page, 'Go to year', '15')` and press Tab. Expect `Payments 169–180 of 360`. Then choose `All` and expect the `Go to year` textbox to have count 0.
  - (f) Update `apps/amortization-calculator-e2e/src/performance.spec.ts` (moved here from T007) so SC-005 is still measured with every row rendered. In the existing recalculation test, choose `All` in `Rows per page` first, keep `toHaveCount(360)`, and keep the timing assertion unchanged. Then add a second test with the same timing assertion at the default 12 rows per page, which first checks `Payments 1–12 of 360`.

  Follow the pattern in existing specs that use `@ui-sdk/react` popovers (click the trigger, then `getByRole('option', { name })`).

### Implementation for User Story 2

- [x] T011 [US2] Add the rows-per-page control to the footer in `libs/amortization-ui/src/lib/schedule-table.tsx`, using the `@ui-sdk/react/select` parts (`Select`, `SelectLabel`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) as in `node_modules/@ui-sdk/react/docs/components/select.md`. (Depends on T008)
  - Label it `Rows per page` and build one item per entry in `SCHEDULE_PAGE_SIZES`. Each item's value is `String(size)` and its label is `All` for `'all'`, otherwise the number.
  - On change, parse the value back to a `SchedulePageSize` and set `{ pageSize: next, page: pageContainingRow(range.startIndex, next) }` (data-model transition "Rows-per-page changed").
  - When `pageSize === 'all'`, do not render `<Pagination>`. Still render the range text and the select.
  - Match the visual style of the existing SDK-based controls in `libs/amortization-ui/src/lib/number-field.tsx`.
- [x] T011a [US2] Add the Go to year field to the footer in `libs/amortization-ui/src/lib/schedule-table.tsx`. Use the existing `NumberField` from `./number-field` with `label="Go to year"`, `min={1}`, and `max={Math.ceil(periods.length / 12)}`. On a non-null value, set `page = pageContainingRow((year − 1) * 12, state.pageSize)` and keep `pageSize`. Don't render it when `pageSize === 'all'` (contract row "Go to year"). (Depends on T011)
- [x] T012 [US2] Run `pnpm nx e2e amortization-calculator-e2e --grep "rows per page|performance"` and make T010 pass. (Depends on T010, T011, T011a)

**Checkpoint**: US1 and US2 both work, and the component is still uncontrolled.

---

## Phase 5: User Story 3 - Stay on the same page while editing inputs (Priority: P2)

**Goal**: The page survives recalculation (moving to the last page if the schedule gets shorter) and survives invalid input. Switching scenarios resets to page 1 and keeps the page size (FR-005).

**Independent Test**: Go to page 10 and change the rate to 7%; page 10 is still shown. From page 25, add a large extra payment; the new last page is shown. Clear and then re-enter the loan amount; you are back on the same page. Switch scenario tabs; you are on page 1.

### Tests for User Story 3

- [x] T013 [P] [US3] Add a `test.describe('page survives recalculation')` block to `apps/amortization-calculator-e2e/src/schedule-pagination.spec.ts` (quickstart scenarios 5–8). Import `fillNumberField` and `clearNumberField` from `./helpers`. To reach page N, click page links or "Next page".
  - (a) Go to page 10 and expect `Payments 109–120 of 360`. Run `fillNumberField(page, 'Annual interest rate', '7')`, press Tab, and expect the text to still read `Payments 109–120 of 360` while the "Payment" column now shows `$1,995` (substring).
  - (b) Click the page-25 link (use "Last page", then "Previous page" ×5). Add a recurring extra payment the same way `extra-payments.spec.ts` does, but with amount `1000`: `fillNumberField(page, 'Amount', '1000')`, then click the `Add` button. Expect the range text to match `/of (\d+)$/` with N < 300. Expect the "Last page" control to have `aria-disabled="true"`, which shows the view moved to the new last page.
  - (c) Go to page 5, then `clearNumberField(page, 'Loan amount')` and press Tab. Expect the "Amortization schedule" region to have count 0. Enter `300000` again and press Tab. Expect `Payments 49–60 of 360`.
  - (d) Go to page 5 and choose 24 rows per page. Add a second scenario the same way `scenario-comparison.spec.ts` does. Expect page 1 at the 24-row size: `Payments 1–24 of …`.
- [x] T014 [P] [US3] Add clamp-on-read cases to `libs/amortization-ui/src/lib/schedule-pagination.spec.ts`. Recalculating to a shorter total keeps the stored page and only clamps it when read: `getSchedulePage(180, 25, 12).page === 15`, and `getSchedulePage(360, 25, 12).page === 25`. This covers research R5.

### Implementation for User Story 3

- [x] T015 [US3] Wire controlled state in `apps/amortization-calculator/src/app/page.tsx`. (Depends on T011)
  - Import `DEFAULT_SCHEDULE_PAGE_SIZE` and `type SchedulePaginationState` from `amortization-ui` (public API only; no deep imports, per module boundaries).
  - In `Page()`, near the `useScenarios()` call, add `const [schedulePagination, setSchedulePagination] = useState<SchedulePaginationState>({ page: 1, pageSize: DEFAULT_SCHEDULE_PAGE_SIZE })`. It must sit outside the `schedule ? … : …` branch so it survives the table unmounting while inputs are invalid.
  - Reset to page 1 when `activeScenarioId` changes, keeping `pageSize`. Use React's "adjust state during render" pattern, not a `useEffect`: keep a `prevScenarioId` state, and if it differs from `activeScenarioId`, update it and call `setSchedulePagination((s) => ({ ...s, page: 1 }))`.
  - Pass `pagination={schedulePagination}` and `onPaginationChange={setSchedulePagination}` to `<ScheduleTable periods={schedule.periods} />` (line ~199).
  - Leave `<ExportScheduleButton schedule={schedule} />` unchanged (FR-007).
  - Add `useState` to the React import if it isn't already imported.
- [x] T016 [US3] Run `pnpm nx e2e amortization-calculator-e2e --grep "recalculation"` and `pnpm nx test amortization-ui`, and make T013 and T014 pass. (Depends on T013, T014, T015)

**Checkpoint**: All three user stories work, and every quickstart scenario is covered by automation.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T017 [P] Update the comment in `libs/amortization-ui/vite.config.mts` above `passWithNoTests`. The lib now has unit tests for `schedule-pagination.ts`, while the components are still covered by e2e. Leave `passWithNoTests` in place.
- [x] T018 Run the full gate: `pnpm nx run-many -t lint test -p amortization-ui amortization-calculations amortization-calculator`, then `pnpm nx e2e amortization-calculator-e2e`. Every test must pass, including the unchanged `export-schedule.spec.ts` and the `amortization-calculations` specs (FR-007, FR-008, Constitution quality gates). Compare against the T002 baseline.
- [x] T019 Walk through `specs/004-amortization-schedule-pagination/quickstart.md` scenarios 1–9 manually in `pnpm nx dev amortization-calculator` (Constitution: quickstart executed at least once). Check scenario 9: export the CSV on page 7 and confirm it has 360 data rows. Spot-check SC-002 (a page change feels instant) and the narrow viewport (the footer wraps with no horizontal scroll).
- [x] T020 Before merging, check `git log main..003-feature-pages-navigation -- apps/amortization-calculator/src/app/page.tsx`. If feature 003 has moved the schedule's render site, rebase onto it and re-apply the T015 wiring wherever `ScheduleTable` is now mounted (plan.md, Risks & Notes).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002)**: Nothing comes before it.
- **Foundational (T003–T005)**: Comes after Setup and blocks every story.
- **US1 (T006–T009)**: Comes after Foundational. This is the MVP.
- **US2 (T010–T012)**: Comes after US1's T008, because it edits the same component file.
- **US3 (T013–T016)**: Comes after US2's T011. T015 relies on the final controlled-props shape, and its test (d) uses the rows-per-page select.
- **Polish (T017–T020)**: Comes after all stories.

### Story Dependencies

```text
Setup → Foundational → US1 (MVP) → US2 → US3 → Polish
```

The stories run in order rather than in parallel because US1 and US2 both edit
`schedule-table.tsx` and US3's tests use the US2 control. Each story is still independently
verifiable at its checkpoint.

### Parallel Opportunities

- **Phase 3**: T006 (new e2e spec) and T007 (edits to existing e2e specs) touch different files and can be written while T008 is being implemented.
- **Phase 4**: T010 (e2e) can be written alongside T011.
- **Phase 5**: T013 (e2e), T014 (unit), and T015 (app wiring) are three different files.
- **Phase 6**: T017 can run alongside T018.

### Parallel Example: User Story 1

```text
Task: "T006 [US1] Create schedule-pagination.spec.ts US1 tests"
Task: "T007 [US1] Update 360-row assertions in baseline/performance/deal-analyzer specs"
# then
Task: "T008 [US1] Paginate ScheduleTable"
```

### Parallel Example: User Story 3

```text
Task: "T013 [US3] e2e: page survives recalculation"
Task: "T014 [US3] unit: clamp-on-read cases"
Task: "T015 [US3] Wire controlled state in page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001–T005: Setup plus the helpers, tested.
2. T006–T009: The schedule is paginated at 12 rows, and the broken assertions are fixed.
3. **Stop and validate**: run quickstart scenarios 1–3 and 9. This can ship by itself.

### Incremental Delivery

1. Add US2 (rows per page, including All). Validate quickstart scenario 4.
2. Add US3 (the page survives recalculation, invalid input, and scenario switches). Validate scenarios 5–8.
3. Polish: full gate, manual quickstart pass, and the rebase check against 003.

---

## Notes

- Every task names the exact file it touches. The contract (`contracts/schedule-table-ui.md`) fixes the accessible names, so the e2e tests and the component must agree. Change the component, not the tests.
- Don't touch `libs/amortization-calculations` (FR-008). If any of its tests change, something is wrong.
- Commit after each checkpoint.
