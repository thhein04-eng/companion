# shared-ui

Presentational components and the app shell used by both features.

**Tags:** `scope:shared`, `type:ui`

**May depend on:** `scope:shared` libraries of type `ui`, `data-access`, or `calc`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- Formatters: `currency`, `percent1`, `percent2`, `dateMedium`, `formatIsoDate`, `orDash`
- Fields and widgets: `NumberField`, `DateField`, `ScenarioTabs`, `MetricBadge`, `MetricBadgeGroup`
- Forms: `LoanInputForm`, `CostBreakdownPanel`
- `ComparisonGrid` (column-driven), `ComparisonColumn`, `LOAN_COMPARISON_COLUMNS`
- Shell: `AppShell`, `SideNav`, `NavItem`, `useNavPreference` (`localStorage['companion:nav']`), plus icons

Import only from the package name (`'shared-ui'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test shared-ui`.
