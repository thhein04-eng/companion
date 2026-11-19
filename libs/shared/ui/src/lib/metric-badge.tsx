import type { ReactNode } from 'react';
import { Ripple } from './ds/ripple';

export type MetricBadgeTone = 'neutral' | 'positive' | 'negative';

export interface MetricBadgeProps {
  /** e.g. "LTV" or "Cash-on-Cash". Also drives `data-testid="badge-<kebab label>"`. */
  label: string;
  /** Unrounded fraction (0.0376 → 3.8%); `null` renders "N/A". */
  value: number | null;
  fractionDigits?: number;
  /** Why the value is not applicable; shown as a tooltip title and screen-reader text. */
  naReason?: string | null;
  tone?: MetricBadgeTone;
}

function kebab(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const toneClasses: Record<MetricBadgeTone, string> = {
  neutral: 'border-line bg-sunk text-fg',
  positive: 'border-transparent bg-good-soft text-good',
  negative: 'border-transparent bg-bad-soft text-bad',
};

/**
 * A compact, non-interactive metric pill (FR-013). The negative state adds a
 * visible "Negative" label so it never relies on color alone.
 */
export function MetricBadge({
  label,
  value,
  fractionDigits = 1,
  naReason,
  tone = 'neutral',
}: MetricBadgeProps) {
  const isNa = value == null;
  const formatted = isNa
    ? 'N/A'
    : new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(value);
  const effectiveTone = isNa ? 'neutral' : tone;

  return (
    <span
      data-testid={`badge-${kebab(label)}`}
      title={isNa && naReason ? naReason : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] ${toneClasses[effectiveTone]}`}
    >
      <span className="font-medium">{label}</span>
      <Ripple value={value}>
        <span className="num font-semibold">{formatted}</span>
      </Ripple>
      {effectiveTone === 'negative' ? (
        <span className="text-[12px] font-semibold">▼ Negative</span>
      ) : null}
      {isNa && naReason ? <span className="sr-only">{naReason}</span> : null}
    </span>
  );
}

/** Groups badges and politely announces real-time changes to screen readers. */
export function MetricBadgeGroup({ children }: { children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label="Key deal metrics"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2"
    >
      {children}
    </div>
  );
}
