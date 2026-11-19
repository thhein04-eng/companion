# Quickstart: UI Polish (spec 011)

Prereqs as in spec 010: `npx nx build amortization-calculator && npx nx run amortization-calculator:start --port=3200`,
then `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`.

1. **Deal bar**: On all 5 pages the bar is above the h1, full width, with a sunk fill and a
   divider. "Edit deal" is a labeled primary button on the right, the same on every page. At 390px
   the bar sits under the mobile header with no horizontal scroll. Tab order is tabs → chips → Edit
   deal.
2. **Extra payments**: On `/amortization`, Type, Amount, When and Add share one aligned row, and
   $1,000,000.00 is fully visible. Recurring shows "Every month, starting with payment 1". Add a
   recurring and a one-time payment: the rows show a badge, amount and timing, and Remove removes
   one. With none, the empty-state line shows.
3. **Metric cards**: On `/deal-analyzer` with the reference deal, three equal-height cards sit in
   one row: Cap rate 4.65%, 1% Rule 0.71% Fail, 50% Rule 45.5% Pass. With no rent, each shows N/A
   in the same layout. At 390px they stack.
4. **Date picker**: In the sheet, "Choose date" opens the calendar. Pick a day by mouse, then by
   keyboard (arrows, PageDown, Enter). Escape closes the calendar and focus returns. Typing still
   works. The same works on the one-time extra payment date.
5. **Regression**: The full gate and e2e pass. axe is clean in both themes, including with the
   calendar open.

## Verified on 2026-11-19

§1–§5 were checked through their automated equivalents on a prod build (:3200), in Chromium,
Firefox and WebKit:

| Section | Specs |
|---|---|
| Deal card | `deal-bar`, `deal-strip` |
| Extra payments | `extra-payments-ui`, `extra-payments` |
| Metric cards | `metric-cards` |
| Date picker | `date-picker` |
| Accessibility | `a11y` |

The full suite passed twice (505 passed, 8 skipped), and the screenshots listed in tasks.md
§ Final verification were reviewed by eye.
