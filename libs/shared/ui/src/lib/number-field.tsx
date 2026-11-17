'use client';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@ui-sdk/react/field';
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
} from '@ui-sdk/react/number-input';

export interface NumberFieldProps {
  /** Also used as the field's accessible name, even when visually hidden. */
  label: string;
  value: number | null;
  onValueChange: (value: number | null) => void;
  variant?: 'currency' | 'plain';
  /** Text shown after the control, e.g. "%" for a rate field. */
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  error?: string;
  /** Hide the label visually (e.g. when a sibling heading already shows it),
   * while keeping `label` as the field's accessible name for screen readers
   * and automated tests. */
  visuallyHiddenLabel?: boolean;
}

/**
 * A labeled, validated number field built on `@ui-sdk/react`'s Number Input
 * behavior. Currency fields use `Intl.NumberFormat`; plain fields (e.g. a
 * percentage rate) keep the raw number and show `suffix` as a label.
 */
export function NumberField({
  label,
  value,
  onValueChange,
  variant = 'plain',
  suffix,
  min,
  max,
  step,
  description,
  error,
  visuallyHiddenLabel,
}: NumberFieldProps) {
  return (
    <Field invalid={error ? true : undefined} className="flex flex-col gap-1">
      <FieldLabel
        className={
          visuallyHiddenLabel
            ? 'sr-only'
            : 'text-sm font-medium text-neutral-700'
        }
      >
        {label}
      </FieldLabel>
      <NumberInput
        value={value}
        onValueChange={(next) => onValueChange(next)}
        min={min}
        max={max}
        step={step}
        format={
          variant === 'currency'
            ? { style: 'currency', currency: 'USD' }
            : undefined
        }
      >
        <NumberInputGroup className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-1 focus-within:ring-2 focus-within:ring-neutral-400 data-[invalid]:border-red-500">
          <NumberInputDecrement
            aria-label={`Decrease ${label}`}
            className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 data-[disabled]:opacity-40"
          >
            −
          </NumberInputDecrement>
          <NumberInputControl className="w-full flex-1 bg-transparent px-1 py-1.5 text-sm outline-none" />
          {suffix ? (
            <span className="pr-1 text-sm text-neutral-500">{suffix}</span>
          ) : null}
          <NumberInputIncrement
            aria-label={`Increase ${label}`}
            className="rounded px-2 py-1 text-neutral-500 hover:bg-neutral-100 data-[disabled]:opacity-40"
          >
            +
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
      {description ? (
        <FieldDescription className="text-xs text-neutral-500">
          {description}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError match className="text-xs text-red-600">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
