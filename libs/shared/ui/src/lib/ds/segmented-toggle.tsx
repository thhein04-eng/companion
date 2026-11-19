'use client';

import { Tabs, TabsList, TabsTab } from '@ui-sdk/react/tabs';

export interface SegmentedToggleProps<T extends string> {
  /** The control's accessible name (e.g. "Term unit"). */
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onValueChange: (value: T) => void;
}

/** A small unit toggle (Years / Months, $ / %): the reference `.tab` treatment at 12px. */
export function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: SegmentedToggleProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
    >
      <TabsList aria-label={label} className="flex gap-1 text-[12px]">
        {options.map((o) => (
          <TabsTab
            key={o.value}
            value={o.value}
            className="cursor-pointer rounded-sm border border-transparent px-2 py-0.5 text-muted hover:bg-sunk data-selected:border-ink data-selected:bg-ink data-selected:text-ink-fg"
          >
            {o.label}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}
