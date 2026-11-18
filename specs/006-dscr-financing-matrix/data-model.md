# Data Model: DSCR & Financing Matrix

**Feature**: `006-dscr-financing-matrix` · see [research.md](./research.md) for the rationale (R-numbers).

Conventions are the same as specs 002 and 005. Money is in dollars and cents-rounded at output.
Ratios are unrounded fractions. "Derived" means computed on every render and never stored.

## A. Persisted (extends `RentalAssumptions` in `shared-calculations/types.ts`)

All new fields are **optional**. A missing field means "use the default", so sessions saved
before this feature load unchanged (FR-013, R12).

```ts
export type FinancingOptionId = 'conventional' | 'arm' | 'dscr';

/** Terms shared by every structure. */
export interface LoanTerms {
  downPaymentPct: number;   // 0 ≤ x < 100, % of purchase price
  annualRatePct: number;    // 0 ≤ x ≤ 25 (initial rate for the ARM)
  termYears: number;        // integer 1…40
}

export interface ArmTerms extends LoanTerms {
  fixedPeriodYears: 3 | 5 | 7 | 10;  // must be < termYears
  adjustedRatePct: number;           // 0 ≤ x ≤ 25, applies for the rest of the term
}

/** Investor-owned terms; present only after the first matrix edit (R7). */
export interface FinancingTerms {
  conventional: LoanTerms;
  arm: ArmTerms;
  dscr: LoanTerms;
}

export interface RentalAssumptions {
  // …existing fields unchanged…
  /** Minimum DSCR to test against. Optional; missing = 1.25. 1.00 ≤ x ≤ 2.00 (FR-002). */
  dscrMinimum?: number;
  /** Stored matrix terms. Optional; missing = derive from the scenario (FR-009, FR-012). */
  financing?: FinancingTerms | null;
  /** Structure in focus in the matrix toggle. Optional; missing = 'conventional' (FR-010). */
  financingSelection?: FinancingOptionId;
}
```

`FieldError['field']` gains `` `rental.dscrMinimum` `` and
`` `rental.financing.${FinancingOptionId}.${string}` ``.

### Validation (`validateFinancing`, R11)

| Field | Rule | Message |
|---|---|---|
| `dscrMinimum` | finite, 1.00 ≤ x ≤ 2.00 | "Minimum DSCR must be between 1.00 and 2.00." |
| `*.downPaymentPct` | finite, 0 ≤ x < 100 | "Down payment must be at least 0% and less than 100%." |
| `*.annualRatePct`, `arm.adjustedRatePct` | finite, 0 ≤ x ≤ 25 | "Rate must be between 0% and 25%." |
| `*.termYears` | integer, 1 ≤ x ≤ 40 | "Term must be 1 to 40 whole years." |
| `arm.fixedPeriodYears` | ∈ {3,5,7,10} and < `arm.termYears` | "Fixed period must be shorter than the term." |

Errors never block `validateRental` or `analyzeDeal`. An option with an error shows "—". An invalid
minimum shows the ratio without a pass/fail status.

### Defaults (`defaultFinancingTerms(scenario)`, FR-009)

Let `price = scenario.homePrice` (required, > 0), `r = scenario.annualInterestRatePct`,
`down = max(0, (1 − principal / price) × 100)`.

| Option | downPaymentPct | annualRatePct | termYears | extra |
|---|---|---|---|---|
| conventional | `down` | `r` | 30 | — |
| arm | `down` | `max(0, r − 0.5)` | 30 | `fixedPeriodYears: 7`, `adjustedRatePct: r + 1.5` |
| dscr | 25 | `r + 1.0` | 30 | — |

`resolveFinancingTerms(scenario) = scenario.rental.financing ?? defaultFinancingTerms(scenario)`.

### State transitions

```text
          edit any term                      Reset to defaults
derived ───────────────► stored (detached) ───────────────────► derived
(financing absent:        (financing = full                     (financing = null;
 follows loan inputs)      FinancingTerms)                       dscrMinimum and
                                                                 selection kept)
```

## B. Derived: DSCR (`deal-analyzer-calculations/dscr.ts`)

```ts
export const DEFAULT_DSCR_MINIMUM = 1.25;
export const DSCR_PRESETS = [1.15, 1.2, 1.25] as const;

export interface DscrResult {
  /** annualNoi / annualDebtService, unrounded. Null only when annualDebtService is 0. */
  value: number | null;
  naReason: string | null;
  /** The minimum tested against, or null when the stored minimum is invalid. */
  minimum: number | null;
  /** value ≥ minimum (unrounded), or null when either is null. */
  meetsMinimum: boolean | null;
  /** value ≥ 1. */
  coversDebtService: boolean | null;
  annualDebtService: number;          // monthly P&I × 12, cents
  /** Monthly gross rent for value = minimum (R3), cents, ≥ 0; null with reason when p ≥ 1. */
  rentForMinimum: number | null;
  rentForMinimumNaReason: string | null;
}
```

`DealAnalysis` gains `dscr: DscrResult`, computed from the scenario's own `monthlyPrincipalAndInterest`.
`DealComparisonRow` gains `dscr: number | null`.

## C. Derived: Financing matrix (`deal-analyzer-calculations/financing-matrix.ts`)

```ts
/** One payment phase of a structure (the ARM has two, the others have one). */
export interface FinancingPhase {
  label: string;               // "Years 1–30", "Initial (years 1–7)", "After reset (years 8–30)"
  fromYear: number;
  toYear: number;
  annualRatePct: number;
  monthlyPrincipalAndInterest: number;
  monthlyPmi: number;          // 0 for dscr and when LTV ≤ 80% or the scenario has no PMI rate
  monthlyCashFlow: number;     // noi.monthly − P&I − PMI
  cashOnCashReturn: RatioResult; // annual cash flow ÷ cash invested
  dscr: DscrResult;
}

export interface FinancingOptionResult {
  id: FinancingOptionId;
  name: 'Conventional' | 'ARM' | 'DSCR loan';
  /** e.g. "30-yr fixed", "7/1 ARM", "30-yr DSCR". */
  description: string;
  terms: LoanTerms | ArmTerms;
  loanAmount: number;
  downPayment: number;
  ltv: number;
  totalCashInvested: number;   // down payment + closing costs + rehab
  /** Null when the option's terms are invalid (the column shows "—"). */
  phases: FinancingPhase[] | null;
  errors: FieldError[];
}

export interface FinancingMatrix {
  /** Null with reason when there is no purchase price (FR-014). */
  options: FinancingOptionResult[] | null;
  naReason: string | null;
  selected: FinancingOptionId;
  /** True when the terms are stored (detached) rather than derived. */
  isCustomized: boolean;
  dscrMinimum: number | null;
}
```

Relationships: `FinancingMatrix` is built from `(LoanScenario, DealAnalysis)` and always has the
options in the order conventional, arm, dscr. Each option reads NOI, closing costs and rehab from
the same `DealAnalysis`, so the columns differ only by debt structure.
