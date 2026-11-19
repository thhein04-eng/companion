'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDealEditsOptional } from 'shared-data-access';

const RIPPLE_MS = 1500;

/**
 * Briefly highlights a figure whose value changed because of a shared-input edit (spec 010
 * FR-029): the reference `.flash` (warn-soft fill, warn text). It never fires on first render
 * or on a scenario switch, because those don't move the edit counter. Reduced motion keeps the
 * highlight and drops the transition.
 */
export function Ripple({
  value,
  children,
  className,
}: {
  value: number | string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const edits = useDealEditsOptional();
  const seq = edits?.changeSeq ?? 0;
  const last = useRef({ value, seq });
  const [rippling, setRippling] = useState(false);

  useEffect(() => {
    const prev = last.current;
    last.current = { value, seq };
    if (seq !== prev.seq && value !== prev.value) {
      setRippling(true);
      const t = window.setTimeout(() => setRippling(false), RIPPLE_MS);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [value, seq]);

  return (
    <span
      data-rippling={rippling ? 'true' : undefined}
      className={`rounded-xs transition-colors duration-300 motion-reduce:transition-none ${
        rippling ? 'bg-warn-soft text-warn' : ''
      } ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
