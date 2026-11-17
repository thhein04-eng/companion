'use client';

import { useCallback, useEffect, useState } from 'react';

/** `localStorage` key for the docked menu's collapsed/expanded choice (spec 003 R7). */
export const NAV_PREFERENCE_KEY = 'companion:nav';

function readCollapsed(): boolean {
  try {
    const raw = window.localStorage.getItem(NAV_PREFERENCE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { collapsed?: unknown }).collapsed === true
    );
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(
      NAV_PREFERENCE_KEY,
      JSON.stringify({ collapsed }),
    );
  } catch {
    /* storage unavailable: the choice lasts for this page only */
  }
}

/**
 * The per-device docked-menu preference. A UI convenience, not financial data,
 * so it lives in `localStorage` (spec 003 Assumptions). The server always
 * renders expanded; the stored choice is applied after mount to avoid a
 * hydration mismatch.
 */
export function useNavPreference() {
  const [collapsed, setCollapsedState] = useState(false);

  useEffect(() => {
    setCollapsedState(readCollapsed());
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    writeCollapsed(next);
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((current) => {
      const next = !current;
      writeCollapsed(next);
      return next;
    });
  }, []);

  return { collapsed, setCollapsed, toggle };
}
