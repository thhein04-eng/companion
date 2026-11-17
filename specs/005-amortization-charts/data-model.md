# Data Model: Amortization Charts

**Feature**: `005-amortization-charts` | **Date**: 2026-11-16

Chart datasets are **derived and in-memory**. The only persisted change is three **optional**
growth fields on `RentalAssumptions` (§C), stored in the existing `sessionStorage` state
(Constitution III, spec FR-013).

There are three groups:

- **A. Generic chart model**: lives in `@companion/charts` and knows nothing about loans.
- **B. Amortization datasets**: lives in `amortization-calculations` and is produced by pure
  builders that return the generic shapes from group A.
- **C. Rental growth inputs and rental datasets**: also lives in `amortization-calculations`,
  built on `analyzeDeal`.

---

## A. Generic chart model (`libs/shared/charts`)

### `ColorToken`

```ts
type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ColorToken = SeriesSlot | 'muted';
```

- A token becomes `var(--chart-series-{n})` or `var(--chart-muted)`. Raw hex values are never
  accepted (see research R6).
- Validation: any slot outside 1–8 is a type error. There is no runtime cycling. If a consumer has
  more than 8 series, it must fold or cap them (see `capSeries` below).

### `SeriesDef<K extends string>`

| Field | Type | Rules |
|---|---|---|
| `key` | `K` | Unique within one chart. It is the property name read from each `Datum`. |
| `label` | `string` | Shown in the legend, tooltip, direct label and table header. Must not be empty. |
| `color` | `ColorToken` | Required. The consumer assigns it by entity, never by array position after filtering. |
| `emphasis?` | `'primary' \| 'context'` | Default `'primary'`. `'context'` draws a 1.5px muted line under the primary lines. |

### `Datum<K extends string>`

```ts
type Datum<K extends string> = { x: number | string } & { [P in K]: number | null };
```

- `x` is a number for `LineChart` (period index or a timestamp), or a `string` category for
  `StackedBarChart`.
- `null` means "no value here". Line charts break the path at `null`. Stacked bars treat `null`
  as 0 and leave it out of the tooltip.
- Values may be negative. Line charts with `yDomain: 'auto'` include them. Stacked bars stack
  negatives downward from 0 (research R13).
- Within one chart, `x` must be strictly increasing (line charts) or unique (bar charts).

### `SegmentDef`

Used by `SegmentedBar`: `{ key: string; label: string; value: number; color: ColorToken }`.
`value` must be ≥ 0. Segments with `value === 0` are dropped by the component.

### `AxisFormat`

`{ x?: (x) => string; y?: (y: number) => string; tooltipX?: (x) => string; tooltipY?: (y: number) => string }`.
Every field is optional. The defaults are `String(x)` and compact numbers.

### `TooltipExtra`

`{ label: string; value: string }`. These are context rows that are not series, appended under the
series rows in the tooltip and added as extra columns in the data table. They are supplied through
`tooltipExtras?: (index: number) => TooltipExtra[]`.

### Internal helpers (exported for reuse and testing)

| Helper | Signature | Notes |
|---|---|---|
| `linearScale` | `(domain: [n, n], range: [n, n]) => Scale` | Has `invert`. A zero-width domain maps to the middle of the range. |
| `bandScale` | `(keys: string[], range: [n, n], paddingInner: number) => Band` | Has `bandwidth`. |
| `niceTicks` | `(min, max, count) => number[]` | 1/2/5 × 10ⁿ steps. Includes 0 when `min ≥ 0`. Never returns duplicates. |
| `linePath` | `(points: ({x,y} \| null)[]) => string` | Starts a new `M` after each `null`. |
| `roundedTopRect` | `(x, y, w, h, r, direction: 'up' \| 'down' = 'up') => string` | The outer end gets radius `min(r, w/2, h)` and the end at the baseline is square. `'down'` rounds the bottom end, for negative stacks. |
| `yExtent` | `(values: (number \| null)[], mode: 'zero-based' \| 'auto') => [min, max]` | `'zero-based'` gives `[0, max(0, …)]`. `'auto'` gives `[min(0, …), max(0, …)]`. All-null or all-zero input gives `[0, 1]`. |
| `capSeries` | `(series, max = 8) => { shown, hiddenCount }` | Keeps the first `max`. Used by consumers that can have more than 8 entities. |

---

## B. Amortization datasets (`libs/amortization-calculations/src/lib/chart-data.ts`)

Every builder is pure and O(n). Each one returns **plain generic shapes** and imports nothing from
`@companion/charts`. Its local types are structurally compatible with group A, so the calculations
lib stays free of React and charts.

### `BalanceSeriesDatum`

`{ x: number /* periodNumber */; date: string /* ISO */; balance: number | null; baseline: number | null }`

Built by `buildBalanceSeries(schedule, baselineSchedule | null)`:

- It has one row per period of `max(schedule.periods.length, baseline?.periods.length ?? 0)`,
  plus a leading **period 0** row whose balance is the starting principal. Period 0's balance is
  `periods[0].remainingBalance + periods[0].principalPortion`, so the line starts at the full loan.
- `balance` equals `periods[i].remainingBalance` exactly. After the schedule pays off, the value
  is `null`.
- `baseline` comes from the same rule applied to `baselineSchedule`. It is `null` everywhere when
  `baselineSchedule` is `null`.
- `date` for period 0 is the `startDate`. For period n it is `periods[n-1].date`.
- **Invariant**: the last non-null `balance` is `0`.

### `YearlyPrincipalInterestDatum`

`{ x: string /* "Yr 1" or "2027" */; year: number; principal: number; extraPrincipal: number; interest: number; total: number }`

Built by `buildYearlyPrincipalInterest(schedule, { groupBy: 'loanYear' | 'calendarYear' = 'loanYear' })`:

- `loanYear`: periods 1–12 make up Yr 1, 13–24 make up Yr 2, and so on. A partial final year is
  its own group.
- `calendarYear`: groups by the year of `period.date`.
- `principal` = Σ(`principalPortion` − `extraPrincipalApplied`). This is the scheduled principal.
- `extraPrincipal` = Σ `extraPrincipalApplied`.
- `interest` = Σ `interestPortion`.
- `total` = Σ `paymentAmount`.
- Each sum uses `roundCents`. **Invariant**: `principal + extraPrincipal + interest === total`,
  within ±$0.01 because of per-field rounding. Tests check this exactly for reference scenarios.
- Series emitted by the preset: Principal (slot 1), and Extra principal (slot 3) only when
  Σ extra > 0, and Interest (slot 2).

### `PaymentComponent`

`{ key: 'principalAndInterest' | 'propertyTax' | 'insurance' | 'pmi' | 'hoa'; label: string; value: number }`

Built by `buildPaymentComposition(scenario, schedule): { components: PaymentComponent[]; total: number }`:

| key | value | label |
|---|---|---|
| `principalAndInterest` | `summary.monthlyPrincipalAndInterest` | Principal & interest |
| `propertyTax` | `roundCents((annualPropertyTax ?? 0) / 12)` | Property tax |
| `insurance` | `roundCents((annualInsurance ?? 0) / 12)` | Insurance |
| `pmi` | `periods[0].pmiApplies ? summary.monthlyPmiAmount : 0` | PMI |
| `hoa` | `roundCents(monthlyHoa ?? 0)` | HOA |

- Components with value `0` are omitted.
- `total` = `summary.totalMonthlyPayment`, which is the authoritative figure shown in the UI.
- **Invariant**: |Σ values − total| ≤ $0.01. Components are rounded one by one while `total` is
  rounded once. The UI shows `total` from the summary and never the recomputed sum.
- The preset hides the chart when `components.length < 2` (FR-003, User Story 3).
- Fixed slot mapping: P&I 1, tax 3, insurance 4, PMI 5, HOA 7.

### `ScenarioBalanceDatum`

`{ x: number /* periodNumber */; [scenarioId: string]: number | null }`

Built by `buildScenarioBalanceComparison(schedules: AmortizationSchedule[])`:

- It has rows for periods `0 … max(periods.length)`. Each scenario's column follows the same rules
  as `balance` in `BalanceSeriesDatum` (start principal at 0, `null` after payoff).
- The x-axis is **period number** (months since start), not calendar date, so loans with
  different start dates line up by elapsed time. Tooltip label: `"Month {n} · Year {ceil(n/12)}"`.
- Series order and color come from the scenario list in the page: `slot = indexInScenarioList + 1`.
  A scenario that is invalid is left out without changing the slots of the others. If there are
  more than 8 scenarios, those at list index ≥ 8 are not drawn, and the preset reports how many valid ones were hidden (spec US4 scenario 2).

---

## C. Rental growth inputs and rental datasets

### `RentalAssumptions` (extended, persisted)

| New field | Type | Rules |
|---|---|---|
| `rentGrowthPct` | `number \| undefined` | Optional. A missing value means 0. When present it must be finite and **−10 ≤ x ≤ 25**. It applies to gross rent plus other income, compounding yearly. |
| `expenseGrowthPct` | `number \| undefined` | Same range. It applies to property tax, insurance and HOA only. Percent-of-income lines grow through income. |
| `appreciationPct` | `number \| undefined` | Same range. It applies to the purchase price. |

- `DEFAULT_RENTAL_ASSUMPTIONS` adds `rentGrowthPct: 0, expenseGrowthPct: 0, appreciationPct: 0`.
- Validation errors are keyed `rental.rentGrowthPct` and so on, with the message
  `"{Rent growth|Expense growth|Appreciation} must be between -10% and 25%."`.
- Sessions saved before this feature have none of the three fields and deserialize unchanged, so
  they behave as 0%.
- `growthRates(rental)` returns `{ rent, expense, appreciation }` as fractions, with the `?? 0`
  applied.

### `RentalYear` (derived)

Built by `projectRental(scenario, schedule): RentalProjection`, with the preconditions of
`analyzeDeal` (valid scenario, valid rental, and the matching schedule).

| Field | Definition (research R11/R12) |
|---|---|
| `year` | `1…ceil(termMonths / 12)` |
| `x` | `` `Yr ${year}` `` (a category label for bar charts). Line charts use `year` as the numeric x. |
| `grossIncome` | `roundCents(12 × GSI_N)` |
| `operatingExpenses` | `roundCents(12 × (pctLines_N + fixed_N))` |
| `noi` | `roundCents(12 × NOI_N)`. For year 1 this `===` `analyzeDeal().netOperatingIncome.annual`. |
| `debtService` | `roundCents(monthlyPrincipalAndInterest × periodsInYear + monthlyPmiAmount × pmiPeriodsInYear)`. For year 1 this `===` `analyzeDeal().debtService.annual`. It is 0 after payoff. |
| `cashFlow` | `roundCents(12 × NOI_N(unrounded) − debtService)`. For year 1 this `===` `analyzeDeal().cashFlow.annual`. |
| `cashOnCash` | `cashFlow / totalCashInvested`, unrounded, or `null` when cash invested is 0. For year 1 this `===` `analyzeDeal().cashOnCashReturn.value`. |
| `homeValue` | `roundCents(homePrice × (1+gA)^year)`, or `null` without a home price |
| `loanBalance` | the remaining balance at the last period of the year, or 0 after payoff |
| `initialEquity` | `roundCents(homePrice − principal)`, or `null` without a home price |
| `principalPaid` | `roundCents(principal − loanBalance)`, i.e. principal paid down, including extra principal. This is derived from the balance rather than as Σ `principalPortion`, because summing per-period rounded amounts drifts a few cents over 30 years and would break the equity identity. It stays within $0.05 of the per-period sum. |
| `appreciation` | `roundCents(homeValue − homePrice)`, or `null` without a home price |

`RentalProjection` = `{ years: RentalYear[]; totalCashInvested: number; cashOnCashNaReason: string | null; equityNaReason: string | null }`.

**Invariants**, which the unit tests check:
- `initialEquity + principalPaid + appreciation === homeValue − loanBalance`, within ±$0.01.
- With all growth rates at 0, `noi` is the same in every year.
- `years.length === ceil(termMonths / 12)`, even when the loan pays off early.

## Relationships

```text
LoanScenario ──computeSchedule──▶ AmortizationSchedule ──┬─ buildBalanceSeries ───────────▶ LineChart
     │ (extraPayments: [])                                ├─ buildYearlyPrincipalInterest ─▶ StackedBarChart
     └──computeSchedule──▶ baseline schedule ─────────────┘
LoanScenario + AmortizationSchedule ── buildPaymentComposition ─────────────────────────▶ SegmentedBar
AmortizationSchedule[] ── buildScenarioBalanceComparison ──────────────────────────────▶ LineChart (multi)
LoanScenario(+rental, growth) + AmortizationSchedule ── projectRental ──┬─ cash flow ──────▶ LineChart (3 series)
          (shares internal rentalLineItems w/ analyzeDeal)                     ├─ equity ─────────▶ StackedBarChart (signed)
                                                                        └─ cash-on-cash ───▶ LineChart (percent)
```

There are no state transitions. Every dataset is recomputed from inputs on each render, inside the
page's `useMemo`.
