'use client';

import { useState } from 'react';
import type { FieldError, LoanScenario } from 'shared-calculations';
import { DateField } from './date-field';
import { NumberField, type NumberFieldScrub } from './number-field';
import { SegmentedToggle } from './ds/segmented-toggle';

export interface LoanFieldsProps {
  scenario: LoanScenario;
  errors: FieldError[];
  onChange: (patch: Partial<LoanScenario>) => void;
  /**
   * Show the loan amount as a read-only row derived from home price and down payment
   * (spec 010 T038). Otherwise it is an editable field.
   */
  derivedPrincipal?: boolean;
  /** Turns on drag-to-adjust labels (spec 010 US5). */
  scrub?: boolean;
}

function errorFor(errors: FieldError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}

/** Whether the loan amount currently comes from home price and down payment (spec 001 FR-014). */
export function isPrincipalDerived(scenario: LoanScenario): boolean {
  return (
    scenario.homePrice != null &&
    scenario.downPayment != null &&
    !scenario.principalIsOverridden
  );
}

/** A read-only "label · value · note" row: the reference `.derived` treatment. */
export function DerivedRow({
  label,
  value,
  note,
  strong,
  'data-testid': testId,
}: {
  label: string;
  value: string;
  note?: string;
  strong?: boolean;
  'data-testid'?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-sm bg-sunk px-3 py-2 text-[13.5px]"
    >
      <span className={strong ? 'font-semibold text-fg' : 'text-muted'}>
        {label}
        {note ? <span className="text-muted"> · {note}</span> : null}
      </span>
      <b className={`num font-semibold text-fg ${strong ? 'text-[16px]' : ''}`}>
        {value}
      </b>
    </div>
  );
}

const TERM_UNITS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
] as const;

/** Loan term with an explicit Years / Months unit toggle (spec 001 Edge Cases). */
export function TermField({
  scenario,
  errors,
  onChange,
  scrub,
}: Omit<LoanFieldsProps, 'derivedPrincipal' | 'scrub'> & {
  scrub?: NumberFieldScrub;
}) {
  const [termUnit, setTermUnit] = useState<'years' | 'months'>('years');
  const termValue =
    termUnit === 'years' ? scenario.termMonths / 12 : scenario.termMonths;
  return (
    <div className="flex flex-col gap-1.5" data-deal-field="termMonths">
      <div className="flex items-center justify-between">
        <span className="text-label font-medium text-muted">Loan term</span>
        <SegmentedToggle
          label="Term unit"
          value={termUnit}
          options={TERM_UNITS}
          onValueChange={setTermUnit}
        />
      </div>
      <NumberField
        label="Loan term"
        visuallyHiddenLabel
        min={1}
        value={termValue}
        onValueChange={(value) => {
          const months =
            termUnit === 'years'
              ? Math.round((value ?? 0) * 12)
              : Math.round(value ?? 0);
          onChange({ termMonths: months });
        }}
        error={errorFor(errors, 'termMonths')}
        scrub={termUnit === 'years' ? scrub : undefined}
      />
    </div>
  );
}

/**
 * The Loan group of the Edit deal sheet: loan amount (derived or editable), rate, term and
 * first payment date (spec 001 FR-001).
 */
export function LoanFields({
  scenario,
  errors,
  onChange,
  derivedPrincipal = false,
  scrub = false,
}: LoanFieldsProps) {
  return (
    <div className="flex flex-col gap-[var(--space-grid)]">
      <div
        data-input-grid=""
        className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2"
      >
        {/* Always editable, so spec 001 FR-014's manual override still works; while it is
            derived, the description says where the number comes from. */}
        <div
          data-deal-field="principal"
          data-testid={derivedPrincipal ? 'derived-principal' : undefined}
        >
          <NumberField
            label="Loan amount"
            variant="currency"
            min={0}
            value={scenario.principal}
            onValueChange={(value) => onChange({ principal: value ?? 0 })}
            description={
              derivedPrincipal
                ? 'Calculated from price and down payment. Type to override.'
                : undefined
            }
            error={errorFor(errors, 'principal')}
            scrub={scrub ? { field: 'principal' } : undefined}
          />
        </div>
        <div data-deal-field="annualInterestRatePct">
          <NumberField
            label="Annual interest rate"
            suffix="%"
            min={0}
            step={0.01}
            value={scenario.annualInterestRatePct}
            onValueChange={(value) =>
              onChange({ annualInterestRatePct: value ?? 0 })
            }
            error={errorFor(errors, 'annualInterestRatePct')}
            scrub={scrub ? { field: 'annualInterestRatePct' } : undefined}
          />
        </div>
        <TermField
          scenario={scenario}
          errors={errors}
          onChange={onChange}
          scrub={scrub ? { field: 'termMonths', unitMonths: 12 } : undefined}
        />
        <div data-deal-field="startDate">
          <DateField
            label="First payment date"
            value={scenario.startDate}
            onValueChange={(value) => value && onChange({ startDate: value })}
            description="Payment dates roll to each month's own end for short months."
          />
        </div>
      </div>
    </div>
  );
}
