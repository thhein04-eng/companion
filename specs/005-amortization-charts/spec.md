# Feature Specification: Amortization Charts

**Feature Branch**: `005-amortization-charts`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "build useful charts for amortization calculator. make sure they are reusable and reimportable."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the user's
> description as part of `/speckit-plan`, using features 001/002 as context. It was then clarified
> on 2026-11-17 (see Clarifications).

## Clarifications

### Session 2026-11-17

- Q: What does "reimportable" mean for the charts? → A: Any app or library in this Nx workspace can import the chart components through the library's package entry point. Standalone publishing and user-facing chart file export/import are out of scope.
- Q: Should this feature also chart the rental Deal Analyzer? → A: Yes. Add a full set of rental charts: cash flow over time, equity build-up, and return metrics over time (User Story 6).
- Q: Should rent, expenses and property value grow over time, and where do the rates come from? → A: Add three optional, user-editable inputs (annual rent growth %, annual expense growth %, annual property appreciation %). Each defaults to 0%.
- Q: How many years should the rental charts cover? → A: The full loan term (`ceil(termMonths / 12)` years). It ends at the scheduled term even when extra payments pay the loan off sooner, so the years after payoff are shown.
- Q: Where should the charts appear on the calculator page? → A: Next to the content each one explains. Amortization charts go in a "Charts" section above the schedule, rental charts inside the Deal Analyzer section, and the scenario chart under the comparison grid. All charts are visible by default, with no tabs or collapsing.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See how the loan balance falls over time (Priority: P1)

A borrower who has entered a valid loan sees a chart of the remaining balance from the first payment
to payoff, so they can tell at a glance how slowly equity builds early on and when the loan ends.
When extra payments are configured, the chart also shows the no-extra-payment baseline, so the
earlier payoff is visible as a gap between two lines.

**Why this priority**: It is the one picture people expect from an amortization tool. On its own it
turns a 360-row table into something they can read.

**Independent Test**: Enter $300,000 at 6.5% for 30 years and check that a balance chart appears,
starts at about $300,000, ends at $0 at the payoff date, and has a crosshair tooltip showing date
and balance. Add a $200/month recurring extra payment and check that a second "Baseline" line
appears and the "With extra payments" line reaches $0 earlier.

**Acceptance Scenarios**:

1. **Given** a valid scenario, **When** the schedule is computed, **Then** a "Remaining balance"
   chart is shown with one point per period plus the starting balance, a time x-axis, and a currency y-axis that starts at $0.
2. **Given** a scenario with extra payments, **When** the chart renders, **Then** it shows two
   labelled series (With extra payments, Baseline) and a legend.
3. **Given** the pointer or keyboard focus is on the chart, **When** it moves along the x-axis,
   **Then** a tooltip shows the period date and each series' balance in currency format.
4. **Given** an invalid scenario, **When** the page renders, **Then** no chart is shown (the same
   rule as the schedule table).

---

### User Story 2 - See principal vs. interest, year by year (Priority: P1)

The borrower sees a stacked column per loan year that splits that year's payments into principal
(with extra principal as its own segment when present) and interest, so the shift from interest-heavy to principal-heavy is
obvious.

**Why this priority**: It answers the second question everyone asks: "where does my money go?"

**Independent Test**: For the 30-year example, year 1's interest segment is visibly larger than its
principal segment, year 30's is the reverse, and the yearly totals in the tooltip match the sums of
those periods in the schedule table to the cent.

**Acceptance Scenarios**:

1. **Given** a valid schedule, **When** the chart renders, **Then** there is one column per loan
   year (a partial final year counts as a year) with Principal and Interest segments.
2. **Given** a hover or focus on a column, **Then** the tooltip shows that year's principal,
   interest and total, cents-accurate against the schedule.

---

### User Story 3 - See what one monthly payment is made of (Priority: P2)

When real-estate costs are entered, the borrower sees one bar split into Principal & Interest,
Property tax, Insurance, PMI and HOA, so they can see how much of the "real" monthly payment is not
the mortgage itself.

**Why this priority**: It adds to feature 001's cost breakdown but is not needed for the core
amortization picture.

**Independent Test**: Enter tax $3,600/yr, insurance $1,200/yr and HOA $50/mo. The bar shows four
segments whose amounts add up to the displayed total monthly payment (within $0.01 rounding). Zero or empty components are
left out.

**Acceptance Scenarios**:

1. **Given** at least one non-P&I cost, **When** the breakdown renders, **Then** each non-zero
   component is a labelled segment and the segments add up to `totalMonthlyPayment` within $0.01, and the total shown is `totalMonthlyPayment` itself.
2. **Given** only P&I (no costs entered), **Then** the breakdown chart is hidden, because one segment
   is not worth a chart.

---

### User Story 4 - Compare scenarios' balances on one chart (Priority: P3)

With two or more valid scenarios, the borrower sees each scenario's remaining balance on one shared
chart, so different terms, rates and extra-payment plans can be compared visually next to the
existing comparison grid.

**Why this priority**: It adds to the existing comparison grid, which already answers the question
with numbers.

**Independent Test**: Create "30yr @ 6.5%" and "15yr @ 5.75%". The comparison chart shows two
labelled lines, the 15-year line reaches $0 at its payoff date, and each line keeps its color when
a third scenario is added or removed.

**Acceptance Scenarios**:

1. **Given** ≥ 2 valid scenarios, **Then** a comparison chart shows one line per scenario, named
   after the scenario and colored by the scenario's position in the scenario list (never by rank).
2. **Given** more than 8 scenarios, **Then** only valid scenarios in the first 8 positions of the
   scenario list are drawn, and a note says how many valid scenarios were not drawn. The palette
   has 8 fixed slots, one per list position.

---

### User Story 5 - Reuse the charts elsewhere (Priority: P1, developer-facing)

A developer building another view (for example a future page from feature 003) can import the general chart primitives from one workspace library and the
amortization-specific charts from another, without copying code or pulling in calculator-page
internals.

**Why this priority**: The user asked for this directly ("reusable and reimportable").

**Independent Test**: A second consumer (a Vitest render test inside the charts library, plus the
calculator page) imports `LineChart` / `StackedBarChart` from `@companion/charts` with its own
non-amortization data and it renders. `nx graph` shows `charts` has no dependency on any
`amortization-*` project.

**Acceptance Scenarios**:

1. **Given** the general chart library, **Then** it depends on no `amortization-*` project and no
   third-party charting package. It accepts plain data and series definitions.
2. **Given** an app imports a chart, **Then** it imports from the library's public entry point only.
   Deep imports are rejected by `@nx/enforce-module-boundaries`.

---

### User Story 6 - See how a rental performs over the loan's life (Priority: P2)

When the active scenario has valid rental inputs (feature 002's Deal Analyzer), the investor sees
three more charts:

- **Cash flow over time**: yearly NOI, debt service and resulting cash flow. Cash flow visibly
  steps up when PMI drops off and when the loan is paid off.
- **Equity build-up**: per year, equity split into initial equity (purchase price − loan amount,
  which is the down payment unless the loan amount was overridden), principal paid down and
  appreciation, with the remaining loan balance as context.
- **Return metrics over time**: cash-on-cash return per year, shown as a percentage line.

Growth comes from three new optional Deal Analyzer inputs: **annual rent growth %**, **annual
expense growth %** and **annual property appreciation %**. Each defaults to 0%. Year N applies
compound growth `(1 + rate)^(N−1)`:

- Rent growth applies to gross rent and other income.
- Expense growth applies to property tax, insurance and HOA only.
- Percentage-of-income lines (vacancy, management, maintenance, CapEx) stay at their set
  percentages, so they grow with income, i.e. with rent growth.
- Appreciation applies to the purchase price.

Debt service and PMI follow the schedule and never grow.

The rental charts cover the **full loan term**, which is `ceil(termMonths / 12)` years. They run
to the scheduled term even when extra payments pay the loan off sooner. Debt service uses the same
definition as feature 002's `analyzeDeal`: scheduled P&I plus PMI, never extra principal. It is $0 in
years after payoff. Cash-on-cash for every year divides that year's cash flow by the initial total
cash invested, which stays fixed.

**Why this priority**: The Deal Analyzer's year-one numbers say nothing about how the investment
changes over time. These charts answer "when does this property start paying me, and how much of
it do I own?". They depend on rental inputs, so they are not part of the core amortization picture.

**Independent Test**: Use R3's loan ($297,000 at 6.5% for 360 months, home price $330,000 with 10%
down, tax $3,600/yr, insurance $1,200/yr, HOA $50/mo, PMI 0.5%) with rent $2,800/mo and the default Deal Analyzer percentages.
Check that:

- The cash-flow chart has one point per year for each of NOI, debt service and cash flow, and year 1's cash flow equals the Deal Analyzer's
  annual cash flow to the cent.
- The equity chart's year-1 initial-equity segment equals purchase price − loan amount ($33,000 for R3), and its principal
  segment equals year-1 scheduled plus extra principal.
- The cash-on-cash line's year-1 value equals the Deal Analyzer's cash-on-cash figure.
- Removing the rental inputs hides all three charts.

**Acceptance Scenarios**:

1. **Given** a valid scenario with valid rental inputs, **When** the page renders, **Then** the
   three rental charts appear in the Deal Analyzer area. Each has a title, a legend (when it has 2
   or more series), a tooltip and a data table.
2. **Given** no rental inputs, or invalid ones, **Then** no rental charts are shown and the
   amortization charts are unaffected (the same rule as feature 002's FR-015).
3. **Given** extra payments pay the loan off before its scheduled term, **Then** debt service drops
   to $0 from the year after payoff and cash flow rises by that amount.
4. **Given** all three growth rates are left at 0%, **Then** NOI is flat across years, the equity
   chart has no appreciation segment, and year 1 equals the Deal Analyzer exactly.
5. **Given** rent growth 3% and appreciation 3%, **When** the user changes either rate, **Then**
   all three rental charts update in the same render. Year 2 gross rent equals year 1 × 1.03,
   within $0.01.
6. **Given** total cash invested is $0 (so cash-on-cash is undefined), **Then** the return-metrics
   chart shows the Deal Analyzer's N/A reason instead of a line.

---

### Edge Cases

- 0% interest: the interest series is all zeros. Charts still render, and the stacked column shows
  only principal.
- A very short loan (1–12 periods) produces a single-year column chart and a balance line with few
  points; the axes must not create fractional-year or duplicate ticks.
- A one-time extra payment that pays the loan off early: the balance line ends at the payoff
  period, not at `termMonths`.
- A very large principal (e.g. $10M+): y-axis tick labels use compact currency ($1.2M) so they fit.
- Narrow viewport (≤ 375px): charts fill the container width with no horizontal page scroll. Tick
  count goes down as width goes down.
- Dark mode: charts use their own validated dark palette steps, not an automatic inversion.
- Reduced motion: no animated transitions when `prefers-reduced-motion: reduce`.
- Rental with negative cash flow: the cash-flow series dips below $0. The rental cash-flow chart is
  the one chart that needs a zero baseline with values on both sides of it.
- Rental scenario without a home price: equity build-up cannot be computed. That chart shows an
  N/A message ("Enter a purchase price to see equity build-up"), and the other two rental charts
  still render.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST show a remaining-balance line chart for the active valid scenario,
  plus a baseline series when extra payments are present.
- **FR-002**: The system MUST show a yearly principal-vs-interest stacked column chart for the
  active valid scenario. When extra payments exist, extra principal is its own segment, stacked next to scheduled principal.
- **FR-003**: The system MUST show a monthly-payment composition bar when at least one non-P&I cost
  component is non-zero.
- **FR-004**: The system MUST show a multi-scenario balance comparison chart when ≥ 2 scenarios are
  valid.
- **FR-005**: Every chart MUST have a title. Charts with ≥ 2 series MUST have a legend. Every chart
  MUST have a hover/focus tooltip and an accessible data-table alternative (a "Show data" toggle or
  a visually hidden table).
- **FR-006**: Chart data MUST come from pure, unit-tested functions in
  `amortization-calculations`, and MUST match the schedule to the cent.
- **FR-007**: General chart rendering MUST live in a separate, domain-agnostic workspace library
  with a documented public API, so any app or lib in the workspace can import it.
- **FR-008**: Charts MUST be keyboard-operable (focusable plot, arrow keys move the active point)
  and identity MUST never be shown by color alone.
- **FR-009**: Charts MUST support light and dark color schemes with per-mode validated palettes.
- **FR-010**: Charts MUST recompute in the same render pass as the schedule. No extra network calls
  and no server storage.
- **FR-011**: When the active scenario has valid rental inputs, the system MUST show three rental
  charts: yearly cash flow (NOI, debt service, cash flow), yearly equity build-up (initial equity,
  principal paid, appreciation), and yearly cash-on-cash return. All three cover years
  `1…ceil(termMonths / 12)` of the loan term. Year 1 of each MUST equal the
  matching Deal Analyzer figure to the cent (cash-on-cash to 4 decimal places of the fraction).
- **FR-012**: Rental chart data MUST come from pure, unit-tested builders in
  `amortization-calculations`, built on the existing `analyzeDeal` logic rather than duplicating it.
- **FR-013**: The Deal Analyzer MUST accept three optional growth inputs: annual rent growth %,
  annual expense growth % and annual property appreciation %. Each is a number from −10 to 25
  (inclusive) and defaults to 0 when empty. They are validated with the existing rental validation
  and persisted with the other rental inputs in `sessionStorage`. Sessions saved before this
  feature, which lack these fields, MUST load with all three set to 0.
- **FR-014**: Charts MUST be placed next to the content they explain, and MUST be visible by
  default (no tabs, no collapsing, apart from each chart's own "Show data" table toggle from
  FR-005):
  - The payment breakdown, balance and principal-vs-interest charts go in a "Charts" section
    directly above the amortization schedule.
  - The three rental charts go inside the Deal Analyzer section, after its metrics.
  - The scenario balance chart goes inside the "Compare scenarios" section, under the comparison
    grid.

### Key Entities

- **Chart series data**: plain, domain-free points (`x`, per-series `y` values) plus series
  definitions (key, label, color slot).
- **Amortization chart datasets**: balance-over-time, yearly principal/interest, payment
  composition, and multi-scenario balance. All are derived from `AmortizationSchedule` /
  `LoanScenario` and never persisted.
- **Rental growth assumptions**: three optional percentage fields added to `RentalAssumptions`
  (`rentGrowthPct`, `expenseGrowthPct`, `appreciationPct`), each defaulting to 0. They are the only
  persisted change in this feature.
- **Rental chart datasets**: yearly cash flow, equity build-up and cash-on-cash series. They are
  derived from `LoanScenario` (including `rental`), `AmortizationSchedule` and `DealAnalysis`, and
  are never persisted.

## Success Criteria _(mandatory)_

- **SC-001**: For the reference scenarios, every charted value equals the corresponding schedule
  value or sum to the cent (unit-tested).
- **SC-002**: With a 360-period schedule, input changes re-render all charts within the existing
  1-second budget (feature 001 SC-005).
- **SC-003**: The general chart library has zero `amortization-*` dependencies (checked via
  `nx graph` / lint) and is used by at least two consumers: `amortization-ui` (loan and rental
  presets) and the library's own render tests with non-loan data.
- **SC-004**: All charts pass keyboard-only operation and expose a data table to screen readers.

## Assumptions

- "Reimportable" (confirmed 2026-11-17) means any current or future app or library in this Nx
  workspace can import the charts through the library's package entry point (like
  `amortization-calculations` / `amortization-ui`). Building or publishing a standalone package and
  exporting/importing chart files are both out of scope.
- Charts are client-side and use no new backend (Constitution III). The only change to stored data
  is three optional growth fields in the existing `sessionStorage` rental inputs (FR-013).
- Image or PDF export of charts is out of scope. The existing CSV export covers the data.
- Features 003 (page navigation) and 004 (schedule pagination) are in progress on other branches.
  This feature makes small, local insertions into the page in three places (FR-014), plus three
  growth inputs in the rental inputs panel. It does not change navigation or the schedule table.
