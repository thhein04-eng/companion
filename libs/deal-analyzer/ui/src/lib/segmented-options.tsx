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
      className="relative isolate inline-flex rounded-md border border-line bg-sunk p-0.5"
    >
      <SegmentedControlIndicator className="absolute left-[var(--segmented-control-indicator-left)] top-[var(--segmented-control-indicator-top)] -z-10 h-[var(--segmented-control-indicator-height)] w-[var(--segmented-control-indicator-width)] rounded-sm border border-ink bg-ink transition-all duration-200 motion-reduce:transition-none" />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          className="cursor-pointer rounded-sm px-3 py-1 text-[14px] text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[checked]:font-medium data-[checked]:text-ink-fg"
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
