# Feature Specification: DSCR & Financing Matrix

**Feature Branch**: `006-dscr-financing-matrix`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "DSCR (Debt Service Coverage Ratio) & Financing Matrix. Many real estate investors scale past conventional residential loan limits (10 loans) and use commercial DSCR loans, where qualification is based on the property's income rather than personal W-2 income. Core Calculations: DSCR: Net Operating Income divided by Annual Debt Service (NOI / Annual P&I). Lenders typically require a minimum DSCR of 1.15 to 1.25. If the rent doesn't cover the debt service at that ratio, the app should flag it in red. UI/UX Addition: A loan comparison matrix allowing investors to toggle between a 30-year conventional loan, an adjustable-rate mortgage (ARM), and a DSCR commercial loan to see how debt structure impacts monthly cash flow."

> Note: No `/speckit-specify` run existed for this feature, so this spec was written from the user's
> description as part of `/speckit-plan`, using features 002 (Deal Analyzer) and 005 (charts) as
> context. Choices the description left open are listed under Assumptions. Run `/speckit-clarify`
> to revisit any of them.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See whether the property's income covers its debt (Priority: P1)

An investor analyzing a rental on the Deal Analyzer sees the property's DSCR (annual NOI ÷ annual
principal & interest) next to the existing cap rate and rules of thumb. The DSCR is compared with
a lender minimum (1.25× by default, editable from 1.00× to 2.00×, with quick picks for 1.15×,
1.20× and 1.25×). When the DSCR is below that minimum, the indicator is red and says so in words.
It also shows the monthly rent the property would need to reach the minimum.

**Why this priority**: DSCR is the single number a DSCR lender qualifies the loan on. It works
with the investor's current loan inputs and needs no new loan model, so it delivers value alone.

**Independent Test**: Enter a $400,000 purchase price, 25% down, 7.0% for 30 years, $4,800/yr
property tax, $1,800/yr insurance and $3,800/mo rent (default reserves). DSCR shows **1.19×**,
flagged red "Below 1.25× minimum", with "Rent needed for 1.25×: $3,954.40/mo". Change the minimum
to 1.15× and the indicator turns green "Meets 1.15× minimum".

**Acceptance Scenarios**:

1. **Given** a valid rental analysis, **When** the page renders, **Then** a DSCR card shows the
   ratio to two decimals with a "×" suffix, the minimum it is tested against, and a pass/fail
   status conveyed by text and icon (not color alone).
2. **Given** DSCR below the minimum, **When** the page renders, **Then** the card is red, reads
   "Below {min} minimum", and shows the monthly rent needed to reach the minimum.
3. **Given** DSCR below 1.00×, **When** the page renders, **Then** the card additionally states that
   NOI does not cover the annual principal & interest.
4. **Given** the investor changes the minimum DSCR, **When** they pick 1.15× or type 1.20, **Then**
   the status and the rent-needed figure update immediately, and the choice survives a page reload
   in the same session.
5. **Given** two or more scenarios, **When** the comparison grid renders, **Then** it has a DSCR
   column, with "—" for scenarios without valid rental inputs.

---

### User Story 2 - Compare three loan structures side by side (Priority: P2)

On the same page, the investor sees a financing matrix with three columns: a **30-year
conventional fixed** loan, an **ARM** (fixed for an initial period, then reset to an adjusted rate)
and a **DSCR commercial** loan. Each column shows the loan amount, cash invested, monthly P&I, PMI
(conventional and ARM only, when LTV is over 80%), monthly cash flow, cash-on-cash return and DSCR
with the same red flag as User Story 1. The ARM column shows both the initial-period figures and
the post-reset figures. A segmented toggle picks which structure is in focus: it highlights that
column and shows its monthly cash-flow breakdown (NOI − P&I − PMI = cash flow).

**Why this priority**: It is the feature's UI addition, and it answers "how does debt structure
change my cash flow?". It depends on the DSCR math from User Story 1.

**Independent Test**: With the User Story 1 scenario, the matrix shows Conventional P&I
$1,995.91, cash flow $380.09/mo, DSCR 1.19× (red); ARM 7/1 initial P&I $1,896.20, cash flow
$479.80/mo, DSCR 1.25× (green) and after reset (year 8) P&I $2,240.75, cash flow $135.25/mo, DSCR
1.06× (red); DSCR loan P&I $2,201.29, cash flow $174.71/mo, DSCR 1.08× (red). Selecting "ARM" in
the toggle highlights the ARM column and shows its breakdown.

**Acceptance Scenarios**:

1. **Given** a valid rental analysis with a purchase price, **When** the page renders, **Then** the
   matrix shows all three structures, with the toggle on "Conventional" by default.
2. **Given** the toggle, **When** the investor picks a structure with the mouse or the arrow keys,
   **Then** that column is visually and programmatically marked as selected (`aria-current` or
   equivalent) and its breakdown is shown; the other columns stay visible.
3. **Given** no purchase price, **When** the page renders, **Then** the matrix is replaced by "Enter
   a purchase price to compare financing options."
4. **Given** the conventional column with untouched terms, **When** the investor edits the loan
   inputs above, **Then** the conventional column follows them and, for a 30-year scenario, matches
   the Deal Analyzer's own monthly cash flow to the cent.
5. **Given** a narrow (phone-width) screen, **When** the matrix renders, **Then** it stays readable
   without horizontal page scroll (the selected structure is shown as a single column).

---

### User Story 3 - Adjust each structure's terms (Priority: P3)

The investor edits each structure's terms in the matrix: down payment %, interest rate and term for
all three; plus initial fixed period (3, 5, 7 or 10 years) and adjusted rate for the ARM. Edits
recompute the matrix instantly, are validated inline, persist for the session, and a "Reset to
defaults" action restores the derived defaults.

**Why this priority**: Defaults get the investor a first answer; quoting real lender terms makes
it their answer. It is useful only once the matrix exists.

**Independent Test**: Set the DSCR loan's down payment to 20% and its rate to 7.5%. The DSCR column
updates (loan $320,000) while the other columns do not change. Enter an ARM fixed period that is
not shorter than the term and see an inline error, with the other two columns still computed.
Reload: the edits remain. Click "Reset to defaults": they are gone.

**Acceptance Scenarios**:

1. **Given** the matrix, **When** the investor edits a structure's term, **Then** only that column
   recomputes.
2. **Given** an invalid term (rate outside 0–25%, down payment outside 0–<100%, term outside
   1–40 years, ARM fixed period not shorter than the term), **When** entered, **Then** an inline
   error is shown on that field, that column shows "—", and the other columns and the rest of the
   page are unaffected.
3. **Given** edited terms, **When** the page reloads in the same session, **Then** the edits and
   the selected structure are restored.
4. **Given** edited terms, **When** "Reset to defaults" is activated, **Then** all three structures
   return to the defaults derived from the current loan inputs.

### Edge Cases

- **Negative NOI**: DSCR is negative, shown as such (e.g. "−0.12×"), red, with the "does not cover"
  message.
- **Expense percentages total 100% or more**: the "rent needed" figure is N/A ("Reserves and fees
  take 100% or more of rent"), because no rent can reach the minimum.
- **0% interest rate**: P&I is principal ÷ months; DSCR is still defined.
- **100%-financed or 0% down**: allowed; cash invested may be only closing costs + rehab, or $0,
  in which case cash-on-cash shows the existing "No cash invested" N/A.
- **Loan term shorter than 12 months on the main scenario**: DSCR uses the steady monthly P&I × 12
  (see Assumptions), not the partial year-one sum, so it is still a coverage ratio.
- **ARM fixed period ≥ term**: validation error on the ARM's fixed-period field.
- **Older sessions** saved before this feature (no financing data or minimum DSCR) load with
  defaults and no error.
- **Rental inputs invalid**: DSCR card and matrix are hidden, consistent with the existing
  analysis; the loan figures are still shown (spec 002 FR-015).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST compute DSCR as year-one annual NOI (as already computed by the Deal
  Analyzer) ÷ annual principal & interest, where annual P&I = scheduled monthly P&I × 12. PMI,
  taxes, insurance and HOA are not in the denominator (taxes, insurance and HOA are already
  operating expenses inside NOI).
- **FR-002**: System MUST let the investor set a minimum DSCR between 1.00 and 2.00 (two-decimal
  precision), default 1.25, with one-click presets 1.15, 1.20 and 1.25. One minimum applies per
  scenario, to the DSCR card and to every matrix column.
- **FR-003**: System MUST flag DSCR in red, with an icon and the words "Below {min} minimum",
  whenever DSCR < minimum; and in green with "Meets {min} minimum" otherwise. A DSCR below 1.00
  MUST additionally state that NOI does not cover the annual P&I.
- **FR-004**: System MUST show the monthly gross rent required to reach the minimum DSCR, holding
  other income, percentage-of-rent reserves and fixed expenses constant, or N/A with a reason
  when percentage reserves total ≥ 100%.
- **FR-005**: System MUST add a DSCR column to the Deal Analyzer's scenario comparison grid.
- **FR-006**: System MUST show a financing matrix with exactly three structures: Conventional (fixed),
  ARM and DSCR loan, each with: loan amount, total cash invested, monthly P&I, monthly PMI,
  monthly cash flow (NOI/12 − P&I − PMI), cash-on-cash return and DSCR (with FR-003 flagging and
  FR-004 rent needed).
- **FR-007**: For the ARM, the system MUST show figures for the initial fixed period and for the
  period after the reset. The post-reset payment is the full re-amortization of the balance
  remaining at the end of the fixed period, at the adjusted rate, over the remaining term.
- **FR-008**: PMI MUST apply to the Conventional and ARM structures only, when their loan-to-value
  is above 80%, using the scenario's PMI rate (no PMI when the scenario has none). DSCR loans never
  carry PMI.
- **FR-009**: Default terms MUST derive from the current scenario until the investor edits the
  matrix: Conventional = scenario down payment % (1 − loan amount ÷ purchase price, floored at 0, so
  an overridden loan amount is respected), scenario rate, 30 years; ARM = same down
  payment, scenario rate − 0.50 points (floored at 0), adjusted rate = scenario rate + 1.50 points,
  7-year fixed period, 30 years; DSCR loan = 25% down, scenario rate + 1.00 point, 30 years.
- **FR-010**: A segmented toggle (one tab stop, arrow-key navigation, accessible name) MUST select
  the structure in focus, default Conventional. The selected column is highlighted and its monthly
  cash-flow breakdown is shown. On narrow screens only the selected column is shown.
- **FR-011**: Investors MUST be able to edit each structure's down payment %, rate and term, and the
  ARM's fixed period (3/5/7/10 years) and adjusted rate. Invalid values show an inline error and
  blank that column only; they never block the DSCR card, the Deal Analyzer or the schedule.
- **FR-012**: Once any matrix term is edited, all three structures' terms MUST be stored on the
  scenario and stop following the loan inputs; "Reset to defaults" MUST discard them.
- **FR-013**: Minimum DSCR, structure terms and the selected structure MUST persist in the existing
  per-session storage with the scenario; sessions saved before this feature MUST load with
  defaults.
- **FR-014**: The matrix MUST require a purchase price; without one it shows an explanatory message
  instead.
- **FR-015**: All money values MUST be rounded to cents, and DSCR shown to two decimals; the
  pass/fail test uses the unrounded DSCR.

### Key Entities _(include if feature involves data)_

- **DSCR Result**: the derived coverage of one loan: ratio, minimum it was tested against,
  meets-minimum flag, covers-debt flag (≥ 1.00) and rent needed for the minimum.
- **Financing Terms**: the investor-editable terms of the three structures, the minimum DSCR and the
  selected structure, saved per scenario with the rental inputs. Absent means "use derived
  defaults".
- **Financing Option Result**: the derived figures for one structure (and for the ARM, one per
  phase), shown as a matrix column.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For the reference scenario in User Story 1, every DSCR, P&I, cash-flow and
  rent-needed figure in this spec is reproduced to the cent (ratios to 4 decimals) by automated tests.
- **SC-002**: An investor can see whether a property meets a 1.25× minimum within one glance at the
  Deal Analyzer, with no extra input beyond rent and loan terms already entered.
- **SC-003**: Changing a matrix term or the toggle updates the visible figures within 100 ms on a
  mid-range laptop.
- **SC-004**: Every new control is operable by keyboard alone and passes the existing automated
  accessibility checks.
- **SC-005**: With untouched terms, the conventional column's monthly cash flow equals the Deal
  Analyzer's monthly cash flow for any valid 30-year scenario whose PMI status does not change
  during year one.

## Assumptions

- **Formula**: DSCR uses NOI ÷ annual P&I, as the description states. Some DSCR lenders instead use
  gross rent ÷ PITIA; that variant is out of scope.
- **Year one**: DSCR uses year-one NOI and the scheduled (not extra) monthly P&I × 12, so extra
  payments never change the DSCR. For the ARM it is computed per phase, with the same year-one NOI
  (rent growth is not applied to the post-reset phase, so phases differ only by debt structure).
- **ARM model**: one assumed adjusted rate for the rest of the term after the fixed period.
  Index/margin, periodic and lifetime caps, and multiple resets are out of scope.
- **DSCR loan model**: a fully amortizing fixed-rate loan. Interest-only periods, prepayment
  penalties, origination points, reserves requirements and lender-specific LTV caps are out of
  scope; the investor can approximate points through the existing closing-costs input.
- **Closing costs and rehab** are the same across the three structures (they belong to the
  property, not the loan).
- **The matrix is a what-if**: it does not change the scenario's own loan. Applying a structure to
  the scenario is out of scope.
- **Storage**: client-side only, in the existing session storage (constitution Principle III).
- **Location**: the Deal Analyzer page (`/deal-analyzer`) only; the amortization page is unchanged.
