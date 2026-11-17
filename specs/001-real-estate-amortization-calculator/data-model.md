# Data Model: Real Estate Amortization Calculator

All entities below are client-side, in-memory (plus `sessionStorage` mirroring per FR-012) TypeScript types living in `libs/amortization-calculations`. There is no database; "persistence" means serializing these shapes to `sessionStorage`.

## LoanScenario

A named, independently-editable set of inputs that produces one calculated result. Corresponds to spec's **Loan Scenario** entity and backs User Stories 1–4.

| Field                   | Type                                                | Notes / Validation (FR-009)                                                                        |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                    | `string`                                            | Client-generated (e.g., `crypto.randomUUID()`); stable identity across edits.                      |
| `name`                  | `string`                                            | User-editable label (e.g., "30yr fixed @ 6.5%"); defaults to an auto-generated name.               |
| `principal`             | `number` (cents or dollars, see note)               | Loan amount. Must be > 0. Auto-calculated from `homePrice - downPayment` whenever both are present, unless overridden (FR-014; see below).          |
| `annualInterestRatePct` | `number`                                            | Nominal annual rate as a percentage (e.g., `6.5`). Must be ≥ 0 (0% allowed per Edge Cases).        |
| `termMonths`            | `integer`                                           | Loan term expressed in months (UI may accept years and convert). Must be > 0.                      |
| `startDate`             | `ISO date string`                                   | First payment period's anchor date. Rolls to month-end consistently for short months (Edge Cases). |
| `paymentFrequency`      | `"monthly"`                                         | Fixed to monthly for v1 (Assumptions).                                                             |
| `homePrice`             | `number \| null`                                    | Optional; required if down payment is expressed as a percentage.                                   |
| `downPayment`           | `{ amount: number } \| { percent: number } \| null` | Optional. Must be < `homePrice` when both present (Edge Cases).                                    |
| `annualPropertyTax`     | `number \| null`                                    | Optional, annual figure; prorated monthly for display.                                             |
| `annualInsurance`       | `number \| null`                                    | Optional, annual figure; prorated monthly for display.                                             |
| `pmiAnnualRatePct`      | `number \| null`                                    | Optional; used only while loan-to-value > 80% (FR-006).                                            |
| `monthlyHoa`            | `number \| null`                                    | Optional; added to total payment, excluded from schedule principal/interest/balance columns.       |
| `extraPayments`         | `ExtraPaymentRule[]`                                | Zero or more rules (User Story 3).                                                                 |
| `principalIsOverridden` | `boolean`                                           | `true` once the user has typed `principal` directly; `false` while `principal` reflects the auto-calculation. Defaults `false`. (FR-014)             |

**Validation rules** (drive FR-009's field-level errors):

- `principal > 0`, `termMonths > 0`, `annualInterestRatePct >= 0`.
- If `downPayment` is a percent, it must be `0 <= percent < 100`; if an amount, `0 <= amount < homePrice`.
- `annualPropertyTax`, `annualInsurance`, `pmiAnnualRatePct`, `monthlyHoa`, when present, must be `>= 0`.

**Derived values** (not stored, computed on demand): monthly principal & interest payment, total monthly payment (P&I + tax + insurance + PMI + HOA), total interest paid, total cost, payoff date, PMI-drop-off period.

### Principal auto-calculation & override (FR-014)

`principal` is normally a plain field, but every edit to a `LoanScenario` MUST go through `applyScenarioPatch()` (see [contracts/calculation-engine.md](./contracts/calculation-engine.md)), which enforces this state machine:

1. **Patch touches `principal` directly** (user typed a new loan amount): keep the typed value, set `principalIsOverridden = true`. `homePrice`/`downPayment` are untouched.
2. **Patch touches `homePrice` and/or `downPayment`, and does not also touch `principal`**: after merging, if the resulting scenario has both `homePrice != null` and `downPayment != null`, recompute `principal = calculatePrincipalFromHomePriceAndDownPayment(homePrice, downPayment)` and set `principalIsOverridden = false` — this is the "discard the override" step. If either is still missing after the patch, `principal` and `principalIsOverridden` are left as they were (auto-calculation isn't possible without both).
3. **Patch touches neither `principal` nor `homePrice`/`downPayment`** (rate, term, start date, tax, insurance, PMI, HOA, extra payments): `principal` and `principalIsOverridden` are left unchanged.
4. If a single patch somehow touches both `principal` and `homePrice`/`downPayment` at once (the UI never does this — one field is edited at a time), rule 1 takes precedence: the explicit `principal` wins and the override flag is set.

## ExtraPaymentRule

Corresponds to spec's **Extra Payment Rule** entity (User Story 3).

| Field         | Type                             | Notes                                                                          |
| ------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `id`          | `string`                         | Client-generated identity.                                                     |
| `kind`        | `"recurring" \| "oneTime"`       | Discriminator.                                                                 |
| `amount`      | `number`                         | Must be > 0.                                                                   |
| `startPeriod` | `integer` (recurring only)       | First period the recurring extra payment applies, default 1.                   |
| `date`        | `ISO date string` (oneTime only) | Calendar date the one-time payment is applied; mapped to the enclosing period. |

**Validation rules**: `amount > 0`. A rule that would exceed the remaining balance in its applicable period is capped at the remaining balance when the schedule is generated (Edge Cases) — this capping happens in the calculation engine, not as an input-time validation error.

## AmortizationSchedule (derived, not persisted)

Corresponds to spec's **Amortization Schedule** entity. Always computed fresh from a `LoanScenario`; never stored independently (avoids the two getting out of sync).

| Field                       | Type                                                       | Notes                                                                                                                            |
| --------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `scenarioId`                | `string`                                                   | Back-reference to the generating `LoanScenario`.                                                                                 |
| `periods`                   | `SchedulePeriod[]`                                         | Ordered list, one entry per payment period.                                                                                      |
| `summary.totalInterestPaid` | `number`                                                   | Sum of all periods' interest portions.                                                                                           |
| `summary.totalPaid`         | `number`                                                   | Sum of all periods' payment amounts (P&I only; see note on HOA/tax/insurance).                                                   |
| `summary.payoffDate`        | `ISO date string`                                          | Date of the final period.                                                                                                        |
| `summary.pmiDropPeriod`     | `integer \| null`                                          | First period where PMI no longer applies, or `null` if never required.                                                           |
| `baselineComparison`        | `{ periodsSaved: integer; interestSaved: number } \| null` | Present only when `extraPayments` is non-empty; computed by diffing against the same scenario with `extraPayments: []` (FR-008). |

### SchedulePeriod

| Field                   | Type              | Notes                                                                         |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `periodNumber`          | `integer`         | 1-based.                                                                      |
| `date`                  | `ISO date string` | This period's payment date.                                                   |
| `paymentAmount`         | `number`          | Principal + interest for this period (final period absorbs rounding, FR-004). |
| `principalPortion`      | `number`          |                                                                               |
| `interestPortion`       | `number`          |                                                                               |
| `extraPrincipalApplied` | `number`          | 0 unless an `ExtraPaymentRule` applies this period.                           |
| `remainingBalance`      | `number`          | Exactly `0` on the final period.                                              |
| `pmiApplies`            | `boolean`         | Whether PMI is included in this period's total monthly cost.                  |

## ScenarioComparison (derived, not persisted)

Corresponds to spec's **Scenario Comparison** entity (User Story 4). A view-level grouping, not its own stored entity.

| Field         | Type                                                                                                             | Notes                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `scenarioIds` | `string[]`                                                                                                       | 2+ `LoanScenario` ids being compared.                             |
| `rows`        | `{ scenarioId: string; monthlyPayment: number; totalInterest: number; totalCost: number; payoffDate: string }[]` | One row per compared scenario, for FR-010's side-by-side display. |

## Persistence shape (sessionStorage)

```ts
// Key: "amortization:scenarios"
type PersistedState = {
  scenarios: LoanScenario[];
  activeScenarioId: string;
};
```

Written on every scenario change, read once on app mount (FR-012: session-duration retention only — no `localStorage`, no server call, per spec Assumptions).

**Note on money representation**: all monetary fields are plain `number` (dollars, not cents) for simplicity, matching the user-facing precision of amortization calculators; the calculation engine rounds to the cent only at display/final-period time (FR-004, FR-013), not on every intermediate operation, to avoid compounding rounding error across 360 periods.
