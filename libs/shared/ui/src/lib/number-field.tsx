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
  NumberInputScrubArea,
  NumberInputScrubAreaCursor,
} from '@ui-sdk/react/number-input';
import { DEAL_FIELD_STEPS, type DealFieldKey } from 'shared-calculations';
import { useDealEditsOptional } from 'shared-data-access';

/**
 * Drag-to-adjust (spec 010 US5), built on ui-sdk `NumberInputScrubArea`: 8px of drag per step,
 * the field's data-model §A step on arrow keys, ×10 with Shift. A scrub writes through
 * `editDeal(field, …, 'scrub')`, so one gesture is one undoable change (R7).
 */
export interface NumberFieldScrub {
  field: DealFieldKey;
  /** The field is stored in months but shown in years (term): steps and values convert. */
  unitMonths?: number;
  /** Overrides the data-model step (e.g. a down payment's 1 point vs $1,000). */
  step?: number;
  /** Maps the shown number to the stored value (e.g. `{ percent: n }`). */
  toValue?: (n: number) => unknown;
}

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
  scrub?: NumberFieldScrub;
}

const stepperClass =
  'cursor-pointer rounded-xs px-2 py-1 text-muted hover:bg-sunk hover:text-fg data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';

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
  scrub,
}: NumberFieldProps) {
  const edits = useDealEditsOptional();
  const scrubStep = scrub
    ? (scrub.step ??
      (DEAL_FIELD_STEPS[scrub.field] ?? 1) / (scrub.unitMonths ?? 1))
    : undefined;
  const effectiveStep = step ?? scrubStep;
  const scrubbable = scrub != null && edits != null;

  const fieldLabel = (
    <FieldLabel
      className={
        visuallyHiddenLabel
          ? 'sr-only'
          : `text-label font-medium text-muted ${
              scrubbable
                ? 'cursor-ew-resize select-none border-b border-dotted border-faint'
                : ''
            }`
      }
    >
      {label}
    </FieldLabel>
  );

  return (
    <Field invalid={error ? true : undefined} className="flex flex-col gap-1.5">
      {scrubbable && !visuallyHiddenLabel ? null : fieldLabel}
      <NumberInput
        value={value}
        onValueChange={(next, details) => {
          if (scrubbable && details?.reason === 'scrub' && next != null) {
            const stored = scrub.toValue
              ? scrub.toValue(next)
              : scrub.unitMonths
                ? Math.round(next * scrub.unitMonths)
                : next;
            edits.editDeal(scrub.field, stored, 'scrub');
            return;
          }
          onValueChange(next);
        }}
        onValueCommit={(_, details) => {
          if (scrubbable && details?.reason === 'scrub') edits.endGesture();
        }}
        min={min}
        max={max}
        step={effectiveStep}
        largeStep={
          scrubbable && effectiveStep != null ? effectiveStep * 10 : undefined
        }
        format={
          variant === 'currency'
            ? { style: 'currency', currency: 'USD' }
            : undefined
        }
      >
        {scrubbable && !visuallyHiddenLabel ? (
          <NumberInputScrubArea
            pixelsPerStep={8}
            data-scrub-area=""
            title="Drag or use arrow keys to adjust"
            className="self-start"
          >
            {fieldLabel}
            <NumberInputScrubAreaCursor className="pointer-events-none" />
          </NumberInputScrubArea>
        ) : null}
        <NumberInputGroup className="num flex items-center gap-1 rounded-sm border border-line bg-surface px-1 text-fg transition-colors focus-within:border-accent focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-accent data-[invalid]:border-bad data-[invalid]:bg-bad-soft">
          {scrubbable && visuallyHiddenLabel ? (
            // The visible label sits outside this field (unit toggles), so a drag handle stands in.
            <NumberInputScrubArea
              pixelsPerStep={8}
              data-scrub-area=""
              title="Drag or use arrow keys to adjust"
              className="cursor-ew-resize select-none px-1 text-muted"
            >
              <span aria-hidden="true">⇔</span>
              <NumberInputScrubAreaCursor className="pointer-events-none" />
            </NumberInputScrubArea>
          ) : null}
          <NumberInputDecrement
            aria-label={`Decrease ${label}`}
            className={stepperClass}
          >
            −
          </NumberInputDecrement>
          <NumberInputControl className="num min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] outline-none" />
          {suffix ? (
            <span className="pr-1 text-[14px] text-muted">{suffix}</span>
          ) : null}
          <NumberInputIncrement
            aria-label={`Increase ${label}`}
            className={stepperClass}
          >
            +
          </NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
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
