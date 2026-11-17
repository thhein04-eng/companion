'use client';

import { colorVar, type ColorToken } from './types';

export interface LegendItem {
  label: string;
  color: ColorToken;
  emphasis?: 'primary' | 'context';
}

/** One wrapping row of swatch + label. Labels use secondary ink, never the series color. */
export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul aria-label="Legend" className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-xs">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5" style={{ color: 'var(--chart-ink-secondary)' }}>
          <span
            aria-hidden="true"
            data-swatch=""
            style={{
              display: 'inline-block',
              width: 10,
              height: item.emphasis === 'context' ? 2 : 10,
              borderRadius: item.emphasis === 'context' ? 1 : 2,
              backgroundColor: colorVar(item.color),
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
