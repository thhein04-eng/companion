# Data Model: Sale Profit & Exit Analyzer

Money is cents-rounded (`roundCents`) unless marked "unrounded". Ratios are fractions.

## A. `SaleAssumptions` (stored, `libs/shared/calculations/src/lib/types.ts`)

New optional field on `LoanScenario`: `sale?: SaleAssumptions | null`. Missing = defaults (FR-012).

| Field | Type | Default | Validation (`FieldError.field`) | Used when |
|---|---|---|---|---|
| `exitMonth` | integer | rental: valid stored hold × 12; else 84 | finite integer ≥ 1 (`sale.exitMonth`); > term is clamped, not an error | always |
| `exitUnit` | `'years' \| 'months'` | `'years'` | one of the two (else default) | display only |
| `appreciationPct` | number | 0 | −10 ≤ x ≤ 25 (`sale.appreciationPct`) | no rental |
| `sellingCostsPct` | number | 7 | 0 ≤ x ≤ 15 (`sale.sellingCostsPct`) | no rental |
| `tax` | `SaleTaxAssumptions \| null` | — | — | — |

`SaleTaxAssumptions`:

| Field | Type | Default | Validation |
|---|---|---|---|
| `enabled` | boolean | `false` | — |
| `capitalGainsRatePct` | number | 15 | 0 ≤ x ≤ 40 (`sale.tax.capitalGainsRatePct`) |
| `recaptureRatePct` | number | 25 | 0 ≤ x ≤ 40 (`sale.tax.recaptureRatePct`) |

Shared fields read (rental scenarios), with their existing validation:
`rental.appreciationPct`, `rental.rentGrowthPct`, `rental.expenseGrowthPct` (spec 005),
`rental.exit.sellingCostsPct` and `rental.exit.holdYears` (spec 009, default only),
`rental.wealth.landValuePct` (spec 008), `rental.closingCosts`, `rental.rehabBudget`.

`FieldError['field']` gains `` `sale.${'exitMonth' | 'appreciationPct' | 'sellingCostsPct'}` `` and
`` `sale.tax.${'capitalGainsRatePct' | 'recaptureRatePct'}` ``.

`applyScenarioPatch` merges `sale` one level deep (as it does `rental`); `sale: null` clears it.
`loadPersistedState` needs no change (unknown fields pass through; missing = undefined).

## B. `ResolvedSaleAssumptions` (derived, `resolveSaleAssumptions(scenario)`)

```text
mode: 'rental' | 'non-rental'      // scenario.rental != null
exitMonth: number                  // clamped 1…termMonths
clampedFrom: number | null         // stored value when clamping changed it
exitUnit: 'years' | 'months'
appreciationPct: number            // rental.appreciationPct ?? 0, or sale.appreciationPct ?? 0
sellingCostsPct: number            // resolveExitAssumptions(rental).sellingCostsPct, or sale.sellingCostsPct ?? 7
tax: { enabled, capitalGainsRatePct, recaptureRatePct, landValuePct | null }  // land null when non-rental
```

## C. `SaleAnalysis` (derived, never stored; `deal-analyzer-calculations` types)

```text
SaleAnalysis {
  result: SaleResult | null
  naReason: string | null          // first applicable: no price → invalid sale inputs
  errors: FieldError[]             // validateSale(scenario)
}

SaleResult {
  mode: 'rental' | 'non-rental'
  exitMonth: number
  clampedFrom: number | null
  salePrice: number
  sellingCosts: number
  remainingBalance: number
  netSaleProceeds: number          // salePrice − sellingCosts − remainingBalance
  cumulativeCashFlow: number       // 0 when non-rental
  totalCashInvested: number
  totalNetProfit: number           // net + cumulativeCashFlow − invested
  returnOnCash: RatioResult        // profit / invested, unrounded
  verdict: 'profit' | 'loss' | 'break-even'
  breakEven: {
    salePrice: number              // ≥ 0
    anyPrice: boolean              // raw solution < 0
    cushion: number                // salePrice − breakEven.salePrice
    pctOfPurchase: number          // unrounded
  }
  forcedAppreciationNote: boolean  // rental.wealth.forcedAppreciation > 0
  tax: SaleTaxEstimate | null      // null when disabled
  taxNaReason: string | null       // set when enabled but tax inputs invalid
}

SaleTaxEstimate {
  depreciableBasis: number | null  // null when non-rental
  depreciationTaken: number        // 0 when non-rental
  adjustedBasis: number
  taxableGain: number              // may be negative
  recapturedGain: number
  recaptureTax: number
  capitalGain: number
  capitalGainsTax: number
  totalTax: number
  afterTaxNetProfit: number
  shortTermWarning: boolean        // exitMonth ≤ 12
}
```

### Invariants (unit-tested)

1. `netSaleProceeds + cumulativeCashFlow − totalCashInvested = totalNetProfit` (±$0.01).
2. Profit recomputed at `breakEven.salePrice` (with selling costs at that price) = 0 ± $0.01 when
   `!anyPrice` (SC-004).
3. `mode = 'non-rental'` ⇒ `cumulativeCashFlow = 0` and `tax.depreciationTaken = 0`.
4. Whole-year exit `m = 12k` on a valid rental ⇒ `salePrice`, `sellingCosts`, `remainingBalance`,
   `netSaleProceeds`, `totalNetProfit` equal `projectExit(…, k).result` (forced appreciation 0).
5. `tax.depreciationTaken` at `m = 12k` = Σ `projectWealth` depreciation over years 1…k.
6. `tax.totalTax = recaptureTax + capitalGainsTax`; both 0 when `taxableGain ≤ 0`.

## D. State transitions

None beyond input edits: every edit re-derives `SaleAnalysis` from the active scenario. Toggling
the unit changes only `exitUnit`. Turning tax off keeps the stored rates.
