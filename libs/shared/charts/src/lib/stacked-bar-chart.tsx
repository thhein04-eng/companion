'use client';

import { useMemo, type PointerEvent } from 'react';
import { ChartFrame } from './chart-frame';
import { ChartDataTable } from './chart-data-table';
import { ChartTooltip } from './chart-tooltip';
import { Legend } from './legend';
import { roundedTopRect } from './paths';
import { bandScale, linearScale, niceTicks } from './scales';
import {
  colorVar,
  type ChartBaseProps,
  type ChartFormatters,
  type Datum,
  type SeriesDef,
} from './types';
import { usePlotKeyboard } from './use-plot-keyboard';

export interface StackedBarChartProps<K extends string> extends ChartBaseProps {
  /** `x` is a unique category label. */
  data: Datum<K>[];
  /** Stack order: positives stack upward and negatives downward from 0, in array order. */
  series: SeriesDef<K>[];
  formatters?: ChartFormatters<string>;
  /** Add a signed "Total" row to the tooltip and table. Default true. */
  showTotalInTooltip?: boolean;
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const MAX_COLUMN = 24;
const GAP = 2;
const RADIUS = 4;

interface Segment {
  key: string;
  color: SeriesDef['color'];
  x: number;
  y: number;
  w: number;
  h: number;
  /** Outermost segment in its direction: gets the rounded end. */
  outer: 'up' | 'down' | null;
}

/** Stacked columns (signed), one per category, with tooltip, keyboard stepping and a data table. */
export function StackedBarChart<K extends string>(
  props: StackedBarChartProps<K>,
) {
  const {
    title,
    description,
    height = 240,
    showDataTable = true,
    showTotalInTooltip = true,
    tooltipExtras,
    className,
    'data-testid': testId,
    data,
    series,
    formatters = {},
  } = props;
  const fx = formatters.x ?? ((x: string) => x);
  const fy = formatters.y ?? ((y: number) => compactNumber.format(y));
  const ftx = formatters.tooltipX ?? fx;
  const fty = formatters.tooltipY ?? fy;
  const extrasLabels =
    tooltipExtras && data.length > 0
      ? tooltipExtras(0).map((e) => e.label)
      : [];

  return (
    <ChartFrame
      title={title}
      description={description}
      height={height}
      className={className}
      data-testid={testId}
      legend={
        series.length >= 2 ? (
          <Legend
            items={series.map((s) => ({ label: s.label, color: s.color }))}
          />
        ) : null
      }
      dataTable={
        showDataTable ? (
          <ChartDataTable
            caption={title}
            columns={[
              { key: 'x', label: '', format: (v) => ftx(String(v)) },
              ...series.map((s) => ({
                key: s.key,
                label: s.label,
                format: (v: unknown) => fty(v as number),
              })),
              ...(showTotalInTooltip
                ? [
                    {
                      key: '__total',
                      label: 'Total',
                      format: (v: unknown) => fty(v as number),
                    },
                  ]
                : []),
              ...extrasLabels.map((label) => ({
                key: `extra:${label}`,
                label,
              })),
            ]}
            rows={data.map((d, i) => {
              const row: Record<string, unknown> = {
                ...d,
                __total: totalOf(d, series),
              };
              if (tooltipExtras)
                for (const e of tooltipExtras(i))
                  row[`extra:${e.label}`] = e.value;
              return row;
            })}
          />
        ) : null
      }
    >
      {(width) => (
        <BarPlot
          {...props}
          width={width}
          height={height}
          fx={fx}
          fy={fy}
          ftx={ftx}
          fty={fty}
          showTotalInTooltip={showTotalInTooltip}
        />
      )}
    </ChartFrame>
  );
}

function valueOf<K extends string>(d: Datum<K>, key: K): number {
  const v = d[key] as number | null;
  if (v == null || !Number.isFinite(v)) return 0;
  return v;
}

function totalOf<K extends string>(
  d: Datum<K>,
  series: SeriesDef<K>[],
): number {
  return (
    Math.round(series.reduce((sum, s) => sum + valueOf(d, s.key), 0) * 100) /
    100
  );
}

interface BarPlotProps<K extends string> extends StackedBarChartProps<K> {
  width: number;
  height: number;
  fx: (x: string) => string;
  fy: (y: number) => string;
  ftx: (x: string) => string;
  fty: (y: number) => string;
}

function BarPlot<K extends string>({
  title,
  data,
  series,
  width,
  height,
  tooltipExtras,
  showTotalInTooltip,
  fx,
  fy,
  ftx,
  fty,
}: BarPlotProps<K>) {
  const margin = { top: 8, right: 12, bottom: 24, left: 56 };
  const innerW = Math.max(1, width - margin.left - margin.right);
  const innerH = Math.max(1, height - margin.top - margin.bottom);
  const { activeIndex, setActiveIndex, onKeyDown, onBlur } = usePlotKeyboard(
    data.length,
  );

  const geometry = useMemo(() => {
    const categories = data.map((d) => String(d.x));
    const band = bandScale(categories, [0, innerW], 0.3);
    let lo = 0;
    let hi = 0;
    for (const d of data) {
      let pos = 0;
      let neg = 0;
      for (const s of series) {
        const v = valueOf(d, s.key);
        if (v > 0) pos += v;
        else neg += v;
      }
      hi = Math.max(hi, pos);
      lo = Math.min(lo, neg);
    }
    if (lo === 0 && hi === 0) hi = 1;
    const yTicks = niceTicks(lo, hi, 5);
    const y = linearScale([yTicks[0], yTicks[yTicks.length - 1]], [innerH, 0]);
    const colW = Math.min(band.bandwidth, MAX_COLUMN);

    const columns = data.map((d, i) => {
      const cx = band(categories[i]) + band.bandwidth / 2;
      const left = cx - colW / 2;
      const segments: Segment[] = [];
      let pos = 0;
      let neg = 0;
      const lastPos = [...series]
        .reverse()
        .find((s) => valueOf(d, s.key) > 0)?.key;
      const lastNeg = [...series]
        .reverse()
        .find((s) => valueOf(d, s.key) < 0)?.key;
      for (const s of series) {
        const v = valueOf(d, s.key);
        if (v === 0) continue;
        if (v > 0) {
          const y0 = y(pos);
          const y1 = y(pos + v);
          pos += v;
          // Leave a 2px surface gap at the segment's outer edge (never below 0 height).
          const h = Math.max(0, y0 - y1 - (s.key === lastPos ? 0 : GAP));
          segments.push({
            key: s.key,
            color: s.color,
            x: left,
            y: y0 - h,
            w: colW,
            h,
            outer: s.key === lastPos ? 'up' : null,
          });
        } else {
          const y0 = y(neg);
          const y1 = y(neg + v);
          neg += v;
          const h = Math.max(0, y1 - y0 - (s.key === lastNeg ? 0 : GAP));
          segments.push({
            key: s.key,
            color: s.color,
            x: left,
            y: y0,
            w: colW,
            h,
            outer: s.key === lastNeg ? 'down' : null,
          });
        }
      }
      return { cx, segments };
    });

    // Thin x labels to about one per 80px, always keeping the first and last.
    const every = Math.max(
      1,
      Math.ceil(categories.length / Math.max(1, Math.floor(innerW / 80))),
    );
    const xLabels = categories
      .map((c, i) => ({ c, i }))
      .filter(
        ({ i }) => i === 0 || i === categories.length - 1 || i % every === 0,
      )
      .filter(
        ({ i }, idx, arr) =>
          idx === arr.length - 1 ||
          arr[arr.length - 1].i - i >= every / 2 ||
          i === 0,
      );

    return { band, y, yTicks, columns, xLabels, categories };
  }, [data, series, innerW, innerH]);

  const { band, y, yTicks, columns, xLabels, categories } = geometry;
  const spansZero = yTicks[0] < 0 && yTicks[yTicks.length - 1] > 0;

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const index = Math.max(
      0,
      Math.min(data.length - 1, Math.floor(px / band.step)),
    );
    setActiveIndex(index);
  };

  const active = activeIndex != null ? data[activeIndex] : null;
  // Tooltip lists series top to bottom as drawn: positives (top first), then negatives.
  const rows = active
    ? [
        ...[...series].reverse().filter((s) => valueOf(active, s.key) > 0),
        ...series.filter((s) => valueOf(active, s.key) < 0),
      ].map((s) => ({
        label: s.label,
        color: s.color,
        value: fty(valueOf(active, s.key)),
      }))
    : [];
  const extras = [
    ...(active && showTotalInTooltip
      ? [{ label: 'Total', value: fty(totalOf(active, series)) }]
      : []),
    ...(activeIndex != null && tooltipExtras ? tooltipExtras(activeIndex) : []),
  ];
  const heading = active ? ftx(String(active.x)) : '';
  const liveText = active
    ? [
        heading,
        ...rows.map((r) => `${r.label} ${r.value}`),
        ...extras.map((e) => `${e.label} ${e.value}`),
      ].join(', ')
    : '';

  // The live region is a sibling of the focusable plot, not a child: modal popups keep live
  // regions (and everything containing them) out of their inert background, so a live region
  // inside the plot would leave the plot focusable behind an open dialog.
  return (
    <>
      <div
        role="group"
        aria-roledescription="chart"
        aria-label={title}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className="relative h-full w-full rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          width={width}
          height={height}
          aria-hidden="true"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {activeIndex != null ? (
              <rect
                x={
                  band(categories[activeIndex]) -
                  (band.step - band.bandwidth) / 2
                }
                y={0}
                width={band.step}
                height={innerH}
                fill="var(--chart-grid)"
                opacity={0.6}
              />
            ) : null}
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)'}
                  strokeWidth={1}
                  data-zero-line={t === 0 && spansZero ? '' : undefined}
                />
                <text
                  x={-8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--chart-muted)"
                >
                  {fy(t)}
                </text>
              </g>
            ))}
            {columns.map((col, i) => (
              <g key={categories[i]} data-column={categories[i]}>
                {col.segments.map((seg) =>
                  seg.outer ? (
                    <path
                      key={seg.key}
                      data-series={seg.key}
                      data-rounded={seg.outer}
                      d={roundedTopRect(
                        seg.x,
                        seg.y,
                        seg.w,
                        seg.h,
                        RADIUS,
                        seg.outer,
                      )}
                      fill={colorVar(seg.color)}
                    />
                  ) : (
                    <rect
                      key={seg.key}
                      data-series={seg.key}
                      x={seg.x}
                      y={seg.y}
                      width={seg.w}
                      height={seg.h}
                      fill={colorVar(seg.color)}
                    />
                  ),
                )}
              </g>
            ))}
            {xLabels.map(({ c, i }) => (
              <text
                key={`x${c}`}
                x={columns[i].cx}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--chart-muted)"
              >
                {fx(c)}
              </text>
            ))}
            <rect
              x={0}
              y={0}
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setActiveIndex(null)}
            />
          </g>
        </svg>
        {active && activeIndex != null ? (
          <ChartTooltip
            left={margin.left + columns[activeIndex].cx}
            top={margin.top + 4}
            containerWidth={width}
            heading={heading}
            rows={rows}
            extras={extras}
          />
        ) : null}
      </div>
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>
    </>
  );
}
