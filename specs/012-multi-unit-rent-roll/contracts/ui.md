# Contract: UI components

## `RentRollEditor` (shared-ui)

```ts
interface RentRollEditorProps {
  rental: RentalAssumptions;
  errors: FieldError[];                 // rental.units.* and rental.moveOutYears
  onChange: (patch: RentRollPatch) => void;  // via useRentalEditor
}
```

- `data-testid="rent-roll"`; each row `data-testid="rent-unit"` with an accessible group name
  "{unit name}".
- Fields per row: Name, Beds, Baths, Rent (or "Rent after move-out" when owner-occupied, with
  "Rent while you live here: $0" shown read-only), Vacancy (placeholder "Uses {v}%"),
  "I live here" checkbox. Remove button `aria-label="Remove {unit name}"` (not shown at 1 unit).
- "+ Add unit" button; disabled at 4 with the visible note "Rent rolls cover 1–4 unit homes".
- "Move out after [N] years" field shown once when a unit is owner-occupied.
- A total row: "Total rent $X/mo" (and "while living there $Y/mo" with an owner unit).
- Phone: rows stack; no horizontal scroll at 360px.

## Custom expense row (in `RentalInputsPanel`)

- Adds `SegmentedControl label="Paid by"` with options Landlord / Tenants (RUBS) and, for RUBS,
  a `NumberField "Recovered"` (%, default 100).

## `OccupancyViewSwitch` (shared-ui)

- ui-sdk `SegmentedControl`, label "Income view", options "Living there" / "After move-out",
  `data-testid="occupancy-view"`. Rendered only when `hasOwnerUnit`. Writes
  `rental.occupancyView` without undo or toast.
- Placement: deal card header row (before the actions) and the top of the Deal Analyzer and
  DSCR & Financing result sections.

## Deal card / Deal Analyzer changes

- Rent cell (`data-chip="rental.grossMonthlyRent"`): value "{total} · {N} units" when N ≥ 2. With
  N ≥ 2 or an owner unit it opens the Edit deal sheet focused on `rent-roll`.
- Income & expenses card: one row per unit when N ≥ 2, a "Utility reimbursements (RUBS)" income
  row when > 0, the vacancy row as the per-unit sum.
- Metrics: a "Net housing cost" `MetricCard` (`data-testid="net-housing-cost"`) in the living view;
  the 1% / 50% cards' explanation adds "Based on full rent after move-out" with an owner unit.
- Wealth and Hold & Exit: a "Move out" marker (`data-testid="move-out-marker"`) on the move-out
  year in the chart and table; a note when it falls beyond the horizon.
