# Contract: Design System (`shared-ui` tokens + `ds/` components)

The source of truth is [`../design-reference.html`](../design-reference.html). Every value below is
copied from its `<style>` block. If this file and the reference ever disagree, the reference wins
(spec FR-034).

## 1. Tokens — `libs/shared/ui/src/styles/tokens.css`

- Define the spec Appendix tokens on `:root`, with the light values.
- Redefine them in `@media (prefers-color-scheme: dark) { :root:not([data-color-scheme="light"]) {…} }`
  and in `:root[data-color-scheme="dark"] {…}`, with the dark values and `color-scheme: dark`.
- `:root[data-color-scheme="light"]` sets `color-scheme: light`.
- `@theme inline` maps them to `--color-bg`, `--color-surface`, `--color-sunk`, `--color-line`,
  `--color-fg`, `--color-muted`, `--color-faint`, `--color-ink`, `--color-ink-fg`,
  `--color-accent`, `--color-accent-soft`, `--color-good(-soft)`, `--color-bad(-soft)`,
  `--color-warn(-soft)` and `--color-seg-1…5`.
- It also maps `--font-display`, `--font-body` and `--font-mono` (from next/font variables,
  each with its fallback), `--shadow-float`, and
  `--radius-xs: 4px; --radius-sm: 5px; --radius-md: 7px; --radius-lg: 8px; --radius-xl: 10px`.
- `body`: `bg-bg text-fg font-body text-[15px] leading-[1.55]`.
- Headings: `font-display`, `letter-spacing: -0.01em`, `text-wrap: balance`.
- Focus: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`.
- `.num`: tabular numerals.

## 2. Type scale

| Utility | Reference rule | Value |
|---|---|---|
| `text-title` | `h1` | `clamp(28px, 4.5vw, 40px)`, line-height 1.1, display 600 |
| `text-h2` | `h2` | 24px display 600 |
| `text-h3` | `h3` | 17px display 600 |
| `text-body` | `body` | 15px / 1.55 |
| `text-lede` | `.lede` | 17px muted |
| `text-small` | notes | 13–14px |
| `text-eyebrow` | `.eyebrow` | 12px, 600, uppercase, 0.08em, muted |
| `text-label` | `.pop label` | 12.5px 500 muted (the reference's 10.5px is scaled ×1.2 because it was a miniature mockup) |

> **Mockup scale rule**: The reference's "screen" mockups (`.screen …`) are drawn at about 80%
> scale. When a component comes from a mockup rule (`.strip`, `.chip`, `.pop`, `.sheet`, `.field`,
> `.btn`, `.kpi`), use the same proportions, colors, borders and radii, with font sizes and
> paddings ×1.2, rounded to the nearest px. Example: `.chip` is 11px / `3px 9px` in the mockup,
> so it ships at 13px / `4px 11px`.

## 3. Spacing (FR-033)

| Token | Value | Used for |
|---|---|---|
| `--space-page` | 56px (32px < 640px) | gap between page sections (reference `.wrap` gap) |
| `--space-section` | 18px | heading → content inside a section |
| `--space-card` | 18px–22px | card / panel / sheet padding |
| `--space-grid` | 14px (min 12px) | input grid gaps |
| page column | `max-width: 1040px`, side gutter `max(16px, safe-area)` | `<main>` |
| running text | `max-width: 68ch` | paragraphs |

Input grids never go past 2 columns (`grid-cols-1 sm:grid-cols-2`).

## 4. Components — `libs/shared/ui/src/lib/ds/`

Each one maps to the reference rule it copies:

| Component | Reference rule(s) | Behavior from |
|---|---|---|
| `Button` (`variant: 'default' \| 'primary' \| 'ghost'`) | `.btn`, `.btn.primary` | `@ui-sdk/react/button` |
| `Chip` (`tone: 'default' \| 'pin' \| 'err' \| 'total' \| 'missing' \| 'muted'`) | `.chip`, `.chip.pin`, `.chip.err`, `.chip.total`; missing = dashed border and muted text (reference "First run" demo) | button / PopoverTrigger |
| `Card` (`as`, `padding`) | `.card` / `.box` / `.idea` (surface, 1px line, radius 10px, padding 18px) | — |
| `Eyebrow` | `.eyebrow` | — |
| `SectionHeader` (eyebrow, title, lede) | `section > .eyebrow + h2` | — |
| `Field` | `.field` (1px line, radius 5px, surface, tabular numerals) plus label in `text-label`, error in `text-bad` | existing `NumberField` / `DateField` |
| `SegmentedToggle` | `.tab` / `.tab[aria-selected]` (ink fill) | `@ui-sdk/react/segmented-control` or `tabs` |
| `Tabs` (scenario tabs) | `.scen span` / `.scen .on` | `@ui-sdk/react/tabs` |
| `Sheet` (`side: 'right' \| 'bottom'`) | `.sheet` (surface, line, shadow-float, 12px → 20px padding, width `min(420px, 92vw)` desktop) | `@ui-sdk/react/drawer` (+ `sheetPhysics` bottom) |
| `Popover` | `.pop` (surface, line, radius 8px, shadow-float, 10px → 14px padding, width 260px) | `@ui-sdk/react/popover` |
| `Toast` | `.toast` (ink fill, ink-fg text, radius 7px) | `@ui-sdk/react/toast` |
| `Badge` / `MetricBadge` | `.tag` (pill, soft semantic fill) | — |
| `Kpi` | `.kpi` / `.fact` | — |
| table styles (`DataTable`) | `.matrix` (11–12px muted headers, 1px line rows, 5–6px cell padding scaled ×1.2) | — |
| `Ripple` | `.flash` (warn-soft fill, warn text, radius 4px) | R7 |
| `ThemeSwitcher` | `.btn` icon variant | ui-sdk `Preferences` + `createColorScheme` (R3) |

**Card rule (FR-017)**: only standalone objects get `Card`: the strip, KPI tiles, the matrix, the
sheet's derived rows, and charts. Plain sections are not cards. Shadows appear only on the sheet,
popovers and toasts.

**Semantic color rule**: positive / negative / caution use `good` / `bad` / `warn`, never `accent`.
The accent is for links, pinned chips, focus and the primary series.

> **Superseded in part by spec 011 (2026-11-18)**: The Deal Strip is now an app-level deal bar
> above every page header (full width, `bg-sunk`, divider, sticky), not a `.strip` card under the
> title. "Edit deal" is a full-size primary button with a pencil icon. See
> `specs/011-ui-polish/spec.md` US1 and `contracts/ui.md`. Spec 010's FR-034 visual check doesn't
> apply to the strip's container.

## 5. Shell

- **Side nav**: surface fill, 1px line on the right, item radius 7px. The active item uses
  `bg-ink text-ink-fg` (the reference's `.rail i.on`). The app name is in `font-display`. The
  `ThemeSwitcher` sits at the bottom.
- **Mobile header**: surface fill, 1px line on the bottom, `ThemeSwitcher` on the right.
- **Page header**: `Eyebrow` (the page group, e.g. "Analysis"), `h1.text-title`, `.lede`
  subtitle, gap 12px.

## 6. Charts — `libs/shared/charts/src/theme.css`

- `--chart-surface: var(--surface)`, `--chart-ink: var(--fg)`,
  `--chart-ink-secondary: var(--color-muted)`, `--chart-muted: var(--color-muted)` (FR-035: `faint` never carries text),
  `--chart-grid: var(--line)`, `--chart-axis: var(--line)`, `--chart-border: var(--line)`.
- `--chart-series-1…5: var(--seg1…5)`, `--chart-series-6: var(--good)`,
  `--chart-series-7: var(--bad)`, `--chart-series-8: var(--warn)`.
- Charts inherit the app's dark switching, so the dark blocks in `theme.css` are removed (or point
  at `data-color-scheme`).
- The font is `var(--font-body)`, and the tooltip uses the `Popover` treatment.
