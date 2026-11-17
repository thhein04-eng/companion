'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Measures an element's content width with `ResizeObserver`. Returns `null` until the first
 * measurement (and during SSR), so callers can render a same-height placeholder.
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>(): [(node: T | null) => void, number | null] {
  const [width, setWidth] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.round(entry.contentRect.width);
      setWidth((prev) => (prev === next ? prev : next));
    });
    ro.observe(node);
    observer.current = ro;
  }, []);

  useEffect(() => () => observer.current?.disconnect(), []);

  return [ref, width];
}
