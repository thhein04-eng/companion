'use client';

import { useState } from 'react';
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@ui-sdk/react/collapsible';

export interface ChartDataColumn {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

export interface ChartDataTableProps {
  caption: string;
  columns: ChartDataColumn[];
  rows: Record<string, unknown>[];
}

/**
 * The accessible table alternative to a chart (FR-005), behind a "Show data" toggle built on
 * `@ui-sdk/react`'s Collapsible. The table is only rendered while open.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: ChartDataTableProps) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => setOpen(next)}
      className="text-small"
    >
      <CollapsibleTrigger
        className="rounded px-1 py-0.5 underline-offset-2 hover:underline text-accent focus-visible:outline-2 focus-visible:outline-accent"
        style={{ color: 'var(--chart-ink-secondary)' }}
      >
        {open ? 'Hide data' : 'Show data'}
      </CollapsibleTrigger>
      <CollapsiblePanel>
        {open ? (
          <div className="mt-2 max-h-64 overflow-auto">
            <table
              className="w-full border-collapse"
              style={{ color: 'var(--chart-ink)' }}
            >
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`sticky top-0 border-b border-line bg-surface px-2.5 py-2 text-[13px] font-medium text-muted ${i === 0 ? 'text-left' : 'text-right'}`}
                      style={{
                        background: 'var(--chart-surface)',
                        color: 'var(--chart-ink-secondary)',
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr
                    key={r}
                    style={{ borderTop: '1px solid var(--chart-grid)' }}
                  >
                    {columns.map((col, i) => {
                      const value = row[col.key];
                      const text =
                        value == null
                          ? '—'
                          : col.format
                            ? col.format(value)
                            : String(value);
                      return (
                        <td
                          key={col.key}
                          className={`border-b border-line px-2.5 py-1.5 ${i === 0 ? 'text-left' : 'text-right'}`}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CollapsiblePanel>
    </Collapsible>
  );
}
