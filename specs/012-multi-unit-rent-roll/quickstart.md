# Quickstart: validating spec 012

## Prerequisites

```bash
npm ci
npx nx run-many -t lint test typecheck          # all green
npx nx build amortization-calculator
# serve the prod build on :3200 and run e2e with BASE_URL (see memory note on :3000)
```

## §1 Backward compatibility (SC-001)

1. `npx nx test deal-analyzer-calculations shared-calculations` → the golden test passes.
2. Load the app with an existing single-rent scenario → the rent roll shows "Unit A" at the old
   rent, and every Deal Analyzer, DSCR, Wealth and Hold & Exit figure is unchanged.

## §2 Rent roll (US1, SC-002, SC-007)

1. Edit deal → Rental → set Unit A $1,350, "+ Add unit", Unit B 2bd/1ba $1,400.
2. Expect the deal card "Rent $2,750 · 2 units". Remove Unit B → Undo restores it.
3. Add units to 4 → "+ Add unit" disabled with the note. At 390px, no sideways scroll.

## §3 Vacancy per unit (US2, SC-003)

Overall 5%, Unit B 10% → vacancy line $207.50/mo (67.50 + 140.00).

## §4 House-hacking (US3, SC-004)

1. Mark Unit A "I live here", rent after move-out $1,350.
2. Deal Analyzer shows "Living there" selected, rent $1,400/mo and Net housing cost.
3. Switch to "After move-out" → figures match the both-rented deal.
4. Wealth / Hold & Exit → move-out marker at year 1; set 40 years → note "after the horizon".

## §5 RUBS (US4, SC-005)

1. Custom expense "Water/Sewer" $180, Paid by "Tenants (RUBS)", 100%, vacancy 0%.
2. After move-out: reimbursements $180, NOI +$180 vs landlord-paid.
3. Living there: reimbursements $90.

## §6 Accessibility (SC-006)

`npx playwright test a11y rent-roll house-hack rubs` with BASE_URL → zero axe violations in
light and dark; every control reachable and operable by keyboard.
