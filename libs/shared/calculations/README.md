# shared-calculations

Framework-free loan math and the scenario model used by both features. Pure functions only: no React, DOM, or I/O.

**Tags:** `scope:shared`, `type:calc`

**May depend on:** Other `type:calc` libraries in `scope:shared` only (in practice, none). The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- Types: `LoanScenario`, `RentalAssumptions`, `SaleAssumptions` and `SaleTaxAssumptions` (spec 013; `applyScenarioPatch` merges `sale` one level deep) and `CustomExpenseItem` (data shape only), `DownPayment`, `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `PersistedState`, `MonthlyAnnual`, `RatioResult`, `ScenarioComparison`, `ComparisonRow`
- `roundCents`, `validateScenario`, `computeSchedule`, `calculatePrincipalFromHomePriceAndDownPayment`, `applyScenarioPatch`
- `serializeScenarios`, `deserializeScenarios` (the `sessionStorage` format)
- `computeLtv`, `computeValidSchedules`, `compareScenarios` (loan columns only)

Import only from the package name (`'shared-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test shared-calculations`.
