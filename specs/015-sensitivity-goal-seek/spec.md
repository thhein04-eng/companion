# Feature Specification: Sensitivity Matrix and Max Allowable Offer

**Feature Branch**: `015-sensitivity-goal-seek`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "New page and route. Sensitivity Matrix & 'Reverse' Goal Seek. Investors rarely trust a single point estimate—they stress-test deals against worst-case scenarios. (1) 2D Sensitivity Heatmap: a compact grid showing how Cash-on-Cash Return or Monthly Cash Flow shifts across combinations of Interest Rates (rows: e.g., 5.5% to 7.5%) and Purchase Prices or Rents (columns: -10% to +10%). (2) Max Allowable Offer (MAO) Solver: let the investor set a target metric (e.g., 'I need at least an 8% Cash-on-Cash return' or 'At least $300/mo net cash flow') and automatically back-solve for the highest purchase price they can offer."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Stress-test a deal on a rate × price/rent grid (Priority: P1)

An investor with a rental deal in the shared deal card opens a new page, **Sensitivity**, and sees one
compact grid. Rows are interest rates around the deal's own rate (for a 6.5% deal: 5.5%, 6.0%, 6.5%,
7.0%, 7.5%). Columns are changes to the purchase price or to the rent (−10%, −5%, 0%, +5%, +10%).
Each cell shows the deal's **Cash-on-Cash Return** or **Monthly Cash Flow** for that combination.
The cell for the deal as entered is marked, so it's obvious where today's numbers sit, and the
cells that are negative or below the investor's own target are easy to spot without relying on color.

**Why this priority**: This is the stress test: it shows how far a deal can move before it stops
working, which is the question a single point estimate can't answer. It's useful on its own, with
no target needed.

**Independent Test**: With the reference deal ($250,000 price, 25% down, 7% rate, $2,400 rent) the
middle cell reads exactly what the Deal Analyzer shows ($250.56/mo cash flow); a higher rate or
price makes the cells worse and a higher rent makes them better, in every row and column.

**Acceptance Scenarios**:

1. **Given** a rental deal with a price, down payment, rate and rent, **When** the investor opens
   the Sensitivity page, **Then** a 5 × 5 grid appears with the deal's own rate in the middle row (except near 0%, see Edge Cases), 0% in the middle column, and the center cell marked "Current deal".
2. **Given** the grid, **When** the investor switches the measure between "Cash-on-Cash" and
   "Monthly cash flow", **Then** every cell updates, and the center cell matches the Deal
   Analyzer's figure for that measure to the cent (to 0.01 percentage points for Cash-on-Cash).
3. **Given** the grid, **When** the investor switches the column variable between "Purchase
   price" and "Rent", **Then** the column headers show both the percentage and the resulting
   dollar amount (e.g., "−10% · $225,000" or "+5% · $2,520/mo"), and the cells update.
4. **Given** the grid, **When** the investor changes the step size (rate step 0.25%, 0.5% or 1%;
   column step 2.5%, 5% or 10%), **Then** the row and column ranges widen or narrow around the
   current deal, and the center cell stays the current deal.
5. **Given** cells with a negative result, or below the target the investor set (US2), **When**
   the grid shows them, **Then** they carry both a color and a text or symbol cue (for example a
   minus sign or a "below target" marker), so the meaning doesn't depend on color alone.
6. **Given** a phone-width screen (390px), **When** the grid shows, **Then** it fits without the
   page scrolling sideways (the grid may scroll inside its own region), and the row and column
   headers stay visible.
7. **Given** the grid, **When** the investor edits the deal in the Edit deal sheet or the deal
   card (rate, price, rent, anything), **Then** the grid recalculates immediately.

---

### User Story 2 - Find the Max Allowable Offer (Priority: P1)

The investor sets a **target** (for example "at least 8% Cash-on-Cash Return" or "at least $300/mo
net cash flow") and the page works backwards to the **highest purchase price** that still meets
it, holding the deal's rate, down payment percentage, rent and costs as entered. The result shows the
**Max Allowable Offer**, how it compares to the price in the deal ("$18,400 below your price"),
and the figure the deal produces at that offer, so the answer can be checked.

**Why this priority**: This answers the investor's real question, "what should I offer?", and is
the second half of the request. It doesn't depend on the grid.

**Independent Test**: With the reference deal and a target of $300/mo cash flow, the page shows a
Max Allowable Offer. Entering that exact price as the home price in the deal gives a cash flow of at
least $300/mo, and a price $1 higher gives less than $300/mo.

**Acceptance Scenarios**:

1. **Given** a rental deal, **When** the investor chooses "Cash-on-Cash Return" and enters 8%,
   **Then** the page shows the highest purchase price (in whole dollars) whose Cash-on-Cash Return
   is at least 8%.
2. **Given** the same deal, **When** the investor chooses "Monthly cash flow" and enters $300,
   **Then** the page shows the highest purchase price whose monthly cash flow is at least $300.
3. **Given** a result, **When** it shows, **Then** it also shows the difference from the deal's
   current price (above or below), the measure at the Max Allowable Offer, and the measure at the
   current price, so the investor sees how far apart the deal is from the target.
4. **Given** a deal that already meets the target at its current price, **When** the result shows,
   **Then** the page says so ("Your price already meets this target") and still shows the higher
   price the target would allow.
5. **Given** a target no price can reach (for example, the rent can't cover costs even for a
   very low price), **When** the investor sets it, **Then** the page says no price reaches that
   target for this rent and rate, and says what would help (a higher rent or a lower rate),
   instead of showing a meaningless number.
6. **Given** a Max Allowable Offer, **When** the investor selects "Use this price", **Then** the
   deal's home price is set to it (an undoable change, like every deal edit).
7. **Given** a target set here, **When** the investor looks at the grid (US1), **Then** the cells
   below that same target are marked, and the cell for the Max Allowable Offer's neighborhood is
   easy to find: the column headers include the Max Allowable Offer's percentage change when it
   falls in range.

---

### User Story 3 - A new page that fits the app (Priority: P2)

The Sensitivity page lives at its own route, appears in the side navigation like the other
analysis pages, and uses the same shared deal card (with Edit deal and scenario tabs) at the top. It
works with whichever scenario is selected, and shows a clear message, not an empty grid, when the
deal isn't a rental yet.

**Why this priority**: The page has to be reachable and consistent, but the two calculations are
the value.

**Independent Test**: The page is reachable from the navigation, the deal card is at the top, and
with no rent entered it says "Add rent to see the sensitivity".

**Acceptance Scenarios**:

1. **Given** the side navigation, **When** the investor looks at it, **Then** it lists
   "Sensitivity" after the existing analysis pages, and selecting it opens the new page with the
   shared deal card above the page title.
2. **Given** a scenario with no rent, no price or no down payment, **When** the page opens,
   **Then** it shows what's missing (with the deal card's "Add …" hints) and no grid or offer.
3. **Given** two scenarios, **When** the investor switches scenario tabs, **Then** the grid and the
   offer follow the selected scenario.
4. **Given** keyboard-only use, **When** the investor tabs through the page, **Then** every
   control (measure, column variable, step sizes, target) is reachable, and the grid's cells can
   be read cell by cell with the arrow keys.

---

### Edge Cases

- **Rates below 0%**: rows never go below 0%; the range slides up so five rows still show, each
  still the deal's rate plus a whole number of steps (for a 0.5% rate and a 1% step, rows read
  0.5%, 1.5%, 2.5%, 3.5%, 4.5% with the current deal in the first row), and the current deal's cell
  stays marked.
- **A 0% interest rate** (valid, zero interest) gives an even payment (loan ÷ months) in its row.
- **Cash invested of $0** (no down payment and no closing costs or rehab) makes Cash-on-Cash
  undefined in that cell: it shows "n/a" with the reason, never a huge number or an error.
- **A fixed-dollar down payment**: when the deal's down payment is a dollar amount, price changes
  keep that dollar amount (the loan absorbs the change); with a percentage, the percentage stays.
- **A loan amount entered directly**: the loan you entered is the starting point. When the price
  changes, the loan moves by the part of the change the down payment doesn't cover, so the
  current-deal cell always matches the deal exactly.
- **Rent variations on a rent roll** (spec 012): every unit's rent is scaled by the same
  percentage, and vacancy, other income, reimbursements and the "Living there / After move-out"
  view follow the deal's current view.
- **Price changes and the percentage costs**: property tax, insurance, HOA and custom expenses
  stay at the dollar amounts entered (they don't scale with the price); management, maintenance and
  CapEx stay percentages of income.
- **PMI** follows the loan-to-value of each cell's price and down payment, as in the deal.
- **Target of 0 or negative** is accepted for cash flow ("at least $0" is the break-even price). A
  Cash-on-Cash target of 0% is accepted too (it means the same break-even price); a negative
  Cash-on-Cash target is rejected with "Use 0–1000%", because a higher price could then look
  better again as cash invested grows.
- **A target that is invalid** (not a number) shows an inline error and no offer.
- **A target no price reaches** (for example $5,000/mo cash flow on $2,400 of rent, or a very high Cash-on-Cash once closing costs are entered) shows the "no price reaches it" message. With no closing costs even 1,000% Cash-on-Cash is reachable at a very low price, because the cash invested shrinks with it.
- **Extra payments** don't affect these measures (cash flow excludes extra principal, as everywhere).
- **Large grids on slow devices**: 25 cells recalculate instantly; the page never freezes while the
  investor types a target.

## Requirements _(mandatory)_

### Functional Requirements

**Sensitivity grid (US1)**

- **FR-001**: The page MUST show a grid of the chosen measure with interest-rate rows and
  price-or-rent change columns: 5 rows × 5 columns by default, centered on the deal's own rate
  and on 0%.
- **FR-002**: The measure MUST be switchable between **Cash-on-Cash Return** and **Monthly cash
  flow**. The column variable MUST be switchable between **Purchase price** and **Rent**.
- **FR-003**: Each cell MUST be the deal recalculated with only that row's rate and that column's
  price or rent change applied. Everything else stays as entered. The center cell MUST equal the
  Deal Analyzer's figure for the same measure (to the cent, or to 0.01 percentage points).
- **FR-004**: Row headers MUST show the rate. Column headers MUST show the percentage change and
  the resulting dollar amount. The current-deal cell MUST be visibly marked and named.
- **FR-005**: The investor MUST be able to pick the rate step (0.25%, 0.5%, 1%, default 0.5%) and
  the column step (2.5%, 5%, 10%, default 5%). Changing a step MUST keep the current deal in the
  middle (except where the rate floor of 0% shifts the rows, per Edge Cases).
- **FR-006**: Cells MUST encode their value with color on a scale from worse to better, and MUST
  also carry a non-color cue for negative values and for values below the target (a minus sign
  in the figure, and a visible marker plus an accessible description). Color alone MUST NOT carry
  meaning (the same contrast rules as the rest of the app).
- **FR-007**: A cell whose measure is undefined (Cash-on-Cash with $0 cash invested) MUST show
  "n/a" with the reason available as text, not a number.
- **FR-008**: The grid MUST be a real table for assistive technology (row and column headers
  announced with each cell) and MUST be readable cell by cell with the arrow keys.
- **FR-009**: The grid MUST update immediately when any deal input changes, in the Edit deal sheet,
  the deal card or the target.

**Max Allowable Offer (US2)**

- **FR-010**: The page MUST let the investor choose a target measure (Cash-on-Cash Return or
  monthly cash flow) and a minimum value for it. A new target starts at 8% for Cash-on-Cash and
  $300/mo for cash flow, and each measure remembers its own value. The choice is saved with the
  scenario for the session. Cash-on-Cash targets must be 0% to 1,000%.
- **FR-011**: The page MUST compute the **Max Allowable Offer**: the highest purchase price, in
  whole dollars, for which the deal still meets the target, with rate, down payment (percentage
  or amount), rent and all costs as entered. It MUST be recomputed whenever any of those change.
- **FR-012**: The result MUST be exact at whole-dollar precision: the deal at the Max Allowable
  Offer meets the target, and the deal at $1 more does not.
- **FR-013**: The result MUST show the offer, the difference from the deal's current price (above
  or below, in dollars and percent), the measure at the offer, and the measure at the current price.
- **FR-014**: When the current price already meets the target, the page MUST say so and still show
  the highest price that would. When no price meets the target, the page MUST say so and name
  what would help (higher rent or lower rate), never a number.
- **FR-015**: "Use this price" MUST set the deal's home price to the offer through the standard
  deal edit (recorded and undoable, with the usual change toast).
- **FR-016**: The grid MUST mark cells that miss the target the investor has set (FR-006), naming that target in its legend. Until a target is set, the offer card shows the defaults, labelled "Default target", and the grid shows no below-target marks. When the column variable is the price and the Max Allowable
  Offer falls inside the grid's price range, the nearest column header MUST be tagged and a line
  under the grid MUST state the offer and its percentage change.

**Page and navigation (US3)**

- **FR-017**: The feature MUST be a new page at its own route, "Sensitivity", listed in the side
  navigation after the existing analysis pages, with the shared deal card above the page title
  (like every analysis page) pinning the deal inputs this page uses (rate, price, down payment,
  rent).
- **FR-018**: With a missing price, down payment or rent, or invalid inputs, the page MUST show a
  message naming what is missing (and the deal card's own hints), with no grid and no offer.
- **FR-019**: The page MUST use the existing design system and shared controls (segmented controls,
  number fields), be fully usable by keyboard and screen reader, pass the automated accessibility
  scan in light and dark, and not scroll sideways at 390px.
- **FR-020**: Every new calculation (the grid cells, the rate and column ranges, the Max
  Allowable Offer solver) MUST have unit tests to the cent, including the cases in Edge Cases and a
  check that the grid's center matches the Deal Analyzer exactly (Constitution I).

### Key Entities

- **Sensitivity grid**: The rows (interest rates), the columns (changes to price or rent), the chosen
  measure, and one result per cell (a number, or "n/a" with a reason). The center cell is the
  current deal.
- **Target**: The measure (Cash-on-Cash or monthly cash flow) and the minimum value the investor
  needs. Saved with the scenario.
- **Max Allowable Offer result**: The highest price that meets the target (or "none"), the
  difference from the current price, and the measure at both prices.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For the reference deal, the grid's center cell matches the Deal Analyzer's Cash-on-Cash
  Return and monthly cash flow exactly, and the 24 other cells each match a deal re-entered by hand
  with that rate and price or rent.
- **SC-002**: Across at least 50 varied deals (rates, prices, rents, down payments, PMI cases), the
  Max Allowable Offer meets the target, and $1 more fails it, every time.
- **SC-003**: An investor can go from the deal card to a Max Allowable Offer for an 8% Cash-on-Cash
  target in under 30 seconds, with no input beyond the target.
- **SC-004**: Changing any deal input updates the whole grid and the offer in under half a second
  on an ordinary laptop, with no visible stall while typing.
- **SC-005**: The Sensitivity page has zero automated accessibility violations in light and dark
  themes, every control and cell can be reached by keyboard, and no cell's meaning depends on
  color alone.
- **SC-006**: At 390px wide the page never scrolls sideways, and all five columns and five rows
  stay readable.
- **SC-007**: Existing pages, scenarios and results are unchanged by this feature: every existing
  automated test still passes.

## Assumptions

- **Rental deals only**: The grid and the offer need rent; a deal without rent gets the "Add rent"
  message, like the other analysis pages.
- **The grid's measures** are the year-1 figures the Deal Analyzer already shows (Cash-on-Cash =
  year-1 cash flow ÷ total cash invested; monthly cash flow = pre-tax, before extra principal).
  Multi-year projections are out of scope.
- **Price scenarios**: a change to the price changes the loan (price − down payment); the down
  payment keeps its percentage, or its dollar amount if entered that way. Closing costs and rehab
  stay as entered. Property tax and insurance stay at the dollar amounts entered.
- **Rent scenarios**: every unit's rent moves by the same percentage; other income stays as
  entered.
- **Interest rate scenarios** change only the rate; the loan term and type stay as entered.
- **Default ranges** follow the request's examples: rates ±1 point around the deal's rate (0.5%
  steps) and −10% to +10% columns (5% steps).
- **Targets** are minimums ("at least"). The target is saved with the scenario for the session, like
  other deal inputs (Constitution III), and is not shared across scenarios.
- **Out of scope**: solving for rent, rate or down payment (only the price is back-solved);
  more than two measures; three-way grids; exporting the grid; comparing multiple deals in one grid.
- **Numbering**: this feature is spec 015 because another in-progress feature uses 014. Both add a
  page and a navigation entry, so merging them will need a small manual merge of the navigation
  list and shared page profiles.
