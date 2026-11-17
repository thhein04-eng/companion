'use client';

import { colorVar, type ColorToken, type TooltipExtra } from './types';

export interface ChartTooltipRow {
  label: string;
  color: ColorToken;
  value: string;
}

export interface ChartTooltipProps {
  /** Anchor x (px, relative to the plot container). */
  left: number;
  /** Anchor y (px, relative to the plot container). */
  top: number;
  containerWidth: number;
  heading: string;
  rows: ChartTooltipRow[];
  extras?: TooltipExtra[];
}

const TOOLTIP_WIDTH_ESTIMATE = 180;
const GAP = 12;

/** An HTML tooltip anchored to a plot point; flips to the left near the right edge. */
export function ChartTooltip({
  left,
  top,
  containerWidth,
  heading,
  rows,
  extras = [],
}: ChartTooltipProps) {
  const flip = left + GAP + TOOLTIP_WIDTH_ESTIMATE > containerWidth;
  return (
    <div
      role="presentation"
      data-chart-tooltip=""
      style={{
        position: 'absolute',
        top: Math.max(0, top),
        left: flip ? undefined : left + GAP,
        right: flip ? containerWidth - left + GAP : undefined,
        pointerEvents: 'none',
        background: 'var(--chart-surface)',
        boxShadow: '0 0 0 1px var(--chart-border), 0 4px 12px rgba(0,0,0,0.08)',
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: 12,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
    >
      <div
        style={{ color: 'var(--chart-ink)', fontWeight: 600, marginBottom: 2 }}
      >
        {heading}
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: colorVar(row.color),
              flex: 'none',
            }}
          />
          <span style={{ color: 'var(--chart-ink-secondary)' }}>
            {row.label}
          </span>
          <span
            style={{
              color: 'var(--chart-ink)',
              marginLeft: 'auto',
              paddingLeft: 12,
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
      {extras.length > 0 ? (
        <div
          style={{
            borderTop: '1px solid var(--chart-grid)',
            marginTop: 4,
            paddingTop: 4,
          }}
        >
          {extras.map((extra) => (
            <div key={extra.label} style={{ display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--chart-ink-secondary)' }}>
                {extra.label}
              </span>
              <span
                style={{
                  color: 'var(--chart-ink)',
                  marginLeft: 'auto',
                  paddingLeft: 12,
                }}
              >
                {extra.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
