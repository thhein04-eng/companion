# Feature Specification: Multi-Year Hold & Exit Pro Forma

**Feature Branch**: `009-hold-exit-pro-forma`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Multi-Year Hold & Exit Projections (5–10 Year Pro Forma). Year-1 metrics don't capture how rent growth, appreciation, and loan paydown compound over time. Growth & Inflation Assumptions: Add inputs for annual rent growth (e.g., 3%), expense inflation (e.g., 2.5%), and property appreciation (e.g., 3.5%). Internal Rate of Return (IRR) & Equity Multiple: Model an eventual sale at Year 5, 7, or 10—factoring in selling costs (typically 6%–8% for agent commissions and transfer taxes) and remaining loan payoff—to calculate IRR, Total Net Profit, and Equity Multiple. Depreciation & Tax Shield Estimate: Calculate straight-line residential depreciation (Building Value ÷ 27.5 years, excluding land value) alongside deductible mortgage interest to estimate after-tax cash flow. new page and route."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the user's
> description as part of `/speckit-plan`. It builds on spec 005 (growth rates), spec 006 (page
> pattern) and spec 008 (depreciation, interest and tax effect). Choices the description left open
> are listed under Assumptions.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the return from buying, holding and selling (Priority: P1)

An investor opens a new **Hold & Exit Pro Forma** page at `/pro-forma`. It has its own nav entry
and shares scenarios and inputs with the other pages. They pick a hold period: 5, 7 or 10 years as
one-click presets (default 7), or any whole number from 1 to 30. They also set selling costs, which
default to 7% of the sale price and accept 0–15%.

The page models a sale at the end of the hold period:

- **Sale price**: the property value in that year.
- **Selling costs**: the sale price × selling-cost %.
- **Loan payoff**: the remaining balance.
- **Net sale proceeds**: sale price − selling costs − loan payoff.

The page then shows:

- **IRR** (annual): computed from the cash invested, each year's cash to the investor, and the net
  sale proceeds.
- **Total net profit**: cumulative cash to investor + net sale proceeds − cash invested.
- **Equity multiple**: (cumulative cash to investor + net sale proceeds) ÷ cash invested.

**Why this priority**: This is the core answer the description asks for. Growth rates already
exist in storage (spec 005), so it delivers value on its own.

**Independent Test**: Use the spec 006 reference property:
- $400,000 price and 25% down
- 7% for 30 years
- $4,800/yr tax and $1,800/yr insurance
- $3,800/mo rent with default reserves
- rent growth 3%, expense inflation 2.5%, appreciation 3.5%

Then, with a 7-year hold and 7% selling costs:
- Sale price is **$508,911.71**, selling costs **$35,623.82** and loan payoff **$273,442.24**.
- Net sale proceeds are **$199,845.65**.
- IRR is **15.66%**, total net profit **$151,420.55** and equity multiple **2.51×**.

**Acceptance Scenarios**:

1. **Given** a valid loan with a purchase price and valid rental inputs, **When** the page renders,
   **Then** an exit summary shows the sale price, selling costs, loan payoff, net sale proceeds,
   IRR, total net profit and equity multiple for the chosen hold.
2. **Given** the hold set to 5 or 10, **When** the page re-renders, **Then** every exit figure
   reflects a sale at the end of that year.
3. **Given** the page, **When** it renders, **Then** a hold-period comparison shows IRR, total net
   profit, equity multiple and net sale proceeds side by side for 5, 7 and 10 years. If the chosen
   hold is not one of those, it gets a fourth column, so the presets can be compared at a glance.
4. **Given** no purchase price, no rent, invalid rental inputs or invalid loan fields, **When** the
   page renders, **Then** the exit section shows a message naming what is missing instead of
   figures.
5. **Given** no cash invested, or cash flows with no IRR solution, **When** the page renders,
   **Then** IRR and the equity multiple show "N/A" with a reason.

---

### User Story 2 - Drive the pro forma with growth and inflation assumptions (Priority: P2)

On the same page, the investor edits **annual rent growth**, **annual expense inflation** and
**annual property appreciation**. These are the same stored values that `/deal-analyzer` and
`/wealth` use, so all three pages always agree. A "Use example rates" action fills in 3% rent
growth, 2.5% expense inflation and 3.5% appreciation (the values in the description). A
year-by-year pro forma table shows, for each year of the hold:

- gross income, operating expenses and NOI;
- debt service, any extra principal paid, and cash to investor;
- loan balance and property value.

A final sale row shows the sale price, selling costs, loan payoff and net proceeds.

**Why this priority**: The assumptions make the pro forma the investor's own, and the table lets
them audit how compounding drives the result.

**Independent Test**: With all growth at 0%, IRR differs from the reference. Then click "Use
example rates", and the 7-year IRR becomes 15.66%. The pro forma table's year-1 row shows NOI
$28,512.00 and cash to investor $4,561.08. The sale row shows net proceeds $199,845.65.

**Acceptance Scenarios**:

1. **Given** growth edited on `/pro-forma`, **When** the investor opens `/wealth` or
   `/deal-analyzer`, **Then** those pages use the same rates.
2. **Given** a recurring extra principal payment, **When** the pro forma runs, **Then** cash to
   investor is reduced by the extra principal paid that year, and the loan payoff is lower. The IRR
   reflects both.
3. **Given** a growth rate outside −10% to 25%, or selling costs outside 0–15%, **When** it is
   entered, **Then** an inline error appears, and the exit figures wait for a valid value.

---

### User Story 3 - Estimate after-tax cash flow from depreciation and interest (Priority: P3)

The pro forma also shows, for each year:

- **Depreciation**: straight-line, building value ÷ 27.5 years, excluding land.
- **Deductible mortgage interest**: the scheduled interest for that year.
- **Taxable rental income**: NOI − interest − depreciation.
- **Tax effect** at the investor's marginal rate.
- **After-tax cash flow**: cash to investor + tax effect.

The land value share and marginal tax rate are the same stored values `/wealth` uses (default 20%
and 24%). The exit summary adds an **after-tax IRR**, **after-tax total net profit** and
**after-tax equity multiple**. These use after-tax annual cash flows, and they are clearly
labelled as excluding tax due on the sale.

**Why this priority**: The tax estimate refines the return but needs two extra assumptions.

**Independent Test**: For the reference property with a 7-year hold:
- Year-1 depreciation is $11,636.36 and interest is $20,903.45.
- The tax effect is +$966.67, so after-tax cash flow is $5,527.75.
- After-tax IRR is 15.88%, after-tax total net profit $152,217.73 and after-tax equity multiple
  2.52×.

**Acceptance Scenarios**:

1. **Given** a 0% tax rate, **When** the page renders, **Then** the after-tax figures equal the
   pre-tax figures.
2. **Given** an invalid land share or tax rate, **When** it is entered, **Then** an inline error
   appears, and only the after-tax figures show "—". The pre-tax exit figures are unaffected.

### Edge Cases

- **Hold longer than the loan term**: years after payoff have no debt service, and the loan payoff
  at sale is $0.
- **Negative net sale proceeds** (selling costs and payoff exceed the price): shown as negative.
  IRR may become N/A if the cash flows never change sign.
- **Negative cash to investor in early years**: allowed. IRR still solves while the cash flows
  change sign.
- **Selling costs at 0%**: the net proceeds are sale price − payoff.
- **Forced appreciation set on `/wealth`**: it is included in the sale price, because the property
  value is shared, and the page shows a note when it is non-zero.
- **Older sessions** without the new fields load with defaults (hold 7, selling costs 7%).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide `/pro-forma`, titled "Hold & Exit Pro Forma", with a nav
  entry "Hold & Exit". It MUST share the scenario store with the other pages, and include the
  scenario tabs plus the loan, real-estate cost and rental inputs.
- **FR-002**: The hold period MUST default to 7 years, offer 5/7/10 presets, and accept whole
  numbers 1–30.
- **FR-003**: Selling costs MUST default to 7% of the sale price, and accept 0 ≤ x ≤ 15.
- **FR-004**: Yearly operations (gross income, operating expenses, NOI, scheduled debt service,
  balance, property value, interest, depreciation and tax effect) MUST equal spec 008's
  `projectWealth` (and therefore spec 005's `projectRental`) for the same year. The equality covers
  any forced appreciation stored for `/wealth`.
- **FR-005**: Cash to investor in year _n_ MUST be NOI − scheduled debt service − extra principal
  paid in year _n_.
- **FR-006**: At the end of year N (the hold): sale price = property value(N), selling costs =
  sale price × %, loan payoff = balance(N), and net sale proceeds = sale price − selling costs −
  payoff.
- **FR-007**: Cash invested MUST be the Deal Analyzer's total cash invested (down payment +
  closing costs + rehab). The cash-flow series is [−invested, CF₁, …, CF_N + net proceeds].
- **FR-008**: IRR MUST be the annual rate r with NPV = 0 over that series, accurate to 1e-7. It
  MUST be N/A with a reason when cash invested ≤ 0, or when no root exists in −99%…1,000%.
- **FR-009**: Total net profit MUST be ΣCF + net proceeds − invested. The equity multiple MUST be
  (ΣCF + net proceeds) ÷ invested, or N/A when invested ≤ 0.
- **FR-010**: After-tax cash flow MUST be cash to investor + tax effect, using spec 008's tax
  effect. The after-tax IRR, profit and multiple MUST use after-tax cash flows and the same
  pre-tax net sale proceeds. They MUST be labelled "excludes tax on sale".
- **FR-011**: Growth rates MUST be the existing shared `RentalAssumptions` fields, with the same
  validation. "Use example rates" sets rent 3%, expenses 2.5% and appreciation 3.5%.
- **FR-012**: Land share and tax rate MUST be the existing `rental.wealth.landValuePct` /
  `marginalTaxRatePct`, with the same defaults and validation as spec 008.
- **FR-013**: The page MUST show a hold-period comparison for 5, 7 and 10 years, plus the chosen
  hold if it differs. It shows pre-tax IRR, after-tax IRR, total net profit, equity multiple and
  net sale proceeds.
- **FR-014**: The page MUST show a year-by-year pro forma table for years 1 to N:
  - gross income, operating expenses and NOI;
  - debt service, extra principal and cash to investor;
  - interest, depreciation, taxable income, tax effect and after-tax cash flow;
  - loan balance and property value;

  plus a sale row.
- **FR-015**: New inputs (hold and selling costs) MUST persist in session storage under
  `rental.exit`. Older sessions MUST load with defaults. Invalid exit inputs MUST show inline errors
  and hide the exit figures without blocking the loan inputs.
- **FR-016**: Money MUST be cents-rounded, IRR shown as a percent with 2 decimals, and multiples
  with 2 decimals ("2.51×").

### Key Entities _(include if feature involves data)_

- **Exit Assumptions**: hold period and selling-cost %, stored per scenario with the rental inputs.
  Growth rates, land share and tax rate are shared with specs 005 and 008.
- **Pro Forma Year**: one year's operating, debt, tax and cash figures.
- **Exit Result**: sale price, selling costs, payoff and net proceeds, plus the pre- and after-tax
  IRR, profit and multiple, for one hold period.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every reference figure in this spec is reproduced by automated tests: money to the
  cent, IRR to 4 decimal places as a fraction.
- **SC-002**: The investor can compare 5-, 7- and 10-year exits without changing any input.
- **SC-003**: Changing an assumption updates the exit figures within 1 second.
- **SC-004**: All controls are keyboard-operable, and the tables have captions and scoped headers.
- **SC-005**: For any valid scenario, NPV at the computed IRR is within $0.01, and the pro forma's
  yearly figures equal `projectWealth`'s for the same years.

## Assumptions

- **Not tax advice.** Only annual tax effects are modelled. Tax on the sale, including
  depreciation recapture, capital gains and state taxes, is not, so the after-tax figures are
  labelled "excludes tax on sale". Passive-loss limits and the mid-month convention are ignored, as
  in spec 008.
- **Default hold** is 7 years, the middle of the three presets the description names. The default
  selling costs are 7%, the midpoint of the 6–8% range given.
- **"Use example rates" (3% / 2.5% / 3.5%)** uses this description's numbers. It differs from
  `/wealth`'s "Use typical rates", which sets 3% appreciation, 2.5% rent growth and 2.5% expense
  growth. Both buttons are explicit actions on the same shared fields, and the growth rates
  still default to 0% (spec 005).
- **Cash to investor includes extra principal as an outflow.** This differs from spec 005/008 cash
  flow, which excludes it. A pro forma's IRR must count every dollar the investor puts in. The page
  labels the row accordingly.
- **IRR is annual**, with year-end cash flows, and the purchase at t = 0.
- **Selling costs** are a single percentage of the sale price, covering commissions, transfer
  taxes and closing.
- **Library placement**: the existing `deal-analyzer-*` libraries, as for `/financing` and
  `/wealth`.
- **Storage**: client-side only (constitution Principle III).
