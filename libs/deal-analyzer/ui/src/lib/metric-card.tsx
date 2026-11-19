'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@ui-sdk/react/popover';
import { Ripple } from 'shared-ui';
import { StatusPill, type RuleStatus } from './rule-indicator';

export interface MetricCardProps {
  label: string;
  /** One sentence for the info popover. */
  info: string;
  /** Formatted headline value, or "N/A". */
  value: string;
  status: RuleStatus | 'info';
  /** Overrides the pill text ("Pass" / "Fail" / "N/A" / "Info"). */
  statusText?: string;
  /** The comparison in words, or the N/A reason. */
  explanation: string;
  /** Raw value for the change highlight (spec 010 FR-029). */
  rippleValue?: number | null;
  'data-testid': string;
}

/**
 * One metric card anatomy for Cap rate and the rules of thumb (spec 011 FR-010): label and info
 * button, headline value, status pill, explanation. Equal height in its row.
 */
export function MetricCard({
  label,
  info,
  value,
  status,
  statusText,
  explanation,
  rippleValue,
  'data-testid': testId,
}: MetricCardProps) {
  return (
    <div
      data-testid={testId}
      className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-[18px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-medium text-fg">{label}</span>
        <Popover openOnHover>
          <PopoverTrigger
            aria-label={`About the ${label}`}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line text-[12px] text-muted hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            i
          </PopoverTrigger>
          <PopoverContent
            side="top"
            sideOffset={6}
            className="z-30 max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-fg shadow-float"
          >
            {info}
          </PopoverContent>
        </Popover>
      </div>
      <strong className="num font-display text-[24px] font-semibold leading-tight text-fg">
        <Ripple value={rippleValue ?? value}>{value}</Ripple>
      </strong>
      <div>
        {status === 'info' ? (
          <span
            data-status="info"
            className="inline-flex items-center gap-1 rounded-full border border-line bg-sunk px-2 py-0.5 text-[12px] font-medium text-muted"
          >
            <span aria-hidden="true">ⓘ</span>
            {statusText ?? 'Info'}
          </span>
        ) : (
          <StatusPill status={status} text={statusText} />
        )}
      </div>
      <p className="m-0 text-small text-muted">{explanation}</p>
    </div>
  );
}
