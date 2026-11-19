# Contract: Hold & Exit Pro Forma UI

## Route and navigation

| Route | `<title>` | `<h1>` | Nav entry |
|---|---|---|---|
| `/pro-forma` | `Hold & Exit Pro Forma · Companion` | "Hold & Exit Pro Forma" | "Hold & Exit" (`nav-pro-forma`, `KeyIcon`), fifth in menu order |

`apps/amortization-calculator/src/app/pro-forma/page.tsx` only renders `<ProFormaView />` from
`deal-analyzer-ui` (Principle II). The spec 003 routes table gains this row.

## `ProFormaView` layout

```text
Hold & Exit Pro Forma (h1) + description + "Simplified model, not tax advice."
Deal Strip (spec 010: scenario tabs, chips, Edit deal sheet with the shared inputs)
Assumptions (h2)          ExitAssumptionsPanel                 (when rental exists)
Exit (h2)                 ExitSummary, or <p data-testid="pro-forma-na">   (first applicable reason)
Compare hold periods (h2) HoldComparisonTable
Pro forma (h2)            ProFormaTable
```

The `pro-forma-na` reasons, in this order:
1. "Add rent to model a sale." (no rental)
2. "Fix the rental inputs to see the exit."
3. "Fix the loan inputs to see the exit."
4. `projection.naReason`

## `ExitAssumptionsPanel` — `data-testid="exit-assumptions"`

None of these `NumberField`s use `min`/`max`, because the SDK clamps on commit and would hide the
inline errors.

- **Hold**:
  - `SegmentedOptions` `label="Hold period"` with items "5 yrs" / "7 yrs" / "10 yrs" (`data-testid="hold-presets"`). Nothing is checked when the hold is custom.
  - `NumberField` "Hold (years)", with step 1.
- **Sale**:
  - `NumberField` "Selling costs" (%), with step 0.5 and the description "Commissions, transfer taxes and closing".
- **Growth**:
  - `NumberField`s "Rent growth", "Expense growth" and "Appreciation" (%, "per year"). They write the shared fields.
  - `Button` "Use example rates (3% / 2.5% / 3.5%)" (`data-testid="pro-forma-example-rates"`).
- **Tax**:
  - `NumberField`s "Land value share" and "Marginal tax rate". They write `rental.wealth`, shared with `/wealth`.

## `ExitSummary` — `data-testid="exit-summary"`

- **Heading**: "Sale at end of year {N}".
- **Sale tiles**:
  - `exit-sale-price`
  - `exit-selling-costs` (shown as negative)
  - `exit-loan-payoff` (shown as negative)
  - `exit-net-proceeds`
- **Pre-tax returns**:
  - `exit-irr` ("15.66%", or "N/A" with a caption)
  - `exit-profit`
  - `exit-multiple` ("2.51×")
- **After-tax returns**:
  - `exit-irr-after-tax`, `exit-profit-after-tax` and `exit-multiple-after-tax`
  - shown as "—" when `taxNaReason`
  - captioned "After-tax cash flow; excludes tax on sale"
- **Forced appreciation note**: when it is greater than 0, show "Sale price includes {$F} forced appreciation set on Wealth Projection." (`exit-forced-note`)

## `HoldComparisonTable` — `data-testid="hold-comparison"`

- A `<table>` with a `<caption>`. Columns are hold periods ("5 yrs", "7 yrs", "10 yrs" [, "N yrs"]). The chosen hold's header has `aria-current="true"` and is highlighted.
- Rows, with keys:
  - IRR (`irr`)
  - IRR after tax (`irr-after-tax`)
  - Total net profit (`profit`)
  - Equity multiple (`multiple`)
  - Net sale proceeds (`net-proceeds`)
- Each cell has `data-testid="hold-{years}-{row}"`.
- The table sits in a horizontally scrollable region.

## `ProFormaTable` — `data-testid="pro-forma-table"`

- One row per year 1…N (`pro-forma-row-{year}`), with these columns and cell keys:
  - Gross income (`gross-income`)
  - Operating expenses (`opex`)
  - NOI (`noi`)
  - Debt service (`debt-service`)
  - Extra principal (`extra-principal`)
  - Cash to investor (`cash-to-investor`)
  - Interest (`interest`)
  - Depreciation (`depreciation`)
  - Taxable income (`taxable`)
  - Tax effect (`tax-effect`)
  - After-tax cash flow (`after-tax-cf`)
  - Loan balance (`balance`)
  - Property value (`value`)
- A final `pro-forma-sale` row: Sale price (`sale-price`), Selling costs (`selling-costs`), Loan payoff (`payoff`) and Net proceeds (`net-proceeds`).
- Negatives are red with a minus sign, and null values show "—".
- The note under the table reads: "Cash to investor includes extra principal payments as an outflow."
- The table has a `<caption>`, scoped headers, and its own scroll region (`role="region"`, `tabIndex=0`).
