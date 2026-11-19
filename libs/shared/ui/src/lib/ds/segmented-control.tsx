'use client';

import { useId } from 'react';
import {
  SegmentedControl as SdkSegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';

export interface SegmentedControlProps<T extends string> {
  /** The control's accessible name, and its visible label when `showLabel`. */
  label: string;
  /** Show `label` above the control, like a field label (spec 011 FR-005). */
  showLabel?: boolean;
  /** The checked value, or `null` to check nothing (e.g. a custom value). */
  value: T | null;
  options: readonly { value: T; label: string }[];
  onValueChange: (value: T) => void;
  'data-testid'?: string;
}

/**
 * The app's standard segmented control (moved from deal-analyzer-ui in spec 011 R3): one tab
 * stop, arrow keys move the choice, radio semantics (Constitution IV), ink indicator.
 */
export function SegmentedControl<T extends string>({
  label,
  showLabel = false,
  value,
  options,
  onValueChange,
  'data-testid': testId,
}: SegmentedControlProps<T>) {
  const labelId = useId();
  const control = (
    <SdkSegmentedControl
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
      data-testid={testId}
      value={value}
      onValueChange={(next) => {
        if (next != null) onValueChange(next as T);
      }}
      className="relative isolate inline-flex self-start rounded-md border border-line bg-sunk p-0.5"
    >
      <SegmentedControlIndicator className="absolute left-[var(--segmented-control-indicator-left)] top-[var(--segmented-control-indicator-top)] -z-10 h-[var(--segmented-control-indicator-height)] w-[var(--segmented-control-indicator-width)] rounded-sm border border-ink bg-ink transition-all duration-200 motion-reduce:transition-none" />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          className="cursor-pointer rounded-sm px-3 py-1.5 text-[14px] text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent data-[checked]:font-medium data-[checked]:text-ink-fg"
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SdkSegmentedControl>
  );
  if (!showLabel) return control;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-label font-medium text-muted">
        {label}
      </span>
      {control}
    </div>
  );
}
