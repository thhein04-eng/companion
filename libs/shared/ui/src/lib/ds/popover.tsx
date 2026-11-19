'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  Popover as SdkPopover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from '@ui-sdk/react/popover';

export interface PopoverProps {
  /** Rendered as the trigger element (e.g. a `Chip`). */
  trigger: ReactElement<Record<string, unknown>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The popover's accessible title (visually hidden). */
  label: string;
  children: ReactNode;
  'data-testid'?: string;
}

/** The reference `.pop`: surface, hairline, 8px radius, floating shadow, 260px, flips at edges. */
export function Popover({
  trigger,
  open,
  onOpenChange,
  label,
  children,
  'data-testid': testId,
}: PopoverProps) {
  return (
    <SdkPopover open={open} onOpenChange={(next) => onOpenChange?.(next)}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        data-testid={testId}
        className="z-30 flex w-[260px] max-w-[calc(100vw-24px)] flex-col gap-2 rounded-lg border border-line bg-surface p-3.5 text-fg shadow-float"
      >
        <PopoverTitle className="sr-only">{label}</PopoverTitle>
        {children}
      </PopoverContent>
    </SdkPopover>
  );
}
