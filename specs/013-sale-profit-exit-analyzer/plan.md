# Implementation Plan: Sale Profit & Exit Analyzer

**Branch**: `013-sale-profit-exit-analyzer` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-sale-profit-exit-analyzer/spec.md`

## Summary

This feature adds a **Sale Profit & Exit Analyzer** page at `/sale` ("Sale Profit" in the nav). It
answers one question: if I sell at this exact month, do I make a real profit, and what is the
lowest price that still breaks even?

**What it shows:**
- The sale: the projected price is the purchase price × (1 + appreciation)^(m/12). From it come
  selling costs (default 7%), the remaining balance from the amortization schedule and net sale
  proceeds.
- Cumulative cash flow through the exit month. This is rental only; it is $0 for a non-rental.
- Total net profit, return on cash invested and a Profit / Loss / Break-even verdict.
- The break-even sale price (closed form) and the price cushion.
- Optional tax estimates, off by default: capital gains tax and 27.5-year depreciation recapture
  using the shared land share. These are labelled as planning estimates, not tax advice.

**Technical approach.**
- A pure `analyzeSale` in `deal-analyzer-calculations` reuses `analyzeDeal` (cash invested),
  `operatingYear` (growth rule) and a new internal `annualCashToInvestor` extracted from
  `projectExit`. Whole-year exits therefore match `/pro-forma` to the cent, which the prototype
  confirmed at 84 months.
- New inputs live in an optional scenario-level `LoanScenario.sale`, so the page works without a
  rental. With a rental, appreciation, selling costs, growth and land share use the existing shared
  fields.
- The UI follows the spec 009/010 page pattern in `deal-analyzer-ui`.

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19, on Next.js 16.1 with the App Router.

**Primary Dependencies**: No new packages. Reuses `@ui-sdk/react` (via `SegmentedOptions`,
`NumberField`, `Button`), `shared-ui` (Deal Strip, `PageHeader`, `Section`, `MetricBadge`,
`InputsMessage`) and Tailwind 4. There is no chart, because the description does not ask for one.

**Storage**: `sessionStorage` through `ScenariosProvider`, with a new optional `LoanScenario.sale`.

**Testing**: Vitest (node) for `analyzeSale`, `validateSale`, `resolveSaleAssumptions`, the
`annualCashToInvestor` extraction and `applyScenarioPatch`'s `sale` merge. Vitest (jsdom) covers
`editSale`. Playwright covers a new `sale.spec.ts`, plus `/sale` added to the a11y and navigation
specs, run on a :3200 prod build.

**Target Platform / Project Type**: As before: an Nx monorepo web app (Next.js) plus libraries.

**Performance Goals**: Updates within 1 s (SC-003). Each update is one schedule (already computed),
at most 30 annual rows and 11 partial months, which is negligible.

**Constraints**: Cent accuracy. Agreement with `/pro-forma` at whole-year exits. Profit at the
break-even price is within $0.01 of $0. There is no horizontal scroll at 375 px. Invalid tax inputs
never hide pre-tax figures.

**Scale/Scope**: 1 route, 2 calculation modules plus 1 internal helper, about 5 UI modules, 1
provider method and 1 icon.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | ✅ Pure `analyzeSale`, `validateSale` and `resolveSaleAssumptions`, with reference values from the real engine. | ✅ Reference vectors to the cent (contracts), six invariants over generated scenarios, cross-page agreement with `projectExit` and `projectWealth`, and an extraction that keeps existing tests unchanged. |
| II. Thin apps, fat libs | ✅ The route only renders `SaleView`. | ✅ The logic is in `deal-analyzer-calculations`, and the editor is in `shared-data-access`. Exports go through `index.ts`, and the helpers stay internal. |
| III. Client-side storage | ✅ `sessionStorage` only. | ✅ `sale` is optional, and old sessions take the defaults (FR-012). |
| IV. Accessible components | ✅ Uses the existing SDK-backed `SegmentedOptions` and `NumberField`, with no new primitive. | ✅ The verdict is text, not colour alone. The waterfall has a caption, and `/sale` joins the axe pass. |
| V. Spec-driven delivery | ⚠️ The spec was written in this plan run, with its choices under Assumptions. This follows the spec 009 precedent. | ✅ The artifacts are complete. Next: `/speckit-tasks`, then `/speckit-analyze` (three user stories). |
| Stack | ✅ No new projects or packages. | ✅ |

**Result**: PASS, with no Complexity Tracking entries.

## Project Structure

### Documentation

```text
specs/013-sale-profit-exit-analyzer/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── contracts/ (sale-calculations.md, sale-ui.md)
└── tasks.md   (/speckit-tasks)
```

### Source Code

```text
libs/shared/calculations/src/lib/
├── types.ts                      # + SaleAssumptions, SaleTaxAssumptions, LoanScenario.sale, FieldError keys
└── apply-scenario-patch.ts       # + shallow merge for `sale` (+ spec)

libs/shared/data-access/src/lib/
└── deal-edits-provider.tsx       # + editSale(patch), recorded as "Sale inputs" (+ spec)

libs/shared/ui/src/lib/
├── icons.tsx                     # + TagIcon
└── deal/page-profiles.ts         # + SALE_PROFILE, pageId 'sale'

libs/deal-analyzer/calculations/src/lib/
├── analyze-sale.ts / .spec.ts    # NEW analyzeSale, cumulativeCashFlow (internal)
├── validate-sale.ts / .spec.ts   # NEW validateSale, resolveSaleAssumptions, DEFAULT_SALE(_TAX)
├── cash-to-investor.ts           # NEW internal annualCashToInvestor (extracted from project-exit)
├── project-exit.ts               # uses annualCashToInvestor (no behaviour change)
├── analyze-deal.ts               # export downPaymentDollars
└── types.ts                      # + ResolvedSaleAssumptions, SaleResult, SaleTaxEstimate, SaleAnalysis

libs/deal-analyzer/ui/src/lib/
├── sale-view.tsx                 # NEW
├── sale-assumptions-panel.tsx    # NEW
├── sale-summary.tsx              # NEW
├── break-even-card.tsx           # NEW
├── sale-tax-panel.tsx            # NEW
└── use-sale-editor.ts            # NEW (routes each field to editRental or editSale, R1/R10)

apps/amortization-calculator/src/app/sale/page.tsx       # NEW
apps/amortization-calculator/src/app/_nav.tsx            # + "Sale Profit"
apps/amortization-calculator-e2e/src/sale.spec.ts        # NEW
apps/amortization-calculator-e2e/src/{a11y,navigation}.spec.ts   # + /sale
```

**Structure Decision**: This uses the existing `deal-analyzer-*` libraries, the same placement as
`/pro-forma`, because `analyzeSale` composes `analyzeDeal`, `operatingYear` and the extracted
cash-flow helper. A non-rental scenario only skips those calls, so it does not justify a new
library.

## Implementation order (for `/speckit-tasks`)

1. **Foundation**:
   - Shared types and the `applyScenarioPatch` `sale` merge.
   - `editSale`, `TagIcon` and `SALE_PROFILE`.
   - The route, nav and an empty `SaleView`.
   - The `annualCashToInvestor` extraction, with existing `projectExit` tests green.
   - Export `downPaymentDollars`.
2. **US1**:
   - `validateSale` and `resolveSaleAssumptions`: exit month, clamp and non-rental fallbacks.
   - `analyzeSale` (sale, balance, cash flow, profit, return, verdict), with its reference vectors
     and the `/pro-forma` agreement test.
   - The assumptions panel (exit unit, appreciation, selling costs, growth), `SaleSummary` and e2e.
3. **US2**: the break-even, cushion and any-price fields, with tests and invariant 2; then
   `BreakEvenCard` and e2e.
4. **US3**: the tax estimate and its validation, invariants 5–6, the tax toggle and inputs,
   `SaleTaxPanel` and e2e.
5. **Polish**:
   - The SC-003 timing check and the 375 px check.
   - `/sale` in the a11y and navigation specs.
   - The full gate on :3200 and a quickstart pass.
   - The spec 003 routes table and the library READMEs.

## Risks

- **Spec 012 (rent roll)** is planned but not implemented. If it lands first and changes how gross
  rent is computed, `operatingYear` absorbs it, so no change is expected here. Re-run SC-002 after
  merging.
- **Shared-field coupling**: editing appreciation or selling costs on `/sale` changes `/pro-forma`
  and `/wealth`. This is intended (R1). The input descriptions say "Shared with Hold & Exit".

## Complexity Tracking

No constitution violations.
