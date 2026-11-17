# Quickstart: Validating the Deal Analyzer

## Prerequisites

- Workspace dependencies installed (`npm install`).
- Feature 001's calculator is building and its tests are green: `npx nx run-many -t lint test`.

## Automated checks

```bash
npx nx test amortization-calculations      # includes analyze-deal.spec.ts reference vectors A–F
npx nx test amortization-ui                # badge / card / rule indicator rendering (if component tests exist)
npx nx lint amortization-calculator
npx nx e2e amortization-calculator-e2e     # new deal-analyzer.spec.ts + all 001 specs (SC-005 regression)
```

**Expected**: Everything passes, and the existing 001 e2e specs pass unchanged.

## Manual scenarios

Run `npx nx dev amortization-calculator` and open the printed URL.

### Scenario 1 — Positive cash flow (US1, US2, US3)

Enter: home price **250,000**, down payment **25%**, rate **7**, term **30 years**, property tax **3,000/yr**, insurance **1,200/yr**. In the Deal analyzer section, enter rent **2,400** and keep the default percentages. Then enter closing costs **7,500** and rehab **10,000**.

Expected (reference vector A in [the engine contract](./contracts/deal-analysis-engine.md)):

- LTV badge **75.0%**, CoC badge **3.8%** next to it.
- Card: NOI **$1,498.00/mo**, debt service **$1,247.44/mo**, cash flow **$250.56/mo**. Switching to annual shows **$17,976.00** NOI and **$3,006.72** cash flow.
- Cap rate **7.19%**. 1% Rule **Fail**, with rent $2,400 against the $2,500 target. 50% Rule **within** (37.6%), with an estimated cash flow of **−$47.44/mo**.

### Scenario 2 — Real-time updates (SC-003)

Change rent from 2,400 to 2,000. The CoC badge turns negative with a "Negative" label, and the card's cash flow shows a negative value and the ▼ label. All of this happens within 1 second, with no click.

### Scenario 3 — N/A states

- Set down payment to 0%, and closing costs and rehab to 0. The CoC badge shows **N/A**, and its reason is announced or visible.
- Clear the home price. The LTV badge, cap rate, and 1% Rule show N/A, and NOI and cash flow still display.

### Scenario 4 — Validation doesn't block the schedule

Enter vacancy **150**. A field-level error appears, and the amortization schedule still renders.

### Scenario 5 — Accessibility

Tab to the 1% Rule info button and press Enter. The explanation popover opens and Esc closes it. With a screen reader, changing rent announces the updated CoC badge.

### Scenario 6 — Persistence and comparison (FR-014, FR-016)

Add a second scenario with rent 2,800 and reload the tab. Both rental inputs persist. The comparison grid shows cash flow, NOI, cap rate, and CoC per scenario. Next, load a session saved before this feature, or clear `rental` in storage. The page loads without errors and shows no deal metrics.
