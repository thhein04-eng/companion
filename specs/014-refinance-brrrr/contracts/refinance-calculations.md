# Contract: Refinance calculations

Pure functions in `libs/deal-analyzer/calculations`, exported through its `index.ts`. No I/O, no
hidden state (Constitution I). Types are in `data-model.md`. Reference figures were computed with
the workspace's own engine (`computeSchedule`, `analyzeDeal`) and are the unit-test vectors.

## Public API

```ts
// validate-refinance.ts
export const DEFAULT_REFINANCE: Readonly<{
  mode: 'cash-out';
  ltvPct: 75;
  refinanceMonth: 12;
  cashOutTermMonths: 360;
  closingCosts: 0;
  termUnit: 'years';
}>;
export function validateRefinance(scenario: LoanScenario): FieldError[];
export function resolveRefinanceAssumptions(
  scenario: LoanScenario,
): ResolvedRefinanceAssumptions;

// analyze-cash-out.ts
export const CASH_OUT_NO_ARV_REASON: string; // "Enter an after-repair value to model a refinance."
export const REFINANCE_NO_RATE_REASON: string; // "Enter a new interest rate to model a refinance."
export const REFINANCE_INVALID_REASON: string; // "Fix the refinance inputs to see the result."
export function analyzeCashOut(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): CashOutAnalysis;

// analyze-rate-drop.ts
export const RATE_DROP_PAID_OFF_REASON: string; // "The loan is already paid off at this month."
export function analyzeRateDrop(
  scenario: LoanScenario,
  schedule: AmortizationSchedule,
): RateDropAnalysis;
```

`refinance-math.ts` is internal (not exported): `newPayment(principal, ratePct, termMonths)`,
`breakeven(costs, savings, remainingMonths, refinanceMonth)` and `balanceOwed(...)`.

**Preconditions** (as for `analyzeSale`): `validateScenario(scenario).valid`, `schedule =
computeSchedule(scenario)`, and, when `scenario.rental` exists, `validateRental(rental)` is empty.

## `analyzeCashOut` — formulas

Let `m` = the resolved refinance month and `r` = the resolved assumptions.

1. If `r.arv == null` → `{ result: null, naReason: CASH_OUT_NO_ARV_REASON }`. If `r.newRatePct ==
null` → `REFINANCE_NO_RATE_REASON`. If `validateRefinance` has errors → `REFINANCE_INVALID_REASON`
   (errors returned too).
2. `newLoan = roundCents(arv × ltvPct / 100)`.
3. `payoff = m > schedule.periods.length ? 0 : schedule.periods[m − 1].remainingBalance`.
4. `netProceeds = roundCents(newLoan − payoff − closingCosts)`.
5. `currentPi = schedule.summary.monthlyPrincipalAndInterest`;
   `newPi = roundCents(monthlyPayment(newLoan, newRatePct, newTermMonths))`.
6. `totalCashInvested = rental ? analyzeDeal(...).totalCashInvested : roundCents(downPaymentDollars(scenario))`.
7. `cashLeft = roundCents(totalCashInvested − netProceeds)`; `capitalRecycledPct = netProceeds /
totalCashInvested` when `totalCashInvested > 0`, else N/A.
8. `allCashRecovered = cashLeft ≤ 0`; `cashSurplus = allCashRecovered ? −cashLeft : 0`.
9. With a rental: `cashFlowBefore = analyzeDeal(...).cashFlow.annual`, `cashOnCashBefore =
analyzeDeal(...).cashOnCashReturn`, `cashFlowAfter = roundCents(noiAnnual − 12 × newPi)` and
   `cashOnCashAfter = cashFlowAfter / cashLeft` unless `allCashRecovered` (N/A, "All cash
   recovered"). Without a rental these are N/A with "Add rent to see cash-on-cash".

## `analyzeRateDrop` — formulas

1. `r.newRatePct == null` → `REFINANCE_NO_RATE_REASON`. Invalid inputs → `REFINANCE_INVALID_REASON`.
   `r.remainingMonths == 0` → `RATE_DROP_PAID_OFF_REASON`.
2. `balanceRefinanced = payoff` as in cash-out step 3. `H = r.remainingMonths`.
3. `currentPi` as above; `newPi = roundCents(monthlyPayment(balanceRefinanced, newRatePct,
newTermMonths))`; `monthlySavings = roundCents(currentPi − newPi)`.
4. Breakeven (in integer cents, research R8): `savings ≤ 0` → `none` (checked first); costs `0` → `immediate`;
   else `b = ceil(costsCents / savingsCents)`; `b > H` → `beyond-term`; else `month` with
   `loanMonth = m + b`.
5. `balanceOwed = newTermMonths > H ? roundCents(remainingBalance(balanceRefinanced, newRatePct,
newTermMonths, H)) : 0`.
6. `netSavings = roundCents(currentPi × H − newPi × min(H, newTermMonths) − closingCosts −
balanceOwed)`. `termExtended = newTermMonths > H`.

## Reference vectors

### BRRRR deal (cash-out)

$200,000 price, 20% down ($40,000), $160,000 loan at 7% / 30 yr, rehab $50,000, purchase closing
costs $6,000, rent $2,800/mo, tax $2,400/yr, insurance $1,200/yr, default reserves. Refinance at
month 12: ARV $320,000, LTV 75%, new rate 6.5%, 30 yr, closing costs $5,000.

| Figure                        | Value                 |
| ----------------------------- | --------------------- |
| New loan                      | $240,000.00           |
| Payoff at month 12            | $158,374.70           |
| Net proceeds                  | $76,625.30            |
| Current / new monthly P&I     | $1,064.48 / $1,516.96 |
| Total cash invested           | $96,000.00            |
| Cash left in deal             | $19,374.70            |
| Capital recycled              | 79.82%                |
| Net operating income (annual) | $22,272.00            |
| Cash flow before / after      | $9,498.24 / $4,068.48 |
| Cash-on-cash before / after   | 9.89% / 21.00%        |

### Variants (same deal, ARV changed)

| ARV      | New loan    | Net proceeds | Cash left   | Result                                                         |
| -------- | ----------- | ------------ | ----------- | -------------------------------------------------------------- |
| $400,000 | $300,000.00 | $136,625.30  | −$40,625.30 | All cash recovered, surplus $40,625.30, cash-on-cash after N/A |
| $250,000 | $187,500.00 | $24,125.30   | $71,874.70  | Capital recycled 25.13%                                        |
| $200,000 | $150,000.00 | −$13,374.70  | $109,374.70 | Cash-in refinance, capital recycled −13.93%                    |

### Rate drop

$300,000 at 7% / 30 yr (current P&I $1,995.91), refinance at month 60, new rate 5.5%, closing costs
$4,500. Balance refinanced **$282,394.77**.

| Case                    | New P&I   | Monthly savings | Breakeven                                                    | Net savings                                                             |
| ----------------------- | --------- | --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Remaining term (300 mo) | $1,734.15 | $261.76         | month 18 (17 × = $4,449.92, 18 × = $4,711.68), loan month 78 | $74,028.00                                                              |
| Fresh 30 yr (360 mo)    | $1,603.41 | $392.50         | month 12 (11 × = $4,317.50, 12 × = $4,710.00)                | $29,307.13 (balance owed after 300 payments $83,942.87), `termExtended` |
| Closing costs $0        | $1,734.15 | $261.76         | `immediate`                                                  | $78,528.00                                                              |
| Closing costs $80,000   | $1,734.15 | $261.76         | `beyond-term`                                                | −$1,472.00                                                              |

New rate above the current rate: new P&I is higher, savings negative, breakeven `none`. Refinance
month equal to the term: `RATE_DROP_PAID_OFF_REASON`.

## Invariants (over `generatedScenarios()` and the reference deals)

1. `netProceeds == roundCents(newLoan − payoff − closingCosts)`.
2. `cashLeft == roundCents(totalCashInvested − netProceeds)`.
3. `capitalRecycledPct == netProceeds / totalCashInvested` when invested > 0.
4. `allCashRecovered ⇔ cashLeft ≤ 0`, and then `cashSurplus == −cashLeft`.
5. `totalCashInvested` and `cashOnCashBefore` equal `analyzeDeal` to the cent.
6. A `month` breakeven `b` satisfies `b × savings ≥ costs > (b − 1) × savings` (cents), and equals a
   brute-force loop that adds monthly savings until it reaches the costs.
7. `newPi` equals `computeSchedule` on a synthetic loan of `newLoan` at the new rate and term (cents).
8. `balanceOwed` equals the synthetic schedule's balance after `H` periods (cents).
9. Raising the new rate never lowers `newPi`, and never moves the breakeven earlier.
10. With extra payments on the scenario, `payoff` equals the schedule's balance, which is lower than
    the no-extras balance.

## Boundaries covered

LTV 1 and 95; refinance month 1 and the loan term (payoff $0); a 0% new rate; a 0% current rate;
closing costs $0; equal rates (no breakeven); a non-rental scenario (no cash-on-cash, down payment
only); a house-hacked rental (follows the rental analysis' income view).
