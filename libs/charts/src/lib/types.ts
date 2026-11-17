/** One of the 8 fixed categorical palette slots. Assign by entity, never by rank; never cycle. */
export type SeriesSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** A palette slot, or the de-emphasis gray for context series. Raw hex values are never accepted. */
export type ColorToken = SeriesSlot | 'muted';

export interface SeriesDef<K extends string = string> {
  /** Property name read from each `Datum`. Unique within a chart. */
  key: K;
  /** Shown in the legend, tooltip, direct label and table header. */
  label: string;
  color: ColorToken;
  /** Default `'primary'`. `'context'` draws a thinner muted mark beneath the primary series. */
  emphasis?: 'primary' | 'context';
}

/**
 * One x position and its per-series values. `null` means "no value here":
 * line charts break the path; stacked bars treat it as 0. Values may be negative.
 */
export type Datum<K extends string = string> = { x: number | string } & { [P in K]: number | null };

/** One part of a `SegmentedBar`. `value` must be ≥ 0; zero-value segments are dropped. */
export interface SegmentDef {
  key: string;
  label: string;
  value: number;
  color: ColorToken;
}

export interface ChartFormatters<X = number | string> {
  /** Axis tick labels. */
  x?: (x: X) => string;
  /** Axis tick labels (default: compact number). */
  y?: (y: number) => string;
  /** Tooltip heading (default: `x`). */
  tooltipX?: (x: X) => string;
  /** Tooltip and table values (default: `y`). */
  tooltipY?: (y: number) => string;
}

/** A context row in the tooltip / data table that is not a series (no swatch). */
export interface TooltipExtra {
  label: string;
  value: string;
}

/** Shared by every chart component. */
export interface ChartBaseProps {
  /** Visible `<h3>`, also the plot group's accessible name. */
  title: string;
  /** One line under the title. */
  description?: string;
  /** Plot height in px. Default 240. */
  height?: number;
  /** Render the "Show data" table toggle. Default true. */
  showDataTable?: boolean;
  /** Context rows for the active index, shown in the tooltip and as extra table columns. */
  tooltipExtras?: (index: number) => TooltipExtra[];
  className?: string;
  'data-testid'?: string;
}

/** The CSS custom property for a color token, defined in `theme.css`. */
export function colorVar(token: ColorToken): string {
  return token === 'muted' ? 'var(--chart-muted)' : `var(--chart-series-${token})`;
}
