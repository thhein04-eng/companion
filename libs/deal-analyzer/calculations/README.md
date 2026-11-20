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
- Refinance & BRRRR modeling (spec 014):
  - `analyzeCashOut(scenario, schedule)`: the new loan, payoff, net proceeds and new P&I, then
    cash left in the deal, capital recycled and cash-on-cash before and after. Works without a
    rental (down payment only, no cash-on-cash).
  - `analyzeRateDrop(scenario, schedule)`: keep vs. refinance the remaining balance: monthly P&I
    savings, the exact breakeven month (integer-cent arithmetic) and net savings over the
    remaining term. Never needs a rental.
  - `validateRefinance`, `resolveRefinanceAssumptions`, `DEFAULT_REFINANCE`
  - Reasons: `CASH_OUT_NO_ARV_REASON`, `REFINANCE_NO_RATE_REASON`, `REFINANCE_INVALID_REASON`,
    `RATE_DROP_PAID_OFF_REASON`, `NO_RENTAL_COC_REASON`, `ALL_CASH_RECOVERED_REASON`
  - Types: `ResolvedRefinanceAssumptions`, `CashOutProceeds`, `CashOutCapital`, `CashOutResult`,
    `CashOutAnalysis`, `RateDropBreakeven`, `RateDropResult`, `RateDropAnalysis`
  - Internal: `refinance-math.ts` (`newPayment`, `breakeven`, `balanceOwed`) is shared by both
    analyzers and is not exported. Monthly P&I is the cents-rounded payment, as in the schedule.
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
- Moved to `shared-calculations` in spec 010 (still re-exported here): `validateRental`,
  `DEFAULT_RENTAL_ASSUMPTIONS`.

Import only from the package name (`'deal-analyzer-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test deal-analyzer-calculations`.
