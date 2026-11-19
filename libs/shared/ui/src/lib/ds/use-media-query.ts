'use client';

import { useSyncExternalStore } from 'react';

/** Subscribes to a media query; `false` on the server and until hydration. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `lg`, the same breakpoint `AppShell` docks its nav at. */
export const DESKTOP_QUERY = '(min-width: 1024px)';
