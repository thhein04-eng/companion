# Contract: UI

## Route and navigation

- Route `/sensitivity`: `apps/amortization-calculator/src/app/sensitivity/page.tsx`, metadata title
  "Sensitivity & Max Offer", renders `<SensitivityView />` from `deal-analyzer-ui`.
- Nav item `{ id: 'sensitivity', label: 'Sensitivity', href: '/sensitivity', icon: <GridIcon /> }`
  after "Sale Profit". `GridIcon` is new in `shared-ui` (a 3 × 3 grid, `size-5`).
- `PageProfile.pageId` gains `'sensitivity'`; `SENSITIVITY_PROFILE` (research R8).

## `SensitivityView` (deal-analyzer-ui)

Order: `DealStrip` (profile `SENSITIVITY_PROFILE`, headline = cash flow or Cash-on-Cash), `PageHeader`
("Analysis" / "Sensitivity & Max Offer" / one-line lede), then:

1. Section "Sensitivity grid": controls row, the grid, the legend, the max-offer line.
2. Section "Max allowable offer": `MaxOfferCard`.

With an unmet requirement (price, down payment, rent, or invalid inputs): the `InputsMessage` only,
`data-testid="sensitivity-na"`, text: "Add rent to see the sensitivity." / "Fix the loan inputs to see
the sensitivity." / "Fix the rental inputs to see the sensitivity." (the first that applies).

### Controls (ui-sdk `SegmentedControl`, shared `SegmentedControl` with `showLabel`)

| Label | Options | Test id |
|---|---|---|
| Measure | Monthly cash flow / Cash-on-Cash | `sensitivity-measure` |
| Vary | Price / Rent | `sensitivity-vary` |
| Rate step | 0.25% / 0.5% / 1% | `sensitivity-rate-step` |
| Column step | 2.5% / 5% / 10% | `sensitivity-column-step` |

## `SensitivityGrid`

```ts
interface SensitivityGridProps {
  grid: SensitivityGrid; measure: SensitivityMeasure;
  target: SensitivityTarget; 'data-testid'?: string;
}
```

- `role="grid"` with a caption (visually hidden) "Monthly cash flow by interest rate and price change".
  Header row: an empty corner cell, then one `columnheader` per column showing the percentage
  ("−10%", "0%", "+5%") over the amount ("$225,000" or "$2,520/mo"). Each row starts with a
  `rowheader` ("5.5%").
- Cells (`role="gridcell"`, `data-testid="sensitivity-cell"`, `data-row`, `data-col`,
  `data-state`): compact text: whole dollars for cash flow ("$430", "−$1,208"), one decimal for
  Cash-on-Cash ("7.9%", "−2.1%"), "n/a" when undefined. `data-state` ∈
  `current | below-target | negative | ok` (a cell can be both; the order of precedence for the
  attribute is current > below-target > negative > ok, and the aria label lists all that apply).
- `aria-label` per cell: "Rate 6.5%, price change −5% ($237,500): cash flow $430.20 per month,
  below target" (exact figures to the cent / 0.01 point, plus "current deal", "negative", "below
  target" as applicable).
- Current-deal cell: a 2px ring (`outline-accent`) and "Current deal" in its label.
- Below-target cells show "▼" before the figure (`aria-hidden`; the label carries the words).
- Tint: research R6. Text color `--fg` always.
- The tagged column header (price variable and an offer in range): a small "≈ max offer" tag.
- Keyboard: roving tabindex; arrows move one cell (headers included), Home/End to the row's ends,
  Ctrl+Home/End to the corners (research R9).
- Layout: the grid scrolls inside its own region (`overflow-x-auto`, focusable region) if the
  viewport is narrower than ~380px; at 390px it fits (cells ≥ 56px, headers 11px).

Legend line (`data-testid="sensitivity-legend"`): "▼ below your {target text} target · − negative
· ring = current deal", where `{target text}` is "8% Cash-on-Cash" or "$300/mo cash flow". Until the investor has set a target (data-model §A) the "▼ below your … target" part is omitted.

Max-offer line under the grid (price variable and offer in range; `data-testid="sensitivity-mao-line"`):
"Max offer $231,500 is −7.4% from your price."

## `MaxOfferCard`

```ts
interface MaxOfferCardProps {
  scenario: LoanScenario; target: SensitivityTarget; result: MaxOfferResult;
  gridMeasure: SensitivityMeasure; onTargetChange(t: SensitivityTarget): void;
  onUsePrice(price: number): void; errors: FieldError[];
}
```

- Until a target is set, the card shows the defaults with a "Default target" label.
- Target controls: `SegmentedControl` "Target measure" (Cash-on-Cash / Cash flow) and a
  `NumberField` "At least" (suffix "%" or currency), test ids `target-measure`, `target-value`.
  The first time a scenario has no saved target, the measure starts as the grid's measure.
- Result (`data-testid="max-offer"`):
  - found: a large "Max allowable offer $231,500" (`data-testid="max-offer-price"`), the line "$18,500
    below your price of $250,000 (−7.4%)" or "$X above …", then two small rows: "At the offer:
    {measure value}" and "At your price: {measure value}".
  - found and `currentMeets`: the extra line "Your price already meets this target." (the offer is
    still shown, as the highest price that does).
  - Button "Use this price" (primary), `data-testid="use-max-offer"`; hidden when the offer equals
    the current price.
  - unreachable: the result's reason, in the `bad` tone with "✕" and text; no number.
  
  - invalid: the inline error under the target field, no result.
- The "Use this price" button calls `editDeal('homePrice', price, 'page')`.

## Accessibility

- All controls reachable and operable by keyboard; the grid per research R9.
- axe: zero violations in light and dark with the grid, the legend and a result showing.
- No meaning by color alone (FR-006); contrast per spec 010 FR-035.
