# Contract: Wealth projection calculations (`deal-analyzer-calculations`)

These are pure functions, exported from the library's `index.ts`. Types are defined in
[data-model.md](../data-model.md).

```ts
export function resolveWealthAssumptions(rental: RentalAssumptions): Required<WealthAssumptions>;
export function validateWealth(rental: RentalAssumptions): FieldError[];
export function projectWealth(scenario: LoanScenario, schedule: AmortizationSchedule): WealthProjection;
```

## `projectWealth` behavior

1. **No purchase price**: returns `years: null` with "Enter a purchase price to project equity and
   net worth."
2. **Invalid horizon or forced appreciation**: returns `years: null` with "Fix the projection
   assumptions to see the projection." and the matching `errors`.
3. **Operating years**: years 1 to `min(N, ceil(term/12))` take `noi`, `cashFlow` and `loanBalance`
   from `projectRental` (R1). For years beyond the loan term, income and expenses keep growing, and
   debt service and balance are 0.
4. **Value, equity and net worth**: these follow R2–R4.
5. **Tax**: interest follows R6, depreciation R5 and the tax effect R7. When the land or tax-rate
   inputs are invalid, every tax field and `netWorthAfterTax` is null, and `taxNaReason` is "Fix
   the tax assumptions to see after-tax figures."
6. **Multiple**: `netWorth(N) / totalCashInvested`. When cash invested is 0 or less, it is null
   with the `analyzeDeal` reason.

## Required tests (`project-wealth.spec.ts`, `validate-wealth.spec.ts`)

| Case | Expectation |
|---|---|
| Reference scenario, every row of research.md's table | to the cent; year 0 = 100,000 for both equity and net worth |
| Reference multiple | `(360051.02 / 100000).toFixed(1) === '3.6'` |
| Horizon 5 | 6 rows (0…5), last net worth 211,428.70 |
| Forced 20,000 | year-0 equity 120,000; year-10 equity + 26,878.33 vs. reference |
| Tax rate 0 | `netWorthAfterTax === netWorth` every year |
| Land 100 or rate 61 | tax fields null, `taxNaReason` set, pre-tax unchanged |
| 15-year loan, horizon 20 | years 16–20: `loanBalance 0`, `interest 0`, `cashFlow === noi` |
| Horizon 30 on 30-year | year 28 depreciation 5,818.28; years 29–30 are 0; total = basis |
| Rehab 10,000 | basis = 330,000; depreciation 12,000.00 |
| Extra payments | lower `interest` and `loanBalance`; `cashFlow` equal to no-extra |
| No price | `years === null`, naReason |
| Zero cash invested | multiple null with reason |
| Invariants | over 20 generated scenarios: equity parts sum, `netWorth − equity = cumCF`, Σdep ≤ basis |
| Spec 005 agreement | years within the term: `noi`, `cashFlow`, `loanBalance` equal `projectRental` |
| Old session | rental without `wealth` gives the defaults (10 / 0 / 20 / 24) |

`validateWealth` gives one error per invalid field, using the exact keys and messages in
data-model §A, and never throws on malformed stored values.
