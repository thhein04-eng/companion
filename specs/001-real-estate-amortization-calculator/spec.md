# Feature Specification: Real Estate Amortization Calculator

**Feature Branch**: `001-real-estate-amortization-calculator`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Build a nx with next.js app for comprehensive real estate amortization calculator. set up https://github.com/vercel-labs/ui as ui sdk and use their components. follow both nx recommendation (https://nx.dev/docs/technologies/react/next/introduction) and nextjs recommendation (https://nextjs.org/docs)"

## Clarifications

### Session 2026-11-16

- Q: Should the loan amount be calculated automatically from the home price and down payment, or does it stay a separate field the user types in on its own? → A: Hybrid — auto-calculate the loan amount as home price minus down payment whenever both are present; the user can manually override it, and that override is discarded (recalculated) if the home price or down payment changes again.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Calculate a standard mortgage payment and schedule (Priority: P1)

A prospective or current homeowner enters a loan amount, interest rate, and loan term and immediately sees the resulting monthly payment along with a full period-by-period amortization schedule showing how much of each payment goes to principal versus interest.

**Why this priority**: This is the core value of the tool — without an accurate payment calculation and schedule, nothing else matters. It is the Minimum Viable Product.

**Independent Test**: Can be fully tested by entering a loan amount, rate, and term, and verifying the displayed monthly payment and schedule match known amortization math (e.g., a $300,000 loan at 6.5% for 30 years produces the textbook payment and declining-balance schedule).

**Acceptance Scenarios**:

1. **Given** a user has not yet entered any values, **When** they land on the calculator, **Then** they see input fields for loan amount, interest rate, loan term, and start date, with sensible placeholder/default values.
2. **Given** a user enters a valid loan amount, interest rate, and term, **When** they submit or the calculation updates live, **Then** the system displays the fixed monthly payment amount and a complete schedule listing every payment period with payment number, date, principal portion, interest portion, and remaining balance.
3. **Given** a completed schedule is displayed, **When** the user reviews the final row, **Then** the remaining balance is exactly zero and the last payment amount is adjusted for any rounding so the loan pays off cleanly.

---

### User Story 2 - Model real-estate-specific costs (Priority: P2)

A homebuyer wants to understand their full monthly housing cost, not just loan principal and interest, so they add down payment, property tax, homeowner's insurance, PMI, and HOA fees to see a complete estimated monthly payment.

**Why this priority**: A real estate amortization calculator that ignores taxes, insurance, and PMI is not "comprehensive" and does not reflect what a homeowner actually pays each month — this differentiates the tool from a generic loan calculator.

**Independent Test**: Can be fully tested by entering a home price, down payment, tax rate, insurance estimate, and PMI/HOA values, and confirming the displayed "total monthly payment" correctly sums principal & interest with the prorated monthly amounts of each additional cost, and that PMI automatically drops off the schedule once equity crosses the standard 20% threshold.

**Acceptance Scenarios**:

1. **Given** a user enters a home price and a down payment amount or percentage, **When** the down payment is less than 20% of the home price, **Then** the system includes an estimated monthly PMI cost in the total payment and schedule until the loan balance reaches 80% of the original home value.
2. **Given** a user enters annual property tax and annual insurance premium, **When** the calculation runs, **Then** the system shows the prorated monthly amount for each and includes it in the total estimated monthly payment, separate from the principal & interest breakdown.
3. **Given** a user enters a monthly HOA fee, **When** the calculation runs, **Then** the HOA fee is added to the total monthly payment but is excluded from the amortization schedule's principal/interest/balance columns (since it does not affect the loan balance).
4. **Given** a user has entered a home price and a down payment, **When** both values are present, **Then** the loan amount is calculated automatically as home price minus down payment, while remaining directly editable; if the user types a different loan amount, that override is kept until the user changes the home price or down payment again, at which point the loan amount is recalculated and the override is discarded.

---

### User Story 3 - Evaluate extra payments and early payoff (Priority: P2)

A borrower wants to see how making extra principal payments (one-time or recurring) shortens the loan term and reduces total interest paid, so they can decide whether prepaying is worthwhile.

**Why this priority**: Extra-payment / early-payoff analysis is one of the most commonly sought features in amortization tools and directly supports a key financial decision, but the base schedule (Story 1) must exist first.

**Independent Test**: Can be fully tested by adding a recurring extra monthly payment to an existing loan scenario and confirming the recalculated schedule shows a shorter payoff period and a lower total interest figure than the baseline, with the savings clearly displayed.

**Acceptance Scenarios**:

1. **Given** a baseline loan schedule is displayed, **When** the user adds a recurring extra monthly principal payment, **Then** the schedule recalculates, the payoff date moves earlier, and the system displays the number of payments and amount of interest saved compared to the baseline.
2. **Given** a baseline loan schedule is displayed, **When** the user adds a one-time extra payment on a specific date, **Then** that payment is applied entirely to principal in that period and all subsequent periods recalculate accordingly.
3. **Given** an extra payment would exceed the remaining loan balance, **When** the schedule recalculates, **Then** the loan is marked paid off at that period with the excess amount not applied, rather than producing a negative balance.

---

### User Story 4 - Compare multiple loan scenarios side-by-side (Priority: P3)

A shopper comparing offers wants to set up two or three different loan scenarios (e.g., different rates, terms, or down payments) and view their key outcomes side-by-side to decide which is most favorable.

**Why this priority**: Valuable for decision-making and reinforces "comprehensive," but the tool is still useful with a single scenario, so this is lower priority than the core calculation and cost/prepayment features.

**Independent Test**: Can be fully tested by creating two scenarios with different interest rates on the same loan amount and term, and confirming the comparison view correctly displays each scenario's monthly payment, total interest, and payoff date side-by-side.

**Acceptance Scenarios**:

1. **Given** a user has an existing calculated scenario, **When** they choose to add a comparison scenario, **Then** they can independently edit its inputs without affecting the original scenario.
2. **Given** two or more scenarios exist, **When** the user views the comparison, **Then** the system displays each scenario's monthly payment, total interest paid, total cost, and payoff date in a single aligned view.

---

### Edge Cases

- What happens when the interest rate is entered as 0%? System must still compute a valid straight-line principal schedule without dividing by zero.
- What happens when the loan term is 0 or negative, or the loan amount is 0 or negative? System must reject with a clear validation message and not attempt a calculation.
- What happens when the down payment is greater than or equal to the home price? System must flag this as invalid or treat the loan amount as zero with a clear message.
- What happens when extra payments are large enough to pay off the loan in the very first period? Schedule must show a single period and stop.
- How does the system handle a loan term entered in months versus years? Input must unambiguously specify the unit.
- What happens when the start date falls on a non-standard date (e.g., the 31st) for a monthly schedule? Payment dates must roll over consistently (e.g., to month-end) for every period.
- What happens when rounding across many periods would leave a tiny positive or negative balance at the end? The final period's payment must absorb the rounding difference so the ending balance is exactly zero.
- What happens when a user manually overrides the auto-calculated loan amount and then changes the home price or down payment again? The system must discard the override and show the freshly calculated loan amount (home price minus down payment).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to input a loan principal amount, annual interest rate, loan term, payment frequency (monthly), and loan start date.
- **FR-002**: System MUST calculate and display the fixed periodic payment amount for a standard fully-amortizing fixed-rate loan.
- **FR-003**: System MUST generate a complete amortization schedule listing, for every payment period, the payment number, payment date, payment amount, principal portion, interest portion, and remaining balance.
- **FR-004**: System MUST ensure the final period's remaining balance resolves to exactly zero, adjusting for rounding as needed.
- **FR-005**: System MUST allow users to optionally enter home price, down payment (as amount or percentage), property tax (annual or monthly), homeowner's insurance (annual or monthly), PMI rate or amount, and HOA fees, and reflect these in a combined "total estimated monthly payment" view distinct from principal & interest.
- **FR-006**: System MUST automatically estimate and remove PMI from the total monthly payment once the loan balance is projected to reach 80% of the original home value, and indicate the period at which this occurs.
- **FR-007**: System MUST allow users to add recurring extra principal payments and/or one-time extra principal payments at a specified date, and recalculate the full schedule accordingly.
- **FR-008**: System MUST display, whenever extra payments are present, a comparison of payoff date and total interest paid versus the baseline (no extra payment) schedule.
- **FR-009**: System MUST validate all numeric inputs (reject zero/negative loan amounts and terms, out-of-range rates, down payments exceeding home price) and present clear, field-level error messages without crashing the calculation.
- **FR-010**: System MUST allow users to create, edit, and remove multiple independent loan scenarios and view a side-by-side comparison of each scenario's monthly payment, total interest paid, total cost, and payoff date.
- **FR-011**: System MUST allow users to export or print the full amortization schedule for a scenario in a human-readable format.
- **FR-012**: System MUST retain a user's in-progress scenario inputs for the duration of their browser session so that navigating within the app does not lose entered data.
- **FR-013**: System MUST present monetary values and dates in a clearly formatted, locale-appropriate way (currency symbol, thousands separators, consistent date format).
- **FR-014**: System MUST automatically calculate the loan amount as home price minus down payment whenever both are provided, and display that calculated value as the current loan amount. System MUST allow the user to manually override this calculated value by editing the loan amount field directly. If the user subsequently changes the home price or the down payment, System MUST recalculate the loan amount and discard any prior manual override.

### Key Entities

- **Loan Scenario**: A named set of inputs (principal, rate, term, start date, home price, down payment, tax/insurance/PMI/HOA values, extra payment rules) that together produce one calculated amortization result. Multiple scenarios can exist at once for comparison. Principal is auto-calculated from home price minus down payment whenever both are present, but can be manually overridden; changing home price or down payment again recalculates principal and clears any override (FR-014).
- **Amortization Schedule**: The ordered list of payment periods derived from a Loan Scenario, where each entry records period number, date, payment amount, principal portion, interest portion, and remaining balance.
- **Extra Payment Rule**: A user-defined instruction (recurring amount per period, or one-time amount on a specific date) that is applied to principal when generating a scenario's Amortization Schedule.
- **Scenario Comparison**: A derived view grouping two or more Loan Scenarios' summary outcomes (monthly payment, total interest, total cost, payoff date) for side-by-side evaluation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time user can enter a basic loan (amount, rate, term) and see an accurate monthly payment and full schedule in under 30 seconds without instructions.
- **SC-002**: Calculated payment and schedule values match standard amortization formulas to the nearest cent for 100% of tested loan combinations (varying amount, rate, and term).
- **SC-003**: Users can determine the interest and time saved from an extra-payment plan within two interactions (entering the extra payment and reading the comparison) without manual calculation.
- **SC-004**: Users evaluating multiple loan offers can view a side-by-side comparison of at least two scenarios without losing or needing to re-enter previously completed scenario data.
- **SC-005**: The schedule for a 30-year monthly loan (360 periods) renders and remains responsive to input changes without noticeable lag (results update in under 1 second).
- **SC-006**: 90% of users testing the real-estate cost inputs (tax, insurance, PMI, HOA) correctly identify their total estimated monthly payment versus their principal-and-interest-only payment, per usability testing.

## Assumptions

- This is a self-service, single-user tool with no login/authentication; data persistence is limited to the current browser session (no cross-device sync or long-term server-side storage of personal financial data).
- Only fixed-rate, fully-amortizing loans are in scope for v1; adjustable-rate mortgages (ARMs), interest-only periods, and balloon payments are out of scope unless added in a future iteration.
- Payment frequency is monthly; bi-weekly or other non-monthly schedules are out of scope for v1.
- PMI removal is estimated using the standard 80% loan-to-value threshold based on original home value, not a formal lender reappraisal process.
- Property tax, insurance, and HOA figures are user-supplied estimates, not pulled from any external data source or API.
- Export is a client-side generated file (e.g., printable view or downloadable file) rather than an emailed or server-stored document.
- Currency and locale default to US dollars and US date/number formatting unless otherwise configured.
