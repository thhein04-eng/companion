'use client';

import { useMemo, type PointerEvent } from 'react';
import { ChartFrame } from './chart-frame';
import { ChartDataTable } from './chart-data-table';
import { ChartTooltip } from './chart-tooltip';
import { Legend } from './legend';
import { linePath } from './paths';
import { linearScale, niceTicks, yExtent } from './scales';
import {
  colorVar,
  type ChartBaseProps,
  type ChartFormatters,
  type Datum,
  type SeriesDef,
} from './types';
import { usePlotKeyboard } from './use-plot-keyboard';

export interface LineChartProps<K extends string> extends ChartBaseProps {
  /** `x` must be numeric and strictly increasing. */
  data: Datum<K>[];
  series: SeriesDef<K>[];
  formatters?: ChartFormatters<number>;
  /** Default `'zero-based'` ([0, niceMax]). `'auto'` includes negatives and 0. */
  yDomain?: [number, number] | 'zero-based' | 'auto';
  /** Override the automatic x ticks. */
  xTickValues?: number[];
  /** Label each line at its last point. Default: true when there are ≤ 4 series. */
  directLabels?: boolean;
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

/** A 2px multi-series line chart with crosshair tooltip, keyboard stepping and a data table. */
export function LineChart<K extends string>(props: LineChartProps<K>) {
  const {
    title,
    description,
    height = 240,
    showDataTable = true,
    tooltipExtras,
    className,
    'data-testid': testId,
    data,
    series,
    formatters = {},
  } = props;
  const fx = formatters.x ?? ((x: number) => String(x));
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
            items={series.map((s) => ({
              label: s.label,
              color: s.color,
              emphasis: s.emphasis,
            }))}
          />
        ) : null
      }
      dataTable={
        showDataTable ? (
          <ChartDataTable
            caption={title}
            columns={[
              { key: 'x', label: '', format: (v) => ftx(v as number) },
              ...series.map((s) => ({
                key: s.key,
                label: s.label,
                format: (v: unknown) => fty(v as number),
              })),
              ...extrasLabels.map((label) => ({
                key: `extra:${label}`,
                label,
              })),
            ]}
            rows={data.map((d, i) => {
              const row: Record<string, unknown> = { ...d };
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
        <LinePlot
          {...props}
          width={width}
          height={height}
          fx={fx}
          fy={fy}
          ftx={ftx}
          fty={fty}
        />
      )}
    </ChartFrame>
  );
}

interface LinePlotProps<K extends string> extends LineChartProps<K> {
  width: number;
  height: number;
  fx: (x: number) => string;
  fy: (y: number) => string;
  ftx: (x: number) => string;
  fty: (y: number) => string;
}

function LinePlot<K extends string>({
  title,
  data,
  series,
  width,
  height,
  yDomain = 'zero-based',
  xTickValues,
  directLabels = series.length <= 4,
  tooltipExtras,
  fx,
  fy,
  ftx,
  fty,
}: LinePlotProps<K>) {
  const margin = {
    top: 8,
    right: directLabels ? 96 : 12,
    bottom: 24,
    left: 56,
  };
  const innerW = Math.max(1, width - margin.left - margin.right);
  const innerH = Math.max(1, height - margin.top - margin.bottom);
  const { activeIndex, setActiveIndex, onKeyDown, onBlur } = usePlotKeyboard(
    data.length,
  );

  const geometry = useMemo(() => {
    const xs = data.map((d) => Number(d.x));
    const xMin = xs.length ? xs[0] : 0;
    const xMax = xs.length ? xs[xs.length - 1] : 1;
    const x = linearScale([xMin, xMax], [0, innerW]);

    let yTicks: number[];
    if (Array.isArray(yDomain)) {
      yTicks = niceTicks(yDomain[0], yDomain[1], 5);
    } else {
      const values = data.flatMap((d) =>
        series.map((s) => d[s.key] as number | null),
      );
      const [lo, hi] = yExtent(values, yDomain);
      yTicks = niceTicks(lo, hi, 5);
    }
    const y = linearScale([yTicks[0], yTicks[yTicks.length - 1]], [innerH, 0]);

    // About one label per 80px of plot area (not the full width, which includes the axis margins).
    const tickCount = clamp(Math.floor(innerW / 80), 2, 8);
    const inRange = (
      xTickValues ?? niceTicks(xMin, xMax, tickCount, { integer: true })
    ).filter((t) => t >= xMin && t <= xMax);
    // Caller-supplied ticks are thinned to the same ~80px budget, so labels never collide on
    // narrow screens (spec 010 visual review at 390px).
    const stride = Math.max(1, Math.ceil(inRange.length / tickCount));
    const xTicks = inRange.filter((_, i) => i % stride === 0);

    const paths = series.map((s) =>
      linePath(
        data.map((d, i) => {
          const v = d[s.key] as number | null;
          return v == null || !Number.isFinite(v)
            ? null
            : { x: x(xs[i]), y: y(v) };
        }),
      ),
    );

    // Direct labels at each series' last non-null point, nudged apart vertically.
    const labels = series
      .map((s) => {
        for (let i = data.length - 1; i >= 0; i--) {
          const v = data[i][s.key] as number | null;
          if (v != null && Number.isFinite(v))
            return {
              key: s.key,
              label: s.label,
              color: s.color,
              px: x(xs[i]),
              py: y(v),
            };
        }
        return null;
      })
      .filter((l): l is NonNullable<typeof l> => l != null)
      .sort((a, b) => a.py - b.py);
    // Resolve overlaps from the bottom up, keeping every label above the x-axis tick row
    // (lines that end at $0 would otherwise collide with the last tick label).
    let floor = innerH - 8;
    for (let i = labels.length - 1; i >= 0; i--) {
      labels[i].py = Math.min(labels[i].py, floor);
      floor = labels[i].py - 14;
    }
    let ceiling = 4;
    for (const l of labels) {
      l.py = Math.max(l.py, ceiling);
      ceiling = l.py + 14;
    }

    return { xs, x, y, yTicks, xTicks, paths, labels };
  }, [data, series, innerW, innerH, yDomain, xTickValues]);

  const { xs, x, y, yTicks, xTicks, paths, labels } = geometry;
  // Direct labels sit in the right margin: dot (8px) + gap + text at ~6.2px per 11px glyph.
  const maxLabelChars = Math.max(4, Math.floor((margin.right - 24) / 6.2));
  const spansZero = yTicks[0] < 0 && yTicks[yTicks.length - 1] > 0;

  const nearestIndex = (px: number) => {
    const target = x.invert(px);
    let best = 0;
    for (let i = 1; i < xs.length; i++)
      if (Math.abs(xs[i] - target) < Math.abs(xs[best] - target)) best = i;
    return best;
  };
  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveIndex(nearestIndex(event.clientX - rect.left));
  };

  const active = activeIndex != null ? data[activeIndex] : null;
  const activeRows =
    active == null
      ? []
      : series
          .filter((s) => active[s.key] != null)
          .map((s) => ({
            label: s.label,
            color: s.color,
            value: fty(active[s.key] as number),
          }));
  const extras =
    activeIndex != null && tooltipExtras ? tooltipExtras(activeIndex) : [];
  const heading = active ? ftx(xs[activeIndex as number]) : '';
  const liveText = active
    ? [
        heading,
        ...activeRows.map((r) => `${r.label} ${r.value}`),
        ...extras.map((e) => `${e.label} ${e.value}`),
      ].join(', ')
    : '';
  const activeX = activeIndex != null ? x(xs[activeIndex]) : 0;
  const firstActiveY = active
    ? Math.min(
        ...series
          .filter((s) => active[s.key] != null)
          .map((s) => y(active[s.key] as number)),
        innerH,
      )
    : 0;

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
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line
                  x1={0}
                  x2={innerW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={
                    t === 0 && spansZero
                      ? 'var(--chart-axis)'
                      : 'var(--chart-grid)'
                  }
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
            <line
              x1={0}
              x2={innerW}
              y1={innerH}
              y2={innerH}
              stroke="var(--chart-axis)"
              strokeWidth={1}
            />
            {xTicks.map((t) => (
              <text
                key={`x${t}`}
                x={x(t)}
                y={innerH + 16}
                textAnchor="middle"
                fontSize={11}
                fill="var(--chart-muted)"
              >
                {fx(t)}
              </text>
            ))}
            {series
              .map((s, i) => ({ s, d: paths[i] }))
              .sort(
                (a, b) =>
                  Number(a.s.emphasis !== 'context') -
                  Number(b.s.emphasis !== 'context'),
              )
              .map(({ s, d }) => (
                <path
                  key={s.key}
                  data-series={s.key}
                  d={d}
                  fill="none"
                  stroke={colorVar(
                    s.emphasis === 'context' ? 'muted' : s.color,
                  )}
                  strokeWidth={s.emphasis === 'context' ? 1.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
            {directLabels
              ? labels.map((l) => (
                  <g
                    key={`label-${l.key}`}
                    transform={`translate(${l.px + 8},${l.py})`}
                  >
                    <circle r={4} cx={0} cy={0} fill={colorVar(l.color)} />
                    <text
                      x={8}
                      dy="0.32em"
                      fontSize={11}
                      fill="var(--chart-ink-secondary)"
                    >
                      <title>{l.label}</title>
                      {truncate(l.label, maxLabelChars)}
                    </text>
                  </g>
                ))
              : null}
            {active ? (
              <g>
                <line
                  x1={activeX}
                  x2={activeX}
                  y1={0}
                  y2={innerH}
                  stroke="var(--chart-axis)"
                  strokeWidth={1}
                />
                {series.map((s) => {
                  const v = active[s.key] as number | null;
                  if (v == null) return null;
                  return (
                    <circle
                      key={`dot-${s.key}`}
                      cx={activeX}
                      cy={y(v)}
                      r={4.5}
                      fill={colorVar(
                        s.emphasis === 'context' ? 'muted' : s.color,
                      )}
                      stroke="var(--chart-surface)"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            ) : null}
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
        {active ? (
          <ChartTooltip
            left={margin.left + activeX}
            top={margin.top + firstActiveY - 12}
            containerWidth={width}
            heading={heading}
            rows={activeRows}
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
