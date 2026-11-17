'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';

/**
 * Active-index state for keyboard stepping through a plot's data points.
 * ←/→ ±1, Shift+←/→ ±12, Home/End to the ends, Esc clears.
 * (Custom by design: `@ui-sdk/react` has no data-point navigation primitive. See plan.md
 * Complexity Tracking.)
 */
export function usePlotKeyboard(count: number) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex((i) => (i == null ? i : count === 0 ? null : Math.min(i, count - 1)));
  }, [count]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (count === 0) return;
      const last = count - 1;
      const move = (delta: number) =>
        setActiveIndex((i) => (i == null ? 0 : Math.max(0, Math.min(last, i + delta))));
      switch (event.key) {
        case 'ArrowRight':
          move(event.shiftKey ? 12 : 1);
          break;
        case 'ArrowLeft':
          move(event.shiftKey ? -12 : -1);
          break;
        case 'Home':
          setActiveIndex(0);
          break;
        case 'End':
          setActiveIndex(last);
          break;
        case 'Escape':
          setActiveIndex(null);
          break;
        default:
          return;
      }
      event.preventDefault();
    },
    [count]
  );

  const onBlur = useCallback(() => setActiveIndex(null), []);

  return { activeIndex, setActiveIndex, onKeyDown, onBlur };
}
