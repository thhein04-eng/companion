'use client';

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastRegion as SdkToastRegion,
  ToastTitle,
  toast,
} from '@ui-sdk/react/toast';

export interface ShowToastOptions {
  /** Reusing an id updates the toast still showing instead of adding one (coalescing). */
  id?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** ms; default 6000 (spec FR-030). */
  duration?: number;
  onDismiss?: () => void;
}

/** Shows (or updates) a polite toast with an optional action, like Undo. Returns its id. */
export function showToast({
  id,
  title,
  actionLabel,
  onAction,
  duration = 6000,
  onDismiss,
}: ShowToastOptions): string {
  return toast({
    id,
    title,
    duration,
    priority: 'polite',
    action: actionLabel
      ? { label: actionLabel, onAction: () => onAction?.() }
      : undefined,
    onDismiss: () => onDismiss?.(),
  });
}

export function dismissToast(id: string) {
  toast.dismiss(id);
}

/** The app's one toast region, bottom center (rendered once in AppShell). Copies `.toast`. */
export function ToastRegion() {
  return (
    <SdkToastRegion
      side="bottom"
      align="center"
      maxVisible={3}
      aria-label="Notifications"
      // `inset-x-0` spans the viewport and flex centers the toast, so drop the SDK's
      // `align="center"` positioning (`left: 50%; translate: -50%`): its translate alone, with
      // our `left: 0`, pushed half the toast off the left edge.
      className="pointer-events-none fixed inset-x-0 [translate:none] bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4"
    >
      {(t) => (
        <Toast
          key={t.id}
          className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-md bg-ink px-4 py-2.5 text-[14px] text-ink-fg shadow-float"
        >
          <ToastTitle className="num">{t.title}</ToastTitle>
          {t.action ? (
            <ToastAction className="cursor-pointer rounded-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-fg">
              {t.action.label}
            </ToastAction>
          ) : null}
          <ToastClose
            aria-label="Dismiss"
            className="cursor-pointer rounded-xs px-1 opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ink-fg"
          >
            ×
          </ToastClose>
        </Toast>
      )}
    </SdkToastRegion>
  );
}
