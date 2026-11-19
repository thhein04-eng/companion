---
description: 'Task list for the Glossary & Formulas page'
---

# Tasks: Glossary & Formulas Page

**Input**: `/specs/015-glossary-page/` (plan.md, spec.md, research.md, data-model.md, contracts/glossary-ui.md, quickstart.md)

**Tests**: Included. FR-007 and SC-002 require worked examples verified against real calculations, and the constitution requires Vitest plus Playwright coverage.

**Format**: `- [ ] T### [P?] [US?] Description with path`. Paths are relative to the worktree root `.claude/worktrees/015-glossary-page`. `DU` = `libs/deal-analyzer/ui/src/lib`. Run tasks with `npm exec nx -- ...`.

**Writing rule for every entry task**: before writing an entry or its example, re-read the source function named in research.md (the survey gave no line numbers). The formula text must match the code, including the quirks listed in research.md.

## Phase 1: Setup

- [X] T001 Add `BookIcon` (same `IconProps` pattern as `KeyIcon`/`TagIcon`) to `libs/shared/ui/src/lib/icons.tsx`, and confirm it is exported through `libs/shared/ui/src/index.ts`.
- [X] T002 Create `DU/glossary-types.ts` with `GlossaryCategoryId` (`'loan' | 'rental' | 'returns' | 'rules' | 'financing' | 'exit' | 'wealth' | 'sale-tax'`), `GlossaryCategory`, `GlossaryRouteId` (`'amortization' | 'deal-analyzer' | 'financing' | 'wealth' | 'pro-forma' | 'sale'`) and `GlossaryEntry` exactly as in data-model.md, plus `GLOSSARY_CATEGORIES` (label and order for the 8 categories: Loan, Rental income & expenses, Return metrics, Rules of thumb, Financing & DSCR, Hold & Exit, Wealth, Sale & tax) and `GLOSSARY_ROUTES` (route id to label and href, matching `apps/amortization-calculator/src/app/_nav.tsx`).

## Phase 2: Foundational (blocks all stories)

- [X] T003 Create `DU/glossary-entries.ts` that imports per-category arrays (`LOAN_ENTRIES` etc. from the files in T008-T015) and exports `GLOSSARY_ENTRIES`. Until those exist, export an empty array per category so the build passes.
- [X] T004 Write `DU/glossary-entries.spec.ts` integrity tests per data-model.md (the inventory list is copied from the research.md "Term inventory" section; update both together): ids unique and kebab-case; every `related` id exists; `usedOn` non-empty and every value a `GlossaryRouteId`; every category has at least one entry; entries with `formula` have non-empty lines; and every term name in the research.md inventory is present (hard-code the inventory list of ids/names in the spec). Expect it to fail until Phase 3 content lands.
- [X] T005 [P] Write `DU/glossary-filter.spec.ts` for `filterGlossary(entries, {query, category})`: case-insensitive substring over name, abbreviation, aliases and definition; name/abbreviation hits ranked first, ties broken by category order then name alphabetically; "coc", "p&i" and "p and i" match; category combines with query with AND; empty query returns all in category order then name.
- [X] T006 Implement `DU/glossary-filter.ts` to satisfy T005 (normalise `&`, `-`, repeated spaces, case; no new dependency).

**Checkpoint**: types, filter and integrity tests exist.

## Phase 3: User Story 1 - Look up a term (P1) MVP

**Goal**: `/glossary` lists every inventoried term with definition, purpose, formula, notes, used-on.
**Independent test**: open `/glossary`, find DSCR, see "annual NOI ÷ annual principal & interest (PMI excluded)".

### Content (parallel, one file per category; each exports a `GlossaryEntry[]`)

- [X] T007 [P] [US1] `DU/glossary-entries-loan.ts`: P&I, amortization schedule, remaining balance, loan term, interest rate, loan amount, down payment, home price, LTV, PMI (strict > 80% of original price), property tax, insurance, HOA, total monthly payment, extra payments, total interest, total cost, payoff date.
- [X] T008 [P] [US1] `DU/glossary-entries-rental.ts`: rent roll, GSI, other income, vacancy, property management, maintenance reserve, CapEx, operating expenses, custom operating expenses, RUBS, house hacking, net housing cost, NOI, debt service, pre-tax cash flow, total cash invested, closing costs, rehab budget, rent and expense growth.
- [X] T009 [P] [US1] `DU/glossary-entries-returns-rules.ts`: cap rate, cash-on-cash (CoC), pro forma (category `returns`); 1% Rule and 50% Rule (category `rules`, including "rule estimate" and the base-rent-only quirk).
- [X] T010 [P] [US1] `DU/glossary-entries-financing.ts`: DSCR (P&I only), minimum DSCR (1.25 default, 1.00–2.00), rent needed for minimum, conventional, ARM (N/1 reset), DSCR loan, financing options matrix.
- [X] T011 [P] [US1] `DU/glossary-entries-exit.ts`: hold period, selling costs, projected sale price, loan payoff, net sale proceeds, cash to investor, total net profit, equity multiple, IRR (bisection bounds, N/A cases), pre-tax vs after-tax returns.
- [X] T012 [P] [US1] `DU/glossary-entries-wealth.ts`: projection horizon, property value, loan balance, equity (with its four components), appreciation, forced appreciation, cumulative cash flow (ignores extra principal here), net worth, multiple on cash invested, depreciation (27.5 years), land value share, marginal tax rate, interest, taxable income, tax effect.
- [X] T013 [P] [US1] `DU/glossary-entries-sale-tax.ts`: exit timing, return on cash invested (not annualised), verdict (Profit/Loss/Break-even), break-even sale price, price cushion, depreciation taken, adjusted basis (includes closing costs), taxable gain, depreciation recapture tax, capital gains tax, after-tax net profit, short-term warning; "planning estimate, not tax advice".
- [X] T014 [US1] Wire T007-T013 into `DU/glossary-entries.ts` (replace the empty arrays) and make T004 pass.
- [X] T015 [P] [US1] Add worked `example`s to at least these entries and a test block in `DU/glossary-entries.spec.ts` that recomputes each with the real functions and asserts the documented numbers to the cent: P&I (`monthlyPayment`), LTV, NOI and cash flow (`analyzeDeal`), cap rate, cash-on-cash, DSCR (`computeDscr`), break-even sale price (`analyzeSale`), IRR (`irr`), net sale proceeds. Use `monthlyPayment` (`libs/shared/calculations/src/lib/loan-math.ts`), `irr(cashFlows: number[])` (`libs/deal-analyzer/calculations/src/lib/irr.ts`), `computeDscr({...})` (`dscr.ts`), `analyzeDeal` and `analyzeSale`; read each signature before writing the example, and pick inputs that give round, checkable numbers.

### UI

- [X] T016 [P] [US1] `DU/glossary-entry-card.tsx`: `<article id>` card per contracts/glossary-ui.md (heading, abbreviation badge, Definition, Why it matters, monospace wrapping Formula, Notes, Example, Used on links from `GLOSSARY_ROUTES`, Related `#id` links).
- [X] T017 [US1] `DU/glossary-view.tsx` (`'use client'`): `PageHeader`, entries grouped under `h2` per category in `GLOSSARY_CATEGORIES` order, no Deal Strip. Export it from `libs/deal-analyzer/ui/src/index.ts`.
- [X] T018 [US1] `apps/amortization-calculator/src/app/glossary/page.tsx` with metadata (title "Glossary & Formulas", description from the contract) rendering `<GlossaryView />`, mirroring `app/sale/page.tsx`.
- [X] T019 [US1] Add the `glossary` item (label "Glossary", href `/glossary`, `<BookIcon />`) as the last entry of `NAV_ITEMS` in `apps/amortization-calculator/src/app/_nav.tsx`.
- [X] T020 [US1] `DU/glossary-view.spec.tsx` (jsdom): all categories render, a sample entry shows definition, purpose and formula, no entry id is duplicated in the DOM.

- [X] T020a [US1] As soon as T018-T019 land, add `/glossary` to `apps/amortization-calculator-e2e/src/a11y.spec.ts` (light and dark) and `navigation.spec.ts`, and run them on a prod build (non-3000 port) so accessibility and nav regressions show up at the MVP checkpoint, not in Phase 6.

**Checkpoint**: Story 1 works alone; MVP.

## Phase 4: User Story 2 - Find a term fast (P2)

**Goal**: search, category chips, count, empty state, hash deep link.
**Independent test**: "coc" lists Cash-on-Cash; "zzz" shows the empty state; `/glossary#dscr` highlights DSCR.

- [X] T021 [US2] Extend `DU/glossary-view.spec.tsx` with failing tests: typing filters and updates the `role="status"` count; "zzz" shows `No terms match "zzz"` and Clear search restores the list; category chip + query combine; hash `#dscr` sets `aria-current="true"` and `data-highlighted` on that article and resets a filter that hides it; an unknown hash (`#nope`) renders the full list with no highlight and no error.
- [X] T022 [US2] In `DU/glossary-view.tsx` add the labelled search input ("Search terms", clear button), single-select category chips ("All" + 8, built on the existing `SegmentedOptions`/button pattern), the live-region count, the empty state, and hash handling on mount and `hashchange` (scroll into view, highlight, filter reset). Use `filterGlossary`. Make T021 pass.

**Checkpoint**: Stories 1 and 2 work.

## Phase 5: User Story 3 - Jump from a metric to its definition (P3)

**Goal**: info popovers link to the glossary.
**Independent test**: DSCR popover "Full definition" lands on `/glossary#dscr`.

- [X] T023 [P] [US3] Add optional `glossaryId?: string` to `MetricCard` in `DU/metric-card.tsx`; when set, render a "Full definition" `next/link` to `/glossary#{id}` in its info popover. The link must be reachable by keyboard (Tab) inside the popover without breaking its focus handling. Add a case to `DU/metric-card.spec.tsx`, and confirm no change when the prop is absent.
- [X] T024 [P] [US3] Same optional prop and link for `DU/rule-indicator.tsx`.
- [X] T025 [P] [US3] Same for the DSCR popover in `DU/dscr-card.tsx`.
- [X] T026 [US3] Pass `glossaryId` at the call sites that already have an info popover: cap rate, 1% Rule and 50% Rule (`DU/deal-metrics.tsx` via `MetricCard`/`RuleIndicator`) and DSCR (`DU/dscr-card.tsx`). Other metrics (NOI, IRR, equity multiple, net worth, break-even price) have no popover today and are out of scope; they stay reachable through search. Each id must exist in `GLOSSARY_ENTRIES`; add a test in `DU/glossary-entries.spec.ts` that the list of used ids is a subset of entry ids (export the list from one constant).

**Checkpoint**: all three stories done.

## Phase 6: Polish & cross-cutting

- [X] T027 [P] `apps/amortization-calculator-e2e/src/glossary.spec.ts` (Playwright): nav entry opens the page; search "coc"; empty state; category + search; `/glossary#dscr` highlight; DSCR popover link on `/financing` reached with the keyboard (Tab to the link, Enter); an unknown hash shows the full list; 375 px has no horizontal scroll. Follow patterns in `sale.spec.ts` and `helpers.ts`.
- [X] T028 [P] Re-run the T020a specs after Phases 4-5 (search UI and popover links change the DOM) and fix regressions.
- [X] T029 Run `npm exec nx -- run-many -t lint,typecheck,test` and fix findings.
- [X] T030 Build and serve a prod build on a non-3000 port with `BASE_URL` set (see memory: e2e port trap), run the e2e specs from T027-T028, then walk through quickstart.md including the three-formula spot-check against the live pages. (Done via automated equivalents: prod build on :3377, glossary + a11y e2e, and worked examples tied to the real calculation functions; no manual visual pass.)
- [X] T031 Re-run `/speckit-analyze` after implementation and resolve any new findings.

## Dependencies & order

- Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3, only needs T014 for ids and T016/T017 for the page) → Phase 6.
- US2 builds on `glossary-view.tsx` from US1. US3 is independent of US2 and can run in parallel with it after US1.
- T007-T013 are fully parallel; T014 waits for all of them; T015 waits for T014's ids but its code is independent of T016-T020.
- T016 is parallel with the content tasks; T017 needs T016 and T014; T018 and T019 need T017.

## Parallel example (US1)

```text
T007 loan | T008 rental | T009 returns-rules | T010 financing | T011 exit | T012 wealth | T013 sale-tax | T016 entry card
```

## Implementation strategy

1. MVP: Phases 1-3 (a readable, accurate, navigable glossary). Validate with quickstart steps 1 and the manual lookup.
2. Add search and deep links (US2), then popover links (US3).
3. Polish with e2e and a11y, then merge from a worktree (see memory: merge-into-main-via-worktree).
