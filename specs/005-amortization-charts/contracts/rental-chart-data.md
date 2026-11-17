# Contract: rental growth inputs and rental projection

**Project**: `libs/amortization-calculations`. Files:

- `src/lib/types.ts`: extend `RentalAssumptions`.
- `src/lib/validate-rental.ts`: add the growth-field checks.
- `src/lib/analyze-deal.ts`: extract the shared line-item helper and update the defaults.
- `src/lib/project-rental.ts`: new file. Re-export it from `src/index.ts`.

Everything here is pure and has no React dependency. Definitions are in
[data-model.md §C](../data-model.md) and research R11–R14.

## Type changes

```ts
export interface RentalAssumptions {
  // …existing 8 fields unchanged…
  /** Annual growth of gross rent + other income, %. Optional; missing = 0. −10 ≤ x ≤ 25. */
  rentGrowthPct?: number;
  /** Annual growth of property tax, insurance, HOA, %. Optional; missing = 0. −10 ≤ x ≤ 25. */
  expenseGrowthPct?: number;
  /** Annual property appreciation, %. Optional; missing = 0. −10 ≤ x ≤ 25. */
  appreciationPct?: number;
}

export interface RentalYear {
  year: number; x: string;
  grossIncome: number; operatingExpenses: number; noi: number;
  debtService: number; cashFlow: number; cashOnCash: number | null;
  homeValue: number | null; loanBalance: number;
  initialEquity: number | null; principalPaid: number; appreciation: number | null;
}

export interface RentalProjection {
  years: RentalYear[];
  totalCashInvested: number;
  cashOnCashNaReason: string | null; // = analyzeDeal().cashOnCashReturn.naReason
  equityNaReason: string | null;     // 'Enter a purchase price to see equity build-up.' when homePrice is null/≤0
}
```

## Functions

```ts
export function growthRates(rental: RentalAssumptions): { rent: number; expense: number; appreciation: number }; // fractions
export function projectRental(scenario: LoanScenario, schedule: AmortizationSchedule): RentalProjection;
```

- `projectRental` has the same preconditions as `analyzeDeal`. It returns
  `ceil(scenario.termMonths / 12)` years.
- `analyzeDeal`'s **public behavior is unchanged**. It is only refactored to use the internal
  `rentalLineItems(scenario, gsiMonthly, expenseFactor)` helper, which `projectRental` also uses.
  The helper lives in `src/lib/rental-line-items.ts` and is **not** re-exported from `src/index.ts`.
- `DEFAULT_RENTAL_ASSUMPTIONS` gains `rentGrowthPct: 0, expenseGrowthPct: 0, appreciationPct: 0`.
- `validateRental` adds: for each growth field that is present (not `undefined`), if it is not
  finite or outside `[−10, 25]`, it pushes
  `{ field: 'rental.<field>', message: '<Label> must be between -10% and 25%.' }`. The labels are
  `Rent growth`, `Expense growth` and `Appreciation`.

## Required unit tests

Reference scenario **D1** is R3's loan (from amortization-chart-data.md) with this rental: rent
$2,800/mo, other income $0, and `DEFAULT_RENTAL_ASSUMPTIONS` with closing costs $6,000.

| File | Assertion |
|---|---|
| `analyze-deal.spec.ts` | It passes **unchanged** after the refactor (regression guard). |
| `validate-rental.spec.ts` | `rentGrowthPct: 25` and `-10` are valid. `25.01`, `-10.01` and `NaN` each give one error keyed `rental.rentGrowthPct`. The same checks apply to the other two fields. When a field is `undefined`, there is no error. |
| `persistence.spec.ts` | A serialized state whose `rental` lacks all three growth fields round-trips, and then `projectRental` treats them as 0. |
| `project-rental.spec.ts` | **D1 at 0% growth**: 30 years. Year 1's `noi`, `debtService`, `cashFlow` and `cashOnCash` `===` the matching `analyzeDeal` values. `noi` is the same in every year. `appreciation === 0` every year. |
| | **D1 with rent 3%**: year 2 `grossIncome === roundCents(year1.grossIncome × 1.03)` within 0.01. Vacancy and the other percent lines scale by the same factor. |
| | **D1 with expense 2%**: year 2's fixed expenses (tax, insurance, HOA) are ×1.02, and the percent lines are unchanged. |
| | **D1 with appreciation 3%**: year 1 `homeValue === roundCents(330000 × 1.03)`. For every year, `initialEquity + principalPaid + appreciation` equals `homeValue − loanBalance` within 0.01. |
| | **D1 with the R2 recurring $200 extra**: after the payoff year, `debtService === 0`, `loanBalance === 0`, and `cashFlow === noi`. `years.length` is still 30. |
| | **PMI drop**: in the year after the PMI-drop year, `debtService` decreases by `monthlyPmiAmount × 12` compared with a year that has full PMI. |
| | **No home price**: `equityNaReason` is set, and `homeValue`, `initialEquity` and `appreciation` are `null`. |
| | **No cash invested** (`downPayment` null, closing and rehab both 0): `cashOnCash === null`, and `cashOnCashNaReason` equals `analyzeDeal`'s reason. |
| | **Negative appreciation (−5%)**: `appreciation < 0` and the invariant still holds. |
