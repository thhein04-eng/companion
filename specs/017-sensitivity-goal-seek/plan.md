# Implementation Plan: Sensitivity Matrix and Max Allowable Offer

**Branch**: `017-sensitivity-goal-seek` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-sensitivity-goal-seek/spec.md`

## Summary

A new page, `/sensitivity`, with two parts, both built on the existing `analyzeDeal` so every figure
agrees with the Deal Analyzer to the cent.

- **Grid (US1)**: a pure `buildSensitivityGrid` recalculates the deal for each (rate, price-or-rent
  change) pair by building a variant scenario and running `analyzeDeal` on it. One run gives both
  measures, so switching the measure never recalculates (R1, R2). The page renders it as an ARIA
  grid with a diverging tint plus text cues (R5, R6).
- **Max Allowable Offer (US2)**: a pure `maxAllowableOffer` finds the highest whole-dollar price
  that meets the target by whole-dollar bisection over the same variant builder. The measure is
  monotone in price for the allowed targets, which is what makes bisection exact (R3, R4).
- **Page (US3)**: a `SensitivityView` in `deal-analyzer-ui` on the shared deal card, a route in the
  app, a nav item, a page profile and one new icon. The target is saved on the scenario's rental
  (`rental.sensitivity`) without an undo entry; "Use this price" is an ordinary undoable edit (R7).

No new dependencies, no change to any existing calculation.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js 16.1 with the App Router.

**Primary Dependencies**: Existing only: `@ui-sdk/react` (`SegmentedControl`, `NumberInput`),
`shared-ui/ds`, Tailwind 4 tokens, `shared-calculations` (`analyzeDeal`'s inputs, `computeSchedule`).
No new packages.

**Storage**: `sessionStorage` scenarios. One new optional field, `rental.sensitivity`
(`SensitivityAssumptions`); a rental without it uses the defaults. No migration. Grid display choices
(measure, column variable, steps) are page state, not stored (R7).

**Testing**:
- Vitest (Constitution I): `sensitivity.spec.ts` (ranges, variants, 25-cell grid vs. hand-entered
  deals, center equals `analyzeDeal`, floors, n/a cells, fixed-dollar and overridden-loan cases,
  rent rolls), `max-offer.spec.ts` (found / already meets / unreachable / found at the search cap, exact $1
  boundary over 50+ generated deals, PMI cliff, fixed-dollar down), `validate-sensitivity.spec.ts`,
  grid component and keyboard tests, persistence round-trip.
- Playwright: `sensitivity.spec.ts` (grid, measure and column toggles, steps, offer, Use this
  price + undo, missing-input messages, 390px, keyboard), plus the new route added to `a11y`,
  `deal-bar`, `deal-strip` (pinned fields) and `setup-mode` route lists, and axe in light and dark.

**Target Platform / Project Type**: Nx monorepo, one Next.js web app.

**Performance Goals**: 25 cells plus ~35 solver evaluations per input change, each one `computeSchedule` + `analyzeDeal`, memoized on the scenario. The cost per evaluation is to be confirmed by the timing tests in T010 and T016 (budget: a full grid or offer well under 100 ms) before relying on the 0.5 s page budget.

**Constraints**: Existing results unchanged (all current tests pass); spec 010/011 design rules
(tokens only, FR-035 contrast, spacing); WCAG AA; no horizontal page scroll at 360px.

**Scale/Scope**: 3 calculation files (+ specs), 1 type, ~6 UI files, 1 route, 1 nav item, 1 icon,
1 profile, 1 e2e spec and 4 small e2e list updates.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | PASS, if every new formula is a pure tested function reusing `analyzeDeal`. | PASS. `sensitivity.ts`, `max-offer.ts`, `validate-sensitivity.ts` are pure, framework-free, tested to the cent, including the exact $1 boundary and a center-equals-Deal-Analyzer check. No existing calculation changes. |
| II. Thin apps, fat libs | PASS. | PASS. The app gets only a 1-file route and a nav entry; the view, editor, grid and logic are in libs. |
| III. Client-side storage | PASS. | PASS. The target lives on the scenario in `sessionStorage`; nothing leaves the browser. |
| IV. Accessible components | PASS, if controls use the SDK. | PASS with one justified exception (Complexity Tracking): the SDK has no grid primitive, so the cells' arrow-key movement is a small tested hook. Controls use ui-sdk `SegmentedControl` and `NumberInput`; axe covers light and dark. |
| V. Spec-driven delivery | PASS. Spec written; clarify skipped with defaults as Assumptions. | PASS. tasks.md next; `/speckit-analyze` recommended. |
| Stack | PASS. | PASS. No new dependencies. |

## Project Structure

### Documentation (this feature)

```text
specs/017-sensitivity-goal-seek/
├── plan.md              # This file
├── research.md          # Phase 0 decisions R1–R8
├── data-model.md        # Phase 1 entities, formulas, validation
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── calculations.md  # Public calc API
│   └── ui.md            # Page and component contracts
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/shared/calculations/src/lib/
├── types.ts                      # + SensitivityAssumptions, RentalAssumptions.sensitivity
└── persistence.spec.ts           # + round-trip

libs/deal-analyzer/calculations/src/lib/
├── sensitivity.ts                # NEW: variants, ranges, buildSensitivityGrid
├── sensitivity.spec.ts           # NEW
├── max-offer.ts                  # NEW: maxAllowableOffer (bisection)
├── max-offer.spec.ts             # NEW
├── validate-sensitivity.ts       # NEW: target validation, defaults
└── validate-sensitivity.spec.ts  # NEW

libs/shared/data-access/src/lib/
└── deal-edits-provider.tsx       # + DealEditSource 'page' for "Use this price"

libs/shared/ui/src/lib/
├── icons.tsx                     # + GridIcon
├── use-grid-navigation.ts(x)     # NEW: roving-tabindex arrow keys (+ spec)
└── deal/page-profiles.ts         # + SENSITIVITY_PROFILE ('sensitivity' page id)

libs/deal-analyzer/ui/src/lib/
├── sensitivity-view.tsx          # NEW: the page
├── sensitivity-grid.tsx          # NEW: table, tint, cues, header tags (+ spec)
├── max-offer-card.tsx            # NEW: target controls + result (+ spec)
└── use-sensitivity-editor.ts     # NEW: saves the target without an undo entry

apps/amortization-calculator/src/app/
├── sensitivity/page.tsx          # NEW: route, 1 component
└── _nav.tsx                      # + Sensitivity item

apps/amortization-calculator-e2e/src/
├── sensitivity.spec.ts           # NEW
└── a11y / deal-bar / deal-strip / setup-mode specs  # route lists
```

**Structure Decision**: Existing Nx libraries only. The calculations sit in
`deal-analyzer-calculations` beside `analyzeDeal`/`analyzeSale`; the new rental field type sits in
`shared-calculations` with the other rental assumptions.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected |
|---|---|---|
| A hand-written `useGridNavigation` hook (roving tabindex, arrow/Home/End keys) | FR-008 needs cell-by-cell arrow keys on a read-only grid, and `@ui-sdk` has no grid or table primitive (its keyboard widgets are tabs, radio, menu, listbox, tree, calendar, toolbar). Constitution IV allows this when the SDK can't provide it. | A plain table without focusable cells: screen-reader users can navigate it, but sighted keyboard users can't read it cell by cell. Reusing the SDK calendar grid: it is date-specific. |

One cross-feature note: another in-progress feature (spec 014, `014-refinance-brrrr`, in its own
worktree) also adds a page, a nav item and a page profile. Merging both will conflict in
`_nav.tsx`, `page-profiles.ts`, `icons.tsx` and the e2e route lists. Those are mechanical, additive
merges, and this plan keeps each addition in its own block to make them easy.
