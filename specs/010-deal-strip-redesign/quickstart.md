# Quickstart: Deal Strip & Visual Redesign

How to prove the feature works end to end. The details live in [spec.md](./spec.md),
[data-model.md](./data-model.md) and [contracts/](./contracts/).

## 1. Prerequisites

```sh
npm install
npx nx run-many -t lint test typecheck            # all green
npx nx build amortization-calculator
npx nx run amortization-calculator:start --port=3200   # prod build on :3200, not :3000 (often main's dev server); leave running
BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e
```

Open `design-reference.html` in a browser next to the app for the visual checks.

## 2. Setup mode (US3)

1. Use a fresh private window, then go to `/financing`. **Expect**: the sheet opens from the right
   with the header "Welcome, set up this deal". The page is dimmed behind it, and focus is inside.
2. Enter home price 450,000 and down payment 20%. **Expect**: the sentence reads "…borrowing
   $360,000…" and **Done** is enabled.
3. Select **Done**. **Expect**: the sheet closes, focus is on the h1, and the DSCR content shows.
4. Go to `/wealth`. **Expect**: the sheet does not reopen.
5. Add a scenario, clear its home price in the sheet, and switch away and back. **Expect**: no
   auto-open, because the duplicated scenario was already set up. Then reload in a new private
   window and press Escape on the setup sheet. **Expect**: it closes and stays closed for that
   scenario.

## 3. Deal strip (US1)

Use reference inputs: price 450,000, down 20%, rate 6.5, term 30, tax 5,400, insurance 1,800,
HOA 120, rent 3,200.

1. **Expect on every page**: there are no Loan, Real-estate costs or Rental sections, and the page
   content starts inside the first viewport at 1280×800 (SC-001).
2. On Financing, open the **Rate** chip and type 6. **Expect**: the DSCR updates live, and the
   popover shows "DSCR {old} → {new}".
3. Scroll to the bottom of `/amortization`. **Expect**: the strip is still pinned at the top.
4. At 390×844, open **Edit deal**. **Expect**: a bottom sheet, the chips wrap, and there is no
   horizontal page scroll.
5. **Expect**: every figure matches main's build for the same inputs (SC-004). Compare the
   Amortization total payment, Deal cash flow, DSCR, net worth at year 10, and the pro-forma IRR.

## 4. Errors (US3)

Clear the rate in the sheet. **Expect**:
- The strip shows "1 input needs fixing", and the Rate chip shows the error state.
- Selecting the count opens the sheet focused on Rate.
- The page messages offer a "Fix inputs" button, and the word "above" appears nowhere.

## 5. Sentence, payment bar, scrub, relevance (US4, US5)

- In the sentence, activate "6.5%" and type 6, then press Enter. **Expect**: the chip shows 6%.
- Activate the Tax segment in the payment bar. **Expect**: focus is on the property tax field.
- In the Rate popover on Financing, focus the label and press → ×4, then Shift+→. **Expect**: 7.0
  then 8.25, each with a signed DSCR delta.
- **Expect** chip order: Amortization starts with Loan amount, Rate, Term, Total, with Rent muted.
  Wealth starts with Home price, Down payment, Rent.

## 6. Ripple and undo (US6)

Change rent from 3,200 to 3,500 on Deal Analyzer. **Expect**:
- Cash flow and cash-on-cash flash, and the toast reads "Rent changed $3,200 → $3,500".
- **Undo** restores every figure.
- With reduced motion turned on (DevTools → Rendering), the flash appears without a transition.

## 7. Theme and visual fidelity (US2)

- Cycle the theme switcher: System → Light → Dark. **Expect**: no flash on reload, and the choice
  persists in a new tab.
- In System mode, toggle the OS theme. **Expect**: the app follows live.
- Run `visual.spec.ts` and compare the screenshots against the reference: strip, popover, sheet,
  setup sheet, toast, a card, the matrix table, and a chart, in light and dark (SC-010).
- Check spacing at 1280px. **Expect**: sections are 56px apart and no input grid has more than 2
  columns (SC-009).
- axe reports no violations on any page in either theme (SC-005, SC-006).

## 8. Hold & Exit (spec 009)

Run `specs/009-hold-exit-pro-forma/quickstart.md` §2–§6, with the shared inputs entered through the
strip and sheet. **Expect**: IRR is the headline in the chip popover.

## Verified on 2026-11-18

Every scenario was run against a prod build on :3200, mostly through the automated specs below
in chromium, firefox and webkit.

| § | Scenario | How it was verified |
|---|---|---|
| 1 | Gate | `nx run-many -t lint test typecheck`: 10 projects green, 430 unit tests |
| 2 | Setup mode | `setup-mode.spec.ts`: opens by itself with focus inside, Done gated then focuses h1, Escape skips, a new scenario gets its own setup |
| 3 | Deal strip | `deal-strip.spec.ts`: no repeated sections on 5 pages, Rate chip preview, sheet focus and Escape return, derived loan amount, sticky strip, bottom sheet at 390px, tab switching, first screen (SC-001) at 1280×800 and 390×844 |
| 3.5 | Same figures | The migrated specs pass with their original expected numbers (SC-004), plus spec 009's reference table to the cent |
| 4 | Errors | `setup-mode.spec.ts`: error count, red chip, count opens the sheet at the field, "Fix inputs" button, no "above" on any page |
| 5 | Sentence, bar, scrub, relevance | `deal-strip.spec.ts` US4/US5: sentence edit, payment-bar focus, a real label drag with a signed delta, arrow and Shift steps, chip order on 5 pages |
| 6 | Ripple and undo | `undo-ripple.spec.ts`: ripple on cash flow and CoC, toast text, Undo restores, reduced motion, polite announcer, survives navigation |
| 7 | Theme and visual | `theme.spec.ts` (System follows the OS live, explicit choice persists and is set before hydration), `a11y.spec.ts` (axe: no violations, 5 pages × 2 themes, plus sheet and popover), `visual.spec.ts` (spacing, 2-column, shadow rules, and screenshots reviewed against `design-reference.html`) |
| 8 | Hold & Exit | `pro-forma.spec.ts`: 19 tests covering spec 009 quickstart §2–§6 through the strip |

**Keyboard**: covered by e2e that only use the keyboard, not by a separate manual pass. That
includes the sheet focus trap and Escape return, chip popovers, arrow and Shift stepping,
Enter/Escape in the sentence, Tab to Undo, Escape to skip setup, and the segment controls.
