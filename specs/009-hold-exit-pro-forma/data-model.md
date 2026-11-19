# Data Model: Hold & Exit Pro Forma

**Feature**: `009-hold-exit-pro-forma` · see [research.md](./research.md) for the R-numbers.

## A. Persisted (extends `RentalAssumptions` in `shared-calculations/types.ts`)

```ts
/** Hold & exit assumptions (spec 009). Every field optional; missing = default (FR-015). */
export interface ExitAssumptions {
  /** Integer 1…30. Default 7. */
  holdYears?: number;
  /** % of the sale price, 0 ≤ x ≤ 15. Default 7. */
  sellingCostsPct?: number;
}

export interface RentalAssumptions {
  // …existing, incl. growth (spec 005) and wealth.landValuePct / marginalTaxRatePct (spec 008)…
  exit?: ExitAssumptions | null;
}
```

`FieldError['field']` gains `` `rental.exit.${keyof ExitAssumptions}` ``.

| Field | Default | Rule | Message |
|---|---|---|---|
| `holdYears` | 7 | integer, 1 ≤ x ≤ 30 | "Hold period must be 1 to 30 whole years." |
| `sellingCostsPct` | 7 | finite, 0 ≤ x ≤ 15 | "Selling costs must be between 0% and 15%." |

Growth rates are validated by `validateRental`, and land share and tax rate by `validateWealth`.
An exit error hides the exit figures, and a tax error hides only the after-tax figures.

"Use example rates" writes `EXAMPLE_GROWTH = { rentGrowthPct: 3, expenseGrowthPct: 2.5,
appreciationPct: 3.5 }`.

## B. Derived (`deal-analyzer-calculations`)

```ts
export const DEFAULT_EXIT: Required<ExitAssumptions> = { holdYears: 7, sellingCostsPct: 7 };
export const HOLD_PRESETS = [5, 7, 10] as const;

/** `irr.ts`. Annual IRR of year-end cash flows (t = 0…n), or null when undefined (R4). */
export function irr(cashFlows: number[]): number | null;

export interface ProFormaYear {
  year: number;                 // 1…N
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;          // scheduled P&I + PMI; 0 past the term
  extraPrincipal: number;       // Σ extraPrincipalApplied in the year
  cashToInvestor: number;       // noi − debtService − extraPrincipal
  interest: number;             // = projectWealth
  depreciation: number;         // = projectWealth
  taxableIncome: number | null; // = projectWealth
  taxEffect: number | null;     // = projectWealth
  afterTaxCashFlow: number | null; // cashToInvestor + taxEffect
  loanBalance: number;
  propertyValue: number;
}

export interface ExitReturns {
  totalCashFlow: number;            // Σ cash flows (pre- or after-tax)
  totalNetProfit: number;           // totalCashFlow + netSaleProceeds − invested
  equityMultiple: RatioResult;      // (totalCashFlow + netSaleProceeds) / invested
  irr: RatioResult;                 // fraction, e.g. 0.156607
}

export interface ExitResult {
  holdYears: number;
  years: ProFormaYear[];
  salePrice: number;
  sellingCosts: number;
  loanPayoff: number;
  netSaleProceeds: number;
  totalCashInvested: number;
  forcedAppreciation: number;       // > 0 shows the "includes forced appreciation" note
  preTax: ExitReturns;
  afterTax: ExitReturns | null;     // null when the tax inputs are invalid
  taxNaReason: string | null;
}

export interface ExitProjection {
  /** Null with naReason when no price, or exit/horizon inputs invalid. */
  result: ExitResult | null;
  naReason: string | null;
  errors: FieldError[];
}
```

**Invariants** (tested):
- For every hold, `ProFormaYear` equals `projectWealth`'s row for the same year in value, balance,
  NOI, interest, depreciation and tax effect.
- `|NPV(irr)| < 0.01`.
- `totalNetProfit = equityMultiple × invested − invested`, to the cent.
