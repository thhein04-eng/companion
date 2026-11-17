# Phase 1 Data Model: Feature Pages & Side Navigation

This feature adds **no new financial data**. It (a) redistributes the existing types across libraries, (b) splits the comparison result type, and (c) adds two small UI entities for navigation.

## 1. Type ownership after the split

### `shared-calculations` (scope:shared)

| Type | Change |
|---|---|
| `LoanScenario` | Unchanged shape, including the optional `rental?: RentalAssumptions \| null` slot (research R2). |
| `RentalAssumptions` | Unchanged shape. Data only: validation, defaults, and analysis are **not** here. |
| `DownPayment`, `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `PersistedState`, `MonthlyAnnual`, `RatioResult` | Unchanged; moved only. |
| `ScenarioComparison` | **Narrowed** to loan columns: `rows: { scenarioId; monthlyPayment; totalInterest; totalCost; payoffDate }[]`. |
| `ComparisonRow` | New alias for `ScenarioComparison['rows'][number]`, used as the base row type for column definitions. |

### `deal-analyzer-calculations` (scope:deal-analyzer)

| Type | Change |
|---|---|
| `OperatingExpenseCategory`, `OperatingExpenseLine`, `OnePercentRuleResult`, `FiftyPercentRuleResult`, `DealAnalysis` | Unchanged; moved out of shared. |
| `DealComparisonRow` | New: `ComparisonRow & { monthlyCashFlow: number \| null; annualNoi: number \| null; capRate: number \| null; cashOnCashReturn: number \| null }`. These are exactly the four fields removed from `ScenarioComparison`. |
| `DealScenarioComparison` | New: `{ scenarioIds: string[]; rows: DealComparisonRow[] }`. |

### `amortization-calculations` (scope:amortization)

No types of its own. It consumes `AmortizationSchedule` from shared.

**Invariant**: the union of `ScenarioComparison` loan rows and the `withDealMetrics` additions equals today's row object, field for field and value for value (FR-006).

## 2. Persisted scenario state (unchanged)

- Storage: `sessionStorage['amortization:scenarios']`, serialized `PersistedState { scenarios, activeScenarioId }`.
- The key and format stay as they are, so sessions saved before this change load unchanged (FR-003).
- There is now **one** owner, `ScenariosProvider` (`shared-data-access`), mounted in the root layout. Both pages read and write through it.
- Rental data survives on the Amortization page: that page never writes `rental`, and `applyScenarioPatch` already preserves fields that are not in the patch.

### Store API (shared `useScenarios()` return value)

| Member | Notes |
|---|---|
| `scenarios`, `activeScenarioId`, `activeScenario` | as today |
| `setActiveScenarioId(id)` | as today |
| `updateActiveScenario(patch: Partial<LoanScenario>)` | as today. This is the only write path for every field, including `rental`. |
| `addScenario()`, `removeScenario(id)` | as today; StrictMode-safe |
| ~~`updateActiveRental`~~ | **Removed from shared.** Replaced by `useRentalEditor()` in `deal-analyzer-ui`, which wraps `updateActiveScenario` and applies `DEFAULT_RENTAL_ASSUMPTIONS` on first rent entry. Same behavior as today. |

## 3. New UI entities

### NavItem

Defined in `shared-ui`. Instances are owned by the app in `app/_nav.ts`.

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | unique; used as the React key and `data-testid="nav-<id>"` |
| `label` | `string` | non-empty; this is the link's accessible name in every state |
| `href` | `` `/${string}` `` | an app route; also used for the active-state match (`pathname === href \|\| pathname.startsWith(href + '/')`) |
| `icon` | `ReactNode` (a rendered element, e.g. `<CalculatorIcon />`) | decorative only (always `aria-hidden`). An element, not a component, because the item list is passed from the server-rendered layout to the client menu and functions can't cross that boundary. |

App instances:

```text
[{ id: 'amortization',  label: 'Amortization Calculator', href: '/amortization',  icon: <CalculatorIcon /> },
 { id: 'deal-analyzer', label: 'Rental Deal Analyzer',    href: '/deal-analyzer', icon: <BuildingIcon /> }]
```

The icons are small inline SVG components in `shared-ui`, so no icon dependency is added.

### NavPreference

Owned by `useNavPreference()` in `shared-ui`.

| Field | Type | Default |
|---|---|---|
| `collapsed` | `boolean` | `false` |

- Storage: `localStorage['companion:nav']` = `JSON.stringify({ collapsed })`. Any read, write, or parse error falls back to the default without throwing.
- It only affects the docked (≥ 1024px) layout. The mobile drawer always opens fully expanded.

### Shell layout state machine

```text
Viewport ≥1024px:   Expanded ⇄ Collapsed            (toggle button; persisted)
Viewport <1024px:   DrawerClosed ⇄ DrawerOpen       (menu button / Esc / backdrop / pathname change)
Crossing to ≥1024px while DrawerOpen → DrawerClosed, docked shows the persisted state
```

`DrawerOpen` is never persisted. It always starts closed.
