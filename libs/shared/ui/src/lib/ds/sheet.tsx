'use client';

import type { ReactNode } from 'react';
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerTitle,
} from '@ui-sdk/react/drawer';
import { DESKTOP_QUERY, useMediaQuery } from './use-media-query';

export interface SheetProps {
  open: boolean;
  /** `reason` is ui-sdk's close reason (escape, outside press, close press, …). */
  onOpenChange: (open: boolean, reason?: string) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Right of the title (e.g. a Done button). */
  headerActions?: ReactNode;
  footer?: ReactNode;
  /** Where focus goes when the sheet closes (default: the element focused before it opened). */
  finalFocus?: () => HTMLElement | null | undefined;
  /** What gets focus when the sheet opens (default: ui-sdk's first focusable). */
  initialFocus?: () => HTMLElement | null | undefined;
  children: ReactNode;
  'data-testid'?: string;
}

/**
 * The reference `.sheet`: from the right at `lg` and up, from the bottom below it, on ui-sdk
 * Drawer (focus trap, Escape, outside press and focus return come from the SDK).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  footer,
  finalFocus,
  initialFocus,
  children,
  'data-testid': testId,
}: SheetProps) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const side = desktop ? 'right' : 'bottom';
  return (
    <Drawer
      side={side}
      open={open}
      onOpenChange={(next, details) =>
        onOpenChange(next, (details as { reason?: string } | undefined)?.reason)
      }
    >
      <DrawerBackdrop className="fixed inset-0 z-40 bg-fg/25" />
      <DrawerContent
        data-testid={testId}
        finalFocus={finalFocus}
        initialFocus={initialFocus}
        className={
          side === 'right'
            ? 'z-50 flex h-full w-[min(440px,92vw)] flex-col border-l border-line bg-surface shadow-float transition-transform duration-[250ms] motion-reduce:transition-none'
            : 'z-50 flex max-h-[88vh] w-full flex-col rounded-t-xl border-t border-line bg-surface shadow-float'
        }
      >
        {side === 'bottom' ? (
          <DrawerHandle
            aria-label="Drag to resize"
            className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line"
          />
        ) : null}
        <div className="flex items-start justify-between gap-3 border-b border-line px-[var(--space-card)] py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <DrawerTitle className="m-0 font-display text-h3 font-semibold text-fg">
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription className="m-0 text-small text-muted">
                {description}
              </DrawerDescription>
            ) : null}
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          ) : null}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-[var(--space-card)] overflow-y-auto px-[var(--space-card)] py-[var(--space-card)]">
          {children}
        </div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-line px-[var(--space-card)] py-3.5">
            {footer}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
