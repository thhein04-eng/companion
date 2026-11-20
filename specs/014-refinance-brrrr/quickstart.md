# Quickstart: validating Refinance & BRRRR Modeling

Run from the repository root. This is an npm workspace, so use `npx nx`, not pnpm.

## 1. Unit tests and static checks

```bash
npx nx run-many -t typecheck lint test \
  -p shared-calculations shared-data-access shared-ui deal-analyzer-calculations deal-analyzer-ui
```

Expected: all pass. The calculation specs reproduce every reference figure in
[contracts/refinance-calculations.md](./contracts/refinance-calculations.md) to the cent and check
the ten invariants.

## 2. Run the app on its own port

`playwright.config.mts` reuses whatever server is on :3000, which is often another checkout's dev
server. Build and serve this checkout on a free port instead:

```bash
lsof -iTCP:3217 -sTCP:LISTEN          # pick another port if this prints anything
npx nx build amortization-calculator
npx nx run amortization-calculator:start --port=3217
```

## 3. Manual walkthrough (spec acceptance scenarios)

Open `http://127.0.0.1:3217/refinance` and enter the BRRRR reference deal (price $200,000, 20% down,
7%, 30 years, rent $2,800, tax $2,400, insurance $1,200, rehab $50,000, purchase closing costs
$6,000).

1. **Cash-out mode.** Enter ARV $320,000, LTV 75%, new rate 6.5%, term 30 years, closing costs
   $5,000, month 12. Expect new loan $240,000.00, payoff $158,374.70, net proceeds $76,625.30, P&I
   $1,064.48 → $1,516.96 (US1).
2. **Capital recycled.** Expect cash invested $96,000.00, cash left $19,374.70, recycled 79.82%,
   cash-on-cash 9.89% → 21.00% (US2). Raise ARV to $400,000: expect "All cash recovered" and a
   surplus of $40,625.30. Lower it to $200,000: expect "Cash-in refinance" (US1, US2).
3. **Rate drop.** Switch to Rate drop on a $300,000 / 7% / 30-year scenario, month 60, new rate
   5.5%, closing costs $4,500. Expect monthly savings $261.76, breakeven month 18 ("1 yr 6 mo",
   loan month 78) and net savings $74,028.00. Set the new term to 30 years: expect breakeven month
   12 and the longer-term note (US3).
4. **Linked scenarios.** Add a second scenario tab with different refinance inputs, switch back
   and reload: each scenario keeps its own inputs and mode (US4). Undo (toast) restores the previous
   value.
5. **Edge cases.** Month above the term shows the clamp note; closing costs $0 show "Immediate"; a
   non-rental scenario shows cash-on-cash "N/A" with the reason.

## 4. End-to-end

```bash
BASE_URL=http://127.0.0.1:3217 npx nx e2e amortization-calculator-e2e
```

Expected: the existing suite plus `refinance.spec.ts` and the `/refinance` axe check pass. If the
config's own server probe on :3000 times out because that server is unhealthy, run Playwright from
`apps/amortization-calculator-e2e` with `BASE_URL` set instead.

## 5. Done when

Every acceptance scenario above holds, the unit and e2e suites pass, and the page has no
horizontal scroll at 375 px.
