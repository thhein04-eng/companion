# Contract: UI (spec 011)

Visual treatments come from spec 010 `contracts/design-system.md`. Test ids are kept unless
stated.

## DealStrip → deal card (US1; see research R2b, superseding the bar below)

> Current: a sticky card above `PageHeader` in the content column. Header: "Your deal" eyebrow
> + tabs (left), error count + primary Edit deal (right); divider; `DealValue` grid (fixed order,
> 2/3/6 cols); monthly payment row; missing-input hints. The bar description below is historical.

### Previous: deal bar

- Rendered **first** in every view, before `PageHeader` (R1).
- `<section aria-label="Deal" data-testid="deal-strip">` uses `col-[full] sticky top-14 lg:top-0
  z-20 bg-sunk border-b border-line`, and an inner `div` aligned to the content column.
- Inner grid (R2), in DOM order:
  - row 1: `<Eyebrow>Deal</Eyebrow>` + `ScenarioTabs`;
  - actions: `[data-testid="deal-error-count"]` (when there are errors) and
    `<Button variant="primary" size="md">` (`PencilIcon` + "Edit deal"). On phones they sit at the
    end of row 1; from `sm` up they sit in `col-start-2 row-span-2`, `self-center`;
  - row 2: the chips.
- `main` (layout.tsx) becomes the full-bleed grid with `row-gap: var(--space-page)` and `pb-10`.
  Its top padding is removed so the bar touches the top. `PageHeader` gets no extra margin; the row
  gap spaces it.

## SegmentedControl (shared-ui/ds, R3)

```ts
SegmentedControl<T extends string>({ label: string; showLabel?: boolean; value: T | null;
  options: readonly { value: T; label: string }[]; onValueChange(v: T): void; 'data-testid'?: string })
```

Behavior comes from ui-sdk `SegmentedControl`. Styling is the current `SegmentedOptions` look.
deal-analyzer-ui keeps exporting `SegmentedOptions` as an alias.

## ExtraPaymentPanel (US2)

- `Card` → form row: Type (`SegmentedControl`, "Recurring" / "One-time"), Amount (`NumberField`
  "Amount"), When ("Date" `DateField`, or the recurring text), Add (`Button` primary "Add").
- The list is `<ul aria-label="Extra payments">`. Each item has `[data-testid="extra-payment-row"]`,
  a `Badge`, the amount, the timing, and `Button` ghost "Remove", named "Remove extra payment of
  {currency}".
- The empty state is `<p data-testid="extra-payments-empty">`.

## MetricCard (US3, deal-analyzer-ui)

```ts
MetricCard({ label; info: string; value: string; status: 'pass' | 'fail' | 'na' | 'info';
  statusText?: string; explanation: string; 'data-testid': string; rippleValue?: number | null })
```

`DealMetrics` renders 3 cards in `grid grid-cols-1 sm:grid-cols-3 items-stretch`, with test ids
`cap-rate`, `rule-one-percent` and `rule-fifty-percent`. These ids are kept or added; check the
existing e2e for the names they already use.

## DateField (US4, shared-ui)

Same props as today (`label`, `value: ISO | null`, `onValueChange`, `description?`, `error?`). It
adds the calendar trigger `aria-label="Choose date"` and a popup calendar (R5).
