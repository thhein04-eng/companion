# Feature Specification: Rental Property Deal Analyzer

**Feature Branch**: `002-rental-deal-analyzer`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Rental Property Cash Flow & ROI Analyzer (The "Deal Analyzer"). Right now, the tool calculates the mortgage outflow (PITI). An investor needs to know if the property will actually generate positive monthly cash flow after all operating expenses. Core Metrics to Compute: Net Operating Income (NOI): Gross Scheduled Income minus Operating Expenses (Property Taxes, Insurance, Maintenance reserve, CapEx reserve, Property Management, and Vacancy rate). Cash-on-Cash Return (CoC): Annual pre-tax cash flow divided by total cash invested (Down payment + Closing costs + Rehab). Cap Rate: NOI divided by Purchase Price (useful for comparing all-cash market yields). Rule of Thumb Checks: 1% Rule and 50% Rule indicators. UI/UX Addition: A "Rental Income vs. Operating Expenses" breakdown card and a real-time Cash-on-Cash Return badge next to the LTV badge."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See monthly cash flow and NOI for a rental (Priority: P1)

A real estate investor who has already entered a purchase price, down payment, and loan terms adds the expected monthly rent and operating-expense assumptions (vacancy, property management, maintenance reserve, CapEx reserve) and immediately sees the property's Net Operating Income and its monthly and annual pre-tax cash flow after the mortgage payment. A "Rental Income vs. Operating Expenses" card breaks the numbers down line by line.

**Why this priority**: Knowing whether a property cash-flows positive is the core question an investor asks. Every other metric (CoC, cap rate, rules of thumb) is built on NOI and cash flow, so this story is the MVP.

**Independent Test**: Enter a $250,000 purchase price, a 25% down payment, a 30-year loan at 7%, $2,400/month rent, $3,000/year property tax, $1,200/year insurance, 5% vacancy, 8% management, 5% maintenance, and 5% CapEx. Confirm the breakdown card shows gross scheduled income, each expense line, total operating expenses, NOI, debt service, and monthly cash flow, and that each figure matches hand calculation to the cent.

**Acceptance Scenarios**:

1. **Given** a valid loan scenario with no rental inputs, **When** the user views the page, **Then** the Deal Analyzer section shows a prompt to enter monthly rent, and no investment metrics are shown yet.
2. **Given** the user enters monthly rent, **When** the calculation updates, **Then** the breakdown card shows gross scheduled income, every operating-expense line (property tax, insurance, HOA, vacancy, management, maintenance reserve, CapEx reserve), total operating expenses, NOI, debt service (principal & interest plus PMI), and pre-tax cash flow, each as both a monthly and an annual figure.
3. **Given** the operating expenses and debt service exceed rental income, **When** the card renders, **Then** cash flow is shown as a negative value and is visually flagged as negative. The flag does not rely on color alone.
4. **Given** the user has already entered property tax, insurance, and HOA in the real-estate costs section, **When** the Deal Analyzer computes operating expenses, **Then** it reuses those same values and does not ask for them again. Changing a value in either place updates both.

---

### User Story 2 - Judge return on cash invested with a live CoC badge (Priority: P1)

An investor wants to know how hard their own cash is working. They enter closing costs and rehab budget, and a Cash-on-Cash Return badge next to the LTV badge updates in real time as they adjust any input. This lets them see right away whether a different rent, price, or down payment makes the deal worth it.

**Why this priority**: CoC is the headline metric leveraged investors use to compare deals, and the badge is the main UI addition requested. It needs Story 1's cash-flow figure, but it is a separate, demonstrable deliverable.

**Independent Test**: Using the Story 1 scenario plus $7,500 closing costs and $10,000 rehab, confirm that total cash invested is $80,000 ($62,500 + $7,500 + $10,000), that the CoC badge shows annual pre-tax cash flow ÷ $80,000 as a percentage, and that the LTV badge shows 75.0%. Change the rent and confirm the CoC badge updates without any extra action.

**Acceptance Scenarios**:

1. **Given** a valid scenario with a home price and down payment, **When** the page renders, **Then** an LTV badge shows the loan amount as a percentage of the purchase price.
2. **Given** monthly rent has been entered, **When** the page renders, **Then** a Cash-on-Cash Return badge appears next to the LTV badge and shows annual pre-tax cash flow ÷ total cash invested, as a percentage to one decimal place.
3. **Given** the CoC badge is visible, **When** the user changes any input that affects cash flow or cash invested (rent, any expense, rate, term, price, down payment, closing costs, rehab), **Then** the badge value updates in under 1 second with no submit action.
4. **Given** total cash invested is zero, **When** the badge would render, **Then** it shows "N/A" with an explanation that CoC is undefined when no cash is invested, and no division by zero occurs.
5. **Given** CoC is negative, **When** the badge renders, **Then** the badge shows the negative percentage with a distinct negative state.

---

### User Story 3 - Compare against market yield and rules of thumb (Priority: P2)

An investor screening many listings wants a fast sanity check. They see the property's cap rate, so they can compare it with all-cash market yields, and pass/fail indicators for the 1% Rule and the 50% Rule. This lets them decide in seconds whether a deal deserves deeper analysis.

**Why this priority**: Cap rate and rules of thumb are screening aids. They add a lot of value, but the investor can still make a decision from cash flow and CoC alone.

**Independent Test**: Using the Story 1 scenario, confirm the cap rate equals annual NOI ÷ $250,000, the 1% Rule indicator fails ($2,400 rent is below the $2,500 target) and shows the $2,500 target, and the 50% Rule indicator compares actual operating expenses as a share of gross scheduled income against 50%.

**Acceptance Scenarios**:

1. **Given** rent and purchase price are entered, **When** the metrics render, **Then** the cap rate is shown as annual NOI ÷ purchase price, as a percentage to two decimal places, labeled as independent of financing.
2. **Given** rent and purchase price are entered, **When** the 1% Rule indicator renders, **Then** it passes if gross monthly rent is at least 1% of the purchase price, fails otherwise, and always shows the target rent (1% of purchase price) next to the actual rent.
3. **Given** rent and operating expenses are entered, **When** the 50% Rule indicator renders, **Then** it shows the actual operating-expense ratio (total operating expenses ÷ gross scheduled income). It marks the deal "within 50% Rule" when the ratio is 50% or less and "above 50% Rule" when it is higher. It also shows the 50%-Rule estimated monthly cash flow (50% of gross rent minus debt service) next to the detailed cash flow.
4. **Given** a rule-of-thumb indicator is shown, **When** the user hovers over or taps its info button, or focuses it and presses Enter, **Then** a one-sentence explanation of the rule appears and can be reached by keyboard and screen reader.

---

### User Story 4 - Compare deal metrics across scenarios (Priority: P3)

An investor modeling two or three offers, or two or three properties, as separate scenarios wants the existing side-by-side comparison to include monthly cash flow, NOI, cap rate, and CoC. This lets them pick the strongest deal without switching tabs.

**Why this priority**: This extends the existing comparison feature. It is useful, but it depends on all the metrics above and is not needed to analyze a single deal.

**Independent Test**: Create two scenarios with different rents and confirm the comparison view shows each scenario's monthly cash flow, NOI, cap rate, and CoC next to the existing loan metrics.

**Acceptance Scenarios**:

1. **Given** two or more scenarios exist and at least one has rental inputs, **When** the user views the comparison, **Then** each scenario row shows monthly cash flow, annual NOI, cap rate, and CoC. Scenarios without rent show "—" for these columns.

---

### Edge Cases

- **No rent entered**: Investment metrics, the CoC badge, and the rule indicators are hidden or shown as "Enter rent to analyze". The existing amortization flow is not affected.
- **No purchase price (loan amount only)**: The cap rate, 1% Rule, and LTV badge show "N/A — enter a purchase price". Cash flow and NOI are still computed.
- **Total cash invested is zero** (for example, 0% down, no closing costs, no rehab): CoC shows "N/A" with an explanation and never shows infinity or an error.
- **Rent is zero**: The 50% Rule ratio is undefined and shows "N/A". The cap rate can be negative and is shown as negative.
- **Expense percentages above 100%** or negative values: Rejected with field-level validation messages. Percentages must be between 0 and 100.
- **Vacancy at 100%**: Allowed. Effective income becomes zero and cash flow is negative. This is valid input, not an error.
- **PMI ends partway through the loan**: First-year cash flow and CoC include PMI for each year-1 month it applies. The breakdown notes that cash flow improves once PMI drops off, and names the payment number from the existing PMI cutoff.
- **HOA fees**: Counted once as an operating expense. They must not be double-counted in both operating expenses and debt service.
- **Property tax and insurance (the "TI" in PITI)**: Counted only as operating expenses. Debt service is principal, interest, and PMI only, so the investor's total outflow is never double-counted.
- **Extra principal payments**: These are a choice the investor makes, not a required cost. They are excluded from debt service and cash flow, which use the scheduled payment.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow the user to enter, per scenario, gross monthly rent and optional other monthly income (for example, parking or laundry). Together these make up Gross Scheduled Income (GSI).
- **FR-002**: System MUST allow the user to enter vacancy rate, property management fee, maintenance reserve, and CapEx reserve, each as a percentage of GSI. Each value must be between 0 and 100 inclusive. Defaults are 5% vacancy, 8% management, 5% maintenance, and 5% CapEx. Each default is shown as an editable value, not hidden.
- **FR-003**: System MUST compute total operating expenses as property tax + insurance + HOA + vacancy + management + maintenance reserve + CapEx reserve. Property tax, insurance, and HOA MUST come from the scenario's existing real-estate cost inputs, not from duplicate fields.
- **FR-004**: System MUST compute Net Operating Income (NOI) = GSI − total operating expenses, monthly and annually. NOI MUST exclude debt service.
- **FR-005**: System MUST compute debt service as scheduled principal & interest plus PMI. Year-1 annual debt service is the sum of scheduled P&I plus PMI over the first min(12, number of scheduled periods) months. Extra principal payments, property tax, insurance, and HOA MUST be excluded.
- **FR-006**: System MUST compute pre-tax cash flow = NOI − debt service, monthly (year-1 average) and annually (year 1).
- **FR-007**: System MUST allow the user to enter closing costs and rehab budget as dollar amounts of 0 or more. It MUST compute total cash invested = down payment (as a dollar amount) + closing costs + rehab.
- **FR-008**: System MUST compute Cash-on-Cash Return = annual pre-tax cash flow ÷ total cash invested. When total cash invested is 0, the result MUST be "not applicable" rather than infinity or an error.
- **FR-009**: System MUST compute Cap Rate = annual NOI ÷ purchase price (home price) when a purchase price is present, and "not applicable" otherwise.
- **FR-010**: System MUST show a 1% Rule indicator. It passes when gross monthly rent ≥ 1% of the purchase price, and it always shows the target rent and the actual rent.
- **FR-011**: System MUST show a 50% Rule indicator with the actual operating-expense ratio (total operating expenses ÷ GSI), whether it is within 50%, and the 50%-Rule estimated monthly cash flow (0.5 × GSI − monthly debt service).
- **FR-012**: System MUST show a "Rental Income vs. Operating Expenses" breakdown card listing GSI, each operating-expense line, total operating expenses, NOI, debt service, and cash flow, monthly and annually. Negative cash flow MUST be flagged with both color and a text or icon cue.
- **FR-013**: System MUST show an LTV badge (loan amount ÷ purchase price, to one decimal place) and, next to it, a Cash-on-Cash Return badge. Both MUST update in real time when any contributing input changes.
- **FR-014**: System MUST extend the existing multi-scenario comparison with monthly cash flow, annual NOI, cap rate, and CoC per scenario.
- **FR-015**: System MUST validate all new inputs with field-level messages, following the existing calculator's validation behavior. Invalid rental inputs MUST NOT block the amortization schedule from rendering.
- **FR-016**: System MUST keep all new inputs in the same session-scoped storage as the existing scenario inputs. Existing saved sessions without rental fields MUST load without error.
- **FR-017**: All new monetary values and percentages MUST follow the existing locale formatting (US dollars, thousands separators). Percentages show one decimal place, except cap rate, which shows two.

### Key Entities

- **Rental Assumptions** (part of a Loan Scenario): gross monthly rent, other monthly income, vacancy %, management %, maintenance reserve %, CapEx reserve %, closing costs, and rehab budget. It reuses the scenario's home price, down payment, property tax, insurance, and HOA.
- **Deal Analysis** (always derived, never stored): GSI, an itemized list of operating expenses, total operating expenses, NOI, debt service, pre-tax cash flow, total cash invested, CoC, cap rate, LTV, 1% Rule result, and 50% Rule result. Each value is monthly and/or annual as applicable.
- **Scenario Comparison** (extended): Adds cash flow, NOI, cap rate, and CoC to each scenario's comparison row.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For 100% of tested reference deals, NOI, cash flow, CoC, and cap rate match hand-calculated values to the cent (dollar figures) or to 0.01 percentage points (ratios).
- **SC-002**: An investor who has already entered loan details can enter rent and see whether the property cash-flows positive in under 30 seconds.
- **SC-003**: The CoC and LTV badges, the breakdown card, and the rule indicators reflect an input change within 1 second.
- **SC-004**: In usability testing, 90% of investors correctly state the property's monthly cash flow and whether it passes the 1% Rule after a single look at the Deal Analyzer section.
- **SC-005**: Users who don't enter rent see no change to the existing amortization experience, apart from the new LTV badge. All existing amortization acceptance scenarios still pass.

## Assumptions

- **Single-year snapshot**: Metrics are first-year, pre-tax figures. Multi-year projections (rent growth, appreciation, IRR, equity build-up, depreciation, and taxes) are out of scope.
- **Debt service excludes TI**: "Debt service" means principal & interest plus PMI. Property tax and insurance (the TI in PITI) are operating expenses, which is standard investor practice and avoids double counting.
- **Percentage bases**: Vacancy, management, maintenance, and CapEx are all percentages of Gross Scheduled Income. This is a common simplification; management is sometimes charged on collected rent, but the difference is not material for screening.
- **Cap rate uses the purchase price only**: Rehab is excluded from the cap-rate denominator. The 1% Rule also uses purchase price only.
- **Defaults**: The 5/8/5/5% defaults are common investor screening assumptions, editable per scenario.
- **The LTV badge is new**: The current tool uses LTV only internally, for the PMI cutoff, and has no visible LTV badge. This feature adds the LTV badge so the CoC badge can sit beside it as requested.
- **Single rent figure**: Multi-unit properties are entered as one combined monthly rent figure. Per-unit rent rolls are out of scope.
- **Client-side only**: As with the existing tool, all data stays in the browser session. No accounts, no server storage, and no rent comps or listing data from external sources.
