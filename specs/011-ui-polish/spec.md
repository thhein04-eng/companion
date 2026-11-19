# Feature Specification: UI Polish — Strip Action, Extra Payments, Metric Cards, Date Picker

**Feature Branch**: `011-ui-polish`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "UI polish follow-up to spec 010 (design must keep matching specs/010-deal-strip-redesign/design-reference.html). (1) The Deal Strip's 'Edit deal' button sits alone at the far right of the scenario-tabs row, disconnected from the chips it edits; and the 'Extra payments' card on /amortization is poorly designed (dashed empty box, tiny Recurring/One-time toggle out of line with the Amount field, a cramped amount field that truncates, no visible labels, a plain list of added payments). Redesign both. (2) The Deal Analyzer 'Cap rate', '1% Rule' and '50% Rule' cards are inconsistent; make them one card design in an even row. (3) Date fields must open a calendar to pick the date, keeping typing and keyboard access."

## Clarifications

### Session 2026-11-18

- Q (follow-up, after seeing the bar): App header or card? Chip layout? → A: Change the full-width
  app header to a **card above the page title**, in the content column, and replace the wrapping
  pill chips with a **labeled value grid** (fixed order) plus an emphasized monthly payment row.
  Edit deal stays a primary button in the card header. This supersedes the "app-level deal bar"
  answer below.
- Q: Where should Edit deal go, and how should the shared strip relate to page content? → A: The
  strip is shared by every page, so it becomes an app-level deal bar above every page title (full
  width, sunk background, divider, sticky). "Edit deal" is an obvious full-size primary button
  with an icon and label on the bar's right.

> **Design reference**: `specs/010-deal-strip-redesign/design-reference.html` still governs the
> look (spec 010 FR-034, FR-035). This feature fixes three places where the shipped UI departs
> from it or reads poorly. It changes no calculation.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - A shared deal card with an obvious Edit deal (Priority: P1)

The deal is the same on every page, so it shows as one **deal card** at the **top of every
page, above the page title**, in the page's content column. It has the same position and look on
every page, and it stays at the top while the page scrolls (below the mobile header on phones).

Inside the card:
- **Header row**: the scenario tabs and Add scenario on the left, and a full-size primary
  **"✎ Edit deal"** button on the right. The error count (spec 010 FR-023), when shown, sits beside
  Edit deal.
- A hairline divider.
- **Value grid**: the deal's values as labeled cells in even columns, each a small muted label
  over a bold value: Home price, Down payment, Loan amount, Rate, Term, Rent. The order is always
  the same on every page. Each cell is a button that opens its popover editor (spec 010 FR-004,
  FR-005). Cells the page relies on are emphasized (accent value), cells it doesn't use are muted
  (spec 010 FR-028, now by emphasis instead of order), and invalid cells show the bad state with
  the word "invalid".
- **Monthly payment row**: "Monthly payment" and the total as a larger emphasized value, which
  opens the payment breakdown popover.
- Missing inputs (spec 010 FR-022) show as an empty value cell reading "Add" in accent. Below the
  grid, a short dashed hint chip says what they unlock ("+ Add rent to unlock cash flow").

**Why this priority**: The card is on every page. Separating the shared deal from page content,
making its main action obvious, and laying the values out as a calm, scannable grid fixes the most
visible issue.

**Independent Test**: On all five pages at 1280px and 390px, the card sits above the h1 in the
content column with the same look and position. The values form a labeled grid in a fixed order,
and Edit deal is a labeled primary button in the card header that opens the sheet and gets focus
back on close.

**Acceptance Scenarios**:

1. **Given** any analysis page at 1280px, **When** it loads, **Then** the deal card is the first
   element of the page, above the eyebrow and h1, aligned to the content column, with a card
   border and radius.
2. **Given** two different pages, **When** compared, **Then** the card's position, the value
   grid's order and Edit deal's placement are identical. Only the emphasis (accent or muted)
   differs by page.
3. **Given** the card, **When** it renders, **Then** Edit deal is a primary button with an icon
   and the visible text "Edit deal" at the right of the card header.
4. **Given** the value grid, **When** it renders, **Then** each value shows a label above a value.
   Selecting one opens its editor popover, and the monthly payment shows on its own row,
   emphasized.
5. **Given** the page is scrolled, **When** the user looks at the top, **Then** the card is still
   visible (below the mobile header at 390px), and the page doesn't scroll sideways.
6. **Given** the sheet was opened from Edit deal, **When** it closes, **Then** focus returns to
   Edit deal (spec 010 FR-007).
7. **Given** keyboard navigation, **When** the user tabs through the card, **Then** focus goes:
   scenario tabs → Edit deal (and the error count) → the value cells in order → the monthly
   payment → the page. It matches the visual order at every width.

---

### User Story 2 - A clear Extra payments card (Priority: P1)

On `/amortization`, the **Extra payments** section is a proper card in the reference style. The
form reads left to right in one aligned row on desktop (stacked on phones):

- **Type**: a segmented control, Recurring / One-time, the same size and style as other
  segmented controls.
- **Amount**: a currency field wide enough to show its whole value (e.g. "$1,250.00").
- **When**: for one-time payments, a date field with a calendar (US4). For recurring payments,
  read-only helper text says "Every month, starting with payment 1".
- **Add**: a primary button aligned with the fields' input row.

Every control has a visible label. Added payments show as a tidy list: each row shows the type
as a badge, the amount, and when ("Monthly from payment 1" or the date), with a Remove button that
has an accessible name. With no payments, a short empty-state line says what extra payments do.
The savings note ("Paying extra saves …") stays and sits under the list.

**Why this priority**: The user called this card out directly. Its current misalignment and
truncation break the reference look on the busiest page.

**Independent Test**: Add one recurring and one one-time payment on `/amortization`. Check
alignment, full visible amounts, the labels, list rows and removal, at 1280px and 390px.

**Acceptance Scenarios**:

1. **Given** `/amortization`, **When** the Extra payments card renders at 1280px, **Then** the
   type control, amount, when and Add sit on one baseline-aligned row, each with a visible label.
2. **Given** an amount of $12,500.00, **When** shown in the field, **Then** the whole value is
   visible (no truncation) at 1280px and 390px.
3. **Given** Recurring is selected, **When** the form renders, **Then** "Every month, starting
   with payment 1" shows in place of a date.
4. **Given** one recurring $200 and one one-time $5,000 payment, **When** the list renders,
   **Then** each row shows a type badge, the amount and its timing, and Remove removes only that
   row.
5. **Given** no extra payments, **When** the card renders, **Then** an empty-state line explains
   what an extra payment does, and no dashed placeholder box shows.
6. **Given** a phone width of 390px, **When** the card renders, **Then** fields stack in one
   column and nothing scrolls sideways.

---

### User Story 3 - Consistent metric cards (Priority: P2)

On the Deal Analyzer, **Cap rate**, **1% Rule** and **50% Rule** use one card anatomy, in the
same order:

1. **Label** (e.g. "1% Rule") with an info button that explains the metric.
2. **Headline value** in the display face:
   - Cap rate: the rate (e.g. "4.65%").
   - 1% Rule: monthly rent as a percent of the price (e.g. "0.71%").
   - 50% Rule: operating expenses as a percent of income (e.g. "45.5%").
3. **Status** pill: Pass / Fail for the rules, and for Cap rate a neutral "Info" pill or none,
   the same for all three cards in position and size.
4. **Explanation line**: the comparison in words (e.g. "Rent $3,200 vs. target $4,500").

The three cards sit in one even row of three on desktop, all the same height, and stack in one
column on phones. N/A states use the same anatomy, with "N/A" as the value and the reason as the
explanation.

**Why this priority**: A visible inconsistency on one page. Lower reach than US1 and US2.

**Independent Test**: With the reference deal, compare the three cards. They have the same
regions in the same places and equal heights, at 1280px and 390px.

**Acceptance Scenarios**:

1. **Given** the reference deal at 1280px, **When** the metrics render, **Then** three cards sit
   in one row with equal heights and the same internal layout.
2. **Given** each card, **When** it renders, **Then** it shows a label, an info button, a
   headline value, a status in the same position, and an explanation line.
3. **Given** a deal with no rent, **When** the cards render, **Then** each shows "N/A" as its
   value with its reason, keeping the same layout.
4. **Given** a status pill, **When** it renders, **Then** pass / fail use the good / bad tokens
   with visible text, never color alone.
5. **Given** 390px, **When** the cards render, **Then** they stack in one column with no empty
   slot.

---

### User Story 4 - Pick dates from a calendar (Priority: P2)

Every date field in the app, which today means the Edit deal sheet's **First payment date** and
the one-time extra payment **Date**, has a calendar button. It opens a month calendar anchored to
the field: previous / next month controls, today marked, the selected date highlighted. Picking a
day sets the field and closes the calendar. Typing the date into the field still works. The
calendar is fully keyboard operable (arrow keys move days, Page Up / Down change months, Enter
picks, Escape closes and returns focus to the field), and it follows the reference look in both
themes.

**Why this priority**: A usability gap. Typing works today, so this is an improvement, not a
blocker.

**Independent Test**: Open the sheet, open the First payment date calendar, pick a day by mouse,
then by keyboard. Confirm the value and the recalculated schedule. Repeat on the one-time extra
payment date.

**Acceptance Scenarios**:

1. **Given** the First payment date field, **When** the user activates its calendar button,
   **Then** a calendar opens showing the field's current month with the current date selected.
2. **Given** the open calendar, **When** the user picks a day, **Then** the field shows that date,
   the calendar closes, and the page recalculates.
3. **Given** the open calendar, **When** the user presses arrow keys, Page Down and Enter,
   **Then** focus moves by day and month and Enter sets the focused date.
4. **Given** the open calendar, **When** the user presses Escape, **Then** it closes without
   changing the date and focus returns to the field.
5. **Given** the field, **When** the user types a date, **Then** it is accepted as before.
6. **Given** dark mode, **When** the calendar opens, **Then** it uses the dark tokens and passes
   the accessibility checks.

---

### Edge Cases

- **Calendar inside the Edit deal sheet on phones**: The calendar opens within the bottom sheet
  without being clipped. If space is short it may open above the field. Escape closes the calendar
  first, then a second Escape closes the sheet.
- **Invalid typed date**: The field keeps today's validation behavior. The calendar opens on the
  last valid date, or on today when there is none.
- **Very large amounts** in Extra payments ($1,000,000.00) stay fully visible.
- **Many extra payments** (10+): The list grows naturally. It never truncates or overlaps.
- **50% Rule or 1% Rule not applicable** (no rent, no price): The headline is "N/A" with the
  reason, and the card keeps its height and layout.
- **Edit deal with errors**: The error-count button (spec 010 FR-023) stays next to Edit deal, so
  both actions read together.
- **Setup mode**: The first-run setup sheet (spec 010 US3) still opens by itself. On close it
  returns focus to the page h1 (Done) or to Edit deal.
- **Narrow phones (≤360px)**: The value grid stays 3 columns (labels truncate with full names in the
  accessible name), and the "Your deal" eyebrow hides below 640px. The card stays sticky but keeps spec
  010's one-third-of-the-viewport cap, and beyond that the grid scrolls inside the card. Edit deal
  stays visible in the header row.

## Requirements _(mandatory)_

### Functional Requirements

**Deal Strip action (US1)**

- **FR-001**: The Deal Strip MUST render as a **deal card** (surface, hairline border, 10px
  radius) at the top of every page, above the page header, in the content column. It is sticky
  (below the mobile header on phones), with the same position and look on every page.
- **FR-002**: The card header MUST hold the scenario tabs and Add scenario (left) and Edit deal
  (right), with the error count beside Edit deal when present. A divider MUST separate it from the
  values.
- **FR-003**: Edit deal MUST be a full-size primary button with a pencil icon and the visible text
  "Edit deal". Focus order MUST match the visual order (tabs → Edit deal → values → monthly
  payment), and spec 010's open and focus-return behavior MUST be kept.
- **FR-003a**: The deal values MUST render as a labeled value grid in a fixed order (Home price,
  Down payment, Loan amount, Rate, Term, Rent): 6 columns at ≥1024px and 3 below, so a phone shows two rows.
  Each cell is a button opening its editor. Page relevance is shown by emphasis (pinned = accent
  value, unused = muted), invalid cells show the bad state plus "invalid", and missing values read
  "Add". The monthly payment MUST be a separate emphasized row that opens the breakdown. This
  replaces spec 010's pill chips and its pinned-first chip order (spec 010 FR-028 ordering).
- **FR-003b**: Each page MUST still set its own emphasis, headline preview and missing-input hints
  (spec 010 FR-005, FR-022), and the page's own content (eyebrow, h1, sections) MUST start below
  the card.

**Extra payments (US2)**

- **FR-004**: The Extra payments form MUST be a card styled to the reference (`.card`), with no
  dashed placeholder box.
- **FR-005**: The type selector MUST use the app's standard segmented control at the standard
  size, with a visible "Type" label.
- **FR-006**: The amount field MUST be wide enough to show amounts up to $1,000,000.00 without
  truncation.
- **FR-007**: For one-time payments a "Date" field (with the US4 calendar) MUST show. For
  recurring payments the text "Every month, starting with payment 1" MUST show in its place.
- **FR-008**: The type, amount, when and Add controls MUST align on one row at desktop widths,
  aligned to the input row, and stack in one column below 640px.
- **FR-009**: Each added payment MUST be listed with a type badge, its amount, its timing and a
  Remove button named "Remove extra payment of {amount}". With none, an explanatory empty-state
  line MUST show.

**Metric cards (US3)**

- **FR-010**: Cap rate, 1% Rule and 50% Rule MUST share one card component with the regions
  label, info button, headline value, status and explanation, in the same positions.
- **FR-011**: Headline values MUST be: cap rate %, rent ÷ price % (1% Rule), and expenses ÷ income %
  (50% Rule), from the existing analysis results with no new calculations. N/A shows "N/A" plus the
  reason.
- **FR-012**: The three cards MUST sit in a three-column row of equal-height cards from 640px up,
  and in one column below 640px. No empty grid slot may appear at any width.

**Dates (US4)**

- **FR-013**: Every date field MUST offer a calendar button that opens a month calendar popup,
  while keeping direct typing.
- **FR-014**: The calendar MUST support arrow-key day movement, Page Up / Down months, Home / End
  week, Enter to pick and Escape to close, returning focus to the field. It MUST mark today and
  the selected date.
- **FR-015**: The calendar MUST follow the reference tokens in both themes and pass the
  accessibility checks in both themes.

**General**

- **FR-016**: These changes MUST keep every calculation result, the spec 010 strip, sheet, undo
  and ripple behavior, and the spec 010 visual rules (tokens only, FR-033 spacing, FR-035
  contrast).

### Key Entities

No new data. Extra payment rules (`recurring` from payment 1, or `oneTime` with a date) and the
deal analysis results are unchanged.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On all five pages, at 1280px and 390px, the deal card's top edge and left edge are
  the same (±1px), above the page h1 and aligned with it. The value labels appear in the same order
  on every page. Edit deal is a labeled primary button in the card header, and the page's first
  content section still starts within the first screen at 1280×800 (spec 010 SC-001).
- **SC-002**: At 1280px, the Extra payments controls' input boxes share the same top edge
  (±2px), and amounts up to $1,000,000.00 render untruncated at 1280px and 390px.
- **SC-003**: The three metric cards have equal heights (±1px) and identical region order at
  1280px, with no empty grid cell at 1280px, 768px or 390px.
- **SC-004**: A user can set the First payment date with the calendar by mouse in ≤ 3
  interactions, and by keyboard alone.
- **SC-005**: Automated accessibility checks report no violations on the affected pages and on the
  open calendar, in light and dark.
- **SC-006**: Every existing calculation figure is unchanged, and the existing test suites pass,
  with only the selectors touched by the redesigned controls updated.

## Assumptions

- **Scope**: Only the three reported areas. The Financing DSCR card already uses a similar status
  pattern; aligning it to the new metric card is out of scope unless the clarification says so.
- **Recurring payments** keep their current behavior (start at payment 1). This feature adds no
  start-month control and only labels the behavior.
- **Date fields** are the two that exist today: First payment date, and the one-time extra
  payment date. Any future date field uses the same component.
- **Behavior library**: The calendar uses the workspace's headless behavior SDK, which provides a
  date picker and calendar (Constitution IV).
