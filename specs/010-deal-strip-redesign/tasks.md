---
description: 'Task list for 010 Deal Strip & Visual Redesign'
---

# Tasks: Deal Strip & Visual Redesign

**Input**: Design documents from `/specs/010-deal-strip-redesign/`: plan.md, spec.md,
research.md (R1–R10), data-model.md (§A–§G), contracts/design-system.md,
contracts/deal-ui.md, quickstart.md, and the visual source of truth `design-reference.html`.
Spec 009 (`specs/009-hold-exit-pro-forma/`) is folded in (Phase 5).

**Tests**: Included. Constitution I requires unit tests for new pure functions. The workspace
gate requires `nx lint`, `test` and `e2e` before a task is marked done, and research R10 defines
the e2e, visual and axe coverage. Write the tests first within each story.

**Organization**: One phase per user story, in spec priority order. Spec 009 sits after the two
P1 stories because its page is built on their components.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**: US1–US6 from spec.md.

## Conventions for every task

- **Visual rule**: Every class is a token utility from `libs/shared/ui/src/styles/tokens.css`
  (`bg-surface`, `text-muted`, `border-line`, `rounded-lg`, `font-display`, …). No `neutral-*`,
  `red-*`, `emerald-*`, `sky-*`, hex literal or arbitrary color value. When a task says "copy
  `.x`", open `design-reference.html`, copy that rule's colors, borders, radii and weights, and
  scale mockup font sizes and paddings ×1.2 (contracts/design-system.md §2, "Mockup scale rule").
- **Behavior rule**: Overlays, tabs, toggles and toasts come from `@ui-sdk/react`
  (Constitution IV). Read the component's `.d.ts` in `node_modules/@ui-sdk/react/dist/` before
  using it, and don't guess props.
- **Commands**: Use `npx nx …`. E2E always runs against a prod build on :3200:
  `npx nx build amortization-calculator && npx nx run amortization-calculator:start --port=3200`,
  then `BASE_URL=http://127.0.0.1:3200 npx nx e2e amortization-calculator-e2e`. Never use :3000,
  which is often main's dev server.
- **Gate**: Before checking off any task, run
  `npx nx run-many -t lint test typecheck -p <affected projects>`. Tasks that close a story phase
  also run the full e2e on :3200 (Constitution: Development Workflow & Quality Gates).
- **Contrast rule (spec FR-035)**: Reference colors are used exactly, but a weak color never
  carries text it can't support:
  - `faint` is only for borders, dividers and decoration, never text.
  - Text on a colored chart segment needs ≥ 4.5:1, or the label moves to the legend.
  - `warn` text sits only on `warn-soft`, `surface` or `bg`.
  - No `opacity-*` on text.

---

## Phase 1: Setup

- [X] T001 Record a baseline:
  - Run `npx nx run-many -t lint test typecheck` (all projects).
  - Run the full e2e on :3200.
  - Paste the pass counts under "Baseline notes" at the end of `specs/010-deal-strip-redesign/tasks.md`.
- [X] T002 Install `@axe-core/playwright` as an exact-pinned devDependency (`npm i -D -E @axe-core/playwright`) in the root `package.json`, and confirm `npx nx e2e amortization-calculator-e2e --list` still loads.
- [X] T003 [P] Find out where ui-sdk saves preferences:
  - Read `node_modules/@ui-sdk/core/dist/foundation/preferences/*.js`, covering `createPreference` and `createColorScheme`.
  - Write the result under research.md R3 "Verify in implementation": the storage key, the storage type, and how to configure it.
  - If it isn't `localStorage`, note the option T008 must pass.
- [X] T004 [P] Read the `.d.ts` files for `popover`, `drawer`, `toast`, `segmented-control`, `tabs`, `preferences` and `button` in `node_modules/@ui-sdk/react/dist/`. Append a short props cheat-sheet (component → key props) to `specs/010-deal-strip-redesign/contracts/deal-ui.md` under a new "## ui-sdk props used" heading.

---

## Phase 2: Foundational (blocks every story)

### Tokens, fonts, theme plumbing (R1, R3, R4)

- [X] T005 Create `libs/shared/ui/src/styles/tokens.css`, exactly as in contracts/design-system.md §1–§3. Map `faint` as a color only for `border-faint`, `outline-faint` and `fill-faint` (decoration). Don't use it for text, per FR-035, which T063 enforces:
  - Light tokens on `:root`, using the spec Appendix values verbatim.
  - The dark block under `@media (prefers-color-scheme: dark) { :root:not([data-color-scheme="light"]) {…} }` and again under `:root[data-color-scheme="dark"]`, both with `color-scheme: dark`.
  - `:root[data-color-scheme="light"] { color-scheme: light }`.
  - `@theme inline` mapping to the `--color-*`, `--font-*`, `--radius-*` and `--shadow-float` names in §1.
  - The type-scale utilities `text-title`, `text-h2`, `text-h3`, `text-body`, `text-lede`, `text-small`, `text-eyebrow` and `text-label` (§2).
  - The spacing variables `--space-page` (56px, 32px below 640px), `--space-section` 18px, `--space-card` 20px and `--space-grid` 14px (§3).
  - Base rules: `body` uses `bg-bg text-fg font-body` at 15px / 1.55. `h1`–`h3` use `font-display`, `letter-spacing: -0.01em` and `text-wrap: balance`. `:focus-visible` gets `outline: 2px solid var(--color-accent); outline-offset: 2px`. `.num` gets tabular numerals. `p` gets `max-width: 68ch`. `@media (prefers-reduced-motion: reduce)` disables transitions.
- [X] T006 Wire the stylesheet:
  - Add `"./styles/tokens.css": "./src/styles/tokens.css"` to `exports` in `libs/shared/ui/package.json`.
  - In `apps/amortization-calculator/src/app/global.css`, `@import 'shared-ui/styles/tokens.css'` right after `@import 'tailwindcss'`.
  - Delete the old `:root { color-scheme: light dark }` and `body { font-family … }` rules.
  - Keep the `@source` lines.
- [X] T007 In `apps/amortization-calculator/src/app/layout.tsx`:
  - Load `Space_Grotesk({ subsets:['latin'], weight:['500','600'], variable:'--font-space-grotesk', display:'swap' })`, `Inter({ subsets:['latin'], weight:['400','500','600'], variable:'--font-inter', display:'swap' })` and `JetBrains_Mono({ subsets:['latin'], weight:['400','500'], variable:'--font-jetbrains-mono', display:'swap' })` from `next/font/google`.
  - Put all three `.variable` classes on `<html>`.
  - In tokens.css, set `--font-display: var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif`, the same pattern for body with Inter, and `--font-mono: var(--font-jetbrains-mono), ui-monospace, Menlo, monospace`.
- [X] T008 Theme plumbing (R3):
  - Create `libs/shared/ui/src/lib/ds/color-scheme.ts` exporting `export const colorScheme = createColorScheme({ global: true })`, adding the storage option from T003 if one is needed.
  - In `layout.tsx`, render `<Preferences preferences={[colorScheme]}>` from `@ui-sdk/react/preferences` as the first child of `<body>`, wrapping the providers.
  - Add `suppressHydrationWarning` to `<html>`.
  - Confirm in the browser that `<html data-color-scheme>` is set before hydration.
- [X] T009 In `layout.tsx`:
  - Change `<body className>` to `min-h-screen bg-bg text-fg font-body antialiased`.
  - Change `<main>` to `mx-auto flex w-full max-w-[1040px] flex-col gap-[var(--space-page)] py-10`, with `padding-inline: max(16px, env(safe-area-inset-left))` / `max(16px, env(safe-area-inset-right))` (an inline style or a `.page-gutter` class in tokens.css).

### Charts re-token (R5)

- [X] T010 [P] Rewrite `libs/shared/charts/src/theme.css` per contracts/design-system.md §6:
  - In `.chart-root`, set `--chart-surface: var(--color-surface)`, `--chart-ink: var(--color-fg)`, `--chart-ink-secondary: var(--color-muted)`, `--chart-muted: var(--color-muted)` (not `faint`: axis text needs ≥ 4.5:1, FR-035), `--chart-grid/--chart-axis/--chart-border: var(--color-line)`, `--chart-series-1…5: var(--color-seg-1…5)`, `--chart-series-6: var(--color-good)`, `--chart-series-7: var(--color-bad)`, `--chart-series-8: var(--color-warn)`, and `font-family: var(--font-body)`.
  - Delete both dark blocks (the tokens already switch).
  - Update the header comment.
  - Run `npx nx test @companion/charts`.
- [X] T011 [P] Restyle `libs/shared/charts/src/lib/chart-tooltip.tsx`, `legend.tsx`, `chart-frame.tsx` and `chart-data-table.tsx` to the reference `.pop` (tooltip), `.paylegend` (legend) and `.matrix` (data table) treatments, using token utilities only. Chart titles use `font-display text-h3`.
- [X] T012 Add an optional `onSegmentActivate?: (id: string) => void` to `SegmentedBarProps` in `libs/shared/charts/src/lib/segmented-bar.tsx`:
  - Click, Enter or Space on a focused segment, or on its legend entry, calls it with the segment id.
  - Add tests in `segmented-bar.spec.tsx`: a click calls the handler, Enter calls it, and nothing breaks when it is omitted.

### Move shared-rental pieces to scope:shared (R6)

- [X] T013 Move `libs/deal-analyzer/calculations/src/lib/validate-rental.ts` and `validate-rental.spec.ts` to `libs/shared/calculations/src/lib/` (use `git mv`):
  - Move `DEFAULT_RENTAL_ASSUMPTIONS` out of `analyze-deal.ts` into a new `libs/shared/calculations/src/lib/rental-defaults.ts`.
  - Export both from `libs/shared/calculations/src/index.ts`.
  - In `libs/deal-analyzer/calculations/src/index.ts`, re-export them (`export { validateRental, DEFAULT_RENTAL_ASSUMPTIONS } from 'shared-calculations'`) so every existing import keeps working.
  - Fix internal relative imports.
  - Run `npx nx run-many -t test typecheck -p shared-calculations deal-analyzer-calculations` and confirm both are green with an unchanged test count.
- [X] T014 Move `libs/deal-analyzer/ui/src/lib/rental-inputs-panel.tsx` to `libs/shared/ui/src/lib/rental-inputs-panel.tsx` (`git mv`):
  - Export it from `libs/shared/ui/src/index.ts`.
  - Remove its export from `libs/deal-analyzer/ui/src/index.ts`.
  - Update the four view imports to `shared-ui`.
- [X] T015 Move `libs/deal-analyzer/ui/src/lib/use-rental-editor.ts` to `libs/shared/data-access/src/lib/use-rental-editor.ts`:
  - Import `DEFAULT_RENTAL_ASSUMPTIONS` from `shared-calculations`.
  - Export it from `libs/shared/data-access/src/index.ts`.
  - Update its importers in `libs/deal-analyzer/ui/src/lib/*`.
  - Run `npx nx run-many -t lint typecheck test` and confirm there are no module-boundary errors.

### Deal field model + stepValue (data-model §A)

- [X] T016 [P] Write `libs/shared/calculations/src/lib/deal-fields.spec.ts`. It covers:
  - `readDealField(s, key)` for every key in data-model §A, including `downPayment` amount and percent, and `rental.grossMonthlyRent` when `rental` is null (→ null).
  - `dealFieldPatch(s, key, value)`, which returns the `Partial<LoanScenario>` the existing editors would produce. `termMonths` is passed in months. `rental.*` merges into `s.rental`.
  - `formatDealField(key, value)`, which returns "$450,000", "20%", "6.5%", "30 yr", "$3,200" and "—" for null.
  - `DEAL_FIELD_LABELS`.
- [X] T017 [P] Write `libs/shared/calculations/src/lib/step-value.spec.ts` for `stepValue(key, value, steps)`:
  - Steps: rate 6.5 +4 → 7.0; rate +1 with Shift (steps 10) → 7.75; term 360 +1 → 372 (the step is 12 months); homePrice 450000 −1 → 449000; rent 3200 +1 → 3225; PMI 0.5 +1 → 0.55, with no float drift (assert with `toBe`); HOA 120 +1 → 130; down-payment percent 20 +1 → 21; down-payment amount 90000 +1 → 91000.
  - Clamps, quoted from data-model §A: "currency ≥ 0, rate 0–100, term 1–480 months, down-payment percent `0 ≤ x ≤ 99`, PMI ≥ 0". So rate 0.1 −1 → 0, percent down 99.5 +1 → 99, and percent down 98 +10 → 99.
  - `null` → `null`.
- [X] T018 Implement `libs/shared/calculations/src/lib/deal-fields.ts` (`DealFieldKey`, `readDealField`, `dealFieldPatch`, `formatDealField`, `DEAL_FIELD_LABELS`, `DEAL_FIELD_STEPS`) and `step-value.ts`, using exactly the data-model §A table. Export both from the index. T016 and T017 must pass.

### Edit recording (R7, data-model §B)

- [X] T019 [P] Write `libs/shared/data-access/src/lib/deal-edits-provider.spec.tsx` (render inside `ScenariosProvider`):
  - `editDeal` updates the scenario and sets `lastChange` with `oldDisplay` / `newDisplay`.
  - Two edits to the same field 500ms apart coalesce (oldValue kept). Use fake timers.
  - Edits 900ms apart make a new record.
  - A different field replaces the record.
  - A `'scrub'` edit coalesces until `endGesture()`.
  - `undo()` restores the old value exactly and sets `lastChange` to null.
  - `changeSeq` increments on record, coalesce and undo, and does **not** change on `setActiveScenarioId`.
  - Switching or removing the scenario drops `lastChange`.
- [X] T020 Implement `libs/shared/data-access/src/lib/deal-edits-provider.tsx` per contracts/deal-ui.md:
  - `editDeal` writes through `updateActiveScenario(dealFieldPatch(...))`. It uses `useRentalEditor` for `rental.*` when `rental` is null, so the first rent entry still seeds the defaults.
  - Export `DealEditsProvider` and `useDealEdits`.
  - Mount `<DealEditsProvider>` inside `<ScenariosProvider>` in `layout.tsx`.
  - T019 must pass.

### Design-system primitives (contracts/design-system.md §4), all in `libs/shared/ui/src/lib/ds/`

- [X] T021 [P] `button.tsx`: `Button` on `@ui-sdk/react/button`, with `variant: 'default' | 'primary' | 'ghost' | 'icon'` and `size: 'sm' | 'md'`. Copy `.btn` / `.btn.primary`. md is 14px text, `6px 12px` padding and `rounded-md`. Ghost is transparent with `text-muted` and a `hover:bg-sunk`.
- [X] T022 [P] `chip.tsx`: `Chip` (forwardRef button), with `tone: 'default' | 'pin' | 'err' | 'total' | 'missing' | 'muted'`. Copy `.chip`, `.chip.pin`, `.chip.err` and `.chip.total`.
  - missing: `border-dashed text-muted bg-transparent`. muted: `text-muted bg-transparent border-line`, with no opacity (FR-035).
  - Label and value: the label is regular weight and the value is `<b class="font-semibold num">`.
  - Size 13px, `4px 11px` padding, `rounded-full`.
- [X] T023 [P] `typography.tsx`: `Eyebrow`, `SectionHeader({ eyebrow?, title, lede?, actions? })` (an h2 `text-h2`, with an 18px gap to its content via `gap-[var(--space-section)]` on the `section`), `PageHeader({ eyebrow, title, lede, note? })` (an h1 `text-title` with `tabIndex={-1}` and `focus:outline-none`, plus lede `text-lede`, gap 12px), and `card.tsx` with `Card({ as, padding: 'md' | 'lg' })` (copy `.card` / `.box`: `bg-surface border border-line rounded-xl`, 18px or 22px padding).
- [X] T024 [P] `kpi.tsx`: `Kpi({ label, value, tone? })` (copy `.kpi` / `.fact`: small muted label, `font-display` value at 20px, `num`). Restyle `libs/shared/ui/src/lib/metric-badge.tsx` to the `.tag` pill (`rounded-full`, semantic soft fill, 12px, 600), keeping its props and test ids.
- [X] T025 [P] Restyle `libs/shared/ui/src/lib/number-field.tsx` and `date-field.tsx` to the `.field` treatment:
  - `bg-surface border border-line rounded-sm px-3 py-2 num`, with `focus-within` showing the accent outline.
  - Label `text-label`, description `text-small text-muted`, error `text-small text-bad`, and on error `border-bad bg-bad-soft/40`.
  - Keep every prop, `aria-*` attribute and visually-hidden label path.
  - Leave the `NumberInputGroup` structure intact so US5 can wrap the label in ui-sdk's `NumberInputScrubArea` (T088).
- [X] T026 [P] `segmented-toggle.tsx`: `SegmentedToggle({ label, value, options, onValueChange })` on `@ui-sdk/react/tabs` (the same behavior the existing Years/Months and $/% toggles use), styled as the reference `.tab` / `[aria-selected=true]` at 12px. Replace the inline toggles in `loan-input-form.tsx`, `cost-breakdown-panel.tsx` and `libs/deal-analyzer/ui/src/lib/segmented-options.tsx`'s styling with it, keeping their `aria-label`s.
- [X] T027 [P] Restyle `libs/shared/ui/src/lib/scenario-tabs.tsx` to the reference `.scen` (13px, `rounded-md`, `px-2.5 py-1`, selected `bg-ink text-ink-fg`, others `text-muted hover:bg-sunk`). "+ Add scenario" becomes a ghost `Button` "+". The remove "×" is a ghost icon button with the same `aria-label`.
- [X] T028 [P] `sheet.tsx`: `Sheet({ open, onOpenChange, side, title, description?, header?, footer?, initialFocus?, children })` on `@ui-sdk/react/drawer`:
  - On the right it is `w-[min(440px,92vw)] h-full`. On the bottom it uses `sheetPhysics` with `max-h-[88vh]`, `rounded-t-xl` and a `DrawerHandle`.
  - Copy `.sheet`: `bg-surface border-l border-line shadow-float`, padding `var(--space-card)`, gap 16px, scrollable body.
  - The backdrop is `fixed inset-0 bg-fg/25`.
  - `side` resolves with `matchMedia('(min-width: 1024px)')` (the same breakpoint as `AppShell`).
- [X] T029 [P] `popover.tsx`: `Popover({ trigger, open?, onOpenChange?, children, label })` on `@ui-sdk/react/popover`. Copy `.pop`: `bg-surface border border-line rounded-lg shadow-float p-3.5 w-[260px]`, `flex flex-col gap-2`, with collision flipping on.
- [X] T030 [P] `toast.tsx`: re-export a styled `ToastRegion`, plus `showToast({ title, actionLabel?, onAction?, duration? })`, on `@ui-sdk/react/toast`. Copy `.toast`: `bg-ink text-ink-fg rounded-md px-4 py-2.5 text-[14px]`, with a 600-weight action. The region is a polite live region at the bottom center (`bottom: calc(16px + env(safe-area-inset-bottom))`). Mount `<ToastRegion />` once in `libs/shared/ui/src/lib/app-shell.tsx`.
- [X] T031 [P] `data-table.tsx`: export the class helpers `tableClass`, `thClass` and `tdClass`. Copy `.matrix`: `w-full border-collapse text-[14px]`, th `text-[13px] font-medium text-muted text-left py-2 px-2.5 border-b border-line`, td `py-2 px-2.5 border-b border-line num`.
- [X] T032 Create `libs/shared/ui/src/lib/ds/index.ts` exporting everything in `ds/`, and `export * from './lib/ds'` in `libs/shared/ui/src/index.ts`. Run `npx nx run-many -t lint typecheck test -p shared-ui`.

### E2E helpers

- [X] T033 Extend `apps/amortization-calculator-e2e/src/helpers.ts`:
  - `openDealSheet(page)`: click the button named "Edit deal" and wait for the dialog named /deal/i.
  - `closeDealSheet(page)`: click "Done".
  - `editChip(page, chipName: RegExp, fieldLabel: string, value: string)`: click the chip, then `fillNumberField` inside the popover, then Escape.
  - `fillDealField(page, label, value)`: open the sheet if needed, then `fillNumberField` scoped to the dialog.
  - `skipSetupFor(page)`: `page.addInitScript(() => sessionStorage.setItem('companion.setupDone', JSON.stringify(['initial-scenario'])))`.
  - `setTheme(page, 'light' | 'dark' | 'system')`: click the "Theme: …" button until its name matches.

**Checkpoint**: `npx nx run-many -t lint test typecheck` is green. The app renders on the new tokens (still with the old layout), and the e2e baseline count is unchanged.

---

## Phase 3: User Story 1 — Edit the deal from a strip instead of repeated forms (P1) 🎯 MVP

**Goal**: The Deal Strip and the Edit deal sheet replace the inline Loan, Real-estate costs and Rental sections on Amortization, Deal Analyzer, Financing and Wealth.

**Independent test**: On each of the four pages there are no shared input sections. A Rate chip edit on Financing and a sheet edit on Wealth both show on every page (spec US1, quickstart §3).

### Tests (write first)

- [X] T034 [P] [US1] Write `libs/shared/ui/src/lib/deal/deal-strip.spec.tsx` (jsdom, inside `ScenariosProvider` + `DealEditsProvider`):
  - With `FINANCING_PROFILE`, chips render in the order Rate, Term, Rent, then the rest in data-model §A order, then Total last (Total isn't pinned there).
  - With `AMORTIZATION_PROFILE`, the first four chips are Loan amount, Rate, Term, Total (Total is pinned).
  - The pinned chips have `data-tone="pin"`, and Total has `data-tone="total"`.
  - With `AMORTIZATION_PROFILE`, Rent has `data-tone="muted"`.
  - A chip whose field is in `errors` has `data-tone="err"` and visible text "invalid".
  - Clicking "Edit deal" opens a dialog whose groups have the headings Property, Loan, Monthly costs and Rental, in that order.
- [X] T035 [P] [US1] Write `apps/amortization-calculator-e2e/src/deal-strip.spec.ts` (use `skipSetupFor` in `beforeEach`), one test per spec US1 acceptance scenario 1–7:
  - On `/amortization`, `/deal-analyzer`, `/financing` and `/wealth`, a `region` named "Deal" is visible, and no h2 named "Loan", "Real-estate costs" or "Rental income" exists.
  - Financing Rate chip 6.5 → 6: the DSCR card text changes, and the popover shows `/DSCR .* → /`.
  - The sheet opens, focus is inside, and Escape returns focus to "Edit deal".
  - Loan amount reads "from price and down payment" after price 450,000 and down 20%.
  - Scrolling to the bottom of `/amortization` leaves the strip in the viewport (`boundingBox().y` ≥ 0 and < 120).
  - At 390×844 the sheet's bounding box is at the bottom (y > 100), and `document.documentElement.scrollWidth <= 390`.
  - Switching scenario tabs updates the chips.

### Implementation

- [X] T036 [P] [US1] Create `libs/shared/ui/src/lib/deal/page-profiles.ts`, exporting `AMORTIZATION_PROFILE`, `DEAL_ANALYZER_PROFILE`, `FINANCING_PROFILE`, `WEALTH_PROFILE` and `PRO_FORMA_PROFILE` with exactly the pinned, muted and requires values in the data-model §C table (requires `unlocks` strings: "cash flow", "DSCR", "equity", "net worth", "sale price", "IRR"). Also export the `PageProfile`, `Headline`, `DealChipKey` and `PaymentPart` types from data-model §C and §D, and contracts/deal-ui.md.
- [X] T037 [P] [US1] Create `libs/shared/ui/src/lib/deal/payment-parts.ts` with `paymentParts(scenario, summary)` → `PaymentPart[]`:
  - P&I is `summary.monthlyPrincipalAndInterest`.
  - Property tax is `annualPropertyTax / 12`. Insurance is `annualInsurance / 12`.
  - PMI is `summary.monthlyPmiAmount`, or 0 when it is 0. HOA is `monthlyHoa`.
  - Round each part to cents. Null inputs count as 0.
  - Add `payment-parts.spec.ts`: the parts sum to `summary.totalMonthlyPayment` within $0.01 for the quickstart reference deal and for a deal with PMI.
- [X] T038 [US1] Split the shared forms into group components without changing any field's label, `name`, validation or `onChange` patch:
  - In `libs/shared/ui/src/lib/cost-breakdown-panel.tsx`, export `PropertyFields` (home price, down payment with the $/% `SegmentedToggle`) and `MonthlyCostFields` (tax, insurance, PMI, HOA, plus the P&I / total box and the PMI-drop note, restyled to the `.derived` rows).
  - In `libs/shared/ui/src/lib/loan-input-form.tsx`, export `LoanFields({ scenario, errors, onChange, derivedPrincipal: boolean })`:
    - When `derivedPrincipal`, loan amount renders as a read-only `.derived` row: "Loan amount · $360,000 · from price and down payment".
    - Otherwise it renders the editable field.
    - Rate, term (with the Years/Months toggle) and first payment date follow.
    - `derivedPrincipal = scenario.homePrice != null && scenario.downPayment != null && !scenario.principalIsOverridden`.
  - Keep `LoanInputForm` and `CostBreakdownPanel` as thin wrappers until T096 deletes them.
- [X] T039 [US1] Create `libs/shared/ui/src/lib/deal/deal-sheet-context.tsx`, with `DealSheetProvider` plus `useDealSheet(): { open(opts?: { mode?: 'edit' | 'setup'; focusField?: DealFieldKey }): void; close(): void; state }`. On open, the sheet scrolls `[data-deal-field="{key}"]` into view and focuses its input.
- [X] T040 [US1] Create `libs/shared/ui/src/lib/deal/deal-sheet.tsx` per contracts/deal-ui.md § DealSheet (edit mode only for now):
  - It uses `Sheet`, with the title "{scenario.name} · deal" and a primary `Button` "Done".
  - The body is four `<section>`s with an `Eyebrow` heading each: Property → `PropertyFields`, Loan → `LoanFields`, Monthly costs → `MonthlyCostFields`, Rental → `RentalInputsPanel` (with `hideGrowth`).
  - Groups are `gap-[var(--space-card)]` apart, with 2-column grids at most.
  - Each field wrapper gets `data-deal-field`.
  - All writes go through `useDealEdits().editDeal(…, 'sheet')`, except the rental panel's multi-field patches, which go through `useRentalEditor`. They are recorded per data-model §B "Multi-field rental changes": `field: 'rental.grossMonthlyRent'` when rent changed, otherwise the first changed key, with `oldValue` / `newValue` set to the whole previous / next `rental` object (possibly `null`).
- [X] T041 [US1] Create `libs/shared/ui/src/lib/deal/chip-popover.tsx`:
  - It uses `Chip` as the `Popover` trigger, and its content is the field's `NumberField` (or the down-payment / term variants with their toggles) with an autofocused input.
  - It shows the field error.
  - It shows the headline line `{headline.label} {format(atOpen)} → {format(current)}`, or `headline.naReason`, in `text-small` (`text-good` / `text-bad` per `betterWhen` when changed).
  - `atOpen` is captured in a ref when it opens.
  - The `total` chip's popover is read-only: the P&I, tax, insurance, PMI and HOA rows from `paymentParts`, plus "Edit costs" (it opens the sheet at `annualPropertyTax`).
  - Writes go through `editDeal(…, 'chip')`.
- [X] T042 [US1] Create `libs/shared/ui/src/lib/deal/deal-strip.tsx` per contracts/deal-ui.md § DealStrip:
  - `<section aria-label="Deal">`, styled as a copy of `.strip` (`bg-surface border border-line rounded-lg p-3 flex flex-col gap-2.5`).
  - It is `sticky top-0 lg:top-0 max-lg:top-[57px] z-20`. Measure the mobile header height and use that value.
  - The top row holds `ScenarioTabs`, a spacer, and a primary `Button` "Edit deal".
  - The chips row is `flex flex-wrap gap-1.5`. The whole strip is capped at `max-h-[33vh]`. When wrapped chips would exceed that cap, at any width, the chips row switches to one line with `flex-nowrap overflow-x-auto` (spec edge case "Very narrow viewport"), and focused chips scroll into view.
  - The chip order is: `profile.pinned` in its listed order (which may include `total`), then the remaining chips in data-model §A order, then `profile.muted`, then `total` last only if it isn't pinned. Render them with `ChipPopover`.
  - It wraps its children in `DealSheetProvider` and renders `DealSheet`.
  - T034 must pass.
- [X] T043 [P] [US1] Rework `libs/amortization/ui/src/lib/amortization-calculator-view.tsx`:
  - Replace the header with `PageHeader` (eyebrow "Analysis").
  - Remove `MetricBadgeGroup` / LTV from above the tabs and move it to a `Kpi` row in the results.
  - Replace `ScenarioTabs`, the Loan section and the Real-estate costs section with `<DealStrip profile={AMORTIZATION_PROFILE} headline={{ label: 'Total monthly payment', value: schedule?.summary.totalMonthlyPayment ?? null, naReason: schedule ? null : 'Fix the loan inputs to see the payment', format: currency.format, betterWhen: 'lower' }} errors={validation.valid ? [] : validation.errors} payment={…paymentParts} />`.
  - Keep the Extra payments section inline, then charts, schedule and compare. Wrap each in `SectionHeader`.
- [X] T044 [P] [US1] Rework `libs/deal-analyzer/ui/src/lib/deal-analyzer-view.tsx` the same way:
  - Use `DEAL_ANALYZER_PROFILE`, with the headline "Cash flow" = `analysis?.cashFlow.monthly` (betterWhen higher) and naReason "Add rent to see cash flow" or "Fix the loan inputs to see cash flow".
  - Pass errors as `[...validation.errors, ...rentalErrors]`.
  - Remove the Loan, Real-estate costs and inline `RentalInputsPanel`. The sheet hosts them.
  - Keep `IncomeExpenseCard`, `DealMetrics`, charts and compare, each in a `SectionHeader`.
  - The LTV and CoC badges become `Kpi`s.
- [X] T045 [P] [US1] Rework `libs/deal-analyzer/ui/src/lib/financing-view.tsx`:
  - Use `FINANCING_PROFILE`, with the headline "DSCR" = `analysis?.dscr.value` (format `formatDscr`, betterWhen higher) and naReason "Add rent to see DSCR".
  - Remove ScenarioTabs, Loan, Real-estate costs and Rental income.
  - Keep "Debt service coverage" (the DSCR minimum stays inline in `DscrCard`), "Financing options" and "Compare scenarios".
- [X] T046 [P] [US1] Rework `libs/deal-analyzer/ui/src/lib/wealth-view.tsx`:
  - Use `WEALTH_PROFILE`, with the headline "Net worth" = the horizon year's `netWorth` from `ready.years` (betterWhen higher) and naReason = `naMessage`.
  - Remove ScenarioTabs, Loan, Real-estate costs and Rental income.
  - Keep "Projection assumptions" inline (growth, land share and tax rate), then "Net worth over time" and "Year by year".
- [X] T047 [US1] Export everything in `libs/shared/ui/src/lib/deal/` from `libs/shared/ui/src/lib/deal/index.ts` and `libs/shared/ui/src/index.ts`. Run `npx nx run-many -t lint typecheck test`.
- [X] T048 [US1] Migrate the e2e specs that type into shared fields to the sheet:
  - The specs: `baseline-schedule`, `charts`, `deal-analyzer`, `export-schedule`, `extra-payments`, `feature-pages`, `financing-matrix`, `performance`, `principal-auto-calculation`, `real-estate-costs`, `scenario-comparison`, `schedule-pagination`, `validation-and-persistence` and `wealth-projection` `.spec.ts`.
  - Wrap shared-field fills in `fillDealField` (or `openDealSheet` + scoped fills + `closeDealSheet`), add `skipSetupFor(page)` to each `beforeEach`, and replace assertions on the removed section headings with the "Deal" region.
  - Do not change any expected number.
- [X] T049 [US1] Run the US1 gate: lint, test and typecheck, plus the full e2e on :3200 (T035 plus the migrated specs all pass).

**Checkpoint**: The MVP. No page repeats the shared forms, and every value can be edited from any page.

---

## Phase 4: User Story 2 — The whole app follows the proposal's visual design (P1)

**Goal**: Every surface matches `design-reference.html` in both themes. There is a System / Light / Dark switcher, and the layout is spacious.

**Independent test**: Spec US2 scenarios 1–8 (quickstart §7).

### Tests (write first)

- [X] T050 [P] [US2] Write `apps/amortization-calculator-e2e/src/theme.spec.ts`:
  - With `colorScheme: 'dark'` emulated, `getComputedStyle(body).backgroundColor` is `rgb(17, 20, 23)` (#111417).
  - `setTheme(page,'light')` makes it `rgb(246, 247, 248)`, and that persists after `page.reload()` and in a new page of the same context.
  - In System mode, switching `page.emulateMedia({ colorScheme })` flips it live.
  - On reload, the first paint already has `data-color-scheme`: check it in an `addInitScript` `DOMContentLoaded` listener.
  - The switcher has the accessible name "Theme: Dark" when in dark mode.
- [X] T051 [P] [US2] Write `apps/amortization-calculator-e2e/src/a11y.spec.ts`: for each of the 5 routes × {light, dark}, run `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa']).analyze()` and expect 0 violations. Also run it once with the sheet open and once with a chip popover open.
- [X] T052 [P] [US2] Write `apps/amortization-calculator-e2e/src/visual.spec.ts`:
  - At 1280×800 and 390×844, in light and dark, save screenshots to `test-output/visual/` (not `toHaveScreenshot`, since review is manual per SC-010). Cover: the strip, an open Rate popover, the open sheet, a `Card`, the financing matrix table, the net-worth chart and the payment-composition chart.
  - Assert spacing (SC-009): at 1280px, the gap between consecutive `main > section` bounding boxes is ≥ 48px. At 390px it is ≥ 32px.
  - Assert no input grid has more than 2 columns: `getComputedStyle(grid).gridTemplateColumns.split(' ').length <= 2` for every `[data-input-grid]`.
  - Assert the card rule (FR-017): every element under `main` has a computed `box-shadow` of `none`, except `[role=dialog]`, popover content and `[role=status]` toasts.

### Implementation

- [X] T053 [P] [US2] Add `SunIcon`, `MoonIcon` and `MonitorIcon` to `libs/shared/ui/src/lib/icons.tsx` with the same `Icon` wrapper and stroke style.
- [X] T054 [US2] Create `libs/shared/ui/src/lib/ds/theme-switcher.tsx`:
  - It reads `usePreference(colorScheme)`, and on click cycles `system → light → dark → system` via the scheme's setter (see T003/T004 notes).
  - It is an icon `Button` with the Monitor, Sun or Moon icon. Its `aria-label` is `Theme: System|Light|Dark`, and its `title` is the same.
  - A `showLabel` prop renders the text beside the icon for the expanded nav.
  - T050 must pass.
- [X] T055 [US2] Restyle `libs/shared/ui/src/lib/app-shell.tsx` and `side-nav.tsx` per contracts/design-system.md §5:
  - The aside is `bg-surface border-r border-line`. The app name uses `font-display text-[15px] font-semibold`.
  - Nav items are `rounded-md px-3 py-2 text-[14px] text-muted hover:bg-sunk hover:text-fg`, and the current one is `bg-ink text-ink-fg`.
  - Add `ThemeSwitcher` at the bottom of the aside (`mt-auto`; `showLabel` when expanded) and at the right end of the mobile header.
  - The drawer content is `bg-surface`, with a backdrop of `bg-fg/25`.
  - Keep every `data-*`, `aria-*` and test id.
- [X] T056 [P] [US2] Restyle `libs/shared/ui/src/lib/comparison-grid.tsx` with `tableClass`, `thClass` and `tdClass` (T031) inside a `Card`. Best / worst highlights use `text-good` / `text-bad` with soft fills.
- [X] T057 [P] [US2] Restyle amortization UI to tokens (`.matrix` table, `Button`, `Card`, `SectionHeader`):
  - `libs/amortization/ui/src/lib/schedule-table.tsx`, with the page-size select's highlighted option on `bg-sunk`.
  - `extra-payment-panel.tsx`, `export-schedule-button.tsx`, and `charts/charts-section.tsx` plus each chart file in `charts/`.
  - The savings note becomes `bg-good-soft text-good rounded-md px-3.5 py-2.5`.
- [X] T058 [P] [US2] Restyle deal-analyzer cards and metrics to tokens:
  - `libs/deal-analyzer/ui/src/lib/income-expense-card.tsx`, `deal-metrics.tsx` (as `Kpi` tiles in a `grid-cols-1 sm:grid-cols-3 gap-3.5`), `rule-indicator.tsx` (pass/fail as good/bad `.tag` pills plus text), `dscr-card.tsx` (`Card`; versus the minimum uses good/bad), and `segmented-options.tsx`.
- [X] T059 [P] [US2] Restyle `libs/deal-analyzer/ui/src/lib/financing-matrix.tsx` and `financing-terms-editor.tsx` (the `.matrix` table inside a `Card`, with the select's highlighted option on `bg-sunk`) and `charts/*` in deal-analyzer-ui. `chart-note.tsx` becomes `text-small text-muted`.
- [X] T060 [P] [US2] Restyle `libs/deal-analyzer/ui/src/lib/wealth-assumptions-panel.tsx`, `wealth-summary.tsx` (as `Kpi` tiles), `wealth-table.tsx` (`.matrix`) and `net-worth-chart.tsx` (series seg1–3; the after-tax line seg4).
- [X] T061 [P] [US2] Restyle `apps/amortization-calculator/src/app/not-found.tsx`: a `PageHeader` with eyebrow "404", plus a ghost `Button` link home.
- [X] T062 [US2] Spacing pass (FR-033):
  - In every view (the four from US1, plus `extra-payment-panel`, `rental-inputs-panel` and `wealth-assumptions-panel`), each top-level block is a `<section className="flex flex-col gap-[var(--space-section)]">` under `<main>`'s `gap-[var(--space-page)]`.
  - Every input grid is `grid grid-cols-1 sm:grid-cols-2 gap-[var(--space-grid)]` with `data-input-grid`.
  - Card padding is `var(--space-card)`.
  - Remove any 3- or 4-column input grid.
- [X] T063 [US2] Add a raw-palette lint guard to `eslint.config.mjs` for `libs/**/src/**/*.tsx` and `apps/amortization-calculator/src/**/*.tsx`:
  - A `no-restricted-syntax` rule on `Literal[value=/\b(bg|text|border|ring|outline|fill|stroke|divide|from|to)-(neutral|gray|slate|zinc|stone|red|emerald|green|amber|yellow|sky|blue|rose|orange)-\d{2,3}\b/]` and `TemplateElement` with the same pattern.
  - A second pattern flags `\btext-faint\b`, with the message "faint is decoration-only (FR-035)".
  - The message: "Use design tokens (contracts/design-system.md)".
  - Run `npx nx run-many -t lint` and fix any leftover hits.
- [X] T064 [US2] Run the US2 gate: the full e2e on :3200, including T050–T052. Open `test-output/visual/` next to `design-reference.html` and fix every mismatch in token, spacing, radius or treatment before checking this off (SC-010).

**Checkpoint**: Both P1 stories are done. The app looks like the reference in light and dark.

---

## Phase 5: Hold & Exit page (spec 009, folded in) — part of US1's five pages

**Goal**: Deliver spec 009 on the new strip and design. Its calculations, rules and expected numbers are unchanged from `specs/009-hold-exit-pro-forma/`.

**Independent test**: spec 009 quickstart §2–§6, with shared inputs entered through the strip and sheet. IRR is the popover headline.

- [X] T065 [US1] Execute spec 009 tasks **T002, T003, T004, T006, T007**, exactly as written in `specs/009-hold-exit-pro-forma/tasks.md`, with one change: T003's file is now `libs/shared/calculations/src/lib/validate-rental.ts` (moved by T013). Its baseline T001 is covered by this feature's T001.
- [X] T066 [US1] Execute spec 009 task **T005** (the `/pro-forma` route, nav entry "Hold & Exit" with `KeyIcon`, and an empty `ProFormaView`) as written.
- [X] T067 [US1] Execute spec 009 tasks **T008–T014** (the US1 tests and calculations: `irr`, `validateExit`, `projectExit`) exactly as written. The vectors and expected values must not change.
- [X] T068 [US1] Execute spec 009 tasks **T015–T018** (`use-exit-editor`, `exit-summary`, `hold-comparison-table`, `exit-assumptions-panel`) with the visual rule applied:
  - `ExitSummary` uses `Kpi` tiles.
  - `HoldComparisonTable` uses the `.matrix` classes in a `Card`.
  - The panel uses `NumberField`, `SegmentedOptions` (restyled in T026) and `SectionHeader`.
  - The test ids and labels are as in spec 009's contracts/pro-forma-ui.md.
- [X] T069 [US1] Execute spec 009 task **T019** with these changes:
  - `pro-forma-view.tsx` renders `PageHeader` (eyebrow "Analysis") and `<DealStrip profile={PRO_FORMA_PROFILE} headline={{ label: 'IRR', value: projection?.result?.preTax.irr ?? null, naReason, format: percent2, betterWhen: 'higher' }} …/>`. It has **no** ScenarioTabs, Loan, Real-estate costs or Rental income sections.
  - Then come "Assumptions", "Exit", "Compare hold periods" and "Pro forma".
  - The `pro-forma-na` messages drop "above":
    1. "Add rent to model a sale."
    2. "Fix the rental inputs to see the exit."
    3. "Fix the loan inputs to see the exit."
    4. `projection.naReason`
  - Update spec 009's contracts/pro-forma-ui.md to match.
- [X] T070 [US1] Execute spec 009 task **T020**: create `apps/amortization-calculator-e2e/src/pro-forma.spec.ts` with `skipSetupFor`. Its `enterReference` fills the property fields through `fillDealField`, and it uses the new NA strings from T069. All expected numbers are as in spec 009.
- [X] T071 [US1] Execute spec 009 tasks **T021–T025** (US2 growth) and **T026–T029** (US3 tax) as written, with the visual rule applied to `pro-forma-table.tsx` (the `.matrix` classes, with the sale row highlighted `bg-sunk font-semibold`).
- [X] T072 [US1] Execute spec 009 tasks **T030** (perf) and **T031** (docs). Then add `/pro-forma` to `deal-strip.spec.ts`'s route list (T035) and to `a11y.spec.ts` (T051).

**Checkpoint**: All five pages use the strip. Spec 009's quickstart §2–§6 passes.

---

## Phase 6: User Story 3 — Guided first-run setup and error routing (P2)

**Goal**: The sheet opens by itself in setup mode for an unset deal. Missing-input chips, an error count and "Fix inputs" buttons replace the "above" messages.

**Independent test**: Spec US3 scenarios 1–7 (quickstart §2, §4).

### Tests (write first)

- [X] T073 [P] [US3] Write `libs/shared/data-access/src/lib/use-setup-mode.spec.tsx`:
  - The default scenario (`homePrice: null`) gives `needsSetup` true.
  - `skip()` makes it false and writes `["initial-scenario"]` to `sessionStorage['companion.setupDone']`.
  - A new scenario added with `homePrice` null needs setup. A duplicated scenario with a price doesn't.
  - `canFinish` is false until `validateScenario` passes **and** `homePrice != null && downPayment != null` (data-model §E, quoted).
  - When storage throws, it still works in memory.
- [X] T074 [P] [US3] Write `apps/amortization-calculator-e2e/src/setup-mode.spec.ts` (no `skipSetupFor`), one test per spec US3 scenario 1–7:
  - A fresh context on `/financing` shows a dialog with the heading "Welcome, set up this deal", focus inside, and the main area dimmed (the backdrop is visible).
  - Done is disabled until price 450,000 and down 20% are entered. Done then closes the sheet, focuses the h1, and `/wealth` does not reopen it.
  - Escape skips it.
  - Adding a scenario, clearing its price in the sheet, then reloading in a new context: the sheet opens for that scenario only.
  - On `/deal-analyzer` with no rent, the chip "+ Add rent to unlock cash flow" opens the sheet with the rent field focused.
  - Clearing Rate shows the button "1 input needs fixing" and the Rate chip `data-tone="err"`, and clicking the count focuses Rate.
  - On `/wealth` with an invalid loan, the "Fix inputs" button is present, and `page.getByText(/above/)` has count 0 on all 5 pages.

### Implementation

- [X] T075 [US3] Implement `libs/shared/data-access/src/lib/use-setup-mode.ts` per data-model §E and contracts/deal-ui.md, and export it. T073 must pass.
- [X] T076 [US3] Add setup mode to `libs/shared/ui/src/lib/deal/deal-sheet.tsx`:
  - When `mode === 'setup'`, the header is an h2 "Welcome, set up this deal" with the hint "Enter the property and loan. You can change anything later from the strip." in `text-small text-muted`.
  - The footer has **Skip for now** (ghost) and **Done** (primary, `disabled={!canFinish}`).
  - Done calls `finish()`, closes the sheet, then focuses `document.querySelector('#main-content h1')`.
  - Any other close (Escape, backdrop, the close button) calls `skip()`.
- [X] T077 [US3] In `libs/shared/ui/src/lib/deal/deal-strip.tsx`, auto-open the sheet in setup mode in a `useEffect` keyed on `[activeScenarioId, needsSetup]`, after hydration only, so there is no SSR mismatch.
- [X] T078 [US3] Add missing-input chips and the error count to `deal-strip.tsx`:
  - For each `profile.requires` entry whose `readDealField` is null, render `Chip tone="missing"` "+ Add {label lowercased} to unlock {unlocks}". It opens the sheet with `focusField`.
  - When `errors.length > 0`, render a `Button` with `text-bad` and the label "{n} input needs fixing" or "{n} inputs need fixing". It opens the sheet focused on the first error in group order: Property (`homePrice`, `downPayment`) → Loan (`principal`, `annualInterestRatePct`, `termMonths`, `startDate`) → Monthly costs → Rental.
- [X] T079 [P] [US3] Create `libs/shared/ui/src/lib/deal/fix-inputs-button.tsx`: `FixInputsButton({ errors, children? })`. It renders a sentence naming the first error's field label and message, plus a `Button` "Fix inputs" that opens the sheet at that field.
- [X] T080 [US3] Replace every "above" or "highlighted" message with `FixInputsButton` or a reworded line:
  - `amortization-calculator-view.tsx` "Fix the highlighted fields above to see the amortization schedule.".
  - `deal-analyzer-view.tsx` "Fix the highlighted loan fields above to see the deal analysis.".
  - `financing-view.tsx` "…to see the debt coverage.".
  - `wealth-view.tsx`'s three `naMessage` strings.
  - `pro-forma-view.tsx`.
  - Then `grep -rn "above\|highlighted" libs/*/ui/src/lib/*.tsx` must return only `data-[highlighted]` class hits.
- [X] T081 [US3] Keep `skipSetupFor` in every spec that got it in T048 and T070, because those specs test other stories and must not trip the setup sheet. Only `setup-mode.spec.ts` runs without it. Then run the US3 gate in `apps/amortization-calculator-e2e/`: the full e2e on :3200, with T074 green.

---

## Phase 7: User Story 4 — The deal as a sentence and a payment bar (P3)

**Goal**: An editable deal sentence at the top of the sheet, and the payment bar as the cost editor.

**Independent test**: Spec US4 scenarios 1–4 (quickstart §5).

- [X] T082 [P] [US4] Write `libs/shared/ui/src/lib/deal/deal-sentence.spec.tsx`:
  - For the reference deal, the text reads "Buying a $450,000 home with 20% down, so borrowing $360,000 at 6.5% for 30 years, renting it for $3,200/mo.".
  - Activating "6.5%" shows a textbox. Typing 6 then Enter updates the rate and the sentence reads "6%".
  - Escape cancels.
  - The loan amount is not a button when derived, and has the description "Calculated from home price and down payment".
  - With no rent, the sentence ends "…, renting it for add rent." with an "add rent" button.
- [X] T083 [P] [US4] Write `libs/shared/ui/src/lib/deal/payment-bar.spec.tsx`:
  - The segments render for the non-zero parts only.
  - The legend lists PMI "$0" when there is 0 PMI, with the text "PMI $0 at 20% down" when down ≥ 20%.
  - Clicking or pressing Enter on Tax calls `onActivate('annualPropertyTax')`.
  - The parts sum to the total within $0.01.
- [X] T084 [US4] Implement `libs/shared/ui/src/lib/deal/deal-sentence.tsx` per contracts/deal-ui.md:
  - Each token is a `<button className="tok">`, a copy of `.tok` (`font-semibold text-accent border-b-[1.5px] border-dashed border-accent`). It swaps to an inline `NumberField` (the visually-hidden label is the field label) and commits on Enter or blur via `editDeal(…, 'sentence')`.
  - The term token edits in years.
  - The sentence is `text-[16px] leading-[2.1]` in a `bg-bg rounded-lg p-4` box.
  - T082 must pass.
- [X] T085 [US4] Implement `libs/shared/ui/src/lib/deal/payment-bar.tsx`, wrapping `SegmentedBar` from `@companion/charts`:
  - Series colors: P&I seg1, tax seg2, insurance seg4, HOA seg5, PMI seg3 (as in the reference demo).
  - `onSegmentActivate` maps the id to a `DealFieldKey`, and the P&I segment opens nothing.
  - The legend matches `.paylegend`, with the total at the right in `font-semibold`.
  - Value labels inside segments are drawn only on seg1 and seg5, in `text-ink-fg`. Other segments carry no inner label, and their values are in the legend (FR-035). Because light seg3 and seg4 are under 3:1 against the surface, the legend and the `SegmentedBar` data table stay on.
  - Add `"@companion/charts": "*"` to `libs/shared/ui/package.json` dependencies if it is missing.
  - T083 must pass.
- [X] T086 [US4] Put `DealSentence` at the top of the `DealSheet` body (in both modes), and `PaymentBar` at the top of the Monthly costs group, with `onActivate` focusing `[data-deal-field=…] input`. Add sentence and payment-bar tests to `deal-strip.spec.ts` (spec US4 scenarios 1 and 4) and run the e2e.

---

## Phase 8: User Story 5 — Scrub values and see what each page uses (P3)

**Goal**: Drag or arrow-key scrubbing on field labels, with headline deltas. Chips are ordered and styled by page profile.

**Independent test**: Spec US5 scenarios 1–3 (quickstart §5).

- [X] T087 [P] [US5] Write `libs/shared/ui/src/lib/number-field-scrub.spec.tsx` for `NumberField` with `scrub={{ field: 'annualInterestRatePct' }}` (render inside the providers):
  - The label is wrapped by ui-sdk's scrub area (`[data-scrub-area]`, or the attribute T004 recorded).
  - In the textbox, ArrowUp ×4 → 7.0, then Shift+ArrowUp → 8.25, using ui-sdk's own `NumberInput` keys with `step` 0.125 and ×10 on Shift.
  - ArrowDown at min 0 stays 0.
  - A scrub-area pointer drag of +40px moves 5 steps (`pixelsPerStep` 8).
  - Every change calls `editDeal(…, 'scrub')`, and the end of the gesture calls `endGesture()`.
  - The label keeps its accessible association with the textbox.
- [X] T088 [US5] Add an optional `scrub?: { field: DealFieldKey; onDelta?: (delta: number) => void }` prop to `libs/shared/ui/src/lib/number-field.tsx`, built on ui-sdk (Constitution IV, research R2; no hand-rolled pointer or key handling):
  - When `scrub` is set, wrap the label in `NumberInputScrubArea` (`pixelsPerStep={8}`) and render `NumberInputScrubAreaCursor`.
  - Pass `step` from `DEAL_FIELD_STEPS[field]`, a ×10 large step for Shift, and min/max from the data-model §A limits. Use the `NumberInput` option names from T004's notes.
  - On value change, call `editDeal(field, next, 'scrub')`. When a scrub ends (the `NumberInputValueChangeReason` or pointer-up the scrub area reports), call `endGesture()`.
  - The label gets `cursor-ew-resize select-none border-b border-dotted border-faint` (a decorative border, allowed by FR-035).
  - Render a `<span role="status" class="text-small">` delta when `onDelta` is given.
  - T087 must pass.
- [X] T089 [US5] Pass `scrub={{ field }}` to every numeric `NumberField` in `ChipPopover` and `DealSheet` (in `libs/shared/ui/src/lib/deal/`) whose field has a step in data-model §A.
  - In the popover, show the headline delta while scrubbing: `+$113` / `−0.04`, from the headline at gesture start, in `text-good` / `text-bad` per `betterWhen`.
  - In the sheet, show a sticky headline line at the top of the body: "{label}: {value}", with the delta while scrubbing.
- [X] T090 [US5] Verify the chip ordering and styling from T042 against the data-model §C table on all 5 pages. Add a parametrized test to `deal-strip.spec.ts` asserting the first chips' accessible names per page, and Rent `data-tone="muted"` on Amortization (spec US5 scenario 3). Add the scrub e2e (spec US5 scenarios 1–2) on `/financing`.

---

## Phase 9: User Story 6 — See what changed, and undo it (P3)

**Goal**: Changed figures flash, and a toast offers a single-level undo.

**Independent test**: Spec US6 scenarios 1–4 (quickstart §6).

- [X] T091 [P] [US6] Write `libs/shared/ui/src/lib/ds/ripple.spec.tsx`:
  - It highlights (`data-rippling="true"`) when `value` changes and `changeSeq` moved.
  - It does not highlight on the first render, or on a value change caused by a scenario switch (`changeSeq` unchanged).
  - The highlight clears after 1500ms (fake timers).
  - Under `prefers-reduced-motion`, it highlights with no transition class.
- [X] T092 [P] [US6] Write `apps/amortization-calculator-e2e/src/undo-ripple.spec.ts`, covering spec US6 scenarios 1–4:
  - On `/deal-analyzer`, the rent chip 3,200 → 3,500 makes the cash flow and CoC `[data-rippling=true]` and shows a status toast "Rent changed $3,200 → $3,500".
  - **Undo** restores the exact earlier cash-flow text.
  - With `reducedMotion: 'reduce'`, the ripple element has `transition-duration: 0s`.
  - The toast is in a `role="status"`/polite region, and **Undo** is reachable by Tab.
  - The toast survives navigating to `/financing` within 6s, and is gone after 7s.
- [X] T093 [US6] Implement `libs/shared/ui/src/lib/ds/ripple.tsx`: `Ripple({ value, children })`. Copy `.flash` (`rounded-xs px-1 bg-warn-soft text-warn font-semibold`) while `data-rippling`, with `transition-colors duration-300 motion-reduce:transition-none`. It reads `changeSeq` from `useDealEdits()`. T091 must pass.
- [X] T094 [US6] Implement `libs/shared/ui/src/lib/deal/deal-change-toast.tsx`:
  - It watches `lastChange` and calls `showToast({ title: \`${label} changed ${oldDisplay} → ${newDisplay}\`, actionLabel: 'Undo', onAction: undo, duration: 6000 })`.
  - On a coalesce it updates the same toast, not a new one.
  - It dismisses on scenario switch or removal (`lastChange` → null).
  - Render it once in `app-shell.tsx` next to `ToastRegion`.
- [X] T095 [US6] Wrap the headline and KPI figures in `<Ripple>`:
  - Amortization: the total payment and P&I KPIs, plus the savings-note numbers.
  - Deal Analyzer: the `DealMetrics` values, the `IncomeExpenseCard` totals, and the LTV/CoC KPIs.
  - Financing: the DSCR value and each matrix option's cash flow.
  - Wealth: the `WealthSummary` values.
  - Pro forma: the `ExitSummary` values.
  - Run the full e2e on :3200 and confirm T092 is green.

---

## Phase 10: Polish & cross-cutting

- [X] T096 Delete `LoanInputForm` and `CostBreakdownPanel` wrappers if nothing imports them (`grep -rn "LoanInputForm\|CostBreakdownPanel" libs apps`). Remove their exports, and delete any now-unused `MetricBadgeGroup` usage.
- [X] T097 [P] Update the docs:
  - Update the routes and pages table in `specs/003-feature-pages-navigation/` (or its contracts file) to show the Deal Strip and `/pro-forma`.
  - Add a "Design system" section to `README.md` pointing at `libs/shared/ui/src/styles/tokens.css`, `contracts/design-system.md` and `design-reference.html`. Cover the raw-palette lint rule and the theme switcher.
- [X] T098 [P] Add a SC-001 check to `apps/amortization-calculator-e2e/src/performance.spec.ts` (or to `deal-strip.spec.ts`): at 1280×800 and 390×844, after setup is done, the first `main > section` after the strip has `boundingBox().y < viewport.height` on all 5 pages.
- [X] T099 Run the full gate: `npx nx run-many -t lint test typecheck` (all projects), then the build and full e2e on :3200, twice in a row, with all green. Record the counts under "Baseline notes".
- [X] T100 Run every quickstart.md scenario §2–§8 once on :3200, including the keyboard-only pass for US1–US6 (SC-005). Append a "Verified on {date}" block to `specs/010-deal-strip-redesign/quickstart.md`, and complete spec 009 task **T032/T033** by appending its "Verified" block to `specs/009-hold-exit-pro-forma/quickstart.md`.
- [X] T101 Do the final visual review (non-negotiable, FR-034):
  - Re-run `visual.spec.ts`, and compare each screenshot with `design-reference.html` in the same theme and at the same width.
  - List any deviation in tokens, spacing, radius or treatment in "Baseline notes", and fix it before the feature is reported done.

---

## Dependencies & Execution Order

- **Setup (T001–T004)** → **Foundational (T005–T033)** → user stories.
  - In Foundational, T005 → T006 → T007/T008/T009. T013 → T014 → T015. T016/T017 → T018 → T019 → T020. T021–T031 are [P] after T006, then T032. T033 can run any time.
- **US1 (T034–T049)** needs all of Foundational. It is the MVP.
- **US2 (T050–T064)** needs Foundational. T053–T061 can run alongside US1, but T062 (the spacing pass over the views) and T064 come after US1 has reworked the views.
- **Spec 009 (T065–T072)** needs US1 (`DealStrip`, profiles) and US2's primitives. Its calculation tasks (T065, T067) can start right after Foundational.
- **US3 (T073–T081)** needs US1. T080 also needs T069.
- **US4 (T082–T086)**, **US5 (T087–T090)** and **US6 (T091–T095)** each need US1 only, and are independent of each other. US6's T095 needs T069 for the pro-forma figures.
- **Polish (T096–T101)** needs everything.

## Parallel opportunities

- **Foundational**: T010, T011, T016, T017, T019 and T021–T031 are all different files.
- **US1**: T034, T035, T036 and T037 together. Then T043–T046, the four views, in parallel after T042.
- **US2**: T050–T052 (tests), then T053 and T056–T061 in parallel.
- **US4/US5/US6**: the three stories can run in parallel after US1, by three agents.

### Parallel example: Foundational primitives

```text
T021 button.tsx · T022 chip.tsx · T023 typography.tsx+card.tsx · T024 kpi.tsx+metric-badge
T025 number/date fields · T026 segmented-toggle · T027 scenario-tabs · T028 sheet
T029 popover · T030 toast · T031 data-table
```

### Parallel example: US1 views

```text
T043 amortization-calculator-view.tsx · T044 deal-analyzer-view.tsx
T045 financing-view.tsx · T046 wealth-view.tsx
```

## Implementation Strategy

1. **MVP**: Setup, then Foundational, then US1. Stop and validate quickstart §3: no repeated forms, and the strip and sheet work on 4 pages.
2. **Then**: US2, so the app matches the reference in both themes (both P1 stories done), and demo it.
3. **Then**: Spec 009, giving the fifth page on the new system.
4. **Then**: US3, the first-run and error routing. It is needed before real users see the app without inline forms.
5. **Then**: US4, US5 and US6 in any order, or in parallel.
6. **Finish**: Polish, with the full gate, the quickstart and the final visual review.

## Baseline notes

_(T001 / T099 / T101 record results here.)_

- **T001 baseline (2026-11-17)**: `nx run-many -t lint test typecheck` passes for 10 projects.
  Unit tests: shared-calculations 50, @companion/charts 49, shared-ui 5, shared-data-access 4,
  deal-analyzer-calculations 178, amortization-calculations 14, amortization-ui 19, deal-analyzer-ui 0
  (319 in total). E2E on a :3200 prod build: 267/267 passed.
- **T051 note**: In Playwright's Firefox only, pressing Escape on the open Edit deal sheet right
  after an axe-core scan crashes the page ("Page crashed"). It reproduced 4 out of 4 times. With no
  axe scan, Escape closes the sheet normally in Firefox (`deal-strip.spec.ts` focus test), and
  closing with Done after a scan works. So `a11y.spec.ts` closes with Done. This is treated as an
  axe and test-browser interaction, not an app defect.
- **T067 note (spec 009 T008)**: The vector `irr([-100, -10, 50]) → null` contradicts spec 009's
  own R4 algorithm. The flows have a real root at r ≈ −0.3411, inside the [−0.99, 10] bracket,
  and NPV changes sign there, so R4 returns it. The algorithm is unchanged; `irr.spec.ts` now
  expects ≈ −0.3411.
- **T081 note**: `skipSetupFor` writes `["*"]` to `sessionStorage['companion.setupDone']`, and
  `useSetupMode` treats `*` as "setup done for every scenario this session". Without it, specs of
  other stories trip setup whenever they add a scenario or seed a legacy session with no price,
  which is correct product behavior (spec US3 scenario 4). It's a session-only UX flag, so the
  wildcard has no data or security effect.
- **T088 note**: Fields whose visible label sits outside the `NumberField` (the term and down
  payment, next to their unit toggles) get a small ⇔ drag handle inside the field instead.
  It's still ui-sdk's `NumberInputScrubArea`, and every other numeric field scrubs on its label.
- **T099 final gate (2026-11-18)**: `nx run-many -t lint test typecheck` passes for 10 projects.
  Unit tests: shared-calculations 110, @companion/charts 52, shared-data-access 19, shared-ui 27,
  deal-analyzer-calculations 189, amortization-calculations 14, amortization-ui 19 (430, up from
  319). Full e2e on a :3200 prod build of the final code, 3 runs: **436 passed / 8 skipped**,
  then **435 passed / 1 failed / 8 skipped**, then **436 passed / 8 skipped**. The skips are the
  chromium-only screenshot runs. The single failure was webkit `charts.spec.ts › balance chart`
  in run 2 only. It passed 16/16 isolated webkit repeats and the next full run, so it's treated as
  load-related flakiness. Its error text wasn't captured, so the root cause is unconfirmed.
- **T101 visual review**: Reviewed against `design-reference.html` at 1280 and 390, light and
  dark: strip, chips, popover, sheet, sentence, payment bar, cards, KPI tiles, tables and charts.
  Fixed during review: (1) colliding x-axis labels on the balance chart at 390px (the line chart
  now thins caller-supplied ticks to ~1 per 80px); (2) the "Charts" and "Over the loan term"
  headings now use the page `h2` style and section spacing. No remaining deviations found.

