# Quickstart: validating spec 017

## Prerequisites

This worktree has no `node_modules`. Install once, then gate:

```bash
npm ci
npx nx run-many -t lint test typecheck          # all green, no existing test changes
npx nx build amortization-calculator
# serve the prod build on :3215 and run e2e with BASE_URL (see the :3000 worktree trap note)
```

## §1 Center equals the Deal Analyzer (SC-001)

1. Enter the reference deal on `/deal-analyzer`: $250,000, 25% down, 7%, $3,000 tax, $1,200
   insurance, $2,400 rent. Note the cash flow ($250.56/mo) and Cash-on-Cash.
2. Open `/sensitivity`. The "Current deal" cell shows `$251` (cash flow) and, with the measure
   switched, the same Cash-on-Cash as the Deal Analyzer.
3. `npx nx test deal-analyzer-calculations` → `sensitivity.spec.ts` checks all 25 cells against
   hand-entered deals.

## §2 Grid behavior (US1)

1. Defaults: 5 rows (6%, 6.5%, 7%, 7.5%, 8% for this 7% deal: 6%…8%), columns −10% … +10%, the
   current deal ringed in the middle.
2. Switch Vary → Rent: headers show `$2,160/mo … $2,640/mo`; cells improve to the right.
3. Switch Measure → Cash-on-Cash; try each step size. A deal at 0.5% with a 1% step: rows start at 0.5% and the ring is on the first row.
4. At 390px wide: all 5 columns and rows readable, no sideways page scroll.

## §3 Max Allowable Offer (US2, SC-002)

1. Target: Cash flow, at least $300. The card shows a price below $250,000 with "At the offer:
   $3xx/mo" (≥ $300).
2. Select "Use this price" → the deal's price changes (toast, Undo restores it); the new
   cash flow is ≥ $300, and +$1 on the price drops it below.
3. Target Cash-on-Cash 8%, then cash flow $5,000: the second says no price reaches it.
4. A negative Cash-on-Cash target is rejected with "Use 0–1000%".

## §4 Page and navigation (US3)

"Sensitivity" in the nav after "Sale Profit"; the deal card above the title with rate, price, down
payment and rent emphasized; a scenario without rent shows "Add rent to see the sensitivity".

## §5 Accessibility (SC-005)

`npx playwright test sensitivity a11y` with `BASE_URL` → zero axe violations in light and dark;
Tab reaches the grid, arrows move cell by cell, "below target" cells are announced.

## Verified on 2026-11-19

Checked through automated equivalents on a prod build (:3215) in Chromium, Firefox and WebKit, plus a visual review (tasks.md T026):

| Section | Covered by |
|---|---|
| §1 Center equals the Deal Analyzer | `sensitivity.spec.ts` (calculations): the center cell equals `analyzeDeal` field for field for three deals, and all 25 cells equal deals re-entered by hand for both column variables. E2E: the ringed cell reads $251 with $250.56 in its label |
| §2 Grid behavior | e2e `sensitivity.spec.ts`: 6%–8% rows and −10%…+10% columns, rent headers $2,160/mo…$2,640/mo, Cash-on-Cash 4.8%, step sizes, the 0.5% / 1% floor case, all 25 cells inside 390px with no sideways scroll |
| §3 Max Allowable Offer | `max-offer.spec.ts` (the offer meets the target and $1 more does not, over 150 searches on 50 deals); e2e: $300/mo gives an offer below the price, "Use this price" sets it, Undo restores it, $1 more drops below $300, $5,000/mo is unreachable, an out-of-range Cash-on-Cash target is rejected with "Use 0–1000%" |
| §4 Page and navigation | e2e: "Sensitivity" after "Sale Profit", the deal card above the title with the four inputs emphasized, the missing-rent, missing-down-payment and invalid-loan messages, scenario tabs |
| §5 Accessibility | e2e `a11y.spec.ts`: zero axe violations in light and dark for the grid with negative cells, a set target with ▼ cells and a found offer, Cash-on-Cash by rent with a tagged column, and an unreachable target; Tab reaches the grid (one stop), arrows read it cell by cell |

SC-003: from the deal card, an 8% Cash-on-Cash offer takes three actions (open the page, choose "Cash-on-Cash", type 8), well under 30 seconds. SC-004: the grid and offer follow a rate change in under 500 ms in all three browsers.
