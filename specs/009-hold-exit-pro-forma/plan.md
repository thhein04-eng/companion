# Implementation Plan: Multi-Year Hold & Exit Pro Forma

**Branch**: `009-hold-exit-pro-forma` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-hold-exit-pro-forma/spec.md`

## Summary

This feature adds a **Hold & Exit Pro Forma** page at `/pro-forma`, with a "Hold & Exit" nav entry.
It models buying, holding for N years and selling. The hold period is 1–30 years, defaulting to 7,
with presets for 5, 7 and 10.

**What it shows:**
- The sale: the sale price is the property value in year N, minus selling costs (default 7%) and
  the remaining loan payoff, giving the net sale proceeds.
- Returns: annual IRR, total net profit and equity multiple, both pre-tax and after-tax.
  After-tax uses spec 008's depreciation (building value ÷ 27.5) and the interest tax effect, and
  is labelled "excludes tax on sale".
- A 5/7/10-year comparison.
- A year-by-year pro forma table with a sale row.

**Technical approach.**
- A pure `projectExit` builds on `projectWealth` (spec 008), which gains an optional
  horizon-override parameter. A small internal `operatingYear` helper is extracted so gross income
  and expenses past the loan term share one growth rule.
- A new pure `irr()` solver uses bracketed bisection.
- The growth rates are spec 005's shared fields, and land share and tax rate are spec 008's shared
  `rental.wealth` fields. Only the hold and selling costs are new, stored under `rental.exit`.
- The UI is thin components in `deal-analyzer-ui`, reusing `SegmentedOptions`, `NumberField` and
  the spec 008 page pattern.

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19, on Next.js 16.1 with the App Router.

**Primary Dependencies**: No new packages. Reuses `@ui-sdk/react` (via `SegmentedOptions`,
`Button`), `shared-ui` and Tailwind 4. There is no chart, because the description does not ask
for one; the comparison and pro forma tables carry the data.

**Storage**: `sessionStorage` through `ScenariosProvider`, with the optional `rental.exit`.

**Testing**: Vitest (node) for `irr`, `projectExit`, `validateExit` and the `projectWealth`
override. Playwright covers a new `pro-forma.spec.ts`, run on a :3200 prod build.

**Target Platform / Project Type**: As before: an Nx monorepo web app.

**Performance Goals**: Updates within 1 s (SC-003). The cost is at most 4 holds × 30 years plus 4
bisections of 200 iterations each, which is negligible.

**Constraints**: Cent accuracy. NPV at the IRR is within $0.01. There is no horizontal page scroll
at 375 px. Invalid tax inputs never hide the pre-tax results.

**Scale/Scope**: 1 route, about 3 calculation modules and about 5 UI modules.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | ✅ Pure `irr`, `projectExit` and `validateExit`, with a reference table produced by the real engine. | ✅ Textbook IRR vectors, an NPV-at-root check, the profit identity, and agreement with `projectWealth`. The `projectWealth` override keeps existing tests unchanged. |
| II. Thin apps, fat libs | ✅ The route only renders `ProFormaView`. | ✅ Exports go through the libraries' `index.ts`, and `operatingYear` stays internal. |
| III. Client-side storage | ✅ `sessionStorage` only. | ✅ The fields are optional, and old sessions take the defaults. |
| IV. Accessible components | ✅ SDK segmented control, `NumberField` and `Button`. | ✅ Tables have captions, scoped headers, `aria-current` on the chosen hold, and focusable scroll regions. |
| V. Spec-driven delivery | ⚠️ The spec was written in this plan run, with its choices under Assumptions. | ✅ The artifacts are complete. Next: `/speckit-tasks`, then `/speckit-analyze`. |
| Stack | ✅ No new projects or packages. | ✅ |

**Result**: PASS, with no Complexity Tracking entries.

## Project Structure

### Documentation

```text
specs/009-hold-exit-pro-forma/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ (exit-calculations.md, pro-forma-ui.md)
└── tasks.md   (/speckit-tasks)
```

### Source Code

```text
libs/shared/calculations/src/lib/types.ts         # + ExitAssumptions, RentalAssumptions.exit, FieldError keys
libs/shared/ui/src/lib/icons.tsx                  # + KeyIcon

libs/deal-analyzer/calculations/src/lib/
├── irr.ts / irr.spec.ts                          # NEW
├── project-exit.ts / .spec.ts                    # NEW projectExit, compareHolds, constants
├── validate-exit.ts / .spec.ts                   # NEW validateExit, resolveExitAssumptions, DEFAULT_EXIT
├── project-wealth.ts                             # + options.horizonYears override
├── rental-line-items.ts                          # + internal operatingYear (used by wealth + exit)
├── validate-rental.ts                            # exclude 'exit' from numeric rental fields
└── types.ts                                      # + ProFormaYear, ExitReturns, ExitResult, ExitProjection

libs/deal-analyzer/ui/src/lib/
├── pro-forma-view.tsx                            # NEW
├── exit-assumptions-panel.tsx                    # NEW
├── exit-summary.tsx                              # NEW
├── hold-comparison-table.tsx                     # NEW
├── pro-forma-table.tsx                           # NEW
└── use-exit-editor.ts                            # NEW (rental.exit, growth, example rates, rental.wealth tax fields)

apps/amortization-calculator/src/app/pro-forma/page.tsx   # NEW
apps/amortization-calculator/src/app/_nav.tsx             # + "Hold & Exit"
apps/amortization-calculator-e2e/src/pro-forma.spec.ts    # NEW
```

**Structure Decision**: This uses the existing `deal-analyzer-*` libraries, the same placement as
`/financing` and `/wealth`. `projectExit` composes `projectWealth` instead of duplicating it.

## Implementation order (for `/speckit-tasks`)

1. **Foundation**: the types, `KeyIcon`, the `validate-rental` exclusion, the route and nav, the
   `projectWealth` override, and the `operatingYear` extraction (existing tests stay green).
2. **US1**: `irr`, `validateExit` and `projectExit` (pre-tax), plus `compareHolds`; then the exit
   summary, comparison table, hold and selling inputs, and e2e.
3. **US2**: the growth inputs, example rates, the pro forma table with its sale row, extra
   principal handling, and e2e.
4. **US3**: the after-tax rows and returns, the tax inputs, and e2e.
5. **Polish**: the SC-003 timing test, the full gate on :3200, the quickstart pass, the spec 003
   routes table and the READMEs.

## Complexity Tracking

No constitution violations.
