# Implementation Plan: Feature Pages & Side Navigation

**Branch**: `003-feature-pages-navigation` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-feature-pages-navigation/spec.md`

**Worktree**: `.claude/worktrees/003-feature-pages-navigation` (all work for this feature happens here)

## Summary

Split today's single page into `/amortization` and `/deal-analyzer`, with `/` redirecting to `/amortization`. Both pages sit inside an `AppShell` with a responsive left menu. On desktop the menu is docked and collapses to an icon rail, and the choice is remembered. On mobile it is an off-canvas ui-sdk `Drawer`. In the codebase, the two existing libraries are reorganized into **shared / amortization / deal-analyzer** scopes, each split into `calc` and `ui` libraries, plus a `shared-data-access` lib for the single scenario store. Nx tags and `@nx/enforce-module-boundaries` enforce the split. Everything both features use exists once, in shared libs. That includes the scenario model and math, persistence, the store, fields, tabs, badges, the loan and cost forms, a column-driven comparison grid, and the shell. The deal analyzer only adds its own pieces on top (`withDealMetrics`, `DEAL_COMPARISON_COLUMNS`, `useRentalEditor`). No formula, rounding, validation message, or persisted format changes.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js ~16.1 (App Router)

**Primary Dependencies**: Nx 24 (`@nx/next`, `@nx/react`, `@nx/js`, `@nx/workspace` move generator), `@ui-sdk/react@0.1.0-beta.1` (`drawer`, `tooltip`, `button`, plus the existing `tabs`/`field`/`popover`), Tailwind CSS v4. No new runtime dependencies.

**Storage**: `sessionStorage['amortization:scenarios']` (unchanged) for scenarios; `localStorage['companion:nav']` for the menu-collapsed UI preference only

**Testing**: Vitest (moved calc specs, plus new specs for `computeValidSchedules`, `withDealMetrics`, `useNavPreference`); Playwright e2e (retargeted existing suites + new `navigation.spec.ts`)

**Target Platform**: Modern evergreen browsers (Chromium, Firefox, WebKit), widths 320px and up

**Project Type**: Nx monorepo web app (one Next.js app + seven libs)

**Performance Goals**: Unchanged from specs 001/002 (input → updated figures < 1s). Page-to-page navigation is client-side with no full reload.

**Constraints**: Identical calculation output (FR-006); same persisted format (FR-003); zero cross-feature imports (FR-011); WCAG-style keyboard/ARIA behavior for the menu (FR-008/009)

**Scale/Scope**: 2 feature pages, 7 libs (2 moved, 5 generated), ~20 files moved, ~10 new files

## Constitution Check

_GATE: evaluated before Phase 0 and re-checked after Phase 1._

| Principle                                                        | Pre-research | Post-design | Evidence                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Calculation correctness                                       | ✅           | ✅          | Pure functions are moved, not rewritten. Existing specs move with them and keep their expected values. The new pure functions (`computeValidSchedules`, `withDealMetrics`, narrowed `compareScenarios`) get unit tests derived from the existing compare-scenarios vectors (research R3).                           |
| II. Thin apps, fat libs                                          | ✅           | ✅          | App keeps only `layout.tsx`, 3 route files, `not-found.tsx`, `_nav.ts`. Forms, hooks, and page composition move into libs (research R5; contracts/library-apis). Boundary rules are tightened from a wildcard to scope/type constraints (contracts/module-boundaries).                                              |
| III. Client-side, no server storage                              | ✅           | ✅          | No server storage. Scenarios stay in `sessionStorage`. The `localStorage` nav preference is non-financial UI state, as stated in the spec's Assumptions and research R7.                                                                                                                                            |
| IV. Accessible interactive components                            | ✅           | ✅          | Mobile menu uses ui-sdk `Drawer` (focus trap, Esc, restore). Tooltip and button come from ui-sdk. The docked toggle uses `aria-expanded`/`aria-controls`, links use `aria-current`. `navigation-menu` was rejected for a documented reason: it is a flyout pattern that doesn't fit a flat link list (research R6). |
| V. Spec-driven delivery                                          | ✅           | ✅          | spec → plan (this) → tasks → implement. Constitution Check is done before and after design. Recommend `/speckit-analyze` before implement (3 user stories).                                                                                                                                                         |
| Stack: generators                                                | ✅           | ✅          | `@nx/workspace:move` for existing libs, `@nx/js:lib` / `@nx/react:lib` for new libs (research R8)                                                                                                                                                                                                                   |
| Stack: Next App Router / ui-sdk / Tailwind / Vitest / Playwright | ✅           | ✅          | No deviation                                                                                                                                                                                                                                                                                                        |
| Gates: lint, test, e2e, quickstart                               | —            | ✅ planned  | quickstart.md §1–4                                                                                                                                                                                                                                                                                                  |

**Result**: PASS. No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-feature-pages-navigation/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── routes-and-navigation.md
│   ├── library-apis.md
│   └── module-boundaries.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
apps/amortization-calculator/src/app/
├── layout.tsx                  # <ScenariosProvider><AppShell navItems={NAV_ITEMS}>…
├── page.tsx                    # redirect('/amortization')
├── not-found.tsx
├── _nav.ts                     # NAV_ITEMS (the only place to add a 3rd feature, FR-013)
├── amortization/page.tsx       # metadata + <AmortizationCalculatorView/>
├── deal-analyzer/page.tsx      # metadata + <DealAnalyzerView/>
└── global.css                  # @source globs for libs/**/ui/src
   (removed: _components/, _hooks/)

libs/
├── shared/
│   ├── calculations/   shared-calculations   types, round, validate-scenario, compute-schedule,
│   │                                         calculate-principal, apply-scenario-patch, persistence,
│   │                                         ltv, compute-valid-schedules, compare-scenarios (loan)
│   ├── data-access/    shared-data-access    scenarios-provider.tsx (useScenarios)
│   └── ui/             shared-ui             number-field, date-field, scenario-tabs, metric-badge,
│                                             comparison-grid (+ LOAN_COMPARISON_COLUMNS), formatters,
│                                             loan-input-form, cost-breakdown-panel,
│                                             app-shell, side-nav, use-nav-preference, icons
├── amortization/
│   ├── calculations/   amortization-calculations   export-schedule          (moved lib, slimmed)
│   └── ui/             amortization-ui             schedule-table, extra-payment-panel,
│                                                   export-schedule-button, amortization-calculator-view
└── deal-analyzer/
    ├── calculations/   deal-analyzer-calculations  analyze-deal, validate-rental, with-deal-metrics, types
    └── ui/             deal-analyzer-ui            income-expense-card, rule-indicator, rental-inputs-panel,
                                                    deal-metrics, deal-comparison-columns,
                                                    use-rental-editor, deal-analyzer-view

apps/amortization-calculator-e2e/src/
├── (existing specs)            # goto('/') → '/amortization' or '/deal-analyzer'
└── navigation.spec.ts          # new: redirect, collapse+persist, mobile drawer, aria-current, state retention
```

**Structure Decision**: Nx "scope × type" libraries (research R1). The Nx app project keeps its name, `amortization-calculator`, to avoid CI/e2e churn (spec Assumptions).

## Implementation Order (input for `/speckit-tasks`)

1. **Libs & boundaries.** Move `amortization-calculations` → `libs/amortization/calculations` and `amortization-ui` → `libs/amortization/ui`, then generate the 5 new libs. Add tags and the eslint `depConstraints`. Run `npm install`. Wire up `next.config.js` `transpilePackages`, app `tsconfig` references, and `global.css` `@source`.
2. **Shared calc.** `git mv` the shared pure functions and their specs. Extract `computeLtv` and `computeValidSchedules`. Narrow `compareScenarios`. All tests stay green.
3. **Deal calc.** Move `analyze-deal`, `validate-rental` and the deal types. Add `withDealMetrics`, with the deal assertions moved out of the old compare spec.
4. **Shared data-access.** `ScenariosProvider`/`useScenarios`, minus `updateActiveRental`.
5. **Shared UI.** Move the fields, tabs, badges, `LoanInputForm` and `CostBreakdownPanel`. Make `ComparisonGrid` column-driven. Add the formatters.
6. **Feature UIs.** Amortization: schedule table, extra payments, export, and the view. Deal: rental panel, `useRentalEditor`, `DealMetrics`, deal columns, and the view.
7. **Shell & routes.** `AppShell`, `SideNav`, `useNavPreference`, icons, layout, redirect, route pages, not-found.
8. **E2E.** Retarget the existing suites and add `navigation.spec.ts`.
9. **Gates.** lint, test, e2e, quickstart §1–4.

Steps 2–3 and 5–6 can be done in parallel per scope once step 1 is done. Step 7 can be done in parallel with step 6.

## Complexity Tracking

No violations. Nothing to justify.
