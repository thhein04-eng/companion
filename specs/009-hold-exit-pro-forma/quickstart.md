# Quickstart & Validation: Hold & Exit Pro Forma

**Feature**: `009-hold-exit-pro-forma` · Branch: `009-hold-exit-pro-forma`

## Prerequisites

- npm workspace: use `npm ci` and `npx nx`.
- **e2e port trap**: `:3000` is usually another checkout's dev server. Build and serve this branch
  on its own port:

  ```bash
  npx nx build amortization-calculator
  npx nx run amortization-calculator:start --port=3200
  BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
  ```

## 1. Automated checks

```bash
npx nx run-many -t lint test typecheck -p shared-calculations shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e
```

| Expectation | Specified in |
|---|---|
| `irr`, `project-exit` and `validate-exit` tests pass, reproducing the research table | [contracts/exit-calculations.md](contracts/exit-calculations.md) |
| `project-wealth.spec.ts` and `project-rental.spec.ts` still pass, plus the new horizon-override test | Regression check (R1) |
| New e2e `pro-forma.spec.ts` passes (§2–§6) | [contracts/pro-forma-ui.md](contracts/pro-forma-ui.md) |
| The whole e2e suite passes | Regression check |

## 2. Page

Open `/pro-forma`. Check that:
- the title is "Hold & Exit Pro Forma · Companion";
- the nav link "Hold & Exit" is current;
- with no rent entered, `pro-forma-na` reads "Enter rent above to model a sale."

## 3. Reference exit (User Story 1)

Enter the reference property:
- price $400,000, 25% down, 7% for 30 years
- tax $4,800 and insurance $1,800
- rent $3,800

Then click **Use example rates**. With the defaults (7-year hold, 7% selling costs):
- `exit-sale-price` shows **$508,911.71**, `exit-selling-costs` **−$35,623.82** and
  `exit-loan-payoff` **−$273,442.24**.
- `exit-net-proceeds` shows **$199,845.65**.
- `exit-irr` shows **15.66%**, `exit-profit` **$151,420.55** and `exit-multiple` **2.51×**.
- In `hold-comparison`, `hold-5-irr` is 14.96% and `hold-10-irr` is 15.71%, and the 7-year column
  is marked current.
- Pick **10 yrs**. `exit-net-proceeds` becomes $267,305.58, and `exit-multiple` becomes 3.56×.

## 4. Assumptions (User Story 2)

- With growth at 0%, `exit-irr` differs. "Use example rates" brings it back to 15.66%.
- `pro-forma-row-1` shows `noi` $28,512.00 and `cash-to-investor` $4,561.08.
- `pro-forma-sale` `net-proceeds` shows $199,845.65.
- Set selling costs to 20%. An inline error appears ("between 0% and 15%"), and `pro-forma-na` is
  shown.
- Open `/wealth`. Its growth fields show 3 / 2.5 / 3.5.

## 5. Tax (User Story 3)

- `pro-forma-row-1` shows depreciation $11,636.36, interest $20,903.45, tax effect $966.67 and
  `after-tax-cf` $5,527.75.
- `exit-irr-after-tax` shows 15.88%, `exit-profit-after-tax` $152,217.73 and
  `exit-multiple-after-tax` 2.52×.
- Set the tax rate to 0. The after-tax figures equal the pre-tax ones.
- Set land to 100. An inline error appears, the after-tax figures show "—", and the pre-tax
  figures are unchanged.

## 6. Edge cases and persistence

- **Extra payments**: seed a recurring $500 extra payment in the session. With a 7-year hold,
  `exit-loan-payoff` shows −$219,442.75, `exit-irr` 14.82%, and `pro-forma-row-1`
  `extra-principal` $6,000.00.
- **Reload**: the hold and selling costs are restored.
- **Old session**: remove `rental.exit` and reload. The defaults (7 / 7%) apply.
- **375 px width**: the page has no horizontal scroll, and the tables scroll inside their own
  regions.

## Verified on 2026-11-18 (delivered through spec 010)

`apps/amortization-calculator-e2e/src/pro-forma.spec.ts` covers §2–§6 on a :3200 prod build in
chromium, firefox and webkit: 57 runs (19 tests × 3 browsers), all passing. Shared inputs are
entered through the spec 010 Deal Strip's sheet. Calculations: `irr`, `validateExit` and
`projectExit` unit tests reproduce the research table to the cent for 5, 7 and 10 years.
The keyboard pass is covered by those e2e tests (hold presets with arrows, every field, example
rates, scrollable table regions with `tabIndex=0`).
