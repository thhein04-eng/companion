# Contract: Refinance page UI

## Route and navigation

- `/refinance`, page title "Refinance & BRRRR Modeling", metadata description "Cash-out refinance
  proceeds, cash left in the deal, post-refinance cash-on-cash and the rate-drop breakeven month."
- Nav entry: id `refinance`, label "Refinance", `RefreshIcon`, after "Sale Profit".
- The page renders `RefinanceView` and nothing else (Constitution II).

## Layout (top to bottom)

1. **Deal Strip** with `REFINANCE_PROFILE`. Headline: Cash-out → "Cash left in deal" (currency);
   Rate drop → "Breakeven" (e.g. "18 mo", or the N/A text).
2. **PageHeader**: eyebrow "Analysis", title "Refinance & BRRRR Modeling", lede "Refinance
   after the rehab, or chase a lower rate. See the cash left in the deal and when a lower rate pays
   for itself.", note "Simplified model, not financial advice."
3. **Mode toggle** ("Refinance mode"): "Cash-out (BRRRR)" / "Rate drop". Radio semantics.
4. **Assumptions** section (inputs for the active mode, see below).
5. **Result** section: the summary for the active mode, or an `InputsMessage` with the reason.
6. A closing link to Hold & Exit (as `/sale` does).

## Inputs

| Label                    | Mode     | Kind                         | Notes                                                                             |
| ------------------------ | -------- | ---------------------------- | --------------------------------------------------------------------------------- |
| After-repair value (ARV) | Cash-out | Currency                     | Prompt when empty.                                                                |
| Refinance LTV            | Cash-out | %                            | Default 75.                                                                       |
| New interest rate        | Both     | %                            | Prompt when empty.                                                                |
| New loan term            | Both     | Number + Years/Months toggle | Placeholder shows the mode's default.                                             |
| Refinance closing costs  | Both     | Currency                     | Default $0.                                                                       |
| Refinance month          | Both     | Number, always in months     | Clamp note when above the term. Label: "Refinance month (months after purchase)". |
| Rehab budget             | Cash-out | Currency                     | Shared with `/deal-analyzer`. Only with a rental.                                 |
| Purchase closing costs   | Cash-out | Currency                     | Shared with `/deal-analyzer`. Only with a rental.                                 |

All numeric inputs use the existing `NumberField`, so typed values keep their exact precision. With
no rental, a hint replaces the rehab and purchase-closing inputs: "Add rent to include rehab and
closing costs in cash invested."

## Cash-out result (`cash-out-summary.tsx`)

Rows, in order, each with a test id `refi-<name>`:

- New loan · Payoff of current loan · Refinance closing costs · **Net proceeds** (labelled "Cash-in
  refinance" with a "You bring cash to close" note when negative)
- Monthly P&I: current → new, and the change
- **Cash left in deal** · Total cash invested · **Capital recycled** (%)
- Cash-on-cash: before → after, or "All cash recovered" with "Cash surplus $X", or the N/A reason

## Rate-drop result (`rate-drop-summary.tsx`)

- Monthly P&I: current vs new, and **Monthly savings**
- **Breakeven**: "Month 18 (1 yr 6 mo) · loan month 78", or "Immediate", "No breakeven" + reason,
  "Not within the loan term"
- **Net savings over the remaining term**, with the note about the balance still owed when the new
  term is longer ("Part of this saving comes from the longer term")

## Test ids

`refinance-mode`, `refinance-inputs`, `refi-new-loan`, `refi-payoff`,
`refi-closing`, `refi-net-proceeds`, `refi-cash-left`, `refi-recycled`, `refi-coc-before`,
`refi-coc-after`, `refi-pi-current`, `refi-pi-new`, `refi-savings`, `refi-breakeven`,
`refi-net-savings`, `refinance-na`.

## States

- **Missing input**: a prompt that names the field ("Enter an after-repair value to model a
  refinance."), shown through `InputsMessage`.
- **Invalid input**: inline field errors; the result area shows "Fix the refinance inputs to see
  the result."
- **Invalid loan or rental**: the Deal Strip's usual messages; the result area shows "Fix the loan
  inputs to see the result." / "Fix the rental inputs to see the result."

## Accessibility and responsive behavior

- Every control has a visible label and is keyboard-operable (Constitution IV). The mode toggle uses
  `SegmentedOptions` (radio semantics, one tab stop, arrow keys).
- Results are text. Negative figures and "Cash-in refinance" carry words, not only colour.
- No horizontal scroll at 375 px; the inputs stack in one column below the `sm` breakpoint, and the
  page passes the existing axe check.
