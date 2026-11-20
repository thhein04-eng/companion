# Implementation Plan: Refinance & BRRRR Modeling

**Branch**: `014-refinance-brrrr` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-refinance-brrrr/spec.md`

## Summary

This feature adds a **Refinance & BRRRR Modeling** page at `/refinance` ("Refinance" in the nav). It
adds one phase to a scenario, a refinance at a chosen month, and shows what it does to the money in
the deal.

**What it shows:**

- **Cash-out (BRRRR) mode.** From the ARV, refinance LTV, new rate, new term and closing costs: the
  new loan, the payoff of the current loan at the refinance month, net refinance proceeds, and the
  new monthly P&I.
- **Capital recycled.** Cash left in the deal (total cash invested − net proceeds), the percentage
  of cash recycled, and cash-on-cash before and after the refinance. When all the cash comes out
  it says "All cash recovered" and shows the surplus instead of a ratio.
- **Rate-drop mode.** Current vs. new P&I, the monthly savings, the exact **breakeven month** in
  which cumulative savings cover the closing costs, and the net savings over the remaining term.

**Technical approach.**

- Two pure functions in `deal-analyzer-calculations`, `analyzeCashOut` and `analyzeRateDrop`, share a
  small internal `refinance-math` module. They reuse `analyzeDeal` (cash invested, net operating
  income, cash-on-cash before), the amortization schedule (payoff, which honors extra payments) and
  `loan-math` (the new loan's payment and balance). No new schedule is built for the new loan.
- New inputs live in an optional scenario-level `LoanScenario.refinance`, written through a new
  `editRefinance` on the existing deal-edits provider (undo and the change toast included). This
  repeats the spec 013 `sale` pattern exactly. Rehab and purchase closing costs stay the shared
  rental fields, edited on this page through `editDeal`.
- The UI is a `RefinanceView` in `deal-analyzer-ui` on the spec 010 Deal Strip, built from existing
  components (`NumberField`, `SegmentedOptions`, `PageHeader`, `Section`, `MetricBadge`).

## Technical Context

**Language/Version**: TypeScript ~6.0 and React 19, on Next.js 16.1 with the App Router.

**Primary Dependencies**: No new packages. Reuses `@ui-sdk/react` (via `SegmentedOptions`,
`NumberField`), `shared-ui` (Deal Strip, `PageHeader`, `Section`, `MetricBadge`, `InputsMessage`) and
Tailwind 4. There is no chart, because the description does not ask for one.

**Storage**: `sessionStorage` through `ScenariosProvider`, with a new optional
`LoanScenario.refinance`. Stored sessions pass unknown keys through, so no migration is needed
(research R1).

**Testing**: Vitest (node) for `analyzeCashOut`, `analyzeRateDrop`, `refinance-math`,
`validateRefinance`, `resolveRefinanceAssumptions` and `applyScenarioPatch`'s `refinance` merge.
Vitest (jsdom) covers `editRefinance` and its undo. Playwright covers a new `refinance.spec.ts`,
plus `/refinance` added to the existing page-list specs (a11y, deal strip, deal bar, setup mode,
visual, performance), run on a prod build on a free port (not :3000).

**Target Platform / Project Type**: As before: an Nx monorepo web app (Next.js) plus libraries.

**Performance Goals**: Updates within 1 s (SC-004). Each update is one existing schedule lookup and
a few closed-form calculations, which is negligible.

**Constraints**: Cent accuracy. Cash invested and cash-on-cash before the refinance agree with
`/deal-analyzer` to the cent. Breakeven matches a brute-force month-by-month loop for every
generated scenario. No horizontal scroll at 375 px. Invalid inputs never crash the page.

**Scale/Scope**: 1 route, 3 calculation modules plus 1 validation module, about 5 UI modules, 1
provider method, 1 icon and 1 page profile.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | Pre-research                                                                                                                        | Post-design                                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Calculation correctness | ✅ Pure `analyzeCashOut`, `analyzeRateDrop` and `validateRefinance`, tested against reference values computed with the real engine. | ✅ Reference vectors to the cent (contracts), invariants over generated scenarios, a brute-force breakeven cross-check, and cross-checks of payment and balance against `computeSchedule` on a synthetic loan. |
| II. Thin apps, fat libs    | ✅ The route only renders `RefinanceView`.                                                                                          | ✅ Logic is in `deal-analyzer-calculations`, the editor in `shared-data-access`. Exports go through each `index.ts`, and `refinance-math` stays internal.                                                      |
| III. Client-side storage   | ✅ `sessionStorage` only.                                                                                                           | ✅ `refinance` is optional, and old sessions take the defaults (FR-014).                                                                                                                                       |
| IV. Accessible components  | ✅ Uses the existing SDK-backed `SegmentedOptions` and `NumberField`, with no new primitive.                                        | ✅ The mode toggle has radio semantics, results are text (not colour alone), and `/refinance` joins the axe pass.                                                                                              |
| V. Spec-driven delivery    | ✅ Specify and plan are both done in this run, in order.                                                                            | ✅ Artifacts are complete. Next: `/speckit-tasks`, then `/speckit-analyze` (four user stories).                                                                                                                |
| Stack                      | ✅ No new projects or packages, so no generator is needed.                                                                          | ✅                                                                                                                                                                                                             |

**Result**: PASS, with no Complexity Tracking entries. One follow-up is worth noting: `sale` and
`refinance` now repeat the same scenario-section wiring (type, patch merge, change record, undo,
toast title). A generic "scenario section" helper would remove the repetition, but it would touch
spec 013's working code, so it is left out of this feature (research R1).

## Project Structure

### Documentation

```text
specs/014-refinance-brrrr/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── checklists/requirements.md
├── contracts/ (refinance-calculations.md, refinance-ui.md)
└── tasks.md   (/speckit-tasks)
```

### Source Code

```text
libs/shared/calculations/src/lib/
├── types.ts                      # + RefinanceAssumptions, LoanScenario.refinance, FieldError keys
└── apply-scenario-patch.ts       # + shallow merge for `refinance` (+ spec)

libs/shared/data-access/src/lib/
└── deal-edits-provider.tsx       # + 'refinance' ChangeField, editRefinance(patch), undo branch (+ spec)

libs/shared/ui/src/lib/
├── icons.tsx                     # + RefreshIcon
└── deal/
    ├── page-profiles.ts          # + REFINANCE_PROFILE, pageId 'refinance'
    └── deal-change-toast.tsx     # + "Refinance inputs changed"

libs/deal-analyzer/calculations/src/lib/
├── __fixtures__/refinance-reference.ts  # NEW brrrrReference, rateDropReference, generatedRefinanceScenarios
├── refinance-math.ts / .spec.ts  # NEW internal: newPayment, breakeven, balanceOwed
├── validate-refinance.ts / .spec.ts   # NEW validateRefinance, resolveRefinanceAssumptions, defaults
├── analyze-cash-out.ts / .spec.ts     # NEW analyzeCashOut
├── analyze-rate-drop.ts / .spec.ts    # NEW analyzeRateDrop
└── types.ts                      # + ResolvedRefinanceAssumptions, CashOutAnalysis, RateDropAnalysis

libs/shared/calculations/src/lib/persistence.spec.ts    # + a session with and without `refinance`

libs/deal-analyzer/ui/src/lib/
├── refinance-view.tsx            # NEW
├── refinance-inputs-panel.tsx    # NEW (mode toggle + the inputs for the active mode)
├── cash-out-summary.tsx          # NEW (proceeds, capital recycled, cash-on-cash before/after)
├── rate-drop-summary.tsx         # NEW (P&I comparison, breakeven, net savings)
├── use-refinance-editor.ts       # NEW (routes each field to editRefinance or editDeal)
└── use-refinance-editor.spec.tsx # NEW (jsdom)

apps/amortization-calculator/src/app/refinance/page.tsx          # NEW
apps/amortization-calculator/src/app/_nav.tsx                    # + "Refinance"
apps/amortization-calculator-e2e/src/refinance.spec.ts           # NEW
apps/amortization-calculator-e2e/src/{a11y,deal-strip,deal-bar,setup-mode,visual,performance}.spec.ts   # + /refinance
specs/003-feature-pages-navigation/contracts/routes-and-navigation.md   # + /refinance row
libs/{deal-analyzer/calculations,deal-analyzer/ui,shared/data-access,shared/calculations}/README.md   # + new APIs
```

**Structure Decision**: The existing Nx layout. Calculations go in `deal-analyzer-calculations`
and the page in `deal-analyzer-ui`, exactly where `/sale` lives. The only `shared-*` changes are
the stored type, its patch merge, its editor and the nav and profile plumbing, which every page
already shares.

## Complexity Tracking

No constitution violations. Nothing to justify.
