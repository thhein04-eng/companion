'use client';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@ui-sdk/react/field';
import { DateInput } from '@ui-sdk/react/date-input';
import {
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
} from '@ui-sdk/react/date-picker';
import { CalendarIcon } from './icons';

export interface DateFieldProps {
  label: string;
  value: string | null;
  onValueChange: (value: string | null) => void;
  description?: string;
  error?: string;
}

const stepClass =
  'flex size-8 cursor-pointer items-center justify-center rounded-sm text-muted hover:bg-sunk hover:text-fg focus-visible:outline-2 focus-visible:outline-accent data-[disabled]:cursor-not-allowed data-[disabled]:text-muted';

/**
 * A labeled date field: `@ui-sdk/react`'s segmented Date Input for typing (an unambiguous ISO
 * value, spec 001 FR-013) plus a calendar popup from its Date Picker (spec 011 US4, R5). Both
 * control the same ISO value; the calendar's keyboard handling (arrows, Page Up/Down, Home/End,
 * Enter, Escape returning focus) comes from the SDK (Constitution IV).
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
      <DatePicker
        value={value}
        onValueChange={(next) => {
          if (typeof next === 'string' || next === null) onValueChange(next);
        }}
        className="num flex h-[var(--control-h)] items-center rounded-sm border border-line bg-surface pl-3 pr-1 text-[15px] text-fg focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent has-[[data-invalid]]:border-bad has-[[data-invalid]]:bg-bad-soft"
      >
        <DateInput
          value={value}
          onValueChange={(next) => onValueChange(next)}
          className="flex flex-1 items-center gap-0.5 py-2 outline-none"
        />
        <DatePickerTrigger
          aria-label={`Choose date for ${label}`}
          className="flex size-8 cursor-pointer items-center justify-center rounded-xs text-muted hover:bg-sunk hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          <CalendarIcon className="size-[18px]" />
        </DatePickerTrigger>
        <DatePickerContent
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          data-testid="date-calendar"
          className="z-[70] flex flex-col gap-2 rounded-lg border border-line bg-surface p-3.5 text-fg shadow-float"
        >
          <div className="flex items-center justify-between gap-2">
            <CalendarPrevious aria-label="Previous month" className={stepClass}>
              ‹
            </CalendarPrevious>
            <CalendarHeading className="m-0 font-display text-[15px] font-semibold" />
            <CalendarNext aria-label="Next month" className={stepClass}>
              ›
            </CalendarNext>
          </div>
          <CalendarGrid className="border-collapse">
            <CalendarWeekdays>
              {(index) => (
                <CalendarWeekday
                  index={index}
                  className="size-9 text-center text-[12px] font-medium text-muted"
                />
              )}
            </CalendarWeekdays>
            <CalendarWeeks>
              {(cell) => (
                <CalendarDay
                  value={cell.date}
                  className="num size-9 cursor-pointer rounded-sm text-center text-[14px] text-fg hover:bg-sunk focus-visible:outline-2 focus-visible:outline-accent data-[disabled]:cursor-not-allowed data-[outside]:text-muted data-[today]:font-semibold data-[today]:outline data-[today]:outline-1 data-[today]:outline-accent data-[selected]:bg-ink data-[selected]:text-ink-fg"
                />
              )}
            </CalendarWeeks>
          </CalendarGrid>
        </DatePickerContent>
      </DatePicker>
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
