# amortization-calculations

Pure functions that only the Amortization Calculator needs.

**Tags:** `scope:amortization`, `type:calc`

**May depend on:** `type:calc` libraries in `scope:shared` or `scope:amortization`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- `scheduleToCsv`

Import only from the package name (`'amortization-calculations'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test amortization-calculations`.
