# Contract: amortization chart presets (`amortization-ui`)

**Project**: `libs/amortization-ui` · folder `src/lib/charts/` · re-exported from `src/index.ts`.

Each preset is a **thin composition**: a dataset builder from `amortization-calculations` plus a
generic component from `@companion/charts`, with currency/date formatters and fixed color
slots. Presets hold no state beyond what the generic chart holds. Any other view can reuse them by
passing a schedule.

| Component | Props | Generic chart | Series and slots | Renders `null` when |
|---|---|---|---|---|
| `BalanceChart` | `{ schedule: AmortizationSchedule; baseline?: AmortizationSchedule \| null }` | `LineChart` | `balance` "With extra payments" (or "Balance" when there is no baseline) → slot 1. `baseline` "Baseline" → `muted`, `emphasis: 'context'` | never (for a valid schedule) |
| `PrincipalInterestChart` | `{ schedule; groupBy?: 'loanYear' \| 'calendarYear' }` | `StackedBarChart` | Principal → 1, Extra principal → 3 (only when > 0), Interest → 2 | never |
| `PaymentCompositionBar` | `{ scenario: LoanScenario; schedule }` | `SegmentedBar` | P&I 1, Tax 3, Insurance 4, PMI 5, HOA 7 | `components.length < 2` |
| `ScenarioBalanceChart` | `{ schedules: AmortizationSchedule[]; scenarios: Pick<LoanScenario,'id'\|'name'>[] }` | `LineChart` | slot = index of the scenario in `scenarios` + 1, label = scenario name | `schedules.length < 2` |
| `RentalCashFlowChart` | `{ projection: RentalProjection }` | `LineChart` (`yDomain: 'auto'`, x = year) | NOI → 1, Debt service → 2, Cash flow → 3. All are direct-labeled (3 series ≤ 4). | never (the caller only renders it with an analysis) |
| `EquityBuildUpChart` | `{ projection: RentalProjection }` | `StackedBarChart` (signed) | Initial equity → 1, Principal paid → 3, Appreciation → 4. Appreciation is omitted when it is 0 in every year. `tooltipExtras`: Home value, Loan balance. | When `projection.equityNaReason` is set, it renders the titled N/A note instead |
| `CashOnCashChart` | `{ projection: RentalProjection }` | `LineChart` (`yDomain: 'auto'`, percent formatters) | Cash-on-cash → 1 | When `cashOnCashNaReason` is set, it renders the titled N/A note instead |

Shared formatting: currency `en-US` USD for tooltips and the table, and `formatCompactCurrency`
for the y-axis. Dates use `Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })`,
which is the same locale as feature 001's FR-013.

Rental presets use the same currency formatter. The x-axis shows `Yr N` ticks thinned to about one
per 80px. Percent values use `Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 })`
on the axis and 2 fraction digits in the tooltip and table, which matches the Deal Analyzer's
`percent2`.

The N/A note is a small `ChartNote({ title, message, 'data-testid' })` component in the same
folder. It renders the `<h3>` title and the message in secondary ink, inside the same bordered
frame. It shares the chart's test ID, with an `-na` suffix.

Test IDs, for e2e: `chart-balance`, `chart-principal-interest`, `chart-payment-composition`,
`chart-scenario-balance`, `chart-rental-cash-flow`, `chart-equity` (or `chart-equity-na`),
`chart-cash-on-cash` (or `chart-cash-on-cash-na`).

## App integration (`apps/amortization-calculator`): placement per spec FR-014

Every chart is visible by default. There are no tabs and nothing is collapsed, apart from each
chart's own "Show data" toggle.

| Insertion point in `page.tsx` | Element | Contents |
|---|---|---|
| 1. Directly above the "Amortization schedule" section, when `schedule` is non-null | `<ChartsSection scenario={validation.scenario} schedule={schedule} />` (new `_components/charts-section.tsx`) | `<h2>Charts</h2>`, then `PaymentCompositionBar`, `BalanceChart` (with a memoized `computeBaselineSchedule`), then `PrincipalInterestChart` |
| 2. Inside the "Deal analyzer" section, after `deal-metrics`, when `analysis` is non-null | `<RentalChartsSection scenario={validation.scenario} schedule={schedule} />` (new `_components/rental-charts-section.tsx`) | memoized `projectRental`, then `RentalCashFlowChart`, `EquityBuildUpChart` and `CashOnCashChart`, under an `<h3>`-level group label "Over the loan term" |
| 3. Inside "Compare scenarios", under `ComparisonGrid` | `<ScenarioBalanceChart schedules={schedules} scenarios={scenarios} />` | `schedules` comes from the refactored `comparison` `useMemo`, which returns `{ schedules, comparison }` |

### Growth inputs (`_components/rental-inputs-panel.tsx`)

Add a "Growth assumptions" group after the existing percent fields. It has three percent
`NumberField`s: "Rent growth", "Expense growth" and "Appreciation". Each has the description
"per year" and is bound to `rental.rentGrowthPct`, `expenseGrowthPct` and `appreciationPct`
through the existing `onChange` patch. Each one shows the matching `rental.*` error from
`validateRental`, and allows negative entry. Do not pass `min`/`max`, because the NumberInput clamps on commit
(research R14); `validateRental` enforces −10…25. Use `step={0.1}`.

### Other app files

- `global.css` gets `@import '@companion/charts/theme.css';` and
  `@source '../../../../libs/charts/src';`.
- `apps/amortization-calculator/package.json` and `libs/amortization-ui/package.json` add
  `"@companion/charts": "*"`.
