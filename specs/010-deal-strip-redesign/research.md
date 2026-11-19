# Research: Deal Strip & Visual Redesign

**Feature**: `010-deal-strip-redesign` · Decisions are numbered R1–R10 and referenced from
plan.md, data-model.md and contracts/.

## R1. How the design tokens reach every component

- **Decision**: One token stylesheet, `libs/shared/ui/src/styles/tokens.css`, defines the
  reference's tokens as CSS custom properties. The values are copied verbatim from
  `design-reference.html`'s `:root` and its dark blocks. A Tailwind 4 `@theme inline` block maps
  them to utilities: `bg-bg`, `bg-surface`, `bg-sunk`, `border-line`, `text-fg`, `text-muted`,
  `text-faint`, `bg-ink` / `text-ink-fg`, `text-accent` / `bg-accent-soft`, `text-good` /
  `bg-good-soft`, `text-bad` / `bg-bad-soft`, `text-warn` / `bg-warn-soft`, `font-display` /
  `font-body` / `font-mono`, `rounded-sm|md|lg|xl|pill`, `shadow-float`. Dark values switch on
  `<html data-color-scheme="dark">`. With `system` (or no attribute), they switch inside
  `@media (prefers-color-scheme: dark)` under `:root:not([data-color-scheme="light"])`. That is
  the reference's own three-state pattern, with the attribute renamed to match R3.
- **Then**: Replace every raw palette utility (≈300 uses of `neutral-*`, `red-*`, `emerald-*`,
  `sky-*` across 34 files) with the semantic utilities. A lint check in T-polish (a
  `no-restricted-syntax` regex on className literals) blocks them from coming back.
- **Rationale**: The reference is hand-written CSS on tokens. Copying the tokens exactly is the
  only way to meet FR-034 and SC-007 "exactly". Tailwind 4 is already installed, and `@theme
  inline` keeps every class pointing at a `var()`, so one attribute flips the whole app.
- **Alternatives**: Tailwind's `dark:` variant was rejected: it doubles every class and drifts. A
  CSS-in-JS theme (vanilla-extract, Panda) was rejected: a new build step for the same result.

## R2. UI component library / design system

- **Decision**: Keep `@ui-sdk/react` as the behavior layer and build a small styled design-system
  layer in `shared-ui` (`src/lib/ds/`): `Button`, `Chip`, `Card`, `Eyebrow`, `SectionHeader`,
  `Field` (wraps today's `NumberField` / `DateField` with the reference's field style),
  `SegmentedToggle`, `Tabs`, `Sheet` (Drawer), `Popover`, `Toast`, `DataTable` styles, `Badge`.
  Every one of them is styled only from R1's tokens and matches the reference's `.btn`, `.chip`,
  `.card`, `.field`, `.tab`, `.sheet`, `.pop`, `.toast` and `.matrix` rules.
- **Rationale**: The clarification allows a new library, but every pre-styled kit (shadcn/ui on
  Radix, Mantine, Chakra, HeroUI) ships its own look. Matching the reference exactly would mean
  overriding nearly every style, which is more code than writing the ~12 components. `@ui-sdk/react`
  0.1.0-beta.1 already provides every behavior this feature needs: `Popover`, `Drawer` (with
  `sheetPhysics` for the bottom sheet), `Toast` / `ToastRegion`, `SegmentedControl`, `Tabs`,
  `Tooltip`, and `Preferences` + `createColorScheme` (R3). Drag-to-adjust uses
  `NumberInputScrubArea` and `NumberInputScrubAreaCursor`, part of the `NumberInput` that
  `NumberField` already uses. That satisfies Constitution IV with no hand-rolled focus, keyboard
  or pointer handling.
- **Alternatives**: shadcn/ui, rejected because it adds Radix as a second behavior layer next to
  ui-sdk, against Principle IV's "chosen headless SDK". Mantine / Chakra were rejected: runtime
  theme engines and a heavy override surface.

## R3. Theme switcher

- **Decision**: Use `createColorScheme()` from `@ui-sdk/core` with `Preferences` from
  `@ui-sdk/react`, mounted in the root layout. `Preferences` renders an inline script before
  hydration that writes the saved choice to `<html data-color-scheme>`, so there is no flash
  (FR-012). The `ThemeSwitcher` button cycles System → Light → Dark. Its icon is monitor / sun /
  moon, its accessible name is "Theme: System" (and so on), and it sits in the side nav footer
  (icon-only when collapsed) and the mobile header. `color-scheme` is set to match, so native
  controls and scrollbars follow.
- **Verified (T003)**: ui-sdk persists nothing by default. The app passes
  `storage: createLocalStorage('companion.colorScheme')` (`localStorage`, with an in-memory
  fallback when it can't write). The original note follows. Check where `createPreference` persists. Expected: `localStorage`,
  and the spec allows device persistence for a display preference. If it persists to a cookie or
  `sessionStorage` instead, configure it to `localStorage`. If storage throws, it falls back to
  System (spec edge case).
- **Alternatives**: `next-themes`, rejected because ui-sdk already solves it and it would be a
  second preference mechanism. A hand-rolled inline script, rejected for the same reason.

## R4. Typography

- **Decision**: `next/font/google` in `apps/amortization-calculator/src/app/layout.tsx` loads
  Space Grotesk (500, 600), Inter (400, 500, 600) and JetBrains Mono (400, 500) with
  `display: 'swap'` and `adjustFontFallback`. They are exposed as `--font-display`, `--font-body`
  and `--font-mono`, which R1's `@theme` turns into `font-display`, `font-body` and `font-mono`.
  The files are self-hosted at build time, so visitors' browsers make no third-party font request.
  The fallback stacks are the reference's (`ui-sans-serif, system-ui, sans-serif`;
  `ui-monospace, Menlo, monospace`). The type scale (`text-title` 28–40px clamp, `text-h2` 24px,
  `text-h3` 17px, `text-body` 15px/1.55, `text-small` 13–14px, `text-eyebrow` 12px, uppercase,
  0.08em) is defined in `tokens.css`.
- **Rationale**: Same faces as the reference, without layout shift (spec edge case "fonts loading
  late") and without a runtime CDN request.

## R5. Charts

- **Decision**: Keep the in-house `@companion/charts`. It is custom SVG with tested scales,
  keyboard plots, tooltips and data tables. Re-token its `theme.css`:
  - `--chart-surface` → `surface`, `--chart-ink` → `fg`, `--chart-ink-secondary` → `muted`,
    `--chart-muted` → `faint`, `--chart-grid` / `--chart-axis` → `line`, and the border →
    `line`.
  - Series 1–5 → `seg1`–`seg5`. Series 6–8 → `good`, `bad`, `warn` (used only for semantic
    series). Area fills use `accent-soft`.
  - The dark selector moves from `data-theme` to `data-color-scheme`.
  - Fonts: axis text `font-body` 11px, tabular numerals. Tooltips get the reference's `.pop`
    treatment (surface, line, `shadow-float`, radius 8px).
  - `SegmentedBar` gains an optional `onSegmentActivate(id)` for the payment-bar editor (US4).
- **Rationale**: The reference's charts are simple shapes (an area line, a stacked bar). The
  existing library already draws those, and passes the accessibility tests a new framework would
  have to re-earn. Re-tokening is what gets the exact look.
- **Alternatives**: Recharts, visx, Nivo and ECharts were all rejected. Each has its own theming
  surface, and none would match the reference more closely than token-driven SVG. Each would also
  need the keyboard and data-table work redone (spec 005).

## R6. Where the shared deal UI lives (module boundaries)

- **Problem**: The strip and sheet run on all five pages, including Amortization
  (`scope:amortization`), and they need the rental panel, its validation and its editor, which
  today live in `scope:deal-analyzer`.
- **Decision**: Move the shared-rental pieces down to `scope:shared`:
  - `validateRental` and `DEFAULT_RENTAL_ASSUMPTIONS` move to `shared-calculations`.
    `deal-analyzer-calculations` re-exports both, so there are no public-API changes.
  - `RentalInputsPanel` moves to `shared-ui`. It already imports only `shared-calculations` and
    `shared-ui`.
  - `useRentalEditor` moves to `shared-data-access`.

  The Deal Strip, sheet and all US3–US6 parts go in `shared-ui/src/lib/deal/`. The change log
  and setup flags go in `shared-data-access`.
- **Rationale**: These rules (`scope:shared` → `scope:shared` only) stay as they are, and nothing
  is duplicated. Moves are pure relocations, so the existing unit tests move with them unchanged
  (Constitution I).
- **Alternatives**: A slot prop for the rental group, rejected: Amortization's sheet would have no
  way to fill it. A new `shared-deal` lib, rejected as extra config for what fits `shared-ui`.

## R7. Edit recording, undo and change ripple

- **Decision**: `DealEditsProvider` in `shared-data-access` (mounted inside `ScenariosProvider`)
  exposes `editDeal(field, value, source)`. It writes through the existing `updateActiveScenario`
  / `updateActiveRental` and records a `ChangeRecord` (data-model §B). Edits to the same field in
  the same scenario within 800ms of each other, or within one scrub gesture (`source: 'scrub'`
  until pointer-up / key-up), coalesce. `undo()` writes `oldValue` back and clears the record.
  `changeSeq` increments on every recorded change and on undo.
- **Ripple**: `<Ripple value={n}>` in `shared-ui` highlights (`bg-warn-soft text-warn`, 1.5s, no
  transition under reduced motion) only when `value` changes **and** `changeSeq` moved since the
  last render. A scenario switch doesn't bump `changeSeq`, so switching never ripples.
- **Toast**: `ToastRegion` lives in `AppShell`, so the toast survives client-side navigation
  (spec edge case). It uses ui-sdk `Toast` with a polite live region and a 6s timeout, and
  scenario switch or removal dismisses it.

## R8. First-run setup mode

- **Decision**: `useSetupMode()` in `shared-data-access`. A scenario needs setup when
  `homePrice == null` and its id isn't in `setupDone`, a `Set<string>` persisted to
  `sessionStorage` under `companion.setupDone`. Each page's `DealStrip` opens `DealSheet` with
  `mode="setup"` on mount, and whenever the active scenario changes to one that needs setup.
  Done, Escape, the close button or a backdrop click all add the id (FR-021). After Done, focus
  goes to `#main-content h1`.

## R9. Per-page profiles and headline metrics

- **Decision**: Each view passes a static `PageProfile` (data-model §C) and a live `headline`
  (`{ label, value: number | null, naReason, format }`) to `DealStrip`. The chip popover records
  `headline.value` when it opens and shows `open → current`. The scrub delta is
  `current − value at gesture start`, colored by a `betterWhen: 'higher' | 'lower'` field on the
  headline.

## R10. Testing strategy

- **Unit (Vitest, jsdom)**:
  - Coalescing and undo in `DealEditsProvider`, and `useSetupMode`.
  - The scrub step and clamp math (pure `stepValue(field, value, steps)` in `shared-calculations`,
    which needs cent / step-exact tests).
  - Chip order from `PageProfile`, sentence formatting, and the payment-bar segments summing to
    the total.
- **E2E (Playwright)**: Add `openDealSheet(page)`, `editChip(page, name, value)` and
  `skipSetup(page)` to `helpers.ts`. Specs that fill shared fields fill them inside the sheet.
  New specs: `deal-strip.spec.ts`, `setup-mode.spec.ts`, `theme.spec.ts`, `undo-ripple.spec.ts`,
  plus spec 009's `pro-forma.spec.ts`. Run on a prod build at :3200 (memory: :3000 is often
  main's dev server).
- **Visual fidelity**: A Playwright screenshot pass (`visual.spec.ts`) at 1280×800 and 390×844,
  in light and dark, for the strip, chip popover, sheet, setup sheet, toast, a card, a table and
  a chart, reviewed side by side against `design-reference.html` (SC-010).
- **Accessibility**: `@axe-core/playwright` (new devDependency) on every page in both themes
  (SC-005, SC-006).
