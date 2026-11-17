'use client';

import type { ReactNode } from 'react';
import { useElementWidth } from './use-element-width';

export interface ChartFrameProps {
  title: string;
  description?: string;
  legend?: ReactNode;
  /** Plot height in px. */
  height: number;
  dataTable?: ReactNode;
  className?: string;
  'data-testid'?: string;
  /** Renders the plot once the container width is known. */
  children: (width: number) => ReactNode;
}

/**
 * Title, description, legend, a measured plot area and the data-table toggle. Before the first
 * measurement it reserves the plot's height, so there is no layout shift.
 */
export function ChartFrame({
  title,
  description,
  legend,
  height,
  dataTable,
  className,
  'data-testid': testId,
  children,
}: ChartFrameProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  return (
    <figure
      data-testid={testId}
      className={`chart-root m-0 flex min-w-0 flex-col gap-2 rounded-md p-3 ${className ?? ''}`}
      style={{ boxShadow: '0 0 0 1px var(--chart-border)' }}
    >
      <div className="flex flex-col gap-0.5">
        <h3
          className="m-0 text-sm font-medium"
          style={{ color: 'var(--chart-ink)' }}
        >
          {title}
        </h3>
        {description ? (
          <p
            className="m-0 text-xs"
            style={{ color: 'var(--chart-ink-secondary)' }}
          >
            {description}
          </p>
        ) : null}
      </div>
      {legend}
      <div ref={ref} className="relative w-full min-w-0" style={{ height }}>
        {width != null && width > 0 ? children(width) : null}
      </div>
      {dataTable}
    </figure>
  );
}
