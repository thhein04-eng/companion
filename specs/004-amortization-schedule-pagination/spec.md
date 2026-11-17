# Feature Specification: Paginated Amortization Schedule

**Feature Branch**: `004-amortization-schedule-pagination`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "make the Amortization schedule paginated."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse the schedule a page at a time (Priority: P1)

A user who has entered a 30-year loan sees the amortization schedule one page at a time
instead of one 360-row scrolling list. By default each page holds 12 payments (one year).
They can move to the next, previous, first, or last page, or jump straight to a page
number or a loan year, and always see which payments are on screen ("Payments 13–24 of 360").

**Why this priority**: This is the feature. A 360-row scroll box makes it hard to find a
given year or keep your place.

**Independent Test**: Load the default $300,000 / 6.5% / 30-year scenario. Page 1 shows
payments 1–12, the label reads "Payments 1–12 of 360", and there are 30 pages. Going to the
last page shows payments 349–360, and payment 360 has a remaining balance of $0.00.

**Acceptance Scenarios**:

1. **Given** a valid 360-period schedule, **When** the schedule first renders, **Then**
   payments 1–12 are shown and the pager's last page link is `30`.
2. **Given** page 1, **When** the user activates Next, **Then** payments 13–24 are shown.
3. **Given** any page, **When** the user activates Last, **Then** the final page is shown
   and its last row has a remaining balance of $0.00.
4. **Given** page 1, **Then** Previous and First are marked disabled but stay focusable;
   on the last page, Next and Last are.

---

### User Story 2 - Choose how many rows per page (Priority: P2)

A user can change the rows per page to 12, 24, 60, 120, or All. "All" brings back the
single scrolling list.

**Why this priority**: Different tasks need different views. Year-by-year review suits 12;
checking where principal overtakes interest suits a larger page; some users want the
whole list.

**Independent Test**: On page 3 at 12 rows per page (payments 25–36), switch to 60 rows.
The view moves to the page that contains payment 25 (page 1, payments 1–60).

**Acceptance Scenarios**:

1. **Given** 12 rows per page on page 3, **When** the user selects 60, **Then** the page
   that contains the first row that was on screen (payment 25) is shown.
2. **Given** any page size, **When** the user selects All, **Then** every period is shown
   in one scrollable list and the page controls are hidden.

---

### User Story 3 - Stay on the same page while editing inputs (Priority: P2)

A user looking at year 10 changes the interest rate or adds an extra payment. The schedule
recalculates and stays on the same page. If the new schedule is shorter (for example,
because extra payments shorten the payoff), the view moves to the last page that still
exists.

**Why this priority**: The app recalculates live. Jumping back to page 1 on every
keystroke would make paging useless.

**Independent Test**: Go to page 10, then change the rate from 6.5% to 7%. Page 10 is
still shown, with the new values. Then add enough extra principal that the loan pays off
in about 15 years. The view moves to the new last page.

**Acceptance Scenarios**:

1. **Given** page 10, **When** an input change recalculates a schedule of the same length,
   **Then** page 10 stays selected.
2. **Given** page 25, **When** the new schedule has only 15 pages, **Then** page 15 is shown.
3. **Given** a different scenario tab is selected, **When** that tab's schedule renders,
   **Then** it starts on page 1.

### Edge Cases

- A schedule that fits on one page (for example, a 1-year loan): the pager still shows
  "Payments 1–12 of 12" and its step controls are disabled.
- The final page is partial (for example, 100 payments at 12 per page): the last page shows
  payments 97–100.
- Invalid inputs: no schedule is shown (current behavior). The pager is hidden with it,
  and the page and page size are kept for when the inputs become valid again.
- Export and print (FR-011 of feature 001) still include the full schedule, not just the
  current page.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The amortization schedule MUST show one page of periods at a time, 12 periods
  per page by default.
- **FR-002**: The system MUST provide First, Previous, Next, and Last controls plus
  numbered page links. When there are many pages, the numbered links are shortened with
  ellipses. The system MUST also provide a **Go to year** field that shows the page
  containing the first payment of that year. It is hidden when All rows are shown.
- **FR-003**: The system MUST show the range on screen and the total period count (for
  example, "Payments 13–24 of 360"), and announce changes to that text to assistive
  technology.
- **FR-004**: Users MUST be able to choose 12, 24, 60, 120, or All rows per page. A
  page-size change MUST keep the first row that was on screen in view.
- **FR-005**: When the schedule is recalculated, the current page MUST be kept, or moved to
  the last page if it no longer exists. Switching to a different scenario MUST reset to
  page 1 and keep the current page size.
- **FR-006**: All pagination controls MUST work by keyboard and expose correct ARIA
  semantics (navigation landmark, `aria-current="page"`, `aria-disabled` on unavailable
  steps), per Constitution Principle IV.
- **FR-007**: Export and print MUST continue to cover the full schedule, regardless of the
  current page.
- **FR-008**: Pagination MUST NOT change any calculated value. Column order, column
  content, and formatting (feature 001 FR-003, FR-013) stay as they are.

### Key Entities

- **Schedule Page View**: the current page number, the page size (12/24/60/120/All), and
  the range they produce (first and last period number on screen, page count). This is
  view state only. It is not part of the loan scenario and is not exported.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With the default page size, the user can reach the payments for any given
  year of a 30-year loan in no more than 3 interactions.
- **SC-002**: Changing pages updates the table in under 100 ms as perceived by the user
  (automated check: under 250 ms including test-harness overhead). Feature 001 SC-005 still
  holds: recalculation takes under 1 second, including with All rows shown.
- **SC-003**: Across all pages, every period appears exactly once, in order, with values
  identical to the unpaginated schedule.
- **SC-004**: The pager can be operated end to end with only the keyboard.

## Assumptions

- The default page size is 12 because the schedule is monthly, so one page is one year.
- Page number and page size are kept in component state only. They are not saved to
  `sessionStorage` or the URL, because neither is part of the user's financial scenario
  (Constitution III default). Refreshing the page returns to page 1 at 12 rows per page.
- This builds on the existing `ScheduleTable` in `libs/amortization-ui`. No backend
  changes.
- This amends how feature 001's FR-003 ("complete schedule listing every period") is
  displayed. The schedule is still complete, spread across pages (or on one page with All),
  and in full in export.
- Feature `003-feature-pages-navigation` (in progress in a separate worktree) may move
  where the schedule is rendered. This feature changes only the schedule component and
  how it is used, so merging should be straightforward.
