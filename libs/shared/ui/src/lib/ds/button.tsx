'use client';

import { forwardRef, type ComponentProps } from 'react';
import { Button as SdkButton } from '@ui-sdk/react/button';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'icon' | 'danger';
export type ButtonSize = 'sm' | 'md';

const variants: Record<ButtonVariant, string> = {
  default:
    'border border-line bg-surface text-fg hover:border-faint hover:bg-sunk',
  primary: 'border border-ink bg-ink text-ink-fg hover:opacity-90',
  ghost:
    'border border-transparent bg-transparent text-muted hover:bg-sunk hover:text-fg',
  icon: 'border border-transparent bg-transparent text-muted hover:bg-sunk hover:text-fg',
  danger: 'border border-transparent bg-transparent text-bad hover:bg-bad-soft',
};
const sizes: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[13px]',
  md: 'px-3 py-1.5 text-[14px]',
};

export type ButtonProps = ComponentProps<typeof SdkButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** The reference `.btn` / `.btn.primary` (contracts/design-system.md §4), on ui-sdk Button. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'default', size = 'md', className, ...props },
    ref,
  ) {
    const shape = variant === 'icon' ? 'p-2 text-[14px]' : sizes[size];
    return (
      <SdkButton
        ref={ref}
        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 ${variants[variant]} ${shape} ${className ?? ''}`}
        {...props}
      />
    );
  },
);
