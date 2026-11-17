# Data Model: Rental Property Deal Analyzer

This model extends [001's data model](../001-real-estate-amortization-calculator/data-model.md). All types live in `libs/amortization-calculations/src/lib/types.ts`.

## RentalAssumptions (new, stored on `LoanScenario.rental`)

| Field                   | Type     | Validation               | Default when rent is first entered |
| ----------------------- | -------- | ------------------------ | ---------------------------------- |
| `grossMonthlyRent`      | `number` | ≥ 0                      | required (user input)              |
| `otherMonthlyIncome`    | `number` | ≥ 0                      | `0`                                |
| `vacancyPct`            | `number` | 0 ≤ x ≤ 100              | `5`                                |
| `managementPct`         | `number` | 0 ≤ x ≤ 100              | `8`                                |
| `maintenanceReservePct` | `number` | 0 ≤ x ≤ 100              | `5`                                |
| `capexReservePct`       | `number` | 0 ≤ x ≤ 100              | `5`                                |
| `closingCosts`          | `number` | ≥ 0                      | `0`                                |
| `rehabBudget`           | `number` | ≥ 0                      | `0`                                |

**Reused from `LoanScenario`** (not duplicated, per FR-003): `homePrice` (purchase price), `downPayment`, `principal`, `annualPropertyTax`, `annualInsurance`, `monthlyHoa`.

## LoanScenario (extended)

```ts
interface LoanScenario {
  // …all 001 fields unchanged…
  rental?: RentalAssumptions | null; // null/absent = not analyzing as a rental
}
```

**State transitions**:

| From                 | Event                                    | To                                                        |
| -------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `rental == null`     | user enters a rent value                 | `rental = { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent }` |
| `rental != null`     | user edits any rental field              | field merged; other fields unchanged                      |
| `rental != null`     | user activates "Remove rental analysis" (no confirmation step) | `rental = null`                         |
| any (from storage)   | `deserializeScenarios` on a 001-era scenario | `rental = null`                                       |

## AmortizationSchedule.summary (extended, additive)

| Field              | Type     | Notes                                                                      |
| ------------------ | -------- | -------------------------------------------------------------------------- |
| `monthlyPmiAmount` | `number` | Existing internal value, now exposed. Rounded to cents; `0` if no PMI.     |

## DealAnalysis (new, always derived, never stored)

| Field                       | Type                              | Formula                                                     |
| --------------------------- | --------------------------------- | ----------------------------------------------------------- |
| `grossScheduledIncome`      | `MonthlyAnnual`                   | rent + other income                                         |
| `operatingExpenses`         | `OperatingExpenseLine[]`          | one line per category (see below)                           |
| `totalOperatingExpenses`    | `MonthlyAnnual`                   | Σ lines                                                     |
| `netOperatingIncome`        | `MonthlyAnnual`                   | GSI − total opex                                            |
| `debtService`               | `MonthlyAnnual`                   | P&I × min(12, periods) + year-1 PMI (research R2)           |
| `cashFlow`                  | `MonthlyAnnual`                   | NOI − debt service                                          |
| `totalCashInvested`         | `number`                          | down payment $ + closing costs + rehab                      |
| `cashOnCashReturn`          | `RatioResult`                     | annual cash flow ÷ total cash invested                      |
| `capRate`                   | `RatioResult`                     | annual NOI ÷ homePrice                                      |
| `onePercentRule`            | `OnePercentRuleResult \| null`    | null without homePrice                                      |
| `fiftyPercentRule`          | `FiftyPercentRuleResult \| null`  | null when GSI = 0                                           |
| `pmiEndsInYearOne`          | `boolean`                         | PMI applies in some but not all of periods 1–12             |
| `pmiDropPeriod`             | `number \| null`                  | passthrough from schedule summary                           |

Supporting types:

```ts
type MonthlyAnnual = { monthly: number; annual: number };        // cents-rounded
type OperatingExpenseCategory =
  | 'propertyTax' | 'insurance' | 'hoa' | 'vacancy'
  | 'management' | 'maintenance' | 'capex';
type OperatingExpenseLine = { category: OperatingExpenseCategory; label: string } & MonthlyAnnual;
type RatioResult = { value: number | null; naReason: string | null }; // unrounded fraction
type OnePercentRuleResult = { pass: boolean; targetRent: number; actualRent: number };
type FiftyPercentRuleResult = {
  opexRatio: number; withinRule: boolean; estimatedMonthlyCashFlow: number;
};
```

**Invariants** (unit-tested):

- `netOperatingIncome.annual === roundCents(grossScheduledIncome.annual − totalOperatingExpenses.annual)`
- `cashFlow.annual === roundCents(netOperatingIncome.annual − debtService.annual)`
- `totalOperatingExpenses` contains no debt component, and `debtService` contains no tax, insurance, or HOA. Each cost appears exactly once.
- **Rounding rule**: Compute each line unrounded first, then `monthly = roundCents(raw)` and `annual = roundCents(raw × 12)`. Totals, NOI, and cash flow are computed from the unrounded values and rounded the same way; never sum rounded lines. For `debtService` and `cashFlow`, `annual` is the exact year-1 sum and `monthly = roundCents(annual / 12)`.

## LtvResult (new, derived)

`computeLtv(scenario): RatioResult`, which is `principal ÷ homePrice`. Returns `null` with an `naReason` when there is no `homePrice`.

## FieldError (extended)

`field` union adds `` `rental.${keyof RentalAssumptions}` ``.

## ScenarioComparison.rows (extended)

Each row adds `monthlyCashFlow: number | null`, `annualNoi: number | null`, `capRate: number | null`, and `cashOnCashReturn: number | null`. All four are `null` when the scenario has no rental assumptions.
