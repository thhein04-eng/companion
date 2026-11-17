# Contract: Module Boundaries

Each project's tags are set in the `nx.tags` field of its `package.json`. The root `eslint.config.mjs` replaces the current `sourceTag: '*' → '*'` wildcard with these rules:

```text
depConstraints:
  # Scope: features are isolated; shared knows no feature
  scope:app            → scope:shared, scope:amortization, scope:deal-analyzer
  scope:amortization   → scope:shared, scope:amortization
  scope:deal-analyzer  → scope:shared, scope:deal-analyzer
  scope:shared         → scope:shared

  # Type: logic below state below UI
  type:app             → type:ui, type:data-access, type:calc
  type:ui              → type:ui, type:data-access, type:calc
  type:data-access     → type:data-access, type:calc
  type:calc            → type:calc
  type:e2e             → (none)
```

| Project                         | Tags                               |
| ------------------------------- | ---------------------------------- |
| `amortization-calculator` (app) | `scope:app`, `type:app`            |
| `amortization-calculator-e2e`   | `scope:app`, `type:e2e`            |
| `shared-calculations`           | `scope:shared`, `type:calc`        |
| `shared-data-access`            | `scope:shared`, `type:data-access` |
| `shared-ui`                     | `scope:shared`, `type:ui`          |
| `amortization-calculations`     | `scope:amortization`, `type:calc`  |
| `amortization-ui`               | `scope:amortization`, `type:ui`    |
| `deal-analyzer-calculations`    | `scope:deal-analyzer`, `type:calc` |
| `deal-analyzer-ui`              | `scope:deal-analyzer`, `type:ui`   |

## Allowed dependency graph (expected `nx graph`)

```text
amortization-calculator ─┬─> amortization-ui ──┬─> amortization-calculations ─> shared-calculations
                         │                     └─> shared-ui, shared-data-access
                         ├─> deal-analyzer-ui ─┬─> deal-analyzer-calculations ─> shared-calculations
                         │                     └─> shared-ui, shared-data-access
                         ├─> shared-ui ─────────> shared-calculations
                         └─> shared-data-access ─> shared-calculations
```

There must be no edge between `amortization-*` and `deal-analyzer-*`.

## Verification

- `npm exec nx run-many -t lint` reports 0 boundary errors.
- Negative check (manual, not committed): adding `import { analyzeDeal } from 'deal-analyzer-calculations'` to any `amortization-*` or `shared-*` file makes lint fail with `@nx/enforce-module-boundaries`.
- `npm exec nx graph --file=output.json` contains no `amortization-* → deal-analyzer-*` or reverse dependency, and no `shared-* → feature` dependency.
