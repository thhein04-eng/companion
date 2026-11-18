# Contract: DSCR & financing calculations

These are the public functions added to library entry points. All of them are pure: no I/O, no
mutation, no DOM. Types are defined in [data-model.md](../data-model.md).

## `shared-calculations` (new `lib/loan-math.ts`, re-exported from `index.ts`)

```ts
/** Unrounded fully-amortizing monthly payment; principal / termMonths at 0%. */
export function monthlyPayment(principal: number, annualRatePct: number, termMonths: number): number;

/** Unrounded balance after `afterPeriods` scheduled payments (closed form, R4). 0 ≤ afterPeriods ≤ termMonths. */
export function remainingBalance(
  principal: number, annualRatePct: number, termMonths: number, afterPeriods: number,
): number;
```

The behavior of `computeSchedule` MUST be unchanged, and the existing `compute-schedule.spec.ts`
MUST pass without edits.

**Tests**: $300,000 at 6.5% for 360 months → 1896.20 (rounded). $300,000 at 7% → 1995.91. $300,000
at 0% for 360 months → 833.33. `remainingBalance(300000, 6.5, 360, 84)` → 271248.73 (rounded).
`remainingBalance(…, 360)` → 0 (±1e-6).

## `deal-analyzer-calculations`

### `computeDscr`

```ts
export function computeDscr(input: {
  scenario: LoanScenario;          // validated; scenario.rental non-null and valid
  annualNoi: number;               // DealAnalysis.netOperatingIncome.annual
  monthlyPrincipalAndInterest: number; // cents-rounded
  minimum: number | null;          // null = invalid stored minimum
}): DscrResult;

export function resolveDscrMinimum(rental: RentalAssumptions): number | null; // default 1.25, null if invalid
```

- `annualDebtService = roundCents(monthlyPI × 12)`, and `value = annualNoi / annualDebtService` (R1).
- `rentForMinimum` follows R3. It uses `rentalLineItems(scenario, gsi, 1)` to split expenses into
  percentage-of-income lines and fixed lines. Both the property-tax/insurance/HOA lines and the
  custom expenses count as fixed. The result is floored at 0 and cents-rounded.
  - When the percentages sum to ≥ 100%: `null` with "Reserves and fees take 100% or more of rent."
- `analyzeDeal` now returns `dscr` computed from `schedule.summary.monthlyPrincipalAndInterest`
  and `resolveDscrMinimum(rental)`. All its other fields are unchanged.
- `withDealMetrics` adds `dscr: analysis?.dscr.value ?? null` to each row.

**Tests** (reference scenario, [research.md](../research.md#reference-scenario-used-in-spec-contracts-and-tests)):

| Case | Expectation |
|---|---|
| Conventional, min 1.25 | value 1.1904 (4 dp), meetsMinimum false, covers true, rentForMinimum 3954.40 |
| Same, min 1.15 | meetsMinimum true, rentForMinimum 3695.19 |
| Rent 2,000 | value < 1, coversDebtService false |
| Rent 0 with fixed costs | value negative; rentForMinimum still computed |
| Reserves summing to 100% | rentForMinimum null with the reason above |
| Value exactly equal to min (rent = rentForMinimum) | meetsMinimum true |
| Stored min 0.9 or 2.5 | minimum null, meetsMinimum null, value still computed |
| Missing `dscrMinimum` | minimum 1.25 |

### `defaultFinancingTerms` / `resolveFinancingTerms`

```ts
export function defaultFinancingTerms(scenario: LoanScenario): FinancingTerms; // requires homePrice > 0
export function resolveFinancingTerms(scenario: LoanScenario): { terms: FinancingTerms; isCustomized: boolean };
```

These follow the defaults table in data-model §A.

**Tests**: For the reference scenario, conventional is {25, 7, 30}, ARM is {25, 6.5, 30, 7, 8.5}
and DSCR is {25, 8, 30}. With rate 0.3%, the ARM initial rate is 0. With an overridden principal
of $320,000, conventional down is 20. With a stored `financing`, the stored terms are returned and
`isCustomized` is true.

### `validateFinancing`

```ts
export function validateFinancing(rental: RentalAssumptions, terms: FinancingTerms): FieldError[];
```

This follows the rules in data-model §A. It returns one error per offending field, and it never
throws on malformed stored values (for example a non-number or a missing nested object).

### `buildFinancingMatrix`

```ts
export function buildFinancingMatrix(scenario: LoanScenario, analysis: DealAnalysis): FinancingMatrix;
```

- When `homePrice` is null or ≤ 0, it returns `options: null` with
  "Enter a purchase price to compare financing options."
- For each option: `loan = price × (1 − down/100)`, `downPayment = price − loan`,
  `totalCashInvested = roundCents(downPayment + closingCosts + rehabBudget)`.
- Phases: conventional and DSCR each have one phase. The ARM has
  `[initial(1…fixedYears), afterReset(fixedYears+1…termYears)]`, with the post-reset P&I computed
  from `remainingBalance` per R4.
- PMI follows R6. Cash flow is `roundCents(noi.monthly − PI − PMI)`. Cash-on-cash is
  `cashFlow × 12 / totalCashInvested`, or the existing "No cash invested" N/A.
- Each phase's DSCR comes from `computeDscr` with that phase's P&I.
- An option with validation errors gets `phases: null` and its `errors`. The other options are
  unaffected.
- `selected` is `rental.financingSelection ?? 'conventional'`.

**Tests**: Every row of the research reference table, to the cent. Untouched conventional cash
flow equals `analysis.cashFlow.monthly` (SC-005, also checked as a property over several 30-year
scenarios with and without PMI that does not drop off in year one). PMI appears at 10% down with a
PMI rate, and never on the DSCR option. A 0% rate works. An invalid ARM fixed period gives
`arm.phases === null` while conventional and DSCR are still computed. No price gives the
`naReason`.

## Persistence

- `serializeScenarios` / `deserializeScenarios`: no code change. The new test is that a session JSON
  without `dscrMinimum`, `financing` or `financingSelection` round-trips, and that
  `buildFinancingMatrix` on it yields the defaults.
