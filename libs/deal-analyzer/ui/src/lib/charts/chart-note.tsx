'use client';

export interface ChartNoteProps {
  title: string;
  message: string;
  'data-testid'?: string;
}

/**
 * Stands in for a chart that can't be drawn (for example, no purchase price), keeping the chart's
 * title so the layout stays stable and screen readers hear why the chart is missing.
 */
export function ChartNote({
  title,
  message,
  'data-testid': testId,
}: ChartNoteProps) {
  return (
    <figure
      data-testid={testId}
      className="chart-root m-0 flex flex-col gap-1 rounded-md p-3"
      style={{ boxShadow: '0 0 0 1px var(--chart-border)' }}
    >
      <h3
        className="m-0 text-sm font-medium"
        style={{ color: 'var(--chart-ink)' }}
      >
        {title}
      </h3>
      <p
        className="m-0 text-xs"
        style={{ color: 'var(--chart-ink-secondary)' }}
      >
        {message}
      </p>
    </figure>
  );
}
