# Research: Multi-Year Hold & Exit Pro Forma

**Feature**: `009-hold-exit-pro-forma` · **Date**: 2026-11-17

The Technical Context has no NEEDS CLARIFICATION items. The stack, storage and testing all follow
features 001–008. The decisions below settle the finance and design choices.

## R1. Build on `projectWealth` (spec 008)

- **Decision**: `projectExit(scenario, schedule, holdYears?)` calls
  `projectWealth(scenario, schedule, { horizonYears: hold })`. That is a new optional third
  parameter, which overrides the stored horizon and skips its validation. `projectExit` takes
  value, balance, NOI, interest, depreciation and tax effect from those rows.

  Gross income, operating expenses and scheduled debt service come from `projectRental` while
  within the loan term. Past the term, they come from a small internal helper, `operatingYear`,
  extracted from `projectWealth`'s past-term branch so both use it. For those years debt service
  is 0.
- **Rationale**: There is one definition of an operating year across specs 005, 008 and 009
  (Principle I), so the Deal Analyzer, Wealth Projection and Pro Forma pages cannot disagree.
- **Alternatives**: Calling `projectWealth` on a scenario copy with `wealth.horizonYears` patched
  was rejected. It works, but it hides intent and would trip over a stored invalid horizon on
  `/wealth`.

## R2. Cash to investor counts extra principal

- **Decision**: `cashToInvestor(n) = cashFlow(n) − extraPrincipal(n)`, where
  `extraPrincipal(n) = Σ schedule.periods[year n].extraPrincipalApplied` and `cashFlow` is spec
  005's (NOI − scheduled debt service).
- **Rationale**: IRR and the equity multiple must count every dollar the investor pays. Extra
  principal is cash out that comes back only through a lower payoff at sale. Leaving it out would
  overstate IRR.
- **Verified**: Adding a recurring $500 extra payment lowers 7-year IRR from 15.66% to 14.82%,
  while the payoff drops from $273,442.24 to $219,442.75.

## R3. Sale

- **Decision**: `salePrice = propertyValue(N)`, which includes shared forced appreciation.
  `sellingCosts = roundCents(salePrice × pct/100)`, `payoff = loanBalance(N)` and
  `netSaleProceeds = roundCents(salePrice − sellingCosts − payoff)`.
- **Rationale**: This is the description's model: selling costs of 6–8% plus the remaining loan
  payoff. A single percentage covers commissions, transfer taxes and closing.

## R4. IRR solver

- **Decision**: Bracket and bisect on NPV(r) over r ∈ [−0.99, 10]. Return null when cash invested
  ≤ 0, or when NPV(−0.99) and NPV(10) have the same sign. Otherwise iterate to |hi − lo| < 1e-10
  (at most 200 iterations). It is exported as `irr(cashFlows): number | null` from a new
  `irr.ts`.
- **Rationale**:
  - The cash flows always start negative. With only one sign change there is exactly one real
    root in that bracket (Descartes' rule of signs), and bisection is guaranteed to converge.
  - Newton's method can diverge on skewed flows.
  - Ten iterations of slack keep NPV at the root within a cent (SC-005).
- **Alternatives**: Newton with a bisection fallback, which is faster but has more code paths to
  test. A library was rejected because the constitution prefers pure in-house math.
- **Tests**: standard textbook vectors, such as `[-100, 110]` → 0.10 and
  `[-1000, 300, 400, 500]` → 0.0889633947. Also the all-positive case → null and the reference
  table.

## R5. Totals and multiple

- **Decision**:
  - `totalNetProfit = ΣCF + netSaleProceeds − invested`
  - `equityMultiple = (ΣCF + netSaleProceeds) / invested`

  After-tax versions use `afterTaxCF = cashToInvestor + taxEffect` with the same pre-tax proceeds.
- **Rationale**: These are the standard pro forma definitions. Leaving sale tax out is explicit
  and labelled (spec Assumptions).

## R6. Hold comparison

- **Decision**: `compareHolds(scenario, schedule, holds = [5, 7, 10, chosen])` runs `projectExit`
  for each unique hold. The cost is negligible: at most 4 × 30 years of arithmetic.
- **Rationale**: The description asks for "Year 5, 7, or 10", and seeing all three together
  answers "when should I sell?" directly.

## R7. Persistence and placement

- **Decision**: Add an optional `RentalAssumptions.exit?: { holdYears?; sellingCostsPct? }`, with
  defaults 7 and 7. Land share and tax rate come from `rental.wealth` (shared with `/wealth`).
  - Route: `/pro-forma`, using `ProFormaView` from `deal-analyzer-ui`.
  - Nav: "Hold & Exit", with a new `KeyIcon`.
  - Growth inputs: rendered in the page's assumptions panel, with `RentalInputsPanel hideGrowth`
    (the spec 008 pattern).
  - "Use example rates" writes `{ rentGrowthPct: 3, expenseGrowthPct: 2.5, appreciationPct: 3.5 }`.

## Reference scenario (spec, contracts and tests)

The spec 006 property:
- $400k price, 25% down ($100k invested), 7% for 30 years
- tax $4,800 and insurance $1,800
- rent $3,800 with default reserves

The assumptions are rent growth 3%, expense growth 2.5%, appreciation 3.5%, selling costs 7%,
land 20% and tax rate 24%. These figures were produced with the workspace's real `computeSchedule`
and `projectWealth` on 2026-11-17.

| Hold | Sale price | Selling costs | Payoff | Net proceeds | ΣCF | Profit | Multiple | IRR | ΣATCF | Profit AT | Multiple AT | IRR AT |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 475,074.52 | 33,255.22 | 282,394.77 | 159,424.53 | 31,968.01 | 91,392.54 | 1.9139 | 0.149577 | 34,034.01 | 93,458.54 | 1.9346 | 0.153722 |
| 7 | 508,911.71 | 35,623.82 | 273,442.24 | 199,845.65 | 51,574.90 | 151,420.55 | 2.5142 | 0.156607 | 52,372.08 | 152,217.73 | 2.5222 | 0.158780 |
| 10 | 564,239.50 | 39,496.77 | 257,437.15 | 267,305.58 | 89,068.22 | 256,373.80 | 3.5637 | 0.157063 | 85,403.93 | 252,709.51 | 3.5271 | 0.157015 |

In year 1, cash to investor is $4,561.08 and after-tax cash flow is $5,527.75. Year-1
depreciation is $11,636.36 and interest is $20,903.45.

With a recurring $500/mo extra payment and a 7-year hold:
- payoff $219,442.75, net proceeds $253,845.14
- ΣCF $9,574.90, profit $163,420.04, multiple 2.6342, IRR 0.148243
- year-1 cash to investor −$1,438.92
