'use client';

import { Button } from '@ui-sdk/react/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@ui-sdk/react/select';
import type { FinancingOptionResult } from 'deal-analyzer-calculations';
import type { ArmTerms, FieldError } from 'shared-calculations';
import { NumberField } from 'shared-ui';

export interface FinancingTermsEditorProps {
  option: FinancingOptionResult;
  errors: FieldError[];
  isCustomized: boolean;
  onChange: (patch: Partial<ArmTerms>) => void;
  onReset: () => void;
}

const FIXED_PERIODS = [3, 5, 7, 10] as const;

/**
 * The selected structure's editable terms (spec 006 User Story 3, FR-011).
 * Fields carry no `min`/`max`: the SDK clamps on commit, which would hide the
 * range errors (same rule as the rental inputs).
 */
export function FinancingTermsEditor({
  option,
  errors,
  isCustomized,
  onChange,
  onReset,
}: FinancingTermsEditorProps) {
  const errorFor = (field: string) =>
    errors.find((e) => e.field === `rental.financing.${option.id}.${field}`)
      ?.message;
  const terms = (option.terms ?? {}) as Partial<ArmTerms>;
  const isArm = option.id === 'arm';
  const set =
    (field: keyof ArmTerms) =>
    (value: number | null): void => {
      if (value != null) onChange({ [field]: value });
    };
  const fixedPeriodError = errorFor('fixedPeriodYears');

  return (
    <fieldset
      data-testid={`financing-terms-${option.id}`}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-3.5 py-3"
    >
      <legend className="eyebrow px-1">{option.name} terms</legend>
      <div className="grid grid-cols-1 gap-[var(--space-grid)] sm:grid-cols-2">
        <NumberField
          label="Down payment %"
          suffix="%"
          step={0.01}
          value={terms.downPaymentPct ?? null}
          onValueChange={set('downPaymentPct')}
          error={errorFor('downPaymentPct')}
        />
        <NumberField
          label={isArm ? 'Initial rate %' : 'Interest rate %'}
          suffix="%"
          step={0.001}
          value={terms.annualRatePct ?? null}
          onValueChange={set('annualRatePct')}
          error={errorFor('annualRatePct')}
        />
        <NumberField
          label="Term (years)"
          step={1}
          value={terms.termYears ?? null}
          onValueChange={set('termYears')}
          error={errorFor('termYears')}
        />
        {isArm ? (
          <>
            <Select
              value={
                terms.fixedPeriodYears != null
                  ? String(terms.fixedPeriodYears)
                  : null
              }
              onValueChange={(value) => {
                if (value != null) {
                  onChange({
                    fixedPeriodYears: Number(
                      value,
                    ) as ArmTerms['fixedPeriodYears'],
                  });
                }
              }}
            >
              <div className="flex flex-col gap-1">
                <SelectLabel className="text-label font-medium text-muted">
                  Fixed period
                </SelectLabel>
                <SelectTrigger
                  aria-invalid={fixedPeriodError ? true : undefined}
                  className={`flex items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    fixedPeriodError ? 'border-bad' : 'border-line'
                  }`}
                >
                  <SelectValue />
                  <span aria-hidden="true" className="text-muted">
                    ▾
                  </span>
                </SelectTrigger>
                {fixedPeriodError ? (
                  <p className="text-xs text-bad">{fixedPeriodError}</p>
                ) : null}
              </div>
              <SelectContent className="z-10 min-w-28 rounded-lg border border-line bg-surface p-1 text-[14px] shadow-float">
                {FIXED_PERIODS.map((years) => (
                  <SelectItem
                    key={years}
                    value={String(years)}
                    className="cursor-default rounded-xs px-2 py-1 data-[highlighted]:bg-sunk data-[selected]:font-medium"
                  >
                    {`${years} years`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NumberField
              label="Adjusted rate %"
              suffix="%"
              step={0.001}
              value={terms.adjustedRatePct ?? null}
              onValueChange={set('adjustedRatePct')}
              error={errorFor('adjustedRatePct')}
              description="Assumed rate after the fixed period"
            />
          </>
        ) : null}
      </div>
      {isCustomized ? (
        <div>
          <Button
            data-testid="financing-reset"
            onClick={onReset}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg hover:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Reset to defaults
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Defaults follow your loan inputs until you edit a term.
        </p>
      )}
    </fieldset>
  );
}
