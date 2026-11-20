# Research: Refinance & BRRRR Modeling

No `NEEDS CLARIFICATION` items remain. Each decision below was checked against the real code, and
the reference figures in the spec and contracts were computed with the workspace's own engine (a
throwaway test, deleted afterwards), not by hand.

## R1 — Where the refinance inputs are stored

**Decision**: A new optional scenario-level `LoanScenario.refinance?: RefinanceAssumptions | null`,
written through a new `editRefinance(patch, source)` on `DealEditsProvider`. It follows the spec 013
`sale` pattern exactly: a `'refinance'` `ChangeField`, a shallow merge in `applyScenarioPatch`, an
undo branch that blanks every current key before restoring the old value, and a toast title
("Refinance inputs changed").

**Rationale**: The page must work without a rental (rate-drop works on any loan), so the inputs
cannot live under `rental`. A scenario-level field travels with the scenario, so ScenarioTabs,
undo and the change toast all work, which is what "linked refinance phase" means in the spec.
Stored sessions are parsed with `JSON.parse` and unknown keys pass through, so no migration is
needed and old sessions load with defaults (FR-014).

**Alternatives considered**:

- Reuse `scenario.sale`: rejected. A refinance and a sale are different phases; mixing them would
  make one patch able to corrupt the other, and the undo record would be ambiguous.
- A generic "scenario section" helper replacing both `sale` and `refinance` wiring: the better
  long-term shape, but it changes spec 013's working code. Left as a follow-up (plan, Constitution
  Check note).
- Keep refinance inputs in React state only: rejected. They would be lost on reload and on tab
  switch (US4).

## R2 — Which loan is refinanced, and its payoff

**Decision**: The active scenario's mortgage. The payoff at refinance month `m` is
`schedule.periods[m − 1].remainingBalance`, or `0` when `m` is past the last period. The refinance
month is clamped to `1…termMonths`.

**Rationale**: The schedule already honors extra payments (spec 001), and it is what `/sale` uses
for its remaining balance, so the two pages agree. The closed-form `remainingBalance` in `loan-math`
ignores extra payments, so it is not used for the current loan. I checked that the schedule's
rounded balance and the closed form agree to the cent when there are no extras: both give
$158,374.70 for the reference deal at month 12.

**Alternatives considered**: A separate "existing loan" input set (hard-money or bridge loan):
rejected as scope creep (spec Assumptions). A user can enter that loan as the scenario's loan.

## R3 — Payment rounding

**Decision**: Monthly P&I for the new loan is `roundCents(monthlyPayment(principal, rate, term))`,
the same rounding `computeSchedule` applies to `summary.monthlyPrincipalAndInterest`. Annual debt
service is `12 × the rounded payment`, as `analyzeDeal` does. The breakeven uses the displayed
(rounded) monthly savings.

**Rationale**: A lender bills a payment in cents, and every other page shows the cents-rounded
payment, so the figures a user can recompute by hand (12 × $1,516.96 = $18,203.52) match what the
page shows. My first hand calculation used unrounded payments and was off by pennies
(e.g. $18,203.56), which is exactly the discrepancy this decision avoids.

**Alternatives considered**: Unrounded payments throughout: rejected, because displayed numbers
would not add up. Rounding only for display: rejected for the same reason.

## R4 — Modeling the new loan without a second schedule

**Decision**: Use `monthlyPayment` and `remainingBalance` from `shared-calculations/loan-math` for
the new loan. Do not build a synthetic `LoanScenario` and `computeSchedule` for it in production
code.

**Rationale**: Only two numbers are needed from the new loan: its monthly payment, and (rate-drop
only) its balance at the end of the horizon. Both are closed forms. Constitution I is still met:
the tests cross-check these closed forms against `computeSchedule` run on a synthetic loan.

## R5 — Cash invested and cash-on-cash before the refinance

**Decision**: With a rental, `totalCashInvested = analyzeDeal(...).totalCashInvested` and
cash-on-cash before = `analyzeDeal(...).cashOnCashReturn`, so they equal `/deal-analyzer` to the
cent. Without a rental, cash invested is `roundCents(downPaymentDollars(scenario))` and
cash-on-cash is "N/A" with the reason "Add rent to see cash-on-cash".

**Rationale**: One definition of cash invested across the app (the same choice `/sale` made). It
includes the rehab budget and purchase closing costs, which are the shared rental fields a BRRRR
investor already uses.

## R6 — Cash flow after the refinance

**Decision**: `annual cash flow after = netOperatingIncome.annual (from analyzeDeal) −
12 × new monthly P&I`. No PMI is added. No growth is applied.

**Rationale**: A BRRRR refinances within about a year, so first-year income is the honest basis, and
it keeps the "before" and "after" figures comparable (same income, different debt). The new loan is
assumed to have no PMI (spec Assumptions). House-hacked deals follow whichever income view the
rental analysis shows (spec 012), because NOI comes from `analyzeDeal`.

**Alternatives considered**: Applying rent and expense growth through the refinance month (as
`/sale` does for cumulative cash flow): rejected. For a refinance at month 12 the effect is one
year of growth, and it would make "before" and "after" no longer share an income basis.

## R7 — Capital recycled and "All cash recovered"

**Decision**: `cashLeft = roundCents(totalCashInvested − netProceeds)`. `capitalRecycledPct =
netProceeds / totalCashInvested` ("N/A" when cash invested is $0 or less). When `cashLeft ≤ 0` the
result is `allCashRecovered: true` with `cashSurplus = −cashLeft`, and cash-on-cash after is
"N/A" with the reason "All cash recovered". A negative `netProceeds` is a cash-in refinance: the
same formulas apply, `cashLeft` exceeds cash invested and `capitalRecycledPct` is negative.

**Rationale**: Cash-on-cash divides by cash left, which is zero or negative once everything is
back, so the ratio is meaningless there. This is the standard BRRRR presentation ("infinite
return"), shown as plain text.

## R8 — The breakeven month

**Decision**: Work in integer cents. With `savingsCents = round(currentPi × 100) − round(newPi ×
100)` and `costsCents = round(closingCosts × 100)`:

- `savingsCents ≤ 0` → no breakeven ("The new payment is not lower than your current payment"),
  checked first so a higher payment is never reported as "Immediate" just because the costs are $0.
- `costsCents == 0` → breakeven month `0`, shown "Immediate".
- otherwise `breakeven = ceil(costsCents / savingsCents)`, the smallest whole month in which
  cumulative savings are at least the costs. If it exceeds the months remaining on the current
  loan, the outcome is "Not within the loan term".

The loan month shown is `refinanceMonth + breakeven`.

**Rationale**: The spec asks for the exact month. Integer-cent `ceil` avoids floating-point error at
the boundary, where (for example) `4,500.00 / 250.00` must be exactly 18, not 18.000000001. The
tests cross-check it against a brute-force month-by-month loop.

**Alternatives considered**: `ceil(costs / savings)` in floating point: rejected for the boundary
risk above. Discounting future savings (a time-value breakeven): out of scope, and a spec
Assumption says the breakeven is a simple payback.

## R9 — The comparison horizon and the "new term" default

**Decision**: The default new term in rate-drop mode is the months remaining on the current loan
(`termMonths − m`), so the two payments compare like for like. A stored `newTermMonths` overrides
it. The horizon for net savings is always the remaining months of the current loan. A longer new
term shows the spec's explanatory note.

**Rationale**: Comparing a 25-year payment against a fresh 30-year payment makes a refinance look
better than it is, because part of the saving is just a longer loan. Defaulting to the remaining
term makes the headline number honest, and the note covers the case where the user chooses
otherwise. In cash-out mode the default is 30 years (spec).

## R10 — Net savings over the remaining term

**Decision**: Over the horizon `H` = the months remaining on the current loan:

`netSavings = currentPi × H − newPi × min(H, newTerm) − closingCosts − balanceOwed`

where `balanceOwed = roundCents(remainingBalance(newPrincipal, newRate, newTerm, H))` when
`newTerm > H`, and `0` otherwise. When the terms match this is `savingsMonthly × H − closingCosts`;
for the reference loan, `300 × $261.76 − $4,500 = $74,028.00`.

**Rationale**: When the new term is longer, the new loan still has a balance at the end of the
horizon; ignoring it would count that debt as savings. When the new term is shorter, the new loan
stops paying early, so only `newTerm` of its payments are counted. The breakeven (R8) considers
the months in which both loans are still being paid, which is the only realistic case, since a
shorter term normally raises the payment and gives no savings at all.

## R11 — Inputs the page edits, and where they write

**Decision**:

| Input                                                                                       | Written through                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Mode, ARV, LTV, new rate, new term (and its unit), refinance closing costs, refinance month | `editRefinance` (scenario-level)                                                            |
| Rehab budget, purchase closing costs                                                        | `editDeal('rental.rehabBudget' \| 'rental.closingCosts', …)` (shared with `/deal-analyzer`) |
| Price, down payment, loan, rate, term, rent                                                 | The Deal Strip (existing)                                                                   |

The rehab and purchase-closing inputs are shown only when the scenario has a rental. Without one,
a hint says "Add rent to include rehab and closing costs in cash invested".

**Rationale**: A BRRRR investor must be able to set rehab on this page, because cash left depends on
it. Writing the shared fields means `/deal-analyzer` and this page agree, and undo works.

## R12 — Validation, clamping and "missing input" behavior

**Decision**: Ranges are in `data-model.md` §A. Out-of-range values show inline errors and block
results. A refinance month past the loan term is clamped, not an error, with a visible note (like
`/sale`'s `clampedFrom`). Missing required inputs show a prompt, not an error: ARV and new rate in
cash-out mode, new rate in rate-drop mode. In rate-drop mode a refinance month equal to the loan
term shows "The loan is already paid off at this month".

**Rationale**: Reuses the `/sale` behaviors users already know, and keeps "not entered yet" visually
distinct from "entered wrongly".

## R13 — Route, nav, profile and headline

**Decision**: Route `/refinance`, nav entry "Refinance" with a new `RefreshIcon` (two circular
arrows), `pageId: 'refinance'`, and a `REFINANCE_PROFILE` pinning price, down payment and rate and
listing rent as an optional unlock ("cash-on-cash"). The Deal Strip headline follows the mode:
Cash-out shows "Cash left in deal" (lower is better, currency); Rate drop shows "Breakeven" in
months (lower is better).

**Rationale**: Matches how `/sale` and `/pro-forma` plug into the Deal Strip, so the strip, sheet and
undo toast behave the same on every page.

## R14 — Test strategy (Constitution I)

**Decision**:

- **Reference vectors** (contracts): the BRRRR deal, the all-cash-out, cash-in and negative-proceeds
  variants, and the rate-drop loan at month 60, each to the cent.
- **Invariants over generated scenarios**: `net = newLoan − payoff − closing`; `cashLeft = invested −
net`; breakeven `b` satisfies `b × savings ≥ costs > (b − 1) × savings` (checked against a
  brute-force loop); cash invested and cash-on-cash before equal `analyzeDeal`.
- **Cross-checks**: new payment and balance equal `computeSchedule` on a synthetic loan to the cent.
- **Boundaries**: LTV 1 and 95, month 1 and the loan term, zero rate, zero closing costs, equal
  rates, a very long breakeven.
- **UI**: jsdom for `editRefinance` and its undo; Playwright for the page, run against a production
  build on a free port so it cannot silently test another checkout's server.
