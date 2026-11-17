# Research: Amortization Charts

**Feature**: `005-amortization-charts` | **Date**: 2026-11-16 (updated 2026-11-17 after `/speckit-clarify`)

Each item below resolves an unknown from the plan's Technical Context.

## R1. Rendering approach: charting package vs. hand-rolled SVG

- **Decision**: Hand-rolled, zero-runtime-dependency SVG React components, with small internal pure
  helpers (`linearScale`, `bandScale`, `niceTicks`, `linePath`, `areaPath`, `roundedTopRectPath`).
- **Rationale**:
  - *Reusable and reimportable* works best with as few dependencies as possible. Any app or lib in
    the workspace can import `@companion/charts` without extra packages, bundle cost or React-19
    peer-dependency issues.
  - The charts we need (line, multi-line, stacked column, segmented bar) take about 4 primitives.
    Linear and band scales plus "nice" ticks are around 60 lines of pure, Vitest-testable code.
  - Full control over the mark specs from the workspace's data-viz method: 2px lines, columns up to
    24px wide with 4px rounded data-ends, 2px surface gaps between stacked segments, hairline grids,
    a crosshair tooltip, and per-mode palettes. With Recharts or Chart.js we would spend most of the
    effort overriding their defaults.
  - Keyboard and ARIA behavior (focusable plot, arrow-key stepping, an `aria-live` readout) is
    ours to define and test. A canvas library (Chart.js) would make that much harder.
- **Alternatives considered**:
  - *Recharts 3*: mature and SVG-based, but about 100 kB gzipped, depends on its own
    `d3-*`/`victory-vendor` chain, and gives limited control over keyboard focus and per-mark
    styling. Rejected: too much weight and too many overrides for 4 chart types.
  - *visx / d3-scale + d3-shape*: low-level and composable, but adds 4–6 packages to cover math we
    can write and test ourselves in fewer lines. Kept as the fallback if the primitives grow
    (for example log scales or brushing).
  - *Chart.js / ECharts (canvas)*: poor DOM accessibility and no Tailwind/CSS-variable theming.
    Rejected.

## R2. Where things live: lib boundaries for reuse

- **Decision**: Three layers.
  1. **`libs/shared/charts`** (new, package `@companion/charts`, Nx tags `scope:shared`, `type:ui`):
     domain-free chart primitives and chrome (`LineChart`, `StackedBarChart`, `SegmentedBar`,
     `ChartFrame`, `Legend`, `ChartTooltip`, `ChartDataTable`, theme tokens). It knows nothing
     about loans.
  2. **`libs/amortization-calculations`** (existing): new pure dataset builders in
     `src/lib/chart-data.ts` that turn `AmortizationSchedule` / `LoanScenario` into plain chart
     datasets. They are unit-tested to the cent (Constitution I).
  3. **`libs/amortization-ui`** (existing): thin preset components (`BalanceChart`,
     `PrincipalInterestChart`, `PaymentCompositionBar`, `ScenarioBalanceChart`) that combine (2)
     with (1). The app only places them on the page.
- **Rationale**: This keeps the generic charts usable by future features (002's Deal Analyzer could
  chart NOI or cash flow with the same `StackedBarChart`), keeps the math testable without a DOM,
  and matches the existing "thin apps, fat libs" split.
- **Alternatives considered**: Putting everything in `amortization-ui`. Rejected because then any
  reuse of a line chart would pull in loan-domain code and `@ui-sdk` form widgets, which defeats the
  "reimportable" goal.

## R3. Package name and how consumers import it

- **Decision**: Generate with `nx g @nx/react:library` using `directory=libs/shared/charts`, `name=charts`,
  `importPath=@companion/charts`, `bundler=none`, `unitTestRunner=vitest`, `linter=eslint`. Use the
  same source-first `package.json` `exports` pattern as the existing libs
  (`"." → ./src/index.ts`) and add a CSS entry `"./theme.css" → ./src/theme.css` for the color
  tokens. Run `npm install` so the npm workspace symlinks `node_modules/@companion/charts`.
  Check the exact generator flags with `--help` / `nx_docs` before running it, as CLAUDE.md requires.
- **Rationale**: The scoped name avoids a clash with the unrelated public npm package `charts`, and
  makes it obvious that this is a workspace package. A source-first export with no build step
  matches `amortization-ui`, so Next and Vitest transpile it directly. Because of the Tailwind
  `@source` directive, the app must also scan `libs/shared/charts/src` for class names.
- **Alternatives considered**:
  - Bare name `charts`, which risks a name collision. Rejected.
  - A buildable/publishable lib (`bundler=vite`). This is not needed until something outside the
    workspace consumes it. It can be switched later without changing the API.

## R4. Enforcing "reimportable without leaking domain"

- **Decision**: Add Nx project tags and replace the catch-all `depConstraints` in the root
  `eslint.config.mjs`:
  - `scope:shared` may depend only on `scope:shared`.
  - `scope:amortization` may depend on `scope:amortization` and `scope:shared`.
  - Tag existing projects: `amortization-calculations` → `scope:amortization,type:util`;
    `amortization-ui` → `scope:amortization,type:ui`; app → `scope:amortization,type:app`;
    `charts` → `scope:shared,type:ui`.
- **Rationale**: This turns SC-003 ("charts has zero amortization-* deps") into a lint rule, so it
  stays true. Deep imports (`@companion/charts/src/...`) are already blocked by
  `enforce-module-boundaries` together with the `exports` map.
- **Alternatives considered**: Relying on review only. Rejected because Constitution II asks for
  enforced boundaries.

## R5. Which charts are "useful" for an amortization calculator

- **Decision**: Four charts, chosen with the data-viz form heuristic ("the job picks the form"):

  | Question | Form | Color job |
  |---|---|---|
  | How fast does my balance fall, and how much do extra payments help? | Line (balance over time); baseline as a gray de-emphasized line | Emphasis: slot 1 plus muted gray |
  | Where does each year's money go? | Stacked column per loan year (Principal, Interest) | Categorical, 2 slots |
  | What is my real monthly payment made of? | Tall segmented bar (one whole, ≤ 6 parts) with a legend | Categorical, ≤ 5 slots |
  | How do my scenarios compare? | Multi-line balance, one line per scenario | Categorical by scenario list index |

- **Rejected forms**: Donut or pie for payment composition (the form heuristic prefers a segmented
  bar). A dual-axis "balance + cumulative interest" chart (never use two y-scales; cumulative
  interest stays in the tooltip and the existing summary). A per-month stacked column (360 columns
  are unreadable; yearly grouping is readable).
- **Deferred**: A cumulative interest-vs-principal area chart. It can be built later from
  `LineChart` with no new primitive. Equity over time was moved into scope as a rental chart
  (research R12, spec US6).

## R6. Palette and theming

- **Decision**: Use the data-viz reference palette as CSS custom properties in
  `libs/shared/charts/src/theme.css`, scoped to `.chart-root`, with selected dark steps under both
  `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. Series refer to a **slot number**
  (1–8) or the `muted` role, never a raw hex value.
  - Light: `#2a78d6 #eb6834 #1baf7a #eda100 #e87ba4 #008300 #6250d6 #e34948`; surface `#fcfcfb`.
  - Dark: `#3987e5 #d95926 #199e70 #c98500 #d55181 #0ca30c #9085e9 #e66767`; surface `#1a1a19`.
  - Ink and chrome: grid `#e1e0d9` / `#2c2c2a`, axis `#c3c2b7` / `#383835`, muted `#898781`.
- **Validation (run, not eyeballed)**: `validate_palette.js` light gives all checks PASS (worst
  adjacent CVD ΔE 9.1, normal-vision ΔE 19.6), with a contrast WARN for slots 3, 4 and 5 (below
  3:1). Dark gives all checks PASS (CVD ΔE 8.4, normal-vision ΔE 19.3, all ≥ 3:1).
  The light WARN requires relief: every chart ships direct labels or a legend **and** the data-table
  view, so no information depends on those three colors alone.
- **Slot assignment**: Principal = 1 (blue) and Interest = 2 (orange) in both the column chart and
  the composition bar, so the same concept keeps the same color across charts. Then Tax = 3,
  Insurance = 4, PMI = 5, HOA = 7 (slot 6 is skipped, and PMI/HOA order follows the cost-breakdown
  panel). Scenario lines use slot = scenario index + 1, so color follows the entity, not its rank.
- **Alternatives considered**: Tailwind palette classes (`blue-600` and so on). Rejected because
  they are not CVD-validated as a categorical set and have no selected dark steps.

## R7. Interaction and accessibility

- **Decision**:
  - The plot `<svg>` is wrapped in a focusable `<div role="group" aria-roledescription="chart"
    aria-label="{title}">`. ← and → (and Home/End) move an active index. Pointer movement snaps to
    the nearest x. The same active index drives the crosshair, the tooltip and a visually hidden
    `aria-live="polite"` readout.
  - The tooltip is an absolutely positioned HTML element (not SVG text), so it uses system
    typography and can be wider than the plot. Its text uses ink tokens and a color swatch shows
    series identity.
  - Hit targets are larger than marks: line charts use one full-height invisible column per x
    index, and stacked columns use the whole band.
  - "Show data" uses `@ui-sdk/react/collapsible` to reveal a real `<table>` (`ChartDataTable`).
    This is Constitution IV-compliant for the one standard control we add.
  - `prefers-reduced-motion`: there are no transitions at all (no animated charts), so nothing needs
    gating.
- **Rationale**: This covers FR-005 and FR-008 and the "hover layer by default" rule. A chart's
  arrow-key stepping is a composite widget with no `@ui-sdk` equivalent (the SDK has no
  chart or data-point-navigation primitive), so it is custom. See Complexity Tracking in plan.md.

## R8. Responsive sizing

- **Decision**: `ChartFrame` measures its container width with a `ResizeObserver` (a
  `useElementWidth` hook) and passes `width` to the plot. Height is a fixed prop (default 240).
  The x tick count is `clamp(2, floor(width / 80), 8)`, and the y tick count is about 5 "nice"
  ticks. Before measurement (SSR or first paint) the frame renders an empty box of the correct
  height to avoid layout shift. Charts are client components (`'use client'`).
- **Alternatives considered**: An SVG `viewBox` with `preserveAspectRatio`. Rejected because it
  scales stroke widths and text, which breaks the 2px-line and 12px-label specs.

## R9. Dataset shapes and performance

- **Decision**: The generic charts take **column-oriented-by-row** data:
  `data: Array<{ x: number | string; [seriesKey]: number | null }>` plus
  `series: { key, label, color }[]` (see contracts/charts-api.md). The amortization builders output
  exactly this shape, so presets do no reshaping.
- **Performance**: 360 periods × 2 series gives about 720 points and one `<path>` per series.
  Rendering is well under 16 ms, so no downsampling is needed. Builders are O(n) and run inside the
  page's existing `useMemo`. The baseline for the balance chart needs a second `computeSchedule`
  call with `extraPayments: []`, which is O(n) and only runs when extra payments exist.
- **Null handling**: A series that ends earlier (a scenario that pays off sooner, or the extra-payment
  line) is `0` at its payoff period and `null` afterwards. `linePath` breaks at `null`, so a
  shorter loan's line stops at $0 and does not run along the axis.

## R10. Merge risk with in-flight features

- **Finding**: Branches `003-feature-pages-navigation` and `004-amortization-schedule-pagination`
  both branch from `348a72b` and probably edit `apps/amortization-calculator/src/app/page.tsx` and
  the schedule area.
- **Decision** (updated for spec FR-014): The app uses **three insertion points**, each a single
  JSX element backed by a component in `_components/`:
  1. `<ChartsSection>` sits directly above the "Amortization schedule" section.
  2. `<RentalChartsSection>` sits inside the Deal Analyzer section, after `deal-metrics`.
  3. `<ScenarioBalanceChart>` sits inside "Compare scenarios", under `ComparisonGrid`.

  The `comparison` `useMemo` is changed once to also return its `schedules`. If 003 moves these
  sections to other routes, each element moves with its section unchanged.

## R11. Rental projection model (year-by-year)

- **Decision**: A new pure builder, `projectRental(scenario, schedule)`, produces one row per loan
  year `N = 1…ceil(termMonths / 12)` (spec Q4). It reuses `analyzeDeal`'s year-1 definitions, so
  year 1 matches exactly (FR-011). Let `gR = rentGrowthPct/100`, `gE = expenseGrowthPct/100` and
  `gA = appreciationPct/100`. The projection is:
  - **Income**: `GSI_N(monthly) = (grossMonthlyRent + otherMonthlyIncome) × (1+gR)^(N−1)`.
  - **Percent-of-income expense lines** (vacancy, management, maintenance, CapEx): `pct × GSI_N`.
    They grow with rent through their income base, as the spec says.
  - **Fixed expense lines** (property tax, insurance, HOA): `year-1 monthly × (1+gE)^(N−1)`.
  - **NOI**: `NOI_N(annual) = roundCents(12 × (GSI_N − pctLines_N − fixed_N))`. With N = 1 this is
    exactly `analyzeDeal().netOperatingIncome.annual`.
  - **Debt service**: `DS_N = roundCents(monthlyPrincipalAndInterest × periodsInYear(N) +
    monthlyPmiAmount × pmiPeriodsInYear(N))`. This is `analyzeDeal`'s own formula, applied per
    year. `periodsInYear(N)` counts the schedule periods in that loan year, so it is 0 after an
    early payoff (spec acceptance scenario 3).
  - **Cash flow**: `CF_N = roundCents(12 × NOI_N(monthly, unrounded) − DS_N)`. This follows
    `analyzeDeal`'s rounding order, so year 1 matches to the cent.
  - **Cash-on-cash**: `CoC_N = CF_N / totalCashInvested`, using the initial cash invested every
    year (spec Q4 decision). It is `null` with `analyzeDeal`'s `naReason` when cash invested is 0.
- **Refactor**: Move `analyzeDeal`'s inline line-item construction into an internal
  `rentalLineItems(scenario, gsiMonthly, expenseFactor)` helper in a new internal module,
  `rental-line-items.ts`, which is not re-exported from `index.ts`. Both
  `analyzeDeal` and `projectRental` call it, so the expense definitions live in one place
  (FR-012: "rather than duplicating it"). Existing `analyze-deal.spec.ts` must pass unchanged
  (Constitution I).
- **Known simplification**: In the payoff year, debt service counts the full scheduled P&I for
  each period, even though the final payment may be smaller. This is the same simplification
  `analyzeDeal` makes for year 1. It is kept for consistency and documented in the builder's JSDoc.
- **Alternatives considered**: Growing every expense by `gE`, including the percent-of-income
  lines. Rejected because it contradicts the clarified spec, and it would let vacancy or
  management drift away from their percentages.

## R12. Equity build-up definition

- **Decision**: At the end of loan year N:
  - `homeValue_N = homePrice × (1+gA)^N`
  - `balance_N` is the remaining balance at the last period of year N, or 0 after payoff.
    For years after payoff, it stays 0.

  Equity is split into three parts that always add up to `homeValue_N − balance_N`:
  - `initialEquity = homePrice − principal` (the down payment when principal isn't overridden).
    It is constant every year.
  - `principalPaid_N` = Σ `principalPortion` through year N. This includes extra principal.
  - `appreciation_N = homeValue_N − homePrice`.

  The chart is not shown, and an N/A note appears instead, when `homePrice` is null or ≤ 0
  (spec edge case). "Remaining loan balance as context" (spec US6) appears in the tooltip and data
  table as **Home value** and **Loan balance** rows. It is not drawn as an extra mark, because a
  bar-plus-line combination needs more primitives and adds little.
- **Rationale**: The three parts are additive and each one is cents-testable. Starting from
  `homePrice − principal` instead of `downPaymentDollars` keeps the identity exact even when the
  user overrides principal.

## R13. Chart forms for the rental charts

| Chart | Form | Why |
|---|---|---|
| Cash flow over time | `LineChart` with 3 series: NOI (slot 1), Debt service (slot 2), Cash flow (slot 3). x = loan year. `yDomain: 'auto'` (includes 0 and negatives). The zero line is drawn in axis ink when the domain crosses 0. | All three are dollars on one axis, so there is no dual axis. Cash flow is the visible gap between NOI and debt service, and its step-ups at PMI drop and payoff are easy to read as lines. |
| Equity build-up | `StackedBarChart` per year: Initial equity (slot 1), Principal paid (slot 3), Appreciation (slot 4) | A part-to-whole that changes over time, which the form heuristic maps to a stacked column chart. |
| Cash-on-cash over time | `LineChart`, one series (slot 1), percent formatter, `yDomain: 'auto'` | A single trend over time. |

- **Generic-library changes this needs** (they stay domain-free):
  1. `LineChart` gains `yDomain: 'auto'`, which means `[min(0, dataMin), max(0, dataMax)]` made
     nice. When the domain spans below 0, the 0 gridline is drawn as the baseline (`--chart-axis`).
  2. `StackedBarChart` gains **signed stacking**: positive values stack up from 0 and negative
     values stack down from 0. Rounded ends go on the outermost segment in each direction. This
     replaces the earlier "negatives not supported in v1" rule, because negative appreciation
     (`appreciationPct < 0`) and negative initial equity (principal > price) can both happen.
  3. `ChartBaseProps` gains an optional `tooltipExtras?: (index) => { label; value: string }[]`
     prop for context rows that are not series (used for Home value and Loan balance).
- **Colors**: Within each chart, slots are distinct and adjacent-validated (1/2/3 and 1/3/4 all
  fall in the first-four range). Slot 1 consistently means "the primary quantity" within a chart.
  It is not a shared concept across charts, so the reused blue is acceptable. Cash flow uses
  slot 3 (aqua) and not the status green, because status colors are reserved.

## R14. Growth inputs: type, validation, persistence

- **Decision**:
  - Add three **optional** fields to `RentalAssumptions`: `rentGrowthPct?: number`,
    `expenseGrowthPct?: number` and `appreciationPct?: number`. A missing field means 0.
    A helper, `growthRates(rental) → { rent, expense, appreciation }` (as fractions), is the only
    place that applies the `?? 0`.
  - `DEFAULT_RENTAL_ASSUMPTIONS` gets all three set to `0`, so new rentals store explicit zeros.
  - `validateRental` adds a `GROWTH_FIELDS` group. When a field is present it must be finite and
    in **−10…25** inclusive (spec FR-013), with the message
    `"{label} must be between -10% and 25%."`.
  - `deserializeScenarios` needs **no change**. The fields are optional, so old sessions
    deserialize as they are and behave as 0% (FR-013 backward compatibility). A test proves this.
- **Rationale**: Optional fields avoid rewriting every existing `RentalAssumptions` fixture in
  the 001/002 test suites, and they keep `analyzeDeal`'s year-1 result unaffected by growth (year 1
  never applies growth).
- **UI**: `rental-inputs-panel.tsx` gets a "Growth assumptions" group with three percent
  `NumberField`s ("Rent growth", "Expense growth", "Appreciation"), each with a "/yr" description.
  They reuse the panel's existing `percentField` helper, extended so `min` is optional. These are
  `@ui-sdk` NumberFields, so they meet Constitution IV.
- **No `min`/`max` on the growth fields (on purpose)**: `@ui-sdk` NumberInput clamps typed values
  to `[min, max]` and snaps them to `step` on commit (`number-input-api.js` `commitText`). With
  `max={25}`, typing 30 would silently become 25 and the FR-013 error would never show.
  `validateRental` enforces −10…25 and shows the error, the same as every other invalid rental
  input. `step` is 0.1, so typical rates like 2.5% or 3.2% are not snapped away.
- **Alternatives considered**: Required fields with a backfill in the deserializer. Rejected
  because of the fixture churn and the larger diff for no behavioral gain.

## R15. Rental chart visibility rules

- All three rental charts render only when `analysis != null`. That is the page's existing
  condition: the scenario is valid, the rental is present, and `validateRental` returns no errors.
- Equity chart: when `homePrice` is null, it shows the note "Enter a purchase price to see equity
  build-up." in the chart's place.
- Cash-on-cash chart: when `totalCashInvested === 0`, it shows the N/A reason from `analyzeDeal` in
  the chart's place.
- Notes keep the chart title as the `<h3>`, so the layout is stable and screen readers announce why
  the chart is missing.
