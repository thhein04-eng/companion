# Quickstart & Validation: Amortization Charts

**Feature**: `005-amortization-charts` · Worktree: `.claude/worktrees/005-amortization-charts`

## Prerequisites

- Node 20.9+ and npm 11 (the workspace `packageManager`).
- Run from the worktree root, then `npm install`. This links the new `@companion/charts`
  workspace package.
- Make sure `npx nx show projects` lists `charts` next to the existing four projects.

## 1. Automated checks (all must pass)

```bash
npx nx run-many -t lint test -p charts amortization-calculations amortization-ui amortization-calculator
npx nx e2e amortization-calculator-e2e
```

| Expectation | Where it is specified |
|---|---|
| Builder cent-accuracy tests for R1–R4 pass | [contracts/amortization-chart-data.md](contracts/amortization-chart-data.md) |
| `projectRental`, growth validation and old-session tests pass, and `analyze-deal.spec.ts` passes unchanged | [contracts/rental-chart-data.md](contracts/rental-chart-data.md) |
| Generic chart render tests pass with non-amortization fixtures | [contracts/charts-api.md § Conformance](contracts/charts-api.md) |
| New e2e spec `charts.spec.ts` passes | Scenarios 3–7 below |
| Existing e2e specs (`deal-analyzer`, `validation-and-persistence`, …) still pass | Regression check for the growth inputs |

## 2. Reuse and boundary checks (SC-003)

```bash
npx nx graph --print | grep -A5 '"charts"'   # charts must list no amortization-* deps
```

- Temporarily add `import 'amortization-calculations'` to any file in `libs/charts/src`.
  `npx nx lint charts` **must fail** with an `enforce-module-boundaries` / `scope:shared` error.
  Then revert the change.
- Temporarily add `import { linePath } from '@companion/charts/src/lib/paths'` in the app.
  Lint or typecheck **must fail** because of the deep import. Then revert the change.

**Verified on 2026-11-17 (T042):**
- `nx graph`: `charts` has no dependencies; `amortization-ui` → `amortization-calculations`, `charts`.
- Importing `amortization-calculations` from `libs/charts` fails `nx lint charts`: "A project
  tagged with "scope:shared" can only depend on libs tagged with "scope:shared""
  (`@nx/enforce-module-boundaries`).
- A deep import of `@companion/charts/src/lib/paths` from the app passes lint but fails
  typecheck (`TS2307: Cannot find module`), because the package `exports` map exposes only `.`
  and `./theme.css`.

## 3. Balance chart (User Story 1)

`npx nx dev amortization-calculator`, then open http://localhost:3000.

1. Enter $300,000, 6.5%, 360 months. You should see a "Remaining balance" chart that starts at
   about $300K and reaches $0 in the final month, with a y-axis starting at $0 and no legend
   (one series).
2. Add a recurring extra payment of $200/mo. You should see two lines, "With extra payments"
   (blue) and "Baseline" (gray), with a legend, and the blue line hits $0 years earlier.
3. Press Tab to focus the plot, then press → and Shift+→. The tooltip moves, and the screen
   reader live region reads the date and both balances.
4. Make the scenario invalid (rate empty). All charts disappear, the same way the table does.

## 4. Principal vs. interest (User Story 2)

- With R1: you should see 30 columns. In Yr 1 the orange (interest) segment is taller than the
  blue one, and in Yr 30 it is the other way around.
- Hover Yr 1. The tooltip's principal, interest and total should equal the sum of periods 1–12
  in the schedule table. Check this with "Show data".
- With the $200 extra: an aqua "Extra principal" segment appears and there are fewer columns.

## 5. Payment composition (User Story 3)

- With R1 and no costs, there is no composition bar.
- Add tax $3,600/yr, insurance $1,200/yr and HOA $50. You should see one bar with P&I, tax $300,
  insurance $100 and HOA $50. The legend total should equal the cost panel's total monthly
  payment.

## 6. Scenario comparison (User Story 4)

- Add a second scenario, "15yr @ 5.75%". You should see a "Balance by scenario" chart with two
  named lines, and the 15yr line ends at month 180.
- Add a third scenario. The first two lines keep their colors.
- Make the second scenario invalid (loan amount 0). Its line disappears, and the third scenario
  keeps its own color (slot 3); it is not repainted to slot 2.
- Note: color follows the scenario's *position in the list*. Removing a middle scenario moves the
  later scenarios up a position, so their colors change. Stable per-scenario colors would need a
  stored color on each scenario (not in this feature's scope).

## 7. Rental charts (User Story 6)

Set up the R3 loan: home price $330,000, 10% down, 6.5%, 360 months, tax $3,600/yr, insurance
$1,200/yr, HOA $50 and PMI 0.5%. Then, in the Deal Analyzer, enter monthly rent $2,800 and closing
costs $6,000.

1. Inside the Deal Analyzer, under its metrics, there is an "Over the loan term" group with three
   charts: cash flow, equity build-up and cash-on-cash. Placement follows the components contract.
2. Hover Yr 1 on the cash-flow chart. Its NOI, Debt service and Cash flow values equal the income
   and expense card's annual figures, and its cash-on-cash equals the `Cash-on-Cash` badge.
3. With all growth inputs at 0%, the NOI line is flat. The equity chart shows only Initial equity
   and Principal paid, and Yr 1 Initial equity is $33,000.
4. Set rent growth to 3% and appreciation to 3%. All three charts update. NOI now slopes up, and an
   Appreciation segment appears.
5. Add a recurring extra payment of $500. Debt service drops to $0 after the payoff year and cash
   flow jumps to equal NOI. The charts still run to Yr 30.
6. Enter 30 in "Rent growth". The field shows "Rent growth must be between -10% and 25%.", the
   rental charts disappear, and the amortization charts stay.
7. Clear the home price, adjusting the down payment if validation requires it. The equity chart is replaced by
   "Enter a purchase price to see equity build-up.", while cash flow and cash-on-cash still render.
8. Set the appreciation to -5%. Appreciation segments draw below the 0 baseline.
9. Reload the tab. The growth inputs keep their values (sessionStorage).
10. Old session: in DevTools, delete the three growth keys from the stored rental and reload. The
    page loads with the growth fields at 0, and the charts match step 3.
11. Remove the rent. All rental charts disappear, and the loan charts are unaffected.

## 8. Visual and accessibility pass

- Toggle the OS dark mode. Charts switch to the dark palette, gridlines stay subtle and text
  stays readable.
- At a 375px viewport there is no horizontal page scroll and x ticks thin out.
- With keyboard only, every chart's plot and its "Show data" toggle can be reached and used.
- Take a screenshot of the charts section in light and dark mode and check for label collisions
  and overflow. The palette validator checks colors only, not layout.
