# Feature Specification: Glossary & Formulas Page

**Feature Branch**: `015-glossary-page`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Use worktree. New page & route. Search the real estate terms, abbreviations, acronyms and metric names used in this app. Create a new page where it explains the definitions, the purpose, formulas for how to calculate them."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the user's description as part of `/speckit-plan` (same approach as specs 009 and 013). The term inventory comes from a read-through of the shipped code (see research.md).

## User Scenarios & Testing

### User Story 1 - Look up a term I do not understand (Priority: P1)

An investor sees "DSCR", "NOI" or "RUBS" on a page and wants to know what it means. They open a new **Glossary** page at `/glossary` (nav entry "Glossary"). Each entry shows the full name, the abbreviation, a plain definition, **why it matters** (purpose), and the **formula** exactly as this app calculates it.

**Why this priority**: This is the whole feature; every other story refines it.

**Independent Test**: Open `/glossary`, find "DSCR", confirm it shows definition, purpose and "annual NOI ÷ annual principal & interest (PMI excluded)".

**Acceptance Scenarios**:

1. **Given** the page loads, **When** it renders, **Then** every term inventoried in research.md appears exactly once, grouped by category (Loan, Rental income & expenses, Return metrics, Rules of thumb, Financing & DSCR, Hold & Exit, Wealth, Sale & tax).
2. **Given** an entry with a formula, **Then** it shows the formula in words/symbols, any thresholds or defaults used by the app, and edge cases (for example "N/A when cash invested is 0").
3. **Given** a term is not computed by the app (APR, GRM, escrow), **Then** it is not listed as an app metric.

---

### User Story 2 - Find a term fast (Priority: P2)

The investor types in a search box (matches name, abbreviation, aliases and definition text) and/or picks a category; the list and a result count update immediately. A no-match state offers to clear the search. Abbreviations like "CoC" and "P&I" match.

**Independent Test**: Type "coc" → Cash-on-Cash is listed; type "zzz" → empty state with "Clear search".

**Acceptance Scenarios**:

1. **Given** text "noi", **Then** entries whose name, abbreviation, alias or definition match are shown, name/abbreviation matches first, then category order, then name alphabetically.
2. **Given** a category chip is chosen, **Then** only that category's entries show, combinable with search.
3. **Given** a URL hash such as `/glossary#dscr`, **Then** that entry is scrolled into view and highlighted.

---

### User Story 3 - Jump from a metric to its definition (Priority: P3)

Metric info popovers that exist today (MetricCard for net housing cost, cap rate, the 1% and 50% rules, and the DSCR card; `RuleIndicator` supports it too but no page uses it yet) get a "Full definition" link to the matching `/glossary#id` entry. Each glossary entry lists the pages where the term is used, linking to those routes.

**Independent Test**: Open the DSCR info popover, follow the link, land on the DSCR entry.

### Edge Cases

- Unknown hash: page shows the full list, no error.
- Narrow screens (375 px): no horizontal scroll; formulas wrap.
- Keyboard/screen reader: search labelled, results count in a polite live region, category chips operable by keyboard.
- No JavaScript state needs saving; nothing is written to storage.

## Requirements

### Functional Requirements

- **FR-001**: A route `/glossary` MUST exist with a nav entry "Glossary" after the existing items, using the same app shell as other pages.
- **FR-002**: Each entry MUST have: id (slug), name, optional abbreviation and aliases, category, definition, purpose, formula (text, may have several lines), notes (defaults/edge cases), and "used on" routes.
- **FR-003**: Formulas MUST match the implemented calculations, including quirks (DSCR excludes PMI; 1% rule uses base rent only; /wealth ignores extra principal while /pro-forma and /sale subtract it).
- **FR-004**: Every term in the inventory MUST be present; terms the app does not compute MUST NOT be presented as app metrics.
- **FR-005**: Search and category filter per User Story 2, client-side, no server calls.
- **FR-006**: Hash deep-links per User Story 2; "Full definition" links per User Story 3.
- **FR-007**: Where a formula has a worked example, the example numbers MUST be verified by unit tests against the real calculation functions, so documentation cannot drift.
- **FR-008**: Content is static and shipped with the app; no user data is read or stored.
- **FR-009**: Page meets the app's accessibility bar (axe clean in light/dark, keyboard operable).

### Key Entities

- **GlossaryEntry**: id, name, abbreviation?, aliases[], category, definition, purpose, formula[], notes[], usedOn[] (route ids), example? (inputs + expected output).
- **GlossaryCategory**: id, label, order.

## Success Criteria

- **SC-001**: Typing any inventoried term's name or abbreviation lists that entry first (covered by unit tests over the full inventory).
- **SC-002**: 100% of worked examples reproduce the real calculation results to the cent (unit test).
- **SC-003**: Zero axe violations on `/glossary`; no horizontal scroll at 375 px.
- **SC-004**: From any metric info popover, the definition is reachable in one click.

## Assumptions

- English only; US conventions (27.5-year depreciation, Section 1250).
- Tax terms are explained as in-app planning estimates, not tax advice.
- Term list is hand-curated, not generated from code; drift is controlled by FR-007 tests.
