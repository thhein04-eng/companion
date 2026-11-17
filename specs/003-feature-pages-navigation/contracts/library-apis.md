# Contract: Library Public APIs

Each library exposes **only** its `src/index.ts`. An entry marked "moved" keeps its existing signature and behavior. Each symbol is defined in exactly one library (FR-012 / SC-005).

## shared-calculations (`libs/shared/calculations`) · `scope:shared`, `type:calc`

| Export | Status |
|---|---|
| Types: `LoanScenario`, `RentalAssumptions`, `DownPayment`, `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `PersistedState`, `MonthlyAnnual`, `RatioResult`, `ScenarioComparison` (narrowed), `ComparisonRow` | moved / see data-model |
| `roundCents` | moved |
| `validateScenario`, `ValidateScenarioResult` | moved |
| `computeSchedule` | moved |
| `calculatePrincipalFromHomePriceAndDownPayment` | moved |
| `applyScenarioPatch` | moved |
| `serializeScenarios`, `deserializeScenarios` | moved |
| `computeLtv(scenario): RatioResult` | moved from `analyze-deal.ts` (loan-only metric used by both pages) |
| `computeValidSchedules(scenarios: LoanScenario[]): { scenario: LoanScenario; schedule: AmortizationSchedule }[]` | **new**: extracted from the page's comparison loop |
| `compareScenarios(schedules: AmortizationSchedule[]): ScenarioComparison` | **changed**: the `analyses` argument and deal fields are removed |

## shared-data-access (`libs/shared/data-access`) · `scope:shared`, `type:data-access`

| Export | Notes |
|---|---|
| `ScenariosProvider({ children })` | Client component; the single owner of scenario state + `sessionStorage` sync |
| `useScenarios()` | Throws if used outside the provider. Return value is described in data-model §2 |

## shared-ui (`libs/shared/ui`) · `scope:shared`, `type:ui`

| Export | Status |
|---|---|
| `NumberField`, `DateField`, `ScenarioTabs`, `MetricBadge`, `MetricBadgeGroup` | moved |
| `ComparisonGrid<Row extends ComparisonRow>({ comparison: { rows: Row[] }, columns: ComparisonColumn<Row>[], scenarioNames })` | **changed**: column-driven |
| `ComparisonColumn<Row>` = `{ id; header; render(row: Row): string }` | new |
| `LOAN_COMPARISON_COLUMNS` | new; same headers and formatting as today |
| `LoanInputForm`, `CostBreakdownPanel` | moved from `apps/…/_components` |
| `currency`, `percent1`, `percent2` formatters | new home for the `Intl.NumberFormat` instances that are duplicated today in `page.tsx` and `comparison-grid.tsx` |
| `AppShell({ navItems, children })`, `SideNav({ items, collapsed })`, `NavItem`, `useNavPreference()` | new |
| `CalculatorIcon`, `BuildingIcon` | new; inline SVG |

## amortization-calculations (`libs/amortization/calculations`) · `scope:amortization`, `type:calc`

| Export | Status |
|---|---|
| `scheduleToCsv` | stays (everything else moves out) |

## amortization-ui (`libs/amortization/ui`) · `scope:amortization`, `type:ui`

| Export | Status |
|---|---|
| `ScheduleTable` | stays |
| `ExtraPaymentPanel`, `ExportScheduleButton` | moved from `apps/…/_components` |
| `AmortizationCalculatorView` | new; the amortization half of today's `page.tsx` |

## deal-analyzer-calculations (`libs/deal-analyzer/calculations`) · `scope:deal-analyzer`, `type:calc`

| Export | Status |
|---|---|
| `analyzeDeal`, `DEFAULT_RENTAL_ASSUMPTIONS` | moved |
| `validateRental` | moved |
| Types: `DealAnalysis`, `OperatingExpenseCategory`, `OperatingExpenseLine`, `OnePercentRuleResult`, `FiftyPercentRuleResult`, `DealComparisonRow`, `DealScenarioComparison` | moved / new |
| `withDealMetrics(comparison: ScenarioComparison, analyses: Record<string, DealAnalysis \| null>): DealScenarioComparison` | **new**: the deal half of the old `compareScenarios` |

## deal-analyzer-ui (`libs/deal-analyzer/ui`) · `scope:deal-analyzer`, `type:ui`

| Export | Status |
|---|---|
| `IncomeExpenseCard`, `RuleIndicator` | moved |
| `RentalInputsPanel` | moved from `apps/…/_components` |
| `DealMetrics({ analysis })` | new; extracted cap-rate + 1%/50% rule block (today inline in `page.tsx`) |
| `DEAL_COMPARISON_COLUMNS` | new; `[...LOAN_COMPARISON_COLUMNS, cashFlow, noi, capRate, coc]` |
| `useRentalEditor()` | new; moved `updateActiveRental` logic |
| `DealAnalyzerView` | new; the deal half of today's `page.tsx` |

## Deleted after the move

- `apps/amortization-calculator/src/app/_components/*` and `_hooks/*`, all relocated as listed above.
- The old single `page.tsx` body. It is replaced by the redirect.
