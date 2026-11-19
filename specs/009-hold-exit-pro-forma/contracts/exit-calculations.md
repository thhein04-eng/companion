# Contract: Hold & exit calculations (`deal-analyzer-calculations`)

These are pure functions, exported from the library's `index.ts`. Types are defined in
[data-model.md](../data-model.md).

```ts
export function irr(cashFlows: number[]): number | null;
export function resolveExitAssumptions(rental: RentalAssumptions): Required<ExitAssumptions>;
export function validateExit(rental: RentalAssumptions): FieldError[];
export function projectExit(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
  holdYears?: number,           // default: resolved rental.exit.holdYears
): ExitProjection;
export function compareHolds(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): ExitProjection[];             // holds [5, 7, 10] ∪ {chosen}, ascending, unique
```

## Changes to existing modules

- **`projectWealth(scenario, schedule, options?: { horizonYears?: number })`**: when
  `options.horizonYears` is given, it replaces the stored horizon, and the stored horizon's
  validation error is ignored. Every existing call and test is unchanged.
- **Internal `operatingYear(scenario, year)`**: extracted to `rental-line-items.ts`. It returns
  the unrounded monthly `{ gsiMonthly, opexMonthly }` for any year, using the growth rule shared by
  `projectRental` and `projectWealth`. `projectWealth`'s past-term branch uses it, and its
  behavior is unchanged.

## `projectExit` behavior

1. **No purchase price**: `result: null` with "Enter a purchase price to model a sale."
2. **Invalid exit inputs** (`validateExit`): `result: null` with "Fix the hold and exit
   assumptions to see the exit." and the errors.
3. **Rows**: N = hold. Each year y comes from the `projectWealth` row y (R1). `grossIncome` and
   `operatingExpenses` come from `projectRental` within the term, otherwise from
   `operatingYear` × 12, rounded. `debtService` comes from `projectRental` within the term,
   otherwise 0. `extraPrincipal` is the schedule sum, and `cashToInvestor` follows R2.
4. **Sale**: follows R3. **Returns**: follow R4 and R5.
   - The pre-tax series is `[−invested, CF₁ … CF_{N−1}, CF_N + net]`.
   - The after-tax series uses `afterTaxCashFlow`.
   - `irr` is N/A when it returns null: "IRR is undefined for these cash flows." When invested is
     0 or less, the multiple and IRR are N/A: "No cash invested — returns are undefined."
5. **Tax**: when `validateWealth` reports a land or rate error, `afterTax` is null and
   `taxNaReason` is "Fix the tax assumptions to see after-tax figures." The tax row fields are null.

## Required tests

| File | Case | Expectation |
|---|---|---|
| `irr.spec.ts` | `[-100, 110]` | 0.1 (1e-9) |
| | `[-1000, 300, 400, 500]` | 0.0889633947 (1e-9) |
| | `[-100, -10, 50]` | null (no root in the bracket) |
| | `[100, 10]` and `[0, 0]` | null |
| | `[-100, 0, 0, 133.1]` | 0.1 |
| `project-exit.spec.ts` | Reference holds 5 / 7 / 10 | every money column in the research table to the cent; IRRs and multiples to 4 dp |
| | Year 1 | `cashToInvestor 4561.08`, `afterTaxCashFlow 5527.75`, `depreciation 11636.36`, `interest 20903.45` |
| | Extra $500/mo, hold 7 | payoff 219442.75, net 253845.14, IRR 0.1482 (4 dp), year-1 cashToInvestor −1438.92 |
| | Agreement | for holds 1, 7, 30, the rows match `projectWealth` value, balance, NOI, interest, depreciation and taxEffect |
| | NPV | at the returned IRR, the absolute NPV is under 0.01, for the reference and for 20 generated scenarios |
| | Profit identity | `totalNetProfit === roundCents(multiple × invested − invested)`, within $0.01 |
| | Hold past term | 15-year loan, hold 20: `loanPayoff 0`, `debtService 0` for years 16–20 |
| | Selling 0% | `netSaleProceeds = salePrice − payoff` |
| | Zero invested | multiple and IRR null with the reason |
| | No price / invalid exit | `result: null`, with the reasons above and exact error keys |
| | Tax invalid | `afterTax null`, `taxNaReason` set, `preTax` unchanged |
| | Tax rate 0 | `afterTax` deep-equals `preTax` |
| | Forced appreciation 20,000 | `salePrice` includes it, and `forcedAppreciation === 20000` |
| | `compareHolds` | the chosen 7 gives holds [5, 7, 10]; the chosen 12 gives [5, 7, 10, 12] |
| | Old session | no `exit` gives hold 7 and selling 7 |
| `validate-exit.spec.ts` | Each rule | exact key and message from data-model §A; never throws on malformed values |
| `project-wealth.spec.ts` | Override | `projectWealth(s, sch, { horizonYears: 3 })` gives 4 rows, even when the stored horizon is 31 (invalid) |
