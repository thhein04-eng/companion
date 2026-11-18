# Feature Specification: Multi-Year Projections & Wealth Accumulation Simulator

**Feature Branch**: `008-wealth-projection`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Multi-Year Projections & Wealth Accumulation Simulator. Real estate wealth is built over time through appreciation, principal paydown, and tax advantages. A 5-to-10-year projection model helps investors visualize compounding returns. Core Drivers to Model: Annual property appreciation rate (e.g., 3%). Annual rent growth and expense inflation rates (e.g., 2%–3%). Cumulative equity buildup (Principal paid down + forced/market appreciation). Tax Benefits: Basic residential depreciation schedule (27.5 years straight-line on building value) and mortgage interest deductions. UI/UX Addition: A multi-year line chart showing Net Worth growth (Equity + Cumulative Cash Flow) versus time. New page and route."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the user's
> description as part of `/speckit-plan`, using features 002, 005 and 006 as context. Choices the
> description left open are listed under Assumptions. Run `/speckit-clarify` to revisit any of
> them.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See net worth grow year by year (Priority: P1)

An investor opens a new **Wealth Projection** page at `/wealth`. It has its own nav entry and shares
scenarios and inputs with the other pages. They choose a projection horizon: 10 years by default,
with 5 and 10 as one-click presets, or any whole number from 1 to 30.

A line chart shows three lines against time, from year 0 (purchase) to the horizon:

- **Net worth**: equity plus cumulative cash flow.
- **Equity**: property value minus loan balance.
- **Net worth after tax**: net worth plus the cumulative tax effect (User Story 3).

Summary figures show, at the horizon year:

- net worth
- equity
- cumulative cash flow
- cumulative tax effect
- the multiple on total cash invested

**Why this priority**: The chart is the feature's headline deliverable. It works with the growth
rates the workspace already stores (spec 005), so it delivers value on its own.

**Independent Test**: Use the spec 006 reference property:
- $400,000 price and 25% down
- 7% for 30 years
- $4,800/yr tax and $1,800/yr insurance
- $3,800/mo rent with default reserves
- appreciation 3%, rent growth 2.5%, expense growth 2.5%

The chart's Net worth line starts at **$100,000.00** in year 0 and reaches **$211,428.70** in year 5
and **$360,051.02** in year 10. Equity in year 10 is **$280,129.40**, and cumulative cash flow is
**$79,921.62**.

**Acceptance Scenarios**:

1. **Given** a valid loan with a purchase price and valid rental inputs, **When** the page renders,
   **Then** the chart shows the three lines from year 0 to the horizon year. It has a legend and a
   keyboard and screen-reader accessible "Show data" table.
2. **Given** the horizon set to 5, **When** the chart re-renders, **Then** it ends at year 5, and the
   summary reports year-5 figures.
3. **Given** no purchase price, **When** the page renders, **Then** the chart is replaced by "Enter a
   purchase price to project equity and net worth."
4. **Given** no rent entered, **When** the page renders, **Then** the page asks for rent through the
   same rental inputs used on the Deal Analyzer.
5. **Given** a value entered on `/deal-analyzer` or `/financing`, **When** the investor opens
   `/wealth`, **Then** the same scenario and inputs are shown, and the reverse also holds.

---

### User Story 2 - Model the growth and equity drivers (Priority: P2)

On the same page, the investor edits these drivers:
- **Annual appreciation**, **annual rent growth** and **annual expense inflation**. These are the
  same stored values the Deal Analyzer's charts use, so both pages always agree.
- A **forced appreciation** amount: the value added at purchase by rehab or repositioning, such as
  after-repair value minus price.

A "Use typical rates" action fills in 3% appreciation, 2.5% rent growth and 2.5% expense inflation.
The year-by-year breakdown splits equity into initial equity, principal paid down, market
appreciation and forced appreciation.

**Why this priority**: The drivers turn a static deal into a compounding projection. The page is
useful with defaults, but these inputs make it the investor's own projection.

**Independent Test**: Start from the reference property with all growth at 0%. Click "Use typical
rates", and the year-10 net worth becomes $360,051.02. Then enter $20,000 forced appreciation.
Year-0 equity rises to $120,000.00, and year-10 equity rises by $26,878.33
($20,000 × 1.03¹⁰).

**Acceptance Scenarios**:

1. **Given** growth rates edited on `/wealth`, **When** the investor opens `/deal-analyzer`,
   **Then** its rental charts use the same rates.
2. **Given** forced appreciation of F, **When** the projection runs, **Then** the year-0 property
   value is price + F, and market appreciation compounds on that value.
3. **Given** an out-of-range driver (growth outside −10% to 25%, forced appreciation below 0),
   **When** it is entered, **Then** an inline error appears, and the projection waits for a valid
   value. The loan inputs are never blocked.

---

### User Story 3 - See the tax advantages (Priority: P3)

The investor enters a **land value share** (default 20% of price) and a **marginal tax rate**
(default 24%). The page then shows, for each year:

- **Depreciation**: straight-line over 27.5 years on the building value, which is price × (1 −
  land share) + rehab budget.
- **Mortgage interest** paid that year, from the amortization schedule.
- **Taxable rental income**: NOI − interest − depreciation.
- **Tax effect**: −taxable income × marginal rate. A paper loss is a saving, shown as positive, and
  a profit is tax owed, shown as negative.

The cumulative tax effect feeds the "Net worth after tax" line.

**Why this priority**: Depreciation and interest deductions are a real but secondary wealth
driver, and they need two extra assumptions.

**Independent Test**: For the reference property with typical rates:
- Year-1 depreciation is $11,636.36 and interest is $20,903.45.
- Year-1 taxable income is −$4,027.81, so the tax effect is +$966.67.
- Year-10 net worth after tax is $358,581.92.

**Acceptance Scenarios**:

1. **Given** the defaults, **When** the page renders, **Then** the year table shows depreciation,
   interest, taxable income and tax effect for every year.
2. **Given** a 0% tax rate, **When** the projection runs, **Then** the after-tax line equals the
   net worth line.
3. **Given** a land share of 100% or more, or a tax rate outside 0–60%, **When** it is entered,
   **Then** an inline error appears, and only the tax figures and the after-tax line show "—". The
   pre-tax projection is unaffected.

### Edge Cases

- **Horizon longer than the loan term**: years after payoff have no debt service and a zero
  balance. The projection continues (FR-004).
- **Extra principal payments**: they reduce the balance faster and reduce interest. Cash flow still
  excludes extra principal, as in spec 005, so cash spent on extra payments is not counted against
  net worth. This is noted on the page.
- **Negative cash flow**: cumulative cash flow falls, and net worth can dip below equity. This is
  shown as is.
- **Depreciation after 27.5 years**: depreciation stops once the full basis is used up. The final
  partial year is the remainder.
- **Zero cash invested**: the multiple on cash invested shows N/A with the existing reason.
- **Older sessions** without the new fields load with defaults and no error.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a page at `/wealth`, titled "Wealth Projection", with its own
  nav entry. It shares the scenario store with `/amortization`, `/deal-analyzer` and `/financing`.
- **FR-002**: The page MUST include the scenario tabs and the loan, real-estate cost and rental
  inputs, using the same components as the other pages, plus a "Projection assumptions" panel.
- **FR-003**: The horizon MUST default to 10 years, offer 5- and 10-year presets, and accept any
  whole number from 1 to 30.
- **FR-004**: The system MUST project each year from 1 to the horizon. Income, operating expenses,
  NOI, debt service and cash flow MUST match spec 005's rental projection for years within the
  loan term. For years after the loan term, debt service is 0 and the balance is 0.
- **FR-005**: Property value in year _n_ MUST be (price + forced appreciation) × (1 + appreciation)^_n_.
  Equity MUST be property value − loan balance. Equity MUST be decomposed into initial equity
  (price − loan amount), forced appreciation, market appreciation (value − price − forced) and
  principal paid (loan amount − balance), and the parts MUST sum to equity to the cent.
- **FR-006**: Net worth in year _n_ MUST be equity + cumulative cash flow through year _n_. Year 0 is
  purchase: net worth = equity = price + forced appreciation − loan amount.
- **FR-007**: Depreciation MUST be straight-line over 27.5 years on a basis of price × (1 − land
  share) + rehab budget, as a full amount every year (no mid-month convention). It MUST stop once
  the basis is used up.
- **FR-008**: Mortgage interest for year _n_ MUST be the sum of scheduled interest in that year's
  periods.
- **FR-009**: Tax effect MUST be −(NOI − interest − depreciation) × marginal rate, and net worth
  after tax MUST add the cumulative tax effect to net worth.
- **FR-010**: The chart MUST be a multi-year line chart with Net worth, Equity and Net worth after
  tax against years 0 to N. It MUST have a legend, a tooltip and a data table. The tooltip and table
  MUST also show property value, loan balance, cumulative cash flow and cumulative tax effect.
- **FR-011**: The page MUST show the horizon-year summary: net worth, equity, cumulative cash flow,
  cumulative tax effect, and net worth ÷ total cash invested (or N/A).
- **FR-012**: The page MUST show a year-by-year table: year, property value, loan balance, equity,
  the equity split (initial equity, principal paid, market appreciation, forced appreciation), cash
  flow, cumulative cash flow, interest, depreciation, taxable income, tax effect, net worth and net
  worth after tax.
- **FR-013**: Appreciation, rent growth and expense growth MUST be the existing `RentalAssumptions`
  fields from spec 005, with the same validation. "Use typical rates" sets them to 3%, 2.5% and
  2.5%.
- **FR-014**: New inputs MUST be validated inline:
  - forced appreciation ≥ $0
  - land share 0 ≤ x < 100%
  - marginal tax rate 0–60%
  - horizon an integer 1–30

  Invalid tax inputs blank only the tax figures. An invalid horizon or forced appreciation blanks
  the projection. Neither ever blocks the loan inputs.
- **FR-015**: New inputs MUST persist in the existing per-session storage. Older sessions MUST load
  with defaults: horizon 10, land 20%, tax rate 24% and forced appreciation $0.
- **FR-016**: All money MUST be cents-rounded, and the multiple shown to one decimal ("3.6×").

### Key Entities _(include if feature involves data)_

- **Wealth Assumptions**: horizon, forced appreciation, land share and marginal tax rate, stored per
  scenario with the rental inputs. The growth rates are the existing rental fields.
- **Wealth Year**: one projected year. It has property value, balance, equity and its parts, cash
  flow, cumulative cash flow, interest, depreciation, taxable income, tax effect (and cumulative),
  net worth and net worth after tax.
- **Wealth Projection**: the year-0 row, then years 1 to N, plus the horizon summary and N/A
  reasons.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every reference figure in this spec is reproduced to the cent by automated tests.
- **SC-002**: The investor can see projected 10-year net worth without entering anything beyond the
  property, loan and rent they already entered on another page.
- **SC-003**: Changing a driver updates the chart and summary within 1 second, matching the
  workspace's existing responsiveness tests.
- **SC-004**: The chart, presets and inputs are keyboard-operable, and the chart's data is
  available as a table.
- **SC-005**: For any valid scenario, the equity parts sum to equity, and net worth − equity equals
  cumulative cash flow, to the cent, in every year.

## Assumptions

- **Not tax advice.** This is a simplified model, and the page says so. It ignores:
  - passive-activity loss limits, so paper losses are assumed to offset other income at the
    marginal rate
  - the mid-month convention
  - depreciation recapture and capital gains on sale
  - state taxes
  - the deductibility of PMI and closing costs
- **Building basis** includes the rehab budget (capital improvements) but not closing costs.
- **Net worth** is the user's definition: equity + cumulative cash flow. Selling costs and the cash
  originally invested are not subtracted, but the multiple on cash invested gives that context.
- **Forced appreciation** is an immediate, one-time value uplift at purchase, entered in dollars.
- **Growth rates** are shared with spec 005 and keep its 0% default, so the two pages never
  disagree. "Use typical rates" is an explicit action, not a silent default.
- **Library placement**: rental-investor analysis, so it goes in the existing `deal-analyzer-*`
  libraries, as `/financing` did.
- **Storage**: client-side only (constitution Principle III).
