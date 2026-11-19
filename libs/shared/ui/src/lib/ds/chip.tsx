'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ChipTone =
  'default' | 'pin' | 'err' | 'total' | 'missing' | 'muted';

const tones: Record<ChipTone, string> = {
  default: 'border-line bg-sunk text-fg hover:border-faint',
  pin: 'border-transparent bg-accent-soft text-accent hover:border-accent',
  err: 'border-transparent bg-bad-soft text-bad hover:border-bad',
  total: 'border-ink bg-ink text-ink-fg hover:opacity-90',
  missing:
    'border-dashed border-faint bg-transparent text-muted hover:border-accent hover:text-fg',
  // FR-035: de-emphasis via color, never opacity.
  muted: 'border-line bg-transparent text-muted hover:border-faint',
};

export interface ChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'value'
> {
  tone?: ChipTone;
  /** The field name, regular weight ("Rate"). */
  label?: ReactNode;
  /** The value, semibold with tabular numerals ("6.5%"). */
  value?: ReactNode;
}

/** A pill-shaped chip: the reference `.chip`, `.chip.pin`, `.chip.err`, `.chip.total` (§4). */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  {
    tone = 'default',
    label,
    value,
    children,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-tone={tone}
      className={`inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border px-[11px] py-1 text-[13px] leading-tight transition-colors ${tones[tone]} ${className ?? ''}`}
      {...props}
    >
      {label != null ? <span>{label}</span> : null}
      {value != null ? <b className="num font-semibold">{value}</b> : null}
      {children}
    </button>
  );
});
