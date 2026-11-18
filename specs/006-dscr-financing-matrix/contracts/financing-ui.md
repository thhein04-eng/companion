# Contract: DSCR & financing UI (`deal-analyzer-ui`)

These are presentational components wired by `DealAnalyzerView`. None of them compute finance
math; they render the results from [dscr-financing-calculations.md](./dscr-financing-calculations.md).
The `data-testid` values listed here are part of the contract that the e2e tests depend on.

## Placement on `/deal-analyzer`

```text
Deal analyzer (h2)
├── RentalInputsPanel            (existing)
├── IncomeExpenseCard            (existing)
├── DealMetrics                  (existing, now 4 cards: Cap rate · DSCR · 1% Rule · 50% Rule)
└── RentalChartsSection          (existing)
Financing options (h2)           (new section; shown only when an analysis exists)
└── FinancingMatrix
Compare scenarios (h2)           (existing grid + new "DSCR" column)
```

## `DscrCard` — `data-testid="dscr"`

```ts
interface DscrCardProps {
  dscr: DscrResult;
  onMinimumChange: (value: number) => void; // writes rental.dscrMinimum
  minimumInput: number | undefined;         // raw stored value for the input
  minimumError: string | null;
}
```

- **Value**: `1.19×`, with a typographic "×" and two decimals. A negative value shows as `−0.12×`.
- **Status pill**: reuses the `RuleIndicator` styles: `pass` ✓ "Meets 1.25× minimum", `fail` ✕
  "Below 1.25× minimum", `na` – when there is no valid minimum. The pill has
  `data-testid="dscr-status"` and `data-status="pass|fail|na"`.
- When `coversDebtService === false`, the card adds "NOI does not cover the annual principal &
  interest."
- When `meetsMinimum === false`, it shows "Rent needed for 1.25×: $3,954.40/mo"
  (`data-testid="dscr-rent-needed"`), or its N/A reason.
- **Minimum control**: a `SegmentedControl` labelled "Minimum DSCR" with items 1.15× / 1.20× / 1.25×
  (nothing is checked when the value is custom), next to a `NumberField` (step 0.01, min 1, max 2)
  labelled "Custom minimum". The inline error comes from `minimumError`.
- An info popover explains DSCR with the same `Popover` pattern as `RuleIndicator`.

## `FinancingMatrix` — `data-testid="financing-matrix"`

```ts
interface FinancingMatrixProps {
  matrix: FinancingMatrix;
  errors: FieldError[];
  onSelect: (id: FinancingOptionId) => void;          // writes rental.financingSelection
  onTermsChange: (id: FinancingOptionId, patch: Partial<ArmTerms>) => void; // materializes, then patches
  onReset: () => void;                                 // sets rental.financing = null
}
```

- When `matrix.options === null`, it renders only `matrix.naReason`
  (`data-testid="financing-matrix-na"`).
- **Toggle**: a `SegmentedControl` with `aria-label="Loan structure"` and items "Conventional" /
  "ARM" / "DSCR loan" (values `conventional|arm|dscr`), with `data-testid="financing-toggle"`.
- **Table** (≥ `sm`): a `<table>` with a `<caption>` "Financing options for {scenario name}". It has
  one `<th scope="col">` per option (`data-testid="financing-col-{id}"`). The selected header has
  `aria-current="true"` and `data-selected="true"` and a highlighted column background. The rows, in
  order, are: Rate, Term, Down payment, Loan amount, Cash invested, Monthly P&I, Monthly PMI,
  Monthly cash flow, Cash-on-cash, DSCR, Rent for {min}× (row key `rent-needed`, FR-004 per column;
  it reads "Met" when the minimum is met). Each cell has `data-testid="{row-key}-{id}"`, for example
  `cash-flow-arm`.
- **ARM phases**: the ARM per-phase rows (P&I, PMI, cash flow, CoC, DSCR, rent needed) show two
  stacked values, labelled "Yrs 1–7" and "Yrs 8–30" (`…-arm-initial`, `…-arm-reset`).
- **DSCR cells**: the value plus the same status pill as `DscrCard` (`data-status`). The fail cells
  are red, and the reason is given by text and icon. Below 1.00× a cell adds "NOI doesn't cover
  P&I" (FR-003).
- **Negative cash flow**: shown in red with a leading minus sign, the same as the existing cash-flow
  display.
- **Invalid option**: its cells show "—", and the column header shows "Fix the terms below".
- **Breakdown** (`data-testid="financing-breakdown"`), shown for the selected option under the table:
  "NOI $2,376.00 − P&I $1,995.91 − PMI $0.00 = Cash flow $380.09 /mo". For the ARM it shows one line
  per phase. This needs the extra prop `noiMonthly: number`.
- **Narrow screens** (< `sm`): the table is hidden, and only the selected option is rendered as a
  `<dl data-testid="financing-narrow">`, so there is no horizontal page scroll (FR-010). Its cells
  use the same test ids prefixed with `narrow-` (for example `narrow-cash-flow-conventional`), so
  ids stay unique while both layouts are in the DOM.

## `FinancingTermsEditor` — `data-testid="financing-terms-{id}"`

This editor appears under the matrix for the **selected** option only, so one set of fields is
visible at a time.

- **Fields**: "Down payment %", "Interest rate %" ("Initial rate %" for the ARM), "Term (years)".
  The ARM also has "Fixed period" (a `Select` with 3/5/7/10 years) and "Adjusted rate %". Each field
  uses `NumberField` and shows its inline error, matched by the `rental.financing.{id}.{field}` key.
- A "Reset to defaults" `Button` is shown only when `matrix.isCustomized`
  (`data-testid="financing-reset"`).

## `useFinancingEditor()`

This hook follows the same pattern as `useRentalEditor`. It exposes `setDscrMinimum`,
`setSelection`, `patchTerms(id, patch)` and `resetTerms`, all as writes to `activeScenario.rental`
through `updateActiveScenario`. `patchTerms` first materializes
`resolveFinancingTerms(scenario).terms` when `rental.financing` is absent (R7).

## Comparison grid

`DEAL_COMPARISON_COLUMNS` gains `{ id: 'dscr', header: 'DSCR', render: orDash(row.dscr, v => v.toFixed(2) + '×') }`,
inserted after "Cap Rate".
