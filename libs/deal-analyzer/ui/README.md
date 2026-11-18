# deal-analyzer-ui

The Rental Deal Analyzer page (`/deal-analyzer`) and its own components.

**Tags:** `scope:deal-analyzer`, `type:ui`

**May depend on:** `scope:shared` or `scope:deal-analyzer` libraries of type `ui`, `data-access`, or `calc`. **Never** `amortization-*`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- `DealAnalyzerView`
- `RentalInputsPanel`, `IncomeExpenseCard`, `RuleIndicator`, `DealMetrics`
- `DEAL_COMPARISON_COLUMNS` (loan columns plus deal columns)
- `useRentalEditor()`: rental edits through the shared store, seeding defaults on first rent entry
- DSCR & financing matrix (spec 006):
  - `DscrCard`, `FinancingMatrix`, `FinancingTermsEditor`
  - `StatusPill`, `SegmentedOptions`, `formatDscr`
  - `useFinancingEditor()`: minimum DSCR, structure selection, term edits and reset
  - `FinancingView` (the `/financing` page)
- Wealth projection (spec 008):
  - `WealthView` (the `/wealth` page)
  - `WealthAssumptionsPanel`, `WealthSummary`, `NetWorthChart`, `WealthTable`
  - `useWealthEditor()`: wealth assumptions, shared growth rates and typical rates
  - `RentalInputsPanel` gains `hideGrowth`

Import only from the package name (`'deal-analyzer-ui'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test deal-analyzer-ui`.
