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
- Sale profit & exit (spec 013):
  - `analyzeSale(scenario, schedule)`: the sale, cumulative cash flow, profit, return on cash,
    verdict, break-even price and the optional tax-on-sale estimate for one exit month. Works
    without a rental (cash flow 0).
  - `validateSale`, `resolveSaleAssumptions`, `saleVerdict`
  - `DEFAULT_SALE`, `DEFAULT_SALE_TAX`, `SALE_NON_RENTAL_DEFAULT_MONTHS`, `SALE_TAX_FIELDS`,
    `SALE_NO_PRICE_REASON`, `SALE_INVALID_REASON`, `SALE_TAX_INVALID_REASON`
  - Types: `ResolvedSaleAssumptions`, `SaleResult`, `SaleBreakEven`, `SaleTaxEstimate`, `SaleAnalysis`
  - `downPaymentDollars(scenario)` is now exported (non-rental cash invested).
  - Internal: `annualCashToInvestor` / `operatingCashYears` (`cash-to-investor.ts`) are shared by
    `projectExit` and `analyzeSale`, so whole-year exits agree to the cent.
- `onePercentRatio(rule)` (spec 011): rent ÷ price for the 1% Rule card's headline.
- Spec 012:
  - `analyzeDeal(scenario, schedule, { view? })` uses the rent roll in that view (default: the
    stored one).
  - It returns `view`, `income` (rent, other, RUBS reimbursements), `unitBreakdown` and
    `netHousingCost` (−cash flow while living there).
  - The 1%/50% rules always use the full rent.
  - `operatingYear` picks "Living there" until `moveOutYear`. `projectWealth` / `projectExit`
    return `moveOutYear`.
  - NOI everywhere = income + reimbursements − expenses.
  - `golden-baseline.spec.ts` pins every pre-spec-012 result.
- Spec 015 (Sensitivity page), all pure and built on `analyzeDeal`:
  - `scenarioVariant(scenario, { ratePct, price, priceChangePct, rentChangePct })`: a copy with only
    those changes. The loan moves by the part of a price change the down payment doesn't cover, so a
    percentage or fixed-dollar down payment and a directly entered loan all stay right, and with no
    change the copy equals the scenario. Every unit's rent scales together.
  - `evaluateVariant(variant)`: both measures (`cashFlowMonthly`, `cashOnCash`) or why they are n/a.
  - `rateRows`, `buildSensitivityGrid(scenario, options)`: the 5 × 5 grid (rates × price or rent
    change). Its center cell equals the Deal Analyzer exactly.
  - `maxAllowableOffer(scenario, target)`: the highest whole-dollar price that meets a target, by
    bisection (cash flow never rises with price, and for a Cash-on-Cash target of 0 or more neither
    does the return, so the passing prices are a prefix). Statuses: `found`, `unreachable`,
    `invalid`. `meetsTarget` is the one "does it meet the target" rule.
  - `resolveTarget`, `validateSensitivityTarget` (Cash-on-Cash 0–1000%, cash flow ±$1,000,000),
    `DEFAULT_SENSITIVITY` (8% and $300/mo).
- Moved to `shared-calculations` in spec 010 (still re-exported here): `validateRental`,
  `DEFAULT_RENTAL_ASSUMPTIONS`.

Import only from the package name (`'deal-analyzer-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test deal-analyzer-calculations`.
