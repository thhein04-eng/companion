'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DealFieldKey } from 'shared-calculations';

export type DealSheetMode = 'edit' | 'setup';

export interface DealSheetState {
  open: boolean;
  mode: DealSheetMode;
  /** Scrolled into view and focused when the sheet opens. */
  focusField: DealFieldKey | null;
  /** Bumps on every open, so the same field can be focused again. */
  openSeq: number;
  /** The control that opened the sheet; focus returns to it on close (FR-007). */
  returnFocus: HTMLElement | null;
}

export interface DealSheetApi {
  state: DealSheetState;
  open(opts?: {
    mode?: DealSheetMode;
    focusField?: DealFieldKey;
    returnFocus?: HTMLElement | null;
  }): void;
  close(): void;
}

const DealSheetContext = createContext<DealSheetApi | null>(null);

/**
 * Open / mode / focus state of the one Edit deal sheet, so the strip, missing-input chips and
 * "Fix inputs" buttons anywhere on the page can open it (spec 010 T039).
 */
export function DealSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DealSheetState>({
    open: false,
    mode: 'edit',
    focusField: null,
    openSeq: 0,
    returnFocus: null,
  });
  const open = useCallback<DealSheetApi['open']>((opts) => {
    const active = document.activeElement;
    const returnFocus =
      opts?.returnFocus ??
      (active instanceof HTMLElement && active !== document.body
        ? active
        : null);
    setState((s) => ({
      open: true,
      mode: opts?.mode ?? 'edit',
      focusField: opts?.focusField ?? null,
      openSeq: s.openSeq + 1,
      returnFocus,
    }));
  }, []);
  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);
  const api = useMemo(() => ({ state, open, close }), [state, open, close]);
  return (
    <DealSheetContext.Provider value={api}>
      {children}
    </DealSheetContext.Provider>
  );
}

export function useDealSheet(): DealSheetApi {
  const ctx = useContext(DealSheetContext);
  if (!ctx)
    throw new Error('useDealSheet must be used inside <DealSheetProvider>');
  return ctx;
}

/** Scrolls a sheet field into view and focuses its first input. */
export function focusDealField(field: DealFieldKey) {
  const el = document.querySelector<HTMLElement>(
    `[data-deal-field="${field}"]`,
  );
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  // The text input first: a NumberField's first focusable is its "−" stepper.
  const target =
    el.querySelector<HTMLElement>('input') ??
    el.querySelector<HTMLElement>('button, [tabindex]');
  target?.focus();
  return true;
}
