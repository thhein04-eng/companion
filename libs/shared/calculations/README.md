# shared-calculations

Framework-free loan math and the scenario model used by both features. Pure functions only: no React, DOM, or I/O.

**Tags:** `scope:shared`, `type:calc`

**May depend on:** Other `type:calc` libraries in `scope:shared` only (in practice, none). The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- Types: `LoanScenario`, `RentalAssumptions`, `SaleAssumptions` and `SaleTaxAssumptions` (spec 013; `applyScenarioPatch` merges `sale` one level deep), `RefinanceAssumptions` (spec 014; merged the same way under `refinance`) and `CustomExpenseItem` (data shape only), `DownPayment`, `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `PersistedState`, `MonthlyAnnual`, `RatioResult`, `ScenarioComparison`, `ComparisonRow`
- `roundCents`, `validateScenario`, `computeSchedule`, `calculatePrincipalFromHomePriceAndDownPayment`, `applyScenarioPatch`
- `serializeScenarios`, `deserializeScenarios` (the `sessionStorage` format)
- `computeLtv`, `computeValidSchedules`, `compareScenarios` (loan columns only)
- Rent roll (spec 012):
  - Types: `RentUnit`, `OccupancyView`, `IncomeBasis`. `CustomExpenseItem` gains `paidBy`
    ('landlord' | 'rubs') and `recoveryPct`.
  - `normalizeUnits` (a rental without `units` reads as one "Unit A" at `grossMonthlyRent`),
    `hasOwnerUnit`, `currentView`, `rentRollTotal`, `unitName`.
  - `rentRollIncome(rental, view, { rent, expense })`: rent, other income, the percentage
    base, per-unit vacancy and RUBS reimbursements for one view.
  - Edits: `addUnit`, `removeUnit`, `updateUnit`, `setOwnerUnit`, `updateCustomExpense`,
    `baseRental`, `MAX_UNITS`.
  - `formatRentWithUnits(rental, view?)`.
  - **Sync rule**: every rent-roll edit writes `grossMonthlyRent` = the after-move-out total, so
    single-number readers (the 1%/50% rules, older code) stay right.
- Spec 017: `SensitivityAssumptions` (`rental.sensitivity`: the Max Allowable Offer target, saved
  with the scenario: `targetMeasure`, `cashOnCashPct`, `cashFlowMonthly`).

Import only from the package name (`'shared-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test shared-calculations`.
