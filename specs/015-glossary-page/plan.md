# Implementation Plan: Glossary & Formulas Page

**Branch**: `015-glossary-page` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-glossary-page/spec.md`

## Summary

A new `/glossary` page ("Glossary" in the nav) that explains every real-estate term, acronym and metric
used in the app: definition, purpose, and the formula exactly as implemented, with defaults and edge cases.
It has search, category filter, `#id` deep links, "used on" route links, and a "Full definition" link from the
existing metric info popovers.

**Approach.** Static, hand-curated content in a pure TypeScript module (`glossary-entries.ts`) plus a pure
`filterGlossary` function, rendered by a `GlossaryView` in `deal-analyzer-ui`. No new package, no storage, no
calculation changes. Drift protection: a Vitest suite recomputes each worked example with the real
`deal-analyzer-calculations` / `shared-calculations` functions and asserts the documented numbers.

## Technical Context

**Language/Version**: TypeScript ~6.0, React 19, Next.js 16.1 App Router.
**Primary Dependencies**: None new. Reuses `shared-ui` (`PageHeader`, `Section`, `SectionHeader`, icons) and Tailwind 4. Add one `BookIcon` to `shared-ui` icons.
**Storage**: None (static content; search/filter state is local component state, with the hash for deep links).
**Testing**: Vitest (node) for `filterGlossary`, entry integrity (unique ids, every `usedOn` is a real route, every category non-empty, every inventoried term present) and worked examples vs real calculations; Vitest (jsdom) for the view (search, chips, empty state, hash highlight). Playwright `glossary.spec.ts` plus `/glossary` added to the a11y spec (the nav-link and route-href checks live in `glossary.spec.ts`), on a prod build at a non-3000 port (see memory: e2e port trap).
**Target Platform / Project Type**: Nx monorepo, Next.js web app plus libraries.
**Performance Goals**: Filtering ~80 entries is instantaneous (<50 ms).
**Constraints**: No horizontal scroll at 375 px; axe clean in light and dark; worked examples exact to the cent.
**Scale/Scope**: 1 route, ~80 entries in 8 categories, 3 UI modules, 7 content files, 1 icon, 4 popover links (cap rate, 1% Rule, 50% Rule, DSCR).

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Calculation correctness | PASS | No calculation is added or changed. Formula text is guarded by tests against the real functions (FR-007). |
| II. Thin apps, fat libs | PASS | `app/glossary/page.tsx` only renders `<GlossaryView />`. Content and filter logic live in `libs/deal-analyzer/ui` and are unit-tested without a browser. |
| III. Client-side, no server storage | PASS | Static content, nothing stored. |
| IV. Accessible components | PASS | Search is a labelled input, category chips are a button group with `aria-pressed` (nine options do not fit a segmented control at phone width), results count in a live region. No hand-rolled focus management. |
| V. Spec-driven delivery | PASS | spec, plan, tasks, then implement. |
| Stack constraints | PASS | No new app or lib, so no generator is needed. Next.js App Router, Vitest, Playwright. |

**Post-design re-check (after Phase 1)**: PASS, unchanged. The data lives in an existing UI lib rather than a new lib,
because the content is presentation text and a new lib would add boundaries for no benefit (see research R2).

## Project Structure

```text
specs/015-glossary-page/  plan.md research.md data-model.md quickstart.md contracts/glossary-ui.md
apps/amortization-calculator/src/app/
├── _nav.tsx                      # + Glossary entry (BookIcon)
└── glossary/page.tsx             # metadata + <GlossaryView />
libs/shared/ui/src/lib/icons.tsx  # + BookIcon
libs/deal-analyzer/ui/src/lib/
├── glossary-types.ts             # types, GLOSSARY_CATEGORIES, GLOSSARY_ROUTES
├── glossary-entries.ts           # aggregates the per-category files into GLOSSARY_ENTRIES
├── glossary-entries-{loan,rental,returns-rules,financing,exit,wealth,sale-tax}.ts  # pure data, one file per category group
├── glossary-filter.ts            # filterGlossary(query, category)
├── glossary-entry-card.tsx
├── glossary-link.tsx             # "Full definition" link used inside metric popovers
├── glossary-view.tsx             # search, chips, list, hash highlight
├── glossary-entries.spec.ts      # integrity + worked examples vs real calcs
├── glossary-filter.spec.ts
├── glossary-view.spec.tsx
├── metric-card.tsx / rule-indicator.tsx / dscr-card.tsx   # + optional glossaryId "Full definition" link (only cards that already have a popover)
apps/amortization-calculator-e2e/src/glossary.spec.ts (+ a11y/navigation additions)
```

**Structure decision**: Keep everything in existing libs. Entry `usedOn` references route ids from one exported
`GLOSSARY_ROUTES` constant, checked against the nav links by an e2e test in `glossary.spec.ts`.

## Complexity Tracking

No constitution violations.
