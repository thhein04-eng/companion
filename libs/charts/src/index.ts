// Public API of @companion/charts. Anything not exported here is private.
export type {
  SeriesSlot,
  ColorToken,
  SeriesDef,
  Datum,
  SegmentDef,
  ChartFormatters,
  TooltipExtra,
  ChartBaseProps,
} from './lib/types';
export { colorVar } from './lib/types';
export { linearScale, bandScale, niceTicks, yExtent } from './lib/scales';
export type { LinearScale, BandScale } from './lib/scales';
export { linePath, roundedTopRect } from './lib/paths';
export { formatCompactCurrency, capSeries } from './lib/format';
export { useElementWidth } from './lib/use-element-width';
export { usePlotKeyboard } from './lib/use-plot-keyboard';
export { LineChart } from './lib/line-chart';
export type { LineChartProps } from './lib/line-chart';
export { StackedBarChart } from './lib/stacked-bar-chart';
export type { StackedBarChartProps } from './lib/stacked-bar-chart';
export { SegmentedBar } from './lib/segmented-bar';
export type { SegmentedBarProps } from './lib/segmented-bar';
export { ChartFrame } from './lib/chart-frame';
export type { ChartFrameProps } from './lib/chart-frame';
export { Legend } from './lib/legend';
export type { LegendItem } from './lib/legend';
export { ChartTooltip } from './lib/chart-tooltip';
export type { ChartTooltipProps, ChartTooltipRow } from './lib/chart-tooltip';
export { ChartDataTable } from './lib/chart-data-table';
export type { ChartDataTableProps, ChartDataColumn } from './lib/chart-data-table';
