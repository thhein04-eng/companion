# Contract: Amortization Calculation Engine (`libs/amortization-calculations`)

This is the one true interface boundary in this feature: a framework-free TypeScript module the Next.js app (and its tests) call into. No network API exists — this contract plays the role an HTTP/library contract would play in a service-backed app. Types reference [data-model.md](../data-model.md).

## `computeSchedule(scenario: LoanScenario): AmortizationSchedule`

**Purpose**: Core entry point. Produces a full `AmortizationSchedule` for a given `LoanScenario`, applying extra payments, PMI cutoff, real-estate cost overlays, and final-period rounding.

**Preconditions**: `scenario` has already passed input validation (see `validateScenario` below). Behavior on an invalid scenario is undefined — callers must validate first.

**Postconditions** (enforced by unit tests, mapped to spec requirements):

- `periods.length` equals the number of periods actually needed to reach zero balance — may be fewer than `termMonths` if extra payments shorten the loan (FR-007, FR-008).
- The last entry in `periods` has `remainingBalance === 0` exactly (FR-004).
- `summary.totalInterestPaid === sum(periods[i].interestPortion)` (SC-002 cent-accuracy).
- If `scenario.extraPayments.length > 0`, `baselineComparison` is populated by internally computing the same scenario with `extraPayments: []` and diffing payoff period count + total interest (FR-008). If empty, `baselineComparison` is `null`.
- `pmiApplies` is `true` for periods while `remainingBalance / (homePrice ?? principal) > 0.8`, and `false` from the first period that condition fails onward (FR-006); `summary.pmiDropPeriod` records that period number, or `null` if PMI was never applicable (e.g., no `homePrice`/`pmiAnnualRatePct`, or down payment already ≥ 20%).
- Pure function: given the same `scenario` input, always returns an equal (deep) result — no hidden mutable state, no I/O.

**Edge cases covered** (see spec Edge Cases):

- `annualInterestRatePct === 0` → straight-line principal payments, no division by zero.
- An extra payment that would exceed the remaining balance is capped at the remaining balance for that period; the loan is marked paid off, not driven negative.
- `startDate` on the 31st (or other month-end edge) rolls consistently to the valid day for each subsequent month.

## `validateScenario(input: unknown): { valid: true; scenario: LoanScenario } | { valid: false; errors: FieldError[] }`

**Purpose**: Input-boundary validation per FR-009, run before `computeSchedule`.

```ts
type FieldError = {
  field: keyof LoanScenario | `extraPayments.${number}.${string}`;
  message: string;
};
```

**Postconditions**:

- Rejects `principal <= 0`, `termMonths <= 0`, negative `annualInterestRatePct`.
- Rejects a down payment `>= homePrice` when both are present.
- Rejects negative `annualPropertyTax`, `annualInsurance`, `pmiAnnualRatePct`, `monthlyHoa`, or `extraPayments[].amount`.
- Returns one `FieldError` per offending field (not just the first), so the UI can show all errors at once.

## `calculatePrincipalFromHomePriceAndDownPayment(homePrice: number, downPayment: DownPayment): number`

**Purpose**: The auto-calculation half of FR-014. `DownPayment` is `{ amount: number } | { percent: number }` (see [data-model.md](../data-model.md)).

**Postconditions**: Returns `homePrice - (downPayment is a percent ? homePrice * percent / 100 : downPayment.amount)`. Pure, no I/O.

## `applyScenarioPatch(scenario: LoanScenario, patch: Partial<LoanScenario>): LoanScenario`

**Purpose**: The single place FR-014's auto-calculate/override state machine is enforced. Every edit to a `LoanScenario` — from `LoanInputForm` or `CostBreakdownPanel` alike — MUST go through this function rather than a plain object spread, so the rule can't be bypassed or re-implemented inconsistently between components.

**Postconditions** (see [data-model.md](../data-model.md) "Principal auto-calculation & override" for the full state table):

- If `patch` includes `principal`: the result has that `principal` and `principalIsOverridden: true`.
- Else if `patch` includes `homePrice` and/or `downPayment`: after merging, if the result's `homePrice` and `downPayment` are both non-null, `principal` is recomputed via `calculatePrincipalFromHomePriceAndDownPayment` and `principalIsOverridden` is set to `false`. Otherwise `principal`/`principalIsOverridden` are unchanged from `scenario`.
- Else: `principal` and `principalIsOverridden` are unchanged from `scenario`; all other patched fields are merged normally.
- Pure function: never mutates `scenario`.

## `compareScenarios(schedules: AmortizationSchedule[]): ScenarioComparison`

**Purpose**: Supports User Story 4 — reduces 2+ already-computed schedules to the side-by-side summary shape.

**Preconditions**: `schedules.length >= 2`.

**Postconditions**: `rows.length === schedules.length`, one row per input schedule, in the same order, using each schedule's `summary` fields plus its scenario's monthly payment total (P&I + tax + insurance + PMI + HOA).

## `serializeScenarios(scenarios: LoanScenario[], activeScenarioId: string): string`

## `deserializeScenarios(raw: string | null): { scenarios: LoanScenario[]; activeScenarioId: string } | null`

**Purpose**: `sessionStorage` round-trip for FR-012. `deserializeScenarios` returns `null` on missing/corrupt input (fresh session), never throws — the app falls back to an empty default scenario in that case.

## UI consumption contract

The Next.js app (`apps/amortization-calculator`) and shared components (`libs/amortization-ui`) depend **only** on the exports above — no component reaches into intermediate calculation internals. This keeps `libs/amortization-calculations` independently testable (Vitest, no DOM) and keeps the vercel-labs/ui-based components in `libs/amortization-ui` purely presentational: they receive a `LoanScenario`/`AmortizationSchedule`/`FieldError[]` as props and emit change events back up, with no amortization math inside a component. Scenario edits specifically MUST call `applyScenarioPatch()` rather than merging the patch directly, so FR-014's auto-calculate/override rule holds regardless of which component initiated the edit.
