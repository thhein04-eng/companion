# Contract: Sale Profit & Exit Analyzer UI

## Route and navigation

| Route | `<title>` | `<h1>` | Nav entry |
|---|---|---|---|
| `/sale` | `Sale Profit & Exit Analyzer · Companion` | "Sale Profit & Exit Analyzer" | "Sale Profit" (`nav-sale`, `TagIcon`), sixth, after "Hold & Exit" |

`apps/amortization-calculator/src/app/sale/page.tsx` only renders `<SaleView />` from
`deal-analyzer-ui` (Principle II), with `metadata` like `pro-forma/page.tsx`. The spec 003 routes
table gains this row.

## Deal Strip profile — `SALE_PROFILE` (`shared-ui/deal/page-profiles.ts`)

```ts
{ pageId: 'sale', pinned: ['homePrice', 'downPayment', 'annualInterestRatePct'], muted: [],
  requires: [{ field: 'homePrice', unlocks: 'sale price' }] }
```

`PageProfile['pageId']` gains `'sale'`. Rent is not required (non-rental works). Headline:
`{ label: 'Net profit', value: result?.totalNetProfit, format: currency, betterWhen: 'higher' }`.

## `SaleView` layout

```text
Deal Strip
PageHeader  eyebrow "Analysis" · title · lede "Should you sell now? Profit, break-even price and
            an optional tax estimate." · note "Simplified model, not tax advice."
Assumptions (h2)   SaleAssumptionsPanel
Result (h2)        SaleSummary, or <InputsMessage data-testid="sale-na">
Break-even (h2)    BreakEvenCard                       (when result)
Tax estimate (h2)  SaleTaxPanel                        (when tax enabled and result)
Footer link        "See IRR and year-by-year returns on Hold & Exit →" (/pro-forma)
```

`sale-na` reasons, first that applies:
1. "Fix the loan inputs to see the result."
2. "Fix the rental inputs to see the result." (rental scenarios only)
3. `analysis.naReason`

## `SaleAssumptionsPanel` — `data-testid="sale-assumptions"`

No `NumberField` uses `min`/`max` (the SDK would clamp on commit and hide inline errors, spec 009).

- **Exit timing**: `SegmentedOptions` `label="Exit unit"` with "Years" / "Months"
  (`data-testid="sale-exit-unit"`); `NumberField` "Sell after" (`sale-exit`), suffix "years" (step
  1, accepts decimals) or "months" (step 1). Clamp note `data-testid="sale-exit-clamped"`.
- **Sale**: `NumberField` "Appreciation" (%/yr) and "Selling costs" (%, step 0.5, description
  "Agent commissions, closing/transfer costs and make-ready prep").
- **Growth** (rental only): `NumberField` "Rent growth", "Expense growth" (%/yr), shared fields.
- **Tax**: `SegmentedOptions` `label="Estimate taxes on sale"` with "Off" / "On" (`sale-tax-toggle`, Off by default; the existing SDK-backed control, so no new primitive). When on:
  "Capital gains rate", "Depreciation recapture rate" (rental only), "Land value share" (rental
  only), with the label "Illustrative planning estimate — not tax advice."

## `SaleSummary` — `data-testid="sale-summary"`

- Heading "Sale after {N} years" or "Sale after {N} months" (or "{y} yr {m} mo") following the unit.
- Verdict badge `sale-verdict`: "Profit" / "Loss" / "Break-even" (uses `MetricBadge` tones; the
  word is always present, colour is never the only signal).
- Waterfall rows (a `<dl>` or table with a caption), each with a testid:
  `sale-price`, `sale-selling-costs` (negative), `sale-balance` (negative), `sale-net-proceeds`,
  `sale-cash-flow` (caption "No rental: cash flow not included" when non-rental),
  `sale-invested` (negative), `sale-profit`, `sale-return` ("151.42%", or "N/A" + reason).
- Notes: "Excludes holding costs" (non-rental); forced-appreciation note when applicable.

## `BreakEvenCard` — `data-testid="sale-break-even"`

`sale-break-even-price`, `sale-cushion` (signed, "above"/"below break-even" wording),
`sale-break-even-pct` (of purchase price). When `anyPrice`: "$0 — Profitable at any sale price".

## `SaleTaxPanel` — `data-testid="sale-tax"`

Rows: depreciation taken (rental), adjusted basis, taxable gain, recapture tax (rental), capital
gains tax, total tax, `sale-after-tax-profit`. Short-hold note `sale-tax-short-term`. When
`taxNaReason`: the rows show "—" and the reason; the pre-tax sections are unaffected.

## Accessibility

Inputs keep SDK keyboard/ARIA behaviour; the tax toggle is the SDK-backed `SegmentedOptions` radio group; the waterfall has a caption
and scoped headers; the verdict is text. Covered by the existing axe pass (`a11y.spec.ts` gains
`/sale`).

## E2E — `apps/amortization-calculator-e2e/src/sale.spec.ts`

1. Nav entry → `/sale`, title and h1.
2. Reference scenario, 7 years: the US1 figures, verdict "Profit"; matches `/pro-forma` profit.
3. Months toggle, 90 → US1 90-month figures; back to Years shows 7.5.
4. Break-even and cushion; 12 months → "Loss", negative cushion.
5. A new scenario (`rental: null` by default) with price and down payment → cash flow $0 with caption; non-rental figures.
6. Tax toggle on → US3 figures and label; invalid rate → only tax rows show "—".
7. 375 px: no horizontal scroll.
