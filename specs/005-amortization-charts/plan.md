# Implementation Plan: Amortization Charts

**Branch**: `005-amortization-charts` (worktree `.claude/worktrees/005-amortization-charts`) | **Date**: 2026-11-16, re-planned 2026-11-17 after `/speckit-clarify` | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-amortization-charts/spec.md`

## Summary

This feature adds seven charts to the calculator in total.

**Amortization charts:**
- A remaining-balance line, with an extra-payment baseline.
- Yearly principal vs. interest columns.
- A monthly-payment composition bar.
- A multi-scenario balance comparison.

**Rental charts** (spec US6, added by clarification), for the full loan term:
- Yearly cash flow (NOI, debt service and cash flow).
- Equity build-up (initial equity, principal paid and appreciation).
- Cash-on-cash return per year.

The rental charts are driven by three new optional growth inputs (rent, expenses and
appreciation, each defaulting to 0%).

Each chart sits next to the content it explains (FR-014). The charts are built so any app or
library in the workspace can import and reuse them (clarified meaning of "reimportable").

The technical approach has three layers:

1. A **new, domain-free `libs/charts` library** (`@companion/charts`). It contains hand-rolled,
   zero-dependency SVG React primitives (`LineChart`, `StackedBarChart`, `SegmentedBar`) and the
   chart chrome they share: frame, legend, tooltip, data table, keyboard hook and theme tokens.
2. **Pure dataset builders** in `amortization-calculations`, unit-tested to the cent. This
   includes `projectRental`, which shares its line-item logic with `analyzeDeal`, so year 1 matches
   the Deal Analyzer exactly.
3. **Thin preset components** in `amortization-ui`.

Nx tags plus `enforce-module-boundaries` make sure the generic library can never depend on loan
code. Colors come from the workspace's validated data-viz palette, with dark-mode steps selected
for the dark surface.

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19 (same as the workspace). Next.js 16.1 App Router.

**Primary Dependencies**: No new third-party packages. Charts are hand-rolled SVG (research R1).
`@ui-sdk/react/collapsible` is used for the "Show data" toggle. Tailwind 4 handles layout, and CSS
custom properties handle chart color.

**Storage**: Chart data is derived in the browser and never persisted. The only persisted change
is three **optional** fields on `RentalAssumptions` (`rentGrowthPct`, `expenseGrowthPct` and
`appreciationPct`) in the existing `sessionStorage` state. Older sessions without these fields load
as 0% with no migration (research R14).

**Testing**: Vitest 5 for the builders and the pure helpers (node). Vitest with jsdom and Testing
Library for the generic chart render tests, which use non-amortization fixtures. Playwright covers
a new `charts.spec.ts`.

**Target Platform**: The same browsers as feature 001 (Chrome/Edge/Firefox 111+, Safari 16.4+).
Relies on `ResizeObserver`, which all of them support.

**Project Type**: Nx monorepo web app. This feature adds one library (`libs/charts`) and extends two
existing libraries and the app.

**Performance Goals**: A 360-period schedule re-renders all four charts inside the existing
< 1 s input-to-render budget (001 SC-005). The target is < 16 ms of chart render work. No
downsampling is needed (research R9).

**Constraints**: There is no dual axis. Hues come in a fixed slot order and are never cycled
beyond 8. Every chart has a keyboard path and a data table. There is no layout shift before the
container is measured. The design must work at a 375px width.

**Scale/Scope**: 7 charts (including the scenario comparison), 3 generic primitives plus chrome (with signed
data support), 6 pure builders (5 amortization plus `projectRental`), 7 presets plus `ChartNote`,
3 page insertion points, 3 new form inputs, and about 22 new source files plus 6 edited ones.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | How it is met |
|---|---|---|
| I. Calculation correctness | ✅ | All chart data comes from pure builders in `amortization-calculations` with cent-level tests on reference scenarios R1–R4 and D1 (contracts/amortization-chart-data.md, contracts/rental-chart-data.md). `analyzeDeal` is refactored to share `rentalLineItems`, and its existing spec must pass **unchanged**. Growth validation and the old-session load are tested. Charts do no math beyond pixel scaling. |
| II. Thin apps, fat libs | ✅ | The app adds only `charts-section.tsx`, which is composition. Logic lives in the libs. New Nx tags plus `depConstraints` enforce `scope:shared` ↛ `scope:amortization` (research R4), which makes the existing boundary rule stricter. |
| III. Client-side, no server storage | ✅ | No server and no network calls. The three growth inputs persist only to the existing `sessionStorage` state, which is the constitution's default. |
| IV. Accessible interactive components | ✅ with a note | The "Show data" toggle uses `@ui-sdk/react/collapsible`, and the growth inputs use the existing `@ui-sdk` `NumberField`. Arrow-key stepping through a plot's data points is a composite widget that the SDK does not provide, so it is custom. See Complexity Tracking. |
| V. Spec-driven delivery | ✅ | `spec.md` was written during the first plan run and then clarified on 2026-11-17 (5 questions). This plan was regenerated from the clarified spec. The existing `tasks.md` is now stale and must be regenerated with `/speckit-tasks`. |
| Stack: Nx generators | ✅ | `libs/charts` is created with `nx g @nx/react:library` (research R3), not assembled by hand. |
| Stack: Vitest + Playwright | ✅ | Both are used, as listed above. |

**Gate result**: PASS. There are no unjustified violations.

**Post-design re-check (after Phase 1, re-planned)**: PASS.
- The design still adds exactly one library, with no runtime dependencies beyond React and
  `@ui-sdk/react`.
- The rental projection is a pure function that shares code with `analyzeDeal`, so nothing is
  duplicated.
- Three optional persisted fields stay within the `sessionStorage` default.
- The app changes are three composition components plus three form fields.
- The only deviation is still the custom keyboard navigation, which is justified below.

## Project Structure

### Documentation (this feature)

```text
specs/005-amortization-charts/
├── spec.md                 # written during this run (see Constitution V)
├── plan.md                 # this file
├── research.md             # Phase 0
├── data-model.md           # Phase 1
├── quickstart.md           # Phase 1
├── contracts/
│   ├── charts-api.md                     # @companion/charts public API
│   ├── amortization-chart-data.md        # pure builders + required tests
│   ├── rental-chart-data.md              # growth inputs + projectRental + required tests
│   └── amortization-chart-components.md  # presets, placement, growth-input UI
└── tasks.md                # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
libs/
├── charts/                                  # NEW: @companion/charts, tags scope:shared,type:ui
│   ├── package.json                         # exports "." and "./theme.css"
│   └── src/
│       ├── index.ts                         # the only public entry point
│       ├── theme.css                        # --chart-* tokens, light + dark
│       └── lib/
│           ├── types.ts                     # SeriesSlot, ColorToken, SeriesDef, Datum, SegmentDef
│           ├── scales.ts  (+ .spec.ts)      # linearScale, bandScale, niceTicks, yExtent
│           ├── paths.ts   (+ .spec.ts)      # linePath, roundedTopRect
│           ├── format.ts  (+ .spec.ts)      # formatCompactCurrency, capSeries
│           ├── use-element-width.ts
│           ├── use-plot-keyboard.ts
│           ├── chart-frame.tsx  legend.tsx  chart-tooltip.tsx  chart-data-table.tsx
│           ├── line-chart.tsx        (+ .spec.tsx)
│           ├── stacked-bar-chart.tsx (+ .spec.tsx)   # signed stacking
│           └── segmented-bar.tsx     (+ .spec.tsx)
├── amortization-calculations/src/lib/
│   ├── chart-data.ts (+ chart-data.spec.ts) # NEW: 4 builders + computeBaselineSchedule
│   ├── project-rental.ts (+ .spec.ts)       # NEW: projectRental, growthRates
│   ├── analyze-deal.ts                      # refactor: uses rentalLineItems; defaults += growth 0
│   ├── rental-line-items.ts                 # NEW internal (not re-exported): shared expense lines
│   ├── validate-rental.ts (+ spec)          # growth fields −10…25
│   ├── types.ts                             # RentalAssumptions += 3 optional; RentalYear, RentalProjection
│   └── persistence.spec.ts                  # + old-session test (no code change)
└── amortization-ui/src/lib/charts/          # NEW: presets
    ├── balance-chart.tsx
    ├── principal-interest-chart.tsx
    ├── payment-composition-bar.tsx
    ├── scenario-balance-chart.tsx
    ├── rental-cash-flow-chart.tsx
    ├── equity-build-up-chart.tsx
    ├── cash-on-cash-chart.tsx
    └── chart-note.tsx                       # titled N/A placeholder

apps/
├── amortization-calculator/src/app/
│   ├── _components/charts-section.tsx       # NEW: loan charts (insertion 1)
│   ├── _components/rental-charts-section.tsx # NEW: rental charts (insertion 2)
│   ├── _components/rental-inputs-panel.tsx  # + Growth assumptions fields
│   ├── page.tsx                              # 3 insertions; comparison memo returns schedules
│   └── global.css                            # +@import theme.css, +@source libs/charts
└── amortization-calculator-e2e/src/charts.spec.ts  # NEW

eslint.config.mjs                             # depConstraints by scope tag
libs/*/package.json, apps/*/package.json      # nx.tags; "@companion/charts": "*"
```

**Structure Decision**: The work is split across three layers so that "reusable and reimportable"
holds at each level.

- `@companion/charts` is generic and can be used by any app or lib. This feature's own rental
  charts are a second domain using the same primitives, and future pages from feature 003 can use
  it too.
- `amortization-calculations` holds the tested data shaping.
- `amortization-ui` holds presets that are ready to drop into a page.

The app only places presets on the page.

## Implementation Notes

- **Order**:
  1. Generate `libs/charts` and add the tags and lint constraints.
  2. Write the pure helpers and their tests.
  3. Build the generic components (including signed stacking and `'auto'` y-domain) and their
     render tests.
  4. Write the amortization builders and their cent tests.
  5. Do the rental work: the type, validation and defaults; refactor `analyzeDeal` and confirm its
     spec still passes; then `projectRental` and its tests.
  6. Build the presets.
  7. Add the three app insertion points and the growth inputs.
  8. Write the e2e tests.
  9. Run the quickstart.
- Before running `nx g @nx/react:library`, check its flags with `--help`, as CLAUDE.md requires.
  Then run `npm install` to link the workspace package.
- Keep the `page.tsx` diff small. Feature 003 (navigation) and feature 004 (schedule pagination)
  are in progress on other branches that start from the same commit (research R10).
- Data-viz checklist for implementation:
  - 2px lines, and columns no wider than 24px with a 4px rounded top.
  - 2px gaps between segments and hairline grids.
  - Text uses ink tokens, never series colors.
  - Show a legend when there are 2 or more series.
  - Render the charts and take light and dark screenshots before calling the work done.

## Complexity Tracking

| Violation / deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Custom keyboard and ARIA handling for chart point navigation (`usePlotKeyboard`), not built on `@ui-sdk/react` (Constitution IV says SHOULD) | `@ui-sdk/react` 0.1.0-beta.1 has no chart, data-grid-cell or point-navigation primitive. Its closest fit, Slider, has value-editing semantics that are wrong for read-only data. | Using Slider would make screen readers announce an editable control. Leaving keyboard support out would fail FR-008. The hook is small, isolated, and covered by render tests. |
| Hand-rolled scales and paths instead of a charting library | It keeps `@companion/charts` free of runtime dependencies, so it is easy to re-import, and it gives full control over the mark specs. | Recharts and visx add weight and need many overrides (research R1). |
