# Implementation Plan: Deal Strip & Visual Redesign

**Branch**: `010-deal-strip-redesign` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-deal-strip-redesign/spec.md`

## Summary

The repeated Loan, Real-estate costs and Rental sections are replaced on all five pages
(Amortization, Deal Analyzer, Financing, Wealth, and the new Hold & Exit page from spec 009) by:

- A sticky **Deal Strip**: scenario tabs, chips ordered by relevance, chip popovers with a
  headline-metric preview, an error count, and missing-input chips.
- An **Edit deal sheet**: right on desktop, bottom on phones. It opens by itself in setup mode for
  an unset deal. It holds the deal sentence, the payment-bar cost editor and scrubbable labels.
- Change ripple and an undo toast after every edit.

The whole app is restyled to match [`design-reference.html`](./design-reference.html) exactly, with
a System / Light / Dark switcher.

**Technical approach**:
- One token stylesheet holds the reference's exact values, exposed as Tailwind 4 `@theme`
  utilities. Every raw palette class is replaced.
- A small styled design-system layer sits on the existing headless `@ui-sdk/react`: Popover,
  Drawer, Toast, Tabs, SegmentedControl, plus `Preferences` / `createColorScheme` for the theme.
- Fonts load through `next/font`: Space Grotesk, Inter, JetBrains Mono.
- The in-house chart library is re-tokened to the reference's series palette.
- The shared-rental pieces move down to `scope:shared`, so the strip can serve every page.
- No calculation changes, except spec 009's own additions.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js 16.1 with the App Router.

**Primary Dependencies**:
- Existing: `@ui-sdk/react` / `@ui-sdk/core` 0.1.0-beta.1 for behavior (R2, R3), Tailwind 4.3
  for styling (R1), and `@companion/charts` re-tokened (R5).
- Fonts: `next/font/google`, part of Next (R4).
- New devDependency: `@axe-core/playwright` (R10).
- No new runtime UI or chart packages. The clarification allowed them, and research found that
  none gets closer to the reference than tokens on the current stack (R2, R5).

**Storage**:
- Scenarios: `sessionStorage`, unchanged.
- Setup-done ids: `sessionStorage['companion.setupDone']` (R8).
- Theme choice: device storage through ui-sdk `createColorScheme` (R3). It is a display
  preference, not financial data.

**Testing**:
- Vitest for `stepValue`, `DealEditsProvider`, `useSetupMode`, chip ordering, the sentence and the
  payment bar.
- Playwright: existing specs migrated to strip / sheet helpers, plus `deal-strip`, `setup-mode`,
  `theme`, `undo-ripple`, `visual`, axe, and spec 009's `pro-forma`.
- All runs on a :3200 prod build.

**Target Platform / Project Type**: Nx monorepo, one Next.js web app, modern evergreen browsers,
desktop and phone.

**Performance Goals**: Chip and sheet edits recalculate within one frame of today's speed, with
the existing memoized views reused. Scrub runs at 60 fps, with one recompute per step and no
extra work per pointer event. The toast and ripple add no layout shift.

**Constraints**:
- An exact visual match to the reference (FR-034).
- Spacing minimums (FR-033).
- No horizontal page scroll at 360px or wider.
- WCAG 2.1 AA in both themes.
- No theme flash.
- No change to any calculation result (SC-004).

**Scale/Scope**:
- Roughly 34 restyled UI files.
- Roughly 20 new UI modules (`ds/` and `deal/`), 3 moved modules, and 1 new pure function.
- 5 page views reworked, plus spec 009's page and its 33 tasks (folded in).
- Roughly 14 e2e specs migrated and 6 added.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Pre-research | Post-design |
|---|---|---|
| **I. Calculation correctness** | PASS. No calculation changes. Spec 009's calculations keep their own reference tests. | PASS. `stepValue` is a new pure function with unit tests (step precision, clamps). `validateRental` and `DEFAULT_RENTAL_ASSUMPTIONS` move with their tests unchanged, re-exported from the old location. |
| **II. Thin apps, fat libs** | PASS. Everything new is in `libs/`. The app only gets layout wiring (fonts, `Preferences`, providers). | PASS. The deal UI is in `shared-ui`, state in `shared-data-access`, `stepValue` in `shared-calculations`. Module-boundary rules are unchanged (R6). |
| **III. Client-side, no server storage** | PASS. Nothing goes to a server. Theme choice is device-stored as a non-financial display preference, allowed by spec Assumptions. | PASS. `next/font` self-hosts the fonts, so there are no runtime third-party requests. Setup flags stay in `sessionStorage`. |
| **IV. Accessible components** | PASS, as long as the new overlays use ui-sdk. | PASS. Popover, Drawer, Toast, Tabs, SegmentedControl and Preferences are all ui-sdk. Drag-to-adjust uses ui-sdk `NumberInputScrubArea`. The sentence tokens are plain buttons. Weak reference colors are restricted by use (spec FR-035). axe runs in e2e. |
| **V. Spec-driven delivery** | PASS. Specify and clarify are done. | PASS. tasks.md comes next. Analyze is recommended before implement (multi-story). |
| **Stack constraints** | PASS. Next App Router, ui-sdk + Tailwind, Vitest + Playwright. | PASS. No stack deviation. One devDependency (`@axe-core/playwright`). |

## Project Structure

### Documentation (this feature)

```text
specs/010-deal-strip-redesign/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── design-reference.html          # approved visual source of truth
├── contracts/ (design-system.md, deal-ui.md)
├── checklists/requirements.md
└── tasks.md                       # /speckit-tasks
```

### Source Code (repository root)

```text
apps/amortization-calculator/src/app/
├── layout.tsx                     # next/font, Preferences + createColorScheme, DealEditsProvider, main max-w 1040
├── global.css                     # @import shared-ui tokens.css; drop old body font
├── pro-forma/page.tsx             # NEW (spec 009)
└── _nav.tsx                       # + Hold & Exit (spec 009)

libs/shared/ui/src/
├── styles/tokens.css              # NEW R1: reference tokens, @theme, type scale, spacing
├── lib/ds/                        # NEW: button, chip, card, eyebrow, section-header, field, segmented-toggle,
│                                  #      tabs, sheet, popover, toast, badge, kpi, data-table, ripple, theme-switcher
├── lib/deal/                      # NEW: deal-strip, chip-popover, deal-sheet, deal-sentence, payment-bar,
│                                  #      deal-change-toast, fix-inputs-button, page-profiles (scrub = NumberField prop)
├── lib/rental-inputs-panel.tsx    # MOVED from deal-analyzer-ui
├── lib/app-shell.tsx · side-nav.tsx · number-field.tsx · date-field.tsx · comparison-grid.tsx ·
│   metric-badge.tsx · scenario-tabs.tsx · loan-input-form.tsx · cost-breakdown-panel.tsx   # restyled
└── index.ts                       # + exports

libs/shared/data-access/src/lib/
├── deal-edits-provider.tsx        # NEW R7
├── use-setup-mode.ts              # NEW R8
└── use-rental-editor.ts           # MOVED from deal-analyzer-ui

libs/shared/calculations/src/lib/
├── step-value.ts / .spec.ts       # NEW
├── validate-rental.ts / .spec.ts  # MOVED (re-exported by deal-analyzer-calculations)
└── rental-defaults.ts             # MOVED DEFAULT_RENTAL_ASSUMPTIONS

libs/shared/charts/src/            # theme.css re-tokened; segmented-bar.tsx + onSegmentActivate; tooltip restyle
libs/amortization/ui/src/lib/      # view reworked; schedule-table, extra-payment-panel, charts restyled
libs/deal-analyzer/ui/src/lib/     # 4 views reworked + spec 009 modules; all cards/tables restyled
libs/deal-analyzer/calculations/   # spec 009 (irr, projectExit, validateExit) per its plan

apps/amortization-calculator-e2e/src/
├── helpers.ts                     # + openDealSheet, editChip, skipSetup, setTheme
├── deal-strip · setup-mode · theme · undo-ripple · visual · a11y .spec.ts   # NEW
├── pro-forma.spec.ts              # NEW (spec 009)
└── *.spec.ts                      # migrated to the sheet
```

**Structure Decision**: Existing libraries only, as in specs 006 and 008. Shared deal UI goes in
`shared-ui` because all five pages, across two scopes, use it. The rental panel, its editor and
its validator move to `scope:shared` instead of loosening the boundary rules (R6).

## Implementation order (for `/speckit-tasks`)

1. **Setup**: the baseline gate, the `@axe-core/playwright` install, and copying the reference
   tokens into `tokens.css`.
2. **Foundation** (blocks every story):
   - `tokens.css` + `@theme`, fonts, `Preferences` / `createColorScheme`.
   - The `ds/` primitives.
   - The chart re-token.
   - Moving the rental pieces to `scope:shared`.
   - `stepValue`.
   - `DealEditsProvider` with recording only.
   - The e2e helpers.
3. **US1 (P1)**: `DealStrip`, chips, `ChipPopover`, `DealSheet` in edit mode, page profiles and
   headlines in the four views, removing the inline sections, and migrating the e2e specs.
4. **US2 (P1)**: the full restyle of the shell, every component, table and chart; the
   `ThemeSwitcher`; spacing; the raw-palette lint; and the visual and axe specs. It can run in
   parallel with US1 after Foundation, since it touches different files except the views, which
   are restyled after US1 lands.
5. **Spec 009**: its Phases 2–6, with its UI built on the strip and `ds/` from the start
   (pro-forma profile and IRR headline). This happens after US1 and US2.
6. **US3 (P2)**: `useSetupMode`, setup mode in the sheet, missing chips, the error count, and
   `FixInputsButton`, replacing the "above" messages.
7. **US4 (P3)**: `DealSentence`, and `PaymentBar` with `onSegmentActivate`.
8. **US5 (P3)**: the `NumberField` `scrub` prop on ui-sdk `NumberInputScrubArea`, plus deltas and chip ordering by profile.
9. **US6 (P3)**: `Ripple`, `DealChangeToast`, undo, and coalescing.
10. **Polish**: the full gate on :3200, quickstart §2–§8, a visual review against the reference,
    README notes, and the spec 003 routes table.

## Complexity Tracking

No constitution violations.
