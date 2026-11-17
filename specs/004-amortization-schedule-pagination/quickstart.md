# Quickstart: Validate the Paginated Amortization Schedule

## Prerequisites

- Run from the worktree `.claude/worktrees/004-amortization-schedule-pagination`
- Run `npm ci` once, because the worktree has no `node_modules` yet. This is an npm
  workspace: read `pnpm nx …` below as `npx nx …`.
- **Port 3000 trap:** the e2e config has `reuseExistingServer: true` on port 3000. If a dev
  server from another checkout (e.g. `main`) is already on 3000, the tests silently run
  against *that* code. From a worktree, start its own server on another port and point the
  tests at it: `npx nx run amortization-calculator:start --port=3200` (after `nx build`),
  then `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`.
- Run the timing tests against the production build (`start`), not `dev`. On the dev server
  with three browsers in parallel, the 250 ms page-change check is flaky on Firefox.
- Interfaces: [contracts/schedule-table-ui.md](./contracts/schedule-table-ui.md). Expected
  ranges: [data-model.md](./data-model.md).

## Automated checks

```bash
pnpm nx test amortization-ui            # getSchedulePage / pageContainingRow unit tests
pnpm nx test amortization-calculations  # unchanged; must stay green (FR-008)
pnpm nx lint amortization-ui amortization-calculator
pnpm nx e2e amortization-calculator-e2e # includes the new schedule-pagination.spec.ts
```

Expected: all pass. `export-schedule.spec.ts` still passes with 360 CSV rows unchanged (FR-007).

## Manual scenarios (`pnpm nx dev amortization-calculator`)

Each scenario starts from the defaults: $300,000, 6.5%, 30 years.

1. **First page (US1)**: The table has 12 body rows, numbered 1–12. The range reads
   "Payments 1–12 of 360". "First page" and "Previous page" have `aria-disabled="true"`.
2. **Navigate (US1)**: Activate Next. Rows 13–24 are shown. Activate Last. Rows 349–360 are
   shown, and row 360's Remaining Balance is `$0.00`.
3. **Keyboard only (SC-004)**: Tab to the pager. Use Enter/Space on the steps and the page
   links. Focus stays on the control you activated, and a screen reader announces the new
   range.
4. **Rows per page (US2)**: Go to page 3 (rows 25–36), then pick 60. Page 1 is shown with rows
   1–60. Pick All. 360 rows appear in the scroll area and the pager is hidden.
4b. **Go to year (SC-001)**: At 12 rows per page, type 15 in Go to year and press Tab. The
   range reads "Payments 169–180 of 360".
5. **Recalculate keeps page (US3)**: At 12 rows per page, go to page 10, then change the rate to
   7%. You are still on page 10 (rows 109–120), with new values.
6. **Shrinking schedule (US3)**: From page 25, add a recurring extra principal payment large
   enough to pay off in about 15 years. The pager shows the new last page.
7. **Invalid then valid (edge)**: On page 5, clear Loan amount. The schedule is hidden. Re-enter
   it, and you are back on page 5.
8. **Scenario switch (FR-005)**: On page 5, add or select another scenario tab. Its schedule
   starts on page 1, and the rows-per-page choice is kept.
9. **Export unaffected (FR-007)**: On page 7, export the CSV. The file has 360 data rows.
