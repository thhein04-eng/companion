# Research: Rental Property Deal Analyzer

No unresolved `NEEDS CLARIFICATION` items remained in Technical Context, because the stack is inherited from feature 001 and bound by the constitution. This document records the design decisions that the spec left to planning.

## R1 — Where the deal math lives

- **Decision**: Add a new module `analyze-deal.ts` (plus `validate-rental.ts`) inside the existing `libs/amortization-calculations` library, exported through its public `index.ts`.
- **Rationale**: Deal analysis takes an `AmortizationSchedule` as input (debt service, PMI months). Keeping it in the same pure-TS lib avoids a cross-lib dependency for one module, keeps Vitest coverage in one place (Constitution I), and preserves the app → lib boundary (Constitution II).
- **Alternatives considered**: A new `libs/deal-analysis` library generated with `nx g @nx/js:lib`. This gives cleaner separation, but it would need to depend on `amortization-calculations` for types and the schedule, and it only adds Nx project overhead. Revisit if investment features grow to include multi-year projections or IRR.

## R2 — Debt service definition and PMI handling

- **Decision**: Year-1 debt service is `summary.monthlyPrincipalAndInterest × min(12, periods.length) + Σ(monthlyPmiAmount for each of periods 1–12 where pmiApplies)`. Using `min(12, periods.length)` keeps loans shorter than 12 months from being overstated. Monthly debt service is year-1 debt service ÷ 12. Extra principal payments are excluded.
- **Rationale**: The scheduled P&I is the contractual obligation. Extra principal is optional and would understate cash flow. Using the rounded `monthlyPrincipalAndInterest` keeps the numbers consistent with what the UI already shows as P&I. Summing PMI month by month handles a PMI drop-off inside year 1 exactly (spec Edge Case).
- **Prerequisite change**: `computeSchedule` already computes `monthlyPmiAmount` internally but does not expose it. Add it to `AmortizationSchedule.summary` as an additive, non-breaking field.
- **Alternatives considered**: (a) Summing `periods[0..11].paymentAmount`. Rejected: the final period absorbs rounding and extra payments, and short loans would distort the result. (b) Including tax and insurance in debt service. Rejected: they are already operating expenses, so they would be counted twice (spec Assumptions).

## R3 — Percentage bases and defaults

- **Decision**: Vacancy, management, maintenance, and CapEx are each a percentage of GSI (rent + other income). Defaults are 5 / 8 / 5 / 5 and are seeded into `RentalAssumptions` when the user first enters rent, so they appear as editable values.
- **Rationale**: This matches the spec (FR-002) and is a common screening convention. Seeding the defaults as real values, rather than as placeholders, means what the user sees is what gets calculated.
- **Alternatives considered**: Charging management on effective (post-vacancy) income. It is more precise, but the spec explicitly chose GSI for simplicity.

## R4 — Rule-of-thumb semantics

- **Decision**:
  - **1% Rule**: `pass = grossMonthlyRent ≥ 0.01 × homePrice`. The check uses rent only and excludes other income, which is the conventional form. It returns `{ pass, targetRent, actualRent }`.
  - **50% Rule**: Returns the actual opex ratio `totalOpex ÷ GSI`, `withinRule = ratio ≤ 0.5`, and `estimatedMonthlyCashFlow = 0.5 × GSI − monthlyDebtService`. When GSI = 0 it returns `null`.
- **Rationale**: This exposes both the diagnostic form (is my expense estimate realistic?) and the quick-estimate form (what would the rule predict?) that the spec asks for in FR-011.

## R5 — Results for "not applicable"

- **Decision**: Ratio metrics are typed `number | null`. `null` means not applicable: CoC when cash invested is 0, cap rate and 1% Rule when there is no `homePrice`, and the 50% ratio when GSI is 0. The UI renders `null` as "N/A" plus a reason string supplied by the lib (`naReason`).
- **Rationale**: This avoids `Infinity` and `NaN` reaching formatting code, and keeps the explanation copy testable in the lib.

## R6 — Ratio precision

- **Decision**: The lib returns ratios as unrounded fractions (for example, `0.0376`). Dollar figures are rounded to cents with the existing `roundCents`. The UI formats ratios with `Intl.NumberFormat` percent style, using one decimal place, or two for cap rate.
- **Rationale**: Rounding only at display time avoids compounding rounding error. SC-001's 0.01-point tolerance is asserted in unit tests against the raw fraction.

## R7 — Persistence and backward compatibility

- **Decision**: Add an optional `rental: RentalAssumptions | null` to `LoanScenario`. `deserializeScenarios` normalizes each scenario so that a missing `rental` becomes `null`. No storage-key change and no version bump are needed.
- **Rationale**: Saved 001-era sessions load unchanged (FR-016), and storage stays in `sessionStorage` (Constitution III).

## R8 — UI primitives for badges, card, and rule info

- **Decision**:
  - **Badges** (`MetricBadge`): Presentational, grouped in a `MetricBadgeGroup` with `role="group"`, `aria-label="Key deal metrics"`, and `aria-live="polite"`, so real-time changes are announced without stealing focus. This is non-interactive, so no behavior SDK is needed.
  - **Rule explanations**: `@ui-sdk/react/popover` with `openOnHover`, triggered by an info button. It opens on hover, and on press (tap, click, or Enter). A popover, rather than a tooltip, because the spec requires "hover, focus, **or tap**", and tooltips don't open on tap on touch devices. The popover gives keyboard, ARIA, and touch behavior for free (Constitution IV).
  - **Inputs**: The existing `NumberField` (built on the SDK), with `suffix="%"` for percentages and `variant="currency"` for dollars.
  - **Negative cash flow**: Red text plus a "▼ Negative" text label and a minus sign, so the cue doesn't depend on color alone (FR-012).
- **Alternatives considered**: `@ui-sdk/react/tooltip` for the rule info. Rejected because of the touch limitation. `@ui-sdk/react/meter` for the opex ratio. It could be added later, but plain text keeps scope small.

## R9 — Where the LTV badge comes from

- **Decision**: LTV = `principal ÷ homePrice`. It is computed in `analyzeDeal`'s sibling helper `computeLtv(scenario)`, so the LTV badge can render even without rent. It returns `null` when there is no `homePrice`.
- **Rationale**: The spec notes that the LTV badge is new. Showing it without rent keeps it useful to non-investor users too. SC-005 explicitly allows this one addition (analysis remediation I1, Option A).
