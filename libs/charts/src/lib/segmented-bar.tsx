'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { ChartDataTable } from './chart-data-table';
import { ChartTooltip } from './chart-tooltip';
import { colorVar, type ChartBaseProps, type SegmentDef } from './types';
import { useElementWidth } from './use-element-width';

export interface SegmentedBarProps extends ChartBaseProps {
  /** At most 6 non-zero segments. Zero-value segments are dropped. */
  segments: SegmentDef[];
  /** The authoritative total; may differ from the segments' sum by rounding. */
  total: number;
  formatValue: (value: number) => string;
}

const BAR_HEIGHT = 32;
const GAP = 2;
const RADIUS = 4;
const MAX_SEGMENTS = 6;
/** Rough average glyph width at 11px, used to decide whether a value label fits in its segment. */
const CHAR_WIDTH = 6.5;
const percent = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * One whole split into parts: a tall segmented bar with a legend of names, values and shares.
 * There is no axis. Segments form a roving-tabindex list with ←/→ and a tooltip on hover or focus.
 */
export function SegmentedBar({
  title,
  description,
  segments,
  total,
  formatValue,
  showDataTable = true,
  className,
  'data-testid': testId,
}: SegmentedBarProps) {
  const parts = segments.filter((s) => s.value > 0);
  if (parts.length > MAX_SEGMENTS && process.env.NODE_ENV !== 'production') {
    throw new Error(`SegmentedBar shows at most ${MAX_SEGMENTS} segments; got ${parts.length}. Fold the rest into "Other".`);
  }
  const shown = parts.slice(0, MAX_SEGMENTS);
  const sum = shown.reduce((s, p) => s + p.value, 0);
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const itemRefs = useRef<(SVGGElement | null)[]>([]);

  const share = (v: number) => (total > 0 ? v / total : 0);

  // Segment geometry: proportional widths with 2px gaps between parts.
  const w = width ?? 0;
  const usable = Math.max(0, w - GAP * (shown.length - 1));
  let cursor = 0;
  const geometry = shown.map((part, i) => {
    const segW = sum > 0 ? (part.value / sum) * usable : 0;
    const g = { x: cursor, w: segW };
    cursor += segW + (i < shown.length - 1 ? GAP : 0);
    return g;
  });

  const onKeyDown = (event: KeyboardEvent) => {
    const last = shown.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = Math.min(last, focusIndex + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Escape') {
      setActive(null);
      return;
    }
    if (next == null) return;
    event.preventDefault();
    setFocusIndex(next);
    setActive(next);
    itemRefs.current[next]?.focus();
  };

  const activePart = active != null ? shown[active] : null;

  return (
    <figure
      data-testid={testId}
      className={`chart-root m-0 flex min-w-0 flex-col gap-2 rounded-md p-3 ${className ?? ''}`}
      style={{ boxShadow: '0 0 0 1px var(--chart-border)' }}
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="m-0 text-sm font-medium" style={{ color: 'var(--chart-ink)' }}>
          {title}
        </h3>
        {description ? (
          <p className="m-0 text-xs" style={{ color: 'var(--chart-ink-secondary)' }}>
            {description}
          </p>
        ) : null}
      </div>
      <div ref={ref} className="relative w-full min-w-0" style={{ height: BAR_HEIGHT }}>
        {width != null && width > 0 ? (
          <svg width={w} height={BAR_HEIGHT} style={{ display: 'block', overflow: 'visible' }} role="list" aria-label={title}>
            {shown.map((part, i) => {
              const { x, w: segW } = geometry[i];
              const first = i === 0;
              const lastSeg = i === shown.length - 1;
              const label = formatValue(part.value);
              const fits = label.length * CHAR_WIDTH + 8 <= segW;
              const text = part.color === 4 ? '#0b0b0b' : '#ffffff';
              return (
                <g
                  key={part.key}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="listitem"
                  aria-label={`${part.label}: ${label} (${percent.format(share(part.value))})`}
                  tabIndex={i === focusIndex ? 0 : -1}
                  data-segment={part.key}
                  onKeyDown={onKeyDown}
                  onFocus={() => {
                    setFocusIndex(i);
                    setActive(i);
                  }}
                  onBlur={() => setActive(null)}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  style={{ outline: 'none' }}
                >
                  <SegmentShape x={x} w={segW} first={first} last={lastSeg} fill={colorVar(part.color)} />
                  {active === i ? (
                    <rect x={x} y={0} width={segW} height={BAR_HEIGHT} fill="none" stroke="var(--chart-ink)" strokeWidth={1.5} rx={2} />
                  ) : null}
                  {fits ? (
                    <text x={x + segW / 2} y={BAR_HEIGHT / 2} dy="0.32em" textAnchor="middle" fontSize={11} fill={text} pointerEvents="none">
                      {label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
        {activePart && active != null && width != null ? (
          <ChartTooltip
            left={geometry[active].x + geometry[active].w / 2}
            top={BAR_HEIGHT + 4}
            containerWidth={width}
            heading={activePart.label}
            rows={[{ label: 'Amount', color: activePart.color, value: formatValue(activePart.value) }]}
            extras={[{ label: 'Share', value: percent.format(share(activePart.value)) }]}
          />
        ) : null}
      </div>
      <ul aria-label="Legend" className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
        {shown.map((part) => (
          <li key={part.key} className="flex items-center gap-2" style={{ color: 'var(--chart-ink-secondary)' }}>
            <span aria-hidden="true" data-swatch="" style={{ width: 10, height: 10, borderRadius: 2, background: colorVar(part.color), flex: 'none' }} />
            <span>{part.label}</span>
            <span className="ml-auto" style={{ color: 'var(--chart-ink)' }}>
              {formatValue(part.value)}
            </span>
            <span className="w-12 text-right">{percent.format(share(part.value))}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--chart-grid)', color: 'var(--chart-ink)' }}>
          <span className="font-medium">Total</span>
          <span className="ml-auto font-medium">{formatValue(total)}</span>
          <span className="w-12" />
        </li>
      </ul>
      {showDataTable ? (
        <ChartDataTable
          caption={title}
          columns={[
            { key: 'label', label: 'Component' },
            { key: 'value', label: 'Amount', format: (v) => formatValue(v as number) },
            { key: 'share', label: 'Share', format: (v) => percent.format(v as number) },
          ]}
          rows={[
            ...shown.map((p) => ({ label: p.label, value: p.value, share: share(p.value) })),
            { label: 'Total', value: total, share: 1 },
          ]}
        />
      ) : null}
    </figure>
  );
}

function SegmentShape({ x, w, first, last, fill }: { x: number; w: number; first: boolean; last: boolean; fill: string }) {
  if (w <= 0) return null;
  const r = Math.min(RADIUS, w / 2, BAR_HEIGHT / 2);
  if (first && last) return <rect x={x} y={0} width={w} height={BAR_HEIGHT} rx={r} fill={fill} />;
  if (!first && !last) return <rect x={x} y={0} width={w} height={BAR_HEIGHT} fill={fill} />;
  // Round only the outer end (left for the first segment, right for the last).
  const d = first
    ? `M${x + w},0L${x + r},0Q${x},0 ${x},${r}L${x},${BAR_HEIGHT - r}Q${x},${BAR_HEIGHT} ${x + r},${BAR_HEIGHT}L${x + w},${BAR_HEIGHT}Z`
    : `M${x},0L${x + w - r},0Q${x + w},0 ${x + w},${r}L${x + w},${BAR_HEIGHT - r}Q${x + w},${BAR_HEIGHT} ${x + w - r},${BAR_HEIGHT}L${x},${BAR_HEIGHT}Z`;
  return <path d={d} fill={fill} />;
}
