'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { ChipTone } from '../ds/chip';

export interface DealValueProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  label: string;
  /** Formatted value; `null` reads "Add" (a missing input). */
  value: string | null;
  tone?: ChipTone;
}

const valueTone: Record<ChipTone, string> = {
  default: 'text-fg',
  pin: 'text-accent',
  err: 'text-bad',
  muted: 'text-muted',
  total: 'text-fg',
  missing: 'text-accent',
};

/**
 * One labeled value in the deal card's grid (spec 011 FR-003a): a muted label over a bold value,
 * as a button that opens the field's editor. Relevance and errors show by color plus text.
 */
export const DealValue = forwardRef<HTMLButtonElement, DealValueProps>(
  function DealValue(
    { label, value, tone = 'default', className, type = 'button', ...props },
    ref,
  ) {
    const isTotal = tone === 'total';
    const shown = value ?? 'Add';
    return (
      <button
        ref={ref}
        type={type}
        data-tone={tone}
        data-empty={value == null ? '' : undefined}
        className={`group flex min-w-0 cursor-pointer rounded-md text-left transition-colors hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
          isTotal
            ? 'items-baseline gap-3 px-2.5 py-2'
            : 'flex-col items-start gap-0.5 px-2 py-1.5 sm:px-2.5 sm:py-2'
        } ${className ?? ''}`}
        {...props}
      >
        <span className="truncate text-[12px] font-medium text-muted sm:text-[12.5px]">
          {isTotal ? 'Monthly payment' : label}
        </span>
        <span
          className={`num truncate font-display font-semibold leading-tight ${
            isTotal
              ? 'text-[18px] sm:text-[20px]'
              : 'text-[15px] sm:text-[17px]'
          } ${valueTone[value == null && tone !== 'err' ? 'missing' : tone]}`}
        >
          {shown}
          {tone === 'err' ? (
            <span className="ml-1 font-body text-[12px] font-semibold">
              · invalid
            </span>
          ) : null}
        </span>
      </button>
    );
  },
);
