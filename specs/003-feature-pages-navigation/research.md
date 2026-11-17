# Phase 0 Research: Feature Pages & Side Navigation

All Technical Context unknowns are resolved below. Findings come from reading the current code (`apps/amortization-calculator`, `libs/amortization-calculations`, `libs/amortization-ui`), the installed `@ui-sdk/react@0.1.0-beta.1` docs (`node_modules/@ui-sdk/react/docs`), and the constitution.

---

## R1. Library topology: how to split the two features plus shared code

**Decision**: Use seven Nx libraries in three scope folders, each tagged `scope:*` + `type:*`:

| Path                              | Package / import             | Tags                               | Holds                                                                                                                                                                                                    |
| --------------------------------- | ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/shared/calculations`        | `shared-calculations`        | `scope:shared`, `type:calc`        | Loan scenario types, `roundCents`, `validateScenario`, `computeSchedule`, `calculatePrincipal…`, `applyScenarioPatch`, persistence, `computeLtv`, `computeValidSchedules`, loan-only `compareScenarios`  |
| `libs/shared/data-access`         | `shared-data-access`         | `scope:shared`, `type:data-access` | `ScenariosProvider` + `useScenarios` (the single session-backed scenario store)                                                                                                                          |
| `libs/shared/ui`                  | `shared-ui`                  | `scope:shared`, `type:ui`          | `NumberField`, `DateField`, `ScenarioTabs`, `MetricBadge(Group)`, generic `ComparisonGrid` + `LOAN_COMPARISON_COLUMNS`, `LoanInputForm`, `CostBreakdownPanel`, `AppShell`, `SideNav`, `useNavPreference` |
| `libs/amortization/calculations`  | `amortization-calculations`  | `scope:amortization`, `type:calc`  | `scheduleToCsv`                                                                                                                                                                                          |
| `libs/amortization/ui`            | `amortization-ui`            | `scope:amortization`, `type:ui`    | `ScheduleTable`, `ExtraPaymentPanel`, `ExportScheduleButton`, `AmortizationCalculatorView`                                                                                                               |
| `libs/deal-analyzer/calculations` | `deal-analyzer-calculations` | `scope:deal-analyzer`, `type:calc` | `analyzeDeal`, `validateRental`, `DEFAULT_RENTAL_ASSUMPTIONS`, `withDealMetrics`, deal result types                                                                                                      |
| `libs/deal-analyzer/ui`           | `deal-analyzer-ui`           | `scope:deal-analyzer`, `type:ui`   | `RentalInputsPanel`, `IncomeExpenseCard`, `RuleIndicator`, `DealMetrics`, `DEAL_COMPARISON_COLUMNS`, `useRentalEditor`, `DealAnalyzerView`                                                               |

`shared-data-access` exists to hold the one stateful store (see R4).

**Rationale**: This matches Nx's recommended "scope × type" grouping, which lets `@nx/enforce-module-boundaries` _enforce_ the user's two requirements: feature isolation (scope rule) and logic-below-UI (type rule). Keeping `calc` libraries separate from `ui` libraries is what Constitution I/II already require (pure functions testable without a DOM). The existing two libraries are moved, not recreated, so git history follows the files.

**Alternatives considered**:

- _One lib per feature (calc + UI mixed)_: fewer projects, but violates Constitution II (calc code must be testable without DOM/React) and makes type-based boundary rules impossible.
- _Keep the existing two libs, add folders inside them_: no enforceable boundary between features; the user explicitly asked for separation "in the project itself".
- _Put shared code in the app_: would force both feature libs to import from the app (circular, forbidden) or duplicate it.

---

## R2. Where the `rental` slot and `RentalAssumptions` type live

**Decision**: `RentalAssumptions` (the _data shape_ only) and `LoanScenario.rental?` stay in `shared-calculations/types`. All rental _behavior_ — `validateRental`, `DEFAULT_RENTAL_ASSUMPTIONS`, `analyzeDeal`, rule checks, deal result types (`DealAnalysis`, `OperatingExpenseLine`, rule results) — moves to `deal-analyzer-calculations`.

**Rationale**: The scenario is one persisted entity (spec 002 FR-016 stores rental inside each scenario under the same session key). Persistence and `applyScenarioPatch` already need to know the field exists (merge semantics, back-fill `rental: null`). If the type lived in the deal-analyzer lib, shared code would have to import a feature lib, which the boundary rules forbid. A data-shape type is not duplicated functionality, and it keeps the stored format unchanged (FR-003).

**Alternatives considered**:

- _Generic `LoanScenario<TExt>` with feature extensions_: clean in theory, but spreads type parameters through every shared function and component for one optional field.
- _TypeScript module augmentation from the deal-analyzer lib_: hidden coupling, order-dependent, and hard to read.
- _Store rental data under a separate session key_: changes the persisted format, so existing sessions would lose data; also spec 002 tests depend on the current shape.

---

## R3. Scenario comparison without duplication

**Decision**: Split the current mixed `compareScenarios(schedules, analyses)` in two:

- `shared-calculations`: `computeValidSchedules(scenarios)` (the validate-then-compute loop both pages need) and `compareScenarios(schedules): ScenarioComparison`, which returns loan columns only.
- `deal-analyzer-calculations`: `withDealMetrics(comparison, analyses): DealScenarioComparison`, which adds `monthlyCashFlow`, `annualNoi`, `capRate`, `cashOnCashReturn` to each row.
- `shared-ui`: `ComparisonGrid<Row>` renders any `ComparisonColumn<Row>[]`. Shared exports `LOAN_COMPARISON_COLUMNS`. Deal UI exports `DEAL_COMPARISON_COLUMNS = [...LOAN_COMPARISON_COLUMNS, ...dealColumns]`.

**Rationale**: Each page then composes the same primitives. The existing `compare-scenarios.spec.ts` assertions split one-to-one across the two functions with identical expected values (FR-006). Column-driven rendering removes the `showDeal` branch from the shared grid, so shared UI no longer knows about deal metrics.

**Alternatives considered**: Keeping a single comparison with optional deal fields in shared code leaks deal concepts into shared code and leaves cross-feature knowledge in place. Two separate grids would duplicate the table markup.

---

## R4. One scenario store shared by both pages

**Decision**: Move `use-scenarios.ts` into `shared-data-access` as a React context: `ScenariosProvider` is mounted once in the root `layout.tsx`, and `useScenarios()` reads from it. The store keeps the same `sessionStorage` key (`amortization:scenarios`), serialization, hydration-safe placeholder id, and StrictMode-safe updaters. `updateActiveRental` is removed from the shared hook. It becomes `useRentalEditor()` in `deal-analyzer-ui`, built on the shared `updateActiveScenario`, because it depends on `DEFAULT_RENTAL_ASSUMPTIONS` (a deal-analyzer concept).

**Rationale**: App Router layouts persist across client-side navigation, so a provider in the layout keeps in-memory state when switching pages, with no reload-from-storage flash. `sessionStorage` still covers full reloads (FR-003, Constitution III). A dedicated `data-access` lib keeps stateful React code out of the pure `calc` lib and out of the presentational `ui` lib, which keeps the dependency direction one-way: `ui → data-access → calc`.

**Alternatives considered**:

- _Each page calls the hook independently (today's model)_: works, but each mount re-reads storage, and an edit followed by fast navigation can race the write effect.
- _Put the provider in `shared-ui`_: workable, but it mixes state with presentational components.
- _An external state library (Zustand, etc.)_: a new dependency for something React context already handles.

---

## R5. Routing structure

**Decision**: App Router routes:

- `app/layout.tsx`: `<ScenariosProvider><AppShell navItems={NAV_ITEMS}>{children}</AppShell></ScenariosProvider>`
- `app/page.tsx`: server component that calls `redirect('/amortization')`
- `app/amortization/page.tsx` and `app/deal-analyzer/page.tsx`: each exports `metadata` and renders its feature view (`<AmortizationCalculatorView />` / `<DealAnalyzerView />`)
- `app/not-found.tsx`: renders inside the shell
- `app/_nav.ts`: the `NAV_ITEMS` config. This is the app-owned list that FR-013 relies on.

**Rationale**: Route files stay a few lines long (Constitution II, "thin apps"). Per-route `metadata` gives each page its own title (FR-002). The shell lives in the layout, so the menu does not remount on navigation and keeps its collapsed state. Feature views live in feature UI libs, so the app holds no business logic.

**Alternatives considered**: A `next.config.js` `redirects()` entry for `/`. This would also work, but `redirect()` in the page keeps routing in one place and works with `next dev` and `start` the same way. Route groups (`(features)`) are not needed with a single shell.

---

## R6. Responsive collapsible side menu: behavior primitives

**Decision**:

- **≥ 1024px (Tailwind `lg`)**: a docked `<nav aria-label="Primary">` in a CSS-grid shell. A plain `<button>` toggle (`@ui-sdk/react/button`) sets `aria-expanded` and `aria-controls`. Its accessible name switches between "Collapse navigation" and "Expand navigation". Collapsed width is a 4rem icon rail. Expanded width is 16rem. Labels stay in the DOM: they are visually hidden with `sr-only` when collapsed, and a `@ui-sdk/react/tooltip` shows the label on hover/focus. Width animates with `transition-[width]`, which is turned off under `prefers-reduced-motion`.
- **< 1024px**: a header bar with an "Open navigation" `DrawerTrigger`. The menu content renders inside `@ui-sdk/react/drawer` with `side="left"`, `preventEdgeSwipe`, `modal` (default), and a controlled `open`/`onOpenChange`. The drawer closes when `usePathname()` changes, which covers link activation (FR-009). Escape, backdrop press, and focus trap/restore come from the Drawer (it shares Dialog's focus and dismissal behavior).
- **Links**: Next `<Link>` with `aria-current="page"` when `usePathname()` starts with the item's `href`.
- **One component, two containers**: `SideNav` (the list of links) is rendered by both the docked aside and the drawer content, so there is no duplicated link markup.
- **Breakpoint crossing**: `matchMedia('(min-width: 1024px)')` listener closes the drawer when the viewport becomes desktop size.

**Rationale**: Constitution IV requires the ui-sdk for interactive primitives wherever it can do the job. The installed beta provides `drawer` (left side, controlled, modal focus trap), `tooltip`, and `button`, which is everything needed. `navigation-menu` is for flyout panels with triggers and does not fit a flat list of two links, so a semantic `<nav>` + `<ul>` + `<a>` is the correct, accessible pattern there.

**Alternatives considered**:

- _`@ui-sdk/react/collapsible` for the desktop rail_: Collapsible hides panel content, but the rail must keep icons visible and labels readable by screen readers. A toggle button with `aria-expanded` gives the right semantics.
- _Hand-rolled mobile overlay_: would re-solve focus trap and Escape handling, which Constitution IV forbids.
- _CSS-only checkbox hack_: no focus management.

---

## R7. Persisting the collapsed preference

**Decision**: `useNavPreference()` in `shared-ui` stores `{ collapsed: boolean }` in `localStorage` under `companion:nav`. Every access is wrapped in try/catch, and it defaults to expanded. It reads in a client effect after hydration, and the server always renders expanded. A `data-nav-collapsed` attribute on the shell drives the CSS.

**Rationale**: This is a per-device UI convenience, not financial data, so Constitution III's sessionStorage default does not apply (documented in the spec's Assumptions). It needs to survive new sessions to feel remembered. Defaulting on the server avoids hydration mismatches. The one-frame expand-then-collapse on first paint is acceptable for a two-item menu.

**Alternatives considered**: A cookie read on the server avoids the flash, but forces dynamic rendering of every route and adds server handling for a cosmetic preference. `sessionStorage` would forget the choice on every new tab.

---

## R8. Executing the move with Nx generators

**Decision**:

1. `nx g @nx/workspace:move --projectName=amortization-calculations --destination=libs/amortization/calculations` (and the same for `amortization-ui` → `libs/amortization/ui`). This keeps the package names.
2. `nx g @nx/js:lib libs/shared/calculations --name=shared-calculations --unitTestRunner=vitest --bundler=none`
3. `nx g @nx/react:lib` for `libs/shared/ui`, `libs/shared/data-access`, `libs/deal-analyzer/ui`; `nx g @nx/js:lib` for `libs/deal-analyzer/calculations`.
4. Move source files with `git mv` (to keep history) into their target libs, update each `src/index.ts` public API, and add `tags` to each lib's `package.json` `nx` block.
5. Update the app's `next.config.js` `transpilePackages`, the app's `tsconfig.json` references, and `global.css` `@source` globs (Tailwind v4 must scan every UI lib).
6. Replace the `depConstraints` wildcard in the root `eslint.config.mjs` with scope and type rules (see contracts/module-boundaries.md).

**Rationale**: The constitution's Technology Stack section requires generators for new libs. The workspace uses npm workspaces with package-name imports (not TS path aliases), so each new lib needs a `package.json` and an entry in `node_modules` through workspaces. Running `npm install` after generating creates those symlinks.

**Alternatives considered**: Hand-creating lib folders. This is faster but is forbidden by the constitution and skips Nx's inferred targets.

---

## R9. E2E test impact

**Decision**: Existing specs change only their `page.goto('/')` target: amortization flows go to `/amortization`, `deal-analyzer.spec.ts` goes to `/deal-analyzer`, and `scenario-comparison.spec.ts` deal-column cases move to `/deal-analyzer`. New `navigation.spec.ts` covers the redirect, desktop collapse/persist, the mobile drawer (via `page.setViewportSize({width: 390, height: 844})`), `aria-current`, and cross-page state retention.

**Rationale**: These changes are mechanical retargets, so the spec 001/002 behaviors stay covered (SC-001). Viewport sizing inside a test avoids adding mobile Playwright projects that would double the run time.

---

## Open items

None. No NEEDS CLARIFICATION remains.
