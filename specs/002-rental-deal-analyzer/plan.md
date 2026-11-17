# Implementation Plan: Rental Property Deal Analyzer

**Branch**: `002-rental-deal-analyzer` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-rental-deal-analyzer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

This feature extends the existing client-side amortization calculator into an investor "Deal Analyzer". The investor enters rent and operating assumptions (vacancy, management, maintenance, and CapEx as % of gross scheduled income, plus closing costs and rehab). The tool then computes NOI, year-1 pre-tax cash flow, Cash-on-Cash Return, Cap Rate, LTV, and the 1% and 50% rule-of-thumb checks. Property tax, insurance, and HOA are reused from the existing real-estate cost inputs and counted once, as operating expenses. Debt service is P&I plus PMI only.

The approach is a new pure module, `analyzeDeal()`, in `libs/amortization-calculations`, consuming the existing `computeSchedule()` output. One additive field is needed: `summary.monthlyPmiAmount`. New presentational components go in `libs/amortization-ui`: `MetricBadge` (LTV and CoC side by side), `IncomeExpenseCard`, and `RuleIndicator`, with a popover for the explanations. The app gets one new input panel. There is no backend, and state stays in the existing `sessionStorage` scenario store.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.9+, React 19 (inherited from 001)

**Primary Dependencies**: Next.js App Router, Nx (`@nx/next`), `@ui-sdk/react` 0.1.0-beta.1 (`popover`, `tabs`), Tailwind CSS. No new dependencies.

**Storage**: `sessionStorage` only, via the existing `serializeScenarios`/`deserializeScenarios`, extended with an optional `rental` field (research R7)

**Testing**: Vitest for `analyze-deal.spec.ts` and `validate-rental.spec.ts` (reference vectors A–F); Playwright for a new `deal-analyzer.spec.ts`. All 001 specs must still pass as a regression guard.

**Target Platform**: Modern evergreen browsers (Next.js baseline), same as 001

**Project Type**: Web application. This extends the existing Nx monorepo: 1 app and 2 libs, no new projects.

**Performance Goals**: Badges, card, and indicators update in under 1 s after any input change (SC-003). `analyzeDeal` is O(12) on top of the existing O(n) schedule, so the cost is negligible.

**Constraints**: No server storage (Constitution III); keyboard, ARIA, and touch-accessible rule explanations (Constitution IV); cent-accurate dollar figures and ratios within 0.01 points (SC-001); no regression in the non-investor flow (SC-005)

**Scale/Scope**: 4 user stories (P1 ×2, P2, P3); ~2 new lib modules, 3 new UI components, 1 new app panel, 3 extended exports

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | How this plan complies |
| --------- | ------ | ---------------------- |
| I. Calculation correctness | ✅ | All deal math lives in pure functions (`analyzeDeal`, `computeLtv`, `validateRental`) with cent-level reference vectors A–F that must exist before the feature counts as done. The `computeSchedule` change is additive and covered by the existing tests plus a new `monthlyPmiAmount` assertion. |
| II. Thin apps, fat libs | ✅ | The math is in `libs/amortization-calculations`, and the reusable components are in `libs/amortization-ui`. The app only adds `RentalInputsPanel` wiring and `page.tsx` composition, and imports only public `index.ts` exports. |
| III. Client-side, no server storage | ✅ | No backend. `rental` rides along in the existing `sessionStorage` payload. |
| IV. Accessible components | ✅ | The inputs reuse SDK-based `NumberField`, the rule explanations use `@ui-sdk/react/popover`, and the period toggle uses `@ui-sdk/react/tabs`. Badges use `aria-live="polite"`, and negative states don't depend on color alone. |
| V. Spec-driven delivery | ✅ | spec, then this plan, then `/speckit-tasks`, then `/speckit-analyze` (multi-story), then implement. |

**Result**: PASS, with no violations.

**Post-design re-check**: PASS. The Phase 1 artifacts ([data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)) add no projects, no dependencies, and no server components. All existing export changes are additive or backward-compatible (`compareScenarios` gets an optional second argument; `deserializeScenarios` normalizes the missing `rental`).

## Project Structure

### Documentation (this feature)

```text
specs/002-rental-deal-analyzer/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R9
├── data-model.md        # Phase 1: RentalAssumptions, DealAnalysis, extensions
├── quickstart.md        # Phase 1: validation run guide
├── contracts/
│   ├── deal-analysis-engine.md   # lib exports + reference test vectors
│   └── ui-components.md          # MetricBadge, IncomeExpenseCard, RuleIndicator, panel wiring
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
libs/amortization-calculations/src/
├── index.ts                         # + export analyze-deal, validate-rental
└── lib/
    ├── types.ts                     # + RentalAssumptions, DealAnalysis, LoanScenario.rental, summary.monthlyPmiAmount
    ├── compute-schedule.ts          # expose monthlyPmiAmount (additive)
    ├── analyze-deal.ts              # NEW: analyzeDeal, computeLtv, DEFAULT_RENTAL_ASSUMPTIONS
    ├── analyze-deal.spec.ts         # NEW: vectors A–F + invariants
    ├── validate-rental.ts           # NEW
    ├── validate-rental.spec.ts      # NEW
    ├── compare-scenarios.ts         # + optional analyses arg, 4 deal columns
    └── persistence.ts               # normalize missing rental → null

libs/amortization-ui/src/
├── index.ts                         # + exports
└── lib/
    ├── metric-badge.tsx             # NEW: MetricBadge + MetricBadgeGroup
    ├── income-expense-card.tsx      # NEW
    ├── rule-indicator.tsx           # NEW (popover-based explanation)
    └── comparison-grid.tsx          # + deal columns

apps/amortization-calculator/src/app/
├── page.tsx                         # compose badges, Deal analyzer section
├── _components/rental-inputs-panel.tsx   # NEW
└── _hooks/use-scenarios.ts          # seed DEFAULT_RENTAL_ASSUMPTIONS on first rent entry

apps/amortization-calculator-e2e/src/
└── deal-analyzer.spec.ts            # NEW: quickstart scenarios 1–6
```

**Structure Decision**: This extends the existing Nx layout from feature 001 in place: one Next.js app and two libraries. Deal math joins `amortization-calculations` instead of going into a new lib, because it consumes `AmortizationSchedule` directly (research R1). No new Nx projects are generated.

## Complexity Tracking

Not applicable. The Constitution Check found no violations.
