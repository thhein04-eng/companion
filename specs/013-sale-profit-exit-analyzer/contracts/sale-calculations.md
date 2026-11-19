# Contract: Sale calculations (`deal-analyzer-calculations` public API)

All functions are pure, never throw, and are exported from the library's `index.ts`. Types are in
[data-model.md](../data-model.md).

## `DEFAULT_SALE`, `DEFAULT_SALE_TAX`, `SALE_NON_RENTAL_DEFAULT_MONTHS`

```ts
DEFAULT_SALE = { exitUnit: 'years', appreciationPct: 0, sellingCostsPct: 7 }
DEFAULT_SALE_TAX = { enabled: false, capitalGainsRatePct: 15, recaptureRatePct: 25 }
SALE_NON_RENTAL_DEFAULT_MONTHS = 84
```

## `validateSale(scenario: LoanScenario): FieldError[]`

Validates only present `scenario.sale` fields (data-model §A). Returns tax errors even when
`tax.enabled` is false, so the inputs show them, but `analyzeSale` only applies them when enabled.
Does not re-validate the shared rental fields (`validateRental` / `validateExit` own them).

## `resolveSaleAssumptions(scenario: LoanScenario): ResolvedSaleAssumptions`

Data-model §B. Precondition: none (missing rental, missing `sale`, out-of-range term all handled).

## `analyzeSale(scenario: LoanScenario, schedule: AmortizationSchedule): SaleAnalysis`

Preconditions (as `projectExit`): `validateScenario(scenario).valid`, `schedule =
computeSchedule(scenario)`, and, when `scenario.rental` exists, `validateRental(rental)` is empty.
The view checks these and shows its own reasons (see sale-ui.md).

| Condition | Result |
|---|---|
| `homePrice` null or ≤ 0 | `result: null`, `naReason: 'Enter a purchase price to model a sale.'` |
| any non-tax `validateSale` error, or (rental) a `validateExit` error on `rental.exit.sellingCostsPct` (an invalid `rental.appreciationPct` is excluded by the `validateRental` precondition) | `result: null`, `naReason: 'Fix the sale inputs to see the result.'` |
| tax enabled with invalid tax inputs (incl. `rental.wealth.landValuePct`) | `result` present, `tax: null`, `taxNaReason: 'Fix the tax inputs to see the estimate.'` |
| otherwise | full `result` |

Formulas: research.md R3–R8. Return-on-cash N/A reason: `'No cash invested — return is undefined.'`.

## Internal (not exported)

- `annualCashToInvestor(scenario, schedule, years): number[]` — extracted from `projectExit`; that
  function's existing tests must stay green unchanged.
- `cumulativeCashFlow(scenario, schedule, exitMonth): number` — research R5.

## Exported helper change

- `downPaymentDollars(scenario)` in `analyze-deal.ts` becomes exported (used for non-rental cash
  invested). No behaviour change.

## Reference vectors (unit tests, SC-001)

Reference scenario = `referenceScenario({}, { rentGrowthPct: 3, expenseGrowthPct: 2.5,
appreciationPct: 3.5 })`, 7% selling costs.

| Case | Sale price | Selling costs | Balance | Net proceeds | Cum. CF | Profit | Break-even |
|---|---|---|---|---|---|---|---|
| rental, m=84 | 508,911.71 | 35,623.82 | 273,442.24 | 199,845.65 | 51,574.90 | 151,420.55 | 346,093.91 |
| rental, m=90 | 517,741.07 | 36,241.87 | 271,001.93 | 210,497.27 | 57,268.44 | 167,765.71 | 337,347.84 |
| rental, m=12 | 414,000.00 | 28,980.00 | 296,952.57 | 88,067.43 | 4,561.08 | −7,371.49 | 421,926.33 |
| non-rental (rental: null, sale.appreciationPct 3.5), m=84 | 508,911.71 | 35,623.82 | 273,442.24 | 199,845.65 | 0.00 | 99,845.65 | 401,550.80 |
| rental, m=360 | — | — | 0.00 | — | — | — | 0.00 (`anyPrice`) |

Tax (enabled, defaults), rental m=84: depreciation 81,454.52; adjusted basis 318,545.48; gain
154,742.41; recapture tax 20,363.63; capital gains tax 10,993.18; after-tax profit 120,063.74.
Non-rental m=84: gain 73,287.89; recapture 0; capital gains tax 10,993.18; after-tax 88,852.47.

Property tests over `generatedScenarios`: invariants 1–6 in data-model §C.
