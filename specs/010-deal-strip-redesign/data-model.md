# Data Model: Deal Strip & Visual Redesign

**Feature**: `010-deal-strip-redesign` · R-numbers refer to [research.md](./research.md).

This feature adds **no persisted financial fields**. `LoanScenario` and `RentalAssumptions` are
unchanged, apart from spec 009's `rental.exit` (see `specs/009-hold-exit-pro-forma/data-model.md`).

## A. Shared deal fields (existing, now addressed by key)

`DealFieldKey` names every shared input the strip, sheet, sentence, scrub and undo touch:

| Key | Path on scenario | Kind | Scrub step (US5) | Chip |
|---|---|---|---|---|
| `homePrice` | `homePrice` | currency | 1,000 | Home price |
| `downPayment` | `downPayment` (`{amount}` \| `{percent}`) | currency \| percent | 1,000 \| 1 | Down payment |
| `principal` | `principal` (derived unless `principalIsOverridden` or no price) | currency | 1,000 | Loan amount |
| `annualInterestRatePct` | same | percent | 0.125 | Rate |
| `termMonths` | same (shown in years) | term | 12 months (1 yr) | Term |
| `startDate` | same | date | — | — (sheet only) |
| `annualPropertyTax` | same | currency/yr | 100 | — (payment bar) |
| `annualInsurance` | same | currency/yr | 100 | — (payment bar) |
| `pmiAnnualRatePct` | same | percent | 0.05 | — (payment bar) |
| `monthlyHoa` | same | currency/mo | 10 | — (payment bar) |
| `rental.grossMonthlyRent` | `rental.grossMonthlyRent` | currency/mo | 25 | Rent |
| `rental.*` (other income, vacancy, management, maintenance, capex, closing, rehab) | same | as today | — | — (sheet only) |

The `total` chip is read-only: it shows `schedule.summary.totalMonthlyPayment` and its popover
shows the payment breakdown.

**Step and clamp rule** (pure function `stepValue(key, value, steps)` in
`shared-calculations/src/lib/step-value.ts`): `next = value + steps × step`, rounded to the step's
precision. It is clamped to the field's validation range: currency ≥ 0, rate 0–100, term 1–480
months, down-payment percent `0 ≤ x ≤ 99`, PMI ≥ 0. `null` values don't scrub. Shift multiplies
`steps` by 10.

## B. ChangeRecord (in memory only, R7)

```ts
interface ChangeRecord {
  scenarioId: string;
  field: DealFieldKey;
  label: string;          // "Rate", "Rent", …, as in the toast
  oldValue: unknown;      // the raw scenario value, restored by undo
  newValue: unknown;
  oldDisplay: string;     // "6.5%"
  newDisplay: string;     // "6.0%"
  source: 'chip' | 'sheet' | 'sentence' | 'payment-bar' | 'scrub' | 'setup';
  at: number;             // ms timestamp, for 800ms coalescing
}
```

**Multi-field rental changes**: When the rental panel writes several fields in one patch (for
example, the first rent entry filling in `DEFAULT_RENTAL_ASSUMPTIONS`), the record uses
`field: 'rental.grossMonthlyRent'` if rent changed, otherwise the first changed key.
`oldValue` / `newValue` are the whole previous / next `rental` object (possibly `null`), so undo
restores the exact earlier state.

**Lifecycle**: None → Recorded (toast shown) → (coalesce: same scenario and field, within 800ms
or the same scrub gesture, updates `newValue` / `at` and keeps `oldValue`) → Undone or Expired
(6s), or Replaced (a different field changes), or Dropped (the scenario is switched or removed).
Only the latest record exists. Undo is single-level (spec clarification).

`changeSeq: number` increments on Recorded, Coalesced and Undone, never on a scenario switch.
`<Ripple>` reads it.

## C. PageProfile (static, per view, R9)

```ts
interface PageProfile {
  pageId: 'amortization' | 'deal-analyzer' | 'financing' | 'wealth' | 'pro-forma';
  pinned: DealChipKey[];       // shown first, accent style
  muted: DealChipKey[];        // shown last, de-emphasized, still editable
  requires: MissingRequirement[];
}
type DealChipKey = 'homePrice' | 'downPayment' | 'principal' | 'annualInterestRatePct'
  | 'termMonths' | 'rental.grossMonthlyRent' | 'total';
interface MissingRequirement { field: DealFieldKey; unlocks: string } // "+ Add rent to unlock cash flow"
```

| pageId | pinned | muted | requires (missing chips) |
|---|---|---|---|
| amortization | principal, rate, term, total | rent | — |
| deal-analyzer | homePrice, downPayment, rent, total | — | rent → "cash flow" |
| financing | rate, term, rent | — | rent → "DSCR" |
| wealth | homePrice, downPayment, rent | — | homePrice → "equity", rent → "net worth" |
| pro-forma | homePrice, rent, rate | — | homePrice → "sale price", rent → "IRR" |

**Chip order**: `pinned` in its listed order (it may include `total`), then every chip not
listed, in §A order, then `muted`, then `total` last only if it isn't pinned.

## D. Headline (live, per view, R9)

```ts
interface Headline {
  label: string;                   // "Total monthly payment" | "Cash flow" | "DSCR" | "Net worth" | "IRR"
  value: number | null;
  naReason: string | null;         // "Add rent to see DSCR"
  format: (n: number) => string;   // currency / dscr / percent formatters already in shared-ui
  betterWhen: 'higher' | 'lower';  // payment: lower; others: higher
}
```

| pageId | value source |
|---|---|
| amortization | `schedule.summary.totalMonthlyPayment` |
| deal-analyzer | `analysis.cashFlow.monthly` |
| financing | `analysis.dscr.value` |
| wealth | net worth at the horizon year of `projectWealth` |
| pro-forma | pre-tax IRR at the chosen hold (spec 009) |

## E. Setup state (session, R8)

- `setupDone: Set<scenarioId>`, persisted as a JSON array in `sessionStorage['companion.setupDone']`.
  Ids that no longer exist are ignored. If storage is unavailable, it is kept in memory only.
- `needsSetup(scenario) = scenario.homePrice == null && !setupDone.has(scenario.id)`.
- **Done is enabled** when `validateScenario(scenario).valid` and `homePrice != null` and
  `downPayment != null`.

## F. Theme preference (device, R3)

- `ColorSchemeValue = 'system' | 'light' | 'dark'`, default `'system'`. Saved by ui-sdk
  `createColorScheme` and shown as `<html data-color-scheme>`.

## G. Validation summary (derived, US3)

`dealErrors = [...validateScenario(s).errors, ...(s.rental ? validateRental(s.rental) : [])]`,
in sheet group order (Property → Loan → Monthly costs → Rental). `errorCount = dealErrors.length`.
`firstInvalid = dealErrors[0].field`. Each chip whose field appears in `dealErrors` shows the bad
state. This uses the existing validators only, with no new rules.
