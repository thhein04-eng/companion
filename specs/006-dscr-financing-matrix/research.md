# Research: DSCR & Financing Matrix

**Feature**: `006-dscr-financing-matrix` · **Date**: 2026-11-17

The Technical Context had no open NEEDS CLARIFICATION items: the stack, storage and testing all come
from the existing workspace. The research below settles the domain and design choices the spec
leaves to planning.

## R1. DSCR formula and denominator

- **Decision**: `dscr = annualNoi / (monthlyPI × 12)`. `annualNoi` is `DealAnalysis.netOperatingIncome.annual`.
  `monthlyPI` is the cents-rounded scheduled payment (`schedule.summary.monthlyPrincipalAndInterest`
  for the scenario, and the option's own payment in the matrix). Pass/fail compares the unrounded
  ratio with the minimum.
- **Rationale**: This is the formula the user gave (NOI / annual P&I). Using steady monthly P&I × 12,
  not the partial year-one sum `analyzeDeal` uses for cash flow, keeps DSCR a true coverage ratio
  for loans shorter than 12 months. It also makes extra payments irrelevant, since lenders size
  against the scheduled payment. Taxes, insurance and HOA already sit in NOI, so putting them in the
  denominator as well would count them twice.
- **Alternatives considered**: (a) Gross rent ÷ PITIA, used by many DSCR lenders. It is a
  different number from what the user asked for, so it is noted as out of scope in the spec. (b)
  Including PMI in the denominator. PMI is not P&I, and DSCR loans have none, so including it would
  make the three columns inconsistent.

## R2. Minimum DSCR: range, default, presets

- **Decision**: Default 1.25. The editable range is 1.00–2.00 in 0.01 steps, with presets 1.15,
  1.20 and 1.25 (a segmented control next to a number input). One value is stored per scenario.
- **Rationale**: The user cited 1.15–1.25 as the typical lender range, and 1.25 is the conservative
  end, so it is the safest default. Values below 1.00 mean negative coverage, which no lender
  accepts. Above 2.00 is outside any real program.
- **Alternatives**: A global (not per-scenario) minimum. This was rejected because scenarios often
  model different lenders. A fixed 1.25 was rejected because the user explicitly gave a range.

## R3. "Rent needed for minimum DSCR"

- **Decision**: Solve `NOI(rent) = min × annualPI` for monthly gross rent. NOI is linear in rent:
  `noiMonthly = (rent + other) × (1 − p) − fixed`. Here `p` is the sum of the percentage-of-income
  lines (vacancy, management, maintenance, capex, as fractions of GSI) and `fixed` is the monthly
  tax + insurance + HOA + custom expenses. So
  `rent = (min × annualPI / 12 + fixed) / (1 − p) − other`. The result is N/A when `p ≥ 1`. It is
  floored at 0 (a property already covered by other income needs no rent).
- **Rationale**: This tells the investor what to do when the property is flagged red, which is what
  "if the rent doesn't cover…" points to. The inputs come from `rentalLineItems`, so this function
  shares its expense definitions with `analyzeDeal` and cannot drift from it.
- **Verified**: For the reference scenario (fixed = $550, p = 0.23, P&I $1,995.91) the result is
  $3,954.40, and NOI at that rent gives DSCR = 1.2500.

## R4. ARM payment model

- **Decision**: The initial payment is the standard fully-amortizing payment at `initialRatePct`
  over `termMonths`. The balance after `fixedMonths` comes from the closed form
  `B_k = P(1+i)^k − PMT((1+i)^k − 1)/i` (or `P − PMT·k` at 0%). The post-reset payment re-amortizes
  `B_k` at `adjustedRatePct` over `termMonths − fixedMonths`. Money is cents-rounded at the output
  boundary only.
- **Rationale**: This is the standard "fully indexed rate after reset" what-if, and it is exact.
  The closed form avoids building a 360-row schedule for each matrix render.
- **Alternatives**: Index + margin with periodic and lifetime caps, and annual resets. That is far
  more input than the matrix's question needs, so it is out of scope (spec Assumptions). Another
  option was reusing `computeSchedule` with a rate-change rule, but that would widen a core
  scenario type for a what-if.
- **Verified**: $300,000 at 6.5% for 360 months gives P&I $1,896.20. The balance after 84 months is
  $271,248.73. Re-amortized at 8.5% over 276 months, the payment is $2,240.75.

## R5. Payment formula reuse

- **Decision**: Move the private `fixedPayment` out of `compute-schedule.ts` into a new exported
  `shared-calculations` module, `loan-math.ts`, with `monthlyPayment(principal, annualRatePct,
  termMonths)` (unrounded) and `remainingBalance(principal, annualRatePct, termMonths,
  afterPeriods)`. `computeSchedule` imports it, and its behavior does not change.
- **Rationale**: There is one source of truth for the payment formula. The existing
  `compute-schedule.spec.ts` acts as the regression guard (constitution Principle I).
- **Alternatives**: Duplicating the formula in `deal-analyzer-calculations`. That was rejected
  because two copies of the core formula can drift apart.

## R6. PMI in the matrix

- **Decision**: For the Conventional and ARM options only: if the option's LTV (loan ÷ price) is
  above 0.80 and the scenario has `pmiAnnualRatePct`, monthly PMI = `rate/100 × loan / 12`. It is
  shown as a flat year-one figure and subtracted from cash flow. DSCR loans never carry PMI.
- **Rationale**: This mirrors `computeSchedule`'s PMI amount, so for an untouched conventional
  option the cash flow matches `analyzeDeal` whenever PMI does not drop off during year one (spec
  SC-005). Modelling the in-year drop would mean running a schedule per option for an edge case
  that is very rare at a 30-year term.

## R7. Defaults and the "follow the scenario until edited" rule

- **Decision**: `RentalAssumptions.financing` is optional. While it is absent, `resolveFinancingTerms`
  derives the terms from the scenario on every render (spec FR-009), so they follow the loan
  inputs. The first edit to any term materializes and stores all three options, which detaches
  them. "Reset to defaults" removes the stored terms but keeps the minimum DSCR and the selected
  option.
- **Rationale**: This is the same pattern as `principalIsOverridden` (spec 001 FR-014). Users
  already know it: defaults stay live until you take ownership of them.
- **Data split**: The minimum DSCR and the selected structure are stored separately from the terms
  (`dscrMinimum`, `financingSelection`), so a reset and an untouched matrix never fight over them.

## R8. Toggle and responsive matrix UI

- **Decision**: `@ui-sdk/react/segmented-control` for the structure toggle and for the DSCR-minimum
  presets. It provides a single tab stop, arrow keys, and radio semantics. The matrix is a semantic
  `<table>` with one column per structure. The selected column's header cell has
  `aria-current="true"` and gets a highlighted background. Below the `sm` breakpoint, only the
  selected column is rendered as a definition list, so the page never scrolls horizontally. Edits
  use the existing `NumberField` from `shared-ui`, and the ARM fixed period uses the existing
  `@ui-sdk/react/select` usage pattern.
- **Rationale**: This follows constitution Principle IV (SDK behavior, not hand-rolled ARIA), and
  the SDK has a segmented control built exactly for "pick one of a few views". A table is the
  correct semantic for a comparison matrix.
- **Alternatives**: Tabs, rejected because tabs hide the other columns, and the point is to compare.
  Radio cards, which give the same semantics as a segmented control but with more custom styling.

## R9. Red flagging and color

- **Decision**: Generalize the existing `RuleIndicator` into a status pill shared by the rules and
  the DSCR. `fail` uses the existing red tokens (`bg-red-50 text-red-800 border-red-300`) with the
  ✕ icon and the text "Below 1.25× minimum". Matrix DSCR cells use the same pill. A DSCR < 1.00 adds
  a line of text, so the status is never conveyed by color alone.
- **Rationale**: This keeps the visuals consistent with the 1% and 50% rules the investor already
  reads, and meets the accessibility requirement (SC-004).

## R10. Where the code lives

- **Decision**: Pure math goes in `deal-analyzer-calculations`: `dscr.ts`, `financing.ts` (defaults
  and resolution), `financing-matrix.ts` and `validate-financing.ts`. The UI goes in
  `deal-analyzer-ui`: `dscr-card.tsx`, `financing-matrix.tsx`, `financing-terms-editor.tsx` and
  `use-financing-editor.ts`. The shared payment math goes in `shared-calculations` (R5). The
  persisted types are added to `shared-calculations/types.ts` next to `RentalAssumptions`, because
  that is where the stored shape is defined. No new Nx projects.
- **Rationale**: Constitution Principle II (thin apps, fat libs) and the existing feature-lib
  boundaries. The app's `/deal-analyzer/page.tsx` does not change, because `DealAnalyzerView`
  composes the new sections.

## R11. Validation

- **Decision**: `validateFinancing(terms, dscrMinimum)` returns `FieldError[]` keyed
  `rental.financing.<option>.<field>` and `rental.dscrMinimum`. The rules are: rate 0–25; down
  payment 0 ≤ x < 100; term an integer 1–40 years; ARM fixed period ∈ {3, 5, 7, 10} and < term;
  minimum 1.00–2.00. An invalid minimum hides the DSCR status but not the ratio. An invalid option
  blanks only that column. None of these errors feed `validateRental`, so the existing analysis is
  never blocked (spec FR-011).
- **Rationale**: This matches the existing separation between `validateScenario` and
  `validateRental` (spec 002 FR-015).

## R12. Persistence and old sessions

- **Decision**: All new fields are optional on `RentalAssumptions`. `deserializeScenarios` does not
  change: absent fields resolve to defaults at read time. Malformed stored values surface as
  validation errors and are not silently dropped, which is consistent with how the existing rental
  fields behave.
- **Rationale**: There is no migration, and it follows the precedent from spec 005 (R14) for the
  growth fields.

## Reference scenario (used in spec, contracts and tests)

Inputs: price $400,000. Down payment 25% (loan $300,000). Rate 7.0%, 360 months. Tax $4,800/yr.
Insurance $1,800/yr. No PMI or HOA. Rent $3,800/mo. Default reserves (5/8/5/5%), closing costs
and rehab both $0.

NOI is $2,376.00/mo, or $28,512.00/yr. Cash invested is $100,000 for every option, since all
three use 25% down.

| Option | Monthly P&I | Annual P&I | DSCR | Cash flow /mo | Rent for 1.25× |
|---|---|---|---|---|---|
| Conventional 7.0% / 30y | 1,995.91 | 23,950.92 | 1.1904 ✕ | 380.09 | 3,954.40 |
| ARM initial 6.5% (7/1) | 1,896.20 | 22,754.40 | 1.2530 ✓ | 479.80 | 3,792.53 |
| ARM after reset 8.5% (yrs 8–30) | 2,240.75 | 26,889.00 | 1.0604 ✕ | 135.25 | 4,351.87 |
| DSCR loan 8.0% / 30y | 2,201.29 | 26,415.48 | 1.0794 ✕ | 174.71 | 4,287.81 |

At a 1.15× minimum, the conventional option passes, and the rent it needs is $3,695.19.
