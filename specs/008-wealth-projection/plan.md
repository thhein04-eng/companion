# Implementation Plan: Multi-Year Projections & Wealth Accumulation Simulator

**Branch**: `008-wealth-projection` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-wealth-projection/spec.md`

## Summary

This feature adds a **Wealth Projection** page at `/wealth`, with its own nav entry, that projects a
rental from year 0 to a 1–30-year horizon. The default horizon is 10 years, with presets for 5 and
10.

**What it shows:**
- Each year's property value, loan balance and equity. Equity is split into initial equity, principal
  paid, market appreciation and forced appreciation.
- Cash flow and cumulative cash flow, mortgage interest, and 27.5-year straight-line depreciation on
  the building value.
- The resulting tax effect.
- Net worth (equity + cumulative cash flow), and net worth after tax.

**How it's presented:** a multi-year line chart (Net worth, Equity, Net worth after tax), a summary
for the horizon year, and a year-by-year table.

**Technical approach.**
- A new pure `projectWealth` sits on top of spec 005's `projectRental`, so the rental-year
  definitions are shared and the Deal Analyzer and this page always agree.
- The three growth rates are spec 005's existing stored fields. Four new optional assumptions live
  under `rental.wealth`.
- The UI is thin components in `deal-analyzer-ui`, using the existing `LineChart` and the
  `SegmentedOptions` from spec 006.
- The route file only renders `WealthView`.

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19, on Next.js 16.1 with the App Router (unchanged).

**Primary Dependencies**: No new packages. This feature uses `@companion/charts` (`LineChart`),
`@ui-sdk/react` (segmented control, button) via the existing wrappers, `shared-ui`
(`NumberField`, formatters, inputs) and Tailwind 4.

**Storage**: Client-side `sessionStorage` through `ScenariosProvider`, with an optional
`RentalAssumptions.wealth`. Everything else is derived.

**Testing**: Vitest (node) for `projectWealth` and `validateWealth`, with a cent-level reference
table and invariant tests. Playwright covers a new `wealth-projection.spec.ts`, run on a :3200 prod
build.

**Target Platform**: The same browsers as features 001–006.

**Project Type**: An Nx monorepo web app.

**Performance Goals**: The page updates within 1 s of a driver change (SC-003). The cost is at most
30 years of arithmetic on top of an existing `computeSchedule`, which is negligible.

**Constraints**: Cent-accurate output and the invariants SC-005. There is no horizontal page scroll
at 375 px. Invalid tax inputs never hide the pre-tax projection.

**Scale/Scope**: 1 route, about 2 calculation modules and about 5 UI modules.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | ✅ `projectWealth` and `validateWealth` are pure, with a cent-level reference table produced by the real engine. | ✅ Invariant tests are planned (equity parts, net worth − equity = cumulative cash flow, Σ depreciation ≤ basis), plus spec 005 agreement tests. |
| II. Thin apps, fat libs | ✅ The app route only renders `WealthView`, with logic in `deal-analyzer-*`. | ✅ Exports go through the libraries' `index.ts` only. |
| III. Client-side storage | ✅ `sessionStorage` only. | ✅ The fields are optional, and old sessions load with defaults. |
| IV. Accessible components | ✅ SDK segmented control, `NumberField` and `Button`. The chart has keyboard navigation and a data table. | ✅ The table has `<caption>` and scoped headers, and negatives are shown in text, not color alone. |
| V. Spec-driven delivery | ⚠️ The spec was written in this plan run (no separate `/speckit-specify`), with its choices under Assumptions. | ✅ The artifacts are complete. Next come `/speckit-tasks` and `/speckit-analyze`. |
| Stack constraints | ✅ No new projects or packages. | ✅ |

**Result**: PASS. Nothing needs justifying in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-wealth-projection/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ (wealth-calculations.md, wealth-ui.md)
└── tasks.md   (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/shared/calculations/src/lib/types.ts        # + WealthAssumptions, RentalAssumptions.wealth, FieldError keys
libs/shared/ui/src/lib/icons.tsx                 # + TrendingUpIcon

libs/deal-analyzer/calculations/src/lib/
├── project-wealth.ts / .spec.ts                 # NEW projectWealth, resolveWealthAssumptions, constants
├── validate-wealth.ts / .spec.ts                # NEW validateWealth
├── validate-rental.ts                           # exclude 'wealth' from numeric rental fields
└── types.ts                                     # + WealthYear, WealthProjection

libs/deal-analyzer/ui/src/lib/
├── wealth-view.tsx                              # NEW page view
├── wealth-assumptions-panel.tsx                 # NEW
├── wealth-summary.tsx                           # NEW
├── net-worth-chart.tsx                          # NEW (LineChart preset)
├── wealth-table.tsx                             # NEW
└── use-wealth-editor.ts                         # NEW (writes rental.wealth + growth fields)

apps/amortization-calculator/src/app/
├── wealth/page.tsx                              # NEW route
└── _nav.tsx                                     # + "Wealth Projection"

apps/amortization-calculator-e2e/src/wealth-projection.spec.ts   # NEW
```

**Structure Decision**: This feature uses the existing libraries only, with the same placement as
`/financing` (spec 006 amendment). `projectWealth` lives next to `projectRental`, which it
composes. A separate `wealth-*` library pair was considered and rejected. It would need a new Nx
scope that depends on `deal-analyzer-calculations`, which is new boundary configuration for no
gain at this size.

## Implementation order (for `/speckit-tasks`)

1. **Foundation**: the types, `TrendingUpIcon`, the `validate-rental` exclusion, then the `/wealth`
   route and nav with an empty `WealthView`.
2. **US1 (P1)**: `projectWealth` covering value, equity, cash flow and net worth, with its
   reference tests; then the chart, summary, table, horizon control and e2e.
3. **US2 (P2)**: forced appreciation, the growth inputs, "Use typical rates", and validation with
   its e2e.
4. **US3 (P3)**: depreciation, interest and tax effect, the after-tax line, tax validation, and
   their tests and e2e.
5. **Polish**: the full gate on :3200, the quickstart pass, an update to the spec 003 routes table,
   and the READMEs.

## Complexity Tracking

No constitution violations.
