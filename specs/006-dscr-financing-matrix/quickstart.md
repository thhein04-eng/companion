# Quickstart & Validation: DSCR & Financing Matrix

**Feature**: `006-dscr-financing-matrix` · Worktree: `.claude/worktrees/006-dscr-financing-matrix`

## Prerequisites

- Node 20.9+ and npm 11 (this is an npm workspace, so use `npx nx`, not pnpm).
- Run `npm ci` from the worktree root first. A fresh worktree has no `node_modules`.
- **e2e port trap**: Playwright reuses whatever server is already on :3000, which is usually the
  main checkout's dev server. To test this branch, build it and serve it on another port:

  ```bash
  npx nx build amortization-calculator
  npx nx run amortization-calculator:start --port=3200   # leave running
  BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
  ```

## 1. Automated checks (all must pass)

```bash
npx nx run-many -t lint test -p shared-calculations deal-analyzer-calculations deal-analyzer-ui amortization-calculator
BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
```

| Expectation | Specified in |
|---|---|
| `loan-math` tests pass, and `compute-schedule.spec.ts` passes **unchanged** | [contracts/dscr-financing-calculations.md § shared-calculations](contracts/dscr-financing-calculations.md) |
| `dscr`, `financing`, `validate-financing` and `financing-matrix` tests reproduce the reference table to the cent | [research.md § Reference scenario](research.md#reference-scenario-used-in-spec-contracts-and-tests) |
| Existing `analyze-deal.spec.ts` and `with-deal-metrics.spec.ts` pass, with only the additive `dscr` field | Regression check |
| New e2e `financing-matrix.spec.ts` passes (scenarios 2–6 below) | [contracts/financing-ui.md](contracts/financing-ui.md) |
| Existing e2e specs (`deal-analyzer`, `validation-and-persistence`, `scenario-comparison`, …) still pass | Regression check |

## 2. DSCR card (User Story 1)

Open `/deal-analyzer` and enter the reference scenario: price $400,000, 25% down, 7.0%, 30 years,
property tax $4,800/yr, insurance $1,800/yr, rent $3,800/mo, with default reserves.

Expected results:

- `dscr` shows **1.19×**. `dscr-status` has `data-status="fail"` and reads "Below 1.25× minimum"
  in red, with the ✕ icon.
- `dscr-rent-needed` reads "$3,954.40/mo".
- Pick the **1.15×** preset. The status becomes pass ("Meets 1.15× minimum"), and the rent-needed
  line disappears.
- Set rent to $2,000. The card adds "NOI does not cover the annual principal & interest."
- Type a custom minimum of 2.5. An inline error appears, the status shows N/A, and the ratio is
  still shown.

## 3. Financing matrix (User Story 2)

Restore rent to $3,800 and the minimum to 1.25.

| Cell | Expected |
|---|---|
| `monthly-pi-conventional` / `cash-flow-conventional` / `dscr-conventional` | $1,995.91 / $380.09 / 1.19× fail |
| `monthly-pi-arm-initial` / `cash-flow-arm-initial` / `dscr-arm-initial` | $1,896.20 / $479.80 / 1.25× pass |
| `monthly-pi-arm-reset` / `cash-flow-arm-reset` / `dscr-arm-reset` | $2,240.75 / $135.25 / 1.06× fail |
| `monthly-pi-dscr` / `cash-flow-dscr` / `dscr-dscr` | $2,201.29 / $174.71 / 1.08× fail |
| `cash-flow-conventional` vs. the Income & expense card's monthly cash flow | equal ($380.09) |

- Tab to `financing-toggle` and press → twice. "DSCR loan" is checked, `financing-col-dscr` has
  `aria-current="true"`, and `financing-breakdown` shows "NOI $2,376.00 − P&I $2,201.29 − PMI $0.00
  = Cash flow $174.71 /mo".
- Change the loan rate above to 6.0%. The conventional, ARM and DSCR columns all follow, because
  the terms are not customized yet.
- Clear the purchase price. `financing-matrix-na` reads "Enter a purchase price to compare
  financing options."
- At 375 px wide, only the selected option is shown and the page does not scroll horizontally.

## 4. Editing terms (User Story 3)

- Select DSCR loan, then set down payment 20% and rate 7.5%. The DSCR column shows loan $320,000;
  the other columns do not change. `financing-reset` appears.
- Change the loan rate above. The matrix no longer follows it (the terms are detached).
- Select ARM and set term 5 with a fixed period of 7. An inline error appears on Fixed period, the
  ARM column shows "—", and the conventional and DSCR columns are still computed. The DSCR card and
  the Income & expense card are unaffected.
- Reload the page. The edits, the selected option and the minimum DSCR are all restored.
- Click **Reset to defaults**. The terms match the defaults derived from the current loan, and the
  minimum DSCR and the selected option are kept.

## 5. PMI and comparison

- Set the loan down payment to 10% and the PMI rate to 0.5%. Conventional and ARM show monthly PMI
  of $150.00 (0.5% × $360,000 / 12), and their cash flow drops by that amount. The DSCR loan
  (25% down) shows $0.00, and no column's DSCR changes because of PMI.
- Add a second scenario with rent. The comparison grid shows a **DSCR** column, and a scenario
  without rent shows "—".

## 6. Old sessions

In DevTools, remove `dscrMinimum`, `financing` and `financingSelection` from the stored scenario
JSON, then reload. The page loads with a 1.25 minimum, the Conventional option selected and the
derived terms, and no errors are shown.

**Verified on 2026-11-17 (T042–T044):**
- `lint`, `test` and `typecheck` pass for `shared-calculations` (50 tests), `deal-analyzer-calculations` (124 tests), `deal-analyzer-ui`, `amortization-calculator` and `amortization-calculator-e2e`.
- Full e2e on a :3200 prod build: 225/225 passed in one `npx nx e2e` run and in one direct Playwright run.
  - Scenarios §2–§6 are automated in `financing-matrix.spec.ts` (10 tests × 3 browsers).
  - SC-003 is covered in `performance.spec.ts` by an in-page toggle latency measurement under 100 ms.
  - The existing WebKit test `deal-analyzer.spec.ts` "FR-016" is intermittent (see tasks.md "Baseline notes").
- Keyboard: the minimum presets, structure toggle, term fields, fixed-period select and Reset all carry `focus-visible` rings. Arrow-key navigation within the structure toggle is asserted in e2e, and the presets use the same SDK segmented control. Every fail state shows ✕ plus text.
