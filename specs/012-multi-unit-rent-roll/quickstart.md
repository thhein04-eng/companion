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

## Verified on 2026-11-19

Checked through automated equivalents on a prod build (:3200) in Chromium, Firefox and WebKit,
plus a visual review (tasks.md T035):

| Section | Covered by |
|---|---|
| §1 Backward compatibility | `golden-baseline.spec.ts`: 28 scenarios × `analyzeDeal`, the rental, wealth and exit projections and `analyzeSale`, identical to the pre-feature snapshot |
| §2 Rent roll | `rent-roll.spec.ts`: 2 × $1,200 = the $2,400 deal ($250.56 cash flow), undo, the 4-unit cap, persistence, 390px |
| §3 Vacancy per unit | `rent-roll.spec.ts`: $207.50 with 5%/10%, $137.50 cleared |
| §4 House-hacking | `house-hack.spec.ts` + `house-hack.spec.ts` (calcs): $1,400 living there, net housing cost, after move-out equals both rented, the shared switch, the year-1 marker; past-horizon note in unit tests |
| §5 RUBS | `rubs.spec.ts`: $180 / NOI +$180, $90 living there, $90 at 50% |
| §6 Accessibility | `a11y.spec.ts`: zero axe violations light/dark with a 4-unit house-hack and RUBS open; keyboard-only add, check and switch |

SC-002 (4 units in under 2 minutes) is a manual usability measure: adding and filling 4 units
takes well under a minute in the sheet.
