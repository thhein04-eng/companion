# Implementation Plan: UI Polish — Deal Bar, Extra Payments, Metric Cards, Date Picker

**Branch**: `011-ui-polish` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-ui-polish/spec.md`

## Summary

This plan covers four presentation fixes on top of spec 010. There are no calculation or data
changes, except one display helper.

- **Deal bar (US1)**: The Deal Strip becomes an app-level bar above every page title, with a
  full-size primary "Edit deal" button. It uses a full-bleed `<main>` grid with the strip
  rendered first in each view, which is server-rendered and causes no layout shift (R1, R2).
- **Extra payments (US2)**: The card is rebuilt from `ds/` parts, using a shared
  `SegmentedControl` promoted from deal-analyzer-ui (R3).
- **Metric cards (US3)**: Cap rate, 1% Rule and 50% Rule move onto one `MetricCard`. The 1% Rule's
  headline uses a new pure `onePercentRatio` helper (R4).
- **Date picker (US4)**: `DateField` is rebuilt on ui-sdk `DatePicker` + `Calendar`, keeping typed
  entry (R5).

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js 16.1 with the App Router.

**Primary Dependencies**: Existing only: `@ui-sdk/react` (`DatePicker`, `Calendar`,
`SegmentedControl`, `Popover`), Tailwind 4 tokens, and `shared-ui/ds`. No new packages.

**Storage**: Unchanged (`sessionStorage` scenarios, `localStorage` theme).

**Testing**:
- Vitest: `onePercentRatio`, `MetricCard`, `SegmentedControl`, `DateField` with the calendar,
  and the extra-payment list.
- Playwright: update the strip, extra-payment and metric selectors, and add `deal-bar`,
  `extra-payments-ui`, `metric-cards` and `date-picker` specs.
- axe with the calendar open, in both themes.

**Target Platform / Project Type**: Nx monorepo, one Next.js web app.

**Performance Goals**: No change. The bar renders with the page (SSR), with no layout shift.

**Constraints**: The spec 010 visual rules (tokens only, FR-033 spacing, FR-035 contrast), WCAG AA,
no horizontal scroll at 360px or wider, and every calculation result unchanged.

**Scale/Scope**: About 12 UI files, 1 calculation helper, about 6 e2e specs touched and 4 added.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | PASS. No calculation changes. | PASS. The one new pure helper, `onePercentRatio`, gets a unit test. |
| II. Thin apps, fat libs | PASS. | PASS. Only `layout.tsx`'s `main` grid classes change in the app. Everything else is in libs. |
| III. Client-side storage | PASS. | PASS. Nothing new is stored. |
| IV. Accessible components | PASS, as long as the calendar uses the SDK. | PASS. `DatePicker` / `Calendar`, `SegmentedControl` and `Popover` are all ui-sdk, and axe covers the open calendar. |
| V. Spec-driven delivery | PASS. Specify and the clarification are done. | PASS. tasks.md comes next. |
| Stack | PASS. | PASS. No new dependencies. |

## Project Structure

### Documentation (this feature)

```text
specs/011-ui-polish/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
apps/amortization-calculator/src/app/layout.tsx       # <main> → full-bleed grid (R1)
libs/shared/ui/src/styles/tokens.css                  # @utility full-bleed grid + col-full helpers
libs/shared/ui/src/lib/
├── deal/deal-strip.tsx                               # bar layout + primary Edit deal (R2)
├── ds/segmented-control.tsx                          # NEW (moved from deal-analyzer-ui, R3)
├── date-field.tsx                                    # rebuilt on DatePicker (R5)
└── icons.tsx                                         # + PencilIcon, CalendarIcon
libs/amortization/ui/src/lib/
├── extra-payment-panel.tsx                           # rebuilt (R3)
└── amortization-calculator-view.tsx                  # DealStrip before PageHeader
libs/deal-analyzer/ui/src/lib/
├── metric-card.tsx                                   # NEW (R4)
├── deal-metrics.tsx · rule-indicator.tsx             # on MetricCard
├── segmented-options.tsx                             # re-export alias
└── *-view.tsx (4)                                    # DealStrip before PageHeader
libs/deal-analyzer/calculations/src/lib/rules.ts (+ .spec.ts)   # onePercentRatio
apps/amortization-calculator-e2e/src/*.spec.ts        # updated + new specs
```

**Structure Decision**: Existing libraries only. `SegmentedControl` moves to `shared-ui` so that
both feature libraries can use it without crossing module boundaries.

## Implementation order (for `/speckit-tasks`)

1. **Foundational**: the full-bleed `main` grid, the icons, the shared `SegmentedControl`, and
   `onePercentRatio` with its test.
2. **US1 (P1)**: the bar layout, reordering all 5 views, e2e for the bar (position on all pages,
   the button, tab order, sticky, 390px), and updating any test that relied on the old position.
3. **US2 (P1)**: the extra-payments card and list, plus e2e.
4. **US3 (P2)**: `MetricCard`, `DealMetrics` / `RuleIndicator`, plus e2e (equal heights, N/A).
5. **US4 (P2)**: `DateField` on `DatePicker`, plus unit tests and e2e (mouse, keyboard, Escape,
   inside the sheet, axe with the calendar open).
6. **Polish**: the full gate twice, visual review against the reference, and the quickstart pass.

## Complexity Tracking

No constitution violations.
