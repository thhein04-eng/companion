'use client';

import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';

export interface SegmentedOptionsProps<T extends string> {
  /** The control's accessible name. */
  label: string;
  /** The checked value, or `null` to check nothing (e.g. a custom value). */
  value: T | null;
  options: readonly { value: T; label: string }[];
  onValueChange: (value: T) => void;
  'data-testid'?: string;
}

/**
 * A styled `@ui-sdk/react` segmented control: one tab stop, arrow keys move
 * the choice, radio semantics (constitution Principle IV).
 */
export function SegmentedOptions<T extends string>({
  label,
  value,
  options,
  onValueChange,
  'data-testid': testId,
}: SegmentedOptionsProps<T>) {
  return (
    <SegmentedControl
      aria-label={label}
      data-testid={testId}
      value={value}
      onValueChange={(next) => {
        if (next != null) onValueChange(next as T);
      }}
      className="relative isolate inline-flex rounded-md border border-neutral-300 bg-neutral-100 p-0.5"
    >
      <SegmentedControlIndicator className="absolute left-[var(--segmented-control-indicator-left)] top-[var(--segmented-control-indicator-top)] -z-10 h-[var(--segmented-control-indicator-height)] w-[var(--segmented-control-indicator-width)] rounded bg-white shadow-sm transition-all duration-200" />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          className="rounded px-3 py-1 text-sm text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 data-[checked]:font-medium data-[checked]:text-neutral-900"
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
