# Feature Specification: Refinance & BRRRR Modeling

**Feature Branch**: `014-refinance-brrrr`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "New page and route: Refinance & BRRRR Modeling. Since the app already
supports multiple scenarios via ScenarioTabs, add a linked refinance phase that unlocks BRRRR (Buy,
Rehab, Rent, Refinance, Repeat) and rate-drop modeling. (1) Cash-Out Refinance Calculator: inputs
for After-Repair Value (ARV), refinance LTV (e.g., 75%), new interest rate, and refi closing costs.
(2) Capital Recycled Metric: show exact Cash Left in Deal (Total Cash Invested − Net Refi Proceeds)
and post-refinance Cash-on-Cash return. (3) Rate-Drop Breakeven: compare keeping the current
mortgage vs. refinancing at a lower rate, calculating the exact month when monthly P&I savings
recoup the refinance closing costs. Use worktree."

> Note: This spec builds on spec 002 (rental analysis: cash invested, net operating income,
> cash-on-cash), spec 010 (Deal Strip and shared scenarios) and spec 013 (the `/sale` page pattern
> and the way a page stores its own optional inputs with the scenario). Choices the description left
> open are listed under Assumptions.

## How this differs from the other pages

`/sale` asks "do I profit if I **sell**?" and `/pro-forma` asks "what do I earn if I **hold**?".
This page asks the question in between: **"if I refinance at this point, how much of my cash comes
back out, and is a lower rate worth the closing costs?"** It adds one new phase to a scenario — a
refinance at a chosen month — and shows its effect on the money in the deal.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Cash-out refinance: how much cash do I get out? (Priority: P1)

A BRRRR investor bought and rehabbed a property and now wants to refinance it. They open a new
**Refinance & BRRRR** page at `/refinance`. It has its own nav entry ("Refinance") and uses the
same scenarios and Deal Strip as the other pages, so the purchase price, down payment, loan, rehab
budget and closing costs are already filled in from the active scenario.

They enter the refinance phase:

- **After-Repair Value (ARV)**: what the property is worth after the rehab.
- **Refinance LTV**: the share of ARV the new lender will lend (default 75%).
- **New interest rate** and **new loan term** (default 30 years).
- **Refinance closing costs**.
- **Refinance month**: how many months after purchase they refinance (default 12).

The page shows:

- **New loan amount**: ARV × refinance LTV.
- **Payoff of the current loan**: the remaining balance on the existing loan at the refinance month.
- **Refinance closing costs**: as entered.
- **Net refinance proceeds**: new loan amount − payoff − refinance closing costs.
- **New monthly P&I** and its change from the current monthly P&I.

**Why this priority**: The refinance proceeds are the foundation for every other figure on the page
and answer the question a BRRRR investor asks first.

**Independent Test**: Use this BRRRR reference deal:

- $200,000 purchase price with 20% down ($40,000), so a $160,000 loan at 7% for 30 years
- $50,000 rehab budget and $6,000 closing costs
- Refinance at month 12 with ARV $320,000, LTV 75%, new rate 6.5%, 30-year term, closing costs $5,000

Expected: new loan **$240,000.00**; payoff **$158,374.70**; net refinance proceeds **$76,625.30**;
current monthly P&I **$1,064.48**; new monthly P&I **$1,516.96**.

**Acceptance Scenarios**:

1. **Given** the reference deal, **When** the refinance inputs are entered, **Then** the page shows
   the figures above.
2. **Given** the ARV is blank or $0, **When** the page renders, **Then** it shows a prompt to add an
   ARV and shows no proceeds.
3. **Given** the new loan is smaller than the payoff plus closing costs, **When** the page renders,
   **Then** the net proceeds are negative and the page labels this a **cash-in refinance** (the
   investor must bring cash to close), not a cash-out.
4. **Given** any refinance input changes, **When** the user finishes editing it, **Then** every
   figure updates, and switching scenario tabs shows that scenario's own refinance inputs.

---

### User Story 2 - Capital recycled: how much cash is left in the deal? (Priority: P1)

After the refinance inputs are in, the investor wants the BRRRR scorecard. The page shows:

- **Total cash invested**: down payment + purchase closing costs + rehab budget (down payment alone
  for a scenario without rental inputs), as the rental analysis already defines it.
- **Cash left in deal**: total cash invested − net refinance proceeds.
- **Capital recycled**: net refinance proceeds as a percentage of total cash invested.
- **Cash-on-cash return after the refinance**: annual cash flow after the new loan's payments ÷
  cash left in the deal, shown next to the **cash-on-cash return before the refinance** (annual
  cash flow with the current loan ÷ total cash invested).

When all the cash comes out (cash left is $0 or less), cash-on-cash is not a meaningful ratio, so
the page says **"All cash recovered"** and shows the **cash surplus** (the amount taken out beyond
what was invested) instead of a percentage.

**Why this priority**: "Cash left in deal" is the defining BRRRR number; without it the refinance
page is only a loan calculator.

**Independent Test**: The US1 reference deal: total cash invested **$96,000.00**; cash left in deal
**$19,374.70**; capital recycled **79.82%**. With rent of $2,800/mo, property tax $2,400/yr, insurance $1,200/yr
and the default reserves (annual net operating income **$22,272.00**):

- Before the refinance: annual debt service $12,773.76 (12 × $1,064.48), cash flow **$9,498.24**,
  cash-on-cash **9.89%**.
- After the refinance: annual debt service $18,203.52 (12 × $1,516.96), cash flow **$4,068.48**,
  cash-on-cash **21.00%** (on the $19,374.70 left in the deal).

With the ARV raised to $400,000 (new loan $300,000), net proceeds are **$136,625.30** and cash left
is **−$40,625.30**, so the page shows "All cash recovered" with a surplus of **$40,625.30**.

**Acceptance Scenarios**:

1. **Given** the reference deal, **When** the page renders, **Then** it shows the figures above.
2. **Given** a deal without rental inputs, **When** the page renders, **Then** cash invested is the
   down payment alone, and cash-on-cash shows "N/A" with the reason "Add rent to see cash-on-cash".
3. **Given** the post-refinance annual cash flow is negative, **When** the page renders, **Then**
   cash-on-cash is shown as a negative percentage, styled as a loss like other negative figures.
4. **Given** the net proceeds are negative (US1 scenario 3), **When** the page renders, **Then**
   cash left is larger than total cash invested and capital recycled is a negative percentage.

---

### User Story 3 - Rate drop: when do the savings pay back the closing costs? (Priority: P2)

A homeowner or investor with a seasoned loan wonders whether refinancing into a lower rate is
worth it. They switch the page to **Rate drop** mode. The loan being refinanced is the active
scenario's mortgage, paid off at the chosen refinance month, and the new loan is for the
remaining balance. They enter the **new interest rate**, **refinance closing costs** and,
optionally, a **new loan term** (default: the months remaining on the current loan, so the two
payments compare like for like).

The page compares **keeping** the current mortgage with **refinancing**:

- Current monthly P&I vs. new monthly P&I, and the **monthly P&I savings**.
- **Breakeven month**: the first month after the refinance in which the total P&I saved is at least
  the refinance closing costs, shown as a month count and as years and months, plus the same point
  as a month of the loan.
- **Net savings over the remaining term** of the current loan: total P&I saved − closing costs,
  minus any balance still owed on the new loan at that point (zero when the terms match).

**Why this priority**: It is a separate decision from BRRRR and works on any loan, but it builds on
the same refinance inputs and page, so it follows the core BRRRR flow.

**Independent Test**: $300,000 loan at 7% for 30 years (current P&I **$1,995.91**), refinancing at
month 60 to 5.5% over the remaining 300 months with $4,500 closing costs:

- Balance refinanced **$282,394.77**; new monthly P&I **$1,734.15**; monthly savings **$261.76**.
- Breakeven month **18** (17 months of savings total $4,449.92, which is under $4,500; 18 months
  total $4,711.68), shown as "1 yr 6 mo", loan month 78.
- Net savings over the remaining term **$74,028.00** (300 × $261.76 − $4,500; zero balance owed at
  the end).
- With a fresh 30-year term instead, new monthly P&I is **$1,603.41**, monthly savings **$392.50**
  and breakeven month **12**, and the page warns that part of the saving comes from stretching the
  loan.

**Acceptance Scenarios**:

1. **Given** the reference loan and inputs, **When** the page renders, **Then** it shows the
   figures above.
2. **Given** the new rate is not lower than the current rate (so savings are zero or negative),
   **When** the page renders, **Then** the breakeven shows "No breakeven" with the reason "The new
   payment is not lower than your current payment", and net savings are shown as negative.
3. **Given** the refinance closing costs are $0, **When** the page renders, **Then** the breakeven
   shows "Immediate".
4. **Given** the new term is longer than the months remaining, **When** the page renders, **Then**
   a note explains that the lower payment is partly from the longer term, and the net-savings figure
   still counts the balance owed on the new loan.
5. **Given** the savings never recoup the costs within the remaining term, **When** the page renders,
   **Then** the breakeven shows "Not within the loan term".

---

### User Story 4 - The refinance phase travels with the scenario (Priority: P3)

Each scenario keeps its own refinance phase. The investor can model a BRRRR refinance on one
scenario tab and a rate-drop on another, switch between them without losing inputs, and reload the
page in the same session and find everything as it was. Changing a shared input (price, loan, rehab,
rent) in the Deal Strip updates this page, and the refinance inputs are not lost when other pages
edit the scenario.

**Why this priority**: The "linked" behavior the description asks for. It makes the page feel part of
the app, but the calculators work without it.

**Independent Test**: Enter refinance inputs on scenario 1, add scenario 2 with different inputs,
switch back and reload; both scenarios show their own inputs and results.

**Acceptance Scenarios**:

1. **Given** two scenarios with different refinance inputs, **When** the user switches tabs, **Then**
   each shows its own inputs and results.
2. **Given** saved refinance inputs, **When** the page is reloaded in the same session, **Then** the
   inputs and the selected mode (Cash-out or Rate drop) are restored.
3. **Given** a session saved before this feature existed, **When** it loads, **Then** it loads
   normally and the refinance inputs start at their defaults.

---

### Edge Cases

- **Refinance month** is a whole month from 1 to the loan term. Out-of-range values are flagged
  inline and clamped for the calculation, with a visible note, like the exit month on `/sale`. At
  the loan term the payoff is $0.
- **Missing loan** (no principal or rate): the page shows the Deal Strip prompts instead of results.
- **Missing refinance inputs**: Cash-out mode needs an ARV and a new rate, and Rate-drop mode needs
  a new rate. Until they are entered, the page shows a prompt naming what to add instead of results.
- **Rate drop at the final month**: with no months remaining on the loan there is nothing to
  refinance, so Rate-drop mode shows "The loan is already paid off at this month".
- **Zero-rate loans** (current or new) compute without error.
- **Percentages out of range** (LTV, rates) show inline errors and never crash the page.
- **Extra payments** set up on the amortization page reduce the current loan's balance, so the
  payoff at the refinance month reflects them.
- **House-hacked / rent-roll deals** (spec 012): cash flow uses the same income view as the rental
  analysis for the active scenario.
- **Very large or very small amounts**: all figures stay readable and rounded to the cent.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST serve a new page at `/refinance` titled "Refinance & BRRRR Modeling",
  with a nav entry ("Refinance") alongside the other pages.
- **FR-002**: The page MUST use the spec 010 Deal Strip and share scenarios (including
  ScenarioTabs) with every other page.
- **FR-003**: The page MUST offer two modes, **Cash-out (BRRRR)** and **Rate drop**, chosen with a
  toggle, defaulting to Cash-out.
- **FR-004**: Cash-out mode MUST take ARV, refinance LTV (default 75%), new interest rate, new loan
  term (default 30 years), refinance closing costs and refinance month (default 12).
- **FR-005**: Cash-out mode MUST compute and show the US1 figures: new loan amount, payoff, closing
  costs, net refinance proceeds, new monthly P&I and the change from the current P&I.
- **FR-006**: Cash-out mode MUST compute and show the US2 figures: total cash invested, cash left in
  deal, capital recycled, and cash-on-cash before and after the refinance.
- **FR-007**: When cash left is $0 or less, the page MUST show "All cash recovered" and the cash
  surplus instead of a cash-on-cash percentage.
- **FR-008**: A negative net proceeds MUST be labelled as a cash-in refinance, with cash left and
  capital recycled computed from the same formulas.
- **FR-009**: Rate-drop mode MUST take the new rate, refinance closing costs, refinance month and an
  optional new term (default: the months remaining on the current loan), and refinance the current
  loan's remaining balance.
- **FR-010**: Rate-drop mode MUST compute and show the US3 figures: current and new monthly P&I,
  monthly savings, breakeven month (as a month count, years and months, and loan month) and net
  savings over the remaining term.
- **FR-011**: The breakeven month MUST be the smallest whole month in which cumulative P&I savings
  are at least the closing costs, with the "Immediate", "No breakeven" and "Not within the loan
  term" outcomes of US3.
- **FR-012**: A new term longer than the remaining months MUST show the explanatory note in US3.
- **FR-013**: Inputs shared with other pages (price, down payment, loan, rehab, closing costs, rent
  and expenses) MUST be read from the active scenario, not re-entered. Refinance inputs and the
  selected mode MUST be stored with the scenario.
- **FR-014**: New stored fields MUST be optional, and sessions without them MUST load with defaults.
- **FR-015**: All calculations MUST be pure library functions tested to the cent (Constitution I),
  and no data may leave the browser (Constitution III).
- **FR-016**: Invalid inputs MUST show inline errors and never crash the page. Valid ranges: ARV
  greater than $0; LTV 1–95%; rates 0–100%; refinance closing costs $0 or more; term 1–480 months;
  refinance month a whole number of 1 or more. A refinance month above the loan term is not an
  error: it is clamped to the term, with a visible note.
- **FR-017**: Every control MUST be keyboard-operable with correct labels, and the page MUST have no
  horizontal scroll at 375 px (Constitution IV).

### Key Entities _(include if feature involves data)_

- **Refinance phase**: the inputs stored with a scenario — selected mode, ARV, refinance LTV, new
  rate, new term, closing costs and refinance month. Optional on every scenario.
- **Cash-out result**: new loan, payoff, net proceeds, new P&I, total cash invested, cash left,
  capital recycled, and cash-on-cash before and after. Derived, never stored.
- **Rate-drop comparison**: current and new P&I, monthly savings, breakeven month and net savings.
  Derived, never stored.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every reference figure in US1–US3 is reproduced to the cent by automated tests.
- **SC-002**: For generated scenarios, cash left in deal equals total cash invested minus net
  refinance proceeds to the cent, and net proceeds equal new loan minus payoff minus closing costs.
- **SC-003**: For every generated rate-drop scenario, total savings at the breakeven month are at
  least the closing costs and total savings one month earlier are less.
- **SC-004**: Changing any input updates all figures within 1 second.
- **SC-005**: With a deal already in the Deal Strip, an investor can reach the cash-left figure in
  under 1 minute by entering only the ARV, the new rate and the refinance closing costs (the LTV,
  term and refinance month take their defaults).
- **SC-006**: The page has no horizontal scroll at 375 px and passes the existing axe checks.

## Assumptions

- **Which loan is refinanced**: the active scenario's mortgage, paid off at the refinance month
  from its amortization schedule (including any extra payments). A separate bridge or hard-money
  loan is out of scope; a user with one can model it by entering that loan's terms in the scenario.
- **Refinance month default of 12** and **new term default of 30 years** are common BRRRR
  assumptions (a seasoning period of about a year), and both are editable.
- **Cash invested** uses the rental analysis' definition: down payment + purchase closing costs +
  rehab budget, or the down payment alone without rental inputs.
- **Monthly P&I is the cents-rounded payment** a lender would bill, as everywhere else in the app,
  so annual debt service is 12 × that payment and the breakeven uses the displayed savings.
- **Cash flow after the refinance** is the deal's annual net operating income from the rental
  analysis (first-year figures, no growth applied) minus the new loan's annual P&I. A BRRRR
  refinances within about a year, so growth through the refinance month is ignored. Taxes,
  insurance and other operating costs are unchanged by the refinance.
- **PMI**: the new loan is assumed to carry none (the 95% LTV limit is a sanity bound, not a PMI
  proxy, and PMI on the new loan is not modeled). The original loan's PMI stops when it is paid off.
- **Refinance closing costs are paid in cash**; rolling them into the new loan is out of scope. They
  are separate from the purchase closing costs in the rental inputs, which count toward cash invested.
- **"Repeat"** in BRRRR is not modeled. The page shows how much capital is freed (cash left and
  capital recycled) so the investor can judge what is available for the next deal.
- **Rate-drop breakeven** is a simple payback on monthly P&I savings, ignoring the time value of
  money and any tax effects, and is not tax or lending advice. The page carries a short
  "Simplified model, not financial advice" note like `/sale`.
- **Dependencies**: reuses the existing amortization schedule, rental analysis (cash invested and
  net operating income), Deal Strip, scenarios and session storage.
