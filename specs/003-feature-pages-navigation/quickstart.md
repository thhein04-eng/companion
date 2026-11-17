# Quickstart: Validate Feature Pages & Side Navigation

## Prerequisites

Run all commands from the worktree root:

```bash
cd /Users/t_hein/Projects/companion/.claude/worktrees/003-feature-pages-navigation   # worktree root
npm install            # worktree has its own node_modules; also links the new workspace libs
```

## 1. Structure & boundaries (US3, SC-004/005)

```bash
npm exec nx show projects            # expect: shared-calculations, shared-data-access, shared-ui,
                                     #   amortization-calculations, amortization-ui,
                                     #   deal-analyzer-calculations, deal-analyzer-ui, + app/e2e
npm exec nx run-many -t lint         # expect: 0 errors (incl. @nx/enforce-module-boundaries)
npm exec nx graph --file=specs/003-feature-pages-navigation/graph.json
```

- In `graph.json`, check that no `amortization-*` node depends on `deal-analyzer-*` or the reverse, and that no `shared-*` node depends on a feature node ([module-boundaries](contracts/module-boundaries.md)).
- Negative check: temporarily add `import { analyzeDeal } from 'deal-analyzer-calculations';` to `libs/amortization/ui/src/index.ts`, then run `npm exec nx lint amortization-ui`. Expect a boundary error, then revert.
- Duplication check: each symbol in [library-apis](contracts/library-apis.md) is defined once:
  ```bash
  grep -rnE "export (function|const) (computeSchedule|NumberField|useScenarios|ComparisonGrid|LoanInputForm)\b" libs apps --include=*.ts --include=*.tsx | grep -v spec
  ```
  Expect exactly one line per symbol.

## 2. Calculations unchanged (FR-006, SC-001)

```bash
npm exec nx run-many -t test --configuration=ci   # or: -t test-ci
```

Expect every moved spec (compute-schedule, validate-scenario, persistence, analyze-deal, validate-rental, export-schedule, calculate-principal, apply-scenario-patch, and the split compare-scenarios / with-deal-metrics) to pass with **unchanged** expected values. `git diff main -- '*.spec.ts'` should show only import-path changes and the compare test split.

## 3. Pages & navigation end to end (US1, US2, SC-002/003/006)

```bash
npm exec nx e2e amortization-calculator-e2e
```

Expect all pre-existing suites (retargeted to `/amortization` or `/deal-analyzer`) plus the new `navigation.spec.ts` to pass in chromium, firefox, and webkit.

## 4. Manual run-through

```bash
npm exec nx dev amortization-calculator     # http://localhost:3000
```

| #   | Steps                                                                                                                                           | Expected                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Open `/`                                                                                                                                        | Lands on `/amortization`; title "Amortization Calculator · Companion"; menu link "Amortization Calculator" highlighted                                                                    |
| M2  | On `/amortization`                                                                                                                              | Loan, Real-estate costs, Extra payments, schedule + Export CSV; **no** "Monthly rent" field                                                                                               |
| M3  | Enter spec 002 Scenario 1 financing (price 250,000, down 62,500, 7%, tax 3,000, insurance 1,200), then click "Rental Deal Analyzer" in the menu | Financing values are already filled in; enter rent 2,400, closing 7,500, rehab 10,000 → LTV 75.0%, and CoC / cap rate / rule results match spec 002 quickstart                            |
| M4  | Add a 2nd scenario on `/deal-analyzer` with different rent                                                                                      | "Compare scenarios" shows loan **and** deal columns; switch to `/amortization` → the same 2 scenarios, loan columns only                                                                  |
| M5  | Desktop 1280px: click "Collapse navigation"                                                                                                     | Icon rail; hovering or focusing an icon shows its label; reload → still collapsed; "Expand navigation" restores it                                                                        |
| M6  | Keyboard only: Tab to the toggle, press Enter/Space; Tab to the links                                                                           | Toggles; focus is visible; `aria-expanded` flips                                                                                                                                          |
| M7  | DevTools device mode 390px                                                                                                                      | Docked menu hidden; header "Open navigation" opens a left sheet with backdrop; Tab stays inside it; Esc closes it and focus returns to the button; tapping a link navigates and closes it |
| M8  | 390px with the sheet open → widen past 1024px                                                                                                   | Sheet closes; docked menu appears in its remembered state                                                                                                                                 |
| M9  | 320px width on both pages                                                                                                                       | No horizontal page scroll; tables scroll inside their own container                                                                                                                       |
| M10 | Visit `/nope`                                                                                                                                   | Not-found page inside the shell; the menu works                                                                                                                                           |
| M11 | Reload on `/deal-analyzer`                                                                                                                      | Scenarios persist for the session (same `amortization:scenarios` key)                                                                                                                     |
