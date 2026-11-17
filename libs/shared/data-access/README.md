# shared-data-access

The single session-scoped scenario store. Mounted once in the root layout so both pages share the same scenarios.

**Tags:** `scope:shared`, `type:data-access`

**May depend on:** `scope:shared` libraries of type `data-access` or `calc`. The rules are enforced by `@nx/enforce-module-boundaries`; see [module-boundaries.md](../../../specs/003-feature-pages-navigation/contracts/module-boundaries.md).

## Public API (`src/index.ts`)

- `ScenariosProvider`: owns scenario state and syncs it to `sessionStorage['amortization:scenarios']`; storage errors are ignored, so it keeps working in memory
- `useScenarios()`: returns scenarios, the active scenario, `updateActiveScenario`, `addScenario`, and `removeScenario`. Throws outside the provider.

Import only from the package name (`'shared-data-access'`), never from a deep path.

## Running unit tests

Run `npm exec nx -- test shared-data-access`.
