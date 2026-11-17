---
description: 'Task list for 003-feature-pages-navigation'
---

# Tasks: Feature Pages & Side Navigation

**Input**: Design documents from `/specs/003-feature-pages-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (routes-and-navigation, library-apis, module-boundaries), quickstart.md

**Tests**: Included. The constitution requires unit tests for every calculation change (Principle I) and passing `nx lint/test/e2e` before a task counts as done. The spec's SC-001 and SC-006 call for automated e2e checks.

**Organization**: In practice, the codebase split (US3) has to happen before either page can be built. Its _mechanical work_ (generating, moving and rewiring libraries) is therefore in Setup and Foundational, and the Phase 2 checkpoint proves behavior is unchanged on the old single page. The US3 phase holds the story's own acceptance work: enforcement checks, the duplication audit, and docs.

**Working directory**: All paths are relative to the worktree root `/Users/t_hein/Projects/companion/.claude/worktrees/003-feature-pages-navigation`. Run every Nx command as `npm exec nx -- …` (or `npx nx …`) from that root. Never `cd` into the main checkout.

**File moves**: Use `git mv` for every file that moves, so history follows it. After a move, update its imports. Relative `./x` imports inside a lib stay relative. Cross-lib imports use package names (`shared-calculations`, `shared-ui`, and so on), never deep paths.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = feature pages, US2 = side navigation, US3 = codebase separation

---

## Phase 1: Setup (Libraries, Tags, Boundaries)

**Purpose**: Create the seven-library layout from research R1/R8 and enforce boundaries before any code moves.

- [x] T001 Run `npm install` at the worktree root (the worktree has no `node_modules`), then run `npm exec nx -- show projects` and confirm it lists `amortization-calculator`, `amortization-calculator-e2e`, `amortization-calculations`, `amortization-ui`
- [x] T002 Move lib `amortization-calculations` to `libs/amortization/calculations`. First check the flags with `npm exec nx -- g @nx/workspace:move --help`, then run it with `--projectName=amortization-calculations --destination=libs/amortization/calculations --newProjectName=amortization-calculations`. Afterwards verify that relative paths were rewritten one level deeper in `libs/amortization/calculations/{tsconfig.json,tsconfig.lib.json,tsconfig.spec.json,eslint.config.mjs,vitest.config.mts}` (`../../` → `../../../`, including `cacheDir` and the `test.name` staying `amortization-calculations`), and that root `tsconfig.json` references and `apps/amortization-calculator/tsconfig.json` references point at the new path
- [x] T003 Move lib `amortization-ui` to `libs/amortization/ui` the same way as T002 (`--projectName=amortization-ui --destination=libs/amortization/ui --newProjectName=amortization-ui`), and verify the same files plus `libs/amortization/ui/{vite.config.mts,.babelrc}`
- [x] T004 Generate `shared-calculations`: `npm exec nx -- g @nx/js:lib libs/shared/calculations --name=shared-calculations --bundler=none --unitTestRunner=vitest --linter=eslint` (check `--help` first and don't guess flags). Set `testEnvironment`/`environment: 'node'` in its vitest config
- [x] T005 Generate `deal-analyzer-calculations` with the same generator and options as T004, at `libs/deal-analyzer/calculations`
- [x] T006 Generate `shared-data-access`: `npm exec nx -- g @nx/react:lib libs/shared/data-access --name=shared-data-access --bundler=none --unitTestRunner=vitest --linter=eslint --style=none --component=false`
- [x] T007 Generate `shared-ui` with the same generator and options as T006, at `libs/shared/ui`
- [x] T008 Generate `deal-analyzer-ui` with the same generator and options as T006, at `libs/deal-analyzer/ui`
- [x] T009 Normalize the five generated libs to match the existing lib convention in `libs/amortization/calculations/package.json`: `"main"`, `"types"`, and `exports["."]` (`types`/`import`/`default`) all set to `./src/index.ts`, `"private": true`. Delete the generator's sample source and spec files, leaving an empty `src/index.ts`. In each UI and data-access lib's `vite.config.mts`, set `environment: 'jsdom'` and `passWithNoTests: true`, the same as `libs/amortization/ui/vite.config.mts`. Add `"dependencies"` that mirror the import graph in contracts/module-boundaries.md, e.g. `deal-analyzer-ui` → `shared-calculations`, `shared-data-access`, `shared-ui`, `deal-analyzer-calculations`, `@ui-sdk/core`, `@ui-sdk/react` (all `"*"` except ui-sdk at `0.1.0-beta.1`). `amortization-ui` and `amortization-calculations` gain `shared-*` dependencies the same way
- [x] T010 Add `"nx": { "tags": [...] }` to all nine `package.json` files exactly as listed in contracts/module-boundaries.md (e.g. `libs/shared/ui/package.json` → `["scope:shared","type:ui"]`, `apps/amortization-calculator/package.json` → `["scope:app","type:app"]` while keeping its existing `sourceRoot`, `apps/amortization-calculator-e2e/package.json` → `["scope:app","type:e2e"]` while keeping `implicitDependencies`)
- [x] T011 In root `eslint.config.mjs`, replace the `depConstraints` wildcard (`sourceTag: '*' → ['*']`) with the eight scope and type constraints from contracts/module-boundaries.md (`scope:app` → shared/amortization/deal-analyzer; `scope:amortization` → shared, amortization; `scope:deal-analyzer` → shared, deal-analyzer; `scope:shared` → shared; `type:app` → ui, data-access, calc; `type:ui` → ui, data-access, calc; `type:data-access` → data-access, calc; `type:calc` → calc; `type:e2e` → `[]`)
- [x] T012 Wire the app to all seven libs: `apps/amortization-calculator/next.config.js` `transpilePackages` lists all seven package names; `apps/amortization-calculator/package.json` `dependencies` lists them (`"*"`); `apps/amortization-calculator/tsconfig.json` `references` includes all seven lib paths; `apps/amortization-calculator/src/app/global.css` replaces the single `@source` with three lines, `@source '../../../../libs/shared/ui/src';`, `@source '../../../../libs/amortization/ui/src';`, `@source '../../../../libs/deal-analyzer/ui/src';`
- [x] T013 Run `npm install` again to link the new workspace packages, then `npm exec nx -- run-many -t lint,test` and `npm exec nx -- build amortization-calculator`. Everything must pass before any code moves (the app still imports only the two renamed-path libs)

**Checkpoint**: 9 projects, tags and boundary rules active, app builds unchanged.

---

## Phase 2: Foundational (Move Code into Its Owning Library)

**Purpose**: Put every piece of code in exactly one library (contracts/library-apis.md), then rewire the _existing single page_ to use it, so the e2e suite proves calculations and behavior are unchanged before the page split starts.

**⚠️ CRITICAL**: US1 and US2 cannot start until this phase's checkpoint passes.

### Shared calculations

- [x] T014 `git mv` these from `libs/amortization/calculations/src/lib/` to `libs/shared/calculations/src/lib/`: `round.ts`, `validate-scenario.ts`, `validate-scenario.spec.ts`, `compute-schedule.ts`, `compute-schedule.spec.ts`, `calculate-principal.ts`, `calculate-principal.spec.ts`, `apply-scenario-patch.ts`, `apply-scenario-patch.spec.ts`, `persistence.ts`, `persistence.spec.ts`, `compare-scenarios.ts`, `compare-scenarios.spec.ts`, `types.ts`. Do not change any expected value in any spec
- [x] T015 Split `libs/shared/calculations/src/lib/types.ts` per data-model.md §1. **Keep** `DownPayment`, `LoanScenario` (unchanged, including `rental?: RentalAssumptions | null`), `RentalAssumptions` (unchanged), `ExtraPaymentRule`, `SchedulePeriod`, `AmortizationSchedule`, `FieldError`, `PersistedState`, `MonthlyAnnual`, `RatioResult`. **Narrow** `ScenarioComparison.rows` to `{ scenarioId: string; monthlyPayment: number; totalInterest: number; totalCost: number; payoffDate: string }[]`. **Add** `export type ComparisonRow = ScenarioComparison['rows'][number]`. **Move** `OperatingExpenseCategory`, `OperatingExpenseLine`, `OnePercentRuleResult`, `FiftyPercentRuleResult`, `DealAnalysis` (unchanged) to a new `libs/deal-analyzer/calculations/src/lib/types.ts`, which imports shared types from `shared-calculations`
- [x] T016 Narrow `compareScenarios` in `libs/shared/calculations/src/lib/compare-scenarios.ts` to `compareScenarios(schedules: AmortizationSchedule[]): ScenarioComparison`. Remove the `analyses` parameter and the four deal fields. In `compare-scenarios.spec.ts`, keep the `describe('compareScenarios')` block unchanged and cut the `describe('compareScenarios — deal metrics …')` block for T021
- [x] T017 [P] Extract `computeLtv` from `libs/amortization/calculations/src/lib/analyze-deal.ts` into new `libs/shared/calculations/src/lib/ltv.ts` with an unchanged body. Move its `describe`/`it` cases from `analyze-deal.spec.ts` into new `libs/shared/calculations/src/lib/ltv.spec.ts` without changing values
- [x] T018 [P] Add `computeValidSchedules(scenarios: LoanScenario[]): { scenario: LoanScenario; schedule: AmortizationSchedule }[]` in new `libs/shared/calculations/src/lib/compute-valid-schedules.ts`. For each input scenario in order, call `validateScenario`, skip it if invalid, and otherwise push `{ scenario: result.scenario, schedule: computeSchedule(result.scenario) }`. Add `compute-valid-schedules.spec.ts` covering: skips invalid scenarios, preserves input order, and each `schedule` deep-equals `computeSchedule(validatedScenario)`
- [x] T019 Write `libs/shared/calculations/src/index.ts` exporting: `./lib/types`, `./lib/round`, `./lib/validate-scenario`, `./lib/compute-schedule`, `./lib/calculate-principal`, `./lib/apply-scenario-patch`, `./lib/persistence`, `./lib/ltv`, `./lib/compute-valid-schedules`, `./lib/compare-scenarios`. Run `npm exec nx -- test shared-calculations`, which must pass

### Feature calculations

- [x] T020 `git mv` `analyze-deal.ts`, `analyze-deal.spec.ts`, `validate-rental.ts`, `validate-rental.spec.ts` from `libs/amortization/calculations/src/lib/` to `libs/deal-analyzer/calculations/src/lib/`. Change their imports of `./round`, `./compute-schedule`, and shared types to `shared-calculations`, and of deal types to `./types`
- [x] T021 Add `withDealMetrics(comparison: ScenarioComparison, analyses: Record<string, DealAnalysis | null>): DealScenarioComparison` in new `libs/deal-analyzer/calculations/src/lib/with-deal-metrics.ts`. For each row, spread it and add `monthlyCashFlow`, `annualNoi`, `capRate`, `cashOnCashReturn` taken from `analyses[row.scenarioId]`, with exactly the same field mapping the old `compareScenarios` used, and `null` when the analysis is missing. Add `DealComparisonRow = ComparisonRow & { monthlyCashFlow: number | null; annualNoi: number | null; capRate: number | null; cashOnCashReturn: number | null }` and `DealScenarioComparison = { scenarioIds: string[]; rows: DealComparisonRow[] }` to `libs/deal-analyzer/calculations/src/lib/types.ts`. Create `with-deal-metrics.spec.ts` from the deal `describe` block cut in T016, changing only the call shape (`withDealMetrics(compareScenarios(schedules), analyses)`) and not the expected values. "No map passed" becomes `withDealMetrics(comparison, {})`
- [x] T022 Write `libs/deal-analyzer/calculations/src/index.ts` exporting `./lib/types`, `./lib/analyze-deal` (`analyzeDeal`, `DEFAULT_RENTAL_ASSUMPTIONS`), `./lib/validate-rental`, `./lib/with-deal-metrics`. Make sure `computeLtv` is **not** defined here any more
- [x] T023 Slim `amortization-calculations`: `libs/amortization/calculations/src/lib/` keeps only `export-schedule.ts` and `export-schedule.spec.ts`, with imports switched to `shared-calculations`. `libs/amortization/calculations/src/index.ts` exports only `./lib/export-schedule`. Delete any leftover moved files. Run `npm exec nx -- run-many -t test -p shared-calculations deal-analyzer-calculations amortization-calculations`; all must pass

### Shared data-access

- [x] T024 Create `libs/shared/data-access/src/lib/scenarios-provider.tsx` (`'use client'`) from `apps/amortization-calculator/src/app/_hooks/use-scenarios.ts`. Keep `STORAGE_KEY = 'amortization:scenarios'`, `INITIAL_SCENARIO_ID`, `createDefaultScenario`, and the StrictMode-safe `addScenario`/`removeScenario` unchanged. Keep the hydration-safe load effect and the persist effect logic unchanged, but wrap each `window.sessionStorage.getItem`/`setItem` call in `try { … } catch { /* storage unavailable: keep in-memory state */ }`. When the read fails, it keeps the default scenario. Expose them through a React context: `export function ScenariosProvider({ children })` holds the state, and `export function useScenarios()` returns `{ scenarios, activeScenarioId, activeScenario, setActiveScenarioId, updateActiveScenario, addScenario, removeScenario }` and throws `Error('useScenarios must be used within <ScenariosProvider>')` outside the provider. **Remove** `updateActiveRental` (it moves in T031). Export both from `libs/shared/data-access/src/index.ts`, and add `scenarios-provider.spec.tsx` (jsdom, `@testing-library/react`) covering: the provider restores state from a pre-seeded `sessionStorage['amortization:scenarios']`; `updateActiveScenario` persists to the same key; `useScenarios` throws outside the provider; with `vi.spyOn(Storage.prototype, 'getItem')` and `'setItem'` set to throw, the provider renders the default scenario and `updateActiveScenario` still updates in-memory state with no error thrown

### Shared UI

- [x] T025 `git mv` `number-field.tsx`, `date-field.tsx`, `scenario-tabs.tsx`, `metric-badge.tsx`, `comparison-grid.tsx` from `libs/amortization/ui/src/lib/` to `libs/shared/ui/src/lib/`, changing `amortization-calculations` type imports to `shared-calculations`
- [x] T026 [P] Create `libs/shared/ui/src/lib/formatters.ts` exporting `currency` (`Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`), `percent1`, `percent2` (percent, min=max fraction digits 1 and 2), and `dateMedium` (`Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })`). These are copied exactly from today's `page.tsx` and `comparison-grid.tsx`, and those local copies are deleted when their files are rewritten
- [x] T027 Make `libs/shared/ui/src/lib/comparison-grid.tsx` column-driven. Export `interface ComparisonColumn<Row> { id: string; header: string; render: (row: Row) => string }` and `function ComparisonGrid<Row extends ComparisonRow>({ comparison, columns, scenarioNames }: { comparison: { rows: Row[] }; columns: ComparisonColumn<Row>[]; scenarioNames: Record<string, string> })`. The first column is always "Scenario" (`scenarioNames[row.scenarioId] ?? row.scenarioId`, as today). Export `LOAN_COMPARISON_COLUMNS: ComparisonColumn<ComparisonRow>[]` for Monthly Payment / Total Interest / Total Cost / Payoff Date, with the same header text and formatting as today. Remove the `showDeal` branch and all deal headers. Wrap `<table>` in `<div className="overflow-x-auto">`. Use the formatters from T026 and an `orDash(value, format)` helper exported from `formatters.ts` (moved from the grid)
- [x] T028 `git mv` `apps/amortization-calculator/src/app/_components/loan-input-form.tsx` and `cost-breakdown-panel.tsx` to `libs/shared/ui/src/lib/`. Change their `amortization-ui` imports to relative `./number-field`/`./date-field`, and their `amortization-calculations` imports to `shared-calculations`. Their props and markup do not change
- [x] T029 Write `libs/shared/ui/src/index.ts` exporting number-field, date-field, scenario-tabs, metric-badge, comparison-grid, formatters, loan-input-form, cost-breakdown-panel

### Feature UI building blocks

- [x] T030 [P] `amortization-ui`: keep `libs/amortization/ui/src/lib/schedule-table.tsx` (wrap its table in `<div className="overflow-x-auto">` if it isn't already). `git mv` `apps/amortization-calculator/src/app/_components/extra-payment-panel.tsx` and `export-schedule-button.tsx` into `libs/amortization/ui/src/lib/`, and switch imports to `shared-calculations`, `shared-ui`, and `amortization-calculations` (for `scheduleToCsv`). `libs/amortization/ui/src/index.ts` exports exactly schedule-table, extra-payment-panel, export-schedule-button
- [x] T031 [P] `deal-analyzer-ui`: `git mv` `libs/amortization/ui/src/lib/income-expense-card.tsx` and `rule-indicator.tsx`, plus `apps/amortization-calculator/src/app/_components/rental-inputs-panel.tsx`, into `libs/deal-analyzer/ui/src/lib/`, and switch imports to `deal-analyzer-calculations`, `shared-calculations`, and `shared-ui`. Create `libs/deal-analyzer/ui/src/lib/use-rental-editor.ts` (`'use client'`), which exports `useRentalEditor()` returning `updateActiveRental(patch: Partial<RentalAssumptions> | null)`. Implement it on top of `useScenarios().updateActiveScenario` with exactly today's logic from `use-scenarios.ts`: `null` → `{ rental: null }`. When there's no existing rental and `patch.grossMonthlyRent == null`, do nothing. When there's no existing rental and rent is given → `{ rental: { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: patch.grossMonthlyRent, ...patch } }`. Otherwise → `{ rental: patch as RentalAssumptions }`
- [x] T032 [P] Create `libs/deal-analyzer/ui/src/lib/deal-metrics.tsx` exporting `DealMetrics({ analysis }: { analysis: DealAnalysis })`. It renders exactly the `data-testid="deal-metrics"` grid from today's `apps/amortization-calculator/src/app/page.tsx` (cap-rate tile with `data-testid="cap-rate"`, the 1% Rule and 50% Rule `RuleIndicator`s, with identical text), using the `shared-ui` formatters
- [x] T033 [P] Create `libs/deal-analyzer/ui/src/lib/deal-comparison-columns.ts` exporting `DEAL_COMPARISON_COLUMNS: ComparisonColumn<DealComparisonRow>[] = [...LOAN_COMPARISON_COLUMNS, …]`, adding Monthly Cash Flow, Annual NOI, Cap Rate, and CoC. Use the same header text and formatting (including `—` via `orDash`) as the deal columns removed from the grid in T027
- [x] T034 Write `libs/deal-analyzer/ui/src/index.ts` exporting income-expense-card, rule-indicator, rental-inputs-panel, use-rental-editor, deal-metrics, deal-comparison-columns

### Rewire the existing single page (behavior-preservation gate)

- [x] T035 Rewire `apps/amortization-calculator/src/app/page.tsx` to the new libs **without changing its rendered output**. Import from `shared-calculations`, `shared-data-access`, `shared-ui`, `amortization-ui`, `deal-analyzer-calculations`, and `deal-analyzer-ui`. Replace `updateActiveRental` with `useRentalEditor()`, the inline deal-metrics grid with `<DealMetrics analysis={analysis} />`, and the comparison `useMemo` with `computeValidSchedules` → `compareScenarios` → `withDealMetrics` and `<ComparisonGrid columns={DEAL_COMPARISON_COLUMNS} …/>`. Wrap `{children}` in `apps/amortization-calculator/src/app/layout.tsx` with `<ScenariosProvider>`. Delete `apps/amortization-calculator/src/app/_components/` and `_hooks/` (both should be empty by now)
- [x] T036 Run `npm exec nx -- run-many -t lint,typecheck,test` and `npm exec nx -- e2e amortization-calculator-e2e`. **Every pre-existing e2e test must pass unmodified.** The one intended visual difference is that the comparison grid now always shows the deal columns (spec FR-005); no existing test checks that they are absent. This shows the code moves changed nothing (FR-006, SC-001). Then make a WIP commit: `refactor: split libs into shared/amortization/deal-analyzer scopes`

**Checkpoint**: Code lives in its owning libraries, boundaries pass lint, and the old single page behaves exactly as before.

---

## Phase 3: User Story 1 - Each feature on its own page (Priority: P1) 🎯 MVP

**Goal**: `/amortization` and `/deal-analyzer` each render their own feature, `/` redirects, and both pages share one scenario set.

**Independent Test**: Visit `/amortization`: the schedule is present and there's no "Monthly rent" field. Visit `/deal-analyzer`, enter spec 002 Scenario 1, and the badges and metrics match spec 002's values. Reload either page and the scenarios persist.

### Tests for User Story 1

- [x] T037 [P] [US1] Retarget existing e2e specs in `apps/amortization-calculator-e2e/src/` (change only `goto` targets): `baseline-schedule.spec.ts`, `real-estate-costs.spec.ts`, `extra-payments.spec.ts`, `export-schedule.spec.ts`, `principal-auto-calculation.spec.ts`, `scenario-comparison.spec.ts`, `validation-and-persistence.spec.ts` (both `goto('/')` calls) → `'/amortization'`; `deal-analyzer.spec.ts` (`enterScenarioOne` and the test at line ~131) → `'/deal-analyzer'`; `performance.spec.ts` first test → `'/amortization'`, second (Cash-on-Cash) test → `'/deal-analyzer'`. Also update `baseline-schedule.spec.ts:7` from `getByRole('heading', { name: 'Real Estate Amortization Calculator' })` to `{ name: 'Amortization Calculator', level: 1 }` (the h1 changes per FR-002; `level: 1` keeps it from matching the "Amortization schedule" h2). Rewrite the `deal-analyzer.spec.ts` test "FR-015: invalid rental input shows a field error without hiding the schedule" as a two-page flow. On `/deal-analyzer`, after `enterScenarioOne(page)` and Vacancy rate `150`: expect the text "Vacancy rate must be between 0% and 100%." to be visible, `data-testid="deal-metrics"` to be hidden, and the Real-estate costs total monthly payment to still show. Then `page.goto('/amortization')`: expect the heading "Amortization schedule" to be visible and `page.locator('table').last().locator('tbody tr')` to have 360 rows. Rename the test to "FR-015: invalid rental input never blocks the loan figures or schedule". Don't change any other assertion in that file
- [x] T038 [P] [US1] Create `apps/amortization-calculator-e2e/src/feature-pages.spec.ts` covering contracts/routes-and-navigation.md "Routes" and "Page section contract":
  - (a) `goto('/')` ends at URL `/amortization`
  - (b) titles are `Amortization Calculator · Companion` and `Rental Deal Analyzer · Companion`, and each page's `h1` matches
  - (c) `/amortization` has h2 "Amortization schedule" and "Extra payments", and has no textbox "Monthly rent" and no h2 "Deal analyzer"
  - (d) `/deal-analyzer` has h2 "Deal analyzer", "Loan", "Real-estate costs", and has no h2 "Amortization schedule" or "Extra payments"
  - (e) enter Home price 250000 on `/amortization`, `goto('/deal-analyzer')`, and the Home price field shows $250,000.00
  - (f) enter rent 2400 on `/deal-analyzer`, edit the interest rate on `/amortization`, return to `/deal-analyzer`, and rent is still 2400 (rental data preserved, spec Edge Case 1)
  - (g) with 2 scenarios, the `/amortization` comparison has no "Cap Rate" header and the `/deal-analyzer` comparison has one
  - (h) an invalid principal on `/deal-analyzer` shows the field error and hides `data-testid="deal-metrics"`

### Implementation for User Story 1

- [x] T039 [P] [US1] Create `libs/amortization/ui/src/lib/amortization-calculator-view.tsx` (`'use client'`) exporting `AmortizationCalculatorView`. Move into it the amortization parts of today's `page.tsx`, in this order:
  - `<h1 tabIndex={-1}>` "Amortization Calculator", plus the subtitle "Model a mortgage payment, its full schedule, real-estate costs, and early-payoff savings."
  - `MetricBadgeGroup` with only the LTV badge, rendered when `activeScenario.homePrice != null`
  - `ScenarioTabs`
  - "Loan" section (`LoanInputForm`)
  - "Real-estate costs" section (`CostBreakdownPanel`)
  - "Extra payments" section (`ExtraPaymentPanel` plus the savings note)
  - "Amortization schedule" section (`ExportScheduleButton` + `ScheduleTable`), or the existing "Fix the highlighted fields above…" message
  - "Compare scenarios" (when `computeValidSchedules(scenarios).length >= 2`): `<ComparisonGrid comparison={compareScenarios(...)} columns={LOAN_COMPARISON_COLUMNS} …/>`, memoized on `scenarios`

  Use `useScenarios()` from `shared-data-access`. Do not render `<main>`: the layout owns `<main id="main-content">` (T044/T055), so the view's root is a fragment. Export it from `libs/amortization/ui/src/index.ts`

- [x] T040 [P] [US1] Create `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx` (`'use client'`) exporting `DealAnalyzerView`, in this order:
  - `<h1 tabIndex={-1}>` "Rental Deal Analyzer", plus the subtitle "Analyze a rental's cash flow, returns, and rules of thumb."
  - `MetricBadgeGroup` with the LTV and Cash-on-Cash badges, rendered with the same conditions and tone logic as today
  - `ScenarioTabs`
  - "Loan" section and "Real-estate costs" section (the same shared components and props as today, where `CostBreakdownPanel`'s payment props come from `computeSchedule` when valid)
  - "Deal analyzer" section: `RentalInputsPanel` with `useRentalEditor().updateActiveRental`, then `IncomeExpenseCard` + `DealMetrics` when `analysis` is present, using exactly today's FR-015 gating (`validation.valid && schedule && rental && rentalErrors.length === 0`)
  - when the loan is invalid, a `text-red-600` note: "Fix the highlighted loan fields above to see the deal analysis."
  - "Compare scenarios" using `computeValidSchedules` → `compareScenarios` → `withDealMetrics` (analysis per scenario only when its rental passes `validateRental`) with `DEAL_COMPARISON_COLUMNS`, memoized on `scenarios`

  Do not render `<main>`: the layout owns `<main id="main-content">`, so the view's root is a fragment. Export it from `libs/deal-analyzer/ui/src/index.ts`

- [x] T041 [P] [US1] Create `apps/amortization-calculator/src/app/amortization/page.tsx`: `export const metadata = { title: 'Amortization Calculator', description: '…' }` plus `export default function Page() { return <AmortizationCalculatorView />; }`
- [x] T042 [P] [US1] Create `apps/amortization-calculator/src/app/deal-analyzer/page.tsx`: `metadata.title = 'Rental Deal Analyzer'` plus `<DealAnalyzerView />`
- [x] T043 [US1] Replace `apps/amortization-calculator/src/app/page.tsx` with a server component: `import { redirect } from 'next/navigation'; export default function Page() { redirect('/amortization'); }`
- [x] T044 [US1] Update `apps/amortization-calculator/src/app/layout.tsx`: `metadata = { title: { default: 'Companion', template: '%s · Companion' }, description: '…' }`. Keep `<ScenariosProvider>` around `{children}` and wrap the content in `<main id="main-content" className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">` (moved from the old page). The views render sections only, not `<main>`
- [x] T045 [US1] Create `apps/amortization-calculator/src/app/not-found.tsx`: `metadata.title = 'Not found'`, `<h1>Page not found</h1>` (no `<main>` of its own; the layout provides it), and a `next/link` to `/amortization`
- [x] T046 [US1] Run `npm exec nx -- run-many -t lint,typecheck,test` and `npm exec nx -- e2e amortization-calculator-e2e`; all must pass, including T037 and T038

**Checkpoint**: Two pages reachable by URL, shared state across them, all prior behavior intact. This is a shippable MVP, even though nothing in the UI links between the pages yet.

---

## Phase 4: User Story 2 - Responsive, collapsible left-side menu (Priority: P1)

**Goal**: A left menu on every page. At ≥ 1024px it is docked and collapses to an icon rail, and the choice persists. Below 1024px it is a ui-sdk `Drawer` sheet.

**Independent Test**: At 1280px, collapse and expand the menu by mouse and by keyboard, then reload and it stays collapsed. At 390px, open the drawer, follow a link, and the drawer closes on the new page.

### Tests for User Story 2

- [x] T047 [P] [US2] Create `libs/shared/ui/src/lib/use-nav-preference.spec.tsx` (jsdom, `renderHook` from `@testing-library/react`) covering these cases:
  - default `collapsed === false` with empty storage
  - reads `{"collapsed":true}` from `localStorage['companion:nav']` after mount
  - `setCollapsed(true)` writes `{"collapsed":true}`
  - invalid JSON → default with no throw
  - `localStorage.getItem`/`setItem` throwing (`vi.spyOn(Storage.prototype, …)`) → default with no throw
- [x] T048 [P] [US2] Create `apps/amortization-calculator-e2e/src/navigation.spec.ts` covering contracts/routes-and-navigation.md "Behavior guarantees".

  **Desktop (`page.setViewportSize({ width: 1280, height: 800 })`)**:
  - (a) exactly one `getByRole('navigation', { name: 'Primary' })` is visible, with links "Amortization Calculator" and "Rental Deal Analyzer"
  - (b) on `/amortization` that link has `aria-current="page"` and the other doesn't
  - (c) the button "Collapse navigation" has `aria-expanded="true"`; clicking it makes the button "Expand navigation" with `aria-expanded="false"`, `data-testid="app-shell"` gets `data-nav-collapsed="true"`, and the links keep their accessible names
  - (d) after a reload it is still collapsed; expanding it again restores the expanded state
  - (e) keyboard: focus the toggle and press Enter and Space to toggle it
  - (f) type Home price 250000, click the "Rental Deal Analyzer" link: the URL is `/deal-analyzer`, Home price shows $250,000.00 (in-memory state across client navigation), and `aria-current` moved

  **Mobile (`{ width: 390, height: 844 }`)**:
  - (g) the docked nav is hidden; the button "Open navigation" is visible
  - (h) clicking it shows `getByRole('dialog')` containing the Primary nav; Tab cycles inside the dialog; Escape closes it and the "Open navigation" button is focused
  - (i) reopen it, click "Rental Deal Analyzer": the dialog closes, the URL is `/deal-analyzer`, and the `h1` "Rental Deal Analyzer" is focused
  - (j) reopen it, press the backdrop or the "Close navigation" button, and it closes
  - (k) with it open, `setViewportSize({ width: 1280, … })`: the dialog is gone and the docked nav is visible

  **Overflow**:
  - (l) at `{ width: 320, height: 800 }` on both routes, `document.documentElement.scrollWidth <= document.documentElement.clientWidth`

### Implementation for User Story 2

- [x] T049 [P] [US2] Create `libs/shared/ui/src/lib/icons.tsx` exporting `CalculatorIcon` and `BuildingIcon`. These are inline 24×24 stroke SVGs (`stroke="currentColor"`, `fill="none"`) that accept `className` and default `aria-hidden="true"`. Don't add an icon dependency
- [x] T050 [P] [US2] Create `libs/shared/ui/src/lib/use-nav-preference.ts` (`'use client'`) exporting `useNavPreference(): { collapsed: boolean; setCollapsed(next: boolean): void; toggle(): void }`. It stores `localStorage['companion:nav'] = JSON.stringify({ collapsed })`, defaults to `collapsed: false`, reads only in a `useEffect` after mount (the server render is always expanded), and wraps every read, write, and parse in try/catch
- [x] T051 [P] [US2] Create `libs/shared/ui/src/lib/side-nav.tsx` (`'use client'`) exporting `interface NavItem { id: string; label: string; href: \`/${string}\`; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }`and`SideNav({ items, collapsed, onNavigate? })`. It renders `<ul>`of`<li><Link href data-testid={\`nav-${id}\`} aria-current={active ? 'page' : undefined}>`, where active is `pathname === href || pathname.startsWith(href + '/')`via`usePathname()`. Each link holds `<Icon aria-hidden className="size-5 shrink-0"/>`and`<span className={collapsed ? 'sr-only' : ''}>{label}</span>`. When `collapsed`, wrap each link in `@ui-sdk/react/tooltip`showing`label`(check`node_modules/@ui-sdk/react/docs/components/tooltip.md`for the part names and that it shows on keyboard focus). The active style is`bg-neutral-100 font-medium`plus a 3px left border indicator (not color alone), with a visible`focus-visible:outline` on links
- [x] T052 [US2] Create `libs/shared/ui/src/lib/app-shell.tsx` (`'use client'`) exporting `AppShell({ navItems, children })` per the contracts/routes-and-navigation.md DOM contract:
  - root is `<div data-testid="app-shell" data-nav-collapsed={String(collapsed)} className="min-h-screen lg:grid lg:grid-cols-[auto_1fr]">`
  - docked `<aside id="primary-nav" className="hidden lg:flex lg:flex-col sticky top-0 h-screen border-r bg-white transition-[width] motion-reduce:transition-none w-64 data-[collapsed=true]:w-16">`. It contains a `@ui-sdk/react/button` toggle with `aria-controls="primary-nav"`, `aria-expanded={!collapsed}`, and `aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}`, then `<nav aria-label="Primary"><SideNav items={navItems} collapsed={collapsed}/></nav>`
  - mobile `<header className="lg:hidden sticky top-0 flex items-center gap-2 border-b bg-white px-4 py-2">` with a `DrawerTrigger` labeled "Open navigation" and the app name
  - `@ui-sdk/react/drawer` `<Drawer side="left" preventEdgeSwipe open={drawerOpen} onOpenChange={setDrawerOpen}>` with `DrawerBackdrop className="bg-black/30"` and `DrawerContent className="h-full w-72 bg-white p-4 motion-reduce:transition-none"`. The content holds a `DrawerTitle` "Navigation", a `DrawerClose aria-label="Close navigation"`, and `<nav aria-label="Primary"><SideNav items={navItems} collapsed={false}/></nav>`. Check `node_modules/@ui-sdk/react/docs/components/drawer.md` for the exact parts and props before writing it
  - close the drawer on `usePathname()` change. If it was open at that moment, focus `document.querySelector('#main-content h1')` after the navigation
  - a `matchMedia('(min-width: 1024px)')` change listener closes the drawer when the viewport becomes desktop size
  - `{children}` are rendered after the nav
- [x] T053 [US2] Export icons, use-nav-preference, side-nav, and app-shell from `libs/shared/ui/src/index.ts`
- [x] T054 [US2] Create `apps/amortization-calculator/src/app/_nav.ts` exporting `NAV_ITEMS: NavItem[] = [{ id: 'amortization', label: 'Amortization Calculator', href: '/amortization', icon: CalculatorIcon }, { id: 'deal-analyzer', label: 'Rental Deal Analyzer', href: '/deal-analyzer', icon: BuildingIcon }]`. This is the only place a future feature is registered (FR-013)
- [x] T055 [US2] Update `apps/amortization-calculator/src/app/layout.tsx` to `<ScenariosProvider><AppShell navItems={NAV_ITEMS}><main id="main-content" …>{children}</main></AppShell></ScenariosProvider>`. Make sure the not-found page also renders inside it
- [x] T056 [US2] Run `npm exec nx -- run-many -t lint,typecheck,test` and `npm exec nx -- e2e amortization-calculator-e2e`; all must pass, including T047 and T048, in chromium, firefox, and webkit

**Checkpoint**: US1 and US2 both work; the app is fully navigable at all widths.

---

## Phase 5: User Story 3 - Features separated in the codebase with shared code (Priority: P2)

**Goal**: Prove and document the separation. (The moves themselves were done in Phases 1–2.)

**Independent Test**: Lint shows no boundary errors, the project graph has no cross-feature edges, and no shared symbol is defined twice.

- [x] T057 [US3] Boundary negative check (do not commit): add `import { analyzeDeal } from 'deal-analyzer-calculations'; void analyzeDeal;` to `libs/amortization/ui/src/index.ts` and run `npm exec nx -- lint amortization-ui`, which must fail with `@nx/enforce-module-boundaries`. Repeat with `import 'amortization-ui'` in `libs/shared/ui/src/index.ts` → `npm exec nx -- lint shared-ui`, which must fail. Revert both and note the results in the PR description
- [x] T058 [US3] Graph check: `npm exec nx -- graph --file=tmp/graph.json` (`tmp/` is gitignored), then run `node -e "const g=require('./tmp/graph.json').graph.dependencies;const bad=Object.entries(g).flatMap(([s,ds])=>ds.map(d=>[s,d.target])).filter(([s,t])=>(s.startsWith('amortization-')&&t.startsWith('deal-analyzer-'))||(s.startsWith('deal-analyzer-')&&t.startsWith('amortization-'))||(s.startsWith('shared-')&&!t.startsWith('shared-')&&!t.startsWith('npm:')));console.log(bad);process.exit(bad.length?1:0)"`. The output must be `[]`
- [x] T059 [US3] Duplication audit (SC-005): for each symbol in contracts/library-apis.md, `grep -rnE "export (async )?(function|const|interface|type) <Symbol>\b" libs apps --include=*.ts --include=*.tsx | grep -v '\.spec\.'` returns exactly one hit. Also check that `grep -rn "new Intl.NumberFormat" libs apps --include=*.tsx --include=*.ts | grep -v spec` hits only `libs/shared/ui/src/lib/formatters.ts` (and `export-schedule.ts` if it formats). Fix any duplicate by deleting it and importing from the owning lib
- [x] T060 [P] [US3] Write a short `README.md` for each of the seven libs (`libs/shared/{calculations,data-access,ui}/README.md`, `libs/amortization/{calculations,ui}/README.md`, `libs/deal-analyzer/{calculations,ui}/README.md`). Each states its purpose, its tags, what it may depend on (per contracts/module-boundaries.md), and its public exports (per contracts/library-apis.md). Replace the stale generator READMEs carried over by the moves

**Checkpoint**: All three stories are complete and verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T061 [P] Run `npm exec nx -- format:write` and fix anything `npm exec nx -- format:check` reports
- [x] T062 [P] Update `README.md` (root) with the two routes and the library layout, linking `specs/003-feature-pages-navigation/contracts/module-boundaries.md`
- [x] T063 Full gate: `npm exec nx -- run-many -t lint,typecheck,test,build` and `npm exec nx -- e2e amortization-calculator-e2e`; all must pass (constitution "Development Workflow & Quality Gates")
- [x] T064 Run quickstart.md §1–§4, including manual scenarios M1–M11 (`npm exec nx -- dev amortization-calculator`), and record the results in the PR description
- [x] T065 Commit on branch `003-feature-pages-navigation` (squash the T036 WIP commit or keep it as a separate refactor commit), ending the message with the required `Co-Authored-By` trailer

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T013)**: runs first and blocks everything
- **Foundational (T014–T036)**: depends on Setup. T036 is the behavior-preservation gate and blocks every story phase
- **US1 (T037–T046)**: depends on Foundational
- **US2 (T047–T056)**: depends on Foundational. Its _e2e_ test T048 (f) and (i) navigates to `/deal-analyzer`, so run T056 after US1's T041–T044. T049–T053 can be built alongside US1
- **US3 (T057–T060)**: depends on Foundational. Run it after US1 and US2 so the audit covers the final code
- **Polish (T061–T065)**: after all stories

### Within Phases

- T002 → T003 → T004–T008 (generators edit root `tsconfig.json` and `package-lock.json`, so run them one after another) → T009 → T010 → T011 → T012 → T013
- T014 → T015 → T016; T017 and T018 are parallel after T015; T019 after T016–T018
- T020 → T021 → T022 → T023 (T020 needs T015's deal types file)
- T024 can run in parallel with T020–T023 (it needs only T019)
- T025 → T026 / T027 → T028 → T029
- T030–T033 are parallel after T029 and T022/T024; T034 after T031–T033
- T035 → T036
- US1: T037, T038, T039, T040 parallel → T041, T042 parallel → T043 → T044 → T045 → T046
- US2: T047–T051 parallel → T052 → T053 → T054 → T055 → T056

### User Story Dependencies

- **US1** needs no other story.
- **US2** shell code is independent of US1, but its e2e test expects both routes to exist (US1).
- **US3** verifies the outcome of Phases 1–2 plus any code added in US1 and US2.

---

## Parallel Examples

### Foundational

```text
Task: "T017 Extract computeLtv into libs/shared/calculations/src/lib/ltv.ts + ltv.spec.ts"
Task: "T018 Add computeValidSchedules in libs/shared/calculations/src/lib/compute-valid-schedules.ts + spec"
Task: "T024 ScenariosProvider in libs/shared/data-access/src/lib/scenarios-provider.tsx"   # after T019
```

### User Story 1

```text
Task: "T037 Retarget existing e2e specs in apps/amortization-calculator-e2e/src/"
Task: "T038 New apps/amortization-calculator-e2e/src/feature-pages.spec.ts"
Task: "T039 AmortizationCalculatorView in libs/amortization/ui/src/lib/amortization-calculator-view.tsx"
Task: "T040 DealAnalyzerView in libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx"
```

### User Story 2

```text
Task: "T047 use-nav-preference.spec.tsx in libs/shared/ui/src/lib/"
Task: "T048 navigation.spec.ts in apps/amortization-calculator-e2e/src/"
Task: "T049 icons.tsx"   Task: "T050 use-nav-preference.ts"   Task: "T051 side-nav.tsx"
```

---

## Implementation Strategy

### MVP (US1)

1. Setup → Foundational. **Stop at T036**: the old page is unchanged on top of the new libs.
2. US1 → **stop at T046**: two pages work by URL.

### Incremental delivery

3. US2 → the menu makes the pages discoverable (this completes the user-visible request).
4. US3 → enforcement proof and documentation.
5. Polish → full gates, quickstart, commit.

### Notes

- Never change an expected value in a moved spec. If a spec fails after a move, the move is wrong.
- Keep every heading, label, `data-testid`, and message text that existing e2e tests select on unchanged.
- Commit after each checkpoint (T013, T036, T046, T056, T060).
