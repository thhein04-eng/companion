# Feature Specification: Multi-Unit Rent Roll, House-Hacking and Utility Split (RUBS)

**Feature Branch**: `012-multi-unit-rent-roll`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Multi-Unit & House-Hacking Support. Many residential investors start with duplexes, triplexes, or fourplexes (or live in one unit while renting out the rest). (1) Unit-by-Unit Rent Roll: Replace the single grossMonthlyRent input with a dynamic list of units (e.g., Unit A: 2bd/1ba @ $1,350/mo, Unit B: 2bd/1ba @ $1,400/mo) so investors can model different lease rates, unit-specific vacancies, or owner-occupied units ($0 rent while living there, plus 'post-move-out' projected cash flow). (2) Utility Split Modeling: Allow tagging custom expenses as 'Landlord-Paid' vs. 'Tenant-Reimbursed (RUBS)' so ratio utility billing systems are accurately reflected in net income."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enter rent unit by unit (Priority: P1)

An investor analyzing a duplex, triplex or fourplex enters each unit separately (a name, bedrooms,
bathrooms and monthly rent) instead of one total rent. The deal's rent is the sum of the units, and
every page that uses rent (Deal Analyzer, DSCR & Financing, Wealth Projection, Hold & Exit, and the
deal card) uses that total. A single-family deal is simply a one-unit rent roll, so nothing changes
for investors who don't need units.

**Why this priority**: Every other part of this feature (vacancy per unit, the owner's unit, utility
reimbursements split across units) builds on the rent roll. On its own it already lets an investor
model a small multifamily with different lease rates.

**Independent Test**: Open the Edit deal sheet, add a second unit (Unit A $1,350, Unit B $1,400),
and confirm the deal's rent reads $2,750/mo with "2 units", and that cash flow, cap rate and DSCR
match the same deal entered before as a single $2,750 rent.

**Acceptance Scenarios**:

1. **Given** a deal with one rent of $2,750, **When** the investor opens the rent roll, **Then**
   it shows one unit ("Unit A") at $2,750, and every result is unchanged.
2. **Given** a one-unit rent roll, **When** the investor adds Unit B (2bd/1ba, $1,400) and sets
   Unit A to $1,350, **Then** the deal's rent is $2,750/mo and the deal card shows "$2,750 · 2 units".
3. **Given** a rent roll of 3 units, **When** the investor removes one, **Then** the totals and all
   results update immediately, and undo restores it (spec 010 single-level undo).
4. **Given** 4 units, **When** the investor tries to add a fifth, **Then** adding is unavailable
   and a short note says the rent roll covers 1–4 unit residential properties.
5. **Given** a rent roll, **When** the investor reloads the page in the same session or switches
   scenarios and back, **Then** the units are kept for that scenario.

---

### User Story 2 - Vacancy per unit (Priority: P2)

Units don't always share the same vacancy. An investor sets a vacancy rate for a specific unit
(e.g., the basement unit turns over more often) while the rest use the deal's overall vacancy rate.

**Why this priority**: It makes the rent roll more accurate with a small addition, and it is
needed to apply vacancy correctly to an owner-occupied unit and to utility reimbursements.

**Independent Test**: With Unit A $1,350 and Unit B $1,400 and a 5% overall vacancy, set Unit B's
vacancy to 10% and confirm the vacancy loss is $67.50 + $140.00 = $207.50/mo.

**Acceptance Scenarios**:

1. **Given** units with no vacancy of their own, **When** results compute, **Then** each unit uses
   the deal's overall vacancy rate, and results match today's single-rent calculation.
2. **Given** Unit B set to 10% and the overall rate 5%, **When** results compute, **Then** the
   vacancy line equals the sum of each unit's rent × its own rate, and the breakdown shows each
   unit's share.
3. **Given** a unit's vacancy is cleared, **When** results compute, **Then** that unit goes back to
   the overall rate.

---

### User Story 3 - House-hacking: living in one unit (Priority: P2)

An investor plans to live in one unit and rent the others. They mark their unit as
owner-occupied and enter the rent it would get once they move out. While they live there, the unit
brings in no rent, and the app shows what their housing actually costs them each month. They can
switch to "After move-out" to see the deal as a full rental, and the multi-year projections switch
from living there to renting it out at the move-out time they set.

**Why this priority**: House-hacking is the most common way new investors buy their first
2–4 unit property, and the "what does it cost me to live here" number is the decision they're
making. It depends on the rent roll (US1).

**Independent Test**: Mark Unit A owner-occupied with a post-move-out rent of $1,350. In "Living
there", rent is $1,400/mo and the app shows a monthly net housing cost. In "After move-out", rent
is $2,750/mo and the results match the same deal with both units rented.

**Acceptance Scenarios**:

1. **Given** a 2-unit deal, **When** the investor marks Unit A as "I live here", **Then** Unit A's
   rent reads $0 while living there, a "Rent after move-out" value is asked for, and only one unit
   can be marked at a time.
2. **Given** an owner-occupied unit, **When** the investor views the Deal Analyzer, DSCR &
   Financing or the deal card, **Then** a two-option view switch reads "Living there" and "After
   move-out", starting on "Living there", and every snapshot result reflects the chosen view.
3. **Given** "Living there", **When** results compute, **Then** the page shows **Net housing
   cost** = the monthly outflow (mortgage payment + operating expenses − rent and reimbursements
   collected from the other units). A positive cash flow instead reads "You live for free and
   net $X/mo".
4. **Given** an owner-occupied unit with a move-out after 1 year (the default), **When** the
   Wealth Projection or Hold & Exit computes, **Then** year 1 uses the "Living there" income and
   years 2 onward use the "After move-out" income (growing with rent growth from year 1), and the
   year the switch happens is marked on the charts and tables.
5. **Given** the owner-occupied flag is removed, **When** results compute, **Then** the unit uses
   its post-move-out rent as its rent and the view switch disappears.
6. **Given** "Living there", **When** the 1% Rule and 50% Rule cards compute, **Then** they use the
   full rent roll (the owner's unit at its post-move-out rent), and say so, because they judge the
   property, not the owner's living situation.

---

### User Story 4 - Tag utilities as landlord-paid or tenant-reimbursed (RUBS) (Priority: P3)

An investor who bills tenants back for utilities with a ratio utility billing system (RUBS) tags a
custom expense (e.g., "Water/Sewer $180/mo") as "Tenant-reimbursed (RUBS)". The expense stays in
operating expenses, and the share the tenants pay back appears as income, so net operating income
reflects the true cost to the landlord.

**Why this priority**: It refines net income for a common multifamily practice but isn't needed to
model the rent roll or house-hacking.

**Independent Test**: On a 2-unit deal with both units rented and 0% vacancy, tag "Water/Sewer
$180" as RUBS with 100% recovery. The expense line stays $180, a "Utility reimbursements (RUBS)"
income line reads $180, and NOI rises by $180 compared with landlord-paid.

**Acceptance Scenarios**:

1. **Given** a custom expense, **When** it's created or loaded from an older session, **Then** it
   is "Landlord-paid", and results are unchanged from today.
2. **Given** an expense tagged RUBS with a recovery rate (default 100%), **When** results compute,
   **Then** reimbursement = amount × recovery rate × the share of units that are rented
   (split equally per unit), reduced by each rented unit's vacancy, and it shows as its own income
   line.
3. **Given** "Living there" with Unit A owner-occupied, **When** reimbursement computes, **Then**
   Unit A's share is not reimbursed (the owner pays it), so a 2-unit $180 bill reimburses $90.
4. **Given** RUBS expenses, **When** management, maintenance and CapEx percentages compute,
   **Then** they stay a percentage of rent plus other income and don't include reimbursements.
5. **Given** RUBS expenses and expense growth, **When** multi-year projections compute, **Then**
   reimbursements grow with the expense they recover.

---

### Edge Cases

- **A unit at $0 rent that isn't owner-occupied** (e.g., a model unit or one being renovated) is
  allowed. It counts toward the unit count and RUBS split and brings in no rent.
- **The only unit is owner-occupied** (living in a single-family home before converting it): rent
  while living there is $0, and the view switch and net housing cost still apply.
- **Unit vacancy 100%** is allowed and means the unit brings in no rent or reimbursement.
- **Owner-occupied unit with no post-move-out rent**: "After move-out" treats it as $0 and shows a
  missing-input hint ("+ Add rent after move-out").
- **Move-out year beyond the projection horizon**: projections stay in "Living there" for every
  year shown, and the chart notes that the move-out falls after the horizon.
- **RUBS recovery rate**: limited to 0–100%. A RUBS expense of $0 adds no reimbursement.
- **Removing a unit that holds the owner-occupied flag** removes the flag and the view switch.
- **Other income** (laundry, parking) stays a property-level amount, not per unit.
- **Comparing scenarios**: each scenario has its own rent roll, so comparing a duplex with a
  single-family scenario works as today.
- **Deal card space**: the "Rent" value shows the total and "· N units" only when there are 2 or
  more units, and "Living there" totals when an owner unit exists.

## Requirements _(mandatory)_

### Functional Requirements

**Rent roll (US1)**

- **FR-001**: Each scenario MUST have a rent roll of 1 to 4 units. Each unit has a name (default
  "Unit A", "Unit B", …, editable, up to 40 characters), bedrooms (0–10, optional), bathrooms
  (0–10 in steps of 0.5, optional) and monthly rent (≥ $0).
- **FR-002**: The deal's gross monthly rent MUST equal the sum of the units' rents (with any
  owner-occupied unit counted per FR-012). Every calculation that used the single rent MUST use
  this total, with no other change to results.
- **FR-003**: An existing scenario with a single rent MUST open as a one-unit rent roll ("Unit A"
  at that rent), with identical results. A new scenario starts with one empty unit.
- **FR-004**: Investors MUST be able to add a unit (up to 4), remove a unit (down to 1) and edit
  every unit field in the Edit deal sheet. Removing a unit MUST be undoable (spec 010 undo).
- **FR-005**: The deal card's "Rent" value MUST show the total rent, plus "· N units" when there
  are 2 or more units. Selecting it opens the rent roll editor.
- **FR-006**: The rent roll MUST be saved with the scenario for the browser session, like other
  deal inputs (Constitution III).
- **FR-007**: The rent roll MUST be validated: a negative rent, more than 4 units or an empty name
  shows an inline error on that unit, and the deal's error count includes it.

**Vacancy per unit (US2)**

- **FR-008**: Each unit MAY have its own vacancy rate (0–100%). A unit without one MUST use the
  deal's overall vacancy rate.
- **FR-009**: The vacancy loss MUST equal the sum over rented units of the unit's rent × its
  vacancy rate. When no unit has its own rate, this MUST equal today's result. Other income MUST
  keep using the overall rate.
- **FR-010**: The income breakdown MUST list each unit's rent and vacancy share when there are 2 or
  more units.

**House-hacking (US3)**

- **FR-011**: At most one unit MAY be marked owner-occupied ("I live here"). An owner-occupied unit
  MUST have a "rent after move-out" (≥ $0) and the scenario MUST have a move-out time in whole
  years (1–30, default 1).
- **FR-012**: When a unit is owner-occupied, the deal MUST have two income views: **Living there**
  (that unit's rent is $0, its vacancy doesn't apply) and **After move-out** (the unit earns its
  post-move-out rent with its vacancy rate).
- **FR-013**: The Deal Analyzer, DSCR & Financing and the deal card MUST show a "Living there /
  After move-out" switch when a unit is owner-occupied, defaulting to "Living there", shared across
  those pages for the scenario. Every snapshot result (cash flow, NOI, cap rate, cash-on-cash,
  DSCR) MUST use the chosen view.
- **FR-014**: In "Living there", the Deal Analyzer MUST show **Net housing cost**: the monthly
  mortgage payment plus operating expenses, minus the rent, other income and reimbursements
  collected. If that's zero or less, it MUST read "You live for free and net $X/mo".
- **FR-015**: The 1% Rule and 50% Rule MUST always use the full rent roll with the owner's unit at
  its post-move-out rent, and say "Based on full rent after move-out" when a unit is
  owner-occupied.
- **FR-016**: The Wealth Projection and Hold & Exit MUST use "Living there" income for the years
  before the move-out time and "After move-out" income from then on, with the post-move-out rent
  growing at the rent growth rate from year 1. The move-out year MUST be marked on their charts
  and tables.

**Utility split / RUBS (US4)**

- **FR-017**: Each custom expense MUST have a "Paid by" setting: **Landlord-paid** (default; today's
  behavior) or **Tenant-reimbursed (RUBS)** with a recovery rate (0–100%, default 100%).
- **FR-018**: For each RUBS expense, the monthly reimbursement MUST equal amount × recovery rate ×
  Σ over rent-paying units of (1 ÷ number of units) × (1 − that unit's vacancy rate). The owner's
  unit while living there and $0-rent units pay no share.
- **FR-019**: Reimbursements MUST appear as one income line, "Utility reimbursements (RUBS)", in
  the income breakdown, added to effective gross income after vacancy. The expense itself MUST stay
  in operating expenses at its full amount.
- **FR-020**: Management, maintenance and CapEx percentages MUST remain a percentage of rent plus
  other income, not including reimbursements.
- **FR-021**: In multi-year projections, reimbursements MUST grow at the expense growth rate (the
  same as the expense they recover).

**All stories**

- **FR-022**: All new controls (the unit list, the owner-occupied toggle, the view switch, "Paid
  by") MUST follow the spec 010/011 design system and be fully usable by keyboard and screen
  reader, and the pages MUST keep passing the automated accessibility scan in light and dark.
- **FR-023**: Every new calculation (rent roll total, per-unit vacancy, both house-hacking views,
  net housing cost, RUBS reimbursement, the move-out switch in projections) MUST have unit tests,
  including a check that a one-unit rent roll with no RUBS gives exactly today's results
  (Constitution I).

### Key Entities

- **Unit**: One rentable unit in a scenario's rent roll. Name, bedrooms, bathrooms, monthly rent,
  optional vacancy rate, owner-occupied flag, and (when owner-occupied) rent after move-out.
- **Rent roll**: The ordered list of 1–4 units of a scenario. Replaces the single gross monthly
  rent; its total is the deal's rent.
- **House-hacking plan**: Present when a unit is owner-occupied: the move-out time (years) and the
  current view (Living there or After move-out).
- **Custom expense** (existing, extended): label and monthly amount, plus "Paid by"
  (Landlord-paid or Tenant-reimbursed (RUBS)) and, for RUBS, a recovery rate.
- **Utility reimbursement** (derived): the monthly income recovered from tenants for RUBS
  expenses.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every saved scenario from before this feature opens with identical results (every
  displayed figure matches to the cent), with its rent shown as one unit.
- **SC-002**: An investor can enter a 4-unit rent roll with different rents in under 2 minutes,
  using only the Edit deal sheet.
- **SC-003**: For the duplex example (Unit A $1,350, Unit B $1,400), the total rent, vacancy loss,
  NOI and cash flow match a hand calculation to the cent, in both house-hacking views.
- **SC-004**: With an owner-occupied unit, an investor can find their monthly net housing cost
  and switch to the after-move-out view in 2 actions or fewer from the Deal Analyzer.
- **SC-005**: For a RUBS expense, the reimbursement and NOI match the FR-018 formula to the cent for
  the 2-unit examples in US4 (both units rented, and living in one).
- **SC-006**: The rent roll, view switch and "Paid by" controls have zero automated accessibility
  violations in light and dark themes, and every one can be operated by keyboard alone.
- **SC-007**: No page scrolls sideways at 390px wide with a 4-unit rent roll open.

## Assumptions

- **1–4 units**: The app targets residential (1–4 unit) properties, where residential financing
  applies. 5+ unit (commercial) properties are out of scope.
- **Owner-occupied financing** (FHA, VA, lower down payments for owner-occupants) is out of scope.
  The loan inputs stay as entered.
- **Move-out timing** is in whole years from purchase (default 1, a common owner-occupancy
  requirement). Monthly precision isn't needed because projections are yearly.
- **RUBS split**: Costs are split equally per unit. Splitting by bedrooms, occupants or square
  footage is out of scope, but the recovery rate lets investors approximate a smaller share.
- **Tenant-paid utilities** (billed directly to tenants) need no tag: the investor leaves them out
  of expenses, as today.
- **Net housing cost** includes the mortgage payment (principal and interest, plus escrowed tax,
  insurance, PMI and HOA from the deal) and operating expenses, and doesn't net out principal
  paydown or appreciation (the Wealth Projection covers those).
- **Other income** (laundry, parking) stays property-level and isn't split per unit.
- **Data storage** stays in the browser session, like all deal inputs (Constitution III).
