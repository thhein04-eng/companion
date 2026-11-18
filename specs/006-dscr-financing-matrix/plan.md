# Implementation Plan: DSCR & Financing Matrix

**Branch**: `006-dscr-financing-matrix` (worktree `.claude/worktrees/006-dscr-financing-matrix`) | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-dscr-financing-matrix/spec.md`

## Summary

This feature adds debt-coverage analysis to the Rental Deal Analyzer in two parts.

1. **DSCR card.** It shows annual NOI ÷ annual P&I for the scenario's own loan. The result is tested
   against an editable lender minimum: 1.25× by default, with presets for 1.15×, 1.20× and 1.25×.
   When the ratio falls below the minimum, the card flags it in red with text and an icon, and shows
   the monthly rent needed to reach the minimum.
2. **Financing matrix.** It compares a 30-year conventional loan, an ARM (initial period plus
   post-reset) and a DSCR commercial loan side by side. Each column shows loan amount, cash
   invested, P&I, PMI, monthly cash flow, cash-on-cash return and DSCR. A segmented toggle picks the
   structure in focus and shows its cash-flow breakdown. The terms default from the scenario until
   the investor edits them.

**Technical approach.**
- The payment formula moves into a shared `loan-math` module, along with a new closed-form
  remaining-balance function.
- The new pure functions are `computeDscr`, `defaultFinancingTerms`/`resolveFinancingTerms`,
  `validateFinancing` and `buildFinancingMatrix`. They live in `deal-analyzer-calculations` and are
  unit-tested to the cent against the reference table in research.md.
- The thin presentational components live in `deal-analyzer-ui` and are built on `@ui-sdk/react`'s
  segmented control.
- Three optional fields are added to the persisted `RentalAssumptions`, so no migration is needed.

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19, on Next.js 16.1 with the App Router (unchanged).

**Primary Dependencies**: No new packages. This feature uses the existing `@ui-sdk/react`
subpaths (`segmented-control` is new to the workspace, while `select`, `popover` and `button` are
already used), the existing `shared-ui` `NumberField`/formatters, and Tailwind 4.

**Storage**: Client-side `sessionStorage`, through the existing `ScenariosProvider`. The optional
`dscrMinimum`, `financing` and `financingSelection` fields are stored on `RentalAssumptions`.
Everything else is derived.

**Testing**: Vitest 5 (node) for the calculation libraries. Playwright for the new
`financing-matrix.spec.ts`. The regression baseline is the existing `compute-schedule`,
`analyze-deal` and e2e suites.

**Target Platform**: The same browsers as features 001–005.

**Project Type**: An Nx monorepo web app: one Next.js app plus feature and shared libraries.

**Performance Goals**: The matrix recomputes in under 100 ms (SC-003). It uses closed-form math, so
there are 4 payment and balance evaluations per render and no extra schedules.

**Constraints**: Cent-accurate output. Status is never conveyed by color alone. There is no
horizontal page scroll at 375 px. Matrix errors never block the existing analysis.

**Scale/Scope**: 3 loan structures per scenario, up to the existing scenario limit. About 4 new
calculation modules and 4 new UI modules.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | ✅ All the math is pure functions with cent-level reference tests (research reference table; contracts list the cases). | ✅ `loan-math` extraction is guarded by the unchanged `compute-schedule.spec.ts`. |
| II. Thin apps, fat libs | ✅ No app changes. Math goes in `deal-analyzer-calculations` and `shared-calculations`, UI in `deal-analyzer-ui`. | ✅ The new modules are exported only through the libraries' `index.ts`, with no deep imports. |
| III. Client-side, no server storage | ✅ Only the `sessionStorage` fields are added. | ✅ The fields are optional, and old sessions load with defaults (R12). |
| IV. Accessible components | ✅ The toggle and presets use the SDK `SegmentedControl`, and inputs use the existing `NumberField`/`Select`. | ✅ Red flags include text and an icon. The table uses `<caption>`, `scope` and `aria-current` (contracts/financing-ui.md). |
| V. Spec-driven delivery | ⚠️ `/speckit-specify` was not run separately. The spec was written in this plan run from the user's description, with the open choices recorded under Assumptions. | ✅ The spec, plan and design artifacts exist. Run `/speckit-clarify` if the assumptions need revisiting, then `/speckit-tasks` and `/speckit-analyze` before implementing. |
| Stack constraints | ✅ Nx, Next App Router, ui-sdk, Tailwind, Vitest and Playwright, with no new projects. | ✅ |

**Result**: PASS. Nothing needs justifying in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-dscr-financing-matrix/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 (R1–R12 + reference scenario)
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── dscr-financing-calculations.md
│   └── financing-ui.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
libs/shared/calculations/src/lib/
├── loan-math.ts                 # NEW monthlyPayment, remainingBalance (R5)
├── loan-math.spec.ts            # NEW
├── compute-schedule.ts          # uses loan-math (behavior unchanged)
└── types.ts                     # + FinancingOptionId, LoanTerms, ArmTerms, FinancingTerms,
                                 #   RentalAssumptions.{dscrMinimum,financing,financingSelection},
                                 #   FieldError keys

libs/deal-analyzer/calculations/src/lib/
├── dscr.ts / dscr.spec.ts                       # NEW computeDscr, resolveDscrMinimum, presets
├── financing.ts / financing.spec.ts             # NEW defaultFinancingTerms, resolveFinancingTerms
├── validate-financing.ts / .spec.ts             # NEW
├── financing-matrix.ts / .spec.ts               # NEW buildFinancingMatrix
├── analyze-deal.ts                              # + dscr field
├── with-deal-metrics.ts                         # + dscr column value
└── types.ts                                     # + DscrResult, FinancingPhase, FinancingOptionResult, FinancingMatrix

libs/deal-analyzer/ui/src/lib/
├── dscr-card.tsx                # NEW
├── financing-matrix.tsx         # NEW (toggle + table + narrow-screen dl)
├── financing-terms-editor.tsx   # NEW (selected option's fields + breakdown + reset)
├── use-financing-editor.ts      # NEW
├── rule-indicator.tsx           # status pill extracted for reuse
├── deal-metrics.tsx             # + DscrCard
├── deal-comparison-columns.ts   # + DSCR column
└── deal-analyzer-view.tsx       # + "Financing options" section

apps/amortization-calculator-e2e/src/
└── financing-matrix.spec.ts     # NEW (quickstart scenarios 2–6)
```

**Structure Decision**: This feature uses the existing Nx libraries only. The pure math sits next to
`analyzeDeal` in `deal-analyzer-calculations`, the shared amortization math in
`shared-calculations`, and the presentation in `deal-analyzer-ui`. `apps/amortization-calculator`
does not change, because `/deal-analyzer/page.tsx` already renders `DealAnalyzerView`.

## Implementation order (for `/speckit-tasks`)

1. **Foundation**: `loan-math` extraction, then the type additions in `shared-calculations`.
2. **US1 (P1)**: `computeDscr`, then `analyzeDeal.dscr` and `withDealMetrics`, then `DscrCard` and
   the comparison column, then the e2e for scenario 2.
3. **US2 (P2)**: defaults/resolve, then `buildFinancingMatrix`, then `FinancingMatrix` with the
   toggle and the narrow layout, then the e2e for scenarios 3 and 5.
4. **US3 (P3)**: `validateFinancing`, then `useFinancingEditor` and `FinancingTermsEditor` with
   reset, then the e2e for scenarios 4 and 6.
5. **Polish**: run the full lint/test/e2e on a :3200 prod build (see quickstart), plus the
   quickstart manual pass.

## Complexity Tracking

No constitution violations.
