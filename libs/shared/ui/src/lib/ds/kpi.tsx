import type { ReactNode } from 'react';
import { Ripple } from './ripple';

export type KpiTone = 'neutral' | 'good' | 'bad' | 'warn';

const toneText: Record<KpiTone, string> = {
  neutral: 'text-fg',
  good: 'text-good',
  bad: 'text-bad',
  warn: 'text-fg',
};

/** A metric tile: the reference `.kpi` / `.fact` (small muted label, display-face value). */
export function Kpi({
  label,
  value,
  hint,
  tone = 'neutral',
  'data-testid': testId,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: KpiTone;
  'data-testid'?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3"
    >
      <span className="text-[12.5px] font-medium text-muted">{label}</span>
      <strong
        className={`num font-display text-[20px] font-semibold leading-tight ${toneText[tone]}`}
      >
        <Ripple
          value={
            typeof value === 'string' || typeof value === 'number'
              ? value
              : null
          }
        >
          {value}
        </Ripple>
      </strong>
      {hint ? <span className="text-[12.5px] text-muted">{hint}</span> : null}
    </div>
  );
}

/** A responsive row of `Kpi` tiles (1 → 3 columns, 14px gaps). */
export function KpiRow({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
    >
      {children}
    </div>
  );
}
