# Data Model: Refinance & BRRRR Modeling

Stored data is one optional object on a scenario. Everything else is derived and never stored.

## A. `RefinanceAssumptions` (stored) — `LoanScenario.refinance?: RefinanceAssumptions | null`

Lives in `shared-calculations/src/lib/types.ts`. Every field is optional; a missing field means
"use the default" or "not entered yet". Scenario-level (not under `rental`), so a non-rental can use
Rate-drop mode.

| Field                 | Type                        | Valid range                                                                       | Default / when missing                                          |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `mode`                | `'cash-out' \| 'rate-drop'` | —                                                                                 | `'cash-out'`                                                    |
| `arvDollars`          | number                      | > 0                                                                               | Not entered. Cash-out shows a prompt; Rate-drop ignores it.     |
| `ltvPct`              | number                      | 1 ≤ x ≤ 95                                                                        | 75                                                              |
| `newRatePct`          | number                      | 0 ≤ x ≤ 100                                                                       | Not entered. Both modes show a prompt.                          |
| `newTermMonths`       | integer                     | 1 ≤ x ≤ 480                                                                       | Cash-out: 360. Rate-drop: months remaining on the current loan. |
| `termUnit`            | `'years' \| 'months'`       | —                                                                                 | `'years'` (display only)                                        |
| `closingCostsDollars` | number                      | ≥ 0. The refinance closing costs, not the purchase costs in `rental.closingCosts` | 0                                                               |
| `refinanceMonth`      | integer                     | ≥ 1                                                                               | 12. A value above the loan term is clamped to the term.         |

The `FieldError.field` union gains `` `refinance.${'arvDollars' | 'ltvPct' | 'newRatePct' | 'newTermMonths' | 'closingCostsDollars' | 'refinanceMonth'}` ``.

**Persistence**: serialized with the scenario by the existing `serializeScenarios`. A session saved
before this feature has no `refinance` key and loads normally with every default (FR-014).

**Patch semantics**: `applyScenarioPatch` shallow-merges `{ refinance: patch }` over the stored
object (an explicit `refinance: null` clears it), the same as `sale`.

## B. `ResolvedRefinanceAssumptions` (derived) — `resolveRefinanceAssumptions(scenario)`

Stored inputs over the defaults, with clamping, for the calculations and the UI.

| Field             | Meaning                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `mode`            | The stored mode, or `'cash-out'`.                                           |
| `arv`             | `number \| null` (null = not entered)                                       |
| `ltvPct`          | Stored or 75.                                                               |
| `newRatePct`      | `number \| null` (null = not entered)                                       |
| `refinanceMonth`  | Stored or 12, clamped to `1…termMonths`.                                    |
| `clampedFrom`     | The stored month when it was above the term, else `null` (drives the note). |
| `remainingMonths` | `termMonths − refinanceMonth` (0 at the final month).                       |
| `newTermMonths`   | Stored, else 360 (cash-out) or `remainingMonths` (rate-drop).               |
| `termUnit`        | Stored or `'years'`.                                                        |
| `closingCosts`    | Stored or 0.                                                                |

## C. `CashOutAnalysis` (derived) — `analyzeCashOut(scenario, schedule)`

Returns `{ result: CashOutResult | null, naReason: string | null, errors: FieldError[] }`.

`CashOutResult` (all money rounded to cents):

| Field                                 | Definition                                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `newLoan`                             | `roundCents(arv × ltvPct / 100)`                                                                    |
| `payoff`                              | Remaining balance of the current loan at `refinanceMonth` (research R2).                            |
| `closingCosts`                        | As entered.                                                                                         |
| `netProceeds`                         | `roundCents(newLoan − payoff − closingCosts)`. Negative = cash-in refinance.                        |
| `isCashIn`                            | `netProceeds < 0`                                                                                   |
| `currentPi` / `newPi` / `piChange`    | Cents-rounded monthly P&I of the current and new loans, and `newPi − currentPi`.                    |
| `totalCashInvested`                   | From `analyzeDeal` (rental) or the down payment (non-rental).                                       |
| `cashLeft`                            | `roundCents(totalCashInvested − netProceeds)`                                                       |
| `capitalRecycledPct`                  | `RatioResult`: `netProceeds / totalCashInvested`, or N/A when nothing was invested.                 |
| `allCashRecovered`                    | `cashLeft ≤ 0`                                                                                      |
| `cashSurplus`                         | `−cashLeft` when `allCashRecovered`, else `0`.                                                      |
| `cashFlowBefore` / `cashOnCashBefore` | From `analyzeDeal`. Not available without a rental.                                                 |
| `noiAnnual`                           | Annual net operating income from `analyzeDeal`. Not available without a rental.                     |
| `cashFlowAfter`                       | `roundCents(noiAnnual − 12 × newPi)`. Not available without a rental.                               |
| `cashOnCashAfter`                     | `RatioResult`: `cashFlowAfter / cashLeft`. N/A when there is no rental, or when `allCashRecovered`. |

`naReason` explains why `result` is null (loan invalid, rental invalid, ARV or rate missing, inputs
invalid). `RatioResult` is the existing `{ value, naReason }` type.

## D. `RateDropAnalysis` (derived) — `analyzeRateDrop(scenario, schedule)`

Returns `{ result: RateDropResult | null, naReason: string | null, errors: FieldError[] }`.

`RateDropResult`:

| Field                            | Definition                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| `balanceRefinanced`              | Remaining balance at `refinanceMonth` (the new loan's principal). |
| `currentPi` / `newPi`            | Cents-rounded monthly P&I.                                        |
| `monthlySavings`                 | `currentPi − newPi` (negative when the payment goes up).          |
| `breakeven`                      | A tagged union, below.                                            |
| `netSavings`                     | Net savings over the remaining term (research R10).               |
| `horizonMonths`                  | `remainingMonths`                                                 |
| `newTermMonths` / `termExtended` | The new term, and whether it is longer than `remainingMonths`.    |

`breakeven` is one of:

| `kind`          | Meaning                                                | Extra fields                                                                                     |
| --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `'immediate'`   | Closing costs are $0.                                  | —                                                                                                |
| `'month'`       | Savings recoup the costs.                              | `months` (≥ 1), `years` and `remainderMonths` for display, `loanMonth = refinanceMonth + months` |
| `'none'`        | `monthlySavings ≤ 0`.                                  | `reason`                                                                                         |
| `'beyond-term'` | Savings never recoup the costs within `horizonMonths`. | —                                                                                                |

## E. Validation rules

| Field                 | Rule                                                   | Message                                             |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `arvDollars`          | finite, > 0                                            | "Enter an after-repair value greater than $0."      |
| `ltvPct`              | finite, 1–95                                           | "Loan-to-value must be between 1% and 95%."         |
| `newRatePct`          | finite, 0–100                                          | "Enter a rate between 0% and 100%."                 |
| `newTermMonths`       | integer, 1–480                                         | "Term must be between 1 and 480 months."            |
| `closingCostsDollars` | finite, ≥ 0                                            | "Refinance closing costs can't be negative."        |
| `refinanceMonth`      | integer, ≥ 1 (above the term is clamped, not an error) | "Refinance month must be a whole month, 1 or more." |

`validateRefinance(scenario)` returns `FieldError[]` for the stored fields that are present and
invalid. A missing field is not an error; it is a prompt (research R12).

## F. State and transitions

- **Mode toggle**: switches which inputs and results show. Inputs are shared where they overlap (new
  rate, closing costs, refinance month), so toggling never loses them. The new term has a
  different default per mode, so an unset term follows the mode.
- **Scenario switch**: each scenario has its own `refinance`. Switching tabs shows that scenario's
  inputs and results.
- **Undo**: every edit is one change record ("Refinance inputs changed"). Undo restores the previous
  `refinance` object, blanking keys that were added since.
- **Shared inputs edited elsewhere** (price, loan, rent, rehab): this page recomputes from the
  scenario on every render. No refinance value is cached.
