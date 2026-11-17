# Feature Specification: Feature Pages & Side Navigation

**Feature Branch**: `003-feature-pages-navigation`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Separate the 2 features into 2 different pages. Build the responsive collapsible left-side menu that has links to those 2 features. Also separate those features in the project itself. Make sure both features use shared functionalities without duplication."

## Context

Today the Amortization Calculator (spec 001) and the Rental Deal Analyzer (spec 002) are both rendered on a single long page (`/`). This feature gives each its own page, adds a left-side navigation menu between them, and restructures the codebase so each feature lives in its own libraries while common pieces (loan scenario model, schedule math, persistence, form fields, scenario tabs, badges, comparison grid) live in shared libraries used by both. **No calculation result changes**: every figure either feature produces today must be identical after this change.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Each feature on its own page (Priority: P1)

A user who only wants to model a mortgage opens the Amortization page and sees only loan inputs, real-estate costs, extra payments, the schedule, and the loan comparison — no rental fields. An investor opens the Deal Analyzer page and sees the financing inputs the analysis depends on plus the rental inputs and deal metrics, without the full amortization schedule.

**Why this priority**: Splitting the single page is the core request; navigation and refactoring exist to support it.

**Independent Test**: Visit `/amortization` and confirm the schedule table is present and no "Monthly rent" field exists. Visit `/deal-analyzer`, enter spec 002's reference scenario, and confirm the income/expense card, CoC badge, cap rate and rule indicators show the same values as before the change.

**Acceptance Scenarios**:

1. **Given** the user visits `/amortization`, **When** the page renders, **Then** it shows scenario tabs, Loan, Real-estate costs, Extra payments, Amortization schedule (with CSV export), the LTV badge (when a home price is set) and, with 2+ valid scenarios, the loan comparison — and shows no rental inputs or deal metrics.
2. **Given** the user visits `/deal-analyzer`, **When** the page renders, **Then** it shows scenario tabs, the financing inputs (Loan and Real-estate costs), rental inputs, LTV and Cash-on-Cash badges, the income vs. expenses card, cap rate, 1% and 50% rule indicators and, with 2+ valid scenarios, a comparison including deal columns — and does not show the amortization schedule table or extra-payment editor.
3. **Given** the user visits `/`, **When** the request resolves, **Then** they land on `/amortization`.
4. **Given** the user edits a scenario on one page, **When** they navigate to the other page (via the menu, or by reloading), **Then** the same scenarios, active scenario, and values are shown — the two pages share one session-scoped scenario set.
5. **Given** an invalid loan input on the Deal Analyzer page, **When** the page renders, **Then** the field error is shown and deal metrics are hidden, exactly as before; rental input errors never block the loan figures (spec 002 FR-015 preserved).

---

### User Story 2 - Responsive, collapsible left-side menu (Priority: P1)

On any page the user sees a left-side menu with links to "Amortization Calculator" and "Rental Deal Analyzer". On desktop the menu is always available and can be collapsed to a narrow icon rail to give the content more room, and expanded again. On a phone the menu is hidden behind a menu button and slides in over the content when opened.

**Why this priority**: Without navigation the two pages are not discoverable from each other.

**Independent Test**: At 1280px width, collapse and expand the menu with its toggle button and by keyboard; reload and confirm the collapsed/expanded choice is remembered. At 390px width, open the menu from the header button, follow a link, and confirm the menu closes and the target page shows.

**Acceptance Scenarios**:

1. **Given** a viewport ≥ 1024px wide, **When** any page renders, **Then** the menu is shown docked on the left, expanded by default, with an icon and text label for each feature link.
2. **Given** the docked menu is expanded, **When** the user activates the collapse toggle, **Then** the menu shrinks to an icon-only rail, link labels remain available to assistive technology and as a tooltip, and the main content widens; activating it again expands it.
3. **Given** the user collapsed the docked menu, **When** they navigate or reload, **Then** it stays collapsed (preference remembered on this device).
4. **Given** a viewport < 1024px wide, **When** any page renders, **Then** the menu is hidden and a header button labeled "Open navigation" is shown; activating it opens the menu as an overlay sheet from the left with a backdrop.
5. **Given** the mobile menu is open, **When** the user follows a link, presses Escape, or taps the backdrop, **Then** the menu closes and focus returns to the menu button (or moves to the new page's main heading after navigation).
6. **Given** any viewport, **When** a page renders, **Then** the link for the current page is visually highlighted and marked as the current page for assistive technology.
7. **Given** a keyboard-only user, **When** they Tab through the page, **Then** the toggle/menu button and every link are reachable and operable with Enter/Space, with visible focus, and the mobile sheet keeps focus inside it while open.

---

### User Story 3 - Features separated in the codebase with shared code (Priority: P2)

A developer working on one feature finds its code in that feature's own libraries, and finds common code in shared libraries. Neither feature contains a copy of something the other has; the deal analyzer reuses the shared loan model, schedule math, persistence, fields and components rather than re-implementing them.

**Why this priority**: Developer-facing; it enables the page split cleanly and keeps future work on each feature independent, but users don't see it directly.

**Independent Test**: Run the Nx project graph and lint: amortization libraries do not depend on deal-analyzer libraries and vice versa; both depend on shared libraries; shared libraries depend on neither feature. All existing unit tests pass after moving, unchanged in assertions.

**Acceptance Scenarios**:

1. **Given** the workspace, **When** `nx graph` is inspected, **Then** there are shared, amortization, and deal-analyzer libraries, with feature libraries depending only on shared libraries (never on each other) and shared libraries depending on no feature library.
2. **Given** a developer adds an import from a deal-analyzer library into an amortization library (or into a shared library), **When** lint runs, **Then** `@nx/enforce-module-boundaries` reports an error.
3. **Given** the refactor is complete, **When** all unit and e2e tests run, **Then** every pre-existing calculation test passes with unchanged expected values.
4. **Given** the codebase, **When** searched, **Then** no function, component, or hook is implemented in more than one library (e.g., there is one `computeSchedule`, one `NumberField`, one scenario store, one comparison grid).

---

### Edge Cases

- A scenario that has rental data is viewed on the Amortization page: rental data is kept untouched (not shown, not cleared) and reappears on the Deal Analyzer page.
- Removing the last scenario on either page creates a fresh default scenario visible on both pages.
- Resizing the window across the 1024px breakpoint while the mobile sheet is open closes the sheet and shows the docked menu in its remembered state.
- Storage unavailable (private mode / blocked): the menu defaults to expanded and scenarios work in memory for the current page session; nothing throws.
- Unknown route (e.g., `/foo`): the standard not-found page renders inside the same shell with the menu, so the user can navigate back.
- Very long scenario lists or wide comparison grids on mobile: content scrolls horizontally within its own container; the page itself never scrolls horizontally.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST serve the Amortization Calculator at `/amortization` and the Rental Deal Analyzer at `/deal-analyzer`; `/` MUST redirect to `/amortization`.
- **FR-002**: Each page MUST have its own document title and main heading.
- **FR-003**: Both pages MUST read and write one shared, session-scoped scenario set (same storage key and format as today, so existing session data still loads), and MUST NOT lose unsaved edits when navigating between pages.
- **FR-004**: The Amortization page MUST NOT render rental inputs or deal metrics; the Deal Analyzer page MUST NOT render the schedule table or the extra-payment editor. Extra payments that exist on a scenario MUST still be applied to the debt service used by the Deal Analyzer, as today.
- **FR-005**: The Amortization page's comparison MUST show loan columns only; the Deal Analyzer page's comparison MUST show loan columns plus monthly cash flow, NOI, cap rate and CoC, with "—" for scenarios without rental data. On `/deal-analyzer` the deal columns are always present, even if no scenario has rental data (unlike the pre-split page, which hid them until one did).
- **FR-006**: All calculations MUST produce results identical to the pre-change app (no change to formulas, rounding, or validation messages).
- **FR-007**: A left-side navigation menu MUST be present on every page, with a link per feature (icon + label), and the current page's link MUST be marked `aria-current="page"`.
- **FR-008**: At widths ≥ 1024px the menu MUST be docked and collapsible to an icon-only rail via a toggle button exposing `aria-expanded` and an accessible name that reflects its action; the collapsed state MUST persist on the device across reloads.
- **FR-009**: At widths < 1024px the menu MUST be hidden behind a header button and open as a modal left-edge sheet that traps focus, closes on Escape, backdrop press, or link activation, and restores focus on close.
- **FR-010**: The menu and pages MUST work without horizontal page scrolling from 320px width upward.
- **FR-011**: The codebase MUST organize code into shared, amortization, and deal-analyzer libraries, with Nx tags and module-boundary rules enforcing that feature libraries depend only on shared libraries and shared libraries on no feature library.
- **FR-012**: Each piece of functionality used by both features (scenario model and validation, schedule computation, principal auto-calculation, persistence, scenario store, number/date fields, scenario tabs, metric badges, comparison grid, loan and cost input forms, app shell/navigation) MUST exist exactly once, in a shared library.
- **FR-013**: Adding a third feature page MUST require only a new route and one new navigation entry (no menu component changes).

### Key Entities

- **Navigation item**: a feature entry in the menu — id, label, route, icon.
- **Navigation preference**: the per-device docked-menu collapsed/expanded choice.
- **Scenario set**: the existing session-scoped list of loan scenarios (spec 001/002), now shared across pages — no shape change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of pre-existing unit tests pass with unchanged expected values, and all pre-existing e2e flows pass after being pointed at the page that now hosts them.
- **SC-002**: A user can switch between the two features in one click/tap from any page, at both desktop (1280px) and mobile (390px) widths.
- **SC-003**: Navigating between pages preserves 100% of entered scenario data.
- **SC-004**: Zero `@nx/enforce-module-boundaries` violations, and zero cross-feature dependency edges in the Nx project graph.
- **SC-005**: Zero duplicated implementations of shared functionality across libraries (each exported symbol listed in FR-012 is defined in exactly one library).
- **SC-006**: The menu's toggle, sheet, and links pass keyboard-only operation and expose correct ARIA state (`aria-expanded`, `aria-current`, modal focus trap) in automated e2e checks.

## Assumptions

- The Deal Analyzer page keeps editable financing inputs (the same shared Loan and Real-estate cost forms) because its metrics depend on price, down payment, rate, term, tax, insurance and HOA; it does not re-implement them.
- The menu-collapsed preference is a UI convenience, not financial scenario data, so storing it in `localStorage` is consistent with Constitution Principle III (which governs user-entered financial data).
- The Nx application project keeps its current name (`amortization-calculator`) to avoid churn in CI/e2e wiring; renaming it is out of scope.
- No new features, metrics, or inputs are introduced; this is a reorganization plus navigation.
