# Research: UI Polish (spec 011)

Spec 010's design system (tokens, `ds/`, ui-sdk behaviors) is reused throughout. The R-numbers
below are referenced from plan.md, the contracts and tasks.md.

## R1. The app-level deal bar is a full-bleed row of `<main>`, not a portal

- **Decision**: Restyle `<main>` as a full-bleed grid:
  `grid-template-columns: [full-start] minmax(max(16px, env(safe-area-inset-left,0px)),1fr) [content-start] min(1040px, calc(100% - 32px)) [content-end] minmax(max(16px, env(safe-area-inset-right,0px)),1fr) [full-end]`
  (the same as T003).
  Every child sits in `content` by default, and the deal bar spans `full`. Each view renders
  `<DealStrip>` first, **before** `<PageHeader>`, so the bar is the first row and spans the whole
  content area (right of the sidebar). It is sticky at `top-0` (`top-14` under the mobile header),
  `z-20`, with a `bg-sunk` fill, a `border-b border-line` divider, and its inner content aligned to
  the same 1040px column.
- **Rationale**:
  - It's server-rendered with the page, so there's no hydration flash or layout shift. A portal
    or context-registered bar would only appear after mount.
  - The page still owns its profile, headline, errors and payment, with no new cross-page state.
  - The layout is identical on every page because every view uses the same component at the same
    position.
- **Alternatives**:
  - `createPortal` into a shell slot was rejected: it appears only after mount, which causes CLS.
  - A context registry where views push config to an AppShell-rendered bar was rejected: same
    after-mount problem, plus effect churn on every keystroke.
  - Pathname → profile mapping in the shell was rejected: headline and payment are page
    computations.

## R2. Bar layout and the Edit deal button

- **Decision**: The bar's inner layout is a two-column grid
  `grid-cols-[minmax(0,1fr)_auto] gap-x-6`.
  - Left column, row 1: `Eyebrow "Deal"`, then `ScenarioTabs`.
  - Left column, row 2: the chips row (spec 010 wrap / one-third-of-the-viewport scroll rules).
  - Right column: the error count (when present) stacked above, plus a primary `Button` size `md`
    with a `PencilIcon` and the text "Edit deal", `self-center`.
  - The actions come right after the tabs in the DOM. Below 640px they sit at the end of the first
    row (`justify-between`). From 640px up, grid placement (`sm:col-start-2 sm:row-span-2`) centers
    them on the right. There's no CSS reordering, so focus order matches the screen.
  - The bar's padding is `py-3.5` and it uses the page gutter.
- **Rationale**: This matches the chosen preview: an obvious labeled primary action, vertically
  centered, sitting with the values.

## R3. Extra payments form

- **Decision**: Rebuild `extra-payment-panel.tsx` from `ds/` parts:
  - It sits in a `Card` with a form row `grid gap-[var(--space-grid)] sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(12rem,1fr)_auto] sm:items-end`.
  - **Type**: a `SegmentedControl` with a visible label "Type".
  - **Amount**: a `NumberField` wide enough for "$1,000,000.00" (`min-w-[12rem]`).
  - **When**: a `DateField` (with the calendar) for one-time payments. For recurring payments,
    the "When" label and a `DerivedRow`-style text "Every month, starting with payment 1".
  - **Add**: a primary `Button`.
  - The list is a `ul` of rows (`border-b border-line`, `py-2.5`), each with a `Badge` "Monthly" or
    "One-time", the amount (`num font-semibold`), the timing (muted), and a ghost `Button` "Remove"
    with `aria-label="Remove extra payment of $X"`. The empty state is a muted line.
- **Shared segmented control**: The existing `SegmentedOptions` (in deal-analyzer-ui, on ui-sdk
  `SegmentedControl`) moves to `shared-ui/ds/segmented-control.tsx` as `SegmentedControl`, with a
  `label` prop, because amortization-ui can't import deal-analyzer-ui (module boundaries).
  deal-analyzer-ui re-exports it under its old name, so nothing else changes.

## R4. Metric card

- **Decision**: Add a new `MetricCard({ label, info, value, status, explanation, testId })` in
  `deal-analyzer-ui`.
  - It's a copy of the `.kpi` anatomy at card size: a header row with the label (left) and an info
    `Popover` button (right), the value in `font-display text-[24px]` wrapped in `Ripple`, a
    `StatusPill` (left-aligned under the value; Cap rate gets a neutral pill "Info"), and the
    explanation in `text-small text-muted`.
  - Cards use `h-full` in a `grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-grid)] items-stretch`.
  - `RuleIndicator` is reimplemented on top of `MetricCard`, keeping its test ids (`rule-one-percent`,
    `rule-fifty-percent`, `cap-rate`), so the existing e2e checks stay valid.
- **Headline values**, from existing results:
  - Cap rate: `capRate.value`.
  - 1% Rule: `actualRent / (targetRent × 100)` (= rent ÷ price). This is a new pure helper,
    `onePercentRatio(result)`, in `deal-analyzer-calculations` with a unit test (Constitution I).
  - 50% Rule: `opexRatio`.

## R5. Date picker

- **Decision**: Rebuild `DateField` on ui-sdk `DatePicker`:
  - `DatePicker` wraps `DatePickerInput` (typed entry kept) plus `DatePickerTrigger` (a calendar
    icon button, `aria-label="Choose date"`), and `DatePickerContent` holding `CalendarHeading`,
    `CalendarPrevious` / `Next`, `CalendarGrid` / `Weekdays` / `Weeks` / `Day`.
  - `value` / `onValueChange` use ISO strings (the same as today).
  - Keyboard handling (arrows, PageUp/Down, Home/End, Enter, Escape returning focus) comes from
    the SDK (Constitution IV).
  - Styling: the content copies `.pop` (surface, line, `rounded-lg`, `shadow-float`, `p-3.5`). Days
    are 36px squares with `rounded-sm`: today gets an `outline-accent`, selected days get
    `bg-ink text-ink-fg`, outside days get `text-muted opacity`-free styling (FR-035), and
    hover gets `bg-sunk`.
  - Inside the Edit deal sheet, the content portals to the body with collision flipping, so it is
    never clipped, and Escape closes the calendar before the sheet (the SDK's nested dismiss
    layers).
- **Verify in implementation**: Read the `DatePickerInput` d.ts for segment vs. free-text typing,
  and keep today's typed format (mm/dd/yyyy). If `DatePickerInput` can't keep segmented typing,
  keep the existing `DateInput` segments and add only `DatePickerTrigger` + `Content` alongside
  them (DatePicker can control a separate input).

### R5 verification (T002)

- `DatePickerInput` is a **free-text** input: it parses typed text with the locale on commit
  (`parseDate`) and displays a locale short date. It does not do segmented mm/dd/yyyy entry.
- **Decision**: Take the R5 fallback. Keep the existing segmented `DateInput` (spec 001 chose it
  so the date is never ambiguous) and add a `DatePicker` root around it. The root holds only a
  `DatePickerTrigger` (the calendar icon button) and `DatePickerContent` with the Calendar parts,
  controlled by the same ISO `value` / `onValueChange`. Typing and picking update one value.
- Calendar day attributes (`calendar-api.js`): `data-selected`, `data-today`, `data-outside`,
  `data-disabled` and `data-value`. Parts: `CalendarHeading`, `CalendarPrevious`, `CalendarNext`,
  `CalendarGrid`, `CalendarWeekdays`, `CalendarWeekday`, `CalendarWeeks` and `CalendarDay`
  (re-exported from `@ui-sdk/react/date-picker`).


## R2b. Deal card + value grid (follow-up, 2026-11-18): supersedes R1's full-bleed bar and R2

- **Decision**: The strip is a card (`rounded-xl border border-line bg-surface`), sticky, in the
  content column above each `PageHeader`. Its header row holds tabs and actions, then a divider,
  then a labeled value grid in a fixed order (2 / 3 / 6 columns), then an emphasized monthly
  payment row and the missing-input hints.
- Cells are `DealValue` buttons (label over value) used as the `ChipPopover` triggers, so the
  popover editing, headline preview, scrub and error states from spec 010 carry over unchanged.
- Page relevance (spec 010 FR-028) is shown by emphasis only, not by reordering, so the grid
  reads the same on every page.
- `<main>` keeps the `page-grid` utility (harmless) and gets `pt-10` back. `col-full` is no
  longer used by the strip.
