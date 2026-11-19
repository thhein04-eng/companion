# Implementation Plan: Multi-Unit Rent Roll, House-Hacking and Utility Split (RUBS)

**Branch**: `012-multi-unit-rent-roll` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-multi-unit-rent-roll/spec.md`

## Summary

This feature replaces the single rent with a 1–4 unit rent roll, adds per-unit vacancy, an
owner-occupied ("house-hacking") unit with two income views and a yearly move-out switch in the
projections, and a "Paid by" tag on custom expenses so RUBS reimbursements show as income.

- **One income function.** A new pure `rentRollIncome(rental, view)` in `shared-calculations`
  turns the rent roll, other income, vacancy and RUBS expenses into one `IncomeBasis` (rent, the
  base for percentage expenses, vacancy loss and reimbursements) (R2, R3). `analyzeDeal`,
  `rentalLineItems`, `operatingYear`, `projectRental`, `projectWealth` and `projectExit` take their
  income from it instead of reading `grossMonthlyRent` directly.
- **Backward compatible by construction.** `units` is optional. A rental without it is read as one
  implicit unit at `grossMonthlyRent`, and `grossMonthlyRent` is kept equal to the full
  (after-move-out) rent-roll total on every write, so the 1%/50% rules and any unconverted reader
  stay right (R1). A golden test asserts every fixture gives identical results (SC-001).
- **Views.** `occupancyView` ('living' | 'afterMoveOut') is stored on the scenario's rental, so the
  switch is shared by the deal card, Deal Analyzer and DSCR & Financing (R4). Projections pick the
  view per year from `moveOutYears` (R5).
- **UI.** A `RentRollEditor` replaces the Rent field in the Edit deal sheet's Rental group, the
  custom-expense rows get a "Paid by" segmented control plus a recovery %, the deal card's Rent
  value shows "· N units" and opens the sheet at the rent roll, and an `OccupancyViewSwitch`
  (ui-sdk SegmentedControl) appears on the card and the pages when a unit is owner-occupied (R6).

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js 16.1 with the App Router.

**Primary Dependencies**: Existing only: `@ui-sdk/react` (`SegmentedControl`, `Switch`/checkbox,
`NumberInput`), `shared-ui/ds`, Tailwind 4 tokens. No new packages.

**Storage**: `sessionStorage` scenarios, unchanged shape plus optional fields (`units`,
`moveOutYears`, `occupancyView`, and on custom expenses `paidBy`, `recoveryPct`). No migration step;
readers normalize (R1).

**Testing**:
- Vitest (Constitution I): `rentRollIncome` (single unit equals today, per-unit vacancy, both
  views, RUBS shares including the owner's unit and vacancy), `normalizeUnits`, `validateRental`
  unit errors, `analyzeDeal` net housing cost, `projectWealth` / `projectExit` move-out switch,
  and a golden test over every existing fixture (SC-001). Component tests for `RentRollEditor` and
  the "Paid by" row.
- Playwright: `rent-roll.spec.ts` (add/remove/undo, totals, deal card label, 390px no scroll),
  `house-hack.spec.ts` (view switch, net housing cost, projections marker), `rubs.spec.ts`, and
  axe in light and dark with the rent roll open (SC-006).

**Target Platform / Project Type**: Nx monorepo, one Next.js web app (`amortization-calculator`).

**Performance Goals**: No change. Calculations stay O(units × years) with ≤ 4 units.

**Constraints**: Results for existing scenarios unchanged to the cent; spec 010/011 design system
and contrast rules; WCAG AA; no horizontal scroll at 360px.

**Scale/Scope**: ~4 calculation files changed + 1 added, ~6 UI files changed + 2 added, 3 e2e specs
added, a few updated.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| I. Calculation correctness | PASS, provided every new formula is a pure, tested function. | PASS. `rentRollIncome`, `normalizeUnits` and the move-out logic are pure functions in `shared-calculations` / `deal-analyzer-calculations` with cent-level tests and a golden backward-compatibility test. |
| II. Thin apps, fat libs | PASS. | PASS. All logic is in libs; no app files change. |
| III. Client-side storage | PASS. | PASS. New fields live on the scenario in `sessionStorage`. |
| IV. Accessible components | PASS, provided new controls use the SDK. | PASS. The view switch and "Paid by" use ui-sdk `SegmentedControl`, the owner toggle is a ui-sdk checkbox/switch, numbers use `NumberField`. axe covers the open rent roll. |
| V. Spec-driven delivery | PASS. Spec written; clarify was skipped with defaults recorded as Assumptions. | PASS. tasks.md next; `/speckit-analyze` recommended (4 user stories). |
| Stack | PASS. | PASS. No new dependencies. |

## Project Structure

### Documentation (this feature)

```text
specs/012-multi-unit-rent-roll/
├── plan.md              # This file
├── research.md          # Phase 0 decisions R1–R7
├── data-model.md        # Phase 1 entities, fields, validation, formulas
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── calculations.md  # Public calc API changes
│   └── ui.md            # Component contracts
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
libs/shared/calculations/src/lib/
├── types.ts                 # + RentUnit, OccupancyView, CustomExpenseItem.paidBy/recoveryPct
├── rent-roll.ts             # NEW: normalizeUnits, rentRollTotal, rentRollIncome, hasOwnerUnit
├── rent-roll.spec.ts        # NEW
├── validate-rental.ts       # + unit and RUBS validation (keys rental.units.N.*)
├── deal-fields.ts           # Rent read = rent-roll total; format "· N units"
└── rental-defaults.ts       # New scenario starts with one empty unit

libs/deal-analyzer/calculations/src/lib/
├── rental-line-items.ts     # takes IncomeBasis; vacancy from per-unit loss
├── analyze-deal.ts          # view option, reimbursement income line, netHousingCost
├── operating-year.ts        # view per year from moveOutYears
├── project-rental.ts / project-wealth.ts / project-exit.ts  # use operatingYear / IncomeBasis; moveOutYear in results
└── *.spec.ts                # golden + new cases

libs/shared/data-access/src/lib/
├── use-rental-editor.ts     # unit add/remove/update, keeps grossMonthlyRent in sync
└── deal-edits-provider.tsx  # labels for unit edits in the change toast / undo

libs/shared/ui/src/lib/
├── rent-roll-editor.tsx     # NEW
├── occupancy-view-switch.tsx# NEW
├── rental-inputs-panel.tsx  # RentRollEditor + "Paid by" on custom expenses
└── deal/                    # deal-strip (switch), chip-popover / page-profiles (Rent cell), deal-errors

libs/deal-analyzer/ui/src/lib/
├── deal-analyzer-view.tsx / income-expense-card.tsx / deal-metrics.tsx  # switch, net housing cost, RUBS line, rules note
├── financing-view.tsx / dscr-card.tsx                                   # view-aware NOI
└── net-worth-chart.tsx / wealth-table.tsx / pro-forma-table.tsx         # move-out marker

apps/amortization-calculator-e2e/src/
├── rent-roll.spec.ts / house-hack.spec.ts / rubs.spec.ts  # NEW
└── a11y.spec.ts             # + rent roll open
```

**Structure Decision**: Existing Nx libraries only. The income model sits in `shared-calculations`
because the deal card, validation and the sheet (shared-ui / shared-data-access) need it, and
`deal-analyzer-calculations` already depends on `shared-calculations`.

## Complexity Tracking

No constitution violations to justify.

One deliberate redundancy: `grossMonthlyRent` stays stored next to `units` as the after-move-out
total (R1). It is always written by the same editor function that writes `units`, and a unit test
asserts they agree. Removing it would mean converting every reader and stored session at once, for
no user-visible gain.
