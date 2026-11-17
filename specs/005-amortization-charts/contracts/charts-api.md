# Contract: `@companion/charts` public API

**Project**: `libs/shared/charts` · Nx tags `scope:shared`, `type:ui` · entry points `@companion/charts`
(TS/React) and `@companion/charts/theme.css` (tokens).

**Stability rule**: Anything not exported from `src/index.ts` is private. Deep imports are a lint
error. Adding an optional prop is a minor change. Renaming or removing an export or a required prop
is a breaking change, and every consumer in the workspace must be updated in the same PR.

**Dependency rule**: The only runtime peers are `react`/`react-dom` ≥ 19 and `@ui-sdk/react` (for
`Collapsible`). It has **no** `amortization-*` imports, which ESLint enforces through
`scope:shared`. There are no charting packages.

## Setup for a consumer

1. Add `"@companion/charts": "*"` to the consumer project's `package.json` dependencies (npm
   workspace), and run `npm install`.
2. Import the tokens once in the app's global CSS: `@import '@companion/charts/theme.css';`
3. Add Tailwind scanning: `@source '<relative>/libs/shared/charts/src';`

## Types

```ts
export type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ColorToken = SeriesSlot | 'muted';

export interface SeriesDef<K extends string = string> {
  key: K;
  label: string;
  color: ColorToken;
  emphasis?: 'primary' | 'context'; // default 'primary'
}

export type Datum<K extends string = string> = { x: number | string } & { [P in K]: number | null };

export interface SegmentDef { key: string; label: string; value: number; color: ColorToken }

export interface ChartFormatters<X = number | string> {
  x?: (x: X) => string;        // axis tick labels
  y?: (y: number) => string;   // axis tick labels (default: compact number)
  tooltipX?: (x: X) => string; // tooltip heading (default: formatters.x)
  tooltipY?: (y: number) => string; // tooltip/table values (default: formatters.y)
}

/** Shared by every chart component. */
export interface ChartBaseProps {
  title: string;               // visible <h3>; also aria-label of the plot group
  description?: string;        // one line under the title
  height?: number;             // plot height in px, default 240
  showDataTable?: boolean;     // render the "Show data" collapsible, default true
  tooltipExtras?: (index: number) => { label: string; value: string }[]; // context rows (no swatch), also extra table columns
  className?: string;
  'data-testid'?: string;
}
```

## Components

### `LineChart<K>`

```ts
interface LineChartProps<K extends string> extends ChartBaseProps {
  data: Datum<K>[];            // x: number, strictly increasing
  series: SeriesDef<K>[];      // 1..8
  formatters?: ChartFormatters<number>;
  yDomain?: [number, number] | 'zero-based' | 'auto'; // default 'zero-based' ([0, niceMax]); 'auto' = [min(0,dataMin), max(0,dataMax)] niced
  xTickValues?: number[];      // override automatic x ticks (e.g. every 60 periods)
  directLabels?: boolean;      // default: true when series.length <= 4
}
```

Behavior:

- Lines are 2px and `context` lines are 1.5px muted. The path breaks at `null`.
- When the y-domain spans 0 (as with `'auto'` and negative data), the 0 gridline is drawn in
  `--chart-axis` as the baseline. Other gridlines stay `--chart-grid`.
- With ≥ 2 series there is a legend above the plot.
- Hovering shows a vertical crosshair with a dot (≥ 8px, 2px surface ring) per non-null series,
  plus a tooltip that lists each series as swatch, label and value. Series are sorted in `series`
  order, not by value.
- Keyboard: the plot group has `tabIndex=0`. ←/→ moves ±1 point, Shift+←/→ moves ±12, Home/End
  jump to the ends, and Esc clears. An `aria-live="polite"` region announces the
  tooltip text.

### `StackedBarChart<K>`

```ts
interface StackedBarChartProps<K extends string> extends ChartBaseProps {
  data: Datum<K>[];            // x: string category, unique
  series: SeriesDef<K>[];      // stack order bottom → top = array order
  formatters?: ChartFormatters<string>;
  showTotalInTooltip?: boolean; // default true
}
```

Behavior:

- Column width is `min(bandwidth, 24px)`. There is a 2px surface gap between segments.
- **Signed stacking**: positive values stack upward from 0 in `series` order, and negative values
  stack downward from 0 in `series` order. The outermost segment in each direction gets the 4px
  rounded end (`roundedTopRect(..., 'up' | 'down')`), and ends at the 0 baseline are square.
- The y-domain is `[min(0, Σneg), max(0, Σpos)]`, made nice. When it spans 0, the 0 line is drawn
  in `--chart-axis`.
- With many categories, x tick labels thin out to about 1 per 80px (for example Yr 1, Yr 5,
  Yr 10, …).
- The hover target is the whole band. Keyboard ←/→ moves between categories.
- The tooltip lists series top to bottom as drawn, then a Total row (the signed sum) when
  `showTotalInTooltip` is set, then `tooltipExtras` rows.

### `SegmentedBar`

```ts
interface SegmentedBarProps extends ChartBaseProps {
  segments: SegmentDef[];      // ≤ 6 shown; zero-value dropped
  total: number;               // authoritative total (may differ from Σ by rounding)
  formatValue: (v: number) => string;
}
```

Behavior:

- Draws a tall horizontal bar (default 32px tall) with a 2px surface gap between parts and 4px
  rounded outer ends.
- A part's value is printed on it only when the label fits (measured against the segment width).
- A legend (swatch, label, value, percent of `total`) is always shown. This is the "tall
  segmented bar" exception, where the legend is kept.
- There is no axis. Each segment shows a tooltip on hover or focus. Segments are a roving
  `tabIndex` list.

### Chrome (exported so consumers can build new chart types)

| Export | Purpose |
|---|---|
| `ChartFrame` | Title, description, legend slot, measured width (`children: (width) => ReactNode`), and the data-table collapsible. |
| `Legend` | `{ items: { label; color: ColorToken; emphasis? }[] }`, laid out in one row with wrapping. |
| `ChartTooltip` | `{ x, y, heading, rows: { label; color; value }[] }`, positioned in HTML and flipping at the edges. |
| `ChartDataTable` | `{ caption, columns: { key; label; format? }[], rows }`, a real `<table>` inside `Collapsible`. |
| `useElementWidth` | `ResizeObserver` hook that returns `number \| null`. |
| `usePlotKeyboard` | Active-index state with arrow, Home/End and Esc handling. |

### Pure helpers (exported, unit-tested)

`linearScale`, `bandScale`, `niceTicks`, `yExtent`, `linePath`, `roundedTopRect`, `capSeries`,
`formatCompactCurrency` (`$1.2M`, `$350K`, `$900`). Signatures are in
[data-model.md §A](../data-model.md).

## Theme tokens (`theme.css`)

The tokens are scoped to `.chart-root`. Each one has a light value, plus a dark value under both
`@media (prefers-color-scheme: dark) :root:where(:not([data-theme="light"])) .chart-root` and
`:root[data-theme="dark"] .chart-root`.

`--chart-surface`, `--chart-ink`, `--chart-ink-secondary`, `--chart-muted`, `--chart-grid`,
`--chart-axis`, `--chart-series-1` … `--chart-series-8`. The values are in
[research.md R6](../research.md).

## Conformance tests (in `libs/shared/charts`)

- Helpers: tick niceness and uniqueness, scale inversion, `linePath` breaking at `null`,
  `capSeries`.
- Render (Vitest + Testing Library, jsdom, with `ResizeObserver` stubbed to 600px): uses
  **non-amortization** fixture data (for example monthly temperatures and fruit sales). It checks
  the legend for 2 series and none for 1, the table rows, keyboard stepping that updates the live
  region, and that `color` renders as `var(--chart-series-n)`. It also checks signed data: a
  stacked bar with a negative segment draws it below the 0 baseline with a rounded bottom, and a
  `LineChart` with `yDomain: 'auto'` and negative values has a tick at or below the data minimum and
  a 0 baseline. This is the "second consumer"
  required by SC-003.
