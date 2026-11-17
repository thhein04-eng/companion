# amortization-ui

The Amortization Calculator page (`/amortization`) and its own components.

**Tags:** `scope:amortization`, `type:ui`

**May depend on:** `scope:shared` or `scope:amortization` libraries of type `ui`, `data-access`, or `calc`. **Never** `deal-analyzer-*`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- `AmortizationCalculatorView`
- `ScheduleTable`, `ExtraPaymentPanel`, `ExportScheduleButton`

Import only from the package name (`'amortization-ui'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test amortization-ui`.
