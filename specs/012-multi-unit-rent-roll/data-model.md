# Data Model: Multi-Unit Rent Roll, House-Hacking and Utility Split (RUBS)

All amounts are monthly dollars, unrounded in calculations and rounded to cents for display
(existing rounding rules). All new fields are optional on stored data; missing values take the
defaults below, so existing sessions load unchanged.

## A. `RentUnit` (new; `RentalAssumptions.units[]`)

| Field | Type | Rule | Default |
|---|---|---|---|
| `id` | string | unique within the rent roll | generated |
| `name` | string | 1–40 chars, trimmed | "Unit A", "Unit B", … by position |
| `bedrooms` | number \| null | integer 0–10 | null |
| `bathrooms` | number \| null | 0–10, step 0.5 | null |
| `rent` | number | ≥ 0. Ignored while living there if owner-occupied | 0 |
| `vacancyPct` | number \| null | 0–100; null = use `rental.vacancyPct` | null |
| `ownerOccupied` | boolean | at most one unit true | false |
| `rentAfterMoveOut` | number \| null | ≥ 0; only meaningful when owner-occupied; null = $0 with a missing hint | null |

For an owner-occupied unit, `rent` is not used; its "after move-out" rent is `rentAfterMoveOut`.

## B. `RentalAssumptions` (extended)

| Field | Change |
|---|---|
| `units?: RentUnit[]` | new; 1–4 entries. Missing = one implicit unit at `grossMonthlyRent` |
| `grossMonthlyRent` | kept; always = after-move-out rent-roll total (see §E) |
| `moveOutYears?: number` | new; integer 1–30; default 1; used only with an owner unit |
| `occupancyView?: 'living' \| 'afterMoveOut'` | new; default 'living'; ignored without an owner unit |
| `vacancyPct` | meaning unchanged: overall rate, used by units without their own and by other income |

## C. `CustomExpenseItem` (extended)

| Field | Type | Rule | Default |
|---|---|---|---|
| `paidBy?` | 'landlord' \| 'rubs' | — | 'landlord' |
| `recoveryPct?` | number | 0–100; used only for 'rubs' | 100 |

## D. `IncomeBasis` (derived; `rentRollIncome(rental, view)`)

Let `units = normalizeUnits(rental)`, `N = units.length`, `v = rental.vacancyPct`.
For each unit in `view`:

- `effectiveRent = ownerOccupied ? (view === 'living' ? 0 : rentAfterMoveOut ?? 0) : rent`
- `rate = (ownerOccupied && view === 'living') ? 0 : (vacancyPct ?? v)`
- `paying = effectiveRent > 0`

Then:

- `rentMonthly = Σ effectiveRent`
- `otherMonthly = rental.otherMonthlyIncome`
- `pctBaseMonthly = rentMonthly + otherMonthly` (management, maintenance, CapEx)
- `vacancyMonthly = Σ effectiveRent × rate/100 + otherMonthly × v/100`, computed by grouping
  units by rate so units at the overall rate use `(Σ rent + other) × v/100` in one multiplication
  (exact rounding parity with the old single rent)
- `reimbursementMonthly = Σ_rubs expense.amount × recoveryPct/100 × Σ_paying (1/N) × (1 − rate/100)`
- `units[]`: per-unit `{ id, name, effectiveRent, rate, vacancyMonthly }` for the breakdown (FR-010)

**Equivalence**: with one implicit unit, no overrides and no RUBS: `rentMonthly = grossMonthlyRent`,
`vacancyMonthly = (grossMonthlyRent + other) × v/100`, `reimbursementMonthly = 0`, i.e. today's
figures.

**Projections (year Y)**: view = owner unit && Y ≤ moveOutYears ? 'living' : 'afterMoveOut';
rent-side fields × `(1+rentGrowth)^(Y−1)`, `reimbursementMonthly` × `(1+expenseGrowth)^(Y−1)`.

## E. Derived and display values

- `rentRollTotal(rental) = Σ after-move-out rents` → written to `grossMonthlyRent` on every rent
  roll edit; used by the 1% and 50% rules (FR-015).
- NOI = `pctBaseMonthly + reimbursementMonthly − (fixed lines + vacancyMonthly + % lines)`.
- `netHousingCost` (living view with an owner unit only) = `−monthlyCashFlow`; when ≤ 0 the UI
  reads "You live for free and net $X/mo" with X = cash flow.
- Deal card Rent label: `formatRentWithUnits(rental, view)`: the rent in `view` + " · N units" when N ≥ 2.

## F. Validation (`validateRental`, keys per research R7)

| Key | Error |
|---|---|
| `rental.units` | "Add at least one unit" (0 units) / "Up to 4 units" (> 4) |
| `rental.units.<i>.name` | "Enter a unit name" (empty after trim) / "40 characters max" |
| `rental.units.<i>.rent` | "Rent can't be negative" |
| `rental.units.<i>.vacancyPct` | "Use 0–100%" |
| `rental.units.<i>.rentAfterMoveOut` | "Rent can't be negative" |
| `rental.units` (owner) | "Only one unit can be yours" (> 1 owner-occupied) |
| `rental.moveOutYears` | "Use 1–30 years" |
| `rental.customExpenses.<i>.recoveryPct` | "Use 0–100%" |

## G. State transitions

- Mark a unit owner-occupied → `rentAfterMoveOut` prefilled with that unit's current `rent`;
  `occupancyView` set to 'living'; any other owner flag cleared.
- Unmark → `rent = rentAfterMoveOut ?? rent`; `rentAfterMoveOut` cleared.
- Remove the owner unit → owner state gone; switch hidden.
- Remove the last-but-one unit → 1 unit; "· N units" label hidden.
