'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@ui-sdk/react/popover';
import { GlossaryLink } from './glossary-link';

export type RuleStatus = 'pass' | 'fail' | 'na';

export interface StatusPillProps {
  status: RuleStatus;
  /** Defaults to "Pass" / "Fail" / "N/A". */
  text?: string;
  'data-testid'?: string;
}

/**
 * A pass/fail/N/A pill. Status is conveyed by icon and text, not color alone
 * (shared by the rules of thumb and the DSCR checks, spec 006 R9).
 */
export function StatusPill({
  status,
  text,
  'data-testid': testId,
}: StatusPillProps) {
  const style = statusStyles[status];
  return (
    <span
      data-testid={testId}
      data-status={status}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {text ?? style.text}
    </span>
  );
}

export interface RuleIndicatorProps {
  name: string;
  status: RuleStatus;
  /** e.g. "Rent $2,400 vs. target $2,500". */
  detail: string;
  /** One sentence, shown in the info popover. */
  explanation: string;
  /** Glossary entry id; adds a "Full definition" link (spec 015). */
  glossaryId?: string;
}

const statusStyles: Record<
  RuleStatus,
  { icon: string; text: string; className: string }
> = {
  pass: {
    icon: '✓',
    text: 'Pass',
    className: 'bg-good-soft text-good border-good',
  },
  fail: {
    icon: '✕',
    text: 'Fail',
    className: 'bg-bad-soft text-bad border-bad',
  },
  na: {
    icon: '–',
    text: 'N/A',
    className: 'bg-sunk text-muted border-line',
  },
};

function testIdFor(name: string): string {
  return `rule-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

/**
 * A rule-of-thumb check (FR-010, FR-011). Status is conveyed by text and icon,
 * not color alone; the explanation lives in an SDK popover that opens on
 * hover, tap, click, or Enter and is keyboard/screen-reader reachable.
 */
export function RuleIndicator({
  name,
  status,
  detail,
  explanation,
  glossaryId,
}: RuleIndicatorProps) {
  return (
    <div
      data-testid={testIdFor(name)}
      className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-3.5 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-fg">{name}</span>
        <div className="flex items-center gap-1.5">
          <StatusPill status={status} />
          <Popover openOnHover>
            <PopoverTrigger
              aria-label={`About the ${name}`}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-muted hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              i
            </PopoverTrigger>
            <PopoverContent
              side="top"
              sideOffset={6}
              className="max-w-xs rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg shadow-float"
            >
              {explanation}
              {glossaryId ? <GlossaryLink id={glossaryId} /> : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}
