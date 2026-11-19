# Feature Specification: Sale Profit & Exit Analyzer

**Feature Branch**: `013-sale-profit-exit-analyzer`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Build a Sale Profit & Exit Analyzer that tells an investor whether
selling a property at a chosen point makes a real profit—accounting for appreciation, selling
costs, remaining loan payoff, cumulative rental cash flow (when applicable), break-even sale price,
and optional illustrative tax estimates. Inputs: exit timing (by year or month, clamped to the loan
schedule length); annual appreciation, selling cost % (e.g. 7%), optional rent/expense growth;
optional tax estimates (off by default) for capital gains, 27.5-year depreciation recapture and the
land-to-building split, marked as planning estimates. Calculations: projected sale price and
selling costs; remaining loan balance and net sale proceeds; cumulative cash flow (0 for a
non-rental); total net profit and return on cash invested, plus optional after-tax net profit;
break-even sale price. Use worktree. Have a new page and route."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the
> user's description as part of `/speckit-plan` (the same approach as spec 009). It builds on spec
> 005 (growth rates), spec 008 (depreciation basis, land share), spec 009 (selling costs, cash to
> investor) and spec 010 (Deal Strip page pattern). Choices the description left open are listed
> under Assumptions.

## How this differs from `/pro-forma` (spec 009)

`/pro-forma` answers "what return do I get from holding N whole years?" (IRR, equity multiple) and
needs rent. This page answers a narrower question: **"if I sell at this exact month, do I come out
ahead, and what is the lowest price that still breaks even?"** It also works with **no rental**
(a primary residence or a flip without rent). Where the two pages overlap, they share stored
inputs and agree to the cent at whole-year exits.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Is selling at this point a real profit? (Priority: P1)

An investor opens a new **Sale Profit & Exit Analyzer** page at `/sale`. It has its own nav entry
("Sale Profit") and uses the same scenarios and Deal Strip as the other pages. They pick when they
sell, in **years or months** (a Years / Months toggle). The exit is a whole month from 1 to the
loan's term. They also set the **annual appreciation** and **selling costs** (default 7%, 0–15%).

The page shows:

- **Projected sale price**: purchase price × (1 + appreciation)^(months ÷ 12).
- **Selling costs**: sale price × selling-cost %.
- **Remaining loan balance** at the exit month, from the amortization schedule ($0 once paid off).
- **Net sale proceeds**: sale price − selling costs − remaining balance.
- **Cumulative cash flow** through the exit month: monthly net cash flow after debt service (and
  after any extra principal), summed. It is **$0 for a non-rental scenario**.
- **Total cash invested**: down payment + closing costs + rehab (rental), or the down payment
  alone (non-rental).
- **Total net profit**: net sale proceeds + cumulative cash flow − total cash invested.
- **Return on cash invested**: total net profit ÷ total cash invested ("N/A" with a reason when
  nothing was invested).
- A clear verdict: **"Profit"** (> $0), **"Loss"** (< $0) or **"Break-even"** ($0, to the cent).

**Why this priority**: This is the core answer the description asks for and delivers value alone.

**Independent Test**: Use the spec 006/009 reference property:
- $400,000 price and 25% down; 7% for 30 years
- $4,800/yr tax and $1,800/yr insurance; $3,800/mo rent with default reserves
- rent growth 3%, expense growth 2.5%, appreciation 3.5%; selling costs 7%

Selling after **7 years (84 months)**:
- Sale price **$508,911.71**, selling costs **$35,623.82**, loan balance **$273,442.24**.
- Net sale proceeds **$199,845.65**; cumulative cash flow **$51,574.90**.
- Cash invested **$100,000.00**; total net profit **$151,420.55** (matches `/pro-forma`'s 7-year
  total net profit); return on cash **151.42%**; verdict "Profit".

Selling after **90 months**:
- Sale price **$517,741.07**, selling costs **$36,241.87**, loan balance **$271,001.93**.
- Net sale proceeds **$210,497.27**; cumulative cash flow **$57,268.44**.
- Total net profit **$167,765.71**.

Selling after **12 months**: total net profit **−$7,371.49**, verdict "Loss".

**Acceptance Scenarios**:

1. **Given** a valid loan with a purchase price, **When** the page renders, **Then** the sale
   summary shows every figure above for the chosen exit.
2. **Given** the unit toggled to Months and 90 entered, **When** the page re-renders, **Then**
   every figure reflects a sale after month 90, and switching back to Years shows "7.5".
3. **Given** an exit later than the loan term (e.g. the term was shortened after the exit was
   set), **When** the page renders, **Then** the exit is clamped to the last month of the term and
   a note says so ("Sale moved to month 180, the end of the loan term").
4. **Given** a scenario with no rental, **When** the page renders, **Then** cumulative cash flow
   is $0 with the caption "No rental: cash flow not included", and the appreciation and selling
   costs inputs still work.
5. **Given** no purchase price, invalid loan fields, or invalid rental inputs (rental scenario),
   **When** the page renders, **Then** the summary shows a message naming what is missing instead
   of figures.
6. **Given** a whole-year exit on a rental scenario, **When** compared with `/pro-forma` at the
   same hold, **Then** sale price, selling costs, loan payoff, net proceeds and total net profit
   are identical to the cent.

---

### User Story 2 - What is the lowest price that still breaks even? (Priority: P2)

The page solves backward for the **break-even sale price**: the sale price at which total net
profit is exactly $0 after selling costs, the remaining loan balance and cumulative cash flow:

> break-even = (remaining balance + total cash invested − cumulative cash flow) ÷ (1 − selling-cost %)

It also shows the **price cushion**: projected sale price − break-even price (negative when the
projected price is short of break-even), and the break-even as a % of the purchase price.

**Why this priority**: It turns the verdict into an actionable number ("I must sell for at least
$X"), but depends on US1's figures.

**Independent Test**: Reference property, 84 months: break-even **$346,093.91**, cushion
**$162,817.80**. At 12 months: break-even **$421,926.33**, cushion **−$7,926.33**. Non-rental
(see US1 scenario 4, 84 months): break-even **$401,550.80**.

**Acceptance Scenarios**:

1. **Given** a sale at exactly the break-even price (selling costs at that price), **When** the
   profit is recomputed, **Then** it is $0.00 ± $0.01.
2. **Given** cumulative cash flow already exceeding balance + cash invested (e.g. a 30-year hold),
   **When** the page renders, **Then** the break-even shows **$0** with the caption "Profitable at
   any sale price" instead of a negative price.

---

### User Story 3 - Illustrative tax on the sale (Priority: P3)

A **"Estimate taxes on sale"** switch, **off by default**, adds planning estimates. It is labelled
everywhere it appears: "Illustrative planning estimate — not tax advice."

When on, the investor sets:
- **Capital gains rate** (default 15%, 0–40%).
- **Depreciation recapture rate** (default 25%, 0–40%; rental only).
- **Land value share** (default 20%, 0 ≤ x < 100; rental only). This is the same stored value
  `/wealth` and `/pro-forma` use.

The page then shows:
- **Depreciation taken** (rental only): (building share of price + rehab) ÷ 27.5 per year,
  prorated by month through the exit, capped at the basis.
- **Adjusted basis**: price + closing costs + rehab − depreciation taken (non-rental: price).
- **Taxable gain**: (sale price − selling costs) − adjusted basis.
- **Recapture tax**: min(gain, depreciation taken) × recapture rate (when the gain is > 0).
- **Capital gains tax**: the rest of the gain × capital gains rate.
- **After-tax net profit**: total net profit − recapture tax − capital gains tax.
- **After-tax break-even** is not computed (see Assumptions).

**Why this priority**: It refines the answer but needs extra, personal assumptions, so it is
optional and off by default.

**Independent Test**: Reference property, 84 months, tax on, defaults:
- Depreciation taken **$81,454.52** (7 × $11,636.36), adjusted basis **$318,545.48**.
- Taxable gain **$154,742.41**; recapture tax **$20,363.63**; capital gains tax **$10,993.18**.
- After-tax net profit **$120,063.74**.

Non-rental, 84 months, tax on: gain **$73,287.89**, capital gains tax **$10,993.18**, after-tax
net profit **$88,852.47**, no recapture row.

**Acceptance Scenarios**:

1. **Given** the switch off (default), **When** the page renders, **Then** no tax figures or tax
   inputs show, and every pre-tax figure is unchanged by the tax inputs.
2. **Given** a loss on sale (gain ≤ 0), **When** tax is on, **Then** both taxes are $0 and
   after-tax profit equals pre-tax profit (no loss benefit is modelled).
3. **Given** an exit of 12 months or less, **When** tax is on, **Then** a note says short-term
   gains are usually taxed at ordinary rates and to set the capital gains rate accordingly.
4. **Given** an invalid tax input, **When** it is entered, **Then** an inline error appears and
   only the after-tax figures show "—"; pre-tax figures and break-even are unaffected.

### Edge Cases

- **Exit after an early payoff** (extra principal): remaining balance is $0; months after payoff
  have no debt service.
- **Extra principal payments**: they reduce the remaining balance and are subtracted from cash flow
  in the month paid, so they are never counted twice (spec 009 R2).
- **Partial year**: months in operating year *y* use year *y*'s rent and expenses (spec 005 growth
  rule), so month 90 uses year-8 rent.
- **Negative appreciation**: allowed (−10% to 25%, shared validation); the sale price falls.
- **Negative net sale proceeds** (underwater): shown as negative; the verdict follows profit.
- **No cash invested** (0% down, no closing costs or rehab): return on cash shows "N/A — no cash
  invested"; profit and break-even still show.
- **Old sessions** without the new fields: every new field takes its default.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST serve a new page at `/sale` titled "Sale Profit & Exit Analyzer", with a
  nav entry "Sale Profit" after "Hold & Exit".
- **FR-002**: The page MUST use the spec 010 Deal Strip and share scenarios with other pages.
- **FR-003**: The exit MUST be entered in years or months via a toggle and stored as a whole month.
  The default is the scenario's `/pro-forma` hold × 12 (rental) or 84 months (non-rental).
- **FR-004**: The exit MUST be clamped to 1…loan term months for calculation, with a visible note
  when clamping changes the stored value. A non-integer or < 1 value MUST show an inline error.
- **FR-005**: Appreciation and selling costs MUST write the shared stored values when the scenario
  has a rental (`rental.appreciationPct`, `rental.exit.sellingCostsPct`) and scenario-level sale
  values otherwise.
- **FR-006**: Rent growth and expense growth MUST be editable on the page (rental only), writing the
  shared spec 005 fields.
- **FR-007**: The page MUST compute and show the US1 figures and verdict.
- **FR-008**: The page MUST compute the break-even sale price and cushion (US2), floored at $0.
- **FR-009**: Tax estimates MUST be off by default, and when on MUST show the US3 figures with the
  "Illustrative planning estimate — not tax advice." label.
- **FR-010**: All calculations MUST be pure library functions tested to the cent (Constitution I).
- **FR-011**: Invalid inputs MUST show inline errors and never crash the page; invalid tax inputs
  MUST NOT hide pre-tax figures.
- **FR-012**: New stored fields MUST be optional, and sessions without them MUST load with defaults.
- **FR-013**: The page MUST link to `/pro-forma` for IRR and multi-year returns.

### Key Entities

- **Sale assumptions** (stored per scenario): exit month, input unit, non-rental appreciation and
  selling costs, tax-estimate switch and rates.
- **Sale analysis** (derived, never stored): the sale, cash flow, profit, return, break-even and
  optional tax estimate for one exit month.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every reference figure in US1–US3 is reproduced to the cent by unit tests.
- **SC-002**: At every whole-year exit 1–30 on the reference and generated scenarios, sale price,
  selling costs, loan payoff, net proceeds and total net profit equal `/pro-forma`'s to the cent.
- **SC-003**: Changing any input updates all figures within 1 second.
- **SC-004**: Profit recomputed at the break-even price is within $0.01 of $0 for every generated
  scenario.
- **SC-005**: The page has no horizontal scroll at 375 px and passes the existing axe checks.

## Assumptions

- **Sale price compounds the purchase price only.** `/pro-forma`'s optional forced appreciation
  (spec 008) is not added, as the description says "compound the purchase price". When a scenario
  has forced appreciation, the page notes that `/pro-forma`'s sale price includes it.
- **Appreciation compounds monthly-continuous**: (1 + a)^(m/12), which equals the annual figure at
  whole years.
- **Non-rental scenarios** count only the down payment as cash invested and treat carrying costs
  (mortgage payments, tax, insurance, HOA) as outside the analysis, per the description ("treat as
  0"). The page states "Excludes holding costs". The home-sale (§121) exclusion is not modelled.
- **Tax estimates** are on the sale only. Annual income tax on rental cash flow (the spec 008 tax
  effect) is shown on `/pro-forma`, not here. Depreciation is straight-line monthly proration
  (no mid-month convention). Losses give no tax benefit. Capital gains and recapture rates are
  flat user inputs (no brackets, NIIT or state tax). No after-tax break-even is computed because
  the tax is non-linear in price at the recapture boundary.
- **Exit range** is the loan's original term (`termMonths`), not the payoff month, so a property
  held after an early payoff can still be analysed.
- **Spec 012** (multi-unit rent roll) is not yet implemented; this page reads gross rent through
  the same `operatingYear` path, so it inherits rent-roll changes automatically.
