# Contract: Deal Analyzer UI Components

All components are presentational. They receive derived data as props and emit changes upward, and they contain no financial math (Constitution II). Shared components live in `libs/amortization-ui`; app-specific wiring lives in `apps/amortization-calculator/src/app/_components`.

## `libs/amortization-ui`

### `MetricBadge`

```ts
interface MetricBadgeProps {
  label: string;                 // "LTV" | "Cash-on-Cash"
  value: number | null;          // unrounded fraction; null → "N/A"
  fractionDigits?: number;       // default 1
  naReason?: string | null;      // shown as visually-hidden + title text when value is null
  tone?: 'neutral' | 'positive' | 'negative'; // negative also renders a "−" sign and "Negative" sr text
}
```

- Renders inside a `MetricBadgeGroup` (`role="group"`, `aria-label="Key deal metrics"`, `aria-live="polite"`).
- The test id is `data-testid="badge-<kebab label>"`, used for e2e.

### `IncomeExpenseCard`

```ts
interface IncomeExpenseCardProps {
  analysis: DealAnalysis;
  period?: 'monthly' | 'annual'; // controlled; default 'monthly'
  onPeriodChange?: (p: 'monthly' | 'annual') => void;
}
```

- Title: "Rental Income vs. Operating Expenses".
- Rows: GSI, each `operatingExpenses` line, Total operating expenses, **NOI**, Debt service, **Cash flow**.
- Monthly/annual toggle via `@ui-sdk/react/tabs`.
- Negative cash flow shows red text, a "▼ Negative" label, and a minus sign. It never relies on color alone.
- When `analysis.pmiEndsInYearOne` or `pmiDropPeriod != null`, shows the note "Cash flow improves after PMI drops off at payment #N."

### `RuleIndicator`

```ts
interface RuleIndicatorProps {
  name: '1% Rule' | '50% Rule';
  status: 'pass' | 'fail' | 'na';
  detail: string;        // e.g. "Rent $2,400 vs. target $2,500"
  explanation: string;   // one sentence, shown in popover
}
```

- Info button opens a `@ui-sdk/react/popover` with `openOnHover`. It also opens on press (tap, click, or Enter), and is keyboard- and screen-reader-reachable (FR spec US3-AS4).
- Status uses both an icon or text ("Pass", "Fail", "N/A") and color.

### `ComparisonGrid` (extended)

Adds the columns Cash Flow /mo, NOI /yr, Cap Rate, and CoC, rendered only when at least one row has non-null deal values. A `null` cell renders "—".

## `apps/amortization-calculator`

### `RentalInputsPanel` (`_components/rental-inputs-panel.tsx`)

```ts
interface RentalInputsPanelProps {
  rental: RentalAssumptions | null;
  errors: FieldError[];                       // rental.* only
  onChange: (patch: Partial<RentalAssumptions> | null) => void; // null removes rental analysis; first rent entry seeds defaults upstream
}
```

Uses `NumberField` for every input. When `rental == null`, only the rent field is shown, with the hint "Enter rent to analyze this as a rental."

### `page.tsx` wiring

1. `computeLtv(activeScenario)` → the LTV badge, always rendered once a home price exists.
2. If `activeScenario.rental` is set and `validateRental` passes: `analyzeDeal(scenario, schedule)` → CoC badge, `IncomeExpenseCard`, and `RuleIndicator`s.
3. The new "Deal analyzer" section sits after "Real-estate costs". The badge group sits in the page header area next to the scenario tabs.
4. All derivations run inside the existing `useMemo` render path. No effects and no debouncing are needed (SC-003).
