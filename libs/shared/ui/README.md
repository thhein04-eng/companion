# shared-ui

Presentational components and the app shell used by both features.

**Tags:** `scope:shared`, `type:ui`

**May depend on:** `scope:shared` libraries of type `ui`, `data-access`, or `calc`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- Formatters: `currency`, `percent1`, `percent2`, `dateMedium`, `formatIsoDate`, `orDash`
- Fields and widgets: `NumberField`, `DateField`, `ScenarioTabs`, `MetricBadge`, `MetricBadgeGroup`
- Form groups (hosted by the Edit deal sheet): `PropertyFields`, `DownPaymentField`, `LoanFields`,
  `TermField`, `MonthlyCostFields`, `RentalInputsPanel`, `GrowthFields`, `DerivedRow`
- Deal UI (spec 010): `DealStrip`, `DealSheet`, `DealSheetProvider`, `useDealSheet`, `ChipPopover`,
  `DealSentence`, `PaymentBar`, `FixInputsButton`, `InputsMessage`, `DealChangeToast`, the page
  profiles (`*_PROFILE`, `chipOrder`) and `dealPayment`
- Design system (`ds/`): `Button`, `Chip`, `Card`, `Kpi`, `KpiRow`, `Eyebrow`, `PageHeader`,
  `SectionHeader`, `Section`, `Sheet`, `Popover`, `SegmentedToggle`, `ToastRegion` / `showToast`,
  `Ripple`, `ThemeSwitcher`, `ThemePreferences`, `colorScheme`, table classes
- Styles: `shared-ui/styles/tokens.css` (import once in the app's global CSS)
- Spec 011:
  - The `DealStrip` renders as the app-level deal bar (`col-full`, above each page's header, in
    the `page-grid` main).
  - `SegmentedControl` (ds) is the shared segmented control.
  - `DateField` adds a calendar popup (ui-sdk `DatePicker`) beside its segmented input.
  - New icons: `PencilIcon`, `CalendarIcon`.
- `ComparisonGrid` (column-driven), `ComparisonColumn`, `LOAN_COMPARISON_COLUMNS`
- Shell: `AppShell`, `SideNav`, `NavItem`, `useNavPreference` (`localStorage['companion:nav']`), plus icons

Import only from the package name (`'shared-ui'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test shared-ui`.
