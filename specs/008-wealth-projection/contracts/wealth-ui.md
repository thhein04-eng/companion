# Contract: Wealth Projection UI

## Route and navigation

| Route | `<title>` | `<h1>` | Nav entry |
|---|---|---|---|
| `/wealth` | `Wealth Projection · Companion` | "Wealth Projection" | "Wealth Projection" (`nav-wealth`, `TrendingUpIcon`), fourth in menu order |

`apps/amortization-calculator/src/app/wealth/page.tsx` only renders `<WealthView />` from
`deal-analyzer-ui` (Principle II). The spec 003 routes table gains this row.

## `WealthView` layout

```text
Wealth Projection (h1) + one-line description + "Simplified model, not tax advice."
ScenarioTabs
Loan (h2)                      LoanInputForm
Real-estate costs (h2)         CostBreakdownPanel
Rental income (h2)             RentalInputsPanel
Projection assumptions (h2)    WealthAssumptionsPanel          (when rental exists)
Net worth over time (h2)       WealthSummary + NetWorthChart   (when the projection exists, otherwise naReason)
Year by year (h2)              WealthTable
```

## `WealthAssumptionsPanel` — `data-testid="wealth-assumptions"`

- **Horizon**: `SegmentedOptions` with `aria-label="Projection horizon"` and items "5 yrs" and "10
  yrs" (values `5`, `10`; nothing is checked when the value is custom), plus a `NumberField`
  "Horizon (years)" with step 1.
- **Growth**: `NumberField`s "Appreciation", "Rent growth" and "Expense growth", each with "%" and
  "per year". On `/wealth`, `RentalInputsPanel` is rendered with `hideGrowth` so these labels appear
  only once. These write the existing `rental.appreciationPct`, `rentGrowthPct` and
  `expenseGrowthPct`. Next to them is a `Button` "Use typical rates" (`data-testid="wealth-typical-rates"`).
- **Equity**: `NumberField` "Forced appreciation" (currency).
- **Tax**: `NumberField`s "Land value share" (%) and "Marginal tax rate" (%).
- No field passes `min`/`max`, because the SDK clamps on commit and would hide the errors (the same
  rule as specs 005 and 006). Each field shows its inline error by `rental.wealth.*` or `rental.*`
  key.

## `WealthSummary` — `data-testid="wealth-summary"`

Five tiles for the horizon year:
- Net worth (`wealth-net-worth`)
- Equity (`wealth-equity`)
- Cumulative cash flow (`wealth-cum-cash-flow`)
- Cumulative tax effect (`wealth-cum-tax`; "—" when `taxNaReason`)
- Multiple on cash invested (`wealth-multiple`, e.g. "3.6×", or N/A)

The heading reads "In year {N}".

## `NetWorthChart` — `data-testid="chart-net-worth"`

- **Chart**: `LineChart` titled "Net worth over time", with description "Equity + cumulative cash
  flow". `x` = year 0…N, with ticks at every year when N ≤ 10 and every 5 years otherwise.
- **Series**:
  - `netWorth` "Net worth" (slot 1)
  - `equity` "Equity" (slot 3)
  - `netWorthAfterTax` "Net worth after tax" (slot 2, omitted when `taxNaReason`)
- **Formatters**: `x` → "Yr N" (`Purchase` for 0), `y` → `formatCompactCurrency`, and the tooltip
  shows full currency.
- **`tooltipExtras`**: "Property value", "Loan balance", "Cumulative cash flow" and "Cumulative tax
  effect".

## `WealthTable` — `data-testid="wealth-table"`

- A `<table>` with a `<caption>` and `scope` headers, one row per year 0…N
  (`data-testid="wealth-row-{year}"`). The columns are those listed in FR-012. The equity-split
  columns sit right after "Equity", with cell keys `initial-equity`, `principal-paid`,
  `market-appreciation` and `forced-appreciation`.
- When the scenario has extra payments, a note reads "Cash flow excludes extra principal payments;
  they show up as faster principal paydown in equity." (`data-testid="wealth-extra-note"`).
- Negative values are red with a minus sign. A positive tax effect is labelled as a saving in the
  header note.
- It is wrapped in a horizontally scrollable region, so the page itself never scrolls sideways at
  375 px.
