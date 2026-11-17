# Quickstart: Real Estate Amortization Calculator

Validates the feature end-to-end once implemented. See [data-model.md](./data-model.md) for entity shapes and [contracts/calculation-engine.md](./contracts/calculation-engine.md) for the calculation engine's API.

## Prerequisites

- Node.js 20.9+
- Nx workspace generated with the `@nx/next` app at `apps/amortization-calculator`, plus `libs/amortization-calculations` and `libs/amortization-ui` (see [plan.md](./plan.md) Project Structure)
- Dependencies installed: `next`, `react`, `react-dom`, `@ui-sdk/core`, `@ui-sdk/react`, Tailwind CSS, Vitest, Playwright

## Setup

```bash
npm install
nx dev amortization-calculator
# visit http://localhost:3000
```

## Validation scenarios

Each scenario below maps to a user story's **Independent Test** in [spec.md](./spec.md) and should be exercised both manually in the browser and as a Playwright e2e spec.

### 1. Baseline schedule (User Story 1 / P1)

1. Open the calculator with no prior input.
2. Enter principal `300000`, annual rate `6.5`, term `30 years`, start date `2027-01-01`.
3. **Expect**: monthly payment displays immediately (~`$1,896.20`); the schedule table shows 360 rows; the last row's remaining balance is `$0.00`.
4. Run `nx test amortization-calculations` — unit tests assert this exact combination against the closed-form amortization formula to the cent (SC-002).

### 2. Real-estate costs (User Story 2 / P2)

1. On the same scenario, set home price `350000`, down payment `10%` (= `35000`), annual property tax `4200`, annual insurance `1500`, PMI rate `0.5%`.
2. **Expect**: a "Total estimated monthly payment" figure distinct from principal & interest, including prorated tax/insurance + PMI; PMI line disappears from the schedule once the balance crosses 80% of `350000`, and the UI indicates the period at which that happens.
3. Add a monthly HOA of `50`; **expect** it added to the total payment but absent from the schedule's principal/interest/balance columns.
4. **Expect**: with home price `350000` and down payment `35000` entered, the loan amount field already shows `315000` (auto-calculated, FR-014).
5. Manually change the loan amount to `310000`. **Expect**: the typed value sticks (no silent revert to `315000`).
6. Change the down payment to `50000`. **Expect**: the loan amount recalculates to `300000` (= `350000 - 50000`), not `310000` — the manual override from step 5 is discarded.

### 3. Extra payments (User Story 3 / P2)

1. Add a recurring extra principal payment of `200`/month to the baseline scenario.
2. **Expect**: payoff date moves earlier than 30 years; a "time and interest saved vs. baseline" comparison is shown.
3. Replace it with a one-time extra payment of `50000` on a specific date partway through the schedule.
4. **Expect**: that period's principal portion jumps by the extra amount and the remaining schedule recalculates from there.
5. Enter a one-time extra payment larger than the remaining balance.
6. **Expect**: the loan is marked paid off at that period with no negative balance (Edge Case coverage).

### 4. Multi-scenario comparison (User Story 4 / P3)

1. Duplicate the baseline scenario; change its rate to `6.0`.
2. **Expect**: editing the new scenario does not change the original.
3. Open the comparison view with both scenarios present.
4. **Expect**: a single aligned view shows each scenario's monthly payment, total interest, total cost, and payoff date.

### 5. Validation & edge cases

- Enter `0` for principal → expect a field-level error, no calculation attempted (FR-009).
- Enter `0%` interest rate → expect a valid straight-line schedule, not an error or crash.
- Enter a down payment equal to the home price → expect a validation error.
- Reload the page mid-session (same tab) → expect scenario inputs to still be present (FR-012); close and reopen the browser → expect a fresh default scenario (session-only persistence, per Assumptions).

### 6. Export / print (User Story 1 / P1, FR-011)

1. With a baseline schedule displayed, trigger the export/print action.
2. **Expect**: a CSV download (or print view) containing one row per period with payment number, date, principal, interest, and remaining balance.

### 7. Usability check (SC-006)

1. Ask a handful of reviewers unfamiliar with the feature to enter real-estate costs (tax, insurance, PMI, HOA) alongside a loan.
2. **Expect**: at least 90% correctly identify the "total estimated monthly payment" as distinct from the "principal & interest only" figure. Record results here or in T059's notes.

## Automated checks

```bash
nx test amortization-calculations   # Vitest: calculation engine contract (cent-accuracy, PMI cutoff, rounding)
nx e2e amortization-calculator-e2e  # Playwright: scenarios 1-6 above (scenario 7 is a manual usability check, not an automated spec)
nx lint amortization-calculator
nx build amortization-calculator
```

All four commands must pass before the feature is considered done.
