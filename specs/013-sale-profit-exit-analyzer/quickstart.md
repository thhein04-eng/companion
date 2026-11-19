# Quickstart: Sale Profit & Exit Analyzer — validation guide

## Prerequisites

```bash
cd .claude/worktrees/013-sale-profit-exit-analyzer
npm ci            # the worktree starts without node_modules (research R11)
```

## 1. Unit tests (SC-001, SC-002, SC-004)

```bash
npx nx test deal-analyzer-calculations
npx nx test shared-calculations
npx nx test shared-data-access
```

Expected: the reference vectors in [contracts/sale-calculations.md](./contracts/sale-calculations.md)
pass to the cent; the data-model §C invariants pass over `generatedScenarios`; all existing
`projectExit` / `projectWealth` tests stay green after the `annualCashToInvestor` extraction.

## 2. Lint, typecheck, build

```bash
npx nx run-many -t lint test typecheck -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e
```

## 3. E2E (prod build on :3200, not :3000 — :3000 is usually another checkout's dev server)

```bash
npx nx build amortization-calculator
npx nx run amortization-calculator:start --port=3200 &
BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
```

Expected: the seven scenarios in [contracts/sale-ui.md § E2E](./contracts/sale-ui.md) pass.

## 4. Manual walk-through

Enter the reference property (spec.md US1): $400,000, 25% down, 7%/30 yr, $4,800 tax, $1,800
insurance, $3,800 rent; growth 3 / 2.5 / 3.5 (or "Use example rates" on `/pro-forma`).

| Step | Expect |
|---|---|
| Open "Sale Profit" in the nav | `/sale`, h1 "Sale Profit & Exit Analyzer" |
| Default exit (7 years) | Net proceeds $199,845.65, cash flow $51,574.90, profit $151,420.55, return 151.42%, "Profit" |
| Open `/pro-forma`, 7-year hold | Total net profit $151,420.55 (same) |
| Months, 90 | Profit $167,765.71; Years shows 7.5 |
| Years, 1 | Profit −$7,371.49, "Loss", break-even $421,926.33, cushion −$7,926.33 |
| Years, 7 | Break-even $346,093.91, cushion $162,817.80 |
| Exit 400 months | Clamped to 360 with the note; break-even "$0 — Profitable at any sale price" |
| Tax On | Label shown; after-tax profit $120,063.74 at 7 years |
| Capital gains rate 50 | Inline error; tax rows "—"; pre-tax unchanged |
| New scenario, price $400k, 25% down, appreciation 3.5, 7 years | Cash flow $0 "No rental…", profit $99,845.65, break-even $401,550.80 |
| Narrow to 375 px | No horizontal scroll |
| Reload the tab | All inputs persist (sessionStorage) |
