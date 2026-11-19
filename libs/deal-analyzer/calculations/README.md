# deal-analyzer-calculations

Pure rental-analysis functions for the Rental Deal Analyzer.

**Tags:** `scope:deal-analyzer`, `type:calc`

**May depend on:** `type:calc` libraries in `scope:shared` or `scope:deal-analyzer`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- `analyzeDeal`, `DEFAULT_RENTAL_ASSUMPTIONS`, `validateRental`
- `withDealMetrics`: adds deal columns to a `compareScenarios` result
- Types: `DealAnalysis`, `OperatingExpenseCategory`, `OperatingExpenseLine`, `OnePercentRuleResult`, `FiftyPercentRuleResult`, `DealComparisonRow`, `DealScenarioComparison`
- DSCR & financing matrix (spec 006):
  - `computeDscr`, `resolveDscrMinimum`, `DEFAULT_DSCR_MINIMUM`, `DSCR_PRESETS`, `DSCR_MINIMUM_RANGE`. `analyzeDeal` also returns `dscr`.
  - `defaultFinancingTerms`, `resolveFinancingTerms`, `buildFinancingMatrix`
  - `validateFinancing`, `validateDscrMinimum`
  - Types: `DscrResult`, `FinancingPhase`, `FinancingOptionResult`, `FinancingMatrix`
- Wealth projection (spec 008):
  - `projectWealth`, `resolveWealthAssumptions`, `validateWealth`
  - `DEFAULT_WEALTH`, `TYPICAL_GROWTH`, `DEPRECIATION_YEARS`, `WEALTH_*_REASON`
  - Types: `WealthYear`, `WealthProjection`
- Hold & exit pro forma (spec 009):
  - `irr`, `projectExit`, `compareHolds`, `validateExit`, `resolveExitAssumptions`
  - `DEFAULT_EXIT`, `HOLD_PRESETS`, `EXAMPLE_GROWTH`, `EXIT_NO_PRICE_REASON`, `EXIT_INVALID_REASON`
  - Types: `ProFormaYear`, `ExitReturns`, `ExitResult`, `ExitProjection`
  - `projectWealth(scenario, schedule, { horizonYears })`: the override replaces the stored horizon
- Moved to `shared-calculations` in spec 010 (still re-exported here): `validateRental`,
  `DEFAULT_RENTAL_ASSUMPTIONS`.

Import only from the package name (`'deal-analyzer-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test deal-analyzer-calculations`.
