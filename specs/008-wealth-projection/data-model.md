# Data Model: Wealth Projection

**Feature**: `008-wealth-projection` · see [research.md](./research.md) for the R-numbers.

Money is in dollars, cents-rounded. "Derived" means computed on every render and never stored.

## A. Persisted (extends `RentalAssumptions` in `shared-calculations/types.ts`)

```ts
/** Wealth-projection assumptions (spec 008). Every field optional; missing = default (FR-015). */
export interface WealthAssumptions {
  /** Integer 1…30. Default 10. */
  horizonYears?: number;
  /** One-time value uplift at purchase, $ ≥ 0. Default 0. */
  forcedAppreciation?: number;
  /** Land share of the price, 0 ≤ x < 100. Default 20. */
  landValuePct?: number;
  /** 0 ≤ x ≤ 60. Default 24. */
  marginalTaxRatePct?: number;
}

export interface RentalAssumptions {
  // …existing fields, including appreciationPct / rentGrowthPct / expenseGrowthPct (spec 005)…
  wealth?: WealthAssumptions | null;
}
```

`FieldError['field']` gains `` `rental.wealth.${keyof WealthAssumptions}` ``.

### Defaults and validation (`resolveWealthAssumptions`, `validateWealth`)

| Field | Default | Rule | Message | Blocks |
|---|---|---|---|---|
| `horizonYears` | 10 | integer, 1 ≤ x ≤ 30 | "Horizon must be 1 to 30 whole years." | whole projection |
| `forcedAppreciation` | 0 | finite, ≥ 0 | "Forced appreciation cannot be negative." | whole projection |
| `landValuePct` | 20 | finite, 0 ≤ x < 100 | "Land value must be at least 0% and less than 100%." | tax figures only |
| `marginalTaxRatePct` | 24 | finite, 0 ≤ x ≤ 60 | "Tax rate must be between 0% and 60%." | tax figures only |

The three growth rates stay validated by `validateRental` (−10 to 25). "Use typical rates" writes
`{ appreciationPct: 3, rentGrowthPct: 2.5, expenseGrowthPct: 2.5 }`.

## B. Derived (`deal-analyzer-calculations/project-wealth.ts`)

```ts
export const DEPRECIATION_YEARS = 27.5;
export const DEFAULT_WEALTH: Required<WealthAssumptions> =
  { horizonYears: 10, forcedAppreciation: 0, landValuePct: 20, marginalTaxRatePct: 24 };
export const TYPICAL_GROWTH = { appreciationPct: 3, rentGrowthPct: 2.5, expenseGrowthPct: 2.5 } as const;

export interface WealthYear {
  year: number;                 // 0…N (0 = purchase)
  propertyValue: number;        // (price + forced) × (1 + a)^year
  loanBalance: number;          // 0 after payoff
  equity: number;               // value − balance
  initialEquity: number;        // price − loan
  forcedAppreciation: number;   // forced
  marketAppreciation: number;   // value − price − forced
  principalPaid: number;        // loan − balance
  noi: number;                  // 0 in year 0
  cashFlow: number;             // 0 in year 0; spec 005 definition
  cumulativeCashFlow: number;
  interest: number;             // scheduled interest in the year
  depreciation: number;         // basis / 27.5, capped by remaining basis
  taxableIncome: number | null; // noi − interest − depreciation; null when tax inputs invalid
  taxEffect: number | null;     // −taxable × rate (positive = saving)
  cumulativeTaxEffect: number | null;
  netWorth: number;             // equity + cumulativeCashFlow
  netWorthAfterTax: number | null;
}

export interface WealthProjection {
  /** Year 0…N, or null with naReason (no price, or an invalid horizon/forced input). */
  years: WealthYear[] | null;
  naReason: string | null;
  horizonYears: number;
  depreciableBasis: number | null;
  totalCashInvested: number;
  /** netWorth(N) / totalCashInvested, or null with reason. */
  multiple: RatioResult;
  /** Set when the tax inputs are invalid; the tax fields are null. */
  taxNaReason: string | null;
  errors: FieldError[];
}
```

**Invariants** (tested for every year): the equity parts sum to equity, `netWorth − equity =
cumulativeCashFlow`, and the depreciation total is at most the basis. Years 1 to the loan term
match `projectRental` for `noi`, `cashFlow` and `loanBalance`.

**Relationships**: `WealthProjection` is derived from
`(LoanScenario, computeSchedule(scenario))` and needs a valid scenario and a valid `rental`
(the same preconditions as `analyzeDeal`).
