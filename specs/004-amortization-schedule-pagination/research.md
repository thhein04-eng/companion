# Research: Paginated Amortization Schedule

No item in Technical Context was left as NEEDS CLARIFICATION. Each decision below settles a
design choice the spec left open.

## R1. Pager primitive

- **Decision**: Use `@ui-sdk/react/pagination` (`Pagination`, `PaginationList`,
  `PaginationItem`, `PaginationLink`, `PaginationFirst`, `PaginationPrevious`,
  `PaginationNext`, `PaginationLast`, `PaginationEllipsis`), controlled with
  `total` + `pageSize` + `page` + `onPageChange`, and `siblings={1}`.
- **Rationale**: It is already installed (`0.1.0-beta.1`, the version the workspace pins). It
  provides the `nav` landmark, `aria-current="page"`, `aria-disabled` steps that stay
  focusable, and an ellipsis range whose length stays stable near the ends. Those are exactly
  FR-002 and FR-006. Using it satisfies Constitution IV without writing focus or ARIA code by
  hand. It also clamps a page past the end to the last page, which helps with FR-005.
- **Alternatives considered**: A hand-written button bar was rejected because Constitution IV
  says not to build ARIA and keyboard handling yourself when the SDK covers it. A
  `getHref`/URL-driven pager was rejected because page position is view state, not something
  worth sharing (spec Assumptions), and putting it in the URL would add router coupling on top
  of the 003 navigation work.

## R2. Rows-per-page control

- **Decision**: Use `@ui-sdk/react/select`, labelled "Rows per page", with the options
  12 / 24 / 60 / 120 / All. The default is 12.
- **Rationale**: Select is the SDK's single-choice primitive and has full keyboard and ARIA
  support. It is compact enough to sit next to the pager. 12 rows is one year of monthly
  payments.
- **Alternatives considered**: A segmented control was rejected because five options take up
  too much width on mobile next to the pager. A native `<select>` was rejected because it does
  not match the existing SDK-built controls.

## R3. Where pagination math lives

- **Decision**: Add a pure, framework-free helper `getSchedulePage(total, page, pageSize)` in
  `libs/amortization-ui/src/lib/schedule-pagination.ts`, plus
  `pageContainingRow(rowIndex, pageSize)` for page-size changes. Both get Vitest unit tests.
- **Rationale**: Constitution II puts logic in libs and requires it to be testable without a
  DOM. Clamping, partial last pages, "All", and the first-visible-row anchor all have off-by-one
  risk, so they are worth unit-testing directly. The helpers belong in `amortization-ui`, not
  `amortization-calculations`, because they deal with presentation and touch no financial
  values (FR-008).
- **Alternatives considered**: Inline math in the component was rejected because it could only
  be tested through e2e. Putting the helpers in `amortization-calculations` was rejected
  because that library holds money math, and Constitution I's cent-accuracy rules don't apply
  to paging.

## R4. State ownership and keeping state across invalid input

- **Decision**: Keep the pagination state `{ page, pageSize }` in `apps/amortization-calculator`'s
  `page.tsx` through `useState`, and pass it to `ScheduleTable` as controlled props
  (`pagination`, `onPaginationChange`). When `activeScenarioId` changes, reset `page` to 1 and
  keep `pageSize`. `ScheduleTable` also works uncontrolled, using internal state, when the
  props are omitted.
- **Rationale**: `page.tsx` unmounts `ScheduleTable` while inputs are invalid. State held inside
  the table would be lost, which contradicts the spec's edge case. Lifting the state is the
  smallest fix, and it is still only presentation wiring, which Constitution II allows in apps.
  The uncontrolled fallback keeps the component easy to drop in elsewhere, for example on a
  page moved by feature 003.
- **Alternatives considered**: `sessionStorage` persistence was rejected because the spec
  explicitly says page position is not scenario data. Always mounting the table and hiding it
  with CSS was rejected because it would render a stale schedule in the DOM.

## R5. Clamping after recalculation (FR-005)

- **Decision**: Don't write a clamped page back to state. Compute
  `effectivePage = min(page, pageCount)` when rendering, and pass `effectivePage` to the pager.
  The pager's next `onPageChange` then stores a page that is in range.
- **Rationale**: This avoids an effect that would run on every keystroke-driven recalculation
  (SC-002/SC-005). It also fits the SDK's own rule that a page past the end reads as the last
  page.
- **Alternatives considered**: A `useEffect` that clamps state was rejected because it causes an
  extra render on each input change.

## R6. "All" and the scroll area

- **Decision**: Model "All" as `pageSize: 'all'`. In that mode, render every row inside the
  existing `ScrollArea` and hide the pager. For numeric sizes, render only the page's rows. The
  `ScrollArea` changes from a fixed `h-96` to `max-h-96`, so a 12-row page doesn't sit inside an
  oversized empty box.
- **Rationale**: This restores the original view on demand, and keeps the sticky header for
  larger pages (60/120 rows).

## R7. Range announcement (FR-003)

- **Decision**: Render "Payments {start}–{end} of {total}" in an element with
  `aria-live="polite"`, placed next to the pager. The table keeps
  `role="region" aria-label="Amortization schedule"`.
- **Rationale**: Screen-reader users hear where they are after each page change, without focus
  moving off the control they just activated.

## R8. Effect on existing e2e tests

- **Decision**: Update the three assertions that expect 360 `tbody tr` rows:
  `baseline-schedule.spec.ts`, `performance.spec.ts`, and `deal-analyzer.spec.ts:186`. They will
  assert the 12-row first page and the "of 360" range text instead. The baseline test also goes
  to the last page and checks for `$0.00`. `export-schedule.spec.ts` stays as it is and must
  keep passing, since the CSV still has 360 rows (FR-007).
- **Rationale**: These tests describe feature 001 behavior that this feature intentionally
  changes. They cover the same properties (full length, ends at $0.00) through the pager.
