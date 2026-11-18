# Research: Multi-Year Projections & Wealth Accumulation Simulator

**Feature**: `008-wealth-projection` · **Date**: 2026-11-17

The Technical Context has no NEEDS CLARIFICATION items. The stack, storage, charts and testing all
come from features 001–006. The decisions below settle the modelling and design choices the spec
leaves to planning.

## R1. Reuse `projectRental` (spec 005) as the operating engine

- **Decision**: `projectWealth(scenario, schedule)` calls `projectRental(scenario, schedule)` for
  income, operating expenses, NOI, debt service, cash flow and loan balance in years 1 to
  `ceil(term/12)`. It adds what is new:
  - the horizon
  - property value with forced appreciation
  - the equity split
  - interest, depreciation and tax
  - the cumulative series

  For horizon years past the loan term, it continues the income and expense growth using the same
  `rentalLineItems` growth rule, with debt service and balance at 0.
- **Rationale**: This gives one definition of a rental year across the workspace, which is
  constitution Principle I plus spec 005 FR-012. Year 1 therefore still equals `analyzeDeal`, and
  the Deal Analyzer's charts and this page can never disagree.
- **Alternatives**: A separate projection loop was rejected because it duplicates the
  income/expense rules. Extending `projectRental` with tax fields was also rejected, because it
  widens a type that four charts already use.

## R2. Property value and forced appreciation

- **Decision**: `value(n) = roundCents((price + forced) × (1 + a)^n)` for n = 0…N. Market
  appreciation is `value(n) − price − forced`. `projectRental.homeValue` (without forced) is not
  used for equity on this page.
- **Rationale**: The spec says forced appreciation happens at purchase and then compounds with
  the market. Dollars are the natural input, for example ARV − price.
- **Verified**: +$20,000 forced gives +$26,878.33 of equity in year 10 ($20,000 × 1.03¹⁰, which
  rounds the same either way).

## R3. Equity decomposition identity

- **Decision**: The four parts are:
  - `initialEquity = price − loan`
  - `forcedAppreciation = forced`
  - `marketAppreciation = value − price − forced`
  - `principalPaid = loan − balance`

  They sum to `value − balance` exactly, because each part is a difference of cents-rounded
  quantities. A property test checks this across random scenarios (SC-005).

## R4. Cash flow and net worth

- **Decision**: `cumulativeCashFlow(n) = Σ cashFlow(1..n)`, using spec 005's cash flow, which
  excludes extra principal. `netWorth(n) = equity(n) + cumulativeCashFlow(n)`. Year 0 has no cash
  flow.
- **Rationale**: This is the user's definition. Extra principal turns cash into equity, so
  counting it against cash flow and also in equity would double-count. Excluding it from both
  sides is consistent with spec 005, and the page notes it.
- **Alternatives considered**:
  - Subtracting the initial cash invested ("profit" rather than wealth). This was rejected as a
    different metric; the multiple on cash invested (R8) gives that context instead.
  - Subtracting selling costs. This was rejected as out of scope.

## R5. Depreciation

- **Decision**: `basis = price × (1 − land/100) + rehabBudget`. The annual amount is
  `roundCents(basis / 27.5)` each year until the cumulative total reaches the basis. The final year
  takes the rounded remainder and later years take 0. There is no mid-month convention.
- **Rationale**: This is the user's "basic residential depreciation schedule (27.5 years
  straight-line on building value)". Land does not depreciate, and a 20% land share is a common
  assessor-style default. Rehab spend is a capital improvement. Closing costs are left out to keep
  the model basic (spec Assumptions).
- **Verified**: For $320,000 of basis the annual amount is $11,636.36. Year 28 (inside a 30-year
  horizon) takes the $5,818.28 remainder.

## R6. Mortgage interest

- **Decision**: `interest(n) = roundCents(Σ schedule.periods[(n−1)·12 … n·12−1].interestPortion)`,
  which is 0 after payoff.
- **Rationale**: These are the actual scheduled interest amounts, so extra payments reduce
  interest correctly.
- **Verified**: Year-1 interest on the reference property is $20,903.45.

## R7. Tax effect

- **Decision**: `taxableIncome = noi − interest − depreciation`, and
  `taxEffect = roundCents(−taxableIncome × rate)`, signed so that positive means a saving. The
  cumulative total feeds `netWorthAfterTax = netWorth + cumulativeTaxEffect`.
- **Rationale**: The user asked for "Tax Benefits: depreciation and mortgage interest deductions".
  Showing only the shield `(dep + interest) × rate` would overstate the benefit, because NOI itself
  is taxable. The net effect on the rental's taxable income is the honest number. It shows both
  the early paper loss and the later tax owed as rents grow.
- **Alternatives**: The shield-only figure was rejected because it misleads. A full tax engine
  (passive-loss limits, recapture) is out of scope, and the page says so.
- **Verified**: Year 1 is −4,027.81 × 0.24 = +$966.67.

## R8. Horizon and summary

- **Decision**: The horizon defaults to 10, with presets 5 and 10 through `SegmentedOptions` (the
  same component as spec 006), plus a whole-number input from 1 to 30. The summary uses the
  horizon year. `multiple = netWorth(N) / totalCashInvested`, or N/A with `analyzeDeal`'s
  "No cash invested" reason.
- **Rationale**: The user framed this as a "5-to-10-year projection", so those two are the
  presets. Allowing up to 30 covers full-term views without a new control.

## R9. Chart

- **Decision**: Reuse `LineChart` from `@companion/charts`, with numeric `x` = year 0…N and the
  integer year ticks. The series are:
  - Net worth: slot 1, primary
  - Equity: slot 3
  - Net worth after tax: slot 2

  `tooltipExtras` shows property value, loan balance, cumulative cash flow and cumulative tax
  effect, and the built-in "Show data" table covers SC-004. When the tax inputs are invalid, the
  after-tax series is omitted.
- **Rationale**: The chart system and palette already exist and are validated (spec 005), so
  there is no new dependency. Three series stay within the direct-label limit of 4 or fewer.

## R10. Persistence and placement

- **Decision**: Add an optional `RentalAssumptions.wealth?: { horizonYears?; forcedAppreciation?;
  landValuePct?; marginalTaxRatePct? }`. Every field is optional, and a missing field takes its
  default (FR-015), so no migration is needed. The page goes at `/wealth` and composes
  `WealthView` from `deal-analyzer-ui`, with the math in `deal-analyzer-calculations`. The nav entry
  "Wealth Projection" uses a new `TrendingUpIcon` in `shared-ui`.
- **Rationale**: This follows the same pattern as spec 006 and the growth fields in spec 005.
  Principle II is kept: the route file only renders the view.

## Reference scenario (spec, contracts and tests)

The spec 006 reference property:
- $400k price, 25% down, 7% for 30 years
- tax $4,800 and insurance $1,800
- rent $3,800 with default reserves, closing and rehab both $0

The projection assumptions are appreciation 3%, rent growth 2.5% and expense growth 2.5%, with land
20% (basis $320,000, depreciation $11,636.36/yr) and a 24% tax rate. Year 0 has equity = net
worth = $100,000.00.

| Yr | NOI | Cash flow | Interest | Taxable | Tax effect | Value | Balance | Equity | Cum. CF | Net worth | NW after tax |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 28,512.00 | 4,561.08 | 20,903.45 | −4,027.81 | 966.67 | 412,000.00 | 296,952.57 | 115,047.43 | 4,561.08 | 119,608.51 | 120,575.18 |
| 2 | 29,224.80 | 5,273.88 | 20,683.16 | −3,094.72 | 742.73 | 424,360.00 | 293,684.84 | 130,675.16 | 9,834.96 | 140,510.12 | 142,219.52 |
| 5 | 31,471.91 | 7,520.99 | 19,922.00 | −86.45 | 20.75 | 463,709.63 | 282,394.77 | 181,314.86 | 30,113.84 | 211,428.70 | 213,939.70 |
| 6 | 32,258.71 | 8,307.79 | 19,630.79 | 991.56 | −237.97 | 477,620.92 | 278,074.66 | 199,546.26 | 38,421.63 | 237,967.89 | 240,240.92 |
| 10 | 35,607.58 | 11,656.66 | 18,239.46 | 5,731.76 | −1,375.62 | 537,566.55 | 257,437.15 | 280,129.40 | 79,921.62 | 360,051.02 | 358,581.92 |

The multiple at year 10 is $360,051.02 ÷ $100,000 = **3.6×**.

These figures were produced with the workspace's real `computeSchedule`, `analyzeDeal` and
`projectRental` on 2026-11-17.
