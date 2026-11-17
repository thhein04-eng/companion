'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@ui-sdk/react/popover';

export type RuleStatus = 'pass' | 'fail' | 'na';

export interface RuleIndicatorProps {
  name: '1% Rule' | '50% Rule';
  status: RuleStatus;
  /** e.g. "Rent $2,400 vs. target $2,500". */
  detail: string;
  /** One sentence, shown in the info popover. */
  explanation: string;
}

const statusStyles: Record<RuleStatus, { icon: string; text: string; className: string }> = {
  pass: { icon: '✓', text: 'Pass', className: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  fail: { icon: '✕', text: 'Fail', className: 'bg-red-50 text-red-800 border-red-300' },
  na: { icon: '–', text: 'N/A', className: 'bg-neutral-50 text-neutral-600 border-neutral-300' },
};

function testIdFor(name: string): string {
  return `rule-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

/**
 * A rule-of-thumb check (FR-010, FR-011). Status is conveyed by text and icon,
 * not color alone; the explanation lives in an SDK popover that opens on
 * hover, tap, click, or Enter and is keyboard/screen-reader reachable.
 */
export function RuleIndicator({ name, status, detail, explanation }: RuleIndicatorProps) {
  const style = statusStyles[status];
  return (
    <div
      data-testid={testIdFor(name)}
      className="flex flex-col gap-1 rounded-md border border-neutral-200 bg-white p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-neutral-900">{name}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
          >
            <span aria-hidden="true">{style.icon}</span>
            {style.text}
          </span>
          <Popover openOnHover>
            <PopoverTrigger
              aria-label={`About the ${name}`}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-xs text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              i
            </PopoverTrigger>
            <PopoverContent
              side="top"
              sideOffset={6}
              className="max-w-xs rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 shadow-md"
            >
              {explanation}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-xs text-neutral-600">{detail}</p>
    </div>
  );
}
