'use client';

import type { FieldError, RentalAssumptions } from 'shared-calculations';
import { currency, NumberField } from 'shared-ui';

export interface RentalInputsPanelProps {
  rental: RentalAssumptions | null;
  /** `rental.*` errors only. */
  errors: FieldError[];
  /** A partial patch edits the assumptions; `null` removes rental analysis. */
  onChange: (patch: Partial<RentalAssumptions> | null) => void;
  /** Down payment + closing costs + rehab, when an analysis is available. */
  totalCashInvested?: number | null;
}


function errorFor(errors: FieldError[], field: keyof RentalAssumptions): string | undefined {
  return errors.find((e) => e.field === `rental.${field}`)?.message;
}

/**
 * Deal Analyzer inputs (FR-001, FR-002). Tax, insurance, and HOA are not
 * repeated here; they come from the real-estate costs section (FR-003).
 */
export function RentalInputsPanel({ rental, errors, onChange, totalCashInvested }: RentalInputsPanelProps) {
  const rentField = (
    <NumberField
      label="Monthly rent"
      variant="currency"
      min={0}
      value={rental?.grossMonthlyRent ?? null}
      onValueChange={(value) => {
        if (rental == null && value == null) return;
        onChange({ grossMonthlyRent: value ?? 0 });
      }}
      error={errorFor(errors, 'grossMonthlyRent')}
    />
  );

  if (rental == null) {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{rentField}</div>
        <p className="text-sm text-neutral-500">Enter rent to analyze this as a rental.</p>
      </div>
    );
  }

  // Percentages are deliberately not clamped with `max`, so an out-of-range
  // value surfaces the field-level validation message (FR-015) instead of
  // being silently corrected.
  const percentField = (field: keyof RentalAssumptions, label: string) => (
    <NumberField
      label={label}
      suffix="%"
      min={0}
      step={0.5}
      value={rental[field]}
      onValueChange={(value) => onChange({ [field]: value ?? 0 })}
      error={errorFor(errors, field)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rentField}
        <NumberField
          label="Other monthly income"
          variant="currency"
          min={0}
          value={rental.otherMonthlyIncome}
          onValueChange={(value) => onChange({ otherMonthlyIncome: value ?? 0 })}
          description="Parking, laundry, storage, and similar."
          error={errorFor(errors, 'otherMonthlyIncome')}
        />
        {percentField('vacancyPct', 'Vacancy rate')}
        {percentField('managementPct', 'Property management')}
        {percentField('maintenanceReservePct', 'Maintenance reserve')}
        {percentField('capexReservePct', 'CapEx reserve')}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-neutral-800">Cash invested</h3>
          {totalCashInvested != null ? (
            <span data-testid="total-cash-invested" className="text-sm tabular-nums text-neutral-700">
              Total {currency.format(totalCashInvested)} (incl. down payment)
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label="Closing costs"
            variant="currency"
            min={0}
            value={rental.closingCosts}
            onValueChange={(value) => onChange({ closingCosts: value ?? 0 })}
            error={errorFor(errors, 'closingCosts')}
          />
          <NumberField
            label="Rehab budget"
            variant="currency"
            min={0}
            value={rental.rehabBudget}
            onValueChange={(value) => onChange({ rehabBudget: value ?? 0 })}
            error={errorFor(errors, 'rehabBudget')}
          />
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Percentages are of gross scheduled income. Property tax, insurance, and HOA come from
        Real-estate costs above.
      </p>
      <div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-neutral-500 underline underline-offset-2 hover:text-neutral-800"
        >
          Remove rental analysis
        </button>
      </div>
    </div>
  );
}
