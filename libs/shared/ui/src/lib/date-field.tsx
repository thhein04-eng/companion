'use client';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@ui-sdk/react/field';
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
export function DateField({
  label,
  value,
  onValueChange,
  description,
  error,
}: DateFieldProps) {
  return (
    <Field invalid={error ? true : undefined} className="flex flex-col gap-1.5">
      <FieldLabel className="text-label font-medium text-muted">
        {label}
      </FieldLabel>
      <DateInput
        value={value}
        onValueChange={(next) => onValueChange(next)}
        className="num flex items-center gap-0.5 rounded-sm border border-line bg-surface px-3 py-2 text-[15px] text-fg focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent data-[invalid]:border-bad data-[invalid]:bg-bad-soft"
      />
      {description ? (
        <FieldDescription className="text-[12.5px] text-muted">
          {description}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError match className="text-[12.5px] font-medium text-bad">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
