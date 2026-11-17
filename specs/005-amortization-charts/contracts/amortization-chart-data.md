# Contract: amortization chart dataset builders

**Project**: `libs/amortization-calculations` · file `src/lib/chart-data.ts` · re-exported from
`src/index.ts`.

These are pure functions. They do no I/O, use no `Date.now()`, and import neither React nor
`@companion/charts`. The return types are structurally compatible with `@companion/charts`'s
`Datum` (see [data-model.md §B](../data-model.md)).

```ts
export function buildBalanceSeries(
  schedule: AmortizationSchedule,
  baseline: AmortizationSchedule | null,
): BalanceSeriesDatum[];

export function buildYearlyPrincipalInterest(
  schedule: AmortizationSchedule,
  options?: { groupBy?: 'loanYear' | 'calendarYear' },
): YearlyPrincipalInterestDatum[];

export function buildPaymentComposition(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): { components: PaymentComponent[]; total: number };

export function buildScenarioBalanceComparison(
  schedules: AmortizationSchedule[],
): ScenarioBalanceDatum[];

/** Convenience: the no-extra-payments schedule for the balance chart's baseline. Returns `null` when
 *  `scenario.extraPayments` is empty, so callers don't compute a duplicate schedule. */
export function computeBaselineSchedule(scenario: LoanScenario): AmortizationSchedule | null;
```

## Required unit tests (`chart-data.spec.ts`, Constitution I: cent-level)

Reference scenario **R1**: $300,000, 6.5%, 360 months, start 2027-01-01, no costs or extras.

Reference scenario **R2**: R1 plus a recurring $200 extra from period 1.

Reference scenario **R3**: R1 plus tax $3,600/yr, insurance $1,200/yr, HOA $50, home price
$330,000 with 10% down, and PMI 0.5%. The loan is $297,000 (price − down payment, as the
calculator auto-computes it), so initial equity is $33,000.

Reference scenario **R4**: $12,000, 0%, 12 months.

| Builder | Assertion |
|---|---|
| `buildBalanceSeries(R1, null)` | It has 361 rows. Row 0's balance is 300000.00. Row n's balance equals `periods[n-1].remainingBalance`. The last row is 0. Every `baseline` is null. |
| `buildBalanceSeries(R2, baseline(R1))` | Row count is 361 (the baseline length). `balance` is 0 at R2's payoff period and null after it. `baseline` matches the R1 rows exactly. |
| `buildYearlyPrincipalInterest(R1)` | It has 30 rows. Σ interest over all rows equals `summary.totalInterestPaid` to the cent. Row 1 has interest > principal, and row 30 has principal > interest. Each row's parts add up to its total within 0.01. |
| `buildYearlyPrincipalInterest(R2)` | Σ extraPrincipal equals Σ `extraPrincipalApplied`. The row count equals ceil(payoffPeriods/12). |
| `buildYearlyPrincipalInterest(R1, {groupBy:'calendarYear'})` | `x` labels are "2027"…"2056", and the first row covers 12 periods. |
| `buildYearlyPrincipalInterest(R4)` | It has 1 row. Interest is 0 and principal is 12000.00. |
| `buildPaymentComposition(R1)` | It has 1 component (P&I), and the total equals `totalMonthlyPayment`. |
| `buildPaymentComposition(R3)` | It has 5 components in the order P&I, tax 300.00, insurance 100.00, PMI, HOA 50.00. \|Σ − total\| ≤ 0.01. |
| `buildScenarioBalanceComparison([R1, 15yr])` | It has 361 rows, and the 15yr column is null after row 180. |
| `computeBaselineSchedule(R1)` | Returns `null`. For R2 it returns a schedule deep-equal to `computeSchedule(R1)`. |
