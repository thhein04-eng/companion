# Data Model: UI Polish (spec 011)

There are **no data changes**. `LoanScenario`, `ExtraPaymentRule` and `DealAnalysis` are unchanged,
and nothing new is persisted.

## Derived display value (new pure helper)

```ts
// deal-analyzer-calculations/src/lib/rules.ts (or next to analyzeDeal)
/** Monthly rent as a fraction of the purchase price, for the 1% Rule card (spec 011 FR-011). */
export function onePercentRatio(rule: OnePercentRuleResult): number | null;
// = targetRent > 0 ? actualRent / (targetRent * 100) : null   (targetRent is 1% of price)
```

Tests: 3200 rent / 4500 target → 0.00711 (shown as "0.71%"). A target of 0 → null.

## UI state (component-local, unchanged semantics)

- Extra payment draft: `{ kind: 'recurring' | 'oneTime', amount: number | null, date: ISODate | null }`,
  the same as today.
- Date picker: open/closed and the visible month are owned by ui-sdk `DatePicker`. The value is the
  ISO date passed in.
