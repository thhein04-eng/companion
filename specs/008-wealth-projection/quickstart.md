# Quickstart & Validation: Wealth Projection

**Feature**: `008-wealth-projection` · Branch: `008-wealth-projection`

## Prerequisites

- Node 20.9+ and npm 11, with `npm ci` at the repo root (this is an npm workspace, so use `npx nx`).
- **e2e port trap**: `:3000` is usually another checkout's dev server. Run this branch's own prod
  build on another port:

  ```bash
  npx nx build amortization-calculator
  npx nx run amortization-calculator:start --port=3200     # leave running
  BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
  ```

## 1. Automated checks

```bash
npx nx run-many -t lint test typecheck -p shared-calculations shared-ui deal-analyzer-calculations deal-analyzer-ui amortization-calculator amortization-calculator-e2e
```

| Expectation | Specified in |
|---|---|
| `project-wealth.spec.ts` reproduces the reference table to the cent, and the invariants hold | [contracts/wealth-calculations.md](contracts/wealth-calculations.md) |
| `project-rental.spec.ts` and `analyze-deal.spec.ts` pass unchanged | Regression check (R1) |
| New e2e `wealth-projection.spec.ts` passes (scenarios 2–6) | [contracts/wealth-ui.md](contracts/wealth-ui.md) |
| Existing e2e specs still pass, except the known intermittent WebKit FR-016 test | Regression check |

## 2. Page and navigation

Open `/wealth`. Check that:
- the title is "Wealth Projection · Companion" and the h1 is "Wealth Projection";
- the nav link "Wealth Projection" has `aria-current="page"`.

Then enter a value on `/deal-analyzer` and confirm it appears on `/wealth`.

## 3. Reference projection (User Story 1)

Enter the reference property:
- price $400,000, 25% down, 7% for 30 years
- tax $4,800 and insurance $1,800
- rent $3,800

Click **Use typical rates**, and keep the horizon at 10. Expected results:
- `wealth-net-worth` shows **$360,051.02**, `wealth-equity` **$280,129.40**,
  `wealth-cum-cash-flow` **$79,921.62** and `wealth-multiple` **3.6×**.
- `wealth-row-0` shows net worth $100,000.00, and `wealth-row-5` shows $211,428.70.
- The chart's "Show data" table has 11 rows (years 0–10).
- Pick **5 yrs**. The summary shows "In year 5" and net worth $211,428.70.

## 4. Drivers (User Story 2)

- Enter forced appreciation of $20,000. `wealth-row-0` equity becomes $120,000.00.
- Set appreciation to 30%. An inline error appears ("between -10% and 25%"), and the loan inputs
  still work.
- Open `/deal-analyzer`. Its rental charts reflect the same growth rates.

## 5. Tax (User Story 3)

- `wealth-row-1` shows depreciation $11,636.36, interest $20,903.45, taxable −$4,027.81 and tax
  effect $966.67.
- Set the tax rate to 0. The "Net worth after tax" values equal the net worth values.
- Set land to 100. An inline error appears, `wealth-cum-tax` shows "—", the after-tax line
  disappears, and the pre-tax figures are unchanged.

## 6. Edge cases and persistence

- **Horizon 30**: the year-28 depreciation is $5,818.28, and years 29–30 are $0.00.
- **Reload**: the horizon, forced appreciation, land share and tax rate are all restored.
- **Old session**: remove `rental.wealth` from the stored JSON and reload. The defaults
  (10 / $0 / 20% / 24%) apply, and no errors are shown.
- **375 px width**: the page has no horizontal scroll, and the table scrolls inside its own
  region.

**Verified on 2026-11-17 (T031–T032):**
- `lint`, `test` and `typecheck` pass for all 6 projects. `deal-analyzer-calculations` has 178
  tests: the reference table, 20 generated invariant scenarios, the term-boundary seam, tax and
  validation.
- Full e2e on a :3200 prod build: 267/267 passed, in two consecutive `npx nx e2e` runs.
  - §2–§6 are automated in `wealth-projection.spec.ts` (11 tests × 3 browsers).
  - SC-003 is covered in `performance.spec.ts` (growth change → summary update in under 1 s).
- **Keyboard**: every assumption field, the horizon presets (an SDK segmented control, so arrow
  keys move the choice), Use typical rates, the chart (the existing `LineChart` keyboard
  navigation and "Show data") and the focusable table region are all reachable by Tab, with
  visible focus rings. Negative values carry a minus sign, not color alone.
- **Regression fix**: `deal-analyzer.spec.ts` FR-016 was intermittent on WebKit. It now ignores
  only cancelled Next.js RSC prefetches (`?_rsc=… access control checks`), which became more
  frequent with every nav link. All other page errors still fail the test, and it passed 30/30
  runs.
