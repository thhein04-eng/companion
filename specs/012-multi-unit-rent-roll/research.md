# Research: Multi-Unit Rent Roll, House-Hacking and Utility Split (RUBS)

No `NEEDS CLARIFICATION` items were left in the Technical Context. These are the design decisions.

## R1. Storing the rent roll next to `grossMonthlyRent`

- **Decision**: Add optional `rental.units: RentUnit[]`. `normalizeUnits(rental)` returns `units`
  when present, otherwise one implicit unit `{ id: 'a', name: 'Unit A', rent: grossMonthlyRent }`.
  Every write through `useRentalEditor` sets `grossMonthlyRent = Σ unit rent after move-out`.
- **Rationale**: Existing sessions need no migration and give identical results (SC-001). The 1%
  and 50% rules (FR-015) and the deal fields keep reading one number that already means "full
  rent". Validation, sentence and chip code keep working while the readers are converted.
- **Alternatives**: Replace `grossMonthlyRent` outright with a load-time migration. Rejected: it
  touches every reader and stored session at once and makes the golden comparison harder.

## R2. One `IncomeBasis` for every calculation

- **Decision**: `rentRollIncome(rental, view)` returns
  `{ rentMonthly, otherMonthly, pctBaseMonthly, vacancyMonthly, reimbursementMonthly, units[] }`
  where `pctBaseMonthly = rentMonthly + otherMonthly` (the base for management, maintenance and
  CapEx), `vacancyMonthly = Σ unit rent × unit rate + other × overall rate`, and
  `reimbursementMonthly` per R3. `rentalLineItems` takes it instead of a bare GSI number.
  Growth is applied by scaling: rent-side fields × rent factor, reimbursements × expense factor.
- **Rationale**: With no units and no overrides, `vacancyMonthly = (rent + other) × rate`, exactly
  today's line, so equivalence is algebraic and easy to test. One function keeps the year-1
  snapshot and the projections consistent (as `operatingYear` already does for growth).
- **Alternatives**: Compute per-unit vacancy inside `rentalLineItems`. Rejected: projections and
  RUBS both need the per-unit occupancy too.

## R3. RUBS reimbursement formula

- **Decision**: For each RUBS expense, `reimbursement = amount × recovery% × Σ_paying units
  (1/N) × (1 − unitVacancy)`, where N is the total unit count and paying units are units with
  rent > 0 in the current view (so the owner's unit while living there and $0 units pay nothing).
  Reimbursements are an income line after vacancy, not part of the percentage base (FR-019,
  FR-020), and grow with the expense growth rate (FR-021).
- **Rationale**: Equal-per-unit is the simplest RUBS allocation and matches the spec's
  assumption. Excluding non-paying units means the landlord bears the owner's and empty units'
  shares, which is how RUBS works in practice.
- **Alternatives**: Allocate by bedrooms or occupants. Deferred (Assumptions); the recovery rate
  approximates it.

## R4. Where the "Living there / After move-out" choice lives

- **Decision**: `rental.occupancyView?: 'living' | 'afterMoveOut'` (missing = 'living'), edited
  through `useRentalEditor` with `recordUndo: false` so it doesn't create undo entries or change
  toasts. `analyzeDeal(scenario, schedule, { view })` defaults to the stored view.
- **Rationale**: The spec requires the switch to be shared by the deal card, Deal Analyzer and DSCR
  pages for that scenario (FR-013), and stored per scenario like `financingSelection` already is.
- **Alternatives**: React context or URL state. Rejected: not per scenario, and lost on reload.

## R5. Move-out in projections

- **Decision**: `operatingYear(scenario, year)` uses view `'living'` when an owner unit exists and
  `year ≤ moveOutYears`, else `'afterMoveOut'`. The post-move-out rent is grown from year 1
  (rent factor `(1+g)^(year−1)`), so it's comparable to the other units. `projectWealth` and
  `projectExit` return `moveOutYear: number | null` for the chart/table marker.
- **Rationale**: Projections are yearly; whole-year move-out matches the spec assumption.
- **Alternatives**: Month-level switch inside a year. Rejected as false precision.

## R6. UI components

- **Decision**:
  - `RentRollEditor` (shared-ui): a list of unit rows (name, bd, ba, rent `NumberField`, an
    optional "Vacancy" `NumberField` with placeholder "Uses 5%", an "I live here" ui-sdk checkbox
    that reveals "Rent after move-out" and, once, "Move out after N years"), "+ Add unit"
    (disabled at 4 with the note), a ghost Remove per row (hidden at 1 unit), and a total row.
    Rows stack on phones (SC-007).
  - Custom-expense rows get a `SegmentedControl` "Paid by" (Landlord / Tenants (RUBS)) and, for
    RUBS, a "Recovered" % field.
  - `OccupancyViewSwitch` (shared-ui): `SegmentedControl` "Living there / After move-out",
    rendered in the deal card's header row and above the Deal Analyzer / DSCR results.
  - The deal card's Rent cell shows "$2,750 · 2 units" and, with 2+ units or an owner unit, opens
    the Edit deal sheet focused on the rent roll instead of the single-number popover.
- **Rationale**: Reuses the ds parts and ui-sdk primitives (Constitution IV); the sheet is already
  the place for structured editing (spec 010).

## R7. Validation keys and errors

- **Decision**: Unit errors use keys `rental.units.<index>.name|rent|vacancyPct|rentAfterMoveOut`,
  RUBS errors `rental.customExpenses.<index>.recoveryPct`, plus `rental.moveOutYears`.
  `dealErrors` maps any `rental.units.*` key to the Rent field for the error count and focus.
- **Rationale**: Matches the existing `rental.*` key scheme so the error count and "fix" focus
  work unchanged.
