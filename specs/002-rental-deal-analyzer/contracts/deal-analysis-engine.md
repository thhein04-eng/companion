# Contract: Deal Analysis Engine (`libs/amortization-calculations`)

These are additive public exports alongside the existing [calculation-engine contract](../../001-real-estate-amortization-calculator/contracts/calculation-engine.md). All functions are pure, framework-free, and unit-tested with Vitest (Constitution I). Types are defined in [data-model.md](../data-model.md).

## `DEFAULT_RENTAL_ASSUMPTIONS: Omit<RentalAssumptions, 'grossMonthlyRent'>`

`{ otherMonthlyIncome: 0, vacancyPct: 5, managementPct: 8, maintenanceReservePct: 5, capexReservePct: 5, closingCosts: 0, rehabBudget: 0 }`

## `validateRental(rental: RentalAssumptions): FieldError[]`

- Returns one error per offending field, keyed `rental.<field>`.
- Rejects negative dollar fields, and percentages outside [0, 100] (FR-015).
- Separate from `validateScenario`, so invalid rental inputs never block the amortization schedule. The app calls `validateScenario` first, then `validateRental` only when `scenario.rental != null`.

## `analyzeDeal(scenario: LoanScenario, schedule: AmortizationSchedule): DealAnalysis`

**Preconditions**: `scenario` passed `validateScenario`; `scenario.rental != null` and passed `validateRental`; `schedule = computeSchedule(scenario)`.

**Postconditions**:

- Itemized `operatingExpenses` always contains all 7 categories in a fixed order (tax, insurance, HOA, vacancy, management, maintenance, CapEx). A missing tax, insurance, or HOA input counts as `0`.
- `debtService.annual = roundCents(summary.monthlyPrincipalAndInterest × min(12, periods.length) + summary.monthlyPmiAmount × count(periods[0..11] where pmiApplies))`. Extra payments are excluded (research R2).
- `totalCashInvested = downPaymentDollars + closingCosts + rehabBudget`. Here `downPaymentDollars` resolves a percent down payment against `homePrice`, or is `0` when there is no down payment.
- `cashOnCashReturn.value = null` with `naReason = "No cash invested — Cash-on-Cash Return is undefined."` when `totalCashInvested === 0`.
- `capRate.value = null` and `onePercentRule = null` when `homePrice == null`.
- `fiftyPercentRule = null` when GSI is 0.
- Never returns `NaN` or `Infinity` in any field.
- Deterministic: deep-equal output for deep-equal input.

## `computeLtv(scenario: LoanScenario): RatioResult`

`principal / homePrice`, or `{ value: null, naReason: "Enter a purchase price to see LTV." }` when there is no `homePrice`.

## Changes to existing exports

| Export                 | Change                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `computeSchedule`      | `summary.monthlyPmiAmount` added (additive). The other outputs stay the same, and existing tests must still pass. |
| `compareScenarios`     | New optional 2nd arg `analyses?: Record<scenarioId, DealAnalysis \| null>`. Rows gain the 4 nullable deal columns. Existing call sites keep working. |
| `deserializeScenarios` | Normalizes each scenario so `rental` defaults to `null` (FR-016). It still never throws. |
| `applyScenarioPatch` / scenario updates | `rental` patches merge shallowly into the existing `rental` object.              |

## Reference test vectors (must be in `analyze-deal.spec.ts`)

| Case | Inputs | Expected |
| ---- | ------ | -------- |
| A — baseline deal | price 250,000; down 25% ($62,500); 7% / 360 mo; rent 2,400; tax 3,000/yr; ins 1,200/yr; 5/8/5/5%; closing 7,500; rehab 10,000 | P&I 1,247.44; opex 902.00/mo; NOI 1,498.00/mo, 17,976.00/yr; cash flow 250.56/mo, 3,006.72/yr; cash invested 80,000; CoC ≈ 3.76%; cap ≈ 7.19%; 1% rule fail (target 2,500); 50% ratio ≈ 37.58%, within; 50%-rule est. CF −47.44/mo; LTV 75.0% |
| B — zero cash | A with 0% down, 0 closing, 0 rehab | CoC `null` with naReason |
| C — PMI in year 1 | A with 10% down and PMI 0.5% | debt service includes 12 × monthly PMI |
| D — no purchase price | A with `homePrice = null` | cap rate, 1% rule, and LTV are `null`; NOI and cash flow are still computed |
| E — 100% vacancy | A with vacancy 100 | valid; negative cash flow; no error |
| F — rent 0 | A with rent 0 | `fiftyPercentRule = null`; negative NOI and cap rate |
| G — short loan | A with `termMonths: 6` | `debtService.annual` covers 6 payments only (`roundCents(monthlyPrincipalAndInterest × 6)`) |
