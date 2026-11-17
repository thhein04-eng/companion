'use client';

import { Field, FieldDescription, FieldError, FieldLabel } from '@ui-sdk/react/field';
import { DateInput } from '@ui-sdk/react/date-input';

export interface DateFieldProps {
  label: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  description?: string;
  error?: string;
}

/**
 * A labeled date field built on `@ui-sdk/react`'s segmented Date Input,
 * which keeps an unambiguous ISO date value (e.g. "2027-01-01") and never
 * leaves the unit of a loan term or date ambiguous (Edge Cases, FR-013).
 */
export function DateField({ label, value, onValueChange, description, error }: DateFieldProps) {
  return (
    <Field invalid={error ? true : undefined} className="flex flex-col gap-1">
      <FieldLabel className="text-sm font-medium text-neutral-700">{label}</FieldLabel>
      <DateInput
        value={value}
        onValueChange={(next) => onValueChange(next)}
        className="flex items-center gap-0.5 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-neutral-400 data-[invalid]:border-red-500"
      />
      {description ? (
        <FieldDescription className="text-xs text-neutral-500">{description}</FieldDescription>
      ) : null}
      {error ? (
        <FieldError match className="text-xs text-red-600">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
