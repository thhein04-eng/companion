# Implementation Plan: Paginated Amortization Schedule

**Branch**: `004-amortization-schedule-pagination` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-amortization-schedule-pagination/spec.md`

## Summary

Replace the single 360-row scrolling amortization table with a paginated view: 12 rows per
page by default (one year). The view has First, Previous, Next, and Last controls, numbered
page links with ellipses, a live "Payments X–Y of N" range, and a rows-per-page choice of
12, 24, 60, 120, or All. The current page survives recalculation, invalid input, and remounts,
and resets only when the user switches scenarios.

Technical approach:

- Build the pager on the installed headless `@ui-sdk/react/pagination` and `select` primitives.
- Put the range math in pure, unit-tested helpers in `libs/amortization-ui`.
- Hold `{ page, pageSize }` as controlled state in the app page, so it outlives the table's
  unmount.

Calculations and export are untouched.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Next.js App Router (unchanged from feature 001)

**Primary Dependencies**: `@ui-sdk/react` `0.1.0-beta.1` (`pagination`, `select`, existing
`scroll-area`), Tailwind CSS. No new packages.

**Storage**: N/A. Pagination is in-memory view state only. Nothing is added to `sessionStorage`.

**Testing**: Vitest (jsdom) in `amortization-ui` for the pure pagination helpers. Playwright
in `amortization-calculator-e2e`: a new `schedule-pagination.spec.ts`, plus 3 updated row-count
assertions.

**Target Platform**: The same browsers as feature 001 (Chrome/Edge/Firefox 111+, Safari 16.4+)

**Project Type**: Web application. An Nx monorepo with one Next.js app and two libs.

**Performance Goals**: Page change under 100 ms (SC-002). Recalculation stays under 1 s (001
SC-005), and it is faster because only one page of rows renders.

**Constraints**: Keep keyboard and ARIA semantics through the SDK (Constitution IV). Make no
change to calculated values or formatting (FR-008). Export still covers the full schedule
(FR-007).

**Scale/Scope**: 1 component extended (`ScheduleTable`), 1 new pure helper module, 1 app wiring
change, 1 new e2e spec and 3 updated e2e assertions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Evidence |
| --------- | ------ | -------- |
| I. Calculation correctness | ✅ Pass | No calculation library changes. `amortization-calculations` tests must stay green. Paging math is not financial math, but it is still unit-tested (R3). |
| II. Thin apps, fat libs | ✅ Pass | The range math and the pager UI live in `libs/amortization-ui`. The app only holds view state and passes it down (R4). |
| III. Client-side, no unneeded storage | ✅ Pass | No server use. Page state is not even persisted to `sessionStorage` (spec Assumptions). |
| IV. Accessible interactive components | ✅ Pass | Built on `@ui-sdk/react/pagination` and `select`. No hand-written focus or ARIA handling (R1, R2). |
| V. Spec-driven delivery | ✅ Pass | spec → plan (this) → tasks → implement. The spec was written for this run because none existed. Consider running `/speckit-clarify` on the defaults (12 rows, the size list) before `/speckit-tasks` if you want to confirm them. |
| Stack constraints | ✅ Pass | No new dependencies. Nx targets are used for test, lint, and e2e. |

**Post-design re-check**: Unchanged. The Phase 1 artifacts (data-model, contract, quickstart)
add only view state and one lib module, with no new projects, dependencies, or storage. All
gates still pass.

## Project Structure

### Documentation (this feature)

```text
specs/004-amortization-schedule-pagination/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R8
├── data-model.md        # Phase 1: pagination view state and derived range
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── schedule-table-ui.md   # amortization-ui public API and rendered UI contract
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
libs/amortization-ui/src/
├── index.ts                              # + export pagination helpers and types
└── lib/
    ├── schedule-pagination.ts            # NEW: getSchedulePage, pageContainingRow, page sizes
    ├── schedule-pagination.spec.ts       # NEW: Vitest, data-model examples and invariants
    └── schedule-table.tsx                # MODIFIED: slices rows, pager, rows-per-page, range text

apps/amortization-calculator/src/app/
└── page.tsx                              # MODIFIED: owns {page, pageSize}, resets on scenario switch

apps/amortization-calculator-e2e/src/
├── schedule-pagination.spec.ts           # NEW: quickstart scenarios 1, 2, 4–8
├── baseline-schedule.spec.ts             # MODIFIED: 12 rows plus "of 360", last page ends $0.00
├── performance.spec.ts                   # MODIFIED: wait on range text instead of 360 rows
└── deal-analyzer.spec.ts                 # MODIFIED (line ~186): same change
```

**Structure Decision**: Keep the existing Nx layout. All new logic goes in the existing
`amortization-ui` lib, so no new project is generated.

## Risks & Notes

- **Merge overlap with `003-feature-pages-navigation`**: that worktree may move or split
  `page.tsx`. The pagination wiring is about 10 lines and the uncontrolled fallback of
  `ScheduleTable` keeps it working wherever it is mounted. Rebase onto 003 before implementing
  if 003 lands first.
- **SDK beta**: `@ui-sdk/react` is `0.1.0-beta.1`. The docs mark the pagination parts
  `@stable`.

## Complexity Tracking

Not applicable: there are no constitution violations.
