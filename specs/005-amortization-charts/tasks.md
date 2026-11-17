---
description: 'Task list for Amortization Charts'
---

# Tasks: Amortization Charts

**Input**: Design documents from `/specs/005-amortization-charts/`. This version was regenerated
on 2026-11-17 after `/speckit-clarify` and re-plan.

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution I requires cent-level unit tests for every calculation. Spec
SC-001 and SC-003, and the contracts/*.md files, name the required tests. E2E tests follow the
existing `apps/amortization-calculator-e2e` convention.

**Organization**: Phases follow priority order:

- P1: US1 (balance), US2 (principal and interest), US5 (reuse)
- P2: US3 (composition), US6 (rental charts)
- P3: US4 (scenario comparison)

**Working directory**: All paths are relative to the worktree root
`/Users/t_hein/Projects/companion/.claude/worktrees/005-amortization-charts`. Run every command
from there, using `npx nx …` (npm workspace).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6, as in spec.md

## Conventions every task must follow

- **Color tokens**: Series take a `ColorToken` (`1`–`8` or `'muted'`) and render as
  `var(--chart-series-N)` / `var(--chart-muted)`. Raw hex values never appear outside
  `libs/charts/src/theme.css`.
- **Marks**:
  - Lines are 2px; `context` lines are 1.5px and muted.
  - Columns are `min(bandwidth, 24px)` wide. The outermost segment in each direction gets a 4px
    rounded end; the end at the 0 baseline is square.
  - Stacked segments have a 2px surface gap between them.
  - Gridlines are 1px solid `var(--chart-grid)`. When the domain spans 0, the 0 line uses
    `var(--chart-axis)`.
  - Hover dots are at least 8px, with a 2px `var(--chart-surface)` ring.
- **Text color**: Text uses `var(--chart-ink)`, `var(--chart-ink-secondary)` or
  `var(--chart-muted)`, never a series color.
- **Client components**: Every `.tsx` file in `libs/charts` and in the presets starts with
  `'use client'`.
- **Boundaries**: `libs/charts` never imports `amortization-*`. `amortization-calculations`
  never imports React or `@companion/charts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create `@companion/charts` and wire it into the workspace and its lint boundaries.

- [X] T001 Generate the library `libs/charts` (project name `charts`, import path `@companion/charts`) with `@nx/react:library`. Check the flags with `npx nx g @nx/react:library --help` first, because CLAUDE.md says never to guess flags. The intended command is `npx nx g @nx/react:library --directory=libs/charts --name=charts --importPath=@companion/charts --bundler=none --unitTestRunner=vitest --linter=eslint --component=false --no-interactive`; rename any flag `--help` reports differently. Delete any placeholder component or spec the generator creates.
- [X] T002 Edit `libs/charts/package.json` to follow the source-first pattern of `libs/amortization-ui/package.json`:
  - `"name": "@companion/charts"` and `"private": true`
  - `main`/`types` set to `./src/index.ts`
  - `exports`: `{ ".": { "types": "./src/index.ts", "import": "./src/index.ts", "default": "./src/index.ts" }, "./theme.css": "./src/theme.css", "./package.json": "./package.json" }`
  - `"dependencies": { "@ui-sdk/react": "0.1.0-beta.1" }`
  - `"peerDependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" }`
  - `"nx": { "tags": ["scope:shared", "type:ui"] }`
- [X] T003 [P] Make the test block in `libs/charts/vite.config.mts` match `libs/amortization-ui/vite.config.mts`: jsdom, `globals: true`, include `src/**/*.{test,spec}.{ts,tsx}`. Do **not** set `passWithNoTests`.
- [X] T004 [P] Add Nx tags in the `"nx"` block of each `package.json`. Merge with existing keys such as the app's `sourceRoot`.

  | File | Tags |
  |---|---|
  | `libs/amortization-calculations/package.json` | `["scope:amortization","type:util"]` |
  | `libs/amortization-ui/package.json` | `["scope:amortization","type:ui"]` |
  | `apps/amortization-calculator/package.json` | `["scope:amortization","type:app"]` |
  | `apps/amortization-calculator-e2e/package.json` | `["scope:amortization","type:e2e"]` |
- [X] T005 In the root `eslint.config.mjs`, replace the catch-all `depConstraints` with `[{ sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] }, { sourceTag: 'scope:amortization', onlyDependOnLibsWithTags: ['scope:amortization', 'scope:shared'] }]`. Depends on T002 and T004.
- [X] T006 Add `"@companion/charts": "*"` to `dependencies` in `libs/amortization-ui/package.json` and `apps/amortization-calculator/package.json`. Run `npm install` at the worktree root. Confirm that `node_modules/@companion/charts` is a symlink and that `npx nx show projects` lists `charts`.
- [X] T007 In `apps/amortization-calculator/src/app/global.css`, add `@import '@companion/charts/theme.css';` after `@import 'tailwindcss';`, and add `@source '../../../../libs/charts/src';` next to the existing `@source`.

**Checkpoint**: `npx nx lint charts amortization-ui amortization-calculator` passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Generic types, pure helpers, theme tokens and chart chrome. Every chart and story
depends on these.

**⚠️ CRITICAL**: Do not start any user story until this phase is complete.

### Tests (write first and make sure they fail)

- [X] T008 [P] Write `libs/charts/src/lib/scales.spec.ts`. Cover:
  - `linearScale([0,100],[0,200])` maps 50 to 100, and `.invert(100)` returns 50.
  - A domain `[5,5]` maps to the middle of the range.
  - `bandScale(['a','b','c'],[0,300],0.2)` gives 3 equal-width bands in order.
  - `niceTicks(0, 296_000, 5)` returns `[0,50000,…,300000]`.
  - `niceTicks(0, 0.4, 5)` has no duplicates, and `niceTicks(1,1,5)` returns at least 1 tick.
  - `niceTicks(0, 11, 8, { integer: true })` returns only integers.
  - `niceTicks(-12_000, 30_000, 5)` includes 0.
  - `yExtent([1,5,null],'zero-based')` returns `[0,5]`.
  - `yExtent([-3,5],'auto')` returns `[-3,5]`.
  - `yExtent([2,5],'auto')` returns `[0,5]`.
  - `yExtent([null,null],'auto')` and `yExtent([0,0],'zero-based')` return `[0,1]`.
- [X] T009 [P] Write `libs/charts/src/lib/paths.spec.ts`. Cover:
  - `linePath([{x:0,y:0},{x:10,y:5}])` returns `"M0,0L10,5"`.
  - A `null` in the middle starts a new `M` subpath.
  - All-null input returns `""`.
  - `roundedTopRect(0,0,24,100,4)` rounds the top and leaves the bottom square.
  - `roundedTopRect(0,0,24,100,4,'down')` rounds the bottom and leaves the top square.
  - When `h < r`, the radius is clamped to `min(r, w/2, h)`.
- [X] T010 [P] Write `libs/charts/src/lib/format.spec.ts`. Cover:
  - `formatCompactCurrency(1_234_567)` returns `"$1.2M"`; `350_000` returns `"$350K"`; `900` returns `"$900"`; `0` returns `"$0"`; `-12_000` returns `"-$12K"`.
  - `capSeries(nine, 8)` returns `{ shown: the first 8 in order, hiddenCount: 1 }`.
  - `capSeries(three)` returns `hiddenCount: 0`.

### Implementation

- [X] T011 [P] Write `libs/charts/src/lib/types.ts` with exactly the types in `contracts/charts-api.md § Types`:
  - `SeriesSlot = 1|2|3|4|5|6|7|8` and `ColorToken = SeriesSlot | 'muted'`.
  - `SeriesDef<K>`: `key`, `label`, `color`, and `emphasis?: 'primary' | 'context'` ("Default `'primary'`").
  - `Datum<K> = { x: number | string } & { [P in K]: number | null }`. Values may be negative.
  - `SegmentDef` ("`value` must be ≥ 0").
  - `ChartFormatters<X>`.
  - `TooltipExtra = { label: string; value: string }`.
  - `ChartBaseProps`: `title`, `description?`, `height?` (default 240), `showDataTable?` (default true), `tooltipExtras?: (index: number) => TooltipExtra[]`, `className?` and `'data-testid'?`.
  - `colorVar(token: ColorToken): string`.
- [X] T012 [P] Write `libs/charts/src/lib/scales.ts`. Make T008 pass. It contains:
  - `linearScale(domain, range)`: callable, with `.invert`, `.domain` and `.range`.
  - `bandScale(keys, range, paddingInner)`, with `.bandwidth`.
  - `niceTicks(min, max, count, opts?: { integer?: boolean })`: 1/2/5×10ⁿ steps, always includes 0 when `min ≤ 0 ≤ max`, never duplicates.
  - `yExtent(values, mode: 'zero-based' | 'auto')`: `'zero-based'` returns `[0, max(0,…)]`; `'auto'` returns `[min(0,…), max(0,…)]`; all-null or all-zero returns `[0,1]`.
- [X] T013 [P] Write `libs/charts/src/lib/paths.ts`. Make T009 pass. It contains:
  - `linePath(points)`, which starts a new `M` after each `null`.
  - `roundedTopRect(x, y, w, h, r, direction: 'up' | 'down' = 'up')`. The outer end gets radius `min(r, w/2, h)`; the end at the baseline is square.
- [X] T014 [P] Write `libs/charts/src/lib/format.ts`. Make T010 pass. It contains:
  - `formatCompactCurrency(n)`, using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })`.
  - `capSeries(series, max = 8)`, which returns `{ shown, hiddenCount }`.
- [X] T015 [P] Write `libs/charts/src/theme.css` with tokens scoped to `.chart-root`.

  Light values:

  | Token | Value |
  |---|---|
  | `--chart-surface` | `#fcfcfb` |
  | `--chart-ink` | `#0b0b0b` |
  | `--chart-ink-secondary` | `#52514e` |
  | `--chart-muted` | `#898781` |
  | `--chart-grid` | `#e1e0d9` |
  | `--chart-axis` | `#c3c2b7` |
  | `--chart-border` | `rgba(11,11,11,0.10)` |
  | `--chart-series-1…8` | `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948` |

  Dark values:

  | Token | Value |
  |---|---|
  | `--chart-surface` | `#1a1a19` |
  | `--chart-ink` | `#f0efec` |
  | `--chart-ink-secondary` | `#c3c2b7` |
  | `--chart-muted` | `#898781` |
  | `--chart-grid` | `#2c2c2a` |
  | `--chart-axis` | `#383835` |
  | `--chart-border` | `rgba(255,255,255,0.10)` |
  | `--chart-series-1…8` | `#3987e5 #d95926 #199e70 #c98500 #d55181 #0ca30c #9085e9 #e66767` |

  Put the dark values under both `@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) .chart-root {…} }` and `:root[data-theme="dark"] .chart-root {…}`, each with `color-scheme: dark`.

  Base rule: `.chart-root { color-scheme: light; background: var(--chart-surface); color: var(--chart-ink); font-family: system-ui, -apple-system, "Segoe UI", sans-serif; font-variant-numeric: tabular-nums; }`.

  Add a comment citing the research.md R6 validation result.
- [X] T016 [P] Write `libs/charts/src/lib/use-element-width.ts`: `useElementWidth<T extends HTMLElement>()` returns `[ref, width: number | null]`. Use `ResizeObserver`, round to an integer, and disconnect on unmount. Return `null` before the first measurement or during SSR.
- [X] T017 [P] Write `libs/charts/src/lib/use-plot-keyboard.ts`: `usePlotKeyboard(count)` returns `{ activeIndex, setActiveIndex, onKeyDown, onBlur }`. Keys:
  - ←/→ move ±1, clamped.
  - Shift+←/→ move ±12.
  - Home/End jump to the ends.
  - Esc clears to null.
  - The first arrow press from null goes to 0.
  - The index is clamped when `count` shrinks.
- [X] T018 [P] Write `libs/charts/src/lib/legend.tsx`: `Legend({ items: { label; color: ColorToken; emphasis? }[] })`. Render a wrapping `<ul aria-label="Legend">` with a 10px swatch per item (a 2px line swatch for `context` items) and labels in `var(--chart-ink-secondary)`.
- [X] T019 [P] Write `libs/charts/src/lib/chart-tooltip.tsx`: `ChartTooltip({ left, top, containerWidth, heading, rows: { label; color: ColorToken; value: string }[], extras?: TooltipExtra[] })`. It is an absolutely positioned HTML box:
  - `pointer-events:none`, a 1px `var(--chart-border)` ring, surface background, 12px text.
  - It flips left when it would overflow.
  - Each row shows a swatch, the label in secondary ink and the value in primary ink.
  - `extras` render below a hairline, with no swatch.
- [X] T020 [P] Write `libs/charts/src/lib/chart-data-table.tsx`: `ChartDataTable({ caption, columns: { key; label; format? }[], rows })`. Put a "Show data" toggle on `Collapsible` from `@ui-sdk/react/collapsible`. It reveals a real `<table>` with a `<caption>`, `<th scope="col">` headers and right-aligned numbers. Do not render the table while it is collapsed.
- [X] T021 Write `libs/charts/src/lib/chart-frame.tsx`: `ChartFrame({ title, description?, legend?, height, dataTable?, className?, 'data-testid'?, children: (width) => ReactNode })`. It renders a `<figure className="chart-root rounded-md border …">` containing:
  - an `<h3>` title,
  - the description in secondary ink,
  - the legend above the plot,
  - a measured plot box of fixed `height` that renders `children(width)` once the width is non-null, and an empty box of the same height before that (no layout shift),
  - the data table below the plot.

  Depends on T016, T018 and T020.
- [X] T022 Write `libs/charts/src/index.ts`. Export all the types plus `colorVar`, `linearScale`, `bandScale`, `niceTicks`, `yExtent`, `linePath`, `roundedTopRect`, `formatCompactCurrency`, `capSeries`, `useElementWidth`, `usePlotKeyboard`, `ChartFrame`, `Legend`, `ChartTooltip` and `ChartDataTable`. Export nothing else. Later phases add the chart components.

**Checkpoint**: `npx nx test charts` and `npx nx lint charts` both pass.

---

## Phase 3: User Story 1 - Remaining balance over time (Priority: P1) 🎯 MVP

**Goal**: A balance line chart for the active scenario, with a muted "Baseline" line when extra
payments exist. This phase also ships the generic `LineChart`, including `yDomain: 'auto'`, which
US6 reuses.

**Independent Test**: Use $300,000 at 6.5% over 360 months. The balance line goes from about
$300K to $0, there is no legend, and the keyboard tooltip works. Add a $200/mo extra payment: two
lines and a legend appear, and the blue line reaches $0 earlier (quickstart §3).

### Tests for User Story 1

- [X] T023 [P] [US1] Create `libs/amortization-calculations/src/lib/chart-data.spec.ts` with the reference fixtures from `contracts/amortization-chart-data.md`, built as full `LoanScenario` objects the same way `compute-schedule.spec.ts` builds them:
  - **R1**: $300,000, 6.5%, 360 months, start `2027-01-01`, no costs or extras.
  - **R2**: R1 plus a recurring $200 extra from period 1.
  - **R3**: R1 plus tax $3,600/yr, insurance $1,200/yr, HOA $50, home price $330,000, 10% down, PMI 0.5%, with the loan at $297,000 (price − down payment).
  - **R4**: $12,000, 0%, 12 months.

  Export them from a sibling file, `libs/amortization-calculations/src/lib/__fixtures__/reference-scenarios.ts`, so `project-rental.spec.ts` can reuse them.

  Add these tests:
  - `buildBalanceSeries(R1, null)` returns 361 rows. Row 0 has balance 300000.00 and date `2027-01-01`. Row n's balance `===` `periods[n-1].remainingBalance`. The last row's balance is 0. Every `baseline` is null.
  - `buildBalanceSeries(R2, baseline(R1))` returns 361 rows. The balance is 0 at R2's payoff period and `null` after it. `baseline` equals R1's rows exactly.
  - `computeBaselineSchedule(R1)` returns `null`.
  - `computeBaselineSchedule(R2)` deep-equals `computeSchedule({ ...R2, extraPayments: [] })`.
- [X] T024 [P] [US1] Write `libs/charts/src/lib/line-chart.spec.tsx`. Use non-amortization fixtures (12 months of temperatures for two cities, including negative values) and stub `ResizeObserver` to report 600. Assert:
  - 2 series produce 2 `<path>` elements and a legend with both labels.
  - 1 series produces no legend.
  - Focusing the plot group (`role="group"`, `aria-roledescription="chart"`) and pressing ArrowRight puts the x label and both values in the `aria-live` region.
  - A `null` value gives a path with two `M` subpaths.
  - The stroke is `var(--chart-series-1)`.
  - With `yDomain: 'auto'` and negative data, there is a tick at or below the minimum and the 0 gridline uses `var(--chart-axis)`.
  - `tooltipExtras` rows appear in the tooltip.
  - "Show data" reveals 12 body rows.
- [X] T025 [P] [US1] Write `apps/amortization-calculator-e2e/src/charts.spec.ts` with a test named "balance chart" (quickstart §3), following the style of `extra-payments.spec.ts`:
  - On the default page, `getByTestId('chart-balance')` is visible with the heading "Remaining balance".
  - After `fillNumberField(page, 'Amount', '200')` and clicking `Add`, the legend shows "With extra payments" and "Baseline".
  - Focusing the plot and pressing ArrowRight puts text containing `$` in the live region.
  - Making the rate invalid removes `chart-balance`.

### Implementation for User Story 1

- [X] T026 [US1] Create `libs/amortization-calculations/src/lib/chart-data.ts` per data-model.md §B. Make T023 pass.
  - Export `BalanceSeriesDatum = { x: number; date: string; balance: number | null; baseline: number | null }`.
  - Export `buildBalanceSeries(schedule, baseline)`:
    - Rows cover periods `0…max(schedule.periods.length, baseline?.periods.length ?? 0)`.
    - "Period 0's balance is `periods[0].remainingBalance + periods[0].principalPortion`", wrapped in `roundCents` from `./round`. Period 0's date is `periods[0].date`; period n's date is `periods[n-1].date`.
    - "After the schedule pays off, the value is `null`."
    - `baseline` is `null` everywhere when `baseline` is `null`.
  - Export `computeBaselineSchedule(scenario)`. It returns `null` when `scenario.extraPayments.length === 0`; otherwise it returns `computeSchedule({ ...scenario, extraPayments: [] })`.
  - Add `export * from './lib/chart-data';` to `libs/amortization-calculations/src/index.ts`.
- [X] T027 [US1] Write `libs/charts/src/lib/line-chart.tsx`: `LineChart<K>`, per `contracts/charts-api.md`. Make T024 pass.
  - **Props**: `data`, `series`, `formatters?`, `yDomain?: [n,n] | 'zero-based' | 'auto'` (default `'zero-based'`), `xTickValues?`, `directLabels?` (default `series.length <= 4`), plus `ChartBaseProps`.
  - **Frame**: use `ChartFrame`, with a `Legend` only when there are 2 or more series.
  - **Axes and grid**: margins are about `{ top:8, right: directLabels ? 96 : 12, bottom:24, left:56 }`. The y-axis uses `niceTicks(...yExtent(values, mode), 5)` with hairline gridlines; the 0 line uses `var(--chart-axis)` when the domain spans 0. There are `clamp(2, floor(width/80), 8)` x ticks, or `xTickValues` when given.
  - **Lines**: draw `context` series first (1.5px, muted), then primary series (2px), with `fill="none"` and round joins and caps.
  - **Direct labels**: placed at each series' last non-null point, in secondary ink, next to an 8px colored dot.
  - **Hover and keyboard**: a transparent full-height hit column per x index snaps the pointer to the nearest point, sharing `usePlotKeyboard`'s active index. The active state shows a 1px `var(--chart-axis)` crosshair, dots of at least 8px with a 2px surface ring, and a `ChartTooltip` (heading from `tooltipX ?? x`, rows in `series` order, then `tooltipExtras(index)`).
  - **Accessibility**: a visually hidden `aria-live="polite"` region mirrors the tooltip text. The plot wrapper is `<div role="group" aria-roledescription="chart" aria-label={title} tabIndex={0}>` with a visible focus ring.
  - **Data table**: when `showDataTable`, render `ChartDataTable` with x, each series, and each `tooltipExtras` label as columns.

  Export it from `libs/charts/src/index.ts`.
- [X] T028 [US1] Write `libs/amortization-ui/src/lib/charts/balance-chart.tsx`: `BalanceChart({ schedule, baseline = null })`.
  - Build the data with `buildBalanceSeries`. Render `LineChart` with `title="Remaining balance"` and `data-testid="chart-balance"`.
  - Series:
    - `balance`: labeled "With extra payments" when there is a baseline and "Balance" otherwise, slot 1.
    - When there is a baseline, also `baseline`: labeled "Baseline", `'muted'`, `emphasis: 'context'`.
  - Formatters:
    - x: the row date's year.
    - `tooltipX`: `{ month: 'short', year: 'numeric' }`.
    - y: `formatCompactCurrency`.
    - `tooltipY`: full USD.
  - Set `xTickValues` to multiples of 12·k, with no more than 8 ticks.
  - Export it from `libs/amortization-ui/src/index.ts`.
- [X] T029 [US1] Create `apps/amortization-calculator/src/app/_components/charts-section.tsx` (`'use client'`): `ChartsSection({ scenario, schedule })`.
  - Compute `const baseline = useMemo(() => computeBaselineSchedule(scenario), [scenario])`.
  - Render `<section className="flex flex-col gap-4"><h2 className="text-lg font-medium text-neutral-800">Charts</h2><div className="grid gap-6"><BalanceChart …/></div></section>`.
- [X] T030 [US1] In `apps/amortization-calculator/src/app/page.tsx` (insertion point 1, FR-014), render `{schedule && validation.valid ? <ChartsSection scenario={validation.scenario} schedule={schedule} /> : null}` immediately before the "Amortization schedule" block. This is one insertion plus one import (research R10).
- [X] T031 [US1] Run `npx nx run-many -t lint test -p charts amortization-calculations amortization-ui amortization-calculator` and `npx nx e2e amortization-calculator-e2e --grep "balance chart"`. Fix any failures.

**Checkpoint**: The MVP (US1) works on its own.

---

## Phase 4: User Story 2 - Principal vs. interest per year (Priority: P1)

**Goal**: One stacked column per loan year: Principal (slot 1), Extra principal (slot 3, only
when greater than 0) and Interest (slot 2). This phase also ships the generic `StackedBarChart`
with **signed stacking**, which US6 reuses.

**Independent Test**: R1 shows 30 columns. In Yr 1 interest is larger than principal, and in
Yr 30 the reverse. Tooltip sums match the schedule to the cent (quickstart §4).

### Tests for User Story 2

- [X] T032 [P] [US2] Add `buildYearlyPrincipalInterest` tests to `libs/amortization-calculations/src/lib/chart-data.spec.ts`:
  - **R1**:
    - 30 rows, labeled `"Yr 1"…"Yr 30"`.
    - The sum of `interest` `===` `summary.totalInterestPaid`.
    - Row 1 has interest greater than principal; row 30 has principal greater than interest.
    - In every row, `|principal + extraPrincipal + interest − total| ≤ 0.01`.
    - `extraPrincipal` is 0 in every row.
  - **R2**:
    - The sum of `extraPrincipal` equals the sum of `extraPrincipalApplied`.
    - There are `ceil(periods.length/12)` rows.
  - **R1 with `{ groupBy: 'calendarYear' }`**: labels run `"2027"…"2056"`, and the first row covers 12 periods.
  - **R4**: 1 row, with interest 0 and principal 12000.
- [X] T033 [P] [US2] Write `libs/charts/src/lib/stacked-bar-chart.spec.tsx`. Use non-amortization fixtures (quarterly profit and loss by product, with series `apples`/`pears` in slots 1 and 2, including one negative value) and stub `ResizeObserver` to report 600. Assert:
  - There is one column group per category, and each column is at most 24 wide.
  - Only the outermost non-zero positive segment is rounded at the top, and the negative segment sits below the 0 baseline and is rounded at the bottom.
  - The 0 line uses `var(--chart-axis)`.
  - ArrowRight puts the category, both values and the signed Total in the live region.
  - `tooltipExtras` rows appear.
  - The legend shows both labels.
  - The data table has one row per category.
- [X] T034 [P] [US2] Add a test named "principal vs interest chart" to `apps/amortization-calculator-e2e/src/charts.spec.ts`:
  - `chart-principal-interest` is visible with the heading "Principal vs. interest by year".
  - Its legend has "Principal" and "Interest" and no "Extra principal".
  - After adding a $200 extra payment, the legend has "Extra principal".

### Implementation for User Story 2

- [X] T035 [US2] In `libs/amortization-calculations/src/lib/chart-data.ts`, add the type `YearlyPrincipalInterestDatum = { x: string; year: number; principal: number; extraPrincipal: number; interest: number; total: number }` and the function `buildYearlyPrincipalInterest(schedule, { groupBy = 'loanYear' } = {})`. Make T032 pass.
  - **Grouping**: with `loanYear`, "periods 1–12 make up Yr 1, 13–24 make up Yr 2, and so on. A partial final year is its own group." With `calendarYear`, group by the year of `period.date`.
  - **Sums**, each passed through `roundCents`:
    - `principal` = Σ(`principalPortion` − `extraPrincipalApplied`)
    - `extraPrincipal` = Σ`extraPrincipalApplied`
    - `interest` = Σ`interestPortion`
    - `total` = Σ`paymentAmount`
- [X] T036 [US2] Write `libs/charts/src/lib/stacked-bar-chart.tsx`: `StackedBarChart<K>`, per `contracts/charts-api.md`. Make T033 pass.
  - **Props**: `data` (string `x`), `series` (stack order = array order), `formatters?`, `showTotalInTooltip?` (default true), plus `ChartBaseProps`.
  - **Frame**: use `ChartFrame` and `Legend` (only when there are 2 or more series).
  - **Scales**: use `bandScale(categories, [0, plotWidth], 0.3)`. The y-domain is `[min(0, Σneg), max(0, Σpos)]` per category, rounded with `niceTicks(..., 5)`. Gridlines are hairlines, and the 0 line uses `var(--chart-axis)` when the domain spans 0.
  - **Columns**: each is `min(bandwidth, 24)` wide and centered in its band.
  - **Signed stacking**:
    - Positive values stack upward from 0, and negative values stack downward from 0, both in `series` order.
    - Leave a 2px gap between segments by shrinking each segment's outer edge by 2px (never below 0).
    - The outermost segment in each direction uses `roundedTopRect(..., 4, 'up' | 'down')`; the others use `<rect>`.
    - `null` counts as 0.
  - **X ticks**: thin them to about one per 80px, always keeping the first and last.
  - **Hover and keyboard**: the whole band is the hit target, with ←/→ through `usePlotKeyboard`. The active band gets a `var(--chart-grid)` highlight. The tooltip lists series top to bottom as drawn, then "Total" (the signed sum) when enabled, then `tooltipExtras`.
  - **Accessibility and data table**: an `aria-live` region mirrors the tooltip. The `ChartDataTable` columns are x, each series, Total, and the extras.

  Export it from `libs/charts/src/index.ts`.
- [X] T037 [US2] Write `libs/amortization-ui/src/lib/charts/principal-interest-chart.tsx`: `PrincipalInterestChart({ schedule, groupBy = 'loanYear' })`.
  - Render `StackedBarChart` with `title="Principal vs. interest by year"` and `data-testid="chart-principal-interest"`.
  - Series, bottom to top:
    - `principal` "Principal", slot 1
    - `extraPrincipal` "Extra principal", slot 3, only when its sum is greater than 0
    - `interest` "Interest", slot 2
  - Formatters: y is compact currency; `tooltipY` is full USD.
  - Export it from `libs/amortization-ui/src/index.ts`.
- [X] T038 [US2] Add `<PrincipalInterestChart schedule={schedule} />` after `BalanceChart` in `apps/amortization-calculator/src/app/_components/charts-section.tsx`.
- [X] T039 [US2] Run lint and test for the affected projects, and the e2e test (`--grep "principal vs interest"`). Fix any failures.

**Checkpoint**: US1 and US2 each work on their own.

---

## Phase 5: User Story 5 - Reuse the charts elsewhere (Priority: P1, developer-facing)

**Goal**: Prove and enforce that `@companion/charts` is domain-free and can be imported from
anywhere in the workspace (the clarified meaning of "reimportable").

**Independent Test**: `nx graph` shows no `amortization-*` dependencies for `charts`, a forbidden
import fails lint, and the render tests with non-loan data pass (quickstart §2).

- [X] T040 [P] [US5] Write `libs/charts/src/lib/public-api.spec.ts`. Import `* as api from '../index'` and assert that the runtime exports are exactly: `LineChart`, `StackedBarChart`, `ChartFrame`, `Legend`, `ChartTooltip`, `ChartDataTable`, `useElementWidth`, `usePlotKeyboard`, `linearScale`, `bandScale`, `niceTicks`, `yExtent`, `linePath`, `roundedTopRect`, `formatCompactCurrency`, `capSeries` and `colorVar`. `SegmentedBar` is added in T047.
- [X] T041 [P] [US5] Write `libs/charts/README.md`. Cover:
  - its purpose: domain-free SVG charts for this workspace (not published);
  - the three setup steps for consumers (the dependency, `@import '@companion/charts/theme.css'`, Tailwind `@source`);
  - minimal `LineChart` and `StackedBarChart` examples using non-loan data, one with negative values;
  - color rules: slots 1–8 in fixed order, never cycled; color follows the entity; use `capSeries` (or a position cap like `ScenarioBalanceChart`'s) for more than 8 series; use `'muted'` for context;
  - the light-mode contrast warning for slots 3/4/5, so keep the legend or labels and the data table;
  - the stability rule: only `src/index.ts` is public.
- [X] T042 [US5] Verify the boundaries (quickstart §2):
  1. Confirm `npx nx graph --print` shows no `amortization-*` dependency for `charts`.
  2. Temporarily add `import 'amortization-calculations';` to `libs/charts/src/lib/format.ts`. `npx nx lint charts` must fail with `enforce-module-boundaries`. Revert the change.
  3. Temporarily add a deep import of `@companion/charts/src/lib/paths` in `apps/amortization-calculator/src/app/page.tsx`. Lint or typecheck must fail. Revert the change.
  4. Record "Verified on <date>" under §2 of `specs/005-amortization-charts/quickstart.md`.

**Checkpoint**: Lint enforces the reuse boundary, and the README documents it.

---

## Phase 6: User Story 3 - Monthly payment composition (Priority: P2)

**Goal**: A tall segmented bar with P&I (slot 1), Tax (3), Insurance (4), PMI (5) and HOA (7).
It is hidden when there are fewer than 2 components.

**Independent Test**: R1 shows no bar. With tax $3,600/yr, insurance $1,200/yr and HOA $50, the
bar has 4 segments, and the legend total equals the total monthly payment (quickstart §5).

### Tests for User Story 3

- [X] T043 [P] [US3] Add `buildPaymentComposition` tests to `libs/amortization-calculations/src/lib/chart-data.spec.ts`:
  - **R1**: exactly 1 component (`principalAndInterest`), and `total === summary.totalMonthlyPayment`.
  - **R3**: the order is P&I, `propertyTax` 300.00, `insurance` 100.00, `pmi` = `summary.monthlyPmiAmount`, `hoa` 50.00, and `|Σ − total| ≤ 0.01`.
  - Components with a value of 0 are left out (R3 without HOA has no `hoa`).
- [X] T044 [P] [US3] Write `libs/charts/src/lib/segmented-bar.spec.tsx` using a non-loan budget fixture. Assert:
  - A segment with value 0 is dropped.
  - The legend shows the label, value and percent of `total` for each segment.
  - Segments use a roving tabIndex, and arrow keys show the tooltip.
  - More than 6 segments throws in development.
- [X] T045 [P] [US3] Add a test named "payment composition" to `apps/amortization-calculator-e2e/src/charts.spec.ts`:
  - With no costs, there is no `chart-payment-composition`.
  - After filling tax, insurance and HOA (with `fillNumberField`, using the labels in `cost-breakdown-panel.tsx`), the chart is visible and its legend lists "Principal & interest", "Property tax", "Insurance" and "HOA".

### Implementation for User Story 3

- [X] T046 [US3] In `libs/amortization-calculations/src/lib/chart-data.ts`, add the type `PaymentComponent = { key: 'principalAndInterest' | 'propertyTax' | 'insurance' | 'pmi' | 'hoa'; label: string; value: number }` and the function `buildPaymentComposition(scenario, schedule)`, using the data-model.md §B table. Make T043 pass.

  | Component | Value | Label |
  |---|---|---|
  | P&I | `summary.monthlyPrincipalAndInterest` | "Principal & interest" |
  | Tax | `roundCents((annualPropertyTax ?? 0) / 12)` | "Property tax" |
  | Insurance | `roundCents((annualInsurance ?? 0) / 12)` | "Insurance" |
  | PMI | `periods[0].pmiApplies ? summary.monthlyPmiAmount : 0` | "PMI" |
  | HOA | `roundCents(monthlyHoa ?? 0)` | "HOA" |

  "Components with value `0` are omitted." Set `total = summary.totalMonthlyPayment`.
- [X] T047 [US3] Write `libs/charts/src/lib/segmented-bar.tsx`: `SegmentedBar({ segments, total, formatValue, ...ChartBaseProps })`. Make T044 pass, and add `SegmentedBar` to the T040 export list.
  - Drop segments with value 0. In development, throw if more than 6 remain.
  - Draw a 32px-tall horizontal bar where each segment's width is `value/Σ`. Leave 2px surface gaps between segments, and round the two outer ends with a 4px radius.
  - Print the value inside a segment only when it fits. Use white text, except `#0b0b0b` on slot 4.
  - Always show the legend: swatch, label, value, and percent of `total` to 1 decimal place, plus a "Total" line showing `formatValue(total)`.
  - The segments are a `role="list"` with a roving tabIndex and ←/→ navigation. Show a `ChartTooltip` on hover or focus. There is no axis.
  - Add an optional `ChartDataTable` with Component, Amount and Share columns.

  Export it from `libs/charts/src/index.ts`.
- [X] T048 [US3] Write `libs/amortization-ui/src/lib/charts/payment-composition-bar.tsx`: `PaymentCompositionBar({ scenario, schedule })`.
  - Return `null` when there are fewer than 2 components.
  - Otherwise render `SegmentedBar` with `title="Monthly payment breakdown"` and `data-testid="chart-payment-composition"`.
  - Slots: P&I 1, tax 3, insurance 4, PMI 5, HOA 7.
  - Format values as full USD.
  - Export it from `libs/amortization-ui/src/index.ts`.
- [X] T049 [US3] In `apps/amortization-calculator/src/app/_components/charts-section.tsx`, render `<PaymentCompositionBar scenario={scenario} schedule={schedule} />` as the first chart, above `BalanceChart`. This is the FR-014 order.
- [X] T050 [US3] Run lint and test, and the e2e test (`--grep "payment composition"`). Fix any failures.

**Checkpoint**: US1, US2, US3 and US5 each work on their own.

---

## Phase 7: User Story 6 - Rental performance over the loan term (Priority: P2)

**Goal**: Three optional growth inputs, plus three rental charts inside the Deal Analyzer: cash
flow, equity build-up and cash-on-cash. They cover `1…ceil(termMonths/12)` years, and year 1
matches the Deal Analyzer exactly.

**Independent Test**: With the R3 loan, $2,800 rent and $6,000 closing costs, the year-1 values
on the three charts equal the Deal Analyzer's numbers. Growth inputs change the slopes, an early
payoff zeroes debt service, and removing the rent hides all three charts (quickstart §7).

### Tests for User Story 6

- [X] T051 [P] [US6] Extend `libs/amortization-calculations/src/lib/validate-rental.spec.ts`. For each growth field (`rentGrowthPct`, `expenseGrowthPct`, `appreciationPct`):
  - The values `25` and `-10` are valid.
  - The values `25.01`, `-10.01` and `NaN` each produce exactly one error, keyed `rental.<field>`, with the message `"<Rent growth|Expense growth|Appreciation> must be between -10% and 25%."`.
  - When the field is `undefined`, there is no error.
- [X] T052 [P] [US6] Extend `libs/amortization-calculations/src/lib/persistence.spec.ts`. A serialized state whose `rental` has none of the three growth fields must round-trip through `deserializeScenarios` unchanged (FR-013). Then `growthRates(rental)` must return `{ rent: 0, expense: 0, appreciation: 0 }`.
- [X] T053 [P] [US6] Create `libs/amortization-calculations/src/lib/project-rental.spec.ts`, implementing every row of `contracts/rental-chart-data.md § Required unit tests`. D1 is R3 from `__fixtures__/reference-scenarios.ts` plus `rental = { ...DEFAULT_RENTAL_ASSUMPTIONS, grossMonthlyRent: 2800, closingCosts: 6000 }`.
  - **0% growth**:
    - There are 30 years.
    - In year 1, `noi`, `debtService`, `cashFlow` and `cashOnCash` `===` the matching `analyzeDeal` values (`.annual` / `.value`).
    - `noi` is the same in every year, and `appreciation` is 0 in every year.
  - **Rent growth 3%**: year 2 `grossIncome` is `year1 × 1.03` within 0.01, and the percent-of-income lines scale the same way.
  - **Expense growth 2%**: year 2 tax, insurance and HOA are ×1.02, and the percent lines don't change.
  - **Appreciation 3%**:
    - Year 1 `homeValue === roundCents(330000 × 1.03)`.
    - In every year, `initialEquity + principalPaid + appreciation` equals `homeValue − loanBalance` within 0.01.
  - **R2's recurring $200 extra**: after the payoff year, `debtService === 0`, `loanBalance === 0` and `cashFlow === noi`, and there are still 30 years.
  - **PMI drop**: in the year after the PMI drop, debt service is lower by `monthlyPmiAmount × 12` than in a year with full PMI.
  - **No home price**: `equityNaReason === 'Enter a purchase price to see equity build-up.'`, and `homeValue`, `initialEquity` and `appreciation` are null.
  - **No cash invested**: `cashOnCash === null`, and `cashOnCashNaReason` equals the reason from `analyzeDeal`.
  - **Appreciation −5%**: `appreciation < 0`, and the equity identity still holds.
- [X] T054 [P] [US6] Add a test named "rental charts" to `apps/amortization-calculator-e2e/src/charts.spec.ts`, following the steps in `deal-analyzer.spec.ts` (quickstart §7):
  - With home price 330000, 10% down and rent 2800, all three charts are visible: `chart-rental-cash-flow`, `chart-equity` and `chart-cash-on-cash`.
  - Fill "Rent growth" with 3 and check that the inputs keep their value after `page.reload()`.
  - Fill "Rent growth" with 30. The error "Rent growth must be between -10% and 25%." appears, `chart-rental-cash-flow` disappears, and `chart-balance` stays visible.
  - Clear the rent. All three rental charts disappear.
- [X] T055 [P] [US6] Add a test named "rental charts – old session" to `apps/amortization-calculator-e2e/src/charts.spec.ts`. Use `page.addInitScript` to seed sessionStorage with a rental scenario that has no growth fields, using the storage key from `use-scenarios.ts`. The page loads, "Rent growth" shows 0, and `chart-rental-cash-flow` is visible.

### Implementation for User Story 6

- [X] T056 [US6] In `libs/amortization-calculations/src/lib/types.ts`:
  - Add three optional fields with JSDoc to `RentalAssumptions`: `rentGrowthPct?: number`, `expenseGrowthPct?: number` and `appreciationPct?: number`. Each doc says "Optional; missing = 0. −10 ≤ x ≤ 25". Note that rent growth applies to rent plus other income, expense growth to tax, insurance and HOA, and appreciation to the purchase price.
  - Add the `RentalYear` and `RentalProjection` interfaces exactly as in `contracts/rental-chart-data.md`.
- [X] T057 [US6] In `libs/amortization-calculations/src/lib/validate-rental.ts`, add `GROWTH_FIELDS` with entries `rentGrowthPct`/"Rent growth", `expenseGrowthPct`/"Expense growth" and `appreciationPct`/"Appreciation". For each field: when the value is `undefined`, skip it. Otherwise, if it is not finite or not in −10 ≤ value ≤ 25, push `{ field: 'rental.<field>', message: '<Label> must be between -10% and 25%.' }`. Make T051 pass. Depends on T056.
- [X] T058 [US6] Refactor `libs/amortization-calculations/src/lib/analyze-deal.ts`:
  - Add `rentGrowthPct: 0, expenseGrowthPct: 0, appreciationPct: 0` to `DEFAULT_RENTAL_ASSUMPTIONS`.
  - Move the line-item construction into a new internal module, `libs/amortization-calculations/src/lib/rental-line-items.ts`, as `rentalLineItems(scenario, gsiMonthly: number, expenseFactor: number)`, which returns the existing `rawLines` array. The fixed lines (tax, insurance, HOA) are multiplied by `expenseFactor`; the percent lines use `gsiMonthly`. **Do not** re-export this module from `src/index.ts`, so it stays out of the public API.
  - `analyzeDeal` calls it with `expenseFactor = 1`.
  - **`analyze-deal.spec.ts` must pass unchanged** (Constitution I).

  Depends on T056.
- [X] T059 [US6] Create `libs/amortization-calculations/src/lib/project-rental.ts` per research R11/R12 and data-model.md §C. Make T053 and T052 pass. Depends on T057 and T058.
  - **`growthRates(rental)`**: returns the three rates as fractions, applying `?? 0`.
  - **`projectRental(scenario, schedule)`**:
    - Build years `N = 1…ceil(termMonths/12)`.
    - `GSI_N = (rent + other) × (1+gR)^(N−1)`.
    - The line items are `rentalLineItems(scenario, GSI_N, (1+gE)^(N−1))`.
    - `noi = roundCents(12 × NOI_N)`.
    - `debtService = roundCents(monthlyPrincipalAndInterest × periodsInYear + monthlyPmiAmount × pmiPeriodsInYear)`. Add a JSDoc note that the payoff year counts a full P&I per period, the same as `analyzeDeal`.
    - `cashFlow = roundCents(12 × NOI_N − debtService)`, using the unrounded NOI.
    - `cashOnCash = cashFlow / totalCashInvested`, or `null`. Take `totalCashInvested` and the N/A reason from `analyzeDeal(scenario, schedule)`.
    - `homeValue = roundCents(homePrice × (1+gA)^N)`.
    - `loanBalance` is the remaining balance at the year's last period, or 0 after payoff.
    - `initialEquity = roundCents(homePrice − principal)`.
    - `principalPaid` = `roundCents(principal − loanBalance)` (principal paid down; implemented this way rather than as Σ `principalPortion`, so the equity identity holds to the cent. It stays within $0.05 of the per-period sum, which the tests check).
    - `appreciation = roundCents(homeValue − homePrice)`.
    - When `homePrice` is null or ≤ 0, the equity fields are `null` and `equityNaReason` is set.

  Add `export * from './lib/project-rental';` to `libs/amortization-calculations/src/index.ts`.
- [X] T060 [P] [US6] Write `libs/amortization-ui/src/lib/charts/chart-note.tsx`: `ChartNote({ title, message, 'data-testid' })`. It renders a `<figure className="chart-root rounded-md border …">` with an `<h3>` title and the message in `var(--chart-ink-secondary)`. Export it from `libs/amortization-ui/src/index.ts`.
- [X] T061 [P] [US6] Write `libs/amortization-ui/src/lib/charts/rental-cash-flow-chart.tsx`: `RentalCashFlowChart({ projection })`.
  - Render `LineChart` with `title="Cash flow over the loan term"`, `data-testid="chart-rental-cash-flow"` and `yDomain="auto"`.
  - Each row's data is `{ x: year, noi, debtService, cashFlow }`.
  - Series: NOI ("NOI", 1), Debt service ("Debt service", 2) and Cash flow ("Cash flow", 3), all direct-labeled.
  - Formatters: x is `Yr N`, y is compact currency, `tooltipY` is full USD.
  - Export it from the index.
- [X] T062 [P] [US6] Write `libs/amortization-ui/src/lib/charts/equity-build-up-chart.tsx`: `EquityBuildUpChart({ projection })`.
  - When `projection.equityNaReason` is set, return `<ChartNote title="Equity build-up" message={equityNaReason} data-testid="chart-equity-na" />`.
  - Otherwise render `StackedBarChart` with `title="Equity build-up"` and `data-testid="chart-equity"`.
  - Series: `initialEquity` ("Initial equity", 1), `principalPaid` ("Principal paid", 3) and `appreciation` ("Appreciation", 4). Leave Appreciation out when it is 0 in every year.
  - `tooltipExtras(i)` returns `[{ label: 'Home value', value: usd(homeValue) }, { label: 'Loan balance', value: usd(loanBalance) }]`.
  - Export it from the index.
- [X] T063 [P] [US6] Write `libs/amortization-ui/src/lib/charts/cash-on-cash-chart.tsx`: `CashOnCashChart({ projection })`.
  - When `cashOnCashNaReason` is set, return a `ChartNote` with `data-testid="chart-cash-on-cash-na"`.
  - Otherwise render `LineChart` with `title="Cash-on-cash return by year"`, `data-testid="chart-cash-on-cash"` and `yDomain="auto"`.
  - There is one series, `cashOnCash` ("Cash-on-cash", slot 1).
  - Formatters: y uses `Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })`; `tooltipY` uses 2 fraction digits.
  - Export it from the index.
- [X] T064 [US6] Create `apps/amortization-calculator/src/app/_components/rental-charts-section.tsx` (`'use client'`): `RentalChartsSection({ scenario, schedule })`. Compute `const projection = useMemo(() => projectRental(scenario, schedule), [scenario, schedule])`. Render a `<div className="flex flex-col gap-4">` containing `<h3 className="text-base font-medium text-neutral-700">Over the loan term</h3>`, then `RentalCashFlowChart`, `EquityBuildUpChart` and `CashOnCashChart`.
- [X] T065 [US6] In `apps/amortization-calculator/src/app/_components/rental-inputs-panel.tsx`, add a "Growth assumptions" group after the existing percent fields, with three percent `NumberField`s: "Rent growth" (`rentGrowthPct`), "Expense growth" (`expenseGrowthPct`) and "Appreciation" (`appreciationPct`).
  - Each has `description="per year"`, `suffix="%"`, **no `min`/`max`** (the `@ui-sdk` NumberInput clamps typed values to `[min, max]` on commit, which would hide the FR-013 validation error), `step={0.1}`, `value={rental[field] ?? 0}`, `onValueChange={(v) => onChange({ [field]: v ?? 0 })}` and the matching `errorFor(errors, field)`.
  - Extend the local `percentField` helper to accept `{ min?, step?, description? }` instead of duplicating it. The existing fields keep `min={0}` and `step={0.5}`; the growth fields pass no `min`.
  - Make sure negative values can be typed.
- [X] T066 [US6] In `apps/amortization-calculator/src/app/page.tsx` (insertion point 2, FR-014), render `{analysis && validation.valid && schedule ? <RentalChartsSection scenario={validation.scenario} schedule={schedule} /> : null}` inside the Deal Analyzer section, right after the `deal-metrics` grid, inside the existing `analysis ? (<>…</>)` fragment.
- [X] T067 [US6] Run `npx nx run-many -t lint test -p amortization-calculations amortization-ui amortization-calculator` and `npx nx e2e amortization-calculator-e2e --grep "rental charts|deal analyzer|persist"`. This includes the existing `deal-analyzer.spec.ts` and `validation-and-persistence.spec.ts` as regression checks. Fix any failures.

**Checkpoint**: US6 works on its own, and the existing Deal Analyzer behavior is unchanged.

---

## Phase 8: User Story 4 - Compare scenarios' balances (Priority: P3)

**Goal**: A multi-line balance chart under the comparison grid. Each scenario's color slot is its
index in the scenario list + 1, capped at 8, with a note when capped.

**Independent Test**: The 30-year and 15-year scenarios show two named lines, and the 15-year
line ends at month 180. Adding or removing a scenario does not repaint the other scenarios'
colors (quickstart §6).

### Tests for User Story 4

- [X] T068 [P] [US4] Add `buildScenarioBalanceComparison` tests to `libs/amortization-calculations/src/lib/chart-data.spec.ts`, using `[R1, R1 as 15yr at 5.75%]` with distinct `scenarioId`s:
  - There are 361 rows, with `x` from 0 to 360.
  - Row 0 holds each scenario's starting principal.
  - The 15-year column is 0 at row 180 and `null` from rows 181 to 360.
  - The R1 column equals `buildBalanceSeries(R1, null).balance`.
- [X] T069 [P] [US4] Add a test named "scenario balance chart" to `apps/amortization-calculator-e2e/src/charts.spec.ts`, reusing the steps from `scenario-comparison.spec.ts`:
  - With 1 scenario, there is no `chart-scenario-balance`.
  - After adding a second scenario, it is visible and its legend has both names.
  - Record the first scenario's swatch `background-color`. Add a third scenario, then remove the second. The first swatch's color is unchanged.

### Implementation for User Story 4

- [X] T070 [US4] In `libs/amortization-calculations/src/lib/chart-data.ts`, add `ScenarioBalanceDatum = { x: number } & Record<string, number | null>` and `buildScenarioBalanceComparison(schedules)`. Rows run from 0 to `max(periods.length)` and are keyed by `scenarioId`. Use the same rules as `balance` ("start principal at 0, `null` after payoff"). x is the period number. Make T068 pass.
- [X] T071 [US4] Write `libs/amortization-ui/src/lib/charts/scenario-balance-chart.tsx`: `ScenarioBalanceChart({ schedules, scenarios })`.
  - Return `null` when there are fewer than 2 schedules.
  - Build series in `scenarios` order. Each `color` is `(index in the full scenarios list + 1)`, so color follows the entity.
  - Only scenarios at list index < 8 that have a schedule become series, so `color = index + 1` is always 1–8. `hiddenCount` is the number of valid scenarios at index ≥ 8. When `hiddenCount > 0`, set `description = "Showing scenarios in the first 8 positions; {n} more not drawn."`. Do not use `capSeries` here, because it caps by count and would produce slot 9+ when an earlier scenario is invalid.
  - Render `LineChart` with `title="Balance by scenario"` and `data-testid="chart-scenario-balance"`.
  - Formatters: x ticks every 60 periods, shown as `"Yr {n/12}"`; `tooltipX` is `"Month {n} · Year {ceil(n/12)}"`; y is compact; `tooltipY` is full USD.
  - Export it from the index.
- [X] T072 [US4] In `apps/amortization-calculator/src/app/page.tsx` (insertion point 3, FR-014):
  - Refactor the `comparison` `useMemo` to return `{ schedules, comparison }`, reusing the schedules it already builds without recomputing them. `ComparisonGrid` still gets the same `comparison`.
  - Render `<ScenarioBalanceChart schedules={schedules} scenarios={scenarios} />` under `ComparisonGrid` in "Compare scenarios".
  - Keep the diff small.
- [X] T073 [US4] Run lint and test, and the e2e tests (`--grep "scenario balance|comparison"`). Fix any failures.

**Checkpoint**: All six user stories are complete.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T074 [P] Add edge-case tests to `libs/charts/src/lib/line-chart.spec.tsx` and `libs/charts/src/lib/stacked-bar-chart.spec.tsx`:
  - A single point or category renders with no `NaN` in any attribute.
  - At a width of 300, there are at most 3 x ticks.
  - An all-zero series (the 0% interest case) produces no `NaN` in any path.
  - An all-negative stacked dataset renders entirely below the baseline.
- [X] T075 [P] Add a test named "charts at mobile width" to `apps/amortization-calculator-e2e/src/charts.spec.ts`. At 375×800, with a rental scenario active, assert `document.documentElement.scrollWidth <= 375` and that every chart's test ID is visible.
- [X] T076 Add a performance test, either in `apps/amortization-calculator-e2e/src/performance.spec.ts` or as a new test in `charts.spec.ts`. Use a 360-month scenario with extra payments and a rental. After changing the rate, `chart-balance`, `chart-rental-cash-flow` and the schedule must update within 1 second (SC-002).
- [X] T077 Do a visual check (data-viz step 7):
  1. Start the app with `npx nx dev amortization-calculator`.
  2. With Playwright, take screenshots of the Charts section, the Deal Analyzer's rental charts and the comparison chart, in light mode and in dark mode (`emulateMedia({ colorScheme: 'dark' })`).
  3. Check for label collisions, tooltip overflow, direct-label overlap on the 3-series cash-flow chart, and the weight of the negative baseline.
  4. Fix any problems in `libs/charts`.
- [X] T078 Run the whole of `specs/005-amortization-charts/quickstart.md` (§1–§8), including `npx nx run-many -t lint test -p charts amortization-calculations amortization-ui amortization-calculator` and `npx nx e2e amortization-calculator-e2e`. Tick off each scenario.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies. Within it, T005 needs T002 and T004, and T006 needs T002.
- **Foundational (Phase 2)**: needs Setup. Write the tests T008–T010 first. T011–T020 can then run in parallel. T021 needs T016, T018 and T020. T022 comes last.
- **US1 (Phase 3)**: needs Phase 2. It creates `LineChart` (with `'auto'`), `chart-data.ts`, the reference fixtures, `charts-section.tsx` and page insertion 1.
- **US2 (Phase 4)**: needs Phase 2. Its library work can run in parallel with US1. It creates `StackedBarChart` with signed stacking. T038 needs T029.
- **US5 (Phase 5)**: needs Phase 2. T040 and T041 can start right away. T042 is most meaningful after US1 and US2.
- **US3 (Phase 6)**: needs Phase 2. T049 needs T029.
- **US6 (Phase 7)**:
  - The calculation tasks T051–T053 and T056–T059 need only Phase 2 and the fixtures from T023.
  - The presets T061 and T063 need `LineChart` (T027). T062 needs `StackedBarChart` (T036).
  - T066 edits `page.tsx` after T030.
- **US4 (Phase 8)**: needs Phase 2 and `LineChart` (T027). T070 comes after T026, T035 and T046 because they share a file.
- **Polish (Phase 9)**: comes after the stories it covers.

### Shared-file sequencing (do not run these in parallel)

| File | Order |
|---|---|
| `libs/amortization-calculations/src/lib/chart-data.ts` | T026 → T035 → T046 → T070 |
| `chart-data.spec.ts` | T023 → T032 → T043 → T068 |
| `libs/amortization-calculations/src/lib/types.ts` | T056 (only) |
| `libs/amortization-calculations/src/index.ts` | T026 → T059 |
| `libs/charts/src/index.ts` | T022 → T027 → T036 → T047 |
| `libs/amortization-ui/src/index.ts` | T028 → T037 → T048 → T060–T063 (one at a time) → T071 |
| `charts-section.tsx` | T029 → T038 → T049 |
| `page.tsx` | T030 → T066 → T072 |
| `charts.spec.ts` (e2e) | T025 → T034 → T045 → T054 → T055 → T069 → T075 |

### Parallel Opportunities

```text
# Phase 2, all at once after Setup:
T008 T009 T010 (tests) → T011 T012 T013 T014 T015 T016 T017 T018 T019 T020

# Generic primitives across stories (different files):
T027 LineChart (US1) ‖ T036 StackedBarChart (US2) ‖ T047 SegmentedBar (US3) ‖ T041 README (US5)

# US6 calculation track, in parallel with UI work in other stories:
T051 validate-rental.spec ‖ T052 persistence.spec ‖ T053 project-rental.spec
then T056 → (T057 ‖ T058) → T059

# US6 presets once T027, T036 and T059 are done:
T060 ChartNote ‖ T061 cash flow ‖ T062 equity ‖ T063 cash-on-cash
(index.ts export lines are added one at a time)
```

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1, then Phase 2, then Phase 3 (US1).
2. **Stop and validate** with quickstart §3. The balance chart ships on a reusable `LineChart`.

### Incremental delivery

1. MVP, then US2, then US5, then US3, then US6, then US4, then Polish.
2. Each phase ends with lint, test and e2e for the affected projects (Constitution quality gates)
   and leaves the app shippable.
3. If time is short, US6's calculation track (T051–T059) is the highest-risk piece. It changes
   `analyzeDeal`, so do it before the UI and confirm `analyze-deal.spec.ts` is still green.

### Notes

- After each task, change `[ ]` to `[X]`.
- The constitution recommends running `/speckit-analyze` before `/speckit-implement` for
  features with several stories.
- Merge risk: branches 003 and 004 also touch `page.tsx`. T030, T066 and T072 are single,
  minimal insertions.
