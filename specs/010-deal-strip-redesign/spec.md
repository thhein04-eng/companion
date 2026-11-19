# Feature Specification: Deal Strip & Visual Redesign

**Feature Branch**: `010-deal-strip-redesign`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Redesign the app's shared deal inputs and visual design, following the approved proposal page (https://claude.ai/artifact/FygF84YnUHskGM43qmuuHr). Two parts: (1) Concept A 'Deal strip + edit sheet': remove the repeated Loan, Real-estate costs and Rental input sections from every page and replace them with a sticky Deal Strip with scenario tabs, summary chips with popover editing and a live preview of the page's headline metric, and an 'Edit deal' side sheet (bottom sheet on mobile) grouped Property → Loan → Monthly costs → Rental. Page-only inputs stay inline. All layered ideas included: the deal as an editable sentence, the monthly payment bar as the cost editor, scrub-to-adjust, per-page relevance, change ripple plus undo, and first-run guided setup with missing-input chips and error routing. (2) Restyle the whole app (inputs, cards, colors, light and dark themes, typography, spacing, charts) to match the proposal page."

> **Design reference**: [`design-reference.html`](./design-reference.html) is a copy of the approved
> proposal page. Matching its look and feel exactly is **non-negotiable**: colors, typography,
> spacing, radii, borders, shadows, chip / button / tab / card / table / chart treatments, and
> motion. Where this spec and the reference disagree on a visual detail, the reference wins.
> Where they disagree on behavior, this spec wins.

## Clarifications

### Session 2026-11-17

- Q: Should the theme follow the OS only, or have a switcher? → A: Add a theme switcher button
  (System / Light / Dark), defaulting to System.
- Q: Is single-level undo enough? → A: Yes, agreed.
- Q: Is the Hold & Exit page (spec 009) built in this feature? → A: Yes. Build it here on the new
  design, following spec 009's own spec, data model and tasks.
- Q: May the redesign add new libraries? → A: Yes. A new UI component library, design system,
  typography / font setup and chart framework may all be adopted if they help match the reference
  exactly.
- Q: How dense should the layout be? → A: Spacious, never crowded, with the reference's spacing
  as the baseline (FR-033).
- Q: How strictly must the design match the reference? → A: Exactly. Non-negotiable.
- Q: How should first-run setup appear? → A: The Edit deal sheet opens by itself in setup mode
  ("Welcome, set up this deal") over the dimmed page. Closing it counts as Skip (FR-020, FR-021).
- Q: When an exact reference color fails contrast, which wins? → A: Keep the color exactly, and
  restrict where it is used (FR-035).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Edit the deal from a strip instead of repeated forms (Priority: P1)

An investor opens any analysis page: Amortization, Rental Deal Analyzer, DSCR & Financing,
Wealth Projection or Hold & Exit Pro Forma. The page title and subtitle come first. Directly under them sits the **Deal
Strip**. It holds the scenario tabs (switch, add, remove), a row of chips summarizing the active
scenario, and an **Edit deal** button. The page's own content (charts, metrics, schedule, matrix)
starts right below the strip. The Loan, Real-estate costs and Rental input sections that used to
open every page are gone.

The chips show, for the active scenario: **Home price**, **Down payment**, **Loan amount**,
**Rate**, **Term**, **Rent**, and the **Total monthly payment**, which is visually distinct.
Clicking a chip opens a small popover with that one field. Editing it recalculates the page
immediately, as typing in a field does today. The popover also shows the page's **headline
metric**, the value when the popover opened next to the current value (e.g. "DSCR 1.18 → 1.24").
Escape or clicking outside closes the popover.

**Edit deal** opens a sheet: from the right on desktop, from the bottom on phones. It contains
every shared input, grouped in this order:

1. **Property**: home price, down payment ($ / % toggle).
2. **Loan**: loan amount (shown as derived from price and down payment when it is), interest
   rate, term (years / months toggle), first payment date.
3. **Monthly costs**: property tax, insurance, PMI rate, HOA. The principal & interest and total
   monthly payment figures sit with this group.
4. **Rental**: the shared rental inputs (rent, vacancy, operating expenses, closing and rehab
   costs) as they exist today.

The strip stays visible (sticky) while the page scrolls. Inputs that only one page reads stay
inline on that page, next to their results: extra payments (Amortization), DSCR minimum and
financing terms (Financing), growth, land share and tax rate (Wealth), hold period and selling
costs (Hold & Exit).

**Why this priority**: This is the core problem. About 650px of identical form pushes every
page's real content below the fold, and spec 009 would add a fifth copy.

**Independent Test**: On each of the four pages, confirm no Loan / Real-estate costs / Rental
input section renders. Change the rate through a chip on Financing, then through the sheet on
Wealth. Confirm both pages and the Amortization page reflect each change.

**Acceptance Scenarios**:

1. **Given** any analysis page, **When** it loads, **Then** the Deal Strip renders under the page
   header and no repeated Loan, Real-estate costs or Rental input section renders on the page.
2. **Given** the Financing page with a valid deal, **When** the user opens the Rate chip and
   changes 6.5 to 6.0, **Then** the DSCR card and matrix update immediately, and the popover shows
   the DSCR value from when it opened and the current one.
3. **Given** any page, **When** the user activates **Edit deal**, **Then** a sheet opens with the
   four groups in order Property, Loan, Monthly costs, Rental, focus moves into it, and closing it
   returns focus to **Edit deal**.
4. **Given** a home price and down payment are set, **When** the sheet or the Loan amount chip
   is opened, **Then** the loan amount is presented as derived from them, following spec 001's
   existing override rules.
5. **Given** the user has scrolled down a long page (e.g. the amortization schedule), **When**
   they look at the top of the viewport, **Then** the Deal Strip is still visible.
6. **Given** a phone-width viewport, **When** the user activates **Edit deal**, **Then** the sheet
   opens from the bottom and the chips wrap without horizontal page scrolling.
7. **Given** two scenarios, **When** the user switches tabs in the strip, **Then** the chips, the
   sheet and the page content all switch to that scenario.

---

### User Story 2 - The whole app follows the proposal's visual design (Priority: P1)

Every page, control and chart takes on the visual language of the design reference: cool,
slightly blue-tinted neutrals, a muted steel-blue accent, semantic good / bad / warning colors
with soft tinted backgrounds, Space Grotesk headings, Inter body text, a monospace face for
code-like data, tabular numerals wherever digits line up, uppercase letter-spaced eyebrow labels,
pill-shaped chips, 7–10px corner radii, hairline borders, and card styling used selectively.
Charts use the reference's five-step series palette and theme-aware text and gridlines.

A **theme switcher** button offers System, Light and Dark. System is the default and follows the
OS preference. The choice is remembered on the device. Both themes are designed to the token
values in the Appendix.

Pages feel **spacious**: generous gaps between sections, roomy cards, comfortable line lengths,
and never more than two input columns side by side.

**Why this priority**: The user explicitly asked for "everything" to follow the reference page.
It is independent of US1: restyling the current layout alone is a valid, shippable slice.

**Independent Test**: Toggle the OS between light and dark. Walk every page (including the nav,
the mobile drawer, tables, charts, tooltips, error states and the not-found page). Confirm colors,
type, radii and spacing match the reference, and no element keeps an old hard-coded color that
reads wrong in either theme.

**Acceptance Scenarios**:

1. **Given** the OS is set to dark, **When** any page loads, **Then** it renders the dark token
   palette, including form controls and scrollbars, with no light-only surfaces left over.
2. **Given** any page, **When** it renders, **Then** headings use the display face, body text the
   body face, and numeric columns and figures use tabular numerals.
3. **Given** any chart, **When** it renders in either theme, **Then** its series colors come from
   the series palette, and its axis text, gridlines and tooltip are legible against the background.
4. **Given** a positive or negative figure (cash flow, cash-on-cash, DSCR versus minimum, rule
   indicators), **When** it renders, **Then** it uses the good / bad / warning semantic colors and
   their soft backgrounds rather than the accent.
5. **Given** the display fonts fail to load, **When** the page renders, **Then** text falls back to
   a system sans-serif stack and stays readable.
6. **Given** the OS is dark, **When** the user picks Light in the theme switcher, **Then** the app
   switches to light immediately, and stays light after a reload and on other pages.
7. **Given** the theme is System, **When** the OS preference changes, **Then** the app follows it
   without a reload.
8. **Given** any page at 1280px wide, **When** it renders, **Then** sections are at least 48px
   apart and no input group shows more than two columns.

---

### User Story 3 - Guided first-run setup and error routing (Priority: P2)

When the active scenario has not been set up yet (no home price entered), the **Edit deal sheet
opens automatically** in **setup mode** when the page loads: from the right on desktop, from the
bottom on phones. The page stays visible but dimmed behind it. The sheet's header reads "Welcome,
set up this deal", with a one-line hint. Below it are the deal sentence and the same four groups
as always. **Done** is enabled once the property and loan inputs are valid. Closing the sheet any
other way (the close button, Escape, clicking the dimmed page) counts as **Skip**. Done or Skip
ends setup mode for that scenario for the rest of the session. The sheet then never opens by
itself again for that scenario, and the user reaches it through **Edit deal** as usual.

After setup, inputs a page needs but the deal lacks show as dashed **missing-input chips** in the
strip, worded by what they unlock, for example "+ Add rent to unlock cash flow". Selecting one
opens the sheet focused on that field.

When any shared input is invalid, the strip shows an error count (e.g. "2 inputs need fixing").
The affected chips turn to the bad color. Selecting the count opens the sheet scrolled to and
focused on the first invalid field. Page messages that used to say "Fix the highlighted fields
above" now name the problem and offer a button that does the same thing.

**Why this priority**: Without it, removing the inline forms (US1) leaves new users with nowhere
obvious to start, and leaves error messages pointing at fields that are no longer on screen.

**Independent Test**: Start a fresh session and confirm the setup sheet opens by itself.
Complete it and confirm it doesn't reopen on other pages. Clear the rate in the sheet and confirm the count, the red chip, and that the
count opens the sheet on the rate field.

**Acceptance Scenarios**:

1. **Given** a new session (default scenario, no home price), **When** any analysis page loads,
   **Then** the Edit deal sheet opens by itself in setup mode with the "Welcome, set up this deal"
   header, focus inside it, and the page dimmed behind it.
2. **Given** the setup sheet is open, **When** the user enters a valid home price and down payment
   and selects **Done**, **Then** the sheet closes, focus moves to the page heading, and the page
   shows its results.
3. **Given** the setup sheet is open, **When** the user presses Escape, **Then** the sheet closes,
   and navigating to another page does not reopen it for that scenario.
4. **Given** setup was skipped for Scenario 1, **When** the user adds a scenario with no home price
   and switches to it, **Then** the setup sheet opens for that new scenario.
5. **Given** the Deal Analyzer page and a deal with no rent, **When** the page loads after setup,
   **Then** the strip shows a missing-input chip for rent that opens the sheet on the rent field.
6. **Given** the rate field is empty, **When** any page renders, **Then** the strip shows an error
   count of 1, the Rate chip shows the bad state, and selecting the count opens the sheet focused
   on the rate field with its error message visible.
7. **Given** an invalid loan input on the Wealth page, **When** the projection cannot be computed,
   **Then** the page message names the problem and offers a button that opens the sheet at the
   field, and no text says "highlighted fields above".

---

### User Story 4 - Read and edit the deal as a sentence and a payment bar (Priority: P3)

At the top of the sheet (in both normal and setup mode), the deal reads as a sentence: "Buying a
**$450,000** home with **20%** down, so borrowing **$360,000** at **6.5%** for **30 years**,
renting it for **$3,200**/mo." Each bold input value is an inline editor: activating it turns it
into a small field in place. Derived values (the loan amount when derived) are shown but not
editable. Values the deal lacks read as an editable placeholder ("add rent").

In the Monthly costs group, the total monthly payment is drawn as a stacked bar of principal &
interest, property tax, insurance, PMI and HOA, with a legend of names and amounts. Activating a
cost segment or its legend entry moves focus to that cost's field. A $0 cost is listed in the
legend ("PMI $0 at 20% down") but has no segment.

**Why this priority**: These make the inputs faster to read and more meaningful, but US1's
fields already allow every edit.

**Independent Test**: In the sheet, edit the rate from the sentence and confirm the Loan group
field and the chip match. Activate the Tax segment and confirm focus lands on the property tax
field.

**Acceptance Scenarios**:

1. **Given** the sheet is open, **When** the user activates "6.5%" in the sentence and enters 6,
   **Then** the rate updates everywhere and the sentence reads "6%".
2. **Given** the loan amount is derived, **When** the user tries to activate it in the sentence,
   **Then** it is not editable, and its accessible description says it comes from price and down
   payment.
3. **Given** tax, insurance and HOA are set, **When** the Monthly costs group renders, **Then** the
   payment bar's segments sum to the total monthly payment shown, within rounding.
4. **Given** the payment bar, **When** the user activates the Tax segment by mouse or keyboard,
   **Then** focus moves to the property tax field.

---

### User Story 5 - Scrub values and see what each page uses (Priority: P3)

Numeric field labels in the sheet and in chip popovers can be **scrubbed**: dragging horizontally
on the label nudges the value up or down. With the label focused, arrow keys step it, and Shift
plus an arrow steps ten times as far. Steps suit each field: rate 0.125 points, term 1 year,
home price $1,000, rent $25, down payment 1 point or $1,000, property tax and insurance $100/yr,
PMI 0.05 points, HOA $10. While scrubbing, the popover and sheet show the headline metric's change
as a signed delta in good or bad color.

Each page declares which shared inputs it reads. The strip shows those chips first, in accent
style ("pinned"). Chips for inputs the page doesn't read are de-emphasized but still editable.

| Page            | Pinned first                              | De-emphasized         |
| --------------- | ----------------------------------------- | --------------------- |
| Amortization    | Loan amount, Rate, Term, Total payment    | Rent                  |
| Deal Analyzer   | Home price, Down payment, Rent, Total     | —                     |
| DSCR & Financing| Rate, Term, Rent                          | —                     |
| Wealth          | Home price, Down payment, Rent            | —                     |
| Hold & Exit     | Home price, Rent, Rate                    | —                     |

**Why this priority**: Speeds up what-if exploration, which is the app's main loop. Not needed to
complete any edit.

**Independent Test**: On Financing, focus the Rate label in its popover, press → four times, and
confirm the rate is 0.5 points higher and the DSCR delta shows. Compare chip order between
Amortization and Wealth.

**Acceptance Scenarios**:

1. **Given** the Rate popover on Financing, **When** the user drags right on the Rate label,
   **Then** the rate increases in 0.125 steps and a signed DSCR delta shows.
2. **Given** a focused scrub label, **When** the user presses Shift+→, **Then** the value
   increases by ten steps, clamped to the field's valid range.
3. **Given** the Amortization page, **When** the strip renders, **Then** Loan amount, Rate, Term
   and Total payment come first in accent style and Rent is de-emphasized.

---

### User Story 6 - See what changed, and undo it (Priority: P3)

Because inputs are no longer next to every result, the app confirms each change. After a shared
input changes, the page's figures whose values changed are highlighted briefly in the warning
tint. A toast states the change, e.g. "Rate changed 6.5% → 6.0%", with an **Undo** action. Undo
restores the previous value, and the page recalculates. Continuous edits, like typing a number or
one scrub gesture, count as one change. The toast closes after about 6 seconds, when the user
dismisses it, or when a newer change replaces it.

**Why this priority**: Reassurance and recovery; valuable but not required to complete tasks.

**Independent Test**: Change the rent from a chip. Confirm the toast and highlighted metrics,
select Undo, and confirm the rent and all figures are back to their earlier values.

**Acceptance Scenarios**:

1. **Given** the Deal Analyzer page, **When** the user changes rent from 3,200 to 3,500, **Then**
   cash flow and cash-on-cash are briefly highlighted and the toast reads "Rent changed
   $3,200 → $3,500".
2. **Given** the toast is showing, **When** the user selects **Undo**, **Then** rent returns to
   $3,200 and all figures match their earlier values exactly.
3. **Given** reduced motion is preferred, **When** a change happens, **Then** the highlight
   appears without animation.
4. **Given** the toast, **When** a screen reader is running, **Then** the change is announced
   politely and **Undo** can be reached by keyboard.

---

### Edge Cases

- **No home price set**: Home price and Down payment chips show "Add" placeholders. The Loan amount
  chip is directly editable, as the loan amount field is today when there is no price.
- **Loan amount overridden by the user**: The chip and sentence show the override as an input, not
  derived, following spec 001's existing override rule.
- **Very narrow viewport (≤360px)**: Chips wrap onto multiple lines. The strip stays sticky but
  never takes more than about a third of the viewport height. Beyond that, the chips row scrolls
  horizontally inside the strip.
- **Popover near the viewport edge**: It repositions to stay fully on screen.
- **Switching scenario while the sheet or a popover is open**: The open editor switches to the new
  scenario's values. An undo toast from the previous scenario is dismissed.
- **Removing the active scenario**: Same behavior as today's tabs. The strip and sheet follow the
  newly active scenario.
- **Headline metric unavailable** (e.g. no rent on Financing): The popover preview line says why
  (e.g. "Add rent to see DSCR") instead of showing a number.
- **Undo after navigating to another page**: The toast persists across client-side navigation
  until it times out. Undo still applies to the scenario it came from.
- **Undo after the scenario was removed**: The toast is dismissed and Undo is not offered.
- **Invalid value typed into a chip popover**: The field shows the same error message the sheet
  would. The chip turns to the bad state and the error count updates.
- **Fonts loading late**: Text renders in the fallback stack first without layout jumping enough
  to move the strip or charts noticeably.
- **Hold & Exit page (spec 009)**: Built in this feature. It uses the Deal Strip, with its hold
  and selling-cost inputs inline. Its headline metric is IRR and its pinned inputs are Home price,
  Rent and Rate.
- **Theme preference unavailable** (storage blocked): The switcher still works for the visit and
  falls back to System on the next load.

## Requirements _(mandatory)_

### Functional Requirements

**Deal Strip & sheet (US1)**

- **FR-001**: Every analysis page MUST render the Deal Strip directly below its page header and
  MUST NOT render the shared Loan, Real-estate costs or Rental input sections inline.
- **FR-002**: The Deal Strip MUST contain the scenario tabs with today's switch, add and remove
  behavior, the summary chips (FR-003), and an **Edit deal** control.
- **FR-003**: The strip MUST show chips for home price, down payment, loan amount, interest rate,
  term, rent, and the total monthly payment. The total MUST be visually distinct from input chips.
  Values MUST use the app's existing currency and percent formatting.
- **FR-004**: Activating an input chip MUST open a popover with that field, with the same
  validation and error messages as the sheet. Changes MUST apply immediately.
- **FR-005**: The chip popover MUST show the page's headline metric as "value at open → current
  value", or a reason when it can't be computed. Headline metrics: Amortization, total monthly
  payment; Deal Analyzer, monthly cash flow; DSCR & Financing, DSCR; Wealth, net worth at the
  horizon year; Hold & Exit, IRR.
- **FR-006**: **Edit deal** MUST open a sheet with every shared input in groups ordered Property,
  Loan, Monthly costs, Rental. On viewports at or above the app's desktop breakpoint it MUST open
  from the right; below it, from the bottom.
- **FR-007**: The sheet and popovers MUST trap focus while open, close on Escape and outside click,
  and return focus to the control that opened them.
- **FR-008**: The Deal Strip MUST stay visible at the top of the viewport while the page scrolls,
  below the app's mobile header where one is shown.
- **FR-009**: Inputs read by only one page MUST remain inline on that page: extra payments
  (Amortization), DSCR minimum and financing terms (Financing), growth, land share and tax rate
  (Wealth), hold period and selling costs (Hold & Exit).
- **FR-010**: All values MUST continue to be shared across pages and the session exactly as today.
  This feature MUST NOT change any calculation result.

**Visual design (US2)**

- **FR-011**: The app MUST define its colors, type families, radii and chart series colors as one
  shared set of design tokens with the values in the Appendix. Components MUST take every color
  from those tokens.
- **FR-012**: The app MUST provide a theme switcher with System, Light and Dark. System is the
  default and follows the OS preference live. The choice MUST be remembered on the device across
  sessions and applied before first paint, with no flash of the wrong theme. Both themes use the
  Appendix's values, including native form controls and scrollbars. The switcher MUST sit in the
  side nav (expanded and collapsed) and the mobile header, and MUST be keyboard operable with an
  accessible name that states the current theme.
- **FR-013**: Headings MUST use the display face (Space Grotesk), body text the body face (Inter),
  and code-like data the monospace face (JetBrains Mono), each with a system fallback stack.
- **FR-014**: Any figure that lines up in a column or updates live MUST use tabular numerals.
- **FR-015**: Section eyebrow labels MUST be uppercase, letter-spaced (~0.08em), small and muted,
  as in the reference.
- **FR-016**: Inputs, buttons, tabs, segmented toggles, cards, tables, badges, the side nav, the
  mobile drawer, tooltips and the not-found page MUST be restyled to the reference's treatments:
  hairline borders, 5–10px radii (pills for chips and badges), the reference's surface, sunk and
  line tones, primary buttons and selected tabs in the ink color, and a visible accent-colored
  focus ring.
- **FR-017**: Card styling (border, fill, radius, shadow) MUST be applied by role, not to every
  block. Shadows are reserved for floating layers: popovers, the sheet and toasts.
- **FR-018**: Every chart MUST draw series in the seg1–seg5 palette order. Axis text, gridlines,
  legends and tooltips MUST use theme tokens, and positive / negative series MUST use the semantic
  good / bad colors.
- **FR-019**: Text and essential UI MUST meet WCAG 2.1 AA contrast in both themes.
- **FR-033**: Layout MUST be spacious, using the reference's spacing as the minimum: ≥48px
  between page sections (≥32px below 640px wide; reference: 56px), ~18px between a section's heading and its content,
  18–22px inner padding on cards and panels, ≥12px gaps in input grids, at most two input
  columns, body line-height ~1.55, and running text no wider than ~68 characters.
- **FR-034**: Visual fidelity to the design reference is mandatory. Every component listed in
  FR-016, plus the Deal Strip, chips, popovers, sheet, sentence, payment bar, toast and charts,
  MUST match the reference's corresponding treatment. Where the reference shows no direct
  equivalent, the component MUST be derived from the reference's tokens and closest pattern.
- **FR-035**: When a reference color has too little contrast for a use, the use changes and the
  color stays the same, so FR-034 and FR-019 both hold:
  - `faint` is only for borders, dividers and decoration, never text.
  - Chart series under 3:1 against the surface (light `seg3`, `seg4`) always have a legend or
    direct labels, plus the data table.
  - Text on a colored segment needs ≥ 4.5:1, or the label moves outside the segment.
  - De-emphasized chips use `text-muted` with no reduced opacity.
  - `warn` text sits only on `warn-soft`, `surface` or `bg`, never `sunk`.

**Guided setup & errors (US3)**

- **FR-020**: When the active scenario has no home price and setup hasn't been completed or
  skipped for that scenario this session, the Edit deal sheet MUST open by itself in setup mode
  when a page loads or that scenario becomes active. The page stays visible but dimmed. The
  header reads "Welcome, set up this deal", and the sheet offers **Done**.
- **FR-021**: **Done** MUST be enabled only once property and loan inputs are valid. Any other way
  of closing the setup sheet (close button, Escape, clicking outside) MUST count as **Skip**.
  Either one ends setup mode for that scenario for the rest of the session, and the sheet MUST NOT
  open by itself again for it. After Done, focus moves to the page heading.
- **FR-022**: When a page needs a shared input the deal lacks, the strip MUST show a dashed
  missing-input chip naming what it unlocks. Selecting it MUST open the sheet focused on that field.
- **FR-023**: When any shared input is invalid, the strip MUST show the count of invalid inputs.
  Affected chips MUST show the bad state, and selecting the count MUST open the sheet focused on
  the first invalid field in group order.
- **FR-024**: Page messages that refer to fixing inputs MUST name the problem and offer an action
  that opens the sheet at the relevant field. No message may refer to fields "above".

**Sentence & payment bar (US4)**

- **FR-025**: The sheet (in both normal and setup mode) MUST open with the deal sentence. Each input value in it
  MUST be an inline editor sharing the field's validation. Derived values MUST be shown but not
  editable.
- **FR-026**: The Monthly costs group MUST show the total monthly payment as a stacked bar of its
  non-zero parts with a legend listing every part (including $0 ones). Activating a cost segment
  or legend entry MUST focus that cost's field.

**Scrub & relevance (US5)**

- **FR-027**: Numeric field labels in the sheet and popovers MUST support drag-to-scrub and, when
  focused, arrow-key stepping (Shift = 10 steps), using the step sizes in US5 and clamped to the
  field's valid range. Scrubbing MUST show the headline metric's signed delta.
- **FR-028**: Each page MUST declare its pinned and de-emphasized shared inputs (US5 table). The
  strip MUST order pinned chips first in accent style and show de-emphasized chips muted but
  editable.

**Change ripple & undo (US6)**

- **FR-029**: After a shared input changes, the page MUST briefly highlight (~1.5 seconds) each
  displayed headline figure whose value changed. With reduced motion preferred, the highlight
  MUST appear without animation.
- **FR-030**: After a shared input changes, the app MUST show a toast naming the field and its old
  and new values, with **Undo**. Continuous edits (one typing burst, one scrub gesture) count as
  one change. The toast closes after ~6 seconds, on dismiss, or when replaced by a newer change.
- **FR-031**: **Undo** MUST restore the previous value of the last change only (single level) and
  recalculate. The toast MUST be announced politely to assistive technology and be keyboard
  reachable.

**Accessibility (all stories)**

- **FR-032**: Every new control (chips, popovers, sheet, sentence editors, payment-bar segments,
  scrub labels, toast) MUST be fully operable by keyboard with correct ARIA roles and names, built
  on the workspace's headless behavior SDK where it provides the primitive.

### Key Entities

- **Deal (shared inputs)**: The existing scenario fields every page shares: home price, down
  payment, loan amount (and whether it is derived), rate, term, first payment date, tax,
  insurance, PMI rate, HOA and the shared rental inputs. No new persisted data except FR-021's
  per-scenario "setup done" flag for the session.
- **Page profile**: For each page, its pinned inputs, de-emphasized inputs, required inputs (for
  missing-input chips) and its headline metric.
- **Change record**: The last shared-input change: scenario, field, old value, new value. Kept in
  memory only and used for the toast and undo.
- **Design tokens**: The named colors (light and dark), type families, radii and chart series
  colors in the Appendix.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: On every analysis page, at 1280×800 and at 390×844, the page's own first content
  block begins within the first viewport once setup is complete. Today it starts about 650px
  lower.
- **SC-002**: Zero shared-input sections are duplicated across pages. Each shared input has
  exactly one full editing surface (the sheet), plus its chip.
- **SC-003**: From any page, a user can change any single shared input in at most 2 interactions
  (open chip, type) and see the page update.
- **SC-004**: Every calculation figure on every page is identical before and after the redesign
  for the same inputs, verified by the existing test suites passing unchanged.
- **SC-005**: Every flow in US1–US6 can be completed by keyboard only, and automated accessibility
  checks report no new violations.
- **SC-006**: All text and essential UI pass WCAG 2.1 AA contrast in both light and dark themes.
- **SC-007**: A side-by-side review of each page against the design reference finds no element
  using colors, fonts or radii outside the token set.
- **SC-008**: A first-time user reaches a fully set-up deal from the setup sheet in under 2 minutes.
- **SC-009**: At 1280px and 390px wide, no two page sections are closer than 48px (32px on
  phones), and no input group shows more than two columns.
- **SC-010**: Side-by-side screenshots of the Deal Strip, chips, popover, sheet, sentence, payment
  bar, toast, cards, tables and charts against the design reference show matching tokens,
  spacing and treatments in both themes.

## Assumptions

- **Theme**: A System / Light / Dark switcher, defaulting to System (FR-012). The theme choice is a
  display preference, not financial data, so it may be remembered on the device across sessions
  without conflicting with Constitution Principle III.
- **Libraries**: The plan may adopt a new UI component library or design system, a new
  font-loading approach and a new chart framework wherever that helps match the reference exactly.
  Any departure from the constitution's default stack MUST be justified in the plan's Complexity
  Tracking, and keyboard / ARIA behavior MUST be preserved (Principle IV).
- **"Set up" means a home price exists**: The default scenario already has valid loan values
  ($300,000, 6.5%, 30 years) but no home price, so a missing home price is the signal for the setup
  setup. A duplicated scenario inherits its source's values, so it usually skips setup.
- **Rental inputs in the sheet**: The sheet hosts all inputs currently in the shared rental panel,
  except growth rates, which the Wealth page already moves into its own assumptions (spec 008).
- **Headline metrics** are the ones listed in FR-005. Spec 009's page declares its own.
- **Undo** is single-level and session-only, with no persistent history and no keyboard shortcut
  beyond the toast's button.
- **Fonts** may be bundled with the app or loaded from a font service. Either way, a system
  fallback stack is declared.
- **Scope**: The Hold & Exit page (spec 009) is built in this feature, per spec 009's spec, data
  model and tasks, presented with this spec's strip and design. Apart from spec 009's own
  additions, there are no calculation, validation or persistence changes, beyond the in-memory
  change record, the per-scenario "setup done" flag and the theme preference.
- **Tests**: End-to-end tests that fill shared fields directly will be updated to go through the
  strip or sheet. This is expected churn, not a regression.

## Appendix: Design Tokens (from the design reference)

| Token        | Light      | Dark       | Role                                        |
| ------------ | ---------- | ---------- | ------------------------------------------- |
| bg           | `#f6f7f8`  | `#111417`  | Page background                             |
| surface      | `#ffffff`  | `#191d21`  | Cards, strip, sheet, popovers               |
| sunk         | `#eef0f2`  | `#22272c`  | Chips, inset fields, derived-value rows     |
| line         | `#dde1e5`  | `#2f363c`  | Hairline borders, table rules               |
| fg           | `#16191d`  | `#e8ebee`  | Primary text                                |
| muted        | `#5d6670`  | `#a0a9b2`  | Secondary text, labels                      |
| faint        | `#8a939c`  | `#76808a`  | Tertiary text, hover borders                |
| ink / ink-fg | `#16191d` / `#ffffff` | `#e8ebee` / `#111417` | Primary buttons, selected tabs |
| accent       | `#2f5d8a`  | `#8db4dc`  | Links, pinned chips, focus ring             |
| accent-soft  | `#e4edf6`  | `#1f2e3d`  | Pinned chip fill, chart area fill           |
| good / soft  | `#11795a` / `#e2f4ec` | `#5cc79f` / `#163328` | Positive figures      |
| bad / soft   | `#b4262b` / `#fbe7e7` | `#f08a8d` / `#3a1d1f` | Negative figures, errors |
| warn / soft  | `#9a6300` / `#fbf1dc` | `#e0b25a` / `#352a14` | Change ripple, cautions  |
| seg1–seg5    | `#2f5d8a` `#6b8fb3` `#9bb4cc` `#c79a3b` `#8e7cc3` | `#8db4dc` `#5f87ad` `#3f5f7e` `#d6aa4e` `#a796d8` | Chart series in order |
| shadow       | `0 8px 28px rgba(16,24,40,.12)` | `0 8px 28px rgba(0,0,0,.5)` | Floating layers only |

**Type**: display Space Grotesk 500/600; body Inter 400/500/600; mono JetBrains Mono 400/500.
Scale from the reference: page title 28–40px, section heading 24px, card heading 17px, body 15px,
small 13–14px, eyebrow 12px uppercase.

**Radii**: 4–5px small (fields, segments), 6–8px (buttons, cards, strip), 10px (large panels),
999px (chips, badges).
